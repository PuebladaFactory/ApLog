import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { MovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { CuentaEntidadFin, ladoDe } from 'src/app/shared/utils/cuentas-finanzas.util';
import { nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';
import { diasEntre, esCero, normalizarValoresFinancieros, redondear2 } from 'src/app/shared/utils/finanzas.util';

/** Resumen de Finanzas (F6b) — utils PUROS. Flujo de un mes, evolución de
 *  los últimos meses y alertas. Calculado al consultar (sin agregados).
 *  Meses como 'YYYY-MM'; fechas 'YYYY-MM-DD' (nunca new Date(string)).
 *  Diseño: claude/diseno-finanzas.md §19.2. */

/** Meses de la evolución (F41). */
export const MESES_EVOLUCION = 6;
/** Anticipos / préstamos sin compensar de más de estos días → alerta. */
export const DIAS_ALERTA_ANTICIPO = 60;
/** Liquidaciones emitidas sin factura de más de estos días → alerta. */
export const DIAS_ALERTA_SIN_FACTURAR = 30;

const NOMBRE_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// ---------------------------------------------------------------------------
// Meses
// ---------------------------------------------------------------------------

function partes(mes: string): { anio: number; mes: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(mes);
  if (!m) throw new Error(`Mes inválido: ${mes}`);
  return { anio: Number(m[1]), mes: Number(m[2]) };
}

function armar(anio: number, mes: number): string {
  return `${anio}-${String(mes).padStart(2, '0')}`;
}

/** 'YYYY-MM' de una fecha 'YYYY-MM-DD'. */
export function mesDe(fecha: string): string {
  return fecha.slice(0, 7);
}

/** Suma `delta` meses (negativo = hacia atrás). */
export function sumarMeses(mes: string, delta: number): string {
  const p = partes(mes);
  const total = p.anio * 12 + (p.mes - 1) + delta;
  return armar(Math.floor(total / 12), (total % 12) + 1);
}

/** Los `n` meses que terminan en `mes`, del más viejo al más nuevo. */
export function mesesHasta(mes: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => sumarMeses(mes, i - n + 1));
}

/** Primer y último día de un rango de meses ('YYYY-MM-DD'). */
export function rangoDeMeses(desde: string, hasta: string): { desde: string; hasta: string } {
  const p = partes(hasta);
  const ultimo = new Date(Date.UTC(p.anio, p.mes, 0)).getUTCDate();   // día 0 del mes siguiente
  return { desde: `${desde}-01`, hasta: `${hasta}-${String(ultimo).padStart(2, '0')}` };
}

/** "Octubre 2026". */
export function nombreMes(mes: string): string {
  const p = partes(mes);
  return `${NOMBRE_MES[p.mes - 1]} ${p.anio}`;
}

/** "Oct 26" — para el eje del gráfico. */
export function nombreMesCorto(mes: string): string {
  const p = partes(mes);
  return `${NOMBRE_MES[p.mes - 1].slice(0, 3)} ${String(p.anio).slice(2)}`;
}

// ---------------------------------------------------------------------------
// Flujo del mes
// ---------------------------------------------------------------------------

/** Lo que entró y salió en un mes, por movimientos VIGENTES (F42). */
export interface FlujoMes {
  cobrado: number;                 // Σ total de cobros (todos los conceptos, con retenciones)
  cantidadCobros: number;
  retencionesSufridas: number;     // parte de `cobrado` en medios 'retencion' (no es dinero)
  anticiposRecibidos: number;      // parte de `cobrado` con concepto anticipo
  pagado: number;                  // Σ total de pagos concepto 'normal'
  cantidadPagos: number;
  anticiposEntregados: number;     // Σ total de pagos concepto anticipo / préstamo
  cantidadAnticipos: number;
  retencionesPracticadas: number;  // medios 'retencion' de pagos y anticipos
  ajustesCobrar: number;           // ajustes a clientes (bajan lo que nos deben)
  ajustesPagar: number;            // ajustes a choferes / proveedores
  /** Dinero que entró − dinero que salió (las retenciones no son dinero). */
  netoCaja: number;
}

function retencionesDe(m: MovimientoFin): number {
  return (m.medios ?? []).filter(x => x.tipo === 'retencion').reduce((a, x) => a + x.importe, 0);
}

export function flujoDelMes(movimientos: MovimientoFin[], mes: string): FlujoMes {
  const f: FlujoMes = {
    cobrado: 0, cantidadCobros: 0, retencionesSufridas: 0, anticiposRecibidos: 0,
    pagado: 0, cantidadPagos: 0, anticiposEntregados: 0, cantidadAnticipos: 0, retencionesPracticadas: 0,
    ajustesCobrar: 0, ajustesPagar: 0, netoCaja: 0,
  };
  for (const m of movimientos) {
    if (m.estado !== 'vigente' || mesDe(m.fecha) !== mes) continue;
    if (m.tipo === 'cobro') {
      f.cobrado += m.total;
      f.cantidadCobros++;
      f.retencionesSufridas += retencionesDe(m);
      if (m.concepto !== 'normal') f.anticiposRecibidos += m.total;
    } else if (m.tipo === 'pago') {
      if (m.concepto === 'normal') {
        f.pagado += m.total;
        f.cantidadPagos++;
      } else {
        f.anticiposEntregados += m.total;
        f.cantidadAnticipos++;
      }
      f.retencionesPracticadas += retencionesDe(m);
    } else if (ladoDe(m.entidad.tipo) === 'cobrar') {
      f.ajustesCobrar += m.total;
    } else {
      f.ajustesPagar += m.total;
    }
  }
  const entro = f.cobrado - f.retencionesSufridas;
  const salio = f.pagado + f.anticiposEntregados - f.retencionesPracticadas;
  return {
    cobrado: redondear2(f.cobrado),
    cantidadCobros: f.cantidadCobros,
    retencionesSufridas: redondear2(f.retencionesSufridas),
    anticiposRecibidos: redondear2(f.anticiposRecibidos),
    pagado: redondear2(f.pagado),
    cantidadPagos: f.cantidadPagos,
    anticiposEntregados: redondear2(f.anticiposEntregados),
    cantidadAnticipos: f.cantidadAnticipos,
    retencionesPracticadas: redondear2(f.retencionesPracticadas),
    ajustesCobrar: redondear2(f.ajustesCobrar),
    ajustesPagar: redondear2(f.ajustesPagar),
    netoCaja: redondear2(entro - salio),
  };
}

// ---------------------------------------------------------------------------
// Evolución (F41)
// ---------------------------------------------------------------------------

export interface EvolucionMes {
  mes: string;
  facturadoCobrar: number;   // Σ total de liquidaciones de clientes facturadas en el mes (fecha de la factura)
  cobrado: number;           // Σ total de cobros vigentes del mes
  facturadoPagar: number;    // Σ total de liquidaciones de choferes / proveedores facturadas en el mes
  pagado: number;            // Σ total de pagos vigentes del mes (incluye anticipos: es dinero que salió)
}

/** Una fila por mes de `meses`. `facturados`: InformeLiq con factura (se
 *  cuentan solo los 'facturado', por la fecha de la factura y su total del
 *  servicio). `movimientos`: los del rango (se cuentan los vigentes). */
export function armarEvolucion(
  meses: string[],
  facturados: InformeLiqNuevo[],
  movimientos: MovimientoFin[],
): EvolucionMes[] {
  const filas = new Map<string, EvolucionMes>(
    meses.map(mes => [mes, { mes, facturadoCobrar: 0, cobrado: 0, facturadoPagar: 0, pagado: 0 }]),
  );
  for (const liq of facturados) {
    if (liq.estado !== 'facturado' || !liq.factura?.fecha) continue;
    const fila = filas.get(mesDe(liq.factura.fecha));
    if (!fila) continue;
    const total = normalizarValoresFinancieros(liq.valoresFinancieros, liq.valores.total).total;
    if (ladoDe(liq.tipo) === 'cobrar') fila.facturadoCobrar += total;
    else fila.facturadoPagar += total;
  }
  for (const m of movimientos) {
    if (m.estado !== 'vigente' || m.tipo === 'ajuste') continue;
    const fila = filas.get(mesDe(m.fecha));
    if (!fila) continue;
    if (m.tipo === 'cobro') fila.cobrado += m.total;
    else fila.pagado += m.total;
  }
  return meses.map(mes => {
    const f = filas.get(mes)!;
    return {
      mes,
      facturadoCobrar: redondear2(f.facturadoCobrar),
      cobrado: redondear2(f.cobrado),
      facturadoPagar: redondear2(f.facturadoPagar),
      pagado: redondear2(f.pagado),
    };
  });
}

// ---------------------------------------------------------------------------
// Alertas
// ---------------------------------------------------------------------------

export interface ItemAlerta {
  tipo: CuentaEntidadFin['tipo'];
  idEntidad: string;
  nombre: string;
  importe: number;
  detalle: string;
}

export interface AlertaFinanzas {
  id: 'saldoAFavor' | 'anticipos' | 'sinFacturar';
  titulo: string;
  descripcion: string;
  cantidad: number;          // entidades
  importe: number;
  items: ItemAlerta[];       // las 5 de mayor importe
}

const MAX_ITEMS_ALERTA = 5;

function cerrarAlerta(
  id: AlertaFinanzas['id'],
  titulo: string,
  descripcion: string,
  porEntidad: Map<string, ItemAlerta>,
): AlertaFinanzas {
  const items = [...porEntidad.values()].sort((a, b) => b.importe - a.importe);
  return {
    id, titulo, descripcion,
    cantidad: items.length,
    importe: redondear2(items.reduce((a, i) => a + i.importe, 0)),
    items: items.slice(0, MAX_ITEMS_ALERTA).map(i => ({ ...i, importe: redondear2(i.importe) })),
  };
}

/** Alertas del Resumen (solo las que tienen algo):
 *  1. Clientes con saldo a favor Y facturas abiertas: se puede imputar.
 *  2. Anticipos / préstamos a choferes o proveedores sin compensar de más
 *     de DIAS_ALERTA_ANTICIPO días (por la fecha del movimiento).
 *  3. Liquidaciones emitidas sin factura de más de DIAS_ALERTA_SIN_FACTURAR
 *     días (por la fecha de emisión), de los dos lados.
 *  `informes`: los abiertos (emitidos + facturados con saldo).
 *  `movimientos`: los vigentes con saldo sin imputar. */
export function armarAlertas(
  cuentas: CuentaEntidadFin[],
  informes: InformeLiqNuevo[],
  movimientos: MovimientoFin[],
  hoy: string,
): AlertaFinanzas[] {
  const alertas: AlertaFinanzas[] = [];

  const aFavor = new Map<string, ItemAlerta>();
  for (const c of cuentas) {
    if (c.lado !== 'cobrar' || c.saldoAFavor <= 0 || c.saldoFacturado <= 0) continue;
    aFavor.set(c.clave, {
      tipo: c.tipo, idEntidad: c.idEntidad, nombre: c.nombre,
      importe: Math.min(c.saldoAFavor, c.saldoFacturado),
      detalle: `a favor ${pesos(c.saldoAFavor)} · facturado abierto ${pesos(c.saldoFacturado)}`,
    });
  }
  if (aFavor.size) {
    alertas.push(cerrarAlerta('saldoAFavor', 'Saldo a favor para imputar',
      'Clientes con saldo a favor y facturas abiertas: se puede imputar (importe = lo que se puede aplicar).', aFavor));
  }

  const anticipos = new Map<string, ItemAlerta>();
  for (const m of movimientos) {
    if (m.estado !== 'vigente' || m.tipo !== 'pago' || m.concepto === 'normal' || esCero(m.sinImputar)) continue;
    const dias = diasSeguros(m.fecha, hoy);
    if (dias === null || dias <= DIAS_ALERTA_ANTICIPO) continue;
    const clave = `${m.entidad.tipo}_${m.entidad.id}`;
    const item = anticipos.get(clave) ?? {
      tipo: m.entidad.tipo, idEntidad: m.entidad.id, nombre: m.entidad.razonSocial, importe: 0, detalle: '',
    };
    item.importe += m.sinImputar;
    item.detalle = item.detalle ? `${item.detalle}, ${m.numero} (${dias} d)` : `${m.numero} (${dias} d)`;
    anticipos.set(clave, item);
  }
  if (anticipos.size) {
    alertas.push(cerrarAlerta('anticipos', `Anticipos sin compensar (+${DIAS_ALERTA_ANTICIPO} días)`,
      'Anticipos o préstamos a choferes y proveedores que todavía no se compensaron en una liquidación.', anticipos));
  }

  const sinFacturar = new Map<string, ItemAlerta>();
  for (const liq of informes) {
    if (liq.estado !== 'emitido') continue;
    const dias = diasSeguros(liq.fechaEmision ?? liq.fechaCreacion, hoy);
    if (dias === null || dias <= DIAS_ALERTA_SIN_FACTURAR) continue;
    const saldo = normalizarValoresFinancieros(liq.valoresFinancieros, liq.valores.total).saldo;
    const clave = `${liq.tipo}_${liq.entidad.id}`;
    const item = sinFacturar.get(clave) ?? {
      tipo: liq.tipo, idEntidad: liq.entidad.id, nombre: nombreEntidadRef(liq.entidad), importe: 0, detalle: '',
    };
    item.importe += saldo;
    const ref = `${liq.numeroInterno ?? 'sin número'} (${dias} d)`;
    item.detalle = item.detalle ? `${item.detalle}, ${ref}` : ref;
    sinFacturar.set(clave, item);
  }
  if (sinFacturar.size) {
    alertas.push(cerrarAlerta('sinFacturar', `Emitido sin facturar (+${DIAS_ALERTA_SIN_FACTURAR} días)`,
      'Liquidaciones emitidas que todavía no tienen factura: no se pueden cobrar ni pagar.', sinFacturar));
  }

  return alertas;
}

/** "$ 1.234,50" (es-AR) — para textos armados en el util. */
function pesos(v: number): string {
  return `$ ${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function diasSeguros(fecha: string | null | undefined, hoy: string): number | null {
  if (!fecha) return null;
  try {
    return diasEntre(fecha, hoy);
  } catch {
    return null;
  }
}
