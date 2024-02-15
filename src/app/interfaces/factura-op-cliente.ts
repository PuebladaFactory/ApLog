import { Operacion } from "./operacion";

export interface FacturaOpCliente {

    id: any|null;
    idFacturaCliente: number;
    operacion: Operacion
    fecha: string;        
    idCliente: number;
    valorJornada: number;
    adicional: number;        
    total: number;
    liquidacion: boolean;
}
