import { Injectable, inject } from '@angular/core';
import * as FileSaver from 'file-saver';
import { LibroTabular } from 'src/app/interfaces/documento-tabular';
import { ExcelTabularService } from 'src/app/servicios/exportacion/excel-tabular.service';
import { PdfTabularService } from 'src/app/servicios/exportacion/pdf-tabular.service';

export type FormatoExportacionFin = 'excel' | 'pdf';

/** Exportación de Finanzas (F8a): dibuja un LibroTabular (armado por los
 *  utils puros de exportacion-finanzas.util) con los renderers genéricos y
 *  lo descarga. Solo lectura: sin log. */
@Injectable({ providedIn: 'root' })
export class FinanzasExportService {

  private excel = inject(ExcelTabularService);
  private pdf = inject(PdfTabularService);

  async descargar(libro: LibroTabular, formato: FormatoExportacionFin): Promise<void> {
    const blob = formato === 'excel' ? await this.excel.generarLibro(libro) : await this.pdf.generarLibro(libro);
    FileSaver.saveAs(blob, `${libro.nombreArchivo}.${formato === 'excel' ? 'xlsx' : 'pdf'}`);
  }
}
