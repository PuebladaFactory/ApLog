import { Operacion } from "./operacion";

export interface FacturaOpChofer {
    
        id: any|null;
        idFacturaOpChofer: number;
        operacion: Operacion;
        fecha: string | Date;  
        idChofer: number;
        idTarifa:number;
        valorJornada: number;
        adicional: number;        
        total: number;
        liquidacion: boolean;
        montoFacturaCliente: number;

        
    
}
