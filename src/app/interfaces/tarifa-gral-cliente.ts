export interface TarifaGralCliente {
    
    idTarifa: number;
    fecha: string;    
    cargasGenerales: CategoriaTarifa [];
    adicionales: AdicionalTarifa;
    tipo: TarifaTipo;    
    idCliente: number;
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

