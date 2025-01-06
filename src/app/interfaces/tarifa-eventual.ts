import { TarifaTipo } from "./tarifa-gral-cliente";

export interface TarifaEventual {
    
    idTarifa: number;
    fecha: string | Date;
    cliente: ClienteEventual;
    chofer: ChoferEventual;         
    tipo: TarifaTipo;    
    idCliente: number;
    idChofer: number;
    idProveedor: number;
    idOperacion: number;
    km: number;
}

export interface ClienteEventual {
    concepto: string;
    valor:number;
}

export interface ChoferEventual {
    concepto: string;
    valor:number;
}
