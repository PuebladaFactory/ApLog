import { MetadataAumento, Tarifa } from 'src/app/interfaces/tarifa';
import { TarifaEspecial } from 'src/app/interfaces/tarifa-especial';

/** Helpers del historial de versiones de tarifas (pantallas de Tarifas:
 *  General, Personalizada, Especial e Historial). Funciones puras, sin
 *  Angular. Los componentes las exponen como propiedades para usarlas en
 *  los templates (TC-P1: antes estaban copiadas en cada componente). */

/** Variación % aproximada contra la versión inmediata anterior del mismo
 *  linaje, separada cobrar/pagar — suma de todas las categorías, no por
 *  categoría individual (el detalle se ve entrando a cada versión). null si
 *  no hay anterior o si la base es 0. Sirve para General y Personalizada
 *  (misma interfaz Tarifa). */
export function deltaTarifa(
  actual: Pick<Tarifa, 'secciones'>,
  anterior?: Pick<Tarifa, 'secciones'>,
): { cobrar: number | null; pagar: number | null } {
  if (!anterior) return { cobrar: null, pagar: null };
  const sumar = (t: Pick<Tarifa, 'secciones'>, campo: 'aCobrar' | 'aPagar') =>
    t.secciones.flatMap(s => s.categorias).reduce((acc, c) => acc + c[campo], 0);
  const calc = (campo: 'aCobrar' | 'aPagar'): number | null => {
    const base = sumar(anterior, campo);
    if (base === 0) return null;
    return ((sumar(actual, campo) - base) / base) * 100;
  };
  return { cobrar: calc('aCobrar'), pagar: calc('aPagar') };
}

/** Ídem para Especial: un solo `valor` por categoría (no aCobrar/aPagar
 *  separados). null si no hay anterior o si la base es 0. */
export function deltaTarifaEspecial(
  actual: Pick<TarifaEspecial, 'secciones'>,
  anterior?: Pick<TarifaEspecial, 'secciones'>,
): number | null {
  if (!anterior) return null;
  const sumar = (t: Pick<TarifaEspecial, 'secciones'>) =>
    t.secciones.flatMap(s => s.categorias).reduce((acc, c) => acc + c.valor, 0);
  const base = sumar(anterior);
  if (base === 0) return null;
  return ((sumar(actual) - base) / base) * 100;
}

/** Texto descriptivo de metadataAumento para el historial, o null si la
 *  versión no vino de la herramienta de aumento (edición manual, o versión
 *  anterior a este campo). */
export function textoAumentoTarifa(t: { metadataAumento?: MetadataAumento }): string | null {
  const m = t.metadataAumento;
  if (!m) return null;
  const redondeo = m.redondeo ? `, redondeo ${m.redondeo}` : '';
  const ajuste = m.ajustadoManualmente ? ' (con ajuste manual)' : '';
  if (m.modo === 'manual') return `Aumento manual${redondeo}`;
  if (m.modo === 'unico') return `Aumento único +${m.porcentajeUnico}%${redondeo}${ajuste}`;
  const partes = [
    m.porcentajeCobrar !== undefined ? `cobrar +${m.porcentajeCobrar}%` : null,
    m.porcentajePagar !== undefined ? `pagar +${m.porcentajePagar}%` : null,
    m.porcentajeProveedor !== undefined ? `proveedor +${m.porcentajeProveedor}%` : null,
  ].filter((p): p is string => p !== null);
  return `Aumento segmentado — ${partes.join(', ')}${redondeo}${ajuste}`;
}
