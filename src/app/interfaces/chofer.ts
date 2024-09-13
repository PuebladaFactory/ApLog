import { Proveedor } from "./proveedor";

export interface Chofer {
    id:any;
    idChofer: number;
    nombre: string;
    apellido: string;
    cuit: number;
    celularContacto: number;
    celularEmergencia: number;
    domicilio: string;
    email: string;
    fechaNac: Date;
    vehiculo: Vehiculo;
    proveedor: Proveedor["razonSocial"]|string|null;   
    
    
}

export interface Vehiculo {
    dominio: string;
    marca:string;
    modelo: string;
    tipoCombustible: string;    
    categoria: Categoria[];
    satelital: SeguimientoSatelital | boolean;
    tarjetaCombustible: boolean;
    refrigeracion: boolean|null;
    publicidad: boolean;
}

export interface SeguimientoSatelital {
    proveedor: string;
    marcaGps: string;
}

export interface Categoria {
    cat:string;
    nombre: string;    
}

