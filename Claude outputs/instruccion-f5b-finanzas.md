````
# Instrucción F5b — Finanzas: Mayor, historia del comprobante y entidad inexistente

## Contexto

Frente Finanzas. Diseño: `claude/diseno-finanzas.md` §18 (F36, F37). F5a
dejó la página Cuenta de la entidad (`finanzasNueva/cuenta/:tipo/:id`) con
el encabezado, Comprobantes y Movimientos. Este bloque agrega:

1. **Mayor** (tercera sección). Es cronológico, con saldo acumulado:
   - **Debe:** cada liquidación emitida o facturada por su total, a la
     **fecha de emisión** (F36). Las emitidas sin factura van marcadas.
   - **Haber:** cada cobro, pago, anticipo o ajuste VIGENTE por su total, a
     su fecha.
   - **Compensaciones:** líneas grises que NO mueven el saldo. El anticipo
     ya restó cuando se entregó; la compensación solo lo aplica a la
     liquidación. Esto corrige el ejemplo de §13.3, que lo restaba dos
     veces.
   - Fuera del Mayor: borradores, revertidos, anulados y movimientos
     anulados.
   - Sin rango, el saldo final = el **saldo total** del encabezado (F37).
     Con rango (desde/hasta, recordados en la sesión), lo anterior va a una
     línea "Saldo anterior".
   - "Ver" en una línea abre la historia del comprobante (liquidación) o el
     detalle del movimiento.
2. **Historia de un comprobante** (modal, acción "Historia" en
   Comprobantes y "Ver" del Mayor):
   - emisión (+total), compensaciones, factura (informativa, indica si fue
     por el neto), cobros, pagos, imputaciones de saldo y ajustes (−), con
     el saldo después de cada evento;
   - las imputaciones de movimientos anulados se muestran tachadas sin
     mover el saldo; la reversión es informativa;
   - el saldo final coincide con `valoresFinancieros.saldo`.
3. **Entidad sin documentos o inexistente** (feedback de F5a). Si la
   cuenta no tiene informes ni movimientos, el nombre y el CUIT se leen del
   documento de la entidad con `FinanzasConsultaService.obtenerEntidad`
   (`clientes`, `choferes` o `proveedores`, una lectura).
   - Si existe: se muestra con la cuenta en cero y se puede registrar, por
     ejemplo un anticipo a un chofer nuevo.
   - Si no existe: "La entidad no existe o fue dada de baja", sin tarjetas
     ni secciones, y "Registrar" deshabilitado.

Los cálculos son puros y van en `cuenta-entidad.util.ts`: `armarMayor`,
`armarHistoriaComprobante` y `textoPeriodoCorto`.

`cuenta-entidad.component.ts`, `.html` y `.scss` se **reemplazan
completos**: son de F5a y cambian en muchos puntos.

Sin índices ni reglas: NO hay deploy.

Ya verificado:

- tsc estricto, con stubs;
- prueba rápida de un caso con anticipo, compensación, factura por el neto,
  pago y pago anulado:
  - el saldo final del Mayor coincide con el saldo total del encabezado;
  - "saldo anterior" con rango;
  - la historia termina en el saldo del comprobante.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto BUSCAR no aparece, o aparece más de una vez: pará y reportá,
  sin improvisar.
- Archivos con finales de línea LF.
- Build: `npm run build:demo`.
- No toques CLAUDE.md ni CHANGELOG.
- `SeccionCuentaEntidad` suma `'mayor'` y `filtrosCuentaEntidad` suma dos
  campos. Con el PASO 0 revisá sus usos.
- La instrucción termina con la línea `FIN DE LA INSTRUCCIÓN F5b`. Si no la
  ves, llegó cortada: leela completa (por partes si hace falta) antes de
  empezar.

## PASO 0 — Verificación (sin cambios)

Corré y reportá la salida:

