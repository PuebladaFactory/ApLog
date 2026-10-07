````
# Instrucción F5c — Finanzas: Mayor más legible (etiquetas, orden, saldo con color)

## Contexto

Frente Finanzas. Diseño: `claude/diseno-finanzas.md` §18. F5b dejó el
Mayor funcionando, pero en la prueba se veía plano: todas las líneas
iguales y los saldos con signo, que obligan a pensar "¿positivo es bueno o
malo?". Este bloque solo cambia la PRESENTACIÓN. Ningún cálculo cambia: el
saldo final del Mayor sigue siendo el saldo de la cuenta.

1. **Etiquetas de color por tipo de línea** (nueva columna "Tipo" del
   Mayor):
   - Liquidación: gris (`bg-secondary`).
   - Cobro / Pago: verde (`bg-success`).
   - Anticipo / Préstamo: amarillo (`bg-warning`).
   - Ajuste: celeste (`bg-info`).
   - Compensación: clara con borde (sigue siendo informativa).
   Para distinguir anticipo y préstamo, `LineaMayor` suma `concepto`
   (null en liquidaciones y compensaciones).
2. **Más reciente arriba.** El Mayor abre en orden descendente. Un botón
   invierte el orden, y la elección se recuerda en la sesión
   (`filtrosCuentaEntidad.mayorOrden`). La fila "Saldo anterior" va abajo
   con orden descendente y arriba con ascendente, pegada siempre a lo más
   viejo. El saldo de cada línea sigue siendo el acumulado DESPUÉS de esa
   línea, en orden cronológico.
3. **Columnas con nombres del negocio:** "Debe / Haber" pasan a
   "Liquidado" y "Cobrado" (cliente) o "Pagado" (chofer / proveedor). Se
   suma la columna "Tipo".
4. **Saldo legible con color.** Función pura
   `presentarSaldo(saldo, tipo)`: el importe se muestra siempre positivo,
   con el significado debajo:
   - Cliente, saldo > 0: "nos debe" (azul).
   - Chofer / proveedor, saldo > 0: "le debemos" (rojo).
   - Saldo < 0: "a favor del cliente" o "a favor nuestro" (naranja).
   - Saldo 0: "saldado" (gris).
   Se aplica a la tarjeta "Saldo de la cuenta" (antes "Saldo total"), a
   cada línea, al saldo anterior y al saldo final.
5. **Pestaña Movimientos** (listado general y de la cuenta, ambos usan
   `listado-movimientos.ts`): el Tipo va en color (cobro / pago en verde,
   ajuste en celeste). Un concepto de anticipo o préstamo va en amarillo
   oscuro. Las clases `-emphasis` son de Bootstrap 5.3; la app ya las usa
   (`text-primary-emphasis` en la cuenta corriente vieja).

`cuenta-entidad.component.ts`, `.html` y `.scss` se **reemplazan
completos**: son de F5b y cambian en muchos puntos.

Sin índices ni reglas: NO hay deploy.

Ya verificado:

- tsc estricto, con stubs;
- prueba rápida: `armarMayor` pone `concepto` ('anticipo' / 'normal' en
  movimientos, null en el resto); `presentarSaldo` da los textos y clases
  esperados para cliente, chofer y proveedor con saldos positivo, negativo,
  casi cero (0.003 → "saldado") y cero.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto BUSCAR no aparece, o aparece más de una vez: pará y reportá,
  sin improvisar.
- Archivos con finales de línea LF.
- Build: `npm run build:demo`.
- No toques CLAUDE.md ni CHANGELOG.
- `LineaMayor` suma el campo `concepto` y `filtrosCuentaEntidad` suma
  `mayorOrden`. Con el PASO 0 revisá sus usos (incluidos `.spec.ts` y
  `.html`).
- La instrucción termina con la línea `FIN DE LA INSTRUCCIÓN F5c`. Si no la
  ves, llegó cortada: leela completa (por partes si hace falta) antes de
  empezar.

