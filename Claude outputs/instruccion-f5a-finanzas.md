````
# Instrucción F5a — Finanzas: Cuenta de la entidad (encabezado, comprobantes, movimientos)

## Contexto

Frente Finanzas. Diseño: `claude/diseno-finanzas.md` §4.5 (pantalla 3) y
§18 (ronda 6: F36–F40). Hasta ahora Cuentas muestra una fila por entidad. Este
bloque agrega la **Cuenta de UNA entidad** como página propia (F39), en la
ruta `finanzasNueva/cuenta/:tipo/:id`. Se abre desde "Ver cuenta" en la fila
de Cuentas y tiene botón Volver.

1. **Datos en vivo.** `FinanzasConsultaService.observarCuentaEntidad(tipo,
   id)` lee TODOS los InformeLiq y movimientos de la entidad. La consulta es
   `entidad.id == id`: una igualdad sobre un campo anidado, que usa el
   índice simple automático. El tipo se filtra en memoria. NO hay índice
   nuevo.
2. **Util puro `cuenta-entidad.util.ts`:**
   - `resumirCuentaEntidad`: facturado abierto, emitido sin facturar, saldo
     a favor / anticipos y **saldo total = facturado + sin facturar − a
     favor** (F37); también la antigüedad del facturado por tramos (0-30,
     31-60, 61-90, 90+, desde la fecha de la factura).
   - `armarComprobantesCuenta`: todos los InformeLiq salvo los borradores,
     con total, compensado, cobrado/pagado, ajustado, saldo, días y si está
     abierto.
3. **Página `CuentaEntidadComponent`:**
   - encabezado con nombre, tipo y CUIT; tarjetas y tramos de antigüedad;
   - botón "Registrar cobro / pago" con la entidad fija
     (`finanzas.agregar`);
   - dos secciones, recordadas en la sesión:
     - **Comprobantes**: "solo abiertos" o todos; "Ver" abre el detalle del
       informe (el mismo de Facturación);
     - **Movimientos**: los de la entidad, con Ver, Imputar y Anular como
       en la pestaña Movimientos.

   El Mayor (saldo acumulado, fecha de emisión — F36) y la historia de un
   comprobante llegan en **F5b**. La exportación queda para F8 (F40).
4. **Reutilización sin duplicar:**
   - los gestos sobre un movimiento (ver detalle, imputar, anular con
     motivo) pasan a `AccionesMovimientoService`;
   - las columnas y acciones del listado de movimientos pasan a
     `listado-movimientos.ts`;
   - la pestaña Movimientos se reescribe para usarlos. Se comporta igual:
     mismas columnas, acciones y mensajes.
5. **Cuentas:** acción "Ver cuenta" por fila. La pestaña "Cuentas" queda
   resaltada también dentro de una cuenta (alias de ruta).

Sin índices ni reglas: NO hay deploy.

Ya verificado:

- tsc estricto, con stubs;
- prueba rápida del util: tramos, exclusión de borradores, revertidos no
  abiertos, saldo a favor solo de movimientos vigentes, saldo total.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto BUSCAR no aparece, o aparece más de una vez: pará y reportá,
  sin improvisar.
- Archivos con finales de línea LF.
- Build: `npm run build:demo`.
- No toques CLAUDE.md ni CHANGELOG.
- La instrucción termina con la línea `FIN DE LA INSTRUCCIÓN F5a`. Si no la
  ves, llegó cortada: leela completa (por partes si hace falta) antes de
  empezar.

## PASO 0 — Verificación (sin cambios)

Corré y reportá la salida:

```bash
grep -rn "CuentaEntidadComponent\|observarCuentaEntidad\|AccionesMovimientoService\|columnasMovimientos\|cuenta-entidad.util" src/
grep -n "abrirImputar(m: Fila): void {\|private importe(valor: number): string {\|private armarColumnas(): ColumnaListado<Fila>\[\] {" src/app/raiz/finanzas-nueva/movimientos/finanzas-movimientos.component.ts
grep -n "verDetalle\|abrirImputar\|anular(" src/app/raiz/finanzas-nueva/movimientos/finanzas-movimientos.component.html
grep -n "alias" src/app/shared/utils/tabs-url.util.ts
grep -n "@Input() modulo" src/app/shared/modales/informe-liq-nuevo-detalle/informe-liq-nuevo-detalle.component.ts
grep -n "ordenPeriodo(periodo: PeriodoLiq): number" src/app/servicios/informes-liq/informe-liq-factory.service.ts
```

