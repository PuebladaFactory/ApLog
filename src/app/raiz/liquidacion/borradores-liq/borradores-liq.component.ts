import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { InformeLiqService } from 'src/app/servicios/informes-liq/informe-liq.service';
import { InformeLiqFactoryService } from 'src/app/servicios/informes-liq/informe-liq-factory.service';
import { nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';
import { InformeLiqNuevoDetalleComponent } from '../modales/informe-liq-nuevo-detalle/informe-liq-nuevo-detalle.component';

type ColumnaOrdenBorrador = 'fechaCreacion' | 'tipo' | 'entidad' | 'periodo' | 'cantidadOperaciones' | 'total';

/** Borradores de liquidación (InformeLiqNuevo en estado 'borrador') — listado
 *  en vivo de todas las entidades. Acciones: ver/editar (modal de detalle),
 *  emitir, eliminar. Camino paralelo a ProformaComponent (modelo viejo). */
@Component({
  selector: 'app-borradores-liq',
  standalone: false,
  templateUrl: './borradores-liq.component.html',
  styleUrl: './borradores-liq.component.scss',
})
export class BorradoresLiqComponent implements OnInit, OnDestroy {

  borradores: ConId<InformeLiqNuevo>[] = [];
  filtroTipo: 'todos' | 'cliente' | 'chofer' | 'proveedor' = 'todos';
  searchText = '';
  // Por defecto: más nuevos primero (mismo orden que observarBorradores).
  ordenColumna: ColumnaOrdenBorrador = 'fechaCreacion';
  ordenAscendente = false;
  cargando = true;
  procesando = false;

  private destroy$ = new Subject<void>();

  constructor(
    private modalService: NgbModal,
    private informeLiqServ: InformeLiqService,
    private factory: InformeLiqFactoryService,
  ) {}

  ngOnInit(): void {
    this.informeLiqServ.observarBorradores()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => { this.borradores = data; this.cargando = false; },
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

  get filtrados(): ConId<InformeLiqNuevo>[] {
    const texto = this.searchText.trim().toLowerCase();
    const dir = this.ordenAscendente ? 1 : -1;
    return this.borradores
      .filter(b =>
        (this.filtroTipo === 'todos' || b.tipo === this.filtroTipo) &&
        (!texto || this.nombre(b).toLowerCase().includes(texto)),
      )
      .sort((a, b) => {
        const va = this.valorOrden(a);
        const vb = this.valorOrden(b);
        const cmp = typeof va === 'string'
          ? va.localeCompare(vb as string)
          : (va as number) - (vb as number);
        return cmp * dir;
      });
  }

  nombre(b: InformeLiqNuevo): string {
    return nombreEntidadRef(b.entidad);
  }

  periodo(b: InformeLiqNuevo): string {
    return this.factory.textoPeriodo(b.periodo);
  }

  ordenar(columna: ColumnaOrdenBorrador): void {
    if (this.ordenColumna === columna) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.ordenColumna = columna;
      this.ordenAscendente = true;
    }
  }

  /** ▲/▼ en la columna activa; ⇅ en las demás. */
  iconoOrden(columna: ColumnaOrdenBorrador): string {
    if (this.ordenColumna !== columna) return '⇅';
    return this.ordenAscendente ? '▲' : '▼';
  }

  /** Clave de orden. Período: año, mes y tramo (1q < 2q < mes) en un número. */
  private valorOrden(b: InformeLiqNuevo): string | number {
    switch (this.ordenColumna) {
      case 'fechaCreacion': return b.fechaCreacion;
      case 'tipo': return b.tipo;
      case 'entidad': return this.nombre(b);
      case 'periodo': {
        const tramo = b.periodo.tramo === '1q' ? 0 : b.periodo.tramo === '2q' ? 1 : 2;
        return b.periodo.anio * 1000 + b.periodo.mes * 10 + tramo;
      }
      case 'cantidadOperaciones': return b.cantidadOperaciones;
      case 'total': return b.valores.total;
    }
  }

  verDetalle(b: ConId<InformeLiqNuevo>): void {
    const modalRef = this.modalService.open(InformeLiqNuevoDetalleComponent, {
      size: 'xl', centered: true, scrollable: true, backdrop: 'static',
    });
    modalRef.componentInstance.idInfLiq = b.idInfLiq;
    // El listado se actualiza solo (listener); no hace falta manejar el result.
    modalRef.result.catch(() => {});
  }

  async emitir(b: ConId<InformeLiqNuevo>): Promise<void> {
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
    try {
      const res = await this.informeLiqServ.emitirBorrador(b.idInfLiq);
      Swal.fire({ icon: res.exito ? 'success' : 'error', text: res.mensaje });
    } finally {
      this.procesando = false;
    }
  }

  async eliminar(b: ConId<InformeLiqNuevo>): Promise<void> {
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
