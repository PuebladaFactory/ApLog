import { Injectable, inject } from '@angular/core';
import * as FileSaver from 'file-saver';
import { LiquidacionVenta } from 'src/app/interfaces/liquidacion-venta';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { ExcelTabularService } from 'src/app/servicios/exportacion/excel-tabular.service';
import { PdfTabularService } from 'src/app/servicios/exportacion/pdf-tabular.service';
import { LiquidacionVentaService } from 'src/app/servicios/vendedores/liquidacion-venta.service';
import {
  DatosLibroComisiones,
  armarDocumentoLiquidacionVenta,
  armarLibroTableroComisiones,
} from 'src/app/shared/utils/documento-comisiones.util';

/** Excel/PDF de comisiones de venta (Frente Vendedores) — la única puerta que
 *  usan las pantallas. QUÉ dicen: documento-comisiones.util (puro). CÓMO se
 *  ven: los renderers genéricos. Acá: armar, renderizar y guardar. Sin log
 *  (es una consulta, mismo criterio que Reportes). */
@Injectable({ providedIn: 'root' })
export class ComisionesExportService {

  private excel = inject(ExcelTabularService);
  private pdf = inject(PdfTabularService);
  private db = inject(DbFirestoreService);

  async descargarLiquidacion(liquidacion: LiquidacionVenta, formato: 'excel' | 'pdf'): Promise<void> {
    const doc = armarDocumentoLiquidacionVenta(liquidacion);
    const blob = formato === 'excel' ? await this.excel.generar(doc) : await this.pdf.generar(doc);
    FileSaver.saveAs(blob, `${doc.nombreArchivo}.${formato === 'excel' ? 'xlsx' : 'pdf'}`);
  }

  /** Para descargar recién emitida (el tablero solo tiene el id). */
  async descargarLiquidacionPorId(idLiquidacion: string, formato: 'excel' | 'pdf'): Promise<void> {
    const liquidacion = await this.db.getById<LiquidacionVenta>(LiquidacionVentaService.COLECCION, idLiquidacion);
    if (!liquidacion) throw new Error(`No se encontró la liquidación ${idLiquidacion}.`);
    await this.descargarLiquidacion(liquidacion, formato);
  }

  async descargarTablero(datos: DatosLibroComisiones, formato: 'excel' | 'pdf'): Promise<void> {
    const libro = armarLibroTableroComisiones(datos);
    const blob = formato === 'excel' ? await this.excel.generarLibro(libro) : await this.pdf.generarLibro(libro);
    FileSaver.saveAs(blob, `${libro.nombreArchivo}.${formato === 'excel' ? 'xlsx' : 'pdf'}`);
  }
}