Esperado:

- El grep 1: nada.
- El grep 2: 3 líneas. Confirma que `finanzas-movimientos.component.ts` es
  el de F4b, que se reemplaza entero en el PASO 4.
- El grep 3: nada (el html no llama a esos métodos).
- `alias`: al menos 1 línea (`TabRuta.alias`).
- `@Input() modulo`: 1 línea.
- `ordenPeriodo`: 1 línea.

Si algo no coincide, pará y reportá.

## PASO 1 — NUEVO `src/app/shared/utils/cuenta-entidad.util.ts`

```ts
import { EstadoFinancieroLiq, InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { MovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { fechaBaseAntiguedad } from 'src/app/shared/utils/cuentas-finanzas.util';
import {
  TRAMOS_ANTIGUEDAD, TramoAntiguedad, diasEntre, esCero, normalizarValoresFinancieros, redondear2, tramoAntiguedad,
} from 'src/app/shared/utils/finanzas.util';

/** Cuenta de UNA entidad (Frente Finanzas, F5) — utils PUROS sobre todos sus
 *  InformeLiq y movimientos. Calculada al consultar (sin agregados).
 *  Saldo de la cuenta (F37) = facturado abierto + emitido sin facturar −
 *  saldo a favor / anticipos, mostrando las tres partes. Los borradores no
 *  cuentan (son propuestas); los revertidos y anulados son historia.
 *  Diseño: claude/diseno-finanzas.md §4.5 (pantalla 3) y §18. */

/** Sección visible de la cuenta (recordada en la sesión). F5b suma 'mayor'. */
export type SeccionCuentaEntidad = 'comprobantes' | 'movimientos';

export interface ResumenCuentaEntidad {
  saldoFacturado: number;           // Σ saldo de facturados con saldo
  cantidadFacturados: number;
  sinFacturar: number;              // Σ saldo de emitidos (todavía no se cobran/pagan)
  cantidadSinFacturar: number;
  saldoAFavor: number;              // Σ sinImputar de movimientos vigentes
  saldoTotal: number;               // saldoFacturado + sinFacturar − saldoAFavor (F37)
  /** saldoFacturado por tramo de antigüedad (desde la fecha de la factura). */
  tramos: Record<TramoAntiguedad, number>;
  diasMasAntiguo: number | null;
}

/** Un InformeLiq en la sección Comprobantes de la cuenta. */
export interface FilaComprobanteCuenta<L extends InformeLiqNuevo = InformeLiqNuevo> {
  liq: L;
  estado: InformeLiqNuevo['estado'];
  fechaEmision: string | null;
  fechaFactura: string | null;
  total: number;                    // valor del servicio
  compensado: number;
  cobrado: number;                  // cobrado (cliente) / pagado (chofer, proveedor)
  ajustado: number;
  saldo: number;
  dias: number | null;              // antigüedad (solo facturados con saldo)
  abierto: boolean;                 // emitido, o facturado con saldo
  estadoFinanciero: EstadoFinancieroLiq;
}

function diasDesde(fecha: string | null | undefined, hoy: string): number | null {
  if (!fecha) return null;
  try {
    return diasEntre(fecha, hoy);
  } catch {
    return null;
  }
}

/** Filas de Comprobantes: todos los InformeLiq de la entidad salvo los
 *  borradores (emitidos, facturados, revertidos, anulados). Los revertidos y
 *  anulados no están abiertos. Orden: emisión más reciente primero. */
export function armarComprobantesCuenta<L extends InformeLiqNuevo>(informes: L[], hoy: string): FilaComprobanteCuenta<L>[] {
  return informes
    .filter(liq => liq.estado !== 'borrador')
    .map(liq => {
      const vf = normalizarValoresFinancieros(liq.valoresFinancieros, liq.valores.total);
      const vigente = liq.estado === 'emitido' || liq.estado === 'facturado';
      const abierto = liq.estado === 'emitido' || (liq.estado === 'facturado' && !esCero(vf.saldo));
      return {
        liq,
        estado: liq.estado,
        fechaEmision: liq.fechaEmision,
        fechaFactura: liq.factura?.fecha ?? null,
        total: vf.total,
        compensado: vf.totalCompensado,
        cobrado: vf.totalCobrado,
        ajustado: vf.totalAjustado,
        saldo: vigente ? vf.saldo : 0,
        dias: liq.estado === 'facturado' && !esCero(vf.saldo) ? diasDesde(fechaBaseAntiguedad(liq), hoy) : null,
        abierto,
        estadoFinanciero: liq.estadoFinanciero,
      };
    })
    .sort((a, b) =>
      (b.fechaEmision ?? b.liq.fechaCreacion).localeCompare(a.fechaEmision ?? a.liq.fechaCreacion) ||
      (b.liq.numeroInterno ?? '').localeCompare(a.liq.numeroInterno ?? ''));
}

/** Resumen del encabezado de la cuenta (F37). */
export function resumirCuentaEntidad(
  informes: InformeLiqNuevo[],
  movimientos: MovimientoFin[],
  hoy: string,
): ResumenCuentaEntidad {
  const tramos = Object.fromEntries(TRAMOS_ANTIGUEDAD.map(t => [t, 0])) as Record<TramoAntiguedad, number>;
  const r: ResumenCuentaEntidad = {
    saldoFacturado: 0, cantidadFacturados: 0, sinFacturar: 0, cantidadSinFacturar: 0,
    saldoAFavor: 0, saldoTotal: 0, tramos, diasMasAntiguo: null,
  };
  for (const liq of informes) {
    if (liq.estado !== 'facturado' && liq.estado !== 'emitido') continue;
    const saldo = normalizarValoresFinancieros(liq.valoresFinancieros, liq.valores.total).saldo;
    if (esCero(saldo)) continue;
    if (liq.estado === 'emitido') {
      r.sinFacturar = redondear2(r.sinFacturar + saldo);
      r.cantidadSinFacturar++;
      continue;
    }
    r.saldoFacturado = redondear2(r.saldoFacturado + saldo);
    r.cantidadFacturados++;
    const dias = diasDesde(fechaBaseAntiguedad(liq), hoy);
    const tramo = tramoAntiguedad(dias ?? 0);
    r.tramos[tramo] = redondear2(r.tramos[tramo] + saldo);
    if (dias !== null) r.diasMasAntiguo = r.diasMasAntiguo === null ? dias : Math.max(r.diasMasAntiguo, dias);
  }
  for (const m of movimientos) {
    if (m.estado !== 'vigente' || esCero(m.sinImputar ?? 0)) continue;
    r.saldoAFavor = redondear2(r.saldoAFavor + m.sinImputar);
  }
  r.saldoTotal = redondear2(r.saldoFacturado + r.sinFacturar - r.saldoAFavor);
  return r;
}
```

