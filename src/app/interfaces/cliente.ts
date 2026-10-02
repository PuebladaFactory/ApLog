import { Direccion } from "./chofer";
import { RefTarifaHabilitada } from "./tarifa-habilitada";
import { AsignacionVenta } from "./vendedor-nuevo";

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
    // LEGACY (modelo viejo de Vendedores): ids de vendedor. Sin uso en el
    // camino nuevo; se retira con la migración de Vantruck.
    vendedor: string[];
    // Frente Vendedores: vendedores asignados con su % de comisión (la
    // asignación vive acá). Opcional: los docs actuales no lo tienen. Lo
    // escribe VendedorService; se copia al snapshot de la op al alta.
    comisionesVenta?: AsignacionVenta[];
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
