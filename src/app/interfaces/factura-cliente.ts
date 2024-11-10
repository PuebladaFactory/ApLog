import { FacturaOpCliente } from "./factura-op-cliente";

export interface FacturaCliente {
    id: any|null;
    idFacturaCliente: number;   
    fecha: string | Date;        
    idCliente: number;    
    razonSocial: string;
    operaciones: number [];
    valores: Valores;
    cobrado:boolean;
    montoFacturaChofer:number;

    
}

export interface Valores{
    totalTarifaBase: number;
    totalAcompaniante: number;
    totalkmMonto: number;
    total: number;
}
