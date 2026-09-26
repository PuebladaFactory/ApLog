import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { InformeOpNuevo } from 'src/app/interfaces/informe-op-nuevo';
import { DescuentoLiq, InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { CambiosDatosLiq, InformeLiqService } from 'src/app/servicios/informes-liq/informe-liq.service';
import { InformeLiqFactoryService } from 'src/app/servicios/informes-liq/informe-liq-factory.service';
import { nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';
import { igualesPorContenido } from 'src/app/shared/utils/igualdad.util';
import {
  ColumnaLiq, columnasPorTipo, esColumnaMonto, etiquetaColumna, valorColumnaInformeOp,
} from 'src/app/shared/utils/columnas-liquidacion.util';
import {
  InformeOpEditorComponent,
  ResultadoEdicionInformeOp,
} from 'src/app/shared/modales/informe-op-editor/informe-op-editor.component';
import { AjustesLiqComponent } from '../ajustes-liq/ajustes-liq.component';
import { PermisosService } from 'src/app/servicios/permisos/permisos.service';

/** Detalle de un InformeLiqNuevo. Lo abren Liquidación (Borradores,
 *  modulo='liquidaciones') y Facturación (Emitidos, modulo='facturacion').
 *  En 'borrador' y 'emitido' —y con permiso `<modulo>.editar`— permite editar
 *  cada InformeOp (InformeLiqService.editarInformeOp: recalcula el informe)
 *  y los datos del informe (descuentos, observaciones, columnas —
 *  InformeLiqService.editarDatos). En cualquier otro estado es solo lectura.
 *  Período y composición no son editables. Relee todo después de cada
 *  guardado. Las transiciones (emitir, eliminar, revertir, facturar) viven en
 *  los listados, no acá. */
@Component({
  selector: 'app-informe-liq-nuevo-detalle',
  standalone: false,
  templateUrl: './informe-liq-nuevo-detalle.component.html',
  styleUrl: './informe-liq-nuevo-detalle.component.scss',
})
export class InformeLiqNuevoDetalleComponent implements OnInit {

  @Input() idInfLiq!: string;
  /** Módulo desde el que se abre: define el permiso de edición
   *  (`<modulo>.editar`). */
  @Input() modulo: 'liquidaciones' | 'facturacion' = 'liquidaciones';

  liq: ConId<InformeLiqNuevo> | null = null;
  informes: ConId<InformeOpNuevo>[] = [];
  cargando = false;
  guardando = false;

  // Edición de datos (borrador de la UI; se guarda con "Guardar cambios")
  descuentos: DescuentoLiq[] = [];
  observaciones = '';
  columnas: ColumnaLiq[] = [];

  constructor(
    public activeModal: NgbActiveModal,
    private modalService: NgbModal,
    private informeLiqServ: InformeLiqService,
    private factory: InformeLiqFactoryService,
    private permisos: PermisosService,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  /** Editable = estado que admite edición (borrador | emitido; los servicios
   *  validan lo mismo) Y permiso de edición en el módulo que abrió el modal.
   *  Controla todo lo editable del template (ajustes, columnas,
   *  observaciones, lápiz de InformeOp, guardar/descartar). */
  get editable(): boolean {
    if (!this.liq) return false;
    const estadoEditable = this.liq.estado === 'borrador' || this.liq.estado === 'emitido';
    return estadoEditable && this.permisos.puede(this.modulo, 'editar');
  }

  /** Clase del badge de estado. */
  get claseEstado(): string {
    switch (this.liq?.estado) {
      case 'borrador':  return 'bg-warning text-dark';
      case 'emitido':   return 'bg-primary';
      case 'facturado': return 'bg-success';
      case 'revertido': return 'bg-secondary';
      case 'anulado':   return 'bg-danger';
      default:          return 'bg-light text-dark';
    }
  }

  get nombreEntidad(): string {
    return this.liq ? nombreEntidadRef(this.liq.entidad) : '';
  }

  get textoPeriodo(): string {
    return this.liq ? this.factory.textoPeriodo(this.liq.periodo) : '';
  }

  /** Columnas guardadas en el informe — arman la tabla. */
  get columnasVisibles(): ColumnaLiq[] {
    return this.columnas.filter(c => c.seleccionada);
  }

  get descuentoTotalEditado(): number {
    return this.descuentos.reduce((acc, d) => acc + (d.valor ?? 0), 0);
  }

  /** Subtotal = suma de los InformeOp (no depende de los ajustes). */
  get subtotalBase(): number {
    return this.liq ? this.liq.valores.total - this.liq.valores.descuentoTotal : 0;
  }

  /** Total en vivo con los ajustes en edición (lo persistido se actualiza al
   *  guardar, vía editarDatos). */
  get totalEditado(): number {
    return this.subtotalBase + this.descuentoTotalEditado;
  }

  /** Los ajustes en pantalla difieren de los guardados. */
  get ajustesSinGuardar(): boolean {
    return this.descuentosCambiaron;
  }

  /** ¿Hay cambios de datos sin guardar? */
  get hayCambios(): boolean {
    if (!this.liq) return false;
    return this.descuentosCambiaron || this.observacionesCambiaron || this.columnasCambiaron;
  }

  private get columnasSeleccionadas(): string[] {
    return this.columnas.filter(c => c.seleccionada).map(c => c.nombre);
  }

  private get descuentosCambiaron(): boolean {
    return !!this.liq && !igualesPorContenido(this.descuentos, this.liq.descuentos);
  }

  private get columnasCambiaron(): boolean {
    return !!this.liq && !igualesPorContenido(this.columnasSeleccionadas, this.liq.columnas);
  }

  private get observacionesCambiaron(): boolean {
    return !!this.liq && this.observaciones !== (this.liq.observaciones ?? '');
  }

  async cargar(): Promise<void> {
    this.cargando = true;
    try {
      this.liq = await this.informeLiqServ.obtenerPorId(this.idInfLiq);
      if (!this.liq) {
        Swal.fire({ icon: 'error', text: 'El informe de liquidación ya no existe (¿fue eliminado?).' });
        this.activeModal.dismiss();
        return;
      }
      this.informes = await this.informeLiqServ.obtenerInformesOp(this.idInfLiq);
      this.descuentos = this.liq.descuentos.map(d => ({ concepto: d.concepto, valor: d.valor }));
      this.observaciones = this.liq.observaciones ?? '';
      this.columnas = columnasPorTipo(this.liq.tipo, this.liq.columnas);
    } catch (e: any) {
      Swal.fire({ icon: 'error', text: `No se pudo cargar el informe: ${e?.message ?? e}` });
    } finally {
      this.cargando = false;
    }
  }

  valorColumna(inf: ConId<InformeOpNuevo>, columna: string): string {
    return valorColumnaInformeOp(inf, columna);
  }

  esColumnaMonto(columna: string): boolean {
    return esColumnaMonto(columna);
  }

  etiqueta(columna: string): string {
    return this.liq ? etiquetaColumna(columna, this.liq.tipo) : columna;
  }

  /** Edita un InformeOp del informe: InformeOpEditorComponent (mismo modal
   *  que el listado) → InformeLiqService.editarInformeOp (edición + recálculo
   *  del informe, atómico). */
  async editarInformeOp(inf: ConId<InformeOpNuevo>): Promise<void> {
    if (this.hayCambios) {
      Swal.fire({ icon: 'info', text: 'Guardá o descartá los cambios del informe antes de editar un informe de operación.' });
      return;
    }
    const modalRef = this.modalService.open(InformeOpEditorComponent, { size: 'lg', centered: true });
    modalRef.componentInstance.informeOp = inf;

    let resultado: ResultadoEdicionInformeOp;
    try {
      resultado = await modalRef.result;
    } catch {
      return; // cancelado
    }

    this.guardando = true;
    try {
      const res = await this.informeLiqServ.editarInformeOp(resultado);
      Swal.fire({ icon: res.exito ? 'success' : 'error', text: res.mensaje });
      if (res.exito) await this.cargar();
    } finally {
      this.guardando = false;
    }
  }

  async abrirDescuentos(): Promise<void> {
    const modalRef = this.modalService.open(AjustesLiqComponent, {
      windowClass: 'myCustomModalClass', centered: true, size: 'md',
    });
    // Copia: AjustesLiqComponent muta el array que recibe.
    modalRef.componentInstance.fromParent = { descuentos: this.descuentos.map(d => ({ ...d })) };
    try {
      const r = await modalRef.result;
      if (r?.descuentos) this.descuentos = r.descuentos.map((d: DescuentoLiq) => ({ concepto: d.concepto, valor: d.valor }));
    } catch {
      // dismiss — sin cambios
    }
  }

  quitarDescuento(i: number): void {
    this.descuentos = this.descuentos.filter((_, idx) => idx !== i);
  }

  descartarCambios(): void {
    if (!this.liq) return;
    this.descuentos = this.liq.descuentos.map(d => ({ concepto: d.concepto, valor: d.valor }));
    this.observaciones = this.liq.observaciones ?? '';
    this.columnas = columnasPorTipo(this.liq.tipo, this.liq.columnas);
  }

  /** Guarda solo los campos que cambiaron (editarDatos). */
  async guardarCambios(): Promise<void> {
    if (!this.liq || !this.hayCambios) return;
    const cambios: CambiosDatosLiq = {};
    if (this.descuentosCambiaron) cambios.descuentos = this.descuentos;
    if (this.observacionesCambiaron) cambios.observaciones = this.observaciones.trim();
    if (this.columnasCambiaron) cambios.columnas = this.columnasSeleccionadas;

    this.guardando = true;
    try {
      const res = await this.informeLiqServ.editarDatos(this.idInfLiq, cambios);
      Swal.fire({ icon: res.exito ? 'success' : 'error', text: res.mensaje });
      if (res.exito) await this.cargar();
    } finally {
      this.guardando = false;
    }
  }

  cerrar(): void {
    if (this.hayCambios) {
      Swal.fire({
        title: 'Hay cambios sin guardar',
        text: '¿Cerrar igual y descartarlos?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Cerrar sin guardar',
        cancelButtonText: 'Volver',
      }).then(r => { if (r.isConfirmed) this.activeModal.dismiss(); });
      return;
    }
    this.activeModal.dismiss();
  }
}