```bash
grep -rn "SeccionCuentaEntidad\|filtrosCuentaEntidad" src/app --include=*.ts
grep -rn "armarMayor\|armarHistoriaComprobante\|HistoriaComprobanteComponent\|obtenerEntidad" src/
grep -n "F5b" src/app/raiz/finanzas-nueva/cuenta-entidad/cuenta-entidad.component.ts src/app/shared/utils/cuenta-entidad.util.ts
grep -n "^export interface Cliente\b\|^export interface Chofer\b\|^export interface Proveedor\b" src/app/interfaces/cliente.ts src/app/interfaces/chofer.ts src/app/interfaces/proveedor.ts
grep -n "getAllStateChanges<\(Cliente\|Chofer\|Proveedor\)>('\(clientes\|choferes\|proveedores\)')" src/app/servicios/clientes/cliente.service.ts src/app/servicios/choferes/chofer.service.ts src/app/servicios/proveedores/proveedor.service.ts
```

Esperado:

- El grep 1: `cuenta-entidad.util.ts`, `finanzas-consulta.service.ts` y
  `cuenta-entidad.component.ts`.
- El grep 2: nada.
- El grep 3: el comentario "El Mayor y la historia de un comprobante llegan
  en F5b" (componente) y "F5b suma 'mayor'" (util). Confirma que son los
  archivos de F5a.
- El grep 4: 3 líneas.
- El grep 5: 3 líneas (confirma los nombres de las colecciones).

Si algo no coincide, pará y reportá.

## PASO 1 — `src/app/shared/utils/cuenta-entidad.util.ts`

#### 1a

BUSCAR:
```ts
/** Sección visible de la cuenta (recordada en la sesión). F5b suma 'mayor'. */
export type SeccionCuentaEntidad = 'comprobantes' | 'movimientos';
```

REEMPLAZAR:
```ts
/** Sección visible de la cuenta (recordada en la sesión). */
export type SeccionCuentaEntidad = 'comprobantes' | 'movimientos' | 'mayor';
```

#### 1b

BUSCAR:
```ts
  r.saldoTotal = redondear2(r.saldoFacturado + r.sinFacturar - r.saldoAFavor);
  return r;
}
```

