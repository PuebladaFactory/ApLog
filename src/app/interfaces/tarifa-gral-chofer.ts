export interface TarifaGralChofer {
    id:any;
    idTarifa:number;    
    fecha: string;
    cargasGenerales: CategoriaTarifa [];    
    adicionales: AdicionalTarifa;
    tipo: TarifaTipo;
    idChofer: number | null;        
    idCliente: number | null
    //publicidad: number;    
    //acompaniante: number;
    //tEspecial: boolean;
    //tarifaEspecial: TarifaEspecial;  
    

}

export interface CategoriaTarifa {
    orden: number;
    nombre: string;
    valor: number;
}

export interface AdicionalTarifa {
    acompaniante: number;
    publicidad: number;
    adicionalKm: AdicionalKm;
}

export interface AdicionalKm {
    primerSector: {
        distancia: number;
        valor: number;
    };
    sectoresSiguientes: {
        intervalo: number;
        valor: number;
    };
}

export interface TarifaTipo {
    general: boolean;
    especial: boolean;
    eventual: boolean;   
    personalizada: boolean; 
}
