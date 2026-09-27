import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import {
  AccionListado, ColumnaListado, EventoAccionListado, OrdenListado,
} from 'src/app/interfaces/tabla-listado';
import { InformeLiqConsultaService } from 'src/app/servicios/informes-liq/informe-liq-consulta.service';
import { InformeLiqService } from 'src/app/servicios/informes-liq/informe-liq.service';
import { InformeLiqFactoryService } from 'src/app/servicios/informes-liq/informe-liq-factory.service';
import { nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';
import { InformeLiqNuevoDetalleComponent } from 'src/app/shared/modales/informe-liq-nuevo-detalle/informe-liq-nuevo-detalle.component';
import { VincularFacturaLiqComponent } from '../vincular-factura-liq/vincular-factura-liq.component';

type Fila = ConId<InformeLiqNuevo>;

/** Facturación — bandeja de InformeLiqNuevo en estado 'emitido' (pendientes
 *  de facturar), en vivo, de todas las entidades. Tabla: TablaListadoComponent.
 *  Acciones: ver/editar (detalle con modulo='facturacion'), facturar
 *  (VincularFacturaLiqComponent → InformeLiqService.vincularFactura) y
 *  revertir (InformeLiqService.revertirEmitido). Camino paralelo a
 *  FacturacionListadoComponent (modelo viejo, resumenLiq). */
@Component({
  selector: 'app-facturacion-emitidos',
  standalone: false,
  templateUrl: './facturacion-emitidos.component.html',
  styleUrl: './facturacion-emitidos.component.scss',
})
export class FacturacionEmitidosComponent implements OnInit, OnDestroy {

  emitidos: Fila[] = [];
  filtrados: Fila[] = [];
  filtroTipo: 'todos' | 'cliente' | 'chofer' | 'proveedor' = 'todos';
  searchText = '';
  cargando = true;
  procesando = false;

  readonly ordenInicial: OrdenListado = { key: 'fechaEmision', asc: false };

  readonly columnas: ColumnaListado<Fila>[] = [
    { key: 'numeroInterno', label: 'N° Informe', valor: b => b.numeroInterno, orden: b => b.numeroInterno ?? '' },
    { key: 'fechaEmision', label: 'Emisión', valor: b => b.fechaEmision, orden: b => b.fechaEmision ?? b.fechaCreacion },
    { key: 'tipo', label: 'Tipo', valor: b => b.tipo, orden: b => b.tipo, clase: 'text-capitalize' },
    { key: 'entidad', label: 'Entidad', valor: b => this.nombre(b), orden: b => this.nombre(b) },
    { key: 'periodo', label: 'Período', valor: b => this.factory.textoPeriodo(b.periodo), orden: b => this.factory.ordenPeriodo(b.periodo) },
    { key: 'cantidadOperaciones', label: 'Informes', valor: b => b.cantidadOperaciones, orden: b => b.cantidadOperaciones, tipo: 'numero', align: 'center' },
    { key: 'total', label: 'Total', valor: b => b.valores.total, orden: b => b.valores.total, tipo: 'moneda', clase: 'table-success' },
  ];

  readonly acciones: AccionListado<Fila>[] = [
    { id: 'ver', label: 'Ver' },
    { id: 'facturar', label: 'Facturar', clase: 'btn-outline-success', permiso: 'facturacion.vincularFactura' },
    {
      id: 'revertir', label: 'Revertir', clase: 'btn-outline-danger', permiso: 'facturacion.revertir',
      // D3: no se revierte un informe con algo cobrado/pagado.
      deshabilitada: b => (b.valoresFinancieros?.totalCobrado ?? 0) !== 0,
    },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private modalService: NgbModal,
    private consulta: InformeLiqConsultaService,
    private factory: InformeLiqFactoryService,
    private informeLiqServ: InformeLiqService,
  ) {}

  ngOnInit(): void {
    this.consulta.observarPorEstado('emitido')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => {
          this.emitidos = data;
          this.aplicarFiltros();
          this.cargando = false;
        },
        error: e => {
          this.cargando = false;
          Swal.fire({ icon: 'error', text: `No se pudieron cargar los informes emitidos: ${e?.message ?? e}` });
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Filtro en memoria: tipo + texto sobre entidad o número interno. Se
   *  llama al llegar datos y al cambiar un filtro (no es un getter: la tabla
   *  recibe un array estable). El orden lo resuelve la tabla. */
  aplicarFiltros(): void {
    const texto = this.searchText.trim().toLowerCase();
    this.filtrados = this.emitidos.filter(b =>
      (this.filtroTipo === 'todos' || b.tipo === this.filtroTipo) &&
      (!texto ||
        this.nombre(b).toLowerCase().includes(texto) ||
        (b.numeroInterno ?? '').toLowerCase().includes(texto)),
    );
  }

  onAccion(e: EventoAccionListado<Fila>): void {
    switch (e.id) {
      case 'ver': this.verDetalle(e.item); break;
      case 'facturar': this.facturar(e.item); break;
      case 'revertir': this.revertir(e.item); break;
    }
  }

  private nombre(b: InformeLiqNuevo): string {
    return nombreEntidadRef(b.entidad);
  }

  private verDetalle(b: Fila): void {
    const modalRef = this.modalService.open(InformeLiqNuevoDetalleComponent, {
      size: 'xl', centered: true, scrollable: true, backdrop: 'static',
    });
    modalRef.componentInstance.idInfLiq = b.idInfLiq;
    modalRef.componentInstance.modulo = 'facturacion';
    // La bandeja se actualiza sola (listener); no hace falta manejar el result.
    modalRef.result.catch(() => {});
  }

  /** Facturar: modal de vinculación (lee el QR, valida y llama a
   *  InformeLiqService.vincularFactura). Sin refresco manual: el listener
   *  saca el informe de la bandeja al pasar a 'facturado'. */
  private facturar(b: Fila): void {
    const modalRef = this.modalService.open(VincularFacturaLiqComponent, {
      size: 'lg', centered: true, scrollable: true, backdrop: 'static', keyboard: false,
    });
    modalRef.componentInstance.liq = b;
    modalRef.result.catch(() => {});
  }

  /** Revertir: pide el motivo (obligatorio) y delega en
   *  InformeLiqService.revertirEmitido, que valida todo fresco en una
   *  transacción. Sin refresco manual: el listener saca el informe de la
   *  bandeja al pasar a 'revertido'. */
  private async revertir(b: Fila): Promise<void> {
    const r = await Swal.fire({
      title: `¿Revertir la liquidación ${b.numeroInterno}?`,
      html:
        `<p><b>${this.nombre(b)}</b> — ${this.factory.textoPeriodo(b.periodo)}</p>` +
        `<p>Los ${b.cantidadOperaciones} informe(s) vuelven a <b>Liquidación → Informes</b> para volver a liquidarse. ` +
        `La liquidación queda como <b>revertida</b>, con su número, en la pestaña Revertidos.</p>`,
      input: 'textarea',
      inputLabel: 'Motivo de la reversión',
      inputPlaceholder: 'Obligatorio',
      inputValidator: (v: string) => (!v || !v.trim() ? 'El motivo es obligatorio.' : null),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Revertir',
      cancelButtonText: 'Cancelar',
    });
    if (!r.isConfirmed) return;

    this.procesando = true;
    try {
      const res = await this.informeLiqServ.revertirEmitido(b.idInfLiq, r.value as string);
      Swal.fire({ icon: res.exito ? 'success' : 'error', text: res.mensaje });
    } finally {
      this.procesando = false;
    }
  }
}
