import { NivelHabilitado } from 'src/app/interfaces/tarifa-habilitada';
import { AdicionalKmValores, KmDistancia, Tarifa } from 'src/app/interfaces/tarifa';
import { TarifaEspecial } from 'src/app/interfaces/tarifa-especial';
import { fechaLegible } from 'src/app/shared/utils/fecha.util';

/** Qué lado de la tarifa le corresponde a la entidad de la ficha (FI7). */
export type LadoTarifaFicha = 'cliente' | 'chofer' | 'proveedor';

/** Vehículo de la entidad, para resaltar sus categorías en el detalle. */
export interface VehiculoFicha {
  dominio: string;
  categoria: string;
}

/** Lo que la ficha sabe de la entidad para armar los renglones de tarifas. */
export interface ContextoTarifaFicha {
  lado: LadoTarifaFicha;
  /** Chofer: los suyos; chofer de proveedor y proveedor: los del proveedor; cliente: ninguno. */
  vehiculos: VehiculoFicha[];
  /** Resuelve el cliente del alcance de una especial (undefined = dado de baja). */
  nombreCliente: (idCliente: string) => string | undefined;
}

/** Un renglón (sección + categoría) del detalle de valores. */
export interface RenglonDetalleTarifa {
  /** Nombre de la sección; null si es la sección única sin nombre. */
  seccion: string | null;
  categoria: string;
  base: number | null;
  primerSector: number | null;
  intervalo: number | null;
  /** Dominios de los vehículos de la entidad con esta categoría. */
  dominios: string[];
}

/** Detalle de valores de una tarifa, SOLO del lado de la entidad (FI7). */
export interface DetalleTarifaFicha {
  /** Nombre de la columna: 'A cobrar', 'A pagar', 'A pagar al proveedor' o 'Valor'. */
  columna: string;
  /** Tarifa por km: la base es por km (categorías libres, sin resaltado). */
  porKm: boolean;
  /** Escalones del adicional por km; null si la tarifa no tiene adicional. */
  kmDistancia: KmDistancia | null;
  acompaniante: number | null;
  variasSecciones: boolean;
  renglones: RenglonDetalleTarifa[];
  /** Hay al menos un renglón con vehículos de la entidad (vista inicial: solo esos). */
  conVehiculos: boolean;
  /** Vehículos cuya categoría no está en la tarifa: "Semi (XY987ZW)". */
  categoriasFaltantes: string[];
}

