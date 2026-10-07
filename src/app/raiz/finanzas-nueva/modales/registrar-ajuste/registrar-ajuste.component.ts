import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { EntidadMovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { MovimientoFinService } from 'src/app/servicios/finanzas-nueva/movimiento-fin.service';
import { InformeLiqFactoryService } from 'src/app/servicios/informes-liq/informe-liq-factory.service';
import { fechaBaseAntiguedad } from 'src/app/shared/utils/cuentas-finanzas.util';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import {
  TOLERANCIA_IMPORTE, diasEntre, normalizarValoresFinancieros, redondear2,
} from 'src/app/shared/utils/finanzas.util';
import {
  AYUDA_MOTIVO_AJUSTE, DatosAjusteFin, ETIQUETA_MOTIVO_AJUSTE, MotivoAjusteElegible, UMBRAL_CERRAR_DIFERENCIA,
  motivosAjustePara, normalizarDatosAjuste, validarDatosAjuste,
} from 'src/app/shared/utils/movimiento-fin.util';

/** Comprobante abierto de la entidad (InformeLiq facturado con saldo). */
interface FilaAjuste {
  liq: ConId<InformeLiqNuevo>;
  periodo: string;
  fechaFactura: string;     // legible
  dias: number | null;
  total: number;
  saldo: number;
  importe: number | null;   // a ajustar (appMonto: null si el input queda vacío)
}

/** Finanzas — registrar un AJUSTE (F7a) sobre comprobantes facturados de
 *  la entidad: incobrable (solo clientes, por el saldo completo),
 *  bonificación, redondeo (hasta UMBRAL_CERRAR_DIFERENCIA por comprobante) u
 *  otro (observación obligatoria). Recibe los informes de la cuenta (ya
 *  leídos en vivo por la página) y, opcionalmente, un comprobante y un
 *  motivo iniciales ("Ajustar" desde una fila). Valida en vivo con el mismo
 *  util que el servicio y llama a MovimientoFinService.registrarAjuste,
 *  que revalida todo en su transacción. Cierra con true si registró. */
@Component({
  selector: 'app-registrar-ajuste',
  standalone: false,
  templateUrl: './registrar-ajuste.component.html',
  styleUrl: './registrar-ajuste.component.scss',
})
export class RegistrarAjusteComponent implements OnInit {

  @Input() entidad!: EntidadMovimientoFin;
  @Input() informes: ConId<InformeLiqNuevo>[] = [];
  @Input() idInicial: string | null = null;
  @Input() motivoInicial: MotivoAjusteElegible | null = null;

  readonly hoy = toISODateString(new Date());
  readonly etiquetaMotivo = ETIQUETA_MOTIVO_AJUSTE;
  readonly ayudaMotivo = AYUDA_MOTIVO_AJUSTE;
  readonly umbralRedondeo = UMBRAL_CERRAR_DIFERENCIA;

  motivos: MotivoAjusteElegible[] = [];
  motivo: MotivoAjusteElegible = 'bonificacion';
  fecha = this.hoy;
  observaciones = '';
  filas: FilaAjuste[] = [];
  guardando = false;
  error = '';

  constructor(
    public activeModal: NgbActiveModal,
    private movimientos: MovimientoFinService,
    private factory: InformeLiqFactoryService,
  ) {}

  ngOnInit(): void {
    this.motivos = motivosAjustePara(this.entidad.tipo);
    // Por defecto bonificación: incobrable se elige a propósito.
    this.motivo = this.motivoInicial && this.motivos.includes(this.motivoInicial) ? this.motivoInicial : 'bonificacion';
    this.filas = this.informes
      .filter(l => l.estado === 'facturado' && l.tipo === this.entidad.tipo && l.entidad.id === this.entidad.id)
      .map(l => this.armarFila(l))
      .filter(f => f.saldo > 0)
      .sort((a, b) => fechaBaseAntiguedad(a.liq).localeCompare(fechaBaseAntiguedad(b.liq)));
    const inicial = this.filas.find(f => f.liq.idInfLiq === this.idInicial);
    if (inicial) this.alternarFila(inicial, true);
  }

  // ---------------------------------------------------------------------------
  // Derivados
  // ---------------------------------------------------------------------------

  get esIncobrable(): boolean {
    return this.motivo === 'incobrable';
  }

  get totalAjuste(): number {
    return redondear2(this.filas.reduce((acc, f) => acc + (Number(f.importe) || 0), 0));
  }

  get cantidadElegidos(): number {
    return this.filas.filter(f => (Number(f.importe) || 0) > 0).length;
  }

  /** Error de validación en vivo (saldo por fila + mismo util que el servicio). */
  get errorValidacion(): string | null {
    const excedida = this.filas.find(f => (Number(f.importe) || 0) - f.saldo > TOLERANCIA_IMPORTE);
    if (excedida) return `El importe del comprobante ${excedida.liq.numeroInterno} supera su saldo.`;
    return validarDatosAjuste(normalizarDatosAjuste(this.datos()), this.hoy);
  }

  get puedeConfirmar(): boolean {
    return !this.guardando && this.errorValidacion === null;
  }

  // ---------------------------------------------------------------------------
  // Gestos
  // ---------------------------------------------------------------------------

  /** Al cambiar el motivo: incobrable fija cada fila elegida en su saldo
   *  completo; redondeo recorta al umbral. */
  onMotivo(motivo: MotivoAjusteElegible): void {
    this.motivo = motivo;
    for (const f of this.filas) {
      if ((Number(f.importe) || 0) > 0) f.importe = this.importeAlMarcar(f);
    }
  }

  /** Check de la fila: marcado = el saldo (recortado al umbral en
   *  redondeo); desmarcado = 0. */
  alternarFila(fila: FilaAjuste, marcada: boolean): void {
    fila.importe = marcada ? this.importeAlMarcar(fila) : 0;
  }

  async confirmar(): Promise<void> {
    if (!this.puedeConfirmar) return;
    this.error = '';
    const r = await Swal.fire({
      title: `¿Registrar ajuste (${this.etiquetaMotivo[this.motivo].toLowerCase()})?`,
      html:
        `<p>${this.entidad.razonSocial} — <b>$ ${this.totalAjuste.toFixed(2)}</b> en ${this.cantidadElegidos} comprobante(s).</p>` +
        (this.esIncobrable ? '<p>Los comprobantes quedan saldados y marcados <b>incobrables</b>.</p>' : '') +
        '<p class="small">Se revierte anulando el ajuste.</p>',
      icon: this.esIncobrable ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: 'Registrar ajuste',
      cancelButtonText: 'Volver',
    });
    if (!r.isConfirmed) return;

    this.guardando = true;
    try {
      const res = await this.movimientos.registrarAjuste(this.datos());
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

  private importeAlMarcar(f: FilaAjuste): number {
    if (this.motivo === 'redondeo') return redondear2(Math.min(f.saldo, UMBRAL_CERRAR_DIFERENCIA));
    return f.saldo;
  }

  private datos(): DatosAjusteFin {
    return {
      entidad: this.entidad,
      fecha: this.fecha,
      motivo: this.motivo,
      imputaciones: this.filas
        .filter(f => (Number(f.importe) || 0) > 0)
        .map(f => ({ idInfLiq: f.liq.idInfLiq, importe: Number(f.importe) })),
      observaciones: this.observaciones,
    };
  }

  private armarFila(liq: ConId<InformeLiqNuevo>): FilaAjuste {
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
