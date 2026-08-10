import { Direccion } from "./chofer";
import { RefTarifaHabilitada } from "./tarifa-habilitada";

export interface Proveedor {
    idProveedor: string;
    razonSocial: string;
    cuit: number;
    condFiscal: string;
    direccionFiscal: Direccion;
    direccionOperativa: Direccion;
    contactos: Contacto[];
    tarifasHabilitadas: RefTarifaHabilitada[];
    // TODO: refactor Tarifas — reemplazar por RefTarifaHabilitada
    tarifaAsignada: boolean;
    // TODO: refactor Tarifas — reemplazar por RefTarifaHabilitada
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
