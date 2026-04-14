export interface ResumenOpTabla {

  mes: number;
  labelMes: string;

  cantidadOps: number;

  kmTotal: number;
  kmPromedio: number;

  facturado: number;
  costo: number;
  ganancia: number;

  porcentajeGanancia: number;

  acompanianteOps: number;
  porcentajeAcompaniante: number;

  tarifaTipo: {
    general: number;
    especial: number;
    personalizada: number;
    eventual: number;
  };
    
}
