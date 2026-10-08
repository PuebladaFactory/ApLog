import { Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FinanzasExportService, FormatoExportacionFin } from 'src/app/servicios/finanzas-nueva/finanzas-export.service';
import { TablaListadoComponent } from 'src/app/shared/tabla/tabla-listado/tabla-listado.component';
import { armarLibroMovimientos } from 'src/app/shared/utils/exportacion-finanzas.util';
import { BehaviorSubject, Subject, switchMap, takeUntil } from 'rxjs';
import { EstadoMovimientoFin, TipoMovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { EventoAccionListado, OrdenListado } from 'src/app/interfaces/tabla-listado';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { FinanzasConsultaService } from 'src/app/servicios/finanzas-nueva/finanzas-consulta.service';
import {
  FiltrosMovimientosFin, TotalesMovimientos, filtrarMovimientos, totalizarMovimientos, validarRangoMovimientos,
} from 'src/app/shared/utils/movimiento-fin.util';
import { AccionesMovimientoService } from '../acciones-movimiento.service';
import { FilaMovimiento, accionesMovimientos, columnasMovimientos } from '../listado-movimientos';

type Fila = FilaMovimiento;

/** Finanzas → Movimientos: historial de cobros, pagos y ajustes
 *  (`movimientosFin`), en vivo. La consulta es por rango de `fecha` (índice
 *  simple); tipo, estado y texto se filtran en memoria. Filtros recordados
 *  en la sesión (FinanzasConsultaService.filtrosMovimientos).
 *  Columnas y acciones: listado-movimientos (compartido con la Cuenta de la
 *  entidad); los gestos (ver, imputar, anular) viven en
 *  AccionesMovimientoService. Orden inicial: fecha descendente (es un
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
  readonly acciones = accionesMovimientos();
  readonly columnas = columnasMovimientos({ conEntidad: true });

  private rango$!: BehaviorSubject<{ desde: string; hasta: string }>;
  /** La tabla: de ahí salen las filas EN EL ORDEN que se ve (F57). */
  @ViewChild(TablaListadoComponent) tabla?: TablaListadoComponent<Fila>;
  exportando = false;
  private exportServ = inject(FinanzasExportService);

  private destroy$ = new Subject<void>();

  constructor(
    private consulta: FinanzasConsultaService,
    private accionesMov: AccionesMovimientoService,
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

  /** Excel / PDF de lo que muestra la tabla (rango, filtros y orden; F8a). */
  async exportar(formato: FormatoExportacionFin): Promise<void> {
    if (this.exportando) return;
    this.exportando = true;
    try {
      const filas = this.tabla?.filas ?? this.filtrados;
      await this.exportServ.descargar(armarLibroMovimientos(filas, this.filtros, this.hoy), formato);
    } catch (e: any) {
      console.error('Error al exportar Movimientos', e);
      this.error = `No se pudo exportar: ${e?.message ?? e}`;
    } finally {
      this.exportando = false;
    }
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
    const alProcesar = (p: boolean) => (this.procesando = p);
    if (ev.id === 'ver') this.accionesMov.verDetalle(ev.item, alProcesar);
    else if (ev.id === 'imputar') this.accionesMov.imputar(ev.item);
    else if (ev.id === 'saldo') this.accionesMov.saldo(ev.item);
    else if (ev.id === 'anular') this.accionesMov.anular(ev.item, alProcesar);
  }
}
