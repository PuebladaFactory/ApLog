export interface Legajo {

    id: any | undefined;
    idLegajo: number | undefined;
    idChofer: number | undefined;    
    documentacion: Documentacion | undefined;

}

export interface Documentacion {
    
    fotoDniFrente: string;
    fotoDniDorso: string;
    fotoRegistroFrente: string;
    fotoRegistroDorso: string;
    fotoCedulaFrente: string;
    fotoCedulaDorso: string;
    fotoPolizaSeguro: string;
    fotoRutaFrente: string;   
    fotoCamioneta1: string;
    fotoCamioneta2: string;
    fotoCamioneta3: string;

}

