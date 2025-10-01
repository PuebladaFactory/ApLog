export interface InformeVenta {

    idInfVenta: number;
    fecha: any;
    idOperacion: number;
    idCliente: number;
    idVendedor: number;
    valoresOp: ValoresOp;
    pago?: boolean;
}

export interface ValoresOp{
    totalCliente: number;
    totalChofer: number;
}
