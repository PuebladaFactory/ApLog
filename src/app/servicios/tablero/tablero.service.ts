import { Injectable } from '@angular/core';
import { DbFirestoreService } from '../database/db-firestore.service';
import { LogService } from '../log/log.service';
import { AsignacionService } from '../operaciones/asignacion.service';
import { OperacionFactoryService } from '../operaciones/operacion-factory.service';
import { Operacion } from 'src/app/interfaces/operacion';
import { ConId } from 'src/app/interfaces/conId';

@Injectable({
  providedIn: 'root'
})
export class TableroService {

  constructor(
    private dbFirestore:       DbFirestoreService,
    private logService:        LogService,
    private asignacionService: AsignacionService,
    private operacionFactory:  OperacionFactoryService,
  ) {}

  // ---- Fachada hacia el modelo nuevo (AsignacionService) ----

  /** Actualiza observacion/hojaDeRuta de la asignación en el tablero.
   *  TODO: fachada provisoria → migrará a OperacionService.editarOperacion (atómico). */
  async actualizarAsignacionDesdeOperacion(op: ConId<Operacion>): Promise<void> {
    const fecha = this.normalizarFecha(op.fecha);
    await this.asignacionService.actualizarItem(
      fecha, op.idOperacion, op.observaciones ?? '', op.hojaRuta ?? '',
    );
  }

  /** Restaurar op desde papelera: reinicia estado + km, re-guarda la op, reactiva
   *  el item del tablero (no crea uno nuevo).
   *  TODO: fachada provisoria → migrará a OperacionService.restaurarOperacion (atómico). */
  async altaOperacionYActualizarTablero(op: Operacion): Promise<void> {
    const fecha = this.normalizarFecha(op.fecha);

    // Reiniciar estado y km (la op pudo estar en cualquier ciclo al ser eliminada).
    // EstadoOp SIEMPRE desde el factory, nunca inline.
    op.estado = this.operacionFactory.estadoInicial();
    op.km = 0;

    // Re-guardar la op por id conocido. setDocSinId: el id no se persiste en el cuerpo.
    const { idOperacion, ...cuerpo } = op;
    await this.dbFirestore.setDocSinId('operaciones', idOperacion, cuerpo);

    this.logService.logEvent(
      'ALTA', 'operaciones',
      `Restauración de operación ${idOperacion} desde papelera`,
      idOperacion, true,
    );

    // Reactivar el item del tablero (estaba marcado anulado, no se borró).
    await this.asignacionService.reactivarItem(fecha, idOperacion);
  }

  // ---- Helpers privados ----

  private normalizarFecha(fecha: string): string {
    return typeof fecha === 'string' ? fecha : new Date(fecha).toISOString().split('T')[0];
  }
}
