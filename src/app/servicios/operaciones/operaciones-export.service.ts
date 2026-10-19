import { Injectable, inject } from '@angular/core';
import * as FileSaver from 'file-saver';
import { ExcelTabularService } from 'src/app/servicios/exportacion/excel-tabular.service';
import { DatosLibroOperaciones, armarLibroOperaciones } from 'src/app/shared/utils/documento-operaciones.util';

/** Excel del informe de operaciones — la ÚNICA puerta que usa el tablero.
 *  QUÉ dice el documento: armarLibroOperaciones (puro). CÓMO se ve: el
 *  renderer genérico ExcelTabularService.generarLibro, que carga exceljs con
 *  import() (se descarga recién al exportar).
 *
 *  Solo Excel: son 20 columnas, no entran legibles en un PDF (decisión D5 del
 *  frente). Sin log: es una consulta, mismo criterio que Reportes, Vendedores
 *  y Finanzas (decisión D7). */
@Injectable({ providedIn: 'root' })
export class OperacionesExportService {

  private excel = inject(ExcelTabularService);

  async descargar(datos: DatosLibroOperaciones): Promise<void> {
    const libro = armarLibroOperaciones(datos);
    const blob = await this.excel.generarLibro(libro);
    FileSaver.saveAs(blob, `${libro.nombreArchivo}.xlsx`);
  }
}
