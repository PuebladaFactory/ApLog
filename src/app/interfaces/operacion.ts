import { Chofer } from "./chofer";
import { Cliente } from "./cliente";

export interface Operacion {
    id: any;
    idOperacion: number;
    fecha: Date;
    km: number | null;
    peaje: number | null;
    documentacion: string | null;
    cliente: Cliente;
    chofer: Chofer;
    estado: number;
}
