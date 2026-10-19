Si no ves la línea FIN DE LA INSTRUCCIÓN IE2 al final, el texto llegó cortado: leé el archivo completo.

# IE2 — Tabla de Excel en el renderer (campo opcional) + `sanearNombreArchivo` único

## Contexto y razonamiento

Dos cosas independientes, las dos en la capa genérica de exportación. Ninguna cambia nada
visible todavía: este bloque es la infraestructura que usa IE2b.

**1. `TablaDoc.excel?` — Tabla de Excel real, opcional.**

Probando IE1b apareció el pedido: que el informe de operaciones sea una TABLA de Excel de
verdad (filtro por columna, ordenamiento, ocultar filas y columnas, y el total como fórmula
en vez de un valor fijo). Eso no se arregla en el informe: hay que enseñárselo al renderer
genérico, que hoy dibuja celda por celda.

El campo es OPCIONAL y ahí está la clave del bloque: `TablaDoc.excel?: TablaExcelDoc`. Sin
el campo, la tabla se dibuja exactamente como hasta ahora, y los cuatro consumidores
actuales de `generar`/`generarLibro` (liquidación, resumen de operaciones, tablero de
comisiones y los libros de Finanzas) no cambian ni un byte. Con el campo, el documento se
comporta como un informe de TRABAJO en vez de un COMPROBANTE.

- Un **ListObject** (la "Tabla" de Excel) y no un simple autofiltro, porque es lo que trae
  las cuatro cosas juntas: botón de filtro por columna, bandas del tema, ordenamiento, y
  una fila de totales con `SUBTOTAL(109, Tabla[Columna])` — que **recalcula al filtrar o al
  ocultar filas**, a diferencia de una suma fija. Eso era justamente el pedido.
- **Los totales los sigue calculando la función pura**, no el renderer (QUÉ ≠ CÓMO):
  `dibujarTablaExcel` lee `tabla.filaTotal`, manda la etiqueta de texto como
  `totalsRowLabel` y `totalsRowFunction: 'sum'` en las columnas numéricas, y después
  **reescribe cada celda numérica del total como `{ formula, result }`** con el valor ya
  calculado adentro. Así Excel ajusta el total al filtrar, y cualquier visor que no
  recalcule fórmulas (vista previa del navegador, Google Sheets al importar, un lector
  liviano) igual muestra el número. Verificado en el XML: queda
  `<f>SUBTOTAL(109,…)</f><v>540</v>`, y la tabla no se rompe.
- **`valorParaTabla` en vez de reusar `escribirCelda`:** dentro de una tabla, un valor nulo
  tiene que dejar la celda VACÍA, no poner `—`. Un solo `—` en una columna de monto la
  vuelve columna de texto: se arruina el filtro numérico y el SUBTOTAL deja de sumar. Fuera
  de una tabla el `—` está bien y se mantiene, por eso son dos funciones y no una.
- **`dibujarGrupos` extraído tal cual:** el bloque de encabezados agrupadores estaba inline
  dentro del loop de `generarLibro`. La rama nueva también lo necesita (una Tabla de Excel
  no admite una fila de grupos DENTRO de su encabezado: va arriba, como fila combinada), así
  que se extrajo a un método privado, verbatim, con dos llamadores. Mismo código, cero
  cambio de comportamiento para el camino viejo.
- **`FORMATO_POR_TIPO` repite los formatos de `escribirCelda` a propósito:** no quise tocar
  el camino celda-por-celda, que sirve a los comprobantes que ya están en producción. Es
  duplicación consciente de cinco strings, con el comentario que lo dice.
- **Dos requisitos para quien arma el documento** (los cumple IE2b): `excel.nombre` único en
  el LIBRO y sin espacios, y etiquetas de columna sin `[`, `]`, `#` ni `'` — son
  referencias estructuradas y la fórmula del total se rompe.
- **El PDF ignora el campo** (no tiene equivalente): `PdfTabularService` no se toca.

Verificación de no-regresión que ya hice (detalle en el reporte, abajo no hace falta
repetirla): generé un `DocumentoTabular` de liquidación y un `LibroTabular` de resumen (con
grupos y fila de totales) con el servicio de HEAD y con el nuevo, descomprimí los dos .xlsx
y comparé `sheet1.xml`, `sheet2.xml`, `styles.xml`, `sharedStrings.xml`, `workbook.xml` y
`xl/tables/*` → **idénticos byte a byte**. Y el camino nuevo pasó 10 chequeos estructurales
sobre el XML de la tabla generada.

**2. `sanearNombreArchivo`, una sola definición.**

IE1 creó `shared/utils/nombre-archivo.util.ts` con el mismo cuerpo que la copia privada de
`documento-liq.util.ts`, para que el informe de operaciones no fuera una tercera copia. Esto
cierra el círculo: `documento-liq` importa el util y borra su copia.

