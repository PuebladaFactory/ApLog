export interface ClienteData {
    indice:number;
    idFacturaOpCliente: number;
    idCliente: number;
    razonSocial: string;
    idOperacion: number;
    fecha: Date;
    chofer: string;
    categoria: string;
    acompaniate: boolean;
    proveedor: string | null;
    direccion: string;
    km: number | null;
    montoFacturaChofer: number;
    valorJornada: number;
    adicionalCliente: number;
    totalCliente: number;
    ganancia: string;
}
