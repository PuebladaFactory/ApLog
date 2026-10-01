/** Documento "tabla con encabezado y pie", NEUTRO respecto de la librería:
 *  lo arma una función de negocio (ej. armarDocumentoLiq) y lo dibujan los
 *  renderers de Excel y PDF, que no saben de qué informe se trata. Los
 *  valores van CRUDOS (number para numero/moneda, 'YYYY-MM-DD' para fecha):
 *  el formato es responsabilidad de cada renderer. */
/** 'porcentaje': valor como fracción (0.253 → 25,3 %). 'decimal': número
 *  con 1 decimal (promedios). */
export type TipoCeldaDoc = 'texto' | 'numero' | 'moneda' | 'fecha' | 'porcentaje' | 'decimal';

/** null = "no aplica" (los renderers dibujan "—"). */
export type ValorCeldaDoc = string | number | null;

export interface ColumnaDoc {
  etiqueta: string;
  tipo: TipoCeldaDoc;
  /** Alineación forzada de los valores; si no se indica, sale del tipo
   *  (montos y números a la derecha, fecha al centro, texto a la izquierda). */
  alineacion?: 'izquierda' | 'centro' | 'derecha';
  /** Ancho aproximado en caracteres (ancho de columna del Excel). El PDF solo
   *  lo usa para elegir vertical/horizontal: el ancho real de cada columna lo
   *  calcula autotable según su contenido. */
  ancho: number;
}

export interface LineaPieDoc {
  concepto: string;
  valor: number;
  tipo: 'subtotal' | 'ajuste' | 'total';
}

export interface DocumentoTabular {
  /** Sin extensión, ya saneado para el sistema de archivos. */
  nombreArchivo: string;
  titulo: string;
  /** Líneas debajo del título. */
  subtitulos: string[];
  /** Línea chica de identificación (ej. "N° LQCL-000123"); null si no hay. */
  identificador: string | null;
  /** Marca visible (ej. PROFORMA, VISTA PREVIA, REVERTIDO); null si no hay. */
  marca: string | null;
  /** Aclaración que acompaña a la marca; null si no hay. */
  leyenda: string | null;
  columnas: ColumnaDoc[];
  /** Mismo orden que `columnas`. */
  filas: ValorCeldaDoc[][];
  /** Índice de la columna cuya suma es el subtotal (fórmulas del Excel);
   *  null si esa columna no está en el documento. */
  columnaTotal: number | null;
  pie: LineaPieDoc[];
  notas: string[];
}

// ── Libro de varias hojas / varias tablas (Reportes) ─────────────────
// Al lado de DocumentoTabular (que sigue siendo el documento de
// liquidación, con pie y fórmulas). Lo dibujan ExcelTabularService.
// generarLibro y PdfTabularService.generarLibro.

/** Fila de encabezado agrupador sobre las columnas (ej. "Cliente" sobre 4
 *  columnas). La suma de `span` debe igualar la cantidad de columnas. */
export interface GrupoColumnasDoc {
  etiqueta: string;
  span: number;
}

export interface TablaDoc {
  /** Título encima de la tabla; null si no lleva. */
  titulo: string | null;
  grupos: GrupoColumnasDoc[];
  columnas: ColumnaDoc[];
  /** Mismo orden que `columnas`. */
  filas: ValorCeldaDoc[][];
  /** Fila de totales ya calculada (negrita); null si no lleva. */
  filaTotal: ValorCeldaDoc[] | null;
}

export interface HojaDoc {
  /** Nombre de la hoja de Excel (máx. 31, sin caracteres inválidos). */
  nombre: string;
  titulo: string;
  subtitulos: string[];
  tablas: TablaDoc[];
  notas: string[];
}

export interface LibroTabular {
  /** Sin extensión, ya saneado para el sistema de archivos. */
  nombreArchivo: string;
  hojas: HojaDoc[];
}
