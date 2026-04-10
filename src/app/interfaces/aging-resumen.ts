import { EntidadLiq } from "./informe-liq";

export interface AgingResumen {
  entidadId: number;
  razonSocial: string;
  tipo: 'cliente' | 'chofer' | 'proveedor';
  total: number;
    
  bucket0_30: number;
  bucket31_60: number;
  bucket61_90: number;
  bucket90mas: number;
}

export interface AgingGlobal {
  bucket0_30: number,
  bucket31_60: number,
  bucket61_90: number,
  bucket90mas: number,
  total: number,
}
