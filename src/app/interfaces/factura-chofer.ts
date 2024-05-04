import { FacturaOpChofer } from "./factura-op-chofer";

export interface FacturaChofer {

    id: any|null;
    idFacturaChofer: number;   
    fecha: string | Date;        
    idChofer: number;    
    apellido: string;
    nombre: string;
    operaciones: number [];
    total: number;
    cobrado:boolean;
    montoFacturaCliente:number;

}
