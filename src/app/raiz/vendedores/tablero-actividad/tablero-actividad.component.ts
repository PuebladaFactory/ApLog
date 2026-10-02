import { Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatest, Subject, switchMap, takeUntil } from 'rxjs';
import { ComisionVentaConsultaService } from 'src/app/servicios/vendedores/comision-venta-consulta.service';
import { VendedorService } from 'src/app/servicios/vendedores/vendedor.service';
import { LiquidacionVentaService } from 'src/app/servicios/vendedores/liquidacion-venta.service';
import { PermisosService } from 'src/app/servicios/permisos/permisos.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import Swal from 'sweetalert2';
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
 *  liquidar) con detalle por cliente y operación, y Liquidar por vendedor.
 *  Muestra también, en cero, a los vendedores activos con clientes
 *  asignados. El mes elegido se recuerda durante la sesión
 *  (ComisionVentaConsultaService.mesTablero). Excel/PDF en V7. */
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
    private liquidacionService: LiquidacionVentaService,
    private permisos: PermisosService,
    private clienteService: ClienteService,
  ) {
    const hoy = new Date();
    this.mes = this.consulta.mesTablero
      ?? `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    this.periodo$ = new BehaviorSubject<number>(periodoDeFecha(`${this.mes}-01`).periodo);
  }

  ngOnInit(): void {
    const tablero$ = this.periodo$.pipe(switchMap(p => this.consulta.observarTablero(p)));
    // vendedores$ y clientes$: nombres, estado y asignaciones (vendedores en cero).
    combineLatest([tablero$, this.vendedorService.vendedores$, this.clienteService.clientes$])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([tablero]) => {
          this.tablero = tablero;
          this.vendedores = this.conVendedoresEnCero(tablero.vendedores)
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

  /** Suma, con valores en 0, a los vendedores ACTIVOS con al menos un
   *  cliente asignado que no tienen comisiones ni saldo en el tablero. */
  private conVendedoresEnCero(conDatos: VendedorTableroComision[]): VendedorTableroComision[] {
    const presentes = new Set(conDatos.map(v => v.idVendedor));
    const enCero: VendedorTableroComision[] = this.vendedorService.getVendedoresActuales()
      .filter(v => v.activo && !presentes.has(v.id) && this.vendedorService.asignacionesDe(v.id).length > 0)
      .map(v => ({
        idVendedor: v.id,
        clientes: [],
        cantidadOps: 0,
        comisionesMes: 0,
        liquidadoMes: 0,
        arrastre: 0,
        saldoALiquidar: 0,
      }));
    return [...conDatos, ...enCero];
  }

  get tituloMes(): string {
    const [anio, mes] = this.mes.split('-').map(Number);
    return `${MESES[mes - 1]} ${anio}`;
  }

  cambiarMes(valor: string): void {
    if (!/^\d{4}-\d{2}$/.test(valor ?? '') || valor === this.mes) return;
    this.mes = valor;
    this.consulta.mesTablero = valor;
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

  get puedeLiquidar(): boolean {
    return this.permisos.puede('vendedores', 'editar');
  }

  /** Emite la liquidación del vendedor con todo su saldo hasta fin del mes
   *  mostrado. El servicio relee y aborta si el saldo cambió. */
  async liquidar(v: VendedorTableroComision): Promise<void> {
    if (!this.tablero || Math.abs(v.saldoALiquidar) < 0.01) return;
    const cantidad = v.clientes.reduce((acc, cl) => acc + cl.lineas.filter(l => Math.abs(l.saldo) >= 0.01).length, 0);
    const total = v.saldoALiquidar.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
    const negativo = v.saldoALiquidar < 0
      ? '<br><b>El total es negativo:</b> son ajustes a descontar al vendedor.'
      : '';
    const res = await Swal.fire({
      title: `¿Liquidar a ${this.nombre(v.idVendedor)}?`,
      html: `Todo el saldo pendiente hasta fin de ${this.tituloMes}:<br>` +
        `<b>${total}</b> (${cantidad} comisiones).${negativo}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Liquidar',
      cancelButtonText: 'Cancelar',
    });
    if (!res.isConfirmed) return;

    this.cargando = true;
    const r = await this.liquidacionService.emitir(v.idVendedor, this.tablero.periodo, v.saldoALiquidar);
    this.cargando = false;
    if (r.exito) {
      Swal.fire('Liquidación emitida', `${r.mensaje} Se puede ver, pagar o anular desde el Historial.`, 'success');
    } else {
      Swal.fire('No se pudo liquidar', r.mensaje, 'error');
    }
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
