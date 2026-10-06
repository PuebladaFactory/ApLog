import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject, Subject, switchMap, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { EstadoMovimientoFin, MovimientoFin, TipoMovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { AccionListado, ColumnaListado, EventoAccionListado, OrdenListado } from 'src/app/interfaces/tabla-listado';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { FinanzasConsultaService } from 'src/app/servicios/finanzas-nueva/finanzas-consulta.service';
import { MovimientoFinService } from 'src/app/servicios/finanzas-nueva/movimiento-fin.service';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import {
  ETIQUETA_CONCEPTO, ETIQUETA_MOTIVO_AJUSTE, ETIQUETA_TIPO_MOVIMIENTO, FiltrosMovimientosFin,
  TotalesMovimientos, filtrarMovimientos, resumenMedios, totalizarMovimientos, validarRangoMovimientos,
} from 'src/app/shared/utils/movimiento-fin.util';
import { DetalleMovimientoComponent } from '../modales/detalle-movimiento/detalle-movimiento.component';
import { ImputarSaldoComponent } from '../modales/imputar-saldo/imputar-saldo.component';

type Fila = ConId<MovimientoFin>;

/** Finanzas → Movimientos: historial de cobros, pagos y ajustes
 *  (`movimientosFin`), en vivo. La consulta es por rango de `fecha` (índice
 *  simple); tipo, estado y texto se filtran en memoria. Filtros recordados
 *  en la sesión (FinanzasConsultaService.filtrosMovimientos).
 *  Acciones: ver (DetalleMovimientoComponent), imputar el saldo sin imputar
 *  a comprobantes (ImputarSaldoComponent → MovimientoFinService.imputarSaldo,
 *  finanzas.editar) y anular (MovimientoFinService.anular, motivo
 *  obligatorio, finanzas.anular). Orden inicial: fecha descendente (es un
 *  historial, no un listado de entidades). */
@Component({
  selector: 'app-finanzas-movimientos',
  standalone: false,
  templateUrl: './finanzas-movimientos.component.html',
  styleUrl: './finanzas-movimientos.component.scss',
})
export class FinanzasMovimientosComponent implements OnInit, OnDestroy {

  movimientos: Fila[] = [];
  filtrados: Fila[] = [];
  totales: TotalesMovimientos = totalizarMovimientos([]);
  cargando = true;
  procesando = false;
  error: string | null = null;
  errorRango: string | null = null;

  /** Valores de los inputs de fecha (pasan a los filtros solo si el rango es válido). */
  desde = '';
  hasta = '';

  readonly hoy = toISODateString(new Date());
  readonly ordenInicial: OrdenListado = { key: 'fecha', asc: false };
  readonly trackMovimiento = (m: Fila) => m.idMovimiento;

  readonly acciones: AccionListado<Fila>[] = [
    { id: 'ver', label: 'Ver', clase: 'btn-outline-primary' },
    {
      id: 'imputar', label: 'Imputar', clase: 'btn-outline-success', permiso: 'finanzas.editar',
      visible: m => m.estado === 'vigente' && m.tipo !== 'ajuste' && m.sinImputar > 0,
    },
    {
      id: 'anular', label: 'Anular', clase: 'btn-outline-danger', permiso: 'finanzas.anular',
      visible: m => m.estado === 'vigente',
      deshabilitada: m => m.imputaciones.some(i => i.origen === 'compensacion'),
    },
  ];

  readonly columnas: ColumnaListado<Fila>[] = this.armarColumnas();

  private rango$!: BehaviorSubject<{ desde: string; hasta: string }>;
  private destroy$ = new Subject<void>();

  constructor(
    private consulta: FinanzasConsultaService,
    private movimientoServ: MovimientoFinService,
    private modalService: NgbModal,
  ) {}

  get filtros(): FiltrosMovimientosFin {
    return this.consulta.filtrosMovimientos;
  }

  ngOnInit(): void {
    this.desde = this.filtros.desde;
    this.hasta = this.filtros.hasta;
    this.rango$ = new BehaviorSubject({ desde: this.filtros.desde, hasta: this.filtros.hasta });
    this.rango$
      .pipe(
        switchMap(r => {
          this.cargando = true;
          return this.consulta.observarMovimientosPorFecha(r.desde, r.hasta);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: movimientos => {
          this.movimientos = movimientos;
          this.aplicarFiltros();
          this.cargando = false;
        },
        error: e => {
          console.error('Error al leer los movimientos de Finanzas', e);
          this.error = `No se pudieron leer los movimientos: ${e?.message ?? e}`;
          this.cargando = false;
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Cambio de una fecha: si el rango es válido, lo recuerda y relanza la
   *  consulta; si no, muestra el error y deja la consulta anterior. */
  onRango(): void {
    this.errorRango = validarRangoMovimientos(this.desde, this.hasta);
    if (this.errorRango) return;
    if (this.desde === this.filtros.desde && this.hasta === this.filtros.hasta) return;
    this.filtros.desde = this.desde;
    this.filtros.hasta = this.hasta;
    this.rango$.next({ desde: this.desde, hasta: this.hasta });
  }

  onTipo(tipo: TipoMovimientoFin | 'todos'): void {
    this.filtros.tipo = tipo;
    this.aplicarFiltros();
  }

  onEstado(estado: EstadoMovimientoFin | 'todos'): void {
    this.filtros.estado = estado;
    this.aplicarFiltros();
  }

  onTexto(texto: string): void {
    this.filtros.texto = texto;
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    this.filtrados = filtrarMovimientos(this.movimientos, this.filtros);
    this.totales = totalizarMovimientos(this.filtrados);
  }

  onAccion(ev: EventoAccionListado<Fila>): void {
    if (ev.id === 'ver') this.verDetalle(ev.item);
    else if (ev.id === 'imputar') this.abrirImputar(ev.item);
    else if (ev.id === 'anular') this.anular(ev.item);
  }

  /** Detalle en modal. Si se cierra con 'anular' o 'imputar', sigue el
   *  mismo flujo que la acción de la fila. */
  verDetalle(m: Fila): void {
    const modalRef = this.modalService.open(DetalleMovimientoComponent, {
      size: 'xl', centered: true, scrollable: true,
    });
    modalRef.componentInstance.movimiento = m;
    modalRef.result
      .then(resultado => {
        if (resultado === 'anular') this.anular(m);
        else if (resultado === 'imputar') this.abrirImputar(m);
      })
      .catch(() => {});
  }

  /** Imputar el saldo sin imputar a comprobantes de la entidad. La tabla se
   *  actualiza sola por el listener. */
  abrirImputar(m: Fila): void {
    const modalRef = this.modalService.open(ImputarSaldoComponent, {
      size: 'xl', centered: true, scrollable: true, backdrop: 'static', keyboard: false,
    });
    modalRef.componentInstance.movimiento = m;
    modalRef.result.catch(() => {});
  }

  /** Pide el motivo (obligatorio) y delega en MovimientoFinService.anular,
   *  que revalida todo en su transacción. Sin refresco manual: el listener
   *  trae el cambio de estado. */
  async anular(m: Fila): Promise<void> {
    const tipo = ETIQUETA_TIPO_MOVIMIENTO[m.tipo].toLowerCase();
    const comprobantes = new Set(m.imputaciones.map(i => i.documento.id)).size;
    const r = await Swal.fire({
      title: `¿Anular el ${tipo} ${m.numero}?`,
      html:
        `<p><b>${m.entidad.razonSocial}</b> — $ ${this.importe(m.total)} — ${fechaComprobanteLegible(m.fecha)}</p>` +
        (comprobantes > 0
          ? `<p>Los ${comprobantes} comprobante(s) imputados recuperan el saldo que canceló este ${tipo}.</p>`
          : '') +
        (m.sinImputar > 0
          ? `<p>Los $ ${this.importe(m.sinImputar)} sin imputar dejan de estar disponibles.</p>`
          : '') +
        `<p>El movimiento queda <b>anulado</b> con su número. No se puede deshacer.</p>`,
      input: 'textarea',
      inputLabel: 'Motivo de la anulación',
      inputPlaceholder: 'Obligatorio',
      inputValidator: (v: string) => (!v || !v.trim() ? 'El motivo es obligatorio.' : null),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Anular',
      cancelButtonText: 'Cancelar',
    });
    if (!r.isConfirmed) return;

    this.procesando = true;
    try {
      const res = await this.movimientoServ.anular(m.idMovimiento, r.value as string);
      Swal.fire({ icon: res.exito ? 'success' : 'error', text: res.mensaje });
    } finally {
      this.procesando = false;
    }
  }

  private importe(valor: number): string {
    return valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private armarColumnas(): ColumnaListado<Fila>[] {
    const tachado = (m: Fila) => (m.estado === 'anulado' ? 'text-decoration-line-through text-muted' : '');
    return [
      {
        key: 'fecha', label: 'Fecha', valor: m => fechaComprobanteLegible(m.fecha),
        orden: m => `${m.fecha}|${m.fechaRegistro}`, align: 'center',
      },
      { key: 'numero', label: 'Número', valor: m => m.numero, orden: m => m.numero, clase: tachado },
      { key: 'tipo', label: 'Tipo', valor: m => ETIQUETA_TIPO_MOVIMIENTO[m.tipo], orden: m => m.tipo },
      {
        key: 'concepto', label: 'Concepto',
        valor: m => (m.tipo === 'ajuste'
          ? (m.motivoAjuste ? ETIQUETA_MOTIVO_AJUSTE[m.motivoAjuste] : '—')
          : ETIQUETA_CONCEPTO[m.concepto]),
        orden: m => m.concepto,
      },
      { key: 'entidad', label: 'Entidad', valor: m => m.entidad.razonSocial, orden: m => m.entidad.razonSocial },
      {
        key: 'tipoEntidad', label: 'Tipo entidad', valor: m => m.entidad.tipo, orden: m => m.entidad.tipo,
        clase: 'text-capitalize',
      },
      { key: 'medios', label: 'Medios', valor: m => resumenMedios(m.medios) },
      {
        key: 'total', label: 'Total', valor: m => m.total, orden: m => m.total, tipo: 'moneda',
        clase: tachado,
      },
      { key: 'imputado', label: 'Imputado', valor: m => m.totalImputado, orden: m => m.totalImputado, tipo: 'moneda' },
      {
        key: 'sinImputar', label: 'Sin imputar', valor: m => m.sinImputar, orden: m => m.sinImputar, tipo: 'moneda',
        clase: m => (m.estado === 'vigente' && m.sinImputar > 0 ? 'text-warning fw-bold' : ''),
      },
      {
        key: 'estado', label: 'Estado', valor: m => (m.estado === 'anulado' ? 'Anulado' : 'Vigente'),
        orden: m => m.estado, align: 'center',
        clase: m => (m.estado === 'anulado' ? 'text-danger fw-bold' : ''),
      },
    ];
  }
}