## PASO 2 — `src/app/servicios/finanzas-nueva/finanzas-consulta.service.ts`

#### 2a

BUSCAR:
```ts
import { CompensableFin, armarCompensables } from 'src/app/shared/utils/compensacion.util';
```

REEMPLAZAR:
```ts
import { CompensableFin, armarCompensables } from 'src/app/shared/utils/compensacion.util';
import { SeccionCuentaEntidad } from 'src/app/shared/utils/cuenta-entidad.util';
```

#### 2b

BUSCAR:
```ts
  /** Filtros de la pestaña Movimientos, recordados durante la sesión. Rango
```

REEMPLAZAR:
```ts
  /** Cuenta de la entidad (F5): sección visible y filtro de comprobantes,
   *  recordados durante la sesión. */
  filtrosCuentaEntidad: { seccion: SeccionCuentaEntidad; soloAbiertos: boolean } = {
    seccion: 'comprobantes',
    soloAbiertos: true,
  };

  /** Filtros de la pestaña Movimientos, recordados durante la sesión. Rango
```

#### 2c

BUSCAR:
```ts
  /** En vivo: una cuenta por entidad (ver armarCuentas).
```

REEMPLAZAR:
```ts
  /** En vivo (F5): TODOS los InformeLiq y movimientos de una entidad
   *  (`entidad.id == id`: una igualdad sobre un campo anidado → índice simple
   *  automático; el tipo se filtra en memoria). Incluye borradores,
   *  revertidos y anulados: la pantalla decide qué mostrar. */
  observarCuentaEntidad(
    tipo: TipoEntidadFin,
    idEntidad: string,
  ): Observable<{ informes: ConId<InformeLiqNuevo>[]; movimientos: ConId<MovimientoFin>[] }> {
    const informes$ = this.db.observarPorCampo<InformeLiqNuevo>(this.COL_LIQ, 'entidad.id', idEntidad).pipe(
      map(items => items.filter(i => i.tipo === tipo).map(i => ({ ...i, idInfLiq: i.id }))),
    );
    const movimientos$ = this.db.observarPorCampo<MovimientoFin>(this.COL_MOV, 'entidad.id', idEntidad).pipe(
      map(items => items.filter(m => m.entidad.tipo === tipo).map(m => ({ ...m, idMovimiento: m.id }))),
    );
    return combineLatest([informes$, movimientos$]).pipe(
      map(([informes, movimientos]) => ({ informes, movimientos })),
    );
  }

  /** En vivo: una cuenta por entidad (ver armarCuentas).
```

