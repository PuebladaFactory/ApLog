import { Asignacion } from "./vendedor";

export interface ResumenVenta {
    idResumen:number;
    idVendedor:number;
    fecha: any;
    periodo: {
        mes: number;
        anio: number;
    };
    idsInfVenta: number[];
    operaciones: OpVenta[];
    asignacionesExt: AsignacionExtendida[];
    total: number;
    
}

interface AsignacionExtendida extends Asignacion {
  totalCliente: number;
  totalComision: number;
}

export interface OpVenta {
    fecha: any;
    idOp: number;
    idCliente:number;
    totalCliente: number;
    totalChofer: number;
}
