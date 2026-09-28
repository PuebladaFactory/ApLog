import { Injectable, inject } from '@angular/core';
import * as FileSaver from 'file-saver';
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { InformeOpNuevo } from 'src/app/interfaces/informe-op-nuevo';
import { InformeLiqService } from './informe-liq.service';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';
import { ExcelTabularService } from 'src/app/servicios/exportacion/excel-tabular.service';
import { PdfTabularService } from 'src/app/servicios/exportacion/pdf-tabular.service';
import { abrirUrlEnPestana } from 'src/app/shared/utils/abrir-url.util';
import {
  OpcionesDocumentoLiq, armarDocumentoLiq, varianteDocumentoLiq,
} from 'src/app/shared/utils/documento-liq.util';

export type FormatoExportacion = 'excel' | 'pdf';

/** Excel/PDF de InformeLiqNuevo — la ÚNICA puerta que usan los componentes.
 *  QUÉ dice el documento: armarDocumentoLiq (puro). CÓMO se ve: los
 *  renderers genéricos de servicios/exportacion. Acá: obtener los InformeOp
 *  (snapshot si está revertido), nombre de archivo, guardar, vista previa en
 *  pestaña y log. No escribe en informesLiq (solo el log REIMPRIMIR). */
@Injectable({ providedIn: 'root' })
export class LiquidacionExportService {

  private informeLiqServ = inject(InformeLiqService);
  private logRegistro = inject(LogRegistroService);
  private excel = inject(ExcelTabularService);
  private pdf = inject(PdfTabularService);

  private readonly COLECCION = 'informesLiq';

  /** InformeOp que componen el informe: los vivos (link idInfLiq) o, si está
   *  revertido, la copia congelada (los vivos ya no le pertenecen). */
  async obtenerInformesOp(liq: InformeLiqNuevo): Promise<InformeOpNuevo[]> {
    if (liq.estado === 'revertido') {
      const copia = await this.informeLiqServ.obtenerSnapshotInformesOp(liq.idInfLiq);
      if (!copia) throw new Error('No se encontró la copia de los informes de esta liquidación revertida.');
      return copia;
    }
    return this.informeLiqServ.obtenerInformesOp(liq.idInfLiq);
  }

  /** Genera y descarga el documento. Si no se pasan los InformeOp, los lee.
   *  Log REIMPRIMIR solo si el documento tiene número (E5). */
  async descargar(
    liq: InformeLiqNuevo,
    formato: FormatoExportacion,
    informesOp?: InformeOpNuevo[],
  ): Promise<void> {
    const informes = informesOp ?? (await this.obtenerInformesOp(liq));
    const doc = armarDocumentoLiq(liq, informes);
    const blob = formato === 'excel' ? await this.excel.generar(doc) : await this.pdf.generar(doc);
    FileSaver.saveAs(blob, `${doc.nombreArchivo}.${formato === 'excel' ? 'xlsx' : 'pdf'}`);

    const variante = varianteDocumentoLiq(liq);
    if (variante !== 'proforma' && variante !== 'vistaPrevia' && liq.numeroInterno) {
      await this.logRegistro.registrarAccion(
        'REIMPRIMIR', this.COLECCION, liq.idInfLiq,
        `${formato === 'excel' ? 'Excel' : 'PDF'} de la liquidación N° ${liq.numeroInterno}`,
      );
    }
  }

  /** Igual que `descargar`, releyendo antes el informe (ej. recién emitido o
   *  guardado: el caller solo tiene el id). */
  async descargarPorId(idInfLiq: string, formato: FormatoExportacion): Promise<void> {
    const liq = await this.informeLiqServ.obtenerPorId(idInfLiq);
    if (!liq) throw new Error('El informe de liquidación ya no existe.');
    await this.descargar(liq, formato);
  }

  /** PDF en una pestaña nueva, sin descargar (E2). Llamar SINCRÓNICAMENTE
   *  desde el handler del click, sin awaits previos (la pestaña se abre antes
   *  de generar: si no, el bloqueador de ventanas la frena). Usa lo que se le
   *  pasa (puede ser una copia en memoria con cambios sin guardar). Sin log.
   *  La URL del Blob no se revoca: el visor del navegador la necesita para
   *  descargar/imprimir; se libera al cerrar la app. */
  vistaPrevia(
    liq: InformeLiqNuevo,
    informesOp: InformeOpNuevo[],
    opciones: OpcionesDocumentoLiq = {},
  ): Promise<void> {
    return abrirUrlEnPestana(async () => {
      const blob = await this.pdf.generar(armarDocumentoLiq(liq, informesOp, opciones));
      return URL.createObjectURL(blob);
    });
  }
}