## PASO 3 — NUEVOS `src/app/raiz/finanzas-nueva/acciones-movimiento.service.ts` y `listado-movimientos.ts`

### 3a — `src/app/raiz/finanzas-nueva/acciones-movimiento.service.ts`

```ts
import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { MovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { MovimientoFinService } from 'src/app/servicios/finanzas-nueva/movimiento-fin.service';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import { ETIQUETA_TIPO_MOVIMIENTO } from 'src/app/shared/utils/movimiento-fin.util';
import { DetalleMovimientoComponent } from './modales/detalle-movimiento/detalle-movimiento.component';
import { ImputarSaldoComponent } from './modales/imputar-saldo/imputar-saldo.component';

/** Gestos de UI sobre un movimiento de Finanzas, compartidos por la pestaña
 *  Movimientos y la Cuenta de la entidad (F5): ver el detalle, imputar el
 *  saldo y anular con motivo. Solo abre modales / confirmaciones y delega en
 *  MovimientoFinService (que revalida todo en su transacción). Sin refresco
 *  manual: las pantallas escuchan en vivo. Vive en el módulo finanzas-nueva
 *  porque abre sus modales. */
@Injectable({ providedIn: 'root' })
export class AccionesMovimientoService {

  constructor(
    private modalService: NgbModal,
    private movimientoServ: MovimientoFinService,
  ) {}

  /** Detalle en modal. Si se cierra con 'anular' o 'imputar', sigue ese
   *  flujo. `alProcesar` avisa mientras corre una anulación. */
  verDetalle(m: ConId<MovimientoFin>, alProcesar?: (procesando: boolean) => void): void {
    const modalRef = this.modalService.open(DetalleMovimientoComponent, {
      size: 'xl', centered: true, scrollable: true,
    });
    modalRef.componentInstance.movimiento = m;
    modalRef.result
      .then(resultado => {
        if (resultado === 'anular') this.anular(m, alProcesar);
        else if (resultado === 'imputar') this.imputar(m);
      })
      .catch(() => {});
  }

  /** Imputar el saldo sin imputar a comprobantes de la entidad. */
  imputar(m: ConId<MovimientoFin>): void {
    const modalRef = this.modalService.open(ImputarSaldoComponent, {
      size: 'xl', centered: true, scrollable: true, backdrop: 'static', keyboard: false,
    });
    modalRef.componentInstance.movimiento = m;
    modalRef.result.catch(() => {});
  }

  /** Pide el motivo (obligatorio) y delega en MovimientoFinService.anular. */
  async anular(m: ConId<MovimientoFin>, alProcesar?: (procesando: boolean) => void): Promise<void> {
    const tipo = ETIQUETA_TIPO_MOVIMIENTO[m.tipo].toLowerCase();
    const comprobantes = new Set(m.imputaciones.map(i => i.documento.id)).size;
    const r = await Swal.fire({
      title: `¿Anular el ${tipo} ${m.numero}?`,
      html:
        `<p><b>${m.entidad.razonSocial}</b> — $ ${this.importe(m.total)} — ${fechaComprobanteLegible(m.fecha)}</p>` +
        (comprobantes > 0
          ? `<p>Los ${comprobantes} comprobante(s) imputados recuperan el saldo que canceló este ${tipo}.</p>`
          : '') +
        (m.sinImputar > 0
          ? `<p>Los $ ${this.importe(m.sinImputar)} sin imputar dejan de estar disponibles.</p>`
          : '') +
        `<p>El movimiento queda <b>anulado</b> con su número. No se puede deshacer.</p>`,
      input: 'textarea',
      inputLabel: 'Motivo de la anulación',
      inputPlaceholder: 'Obligatorio',
      inputValidator: (v: string) => (!v || !v.trim() ? 'El motivo es obligatorio.' : null),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Anular',
      cancelButtonText: 'Cancelar',
    });
    if (!r.isConfirmed) return;

    alProcesar?.(true);
    try {
      const res = await this.movimientoServ.anular(m.idMovimiento, r.value as string);
      Swal.fire({ icon: res.exito ? 'success' : 'error', text: res.mensaje });
    } finally {
      alProcesar?.(false);
    }
  }

  private importe(valor: number): string {
    return valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
```

