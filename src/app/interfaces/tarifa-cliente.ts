export interface TarifaCliente {
    id:any;
    idTarifaCliente:number;
    idCliente: number;
    fecha: string;    
    cargasGenerales: CargasGenerales;
    unidadesConFrio: UnidadesConFrio;
    adicionales: AdicionalTarifa;

}

export interface CargasGenerales {
    utilitario:number;
    furgon:number;
    camionLiviano:number;
    chasis:number;
    balancin:number;
    semiRemolqueLocal:number;
    adicionalCargasGenerales: Adicionales[]|null;
}

export interface UnidadesConFrio{
    utilitario:number;
    furgon:number;
    camionLiviano:number;
    chasis:number;
    balancin:number;
    semiRemolqueLocal:number;
    adicionalUnidadesConFrio: Adicionales[]|null;
}

export interface AdicionalTarifa {    
    acompaniante: number;
    adicionalKm: AdicionalKm[];
}

export interface AdicionalKm {    
    adicionalKm:string;
    valor:number;
}

export interface Adicionales {    
    concepto: string;
    valor: number;
    
}