REEMPLAZAR:
```ts
  r.saldoTotal = redondear2(r.saldoFacturado + r.sinFacturar - r.saldoAFavor);
  return r;
}

// ---------------------------------------------------------------------------
// Mayor de la cuenta (F5b)
// ---------------------------------------------------------------------------

/** Una línea del Mayor. `debe` aumenta el saldo (liquidación: nos deben /
 *  les debemos más), `haber` lo baja (cobro, pago, anticipo, ajuste). Las
 *  compensaciones son INFORMATIVAS: el anticipo ya bajó el saldo cuando se
 *  entregó; la compensación solo lo aplica a una liquidación. */
export interface LineaMayor {
  fecha: string;                    // 'YYYY-MM-DD'
  tipo: 'liquidacion' | 'cobro' | 'pago' | 'ajuste' | 'compensacion';
  referencia: string;               // número del informe o del movimiento
  detalle: string;
  debe: number;
  haber: number;
  saldo: number;                    // acumulado después de la línea
  informativa: boolean;
  sinFacturar: boolean;             // liquidación emitida todavía sin factura
  idInfLiq: string | null;
  idMovimiento: string | null;
}

export interface MayorCuenta {
  saldoAnterior: number;            // acumulado de lo anterior a `desde`
  lineas: LineaMayor[];
  totalDebe: number;
  totalHaber: number;
  saldoFinal: number;
}

const ETIQUETA_MOV: Readonly<Record<string, string>> = { cobro: 'Cobro', pago: 'Pago', ajuste: 'Ajuste' };
const ETIQUETA_CONCEPTO_MAYOR: Readonly<Record<string, string>> = {
  normal: '', anticipo: ' (anticipo)', prestamo: ' (préstamo)',
};
const ETIQUETA_MOTIVO_MAYOR: Readonly<Record<string, string>> = {
  incobrable: 'incobrable', bonificacion: 'bonificación', redondeo: 'redondeo', apertura: 'saldo de apertura', otro: 'otro',
};

/** "09/2026", "09/2026 · 1° q." — período corto para el Mayor. */
export function textoPeriodoCorto(periodo: InformeLiqNuevo['periodo']): string {
  const base = `${String(periodo.mes).padStart(2, '0')}/${periodo.anio}`;
  return periodo.tramo === 'mes' ? base : `${base} · ${periodo.tramo === '1q' ? '1°' : '2°'} q.`;
}

type InformeConId = InformeLiqNuevo & { idInfLiq: string };
type MovimientoConId = MovimientoFin & { idMovimiento: string };

/** Mayor cronológico de la cuenta (F36/F37):
 *  - Liquidación emitida o facturada: DEBE por su total, a la fecha de
 *    EMISIÓN; las emitidas sin factura van marcadas. Después, sus
 *    compensaciones como líneas informativas.
 *  - Cobro / pago / anticipo / ajuste VIGENTE: HABER por su total, a su
 *    fecha.
 *  - Borradores, revertidos, anulados y movimientos anulados no entran.
 *  Saldo final = Σ total de liquidaciones − Σ total de movimientos = saldo
 *  total de la cuenta (resumirCuentaEntidad). `desde` / `hasta`
 *  ('YYYY-MM-DD' o null = sin límite): lo anterior a `desde` va al saldo
 *  anterior; lo posterior a `hasta` no se muestra. Mismo día: primero las
 *  liquidaciones, después los movimientos. Puro. */
export function armarMayor(
  informes: InformeConId[],
  movimientos: MovimientoConId[],
  desde: string | null,
  hasta: string | null,
): MayorCuenta {
  type Base = Omit<LineaMayor, 'saldo'> & { orden: number };
  const base: Base[] = [];

  for (const liq of informes) {
    if (liq.estado !== 'emitido' && liq.estado !== 'facturado') continue;
    const fecha = liq.fechaEmision ?? liq.fechaCreacion;
    const total = normalizarValoresFinancieros(liq.valoresFinancieros, liq.valores.total).total;
    const sinFacturar = liq.estado === 'emitido';
    base.push({
      fecha, orden: 0, tipo: 'liquidacion',
      referencia: liq.numeroInterno ?? liq.idInfLiq,
      detalle: `Liquidación ${textoPeriodoCorto(liq.periodo)}${sinFacturar ? ' (sin facturar)' : ''}`,
      debe: total, haber: 0, informativa: false, sinFacturar,
      idInfLiq: liq.idInfLiq, idMovimiento: null,
    });
    for (const c of compensacionesDeLiq(liq)) {
      base.push({
        fecha, orden: 1, tipo: 'compensacion',
        referencia: liq.numeroInterno ?? liq.idInfLiq,
        detalle: `Compensa ${c.numero} — $ ${redondear2(c.importe).toFixed(2)} (ya descontado al entregarse)`,
        debe: 0, haber: 0, informativa: true, sinFacturar: false,
        idInfLiq: liq.idInfLiq, idMovimiento: c.idMovimiento,
      });
    }
  }

  for (const m of movimientos) {
    if (m.estado !== 'vigente') continue;
    const detalle = m.tipo === 'ajuste'
      ? `Ajuste${m.motivoAjuste ? ` (${ETIQUETA_MOTIVO_MAYOR[m.motivoAjuste] ?? m.motivoAjuste})` : ''}`
      : `${ETIQUETA_MOV[m.tipo] ?? m.tipo}${ETIQUETA_CONCEPTO_MAYOR[m.concepto] ?? ''}` +
        (m.sinImputar > 0 ? ` — sin imputar $ ${m.sinImputar.toFixed(2)}` : '');
    base.push({
      fecha: m.fecha, orden: 2, tipo: m.tipo,
      referencia: m.numero, detalle,
      debe: 0, haber: redondear2(m.total), informativa: false, sinFacturar: false,
      idInfLiq: null, idMovimiento: m.idMovimiento,
    });
  }

  base.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.orden - b.orden || a.referencia.localeCompare(b.referencia));

  let saldo = 0;
  let saldoAnterior = 0;
  let totalDebe = 0;
  let totalHaber = 0;
  const lineas: LineaMayor[] = [];
  for (const { orden, ...l } of base) {
    saldo = redondear2(saldo + l.debe - l.haber);
    if (desde && l.fecha < desde) {
      saldoAnterior = saldo;
      continue;
    }
    if (hasta && l.fecha > hasta) continue;
    totalDebe = redondear2(totalDebe + l.debe);
    totalHaber = redondear2(totalHaber + l.haber);
    lineas.push({ ...l, saldo });
  }
  return {
    saldoAnterior,
    lineas,
    totalDebe,
    totalHaber,
    saldoFinal: redondear2(saldoAnterior + totalDebe - totalHaber),
  };
}

function compensacionesDeLiq(liq: InformeLiqNuevo): NonNullable<InformeLiqNuevo['compensaciones']> {
  return liq.compensaciones ?? [];
}

// ---------------------------------------------------------------------------
// Historia de un comprobante (F5b)
// ---------------------------------------------------------------------------

/** Un evento en la historia de un InformeLiq. `importe` negativo baja el
 *  saldo del comprobante; las informativas no lo mueven. */
export interface EventoComprobante {
  fecha: string;                    // 'YYYY-MM-DD'
  descripcion: string;
  importe: number;
  saldo: number;                    // saldo del comprobante después del evento
  informativa: boolean;
  anulada: boolean;                 // imputación de un movimiento anulado (revertida)
  idMovimiento: string | null;
}

/** Historia de un comprobante: emisión (+total), compensaciones, factura
 *  (informativa), cobros / pagos / imputaciones de saldo / ajustes (−), en
 *  orden de fecha; las imputaciones de movimientos ANULADOS se muestran
 *  tachadas sin mover el saldo; la reversión, informativa. El saldo final
 *  coincide con valoresFinancieros.saldo. `movimientos`: los de la entidad
 *  (se toman los que imputan a este informe). Puro. */
export function armarHistoriaComprobante(
  liq: InformeConId,
  movimientos: MovimientoConId[],
): EventoComprobante[] {
  type Base = Omit<EventoComprobante, 'saldo'> & { orden: number };
  const base: Base[] = [];
  const total = normalizarValoresFinancieros(liq.valoresFinancieros, liq.valores.total).total;

  if (liq.fechaEmision) {
    base.push({
      fecha: liq.fechaEmision, orden: 0, descripcion: `Emisión ${liq.numeroInterno ?? ''} — total del servicio`,
      importe: total, informativa: false, anulada: false, idMovimiento: null,
    });
  }
  if (liq.factura) {
    base.push({
      fecha: liq.factura.fecha, orden: 1,
      descripcion: `Factura vinculada — $ ${liq.factura.importe.toFixed(2)}` +
        (liq.factura.validacion?.base === 'neto' ? ' (por el neto)' : ''),
      importe: 0, informativa: true, anulada: false, idMovimiento: null,
    });
  }
  for (const m of movimientos) {
    for (const i of m.imputaciones ?? []) {
      if (i.documento.id !== liq.idInfLiq) continue;
      const anulada = m.estado !== 'vigente';
      const que = i.origen === 'compensacion'
        ? `Compensación con ${m.numero}`
        : m.tipo === 'ajuste'
          ? `Ajuste ${m.numero}${m.motivoAjuste ? ` (${ETIQUETA_MOTIVO_MAYOR[m.motivoAjuste] ?? m.motivoAjuste})` : ''}`
          : `${ETIQUETA_MOV[m.tipo] ?? m.tipo} ${m.numero}${i.origen === 'saldo' ? ' (imputación de saldo)' : ''}`;
      base.push({
        fecha: i.fecha, orden: i.origen === 'compensacion' ? 0.5 : 2,
        descripcion: anulada ? `${que} — anulado` : que,
        importe: -i.importe, informativa: anulada, anulada, idMovimiento: m.idMovimiento,
      });
    }
  }
  if (liq.reversion) {
    base.push({
      fecha: liq.reversion.fecha.slice(0, 10), orden: 3, descripcion: `Revertido — ${liq.reversion.motivo}`,
      importe: 0, informativa: true, anulada: false, idMovimiento: null,
    });
  }

  base.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.orden - b.orden);
  let saldo = 0;
  return base.map(({ orden, ...e }) => {
    if (!e.informativa) saldo = redondear2(saldo + e.importe);
    return { ...e, saldo };
  });
}
```

