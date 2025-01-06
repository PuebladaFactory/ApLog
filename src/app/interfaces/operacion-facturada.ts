import { Chofer } from "./chofer";
import { Cliente } from "./cliente";

export interface OperacionFacturada {
    
    idOperacion: number;
    fecha: Date;
    km: number | null;    
    documentacion: string | null;
    cliente: Cliente;
    chofer: Chofer;
    observaciones: string;
    estado: number;
    facturaCliente: number;
    facturaChofer: number;
    
}
