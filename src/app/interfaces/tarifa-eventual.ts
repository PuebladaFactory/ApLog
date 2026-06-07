import { TarifaTipo } from "./tarifa-gral-cliente";

export interface TarifaEventual {
    
    // TODO: migrar a string cuando se refactorice este módulo (ID unificado con ConIdType.id)
    idTarifa: number;
    fecha: string | Date;
    cliente: ClienteEventual;
    chofer: ChoferEventual;
    tipo: TarifaTipo;
    idCliente: number;
    // TODO: migrar a string cuando se refactorice este módulo (ID unificado con ConIdType.id)
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
