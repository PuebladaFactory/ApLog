import { EstadoFinancieroLiq, ValoresFinancierosLiq } from 'src/app/interfaces/informe-liq-nuevo';
import { MedioMovimientoFin } from 'src/app/interfaces/movimiento-fin';

/** Utils PUROS del Frente Finanzas (sin Firestore ni Angular).
 *  Importes: siempre redondeados a centavos y comparados con tolerancia —
 *  nunca igualdad exacta de flotantes (el módulo viejo fallaba por eso).
 *  Fechas de negocio: strings 'YYYY-MM-DD', sin new Date(string) (en
 *  Argentina corre el día). Diseño: claude/diseno-finanzas.md. */

/** Medio centavo: por debajo, un importe se considera cero. */
export const TOLERANCIA_IMPORTE = 0.005;

export function redondear2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function esCero(valor: number): boolean {
  return Math.abs(valor) < TOLERANCIA_IMPORTE;
}

export function importesIguales(a: number, b: number): boolean {
  return esCero(a - b);
}

// ---------------------------------------------------------------------------
// Valores financieros de un InformeLiq
// ---------------------------------------------------------------------------

/** Invariante: saldo = total − totalCompensado − totalCobrado − totalAjustado. */
export function saldoDe(vf: Omit<ValoresFinancierosLiq, 'saldo'>): number {
  const saldo = redondear2(vf.total - vf.totalCompensado - vf.totalCobrado - vf.totalAjustado);
  return esCero(saldo) ? 0 : saldo;
}

/** Completa los acumulados que falten (docs anteriores al Frente Finanzas no
 *  tienen totalCompensado / totalAjustado) y recalcula el saldo. `total` es
 *  el fallback si vf no trae total (usar valores.total del informe). */
export function normalizarValoresFinancieros(
  vf: Partial<ValoresFinancierosLiq> | null | undefined,
  total: number,
): ValoresFinancierosLiq {
  const base = {
    total: redondear2(vf?.total ?? total),
    totalCompensado: redondear2(vf?.totalCompensado ?? 0),
    totalCobrado: redondear2(vf?.totalCobrado ?? 0),
    totalAjustado: redondear2(vf?.totalAjustado ?? 0),
  };
  return { ...base, saldo: saldoDe(base) };
}

export type AcumuladoFinanciero = 'totalCompensado' | 'totalCobrado' | 'totalAjustado';

/** Suma `importe` (negativo = revierte) a uno de los acumulados y recalcula
 *  el saldo. Lanza Error si el acumulado quedaría negativo o si el saldo
 *  quedaría negativo (imputar más que el saldo). */
export function aplicarImporte(
  vf: ValoresFinancierosLiq,
  acumulado: AcumuladoFinanciero,
  importe: number,
): ValoresFinancierosLiq {
  const actual = normalizarValoresFinancieros(vf, vf.total);
  const nuevoAcumulado = redondear2(actual[acumulado] + importe);
  if (nuevoAcumulado < -TOLERANCIA_IMPORTE) {
    throw new Error(`La reversión deja ${acumulado} negativo (${nuevoAcumulado}).`);
  }
  const base = { ...actual, [acumulado]: esCero(nuevoAcumulado) ? 0 : nuevoAcumulado };
  const saldo = redondear2(base.total - base.totalCompensado - base.totalCobrado - base.totalAjustado);
  if (saldo < -TOLERANCIA_IMPORTE) {
    throw new Error(`El importe ${redondear2(importe)} supera el saldo del documento (${actual.saldo}).`);
  }
  return { ...base, saldo: esCero(saldo) ? 0 : saldo };
}

/** Estado financiero derivado de los acumulados.
 *  - saldo 0 → 'cobrado' (para chofer/proveedor significa "pagado"), salvo
 *    que el estado actual sea 'incobrable' (lo pone explícitamente el ajuste
 *    con ese motivo; se conserva mientras el saldo siga en 0).
 *  - sin plata ni ajustes aplicados → 'pendiente' (las compensaciones son
 *    parte del acuerdo de la liquidación, no un pago).
 *  - si no → 'parcial'. */
export function estadoFinancieroDe(
  vf: ValoresFinancierosLiq,
  actual?: EstadoFinancieroLiq,
): EstadoFinancieroLiq {
  if (esCero(vf.saldo)) return actual === 'incobrable' ? 'incobrable' : 'cobrado';
  return esCero(vf.totalCobrado + vf.totalAjustado) ? 'pendiente' : 'parcial';
}

// ---------------------------------------------------------------------------
// Movimientos
// ---------------------------------------------------------------------------

export function totalMedios(medios: MedioMovimientoFin[]): number {
  return redondear2(medios.reduce((acc, m) => acc + (m.importe ?? 0), 0));
}

/** Reparte `monto` entre saldos en orden (FIFO): a cada uno le asigna hasta
 *  su saldo. Devuelve el importe asignado a cada posición (mismo largo que
 *  `saldos`). Lo que no entra (monto > Σ saldos) queda sin asignar:
 *  monto − Σ resultado. */
export function distribuirFifo(monto: number, saldos: number[]): number[] {
  let restante = redondear2(Math.max(0, monto));
  return saldos.map(saldo => {
    const asignado = redondear2(Math.max(0, Math.min(saldo, restante)));
    restante = redondear2(restante - asignado);
    return asignado;
  });
}

// ---------------------------------------------------------------------------
// Fechas y antigüedad
// ---------------------------------------------------------------------------

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function msUtc(fecha: string): number {
  if (!FORMATO_FECHA.test(fecha)) throw new Error(`Fecha inválida (YYYY-MM-DD): '${fecha}'.`);
  const [a, m, d] = fecha.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
}

/** Días de calendario de `desde` a `hasta` (ambas 'YYYY-MM-DD'); negativo
 *  si hasta < desde. Opera en UTC sobre las partes del string: no depende
 *  del huso horario. */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((msUtc(hasta) - msUtc(desde)) / 86400000);
}

export type TramoAntiguedad = '0-30' | '31-60' | '61-90' | '90+';

export const TRAMOS_ANTIGUEDAD: readonly TramoAntiguedad[] = ['0-30', '31-60', '61-90', '90+'];

/** Tramo de antigüedad para una cantidad de días (≤ 0 cuenta como 0-30). */
export function tramoAntiguedad(dias: number): TramoAntiguedad {
  if (dias <= 30) return '0-30';
  if (dias <= 60) return '31-60';
  if (dias <= 90) return '61-90';
  return '90+';
}
