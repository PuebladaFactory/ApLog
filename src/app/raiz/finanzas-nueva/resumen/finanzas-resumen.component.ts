import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Subject, combineLatest, map, switchMap, takeUntil } from 'rxjs';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { FinanzasConsultaService } from 'src/app/servicios/finanzas-nueva/finanzas-consulta.service';
import {
  CLASE_ESTADO_ANTIGUEDAD, CuentaEntidadFin, EstadoAntiguedad, LadoCuenta, TotalesCuentas, UMBRALES_ANTIGUEDAD,
  armarCuentas, estadoCuenta, etiquetaEstadoAntiguedad, marcaCriticas, topVencidos, totalizarCuentas,
} from 'src/app/shared/utils/cuentas-finanzas.util';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import {
  AlertaFinanzas, EvolucionMes, FlujoMes, MESES_EVOLUCION, armarAlertas, armarEvolucion, flujoDelMes,
  mesDe, mesesHasta, nombreMes, nombreMesCorto, rangoDeMeses, sumarMeses,
} from 'src/app/shared/utils/resumen-finanzas.util';

/** Barra del gráfico de evolución (alto en % del máximo del gráfico). */
interface BarraEvolucion {
  mes: string;
  etiqueta: string;
  facturado: number;
  movido: number;            // cobrado (A cobrar) / pagado (A pagar)
  altoFacturado: number;
  altoMovido: number;
  tituloFacturado: string;     // tooltip
  tituloMovido: string;
}

