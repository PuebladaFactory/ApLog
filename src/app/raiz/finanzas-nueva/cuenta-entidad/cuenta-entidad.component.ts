import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { TipoEntidadFin } from 'src/app/interfaces/movimiento-fin';
import { AccionListado, ColumnaListado, EventoAccionListado, OrdenListado } from 'src/app/interfaces/tabla-listado';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { FinanzasConsultaService } from 'src/app/servicios/finanzas-nueva/finanzas-consulta.service';
import { InformeLiqFactoryService } from 'src/app/servicios/informes-liq/informe-liq-factory.service';
import { InformeLiqNuevoDetalleComponent } from 'src/app/shared/modales/informe-liq-nuevo-detalle/informe-liq-nuevo-detalle.component';
import {
  FilaComprobanteCuenta, LineaMayor, MayorCuenta, ResumenCuentaEntidad, SaldoPresentado, SeccionCuentaEntidad,
  armarComprobantesCuenta, armarMayor, presentarSaldo, resumirCuentaEntidad,
} from 'src/app/shared/utils/cuenta-entidad.util';
import { CuentaEntidadFin, ladoDe } from 'src/app/shared/utils/cuentas-finanzas.util';
import { nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import { TRAMOS_ANTIGUEDAD } from 'src/app/shared/utils/finanzas.util';
import { AccionesMovimientoService } from '../acciones-movimiento.service';
import { FilaMovimiento, accionesMovimientos, columnasMovimientos } from '../listado-movimientos';
import { RegistrarMovimientoComponent } from '../modales/registrar-movimiento/registrar-movimiento.component';
import { HistoriaComprobanteComponent } from '../modales/historia-comprobante/historia-comprobante.component';

type FilaComprobante = FilaComprobanteCuenta<ConId<InformeLiqNuevo>>;

const TIPOS_VALIDOS: readonly TipoEntidadFin[] = ['cliente', 'chofer', 'proveedor'];

const ETIQUETA_ESTADO: Readonly<Record<InformeLiqNuevo['estado'], string>> = {
  borrador: 'Borrador',
  emitido: 'Emitido (sin facturar)',
  facturado: 'Facturado',
  revertido: 'Revertido',
  anulado: 'Anulado',
};

/** Finanzas → Cuenta de UNA entidad (F5, ruta `finanzasNueva/cuenta/:tipo/:id`,
 *  F39). En vivo (FinanzasConsultaService.observarCuentaEntidad): todos sus
 *  InformeLiq y movimientos.
 *  - Encabezado: facturado abierto, emitido sin facturar, saldo a favor /
 *    anticipos y saldo total (F37), antigüedad por tramos.
 *  - Comprobantes: InformeLiq (sin borradores), abiertos o todos; "Ver" abre
 *    el detalle del informe.
 *  - Movimientos: los de la entidad, con los mismos gestos que la pestaña
 *    Movimientos (AccionesMovimientoService).
 *  - Mayor (F5b, F36/F37): cronológico con saldo acumulado, rango de fechas
 *    con saldo anterior (armarMayor). F5c: más reciente arriba por defecto
 *    (invertible), columnas Liquidado / Cobrado|Pagado, saldo legible con
 *    color (presentarSaldo) y etiqueta de color por tipo de línea.
 *  - Historia de un comprobante (F5b): HistoriaComprobanteComponent.
 *  - Registrar cobro / pago desde el encabezado.
 *  Sin documentos: nombre y CUIT desde el documento de la entidad
 *  (obtenerEntidad); si no existe, "La entidad no existe" (F5b). */
@Component({
  selector: 'app-cuenta-entidad',
  standalone: false,
  templateUrl: './cuenta-entidad.component.html',
  styleUrl: './cuenta-entidad.component.scss',
})
export class CuentaEntidadComponent implements OnInit, OnDestroy {

  tipo: TipoEntidadFin = 'cliente';
  idEntidad = '';
  nombre = '';
  cuit: number | null = null;
  /** El id no corresponde a ninguna entidad (F5b). */
  noExiste = false;

  resumen: ResumenCuentaEntidad | null = null;
  comprobantes: FilaComprobante[] = [];
  comprobantesVisibles: FilaComprobante[] = [];
  movimientos: FilaMovimiento[] = [];
  informes: ConId<InformeLiqNuevo>[] = [];
  mayor: MayorCuenta | null = null;
  errorRangoMayor: string | null = null;
  /** Inputs de fecha del Mayor ('' = sin límite). */
  mayorDesde = '';
  mayorHasta = '';
  cargando = true;
  procesando = false;
  error: string | null = null;

  readonly hoy = toISODateString(new Date());
  readonly tramos = TRAMOS_ANTIGUEDAD;
  readonly ordenComprobantes: OrdenListado = { key: 'emision', asc: false };
  readonly ordenMovimientos: OrdenListado = { key: 'fecha', asc: false };
  readonly trackComprobante = (f: FilaComprobante) => f.liq.idInfLiq;
  readonly trackMovimiento = (m: FilaMovimiento) => m.idMovimiento;
  readonly accionesComprobante: AccionListado<FilaComprobante>[] = [
    { id: 'ver', label: 'Ver', clase: 'btn-outline-primary' },
    { id: 'historia', label: 'Historia', clase: 'btn-outline-secondary' },
  ];
  readonly fechaLegible = fechaComprobanteLegible;
  readonly accionesMovimiento = accionesMovimientos();
  readonly columnasMovimiento = columnasMovimientos({ conEntidad: false });
  columnasComprobante: ColumnaListado<FilaComprobante>[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private modalService: NgbModal,
    private consulta: FinanzasConsultaService,
    private factory: InformeLiqFactoryService,
    private accionesMov: AccionesMovimientoService,
  ) {}

  get filtros(): {
    seccion: SeccionCuentaEntidad; soloAbiertos: boolean; mayorDesde: string; mayorHasta: string; mayorOrden: 'desc' | 'asc';
  } {
    return this.consulta.filtrosCuentaEntidad;
  }

  get esCliente(): boolean {
    return this.tipo === 'cliente';
  }

  ngOnInit(): void {
    this.mayorDesde = this.filtros.mayorDesde;
    this.mayorHasta = this.filtros.mayorHasta;
    this.route.paramMap
      .pipe(
        switchMap(params => {
          const tipo = params.get('tipo') as TipoEntidadFin;
          this.idEntidad = params.get('id') ?? '';
          this.tipo = TIPOS_VALIDOS.includes(tipo) ? tipo : 'cliente';
          this.error = TIPOS_VALIDOS.includes(tipo) && this.idEntidad ? null : 'Cuenta inválida.';
          this.columnasComprobante = this.armarColumnasComprobante();
          this.noExiste = false;
          this.cargando = true;
          return this.consulta.observarCuentaEntidad(this.tipo, this.idEntidad);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: async ({ informes, movimientos }) => {
          const ref = informes[0]?.entidad;
          const mov = movimientos[0]?.entidad;
          this.nombre = ref ? nombreEntidadRef(ref) : (mov?.razonSocial ?? '');
          this.cuit = ref?.cuit ?? mov?.cuit ?? null;
          this.informes = informes;
          this.resumen = resumirCuentaEntidad(informes, movimientos, this.hoy);
          this.comprobantes = armarComprobantesCuenta(informes, this.hoy);
          this.movimientos = movimientos;
          this.aplicarFiltroComprobantes();
          this.recalcularMayor();
          if (!ref && !mov && !this.error) await this.buscarEntidad();
          this.cargando = false;
        },
        error: e => {
          console.error('Error al leer la cuenta', e);
          this.error = `No se pudo leer la cuenta: ${e?.message ?? e}`;
          this.cargando = false;
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Cuenta sin documentos: nombre y CUIT desde la entidad; si no existe,
   *  la página lo dice y no deja registrar. */
  private async buscarEntidad(): Promise<void> {
    try {
      const e = await this.consulta.obtenerEntidad(this.tipo, this.idEntidad);
      if (!e) {
        this.noExiste = true;
        return;
      }
      this.nombre = e.nombre;
      this.cuit = e.cuit;
    } catch (err: any) {
      this.error = `No se pudo leer la entidad: ${err?.message ?? err}`;
    }
  }

  /** Cambio de una fecha del Mayor: valida y recuerda en la sesión. */
  onRangoMayor(): void {
    if (this.mayorDesde && this.mayorHasta && this.mayorDesde > this.mayorHasta) {
      this.errorRangoMayor = 'La fecha "desde" es posterior a la fecha "hasta".';
      return;
    }
    this.errorRangoMayor = null;
    this.filtros.mayorDesde = this.mayorDesde;
    this.filtros.mayorHasta = this.mayorHasta;
    this.recalcularMayor();
  }

  /** F5c: líneas del Mayor en el orden elegido (el cálculo es siempre
   *  cronológico; solo cambia la presentación). */
  get lineasMayor(): LineaMayor[] {
    if (!this.mayor) return [];
    return this.filtros.mayorOrden === 'desc' ? [...this.mayor.lineas].reverse() : this.mayor.lineas;
  }

  invertirOrdenMayor(): void {
    this.filtros.mayorOrden = this.filtros.mayorOrden === 'desc' ? 'asc' : 'desc';
  }

  /** Saldo en palabras y con color según el lado (F5c). */
  presentar(saldo: number): SaldoPresentado {
    return presentarSaldo(saldo, this.tipo);
  }

  /** Etiqueta de color por tipo de línea del Mayor (F5c). */
  etiquetaLinea(l: LineaMayor): { texto: string; clase: string } {
    switch (l.tipo) {
      case 'liquidacion': return { texto: 'Liquidación', clase: 'bg-secondary' };
      case 'compensacion': return { texto: 'Compensación', clase: 'bg-light text-dark border' };
      case 'ajuste': return { texto: 'Ajuste', clase: 'bg-info text-dark' };
      default:
        if (l.concepto === 'anticipo') return { texto: 'Anticipo', clase: 'bg-warning text-dark' };
        if (l.concepto === 'prestamo') return { texto: 'Préstamo', clase: 'bg-warning text-dark' };
        return { texto: l.tipo === 'cobro' ? 'Cobro' : 'Pago', clase: 'bg-success' };
    }
  }

  limpiarRangoMayor(): void {
    this.mayorDesde = '';
    this.mayorHasta = '';
    this.onRangoMayor();
  }

  /** Línea del Mayor: liquidación → historia; movimiento → detalle. */
  verLineaMayor(linea: MayorCuenta['lineas'][number]): void {
    if (linea.tipo === 'compensacion' || linea.tipo === 'liquidacion') {
      const liq = this.informes.find(i => i.idInfLiq === linea.idInfLiq);
      if (liq) this.abrirHistoria(liq);
      return;
    }
    const m = this.movimientos.find(x => x.idMovimiento === linea.idMovimiento);
    if (m) this.accionesMov.verDetalle(m, p => (this.procesando = p));
  }

  private recalcularMayor(): void {
    this.mayor = armarMayor(this.informes, this.movimientos, this.filtros.mayorDesde || null, this.filtros.mayorHasta || null);
  }

  private abrirHistoria(liq: ConId<InformeLiqNuevo>): void {
    const modalRef = this.modalService.open(HistoriaComprobanteComponent, {
      size: 'xl', centered: true, scrollable: true,
    });
    modalRef.componentInstance.liq = liq;
    modalRef.componentInstance.movimientos = this.movimientos;
    modalRef.result.catch(() => {});
  }

  cambiarSeccion(seccion: SeccionCuentaEntidad): void {
    this.filtros.seccion = seccion;
  }

  onSoloAbiertos(valor: boolean): void {
    this.filtros.soloAbiertos = valor;
    this.aplicarFiltroComprobantes();
  }

  get cantidadAbiertos(): number {
    return this.comprobantes.filter(f => f.abierto).length;
  }

  /** Pestaña desde la que se abrió la cuenta (?origen=…, F6a); por defecto
   *  Cuentas. Solo valores conocidos: un origen inventado vuelve a Cuentas. */
  get origen(): { ruta: string; etiqueta: string } {
    const o = this.route.snapshot.queryParamMap.get('origen');
    if (o === 'antiguedad') return { ruta: '/finanzasNueva/antiguedad', etiqueta: 'Antigüedad' };
    if (o === 'resumen') return { ruta: '/finanzasNueva/resumen', etiqueta: 'Resumen' };
    return { ruta: '/finanzasNueva/cuentas', etiqueta: 'Cuentas' };
  }

  volver(): void {
    this.router.navigate([this.origen.ruta]);
  }

  /** Registrar cobro (cliente) / pago (chofer, proveedor) con la entidad fija. */
  registrar(): void {
    if (!this.resumen || !this.nombre || this.noExiste) return;
    const cuenta: CuentaEntidadFin = {
      clave: `${this.tipo}_${this.idEntidad}`,
      tipo: this.tipo,
      idEntidad: this.idEntidad,
      nombre: this.nombre,
      cuit: this.cuit ?? 0,
      lado: ladoDe(this.tipo),
      saldoFacturado: this.resumen.saldoFacturado,
      cantidadFacturados: this.resumen.cantidadFacturados,
      saldoMas60: 0,
      tramos: { ...this.resumen.tramos },
      diasMasAntiguo: this.resumen.diasMasAntiguo,
      // Solo para el modal de registrar (no los usa): sin cálculo de antigüedad.
      diasPromedio: null,
      saldoVencido: 0,
      cantidadCriticas: 0,
      sinFacturar: this.resumen.sinFacturar,
      cantidadSinFacturar: this.resumen.cantidadSinFacturar,
      saldoAFavor: this.resumen.saldoAFavor,
      neto: this.resumen.saldoFacturado - this.resumen.saldoAFavor,
    };
    const modalRef = this.modalService.open(RegistrarMovimientoComponent, {
      size: 'xl', centered: true, scrollable: true, backdrop: 'static', keyboard: false,
    });
    modalRef.componentInstance.cuenta = cuenta;
    modalRef.componentInstance.lado = cuenta.lado;
    modalRef.result.catch(() => {});
  }

  onAccionComprobante(ev: EventoAccionListado<FilaComprobante>): void {
    if (ev.id === 'historia') {
      this.abrirHistoria(ev.item.liq);
      return;
    }
    if (ev.id !== 'ver') return;
    const modalRef = this.modalService.open(InformeLiqNuevoDetalleComponent, {
      size: 'xl', centered: true, scrollable: true,
    });
    modalRef.componentInstance.idInfLiq = ev.item.liq.idInfLiq;
    modalRef.componentInstance.modulo = 'facturacion';
    modalRef.result.catch(() => {});
  }

  onAccionMovimiento(ev: EventoAccionListado<FilaMovimiento>): void {
    const alProcesar = (p: boolean) => (this.procesando = p);
    if (ev.id === 'ver') this.accionesMov.verDetalle(ev.item, alProcesar);
    else if (ev.id === 'imputar') this.accionesMov.imputar(ev.item);
    else if (ev.id === 'anular') this.accionesMov.anular(ev.item, alProcesar);
  }

  private aplicarFiltroComprobantes(): void {
    this.comprobantesVisibles = this.filtros.soloAbiertos
      ? this.comprobantes.filter(f => f.abierto)
      : this.comprobantes;
  }

  private armarColumnasComprobante(): ColumnaListado<FilaComprobante>[] {
    const apagado = (f: FilaComprobante) => (f.estado === 'revertido' || f.estado === 'anulado' ? 'text-muted' : '');
    return [
      { key: 'numero', label: 'Número', valor: f => f.liq.numeroInterno ?? '—', orden: f => f.liq.numeroInterno ?? '', clase: apagado },
      {
        key: 'periodo', label: 'Período', valor: f => this.factory.textoPeriodo(f.liq.periodo),
        orden: f => this.factory.ordenPeriodo(f.liq.periodo),
      },
      { key: 'estado', label: 'Estado', valor: f => ETIQUETA_ESTADO[f.estado], orden: f => f.estado, clase: apagado },
      {
        key: 'emision', label: 'Emisión', valor: f => (f.fechaEmision ? fechaComprobanteLegible(f.fechaEmision) : '—'),
        orden: f => f.fechaEmision ?? '', align: 'center',
      },
      {
        key: 'factura', label: 'Factura', valor: f => (f.fechaFactura ? fechaComprobanteLegible(f.fechaFactura) : '—'),
        orden: f => f.fechaFactura ?? '', align: 'center',
      },
      { key: 'total', label: 'Total', valor: f => f.total, orden: f => f.total, tipo: 'moneda' },
      { key: 'compensado', label: 'Compensado', valor: f => f.compensado, orden: f => f.compensado, tipo: 'moneda' },
      {
        key: 'cobrado', label: this.esCliente ? 'Cobrado' : 'Pagado', valor: f => f.cobrado, orden: f => f.cobrado,
        tipo: 'moneda',
      },
      { key: 'ajustado', label: 'Ajustado', valor: f => f.ajustado, orden: f => f.ajustado, tipo: 'moneda' },
      {
        key: 'saldo', label: 'Saldo', valor: f => f.saldo, orden: f => f.saldo, tipo: 'moneda',
        clase: f => (f.abierto ? 'fw-bold' : 'text-muted'),
      },
      {
        key: 'dias', label: 'Días', valor: f => f.dias ?? '—', orden: f => f.dias ?? -1, tipo: 'numero', align: 'center',
        clase: f => ((f.dias ?? 0) > 60 ? 'text-danger' : ''),
      },
    ];
  }
}
