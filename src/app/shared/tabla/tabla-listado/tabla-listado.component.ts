import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import {
  AccionListado, ColumnaListado, EnlaceListado, EventoAccionListado, OrdenListado,
} from 'src/app/interfaces/tabla-listado';
import { AccionPermiso, ModuloPermiso } from 'src/app/interfaces/permiso';
import { PermisosService } from 'src/app/servicios/permisos/permisos.service';

/** Tabla de listado genérica (camino nuevo). Muestra `items` según
 *  `columnas`, ordena internamente por encabezado y emite `(accion)` con las
 *  acciones de fila. No filtra: el caller le pasa el array ya filtrado (y lo
 *  recalcula solo cuando cambian datos o filtros, no con un getter). Primeros
 *  consumidores: BorradoresLiqComponent, FacturacionEmitidosComponent. */
@Component({
  selector: 'app-tabla-listado',
  standalone: false,
  templateUrl: './tabla-listado.component.html',
  styleUrl: './tabla-listado.component.scss',
})
export class TablaListadoComponent<T = any> implements OnChanges {

  @Input() items: T[] = [];
  @Input() columnas: ColumnaListado<T>[] = [];
  @Input() acciones: AccionListado<T>[] = [];
  /** Orden con el que arranca la tabla (se toma una sola vez). */
  @Input() ordenInicial: OrdenListado | null = null;
  @Input() cargando = false;
  /** Atenúa la tabla y deshabilita las acciones (ej. mientras se procesa). */
  @Input() bloqueada = false;
  @Input() mensajeVacio = 'No hay registros.';
  /** Clave de track por fila. Default: `item.id` (patrón ConId). */
  @Input() trackKey: (item: T) => string = (item: T) => (item as any).id;

  @Output() accion = new EventEmitter<EventoAccionListado<T>>();

  filas: T[] = [];
  accionesPermitidas: AccionListado<T>[] = [];
  orden: OrdenListado | null = null;
  private ordenInicialAplicado = false;

  constructor(private permisos: PermisosService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.ordenInicialAplicado && this.ordenInicial) {
      this.orden = { ...this.ordenInicial };
      this.ordenInicialAplicado = true;
    }
    if (changes['acciones']) {
      this.accionesPermitidas = this.acciones.filter(a => this.tienePermiso(a));
    }
    this.aplicarOrden();
  }

  get hayAcciones(): boolean {
    return this.accionesPermitidas.length > 0;
  }

  get totalColumnas(): number {
    return this.columnas.length + (this.hayAcciones ? 1 : 0);
  }

  ordenar(col: ColumnaListado<T>): void {
    if (!col.orden) return;
    this.orden = this.orden?.key === col.key
      ? { key: col.key, asc: !this.orden.asc }
      : { key: col.key, asc: true };
    this.aplicarOrden();
  }

  /** ▲/▼ en la columna activa; ⇅ en las demás ordenables. */
  iconoOrden(col: ColumnaListado<T>): string {
    if (this.orden?.key !== col.key) return '⇅';
    return this.orden.asc ? '▲' : '▼';
  }

  clasesEncabezado(col: ColumnaListado<T>): string[] {
    const clases = [this.alineacion(col)];
    if (col.orden) clases.push('ordenable');
    return clases;
  }

  clasesCelda(col: ColumnaListado<T>, item: T): string[] {
    const clases = [this.alineacion(col)];
    if (col.tipo === 'numero' || col.tipo === 'moneda') clases.push('col-numero');
    const extra = typeof col.clase === 'function' ? col.clase(item) : col.clase;
    if (extra) clases.push(extra);
    return clases;
  }

  /** Enlace de la celda (columna con `enlace`), o null. */
  enlaceDe(col: ColumnaListado<T>, item: T): EnlaceListado | null {
    return col.enlace ? col.enlace(item) : null;
  }

  valorMoneda(col: ColumnaListado<T>, item: T): number | null {
    const v = col.valor(item);
    return typeof v === 'number' ? v : null;
  }

  esVisible(a: AccionListado<T>, item: T): boolean {
    return a.visible ? a.visible(item) : true;
  }

  estaDeshabilitada(a: AccionListado<T>, item: T): boolean {
    return this.bloqueada || (a.deshabilitada ? a.deshabilitada(item) : false);
  }

  ejecutar(a: AccionListado<T>, item: T): void {
    if (this.estaDeshabilitada(a, item)) return;
    this.accion.emit({ id: a.id, item });
  }

  private alineacion(col: ColumnaListado<T>): string {
    const align = col.align ?? (col.tipo === 'numero' || col.tipo === 'moneda' ? 'end' : 'start');
    return align === 'end' ? 'text-end' : align === 'center' ? 'text-center' : '';
  }

  private tienePermiso(a: AccionListado<T>): boolean {
    if (!a.permiso) return true;
    const [modulo, accion] = a.permiso.split('.') as [ModuloPermiso, AccionPermiso?];
    return this.permisos.puede(modulo, accion);
  }

  /** Copia ordenada de `items` según `orden` (sin orden: tal cual llegan). */
  private aplicarOrden(): void {
    const col = this.orden ? this.columnas.find(c => c.key === this.orden!.key) : undefined;
    if (!col?.orden) {
      this.filas = [...this.items];
      return;
    }
    const clave = col.orden;
    const dir = this.orden!.asc ? 1 : -1;
    this.filas = [...this.items].sort((a, b) => {
      const va = clave(a);
      const vb = clave(b);
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb));
      return cmp * dir;
    });
  }
}
