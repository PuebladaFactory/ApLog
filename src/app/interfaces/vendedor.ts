export interface Vendedor {

    idVendedor: number;
    datosPersonales: DatosPersonales;
    asignaciones: Asignacion[];
    activo?: boolean;
}

export interface DatosPersonales {

    nombre: string;
    apellido: string;
    cuit: string;
    celular: number;
    mail: string;
}

export interface Asignacion {
    idAsignacion: number;
    idCliente: number;
    porcentaje: number;
}
