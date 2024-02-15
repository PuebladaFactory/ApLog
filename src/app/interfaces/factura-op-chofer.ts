import { Operacion } from "./operacion";

export interface FacturaOpChofer {
    
        id: any|null;
        idFacturaChofer: number;
        operacion: Operacion;
        fecha: string;  
        idChofer: number;
        valorJornada: number;
        adicional: number;        
        total: number;

        
    
}
