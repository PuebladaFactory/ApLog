import { ConId } from 'src/app/interfaces/conId';
import { ComisionVenta } from 'src/app/interfaces/comision-venta';

/** Tablero de comisiones de un mes (Frente Vendedores) — construcción pura,
 *  sin Firestore. Lo usan la pantalla (V5) y el Excel/PDF (V7). */

/** Por debajo de esto (en pesos) un saldo se considera cero (residuos de los
 *  increments). Mismo criterio que ComisionVentaFactoryService.TOLERANCIA. */
export const TOLERANCIA_SALDO = 0.005;

export type EstadoLineaComision = 'pendiente' | 'liquidada' | 'ajuste' | 'anulada';

export interface LineaTableroComision {
  id: string;
  idVendedor: string;
  idOperacion: string;
  numeroOperacion: number;
  fecha: string;
  periodo: number;
  idCliente: string;
  razonSocial: string;
  base: number;
  porcentaje: number;
  monto: number;
  montoLiquidado: number;
  saldo: number;
  anulada: boolean;
  arrastre: boolean;          // pendiente de un mes anterior al del tablero
  estado: EstadoLineaComision;
}

export interface ClienteTableroComision {
  idCliente: string;
  razonSocial: string;
  lineas: LineaTableroComision[];
  monto: number;
  saldo: number;
}

export interface TotalesTableroComision {
  cantidadOps: number;        // comisiones del mes no anuladas
  comisionesMes: number;      // Σ monto del mes
  liquidadoMes: number;       // Σ montoLiquidado del mes
  arrastre: number;           // Σ saldo de meses anteriores
  saldoALiquidar: number;     // Σ saldo del mes + arrastre
}

export interface VendedorTableroComision extends TotalesTableroComision {
  idVendedor: string;
  clientes: ClienteTableroComision[];
}

export interface TableroComisiones {
  periodo: number;
  vendedores: VendedorTableroComision[];
  totales: TotalesTableroComision;
}

export function redondear2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function esCero(n: number | null | undefined): boolean {
  return Math.abs(n ?? 0) < TOLERANCIA_SALDO;
}

function estadoDe(c: ComisionVenta): EstadoLineaComision {
  if (c.anulada) return 'anulada';
  if (esCero(c.saldo)) return 'liquidada';
  if (!esCero(c.montoLiquidado)) return 'ajuste';
  return 'pendiente';
}

function totalesVacios(): TotalesTableroComision {
  return { cantidadOps: 0, comisionesMes: 0, liquidadoMes: 0, arrastre: 0, saldoALiquidar: 0 };
}

/** Arma el tablero del período `periodo` (anio*100+mes):
 *  - `delMes`: comisiones con ese período (cualquier saldo);
 *  - `pendientes`: comisiones con saldo ≠ 0 de cualquier período (se usan
 *    las de períodos ANTERIORES como arrastre; las posteriores no entran). */
export function armarTableroComisiones(
  delMes: ConId<ComisionVenta>[],
  pendientes: ConId<ComisionVenta>[],
  periodo: number,
): TableroComisiones {
  const lineas: LineaTableroComision[] = [];
  const aLinea = (c: ConId<ComisionVenta>, arrastre: boolean): LineaTableroComision => ({
    id: c.id,
    idVendedor: c.idVendedor,
    idOperacion: c.idOperacion,
    numeroOperacion: c.numeroOperacion,
    fecha: c.fecha,
    periodo: c.periodo,
    idCliente: c.idCliente,
    razonSocial: c.razonSocial,
    base: c.base ?? 0,
    porcentaje: c.porcentaje ?? 0,
    monto: c.monto ?? 0,
    montoLiquidado: c.montoLiquidado ?? 0,
    saldo: esCero(c.saldo) ? 0 : (c.saldo ?? 0),
    anulada: !!c.anulada,
    arrastre,
    estado: estadoDe(c),
  });

  for (const c of delMes) {
    if (c.periodo !== periodo) continue;
    // Anulada sin efecto (baja antes de liquidar): ruido, no se muestra.
    if (c.anulada && esCero(c.monto) && esCero(c.montoLiquidado) && esCero(c.saldo)) continue;
    lineas.push(aLinea(c, false));
  }
  for (const c of pendientes) {
    if (c.periodo < periodo && !esCero(c.saldo)) lineas.push(aLinea(c, true));
  }

  const porVendedor = new Map<string, LineaTableroComision[]>();
  for (const l of lineas) {
    porVendedor.set(l.idVendedor, [...(porVendedor.get(l.idVendedor) ?? []), l]);
  }

  const vendedores: VendedorTableroComision[] = [];
  const totales = totalesVacios();
  for (const [idVendedor, ls] of porVendedor) {
    const v: VendedorTableroComision = { idVendedor, clientes: [], ...totalesVacios() };
    for (const l of ls) {
      if (l.arrastre) {
        v.arrastre += l.saldo;
      } else {
        if (!l.anulada) v.cantidadOps++;
        v.comisionesMes += l.monto;
        v.liquidadoMes += l.montoLiquidado;
      }
      v.saldoALiquidar += l.saldo;
    }
    v.comisionesMes = redondear2(v.comisionesMes);
    v.liquidadoMes = redondear2(v.liquidadoMes);
    v.arrastre = redondear2(v.arrastre);
    v.saldoALiquidar = redondear2(v.saldoALiquidar);

    const porCliente = new Map<string, ClienteTableroComision>();
    for (const l of ls) {
      const cl = porCliente.get(l.idCliente)
        ?? { idCliente: l.idCliente, razonSocial: l.razonSocial, lineas: [], monto: 0, saldo: 0 };
      cl.lineas.push(l);
      cl.monto = redondear2(cl.monto + (l.arrastre ? 0 : l.monto));
      cl.saldo = redondear2(cl.saldo + l.saldo);
      porCliente.set(l.idCliente, cl);
    }
    v.clientes = [...porCliente.values()].sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
    for (const cl of v.clientes) {
      cl.lineas.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.numeroOperacion - b.numeroOperacion);
    }

    totales.cantidadOps += v.cantidadOps;
    totales.comisionesMes += v.comisionesMes;
    totales.liquidadoMes += v.liquidadoMes;
    totales.arrastre += v.arrastre;
    totales.saldoALiquidar += v.saldoALiquidar;
    vendedores.push(v);
  }
  totales.comisionesMes = redondear2(totales.comisionesMes);
  totales.liquidadoMes = redondear2(totales.liquidadoMes);
  totales.arrastre = redondear2(totales.arrastre);
  totales.saldoALiquidar = redondear2(totales.saldoALiquidar);

  return { periodo, vendedores, totales };
}
