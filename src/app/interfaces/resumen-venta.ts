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
    asignacionesExt: AsignacionExtendida[];
    total: number;
    
}

interface AsignacionExtendida extends Asignacion {
  totalCliente: number;
  totalComision: number;
}