## PASO 2 — `src/app/servicios/finanzas-nueva/finanzas-consulta.service.ts`

#### 2a

BUSCAR:
```ts
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
```

REEMPLAZAR:
```ts
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Proveedor } from 'src/app/interfaces/proveedor';
```

#### 2b

BUSCAR:
```ts
  filtrosCuentaEntidad: { seccion: SeccionCuentaEntidad; soloAbiertos: boolean } = {
    seccion: 'comprobantes',
    soloAbiertos: true,
  };
```

REEMPLAZAR:
```ts
  filtrosCuentaEntidad: { seccion: SeccionCuentaEntidad; soloAbiertos: boolean; mayorDesde: string; mayorHasta: string } = {
    seccion: 'comprobantes',
    soloAbiertos: true,
    mayorDesde: '',               // '' = sin límite (Mayor, F5b)
    mayorHasta: '',
  };
```

#### 2c

BUSCAR:
```ts
  /** En vivo: una cuenta por entidad (ver armarCuentas).
```

REEMPLAZAR:
```ts
  /** One-shot (F5b): nombre y CUIT desde el documento de la entidad
   *  (clientes / choferes / proveedores) — para una cuenta que todavía no
   *  tiene informes ni movimientos. null si el documento no existe. */
  async obtenerEntidad(
    tipo: TipoEntidadFin,
    id: string,
  ): Promise<{ nombre: string; cuit: number | null; activo: boolean } | null> {
    if (tipo === 'chofer') {
      const c = await this.db.getById<Chofer>('choferes', id);
      if (!c) return null;
      return {
        nombre: `${c.datosPersonales?.apellido ?? ''} ${c.datosPersonales?.nombre ?? ''}`.trim(),
        cuit: c.datosPersonales?.cuit ?? null,
        activo: c.activo !== false,
      };
    }
    const e = tipo === 'cliente'
      ? await this.db.getById<Cliente>('clientes', id)
      : await this.db.getById<Proveedor>('proveedores', id);
    if (!e) return null;
    return { nombre: e.razonSocial ?? '', cuit: e.cuit ?? null, activo: e.activo !== false };
  }

  /** En vivo: una cuenta por entidad (ver armarCuentas).
```

