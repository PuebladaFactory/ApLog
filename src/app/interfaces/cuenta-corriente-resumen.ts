import { Timestamp } from "firebase/firestore";

export interface CuentaCorrienteResumen {
  entidadId: string;
  tipoEntidad: 'cliente' | 'chofer' | 'proveedor';

  razonSocial: string;
  cuit?: string;

  totalFacturado: number;
  totalCobrado: number;
  saldoPendiente: number;

  cantidadInformes: number;
  cantidadPendientes: number;

  updatedAt: Timestamp;

  // derivados útiles
  estado: 'sin_deuda' | 'al_dia' | 'con_deuda';
}