## PASO 0 — Verificación (sin cambios)

Corré y reportá la salida:

```bash
grep -rn "LineaMayor\|filtrosCuentaEntidad" src/app
grep -rn "presentarSaldo\|SaldoPresentado\|mayorOrden" src/
grep -n "F5b" src/app/raiz/finanzas-nueva/cuenta-entidad/cuenta-entidad.component.ts
grep -n '"bootstrap"' package.json
```

Esperado:

- El grep 1: solo `cuenta-entidad.util.ts`, `finanzas-consulta.service.ts`,
  `cuenta-entidad.component.ts` y `cuenta-entidad.component.html`. Ningún
  `.spec.ts`.
- El grep 2: nada.
- El grep 3: al menos una línea (confirma que el componente es el de F5b).
- El grep 4: versión 5.3 o superior. Si es menor, pará y reportá (las
  clases `text-*-emphasis` no existirían).

Si algo no coincide, pará y reportá.

## PASO 1 — `src/app/shared/utils/cuenta-entidad.util.ts`

#### 1a

BUSCAR:
```ts
import { MovimientoFin } from 'src/app/interfaces/movimiento-fin';
```

REEMPLAZAR:
```ts
import { MovimientoFin, TipoEntidadFin } from 'src/app/interfaces/movimiento-fin';
```

#### 1b

BUSCAR:
```ts
  tipo: 'liquidacion' | 'cobro' | 'pago' | 'ajuste' | 'compensacion';
  referencia: string;               // número del informe o del movimiento
```

REEMPLAZAR:
```ts
  tipo: 'liquidacion' | 'cobro' | 'pago' | 'ajuste' | 'compensacion';
  concepto: 'normal' | 'anticipo' | 'prestamo' | null;  // solo movimientos (F5c)
  referencia: string;               // número del informe o del movimiento
```

#### 1c

BUSCAR:
```ts
      fecha, orden: 0, tipo: 'liquidacion',
      referencia: liq.numeroInterno ?? liq.idInfLiq,
```

REEMPLAZAR:
```ts
      fecha, orden: 0, tipo: 'liquidacion', concepto: null,
      referencia: liq.numeroInterno ?? liq.idInfLiq,
```

#### 1d

BUSCAR:
```ts
        fecha, orden: 1, tipo: 'compensacion',
        referencia: liq.numeroInterno ?? liq.idInfLiq,
```

REEMPLAZAR:
```ts
        fecha, orden: 1, tipo: 'compensacion', concepto: null,
        referencia: liq.numeroInterno ?? liq.idInfLiq,
```

#### 1e

BUSCAR:
```ts
      fecha: m.fecha, orden: 2, tipo: m.tipo,
      referencia: m.numero, detalle,
```

REEMPLAZAR:
```ts
      fecha: m.fecha, orden: 2, tipo: m.tipo, concepto: m.concepto,
      referencia: m.numero, detalle,
```

#### 1f

BUSCAR:
```ts
export interface MayorCuenta {
```

REEMPLAZAR:
```ts
/** Saldo presentado al usuario (F5c): importe siempre positivo + qué
 *  significa según el lado. Saldo > 0: la entidad nos debe (cliente) o le
 *  debemos (chofer / proveedor); < 0: saldo a favor del otro lado. */
export interface SaldoPresentado {
  importe: number;
  texto: string;
  clase: 'saldo-deuda-cobrar' | 'saldo-deuda-pagar' | 'saldo-favor' | 'saldo-cero';
}

export function presentarSaldo(saldo: number, tipo: TipoEntidadFin): SaldoPresentado {
  if (esCero(saldo)) return { importe: 0, texto: 'saldado', clase: 'saldo-cero' };
  const cliente = tipo === 'cliente';
  if (saldo > 0) {
    return {
      importe: redondear2(saldo),
      texto: cliente ? 'nos debe' : 'le debemos',
      clase: cliente ? 'saldo-deuda-cobrar' : 'saldo-deuda-pagar',
    };
  }
  return {
    importe: redondear2(-saldo),
    texto: cliente ? 'a favor del cliente' : 'a favor nuestro',
    clase: 'saldo-favor',
  };
}

export interface MayorCuenta {
```

