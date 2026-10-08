import { Injectable, inject } from '@angular/core';
import * as FileSaver from 'file-saver';
import { MovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { Resultado } from 'src/app/interfaces/resultado';
import { ConfiguracionEmpresaService } from 'src/app/servicios/configuracion/configuracion-empresa.service';
import { fechaHoraActual, formatearMoneda } from 'src/app/servicios/exportacion/formato-exportacion';
import { LOGO_EMPRESA_BASE64 } from 'src/app/servicios/exportacion/logo-empresa';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';
import { DocumentoRecibo, armarDocumentoRecibo } from 'src/app/shared/utils/recibo-movimiento.util';

const MARGEN = 14;                                   // mm
const COLOR_ENCABEZADO: [number, number, number] = [100, 149, 237];
const COLOR_ZEBRA: [number, number, number] = [236, 242, 251];

/** Recibo / Orden de pago en PDF (F8c): QUÉ dice lo arma
 *  armarDocumentoRecibo (puro); acá se dibuja (jsPDF + autotable, cargados
 *  al usarse), se descarga y se registra un log REIMPRIMIR. A4 vertical:
 *  logo + datos de la empresa | título, número y fecha; texto principal con
 *  el importe en letras; medios; comprobantes aplicados; observaciones;
 *  línea de firma. Anulado: marca de agua ANULADO + motivo. */
@Injectable({ providedIn: 'root' })
export class ReciboPdfService {

  private configEmpresa = inject(ConfiguracionEmpresaService);
  private logRegistro = inject(LogRegistroService);

  /** Genera y descarga. `sinDatosEmpresa`: se imprimió sin el encabezado de
   *  la empresa (todavía no se cargaron en Ajustes). */
  async descargar(m: MovimientoFin & { idMovimiento: string }): Promise<Resultado<{ sinDatosEmpresa: boolean }>> {
    try {
      const empresa = await this.configEmpresa.obtener();
      const doc = armarDocumentoRecibo(m, empresa);
      const blob = await this.generar(doc);
      FileSaver.saveAs(blob, `${doc.nombreArchivo}.pdf`);
      await this.logRegistro.registrarAccion(
        'REIMPRIMIR', 'movimientosFin', m.idMovimiento,
        `PDF ${doc.titulo === 'RECIBO' ? 'del recibo' : 'de la orden de pago'} ${doc.numero}`,
      );
      return { exito: true, mensaje: `${doc.titulo === 'RECIBO' ? 'Recibo' : 'Orden de pago'} ${doc.numero} generado.`, objeto: { sinDatosEmpresa: !empresa } };
    } catch (e: any) {
      return { exito: false, mensaje: `No se pudo generar el PDF: ${e?.message ?? e}` };
    }
  }

  async generar(doc: DocumentoRecibo): Promise<Blob> {
    const [{ jsPDF }, autoTableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const autoTable = autoTableMod.default;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    pdf.setProperties({ title: doc.nombreArchivo });
    const ancho = pdf.internal.pageSize.getWidth();
    const alto = pdf.internal.pageSize.getHeight();
    const anchoUtil = ancho - 2 * MARGEN;
    const xDer = ancho - MARGEN;

    // ---- Encabezado: logo + empresa (izq.) | título, número, fecha (der.) ----
    pdf.addImage(LOGO_EMPRESA_BASE64, 'PNG', MARGEN, 12, 40, 12.3);
    let yEmp = 30;
    pdf.setTextColor(0, 0, 0);
    doc.empresa.forEach((l, i) => {
      pdf.setFont('helvetica', i === 0 ? 'bold' : 'normal');
      pdf.setFontSize(i === 0 ? 9.5 : 8);
      pdf.text(l, MARGEN, yEmp);
      yEmp += 4;
    });
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text(doc.titulo, xDer, 18, { align: 'right' });
    pdf.setFontSize(12);
    pdf.text(`N° ${doc.numero}`, xDer, 25, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`Fecha: ${doc.fecha}`, xDer, 31, { align: 'right' });
    pdf.setFontSize(7.5);
    pdf.setTextColor(110, 110, 110);
    pdf.text('Documento no válido como factura', xDer, 36, { align: 'right' });
    pdf.setTextColor(0, 0, 0);

    let y = Math.max(yEmp, 40) + 2;
    pdf.setDrawColor(180, 180, 180);
    pdf.line(MARGEN, y, xDer, y);
    y += 7;

    // ---- Anulado ----
    if (doc.anulacion) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(200, 30, 30);
      const lineas: string[] = pdf.splitTextToSize(`ANULADO el ${doc.anulacion.fecha} — Motivo: ${doc.anulacion.motivo}`, anchoUtil);
      pdf.text(lineas, MARGEN, y);
      y += lineas.length * 5 + 2;
      pdf.setTextColor(0, 0, 0);
    }

    // ---- Texto principal + concepto ----
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10.5);
    const principal: string[] = pdf.splitTextToSize(doc.textoPrincipal, anchoUtil);
    pdf.text(principal, MARGEN, y);
    y += principal.length * 5.2;
    const concepto: string[] = pdf.splitTextToSize(`En concepto de: ${doc.concepto}.`, anchoUtil);
    pdf.text(concepto, MARGEN, y);
    y += concepto.length * 5.2 + 3;

    const estilos = {
      theme: 'grid' as const,
      styles: { fontSize: 8.5, cellPadding: 1.6, textColor: 20, lineColor: [180, 180, 180] as [number, number, number], lineWidth: 0.2 },
      headStyles: { fillColor: COLOR_ENCABEZADO, textColor: 0, fontStyle: 'bold' as const, halign: 'center' as const },
      footStyles: { fillColor: COLOR_ENCABEZADO, textColor: 0, fontStyle: 'bold' as const },
      alternateRowStyles: { fillColor: COLOR_ZEBRA },
      margin: { left: MARGEN, right: MARGEN, bottom: 20 },
    };

    // ---- Medios ----
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text(doc.titulo === 'RECIBO' ? 'Valores recibidos' : 'Valores entregados', MARGEN, y);
    autoTable(pdf, {
      ...estilos,
      startY: y + 2,
      head: [['Medio', 'Detalle', 'Importe']],
      body: doc.medios.map(md => [md.medio, md.detalle, formatearMoneda(md.importe)]),
      // jspdf-autotable NO aplica columnStyles al pie: el total se alinea a mano.
      foot: [['Total', '', { content: formatearMoneda(doc.total), styles: { halign: 'right' } }]],
      columnStyles: { 0: { cellWidth: 32 }, 2: { halign: 'right', cellWidth: 34 } },
    });
    y = (pdf as any).lastAutoTable.finalY + 7;

    // ---- Comprobantes aplicados ----
    if (doc.imputaciones.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('Aplicado a', MARGEN, y);
      autoTable(pdf, {
        ...estilos,
        startY: y + 2,
        head: [['Comprobante', 'Período', 'Factura', 'Aplicación', 'Fecha', 'Importe']],
        body: doc.imputaciones.map(i => [i.documento, i.periodo, i.factura, i.aplicacion, i.fecha, formatearMoneda(i.importe)]),
        foot: [['Total aplicado', '', '', '', '', { content: formatearMoneda(doc.totalImputado), styles: { halign: 'right' } }]],
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'right', cellWidth: 34 } },
      });
      y = (pdf as any).lastAutoTable.finalY + 5;
    }
    if (doc.sinImputar > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.text(`${doc.etiquetaSinImputar}: ${formatearMoneda(doc.sinImputar)}`, xDer, y, { align: 'right' });
      y += 6;
    }

    // ---- Observaciones ----
    if (doc.observaciones) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      const obs: string[] = pdf.splitTextToSize(`Observaciones: ${doc.observaciones}`, anchoUtil);
      if (y + obs.length * 4.5 > alto - 50) { pdf.addPage(); y = 20; }
      pdf.text(obs, MARGEN, y);
      y += obs.length * 4.5 + 3;
    }

    // ---- Firma (F60) ----
    let yFirma = Math.max(y + 25, alto - 45);
    if (yFirma > alto - 25) { pdf.addPage(); yFirma = 60; }
    const anchoFirma = 80;
    const xFirma = xDer - anchoFirma;
    pdf.setDrawColor(60, 60, 60);
    pdf.line(xFirma, yFirma, xDer, yFirma);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    const firma: string[] = pdf.splitTextToSize(doc.firma, anchoFirma);
    pdf.text(firma, xFirma + anchoFirma / 2, yFirma + 4.5, { align: 'center' });

    // ---- Todas las páginas: marca ANULADO + pie ----
    const generado = `Generado el ${fechaHoraActual()}`;
    const paginas = pdf.getNumberOfPages();
    for (let p = 1; p <= paginas; p++) {
      pdf.setPage(p);
      if (doc.anulacion) this.dibujarMarca(pdf, 'ANULADO', ancho, alto);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(120, 120, 120);
      pdf.text(generado, MARGEN, alto - 8);
      pdf.text(`${doc.titulo} N° ${doc.numero} — Página ${p} de ${paginas}`, xDer, alto - 8, { align: 'right' });
      pdf.setTextColor(0, 0, 0);
    }

    return pdf.output('blob');
  }

  /** Texto diagonal translúcido (mismo criterio que PdfTabularService). */
  private dibujarMarca(pdf: any, marca: string, ancho: number, alto: number): void {
    pdf.saveGraphicsState();
    pdf.setGState(new pdf.GState({ opacity: 0.12 }));
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(80);
    pdf.setTextColor(200, 30, 30);
    const w = pdf.getTextWidth(marca);
    const ang = (30 * Math.PI) / 180;
    pdf.text(marca, ancho / 2 - (w / 2) * Math.cos(ang), alto / 2 + (w / 2) * Math.sin(ang), { angle: 30 });
    pdf.restoreGraphicsState();
  }
}
