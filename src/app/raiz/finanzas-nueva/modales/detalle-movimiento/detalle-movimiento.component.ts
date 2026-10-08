import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ConId } from 'src/app/interfaces/conId';
import { MedioMovimientoFin, MovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import { enlaceCuenta } from '../../enlace-cuenta';
import {
  ETIQUETA_CONCEPTO, ETIQUETA_IMPUESTO, ETIQUETA_MEDIO, ETIQUETA_MOTIVO_AJUSTE, ETIQUETA_ORIGEN_IMPUTACION,
  ETIQUETA_TIPO_MOVIMIENTO, etiquetaConceptoMovimiento, validarAnulable,
} from 'src/app/shared/utils/movimiento-fin.util';

/** Finanzas — detalle de un movimiento (solo lectura): datos generales,
 *  medios, imputaciones y anulación. Muestra el movimiento tal como llegó
 *  (snapshot de la fila, no escucha cambios). Los botones Imputar saldo y
 *  Anular cierran el modal con 'imputar' / 'anular' y el que lo abrió sigue
 *  el flujo. Imprimir (recibo / orden de pago) llega en F8. */
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

  constructor(
    public activeModal: NgbActiveModal,
    private router: Router,
  ) {}

  /** Si ya estamos en la cuenta de esta entidad, no hay a dónde ir (F5d). */
  get enCuentaDeLaEntidad(): boolean {
    const ruta = `/finanzasNueva/cuenta/${this.movimiento.entidad.tipo}/${this.movimiento.entidad.id}`;
    return this.router.url.split('?')[0] === ruta;
  }

  /** Nombre de la entidad → su cuenta: cierra el modal y navega (F5d). */
  irACuenta(): void {
    const e = enlaceCuenta(this.movimiento.entidad.tipo, this.movimiento.entidad.id, 'movimientos');
    this.activeModal.dismiss();
    this.router.navigate(e.ruta, { queryParams: e.queryParams });
  }

  get m(): ConId<MovimientoFin> {
    return this.movimiento;
  }

  get compensado(): boolean {
    return this.movimiento.imputaciones.some(i => i.origen === 'compensacion');
  }

  /** Concepto legible: motivo del ajuste (con "cierre de saldo"),
   *  "Devolución" o el concepto (F7b). */
  get conceptoTexto(): string {
    return etiquetaConceptoMovimiento(this.movimiento);
  }

  /** Por qué no se puede anular (compensado, saldo cerrado o devuelto), o
   *  null. Solo para vigentes. */
  get motivoNoAnulable(): string | null {
    return this.movimiento.estado === 'vigente' ? validarAnulable(this.movimiento) : null;
  }

  get puedeAnular(): boolean {
    return this.movimiento.estado === 'vigente' && this.motivoNoAnulable === null;
  }

  get puedeImputar(): boolean {
    return this.movimiento.estado === 'vigente' && this.movimiento.tipo !== 'ajuste' && this.movimiento.sinImputar > 0;
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

  imputar(): void {
    this.activeModal.close('imputar');
  }

  /** Cerrar por ajuste o devolver el saldo sin imputar (F7b). */
  saldo(): void {
    this.activeModal.close('saldo');
  }

  cerrar(): void {
    this.activeModal.dismiss();
  }
}
