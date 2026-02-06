export interface MovimientoFinanciero {
  /** Metadata */
  fecha: string; // ISO yyyy-mm-dd
  tipo: 'cobro' | 'pago';
  fechaOperacion?: string; // ISO yyyy-mm-dd
  /** Entidad */
  entidad: {
    id: string;
    tipo: 'cliente' | 'chofer' | 'proveedor';
    razonSocial: string;
  };

  /** Imputaciones */
  imputaciones: ImputacionMovimiento[];

  /** Totales */
  totalMovimiento: number;

  /** Medio / referencia */
  medioPago?: 'efectivo' | 'transferencia' | 'cheque' | 'otro';
  referencia?: string; // nro comprobante, operación bancaria, etc.

  /** Observaciones */
  observaciones?: string;

  /** Auditoría */
  creadoEn: string; // ISO datetime
  creadoPor: string; // uid
}

export interface ImputacionMovimiento {
  informeLiqId: string;

  /** Snapshot mínimo para evitar joins */
  numeroInterno: string;
  fechaInforme: string;

  /** Montos */
  totalInforme: number;
  montoImputado: number;
}

