import { FacturaOpCliente } from "./factura-op-cliente";

export interface FacturaCliente {
    id: any|null;
    idFacturaCliente: number;   
    fecha: string | Date;        
    idCliente: number;    
    operaciones: FacturaOpCliente [];
    total: number;
    cobrado:boolean;
    
}
