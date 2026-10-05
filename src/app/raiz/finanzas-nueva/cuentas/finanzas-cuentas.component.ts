import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AccionListado, ColumnaListado, EventoAccionListado, OrdenListado } from 'src/app/interfaces/tabla-listado';
import { RegistrarMovimientoComponent } from '../modales/registrar-movimiento/registrar-movimiento.component';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { FinanzasConsultaService } from 'src/app/servicios/finanzas-nueva/finanzas-consulta.service';
import {
  CuentaEntidadFin, DIAS_ALERTA_ANTIGUEDAD, LadoCuenta, TotalesCuentas, totalizarCuentas,
} from 'src/app/shared/utils/cuentas-finanzas.util';

type Fila = CuentaEntidadFin;

/** Finanzas → Cuentas: una fila por entidad con saldo abierto, informes sin
 *  facturar o saldo a favor. A cobrar (clientes) / A pagar (choferes y
 *  proveedores). En vivo, calculado al consultar (FinanzasConsultaService →
 *  armarCuentas). Acciones (F3): registrar cobro/pago desde la fila o
 *  "Nuevo cobro/pago" (RegistrarMovimientoComponent). La cuenta de la
 *  entidad llega en F5. */
@Component({
  selector: 'app-finanzas-cuentas',
  standalone: false,
  templateUrl: './finanzas-cuentas.component.html',
  styleUrl: './finanzas-cuentas.component.scss',
})
export class FinanzasCuentasComponent implements OnInit, OnDestroy {

  cuentas: Fila[] = [];
  filtradas: Fila[] = [];
  totales: TotalesCuentas = totalizarCuentas([]);
  columnas: ColumnaListado<Fila>[] = [];
  cargando = true;
  error: string | null = null;

  readonly hoy = toISODateString(new Date());
  readonly diasAlerta = DIAS_ALERTA_ANTIGUEDAD;
  readonly ordenInicial: OrdenListado = { key: 'neto', asc: false };
  readonly trackCuenta = (c: Fila) => c.clave;

  readonly acciones: AccionListado<Fila>[] = [
    { id: 'cobrar', label: 'Registrar cobro', clase: 'btn-outline-success', permiso: 'finanzas.agregar', visible: c => c.lado === 'cobrar' },
    { id: 'pagar', label: 'Registrar pago', clase: 'btn-outline-success', permiso: 'finanzas.agregar', visible: c => c.lado === 'pagar' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private consulta: FinanzasConsultaService,
    private modalService: NgbModal,
  ) {}

  get filtros(): { lado: LadoCuenta; texto: string } {
    return this.consulta.filtrosCuentas;
  }

  ngOnInit(): void {
    this.columnas = this.armarColumnas();
    this.consulta.observarCuentas(this.hoy)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: cuentas => {
          this.cuentas = cuentas;
          this.aplicarFiltros();
          this.cargando = false;
        },
        error: e => {
          console.error('Error al leer las cuentas de Finanzas', e);
          this.error = `No se pudieron leer las cuentas: ${e?.message ?? e}`;
          this.cargando = false;
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cambiarLado(lado: LadoCuenta): void {
    if (this.filtros.lado === lado) return;
    this.filtros.lado = lado;
    this.columnas = this.armarColumnas();
    this.aplicarFiltros();
  }

  onTexto(texto: string): void {
    this.filtros.texto = texto;
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    const texto = this.filtros.texto.trim().toLowerCase();
    this.filtradas = this.cuentas.filter(c =>
      c.lado === this.filtros.lado &&
      (!texto || c.nombre.toLowerCase().includes(texto) || String(c.cuit).includes(texto)));
    this.totales = totalizarCuentas(this.filtradas);
  }

  onAccion(ev: EventoAccionListado<Fila>): void {
    if (ev.id === 'cobrar' || ev.id === 'pagar') this.abrirRegistro(ev.item);
  }

  /** Abre el modal de cobro/pago. Con `cuenta` la entidad queda fija; sin
   *  ella (botón "Nuevo"), se elige del lado activo. La tabla se actualiza
   *  sola por los listeners. */
  abrirRegistro(cuenta: Fila | null): void {
    const modalRef = this.modalService.open(RegistrarMovimientoComponent, {
      size: 'xl', centered: true, scrollable: true, backdrop: 'static', keyboard: false,
    });
    modalRef.componentInstance.cuenta = cuenta;
    modalRef.componentInstance.lado = this.filtros.lado;
    modalRef.result.catch(() => {});
  }

  private armarColumnas(): ColumnaListado<Fila>[] {
    const cobrar = this.filtros.lado === 'cobrar';
    const columnas: ColumnaListado<Fila>[] = [
      { key: 'nombre', label: cobrar ? 'Cliente' : 'Entidad', valor: c => c.nombre, orden: c => c.nombre },
    ];
    if (!cobrar) {
      columnas.push({ key: 'tipo', label: 'Tipo', valor: c => c.tipo, orden: c => c.tipo, clase: 'text-capitalize' });
    }
    columnas.push(
      { key: 'cuit', label: 'CUIT', valor: c => c.cuit, orden: c => String(c.cuit) },
      { key: 'saldoFacturado', label: 'Facturado abierto', valor: c => c.saldoFacturado, orden: c => c.saldoFacturado, tipo: 'moneda' },
      { key: 'cantidadFacturados', label: 'Comprob.', valor: c => c.cantidadFacturados, orden: c => c.cantidadFacturados, tipo: 'numero', align: 'center' },
      {
        key: 'saldoMas60', label: `+${DIAS_ALERTA_ANTIGUEDAD} días`, valor: c => c.saldoMas60, orden: c => c.saldoMas60, tipo: 'moneda',
        clase: c => (c.saldoMas60 > 0 ? 'text-danger' : ''),
      },
      {
        key: 'diasMasAntiguo', label: 'Antigüedad (días)', valor: c => c.diasMasAntiguo ?? '—', orden: c => c.diasMasAntiguo ?? -1,
        tipo: 'numero', align: 'center',
      },
      { key: 'sinFacturar', label: 'Sin facturar', valor: c => c.sinFacturar, orden: c => c.sinFacturar, tipo: 'moneda', clase: 'text-muted' },
      { key: 'saldoAFavor', label: cobrar ? 'Saldo a favor' : 'Anticipos', valor: c => c.saldoAFavor, orden: c => c.saldoAFavor, tipo: 'moneda' },
      { key: 'neto', label: 'Neto', valor: c => c.neto, orden: c => c.neto, tipo: 'moneda', clase: 'table-success' },
    );
    return columnas;
  }
}
