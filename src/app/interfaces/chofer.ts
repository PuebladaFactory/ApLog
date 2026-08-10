import { RefTarifaHabilitada } from './tarifa-habilitada';

export interface Chofer {
    idChofer: string;
    datosPersonales: DatosPersonales;
    condFiscal: string;
    contratacion: ContratacionChofer;
    // null = no aplica (chofer de proveedor): hereda la tarifa del proveedor,
    // se resuelve siempre por ID vía ProveedorService.resolverTarifasHabilitadasChofer.
    tarifasHabilitadas: RefTarifaHabilitada[] | null;
    // TODO: refactor Tarifas — reemplazar por RefTarifaHabilitada
    tarifaAsignada: boolean;
    // TODO: refactor Tarifas — reemplazar por RefTarifaHabilitada
    idTarifa: string;
    activo: boolean;
    visible?: boolean;
}

export type ContratacionChofer =
    | { tipo: 'directo' }
    | { tipo: 'proveedor'; idProveedor: string };

export interface DatosPersonales {
    nombre: string;
    apellido: string;
    cuit: number;
    fechaNac: Date;
    email: string;
    celularContacto: number;
    celularEmergencia: number;
    contactoEmergencia: string;
    direccion: Direccion;
}

export interface Vehiculo {
    idVehiculo: string;
    dominio: string;
    marca: string;
    modelo: string;
    tipoCombustible: string[];
    categoria: Categoria;
    segSat: boolean;
    satelital: string;
    tarjetaCombustible: boolean;
    refrigeracion: boolean | null;
    publicidad: boolean;
    asignadoA: AsignacionVehiculo;
}

export type AsignacionVehiculo =
    | { tipo: 'chofer'; idChofer: string }
    | { tipo: 'proveedor'; idProveedor: string };

export interface Categoria {
    catOrden: number;
    nombre: string;
}

export interface Direccion {
    provincia: string;
    municipio: string;
    localidad: string;
    domicilio: string;
}

export interface TarifaTipo {
    general: boolean;
    especial: boolean;
    eventual: boolean;
    personalizada: boolean;
}