/** Renglón de una tarifa en la pestaña Tarifas de la ficha (sin valores, F3). */
export interface FilaTarifaFicha {
  idTarifa: string;
  nombre: string;
  modo: string;
  vigenteDesde: string;
  categorias: string;
  /** Solo especiales de chofer/proveedor: con qué cliente rige. null = no aplica. */
  alcance: string | null;
  /** Valores del lado de la entidad, para "Ver valores" (FI7). */
  detalle: DetalleTarifaFicha;
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

const COLUMNA_LADO: Readonly<Record<LadoTarifaFicha, string>> = {
  cliente: 'A cobrar',
  chofer: 'A pagar',
  proveedor: 'A pagar al proveedor',
};

/** Copia ordenada por `orden` (secciones y categorías). */
function porOrden<T extends { orden: number }>(lista: T[] | null | undefined): T[] {
  return [...(lista ?? [])].sort((a, b) => a.orden - b.orden);
}

function categoriasDe(tarifa: Tarifa | TarifaEspecial): string {
  const nombres = [...new Set(
    (tarifa.secciones ?? []).flatMap(s => (s.categorias ?? []).map(c => (c.nombre ?? '').trim())),
  )].filter(n => n !== '');
  if (nombres.length === 0) return '—';
  if (nombres.length <= MAX_CATEGORIAS_LISTADAS) return nombres.join(', ');
  return `${nombres.length} categorías`;
}

/**
 * Valores de una tarifa del lado de la entidad, con la MISMA regla que el
 * motor (ValoresTarifaService.calcularLado):
 * - cliente → aCobrar / adicionalKmACobrar / acompanianteACobrar;
 * - chofer directo → aPagar / adicionalKmAPagar / acompanianteAPagar;
 * - proveedor y chofer de proveedor → la columna del proveedor si está cargada,
 *   si no la de chofer (aPagarProveedor ?? aPagar, ídem adicional y acompañante);
 * - especial → valor / adicionalKm / adicionalAcompaniante (una sola columna).
 * Las categorías de los vehículos se buscan por NOMBRE (como
 * resolverSeccionCategoria); una tarifa por km tiene categorías libres y no se
 * compara.
 */
export function detalleTarifaFicha(tarifa: Tarifa | TarifaEspecial, ctx: ContextoTarifaFicha): DetalleTarifaFicha {
  const porKm = tarifa.modoTarifacion === 'km';
  const comparaVehiculos = !porKm && ctx.vehiculos.length > 0;
  const dominiosDe = (categoria: string) =>
    comparaVehiculos ? ctx.vehiculos.filter(v => v.categoria === categoria).map(v => v.dominio).sort() : [];
  const renglones: RenglonDetalleTarifa[] = [];
  let acompaniante: number | null;

  const adicional = (a: AdicionalKmValores | undefined) => ({
    primerSector: a?.primerSector ?? null,
    intervalo: a?.sectoresSiguientes ?? null,
  });

  if (tarifa.nivel === 'especial') {
    acompaniante = tarifa.adicionalAcompaniante ?? null;
    for (const s of porOrden(tarifa.secciones)) {
      for (const c of porOrden(s.categorias)) {
        renglones.push({
          seccion: s.nombre, categoria: c.nombre, base: c.valor ?? null,
          ...adicional(c.adicionalKm), dominios: dominiosDe(c.nombre),
        });
      }
    }
  } else {
    const t = tarifa as Tarifa;
    if (ctx.lado === 'cliente') {
      acompaniante = t.acompanianteACobrar ?? null;
    } else if (ctx.lado === 'chofer') {
      acompaniante = t.acompanianteAPagar ?? null;
    } else {
      acompaniante = t.acompanianteAPagarProveedor ?? t.acompanianteAPagar ?? null;
    }
    for (const s of porOrden(t.secciones)) {
      for (const c of porOrden(s.categorias)) {
        let base: number | undefined;
        let km: AdicionalKmValores | undefined;
        if (ctx.lado === 'cliente') {
          base = c.aCobrar; km = c.adicionalKmACobrar;
        } else if (ctx.lado === 'chofer') {
          base = c.aPagar; km = c.adicionalKmAPagar;
        } else {
          base = c.aPagarProveedor ?? c.aPagar; km = c.adicionalKmAPagarProveedor ?? c.adicionalKmAPagar;
        }
        renglones.push({
          seccion: s.nombre, categoria: c.nombre, base: base ?? null,
          ...adicional(km), dominios: dominiosDe(c.nombre),
        });
      }
    }
  }

  const nombresCategorias = new Set(renglones.map(r => r.categoria));
  const categoriasFaltantes = comparaVehiculos
    ? ctx.vehiculos
        .filter(v => !nombresCategorias.has(v.categoria))
        .map(v => `${v.categoria || 'Sin categoría'} (${v.dominio})`)
    : [];

  return {
    columna: tarifa.nivel === 'especial' ? 'Valor' : COLUMNA_LADO[ctx.lado],
    porKm,
    kmDistancia: tarifa.kmDistancia ?? null,
    acompaniante,
    variasSecciones: (tarifa.secciones ?? []).length > 1,
    renglones,
    conVehiculos: renglones.some(r => r.dominios.length > 0),
    categoriasFaltantes,
  };
}

/** Una tarifa (general, personalizada o especial) como renglón de la ficha. */
export function filaTarifaFicha(tarifa: Tarifa | TarifaEspecial, ctx: ContextoTarifaFicha): FilaTarifaFicha {
  let alcance: string | null = null;
  if (tarifa.nivel === 'especial' && tarifa.entidadTipo !== 'cliente') {
    alcance = tarifa.alcance?.tipo === 'entidadCliente'
      ? `Solo con ${ctx.nombreCliente(tarifa.alcance.idCliente) ?? 'un cliente dado de baja'}`
      : 'Con todos los clientes';
  }
  return {
    idTarifa: tarifa.idTarifa,
    nombre: (tarifa.nombre ?? '').trim() || '(sin nombre)',
    modo: tarifa.modoTarifacion === 'km' ? 'Por km' : 'Por categoría',
    vigenteDesde: fechaLegible(tarifa.vigenciaDesde),
    categorias: categoriasDe(tarifa),
    alcance,
    detalle: detalleTarifaFicha(tarifa, ctx),
  };
}

/** Renglones por nombre (las vigentes de una entidad pueden ser varias). */
export function filasTarifasFicha(tarifas: (Tarifa | TarifaEspecial)[], ctx: ContextoTarifaFicha): FilaTarifaFicha[] {
  return tarifas
    .map(t => filaTarifaFicha(t, ctx))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}
