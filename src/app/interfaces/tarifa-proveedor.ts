export interface TarifaProveedor {
    id:any;
    idTarifa:number;
    idProveedor: number;
    fecha: string;    
    cargasGenerales: CargasGenerales;
    //unidadesConFrio: UnidadesConFrio;
    adicionales: AdicionalTarifa;
    //tEspecial: boolean;
    tarifaEspecial: TarifaEspecial ; 
}

export interface CargasGenerales {
    utilitario:number;
    furgon:number;
    furgonGrande:number;
    chasisLiviano:number;
    chasis:number;
    balancin:number;
    semiRemolqueLocal:number;
    portacontenedores: number;
    //adicionalCargasGenerales: Adicionales|null;   
    
}

/* export interface UnidadesConFrio{
    utilitario:number;
    furgon:number;
    camionLiviano:number;
    chasis:number;
    balancin:number;
    semiRemolqueLocal:number;
    adicionalUnidadesConFrio: Adicionales[]|null;
} */

export interface AdicionalTarifa {    
    acompaniante: number;
    adicionalKm: AdicionalKm;
}

export interface AdicionalKm {    
    primerSector: {
        distancia: number;
        valor: number;
    }
    sectoresSiguientes:{
        intervalo: number;
        valor: number;
    }
}
/* export interface Adicionales {    
    concepto: string;
    valor: number;
    
} */

export interface TarifaEspecial {    
    concepto: string;
    valor: number;
    
}
