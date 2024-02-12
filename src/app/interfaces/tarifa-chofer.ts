export interface TarifaChofer {
    id:any;
    idTarifa:number;
    valorJornada: number;
    km:AdicionalKm;    
    publicidad: number;
    idChofer: number;
    fecha: string;    
    acompaniante: number | null;

}

export interface AdicionalKm {    
    adicionalKm1:number;
    adicionalKm2:number;
    adicionalKm3:number;
    adicionalKm4:number;
    adicionalKm5:number;
    
}