## PASO 2 — `src/app/servicios/finanzas-nueva/finanzas-consulta.service.ts`

#### 2a

BUSCAR:
```ts
  filtrosCuentaEntidad: { seccion: SeccionCuentaEntidad; soloAbiertos: boolean; mayorDesde: string; mayorHasta: string } = {
    seccion: 'comprobantes',
    soloAbiertos: true,
    mayorDesde: '',               // '' = sin límite (Mayor, F5b)
    mayorHasta: '',
  };
```

REEMPLAZAR:
```ts
  filtrosCuentaEntidad: {
    seccion: SeccionCuentaEntidad;
    soloAbiertos: boolean;
    mayorDesde: string;
    mayorHasta: string;
    mayorOrden: 'desc' | 'asc';
  } = {
    seccion: 'comprobantes',
    soloAbiertos: true,
    mayorDesde: '',               // '' = sin límite (Mayor, F5b)
    mayorHasta: '',
    mayorOrden: 'desc',           // más reciente arriba (F5c)
  };
```

## PASO 3 — `src/app/raiz/finanzas-nueva/listado-movimientos.ts`

#### 3a

BUSCAR:
```ts
      { key: 'tipo', label: 'Tipo', valor: m => ETIQUETA_TIPO_MOVIMIENTO[m.tipo], orden: m => m.tipo },
```

REEMPLAZAR:
```ts
      {
        key: 'tipo', label: 'Tipo', valor: m => ETIQUETA_TIPO_MOVIMIENTO[m.tipo], orden: m => m.tipo,
        clase: m => (m.tipo === 'ajuste' ? 'text-info-emphasis fw-semibold' : 'text-success fw-semibold'),
      },
```

#### 3b

BUSCAR:
```ts
          : ETIQUETA_CONCEPTO[m.concepto]),
        orden: m => m.concepto,
      },
```

REEMPLAZAR:
```ts
          : ETIQUETA_CONCEPTO[m.concepto]),
        orden: m => m.concepto,
        clase: m => (m.concepto === 'anticipo' || m.concepto === 'prestamo' ? 'text-warning-emphasis fw-semibold' : ''),
      },
```

## PASO 4 — REEMPLAZAR COMPLETOS los archivos de `src/app/raiz/finanzas-nueva/cuenta-entidad/`

### 4a — `cuenta-entidad.component.ts`

```ts
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

  volver(): void {
    this.router.navigate(['/finanzasNueva/cuentas']);
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
      diasMasAntiguo: this.resumen.diasMasAntiguo,
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
```

### 4b — `cuenta-entidad.component.html`

