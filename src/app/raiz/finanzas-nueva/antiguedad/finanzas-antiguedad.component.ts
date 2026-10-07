import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AccionListado, ColumnaListado, EventoAccionListado, OrdenListado } from 'src/app/interfaces/tabla-listado';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { FinanzasConsultaService } from 'src/app/servicios/finanzas-nueva/finanzas-consulta.service';
import {
  CLASE_ESTADO_ANTIGUEDAD, CuentaEntidadFin, ESTADOS_ANTIGUEDAD, EstadoAntiguedad, LadoCuenta, TotalesCuentas,
  PESO_ESTADO_ANTIGUEDAD, contarPorEstado, estadoCuenta, etiquetaEstadoAntiguedad, marcaCriticas, porcentajesTramos,
  rangoEstadoAntiguedad,
  totalizarCuentas, tramosEnCero,
} from 'src/app/shared/utils/cuentas-finanzas.util';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import { TRAMOS_ANTIGUEDAD, TramoAntiguedad } from 'src/app/shared/utils/finanzas.util';

type Fila = CuentaEntidadFin;

/** Clave de columna por tramo (las keys de TablaListado no llevan '+'). */
const KEY_TRAMO: Readonly<Record<TramoAntiguedad, string>> = {
  '0-30': 't0', '31-60': 't31', '61-90': 't61', '90+': 't90',
};

/** Finanzas → Antigüedad (F6a): el facturado abierto de cada entidad
 *  repartido por antigüedad de la factura (0–30 / 31–60 / 61–90 / +90), al
 *  día de hoy (F44). A cobrar (clientes) / A pagar (choferes y
 *  proveedores). Solo entidades con facturas abiertas: lo emitido sin
 *  facturar y el saldo a favor se muestran como referencia (no entran en los
 *  tramos). Estado por días PROMEDIO ponderados por saldo (F47; una factura
 *  crítica lo sube como mínimo a atención), con umbrales por lado
 *  (F43). Mismo cálculo y listener que Cuentas (armarCuentas). */
@Component({
  selector: 'app-finanzas-antiguedad',
  standalone: false,
  templateUrl: './finanzas-antiguedad.component.html',
  styleUrl: './finanzas-antiguedad.component.scss',
})
export class FinanzasAntiguedadComponent implements OnInit, OnDestroy {

  cuentas: Fila[] = [];
  /** Del lado y con facturas abiertas, antes del filtro de estado/texto. */
  delLado: Fila[] = [];
  filtradas: Fila[] = [];
  totales: TotalesCuentas = totalizarCuentas([]);
  porcentajes: Record<TramoAntiguedad, number> = tramosEnCero();
  conteo: Record<EstadoAntiguedad, number> = { 'al-dia': 0, atencion: 0, critico: 0 };
  columnas: ColumnaListado<Fila>[] = [];
  cargando = true;
  error: string | null = null;

  readonly hoy = toISODateString(new Date());
  readonly hoyLegible = fechaComprobanteLegible(this.hoy);
  readonly tramos = TRAMOS_ANTIGUEDAD;
  readonly estados = ESTADOS_ANTIGUEDAD;
  readonly ordenInicial: OrdenListado = { key: KEY_TRAMO['90+'], asc: false };
  readonly trackCuenta = (c: Fila) => c.clave;

