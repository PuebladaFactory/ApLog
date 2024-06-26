import { Operacion } from "./operacion";

export interface FacturaOpProveedor {

    id: any|null;
    idFacturaOpProveedor: number;
    fecha: string | Date;
    operacion: Operacion;
    idProveedor: number;
    idChofer: number;
    idTarifa: number;
    valorJornada: number;
    adicional: number;        
    total: number;
    liquidacion: boolean;
    montoFacturaCliente: number;

}
