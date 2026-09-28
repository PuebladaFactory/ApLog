import { Injectable } from '@angular/core';
import { DocumentoTabular, TipoCeldaDoc, ValorCeldaDoc } from 'src/app/interfaces/documento-tabular';
import { LOGO_EMPRESA_BASE64, LOGO_EMPRESA_PX } from './logo-empresa';
import { ANCHO_HOJA_HORIZONTAL, fechaHoraActual, fechaIsoAUtc } from './formato-exportacion';

const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const FORMATO_MONEDA = '"$" #,##0.00;-"$" #,##0.00';
const ARGB_ENCABEZADO = 'FF6495ED';
const ARGB_ZEBRA = 'FFECF2FB';
const ARGB_MARCA = 'FFC81E1E';
const HORIZONTAL_EXCEL = { izquierda: 'left', centro: 'center', derecha: 'right' } as const;
const BORDE = {
  top: { style: 'thin', color: { argb: 'FFB4B4B4' } },
  bottom: { style: 'thin', color: { argb: 'FFB4B4B4' } },
  left: { style: 'thin', color: { argb: 'FFB4B4B4' } },
  right: { style: 'thin', color: { argb: 'FFB4B4B4' } },
};

/** Dibuja un DocumentoTabular en Excel (exceljs). Genérico: no sabe de qué
 *  informe se trata. Pensado para PRESENTAR y para CORREGIR a mano: montos
 *  como números, pie con fórmulas (si se corrige un valor, los totales se
 *  recalculan), sin "Tabla de Excel" (filtros/bandas no aportan a un
 *  documento de presentación e imprimen mal). La librería se carga al usarse. */
@Injectable({ providedIn: 'root' })
export class ExcelTabularService {

  async generar(doc: DocumentoTabular): Promise<Blob> {
    const mod: any = await import('exceljs');
    const Workbook = mod.Workbook ?? mod.default?.Workbook;
    const wb = new Workbook();
    const ws = wb.addWorksheet(nombreHoja(doc));
    const n = Math.max(doc.columnas.length, 1);
    const anchoTotal = doc.columnas.reduce((acc, c) => acc + c.ancho, 0);

    ws.columns = doc.columnas.map(c => ({ width: c.ancho + 2 }));

    // ---- Encabezado ----
    const idLogo = wb.addImage({ base64: LOGO_EMPRESA_BASE64, extension: 'png' });
    ws.addImage(idLogo, {
      tl: { col: 0, row: 0 },
      ext: { width: LOGO_EMPRESA_PX.ancho * 0.8, height: LOGO_EMPRESA_PX.alto * 0.8 },
    });
    let fila = 5;
    fila = this.lineaCombinada(ws, fila, n, doc.titulo, { size: 16, bold: true });
    const aviso = [doc.marca, doc.leyenda].filter(Boolean).join(' — ');
    if (aviso) {
      fila = this.lineaCombinada(ws, fila, n, aviso, { size: 11, bold: true, color: { argb: ARGB_MARCA } });
    }
    for (const s of doc.subtitulos) {
      fila = this.lineaCombinada(ws, fila, n, s, { size: 12, bold: true });
    }
    if (doc.identificador) {
      fila = this.lineaCombinada(ws, fila, n, doc.identificador, { size: 9 });
    }
    fila++;

    // ---- Tabla ----
    const filaEncabezado = fila;
    const encabezado = ws.getRow(fila);
    doc.columnas.forEach((c, i) => {
      const celda = encabezado.getCell(i + 1);
      celda.value = c.etiqueta;
      celda.font = { bold: true };
      celda.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      celda.fill = relleno(ARGB_ENCABEZADO);
      celda.border = BORDE;
    });
    fila++;

    const primeraFila = fila;
    doc.filas.forEach((valores, k) => {
      const row = ws.getRow(fila);
      valores.forEach((v, i) => {
        const celda = row.getCell(i + 1);
        const col = doc.columnas[i];
        this.escribirCelda(celda, v, col.tipo);
        if (col.alineacion) {
          celda.alignment = { ...celda.alignment, horizontal: HORIZONTAL_EXCEL[col.alineacion] };
        }
        celda.border = BORDE;
        if (k % 2 === 1) celda.fill = relleno(ARGB_ZEBRA);
      });
      fila++;
    });
    const ultimaFila = fila - 1;
    fila++;

    // ---- Pie (fórmulas sobre la columna de monto, con resultado precalculado) ----
    let colValor = (doc.columnaTotal ?? n - 1) + 1; // 1-based
    if (colValor < 2) colValor = 2;                 // la etiqueta necesita al menos una columna a la izquierda
    const letra = ws.getColumn(colValor).letter;
    const conFormulas = doc.columnaTotal !== null && doc.filas.length > 0;
    const rango = `${letra}${primeraFila}:${letra}${ultimaFila}`;
    let celdaSubtotal: string | null = null;
    const celdasAjuste: string[] = [];

    for (const linea of doc.pie) {
      if (colValor > 2) ws.mergeCells(fila, 1, fila, colValor - 1);
      const esTotal = linea.tipo === 'total';
      const destacada = esTotal || linea.tipo === 'subtotal';

      const etiqueta = ws.getCell(fila, 1);
      etiqueta.value = linea.concepto;
      etiqueta.font = { bold: destacada };
      etiqueta.alignment = { horizontal: 'right', vertical: 'middle' };

      const valor = ws.getCell(fila, colValor);
      const ref = `${letra}${fila}`;
      if (conFormulas && linea.tipo === 'subtotal') {
        valor.value = { formula: `SUM(${rango})`, result: linea.valor };
        celdaSubtotal = ref;
      } else if (conFormulas && esTotal) {
        const formula = celdaSubtotal ? [celdaSubtotal, ...celdasAjuste].join('+') : `SUM(${rango})`;
        valor.value = { formula, result: linea.valor };
      } else {
        valor.value = linea.valor;
        if (linea.tipo === 'ajuste') celdasAjuste.push(ref);
      }
      valor.numFmt = FORMATO_MONEDA;
      valor.font = { bold: destacada };
      valor.alignment = { horizontal: 'right', vertical: 'middle' };
      valor.border = BORDE;
      if (esTotal) {
        etiqueta.fill = relleno(ARGB_ENCABEZADO);
        valor.fill = relleno(ARGB_ENCABEZADO);
      }
      fila++;
    }

    // ---- Notas ----
    if (doc.notas.length > 0) {
      fila++;
      for (const nota of doc.notas) {
        const lineasEstimadas = Math.max(1, Math.ceil(nota.length / Math.max(anchoTotal, 40)));
        ws.getRow(fila).height = 15 * lineasEstimadas;
        fila = this.lineaCombinada(ws, fila, n, nota, { size: 10, italic: true }, true);
      }
    }

    // ---- Vista e impresión ----
    ws.views = [{ state: 'frozen', ySplit: filaEncabezado }];
    Object.assign(ws.pageSetup, {
      paperSize: 9, // A4
      orientation: anchoTotal > ANCHO_HOJA_HORIZONTAL ? 'landscape' : 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: `${filaEncabezado}:${filaEncabezado}`,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.3, footer: 0.3 },
    });
    ws.headerFooter.oddFooter = `&LGenerado el ${fechaHoraActual()}&RPágina &P de &N`;

