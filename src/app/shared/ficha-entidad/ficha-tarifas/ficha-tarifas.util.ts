import { NivelHabilitado } from 'src/app/interfaces/tarifa-habilitada';
import { Tarifa } from 'src/app/interfaces/tarifa';
import { TarifaEspecial } from 'src/app/interfaces/tarifa-especial';
import { fechaLegible } from 'src/app/shared/utils/fecha.util';

/** Renglón de una tarifa en la pestaña Tarifas de la ficha (sin valores, F3). */
export interface FilaTarifaFicha {
  idTarifa: string;
  nombre: string;
  modo: string;
  vigenteDesde: string;
  categorias: string;
  /** Solo especiales de chofer/proveedor: con qué cliente rige. null = no aplica. */
  alcance: string | null;
}

/** Lo que muestra la pestaña Tarifas de una entidad. */
export interface TarifasFicha {
  niveles: NivelHabilitado[];
  /** Chofer de proveedor: razón social del proveedor del que hereda; null si no hereda. */
  heredadoDe: string | null;
  general: FilaTarifaFicha | null;
  personalizadas: FilaTarifaFicha[];
  especiales: FilaTarifaFicha[];
}

/** Hasta este número de categorías se listan por nombre; más, se cuentan. */
const MAX_CATEGORIAS_LISTADAS = 4;

function categoriasDe(tarifa: Tarifa | TarifaEspecial): string {
  const nombres = [...new Set(
    (tarifa.secciones ?? []).flatMap(s => (s.categorias ?? []).map(c => (c.nombre ?? '').trim())),
  )].filter(n => n !== '');
  if (nombres.length === 0) return '—';
  if (nombres.length <= MAX_CATEGORIAS_LISTADAS) return nombres.join(', ');
  return `${nombres.length} categorías`;
}

/** Una tarifa (general, personalizada o especial) como renglón de la ficha.
 *  `nombreCliente` resuelve el cliente del alcance de una especial de
 *  chofer/proveedor (undefined = dado de baja). */
export function filaTarifaFicha(
  tarifa: Tarifa | TarifaEspecial,
  nombreCliente: (idCliente: string) => string | undefined,
): FilaTarifaFicha {
  let alcance: string | null = null;
  if (tarifa.nivel === 'especial' && tarifa.entidadTipo !== 'cliente') {
    alcance = tarifa.alcance?.tipo === 'entidadCliente'
      ? `Solo con ${nombreCliente(tarifa.alcance.idCliente) ?? 'un cliente dado de baja'}`
      : 'Con todos los clientes';
  }
  return {
    idTarifa: tarifa.idTarifa,
    nombre: (tarifa.nombre ?? '').trim() || '(sin nombre)',
    modo: tarifa.modoTarifacion === 'km' ? 'Por km' : 'Por categoría',
    vigenteDesde: fechaLegible(tarifa.vigenciaDesde),
    categorias: categoriasDe(tarifa),
    alcance,
  };
}

/** Renglones por nombre (las vigentes de una entidad pueden ser varias). */
export function filasTarifasFicha(
  tarifas: (Tarifa | TarifaEspecial)[],
  nombreCliente: (idCliente: string) => string | undefined,
): FilaTarifaFicha[] {
  return tarifas
    .map(t => filaTarifaFicha(t, nombreCliente))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}