Va como **REEMPLAZO COMPLETO** y no como BUSCAR/REEMPLAZAR por un motivo concreto: la copia
privada tiene, dentro de su expresión regular, los caracteres de marcas diacríticas
U+0300–U+036F escritos LITERALES (invisibles en cualquier editor). Un BUSCAR que los
contenga no es confiable: no se puede verificar a ojo ni sobrevive con garantía a un
copiar/pegar. El archivo entero, en cambio, queda igual al de referencia, y el hash lo
confirma.

Nota al margen, no se toca en este bloque: `exportacion-finanzas.util.ts` exporta su propia
`sanearNombreArchivo` con reglas DISTINTAS (conserva espacios como `_` sin colapsarlos,
recorta a 120 caracteres, cae en `'finanzas'` si queda vacía) y `recibo-movimiento.util.ts`
tiene una `sanear` parecida. Unificarlas cambiaría nombres de archivo de Finanzas, así que
quedan como están; el JSDoc del util nuevo ya lo dice.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Validá TODOS los BUSCAR antes de escribir el primero. Si uno no está o está repetido,
  detenete y avisá.
- Aplicá los pasos EN ORDEN. Editá en el lugar (leé el archivo antes de escribir). LF.
- El PASO 8 es un REEMPLAZO COMPLETO: el archivo queda con EXACTAMENTE el contenido del
  bloque, nada más. Terminá con la línea `}` y UNA línea vacía al final (el archivo tiene
  206 líneas).
- No toques CLAUDE.md ni CHANGELOG.md: van en el bloque DOC de cierre del frente.
- No toques `ExcelService`, `PdfService` ni `PdfTabularService`.
- No toques `documento-operaciones.util.ts` ni `operaciones-export.service.ts`: el informe
  de operaciones pasa a Tabla en IE2b, no acá.
- NO corras `npm run build`, `deploy:*` ni `node set-version.js`. Para compilar:
  `npm run build:demo` (línea base: 9 advertencias, inicial 1,53 MB).
- npm con `--legacy-peer-deps` (en este bloque no hace falta instalar nada).

## PASO 0 — verificación, sin modificar nada

Corré esto y mostrame la salida. Si algo no coincide, detenete y avisá:

1. `git rev-parse --abbrev-ref HEAD` → `refactor`.
2. Los tres archivos a tocar, como los dejó IE1b (sin cambios desde entonces):
   - `git hash-object src/app/interfaces/documento-tabular.ts` → `8e4ac83821624067d2b6b36da8ef26e4eb658ba5`
   - `git hash-object src/app/servicios/exportacion/excel-tabular.service.ts` → `c9dbbc7de7d25b9044ba855d0930e7de465caf21`
   - `git hash-object src/app/shared/utils/documento-liq.util.ts` → `73ffc6540e6a44d654d094194e772624724735e3`
3. El util de IE1 está y no se toca:
   `git hash-object src/app/shared/utils/nombre-archivo.util.ts` → `eb8c9ff4653073eeea173ae5aa67475b15e1df69`
4. `grep -c "TablaExcelDoc" src/app/interfaces/documento-tabular.ts` → `0`.
5. `grep -c "addTable" src/app/servicios/exportacion/excel-tabular.service.ts` → `0`.
6. `grep -c "function sanearNombreArchivo" src/app/shared/utils/documento-liq.util.ts`
   → `1` (la copia privada, todavía ahí).
7. `wc -l < src/app/shared/utils/documento-liq.util.ts` → `213`.

## PASO 1 — src/app/interfaces/documento-tabular.ts

BUSCAR (6 líneas):

```
  span: number;
}

export interface TablaDoc {
  /** Título encima de la tabla; null si no lleva. */
  titulo: string | null;
```

REEMPLAZAR por (26 líneas):

```
  span: number;
}

/** Tabla de Excel REAL (ListObject) para una TablaDoc: autofiltro por columna,
 *  bandas del tema y fila de totales con SUBTOTAL — que recalcula al filtrar o
 *  al ocultar filas, a diferencia de una suma fija.
 *
 *  Es OPCIONAL: sin este campo la tabla se dibuja como hasta ahora (celda por
 *  celda, sin filtros ni bandas de tema), que es lo que corresponde a un
 *  COMPROBANTE (liquidación, comisiones, recibos). Con el campo, el documento se
 *  comporta como un informe de TRABAJO (el tablero de operaciones, los listados
 *  de entidades): se filtra, se ordena y los totales siguen al filtro.
 *
 *  Solo lo usa el Excel; el PDF lo ignora (no tiene equivalente). */
export interface TablaExcelDoc {
  /** Nombre del ListObject. Tiene que ser único en el LIBRO y sin espacios. */
  nombre: string;
  /** Estilo de tabla de Excel; por defecto 'TableStyleMedium9'. */
  estilo?: string;
  /** Inmoviliza la fila de encabezado de la tabla; por defecto true. */
  congelarEncabezado?: boolean;
}

export interface TablaDoc {
  /** Título encima de la tabla; null si no lleva. */
  titulo: string | null;
```

