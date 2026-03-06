export interface MovimientoImpresionVM {
  id: string;

  tipo: "cobro" | "pago";

  titulo: string;

  numeroComprobante: string;

  fechaOperacion: string;

  estado: "activo" | "anulado";

  motivoAnulacion?: string;

  entidad: {
    razonSocial: string;
    tipo: string;
  };

  medioPago: string;
  referencia?: string;
  observaciones?: string;

  total: number;

  creadoEn: string;

  imputaciones: MovimientoImpresionImputacionVM[];
}

export interface MovimientoImpresionImputacionVM {
  informeId: string;
  numeroInterno: string;

  fechaInforme: string;
  mes: string;
  periodo: string;

  totalInforme?: number;

  montoImputado: number;
}


