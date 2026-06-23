import { Injectable } from '@angular/core';
import { DbFirestoreService } from '../database/db-firestore.service';
import { StorageService } from '../storage/storage.service';
import { ChoferService } from '../choferes/chofer.service';
import { LogService } from '../log/log.service';
import { AsignacionService } from '../operaciones/asignacion.service';
import { OperacionFactoryService } from '../operaciones/operacion-factory.service';
import { ChoferAsignadoBase, TableroDiario } from 'src/app/raiz/operaciones/tablero-diario/tablero-diario.component';
import { Operacion } from 'src/app/interfaces/operacion';
import { ConId } from 'src/app/interfaces/conId';
import { Categoria } from 'src/app/interfaces/chofer';

@Injectable({
  providedIn: 'root'
})
export class TableroService {

  constructor(
    private dbFirestore:       DbFirestoreService,
    private storageService:    StorageService,
    private choferService:     ChoferService,
    private logService:        LogService,
    private asignacionService: AsignacionService,
    private operacionFactory:  OperacionFactoryService,
  ) {}

  // ---- Métodos del modelo viejo: siguen activos (callers externos aún no migrados) ----

  /** @deprecated Modelo viejo (tableroDiario). Caller: tablero-diario.component. */
  async getTableroPorFecha(fecha: string): Promise<TableroDiario | null> {
    return await this.dbFirestore.getTableroPorFecha(fecha);
  }

  /** @deprecated Modelo viejo (tableroDiario). Caller: tablero-diario.component. */
  async guardarTablero(tablero: TableroDiario, accion: string): Promise<void> {
    await this.dbFirestore.setItem<TableroDiario>('tableroDiario', tablero.id, tablero);
    this.storageService.logSimple(
      tablero.timestamp,
      accion,
      'tableroDiario',
      `Tablero Diario del dia ${tablero.fecha}, guardado`,
      true,
    );
  }

  /** @deprecated Modelo viejo (tableroDiario). Caller: carga-multiple.component. */
  async altaMultipleOperacionesYActualizarTablero(operaciones: Operacion[]): Promise<{ exito: boolean; mensaje: string }> {
    try {
      if (!operaciones.length) {
        return { exito: false, mensaje: 'No hay operaciones para procesar.' };
      }

      const fechaStr = (typeof operaciones[0].fecha === 'string')
        ? operaciones[0].fecha
        : new Date(operaciones[0].fecha).toISOString().split('T')[0];

      let tablero: TableroDiario = await this.getTableroPorFecha(fechaStr) ?? {
        id: fechaStr,
        fecha: fechaStr,
        asignaciones: {},
        timestamp: Date.now(),
        asignado: true,
      };

      await this.dbFirestore.guardarMultiple(operaciones, 'operaciones', 'idOperacion', 'operaciones');

      for (const op of operaciones) {
        const idCliente = op.cliente.id;
        const categoria = this.getCategoriaDesdeOperacion(op);
        const asignacion: ChoferAsignadoBase = {
          idChofer:          op.chofer.id,
          categoriaAsignada: categoria,
          tEventual:         op.tarifaTipo.eventual,
          observaciones:     op.observaciones ?? '',
          hojaDeRuta:        op.hojaRuta ?? '',
          idOperacion:       op.idOperacion,
        };
        if (!tablero.asignaciones[idCliente]) {
          tablero.asignaciones[idCliente] = [];
        }
        tablero.asignaciones[idCliente].push(asignacion);
      }

      tablero.timestamp = Date.now();
      await this.guardarTablero(tablero, 'ACTUALIZACION');

      const ids = operaciones.map(op => op.idOperacion);
      this.storageService.logMultiplesOp(ids, 'ALTA', 'operaciones', 'Alta de Operación', true);

      return { exito: true, mensaje: 'Operaciones y tablero guardados correctamente.' };

    } catch (error) {
      console.error('Error en alta múltiple:', error);
      return { exito: false, mensaje: 'Error al guardar operaciones o actualizar tablero.' };
    }
  }

  // ---- Fachada hacia el modelo nuevo (AsignacionService) ----

  /** Actualiza observacion/hojaDeRuta de la asignación en el tablero.
   *  TODO: fachada provisoria → migrará a OperacionService.editarOperacion (atómico). */
  async actualizarAsignacionDesdeOperacion(op: ConId<Operacion>): Promise<void> {
    const fecha = this.normalizarFecha(op.fecha);
    await this.asignacionService.actualizarItem(
      fecha, op.idOperacion, op.observaciones ?? '', op.hojaRuta ?? '',
    );
  }

  /** Anula el item del tablero sin tocar la op (el caller ya bajó op + informes).
   *  TODO: fachada provisoria → migrará a OperacionService.bajaOperacion (atómico). */
  async anularOpEnTablero(op: ConId<Operacion>, motivo: string): Promise<void> {
    const fecha = this.normalizarFecha(op.fecha);
    await this.asignacionService.marcarItemAnulado(fecha, op.idOperacion, motivo);
  }

  /** Baja de op + informes + anulación del item del tablero. A2: retiene la lógica
   *  de baja de op; la parte de tablero ya usa el modelo nuevo (marcarItemAnulado).
   *  TODO: fachada provisoria → migrará a OperacionService.bajaOperacion (atómico). */
  async anularOperacionYActualizarTablero(
    op: ConId<Operacion>, motivo: string, mensaje: string,
  ): Promise<void> {
    const fecha = this.normalizarFecha(op.fecha);

    // --- lógica de op RETENIDA (migra a OperacionService.bajaOperacion) ---
    await this.storageService.deleteItemPapelera(
      'operaciones', op, op.idOperacion, 'BAJA', mensaje, motivo,
    );
    if (op.estado.ciclo === 'cerrada') {
      const tipoContratacion = this.choferService.getTipoContratacion(op.chofer.id);
      // TODO: refactor Papelera — chofer en papelera → tipoContratacion undefined.
      if (tipoContratacion === undefined) {
        throw new Error(
          `No se pudo resolver la contratación del chofer ${op.chofer.id} ` +
          `al borrar informes de la op ${op.idOperacion} (posible chofer en papelera).`,
        );
      }
      await this.dbFirestore.eliminarInformesPorIdOperacion(op, tipoContratacion);
    }

    // --- parte de tablero: MODELO NUEVO ---
    await this.asignacionService.marcarItemAnulado(fecha, op.idOperacion, motivo);
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

  private getCategoriaDesdeOperacion(op: Operacion): Categoria {
    // TODO: refactor Tablero — la categoría ya está en op.vehiculo (RefVehiculo).
    // Con las nuevas entidades del tablero este método puede desaparecer.
    return op.vehiculo.categoria ?? { catOrden: 0, nombre: 'Sin categoría' };
  }

  // ---- Sin callers tras la reescritura — comentado hasta decidir eliminación ----

  // /** @deprecated Sin callers externos tras la fachada. Los métodos de baja del modelo
  //  *  viejo lo llamaban internamente; la fachada usa marcarItemAnulado en su lugar.
  //  *  TODO: decidir si se necesita al migrar tablero-diario al modelo nuevo. */
  // async deleteTablero(id: string): Promise<void> {
  //   return this.dbFirestore.deleteItem('tableroDiario', id);
  // }
}
