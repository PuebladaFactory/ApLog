export interface FacturaOpCliente {

    id: any|null;
    idFacturaCliente: number;
    idOperacion: number
    fecha: string;        
    idCliente: number;
    valorJornada: number;
    adicional: number;        
    total: number;
}
