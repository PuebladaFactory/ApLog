import { Injectable } from '@angular/core';
import { ColumnaDoc, DocumentoTabular, LibroTabular } from 'src/app/interfaces/documento-tabular';
import { LOGO_EMPRESA_BASE64 } from './logo-empresa';
import { ANCHO_HOJA_HORIZONTAL, fechaHoraActual, formatearCelda, formatearMoneda } from './formato-exportacion';

const MARGEN = 10;          // mm (lateral y superior)
const MARGEN_INFERIOR = 16; // mm (lugar para "Página X de Y")
const MARGEN_SUP_LIBRO = 8;  // mm — generarLibro: encabezado compacto
const MARGEN_INF_LIBRO = 10; // mm — generarLibro: pie de página a 5 mm del borde
const COLOR_ENCABEZADO: [number, number, number] = [100, 149, 237];
const COLOR_ZEBRA: [number, number, number] = [236, 242, 251];

/** Dibuja un DocumentoTabular en PDF (jsPDF + jspdf-autotable). Genérico: no
 *  sabe de qué informe se trata. Las librerías se cargan al usarse. */
@Injectable({ providedIn: 'root' })
export class PdfTabularService {

  async generar(doc: DocumentoTabular): Promise<Blob> {
    const [{ jsPDF }, autoTableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const autoTable = autoTableMod.default;

    const anchoTotal = doc.columnas.reduce((acc, c) => acc + c.ancho, 0) || 1;
    const pdf = new jsPDF({
      orientation: anchoTotal > ANCHO_HOJA_HORIZONTAL ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    pdf.setProperties({ title: doc.nombreArchivo });
    const anchoPagina = pdf.internal.pageSize.getWidth();
    const altoPagina = pdf.internal.pageSize.getHeight();
    const anchoUtil = anchoPagina - 2 * MARGEN;

    // ---- Encabezado (primera página) ----
    pdf.addImage(LOGO_EMPRESA_BASE64, 'PNG', MARGEN, 10, 40, 12.3);
    let y = 30;
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text(doc.titulo, MARGEN, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    for (const s of doc.subtitulos) {
      y += 5.5;
      pdf.text(s, MARGEN, y);
    }
    if (doc.identificador) {
      y += 5;
      pdf.setFontSize(8);
      pdf.text(doc.identificador, MARGEN, y);
    }
    const aviso = [doc.marca, doc.leyenda].filter(Boolean).join(' — ');
    if (aviso) {
      y += 5.5;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(200, 30, 30);
      const lineas: string[] = pdf.splitTextToSize(aviso, anchoUtil);
      pdf.text(lineas, MARGEN, y);
      y += (lineas.length - 1) * 4;
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
    }

    // ---- Tabla ----
    const fuente = doc.columnas.length <= 9 ? 8 : 7;
    const columnStyles: Record<number, any> = {};
    // Fecha, números y montos: 'wrap' = la columna toma el ancho de su valor
    // más largo y NUNCA lo parte en dos líneas. Las de texto ('auto') se
    // reparten el espacio restante y hacen salto de línea.
    doc.columnas.forEach((c, i) => {
      columnStyles[i] = { halign: alineacion(c), cellWidth: c.tipo === 'texto' ? 'auto' : 'wrap' };
    });
    autoTable(pdf, {
      startY: y + 5,
      head: [doc.columnas.map(c => c.etiqueta)],
      body: doc.filas.map(fila => fila.map((v, i) => formatearCelda(v, doc.columnas[i].tipo))),
      theme: 'grid',
      showHead: 'everyPage',
      styles: {
        fontSize: fuente, cellPadding: 1.8, textColor: 20,
        lineColor: [180, 180, 180], lineWidth: 0.2, overflow: 'linebreak',
      },
      headStyles: { fillColor: COLOR_ENCABEZADO, textColor: 0, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: COLOR_ZEBRA },
      columnStyles,
      margin: { top: MARGEN, left: MARGEN, right: MARGEN, bottom: MARGEN_INFERIOR },
    });

    // ---- Pie (bloque propio, alineado a la derecha) ----
    const anchoPie = Math.min(90, anchoUtil);
    autoTable(pdf, {
      startY: (pdf as any).lastAutoTable.finalY + 4,
      body: doc.pie.map(l => [l.concepto, formatearMoneda(l.valor)]),
      theme: 'plain',
      tableWidth: anchoPie,
      margin: { left: anchoPagina - MARGEN - anchoPie, right: MARGEN, bottom: MARGEN_INFERIOR },
      styles: { fontSize: fuente + 1, cellPadding: 1.5, textColor: 20 },
      columnStyles: { 1: { halign: 'right' } },
      didParseCell: (data: any) => {
        const linea = doc.pie[data.row.index];
        if (linea?.tipo === 'total' || linea?.tipo === 'neto') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = COLOR_ENCABEZADO;
        } else if (linea?.tipo === 'subtotal') {
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    // ---- Notas ----
    let yNotas = (pdf as any).lastAutoTable.finalY + 6;
    pdf.setFontSize(9);
    for (const nota of doc.notas) {
      const lineas: string[] = pdf.splitTextToSize(nota, anchoUtil);
      if (yNotas + lineas.length * 4 > altoPagina - MARGEN_INFERIOR) {
        pdf.addPage();
        yNotas = MARGEN + 4;
      }
      pdf.text(lineas, MARGEN, yNotas);
      yNotas += lineas.length * 4 + 2;
    }

    // ---- En todas las páginas: marca de agua + pie de página ----
    const generado = `Generado el ${fechaHoraActual()}`;
    const paginas = pdf.getNumberOfPages();
    for (let p = 1; p <= paginas; p++) {
      pdf.setPage(p);
      if (doc.marca) this.dibujarMarca(pdf, doc.marca, anchoPagina, altoPagina);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(120, 120, 120);
      pdf.text(generado, MARGEN, altoPagina - 8);
      pdf.text(`Página ${p} de ${paginas}`, anchoPagina - MARGEN, altoPagina - 8, { align: 'right' });
      pdf.setTextColor(0, 0, 0);
    }

    return pdf.output('blob');
  }

  /** Libro de varias hojas/tablas (LibroTabular) en un único PDF: cada hoja
   *  empieza en página nueva, con logo, título y subtítulos; cada tabla con
   *  su título, fila de grupos (colSpan), encabezado repetido por página y
   *  la fila Total como pie de la tabla. Orientación por la tabla más ancha. */
  async generarLibro(libro: LibroTabular): Promise<Blob> {
    const [{ jsPDF }, autoTableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const autoTable = autoTableMod.default;

    const anchoMax = Math.max(
      1,
      ...libro.hojas.flatMap(h => h.tablas.map(t => t.columnas.reduce((acc, c) => acc + c.ancho, 0))),
    );
    const pdf = new jsPDF({
      orientation: anchoMax > ANCHO_HOJA_HORIZONTAL ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    pdf.setProperties({ title: libro.nombreArchivo });
    const anchoPagina = pdf.internal.pageSize.getWidth();
    const altoPagina = pdf.internal.pageSize.getHeight();
    const anchoUtil = anchoPagina - 2 * MARGEN;

    libro.hojas.forEach((hoja, h) => {
      if (h > 0) pdf.addPage();

      // ---- Encabezado de la hoja: logo a la izquierda; título y subtítulos
      // a la misma altura, alineados al margen derecho (ahorra alto). ----
      const altoLogo = 12.3;
      pdf.addImage(LOGO_EMPRESA_BASE64, 'PNG', MARGEN, MARGEN_SUP_LIBRO, 40, altoLogo);
      const xDerecha = anchoPagina - MARGEN;
      let yDatos = MARGEN_SUP_LIBRO + 4;
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text(hoja.titulo, xDerecha, yDatos, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      for (const s of hoja.subtitulos) {
        yDatos += 4.5;
        pdf.text(s, xDerecha, yDatos, { align: 'right' });
      }
      let y = Math.max(MARGEN_SUP_LIBRO + altoLogo, yDatos) - 2;

      // ---- Tablas ----
      for (const tabla of hoja.tablas) {
        y += 4;
        if (tabla.titulo) {
          if (y > altoPagina - MARGEN_INF_LIBRO - 20) {
            pdf.addPage();
            y = MARGEN_SUP_LIBRO + 4;
          }
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.text(tabla.titulo, MARGEN, y);
          pdf.setFont('helvetica', 'normal');
          y += 2;
        }

        const cols = tabla.columnas.length;
        const fuente = cols <= 9 ? 8 : cols <= 14 ? 7 : 6;
        const head: any[] = [];
        if (tabla.grupos.length > 0) {
          head.push(tabla.grupos.map(g => ({ content: g.etiqueta, colSpan: g.span })));
        }
        head.push(tabla.columnas.map(c => c.etiqueta));
        const columnStyles: Record<number, any> = {};
        tabla.columnas.forEach((c, i) => { columnStyles[i] = { halign: alineacion(c) }; });

        autoTable(pdf, {
          startY: y + 2,
          head,
          body: tabla.filas.map(f => f.map((v, i) => formatearCelda(v, tabla.columnas[i].tipo))),
          // jspdf-autotable NO aplica columnStyles al pie: cada celda de la
          // fila Total lleva la alineación de su columna (montos a la derecha).
          foot: tabla.filaTotal
            ? [tabla.filaTotal.map((v, i) => ({
                content: formatearCelda(v, tabla.columnas[i].tipo),
                styles: { halign: alineacion(tabla.columnas[i]) },
              }))]
            : undefined,
          showHead: 'everyPage',
          showFoot: 'lastPage',
          theme: 'grid',
          styles: {
            fontSize: fuente, cellPadding: 1.0, textColor: 20,
            lineColor: [180, 180, 180], lineWidth: 0.2, overflow: 'linebreak',
          },
          headStyles: { fillColor: COLOR_ENCABEZADO, textColor: 0, fontStyle: 'bold', halign: 'center' },
          footStyles: { fillColor: COLOR_ENCABEZADO, textColor: 0, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: COLOR_ZEBRA },
          columnStyles,
          margin: { top: MARGEN_SUP_LIBRO, left: MARGEN, right: MARGEN, bottom: MARGEN_INF_LIBRO },
        });
        y = (pdf as any).lastAutoTable.finalY;
      }

      // ---- Notas ----
      let yNotas = y + 5;
      pdf.setFontSize(9);
      for (const nota of hoja.notas) {
        const lineas: string[] = pdf.splitTextToSize(nota, anchoUtil);
        if (yNotas + lineas.length * 4 > altoPagina - MARGEN_INF_LIBRO) {
          pdf.addPage();
          yNotas = MARGEN_SUP_LIBRO + 4;
        }
        pdf.text(lineas, MARGEN, yNotas);
        yNotas += lineas.length * 4 + 2;
      }
    });

    // ---- Pie de página en todas las páginas ----
    const generado = `Generado el ${fechaHoraActual()}`;
    const paginas = pdf.getNumberOfPages();
    for (let p = 1; p <= paginas; p++) {
      pdf.setPage(p);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(120, 120, 120);
      pdf.text(generado, MARGEN, altoPagina - 5);
      pdf.text(`Página ${p} de ${paginas}`, anchoPagina - MARGEN, altoPagina - 5, { align: 'right' });
      pdf.setTextColor(0, 0, 0);
    }

    return pdf.output('blob');
  }

  /** Texto diagonal translúcido centrado en la página. */
  private dibujarMarca(pdf: any, marca: string, anchoPagina: number, altoPagina: number): void {
    pdf.saveGraphicsState();
    pdf.setGState(new pdf.GState({ opacity: 0.1 }));
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(64);
    pdf.setTextColor(200, 30, 30);
    const ancho = pdf.getTextWidth(marca);
    const angulo = (30 * Math.PI) / 180;
    pdf.text(
      marca,
      anchoPagina / 2 - (ancho / 2) * Math.cos(angulo),
      altoPagina / 2 + (ancho / 2) * Math.sin(angulo),
      { angle: 30 },
    );
    pdf.restoreGraphicsState();
  }
}

function alineacion(c: ColumnaDoc): 'left' | 'right' | 'center' {
  if (c.alineacion) {
    return c.alineacion === 'centro' ? 'center' : c.alineacion === 'derecha' ? 'right' : 'left';
  }
  if (c.tipo === 'moneda' || c.tipo === 'numero' || c.tipo === 'porcentaje' || c.tipo === 'decimal') return 'right';
  if (c.tipo === 'fecha') return 'center';
  return 'left';
}
