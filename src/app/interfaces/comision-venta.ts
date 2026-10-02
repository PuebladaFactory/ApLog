/** Comisión de un vendedor por UNA operación (Frente Vendedores) — colección
 *  `comisionesVenta`, sucesora de `informesVenta`. Id determinista
 *  `{idOperacion}_{idVendedor}` (ComisionVentaFactoryService.idComision):
 *  escribir dos veces el mismo id no duplica.
 *
 *  Modelo "saldo": invariante `saldo = monto − montoLiquidado`.
 *  - monto: lo que vale HOY (base vigente × porcentaje; 0 si la op se dio
 *    de baja). Lo mantienen cierre / edición de InformeOp / baja con
 *    increment(), sin lecturas.
 *  - montoLiquidado: lo incluido en liquidaciones vigentes (lo escribe la
 *    liquidación, en transacción).
 *  - saldo ≠ 0 → pendiente de liquidar (positivo: a pagar; negativo: ajuste
 *    a descontar). Por redondeo de los increments, |saldo| < 0,01 se trata
 *    como cero.
 *  Patrón ConId: el id del documento no se guarda en el body. */
export interface ComisionVenta {
  idOperacion: string;
  numeroOperacion: number;
  fecha: string;          // 'YYYY-MM-DD' de la operación
  anio: number;
  mes: number;
  periodo: number;        // anio*100 + mes (periodoDeFecha)
  idCliente: string;
  razonSocial: string;    // snapshot de la op
  idVendedor: string;
  porcentaje: number;     // del snapshot de la op (congelado al alta)
  base: number;           // aCobrar vigente de la op
  monto: number;
  montoLiquidado: number;
  saldo: number;
  anulada: boolean;       // la operación se dio de baja
  idsLiquidacion?: string[];  // liquidaciones vigentes que la incluyen (V6)
  actualizado: number;    // Date.now() de la última escritura
}
