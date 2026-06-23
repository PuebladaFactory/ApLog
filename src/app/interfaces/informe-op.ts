import { TarifaTipo } from "./tarifa-gral-cliente";

export interface InformeOp {
    idInfOp: number;    
    idOperacion: string
    fecha: string | Date;        
    idCliente: number;
    // TODO: migrar a string cuando se refactorice este módulo (ID unificado con ConIdType.id)
    idChofer: number;
    idProveedor: string;
    // TODO: migrar a string cuando se refactorice este módulo (ID unificado con ConIdType.id)
    idTarifa:number;
    valores: Valores;    
    km: number;    
    liquidacion: boolean;
    contraParteMonto: number;
    // TODO: migrar a string cuando se refactorice este módulo (ID unificado con ConIdType.id)
    contraParteId: number;
    tarifaTipo: TarifaTipo;
    observaciones: string;
    hojaRuta: string;
    patente: string;
    proforma: boolean;
    contraParteProforma: boolean;

}
    
export interface Valores{
    tarifaBase: number;
    acompaniante: number;
    kmMonto: number;
    total: number;
    adExtra?:number;
}

