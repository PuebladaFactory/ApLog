import { FacturaOpProveedor } from "./factura-op-proveedor";

export interface FacturaProveedor {
    id: any|null;
    idFacturaProveedor: number;   
    fecha: string | Date;        
    idProveedor: number;    
    operaciones: FacturaOpProveedor [];
    total: number;
}
