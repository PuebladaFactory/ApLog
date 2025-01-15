import { Dirección } from "./chofer";
import { TarifaTipo } from "./tarifa-gral-cliente";

export interface Proveedor {
       
    idProveedor: number;
    razonSocial: string;
    cuit: number;    
    condFiscal: string;
    direccion: Dirección;
    contactos: Contacto [];
    tarifaTipo: TarifaTipo;
}

export interface Contacto {    
    puesto:string;
    apellido: string;
    nombre:string;
    telefono:number;
    email:string;
    
    
}

