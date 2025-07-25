import { Injectable } from '@angular/core';
import { DbFirestoreService } from '../database/db-firestore.service';
import { ExcelService } from '../informes/excel/excel.service';
import { StorageService } from '../storage/storage.service';
import { ChoferAsignadoBase, TableroDiario } from 'src/app/raiz/operaciones/tablero-diario/tablero-diario.component';
import { Operacion } from 'src/app/interfaces/operacion';
import Swal from 'sweetalert2';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { Categoria, Chofer } from 'src/app/interfaces/chofer';

type ChoferAsignado = ConIdType<Chofer> & {
  categoriaAsignada: Categoria;
  observaciones: string;
  hojaDeRuta: string;
  tEventual:boolean;
  idOperacion?: number; // 👈 NUEVO
};


@Injectable({
  providedIn: 'root'
})
export class TableroService {

   constructor(
    private dbFirestore: DbFirestoreService,
    
    private storageService: StorageService
  ) {}

  /** 🔎 Obtener tablero por fecha */
  async getTableroPorFecha(fecha: string): Promise<TableroDiario | null> {
    return await this.dbFirestore.getTableroPorFecha(fecha);
  }

  /** 💾 Guardar o actualizar tablero */
  async guardarTablero(tablero: TableroDiario, accion:string): Promise<void> {
    await this.dbFirestore.setItem<TableroDiario>('tableroDiario', tablero.id, tablero);
    this.storageService.logSimple(
      tablero.timestamp,
      accion,
      'tableroDiario',
      `Tablero Diario del dia ${tablero.fecha}, guardado`,
      true
    );
  }

  /** ✔️ Alta de operación y actualización del tablero */
  async altaOperacionYActualizarTablero(op: Operacion): Promise<void> {
    //const fecha = op.fecha;
    const idCliente = op.cliente.idCliente;
    const fechaStr = (typeof op.fecha === 'string') ? op.fecha : new Date(op.fecha).toISOString().split('T')[0];
    const tablero = await this.getTableroPorFecha(fechaStr) ?? {
      id: fechaStr,
      fecha: fechaStr,
      asignaciones: {},
      timestamp: Date.now(),
      asignado: true
    };
    tablero.asignado = true;
    const categoria = this.getCategoriaDesdeOperacion(op);

    const asignacion: ChoferAsignadoBase = {
      idChofer: op.chofer.idChofer,
      categoriaAsignada: categoria,
      tEventual: op.tarifaTipo.eventual,
      observaciones: op.observaciones ?? '',
      hojaDeRuta: op.hojaRuta ?? '',
      idOperacion: op.idOperacion
    };

    if (!tablero.asignaciones[idCliente]) {
      tablero.asignaciones[idCliente] = [];
    }
    tablero.asignaciones[idCliente].push(asignacion);
    tablero.timestamp = Date.now();
    
    this.storageService.addItem("operaciones", op, op.idOperacion, "ALTA", "Alta de Operación");    //esto guarda la operación y genera un registro en el log

    await this.guardarTablero(tablero, "ACTUALIZACION");
  }

  /** ❌ Anular operación y actualizar tablero */
  async anularOperacionYActualizarTablero(op: ConId<Operacion>, motivo: string, mensaje:string): Promise<TableroDiario | null> {
    const fechaStr = (typeof op.fecha === 'string') ? op.fecha : new Date(op.fecha).toISOString().split('T')[0];;

    // 1. Dar de baja la operación
    await this.storageService.deleteItemPapelera(
      'operaciones',
      op,
      op.idOperacion,
      'BAJA',
      mensaje,      
      motivo
    );

    // 2. Buscar tablero
    const tablero = await this.getTableroPorFecha(fechaStr);
    if (!tablero) return null;

    // 3. Filtrar asignaciones
    const asignaciones: { [idCliente: number]: ChoferAsignado[] } = {};

    for (const [idStr, lista] of Object.entries(tablero.asignaciones)) {
      const idCliente = +idStr;
      const nuevaLista = (lista as ChoferAsignado[]).filter(c => c.idOperacion !== op.idOperacion);
      if (nuevaLista.length > 0) {
        asignaciones[idCliente] = nuevaLista;
      }
    }

    // 🔴 Si no queda ninguna asignación → eliminar tablero
    const noHayAsignaciones = Object.values(asignaciones).every(lista => lista.length === 0);
    if (noHayAsignaciones) {
      await this.deleteTablero(fechaStr); // Eliminar de la base
      localStorage.removeItem('tableroDiarioFirestore');
      localStorage.removeItem('asignacionesTemporal');
      return null;
    }

    // ✅ Si hay asignaciones → actualizar tablero
    const tableroActualizado: TableroDiario = {
      id: fechaStr,
      fecha: fechaStr,
      asignaciones,
      asignado: tablero.asignado ?? false,
      timestamp: Date.now()
    };

    await this.guardarTablero(tableroActualizado, "ACTUALIZACION");
    localStorage.setItem('tableroDiarioFirestore', JSON.stringify(tableroActualizado));

    return tableroActualizado;
  }

