import { TarifaTipo } from "./tarifa-gral-cliente";

export interface Operacion {
  idOperacion: string;              // document ID de Firestore. NO se persiste; se reconstruye al leer.
  numeroOperacion: number;          // correlativo visible para el usuario (generado por servicio contador)
  fecha: string;
  km: number;
  documentacion: string | null;
  hojaRuta: string;
  observaciones: string;

  cliente: RefCliente;
  chofer: RefChofer;
  vehiculo: RefVehiculo;
  proveedor: RefProveedor | null;

  acompaniante: boolean;
  acompanianteCant?: number;

  informeOpCliente: number;
  informeOpChofer: number;

  tarifaTipo: TarifaTipo;
  datosTarifaEventual: DatosTarifaEventual | null;
  datosTarifaPersonalizada: DatosTarifaPersonalizada | null;

  valores: Valores;
  multiplicadorCliente: number;
  multiplicadorChofer: number;
  adExtraConcepto?: string;

  estado: EstadoOp;

  lockLiquidacion?: {
    usuario: string;
    timestamp: number;
  };
  resumenProcesado?: boolean;
}

export interface RefCliente {
  id: string;
  razonSocial: string;
  cuit: number;
  // Histórico: vendedores que cobran comisión por la operación (congelados al alta).
  // Comisión es por operación, no del vendedor vigente del cliente.
  vendedor?: string[];
}

export interface RefChofer {
  id: string;
  nombre: string;
  apellido: string;
  cuit: number;
}

export interface RefVehiculo {
  id: string;
  dominio: string;
  categoria: { catOrden: number; nombre: string };
}

export interface RefProveedor {
  id: string;
  razonSocial: string;
  cuit: number;
}

export interface DatosTarifaEventual {
  chofer: { concepto: string; valor: number };
  cliente: { concepto: string; valor: number };
}

export interface DatosTarifaPersonalizada {
  seccion: number;
  categoria: number;
  nombre: string;
  aCobrar: number;
  aPagar: number;
}

export interface EstadoOp {
  ciclo: 'abierta' | 'cerrada' | 'liquidada';
  liquidacion: { cliente: boolean; chofer: boolean };
  proforma: { cliente: boolean; chofer: boolean };
}

export interface Valores {
  cliente: {
    acompValor: number;
    kmAdicional: number;
    tarifaBase: number;
    aCobrar: number;
    adExtraValor?: number;
  };
  chofer: {
    acompValor: number;
    kmAdicional: number;
    tarifaBase: number;
    aPagar: number;
    adExtraValor?: number;
  };
}
