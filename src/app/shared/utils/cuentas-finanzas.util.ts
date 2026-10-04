import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { MovimientoFin, TipoEntidadFin } from 'src/app/interfaces/movimiento-fin';
import { nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';
import { diasEntre, esCero, normalizarValoresFinancieros, redondear2 } from 'src/app/shared/utils/finanzas.util';

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
  sinFacturar: number;
  saldoAFavor: number;
  neto: number;
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
        saldoFacturado: 0, cantidadFacturados: 0, saldoMas60: 0, diasMasAntiguo: null,
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
  const t: TotalesCuentas = { cantidad: cuentas.length, saldoFacturado: 0, saldoMas60: 0, sinFacturar: 0, saldoAFavor: 0, neto: 0 };
  for (const c of cuentas) {
    t.saldoFacturado += c.saldoFacturado;
    t.saldoMas60 += c.saldoMas60;
    t.sinFacturar += c.sinFacturar;
    t.saldoAFavor += c.saldoAFavor;
    t.neto += c.neto;
  }
  return {
    cantidad: t.cantidad,
    saldoFacturado: redondear2(t.saldoFacturado),
    saldoMas60: redondear2(t.saldoMas60),
    sinFacturar: redondear2(t.sinFacturar),
    saldoAFavor: redondear2(t.saldoAFavor),
    neto: redondear2(t.neto),
  };
}
