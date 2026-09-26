/** Columna de TablaListadoComponent. */
export interface ColumnaListado<T> {
  /** Identificador de la columna (orden, track). Único dentro de la tabla. */
  key: string;
  label: string;
  /** Valor a mostrar. Para tipo 'moneda' debe ser number (se formatea con
   *  formatearValor '$'). */
  valor: (item: T) => string | number | null | undefined;
  /** Clave de orden. Sin ella, la columna no es ordenable. Si devuelve number
   *  se ordena numéricamente; si no, como texto (localeCompare). */
  orden?: (item: T) => string | number;
  /** 'texto' (default) | 'numero' | 'moneda'. 'numero' y 'moneda' aplican
   *  col-numero (derecha + tabular-nums) y alinean a la derecha por defecto. */
  tipo?: 'texto' | 'numero' | 'moneda';
  /** Alineación de encabezado y celda. Default: 'end' para numero/moneda,
   *  'start' para texto. */
  align?: 'start' | 'center' | 'end';
  /** Clases extra de la celda (estáticas o por fila). */
  clase?: string | ((item: T) => string);
}

/** Acción de fila (botón de texto en la columna "Acciones"). */
export interface AccionListado<T> {
  /** Identidad de negocio: es lo que emite (accion) y lee el caller. */
  id: string;
  label: string;
  /** Clase de botón Bootstrap. Default 'btn-outline-primary'. */
  clase?: string;
  /** 'modulo.accion' (misma sintaxis que *appPermiso). Sin permiso, la acción
   *  no se muestra. Sin este campo, siempre se muestra. */
  permiso?: string;
  visible?: (item: T) => boolean;
  deshabilitada?: (item: T) => boolean;
}

export interface EventoAccionListado<T> {
  id: string;
  item: T;
}

export interface OrdenListado {
  key: string;
  asc: boolean;
}
