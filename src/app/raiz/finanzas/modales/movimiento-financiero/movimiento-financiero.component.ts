import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiq } from 'src/app/interfaces/informe-liq';
import { MovimientoFormVM } from 'src/app/interfaces/movimiento-form-v-m';
import { FormatoNumericoService } from 'src/app/servicios/formato-numerico/formato-numerico.service';
import Swal from 'sweetalert2';

/** Modo de imputación por informe */
export type ModoImputacion = 'auto' | 'total' | 'manual';

export interface InformeCobroVM {
  informeLiqId: string;
  numeroInterno: string;
  fecha: string;

  total: number;
  totalCobrado: number;
  saldo: number;

  montoACobrar: number;
  modo: ModoImputacion;
}



@Component({
  selector: 'app-movimiento-financiero',
  standalone: false,
  templateUrl: './movimiento-financiero.component.html',
  styleUrl: './movimiento-financiero.component.scss'
})


export class MovimientoFinancieroComponent implements OnInit {

  /** Inputs del modal */
  @Input() tipo!: 'cobro' | 'pago';

  @Input() entidad!: {
    id: string;
    tipo: 'cliente' | 'chofer' | 'proveedor';
    razonSocial: string;
  };

  @Input() informes!: (InformeLiq & { id: string })[];

  /** Monto total del movimiento */
  montoTotalMovimiento = 0;

  /** ViewModel de informes */
  informesVM: InformeCobroVM[] = [];

  /** UI state */
  error?: string;

  medioPago?: 'efectivo' | 'transferencia' | 'cheque' | 'otro';
  referencia?: string;
  observaciones?: string;
  errorDistribucion: string | null = null;


  constructor(
    public activeModal: NgbActiveModal,
    public fomNumServ: FormatoNumericoService
  ) {}

  // ---------------------------------------------------------------------------
  // INIT
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    console.log("0) this.informes: ", this.informes);
    
    this.informesVM = this.informes.map(inf => ({
      informeLiqId: inf.id,

      numeroInterno: inf.numeroInterno, // 👈 conversión explícita
      fecha:
        typeof inf.fecha === 'string'
          ? inf.fecha
          : inf.fecha.toISOString().substring(0, 10),

      total: inf.valoresFinancieros!.total,
      totalCobrado: inf.valoresFinancieros!.totalCobrado,
      saldo: inf.valoresFinancieros!.saldo,

      montoACobrar: inf.valoresFinancieros!.saldo,
      modo: 'auto'
    }));
    console.log("1) this.informesVM: ", this.informesVM);
    
    // valor inicial sugerido
    this.montoTotalMovimiento = this.totalSaldo;
    this.recalcularDistribucion();
  }

  // ---------------------------------------------------------------------------
  // GETTERS
  // ---------------------------------------------------------------------------

  get totalSaldo(): number {
    return this.informesVM.reduce((acc, i) => acc + i.saldo, 0);
  }

  get totalAsignado(): number {
    return this.informesVM.reduce((acc, i) => acc + i.montoACobrar, 0);
  }

  get puedeConfirmar(): boolean {
    return (
      !this.errorDistribucion &&
      this.montoTotalMovimiento > 0 &&
      this.informesVM.some(i => i.montoACobrar > 0)
    );
  }

  get sumaSaldosSeleccionados(): number {
    return this.informesVM.reduce((a, i) => a + i.saldo, 0);
  }

  get sumaImputada(): number {
    return this.informesVM.reduce(
      (acc, i) => acc + (i.montoACobrar || 0),
      0
    );
  }

  get diferencia(): number {
    return this.montoTotalMovimiento - this.sumaImputada;
  }

  get estadoDiferencia(): 'ok' | 'faltante' | 'exceso' {
    if (this.diferencia === 0) return 'ok';
    return this.diferencia > 0 ? 'faltante' : 'exceso';
  }




  // ---------------------------------------------------------------------------
  // LOGICA DE DISTRIBUCION
  // ---------------------------------------------------------------------------

  recalcularDistribucion(): void {
    console.log("montoTotalMovimiento", this.montoTotalMovimiento);
    this.montoTotalMovimiento = this.fomNumServ.convertirAValorNumerico(this.montoTotalMovimiento)
    console.log("montoTotalMovimiento", this.montoTotalMovimiento);
    this.errorDistribucion = null;

    if (!this.montoTotalMovimiento || this.montoTotalMovimiento <= 0) {
      this.informesVM.forEach(i => i.montoACobrar = 0);
      return;
    }

    let restante = this.montoTotalMovimiento;

    // TOTAL
    for (const inf of this.informesVM.filter(i => i.modo === 'total')) {
      inf.montoACobrar = inf.saldo;
      restante -= inf.saldo;
    }

    if (restante < 0) {
      this.errorDistribucion =
        'Los pagos totales superan el monto disponible';
      return;
    }

    // MANUAL
    for (const inf of this.informesVM.filter(i => i.modo === 'manual')) {
      if (inf.montoACobrar > inf.saldo) {
        inf.montoACobrar = inf.saldo;
      }
      restante -= inf.montoACobrar;
    }

    if (restante < 0) {
      this.errorDistribucion =
        'Los montos manuales superan el total';
      return;
    }

    // AUTO
    for (const inf of this.informesVM.filter(i => i.modo === 'auto')) {
      if (restante <= 0) {
        inf.montoACobrar = 0;
        continue;
      }

      const asignado = Math.min(inf.saldo, restante);
      inf.montoACobrar = asignado;
      restante -= asignado;
    }

    if (this.sumaImputada !== this.montoTotalMovimiento) {
      this.errorDistribucion =
        'La suma imputada debe coincidir con el monto total';
      return;
    }
  }



  normalizarMontos(): void {
    for (const i of this.informesVM) {

      if (!i.montoACobrar || i.montoACobrar < 0) {
        i.montoACobrar = 0;
      }

      if (i.montoACobrar > i.saldo) {
        i.montoACobrar = i.saldo;
      }

    }
  }

  // ---------------------------------------------------------------------------
  // VALIDACION
  // ---------------------------------------------------------------------------

  validar(): boolean {

    this.errorDistribucion = '';

    if (!this.montoTotalMovimiento || this.montoTotalMovimiento <= 0) {
      this.errorDistribucion = 'El monto total debe ser mayor a cero';
      return false;
    }

    if (this.montoTotalMovimiento > this.sumaSaldosSeleccionados) {
      this.errorDistribucion =
        'El monto supera el saldo total disponible';
      return false;
    }

    if (this.sumaImputada !== this.montoTotalMovimiento) {
      this.errorDistribucion =
        'La suma imputada debe coincidir con el monto total';
      return false;
    }

    if (!this.medioPago) {
      this.errorDistribucion = 'Debe seleccionar medio de pago';
      return false;
    }

    return true;
  }



  // ---------------------------------------------------------------------------
  // CONFIRMAR
  // ---------------------------------------------------------------------------

  async confirmar(): Promise<void> {
    //if (!this.puedeConfirmar) return;
    if (!this.validar()) return;

    const confirmacion = await Swal.fire({
      title: `¿Desea confirmar la operación?`,
      //text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    })

    if (!confirmacion.isConfirmed) return;

    const form: MovimientoFormVM = {
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
          montoACobrar: i.montoACobrar
        })),

      medioPago: this.medioPago,
      referencia: this.referencia,
      observaciones: this.observaciones
    };

    //console.log("form: ", form);    
    this.activeModal.close(form);
  }

  cancelar(): void {
    this.activeModal.dismiss();
  }

}