### 3b — `src/app/raiz/finanzas-nueva/listado-movimientos.ts`

```ts
import { ConId } from 'src/app/interfaces/conId';
import { MovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { AccionListado, ColumnaListado } from 'src/app/interfaces/tabla-listado';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import {
  ETIQUETA_CONCEPTO, ETIQUETA_MOTIVO_AJUSTE, ETIQUETA_TIPO_MOVIMIENTO, resumenMedios,
} from 'src/app/shared/utils/movimiento-fin.util';

/** Columnas y acciones de fila de un listado de movimientos de Finanzas —
 *  compartidas por la pestaña Movimientos y la Cuenta de la entidad (F5).
 *  Los ids de acción ('ver', 'imputar', 'anular') los resuelve
 *  AccionesMovimientoService. */

export type FilaMovimiento = ConId<MovimientoFin>;

export function accionesMovimientos(): AccionListado<FilaMovimiento>[] {
  return [
    { id: 'ver', label: 'Ver', clase: 'btn-outline-primary' },
    {
      id: 'imputar', label: 'Imputar', clase: 'btn-outline-success', permiso: 'finanzas.editar',
      visible: m => m.estado === 'vigente' && m.tipo !== 'ajuste' && m.sinImputar > 0,
    },
    {
      id: 'anular', label: 'Anular', clase: 'btn-outline-danger', permiso: 'finanzas.anular',
      visible: m => m.estado === 'vigente',
      deshabilitada: m => m.imputaciones.some(i => i.origen === 'compensacion'),
    },
  ];
}

/** `conEntidad`: false en la Cuenta de la entidad (la entidad ya es el
 *  encabezado). */
export function columnasMovimientos(opciones: { conEntidad: boolean }): ColumnaListado<FilaMovimiento>[] {
  type Fila = FilaMovimiento;
    const tachado = (m: Fila) => (m.estado === 'anulado' ? 'text-decoration-line-through text-muted' : '');
    const columnas: ColumnaListado<Fila>[] = [
      {
        key: 'fecha', label: 'Fecha', valor: m => fechaComprobanteLegible(m.fecha),
        orden: m => `${m.fecha}|${m.fechaRegistro}`, align: 'center',
      },
      { key: 'numero', label: 'Número', valor: m => m.numero, orden: m => m.numero, clase: tachado },
      { key: 'tipo', label: 'Tipo', valor: m => ETIQUETA_TIPO_MOVIMIENTO[m.tipo], orden: m => m.tipo },
      {
        key: 'concepto', label: 'Concepto',
        valor: m => (m.tipo === 'ajuste'
          ? (m.motivoAjuste ? ETIQUETA_MOTIVO_AJUSTE[m.motivoAjuste] : '—')
          : ETIQUETA_CONCEPTO[m.concepto]),
        orden: m => m.concepto,
      },
      { key: 'entidad', label: 'Entidad', valor: m => m.entidad.razonSocial, orden: m => m.entidad.razonSocial },
      {
        key: 'tipoEntidad', label: 'Tipo entidad', valor: m => m.entidad.tipo, orden: m => m.entidad.tipo,
        clase: 'text-capitalize',
      },
      { key: 'medios', label: 'Medios', valor: m => resumenMedios(m.medios) },
      {
        key: 'total', label: 'Total', valor: m => m.total, orden: m => m.total, tipo: 'moneda',
        clase: tachado,
      },
      { key: 'imputado', label: 'Imputado', valor: m => m.totalImputado, orden: m => m.totalImputado, tipo: 'moneda' },
      {
        key: 'sinImputar', label: 'Sin imputar', valor: m => m.sinImputar, orden: m => m.sinImputar, tipo: 'moneda',
        clase: m => (m.estado === 'vigente' && m.sinImputar > 0 ? 'text-warning fw-bold' : ''),
      },
      {
        key: 'estado', label: 'Estado', valor: m => (m.estado === 'anulado' ? 'Anulado' : 'Vigente'),
        orden: m => m.estado, align: 'center',
        clase: m => (m.estado === 'anulado' ? 'text-danger fw-bold' : ''),
      },
    ];
  return opciones.conEntidad ? columnas : columnas.filter(c => c.key !== 'entidad' && c.key !== 'tipoEntidad');
}
```

