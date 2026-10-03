import { EstadoLiquidacionVenta, LiquidacionVenta } from 'src/app/interfaces/liquidacion-venta';
import { periodoDeFecha } from 'src/app/shared/utils/periodo.util';

/** Helpers de presentación de liquidaciones de comisiones de venta
 *  (Historial, detalle y, en V7, exportación). Puros, sin dependencias de
 *  Angular. Fechas de negocio siempre desde el string (nunca new Date(string)). */

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
  'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** 'Apellido, Nombre' desde el snapshot del vendedor en la liquidación. */
export function nombreVendedorLiquidacion(l: Pick<LiquidacionVenta, 'vendedor'>): string {
  return `${l.vendedor?.apellido ?? ''}, ${l.vendedor?.nombre ?? ''}`;
}

/** Mes de corte legible: 'Agosto 2026'. */
export function mesCorteLiquidacion(l: Pick<LiquidacionVenta, 'anio' | 'mes'>): string {
  return `${MESES[l.mes - 1] ?? l.mes} ${l.anio}`;
}

/** 'YYYY-MM-DD' → 'DD/MM/YYYY' ('—' si no hay fecha válida). */
export function fechaDMY(fecha: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
}

/** CUIT con guiones (20-12345678-9); si no tiene 11 dígitos, tal cual. */
export function formatoCuit(cuit: number | string | null | undefined): string {
  const s = String(cuit ?? '');
  if (!/^\d{11}$/.test(s)) return s || '—';
  return `${s.slice(0, 2)}-${s.slice(2, 10)}-${s.slice(10)}`;
}

export function claseEstadoLiquidacion(estado: EstadoLiquidacionVenta): string {
  switch (estado) {
    case 'emitida': return 'bg-warning text-dark';
    case 'pagada': return 'bg-success';
    case 'anulada': return 'bg-secondary';
    default: return 'bg-light text-dark';
  }
}

export function etiquetaEstadoLiquidacion(estado: EstadoLiquidacionVenta): string {
  switch (estado) {
    case 'emitida': return 'Emitida';
    case 'pagada': return 'Pagada';
    case 'anulada': return 'Anulada';
    default: return String(estado ?? '');
  }
}

/** 'YYYY-MM' desplazado `delta` meses. */
export function mesDesplazado(mes: string, delta: number): string {
  const [anio, m] = mes.split('-').map(Number);
  const total = anio * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

/** 'YYYY-MM' → anio*100 + mes. */
export function periodoDeMes(mes: string): number {
  return periodoDeFecha(`${mes}-01`).periodo;
}
