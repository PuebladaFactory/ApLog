import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { MovimientoFin, TipoEntidadFin } from 'src/app/interfaces/movimiento-fin';
import { nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';
import {
  TRAMOS_ANTIGUEDAD, TramoAntiguedad, diasEntre, esCero, normalizarValoresFinancieros, redondear2, tramoAntiguedad,
} from 'src/app/shared/utils/finanzas.util';

/** Cuentas por entidad del Frente Finanzas — cuenta corriente CALCULADA al
 *  consultar (no hay agregado persistido, decisión F2 del diseño). PURO:
 *  recibe los documentos abiertos y devuelve una fila por entidad.
 *  Diseño: claude/diseno-finanzas.md §4.3, §4.5. */

/** A cobrar: clientes (nos deben). A pagar: choferes y proveedores (les
 *  debemos). */
export type LadoCuenta = 'cobrar' | 'pagar';

/** Antigüedad a partir de la cual el saldo se muestra como "+60 días". Sin
 *  plazo de pago por entidad todavía (F12): se cuenta desde la fecha de la
 *  factura. */
export const DIAS_ALERTA_ANTIGUEDAD = 60;

export interface CuentaEntidadFin {
  /** `${tipo}_${idEntidad}` — clave única (sin colisiones entre tipos). */
  clave: string;
  tipo: TipoEntidadFin;
  idEntidad: string;
  nombre: string;
  cuit: number;
  lado: LadoCuenta;
  /** Σ saldo de los InformeLiq facturados con saldo pendiente. */
  saldoFacturado: number;
  cantidadFacturados: number;
  /** Parte de saldoFacturado con factura de más de DIAS_ALERTA_ANTIGUEDAD días. */
  saldoMas60: number;
  /** saldoFacturado repartido por antigüedad de la factura (F6a). */
  tramos: Record<TramoAntiguedad, number>;
  /** Días desde la factura abierta más antigua (null si no hay facturados abiertos). */
  diasMasAntiguo: number | null;
  /** Días promedio de las facturas abiertas, ponderados por saldo (F47):
   *  Σ saldo × días / Σ saldo, redondeado. null si no hay facturados
   *  abiertos con fecha válida. */
  diasPromedio: number | null;
  /** Saldo con factura de más de UMBRALES_ANTIGUEDAD[lado].atencion días
   *  (cobrar: +60, pagar: +15) — lo "vencido" según el lado (F6b). */
  saldoVencido: number;
  /** Facturas abiertas con más de UMBRALES_ANTIGUEDAD[lado].critico días
   *  (cobrar: +90, pagar: +30) — se marcan aunque el promedio sea bajo (F47). */
  cantidadCriticas: number;
  /** Σ saldo de los InformeLiq emitidos sin factura (todavía no se cobran/pagan). */
  sinFacturar: number;
  cantidadSinFacturar: number;
  /** Σ sinImputar de los movimientos vigentes: saldo a favor del cliente /
   *  anticipos entregados al chofer o proveedor. */
  saldoAFavor: number;
  /** saldoFacturado − saldoAFavor. */
  neto: number;
}

export interface TotalesCuentas {
  cantidad: number;
  saldoFacturado: number;
  saldoMas60: number;
  saldoVencido: number;
  tramos: Record<TramoAntiguedad, number>;
  sinFacturar: number;
  saldoAFavor: number;
  neto: number;
}

/** Los cuatro tramos en 0 (objeto nuevo en cada llamada). */
export function tramosEnCero(): Record<TramoAntiguedad, number> {
  return { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
}

export function ladoDe(tipo: TipoEntidadFin): LadoCuenta {
  return tipo === 'cliente' ? 'cobrar' : 'pagar';
}

/** Fecha desde la que se cuenta la antigüedad de un InformeLiq: la de la
 *  factura; si no tiene (emitido), la de emisión; en último caso la de
 *  creación. Todas 'YYYY-MM-DD'. */
export function fechaBaseAntiguedad(liq: InformeLiqNuevo): string {
  return liq.factura?.fecha ?? liq.fechaEmision ?? liq.fechaCreacion;
}

/** Días desde `fecha` hasta `hoy`; null si la fecha no tiene formato
 *  'YYYY-MM-DD' (no corta el armado de toda la tabla por un dato roto). */
function diasDesde(fecha: string | null | undefined, hoy: string): number | null {
  if (!fecha) return null;
  try {
    return diasEntre(fecha, hoy);
  } catch {
    return null;
  }
}

/** Arma una fila por entidad a partir de:
 *  - `informes`: InformeLiq 'emitido' (→ sinFacturar) y 'facturado' con
 *    saldo (→ saldoFacturado). Los de otros estados o con saldo 0 se
 *    ignoran.
 *  - `movimientos`: movimientos con sinImputar > 0 (los anulados se
 *    ignoran) → saldoAFavor.
 *  Orden: por nombre. */
export function armarCuentas(
  informes: InformeLiqNuevo[],
  movimientos: MovimientoFin[],
  hoy: string,
): CuentaEntidadFin[] {
  const mapa = new Map<string, CuentaEntidadFin>();
  /** Acumuladores del promedio ponderado por cuenta: Σ saldo × días y Σ saldo. */
  const ponderado = new Map<string, { suma: number; base: number }>();

  const cuentaDe = (tipo: TipoEntidadFin, id: string, nombre: string, cuit: number): CuentaEntidadFin => {
    const clave = `${tipo}_${id}`;
    let cuenta = mapa.get(clave);
    if (!cuenta) {
      cuenta = {
        clave, tipo, idEntidad: id, nombre, cuit, lado: ladoDe(tipo),
        saldoFacturado: 0, cantidadFacturados: 0, saldoMas60: 0, tramos: tramosEnCero(), diasMasAntiguo: null,
        diasPromedio: null, saldoVencido: 0, cantidadCriticas: 0,
        sinFacturar: 0, cantidadSinFacturar: 0, saldoAFavor: 0, neto: 0,
      };
      mapa.set(clave, cuenta);
    }
    return cuenta;
  };

  for (const liq of informes) {
    if (liq.estado !== 'facturado' && liq.estado !== 'emitido') continue;
    const saldo = normalizarValoresFinancieros(liq.valoresFinancieros, liq.valores.total).saldo;
    if (esCero(saldo)) continue;

    const c = cuentaDe(liq.tipo, liq.entidad.id, nombreEntidadRef(liq.entidad), liq.entidad.cuit);
    if (liq.estado === 'facturado') {
      c.saldoFacturado = redondear2(c.saldoFacturado + saldo);
      c.cantidadFacturados++;
      const dias = diasDesde(fechaBaseAntiguedad(liq), hoy);
      const tramo = tramoAntiguedad(dias ?? 0);   // fecha rota → 0-30 (como resumirCuentaEntidad)
      c.tramos[tramo] = redondear2(c.tramos[tramo] + saldo);
      if (dias !== null) {
        if (dias > DIAS_ALERTA_ANTIGUEDAD) c.saldoMas60 = redondear2(c.saldoMas60 + saldo);
        c.diasMasAntiguo = c.diasMasAntiguo === null ? dias : Math.max(c.diasMasAntiguo, dias);
        const u = UMBRALES_ANTIGUEDAD[c.lado];
        if (dias > u.atencion) c.saldoVencido = redondear2(c.saldoVencido + saldo);
        if (dias > u.critico) c.cantidadCriticas++;
        const p = ponderado.get(c.clave) ?? { suma: 0, base: 0 };
        p.suma += saldo * Math.max(dias, 0);
        p.base += saldo;
        ponderado.set(c.clave, p);
      }
    } else {
      c.sinFacturar = redondear2(c.sinFacturar + saldo);
      c.cantidadSinFacturar++;
    }
  }

  for (const mov of movimientos) {
    if (mov.estado !== 'vigente' || esCero(mov.sinImputar)) continue;
    const c = cuentaDe(mov.entidad.tipo, mov.entidad.id, mov.entidad.razonSocial, mov.entidad.cuit);
    c.saldoAFavor = redondear2(c.saldoAFavor + mov.sinImputar);
  }

  const cuentas = [...mapa.values()];
  for (const c of cuentas) {
    c.neto = redondear2(c.saldoFacturado - c.saldoAFavor);
    const p = ponderado.get(c.clave);
    c.diasPromedio = p && p.base > 0 ? Math.round(p.suma / p.base) : null;
  }
  return cuentas.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export function totalizarCuentas(cuentas: CuentaEntidadFin[]): TotalesCuentas {
  const t: TotalesCuentas = {
    cantidad: cuentas.length, saldoFacturado: 0, saldoMas60: 0, saldoVencido: 0, tramos: tramosEnCero(),
    sinFacturar: 0, saldoAFavor: 0, neto: 0,
  };
  for (const c of cuentas) {
    t.saldoFacturado += c.saldoFacturado;
    t.saldoMas60 += c.saldoMas60;
    t.saldoVencido += c.saldoVencido;
    for (const tr of TRAMOS_ANTIGUEDAD) t.tramos[tr] += c.tramos[tr];
    t.sinFacturar += c.sinFacturar;
    t.saldoAFavor += c.saldoAFavor;
    t.neto += c.neto;
  }
  return {
    cantidad: t.cantidad,
    saldoFacturado: redondear2(t.saldoFacturado),
    saldoMas60: redondear2(t.saldoMas60),
    saldoVencido: redondear2(t.saldoVencido),
    tramos: {
      '0-30': redondear2(t.tramos['0-30']),
      '31-60': redondear2(t.tramos['31-60']),
      '61-90': redondear2(t.tramos['61-90']),
      '90+': redondear2(t.tramos['90+']),
    },
    sinFacturar: redondear2(t.sinFacturar),
    saldoAFavor: redondear2(t.saldoAFavor),
    neto: redondear2(t.neto),
  };
}

// ---------------------------------------------------------------------------
// Antigüedad (F6a)
// ---------------------------------------------------------------------------

/** Estado de una cuenta (F43, F47). Reemplaza el "score de riesgo" del
 *  módulo viejo. Ver estadoCuenta. */
export type EstadoAntiguedad = 'al-dia' | 'atencion' | 'critico';

/** Umbrales en días por lado (F43): hasta `atencion` está al día; hasta
 *  `critico`, atención; más, crítico (a cobrar) / atrasado (a pagar).
 *  Clientes pagan a 30–60 días; choferes y proveedores se pagan a pocos días
 *  de recibir su factura. */
export const UMBRALES_ANTIGUEDAD: Readonly<Record<LadoCuenta, { atencion: number; critico: number }>> = {
  cobrar: { atencion: 60, critico: 90 },
  pagar: { atencion: 15, critico: 30 },
};

/** Estado para una cantidad de días según los umbrales del lado. null si
 *  no hay días (cuenta sin facturas abiertas). */
export function estadoAntiguedad(dias: number | null, lado: LadoCuenta): EstadoAntiguedad | null {
  if (dias === null) return null;
  const u = UMBRALES_ANTIGUEDAD[lado];
  if (dias <= u.atencion) return 'al-dia';
  if (dias <= u.critico) return 'atencion';
  return 'critico';
}

export const ESTADOS_ANTIGUEDAD: readonly EstadoAntiguedad[] = ['al-dia', 'atencion', 'critico'];

/** Texto del estado: el último cambia por lado (crítico para lo que nos
 *  deben, atrasado para lo que debemos). */
export function etiquetaEstadoAntiguedad(estado: EstadoAntiguedad, lado: LadoCuenta): string {
  if (estado === 'al-dia') return 'Al día';
  if (estado === 'atencion') return 'Atención';
  return lado === 'cobrar' ? 'Crítico' : 'Atrasado';
}

/** Clase de texto Bootstrap para el estado. */
export const CLASE_ESTADO_ANTIGUEDAD: Readonly<Record<EstadoAntiguedad, string>> = {
  'al-dia': 'text-success fw-semibold',
  atencion: 'text-warning-emphasis fw-semibold',
  critico: 'text-danger fw-bold',
};

/** Rango legible de un estado para un lado: "≤ 60 días", "61–90 días",
 *  "+90 días". */
export function rangoEstadoAntiguedad(estado: EstadoAntiguedad, lado: LadoCuenta): string {
  const u = UMBRALES_ANTIGUEDAD[lado];
  if (estado === 'al-dia') return `≤ ${u.atencion} días`;
  if (estado === 'atencion') return `${u.atencion + 1}–${u.critico} días`;
  return `+${u.critico} días`;
}

/** Porcentaje de cada tramo sobre el total facturado (0 si el total es 0).
 *  Para la barra y las tarjetas; no se redondea a 100. */
export function porcentajesTramos(tramos: Record<TramoAntiguedad, number>): Record<TramoAntiguedad, number> {
  const total = TRAMOS_ANTIGUEDAD.reduce((a, t) => a + tramos[t], 0);
  const r = tramosEnCero();
  if (esCero(total)) return r;
  for (const t of TRAMOS_ANTIGUEDAD) r[t] = Math.round((tramos[t] / total) * 1000) / 10;
  return r;
}

/** Estado de la cuenta (F47): por los días PROMEDIO ponderados por saldo
 *  (cuánto de la deuda está atrasada, no solo la factura más vieja). Si
 *  alguna factura supera el umbral crítico, sube como mínimo a 'atencion'
 *  (una factura trabada no queda oculta en el promedio). null si no hay
 *  facturas abiertas con fecha válida. */
export function estadoCuenta(c: CuentaEntidadFin): EstadoAntiguedad | null {
  const e = estadoAntiguedad(c.diasPromedio, c.lado);
  if (e === 'al-dia' && c.cantidadCriticas > 0) return 'atencion';
  return e;
}

/** Peso del estado para ordenar (crítico primero en orden descendente). */
export const PESO_ESTADO_ANTIGUEDAD: Readonly<Record<EstadoAntiguedad, number>> = {
  'al-dia': 1, atencion: 2, critico: 3,
};

/** "2 fact. +90" / "1 fact. +30" — marca de facturas críticas ('' si no hay). */
export function marcaCriticas(c: CuentaEntidadFin): string {
  return c.cantidadCriticas > 0 ? `${c.cantidadCriticas} fact. +${UMBRALES_ANTIGUEDAD[c.lado].critico}` : '';
}

/** Cantidad de cuentas por estado (las sin facturas abiertas no cuentan). */
export function contarPorEstado(cuentas: CuentaEntidadFin[]): Record<EstadoAntiguedad, number> {
  const r: Record<EstadoAntiguedad, number> = { 'al-dia': 0, atencion: 0, critico: 0 };
  for (const c of cuentas) {
    const e = estadoCuenta(c);
    if (e) r[e]++;
  }
  return r;
}

/** Top N por saldo vencido (> 0) del lado, de mayor a menor; a igual
 *  vencido, más días promedio primero (Resumen, F6b). */
export function topVencidos(cuentas: CuentaEntidadFin[], lado: LadoCuenta, n = 5): CuentaEntidadFin[] {
  return cuentas
    .filter(c => c.lado === lado && c.saldoVencido > 0)
    .sort((a, b) => b.saldoVencido - a.saldoVencido || (b.diasPromedio ?? 0) - (a.diasPromedio ?? 0))
    .slice(0, n);
}
