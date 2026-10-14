import { FechaNegocio, esFechaNegocio, hoyNegocio } from './fecha.util';

/**
 * Fecha de nacimiento de un chofer (FI1c, frente Ficha de entidad).
 *
 * Se guarda como fecha de negocio 'YYYY-MM-DD': el string del input de fecha
 * del alta. En demo hay datos viejos guardados como Timestamp de Firestore o
 * como mapa {seconds, nanoseconds} (venían de una anonimización de prueba):
 * `normalizarFechaNacimiento` los convierte, y la herramienta de /migracion
 * lo usa para corregir lo guardado.
 */

/** Fecha mínima aceptada. La máxima es hoy (Argentina). */
export const FECHA_NAC_MINIMA: FechaNegocio = '1900-01-01';

/** null si `valor` es una fecha de nacimiento válida ('YYYY-MM-DD' real,
 *  entre FECHA_NAC_MINIMA y hoy); si no, el motivo. */
export function errorFechaNacimiento(valor: unknown, hoy: FechaNegocio = hoyNegocio()): string | null {
  if (valor === null || valor === undefined || valor === '') {
    return 'falta la fecha de nacimiento';
  }
  if (!esFechaNegocio(valor)) {
    return 'la fecha de nacimiento no tiene el formato AAAA-MM-DD';
  }
  if (valor < FECHA_NAC_MINIMA || valor > hoy) {
    return 'la fecha de nacimiento tiene que estar entre el 01/01/1900 y hoy';
  }
  return null;
}

export type OrigenFechaNacimiento = 'texto' | 'timestamp' | 'mapa' | 'fecha' | 'vacio' | 'otro';

export interface FechaNacimientoNormalizada {
  /** 'YYYY-MM-DD', o null si no se puede interpretar. */
  fecha: FechaNegocio | null;
  origen: OrigenFechaNacimiento;
}

/**
 * Interpreta cualquier forma guardada de la fecha de nacimiento:
 * - texto 'YYYY-MM-DD' → tal cual (aunque esté fuera de rango; eso lo dice
 *   errorFechaNacimiento);
 * - Timestamp de Firestore (tiene toDate), mapa {seconds} o Date → el día de
 *   ese instante en Argentina; salvo que caiga justo a las 00:00:00 UTC (se
 *   armó con new Date('YYYY-MM-DD')): ahí el día UTC, que es el que se cargó;
 * - vacío o cualquier otra cosa → fecha null.
 */
export function normalizarFechaNacimiento(valor: unknown): FechaNacimientoNormalizada {
  if (valor === null || valor === undefined || valor === '') {
    return { fecha: null, origen: 'vacio' };
  }
  if (typeof valor === 'string') {
    const texto = valor.trim();
    return { fecha: esFechaNegocio(texto) ? texto : null, origen: 'texto' };
  }
  if (valor instanceof Date) {
    return { fecha: diaDeInstante(valor.getTime()), origen: 'fecha' };
  }
  if (typeof valor === 'object') {
    const v = valor as { toDate?: unknown; seconds?: unknown; nanoseconds?: unknown };
    if (typeof v.toDate === 'function') {
      return { fecha: diaDeInstante((v.toDate as () => Date).call(valor).getTime()), origen: 'timestamp' };
    }
    if (typeof v.seconds === 'number') {
      const nanos = typeof v.nanoseconds === 'number' ? v.nanoseconds : 0;
      return { fecha: diaDeInstante(v.seconds * 1000 + Math.floor(nanos / 1e6)), origen: 'mapa' };
    }
  }
  return { fecha: null, origen: 'otro' };
}

function diaDeInstante(ms: number): FechaNegocio | null {
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  if (ms % 86_400_000 === 0) {
    return d.toISOString().slice(0, 10);
  }
  return hoyNegocio(d);
}