```html
<div class="d-flex flex-wrap align-items-center gap-2 mt-3 mb-3">
  <button type="button" class="btn btn-outline-secondary btn-sm" (click)="volver()">← Cuentas</button>
  <h3 class="mb-0 ms-2">{{ nombre || 'Cuenta' }}</h3>
  <span class="badge bg-secondary text-capitalize">{{ tipo }}</span>
  @if (cuit) {
    <span class="text-muted">CUIT {{ cuit }}</span>
  }
  <button
    *appPermiso="'finanzas.agregar'"
    type="button"
    class="btn btn-success ms-auto"
    [disabled]="!nombre || cargando || noExiste"
    (click)="registrar()"
  >{{ esCliente ? 'Registrar cobro' : 'Registrar pago' }}</button>
</div>

@if (error) {
  <div class="alert alert-danger">{{ error }}</div>
}

@if (cargando) {
  <app-spinner></app-spinner>
} @else if (noExiste) {
  <div class="alert alert-warning">
    La entidad no existe o fue dada de baja ({{ tipo }} {{ idEntidad }}).
  </div>
} @else if (resumen) {
  <div class="row g-3 mb-3">
    <div class="col-6 col-lg">
      <div class="card tarjeta h-100">
        <div class="card-body">
          <div class="tarjeta-label">Facturado abierto ({{ resumen.cantidadFacturados }})</div>
          <div class="tarjeta-valor">{{ resumen.saldoFacturado | formatearValor: '$' }}</div>
        </div>
      </div>
    </div>
    <div class="col-6 col-lg">
      <div class="card tarjeta h-100">
        <div class="card-body">
          <div class="tarjeta-label">Emitido sin facturar ({{ resumen.cantidadSinFacturar }})</div>
          <div class="tarjeta-valor text-muted">{{ resumen.sinFacturar | formatearValor: '$' }}</div>
        </div>
      </div>
    </div>
    <div class="col-6 col-lg">
      <div class="card tarjeta h-100">
        <div class="card-body">
          <div class="tarjeta-label">{{ esCliente ? 'Saldo a favor del cliente' : 'Anticipos / saldo a favor' }}</div>
          <div class="tarjeta-valor">{{ resumen.saldoAFavor | formatearValor: '$' }}</div>
        </div>
      </div>
    </div>
    <div class="col-6 col-lg">
      <div class="card tarjeta tarjeta-total h-100">
        <div class="card-body">
          @let st = presentar(resumen.saldoTotal);
          <div class="tarjeta-label">Saldo de la cuenta</div>
          <div class="tarjeta-valor" [ngClass]="st.clase">{{ st.importe | formatearValor: '$' }}</div>
          <div class="saldo-texto" [ngClass]="st.clase">{{ st.texto }}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
    <span class="text-muted me-1">Antigüedad del facturado:</span>
    @for (t of tramos; track t) {
      <span class="tramo" [class.tramo-vencido]="(t === '61-90' || t === '90+') && resumen.tramos[t] > 0">
        {{ t }} días: <b>{{ resumen.tramos[t] | formatearValor: '$' }}</b>
      </span>
    }
  </div>

  <div class="btn-group mb-2" role="group" aria-label="Sección">
    <button type="button" class="btn" [ngClass]="filtros.seccion === 'comprobantes' ? 'btn-primary' : 'btn-outline-primary'"
      (click)="cambiarSeccion('comprobantes')">Comprobantes ({{ cantidadAbiertos }} abiertos)</button>
    <button type="button" class="btn" [ngClass]="filtros.seccion === 'movimientos' ? 'btn-primary' : 'btn-outline-primary'"
      (click)="cambiarSeccion('movimientos')">Movimientos ({{ movimientos.length }})</button>
    <button type="button" class="btn" [ngClass]="filtros.seccion === 'mayor' ? 'btn-primary' : 'btn-outline-primary'"
      (click)="cambiarSeccion('mayor')">Mayor</button>
  </div>

  @if (filtros.seccion === 'comprobantes') {
    <div class="form-check mb-2">
      <input class="form-check-input" type="checkbox" id="soloAbiertos"
        [ngModel]="filtros.soloAbiertos" (ngModelChange)="onSoloAbiertos($event)" />
      <label class="form-check-label" for="soloAbiertos">Solo abiertos (emitidos y facturados con saldo)</label>
    </div>
    <app-tabla-listado
      [items]="comprobantesVisibles"
      [columnas]="columnasComprobante"
      [ordenInicial]="ordenComprobantes"
      [trackKey]="trackComprobante"
      [acciones]="accionesComprobante"
      (accion)="onAccionComprobante($event)"
      mensajeVacio="No hay comprobantes."
    ></app-tabla-listado>
  } @else if (filtros.seccion === 'mayor' && mayor) {
    <div class="d-flex flex-wrap gap-2 align-items-end mb-2">
      <div>
        <label class="form-label mb-0">Desde</label>
        <input type="date" class="form-control" [ngModel]="mayorDesde" (ngModelChange)="mayorDesde = $event; onRangoMayor()" />
      </div>
      <div>
        <label class="form-label mb-0">Hasta</label>
        <input type="date" class="form-control" [ngModel]="mayorHasta" (ngModelChange)="mayorHasta = $event; onRangoMayor()" />
      </div>
      <button type="button" class="btn btn-outline-secondary" (click)="limpiarRangoMayor()">Todo</button>
      <button type="button" class="btn btn-outline-secondary" (click)="invertirOrdenMayor()">
        {{ filtros.mayorOrden === 'desc' ? '↓ Más recientes primero' : '↑ Más antiguos primero' }}
      </button>
      @if (errorRangoMayor) {
        <span class="text-danger small ms-2">{{ errorRangoMayor }}</span>
      }
    </div>
    <div class="table-responsive">
      <table class="table table-sm table-striped align-middle mayor">
        <thead>
          <tr>
            <th class="text-center" style="width: 8rem;">Fecha</th>
            <th style="width: 8rem;">Tipo</th>
            <th>Comprobante</th>
            <th>Detalle</th>
            <th class="text-end">Liquidado</th>
            <th class="text-end">{{ esCliente ? 'Cobrado' : 'Pagado' }}</th>
            <th class="text-end">Saldo</th>
            <th style="width: 4rem;"></th>
          </tr>
        </thead>
        <tbody>
          @if (mayorDesde && filtros.mayorOrden === 'asc') {
            <ng-container *ngTemplateOutlet="filaSaldoAnterior"></ng-container>
          }
          @for (l of lineasMayor; track $index) {
            @let et = etiquetaLinea(l);
            @let s = presentar(l.saldo);
            <tr [class.text-muted]="l.informativa">
              <td class="text-center">{{ fechaLegible(l.fecha) }}</td>
              <td><span class="badge" [ngClass]="et.clase">{{ et.texto }}</span></td>
              <td>{{ l.referencia }}</td>
              <td [class.fst-italic]="l.informativa">
                {{ l.detalle }}
                @if (l.sinFacturar) {
                  <span class="badge bg-light text-dark border ms-1">sin facturar</span>
                }
              </td>
              <td class="text-end col-importe">{{ l.debe ? (l.debe | formatearValor: '$') : '' }}</td>
              <td class="text-end col-importe">{{ l.haber ? (l.haber | formatearValor: '$') : '' }}</td>
              <td class="text-end col-importe">
                @if (!l.informativa) {
                  <span [ngClass]="s.clase">{{ s.importe | formatearValor: '$' }}</span>
                  <div class="saldo-texto" [ngClass]="s.clase">{{ s.texto }}</div>
                }
              </td>
              <td class="text-center">
                <button type="button" class="btn btn-sm btn-outline-primary" (click)="verLineaMayor(l)">Ver</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="8" class="text-muted">Sin movimientos en el rango.</td></tr>
          }
          @if (mayorDesde && filtros.mayorOrden === 'desc') {
            <ng-container *ngTemplateOutlet="filaSaldoAnterior"></ng-container>
          }
        </tbody>
        <tfoot>
          @let sf = presentar(mayor.saldoFinal);
          <tr class="fw-bold">
            <td colspan="4" class="text-end">Totales del rango / saldo final</td>
            <td class="text-end col-importe">{{ mayor.totalDebe | formatearValor: '$' }}</td>
            <td class="text-end col-importe">{{ mayor.totalHaber | formatearValor: '$' }}</td>
            <td class="text-end col-importe">
              <span [ngClass]="sf.clase">{{ sf.importe | formatearValor: '$' }}</span>
              <div class="saldo-texto" [ngClass]="sf.clase">{{ sf.texto }}</div>
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
    <ng-template #filaSaldoAnterior>
      @let sa = presentar(mayor.saldoAnterior);
      <tr class="fw-bold fila-saldo-anterior">
        <td class="text-center">{{ fechaLegible(mayorDesde) }}</td>
        <td colspan="5">Saldo anterior (antes del {{ fechaLegible(mayorDesde) }})</td>
        <td class="text-end col-importe">
          <span [ngClass]="sa.clase">{{ sa.importe | formatearValor: '$' }}</span>
          <div class="saldo-texto" [ngClass]="sa.clase">{{ sa.texto }}</div>
        </td>
        <td></td>
      </tr>
    </ng-template>
    <p class="text-muted small">
      <b>Liquidado:</b> liquidaciones emitidas, a la fecha de emisión (las sin factura, marcadas).
      <b>{{ esCliente ? 'Cobrado' : 'Pagado' }}:</b> {{ esCliente ? 'cobros' : 'pagos y anticipos' }} y ajustes, por su total.
      Las compensaciones (en gris) no mueven el saldo: el anticipo ya se descontó al entregarse.
      El <b>saldo</b> de cada línea es el de la cuenta después de esa línea:
      @if (esCliente) {
        <span class="saldo-deuda-cobrar">nos debe</span> /
      } @else {
        <span class="saldo-deuda-pagar">le debemos</span> /
      }
      <span class="saldo-favor">{{ esCliente ? 'a favor del cliente' : 'a favor nuestro' }}</span>.
      Sin rango, el saldo final es el saldo de la cuenta.
    </p>
  } @else {
    <app-tabla-listado
      [items]="movimientos"
      [columnas]="columnasMovimiento"
      [ordenInicial]="ordenMovimientos"
      [trackKey]="trackMovimiento"
      [acciones]="accionesMovimiento"
      [bloqueada]="procesando"
      (accion)="onAccionMovimiento($event)"
      mensajeVacio="No hay movimientos."
    ></app-tabla-listado>
  }

  <p class="text-muted small mt-2">
    <b>Saldo de la cuenta</b> = facturado abierto + emitido sin facturar − {{ esCliente ? 'saldo a favor' : 'anticipos / saldo a favor' }}.
    Lo emitido sin facturar todavía no se puede {{ esCliente ? 'cobrar' : 'pagar' }}.
    La antigüedad se cuenta desde la fecha de la factura.
  </p>
}

@if (procesando) {
  <app-spinner></app-spinner>
}
```

