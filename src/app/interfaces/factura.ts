export interface Factura {

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
}

export interface Valores{
    totalTarifaBase: number;
    totalAcompaniante: number;
    totalkmMonto: number;
    total: number;
}
