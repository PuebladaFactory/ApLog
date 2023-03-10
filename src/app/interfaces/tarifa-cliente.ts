export interface TarifaCliente {
    id:any;
    idTarifaCliente:number;
    idCliente: number;
    fecha: string;    
    cargasGenerales:{
        utilitario:number;
        furgon:number;
        camionLiviano:number;
        chasis:number;
        balancin:number;
        semiRemolqueLocal:number;
        adicionalCargasGenerales: Adicionales[]|null;
    };
    unidadesConFrio:{
        utilitario:number;
        furgon:number;
        camionLiviano:number;
        chasis:number;
        balancin:number;
        semiRemolqueLocal:number;
        adicionalCargasGenerales: Adicionales[]|null;
    };
    adicionales:{
        acompaniante: number;
        adicionalKm: AdicionalKm[];
    },   
    
    

}


export interface AdicionalKm {    
    adicionalKm:number;
    valor:number;
}

export interface Adicionales {    
    concepto: string;
    valor: number;
    
}
