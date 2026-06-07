import { Direccion } from "./chofer";
import { TarifaTipo } from "./tarifa-gral-cliente";

export interface Cliente {
    idCliente: string;
    razonSocial: string;
    cuit: number;
    direccionFiscal: Direccion;
    direccionOperativa: Direccion;
    condFiscal: string;
    contactos: Contacto[];
    tarifaTipo: TarifaTipo;
    tarifaAsignada: boolean;
    idTarifa: string;
    // TODO: migrar lógica de vendedores cuando se refactorice ese módulo
    vendedor: string[];
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
