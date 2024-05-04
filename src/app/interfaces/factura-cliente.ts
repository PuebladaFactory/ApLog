import { FacturaOpCliente } from "./factura-op-cliente";

export interface FacturaCliente {
    id: any|null;
    idFacturaCliente: number;   
    fecha: string | Date;        
    idCliente: number;    
    razonSocial: string;
    operaciones: number [];
    total: number;
    cobrado:boolean;
    montoFacturaChofer:number;

    
}
