export interface TarifaCliente {
    id:any;
    idTarifaCliente:number;
    idCliente: number;
    fecha: string;    
    cargasGenerales: CargasGenerales;
    unidadesConFrio: UnidadesConFrio;
    adicionales:{
        acompaniante: number;
        adicionalKm: AdicionalKm[];
    },   
    
    

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
    adicionalCargasGenerales: Adicionales[]|null;
}

export interface AdicionalKm {    
    adicionalKm:number;
    valor:number;
}

export interface Adicionales {    
    concepto: string;
    valor: number;
    
}
