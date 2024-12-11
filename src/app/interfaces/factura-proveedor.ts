import { FacturaOpProveedor } from "./factura-op-proveedor";

export interface FacturaProveedor {
    id: any|null;
    idFacturaProveedor: number;   
    fecha: string | Date;        
    idProveedor: number;    
    razonSocial:string;
    operaciones: number [];
    valores: Valores;
    cobrado:boolean;
    montoFacturaCliente:number;
    columnas: string[];
    descuentos: Descuento [];
}

export interface Valores{
    totalTarifaBase: number;
    totalAcompaniante: number;
    totalkmMonto: number;
    descuentoTotal: number;
    total: number;
}

export interface Descuento {
    concepto: string;
    valor: number;
}