function pesos(v: number): string {
  return `$ ${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Finanzas → Resumen (F6b, pestaña inicial): tablero de lectura.
 *  - Posición A cobrar / A pagar (mismo cálculo que Cuentas).
 *  - Flujo del mes elegido (F42, recordado en la sesión).
 *  - Top 5 por saldo vencido de cada lado, con estado (F47).
 *  - Alertas (saldo a favor para imputar, anticipos viejos, emitido sin
 *    facturar).
 *  - Evolución de los 6 meses que terminan en el mes elegido (F41):
 *    facturado vs cobrado / pagado, barras CSS + tabla.
 *  Lecturas: informes abiertos + movimientos con saldo (como Cuentas) y, por
 *  mes elegido, movimientos y facturados del rango de 6 meses. */
@Component({
  selector: 'app-finanzas-resumen',
  standalone: false,
  templateUrl: './finanzas-resumen.component.html',
  styleUrl: './finanzas-resumen.component.scss',
})
export class FinanzasResumenComponent implements OnInit, OnDestroy {

  readonly hoy = toISODateString(new Date());
  readonly hoyLegible = fechaComprobanteLegible(this.hoy);
  readonly mesActual = mesDe(this.hoy);
  readonly umbrales = UMBRALES_ANTIGUEDAD;

  totalesCobrar: TotalesCuentas = totalizarCuentas([]);
  totalesPagar: TotalesCuentas = totalizarCuentas([]);
  topCobrar: CuentaEntidadFin[] = [];
  topPagar: CuentaEntidadFin[] = [];
  alertas: AlertaFinanzas[] = [];
  flujo: FlujoMes | null = null;
  evolucion: EvolucionMes[] = [];
  barrasCobrar: BarraEvolucion[] = [];
  barrasPagar: BarraEvolucion[] = [];

  cargandoBase = true;
  cargandoMes = true;
  error: string | null = null;

  private mes$!: BehaviorSubject<string>;
  private destroy$ = new Subject<void>();

  constructor(
    private consulta: FinanzasConsultaService,
    private router: Router,
  ) {}

  get mes(): string {
    return this.consulta.filtrosResumen.mes;
  }

  get nombreMesElegido(): string {
    return nombreMes(this.mes);
  }

  get esMesActual(): boolean {
    return this.mes >= this.mesActual;
  }

  /** Nos deben − les debemos (facturado abierto neto de saldos a favor). */
  get posicionNeta(): number {
    return Math.round((this.totalesCobrar.neto - this.totalesPagar.neto) * 100) / 100;
  }

  ngOnInit(): void {
    this.consulta.observarBaseCuentas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ informes, movimientos }) => {
          const cuentas = armarCuentas(informes, movimientos, this.hoy);
          this.totalesCobrar = totalizarCuentas(cuentas.filter(c => c.lado === 'cobrar' && this.tieneAlgo(c)));
          this.totalesPagar = totalizarCuentas(cuentas.filter(c => c.lado === 'pagar' && this.tieneAlgo(c)));
          this.topCobrar = topVencidos(cuentas, 'cobrar');
          this.topPagar = topVencidos(cuentas, 'pagar');
          this.alertas = armarAlertas(cuentas, informes, movimientos, this.hoy);
          this.cargandoBase = false;
        },
        error: e => this.fallo(e),
      });

    this.mes$ = new BehaviorSubject<string>(this.mes);
    this.mes$
      .pipe(
        switchMap(mes => {
          this.cargandoMes = true;
          const meses = mesesHasta(mes, MESES_EVOLUCION);
          const rango = rangoDeMeses(meses[0], meses[meses.length - 1]);
          return combineLatest([
            this.consulta.observarMovimientosPorFecha(rango.desde, rango.hasta),
            this.consulta.observarFacturadosPorFechaFactura(rango.desde, rango.hasta),
          ]).pipe(
            // el mes viaja con los datos; si cambia en el medio, switchMap corta el listener viejo
            map(([movimientos, facturados]) => ({ mes, meses, movimientos, facturados })),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: ({ mes, meses, movimientos, facturados }) => {
          this.flujo = flujoDelMes(movimientos, mes);
          this.evolucion = armarEvolucion(meses, facturados, movimientos);
          this.barrasCobrar = this.armarBarras('cobrar');
          this.barrasPagar = this.armarBarras('pagar');
          this.cargandoMes = false;
        },
        error: e => this.fallo(e),
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Mes anterior / siguiente (no pasa del mes actual). */
  moverMes(delta: number): void {
    const nuevo = sumarMeses(this.mes, delta);
    if (nuevo > this.mesActual) return;
    this.cambiarMes(nuevo);
  }

  irAlMesActual(): void {
    this.cambiarMes(this.mesActual);
  }

  estadoDe(c: CuentaEntidadFin): { texto: string; clase: string } {
    const e: EstadoAntiguedad | null = estadoCuenta(c);
    if (!e) return { texto: '—', clase: '' };
    return { texto: etiquetaEstadoAntiguedad(e, c.lado), clase: CLASE_ESTADO_ANTIGUEDAD[e] };
  }

  marca(c: CuentaEntidadFin): string {
    return marcaCriticas(c);
  }

  nombreCorto(mes: string): string {
    return nombreMesCorto(mes);
  }

  verCuenta(tipo: CuentaEntidadFin['tipo'], idEntidad: string): void {
    this.router.navigate(['/finanzasNueva/cuenta', tipo, idEntidad], { queryParams: { origen: 'resumen' } });
  }

  trackMes = (_: number, b: { mes: string }) => b.mes;

  private cambiarMes(mes: string): void {
    if (mes === this.mes) return;
    this.consulta.filtrosResumen.mes = mes;
    this.mes$.next(mes);
  }

  /** Cuentas que suman en la posición: algo facturado, sin facturar o a favor. */
  private tieneAlgo(c: CuentaEntidadFin): boolean {
    return c.saldoFacturado > 0 || c.sinFacturar > 0 || c.saldoAFavor > 0;
  }

  private armarBarras(lado: LadoCuenta): BarraEvolucion[] {
    const movido = lado === 'cobrar' ? 'Cobrado' : 'Pagado';
    const filas = this.evolucion.map(e => ({
      mes: e.mes,
      facturado: lado === 'cobrar' ? e.facturadoCobrar : e.facturadoPagar,
      movido: lado === 'cobrar' ? e.cobrado : e.pagado,
    }));
    const max = Math.max(0, ...filas.map(f => Math.max(f.facturado, f.movido)));
    const alto = (v: number) => (max > 0 ? Math.round((v / max) * 1000) / 10 : 0);
    return filas.map(f => ({
      ...f,
      etiqueta: nombreMesCorto(f.mes),
      altoFacturado: alto(f.facturado),
      altoMovido: alto(f.movido),
      tituloFacturado: `${nombreMesCorto(f.mes)} · Facturado: ${pesos(f.facturado)}`,
      tituloMovido: `${nombreMesCorto(f.mes)} · ${movido}: ${pesos(f.movido)}`,
    }));
  }

  private fallo(e: any): void {
    console.error('Error al leer el resumen de Finanzas', e);
    this.error = `No se pudo leer el resumen: ${e?.message ?? e}`;
    this.cargandoBase = false;
    this.cargandoMes = false;
  }
}
