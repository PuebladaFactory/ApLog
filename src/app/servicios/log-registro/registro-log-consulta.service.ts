import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DocumentData, QueryDocumentSnapshot } from '@angular/fire/firestore';
import { DbFirestoreService, PaginaResultado } from 'src/app/servicios/database/db-firestore.service';
import { ConId } from 'src/app/interfaces/conId';
import { RegistroLog } from 'src/app/interfaces/registro-log';

/** Colecciones que escriben en `registroLog` hoy — usado para poblar el selector de
 *  filtro por colección en RegistroLogComponent. Ampliar a medida que se migren
 *  módulos nuevos al mecanismo de log (ver CLAUDE.md → "Frente Log"). */
export const COLECCIONES_REGISTRO_LOG = [
  'choferes',
  'clientes',
  'proveedores',
  'vehiculos',
  'legajos',
  'documentacionHistorial',
  'categoriasDocumentacion',
  'operaciones',
  'asignaciones',
] as const;

export type PaginaRegistroLog = PaginaResultado<RegistroLog>;

/**
 * Consulta/paginación sobre `registroLog`, stateless — devuelve páginas, no acumula.
 * El componente es dueño del array acumulado + cursor activo (mismo criterio que
 * LegajoService.getHistorialDocumento: método de consulta puntual, sin estado propio).
 */
@Injectable({ providedIn: 'root' })
export class RegistroLogConsultaService {
  private readonly COLECCION = 'registroLog';
  readonly PAGE_SIZE = 50;

  private db = inject(DbFirestoreService);

  /** Página ordenada por timestamp desc, dentro de [desde, hasta], filtrada
   *  opcionalmente por `coleccion`. `cursor: null` para la primera página. */
  async cargarPagina(
    desde: number,
    hasta: number,
    cursor: QueryDocumentSnapshot<DocumentData> | null,
    coleccion?: string,
  ): Promise<PaginaRegistroLog> {
    return this.db.getPaginado<RegistroLog>(
      this.COLECCION,
      'timestamp',
      desde,
      hasta,
      this.PAGE_SIZE,
      cursor,
      coleccion ? { campo: 'coleccion', valor: coleccion } : undefined,
    );
  }

  /** Consulta puntual por idObjet — capacidad secundaria heredada de la pantalla
   *  vieja (RegistroComponent). Barata: un solo `where`, sin paginación ni índice
   *  compuesto (no combina con rango de fecha). */
  async consultarPorIdObjet(idObjet: string | number): Promise<ConId<RegistroLog>[]> {
    return firstValueFrom(
      this.db.getByFieldValue<RegistroLog>(this.COLECCION, 'idObjet', idObjet),
    );
  }
}
