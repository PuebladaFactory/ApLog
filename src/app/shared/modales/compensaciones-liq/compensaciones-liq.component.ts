import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { CompensacionLiq } from 'src/app/interfaces/informe-liq-nuevo';
import { TipoEntidadFin } from 'src/app/interfaces/movimiento-fin';
import { FinanzasConsultaService } from 'src/app/servicios/finanzas-nueva/finanzas-consulta.service';
import {
  CompensableFin, ETIQUETA_CONCEPTO_COMPENSACION, MAX_COMPENSACIONES, errorNeto, totalCompensacionesDe,
} from 'src/app/shared/utils/compensacion.util';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import { esCero, redondear2, TOLERANCIA_IMPORTE } from 'src/app/shared/utils/finanzas.util';

/** Fila del modal: un compensable con el importe elegido. */
interface FilaCompensable {
  c: CompensableFin;
  importe: number | null;           // appMonto: null si el input queda vacío
}

/** Modal "Compensaciones" de un InformeLiq (Frente Finanzas, FC1b). Lista
 *  los movimientos de la entidad con saldo para compensar (anticipos,
 *  préstamos, saldos a favor — F33), con el aviso de otros borradores que
 *  los eligieron (F35). Valida en vivo: importe ≤ disponible, neto ≥ 0
 *  (F30), tope MAX_COMPENSACIONES. NO persiste: cierra con la lista
 *  completa de CompensacionLiq elegidas (el servicio las revalida en su
 *  transacción). Lo usan LiquidacionNuevaComponent (informe nuevo,
 *  idInfLiq null) e InformeLiqNuevoDetalleComponent (borrador / emitido). */
@Component({
  selector: 'app-compensaciones-liq',
  standalone: false,
  templateUrl: './compensaciones-liq.component.html',
  styleUrl: './compensaciones-liq.component.scss',
})
export class CompensacionesLiqComponent implements OnInit {

  @Input() tipo!: TipoEntidadFin;
  @Input() idEntidad!: string;
  @Input() nombreEntidad = '';
  /** null = informe nuevo (todavía no existe). */
  @Input() idInfLiq: string | null = null;
  /** Compensaciones elegidas hasta ahora (se precargan). */
  @Input() actuales: CompensacionLiq[] = [];
  /** Total del servicio (con ajustes) — para el neto en vivo. */
  @Input() totalServicio = 0;

  readonly etiquetaConcepto = ETIQUETA_CONCEPTO_COMPENSACION;
  readonly fechaLegible = fechaComprobanteLegible;
  readonly MAX = MAX_COMPENSACIONES;

  filas: FilaCompensable[] = [];
  /** Compensaciones actuales cuyo movimiento ya no está disponible
   *  (anulado o sin saldo): se quitan al aplicar. */
  noDisponibles: CompensacionLiq[] = [];
  cargando = false;
  error = '';

  constructor(
    public activeModal: NgbActiveModal,
    private consulta: FinanzasConsultaService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.cargando = true;
    try {
      const compensables = await this.consulta.obtenerCompensables(
        { tipo: this.tipo, id: this.idEntidad }, this.idInfLiq, this.actuales.map(c => c.idMovimiento),
      );
      const elegidos = new Map(this.actuales.map(c => [c.idMovimiento, c.importe]));
      this.filas = compensables.map(c => ({ c, importe: elegidos.get(c.idMovimiento) ?? 0 }));
      const ids = new Set(compensables.map(c => c.idMovimiento));
      this.noDisponibles = this.actuales.filter(a => !ids.has(a.idMovimiento));
    } catch (e: any) {
      this.error = `No se pudieron leer los movimientos: ${e?.message ?? e}`;
    } finally {
      this.cargando = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Derivados
  // ---------------------------------------------------------------------------

  get totalCompensaciones(): number {
    return totalCompensacionesDe(this.filas.map(f => ({ importe: Number(f.importe) || 0 })));
  }

  get neto(): number {
    return redondear2(this.totalServicio - this.totalCompensaciones);
  }

  get elegidas(): FilaCompensable[] {
    return this.filas.filter(f => !esCero(Number(f.importe) || 0));
  }

  /** Error de validación en vivo, o null. */
  get errorValidacion(): string | null {
    const excedida = this.filas.find(f => (Number(f.importe) || 0) - f.c.disponible > TOLERANCIA_IMPORTE);
    if (excedida) return `El importe de ${excedida.c.numero} supera su disponible.`;
    if (this.filas.some(f => (Number(f.importe) || 0) < 0)) return 'Hay un importe negativo.';
    if (this.elegidas.length > this.MAX) return `Se admiten hasta ${this.MAX} compensaciones.`;
    return errorNeto(this.totalServicio, this.totalCompensaciones);
  }

  get puedeAplicar(): boolean {
    return !this.cargando && this.errorValidacion === null;
  }

  // ---------------------------------------------------------------------------
  // Gestos
  // ---------------------------------------------------------------------------

  /** Check: marcado = compensar lo que entre (hasta su disponible y sin
   *  pasar el neto a negativo); desmarcado = 0. */
  alternar(fila: FilaCompensable, marcada: boolean): void {
    if (!marcada) {
      fila.importe = 0;
      return;
    }
    const otros = redondear2(this.totalCompensaciones - (Number(fila.importe) || 0));
    const lugar = redondear2(this.totalServicio - otros);
    fila.importe = redondear2(Math.max(0, Math.min(fila.c.disponible, lugar)));
  }

  aplicar(): void {
    if (!this.puedeAplicar) return;
    const resultado: CompensacionLiq[] = this.elegidas.map(f => ({
      idMovimiento: f.c.idMovimiento,
      numero: f.c.numero,
      fecha: f.c.fecha,
      concepto: f.c.concepto,
      importe: redondear2(Number(f.importe)),
    }));
    this.activeModal.close(resultado);
  }

  cancelar(): void {
    this.activeModal.dismiss();
  }
}
