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
    columnas: string [];
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
