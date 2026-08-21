import { inject, Injectable } from '@angular/core';
import { ConId } from 'src/app/interfaces/conId';
import { PapeleraEvento, RefObjetoPapelera } from 'src/app/interfaces/registro-papelera';
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';

/** Objeto a archivar en una baja: la entidad tal cual va a `data` (ya en forma
 *  Firestore, sin id/type — mismo shape que toFirestore() de cada XxxService). */
export interface ObjetoParaPapelera {
  coleccion: string;
  id: string;
  data: any;
  principal: boolean;
}

/** Objeto recuperado de una restauración, con su data cruda tal como estaba
 *  archivada — el caller decide cómo reconstruirlo (agregar id/type, etc.). */
export interface ObjetoRestaurado {
  coleccion: string;
  idOriginal: string;
  principal: boolean;
  data: any;
}

/**
 * Servicio de apoyo de bajo nivel para el mecanismo de papelera por referencia
 * (ver CLAUDE.md → "Frente Papelera"). "Tonto respecto al dominio": NUNCA importa
 * ClienteService/ChoferService/ProveedorService/OperacionService ni conoce la
 * forma de ninguna entidad de negocio — mismo principio que LogRegistroService
 * respecto al log. Solo mueve documentos entre la colección de origen y las dos
 * colecciones de papelera; cada XxxService con su propio restaurarXxx es quien
 * sabe reconstruir su entidad.
 *
 * Dos colecciones nuevas, nombres fijos:
 *  - 'papeleraEventos': un doc por acción de baja del usuario (PapeleraEvento).
 *  - 'objetosEliminados': un doc por cada entidad archivada (principal o
 *    secundaria), sin wrapper — el documento es la entidad tal cual estaba en su
 *    colección de origen. Id determinístico `${coleccion}__${idOriginal}`,
 *    permite point-lookup directo sin query.
 */
@Injectable({ providedIn: 'root' })
export class PapeleraService {
  private db = inject(DbFirestoreService);
  private usuarioSesion = inject(UsuarioSesionService);

  private readonly COLECCION_EVENTOS = 'papeleraEventos';
  private readonly COLECCION_OBJETOS = 'objetosEliminados';

  private idObjetoEliminado(coleccion: string, idOriginal: string): string {
    return `${coleccion}__${idOriginal}`;
  }

  /** Arma (sin commitear) las escrituras de una baja: el evento de papelera +
   *  un doc archivado por cada objeto. Hace push a `escrituras`, el array que
   *  el caller ya viene armando para su propio batch de negocio (delete de la
   *  colección de origen incluido) — el caller sigue siendo dueño del batch y
   *  de su propio `db.commitBatch(escrituras)`.
   *
   *  Exactamente un objeto de `objetos` debe tener `principal: true` — si no,
   *  throw (inconsistencia real del caller, no un caso a tolerar). */
  prepararBajaEnBatch(
    escrituras: EscrituraBatch[],
    motivo: string,
    objetos: ObjetoParaPapelera[],
  ): void {
    const principales = objetos.filter(o => o.principal);
    if (principales.length !== 1) {
      throw new Error(
        `prepararBajaEnBatch requiere exactamente un objeto principal (recibidos: ${principales.length}).`,
      );
    }
    const principal = principales[0];
    const usuario = this.usuarioSesion.getUsuarioActual();

    const refs: RefObjetoPapelera[] = objetos.map(o => ({
      coleccion: o.coleccion,
      idOriginal: o.id,
      principal: o.principal,
    }));

    const evento: PapeleraEvento = {
      timestamp: Date.now(),
      userId: usuario?.uid || 'Desconocido',
      userEmail: usuario?.email || 'Desconocido',
      motivoBaja: motivo,
      coleccionPrincipal: principal.coleccion,
      idPrincipal: principal.id,
      estado: 'activo',
      refs,
    };

    const idEvento = this.db.generarId(this.COLECCION_EVENTOS);
    escrituras.push({ coleccion: this.COLECCION_EVENTOS, id: idEvento, data: evento, modo: 'crear' });

    for (const objeto of objetos) {
      const idArchivado = this.idObjetoEliminado(objeto.coleccion, objeto.id);
      escrituras.push({ coleccion: this.COLECCION_OBJETOS, id: idArchivado, data: objeto.data, modo: 'crear' });
    }
  }

  /** Lee el evento (debe existir y estar 'activo' — si no, throw, no se puede
   *  restaurar dos veces) y cada objeto archivado que referencia (debe existir
   *  cada uno — si falta alguno, throw, es una inconsistencia real). Arma (sin
   *  commitear) el delete de cada objeto archivado + el reemplazo del evento a
   *  'restaurado' (no se borra — queda como historial), y hace push a
   *  `escrituras`. NO escribe nada en las colecciones de origen — eso es
   *  responsabilidad exclusiva del `restaurarXxx` del caller, que usa la `data`
   *  cruda devuelta para reconstruir cada entidad. */
  async prepararRestauracionEnBatch(
    escrituras: EscrituraBatch[],
    idEvento: string,
  ): Promise<{ evento: ConId<PapeleraEvento>; objetos: ObjetoRestaurado[] }> {
    const eventoData = await this.db.getById<PapeleraEvento>(this.COLECCION_EVENTOS, idEvento);
    if (!eventoData) {
      throw new Error(`No se encontró el evento de papelera ${idEvento}.`);
    }
    if (eventoData.estado !== 'activo') {
      throw new Error(`El evento de papelera ${idEvento} ya fue restaurado — no se puede restaurar dos veces.`);
    }

    const objetos: ObjetoRestaurado[] = [];
    for (const ref of eventoData.refs) {
      const idArchivado = this.idObjetoEliminado(ref.coleccion, ref.idOriginal);
      const data = await this.db.getById<any>(this.COLECCION_OBJETOS, idArchivado);
      if (!data) {
        throw new Error(
          `Inconsistencia: falta el objeto archivado ${ref.coleccion}/${ref.idOriginal} (evento ${idEvento}).`,
        );
      }
      objetos.push({ coleccion: ref.coleccion, idOriginal: ref.idOriginal, principal: ref.principal, data });
      escrituras.push({ coleccion: this.COLECCION_OBJETOS, id: idArchivado, data: null, modo: 'eliminar' });
    }

    const eventoRestaurado: PapeleraEvento = { ...eventoData, estado: 'restaurado' };
    escrituras.push({ coleccion: this.COLECCION_EVENTOS, id: idEvento, data: eventoRestaurado, modo: 'reemplazar' });

    return { evento: { ...eventoData, id: idEvento }, objetos };
  }

  /** Point-lookup directo de una entidad que puede estar en papelera — para
   *  resolver los `// TODO: refactor Papelera` (getChoferPorId/etc. devuelven
   *  undefined porque la entidad fue dada de baja). null si nunca se archivó. */
  async getObjetoEliminado<T>(coleccion: string, idOriginal: string): Promise<T | null> {
    return this.db.getById<T>(this.COLECCION_OBJETOS, this.idObjetoEliminado(coleccion, idOriginal));
  }
}
