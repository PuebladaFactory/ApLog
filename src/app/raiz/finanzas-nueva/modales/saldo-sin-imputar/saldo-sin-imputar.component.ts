import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { MedioMovimientoFin, MovimientoFin, PREFIJO_MOVIMIENTO_FIN, TipoMedioFin } from 'src/app/interfaces/movimiento-fin';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { MovimientoFinService } from 'src/app/servicios/finanzas-nueva/movimiento-fin.service';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import {
  DatosCierreSaldo, DatosDevolucion, ETIQUETA_MEDIO, ETIQUETA_MOTIVO_AJUSTE, ETIQUETA_TIPO_MOVIMIENTO,
  MotivoCierreSaldo, UMBRAL_CERRAR_DIFERENCIA, etiquetaConceptoMovimiento, motivosCierrePara,
  normalizarCierreSaldo, normalizarDevolucion, tipoDevolucionDe, validarCierreSaldo, validarDevolucion,
} from 'src/app/shared/utils/movimiento-fin.util';

export type ModoSaldoSinImputar = 'cerrar' | 'devolver';

/** Finanzas — qué hacer con el saldo sin imputar de un cobro o pago que no
 *  se va a aplicar a comprobantes (F7b):
 *  - Cerrar por ajuste: AJ por incobrable (anticipo / préstamo perdido, por
 *    el saldo completo), redondeo (≤ $ 1.000) u otro (con observación).
 *  - Devolver: plata en sentido contrario — un PAGO al cliente que pagó de
 *    más, un COBRO al chofer / proveedor que devuelve un adelanto. Un medio,
 *    sin retenciones.
 *  Importe parcial permitido (salvo incobrable). Valida en vivo con el mismo
 *  util que el servicio; cierra con true si registró. */
@Component({
  selector: 'app-saldo-sin-imputar',
  standalone: false,
  templateUrl: './saldo-sin-imputar.component.html',
  styleUrl: './saldo-sin-imputar.component.scss',
})
export class SaldoSinImputarComponent implements OnInit {

  @Input() movimiento!: ConId<MovimientoFin>;
  @Input() modo: ModoSaldoSinImputar = 'cerrar';

  readonly hoy = toISODateString(new Date());
  readonly fechaLegible = fechaComprobanteLegible;
  readonly etiquetaTipo = ETIQUETA_TIPO_MOVIMIENTO;
  readonly etiquetaMotivo = ETIQUETA_MOTIVO_AJUSTE;
  readonly etiquetaMedio = ETIQUETA_MEDIO;
  readonly umbralRedondeo = UMBRAL_CERRAR_DIFERENCIA;
  readonly tiposMedio: TipoMedioFin[] = ['transferencia', 'efectivo', 'cheque', 'echeq', 'otro'];

  motivos: MotivoCierreSaldo[] = [];
  motivo: MotivoCierreSaldo = 'otro';
  fecha = this.hoy;
  importe: number | null = null;
  observaciones = '';
  // Devolución
  tipoMedio: TipoMedioFin = 'transferencia';
  referencia = '';
  banco = '';
  fechaCobro = '';

  guardando = false;
  error = '';

  constructor(
    public activeModal: NgbActiveModal,
    private movimientos: MovimientoFinService,
  ) {}

  ngOnInit(): void {
    this.motivos = motivosCierrePara(this.movimiento.tipo);
    this.motivo = this.motivos.includes('otro') ? 'otro' : this.motivos[0];
    this.importe = this.movimiento.sinImputar;
  }

  // ---------------------------------------------------------------------------
  // Derivados
  // ---------------------------------------------------------------------------

  get m(): ConId<MovimientoFin> {
    return this.movimiento;
  }

  get concepto(): string {
    return etiquetaConceptoMovimiento(this.movimiento);
  }

  get esCliente(): boolean {
    return this.movimiento.entidad.tipo === 'cliente';
  }

