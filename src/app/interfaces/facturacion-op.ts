import { Operacion } from "./operacion";

export interface FacturacionOp {
    id:any | null;
    idFacturacionOp: number;
    operacion: Operacion;
    liquidacionChofer: number;
    facturacionCliente: number;
}
