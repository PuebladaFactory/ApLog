export interface FacturaOpCliente {

    id: any|null;
    idFacturaCliente: number;
    idOperacion: number
    fecha: Date;        
    idCliente: number;
    valorJornada: number;
    adicional: number;        
    total: number;
}