## PASO 2 — src/app/interfaces/documento-tabular.ts

BUSCAR (6 líneas):

```
  filas: ValorCeldaDoc[][];
  /** Fila de totales ya calculada (negrita); null si no lleva. */
  filaTotal: ValorCeldaDoc[] | null;
}

export interface HojaDoc {
```

REEMPLAZAR por (8 líneas):

```
  filas: ValorCeldaDoc[][];
  /** Fila de totales ya calculada (negrita); null si no lleva. */
  filaTotal: ValorCeldaDoc[] | null;
  /** Si está, el Excel la dibuja como Tabla de Excel (ver TablaExcelDoc). */
  excel?: TablaExcelDoc;
}

export interface HojaDoc {
```

## PASO 3 — src/app/servicios/exportacion/excel-tabular.service.ts

BUSCAR (4 líneas):

```
import { Injectable } from '@angular/core';
import { DocumentoTabular, LibroTabular, TipoCeldaDoc, ValorCeldaDoc } from 'src/app/interfaces/documento-tabular';
import { LOGO_EMPRESA_BASE64, LOGO_EMPRESA_PX } from './logo-empresa';
import { ANCHO_HOJA_HORIZONTAL, fechaHoraActual, fechaIsoAUtc } from './formato-exportacion';
```

REEMPLAZAR por (4 líneas):

```
import { Injectable } from '@angular/core';
import { DocumentoTabular, LibroTabular, TablaDoc, TablaExcelDoc, TipoCeldaDoc, ValorCeldaDoc } from 'src/app/interfaces/documento-tabular';
import { LOGO_EMPRESA_BASE64, LOGO_EMPRESA_PX } from './logo-empresa';
import { ANCHO_HOJA_HORIZONTAL, fechaHoraActual, fechaIsoAUtc } from './formato-exportacion';
```

## PASO 4 — src/app/servicios/exportacion/excel-tabular.service.ts

BUSCAR (6 líneas):

```
const ARGB_ZEBRA = 'FFECF2FB';
const ARGB_MARCA = 'FFC81E1E';
const HORIZONTAL_EXCEL = { izquierda: 'left', centro: 'center', derecha: 'right' } as const;
const BORDE = {
  top: { style: 'thin', color: { argb: 'FFB4B4B4' } },
  bottom: { style: 'thin', color: { argb: 'FFB4B4B4' } },
```

REEMPLAZAR por (17 líneas):

```
const ARGB_ZEBRA = 'FFECF2FB';
const ARGB_MARCA = 'FFC81E1E';
const HORIZONTAL_EXCEL = { izquierda: 'left', centro: 'center', derecha: 'right' } as const;
/** numFmt por tipo de celda, para la rama de Tabla de Excel (ver
 *  dibujarTablaExcel). Son los mismos formatos que aplica escribirCelda celda
 *  por celda; se repiten acá a propósito para no tocar ese camino, que sirve a
 *  los documentos de presentación ya en producción. */
const FORMATO_POR_TIPO: Partial<Record<TipoCeldaDoc, string>> = {
  moneda: FORMATO_MONEDA,
  numero: '#,##0',
  decimal: '#,##0.0',
  porcentaje: '0.0%',
  fecha: 'dd/mm/yyyy',
};
const BORDE = {
  top: { style: 'thin', color: { argb: 'FFB4B4B4' } },
  bottom: { style: 'thin', color: { argb: 'FFB4B4B4' } },
```

## PASO 5 — src/app/servicios/exportacion/excel-tabular.service.ts

BUSCAR (19 líneas):

```
          fila = this.lineaCombinada(ws, fila, n, tabla.titulo, { size: 12, bold: true });
        }

        if (tabla.grupos.length > 0) {
          let col = 1;
          for (const g of tabla.grupos) {
            if (g.span > 1) ws.mergeCells(fila, col, fila, col + g.span - 1);
            const celda = ws.getCell(fila, col);
            celda.value = g.etiqueta;
            celda.font = { bold: true };
            celda.alignment = { horizontal: 'center', vertical: 'middle' };
            if (g.etiqueta) celda.fill = relleno(ARGB_ENCABEZADO);
            celda.border = BORDE;
            col += g.span;
          }
          fila++;
        }

        const encabezado = ws.getRow(fila);
```

REEMPLAZAR por (20 líneas):

