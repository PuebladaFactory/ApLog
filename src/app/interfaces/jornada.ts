export interface Jornada {
    id:any;
    idJornada:number;
    base: number;
    km:AdicionalKm;
    peaje: number | null;
    carga: number;
    combustible: number | null;
    publicidad: number;
    idChofer: number;    

}

export interface AdicionalKm {    
    adicionalKm1:number;
    adicionalKm2:number;
    adicionalKm3:number;
    adicionalKm4:number;
    adicionalKm5:number;
    
}