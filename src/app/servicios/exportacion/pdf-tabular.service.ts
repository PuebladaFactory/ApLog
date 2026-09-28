import { Injectable } from '@angular/core';
import { DocumentoTabular, TipoCeldaDoc } from 'src/app/interfaces/documento-tabular';
import { LOGO_EMPRESA_BASE64 } from './logo-empresa';
import { ANCHO_HOJA_HORIZONTAL, fechaHoraActual, formatearCelda, formatearMoneda } from './formato-exportacion';

const MARGEN = 14;          // mm
const MARGEN_INFERIOR = 16; // mm (lugar para "Página X de Y")
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
    doc.columnas.forEach((c, i) => {
      columnStyles[i] = { halign: alineacion(c.tipo), cellWidth: (anchoUtil * c.ancho) / anchoTotal };
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
        if (linea?.tipo === 'total') {
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

function alineacion(tipo: TipoCeldaDoc): 'left' | 'right' | 'center' {
  if (tipo === 'moneda' || tipo === 'numero') return 'right';
  if (tipo === 'fecha') return 'center';
  return 'left';
}
