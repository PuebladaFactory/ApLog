import { Injectable } from '@angular/core';
import { DbFirestoreService, EscrituraBatch, Resultado } from '../database/db-firestore.service';
import { LogRegistroService } from '../log-registro/log-registro.service';

/** Colecciones de las entidades que se activan/desactivan desde los tableros. */
export type ColeccionEntidadActivable = 'clientes' | 'choferes' | 'proveedores';

/** Cambia `activo` de un cliente, chofer o proveedor, con su entrada de log
 *  en el mismo batch. Sin estado ni listener: el valor nuevo lo re-emite el
 *  listener del XxxService dueño.
 *
 *  `activo` decide quién se puede asignar (pool del tablero, carga-asignacion),
 *  por eso se loguea; la visibilidad en los listados es preferencia de
 *  presentación y no (ver la skill subsistema-log). No escribe cascada: los
 *  vehículos de un chofer/proveedor inactivo se filtran al leer, y una
 *  asignación ya cargada sobrevive a la desactivación a propósito.
 *
 *  Acción EDITAR, no BAJA/RESTAURAR: para estas entidades BAJA es la baja con
 *  papelera. El diff del log muestra `activo` anterior → nuevo. */
@Injectable({
  providedIn: 'root'
})
export class ActivacionEntidadService {

  constructor(
    private db: DbFirestoreService,
    private logRegistro: LogRegistroService,
  ) {}

  async cambiarActivo(
    coleccion: ColeccionEntidadActivable,
    id: string,
    activo: boolean,
    nombre: string,
  ): Promise<Resultado> {
    const escrituras: EscrituraBatch[] = [
      { coleccion, id, modo: 'actualizar', data: { activo } },
    ];
    const msj = `${activo ? 'Activación' : 'Desactivación'} de ${nombre} (${coleccion})`;
    try {
      await this.logRegistro.agregarAlBatch(escrituras, 'EDITAR', coleccion, id, msj);
      await this.db.commitBatch(escrituras);
      return { exito: true, mensaje: msj };
    } catch (e: any) {
      await this.logRegistro.registrarError('EDITAR', coleccion, id, `Error en ${msj}: ${e?.message ?? e}`);
      return { exito: false, mensaje: `No se pudo guardar: ${e?.message ?? e}` };
    }
  }
}
