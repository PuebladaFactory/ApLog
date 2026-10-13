export interface CategoriaTarifa {
    orden: number;
    nombre: string;
    valor: number;
    adicionalKm: AdicionalKm;
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

