import { Chofer } from "./chofer";
import { Cliente } from "./cliente";
import { TarifaTipo } from "./tarifa-gral-cliente";

export interface Operacion {
    
    idOperacion: number;
    fecha: Date;
    km: number;    
    documentacion: string | null;
    cliente: Cliente;
    chofer: Chofer;
    observaciones: string;    
    //unidadesConFrio: boolean;
    acompaniante: boolean;    
    facturaCliente: number;
    facturaChofer: number;
    hojaRuta:string;
    tarifaEventual: TarifaEventual;
    
    tarifaPersonalizada: TarifaPersonalizada;
    patenteChofer: string;
    //facturada: boolean;
    estado: EstadoOp;   
    tarifaTipo :TarifaTipo;
    valores: Valores;
    multiplicadorCliente:number;
    multiplicadorChofer:number;
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

export interface EstadoOp {    
    abierta: boolean;
    cerrada: boolean;
    facCliente: boolean;
    facChofer: boolean;
    facturada: boolean;
    proformaCl: boolean;
    proformaCh: boolean;
}

export interface Valores{    
    cliente:{
        acompValor: number;
        kmAdicional: number;
        tarifaBase: number,
        aCobrar: number;    
    }
    chofer: {
        acompValor: number;
        kmAdicional: number;
        tarifaBase: number;
        aPagar: number;
    }
}
