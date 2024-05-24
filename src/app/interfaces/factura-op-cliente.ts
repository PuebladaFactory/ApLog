import { Operacion } from "./operacion";

export interface FacturaOpCliente {

    id: any|null;
    idFacturaOpCliente: number;
    operacion: Operacion
    fecha: string | Date;        
    idCliente: number;
    idTarifa:number;
    valorJornada: number;
    adicional: number;        
    total: number;
    liquidacion: boolean;
    montoFacturaChofer: number;
}
