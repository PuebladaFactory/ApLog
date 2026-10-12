import { Anulacion } from './anulacion';

export interface RegistroOpEventual {
  idTarifa: string;                     // id del documento, poblado al leer (mismo patrón que TarifaBase.idTarifa)
  idOperacion: string;
  fecha: string;                        // ISO — fecha de cierre de la operación (momento en que se crea el registro)
  idCliente: string;
  idChofer: string;                     // siempre presente — quien manejó, sea directo o de proveedor
  idProveedor: string | null;           // presente solo si la operación fue contratada con proveedor
  cliente: DatosEventualParte;          // siempre presente
  chofer: DatosEventualParte | null;    // presente si la contratación fue directa
  proveedor: DatosEventualParte | null; // presente si fue con proveedor
  // Ciclo de vida (TC4). Opcionales: los registros migrados del modelo viejo
  // no los tienen — sin `estado` = 'activo'.
  estado?: 'activo' | 'anulado';        // 'anulado' = su operación cerrada se dio de baja
  anulacion?: AnulacionRegistroOpEventual | null; // solo en 'anulado'
}

/** Anulación de un RegistroOpEventual: baja de su operación cerrada
 *  (OperacionService.bajaOperacionCerrada) — mismo objeto que anula el par
 *  de InformeOp. idEventoPapelera: evento de papelera de la operación. */
export interface AnulacionRegistroOpEventual extends Anulacion {
  idEventoPapelera: string;
}

export interface DatosEventualParte {
  concepto: string;
  valor: number;
}
