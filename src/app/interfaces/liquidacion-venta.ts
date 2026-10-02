/** Liquidación de comisiones de un vendedor (Frente Vendedores) — colección
 *  `liquidacionesVenta`, sucesora de `resumenVenta`. Toma TODO el saldo
 *  pendiente del vendedor con fecha ≤ fin del mes de corte (comisiones del
 *  mes + cierres tardíos + ajustes de meses anteriores).
 *  Estados: emitida → pagada (el pago se puede revertir: pagada → emitida);
 *  emitida → anulada (devuelve lo liquidado al saldo de cada comisión). Para
 *  anular una pagada, primero se revierte el pago.
 *  Patrón ConId: el id del documento no se guarda en el body. */

export type EstadoLiquidacionVenta = 'emitida' | 'pagada' | 'anulada';

export interface LineaLiquidacionVenta {
  idComision: string;
  idOperacion: string;
  numeroOperacion: number;
  fecha: string;
  idCliente: string;
  razonSocial: string;
  base: number;           // vigentes al liquidar
  porcentaje: number;
  monto: number;
  previo: number;         // montoLiquidado de la comisión antes de esta liquidación
  importe: number;        // lo que liquida esta línea = monto − previo
  ajuste: boolean;        // previo ≠ 0 o comisión anulada
}

export interface LiquidacionVenta {
  numero: string;         // 'LVEN-0001' (NumeradorService)
  idVendedor: string;
  vendedor: { apellido: string; nombre: string; cuit: number };  // snapshot
  anio: number;           // mes de corte
  mes: number;
  periodo: number;        // anio*100 + mes
  fechaEmision: string;   // 'YYYY-MM-DD'
  lineas: LineaLiquidacionVenta[];
  total: number;
  estado: EstadoLiquidacionVenta;
  pago: { fecha: string; observacion: string | null } | null;
  anulacion: { fecha: string; motivo: string } | null;
}