## PASO 3 — NUEVO modal `src/app/raiz/finanzas-nueva/modales/historia-comprobante/`

### 3a — `historia-comprobante.component.ts`

```ts
import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { MovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { EventoComprobante, armarHistoriaComprobante, textoPeriodoCorto } from 'src/app/shared/utils/cuenta-entidad.util';
import { compensacionesDe, netoDe } from 'src/app/shared/utils/compensacion.util';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import { normalizarValoresFinancieros } from 'src/app/shared/utils/finanzas.util';

/** Finanzas — historia de un comprobante (F5b): emisión, compensaciones,
 *  factura, cobros / pagos / imputaciones de saldo / ajustes con el saldo
 *  después de cada uno; imputaciones de movimientos anulados tachadas. Solo
 *  lectura, con lo que la Cuenta de la entidad ya tiene en memoria. */
@Component({
  selector: 'app-historia-comprobante',
  standalone: false,
  templateUrl: './historia-comprobante.component.html',
  styleUrl: './historia-comprobante.component.scss',
})
export class HistoriaComprobanteComponent implements OnInit {

  @Input() liq!: ConId<InformeLiqNuevo>;
  @Input() movimientos: ConId<MovimientoFin>[] = [];

  eventos: EventoComprobante[] = [];
  readonly fechaLegible = fechaComprobanteLegible;

  constructor(public activeModal: NgbActiveModal) {}

  ngOnInit(): void {
    this.eventos = armarHistoriaComprobante(this.liq, this.movimientos);
  }

  get periodo(): string {
    return textoPeriodoCorto(this.liq.periodo);
  }

  get saldoActual(): number {
    const vigente = this.liq.estado === 'emitido' || this.liq.estado === 'facturado';
    return vigente ? normalizarValoresFinancieros(this.liq.valoresFinancieros, this.liq.valores.total).saldo : 0;
  }

  get neto(): number {
    return netoDe(this.liq.valores);
  }

  get tieneCompensaciones(): boolean {
    return compensacionesDe(this.liq).length > 0;
  }

  cerrar(): void {
    this.activeModal.dismiss();
  }
}
```

