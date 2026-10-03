import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject, combineLatest, Subject, switchMap, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { Resultado } from 'src/app/interfaces/resultado';
import { VendedorNuevo } from 'src/app/interfaces/vendedor-nuevo';
import { EstadoLiquidacionVenta, LiquidacionVenta } from 'src/app/interfaces/liquidacion-venta';
import { LiquidacionVentaService } from 'src/app/servicios/vendedores/liquidacion-venta.service';
import { VendedorService } from 'src/app/servicios/vendedores/vendedor.service';
import { PermisosService } from 'src/app/servicios/permisos/permisos.service';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { redondear2 } from 'src/app/shared/utils/tablero-comisiones.util';
import {
  claseEstadoLiquidacion,
  etiquetaEstadoLiquidacion,
  fechaDMY,
  mesCorteLiquidacion,
  mesDesplazado,
  nombreVendedorLiquidacion,
  periodoDeMes,
} from 'src/app/shared/utils/liquidacion-venta-vista.util';
import { LiquidacionVentaDetalleComponent } from '../liquidacion-venta-detalle/liquidacion-venta-detalle.component';
import { ComisionesExportService } from 'src/app/servicios/vendedores/comisiones-export.service';

type FiltroEstado = EstadoLiquidacionVenta | 'todos';

/** Historial de liquidaciones de comisiones (Frente Vendedores), colección
 *  `liquidacionesVenta`. Consulta en vivo por mes de corte (Desde/Hasta) y
 *  filtra en memoria por vendedor y estado. Acciones (dev/admin): Pagar,
 *  Revertir pago y Anular, vía LiquidacionVentaService. Detalle en modal.
 *  Los filtros se recuerdan durante la sesión (filtrosHistorial). */
@Component({
  selector: 'app-vendedor-historial',
  standalone: false,
  templateUrl: './vendedor-historial.component.html',
  styleUrl: './vendedor-historial.component.scss',
})
export class VendedorHistorialComponent implements OnInit, OnDestroy {

  desde: string;                  // 'YYYY-MM' (mes de corte)
  hasta: string;
  idVendedor = 'todos';
  estado: FiltroEstado = 'todos';

  liquidaciones: ConId<LiquidacionVenta>[] = [];   // las del rango
  visibles: ConId<LiquidacionVenta>[] = [];        // tras vendedor/estado
  opcionesVendedor: { id: string; nombre: string }[] = [];
  totalSinAnuladas = 0;
  totalEmitidas = 0;

  cargando = true;
  procesando = false;
  descargando = false;
  error = '';
  errorRango = '';

  private vendedores: ConId<VendedorNuevo>[] = [];
  private rango$: BehaviorSubject<{ desde: number; hasta: number }>;
  private destroy$ = new Subject<void>();

  constructor(
    private liquidacionService: LiquidacionVentaService,
    private vendedorService: VendedorService,
    private permisos: PermisosService,
    private modalService: NgbModal,
    private exportServ: ComisionesExportService,
  ) {
    const guardados = this.liquidacionService.filtrosHistorial;
    if (guardados) {
      this.desde = guardados.desde;
      this.hasta = guardados.hasta;
      this.idVendedor = guardados.idVendedor;
      this.estado = guardados.estado;
    } else {
      // Por defecto: los últimos 6 meses de corte, incluido el actual.
      const hoy = new Date();
      this.hasta = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
      this.desde = mesDesplazado(this.hasta, -5);
    }
    this.rango$ = new BehaviorSubject({ desde: periodoDeMes(this.desde), hasta: periodoDeMes(this.hasta) });
  }