### 4c — `cuenta-entidad.component.scss`

```scss
.tarjeta {
  border-left: 4px solid #0d6efd;
}

.tarjeta-total {
  border-left-color: #198754;
}

.tarjeta-label {
  font-size: 0.85rem;
  color: #6c757d;
}

.tarjeta-valor {
  font-size: 1.35rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.tramo {
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  padding: 0.15rem 0.6rem;
  font-variant-numeric: tabular-nums;
}

.tramo-vencido {
  border-color: #dc3545;
  color: #dc3545;
}

.mayor td,
.mayor th {
  font-variant-numeric: tabular-nums;
}

.col-importe {
  font-variant-numeric: tabular-nums;
}

// F5c — saldo legible por lado
.saldo-deuda-cobrar {
  color: #0d6efd;
}

.saldo-deuda-pagar {
  color: #dc3545;
}

.saldo-favor {
  color: #c2410c;
}

.saldo-cero {
  color: #6c757d;
}

.saldo-texto {
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1;
}

.fila-saldo-anterior td {
  background-color: #f1f3f5;
}
```

## PASO 5 — Verificación

```bash
npm run build:demo
grep -c "export function presentarSaldo" src/app/shared/utils/cuenta-entidad.util.ts   # 1
grep -c "concepto: null\|concepto: m.concepto" src/app/shared/utils/cuenta-entidad.util.ts   # 3
grep -c "mayorOrden" src/app/servicios/finanzas-nueva/finanzas-consulta.service.ts   # 2
grep -c "emphasis" src/app/raiz/finanzas-nueva/listado-movimientos.ts   # 2
grep -c "filaSaldoAnterior" src/app/raiz/finanzas-nueva/cuenta-entidad/cuenta-entidad.component.html   # 3
git status --short
```

