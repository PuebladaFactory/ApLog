export interface Legajo {
    idLegajo: string;
    idChofer: string;
    documentacion: Documentacion[];
    estadoGral: Estado;
    visible: boolean;
}

export interface Documentacion {
    titulo: string;
    sinVto: boolean;
    fechaVto: string | null;
    estado: Estado;
    imagenes: { nombre: string; url: string }[];
}

export interface Estado {
    enFecha: boolean;
    porVencer: boolean;
    vencido: boolean;
    vacio: boolean;
}