  readonly acciones: AccionListado<Fila>[] = [
    { id: 'cuenta', label: 'Ver cuenta', clase: 'btn-outline-primary' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private consulta: FinanzasConsultaService,
    private router: Router,
  ) {}

  get filtros(): { lado: LadoCuenta; texto: string; estado: EstadoAntiguedad | 'todos' } {
    return this.consulta.filtrosAntiguedad;
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
          console.error('Error al leer la antigüedad de Finanzas', e);
          this.error = `No se pudo leer la antigüedad: ${e?.message ?? e}`;
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

  /** Click en un chip de estado: filtra; otro click en el mismo, lo quita. */
  cambiarEstado(estado: EstadoAntiguedad): void {
    this.filtros.estado = this.filtros.estado === estado ? 'todos' : estado;
    this.aplicarFiltros();
  }

  /** Tarjetas, barra y conteo salen del LADO completo (no cambian con el
   *  buscador ni con el estado); la tabla, de lo filtrado. */
  aplicarFiltros(): void {
    const lado = this.filtros.lado;
    this.delLado = this.cuentas.filter(c => c.lado === lado && c.cantidadFacturados > 0);
    this.totales = totalizarCuentas(this.delLado);
    this.porcentajes = porcentajesTramos(this.totales.tramos);
    this.conteo = contarPorEstado(this.delLado);

    const texto = this.filtros.texto.trim().toLowerCase();
    const estado = this.filtros.estado;
    this.filtradas = this.delLado.filter(c =>
      (estado === 'todos' || estadoCuenta(c) === estado) &&
      (!texto || c.nombre.toLowerCase().includes(texto) || String(c.cuit).includes(texto)));
  }

  /** "0 a 30 días", …, "Más de 90 días". */
  etiquetaTramo(t: TramoAntiguedad): string {
    return t === '90+' ? 'Más de 90 días' : `${t.replace('-', ' a ')} días`;
  }

  etiquetaEstado(estado: EstadoAntiguedad): string {
    return etiquetaEstadoAntiguedad(estado, this.filtros.lado);
  }

  rangoEstado(estado: EstadoAntiguedad): string {
    return rangoEstadoAntiguedad(estado, this.filtros.lado);
  }

  onAccion(ev: EventoAccionListado<Fila>): void {
    if (ev.id === 'cuenta') {
      this.router.navigate(['/finanzasNueva/cuenta', ev.item.tipo, ev.item.idEntidad], { queryParams: { origen: 'antiguedad' } });
    }
  }

  private armarColumnas(): ColumnaListado<Fila>[] {
    const cobrar = this.filtros.lado === 'cobrar';
    const columnas: ColumnaListado<Fila>[] = [
      { key: 'nombre', label: cobrar ? 'Cliente' : 'Entidad', valor: c => c.nombre, orden: c => c.nombre },
    ];
    if (!cobrar) {
      columnas.push({ key: 'tipo', label: 'Tipo', valor: c => c.tipo, orden: c => c.tipo, clase: 'text-capitalize' });
    }
    for (const t of TRAMOS_ANTIGUEDAD) {
      columnas.push({
        key: KEY_TRAMO[t],
        label: t === '90+' ? '+90' : t.replace('-', '–'),
        valor: c => c.tramos[t],
        orden: c => c.tramos[t],
        tipo: 'moneda',
        clase: c => (c.tramos[t] <= 0 ? 'text-muted' : t === '90+' ? 'text-danger fw-semibold' : ''),
      });
    }
    columnas.push(
      {
        key: 'saldoFacturado', label: 'Facturado abierto', valor: c => c.saldoFacturado, orden: c => c.saldoFacturado,
        tipo: 'moneda', clase: 'fw-semibold',
      },
      {
        key: 'diasMasAntiguo', label: 'Más antigua (días)', valor: c => c.diasMasAntiguo ?? '—', orden: c => c.diasMasAntiguo ?? -1,
        tipo: 'numero', align: 'center',
      },
      {
        key: 'diasPromedio', label: 'Días prom.', valor: c => c.diasPromedio ?? '—', orden: c => c.diasPromedio ?? -1,
        tipo: 'numero', align: 'center', clase: 'fw-semibold',
      },
      {
        key: 'estado', label: 'Estado', align: 'center',
        valor: c => {
          const e = estadoCuenta(c);
          if (!e) return '—';
          const marca = marcaCriticas(c);
          return marca ? `${etiquetaEstadoAntiguedad(e, c.lado)} · ${marca}` : etiquetaEstadoAntiguedad(e, c.lado);
        },
        // Peso del estado y, dentro del mismo estado, días promedio.
        orden: c => {
          const e = estadoCuenta(c);
          return e ? PESO_ESTADO_ANTIGUEDAD[e] * 100000 + (c.diasPromedio ?? 0) : -1;
        },
        clase: c => {
          const e = estadoCuenta(c);
          return e ? CLASE_ESTADO_ANTIGUEDAD[e] : '';
        },
      },
      { key: 'sinFacturar', label: 'Sin facturar', valor: c => c.sinFacturar, orden: c => c.sinFacturar, tipo: 'moneda', clase: 'text-muted' },
      {
        key: 'saldoAFavor', label: cobrar ? 'Saldo a favor' : 'Anticipos', valor: c => c.saldoAFavor, orden: c => c.saldoAFavor,
        tipo: 'moneda', clase: 'text-muted',
      },
    );
    return columnas;
  }
}
