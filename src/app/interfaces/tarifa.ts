export interface AdicionalKmValores {
  primerSector: number;
  sectoresSiguientes: number;
}

export interface KmDistancia {
  primerSector: number;
  sectoresSiguientes: number;
}

export type ModoTarifacion = 'categoria' | 'km';
export type NivelTarifa = 'general' | 'especial' | 'personalizada' | 'eventual';
export type EntidadTipo = 'cliente' | 'chofer' | 'proveedor';

export interface Seccion<TCategoria> {
  orden: number;
  nombre: string | null;   // null = sección única sin nombre (caso general/simple)
  categorias: TCategoria[];
}

// Cómo se generó una versión guardada desde tarifa-aumento/tarifa-especial-aumento
// — ausente si la versión salió de una edición manual (tarifa-form/
// tarifa-especial-form) o es anterior a este campo. 'segmentado' no aplica a
// TarifaEspecial (su categoría tiene un solo valor, no cobrar/pagar separados)
// — tarifa-especial-aumento solo usa 'unico'/'manual' y porcentajeUnico.
export interface MetadataAumento {
  modo: 'unico' | 'segmentado' | 'manual';
  porcentajeUnico?: number;
  porcentajeCobrar?: number;
  porcentajePagar?: number;
  porcentajeProveedor?: number;
  redondeo: 'unidad' | 'decena' | 'centena' | 'miles' | null;
  // true = se aplicó un aumento automático (modo unico/segmentado) y después
  // se pasó a manual para ajustar algún valor puntual (ej. corregir un
  // redondeo) — el resto de los campos que no requerían ajuste quedaron
  // igual que el cálculo automático. En ese caso `modo` conserva el modo
  // automático original (no 'manual'), para no perder esa información.
  ajustadoManualmente?: boolean;
}

export interface TarifaBase {
  idTarifa: string;                // = id del documento Firestore, poblado al leer
  nivel: NivelTarifa;
  idEntidadDueño: string | null;   // null en general; idCliente en personalizada
  nombre: string;                  // obligatorio si la entidad tiene +1 tarifa habilitada
  modoTarifacion: ModoTarifacion;  // por tarifario completo, no por categoría
  kmDistancia: KmDistancia | null; // null cuando modoTarifacion === 'km'
  activo: boolean;
  vigenciaDesde: string;
  // Id de la tarifa que esta versión reemplaza (nuevaVersionTarifa/
  // nuevaVersionTarifaEspecial) — null si es la primera versión de un linaje
  // (creada por crearTarifa/crearTarifaEspecial). Documentos creados ANTES de
  // este campo no lo tienen en Firestore — al leerlos tratar como null (?? null).
  versionAnteriorId: string | null;
  fechaActualizacion?: string;
  actualizadoPor?: string;
  metadataAumento?: MetadataAumento;
}

export interface CategoriaTarifa {
  orden: number;
  nombre: string;
  aCobrar: number;
  aPagar: number;
  aPagarProveedor?: number;               // columna oculta por defecto, habilitable
  adicionalKmACobrar?: AdicionalKmValores;
  adicionalKmAPagar?: AdicionalKmValores;
  adicionalKmAPagarProveedor?: AdicionalKmValores;
}

export interface Tarifa extends TarifaBase {
  nivel: 'general' | 'personalizada';
  secciones: Seccion<CategoriaTarifa>[];
  acompanianteACobrar: number;
  acompanianteAPagar: number;
  acompanianteAPagarProveedor?: number;
  usaValoresProveedor: boolean;
}
