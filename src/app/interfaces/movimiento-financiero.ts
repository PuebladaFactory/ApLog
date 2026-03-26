export interface MovimientoFinanciero {
  /** Metadata */
  fecha: string; // ISO yyyy-mm-dd
  idMovFinanciero: number;
  numeroComprobante: string
  tipo: 'cobro' | 'pago';
  fechaOperacion?: string; // ISO yyyy-mm-dd
  /** Entidad */
  entidad: {
    id: number;
    tipo: 'cliente' | 'chofer' | 'proveedor';
    razonSocial: string;
  };

  /** Imputaciones */
  imputaciones: ImputacionMovimiento[];
  informeLiqIds: string[];

  /** Totales */
  totalMovimiento: number;

  /** Medio / referencia */
  medioPago?: 'efectivo' | 'transferencia' | 'cheque' | 'otro';
  referencia?: string; // nro comprobante, operación bancaria, etc.

  /** Observaciones */
  observaciones?: string;

  /* Anulación */
  estado: 'activo' | 'anulado';
  anuladoPor?: string;
  fechaAnulacion?: string;
  motivoAnulacion?: string;

  /** Auditoría */
  creadoEn: string; // ISO datetime
  creadoPor: string; // uid
}

export interface ImputacionMovimiento {
  informeLiqId: string;

  /** Snapshot mínimo para evitar joins */
  numeroInterno: string;
  fechaInforme: string;

  /** datos */
  mesLiquidado?: string;
  periodoLiquidado?: string;

  /** Montos */
  totalInforme: number;
  montoImputado: number;
  saldoInforme: number;
}

