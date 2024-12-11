import { FacturaOpChofer } from "./factura-op-chofer";

export interface FacturaChofer {

    id: any|null;
    idFacturaChofer: number;   
    fecha: string | Date;        
    idChofer: number;    
    apellido: string;
    nombre: string;
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