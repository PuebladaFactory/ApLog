export interface Legajo {

    id: any;
    idLegajo: number;
    idChofer: number;    
    documentacion: Documentacion [];
    estadoGral: Estado;

}

export interface Documentacion {    
    titulo: string;
    sinVto: boolean;
    fechaVto: Date | number;
    estado: Estado;
    imagenes: string[];
}

export interface Estado {
    enFecha: boolean;
    porVencer: boolean;
    vencido: boolean;    
    vacio: boolean;
}

