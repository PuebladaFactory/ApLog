import { TarifaTipo } from "./tarifa-gral-cliente";

export interface FacturaOp {

    id: any|null;
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
    tarifaTipo: TarifaTipo;

}

export interface Valores{
    tarifaBase: number;
    acompaniante: number;
    kmMonto: number;
    total: number;
}
