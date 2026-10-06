import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ConId } from 'src/app/interfaces/conId';
import { MedioMovimientoFin, MovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import {
  ETIQUETA_CONCEPTO, ETIQUETA_IMPUESTO, ETIQUETA_MEDIO, ETIQUETA_MOTIVO_AJUSTE, ETIQUETA_ORIGEN_IMPUTACION,
  ETIQUETA_TIPO_MOVIMIENTO,
} from 'src/app/shared/utils/movimiento-fin.util';

/** Finanzas — detalle de un movimiento (solo lectura): datos generales,
 *  medios, imputaciones y anulación. Muestra el movimiento tal como llegó
 *  (snapshot de la fila, no escucha cambios). El botón Anular cierra el
 *  modal con 'anular' y el que lo abrió sigue el flujo (motivo + servicio).
 *  Imprimir (recibo / orden de pago) llega en F8. */
@Component({
  selector: 'app-detalle-movimiento',
  standalone: false,
  templateUrl: './detalle-movimiento.component.html',
  styleUrl: './detalle-movimiento.component.scss',
})
export class DetalleMovimientoComponent {

  @Input() movimiento!: ConId<MovimientoFin>;

  readonly etiquetaTipo = ETIQUETA_TIPO_MOVIMIENTO;
  readonly etiquetaConcepto = ETIQUETA_CONCEPTO;
  readonly etiquetaMedio = ETIQUETA_MEDIO;
  readonly etiquetaMotivoAjuste = ETIQUETA_MOTIVO_AJUSTE;
  readonly etiquetaOrigen = ETIQUETA_ORIGEN_IMPUTACION;
  readonly fechaLegible = fechaComprobanteLegible;

  constructor(public activeModal: NgbActiveModal) {}

  get m(): ConId<MovimientoFin> {
    return this.movimiento;
  }

  get compensado(): boolean {
    return this.movimiento.imputaciones.some(i => i.origen === 'compensacion');
  }

  get puedeAnular(): boolean {
    return this.movimiento.estado === 'vigente' && !this.compensado;
  }

  /** Etiqueta de lo no imputado según el lado: saldo a favor del cliente o
   *  anticipo/préstamo pendiente de compensar. */
  get etiquetaSinImputar(): string {
    if (this.movimiento.tipo === 'cobro') return 'Saldo a favor del cliente';
    return this.movimiento.concepto === 'prestamo' ? 'Préstamo pendiente' : 'Anticipo / saldo pendiente';
  }

  /** fechaRegistro y anulacion.fecha son ISO con hora (instante): se
   *  muestran en hora local. Las fechas de negocio 'YYYY-MM-DD' van con
   *  fechaLegible (nunca new Date sobre ellas). */
  fechaHora(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString('es-AR');
  }

  detalleMedio(md: MedioMovimientoFin): string {
    if (md.tipo === 'retencion' && md.retencion) {
      return [
        ETIQUETA_IMPUESTO[md.retencion.impuesto] ?? md.retencion.impuesto,
        md.retencion.jurisdiccion,
        `Certificado ${md.retencion.certificado}`,
      ].filter(Boolean).join(' · ');
    }
    const partes = [
      md.banco,
      md.referencia ? `N° ${md.referencia}` : null,
      md.fechaCobro ? `Cobro ${fechaComprobanteLegible(md.fechaCobro)}` : null,
    ].filter(Boolean);
    return partes.length > 0 ? partes.join(' · ') : '—';
  }

  anular(): void {
    this.activeModal.close('anular');
  }

  cerrar(): void {
    this.activeModal.dismiss();
  }
}
