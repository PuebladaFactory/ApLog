import { Direccion } from "./chofer";
import { TarifaTipo } from "./chofer";

export interface Proveedor {
    idProveedor: string;
    razonSocial: string;
    cuit: number;
    condFiscal: string;
    direccionFiscal: Direccion;
    direccionOperativa: Direccion;
    contactos: Contacto[];
    tarifaTipo: TarifaTipo;
    tarifaAsignada: boolean;
    idTarifa: string;
    activo: boolean;
    visible?: boolean;
}

export interface Contacto {
    puesto: string;
    apellido: string;
    nombre: string;
    telefono: number;
    email: string;
}
