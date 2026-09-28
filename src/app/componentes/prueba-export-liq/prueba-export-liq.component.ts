import { Component, inject } from '@angular/core';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { InformeOpNuevo } from 'src/app/interfaces/informe-op-nuevo';
import { InformeLiqService } from 'src/app/servicios/informes-liq/informe-liq.service';
import { InformeLiqConsultaService } from 'src/app/servicios/informes-liq/informe-liq-consulta.service';
import { FormatoExportacion, LiquidacionExportService } from 'src/app/servicios/informes-liq/liquidacion-export.service';
import { nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';

/** TEMPORAL (frente Excel/PDF de InformeLiqNuevo): banco de prueba en
 *  /migracion para revisar el documento en todas sus variantes antes de
 *  conectar las pantallas reales. Se elimina en el cierre del frente (X4). */
@Component({
  selector: 'app-prueba-export-liq',
  standalone: false,
  templateUrl: './prueba-export-liq.component.html',
})
export class PruebaExportLiqComponent {

  private informeLiqServ = inject(InformeLiqService);
  private consulta = inject(InformeLiqConsultaService);
  private exportServ = inject(LiquidacionExportService);

  lista: ConId<InformeLiqNuevo>[] = [];
  idSeleccionado = '';
  liq: ConId<InformeLiqNuevo> | null = null;
  informes: InformeOpNuevo[] = [];
  ocupado = false;
  error = '';

  async buscar(): Promise<void> {
    this.error = '';
    this.ocupado = true;
    try {
      const hoy = new Date();
      const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 12, 1);
      const clave = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      this.lista = await this.consulta.consultarPorPeriodo(
        ['borrador', 'emitido', 'facturado', 'revertido'], clave(desde), clave(hoy),
      );
    } catch (e: any) {
      this.error = e?.message ?? String(e);
    } finally {
      this.ocupado = false;
    }
  }

  async cargar(): Promise<void> {
    this.error = '';
    this.liq = null;
    this.informes = [];
    if (!this.idSeleccionado) return;
    this.ocupado = true;
    try {
      const liq = await this.informeLiqServ.obtenerPorId(this.idSeleccionado);
      if (!liq) {
        this.error = 'El informe ya no existe.';
        return;
      }
      this.informes = await this.exportServ.obtenerInformesOp(liq);
      this.liq = liq;
    } catch (e: any) {
      this.error = e?.message ?? String(e);
    } finally {
      this.ocupado = false;
    }
  }

  async descargar(formato: FormatoExportacion): Promise<void> {
    if (!this.liq) return;
    this.error = '';
    try {
      await this.exportServ.descargar(this.liq, formato, this.informes);
    } catch (e: any) {
      this.error = e?.message ?? String(e);
    }
  }

  /** Sin awaits antes de llamar: la pestaña se abre dentro del click. */
  vistaPrevia(comoNoGuardado: boolean): void {
    if (!this.liq) return;
    this.error = '';
    this.exportServ
      .vistaPrevia(this.liq, this.informes, { vistaPrevia: comoNoGuardado })
      .catch((e: any) => (this.error = e?.message ?? String(e)));
  }

  etiqueta(l: InformeLiqNuevo): string {
    const p = `${String(l.periodo.mes).padStart(2, '0')}/${l.periodo.anio} ${l.periodo.tramo}`;
    return `${l.estado} · ${l.numeroInterno ?? 'sin número'} · ${l.tipo} · ${nombreEntidadRef(l.entidad)} · ${p} · ${l.cantidadOperaciones} ops`;
  }
}
