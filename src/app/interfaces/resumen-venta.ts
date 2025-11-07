import { InformeVenta } from "./informe-venta";

export interface ResumenVenta {
    idResumen:number;
    idVendedor:number;
    fecha: any;
    informesVenta: InformeVenta[];
    porcentaje: number;
    valores: ValoresResumen;
    pagado?:boolean;
}

export interface ValoresResumen{
    totalCliente: number;
    totalChofer: number;
    totalVendedor:number;
}