```
          fila = this.lineaCombinada(ws, fila, n, tabla.titulo, { size: 12, bold: true });
        }

        // Tabla de Excel real (opcional, informes de trabajo): autofiltro,
        // bandas del tema y totales por SUBTOTAL. Los grupos, si hay, se
        // dibujan arriba como fila combinada (una Tabla de Excel no admite
        // una fila de grupos dentro de su encabezado).
        if (tabla.excel) {
          if (tabla.grupos.length > 0) {
            fila = this.dibujarGrupos(ws, tabla, fila);
          }
          fila = this.dibujarTablaExcel(ws, tabla, tabla.excel, fila) + 1;
          continue;
        }

        if (tabla.grupos.length > 0) {
          fila = this.dibujarGrupos(ws, tabla, fila);
        }

        const encabezado = ws.getRow(fila);
```

## PASO 6 — src/app/servicios/exportacion/excel-tabular.service.ts

BUSCAR (5 líneas):

```
    const buffer = await wb.xlsx.writeBuffer();
    return new Blob([buffer], { type: TIPO_XLSX });
  }

  /** Texto alineado a la derecha en una fila, combinado de la columna `desde`
```

REEMPLAZAR por (88 líneas):

```
    const buffer = await wb.xlsx.writeBuffer();
    return new Blob([buffer], { type: TIPO_XLSX });
  }

  /** Fila de encabezados agrupadores (colSpan) arriba del encabezado de
   *  columnas. Devuelve la fila siguiente. */
  private dibujarGrupos(ws: any, tabla: TablaDoc, fila: number): number {
    let col = 1;
    for (const g of tabla.grupos) {
      if (g.span > 1) ws.mergeCells(fila, col, fila, col + g.span - 1);
      const celda = ws.getCell(fila, col);
      celda.value = g.etiqueta;
      celda.font = { bold: true };
      celda.alignment = { horizontal: 'center', vertical: 'middle' };
      if (g.etiqueta) celda.fill = relleno(ARGB_ENCABEZADO);
      celda.border = BORDE;
      col += g.span;
    }
    return fila + 1;
  }

  /** Dibuja una TablaDoc como Tabla de Excel real (ListObject), con el
   *  encabezado en `fila`. Devuelve la ÚLTIMA fila ocupada.
   *
   *  La fila de totales sale de `tabla.filaTotal` (la calcula la función pura,
   *  no el renderer): la primera celda de texto va como `totalsRowLabel` y cada
   *  celda numérica se reescribe como `SUBTOTAL(109, Tabla[Columna])` CON el
   *  resultado ya calculado adentro. Así Excel ajusta el total al filtrar u
   *  ocultar filas, y cualquier visor que no recalcule igual muestra el número.
   *
   *  Dos requisitos que cumple quien arma el documento: `excel.nombre` único en
   *  el libro y sin espacios, y etiquetas de columna sin `[`, `]`, `#` ni `'`
   *  (son referencias estructuradas). */
  private dibujarTablaExcel(ws: any, tabla: TablaDoc, excel: TablaExcelDoc, fila: number): number {
    const total = tabla.filaTotal;
    const columnas = tabla.columnas.map((c, i) => {
      const col: any = { name: c.etiqueta, filterButton: true };
      if (total) {
        const valor = total[i];
        if (typeof valor === 'number') col.totalsRowFunction = 'sum';
        else if (typeof valor === 'string' && valor !== '') col.totalsRowLabel = valor;
        else col.totalsRowFunction = 'none';
      }
      return col;
    });

    ws.addTable({
      name: excel.nombre,
      ref: `A${fila}`,
      headerRow: true,
      totalsRow: !!total,
      style: { theme: excel.estilo ?? 'TableStyleMedium9', showRowStripes: true },
      columns: columnas,
      rows: tabla.filas.map(f => f.map((v, i) => valorParaTabla(v, tabla.columnas[i].tipo))),
    });

    // Formato y alineación, solo dentro del rango de la tabla (el encabezado de
    // la hoja está arriba y no se toca). El relleno y los bordes los pone el
    // tema de la tabla.
    const ultima = fila + tabla.filas.length + (total ? 1 : 0);
    tabla.columnas.forEach((c, i) => {
      const formato = FORMATO_POR_TIPO[c.tipo];
      const horizontal = HORIZONTAL_EXCEL[c.alineacion ?? alineacionPorTipo(c.tipo)];
      for (let f = fila + 1; f <= ultima; f++) {
        const celda = ws.getCell(f, i + 1);
        if (formato) celda.numFmt = formato;
        celda.alignment = { horizontal, vertical: 'middle', wrapText: c.tipo === 'texto' };
      }
    });

    if (total) {
      tabla.columnas.forEach((c, i) => {
        if (typeof total[i] !== 'number') return;
        const celda = ws.getCell(ultima, i + 1);
        celda.value = { formula: `SUBTOTAL(109,${excel.nombre}[${c.etiqueta}])`, result: total[i] };
        const formato = FORMATO_POR_TIPO[c.tipo];
        if (formato) celda.numFmt = formato;
        celda.font = { bold: true };
      });
    }

    if (excel.congelarEncabezado !== false) {
      ws.views = [{ state: 'frozen', ySplit: fila }];
    }
    return ultima;
  }

  /** Texto alineado a la derecha en una fila, combinado de la columna `desde`
```

## PASO 7 — src/app/servicios/exportacion/excel-tabular.service.ts

BUSCAR (6 líneas):

```
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

/** Nombre de hoja de un LibroTabular: sin caracteres inválidos, máx. 31. */
function nombreHojaLibro(nombre: string): string {
  return (nombre || 'Hoja').replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 31);
