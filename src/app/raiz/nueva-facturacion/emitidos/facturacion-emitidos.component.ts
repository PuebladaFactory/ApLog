import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { InformeLiqConsultaService } from 'src/app/servicios/informes-liq/informe-liq-consulta.service';
import { InformeLiqFactoryService } from 'src/app/servicios/informes-liq/informe-liq-factory.service';
import { nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';
import { InformeLiqNuevoDetalleComponent } from 'src/app/shared/modales/informe-liq-nuevo-detalle/informe-liq-nuevo-detalle.component';

type ColumnaOrdenEmitido =
  'numeroInterno' | 'fechaEmision' | 'tipo' | 'entidad' | 'periodo' | 'cantidadOperaciones' | 'total';

/** Facturación — bandeja de InformeLiqNuevo en estado 'emitido' (pendientes
 *  de facturar), en vivo, de todas las entidades. Acciones: ver/editar
 *  (detalle con modulo='facturacion'). Facturar y revertir se agregan en los
 *  bloques siguientes. Camino paralelo a FacturacionListadoComponent (modelo
 *  viejo, resumenLiq). */
@Component({
  selector: 'app-facturacion-emitidos',
  standalone: false,
  templateUrl: './facturacion-emitidos.component.html',
  styleUrl: './facturacion-emitidos.component.scss',
})
export class FacturacionEmitidosComponent implements OnInit, OnDestroy {

  emitidos: ConId<InformeLiqNuevo>[] = [];
  filtroTipo: 'todos' | 'cliente' | 'chofer' | 'proveedor' = 'todos';
  searchText = '';
  // Por defecto: emitidos más recientes primero.
  ordenColumna: ColumnaOrdenEmitido = 'fechaEmision';
  ordenAscendente = false;
  cargando = true;

  private destroy$ = new Subject<void>();

  constructor(
    private modalService: NgbModal,
    private consulta: InformeLiqConsultaService,
    private factory: InformeLiqFactoryService,
  ) {}

  ngOnInit(): void {
    this.consulta.observarPorEstado('emitido')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => { this.emitidos = data; this.cargando = false; },
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

  /** Filtro (tipo + texto sobre entidad o número interno) y orden, en memoria. */
  get filtrados(): ConId<InformeLiqNuevo>[] {
    const texto = this.searchText.trim().toLowerCase();
    const dir = this.ordenAscendente ? 1 : -1;
    return this.emitidos
      .filter(b =>
        (this.filtroTipo === 'todos' || b.tipo === this.filtroTipo) &&
        (!texto ||
          this.nombre(b).toLowerCase().includes(texto) ||
          (b.numeroInterno ?? '').toLowerCase().includes(texto)),
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

  ordenar(columna: ColumnaOrdenEmitido): void {
    if (this.ordenColumna === columna) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.ordenColumna = columna;
      this.ordenAscendente = true;
    }
  }

  /** ▲/▼ en la columna activa; ⇅ en las demás. */
  iconoOrden(columna: ColumnaOrdenEmitido): string {
    if (this.ordenColumna !== columna) return '⇅';
    return this.ordenAscendente ? '▲' : '▼';
  }

  /** Clave de orden. Período: año, mes y tramo (1q < 2q < mes) en un número. */
  private valorOrden(b: InformeLiqNuevo): string | number {
    switch (this.ordenColumna) {
      case 'numeroInterno': return b.numeroInterno ?? '';
      case 'fechaEmision': return b.fechaEmision ?? b.fechaCreacion;
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
    modalRef.componentInstance.modulo = 'facturacion';
    // La bandeja se actualiza sola (listener); no hace falta manejar el result.
    modalRef.result.catch(() => {});
  }
}
