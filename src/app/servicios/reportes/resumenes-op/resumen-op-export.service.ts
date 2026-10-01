import { Injectable, inject } from '@angular/core';
import * as FileSaver from 'file-saver';
import { ExcelTabularService } from 'src/app/servicios/exportacion/excel-tabular.service';
import { PdfTabularService } from 'src/app/servicios/exportacion/pdf-tabular.service';
import { DatosLibroResumen, armarLibroResumen } from 'src/app/shared/utils/documento-resumen.util';

/** Excel/PDF del resumen de operaciones — la única puerta que usa la
 *  pantalla. QUÉ dice: armarLibroResumen (puro). CÓMO se ve: los renderers
 *  genéricos (generarLibro). Acá: armar, renderizar y guardar. Sin log
 *  (es una consulta, mismo criterio que el Excel anterior). */
@Injectable({ providedIn: 'root' })
export class ResumenOpExportService {

  private excel = inject(ExcelTabularService);
  private pdf = inject(PdfTabularService);

  async descargar(datos: DatosLibroResumen, formato: 'excel' | 'pdf'): Promise<void> {
    const libro = armarLibroResumen(datos);
    const blob = formato === 'excel'
      ? await this.excel.generarLibro(libro)
      : await this.pdf.generarLibro(libro);
    FileSaver.saveAs(blob, `${libro.nombreArchivo}.${formato === 'excel' ? 'xlsx' : 'pdf'}`);
  }
}
