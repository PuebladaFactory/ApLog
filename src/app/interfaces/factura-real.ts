export interface FacturaReal {
    idFactura: string;
    idInfLiq?: string; // back reference
    fechaEmision: Date;
    nroComprobante: string; // 0001-0000042
    cae: string;
    fechaVtoCAE: string;
    cliente: ClienteInfo;
    items: DetalleItem[];
    subtotal: number;
    impuestos: Impuesto[]; // IVA, etc.
    total: number;
    pdfUrl?: string; // descarga desde Cloud Storage
}

export interface ClienteInfo{
    
}

export interface DetalleItem{
    
}

export interface Impuesto{
    
}


