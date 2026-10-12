export type RefTarifaHabilitada =
  | { nivel: 'general' } | { nivel: 'especial' }
  | { nivel: 'personalizada' } | { nivel: 'eventual' };

export type NivelHabilitado = RefTarifaHabilitada['nivel'];

/** Orden de exhibición de los niveles (del más específico al más genérico). */
const ORDEN_NIVELES: NivelHabilitado[] = ['personalizada', 'especial', 'general', 'eventual'];

/** Niveles habilitados de una entidad, sin repetidos y en orden fijo
 *  (personalizada, especial, general, eventual). Lista vacía o ausente → [].
 *  Helper puro para leer tarifasHabilitadas: forms de alta, badges,
 *  etiquetas (TC7). */
export function nivelesHabilitados(lista: RefTarifaHabilitada[] | null | undefined): NivelHabilitado[] {
  const presentes = new Set((lista ?? []).map(t => t.nivel));
  return ORDEN_NIVELES.filter(n => presentes.has(n));
}

/**
 * Valida el invariante de tarifasHabilitadas: al menos una entrada, y 'eventual'
 * solo puede aparecer si es la ÚNICA entrada de la lista. Lanza si se viola.
 */
export function validarTarifasHabilitadas(lista: RefTarifaHabilitada[]): void {
  if (lista.length === 0) {
    throw new Error('Debe haber al menos una tarifa habilitada.');
  }
  const tieneEventual = lista.some(t => t.nivel === 'eventual');
  if (tieneEventual && lista.length > 1) {
    throw new Error(
      "'eventual' no puede combinarse con otras tarifas habilitadas: debe ser la única entrada.",
    );
  }
}
