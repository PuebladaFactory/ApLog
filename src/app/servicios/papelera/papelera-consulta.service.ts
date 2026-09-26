import { inject, Injectable } from '@angular/core';
import { DocumentData, QueryDocumentSnapshot } from '@angular/fire/firestore';
import { DbFirestoreService, PaginaResultado } from 'src/app/servicios/database/db-firestore.service';
import { PapeleraEvento } from 'src/app/interfaces/registro-papelera';
import { ConId } from 'src/app/interfaces/conId';

/**
 * Consulta/paginación sobre `papeleraEventos`, stateless — devuelve páginas, no
 * acumula. El componente es dueño del array acumulado + cursor activo, mismo
 * criterio que RegistroLogConsultaService.
 */
@Injectable({ providedIn: 'root' })
export class PapeleraConsultaService {
  private readonly COLECCION = 'papeleraEventos';
  readonly PAGE_SIZE = 50;

  private db = inject(DbFirestoreService);

  /** Página ordenada por timestamp desc, dentro de [desde, hasta], filtrada por
   *  `estado` — único filtro server-side posible (getPaginado solo admite un
   *  filtro de igualdad). Un filtro adicional por colección principal, si la
   *  pantalla lo necesita, va client-side sobre la página ya cargada. */
  async cargarPagina(
    desde: number,
    hasta: number,
    cursor: QueryDocumentSnapshot<DocumentData> | null,
    estado: 'activo' | 'restaurado' = 'activo',
  ): Promise<PaginaResultado<PapeleraEvento>> {
    return this.db.getPaginado<PapeleraEvento>(
      this.COLECCION,
      'timestamp',
      desde,
      hasta,
      this.PAGE_SIZE,
      cursor,
      { campo: 'estado', valor: estado },
    );
  }

  /** Un evento puntual por id (deep link desde otras pantallas, ej.
   *  InformeOp anulados). null si no existe. */
  async obtenerEvento(id: string): Promise<ConId<PapeleraEvento> | null> {
    const data = await this.db.getById<PapeleraEvento>(this.COLECCION, id);
    return data ? { ...data, id } : null;
  }
}
