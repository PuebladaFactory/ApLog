import { Operacion } from "./operacion";

export interface FacturaOpProveedor {

    id: any|null;
    idFacturaProveedor: number;
    fecha: string;
    operacion: Operacion;
    idProveedor: number;
    idChofer: number;
    valorJornada: number;
    adicional: number;        
    total: number;

}