### 3b — `historia-comprobante.component.html`

```html
<div class="modal-header">
  <div>
    <h4 class="modal-title">Historia — {{ liq.numeroInterno ?? 'sin número' }}</h4>
    <div class="text-muted">Período {{ periodo }} · estado {{ liq.estado }}</div>
  </div>
  <button type="button" class="btn-close" (click)="cerrar()"></button>
</div>

<div class="modal-body">
  <div class="d-flex flex-wrap gap-4 mb-3">
    <span>Total del servicio: <b>{{ liq.valores.total | formatearValor: '$' }}</b></span>
    @if (tieneCompensaciones) {
      <span>Neto: <b>{{ neto | formatearValor: '$' }}</b></span>
    }
    <span>Saldo actual: <b>{{ saldoActual | formatearValor: '$' }}</b></span>
  </div>

  @if (eventos.length === 0) {
    <div class="alert alert-info py-2">El comprobante no tiene movimientos registrados.</div>
  } @else {
    <table class="table table-sm table-striped align-middle">
      <thead>
        <tr>
          <th class="text-center" style="width: 8rem;">Fecha</th>
          <th>Evento</th>
          <th class="text-end" style="width: 11rem;">Importe</th>
          <th class="text-end" style="width: 11rem;">Saldo</th>
        </tr>
      </thead>
      <tbody>
        @for (e of eventos; track $index) {
          <tr [class.text-muted]="e.informativa">
            <td class="text-center">{{ fechaLegible(e.fecha) }}</td>
            <td [class.text-decoration-line-through]="e.anulada">{{ e.descripcion }}</td>
            <td class="text-end col-importe" [class.text-decoration-line-through]="e.anulada">
              @if (e.importe !== 0) {
                {{ e.importe | formatearValor: '$' }}
              }
            </td>
            <td class="text-end col-importe">{{ e.informativa ? '' : (e.saldo | formatearValor: '$') }}</td>
          </tr>
        }
      </tbody>
    </table>
  }
  <p class="text-muted small mb-0">
    Las líneas grises no mueven el saldo (factura, reversión, movimientos anulados).
  </p>
</div>

<div class="modal-footer">
  <button type="button" class="btn btn-outline-secondary" (click)="cerrar()">Cerrar</button>
</div>
```

### 3c — `historia-comprobante.component.scss`

