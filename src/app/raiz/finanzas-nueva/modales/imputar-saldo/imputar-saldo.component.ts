import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { MovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { FinanzasConsultaService } from 'src/app/servicios/finanzas-nueva/finanzas-consulta.service';
import { MovimientoFinService } from 'src/app/servicios/finanzas-nueva/movimiento-fin.service';
import { InformeLiqFactoryService } from 'src/app/servicios/informes-liq/informe-liq-factory.service';
import { fechaBaseAntiguedad } from 'src/app/shared/utils/cuentas-finanzas.util';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import {
  diasEntre, distribuirFifo, esCero, normalizarValoresFinancieros, redondear2, TOLERANCIA_IMPORTE,
} from 'src/app/shared/utils/finanzas.util';
import {
  ETIQUETA_CONCEPTO, ETIQUETA_TIPO_MOVIMIENTO, ImputacionSolicitada, normalizarSolicitudes, validarImputacionSaldo,
} from 'src/app/shared/utils/movimiento-fin.util';

/** Comprobante abierto de la entidad (InformeLiq facturado con saldo). */
interface FilaComprobante {
  liq: ConId<InformeLiqNuevo>;
  periodo: string;
  fechaFactura: string;     // legible
  dias: number | null;
  total: number;
  saldo: number;
  importe: number | null;   // a imputar (appMonto: null si el input queda vacío)
}

/** Finanzas — imputar el saldo sin imputar de un cobro o pago (saldo a
 *  favor del cliente, anticipo o préstamo) a comprobantes facturados de la
 *  misma entidad. Misma tabla de comprobantes que RegistrarMovimiento
 *  (más antiguos primero, saldar con el check, reparto FIFO). Valida en vivo
 *  con el mismo util que el servicio (validarImputacionSaldo) y llama a
 *  MovimientoFinService.imputarSaldo, que revalida todo en su transacción.
 *  Cierra con true si imputó; si falla, queda abierto con el error. */
@Component({
  selector: 'app-imputar-saldo',
  standalone: false,
  templateUrl: './imputar-saldo.component.html',
  styleUrl: './imputar-saldo.component.scss',
})
export class ImputarSaldoComponent implements OnInit {

  @Input() movimiento!: ConId<MovimientoFin>;

  readonly hoy = toISODateString(new Date());
  readonly etiquetaTipo = ETIQUETA_TIPO_MOVIMIENTO;
  readonly etiquetaConcepto = ETIQUETA_CONCEPTO;
  readonly fechaLegible = fechaComprobanteLegible;

  filas: FilaComprobante[] = [];
  cargando = false;
  guardando = false;
  error = '';

  constructor(
    public activeModal: NgbActiveModal,
    private consulta: FinanzasConsultaService,
    private movimientos: MovimientoFinService,
    private factory: InformeLiqFactoryService,
  ) {}

  async ngOnInit(): Promise<void> {
    const entidad = this.movimiento.entidad;
    this.cargando = true;
    try {
      const abiertos = await firstValueFrom(this.consulta.observarInformesAbiertos());
      this.filas = abiertos
        .filter(l => l.estado === 'facturado' && l.tipo === entidad.tipo && l.entidad.id === entidad.id)
        .map(l => this.armarFila(l))
        .filter(f => f.saldo > 0)
        .sort((a, b) => fechaBaseAntiguedad(a.liq).localeCompare(fechaBaseAntiguedad(b.liq)));
    } catch (e: any) {
      this.error = `No se pudieron leer los comprobantes: ${e?.message ?? e}`;
    } finally {
      this.cargando = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Derivados
  // ---------------------------------------------------------------------------

  get disponible(): number {
    return this.movimiento.sinImputar;
  }

  get totalImputado(): number {
    return redondear2(this.filas.reduce((acc, f) => acc + (Number(f.importe) || 0), 0));
  }

  get restante(): number {
    const v = redondear2(this.disponible - this.totalImputado);
    return esCero(v) ? 0 : v;
  }

  get totalSaldos(): number {
    return redondear2(this.filas.reduce((acc, f) => acc + f.saldo, 0));
  }

  /** Error de validación en vivo (mismo util que el servicio + saldo por fila). */
  get errorValidacion(): string | null {
    const excedida = this.filas.find(f => (Number(f.importe) || 0) - f.saldo > TOLERANCIA_IMPORTE);
    if (excedida) return `El importe del comprobante ${excedida.liq.numeroInterno} supera su saldo.`;
    return validarImputacionSaldo(this.movimiento, normalizarSolicitudes(this.solicitudes()));
  }

  get puedeConfirmar(): boolean {
    return !this.cargando && !this.guardando && this.errorValidacion === null;
  }

  // ---------------------------------------------------------------------------
  // Gestos
  // ---------------------------------------------------------------------------

  /** Check de la fila: marcado = saldar el comprobante con lo que quede
   *  disponible (hasta su saldo); desmarcado = 0. */
  alternarFila(fila: FilaComprobante, marcada: boolean): void {
    if (!marcada) {
      fila.importe = 0;
      return;
    }
    const otros = redondear2(this.totalImputado - (Number(fila.importe) || 0));
    fila.importe = redondear2(Math.max(0, Math.min(fila.saldo, this.disponible - otros)));
  }

  /** Reparte el saldo disponible entre los comprobantes, del más antiguo al
   *  más nuevo (distribuirFifo). */
  repartir(): void {
    const importes = distribuirFifo(this.disponible, this.filas.map(f => f.saldo));
    this.filas.forEach((f, i) => (f.importe = importes[i]));
  }

  async confirmar(): Promise<void> {
    if (!this.puedeConfirmar) return;
    this.error = '';
    const cantidad = this.filas.filter(f => (Number(f.importe) || 0) > 0).length;
    const r = await Swal.fire({
      title: `¿Imputar saldo de ${this.movimiento.numero}?`,
      html:
        `<p>${this.movimiento.entidad.razonSocial} — <b>$ ${this.totalImputado.toFixed(2)}</b> a ${cantidad} comprobante(s).</p>` +
        (this.restante > 0 ? `<p>Quedan $ ${this.restante.toFixed(2)} sin imputar.</p>` : ''),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Imputar',
      cancelButtonText: 'Volver',
    });
    if (!r.isConfirmed) return;

    this.guardando = true;
    try {
      const res = await this.movimientos.imputarSaldo(this.movimiento.idMovimiento, this.solicitudes());
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

  private solicitudes(): ImputacionSolicitada[] {
    return this.filas
      .filter(f => (Number(f.importe) || 0) > 0)
      .map(f => ({ idInfLiq: f.liq.idInfLiq, importe: Number(f.importe) }));
  }

  private armarFila(liq: ConId<InformeLiqNuevo>): FilaComprobante {
    const vf = normalizarValoresFinancieros(liq.valoresFinancieros, liq.valores.total);
    const base = fechaBaseAntiguedad(liq);
    let dias: number | null = null;
    try { dias = diasEntre(base, this.hoy); } catch { dias = null; }
    return {
      liq,
      periodo: this.factory.textoPeriodo(liq.periodo),
      fechaFactura: fechaComprobanteLegible(base),
      dias,
      total: vf.total,
      saldo: vf.saldo,
      importe: 0,
    };
  }
}
