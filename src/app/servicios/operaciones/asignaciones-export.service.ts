import { Injectable, inject } from '@angular/core';
import * as FileSaver from 'file-saver';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ExcelTabularService } from 'src/app/servicios/exportacion/excel-tabular.service';
import { PdfTabularService } from 'src/app/servicios/exportacion/pdf-tabular.service';
import { DatosLibroAsignaciones, armarLibroAsignaciones } from 'src/app/shared/utils/documento-asignaciones.util';
import { agruparVehiculosPorDuenio } from 'src/app/shared/utils/documento-entidades.util';

/** Lo que el tablero sabe y la fachada no puede adivinar: la fecha, si está en
 *  borrador o confirmado, los items de pantalla y los clientes de las columnas.
 *  Los choferes y sus vehículos los resuelve la fachada desde memoria. */
export type DatosTableroAsignaciones =
  Omit<DatosLibroAsignaciones, 'choferes' | 'vehiculosPorChofer'>;

/** Excel y PDF del informe del tablero de asignaciones — la ÚNICA puerta que
 *  usa el tablero. QUÉ dice el documento: armarLibroAsignaciones (puro). CÓMO
 *  se ve: los renderers genéricos, que cargan exceljs / jsPDF con import() (se
 *  descargan recién al exportar).
 *
 *  Las dos hojas tienen 9 y 6 columnas, así que a diferencia del informe de
 *  operaciones (22 columnas, decisión D5 del frente Informes) también entra
 *  legible en PDF: el tablero del día se imprime.
 *
 *  Sin log: es una consulta, mismo criterio que Reportes, Vendedores, Finanzas
 *  y los otros informes del frente (decisión D7). */
@Injectable({ providedIn: 'root' })
export class AsignacionesExportService {

  private excel = inject(ExcelTabularService);
  private pdf = inject(PdfTabularService);
  private choferService = inject(ChoferService);

  async descargar(datos: DatosTableroAsignaciones, formato: 'excel' | 'pdf'): Promise<void> {
    const libro = armarLibroAsignaciones({
      ...datos,
      choferes: this.choferService.getChoferesActuales(),
      // La misma función pura que los listados de entidades (IE3).
      vehiculosPorChofer: agruparVehiculosPorDuenio(this.choferService.getVehiculosActuales(), 'chofer'),
    });
    const blob = formato === 'excel'
      ? await this.excel.generarLibro(libro)
      : await this.pdf.generarLibro(libro);
    FileSaver.saveAs(blob, `${libro.nombreArchivo}.${formato === 'excel' ? 'xlsx' : 'pdf'}`);
  }
}