```scss
.col-importe {
  font-variant-numeric: tabular-nums;
}

th,
td {
  font-size: 1.2rem;
}
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
  FilaComprobanteCuenta, MayorCuenta, ResumenCuentaEntidad, SeccionCuentaEntidad, armarComprobantesCuenta, armarMayor,
  resumirCuentaEntidad,
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
 *    con saldo anterior (armarMayor).
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

  get filtros(): { seccion: SeccionCuentaEntidad; soloAbiertos: boolean; mayorDesde: string; mayorHasta: string } {
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
      @if (errorRangoMayor) {
        <span class="text-danger small ms-2">{{ errorRangoMayor }}</span>
      }
    </div>
    <div class="table-responsive">
      <table class="table table-sm table-striped align-middle mayor">
        <thead>
          <tr>
            <th class="text-center" style="width: 8rem;">Fecha</th>
            <th>Comprobante</th>
            <th>Detalle</th>
            <th class="text-end">Debe</th>
            <th class="text-end">Haber</th>
            <th class="text-end">Saldo</th>
            <th style="width: 4rem;"></th>
          </tr>
        </thead>
        <tbody>
          @if (mayorDesde) {
            <tr class="fw-bold">
              <td class="text-center">{{ fechaLegible(mayorDesde) }}</td>
              <td colspan="4">Saldo anterior</td>
              <td class="text-end col-importe">{{ mayor.saldoAnterior | formatearValor: '$' }}</td>
              <td></td>
            </tr>
          }
          @for (l of mayor.lineas; track $index) {
            <tr [class.text-muted]="l.informativa">
              <td class="text-center">{{ fechaLegible(l.fecha) }}</td>
              <td>{{ l.referencia }}</td>
              <td [class.fst-italic]="l.informativa">
                {{ l.detalle }}
                @if (l.sinFacturar) {
                  <span class="badge bg-light text-dark border ms-1">sin facturar</span>
                }
              </td>
              <td class="text-end col-importe">{{ l.debe ? (l.debe | formatearValor: '$') : '' }}</td>
              <td class="text-end col-importe">{{ l.haber ? (l.haber | formatearValor: '$') : '' }}</td>
              <td class="text-end col-importe">{{ l.informativa ? '' : (l.saldo | formatearValor: '$') }}</td>
              <td class="text-center">
                <button type="button" class="btn btn-sm btn-outline-primary" (click)="verLineaMayor(l)">Ver</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="text-muted">Sin movimientos en el rango.</td></tr>
          }
        </tbody>
        <tfoot>
          <tr class="fw-bold">
            <td colspan="3" class="text-end">Totales del rango / saldo final</td>
            <td class="text-end col-importe">{{ mayor.totalDebe | formatearValor: '$' }}</td>
            <td class="text-end col-importe">{{ mayor.totalHaber | formatearValor: '$' }}</td>
            <td class="text-end col-importe">{{ mayor.saldoFinal | formatearValor: '$' }}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
    <p class="text-muted small">
      <b>Debe:</b> liquidaciones emitidas, a la fecha de emisión (las sin factura, marcadas).
      <b>Haber:</b> {{ esCliente ? 'cobros' : 'pagos y anticipos' }} y ajustes, por su total.
      Las compensaciones (en gris) no mueven el saldo: el anticipo ya se descontó al entregarse.
      Sin rango, el saldo final es el saldo total de la cuenta.
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
    <b>Saldo total</b> = facturado abierto + emitido sin facturar − {{ esCliente ? 'saldo a favor' : 'anticipos / saldo a favor' }}.
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
```

## PASO 5 — `src/app/raiz/finanzas-nueva/finanzas-nueva.module.ts`

#### 5a

BUSCAR:
```ts
import { CuentaEntidadComponent } from './cuenta-entidad/cuenta-entidad.component';
```

REEMPLAZAR:
```ts
import { CuentaEntidadComponent } from './cuenta-entidad/cuenta-entidad.component';
import { HistoriaComprobanteComponent } from './modales/historia-comprobante/historia-comprobante.component';
```

#### 5b

BUSCAR:
```ts
    CuentaEntidadComponent,
  ],
```

REEMPLAZAR:
```ts
    CuentaEntidadComponent,
    HistoriaComprobanteComponent,
  ],
```

## PASO 6 — Verificación