Esperado:

- El build termina sin errores. Los warnings de presupuesto previos no
  cuentan.
- Los conteos coinciden.
- `git status` muestra 6 archivos modificados: util, consulta,
  listado-movimientos y los 3 de cuenta-entidad. Además, lo tuyo sin
  trackear, si lo hay.

Reportá la salida.

## Pruebas manuales (demo)

1. **Cliente con deuda** (Ver cuenta):
   - la tarjeta se llama "Saldo de la cuenta", con el importe en azul y
     "nos debe" debajo;
   - el importe coincide con el "Saldo total" que mostraba antes (mismo
     número, sin signo).
2. **Mayor del cliente, sin rango:**
   - abre con lo más reciente arriba; el botón dice "↓ Más recientes
     primero";
   - columnas Fecha | Tipo | Comprobante | Detalle | Liquidado | Cobrado |
     Saldo;
   - etiquetas: liquidaciones en gris, cobros en verde;
   - el saldo de la PRIMERA fila (la más reciente) = saldo final del pie =
     tarjeta "Saldo de la cuenta".
3. **Invertir orden:** el botón pasa a "↑ Más antiguos primero" y la
   primera fila es la más vieja. Los saldos de cada línea no cambian (solo
   el orden). Salir de la cuenta y volver conserva el orden elegido.