    const buffer = await wb.xlsx.writeBuffer();
    return new Blob([buffer], { type: TIPO_XLSX });
  }

  /** Texto en una fila combinada a lo ancho de la tabla. Devuelve la fila siguiente. */
  private lineaCombinada(ws: any, fila: number, n: number, texto: string, font: any, ajustar = false): number {
    if (n > 1) ws.mergeCells(fila, 1, fila, n);
    const celda = ws.getCell(fila, 1);
    celda.value = texto;
    celda.font = font;
    celda.alignment = { vertical: 'middle', horizontal: 'left', wrapText: ajustar };
    return fila + 1;
  }

  private escribirCelda(celda: any, valor: ValorCeldaDoc, tipo: TipoCeldaDoc): void {
    switch (tipo) {
      case 'moneda':
        celda.value = Number(valor) || 0;
        celda.numFmt = FORMATO_MONEDA;
        celda.alignment = { horizontal: 'right', vertical: 'middle' };
        break;
      case 'numero':
        celda.value = Number(valor) || 0;
        celda.numFmt = '#,##0';
        celda.alignment = { horizontal: 'right', vertical: 'middle' };
        break;
      case 'fecha': {
        const fecha = fechaIsoAUtc(String(valor ?? ''));
        celda.value = fecha ?? String(valor ?? '');
        if (fecha) celda.numFmt = 'dd/mm/yyyy';
        celda.alignment = { horizontal: 'center', vertical: 'middle' };
        break;
      }
      default:
        celda.value = String(valor ?? '');
        celda.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    }
  }
}

function relleno(argb: string) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

/** Nombre de hoja: la marca o 'Detalle'; sin caracteres inválidos, máx. 31. */
function nombreHoja(doc: DocumentoTabular): string {
  return (doc.marca ?? 'Detalle').replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 31);
}
