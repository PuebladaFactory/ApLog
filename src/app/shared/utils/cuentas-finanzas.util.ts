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

  const cuentaDe = (tipo: TipoEntidadFin, id: string, nombre: string, cuit: number): CuentaEntidadFin => {
    const clave = `${tipo}_${id}`;
    let cuenta = mapa.get(clave);
    if (!cuenta) {
      cuenta = {
        clave, tipo, idEntidad: id, nombre, cuit, lado: ladoDe(tipo),
        saldoFacturado: 0, cantidadFacturados: 0, saldoMas60: 0, tramos: tramosEnCero(), diasMasAntiguo: null,
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
  for (const c of cuentas) c.neto = redondear2(c.saldoFacturado - c.saldoAFavor);
  return cuentas.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export function totalizarCuentas(cuentas: CuentaEntidadFin[]): TotalesCuentas {
  const t: TotalesCuentas = {
    cantidad: cuentas.length, saldoFacturado: 0, saldoMas60: 0, tramos: tramosEnCero(), sinFacturar: 0, saldoAFavor: 0, neto: 0,
  };
  for (const c of cuentas) {
    t.saldoFacturado += c.saldoFacturado;
    t.saldoMas60 += c.saldoMas60;
    for (const tr of TRAMOS_ANTIGUEDAD) t.tramos[tr] += c.tramos[tr];
    t.sinFacturar += c.sinFacturar;
    t.saldoAFavor += c.saldoAFavor;
    t.neto += c.neto;
  }
  return {
    cantidad: t.cantidad,
    saldoFacturado: redondear2(t.saldoFacturado),
    saldoMas60: redondear2(t.saldoMas60),
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

/** Estado de una cuenta según los días de su factura abierta más antigua
 *  (F43). Reemplaza el "score de riesgo" del módulo viejo. */
export type EstadoAntiguedad = 'al-dia' | 'atencion' | 'critico';

/** Umbrales en días por lado (F43): hasta `atencion` está al día; hasta
 *  `critico`, atención; más, crítico (a cobrar) / atrasado (a pagar).
 *  Clientes pagan a 30–60 días; choferes y proveedores se pagan a pocos días
 *  de recibir su factura. */
export const UMBRALES_ANTIGUEDAD: Readonly<Record<LadoCuenta, { atencion: number; critico: number }>> = {
  cobrar: { atencion: 60, critico: 90 },
  pagar: { atencion: 15, critico: 30 },
};

/** null si la cuenta no tiene facturas abiertas (sin días). */
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

/** Cantidad de cuentas por estado (las sin facturas abiertas no cuentan). */
export function contarPorEstado(cuentas: CuentaEntidadFin[]): Record<EstadoAntiguedad, number> {
  const r: Record<EstadoAntiguedad, number> = { 'al-dia': 0, atencion: 0, critico: 0 };
  for (const c of cuentas) {
    const e = estadoAntiguedad(c.diasMasAntiguo, c.lado);
    if (e) r[e]++;
  }
  return r;
}
