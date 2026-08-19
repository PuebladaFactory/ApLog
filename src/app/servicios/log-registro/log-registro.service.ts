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
   *  su propio `db.commitBatch(escrituras)` después.
   *
   *  Si accion === 'EDITAR', hace una lectura one-shot de `coleccion`/`idObjet`
   *  ANTES de que el batch se ejecute, y diffea contra los datos que ya están en
   *  `escrituras` para esa misma colección/id. */
  async agregarAlBatch(
    escrituras: EscrituraBatch[],
    accion: 'ALTA' | 'EDITAR' | 'BAJA' | 'RESTAURAR',
    coleccion: string,
    idObjet: string | number,
    details: string,
  ): Promise<void> {
    let cambios: CambioCampo[] | undefined;

    if (accion === 'EDITAR') {
      const anterior = await this.db.getById<any>(coleccion, String(idObjet));
      const escrituraNueva = escrituras.find(
        e => e.coleccion === coleccion && e.id === String(idObjet),
      );
      if (anterior && escrituraNueva) {
        cambios = this.diffCampos(anterior, escrituraNueva.data);
      }
    }

    const entrada = this.construirEntrada(accion, coleccion, idObjet, details, 'SUCCESS', cambios);
    if (!entrada) return; // dev: no se agrega nada al batch

    const logId = this.db.generarId(this.COLECCION);
    escrituras.push({ coleccion: this.COLECCION, id: logId, data: entrada, modo: 'crear' });
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
        cambios.push({ campo, anterior: a, nuevo: n });
      }
    }
    return cambios;
  }
}
