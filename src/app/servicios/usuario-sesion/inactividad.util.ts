/* Eje de sesión, bloque 4 — vencimiento de la sesión por inactividad.
 * Puro: sin DOM, sin temporizadores, sin Firebase. La decisión sale de la
 * marca de última actividad (compartida entre pestañas en localStorage) y del
 * ahora, nunca de tics acumulados: los temporizadores de una pestaña en
 * segundo plano se frenan. */

/** Quietud máxima de TODAS las pestañas antes de que la sesión venza. */
export const INACTIVIDAD_MAXIMA_MS = 30 * 60 * 1000;

/** Cuánto antes del vencimiento aparece el aviso con el botón para seguir. */
export const AVISO_PREVIO_MS = 60 * 1000;

/** Como mucho una escritura de la marca cada tanto: la actividad real
 *  (click, tecla, scroll) puede disparar decenas de eventos por segundo. */
export const ESCRITURA_MINIMA_MS = 5 * 1000;

/** Clave de localStorage: la marca es de todas las pestañas del origen, así
 *  la sesión vence sólo cuando estuvieron todas quietas. */
export const MARCA_ULTIMA_ACTIVIDAD = 'ultimaActividad';

export type EstadoInactividad = 'seguir' | 'avisar' | 'vencer';

/**
 * - `vencer`: `ahora - ultimaActividad > limite`.
 * - `avisar`: dentro de los últimos `avisoPrevio` ms antes del límite.
 * - `seguir`: antes de eso. Una marca en el futuro (relojes) cuenta como recién.
 */
export function estadoInactividad(
  ultimaActividad: number,
  ahora: number,
  limite: number = INACTIVIDAD_MAXIMA_MS,
  avisoPrevio: number = AVISO_PREVIO_MS,
): EstadoInactividad {
  const quieto = ahora - ultimaActividad;
  if (quieto > limite) return 'vencer';
  if (quieto > limite - avisoPrevio) return 'avisar';
  return 'seguir';
}

/** ¿La marca dice que la sesión ya venció? Sin marca, no: no hay con qué
 *  decidirlo (el login escribe una, y el shell la escribe al llegar). Lo usa
 *  /login para no ofrecer "Continuar" sobre una sesión vencida. */
export function marcaVencida(ultimaActividad: number | null, ahora: number): boolean {
  return ultimaActividad !== null && estadoInactividad(ultimaActividad, ahora) === 'vencer';
}

/** Milisegundos que faltan para vencer (0 si ya venció). */
export function msHastaVencer(
  ultimaActividad: number,
  ahora: number,
  limite: number = INACTIVIDAD_MAXIMA_MS,
): number {
  return Math.max(0, limite - (ahora - ultimaActividad));
}

/** ¿Toca escribir la marca? Limita a una escritura cada `minimo` ms. */
export function debeEscribirMarca(
  ultimaEscritura: number | null,
  ahora: number,
  minimo: number = ESCRITURA_MINIMA_MS,
): boolean {
  return ultimaEscritura === null || ahora - ultimaEscritura >= minimo;
}

/** La marca de última actividad, o null si no hay o no se puede leer. */
export function leerUltimaActividad(storage: Pick<Storage, 'getItem'>): number | null {
  try {
    const valor = storage.getItem(MARCA_ULTIMA_ACTIVIDAD);
    if (valor === null) return null;
    const n = Number(valor);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function escribirUltimaActividad(storage: Pick<Storage, 'setItem'>, ahora: number): void {
  try { storage.setItem(MARCA_ULTIMA_ACTIVIDAD, String(ahora)); } catch { /* sin storage */ }
}
