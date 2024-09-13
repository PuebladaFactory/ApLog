export interface TarifaGralCliente {
    id: any;
    idTarifa: number;
    fecha: string;
    cargasGenerales: CargasGenerales;
    adicionales: AdicionalTarifa;
    tipo: TarifaTipo;
    idCliente: number|null;
}

export interface CargasGenerales {
    categoria1: CategoriaTarifa;
    categoria2: CategoriaTarifa;
    categoria3: CategoriaTarifa;
    categoria4: CategoriaTarifa;
    categoria5: CategoriaTarifa;
    categoria6: CategoriaTarifa;
    categoria7: CategoriaTarifa;
    categoria8: CategoriaTarifa;
}

export interface CategoriaTarifa {
    nombre: string;
    valor: number;
}

export interface AdicionalTarifa {
    acompaniante: number;
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