```

REEMPLAZAR por (34 líneas):

```
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

/** Alineación por defecto de un tipo de celda (la misma que aplica
 *  escribirCelda): montos y números a la derecha, fecha al centro, texto a la
 *  izquierda. */
function alineacionPorTipo(tipo: TipoCeldaDoc): 'izquierda' | 'centro' | 'derecha' {
  if (tipo === 'texto') return 'izquierda';
  if (tipo === 'fecha') return 'centro';
  return 'derecha';
}

/** Valor crudo para una celda de Tabla de Excel. A diferencia de escribirCelda,
 *  un valor nulo deja la celda VACÍA en vez de poner "—": dentro de una tabla,
 *  un "—" en una columna de monto la vuelve de texto y arruina el filtro y el
 *  SUBTOTAL. */
function valorParaTabla(valor: ValorCeldaDoc, tipo: TipoCeldaDoc): string | number | Date | null {
  if (valor === null) return null;
  switch (tipo) {
    case 'moneda':
    case 'numero':
    case 'decimal':
    case 'porcentaje':
      return Number(valor) || 0;
    case 'fecha':
      return fechaIsoAUtc(String(valor ?? '')) ?? String(valor ?? '');
    default:
      return String(valor ?? '');
  }
}

/** Nombre de hoja de un LibroTabular: sin caracteres inválidos, máx. 31. */
function nombreHojaLibro(nombre: string): string {
  return (nombre || 'Hoja').replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 31);
```

## PASO 8 — src/app/shared/utils/documento-liq.util.ts (REEMPLAZO COMPLETO)

El archivo cambia poco (una línea de import arriba, la función privada borrada abajo), pero
va completo porque la función que se borra tiene caracteres invisibles en su regex. Dejá el
archivo con EXACTAMENTE estas 206 líneas:

```
import { InformeLiqNuevo, PeriodoLiq } from 'src/app/interfaces/informe-liq-nuevo';
import { InformeOpNuevo } from 'src/app/interfaces/informe-op-nuevo';
import { ColumnaDoc, DocumentoTabular, LineaPieDoc } from 'src/app/interfaces/documento-tabular';
import { etiquetaColumna, tipoColumna, valorCrudoColumna } from './columnas-liquidacion.util';
import { nombreEntidadRef } from './entidad-informe.util';
import { descripcionTipoComprobante, fechaComprobanteLegible, numeroComprobante } from './factura-electronica.util';
import { ETIQUETA_CONCEPTO_COMPENSACION, compensacionesDe, netoDe } from './compensacion.util';
import { instanteLegible } from './fecha.util';
import { sanearNombreArchivo } from './nombre-archivo.util';

/** Cómo se presenta un InformeLiqNuevo en Excel/PDF. Se deriva del estado,
 *  salvo la vista previa, que se indica explícitamente. */
export type VarianteDocumentoLiq = 'vistaPrevia' | 'proforma' | 'emitido' | 'revertido' | 'anulado';

