export type EstadoOpRecalculo = "abierta" | "cerrada";

// Estado real de la operación, para mostrar. El flag 'cerrada' se apaga
// cuando liquida cualquiera de las dos partes, así que no alcanza para
// describir en qué punto del circuito está la op.
export type EstadoDetalleRecalculo =
  | "abierta"
  | "cerrada"
  | "liquidada-contraparte"
  | "liquidada-cliente"
  | "facturada";

export type NivelTarifa = "general" | "especial" | "personalizada";

export interface ValoresLadoCliente {
  tarifaBase: number;
  acompValor: number;
  kmAdicional: number;
  adExtraValor: number;
  total: number;
}

export interface ContraParteRecalculo {
  coleccion: string;
  idInfOp: number;
  idDoc: string;
  liquidada: boolean;
  montoActual: number;
  montoNuevo: number;
}

export interface FilaRecalculo {
  idOperacion: number;
  idDocOperacion: string;
  fecha: string;
  estado: EstadoOpRecalculo;
  estadoDetalle: EstadoDetalleRecalculo;
  hojaRuta: string;
  patente: string;
  idTarifaActual: number;
  idTarifaNueva: number;
  informeClienteId: string | null;
  informeClienteIdInfOp: number | null;
  actual: ValoresLadoCliente;
  nueva: ValoresLadoCliente;
  diferencia: number;
  contraParte: ContraParteRecalculo | null;
  advertencias: string[];
  recalculable: boolean;
}

export interface TarifaVigenteResumen {
  idTarifa: number;
  fecha: string;
  nivel: NivelTarifa;
}

export interface TotalesRecalculo {
  cantidadAbiertas: number;
  cantidadCerradas: number;
  cantidadNoRecalculables: number;
  diferenciaTotal: number;
}

export interface ResultadoFila {
  idOperacion: number;
  exito: boolean;
  motivo?: string;
}

export interface AjusteInformeLiq {
  idDoc: string;
  numeroInterno: string;
  tipo: string;
  totalActual: number;
  totalNuevo: number;
  delta: number;
  // Operaciones de ESTE recálculo que caen en el InformeLiq.
  cantidadOps: number;
  // Operaciones totales que agrupa el InformeLiq.
  cantidadOpsTotal: number;
}

export interface ResultadoRecalculo {
  dryRun: boolean;
  aplicadas: number;
  diferenciaAplicada: number;
  fallidas: ResultadoFila[];
  ajustesInformeLiq: AjusteInformeLiq[];
  opsSinInformeLiq: number[];
}

export interface PreviewRecalculo {
  idCliente: number;
  razonSocial: string;
  periodo: { anio: number; mes: number; desde: string; hasta: string };
  tarifaVigente: TarifaVigenteResumen;
  filas: FilaRecalculo[];
  totales: TotalesRecalculo;
}