  async deleteTablero(id: string): Promise<void> {
    return this.dbFirestore.deleteItem('tableroDiario', id);
  }

  private getCategoriaDesdeOperacion(op: Operacion): Categoria {
    const patente = op.patenteChofer;
    const vehiculo = op.chofer.vehiculo.find(v => v.dominio === patente);
    return vehiculo?.categoria ?? { catOrden: 0, nombre: 'Sin categoría' };
  }


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

      // 1. Guardar operaciones en lote
      await this.dbFirestore.guardarMultiple(operaciones, 'operaciones', 'idOperacion', 'operaciones');

      // 2. Crear las asignaciones correspondientes
      for (const op of operaciones) {
        const idCliente = op.cliente.idCliente;

        const categoria = this.getCategoriaDesdeOperacion(op);

        const asignacion: ChoferAsignadoBase = {
          idChofer: op.chofer.idChofer,
          categoriaAsignada: categoria,
          tEventual: op.tarifaTipo.eventual,
          observaciones: op.observaciones ?? '',
          hojaDeRuta: op.hojaRuta ?? '',
          idOperacion: op.idOperacion,
        };

        if (!tablero.asignaciones[idCliente]) {
          tablero.asignaciones[idCliente] = [];
        }

        tablero.asignaciones[idCliente].push(asignacion);
      }

      tablero.timestamp = Date.now();

      // 3. Guardar tablero
      await this.guardarTablero(tablero, "ACTUALIZACION");

      // 4. Guardar logs por operación
      const ids = operaciones.map(op => op.idOperacion);
      this.storageService.logMultiplesOp(ids, "ALTA", "operaciones", "Alta de Operación", true);

      return { exito: true, mensaje: 'Operaciones y tablero guardados correctamente.' };

    } catch (error) {
      console.error('Error en alta múltiple:', error);
      return { exito: false, mensaje: 'Error al guardar operaciones o actualizar tablero.' };
    }
  }

  async actualizarAsignacionDesdeOperacion(op: ConId<Operacion>): Promise<void> {
    const fechaStr = typeof op.fecha === 'string'
      ? op.fecha
      : new Date(op.fecha).toISOString().split('T')[0];

    const tablero = await this.getTableroPorFecha(fechaStr);
    if (!tablero) {
      console.warn(`No se encontró tablero para la fecha ${fechaStr}`);
      return;
    }

    const idCliente = op.cliente.idCliente;
    const asignaciones = tablero.asignaciones[idCliente];

    if (!asignaciones || !asignaciones.length) {
      console.warn(`No se encontraron asignaciones para el cliente ${idCliente}`);
      return;
    }

    const asignacion = asignaciones.find(a => a.idOperacion === op.idOperacion);
    if (!asignacion) {
      console.warn(`No se encontró asignación con idOperacion ${op.idOperacion}`);
      return;
    }

    // Actualizar campos
    asignacion.observaciones = op.observaciones ?? '';
    asignacion.hojaDeRuta = op.hojaRuta ?? '';

    // Guardar tablero actualizado
    tablero.timestamp = Date.now();
    await this.guardarTablero(tablero, 'EDICION');

    // Actualizar localStorage
    localStorage.setItem('tableroDiarioFirestore', JSON.stringify(tablero));
  }

  //el caso que se anula una op desde liquidacion
  async anularOpEnTablero(op: ConId<Operacion>): Promise<TableroDiario | null> {
    const fechaStr = (typeof op.fecha === 'string') ? op.fecha : new Date(op.fecha).toISOString().split('T')[0];;

    // 2. Buscar tablero
    const tablero = await this.getTableroPorFecha(fechaStr);
    if (!tablero) return null;

    // 3. Filtrar asignaciones
    const asignaciones: { [idCliente: number]: ChoferAsignado[] } = {};

    for (const [idStr, lista] of Object.entries(tablero.asignaciones)) {
      const idCliente = +idStr;
      const nuevaLista = (lista as ChoferAsignado[]).filter(c => c.idOperacion !== op.idOperacion);
      if (nuevaLista.length > 0) {
        asignaciones[idCliente] = nuevaLista;
      }
    }

    // 🔴 Si no queda ninguna asignación → eliminar tablero
    const noHayAsignaciones = Object.values(asignaciones).every(lista => lista.length === 0);
    if (noHayAsignaciones) {
      await this.deleteTablero(fechaStr); // Eliminar de la base
      localStorage.removeItem('tableroDiarioFirestore');
      localStorage.removeItem('asignacionesTemporal');
      return null;
    }

    // ✅ Si hay asignaciones → actualizar tablero
    const tableroActualizado: TableroDiario = {
      id: fechaStr,
      fecha: fechaStr,
      asignaciones,
      asignado: tablero.asignado ?? false,
      timestamp: Date.now()
    };

    await this.guardarTablero(tableroActualizado, "ACTUALIZACION");
    localStorage.setItem('tableroDiarioFirestore', JSON.stringify(tableroActualizado));

    return tableroActualizado;
  }

}
