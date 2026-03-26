import { Timestamp } from "firebase/firestore";
import { EntidadLiq, ValoresFinancieros } from "./informe-liq";

export interface CuentaCorrienteResumen {
  entidadId: string;
  tipoEntidad: "cliente" | "chofer" | "proveedor";

  razonSocial: string;
  cuit?: string;

  totalFacturado: number;
  totalCobrado: number;
  saldoPendiente: number;

  cantidadInformes: number;
  cantidadPendientes: number;

  updatedAt: Timestamp;

  // derivados útiles
  estado: "sin_deuda" | "al_dia" | "con_deuda";
}

export interface DetalleVistaCuentaCorriente {
  numero: string;
  fechaEmision: string;

  //fechaVencimiento: data.fechaVencimiento,
  entidad: EntidadLiq;
  total:number;
  cancelado:number;
  saldo:number;
  //formaPago: data.formaPago ?? "",               // Efectivo, transferencia, etc. (opcional)
  //fechaCobro: data.fechaCobro ?? "",       // Fecha en que se registró el cobro
  periodoLiq: string;
  periodoOrden: number;
  estadoFinanciero: "pendiente" | "parcial" | "cobrado";
}