  /** "un PAGO (OPG) al cliente" / "un COBRO (RC) del chofer". */
  get textoDevolucion(): string {
    const tipo = tipoDevolucionDe(this.movimiento.tipo);
    return tipo === 'pago'
      ? `un PAGO (${PREFIJO_MOVIMIENTO_FIN.pago}) al cliente: le devolvemos lo que pagó de más`
      : `un COBRO (${PREFIJO_MOVIMIENTO_FIN.cobro}) del ${this.movimiento.entidad.tipo}: nos devuelve lo que le adelantamos`;
  }

  get conBanco(): boolean {
    return this.tipoMedio === 'transferencia' || this.tipoMedio === 'cheque' || this.tipoMedio === 'echeq';
  }

  get esCheque(): boolean {
    return this.tipoMedio === 'cheque' || this.tipoMedio === 'echeq';
  }

  get queda(): number {
    const v = Math.round((this.movimiento.sinImputar - (Number(this.importe) || 0)) * 100) / 100;
    return Math.abs(v) < 0.005 ? 0 : v;
  }

  get errorValidacion(): string | null {
    return this.modo === 'cerrar'
      ? validarCierreSaldo(this.movimiento, normalizarCierreSaldo(this.datosCierre()), this.hoy)
      : validarDevolucion(this.movimiento, normalizarDevolucion(this.datosDevolucion()), this.hoy);
  }

  get puedeConfirmar(): boolean {
    return !this.guardando && this.errorValidacion === null;
  }

  // ---------------------------------------------------------------------------
  // Gestos
  // ---------------------------------------------------------------------------

  cambiarModo(modo: ModoSaldoSinImputar): void {
    this.modo = modo;
    this.error = '';
  }

  /** Incobrable va por el saldo completo: fija el importe. */
  onMotivo(motivo: MotivoCierreSaldo): void {
    this.motivo = motivo;
    if (motivo === 'incobrable') this.importe = this.movimiento.sinImputar;
  }

  async confirmar(): Promise<void> {
    if (!this.puedeConfirmar) return;
    this.error = '';
    const importe = Number(this.importe) || 0;
    const r = await Swal.fire({
      title: this.modo === 'cerrar' ? `¿Cerrar saldo de ${this.m.numero}?` : `¿Registrar devolución contra ${this.m.numero}?`,
      html:
        `<p>${this.m.entidad.razonSocial} — <b>$ ${importe.toFixed(2)}</b>` +
        (this.modo === 'cerrar' ? ` por ajuste (${this.etiquetaMotivo[this.motivo].toLowerCase()}).</p>` : ` — ${this.textoDevolucion}.</p>`) +
        (this.queda > 0 ? `<p>Quedan $ ${this.queda.toFixed(2)} sin imputar.</p>` : '') +
        '<p class="small">Se revierte anulando el movimiento nuevo.</p>',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.modo === 'cerrar' ? 'Cerrar saldo' : 'Registrar devolución',
      cancelButtonText: 'Volver',
    });
    if (!r.isConfirmed) return;

    this.guardando = true;
    try {
      const res = this.modo === 'cerrar'
        ? await this.movimientos.cerrarSaldo(this.m.idMovimiento, this.datosCierre())
        : await this.movimientos.registrarDevolucion(this.m.idMovimiento, this.datosDevolucion());
      if (!res.exito) {
        this.error = res.mensaje;
        return;
      }
      await Swal.fire({ icon: 'success', text: res.mensaje, timer: 2500 });
      this.activeModal.close(true);
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.activeModal.dismiss();
  }

  // ---------------------------------------------------------------------------
  // Auxiliares
  // ---------------------------------------------------------------------------

  private datosCierre(): DatosCierreSaldo {
    return { fecha: this.fecha, motivo: this.motivo, importe: Number(this.importe) || 0, observaciones: this.observaciones };
  }

  private datosDevolucion(): DatosDevolucion {
    const medio: MedioMovimientoFin = {
      tipo: this.tipoMedio,
      importe: Number(this.importe) || 0,
      referencia: this.referencia,
      banco: this.conBanco ? this.banco : null,
      fechaCobro: this.esCheque && this.fechaCobro ? this.fechaCobro : null,
      retencion: null,
    };
    return { fecha: this.fecha, medio, observaciones: this.observaciones };
  }
}
