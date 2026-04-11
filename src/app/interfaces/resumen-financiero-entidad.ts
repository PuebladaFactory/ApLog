import { Timestamp } from "firebase/firestore";

export interface ResumenFinancieroEntidad {

  entidadId: number;

  tipoEntidad: 'cliente' | 'chofer' | 'proveedor';

  razonSocial: string;

  cuit?: string;

  // Totales financieros
  totalFacturado: number;
  totalCobrado: number;
  saldoPendiente: number;

  // Métricas útiles
  cantidadInformes: number;
  cantidadPendientes: number;

  // control
  createdAt: Timestamp;
  updatedAt: Timestamp;

}