import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import {
  AccionListado, ColumnaListado, EventoAccionListado, OrdenListado,
} from 'src/app/interfaces/tabla-listado';
import { InformeLiqService } from 'src/app/servicios/informes-liq/informe-liq.service';
import { InformeLiqFactoryService } from 'src/app/servicios/informes-liq/informe-liq-factory.service';
import { LiquidacionExportService } from 'src/app/servicios/informes-liq/liquidacion-export.service';
import { preguntarFormatoDescarga } from 'src/app/shared/utils/preguntar-descarga.util';
import { nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';
import { InformeLiqNuevoDetalleComponent } from 'src/app/shared/modales/informe-liq-nuevo-detalle/informe-liq-nuevo-detalle.component';

type Fila = ConId<InformeLiqNuevo>;

/** Borradores de liquidación (InformeLiqNuevo en estado 'borrador') — listado
 *  en vivo de todas las entidades. Tabla: TablaListadoComponent. Acciones:
 *  ver/editar (modal de detalle), emitir, eliminar, descargar la proforma
 *  (PDF/Excel). Después de emitir pregunta si descargar. Camino paralelo a
 *  ProformaComponent (modelo viejo). */
@Component({
  selector: 'app-borradores-liq',
  standalone: false,
  templateUrl: './borradores-liq.component.html',
  styleUrl: './borradores-liq.component.scss',
})
export class BorradoresLiqComponent implements OnInit, OnDestroy {

  borradores: Fila[] = [];
  filtrados: Fila[] = [];
  filtroTipo: 'todos' | 'cliente' | 'chofer' | 'proveedor' = 'todos';
  searchText = '';
  cargando = true;
  procesando = false;

  // Por defecto: más nuevos primero (mismo orden que observarBorradores).
  readonly ordenInicial: OrdenListado = { key: 'fechaCreacion', asc: false };

  readonly columnas: ColumnaListado<Fila>[] = [
    { key: 'fechaCreacion', label: 'Creado', valor: b => b.fechaCreacion, orden: b => b.fechaCreacion },
    { key: 'tipo', label: 'Tipo', valor: b => b.tipo, orden: b => b.tipo, clase: 'text-capitalize' },
    { key: 'entidad', label: 'Entidad', valor: b => this.nombre(b), orden: b => this.nombre(b) },
    { key: 'periodo', label: 'Período', valor: b => this.periodo(b), orden: b => this.factory.ordenPeriodo(b.periodo) },
    { key: 'cantidadOperaciones', label: 'Informes', valor: b => b.cantidadOperaciones, orden: b => b.cantidadOperaciones, tipo: 'numero', align: 'center' },
    { key: 'total', label: 'Total', valor: b => b.valores.total, orden: b => b.valores.total, tipo: 'moneda', clase: 'table-success' },
  ];

  readonly acciones: AccionListado<Fila>[] = [
    { id: 'ver', label: 'Ver' },
    { id: 'pdf', label: 'PDF', clase: 'btn-outline-secondary', permiso: 'liquidaciones.reimprimir' },
    { id: 'excel', label: 'Excel', clase: 'btn-outline-secondary', permiso: 'liquidaciones.reimprimir' },
    { id: 'emitir', label: 'Emitir', clase: 'btn-primary', permiso: 'liquidaciones.liquidar' },
    { id: 'eliminar', label: 'Eliminar', clase: 'btn-outline-danger', permiso: 'liquidaciones.eliminar' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private modalService: NgbModal,
    private informeLiqServ: InformeLiqService,
    private factory: InformeLiqFactoryService,
    private exportServ: LiquidacionExportService,
  ) {}

  ngOnInit(): void {
    this.informeLiqServ.observarBorradores()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => {
          this.borradores = data;
          this.aplicarFiltros();
          this.cargando = false;
        },
        error: e => {
          this.cargando = false;
          Swal.fire({ icon: 'error', text: `No se pudieron cargar los borradores: ${e?.message ?? e}` });
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Filtro en memoria (tipo + razón social). Se llama al llegar datos y al
   *  cambiar un filtro; el orden lo resuelve la tabla. */
  aplicarFiltros(): void {
    const texto = this.searchText.trim().toLowerCase();
    this.filtrados = this.borradores.filter(b =>
      (this.filtroTipo === 'todos' || b.tipo === this.filtroTipo) &&
      (!texto || this.nombre(b).toLowerCase().includes(texto)),
    );
  }

  onAccion(e: EventoAccionListado<Fila>): void {
    switch (e.id) {
      case 'ver': this.verDetalle(e.item); break;
      case 'pdf':
      case 'excel': this.descargar(e.item, e.id); break;
      case 'emitir': this.emitir(e.item); break;
      case 'eliminar': this.eliminar(e.item); break;
    }
  }

  nombre(b: InformeLiqNuevo): string {
    return nombreEntidadRef(b.entidad);
  }

  periodo(b: InformeLiqNuevo): string {
    return this.factory.textoPeriodo(b.periodo);
  }

  verDetalle(b: Fila): void {
    const modalRef = this.modalService.open(InformeLiqNuevoDetalleComponent, {
      size: 'xl', centered: true, scrollable: true, backdrop: 'static',
    });
    modalRef.componentInstance.idInfLiq = b.idInfLiq;
    // El listado se actualiza solo (listener); no hace falta manejar el result.
    modalRef.result.catch(() => {});
  }

  async emitir(b: Fila): Promise<void> {
    const r = await Swal.fire({
      title: '¿Emitir el borrador?',
      html: `<p><b>${this.nombre(b)}</b> — ${this.periodo(b)}</p>` +
            `<p>${b.cantidadOperaciones} informe(s)</p>` +
            '<p><small>Se asigna número interno. Esta acción no se puede deshacer desde Liquidación.</small></p>',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Emitir',
      cancelButtonText: 'Cancelar',
    });
    if (!r.isConfirmed) return;

    this.procesando = true;
    const res = await this.informeLiqServ.emitirBorrador(b.idInfLiq)
      .finally(() => (this.procesando = false));

    if (!res.exito) {
      Swal.fire({ icon: 'error', text: res.mensaje });
      return;
    }
    // Pregunta después de apagar el spinner (si no, el overlay tapa el Swal).
    const formato = await preguntarFormatoDescarga(res.mensaje);
    if (formato && res.objeto) {
      this.procesando = true;
      try {
        await this.exportServ.descargarPorId(res.objeto.idInfLiq, formato);
      } catch (e: any) {
        Swal.fire({ icon: 'error', text: `No se pudo generar el archivo: ${e?.message ?? e}` });
      } finally {
        this.procesando = false;
      }
    }
  }

  /** Descarga directa de la proforma (acciones PDF / Excel), sin confirmación. */
  async descargar(b: Fila, formato: 'excel' | 'pdf'): Promise<void> {
    this.procesando = true;
    try {
      await this.exportServ.descargar(b, formato);
    } catch (e: any) {
      Swal.fire({ icon: 'error', text: `No se pudo generar el archivo: ${e?.message ?? e}` });
    } finally {
      this.procesando = false;
    }
  }

  async eliminar(b: Fila): Promise<void> {
    const r = await Swal.fire({
      title: '¿Eliminar el borrador?',
      html: `<p><b>${this.nombre(b)}</b> — ${this.periodo(b)}</p>` +
            `<p>Los ${b.cantidadOperaciones} informe(s) vuelven a estar disponibles para liquidar.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    });
    if (!r.isConfirmed) return;

    this.procesando = true;
    try {
      const res = await this.informeLiqServ.eliminarBorrador(b.idInfLiq);
      Swal.fire({ icon: res.exito ? 'success' : 'error', text: res.mensaje });
    } finally {
      this.procesando = false;
    }
  }
}
