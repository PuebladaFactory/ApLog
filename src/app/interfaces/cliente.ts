import { TarifaTipo } from "./tarifa-gral-cliente";

export interface Cliente {    
    id:any | null;
    idCliente: number;
    razonSocial: string;
    cuit: number;
    direccion: string;
    contactos: Contacto [];
    tarifaTipo: TarifaTipo
}

export interface Contacto {    
    puesto:string;
    apellido: string;
    nombre:string;
    telefono:number;
    email:string;
    
    
}
