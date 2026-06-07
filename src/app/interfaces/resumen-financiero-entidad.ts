import { Timestamp } from "firebase/firestore";

export interface ResumenFinancieroEntidad {

  // TODO: migrar a string cuando se refactorice este módulo (ID unificado con ConIdType.id)
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