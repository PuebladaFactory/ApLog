export interface TarifaGralCliente {
    id: any;
    idTarifa: number;
    fecha: string;    
    cargasGenerales: CategoriaTarifa [];
    adicionales: AdicionalTarifa;
    tipo: TarifaTipo;    
    idCliente: number|null;
    idChofer: number|null;
    idProveedor: number|null;
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

