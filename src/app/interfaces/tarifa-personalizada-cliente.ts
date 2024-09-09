export interface TarifaPersonalizadaCliente {
    id: any;
    idTarifa: number;
    fecha: string;
    secciones: Seccion [];
    tipo: TarifaTipo;
}

export interface Seccion {    
        orden: number,
        descripcion: string | null,
        categorias: CategoriaTarifa[],    
}

export interface CategoriaTarifa {
    orden: number,
    nombre: string;
    aCobrar: number;
    aPagar: number;
}

export interface TarifaTipo {
    general: boolean;
    especial: boolean;
    eventual: boolean;   
    personalizada:true; 
}