export interface OpcionesDocumentoLiq {
  /** true: informe armado en memoria, todavía no guardado (vista previa de
   *  LiquidacionNueva). La vista previa del Detalle NO lo usa: ahí el
   *  documento es la proforma o el emitido. */
  vistaPrevia?: boolean;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MARCA: Readonly<Record<VarianteDocumentoLiq, string | null>> = {
  vistaPrevia: 'VISTA PREVIA',
  proforma: 'PROFORMA',
  emitido: null,
  revertido: 'REVERTIDO',
  anulado: 'ANULADO',
};

/** Ancho aproximado por columna (caracteres). Las que no figuran: 18. */
const ANCHO_COLUMNA: Readonly<Record<string, number>> = {
  'Fecha': 11,
  'Quincena': 9,
  'Chofer': 24,
  'Cliente': 26,
  'Patente': 10,
  'Concepto': 16,
  'Observaciones': 28,
  'Hoja de Ruta': 14,
  'Km': 7,
  'Jornada': 14,
  'Ad Km': 13,
  'Ad Acomp': 13,
  'Extra': 13,
  'A Cobrar': 15,
};

const LEYENDA_PRELIMINAR = 'Documento preliminar — sujeto a revisión.';

/** Columnas de texto cuyo valor va centrado (valores cortos de ancho fijo). */
const COLUMNAS_CENTRADAS = ['Quincena'];

/** QUÉ dice el documento de un InformeLiqNuevo (Excel y PDF lo dibujan igual).
 *  Pura: no lee Firestore ni cachés, todo sale de los snapshots.
 *  - `informesOp`: los que componen el informe (vivos, o los del snapshot si
 *    está revertido). Se ordenan por fecha y chofer.
 *  - `liq.valores` tiene que estar al día (en memoria: el caller recalcula
 *    con InformeLiqFactoryService antes de llamar).
 *  Encabezado y pie = los del camino viejo (decisión E4). */
export function armarDocumentoLiq(
  liq: InformeLiqNuevo,
  informesOp: InformeOpNuevo[],
  opciones: OpcionesDocumentoLiq = {},
): DocumentoTabular {
  const variante = varianteDocumentoLiq(liq, opciones);
  const nombre = nombreEntidadRef(liq.entidad);

  const columnas: ColumnaDoc[] = liq.columnas.map(c => ({
    etiqueta: etiquetaColumna(c, liq.tipo),
    tipo: tipoColumna(c),
    alineacion: COLUMNAS_CENTRADAS.includes(c) ? ('centro' as const) : undefined,
    ancho: ANCHO_COLUMNA[c] ?? 18,
  }));
  const filas = ordenarInformes(informesOp).map(inf => liq.columnas.map(c => valorCrudoColumna(inf, c)));
  const indiceTotal = liq.columnas.indexOf('A Cobrar');

  return {
    nombreArchivo: nombreArchivo(liq, variante, nombre),
    titulo: variante === 'proforma' ? `Proforma ${nombre}` : `Liquidación de Servicios ${nombre}`,
    subtitulos: subtitulos(liq),
    identificador: variante !== 'vistaPrevia' && variante !== 'proforma' && liq.numeroInterno
      ? `N° ${liq.numeroInterno}`
      : null,
    marca: MARCA[variante],
    leyenda: leyenda(liq, variante),
    columnas,
    filas,
    columnaTotal: indiceTotal >= 0 ? indiceTotal : null,
    pie: pie(liq),
    notas: liq.observaciones?.trim() ? [`Observaciones: ${liq.observaciones.trim()}`] : [],
  };
}

/** Variante de presentación. 'emitido' cubre también 'facturado'. La usa la
 *  fachada para decidir el log (REIMPRIMIR solo con número, E5). */
export function varianteDocumentoLiq(
  liq: InformeLiqNuevo,
  opciones: OpcionesDocumentoLiq = {},
): VarianteDocumentoLiq {
  if (opciones.vistaPrevia) return 'vistaPrevia';
  switch (liq.estado) {
    case 'borrador': return 'proforma';
    case 'revertido': return 'revertido';
    case 'anulado': return 'anulado';
    default: return 'emitido';
  }
}

function subtitulos(liq: InformeLiqNuevo): string[] {
  const lineas = [
    `Año: ${liq.periodo.anio}  Mes: ${MESES[liq.periodo.mes - 1] ?? liq.periodo.mes}  Período liquidado: ${textoTramo(liq.periodo)}`,
  ];
  // E6: comprobante vinculado (a prueba; si no cierra, se quita esta línea).
  if (liq.estado === 'facturado' && liq.factura) {
    const f = liq.factura;
    lineas.push(
      `Factura: ${descripcionTipoComprobante(f.tipoComprobante)} N° ${numeroComprobante(f)} del ${fechaComprobanteLegible(f.fecha)}`,
    );
  }
  return lineas;
}

function leyenda(liq: InformeLiqNuevo, variante: VarianteDocumentoLiq): string | null {
  switch (variante) {
    case 'vistaPrevia':
    case 'proforma':
      return LEYENDA_PRELIMINAR;
    case 'revertido':
      return liq.reversion
        ? `Revertido el ${instanteLegible(liq.reversion.fecha, false)}. Motivo: ${liq.reversion.motivo}`
        : null;
    case 'anulado':
      return liq.anulacion
        ? `Anulado el ${instanteLegible(liq.anulacion.fecha, false)}. Motivo: ${liq.anulacion.motivo}`
        : null;
    default:
      return null;
  }
}

/** Mismo pie que el camino viejo: Subtotal y ajustes solo si hay ajustes;
 *  siempre Total. Sale de liq.valores (no se recalcula acá).
 *  Frente Finanzas (FC2): si hay compensaciones, después del Total va una
 *  línea por cada una (negativa) y el Neto a pagar / a cobrar (netoDe). */
function pie(liq: InformeLiqNuevo): LineaPieDoc[] {
  const v = liq.valores;
  const lineas: LineaPieDoc[] = [];
  if (liq.descuentos.length > 0) {
    const subtotal = v.totalTarifaBase + v.totalAcompaniante + v.totalKmMonto + v.totalAdExtra;
    lineas.push({ concepto: 'Subtotal', valor: subtotal, tipo: 'subtotal' });
    for (const d of liq.descuentos) {
      lineas.push({ concepto: d.concepto, valor: d.valor, tipo: 'ajuste' });
    }
  }
  lineas.push({ concepto: 'Total', valor: v.total, tipo: 'total' });

  const compensaciones = compensacionesDe(liq);
  if (compensaciones.length > 0) {
    for (const c of compensaciones) {
      lineas.push({
        concepto: `${ETIQUETA_CONCEPTO_COMPENSACION[c.concepto] ?? 'Compensación'} ${c.numero} del ${fechaComprobanteLegible(c.fecha)}`,
        valor: -c.importe,
        tipo: 'compensacion',
      });
    }
    lineas.push({
      concepto: liq.tipo === 'cliente' ? 'Neto a cobrar' : 'Neto a pagar',
      valor: netoDe(v),
      tipo: 'neto',
    });
  }
  return lineas;
}

function ordenarInformes(informesOp: InformeOpNuevo[]): InformeOpNuevo[] {
  const chofer = (i: InformeOpNuevo) => `${i.datosOperacion.chofer.apellido} ${i.datosOperacion.chofer.nombre}`;
  return [...informesOp].sort((a, b) =>
    a.fecha.localeCompare(b.fecha) || chofer(a).localeCompare(chofer(b), 'es'));
}

function textoTramo(periodo: PeriodoLiq): string {
  return periodo.tramo === 'mes' ? 'Mes completo'
    : periodo.tramo === '1q' ? '1° quincena' : '2° quincena';
}

/** Ej.: Liquidacion_LQCL-000123_Transportes_SA_2026-08-1q,
 *  Proforma_Transportes_SA_2026-08, VistaPrevia_…, …_REVERTIDO. */
function nombreArchivo(liq: InformeLiqNuevo, variante: VarianteDocumentoLiq, nombre: string): string {
  const p = liq.periodo;
  const periodo = `${p.anio}-${String(p.mes).padStart(2, '0')}${p.tramo === 'mes' ? '' : `-${p.tramo}`}`;
  let base: string;
  switch (variante) {
    case 'vistaPrevia': base = `VistaPrevia_${nombre}_${periodo}`; break;
    case 'proforma': base = `Proforma_${nombre}_${periodo}`; break;
    default: base = `Liquidacion_${liq.numeroInterno ?? 'sin-numero'}_${nombre}_${periodo}`;
  }
  if (variante === 'revertido') base += '_REVERTIDO';
  if (variante === 'anulado') base += '_ANULADO';
  return sanearNombreArchivo(base);
}
```

(después de `}` va una línea vacía y termina el archivo)

## Verificación

1. Hashes resultantes:
   - `git hash-object src/app/interfaces/documento-tabular.ts` → `cb0b09c241da569d3aaa07b65c9e41f0e2b1f71c`
   - `git hash-object src/app/servicios/exportacion/excel-tabular.service.ts` → `f7004fda6376dd3442c3a640616024e22560fefa`
   - `git hash-object src/app/shared/utils/documento-liq.util.ts` → `2be61b32453393a0c05a96dc88b0ed4b89cbdced`
2. `git diff --numstat` → exactamente estas tres líneas (en cualquier orden):
   ```
   22	0	src/app/interfaces/documento-tabular.ts
   136	13	src/app/servicios/exportacion/excel-tabular.service.ts
   1	8	src/app/shared/utils/documento-liq.util.ts
   ```
3. La interfaz nueva, una sola vez cada cosa:
   - `grep -c "^export interface TablaExcelDoc {" src/app/interfaces/documento-tabular.ts` → `1`
   - `grep -c "  excel?: TablaExcelDoc;" src/app/interfaces/documento-tabular.ts` → `1`
4. El renderer:
   - `grep -c "private dibujarTablaExcel" src/app/servicios/exportacion/excel-tabular.service.ts` → `1`
   - `grep -c "private dibujarGrupos" src/app/servicios/exportacion/excel-tabular.service.ts` → `1`
   - `grep -c "this\.dibujarGrupos(" src/app/servicios/exportacion/excel-tabular.service.ts` → `2`
     (los dos llamadores: la rama de tabla y la de siempre)
   - `grep -c "ws\.addTable(" src/app/servicios/exportacion/excel-tabular.service.ts` → `1`
   - `grep -c "if (g.span > 1) ws.mergeCells" src/app/servicios/exportacion/excel-tabular.service.ts`
     → `1` (una sola: el bloque inline que estaba en `generarLibro` quedó MOVIDO, no
     duplicado; si da `2`, se copió en vez de moverse)
5. Una sola definición de `sanearNombreArchivo` en el camino nuevo:
   - `grep -c "function sanearNombreArchivo" src/app/shared/utils/documento-liq.util.ts` → `0`
   - `grep -c "from './nombre-archivo.util'" src/app/shared/utils/documento-liq.util.ts` → `1`
   - `grep -rln "function sanearNombreArchivo" src/` → solo DOS archivos:
     `nombre-archivo.util.ts` y `exportacion-finanzas.util.ts` (esa última es la de Finanzas,
     con otras reglas, y no se toca en este frente)
6. `npx tsc -p tsconfig.app.json --noEmit` → sin errores.
7. `npx tsc -p tsconfig.app.json --noEmit --noUnusedLocals` → solo el error preexistente de
   `appVersion` en `app.component.ts`.
8. `npm run build:demo` → OK, 9 advertencias, inicial 1,53 MB (este bloque no mueve el
   bundle: no hay import nuevo de librerías).

## Pruebas manuales en demo (las hago yo)

Este bloque **no cambia nada visible**: la rama nueva todavía no tiene ningún consumidor
(nadie pasa `excel` en su `TablaDoc`). Lo que hay que probar es justamente eso, que NADA
cambió. Con rol dev o admin:

1. **Liquidación** (Liquidación → Borradores o Facturación → Emitidos, acciones Excel y
   PDF): el Excel sale igual que antes — mismas columnas, montos como número, Subtotal y
   Total como fórmula, encabezado inmovilizado, sin botones de filtro. El PDF, igual.
2. **Resumen de operaciones** (Reportes → Resumen general, Excel): tres hojas (Totales,
   Promedios, Porcentajes), encabezado agrupado Cliente/Chofer sobre las columnas, fila
   Total en negrita, tabla de niveles abajo. Y el PDF.
3. **Tablero de comisiones** (Vendedores → Tablero, Excel): hojas Resumen y Detalle.
4. **Finanzas** (Cuentas, Antigüedad, Movimientos y la cuenta de una entidad, Excel): los
   cuatro libros iguales que antes, con sus totales al pie.
5. **Informe de operaciones** (Operaciones → Descargar Op): igual que lo que quedó en IE1b
   (todavía sin filtros de Excel ni columnas de tarifa; eso es IE2b).

## Mensaje de commit

```
IE2 (informes): el renderer de Excel puede dibujar una Tabla real (campo opcional)

