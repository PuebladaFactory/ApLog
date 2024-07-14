import { Chofer } from "./chofer";
import { Cliente } from "./cliente";

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
    tarifaEspecial: boolean;
    tEspecial: TarifaEspecial;
}

export interface TarifaEspecial {    
    chofer:{
        concepto: string;
        valor: number;    
    },
    cliente:{
        concepto: string;
        valor: number;    
    },
    
}
