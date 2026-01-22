import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiq } from 'src/app/interfaces/informe-liq';
import { MovimientoFormVM } from 'src/app/interfaces/movimiento-form-v-m';

interface InformeCobroVM {
  informeLiqId: string;
  numeroInterno: string;   // ✅ corregido
  fecha: string;

  total: number;
  totalCobrado: number;
  saldo: number;

  montoACobrar: number;
}



@Component({
  selector: 'app-movimiento-financiero',
  standalone: false,
  templateUrl: './movimiento-financiero.component.html',
  styleUrl: './movimiento-financiero.component.scss'
})


export class MovimientoFinancieroComponent implements OnInit {

  /* Inputs */
  @Input() tipo!: 'cobro' | 'pago';
  @Input() entidad!: {
    id: string;
    tipo: 'cliente' | 'chofer' | 'proveedor';
    razonSocial: string;
  };
  @Input() informes!: ConId<InformeLiq>[];

  /* VM */
  informesVM: InformeCobroVM[] = [];

  medioPago?: 'efectivo' | 'transferencia' | 'cheque' | 'otro';
  referencia?: string;
  observaciones?: string;

  form!: MovimientoFormVM;

  constructor(public activeModal: NgbActiveModal) {}

  ngOnInit(): void {
    this.inicializarVM();
  }

  private inicializarVM(): void {
    this.informesVM = this.informes.map(inf => ({
      informeLiqId: inf.id,
      numeroInterno: inf.numeroInterno,

      fecha: this.normalizarFecha(inf.fecha), // 👈 clave

      total: inf.valoresFinancieros?.total ?? 0,
      totalCobrado: inf.valoresFinancieros?.totalCobrado ?? 0,
      saldo: inf.valoresFinancieros?.saldo ?? 0,

      montoACobrar: inf.valoresFinancieros?.saldo ?? 0
    }));

  }

  /* ======================
     Cálculos
     ====================== */

  get totalMovimiento(): number {
    return this.informesVM.reduce(
      (acc, inf) => acc + (inf.montoACobrar || 0),
      0
    );
  }

  /* ======================
     Validaciones
     ====================== */

  puedeConfirmar(): boolean {
    if (this.totalMovimiento <= 0) return false;

    return this.informesVM.every(inf =>
      inf.montoACobrar >= 0 && inf.montoACobrar <= inf.saldo
    );
  }

  /* ======================
     Acciones
     ====================== */

  confirmar(): void {
    if (!this.puedeConfirmar()) return;

    const movimiento: MovimientoFormVM = {
      tipo: this.tipo,
      entidad: this.entidad,
      informesSeleccionados: this.informesVM
        .filter(i => i.montoACobrar > 0)
        .map(i => ({
          informeLiqId: i.informeLiqId,
          numeroInterno: i.numeroInterno,
          fecha: i.fecha,
          total: i.total,
          totalCobrado: i.totalCobrado,
          saldo: i.saldo,
          montoACobrar: i.montoACobrar,
        })),
      medioPago: this.medioPago,
      referencia: this.referencia,
      observaciones: this.observaciones,
    };

    this.activeModal.close(movimiento);
  }

  cancelar(): void {
    this.activeModal.dismiss();
  }

  private normalizarFecha(fecha: string | Date | undefined): string {
    if (!fecha) return '';

    if (fecha instanceof Date) {
      return fecha.toISOString().slice(0, 10);
    }

    return fecha;
  }


  recalcularTotales(): void {
    // opcional si querés lógica extra
  }

  cerrar(): void {
    // cierra el modal
  }

}


