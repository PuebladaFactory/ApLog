import { TarifaTipo } from "./tarifa-gral-cliente";

export interface FacturaOp {

    idFacturaOp: number;    
    idOperacion: number
    fecha: string | Date;        
    idCliente: number;
    idChofer: number;
    idProveedor: number;
    idTarifa:number;
    valores: Valores;    
    km: number;    
    liquidacion: boolean;
    contraParteMonto: number;
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
}
