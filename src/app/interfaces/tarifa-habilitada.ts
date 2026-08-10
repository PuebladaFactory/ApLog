import { TarifaTipo } from './chofer';

export type RefTarifaHabilitada =
  | { nivel: 'general' }
  | { nivel: 'especial'; idTarifa: string }       // '' = habilitado, tarifa aún no creada
  | { nivel: 'personalizada'; idTarifa: string }  // '' = habilitado, tarifa aún no creada
  | { nivel: 'eventual' };

/**
 * Shim de compatibilidad — reconstruye los 4 booleanos legacy a partir de
 * tarifasHabilitadas, para los consumidores que todavía esperan TarifaTipo.
 * TODO: refactor Tarifas — reemplazar cada consumidor por lectura directa de
 * tarifasHabilitadas cuando se resuelva multiplicidad real en cada uno.
 */
export function tarifaTipoDesdeHabilitadas(lista: RefTarifaHabilitada[]): TarifaTipo {
  return {
    general: lista.some(t => t.nivel === 'general'),
    especial: lista.some(t => t.nivel === 'especial'),
    personalizada: lista.some(t => t.nivel === 'personalizada'),
    eventual: lista.some(t => t.nivel === 'eventual'),
  };
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
