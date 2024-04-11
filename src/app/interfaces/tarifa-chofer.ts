export interface TarifaChofer {
    id:any;
    idTarifa:number;
    valorJornada: number;
    km:AdicionalKm;    
    publicidad: number;
    idChofer: number;
    fecha: string;    
    acompaniante: number | null;
    //tEspecial: boolean;
    tarifaEspecial: TarifaEspecial  | null
    

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

export interface TarifaEspecial {    
    concepto: string;
    valor: number;
    
}