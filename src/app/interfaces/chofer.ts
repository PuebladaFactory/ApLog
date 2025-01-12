import { Proveedor } from "./proveedor";
import { TarifaTipo } from "./tarifa-gral-cliente";

export interface Chofer {    
    idChofer: number;
    nombre: string;
    apellido: string;
    cuit: number;
    celularContacto: number;
    celularEmergencia: number;
    contactoEmergencia: string;
    domicilio: string;
    email: string;
    fechaNac: Date;
    vehiculo: Vehiculo[];
    //proveedor: Proveedor["razonSocial"]|string;   
    idProveedor: number;
    tarifaTipo: TarifaTipo;
    
}

export interface Vehiculo {
    dominio: string;
    marca:string;
    modelo: string;
    tipoCombustible: string[];    
    categoria: Categoria;
    segSat: boolean;
    //satelital: SeguimientoSatelital | null;
    satelital: string;
    tarjetaCombustible: boolean;
    refrigeracion: boolean|null;
    publicidad: boolean;
}

export interface SeguimientoSatelital {
    proveedor: string;
    marcaGps: string;
}

export interface Categoria {
    catOrden:number;
    nombre: string;    
}