  ngOnInit(): void {
    const liquidaciones$ = this.rango$.pipe(
      switchMap(r => this.liquidacionService.observarPorPeriodos(r.desde, r.hasta)),
    );
    combineLatest([liquidaciones$, this.vendedorService.vendedores$])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([liquidaciones, vendedores]) => {
          this.liquidaciones = liquidaciones;
          this.vendedores = vendedores;
          this.armarOpcionesVendedor();
          this.aplicarFiltros();
          this.cargando = false;
          this.error = '';
        },
        error: (e: any) => {
          this.cargando = false;
          this.error = `No se pudieron leer las liquidaciones: ${e?.message ?? e}`;
        },
      });
  }

  // ── Filtros ─────────────────────────────────────────────────────

  cambiarRango(desde: string, hasta: string): void {
    if (!/^\d{4}-\d{2}$/.test(desde ?? '') || !/^\d{4}-\d{2}$/.test(hasta ?? '')) {
      this.errorRango = 'Elegí los meses Desde y Hasta.';
      return;
    }
    if (desde > hasta) {
      this.errorRango = 'El mes Desde no puede ser posterior a Hasta.';
      return;
    }
    this.errorRango = '';
    if (desde === this.desde && hasta === this.hasta) return;
    this.desde = desde;
    this.hasta = hasta;
    this.guardarFiltros();
    this.cargando = true;
    this.rango$.next({ desde: periodoDeMes(desde), hasta: periodoDeMes(hasta) });
  }

  cambiarVendedor(id: string): void {
    this.idVendedor = id || 'todos';
    this.guardarFiltros();
    this.aplicarFiltros();
  }

  cambiarEstado(estado: FiltroEstado): void {
    this.estado = estado || 'todos';
    this.guardarFiltros();
    this.aplicarFiltros();
  }

  private guardarFiltros(): void {
    this.liquidacionService.filtrosHistorial = {
      desde: this.desde, hasta: this.hasta, idVendedor: this.idVendedor, estado: this.estado,
    };
  }

  /** Todos los vendedores (activos e inactivos) + los que aparezcan en
   *  liquidaciones y ya no estén en la colección (nombre del snapshot). */
  private armarOpcionesVendedor(): void {
    const opciones = new Map<string, string>();
    for (const v of this.vendedores) opciones.set(v.id, this.vendedorService.nombre(v));
    for (const l of this.liquidaciones) {
      if (!opciones.has(l.idVendedor)) opciones.set(l.idVendedor, nombreVendedorLiquidacion(l));
    }
    this.opcionesVendedor = [...opciones.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  private aplicarFiltros(): void {
    this.visibles = this.liquidaciones
      .filter(l => this.idVendedor === 'todos' || l.idVendedor === this.idVendedor)
      .filter(l => this.estado === 'todos' || l.estado === this.estado)
      .sort((a, b) => b.periodo - a.periodo || b.numero.localeCompare(a.numero));
    this.totalSinAnuladas = redondear2(
      this.visibles.filter(l => l.estado !== 'anulada').reduce((acc, l) => acc + (l.total ?? 0), 0));
    this.totalEmitidas = redondear2(
      this.visibles.filter(l => l.estado === 'emitida').reduce((acc, l) => acc + (l.total ?? 0), 0));
  }

  // ── Presentación ────────────────────────────────────────────────

  get puedeEditar(): boolean {
    return this.permisos.puede('vendedores', 'editar');
  }

  nombreVendedor(l: LiquidacionVenta): string { return nombreVendedorLiquidacion(l); }
  mesCorte(l: LiquidacionVenta): string { return mesCorteLiquidacion(l); }
  fecha(f: string | null | undefined): string { return fechaDMY(f); }
  claseEstado(e: EstadoLiquidacionVenta): string { return claseEstadoLiquidacion(e); }
  etiquetaEstado(e: EstadoLiquidacionVenta): string { return etiquetaEstadoLiquidacion(e); }

  private moneda(valor: number): string {
    return (valor ?? 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
  }

  /** Escapa texto de usuario antes de meterlo en el html de un Swal. */
  private esc(texto: string): string {
    return String(texto ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Acciones ────────────────────────────────────────────────────

  verDetalle(l: ConId<LiquidacionVenta>): void {
    const modalRef = this.modalService.open(LiquidacionVentaDetalleComponent, {
      windowClass: 'myCustomModalClass',
      centered: true,
      size: 'xl',
      scrollable: true,
    });
    modalRef.componentInstance.liquidacion = l;
  }

  async pagar(l: ConId<LiquidacionVenta>): Promise<void> {
    if (!this.puedeEditar || l.estado !== 'emitida') return;
    const hoy = toISODateString(new Date());
    const res = await Swal.fire({
      title: `Registrar pago de ${l.numero}`,
      html:
        `<div class="text-start">` +
        `<p class="mb-3">${this.esc(this.nombreVendedor(l))} — total <b>${this.moneda(l.total)}</b></p>` +
        `<label for="swal-fecha-pago" class="form-label">Fecha de pago</label>` +
        `<input id="swal-fecha-pago" type="date" class="form-control mb-3" value="${hoy}">` +
        `<label for="swal-obs-pago" class="form-label">Observación (opcional)</label>` +
        `<textarea id="swal-obs-pago" class="form-control" rows="2" maxlength="300"></textarea>` +
        `</div>`,
      icon: 'question',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Registrar pago',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const fecha = (document.getElementById('swal-fecha-pago') as HTMLInputElement | null)?.value ?? '';
        const observacion = (document.getElementById('swal-obs-pago') as HTMLTextAreaElement | null)?.value ?? '';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
          Swal.showValidationMessage('Ingresá la fecha de pago.');
          return false;
        }
        if (fecha < l.fechaEmision) {
          Swal.showValidationMessage(`La fecha de pago no puede ser anterior a la emisión (${this.fecha(l.fechaEmision)}).`);
          return false;
        }
        return { fecha, observacion: observacion.trim() || null };
      },
    });
    if (!res.isConfirmed || !res.value) return;

    this.procesando = true;
    const r = await this.liquidacionService.pagar(l.id, res.value.fecha, res.value.observacion);
    this.procesando = false;
    this.informar(r, 'Pago registrado', 'No se pudo registrar el pago');
  }

  async revertirPago(l: ConId<LiquidacionVenta>): Promise<void> {
    if (!this.puedeEditar || l.estado !== 'pagada') return;
    const res = await Swal.fire({
      title: `¿Revertir el pago de ${l.numero}?`,
      text: 'La liquidación vuelve a quedar emitida (sin pago). Después se puede volver a pagar o anular.',
      icon: 'warning',
      input: 'text',
      inputPlaceholder: 'Motivo',
      inputValidator: (valor) => (!valor?.trim() ? 'Ingresá el motivo' : null),
      showCancelButton: true,
      confirmButtonText: 'Revertir pago',
      cancelButtonText: 'Cancelar',
    });
    if (!res.isConfirmed) return;

    this.procesando = true;
    const r = await this.liquidacionService.revertirPago(l.id, String(res.value).trim());
    this.procesando = false;
    this.informar(r, 'Pago revertido', 'No se pudo revertir el pago');
  }

  async anular(l: ConId<LiquidacionVenta>): Promise<void> {
    if (!this.puedeEditar || l.estado !== 'emitida') return;
    const res = await Swal.fire({
      title: `¿Anular ${l.numero}?`,
      html:
        `${this.esc(this.nombreVendedor(l))} — total <b>${this.moneda(l.total)}</b>.<br>` +
        `Sus ${l.lineas.length} comisiones vuelven a quedar pendientes y aparecen en el Tablero ` +
        `para liquidarse de nuevo. La anulación no se puede deshacer.`,
      icon: 'warning',
      input: 'text',
      inputPlaceholder: 'Motivo',
      inputValidator: (valor) => (!valor?.trim() ? 'Ingresá el motivo' : null),
      showCancelButton: true,
      confirmButtonText: 'Anular',
      confirmButtonColor: '#dc3545',
      cancelButtonText: 'Cancelar',
    });
    if (!res.isConfirmed) return;

    this.procesando = true;
    const r = await this.liquidacionService.anular(l.id, String(res.value).trim());
    this.procesando = false;
    this.informar(r, 'Liquidación anulada', 'No se pudo anular');
  }

  async descargar(l: ConId<LiquidacionVenta>, formato: 'excel' | 'pdf'): Promise<void> {
    this.descargando = true;
    try {
      await this.exportServ.descargarLiquidacion(l, formato);
    } catch (e: any) {
      Swal.fire('No se pudo generar el archivo', e?.message ?? String(e), 'error');
    } finally {
      this.descargando = false;
    }
  }

  private informar(r: Resultado<any>, tituloOk: string, tituloError: string): void {
    if (r.exito) Swal.fire(tituloOk, r.mensaje, 'success');
    else Swal.fire(tituloError, r.mensaje, 'error');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
