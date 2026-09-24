import { inject, Injectable } from '@angular/core';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { AccionLog, CambioCampo, RegistroLog } from 'src/app/interfaces/registro-log';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';

@Injectable({ providedIn: 'root' })
export class LogRegistroService {
  private firestore = inject(Firestore);
  private usuarioSesion = inject(UsuarioSesionService);
  private db = inject(DbFirestoreService);

  private readonly COLECCION = 'registroLog';

  /** Pura. Devuelve null si el usuario actual es 'dev' — ÚNICO lugar donde se
   *  aplica la exclusión, no hay otro camino para escribir un registro. */
  private construirEntrada(
    accion: AccionLog,
    coleccion: string,
    idObjet: string | number,
    details: string,
    status: 'SUCCESS' | 'ERROR',
    cambios?: CambioCampo[],
  ): RegistroLog | null {
    if (this.usuarioSesion.esRol('dev')) return null;
    const usuario = this.usuarioSesion.getUsuarioActual();
    return {
      timestamp: Date.now(),
      userId: usuario?.uid || 'Desconocido',
      userEmail: usuario?.email || 'Desconocido',
      action: accion,
      coleccion,
      idObjet,
      details,
      status,
      ...(cambios && cambios.length > 0 ? { cambios } : {}),
    };
  }

  /** MUTACIÓN — folding en batch. El caller ya armó su EscrituraBatch[] de negocio
   *  (incluida la escritura a `coleccion`/`idObjet`); esta función AGREGA la
   *  escritura del log a ese mismo array. No commitea — el caller sigue haciendo
   *  su propio commit (commitBatch o commitEnTransaccion) después.
   *
   *  Si accion es 'EDITAR' o 'EMITIR', diffea el documento anterior contra la
   *  escritura de esa misma colección/id que ya está en `escrituras`:
   *   - modo 'actualizar' (parcial, claves en notación de punto): diff SOLO de
   *     las claves presentes en la escritura, resolviendo cada ruta sobre el
   *     documento anterior ('valores.total' → anterior.valores.total).
   *   - resto de los modos (reemplazo completo): diff superficial de primer
   *     nivel, como siempre.
   *  `anterior` es opcional: si el caller ya leyó el documento (ej. dentro de
   *  una transacción) lo pasa y se evita la lectura extra; si no, se hace una
   *  lectura one-shot vía getById, como hasta ahora. Pasar `anterior = null`
   *  explícito indica documento nuevo (no hay estado previo): no se lee ni
   *  se diffea. */
  async agregarAlBatch(
    escrituras: EscrituraBatch[],
    accion: 'ALTA' | 'EDITAR' | 'BAJA' | 'RESTAURAR' | 'EMITIR',
    coleccion: string,
    idObjet: string | number,
    details: string,
    anterior?: any,
  ): Promise<void> {
    let cambios: CambioCampo[] | undefined;

    if (accion === 'EDITAR' || accion === 'EMITIR') {
      const escrituraNueva = escrituras.find(
        e => e.coleccion === coleccion && e.id === String(idObjet),
      );
      if (escrituraNueva) {
        const previo = anterior !== undefined
          ? anterior
          : await this.db.getById<any>(coleccion, String(idObjet));
        if (previo) {
          cambios = escrituraNueva.modo === 'actualizar'
            ? this.diffParcial(previo, escrituraNueva.data)
            : this.diffCampos(previo, escrituraNueva.data);
        }
      }
    }

    const entrada = this.construirEntrada(accion, coleccion, idObjet, details, 'SUCCESS', cambios);
    if (!entrada) return; // dev: no se agrega nada al batch

    const logId = this.db.generarId(this.COLECCION);
    escrituras.push({ coleccion: this.COLECCION, id: logId, data: entrada, modo: 'crear' });
  }

  /** Construye una entrada de log + su id, SIN escribir y SIN pasar por
   *  EscrituraBatch[]/commitBatch — pensado para callers con su propio batch
   *  "crudo" ajeno al mecanismo estándar (hoy: DbFirestoreService.guardarFacturasOp,
   *  que usa writeBatch directo porque necesita updates parciales de resúmenes que
   *  commitBatch no soporta). El caller hace batch.set(doc(...,id), entrada) con
   *  el resultado. A diferencia de agregarAlBatch, no diffea EDITAR (no hay un
   *  EscrituraBatch[] del cual leer el "antes" — el caller arma su propio batch).
   *  Devuelve null si el usuario actual es 'dev', mismo criterio que el resto del
   *  servicio — el caller debe verificar antes de escribir. */
  construirEntradaSuelta(
    accion: AccionLog,
    coleccion: string,
    idObjet: string | number,
    details: string,
  ): { id: string; entrada: RegistroLog } | null {
    const entrada = this.construirEntrada(accion, coleccion, idObjet, details, 'SUCCESS');
    if (!entrada) return null;
    return { id: this.db.generarId(this.COLECCION), entrada };
  }

