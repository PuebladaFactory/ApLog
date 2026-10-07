import { EstadoFinancieroLiq, InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { MovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { fechaBaseAntiguedad } from 'src/app/shared/utils/cuentas-finanzas.util';
import {
  TRAMOS_ANTIGUEDAD, TramoAntiguedad, diasEntre, esCero, normalizarValoresFinancieros, redondear2, tramoAntiguedad,
} from 'src/app/shared/utils/finanzas.util';

/** Cuenta de UNA entidad (Frente Finanzas, F5) — utils PUROS sobre todos sus
 *  InformeLiq y movimientos. Calculada al consultar (sin agregados).
 *  Saldo de la cuenta (F37) = facturado abierto + emitido sin facturar −
 *  saldo a favor / anticipos, mostrando las tres partes. Los borradores no
 *  cuentan (son propuestas); los revertidos y anulados son historia.
 *  Diseño: claude/diseno-finanzas.md §4.5 (pantalla 3) y §18. */

/** Sección visible de la cuenta (recordada en la sesión). */
export type SeccionCuentaEntidad = 'comprobantes' | 'movimientos' | 'mayor';

export interface ResumenCuentaEntidad {
  saldoFacturado: number;           // Σ saldo de facturados con saldo
  cantidadFacturados: number;
  sinFacturar: number;              // Σ saldo de emitidos (todavía no se cobran/pagan)
  cantidadSinFacturar: number;
  saldoAFavor: number;              // Σ sinImputar de movimientos vigentes
  saldoTotal: number;               // saldoFacturado + sinFacturar − saldoAFavor (F37)
  /** saldoFacturado por tramo de antigüedad (desde la fecha de la factura). */
  tramos: Record<TramoAntiguedad, number>;
  diasMasAntiguo: number | null;
}

/** Un InformeLiq en la sección Comprobantes de la cuenta. */
export interface FilaComprobanteCuenta<L extends InformeLiqNuevo = InformeLiqNuevo> {
  liq: L;
  estado: InformeLiqNuevo['estado'];
  fechaEmision: string | null;
  fechaFactura: string | null;
  total: number;                    // valor del servicio
  compensado: number;
  cobrado: number;                  // cobrado (cliente) / pagado (chofer, proveedor)
  ajustado: number;
  saldo: number;
  dias: number | null;              // antigüedad (solo facturados con saldo)
  abierto: boolean;                 // emitido, o facturado con saldo
  estadoFinanciero: EstadoFinancieroLiq;
}

function diasDesde(fecha: string | null | undefined, hoy: string): number | null {
  if (!fecha) return null;
  try {
    return diasEntre(fecha, hoy);
  } catch {
    return null;
  }
}

/** Filas de Comprobantes: todos los InformeLiq de la entidad salvo los
 *  borradores (emitidos, facturados, revertidos, anulados). Los revertidos y
 *  anulados no están abiertos. Orden: emisión más reciente primero. */
export function armarComprobantesCuenta<L extends InformeLiqNuevo>(informes: L[], hoy: string): FilaComprobanteCuenta<L>[] {
  return informes
    .filter(liq => liq.estado !== 'borrador')
    .map(liq => {
      const vf = normalizarValoresFinancieros(liq.valoresFinancieros, liq.valores.total);
      const vigente = liq.estado === 'emitido' || liq.estado === 'facturado';
      const abierto = liq.estado === 'emitido' || (liq.estado === 'facturado' && !esCero(vf.saldo));
      return {
        liq,
        estado: liq.estado,
        fechaEmision: liq.fechaEmision,
        fechaFactura: liq.factura?.fecha ?? null,
        total: vf.total,
        compensado: vf.totalCompensado,
        cobrado: vf.totalCobrado,
        ajustado: vf.totalAjustado,
        saldo: vigente ? vf.saldo : 0,
        dias: liq.estado === 'facturado' && !esCero(vf.saldo) ? diasDesde(fechaBaseAntiguedad(liq), hoy) : null,
        abierto,
        estadoFinanciero: liq.estadoFinanciero,
      };
    })
    .sort((a, b) =>
      (b.fechaEmision ?? b.liq.fechaCreacion).localeCompare(a.fechaEmision ?? a.liq.fechaCreacion) ||
      (b.liq.numeroInterno ?? '').localeCompare(a.liq.numeroInterno ?? ''));
}

/** Resumen del encabezado de la cuenta (F37). */
export function resumirCuentaEntidad(
  informes: InformeLiqNuevo[],
  movimientos: MovimientoFin[],
  hoy: string,
): ResumenCuentaEntidad {
  const tramos = Object.fromEntries(TRAMOS_ANTIGUEDAD.map(t => [t, 0])) as Record<TramoAntiguedad, number>;
  const r: ResumenCuentaEntidad = {
    saldoFacturado: 0, cantidadFacturados: 0, sinFacturar: 0, cantidadSinFacturar: 0,
    saldoAFavor: 0, saldoTotal: 0, tramos, diasMasAntiguo: null,
  };
  for (const liq of informes) {
    if (liq.estado !== 'facturado' && liq.estado !== 'emitido') continue;
    const saldo = normalizarValoresFinancieros(liq.valoresFinancieros, liq.valores.total).saldo;
    if (esCero(saldo)) continue;
    if (liq.estado === 'emitido') {
      r.sinFacturar = redondear2(r.sinFacturar + saldo);
      r.cantidadSinFacturar++;
      continue;
    }
    r.saldoFacturado = redondear2(r.saldoFacturado + saldo);
    r.cantidadFacturados++;
    const dias = diasDesde(fechaBaseAntiguedad(liq), hoy);
    const tramo = tramoAntiguedad(dias ?? 0);
    r.tramos[tramo] = redondear2(r.tramos[tramo] + saldo);
    if (dias !== null) r.diasMasAntiguo = r.diasMasAntiguo === null ? dias : Math.max(r.diasMasAntiguo, dias);
  }
  for (const m of movimientos) {
    if (m.estado !== 'vigente' || esCero(m.sinImputar ?? 0)) continue;
    r.saldoAFavor = redondear2(r.saldoAFavor + m.sinImputar);
  }
  r.saldoTotal = redondear2(r.saldoFacturado + r.sinFacturar - r.saldoAFavor);
  return r;
}

// ---------------------------------------------------------------------------
// Mayor de la cuenta (F5b)
// ---------------------------------------------------------------------------

/** Una línea del Mayor. `debe` aumenta el saldo (liquidación: nos deben /
 *  les debemos más), `haber` lo baja (cobro, pago, anticipo, ajuste). Las
 *  compensaciones son INFORMATIVAS: el anticipo ya bajó el saldo cuando se
 *  entregó; la compensación solo lo aplica a una liquidación. */
export interface LineaMayor {
  fecha: string;                    // 'YYYY-MM-DD'
  tipo: 'liquidacion' | 'cobro' | 'pago' | 'ajuste' | 'compensacion';
  referencia: string;               // número del informe o del movimiento
  detalle: string;
  debe: number;
  haber: number;
  saldo: number;                    // acumulado después de la línea
  informativa: boolean;
  sinFacturar: boolean;             // liquidación emitida todavía sin factura
  idInfLiq: string | null;
  idMovimiento: string | null;
}

export interface MayorCuenta {
  saldoAnterior: number;            // acumulado de lo anterior a `desde`
  lineas: LineaMayor[];
  totalDebe: number;
  totalHaber: number;
  saldoFinal: number;
}

const ETIQUETA_MOV: Readonly<Record<string, string>> = { cobro: 'Cobro', pago: 'Pago', ajuste: 'Ajuste' };
const ETIQUETA_CONCEPTO_MAYOR: Readonly<Record<string, string>> = {
  normal: '', anticipo: ' (anticipo)', prestamo: ' (préstamo)',
};
const ETIQUETA_MOTIVO_MAYOR: Readonly<Record<string, string>> = {
  incobrable: 'incobrable', bonificacion: 'bonificación', redondeo: 'redondeo', apertura: 'saldo de apertura', otro: 'otro',
};

/** "09/2026", "09/2026 · 1° q." — período corto para el Mayor. */
export function textoPeriodoCorto(periodo: InformeLiqNuevo['periodo']): string {
  const base = `${String(periodo.mes).padStart(2, '0')}/${periodo.anio}`;
  return periodo.tramo === 'mes' ? base : `${base} · ${periodo.tramo === '1q' ? '1°' : '2°'} q.`;
}

type InformeConId = InformeLiqNuevo & { idInfLiq: string };
type MovimientoConId = MovimientoFin & { idMovimiento: string };

/** Mayor cronológico de la cuenta (F36/F37):
 *  - Liquidación emitida o facturada: DEBE por su total, a la fecha de
 *    EMISIÓN; las emitidas sin factura van marcadas. Después, sus
 *    compensaciones como líneas informativas.
 *  - Cobro / pago / anticipo / ajuste VIGENTE: HABER por su total, a su
 *    fecha.
 *  - Borradores, revertidos, anulados y movimientos anulados no entran.
 *  Saldo final = Σ total de liquidaciones − Σ total de movimientos = saldo
 *  total de la cuenta (resumirCuentaEntidad). `desde` / `hasta`
 *  ('YYYY-MM-DD' o null = sin límite): lo anterior a `desde` va al saldo
 *  anterior; lo posterior a `hasta` no se muestra. Mismo día: primero las
 *  liquidaciones, después los movimientos. Puro. */
export function armarMayor(
  informes: InformeConId[],
  movimientos: MovimientoConId[],
  desde: string | null,
  hasta: string | null,
): MayorCuenta {
  type Base = Omit<LineaMayor, 'saldo'> & { orden: number };
  const base: Base[] = [];

  for (const liq of informes) {
    if (liq.estado !== 'emitido' && liq.estado !== 'facturado') continue;
    const fecha = liq.fechaEmision ?? liq.fechaCreacion;
    const total = normalizarValoresFinancieros(liq.valoresFinancieros, liq.valores.total).total;
    const sinFacturar = liq.estado === 'emitido';
    base.push({
      fecha, orden: 0, tipo: 'liquidacion',
      referencia: liq.numeroInterno ?? liq.idInfLiq,
      detalle: `Liquidación ${textoPeriodoCorto(liq.periodo)}${sinFacturar ? ' (sin facturar)' : ''}`,
      debe: total, haber: 0, informativa: false, sinFacturar,
      idInfLiq: liq.idInfLiq, idMovimiento: null,
    });
    for (const c of compensacionesDeLiq(liq)) {
      base.push({
        fecha, orden: 1, tipo: 'compensacion',
        referencia: liq.numeroInterno ?? liq.idInfLiq,
        detalle: `Compensa ${c.numero} — $ ${redondear2(c.importe).toFixed(2)} (ya descontado al entregarse)`,
        debe: 0, haber: 0, informativa: true, sinFacturar: false,
        idInfLiq: liq.idInfLiq, idMovimiento: c.idMovimiento,
      });
    }
  }

  for (const m of movimientos) {
    if (m.estado !== 'vigente') continue;
    const detalle = m.tipo === 'ajuste'
      ? `Ajuste${m.motivoAjuste ? ` (${ETIQUETA_MOTIVO_MAYOR[m.motivoAjuste] ?? m.motivoAjuste})` : ''}`
      : `${ETIQUETA_MOV[m.tipo] ?? m.tipo}${ETIQUETA_CONCEPTO_MAYOR[m.concepto] ?? ''}` +
        (m.sinImputar > 0 ? ` — sin imputar $ ${m.sinImputar.toFixed(2)}` : '');
    base.push({
      fecha: m.fecha, orden: 2, tipo: m.tipo,
      referencia: m.numero, detalle,
      debe: 0, haber: redondear2(m.total), informativa: false, sinFacturar: false,
      idInfLiq: null, idMovimiento: m.idMovimiento,
    });
  }

  base.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.orden - b.orden || a.referencia.localeCompare(b.referencia));

  let saldo = 0;
  let saldoAnterior = 0;
  let totalDebe = 0;
  let totalHaber = 0;
  const lineas: LineaMayor[] = [];
  for (const { orden, ...l } of base) {
    saldo = redondear2(saldo + l.debe - l.haber);
    if (desde && l.fecha < desde) {
      saldoAnterior = saldo;
      continue;
    }
    if (hasta && l.fecha > hasta) continue;
    totalDebe = redondear2(totalDebe + l.debe);
    totalHaber = redondear2(totalHaber + l.haber);
    lineas.push({ ...l, saldo });
  }
  return {
    saldoAnterior,
    lineas,
    totalDebe,
    totalHaber,
    saldoFinal: redondear2(saldoAnterior + totalDebe - totalHaber),
  };
}

function compensacionesDeLiq(liq: InformeLiqNuevo): NonNullable<InformeLiqNuevo['compensaciones']> {
  return liq.compensaciones ?? [];
}

// ---------------------------------------------------------------------------
// Historia de un comprobante (F5b)
// ---------------------------------------------------------------------------

/** Un evento en la historia de un InformeLiq. `importe` negativo baja el
 *  saldo del comprobante; las informativas no lo mueven. */
export interface EventoComprobante {
  fecha: string;                    // 'YYYY-MM-DD'
  descripcion: string;
  importe: number;
  saldo: number;                    // saldo del comprobante después del evento
  informativa: boolean;
  anulada: boolean;                 // imputación de un movimiento anulado (revertida)
  idMovimiento: string | null;
}

/** Historia de un comprobante: emisión (+total), compensaciones, factura
 *  (informativa), cobros / pagos / imputaciones de saldo / ajustes (−), en
 *  orden de fecha; las imputaciones de movimientos ANULADOS se muestran
 *  tachadas sin mover el saldo; la reversión, informativa. El saldo final
 *  coincide con valoresFinancieros.saldo. `movimientos`: los de la entidad
 *  (se toman los que imputan a este informe). Puro. */
export function armarHistoriaComprobante(
  liq: InformeConId,
  movimientos: MovimientoConId[],
): EventoComprobante[] {
  type Base = Omit<EventoComprobante, 'saldo'> & { orden: number };
  const base: Base[] = [];
  const total = normalizarValoresFinancieros(liq.valoresFinancieros, liq.valores.total).total;

  if (liq.fechaEmision) {
    base.push({
      fecha: liq.fechaEmision, orden: 0, descripcion: `Emisión ${liq.numeroInterno ?? ''} — total del servicio`,
      importe: total, informativa: false, anulada: false, idMovimiento: null,
    });
  }
  if (liq.factura) {
    base.push({
      fecha: liq.factura.fecha, orden: 1,
      descripcion: `Factura vinculada — $ ${liq.factura.importe.toFixed(2)}` +
        (liq.factura.validacion?.base === 'neto' ? ' (por el neto)' : ''),
      importe: 0, informativa: true, anulada: false, idMovimiento: null,
    });
  }
  for (const m of movimientos) {
    for (const i of m.imputaciones ?? []) {
      if (i.documento.id !== liq.idInfLiq) continue;
      const anulada = m.estado !== 'vigente';
      const que = i.origen === 'compensacion'
        ? `Compensación con ${m.numero}`
        : m.tipo === 'ajuste'
          ? `Ajuste ${m.numero}${m.motivoAjuste ? ` (${ETIQUETA_MOTIVO_MAYOR[m.motivoAjuste] ?? m.motivoAjuste})` : ''}`
          : `${ETIQUETA_MOV[m.tipo] ?? m.tipo} ${m.numero}${i.origen === 'saldo' ? ' (imputación de saldo)' : ''}`;
      base.push({
        fecha: i.fecha, orden: i.origen === 'compensacion' ? 0.5 : 2,
        descripcion: anulada ? `${que} — anulado` : que,
        importe: -i.importe, informativa: anulada, anulada, idMovimiento: m.idMovimiento,
      });
    }
  }
  if (liq.reversion) {
    base.push({
      fecha: liq.reversion.fecha.slice(0, 10), orden: 3, descripcion: `Revertido — ${liq.reversion.motivo}`,
      importe: 0, informativa: true, anulada: false, idMovimiento: null,
    });
  }

  base.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.orden - b.orden);
  let saldo = 0;
  return base.map(({ orden, ...e }) => {
    if (!e.informativa) saldo = redondear2(saldo + e.importe);
    return { ...e, saldo };
  });
}