- documento-tabular: TablaExcelDoc nueva y TablaDoc.excel? opcional. Sin el
  campo, la tabla se dibuja como hasta ahora: los 4 consumidores actuales
  (liquidacion, resumen de operaciones, comisiones y Finanzas) no cambian.
- ExcelTabularService.dibujarTablaExcel: ListObject con boton de filtro por
  columna, bandas del tema y fila de totales por SUBTOTAL(109, Tabla[Columna]),
  que recalcula al filtrar u ocultar filas. Los totales los sigue calculando la
  funcion pura (filaTotal): la etiqueta va como totalsRowLabel y cada celda
  numerica se reescribe como {formula, result}, con el valor ya calculado, para
  los visores que no recalculan.
- valorParaTabla: dentro de una tabla, un valor nulo deja la celda VACIA en vez
  de poner "—" (un "—" en una columna de monto la vuelve de texto y arruina el
  filtro y el SUBTOTAL). Fuera de la tabla, escribirCelda sigue igual.
- El bloque de encabezados agrupadores de generarLibro se extrajo tal cual a
  dibujarGrupos (dos llamadores): una Tabla de Excel no admite una fila de
  grupos dentro de su encabezado, va arriba como fila combinada.
- FORMATO_POR_TIPO repite los formatos de escribirCelda a proposito, para no
  tocar el camino celda-por-celda que usan los comprobantes en produccion.
- PdfTabularService no se toca: el PDF ignora el campo (no tiene equivalente).
- documento-liq.util: sanearNombreArchivo deja de tener copia privada e importa
  shared/utils/nombre-archivo.util (el de IE1). La de Finanzas tiene otras
  reglas y queda aparte, documentada en el JSDoc del util.
- Verificado que no hay regresion: el mismo documento de liquidacion y el mismo
  libro de resumen generados con el servicio de antes y con el nuevo dan XML
  identico byte a byte (sheet*.xml, styles, sharedStrings, workbook, tables).
```

FIN DE LA INSTRUCCIÓN IE2
