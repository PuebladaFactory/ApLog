import { Direccion } from 'src/app/interfaces/chofer';
import { CategoriaDocumentacion, Documentacion, EstadoDocumentacion } from 'src/app/interfaces/legajo';
import { EntidadTipo } from 'src/app/interfaces/tarifa';

/** Entidades que tienen ficha. Mismo universo que EntidadTipo (Tarifas). */
export type TipoFicha = EntidadTipo;

/** CUIT de 11 dígitos → 'XX-XXXXXXXX-X'. Otro largo se muestra tal cual;
 *  vacío o nulo → '—'. */
export function cuitLegible(cuit: number | string | null | undefined): string {
  const digitos = String(cuit ?? '').replace(/\D/g, '');
  if (digitos.length !== 11) return digitos || '—';
  return `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos.slice(10)}`;
}

/** Dirección en una línea: domicilio, localidad, municipio, provincia
 *  (sin vacíos ni repetidos — localidad y municipio suelen coincidir). */
export function direccionLegible(d: Direccion | null | undefined): string {
  if (!d) return '—';
  const partes = [d.domicilio, d.localidad, d.municipio, d.provincia]
    .map(p => (p ?? '').trim())
    .filter(p => p !== '');
  return partes.length ? [...new Set(partes)].join(', ') : '—';
}

/** Estado de un renglón del legajo en la ficha: el de la documentación,
 *  'vacio' (legajo sin documentos) o 'faltante' (categoría activa sin cargar). */
export type EstadoRenglonLegajo = EstadoDocumentacion | 'vacio' | 'faltante';

export const ETIQUETA_ESTADO_LEGAJO: Readonly<Record<EstadoRenglonLegajo, string>> = {
  enFecha: 'En fecha',
  porVencer: 'Por vencer',
  vencido: 'Vencido',
  sinVto: 'Sin vencimiento',
  vacio: 'Sin documentación',
  faltante: 'Falta cargar',
};

/** Clases de badge de Bootstrap por estado. */
export const CLASE_ESTADO_LEGAJO: Readonly<Record<EstadoRenglonLegajo, string>> = {
  enFecha: 'bg-success',
  porVencer: 'bg-warning text-dark',
  vencido: 'bg-danger',
  sinVto: 'bg-info text-dark',
  vacio: 'bg-secondary',
  faltante: 'bg-light text-dark border',
};

export interface RenglonLegajo {
  idCategoria: string;
  titulo: string;
  /** null = categoría activa sin documento cargado. */
  documento: Documentacion | null;
}

/** Renglones de la pestaña Legajo: los documentos cargados (aunque su
 *  categoría ya no esté activa) más las categorías activas sin documento.
 *  Orden: el del catálogo (`orden`); lo que no está en las activas, al final
 *  y por título. */
export function renglonesLegajo(
  documentacion: Documentacion[],
  categoriasActivas: CategoriaDocumentacion[],
): RenglonLegajo[] {
  const orden = new Map(categoriasActivas.map(c => [c.idCategoria, c.orden]));
  const cargados: RenglonLegajo[] = documentacion.map(d => ({
    idCategoria: d.idCategoria,
    titulo: d.titulo,
    documento: d,
  }));
  const faltantes: RenglonLegajo[] = categoriasActivas
    .filter(c => !documentacion.some(d => d.idCategoria === c.idCategoria))
    .map(c => ({ idCategoria: c.idCategoria, titulo: c.nombre, documento: null }));
  const posicion = (r: RenglonLegajo) => orden.get(r.idCategoria) ?? Number.MAX_SAFE_INTEGER;
  return [...cargados, ...faltantes].sort(
    (a, b) => posicion(a) - posicion(b) || a.titulo.localeCompare(b.titulo),
  );
}
