export interface Ledger {
    fecha: string,
    tipo: 'Informe de Liquidación' | 'Movimiento Financiero',
    accion: string,
    id: string,
    impacto: number,
    referenciaId: string,
    informeLiqId: string,
    saldo:number;
}