  /** ACCIÓN SIN MUTACIÓN — escritura suelta, no atómica (no hay negocio con el que
   *  ser atómico). Ej.: REIMPRIMIR, DESCARGAR, LOGIN, LOGOUT.
   *  Best-effort real: si la escritura falla (ej. LOGOUT con el token ya inválido
   *  tras signOut()), no relanza — solo console.error. Un log fallido nunca debe
   *  interrumpir el flujo del caller. */
  async registrarAccion(
    accion: 'REIMPRIMIR' | 'DESCARGAR' | 'LOGIN' | 'LOGOUT',
    coleccion: string,
    idObjet: string | number,
    details: string,
  ): Promise<void> {
    const entrada = this.construirEntrada(accion, coleccion, idObjet, details, 'SUCCESS');
    if (!entrada) return;
    try {
      const logId = this.db.generarId(this.COLECCION);
      await setDoc(doc(this.firestore, `/Vantruck/datos/${this.COLECCION}`, logId), entrada);
    } catch (e) {
      console.error('Error al registrar acción en registroLog:', e);
    }
  }

  /** MUTACIÓN cuya escritura real ocurrió fuera de cualquier EscrituraBatch propio
   *  del cliente — ej.: Cloud Functions con Admin SDK (gestión de usuarios).
   *  Escritura suelta, sin atomicidad con la mutación real (mismo trade-off que
   *  LOGIN/LOGOUT). El caller arma `cambios` a mano si corresponde — no hay lectura
   *  automática vía getById como en agregarAlBatch, porque el caller ya tiene el
   *  antes/después en memoria. Best-effort real: nunca debe tirar (mismo criterio
   *  que registrarAccion/registrarError). */
  async registrarMutacionSuelta(
    accion: 'ALTA' | 'EDITAR' | 'BAJA' | 'RESTAURAR',
    coleccion: string,
    idObjet: string | number,
    details: string,
    cambios?: CambioCampo[],
  ): Promise<void> {
    const entrada = this.construirEntrada(accion, coleccion, idObjet, details, 'SUCCESS', cambios);
    if (!entrada) return;
    try {
      const logId = this.db.generarId(this.COLECCION);
      await setDoc(doc(this.firestore, `/Vantruck/datos/${this.COLECCION}`, logId), entrada);
    } catch (e) {
      console.error('Error al registrar log:', e);
    }
  }

  /** ERROR — best-effort, siempre fuera de cualquier batch (el negocio no se
   *  escribió, no hay nada con qué ser atómico). Llamar desde el catch del caller.
   *  Best-effort real: si la escritura en sí falla, no relanza — solo console.error. */
  async registrarError(
    accion: AccionLog,
    coleccion: string,
    idObjet: string | number,
    details: string,
  ): Promise<void> {
    const entrada = this.construirEntrada(accion, coleccion, idObjet, details, 'ERROR');
    if (!entrada) return;
    try {
      const logId = this.db.generarId(this.COLECCION);
      await setDoc(doc(this.firestore, `/Vantruck/datos/${this.COLECCION}`, logId), entrada);
    } catch (e) {
      console.error('Error al registrar error en registroLog:', e);
    }
  }

  /** Diff superficial (top-level, sin recursión en objetos anidados). Solo
   *  devuelve los campos que efectivamente cambiaron. */
  private diffCampos(anterior: any, nuevo: any): CambioCampo[] {
    if (!anterior || !nuevo) return [];
    const campos = new Set([...Object.keys(anterior), ...Object.keys(nuevo)]);
    const cambios: CambioCampo[] = [];
    for (const campo of campos) {
      const a = anterior[campo];
      const n = nuevo[campo];
      if (JSON.stringify(a) !== JSON.stringify(n)) {
        // Firestore no acepta 'undefined' como valor de campo. Un campo puede
        // faltar en 'anterior' (doc viejo, de antes de que ese campo existiera
        // en el schema) o en 'nuevo' sin que sea un error real — es la evolución
        // normal de Operacion (y del resto de las entidades) a través de los
        // distintos frentes. Se normaliza a null para que el log sea siempre
        // escribible.
        cambios.push({
          campo,
          anterior: a === undefined ? null : a,
          nuevo: n === undefined ? null : n,
        });
      }
    }
    return cambios;
  }

  /** Diff de una escritura PARCIAL (modo 'actualizar'): solo las claves
   *  presentes en `parcial`, cada una resuelta como ruta con puntos sobre
   *  `anterior`. El nombre del campo en el log es la ruta completa
   *  ('contraParte.monto'). Misma normalización undefined → null que
   *  diffCampos. */
  private diffParcial(anterior: any, parcial: Record<string, any>): CambioCampo[] {
    const cambios: CambioCampo[] = [];
    for (const [ruta, n] of Object.entries(parcial ?? {})) {
      const a = ruta.split('.').reduce((obj: any, clave) => obj?.[clave], anterior);
      if (JSON.stringify(a) !== JSON.stringify(n)) {
        cambios.push({
          campo: ruta,
          anterior: a === undefined ? null : a,
          nuevo: n === undefined ? null : n,
        });
      }
    }
    return cambios;
  }
}