```bash
npm run build:demo
grep -c "export function armarMayor\|export function armarHistoriaComprobante\|export function textoPeriodoCorto" src/app/shared/utils/cuenta-entidad.util.ts   # 3
grep -c "async obtenerEntidad(" src/app/servicios/finanzas-nueva/finanzas-consulta.service.ts   # 1
grep -c "HistoriaComprobanteComponent" src/app/raiz/finanzas-nueva/finanzas-nueva.module.ts      # 2
grep -n "noExiste" src/app/raiz/finanzas-nueva/cuenta-entidad/cuenta-entidad.component.html
git status --short
```

Esperado:

- El build termina sin errores. Los warnings de presupuesto previos no
  cuentan.
- Los conteos coinciden.
- `noExiste` aparece en el botón Registrar y en el aviso.
- `git status` muestra:
  - 6 archivos modificados: util, consulta, módulo y los 3 de
    `cuenta-entidad`;
  - la carpeta nueva `modales/historia-comprobante/`;
  - lo tuyo sin trackear, si lo hay.

Reportá la salida.

## Pruebas manuales (demo)

1. **Mayor de un cliente** con deuda vieja (Ver cuenta → Mayor), sin
   rango:
   - las liquidaciones aparecen a la fecha de emisión en Debe; los cobros,
     en Haber;
   - el saldo de la última línea = "Saldo total" del encabezado;
   - las emitidas sin facturar tienen la marca "sin facturar".
2. **Rango.** Poné "Desde" a mitad de la historia:
   - aparece "Saldo anterior";
   - el saldo final no cambia; "Todo" vuelve a mostrar todo;
   - desde > hasta muestra el error y no cambia la tabla;
   - salir de la cuenta y volver conserva el rango.
3. **Chofer con anticipo compensado** (G3, marzo), en el Mayor:
   - el anticipo resta en su fecha;
   - la liquidación de marzo suma su total;
   - debajo, la línea gris "Compensa OPG-…" no mueve el saldo;
   - el pago del neto resta;
   - el saldo final coincide con el encabezado.
4. **Historia.**
   - En Comprobantes → "Historia" de una liquidación cobrada en dos
     partes: emisión, cobro 1, cobro 2, con el saldo bajando; el saldo
     final = la columna Saldo de la fila.
   - Con compensación y factura por el neto: aparecen "Compensación con
     OPG-…" y "Factura vinculada … (por el neto)".
   - Si anulaste un cobro en F4: aparece tachado y no mueve el saldo.
5. **Ver desde el Mayor:** en una liquidación abre la historia; en un
   movimiento, su detalle (con Imputar y Anular si corresponde).
6. **Entidad sin documentos:** abrí `/finanzasNueva/cuenta/cliente/<id de
   un cliente sin liquidaciones>` (o de un chofer nuevo):
   - muestra su nombre y CUIT, la cuenta en cero y "Registrar" habilitado;
   - registrar un anticipo hace que la cuenta lo muestre en vivo.
7. **Entidad inexistente:** `/finanzasNueva/cuenta/cliente/xxx` (y lo
   mismo con chofer y proveedor) muestra "La entidad no existe o fue dada
   de baja", sin tarjetas, con "Registrar" deshabilitado.

## Commit (lo hace Nico)

```
feat(finanzas): mayor e historia del comprobante en la cuenta de la entidad (F5b)

- Mayor: liquidaciones (debe, fecha de emisión, marca sin facturar),
  cobros/pagos/anticipos/ajustes vigentes (haber), compensaciones
  informativas sin efecto; saldo acumulado = saldo total; rango con saldo
  anterior (sesión); "Ver" abre historia o detalle.
- HistoriaComprobanteComponent: emisión, compensaciones, factura,
  imputaciones (anuladas tachadas), reversión; saldo por evento.
- Cuenta sin documentos: nombre/CUIT desde la entidad
  (FinanzasConsultaService.obtenerEntidad); inexistente → aviso.
- cuenta-entidad.util: armarMayor, armarHistoriaComprobante,
  textoPeriodoCorto.
```

FIN DE LA INSTRUCCIÓN F5b
````
