import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import {
  AccionListado, ColumnaListado, EventoAccionListado, OrdenListado,
} from 'src/app/interfaces/tabla-listado';
import { InformeLiqConsultaService } from 'src/app/servicios/informes-liq/informe-liq-consulta.service';
import { InformeLiqFactoryService } from 'src/app/servicios/informes-liq/informe-liq-factory.service';
import { nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';
import { InformeLiqNuevoDetalleComponent } from 'src/app/shared/modales/informe-liq-nuevo-detalle/informe-liq-nuevo-detalle.component';

type Fila = ConId<InformeLiqNuevo>;

/** Facturación — histórico de InformeLiqNuevo 'revertido', one-shot por
 *  rango de períodos de liquidación (InformeLiqConsultaService.consultarPorPeriodo,
 *  índice estado + periodoClave). Tipo y texto se filtran en memoria.
 *  Acción: ver (el detalle muestra la copia congelada de los InformeOp). */
@Component({
  selector: 'app-facturacion-revertidos',
  standalone: false,
  templateUrl: './facturacion-revertidos.component.html',
  styleUrl: './facturacion-revertidos.component.scss',
})
export class FacturacionRevertidosComponent implements OnInit {

  revertidos: Fila[] = [];
  filtrados: Fila[] = [];
  filtroTipo: 'todos' | 'cliente' | 'chofer' | 'proveedor' = 'todos';
  searchText = '';
  // Rango de períodos ('YYYY-MM', lo que devuelve <input type="month">).
  desde = '';
  hasta = '';
  cargando = false;

  readonly ordenInicial: OrdenListado = { key: 'periodo', asc: false };

  readonly columnas: ColumnaListado<Fila>[] = [
    { key: 'numeroInterno', label: 'N° Informe', valor: b => b.numeroInterno, orden: b => b.numeroInterno ?? '' },
    { key: 'periodo', label: 'Período', valor: b => this.factory.textoPeriodo(b.periodo), orden: b => this.factory.ordenPeriodo(b.periodo) },
    { key: 'tipo', label: 'Tipo', valor: b => b.tipo, orden: b => b.tipo, clase: 'text-capitalize' },
    { key: 'entidad', label: 'Entidad', valor: b => this.nombre(b), orden: b => this.nombre(b) },
    { key: 'cantidadOperaciones', label: 'Informes', valor: b => b.cantidadOperaciones, orden: b => b.cantidadOperaciones, tipo: 'numero', align: 'center' },
    { key: 'total', label: 'Total', valor: b => b.valores.total, orden: b => b.valores.total, tipo: 'moneda' },
    { key: 'fechaReversion', label: 'Revertido', valor: b => (b.reversion?.fecha ?? '').slice(0, 10), orden: b => b.reversion?.fecha ?? '' },
    { key: 'usuario', label: 'Por', valor: b => b.reversion?.usuario ?? '', orden: b => b.reversion?.usuario ?? '' },
    { key: 'motivo', label: 'Motivo', valor: b => b.reversion?.motivo ?? '' },
  ];

  readonly acciones: AccionListado<Fila>[] = [
    { id: 'ver', label: 'Ver' },
  ];

  constructor(
    private modalService: NgbModal,
    private consulta: InformeLiqConsultaService,
    private factory: InformeLiqFactoryService,
  ) {}

  ngOnInit(): void {
    // Por defecto: los últimos 3 meses (incluido el actual).
    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1);
    this.hasta = this.clave(hoy);
    this.desde = this.clave(inicio);
    this.consultar();
  }

  async consultar(): Promise<void> {
    if (!this.desde || !this.hasta) {
      Swal.fire({ icon: 'info', text: 'Elegí el período desde y hasta.' });
      return;
    }
    if (this.desde > this.hasta) {
      Swal.fire({ icon: 'info', text: 'El período "desde" no puede ser posterior a "hasta".' });
      return;
    }
    this.cargando = true;
    try {
      this.revertidos = await this.consulta.consultarPorPeriodo(['revertido'], this.desde, this.hasta);
      this.aplicarFiltros();
    } catch (e: any) {
      Swal.fire({ icon: 'error', text: `No se pudieron consultar los informes revertidos: ${e?.message ?? e}` });
    } finally {
      this.cargando = false;
    }
  }

  /** Filtro en memoria: tipo + texto sobre entidad o número interno. */
  aplicarFiltros(): void {
    const texto = this.searchText.trim().toLowerCase();
    this.filtrados = this.revertidos.filter(b =>
      (this.filtroTipo === 'todos' || b.tipo === this.filtroTipo) &&
      (!texto ||
        this.nombre(b).toLowerCase().includes(texto) ||
        (b.numeroInterno ?? '').toLowerCase().includes(texto)),
    );
  }

  onAccion(e: EventoAccionListado<Fila>): void {
    switch (e.id) {
      case 'ver': this.verDetalle(e.item); break;
    }
  }

  private nombre(b: InformeLiqNuevo): string {
    return nombreEntidadRef(b.entidad);
  }

  private clave(fecha: Date): string {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
  }

  private verDetalle(b: Fila): void {
    const modalRef = this.modalService.open(InformeLiqNuevoDetalleComponent, {
      size: 'xl', centered: true, scrollable: true, backdrop: 'static',
    });
    modalRef.componentInstance.idInfLiq = b.idInfLiq;
    modalRef.componentInstance.modulo = 'facturacion';
    modalRef.result.catch(() => {});
  }
}
