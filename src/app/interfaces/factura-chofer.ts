import { FacturaOpChofer } from "./factura-op-chofer";

export interface FacturaChofer {

    id: any|null;
    idFacturaChofer: number;   
    fecha: string | Date;        
    idChofer: number;    
    operaciones: FacturaOpChofer [];
    total: number;
    cobrado:boolean;
    montoFacturaCliente:number;

}
