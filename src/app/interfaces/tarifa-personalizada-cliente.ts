export interface TarifaPersonalizadaCliente {
    id: any;
    idTarifa: number;
    fecha: string;
    secciones: Seccion [];
    tipo: TarifaTipo;
    idCliente: number;
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
    nuevoACobrar: number;  // nuevo valor calculado
    nuevoAPagar: number;   // nuevo valor calculado
}

export interface TarifaTipo {
    general: boolean;
    especial: boolean;
    eventual: boolean;   
    personalizada:true; 
}

