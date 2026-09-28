import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import {
  AccionListado, ColumnaListado, EventoAccionListado, OrdenListado,
} from 'src/app/interfaces/tabla-listado';
import { InformeLiqConsultaService } from 'src/app/servicios/informes-liq/informe-liq-consulta.service';
import { InformeLiqService } from 'src/app/servicios/informes-liq/informe-liq.service';
import { InformeLiqFactoryService } from 'src/app/servicios/informes-liq/informe-liq-factory.service';
import { LiquidacionExportService } from 'src/app/servicios/informes-liq/liquidacion-export.service';
import { nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';
import {
  descripcionTipoComprobante, fechaComprobanteLegible, listarDiscrepancias, numeroComprobante,
} from 'src/app/shared/utils/factura-electronica.util';
import { abrirUrlEnPestana } from 'src/app/shared/utils/abrir-url.util';
import { InformeLiqNuevoDetalleComponent } from 'src/app/shared/modales/informe-liq-nuevo-detalle/informe-liq-nuevo-detalle.component';

type Fila = ConId<InformeLiqNuevo>;

/** Facturación — histórico de InformeLiqNuevo 'facturado', one-shot por
 *  rango de períodos de liquidación (InformeLiqConsultaService.consultarPorPeriodo,
 *  índice estado + periodoClave). Tipo y texto se filtran en memoria.
 *  Acciones: ver (detalle), ver factura (PDF en Storage; la URL se resuelve
 *  al abrir) y desvincular (InformeLiqService.desvincularFactura → el
 *  informe vuelve a Emitidos). */
@Component({
  selector: 'app-facturacion-facturados',
  standalone: false,
  templateUrl: './facturacion-facturados.component.html',
  styleUrl: './facturacion-facturados.component.scss',
})
export class FacturacionFacturadosComponent implements OnInit {

  facturados: Fila[] = [];
  filtrados: Fila[] = [];
  filtroTipo: 'todos' | 'cliente' | 'chofer' | 'proveedor' = 'todos';
  searchText = '';
  // Rango de períodos ('YYYY-MM', lo que devuelve <input type="month">).
  desde = '';
  hasta = '';
  cargando = false;
  procesando = false;

  readonly ordenInicial: OrdenListado = { key: 'periodo', asc: false };

  readonly columnas: ColumnaListado<Fila>[] = [
    { key: 'numeroInterno', label: 'N° Informe', valor: b => b.numeroInterno, orden: b => b.numeroInterno ?? '' },
    { key: 'periodo', label: 'Período', valor: b => this.factory.textoPeriodo(b.periodo), orden: b => this.factory.ordenPeriodo(b.periodo) },
    { key: 'tipo', label: 'Tipo', valor: b => b.tipo, orden: b => b.tipo, clase: 'text-capitalize' },
    { key: 'entidad', label: 'Entidad', valor: b => this.nombre(b), orden: b => this.nombre(b) },
    { key: 'total', label: 'Total', valor: b => b.valores.total, orden: b => b.valores.total, tipo: 'moneda', clase: 'table-success' },
    { key: 'factura', label: 'Factura', valor: b => this.comprobante(b), orden: b => this.comprobante(b) },
    {
      key: 'fechaFactura', label: 'Fecha fact.',
      valor: b => (b.factura ? fechaComprobanteLegible(b.factura.fecha) : ''),
      orden: b => b.factura?.fecha ?? '',
    },
    {
      key: 'cobrado', label: 'Cobrado',
      valor: b => b.valoresFinancieros?.totalCobrado ?? 0,
      orden: b => b.valoresFinancieros?.totalCobrado ?? 0,
      tipo: 'moneda',
    },
    {
      key: 'validacion', label: 'Validación',
      valor: b => this.textoValidacion(b),
      orden: b => this.textoValidacion(b),
      clase: b => (this.textoValidacion(b) === 'OK' ? 'text-success' : 'text-danger fw-semibold'),
    },
  ];

  readonly acciones: AccionListado<Fila>[] = [
    { id: 'ver', label: 'Ver' },
    { id: 'pdf', label: 'PDF', clase: 'btn-outline-secondary', permiso: 'facturacion.reimprimir' },
    { id: 'excel', label: 'Excel', clase: 'btn-outline-secondary', permiso: 'facturacion.reimprimir' },
    {
      id: 'verFactura', label: 'Ver factura', clase: 'btn-outline-success', permiso: 'facturacion.verFactura',
      visible: b => !!b.facturaUrl,
    },
    {
      id: 'desvincular', label: 'Desvincular', clase: 'btn-outline-danger', permiso: 'facturacion.desvincular',
      // D3: no se desvincula la factura de un informe con algo cobrado/pagado.
      deshabilitada: b => (b.valoresFinancieros?.totalCobrado ?? 0) !== 0,
    },
  ];

  constructor(
    private modalService: NgbModal,
    private consulta: InformeLiqConsultaService,
    private factory: InformeLiqFactoryService,
    private informeLiqServ: InformeLiqService,
    private exportServ: LiquidacionExportService,
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
      this.facturados = await this.consulta.consultarPorPeriodo(['facturado'], this.desde, this.hasta);
      this.aplicarFiltros();
    } catch (e: any) {
      Swal.fire({ icon: 'error', text: `No se pudieron consultar los informes facturados: ${e?.message ?? e}` });
    } finally {
      this.cargando = false;
    }
  }

  /** Filtro en memoria: tipo + texto sobre entidad, número interno o
   *  número de factura. */
  aplicarFiltros(): void {
    const texto = this.searchText.trim().toLowerCase();
    this.filtrados = this.facturados.filter(b =>
      (this.filtroTipo === 'todos' || b.tipo === this.filtroTipo) &&
      (!texto ||
        this.nombre(b).toLowerCase().includes(texto) ||
        (b.numeroInterno ?? '').toLowerCase().includes(texto) ||
        this.comprobante(b).toLowerCase().includes(texto)),
    );
  }

  onAccion(e: EventoAccionListado<Fila>): void {
    switch (e.id) {
      case 'ver': this.verDetalle(e.item); break;
      case 'pdf':
      case 'excel': this.descargar(e.item, e.id); break;
      case 'verFactura': this.verFactura(e.item); break;
      case 'desvincular': this.desvincular(e.item); break;
    }
  }

  private nombre(b: InformeLiqNuevo): string {
    return nombreEntidadRef(b.entidad);
  }

  private comprobante(b: InformeLiqNuevo): string {
    const f = b.factura;
    return f ? `${descripcionTipoComprobante(f.tipoComprobante)} ${numeroComprobante(f)}` : '';
  }

  private textoValidacion(b: InformeLiqNuevo): string {
    if (!b.factura) return 'Sin factura';
    const d = listarDiscrepancias(b.factura.validacion);
    return d.length > 0 ? `Discrepancia: ${d.join(', ')}` : 'OK';
  }

  private clave(fecha: Date): string {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
  }

  /** Descarga directa (acciones PDF / Excel), sin confirmación. Log
   *  REIMPRIMIR (documento con número) en LiquidacionExportService. */
  private async descargar(b: Fila, formato: 'excel' | 'pdf'): Promise<void> {
    this.procesando = true;
    try {
      await this.exportServ.descargar(b, formato);
    } catch (e: any) {
      Swal.fire({ icon: 'error', text: `No se pudo generar el archivo: ${e?.message ?? e}` });
    } finally {
      this.procesando = false;
    }
  }

  private verDetalle(b: Fila): void {
    const modalRef = this.modalService.open(InformeLiqNuevoDetalleComponent, {
      size: 'xl', centered: true, scrollable: true, backdrop: 'static',
    });
    modalRef.componentInstance.idInfLiq = b.idInfLiq;
    modalRef.componentInstance.modulo = 'facturacion';
    modalRef.result.catch(() => {});
  }

  /** Sin awaits antes de abrirUrlEnPestana: la pestaña tiene que abrirse
   *  dentro del click (ver el util). */
  private verFactura(b: Fila): void {
    const path = b.facturaUrl;
    if (!path) return;
    abrirUrlEnPestana(() => this.informeLiqServ.obtenerUrlFactura(path))
      .catch((e: any) => Swal.fire({ icon: 'error', text: `No se pudo abrir la factura: ${e?.message ?? e}` }));
  }

  /** Desvincular: pide el motivo (obligatorio) y delega en
   *  InformeLiqService.desvincularFactura (valida fresco en una
   *  transacción). Listado one-shot: si sale bien, se vuelve a consultar. */
  private async desvincular(b: Fila): Promise<void> {
    const r = await Swal.fire({
      title: `¿Desvincular la factura de la liquidación ${b.numeroInterno}?`,
      html:
        `<p><b>${this.comprobante(b)}</b> — ${this.nombre(b)}</p>` +
        `<p>La liquidación vuelve a <b>Emitidos</b> (pendiente de facturar) y el comprobante queda libre ` +
        `para vincularse de nuevo. El PDF no se borra: queda guardado y referenciado en el log.</p>`,
      input: 'textarea',
      inputLabel: 'Motivo de la desvinculación',
      inputPlaceholder: 'Obligatorio',
      inputValidator: (v: string) => (!v || !v.trim() ? 'El motivo es obligatorio.' : null),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Desvincular',
      cancelButtonText: 'Cancelar',
    });
    if (!r.isConfirmed) return;

    this.procesando = true;
    let exito = false;
    try {
      const res = await this.informeLiqServ.desvincularFactura(b.idInfLiq, r.value as string);
      exito = res.exito;
      Swal.fire({ icon: res.exito ? 'success' : 'error', text: res.mensaje });
    } finally {
      this.procesando = false;
    }
    if (exito) await this.consultar();
  }
}
