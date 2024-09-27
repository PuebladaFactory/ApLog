import { Chofer } from "./chofer";
import { Cliente } from "./cliente";
import { TarifaTipo } from "./tarifa-gral-cliente";

export interface Operacion {
    id: any;
    idOperacion: number;
    fecha: Date;
    km: number | null;    
    documentacion: string | null;
    cliente: Cliente;
    chofer: Chofer;
    observaciones: string;    
    unidadesConFrio: boolean;
    acompaniante: boolean;
    facturada: boolean;
    facturaCliente: number | null;
    facturaChofer: number | null;
    tarifaEventual: boolean;
    tEventual: TarifaEventual;
    tarifaPersonalizada: boolean;
    tPersonalizada: TarifaPersonalizada;
    //tarifaTipo :TarifaTipo;
}

export interface TarifaEventual {    
    chofer:{
        concepto: string;
        valor: number;    
    },
    cliente:{
        concepto: string;
        valor: number;    
    },
    
}

export interface TarifaPersonalizada {    
    seccion: number;
    categoria:number;
    nombre: string;
    aCobrar: number;
    aPagar: number;
}
