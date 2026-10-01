/** Modelo NUEVO de resúmenes de operaciones (Frente Reportes) — colección
 *  `resumenesOp`. Reemplaza a `resumenOpMensual` (modelo viejo, retirado del
 *  código al cierre del frente; la colección queda en Vantruck hasta la
 *  migración). Un documento por mes y clave:
 *    general_YYYY_MM
 *    cliente_{idCliente}_YYYY_MM
 *    chofer_{idChofer}_YYYY_MM          (chofer directo)
 *    proveedor_{idProveedor}_YYYY_MM    (la op de un chofer de proveedor
 *                                        cuenta para el proveedor)
 *  Patrón ConId: el id del documento no se guarda en el body.
 *  Un doc de entidad guarda los DOS lados (cliente y chofer/proveedor) de
 *  las ops de esa entidad: costo y ganancia incluidos. */

export type TipoEntidadResumen = 'cliente' | 'chofer' | 'proveedor';

export type NivelResumen = 'general' | 'especial' | 'personalizada' | 'eventual';

export interface LadoResumen {
  tarifaBase: number;     // YA multiplicada por el multiplicador del lado
  kmAdicional: number;
  acompValor: number;
  adExtraValor: number;
  total: number;          // aCobrar (cliente) / aPagar (chofer-proveedor)
  /** Cantidad de ops por nivel de tarifa de ESTE lado (cada lado puede
   *  tener un nivel distinto; eventual es de la op y cuenta en los dos). */
  niveles: Record<NivelResumen, number>;
}

/** Magnitudes sumables — lo que aporta una operación, o la suma de muchas. */
export interface MetricasResumen {
  cantidadOps: number;
  kmRecorridos: number;
  acompanianteOps: number;
  acompanianteCantidadTotal: number;
  cliente: LadoResumen;
  chofer: LadoResumen;    // lado chofer o proveedor
  ganancia: number;       // cliente.total − chofer.total
}

/** Identidad del documento (valores fijos, no sumables). */
export interface IdentidadResumen {
  tipo: 'general' | 'entidad';
  tipoEntidad: TipoEntidadResumen | null;  // null en general
  entidadId: string | null;                // null en general
  anio: number;
  mes: number;
  periodo: number;                         // anio*100 + mes
}

export interface ResumenOpNuevo extends IdentidadResumen, MetricasResumen {
  actualizado: number;  // Date.now() de la última escritura
}

/** Clave de un documento de resumen: su id + su identidad. */
export interface ClaveResumen extends IdentidadResumen {
  id: string;
}
