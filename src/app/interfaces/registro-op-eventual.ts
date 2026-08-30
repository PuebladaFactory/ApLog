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
}

export interface DatosEventualParte {
  concepto: string;
  valor: number;
}