## PASO 4 — REEMPLAZAR COMPLETO `src/app/raiz/finanzas-nueva/movimientos/finanzas-movimientos.component.ts`

Reemplazá TODO el contenido del archivo por esto. El html y el scss no
cambian.

```ts
import { Component, OnDestroy, OnInit } from '@angular/core';
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
    else if (ev.id === 'anular') this.accionesMov.anular(ev.item, alProcesar);
  }
}
```

## PASO 5 — NUEVA página `src/app/raiz/finanzas-nueva/cuenta-entidad/`

### 5a — `cuenta-entidad.component.ts`

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
  FilaComprobanteCuenta, ResumenCuentaEntidad, SeccionCuentaEntidad, armarComprobantesCuenta, resumirCuentaEntidad,
} from 'src/app/shared/utils/cuenta-entidad.util';
import { CuentaEntidadFin, ladoDe } from 'src/app/shared/utils/cuentas-finanzas.util';
import { nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import { TRAMOS_ANTIGUEDAD } from 'src/app/shared/utils/finanzas.util';
import { AccionesMovimientoService } from '../acciones-movimiento.service';
import { FilaMovimiento, accionesMovimientos, columnasMovimientos } from '../listado-movimientos';
import { RegistrarMovimientoComponent } from '../modales/registrar-movimiento/registrar-movimiento.component';

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
 *  - Registrar cobro / pago desde el encabezado.
 *  El Mayor y la historia de un comprobante llegan en F5b. */
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

  resumen: ResumenCuentaEntidad | null = null;
  comprobantes: FilaComprobante[] = [];
  comprobantesVisibles: FilaComprobante[] = [];
  movimientos: FilaMovimiento[] = [];
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
  ];
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

  get filtros(): { seccion: SeccionCuentaEntidad; soloAbiertos: boolean } {
    return this.consulta.filtrosCuentaEntidad;
  }

  get esCliente(): boolean {
    return this.tipo === 'cliente';
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap(params => {
          const tipo = params.get('tipo') as TipoEntidadFin;
          this.idEntidad = params.get('id') ?? '';
          this.tipo = TIPOS_VALIDOS.includes(tipo) ? tipo : 'cliente';
          this.error = TIPOS_VALIDOS.includes(tipo) && this.idEntidad ? null : 'Cuenta inválida.';
          this.columnasComprobante = this.armarColumnasComprobante();
          this.cargando = true;
          return this.consulta.observarCuentaEntidad(this.tipo, this.idEntidad);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: ({ informes, movimientos }) => {
          const ref = informes[0]?.entidad;
          const mov = movimientos[0]?.entidad;
          this.nombre = ref ? nombreEntidadRef(ref) : (mov?.razonSocial ?? '');
          this.cuit = ref?.cuit ?? mov?.cuit ?? null;
          this.resumen = resumirCuentaEntidad(informes, movimientos, this.hoy);
          this.comprobantes = armarComprobantesCuenta(informes, this.hoy);
          this.movimientos = movimientos;
          this.aplicarFiltroComprobantes();
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
    if (!this.resumen || !this.nombre) return;
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

### 5b — `cuenta-entidad.component.html`

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
    [disabled]="!nombre || cargando"
    (click)="registrar()"
  >{{ esCliente ? 'Registrar cobro' : 'Registrar pago' }}</button>
</div>

@if (error) {
  <div class="alert alert-danger">{{ error }}</div>
}

@if (cargando) {
  <app-spinner></app-spinner>
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
          <div class="tarjeta-label">{{ esCliente ? 'Saldo total (nos debe)' : 'Saldo total (le debemos)' }}</div>
          <div class="tarjeta-valor">{{ resumen.saldoTotal | formatearValor: '$' }}</div>
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
    <b>Saldo total</b> = facturado abierto + emitido sin facturar − {{ esCliente ? 'saldo a favor' : 'anticipos / saldo a favor' }}.
    Lo emitido sin facturar todavía no se puede {{ esCliente ? 'cobrar' : 'pagar' }}.
    La antigüedad se cuenta desde la fecha de la factura.
  </p>
}

@if (procesando) {
  <app-spinner></app-spinner>
}
```

### 5c — `cuenta-entidad.component.scss`

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
```

## PASO 6 — Ruta, pestaña y módulo

### `src/app/raiz/finanzas-nueva/finanzas-nueva-routing.module.ts`

#### 6ra

BUSCAR:
```ts
import { FinanzasMovimientosComponent } from './movimientos/finanzas-movimientos.component';
```

REEMPLAZAR:
```ts
import { FinanzasMovimientosComponent } from './movimientos/finanzas-movimientos.component';
import { CuentaEntidadComponent } from './cuenta-entidad/cuenta-entidad.component';
```

#### 6rb

BUSCAR:
```ts
      { path: 'movimientos', component: FinanzasMovimientosComponent },
```

REEMPLAZAR:
```ts
      { path: 'movimientos', component: FinanzasMovimientosComponent },
      { path: 'cuenta/:tipo/:id', component: CuentaEntidadComponent },
```

### `src/app/raiz/finanzas-nueva/control/finanzas-nueva-control.component.ts`

#### 6ca

BUSCAR:
```ts
    { id: 'cuentas', name: 'Cuentas', route: 'finanzasNueva/cuentas' },
```

REEMPLAZAR:
```ts
    { id: 'cuentas', name: 'Cuentas', route: 'finanzasNueva/cuentas', alias: ['finanzasNueva/cuenta'] },
```

### `src/app/raiz/finanzas-nueva/finanzas-nueva.module.ts`

#### 6ma

BUSCAR:
```ts
import { ImputarSaldoComponent } from './modales/imputar-saldo/imputar-saldo.component';
```

REEMPLAZAR:
```ts
import { ImputarSaldoComponent } from './modales/imputar-saldo/imputar-saldo.component';
import { CuentaEntidadComponent } from './cuenta-entidad/cuenta-entidad.component';
```

#### 6mb

BUSCAR:
```ts
    ImputarSaldoComponent,
  ],
```

REEMPLAZAR:
```ts
    ImputarSaldoComponent,
    CuentaEntidadComponent,
  ],
```

## PASO 7 — Cuentas: acción "Ver cuenta"

### `src/app/raiz/finanzas-nueva/cuentas/finanzas-cuentas.component.ts`

#### 7a

BUSCAR:
```ts
import { Component, OnDestroy, OnInit } from '@angular/core';
```

REEMPLAZAR:
```ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
```

#### 7b

BUSCAR:
```ts
  readonly acciones: AccionListado<Fila>[] = [
```

REEMPLAZAR:
```ts
  readonly acciones: AccionListado<Fila>[] = [
    { id: 'cuenta', label: 'Ver cuenta', clase: 'btn-outline-primary' },
```

#### 7c

BUSCAR:
```ts
    private modalService: NgbModal,
  ) {}
```

REEMPLAZAR:
```ts
    private modalService: NgbModal,
    private router: Router,
  ) {}
```

#### 7d

BUSCAR:
```ts
    if (ev.id === 'cobrar' || ev.id === 'pagar') this.abrirRegistro(ev.item);
```

REEMPLAZAR:
```ts
    if (ev.id === 'cuenta') this.router.navigate(['/finanzasNueva/cuenta', ev.item.tipo, ev.item.idEntidad]);
    else if (ev.id === 'cobrar' || ev.id === 'pagar') this.abrirRegistro(ev.item);
```

#### 7e

BUSCAR:
```ts
 *  "Nuevo cobro/pago" (RegistrarMovimientoComponent). La cuenta de la
 *  entidad llega en F5. */
```

REEMPLAZAR:
```ts
 *  "Nuevo cobro/pago" (RegistrarMovimientoComponent). "Ver cuenta" abre la
 *  Cuenta de la entidad (F5, ruta finanzasNueva/cuenta/:tipo/:id). */
```

## PASO 8 — Verificación

```bash
npm run build:demo
grep -rln "AccionesMovimientoService" src/app            # el servicio, movimientos y cuenta-entidad (3)
grep -rln "columnasMovimientos" src/app                  # listado-movimientos, movimientos y cuenta-entidad (3)
grep -n "Swal\|NgbModal" src/app/raiz/finanzas-nueva/movimientos/finanzas-movimientos.component.ts   # nada
grep -n "cuenta/:tipo/:id" src/app/raiz/finanzas-nueva/finanzas-nueva-routing.module.ts
git status --short
```

Esperado:

- El build termina sin errores. Los warnings de presupuesto previos no
  cuentan.
- Los conteos coinciden.
- `git status` muestra:
  - 6 archivos modificados: consulta, movimientos ts, routing, control,
    módulo y cuentas;
  - los nuevos: util, servicio de acciones, `listado-movimientos.ts` y la
    carpeta `cuenta-entidad/`;
  - lo tuyo sin trackear, si lo hay.

Reportá la salida.

## Pruebas manuales (demo)

1. **Movimientos sin regresión.** La pestaña Movimientos se ve igual y
   Ver, Imputar y Anular funcionan como antes, también desde el detalle.
2. **Abrir una cuenta.** En Cuentas → A cobrar, "Ver cuenta" de un cliente
   con deuda vieja:
   - la URL es `/finanzasNueva/cuenta/cliente/<id>` y la pestaña Cuentas
     sigue resaltada;
   - F5 recarga la misma cuenta;
   - "← Cuentas" vuelve.
3. **Encabezado.**
   - Facturado abierto, sin facturar, saldo a favor y saldo total
     (= facturado + sin facturar − a favor) cuadran con la fila de Cuentas
     (Cuentas muestra Neto = facturado − a favor).
   - Los tramos de antigüedad suman el facturado abierto; 61-90 y 90+ en
     rojo si tienen saldo.
4. **Comprobantes.**
   - Con "Solo abiertos": emitidos y facturados con saldo. Sin el tilde:
     también los saldados y los revertidos (en gris).
   - Total − compensado − cobrado − ajustado = saldo en cada fila.
   - "Ver" abre el detalle del informe.
5. **Chofer con compensaciones** (G3, marzo): en Comprobantes se ve la
   columna Compensado; en Movimientos, el anticipo con "Imputado" y "Sin
   imputar".
6. **Movimientos de la cuenta.** Sin columnas de entidad. "Imputar" (si hay
   saldo a favor) abre el modal con los comprobantes de la entidad. Anular
   pide motivo. Todo se actualiza en vivo.
7. **Registrar desde la cuenta** ("Registrar cobro / pago"): el modal abre
   con la entidad fija y sus comprobantes abiertos; al registrar, la cuenta
   se actualiza sola.
8. **Rol demo.** Puede ver la cuenta. No ve "Registrar", ni "Imputar", ni
   "Anular".
9. **Cuenta inválida.** `/finanzasNueva/cuenta/otro/xxx` muestra "Cuenta
   inválida." sin romper.

## Commit (lo hace Nico)

```
feat(finanzas): cuenta de la entidad — encabezado, comprobantes y movimientos (F5a)

- Ruta finanzasNueva/cuenta/:tipo/:id (CuentaEntidadComponent), desde
  "Ver cuenta" en Cuentas: saldos (facturado, sin facturar, a favor, total),
  antigüedad por tramos, comprobantes (abiertos/todos, ver detalle) y
  movimientos (ver, imputar, anular); registrar cobro/pago.
- FinanzasConsultaService.observarCuentaEntidad (entidad.id, en vivo).
- cuenta-entidad.util (puro): resumirCuentaEntidad, armarComprobantesCuenta.
- AccionesMovimientoService y listado-movimientos: gestos y columnas de
  movimientos compartidos; la pestaña Movimientos los usa.
```

FIN DE LA INSTRUCCIÓN F5a
````
