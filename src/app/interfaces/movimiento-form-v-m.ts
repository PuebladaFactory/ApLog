export interface MovimientoFormVM {
  tipo: 'cobro' | 'pago';

  entidad: {
    id: string;
    tipo: 'cliente' | 'chofer' | 'proveedor';
    razonSocial: string;
  };

  informesSeleccionados: {
    informeLiqId: string;
    numeroInterno: string;
    fecha: string;

    total: number;
    totalCobrado: number;
    saldo: number;

    montoACobrar: number;
  }[];

  medioPago?: 'efectivo' | 'transferencia' | 'cheque' | 'otro';
  referencia?: string;
  observaciones?: string;
}