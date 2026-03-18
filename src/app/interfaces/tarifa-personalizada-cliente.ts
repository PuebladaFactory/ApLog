import { AdicionalKm, AdicionalTarifa } from "./tarifa-gral-cliente";

export interface TarifaPersonalizadaCliente {
    
    idTarifa: number;
    fecha: string;
    secciones: Seccion [];
    tipo: TarifaTipo;
    idCliente: number;
    adKmboolean?: boolean; 
    adicionales?: AdicionalTarifa;
    fechaActualizacion?: string;
    actualizadoPor?: string;
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
    adicionalKmACobrar?: AdicionalKm;
    adicionalKmAPagar?: AdicionalKm;
    nuevoAdKmACobrar?: AdicionalKm;
    nuevoAdKmAPagar?: AdicionalKm;
    
}

export interface TarifaTipo {
    general: boolean;
    especial: boolean;
    eventual: boolean;   
    personalizada:true; 
}

