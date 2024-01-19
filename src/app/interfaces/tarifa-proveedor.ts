export interface TarifaProveedor {
    id:any;
    idTarifa:number;       
    publicidad: number;
    idProveedor: number;
    fecha: string;   
    cargasGenerales: CargasGenerales;
    unidadesConFrio: UnidadesConFrio;
    adicionales: AdicionalTarifa;   

}

export interface CargasGenerales {
    utilitarioJornada:number;
    furgonJornada:number;
    camionLivianoJornada:number;
    chasisJornada:number;
    balancinJornada:number;
    semiRemolqueLocalJornada:number;
    adicionalCargasGenerales: Adicionales[]|null;
}

export interface UnidadesConFrio{
    utilitarioJornada:number;
    furgonJornada:number;
    camionLivianoJornada:number;
    chasisJornada:number;
    balancinJornada:number;
    semiRemolqueLocalJornada:number;
    adicionalUnidadesConFrio: Adicionales[]|null;
}

export interface AdicionalTarifa {    
    acompaniante: number;
    adicionalKm: AdicionalKm[];
}

export interface AdicionalKm {    
    primerSector: number;
    sectorSiguiente:number;
}

export interface Adicionales {    
    concepto: string;
    valor: number;
    
}

