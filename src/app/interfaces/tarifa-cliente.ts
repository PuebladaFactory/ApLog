export interface TarifaCliente {
    id:any;
    idTarifaCliente:number;
   
    km:AdicionalKm;    
    adicionales: Adicionales[]
    idCliente: number;
    fecha: string;    

}


export interface AdicionalKm {    
    adicionalKm1:number;
    adicionalKm2:number;
    adicionalKm3:number;
    adicionalKm4:number;
    adicionalKm5:number;
    
}

export interface Adicionales {    
    concepto: string;
    valor: number;
    
}
