export interface TarifaGralProveedor {
    id: any;
    idTarifa: number;
    fecha: string;    
    cargasGenerales: CategoriaTarifa [];
    adicionales: AdicionalTarifa;
    tipo: TarifaTipo;
    idCliente: number|null;
    idChofer: number|null;
    idProveedor: number|null;
}
export interface CategoriaTarifa {
    orden: number;
    nombre: string;
    valor: number;
}

export interface AdicionalTarifa {
    acompaniante: number;
    publicidad: number;
    adicionalKm: AdicionalKm;
}

export interface AdicionalKm {
    primerSector: {
        distancia: number;
        valor: number;
    };
    sectoresSiguientes: {
        intervalo: number;
        valor: number;
    };
}

export interface TarifaTipo {
    general: boolean;
    especial: boolean;
    eventual: boolean;   
    personalizada: boolean; 
}