4. **Rango con "Desde":**
   - con orden descendente, "Saldo anterior" (fondo gris) queda AL FINAL;
   - con orden ascendente, queda AL PRINCIPIO;
   - en ambos casos muestra importe, color y texto.
5. **Chofer con anticipo compensado** (G3, marzo):
   - la tarjeta muestra el importe en rojo con "le debemos" (o naranja con
     "a favor nuestro" si el anticipo supera lo liquidado; "saldado" en
     gris si quedó en cero);
   - Mayor: columna "Pagado"; el anticipo con etiqueta amarilla
     "Anticipo"; el pago con "Pago" verde; la compensación con etiqueta
     clara, en gris y SIN saldo en su fila;
   - un ajuste (si hay alguno) va en celeste.
6. **Cliente con saldo a favor** (G2 generó algunos): en alguna línea o en
   la tarjeta aparece el importe en naranja con "a favor del cliente".
7. **Pestaña Movimientos** (Finanzas nueva → Movimientos, y la de la
   cuenta):
   - Tipo "Cobro" / "Pago" en verde y "Ajuste" en celeste;
   - concepto "Anticipo" / "Préstamo" en amarillo oscuro;
   - el resto (Sin imputar en amarillo, Anulado en rojo) sigue igual.
8. **Ver** desde el Mayor sigue abriendo la historia (liquidación) o el
   detalle (movimiento).

## Commit (lo hace Nico)

```
feat(finanzas): mayor más legible — etiquetas por tipo, orden y saldo con color (F5c)

- Mayor: columna Tipo con etiqueta de color (liquidación, cobro/pago,
  anticipo/préstamo, ajuste, compensación); Debe/Haber pasan a
  Liquidado / Cobrado o Pagado; más reciente arriba con botón para
  invertir (recordado en la sesión); saldo anterior pegado a lo más viejo.
- presentarSaldo (cuenta-entidad.util): importe positivo + "nos debe" /
  "le debemos" / "a favor de…" / "saldado", con color; en la tarjeta
  "Saldo de la cuenta", cada línea, saldo anterior y saldo final.
- LineaMayor suma concepto; filtrosCuentaEntidad suma mayorOrden.
- Listado de movimientos: tipo y concepto anticipo/préstamo en color.
```

FIN DE LA INSTRUCCIÓN F5c
````
