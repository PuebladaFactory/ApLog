import { Direccion } from "./chofer";
import { RefTarifaHabilitada } from "./tarifa-habilitada";

export interface Cliente {
    idCliente: string;
    razonSocial: string;
    cuit: number;
    direccionFiscal: Direccion;
    direccionOperativa: Direccion;
    condFiscal: string;
    contactos: Contacto[];
    tarifasHabilitadas: RefTarifaHabilitada[];
    // TODO: refactor Tarifas — reemplazar por RefTarifaHabilitada
    tarifaAsignada: boolean;
    // TODO: refactor Tarifas — reemplazar por RefTarifaHabilitada
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
