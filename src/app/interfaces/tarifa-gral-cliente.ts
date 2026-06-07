export interface TarifaGralCliente {
    
    // TODO: migrar a string cuando se refactorice este módulo (ID unificado con ConIdType.id)
    idTarifa: number;
    fecha: string;
    cargasGenerales: CategoriaTarifa [];
    adicionales: AdicionalTarifa;
    tipo: TarifaTipo;
    idCliente: number;
    // TODO: migrar a string cuando se refactorice este módulo (ID unificado con ConIdType.id)
    idChofer: number;
    idProveedor: number;
}
export interface CategoriaTarifa {
    orden: number;
    nombre: string;
    valor: number;
    adicionalKm: AdicionalKm;
}

export interface AdicionalTarifa {
    acompaniante: number;
    KmDistancia:{    
        primerSector: number;    
        sectoresSiguientes: number;
    };
}

export interface AdicionalKm {
    primerSector: number;    
    sectoresSiguientes: number;    
}

export interface TarifaTipo {
    general: boolean;
    especial: boolean;
    eventual: boolean;   
    personalizada: boolean; 
}

