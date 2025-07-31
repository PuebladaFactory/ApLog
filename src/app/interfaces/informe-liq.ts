export interface InformeLiq {
    idInfLiq: number;                // ID interno en Firestore (opcional)
    numeroInterno: string;             // Ej: LQCL-0042

    tipo: 'cliente' | 'chofer' | 'proveedor'; // Para saber de qué entidad se trata

    fecha: Date | string;              // Fecha de generación del informe
    entidad: EntidadLiq;              // Información básica de cliente/chofer/proveedor

    operaciones: number[];            // Array de IDs de operaciones incluidas

    valores: Valores;              // Detalle de los montos calculados
    descuentos: Descuento[];         // Descuentos aplicados (opcional)

    columnas: string[];              // Columnas visibles en el informe exportado

    estado: 'borrador' | 'emitido' | 'facturado' | 'cobrado' | 'anulado'; // Estado interno del informe
    cobrado:boolean;                    //agregado para que coincida con el viejo modelo de FacturaCliente/Chofer

    formaPago?: string;               // Efectivo, transferencia, etc. (opcional)
    fechaCobro?: Date | string;       // Fecha en que se registró el cobro

    observaciones?: string;           // Campo libre para anotar algo manualmente

    facturaVinculada?: string;        // ID o número de la factura fiscal (a futuro)

    anuladoMotivo?: string;                 //motivo de anulacion
    anuladoPor?: string;                 //usuario que realizó la anulación
    fechaAnulacion?: string | Date;         //fecha de la anulación
}

export interface EntidadLiq {
    id: number;                       // ID del cliente/chofer/proveedor
    razonSocial: string;                  // Nombre o razón social    
    cuit?: number;                   // Opcional, dependiendo si es persona física o no
}


export interface Valores{
    totalTarifaBase: number;
    totalAcompaniante: number;
    totalkmMonto: number;
    descuentoTotal: number;
    total: number;
    totalContraParte:number;
}
export interface Descuento {
    concepto: string;
    valor: number;
}
