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

/** Sección visible de la cuenta (recordada en la sesión). F5b suma 'mayor'. */
export type SeccionCuentaEntidad = 'comprobantes' | 'movimientos';

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
