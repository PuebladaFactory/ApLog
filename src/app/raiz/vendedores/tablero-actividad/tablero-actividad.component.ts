import { Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatest, Subject, switchMap, takeUntil } from 'rxjs';
import { ComisionVentaConsultaService } from 'src/app/servicios/vendedores/comision-venta-consulta.service';
import { VendedorService } from 'src/app/servicios/vendedores/vendedor.service';
import { periodoDeFecha } from 'src/app/shared/utils/periodo.util';
import {
  EstadoLineaComision,
  TableroComisiones,
  VendedorTableroComision,
} from 'src/app/shared/utils/tablero-comisiones.util';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
  'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** Tablero de comisiones del mes (Frente Vendedores): resumen por vendedor
 *  (comisiones del mes, liquidado, arrastre de meses anteriores y saldo a
 *  liquidar) con detalle por cliente y operación. Solo lectura en este
 *  bloque; Liquidar se suma en V6 y Excel/PDF en V7. */
@Component({
  selector: 'app-tablero-actividad',
  standalone: false,
  templateUrl: './tablero-actividad.component.html',
  styleUrl: './tablero-actividad.component.scss',
})
export class TableroActividadComponent implements OnInit, OnDestroy {

  mes: string;                    // 'YYYY-MM'
  tablero: TableroComisiones | null = null;
  vendedores: VendedorTableroComision[] = [];
  expandidos = new Set<string>();
  cargando = true;
  error = '';

  private periodo$: BehaviorSubject<number>;
  private destroy$ = new Subject<void>();

  constructor(
    private consulta: ComisionVentaConsultaService,
    private vendedorService: VendedorService,
  ) {
    const hoy = new Date();
    this.mes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    this.periodo$ = new BehaviorSubject<number>(periodoDeFecha(`${this.mes}-01`).periodo);
  }

  ngOnInit(): void {
    const tablero$ = this.periodo$.pipe(switchMap(p => this.consulta.observarTablero(p)));
    combineLatest([tablero$, this.vendedorService.vendedores$])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([tablero]) => {
          this.tablero = tablero;
          this.vendedores = [...tablero.vendedores]
            .sort((a, b) => this.nombre(a.idVendedor).localeCompare(this.nombre(b.idVendedor)));
          this.cargando = false;
          this.error = '';
        },
        error: (e: any) => {
          this.cargando = false;
          this.error = `No se pudieron leer las comisiones: ${e?.message ?? e}`;
        },
      });
  }

  get tituloMes(): string {
    const [anio, mes] = this.mes.split('-').map(Number);
    return `${MESES[mes - 1]} ${anio}`;
  }

  cambiarMes(valor: string): void {
    if (!/^\d{4}-\d{2}$/.test(valor ?? '') || valor === this.mes) return;
    this.mes = valor;
    this.expandidos.clear();
    this.cargando = true;
    this.periodo$.next(periodoDeFecha(`${valor}-01`).periodo);
  }

  desplazarMes(delta: number): void {
    const [anio, mes] = this.mes.split('-').map(Number);
    const total = anio * 12 + (mes - 1) + delta;
    const nuevoAnio = Math.floor(total / 12);
    const nuevoMes = (total % 12) + 1;
    this.cambiarMes(`${nuevoAnio}-${String(nuevoMes).padStart(2, '0')}`);
  }

  nombre(idVendedor: string): string {
    const v = this.vendedorService.getVendedorPorId(idVendedor);
    return v ? this.vendedorService.nombre(v) : `Vendedor ${idVendedor}`;
  }

  esInactivo(idVendedor: string): boolean {
    return this.vendedorService.getVendedorPorId(idVendedor)?.activo === false;
  }

  toggle(idVendedor: string): void {
    if (this.expandidos.has(idVendedor)) this.expandidos.delete(idVendedor);
    else this.expandidos.add(idVendedor);
  }

  claseEstado(estado: EstadoLineaComision): string {
    switch (estado) {
      case 'pendiente': return 'bg-warning text-dark';
      case 'liquidada': return 'bg-success';
      case 'ajuste': return 'bg-info text-dark';
      case 'anulada': return 'bg-secondary';
    }
  }

  etiquetaEstado(estado: EstadoLineaComision): string {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'liquidada': return 'Liquidada';
      case 'ajuste': return 'Ajuste';
      case 'anulada': return 'Anulada';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
