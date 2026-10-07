import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { MovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { EventoComprobante, armarHistoriaComprobante, textoPeriodoCorto } from 'src/app/shared/utils/cuenta-entidad.util';
import { compensacionesDe, netoDe } from 'src/app/shared/utils/compensacion.util';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import { normalizarValoresFinancieros } from 'src/app/shared/utils/finanzas.util';

/** Finanzas — historia de un comprobante (F5b): emisión, compensaciones,
 *  factura, cobros / pagos / imputaciones de saldo / ajustes con el saldo
 *  después de cada uno; imputaciones de movimientos anulados tachadas. Solo
 *  lectura, con lo que la Cuenta de la entidad ya tiene en memoria. */
@Component({
  selector: 'app-historia-comprobante',
  standalone: false,
  templateUrl: './historia-comprobante.component.html',
  styleUrl: './historia-comprobante.component.scss',
})
export class HistoriaComprobanteComponent implements OnInit {

  @Input() liq!: ConId<InformeLiqNuevo>;
  @Input() movimientos: ConId<MovimientoFin>[] = [];

  eventos: EventoComprobante[] = [];
  readonly fechaLegible = fechaComprobanteLegible;

  constructor(public activeModal: NgbActiveModal) {}

  ngOnInit(): void {
    this.eventos = armarHistoriaComprobante(this.liq, this.movimientos);
  }

  get periodo(): string {
    return textoPeriodoCorto(this.liq.periodo);
  }

  get saldoActual(): number {
    const vigente = this.liq.estado === 'emitido' || this.liq.estado === 'facturado';
    return vigente ? normalizarValoresFinancieros(this.liq.valoresFinancieros, this.liq.valores.total).saldo : 0;
  }

  get neto(): number {
    return netoDe(this.liq.valores);
  }

  get tieneCompensaciones(): boolean {
    return compensacionesDe(this.liq).length > 0;
  }

  cerrar(): void {
    this.activeModal.dismiss();
  }
}
