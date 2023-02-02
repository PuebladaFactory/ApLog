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
    
    
}

export interface Vehiculo {
    dominio: string;
    marca:string;
    modelo: string;
    tipoCombustible: string;    
    categoria: string;
    satelital: SeguimientoSatelital | string;
    tarjetaCombustible: string;
}

export interface SeguimientoSatelital {
    proveedor: string;
    marcaGps: string;
}

