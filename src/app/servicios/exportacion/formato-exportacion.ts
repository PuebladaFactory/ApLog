import { TipoCeldaDoc, ValorCeldaDoc } from 'src/app/interfaces/documento-tabular';

/** Formatos compartidos por los renderers de exportación. Puros. */

const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "$ 1.234,56" — mismo formato que la pantalla (columnas-liquidacion.util). */
export function formatearMoneda(valor: number): string {
  return `$ ${(valor ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** 'YYYY-MM-DD' → 'DD/MM/AAAA', sin pasar por Date (evita el corrimiento de
 *  un día por huso horario). Si no tiene ese formato, lo devuelve igual. */
export function formatearFechaIso(fecha: string): string {
  const m = FECHA_ISO.exec(fecha ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (fecha ?? '');
}

/** 'YYYY-MM-DD' → Date en UTC medianoche, o null. exceljs convierte las Date
 *  a número de serie de Excel en UTC: así la celda muestra el mismo día. */
export function fechaIsoAUtc(fecha: string): Date | null {
  const m = FECHA_ISO.exec(fecha ?? '');
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null;
}

/** Texto de una celda según su tipo (para el PDF). */
export function formatearCelda(valor: ValorCeldaDoc, tipo: TipoCeldaDoc): string {
  if (valor === null) return '—';
  switch (tipo) {
    case 'porcentaje':
      return `${((Number(valor) || 0) * 100).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
    case 'decimal':
      return (Number(valor) || 0).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    case 'moneda': return formatearMoneda(Number(valor) || 0);
    case 'numero': return (Number(valor) || 0).toLocaleString('es-AR');
    case 'fecha': return formatearFechaIso(String(valor ?? ''));
    default: return String(valor ?? '');
  }
}

/** Fecha y hora LOCAL actuales: 'DD/MM/AAAA HH:MM'. */
export function fechaHoraActual(): string {
  const d = new Date();
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

/** Suma de anchos de las columnas por encima de la cual se usa hoja
 *  horizontal (PDF y Excel). */
export const ANCHO_HOJA_HORIZONTAL = 140;
