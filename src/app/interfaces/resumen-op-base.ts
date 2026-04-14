export interface ResumenOpBase {

  periodo: number; // ejemplo: 202512
  
  anio: number;
  mes: number;
  tipo: 'general' | 'entidad';
  cantidadOps: number;
  kmRecorridos: number;

  acompanianteOps: number;
  acompanianteCantidadTotal: number;

  tarifaTipo: {
    general: number;
    especial: number;
    personalizada: number;
    eventual: number;
  };

  cliente: {
    acompValor: number;
    kmAdicional: number;
    tarifaBase: number;    
    adExtraValor: number;
    total: number;
  };

  chofer: {
    acompValor: number;
    kmAdicional: number;
    tarifaBase: number;    
    adExtraValor: number;
    total: number;
  };

  ganancia: number;

}

export interface ResumenOpEntidadMensual extends ResumenOpBase {
  entidadId: number; 
  tipoEntidad: 'cliente' | 'chofer' | 'proveedor';   
}

export interface ResumenOpGeneralMensual extends ResumenOpBase {    
  // vacío a propósito
  
}

export interface PeriodoFiltro {
  desde: { anio: number; mes: number };
  hasta: { anio: number; mes: number };
}