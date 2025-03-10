export interface Legajo {
    
    idLegajo: number;
    idChofer: number;    
    documentacion: Documentacion [];
    estadoGral: Estado;
    visible:boolean
}

export interface Documentacion {    
    titulo: string;
    sinVto: boolean;
    fechaVto: string | null;
    estado: Estado;
    imagenes: { nombre: string; url: string }[]; // Especificamos el tipo
}

export interface Estado {
    enFecha: boolean;
    porVencer: boolean;
    vencido: boolean;    
    vacio: boolean;
}

