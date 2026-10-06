````
# Instrucción FC1b — Finanzas: compensaciones en la liquidación (UI)

## Contexto

Frente Finanzas. Diseño: `claude/diseno-finanzas.md` §13, §15 y §17. FC1a
(commiteado) dejó el modelo y el servicio:

- `InformeLiqService` acepta `DatosLiquidacion.compensaciones` y
  `CambiosDatosLiq.compensaciones`;
- las valida en la transacción, las aplica al emitir y las libera al
  revertir;
- `editarDatos` las mueve en un emitido;
- controla que el neto sea ≥ 0.

Este bloque agrega la UI:

1. **Modal compartido `CompensacionesLiqComponent`** (`shared/modales/`,
   declarado en SharedModule).
   - Lista los movimientos de la entidad que se pueden compensar (F33):
     anticipos, préstamos y saldos a favor, vigentes y con disponible.
   - En un emitido, también los que ya están compensados en ese informe
     aunque hayan quedado en 0.
   - Columnas: número, fecha, concepto, total, disponible y un importe a
     compensar (`appMonto`).
   - Aviso F35: "También elegido en el borrador de MM/AAAA".
   - El check compensa lo que entra, hasta el disponible y sin dejar el
     neto negativo.
   - Neto en vivo y validación en vivo.
   - NO persiste: cierra con la lista completa de `CompensacionLiq`.
2. **Lectura `FinanzasConsultaService.obtenerCompensables`** (one-shot):
   movimientos con saldo, más los ya compensados en el informe, más los
   borradores para el aviso. La parte pura es `armarCompensables`, en
   `compensacion.util`.
3. **Liquidación nueva:**
   - botón "Compensaciones · Elegir" junto a Ajustes;
   - aviso "X tiene $ … sin compensar";
   - lista de compensaciones con quitar;
   - totales Compensaciones y Neto;
   - no se confirma con neto negativo;
   - la confirmación muestra el neto;
   - `DatosLiquidacion.compensaciones` = `{idMovimiento, importe}`.
4. **Detalle del informe** (el mismo componente para Liquidación y
   Facturación):
   - sección Compensaciones, editable en borrador y emitido (F29);
   - totales Compensaciones y Neto con "sin guardar";
   - "Guardar cambios" manda `cambios.compensaciones` (la lista completa);
   - no se guarda con neto negativo;
   - en revertido o facturado se ven las compensaciones en solo lectura.
5. **Aviso F23 en el modal de Ajustes:** si el concepto parece un adelanto
   o un préstamo, recuerda que se registra en Finanzas y se descuenta con
   Compensaciones. No bloquea.

Queda para FC2: el PDF y el Excel (y la vista previa) todavía no muestran
las compensaciones ni el neto, y la validación de la factura contra el neto
(F28). Hasta entonces, una factura del chofer por el neto se vincula "con
discrepancia de importe".

Sin índices ni reglas nuevas: NO hay deploy.

Ya verificado: tsc estricto sobre los componentes y servicios, con stubs.
Los templates se revisaron a mano.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto BUSCAR no aparece, o aparece más de una vez: pará y reportá,
  sin improvisar.
- Archivos con finales de línea LF.
- Build: `npm run build:demo`.
- No toques CLAUDE.md ni CHANGELOG.
- La instrucción termina con la línea `FIN DE LA INSTRUCCIÓN FC1b`. Si no la
  ves, llegó cortada: leela completa (por partes si hace falta) antes de
  empezar.

## PASO 0 — Verificación (sin cambios)

Corré y reportá la salida:

```bash
grep -rn "CompensacionesLiqComponent\|obtenerCompensables\|armarCompensables\|ETIQUETA_CONCEPTO_COMPENSACION\|pareceAdelanto" src/
grep -n "export function escrituraMovimientoParcial" src/app/shared/utils/compensacion.util.ts
grep -n "observarMovimientosConSaldo()\|import { Observable, combineLatest, map } from 'rxjs';" src/app/servicios/finanzas-nueva/finanzas-consulta.service.ts
grep -n "InformeLiqNuevoDetalleComponent,  // modal" src/app/shared/shared.module.ts
grep -n "MontoDirective" src/app/shared/shared.module.ts
grep -c "@if (descuentos.length > 0) {" src/app/shared/modales/ajustes-liq/ajustes-liq.component.html
grep -n "<!-- 5. COLUMNAS -->\|<!-- 5. TOTALES -->" src/app/raiz/liquidacion/modales/liquidacion-nueva/liquidacion-nueva.component.html
grep -n "aplicarCompensaciones(" src/app/servicios/informes-liq/informe-liq-factory.service.ts
```

Esperado:

- El primer grep: nada.
- `escrituraMovimientoParcial`: 1 línea.
- `finanzas-consulta`: la definición de `observarMovimientosConSaldo`, su
  uso en `observarCuentas` y la línea del import de rxjs.
- La línea del detalle en SharedModule: 1.
- `MontoDirective`: 3 (import, declarations, exports).
- `@if (descuentos.length > 0) {`: 1.
- Los dos comentarios de liquidacion-nueva: 1 cada uno.
- `aplicarCompensaciones(`: 1.

Si algo no coincide, pará y reportá.

## PASO 1 — `src/app/shared/utils/compensacion.util.ts`: compensables

#### 1a

BUSCAR:
```ts
export function escrituraMovimientoParcial(idMovimiento: string, campos: Record<string, any>): EscrituraBatch {
  return { coleccion: COLECCION_MOVIMIENTOS_FIN, id: idMovimiento, modo: 'actualizar', data: campos };
}
```

REEMPLAZAR:
```ts
export function escrituraMovimientoParcial(idMovimiento: string, campos: Record<string, any>): EscrituraBatch {
  return { coleccion: COLECCION_MOVIMIENTOS_FIN, id: idMovimiento, modo: 'actualizar', data: campos };
}

// ---------------------------------------------------------------------------
// UI (FC1b): qué se puede compensar
// ---------------------------------------------------------------------------

/** Etiqueta del concepto del movimiento compensado ('normal' = un cobro o
 *  pago que quedó con saldo a favor). */
export const ETIQUETA_CONCEPTO_COMPENSACION: Readonly<Record<CompensacionLiq['concepto'], string>> = {
  normal: 'Saldo a favor',
  anticipo: 'Anticipo',
  prestamo: 'Préstamo',
};

/** Un movimiento que se puede compensar en un informe. */
export interface CompensableFin {
  idMovimiento: string;
  numero: string;
  fecha: string;                    // 'YYYY-MM-DD'
  concepto: CompensacionLiq['concepto'];
  total: number;                    // total del movimiento
  disponible: number;               // disponibleParaInforme
  enOtrosBorradores: string[];      // períodos 'MM/AAAA' de OTROS borradores que lo eligieron (F35)
}

/** Lista de compensables para el informe `idInfLiq` (null = informe nuevo)
 *  de la entidad: movimientos vigentes, no ajustes, de la entidad, con
 *  disponible > 0 (incluye los ya aplicados a este informe aunque su
 *  sinImputar sea 0). Marca los elegidos en otros borradores. Orden: más
 *  antiguos primero. Puro. */
export function armarCompensables(
  movimientos: (MovimientoFin & { idMovimiento: string })[],
  entidad: Pick<EntidadMovimientoFin, 'tipo' | 'id'>,
  idInfLiq: string | null,
  borradores: (Pick<InformeLiqNuevo, 'compensaciones' | 'periodoClave'> & { idInfLiq: string })[],
): CompensableFin[] {
  const vistos = new Set<string>();
  const lista: CompensableFin[] = [];
  for (const m of movimientos) {
    if (vistos.has(m.idMovimiento)) continue;
    vistos.add(m.idMovimiento);
    if (m.estado !== 'vigente' || m.tipo === 'ajuste') continue;
    if (m.entidad.tipo !== entidad.tipo || m.entidad.id !== entidad.id) continue;
    const disponible = disponibleParaInforme(m, idInfLiq);
    if (!(disponible > 0)) continue;
    const enOtrosBorradores = borradores
      .filter(b => b.idInfLiq !== idInfLiq && compensacionesDe(b).some(c => c.idMovimiento === m.idMovimiento))
      .map(b => {
        const [a, mes] = (b.periodoClave ?? '').split('-');
        return mes ? `${mes}/${a}` : (b.periodoClave ?? '');
      });
    lista.push({
      idMovimiento: m.idMovimiento,
      numero: m.numero,
      fecha: m.fecha,
      concepto: m.concepto,
      total: m.total,
      disponible,
      enOtrosBorradores,
    });
  }
  return lista.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.numero.localeCompare(b.numero));
}

/** Σ disponible de una lista de compensables. */
export function totalDisponible(compensables: Pick<CompensableFin, 'disponible'>[]): number {
  return redondear2(compensables.reduce((acc, c) => acc + c.disponible, 0));
}
```

## PASO 2 — `src/app/servicios/finanzas-nueva/finanzas-consulta.service.ts`

#### 2a

BUSCAR:
```ts
import { Observable, combineLatest, map } from 'rxjs';
```

REEMPLAZAR:
```ts
import { Observable, combineLatest, firstValueFrom, map } from 'rxjs';
```

#### 2b

BUSCAR:
```ts
import { MovimientoFin } from 'src/app/interfaces/movimiento-fin';
```

REEMPLAZAR:
```ts
import { MovimientoFin, TipoEntidadFin } from 'src/app/interfaces/movimiento-fin';
```

#### 2c

BUSCAR:
```ts
import { CuentaEntidadFin, LadoCuenta, armarCuentas } from 'src/app/shared/utils/cuentas-finanzas.util';
```

REEMPLAZAR:
```ts
import { CompensableFin, armarCompensables } from 'src/app/shared/utils/compensacion.util';
import { CuentaEntidadFin, LadoCuenta, armarCuentas } from 'src/app/shared/utils/cuentas-finanzas.util';
```

#### 2d

BUSCAR:
```ts
  /** En vivo: una cuenta por entidad (ver armarCuentas).
```

REEMPLAZAR:
```ts
  /** One-shot (FC1b): movimientos que la entidad puede compensar en el
   *  informe `idInfLiq` (null = informe nuevo): los vigentes con saldo sin
   *  imputar + los ya compensados en este informe (`idsActuales`, aunque
   *  hayan quedado en 0) + el aviso de otros borradores que los eligieron
   *  (F35). Ver armarCompensables. */
  async obtenerCompensables(
    entidad: { tipo: TipoEntidadFin; id: string },
    idInfLiq: string | null,
    idsActuales: string[],
  ): Promise<CompensableFin[]> {
    const conSaldo = await firstValueFrom(this.observarMovimientosConSaldo());
    const faltan = [...new Set(idsActuales)].filter(id => !conSaldo.some(m => m.idMovimiento === id));
    const extra = (await Promise.all(faltan.map(async id => {
      const m = await this.db.getById<MovimientoFin>(this.COL_MOV, id);
      return m ? { ...m, id, idMovimiento: id } : null;
    }))).filter((m): m is ConId<MovimientoFin> => m !== null);
    const borradores = await firstValueFrom(this.consultaLiq.observarPorEstado('borrador'));
    return armarCompensables([...conSaldo, ...extra], entidad, idInfLiq, borradores);
  }

  /** En vivo: una cuenta por entidad (ver armarCuentas).
```

## PASO 3 — NUEVO modal `src/app/shared/modales/compensaciones-liq/`

### 3a — `compensaciones-liq.component.ts`

```ts
import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { CompensacionLiq } from 'src/app/interfaces/informe-liq-nuevo';
import { TipoEntidadFin } from 'src/app/interfaces/movimiento-fin';
import { FinanzasConsultaService } from 'src/app/servicios/finanzas-nueva/finanzas-consulta.service';
import {
  CompensableFin, ETIQUETA_CONCEPTO_COMPENSACION, MAX_COMPENSACIONES, errorNeto, totalCompensacionesDe,
} from 'src/app/shared/utils/compensacion.util';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import { esCero, redondear2, TOLERANCIA_IMPORTE } from 'src/app/shared/utils/finanzas.util';

/** Fila del modal: un compensable con el importe elegido. */
interface FilaCompensable {
  c: CompensableFin;
  importe: number | null;           // appMonto: null si el input queda vacío
}

/** Modal "Compensaciones" de un InformeLiq (Frente Finanzas, FC1b). Lista
 *  los movimientos de la entidad con saldo para compensar (anticipos,
 *  préstamos, saldos a favor — F33), con el aviso de otros borradores que
 *  los eligieron (F35). Valida en vivo: importe ≤ disponible, neto ≥ 0
 *  (F30), tope MAX_COMPENSACIONES. NO persiste: cierra con la lista
 *  completa de CompensacionLiq elegidas (el servicio las revalida en su
 *  transacción). Lo usan LiquidacionNuevaComponent (informe nuevo,
 *  idInfLiq null) e InformeLiqNuevoDetalleComponent (borrador / emitido). */
@Component({
  selector: 'app-compensaciones-liq',
  standalone: false,
  templateUrl: './compensaciones-liq.component.html',
  styleUrl: './compensaciones-liq.component.scss',
})
export class CompensacionesLiqComponent implements OnInit {

  @Input() tipo!: TipoEntidadFin;
  @Input() idEntidad!: string;
  @Input() nombreEntidad = '';
  /** null = informe nuevo (todavía no existe). */
  @Input() idInfLiq: string | null = null;
  /** Compensaciones elegidas hasta ahora (se precargan). */
  @Input() actuales: CompensacionLiq[] = [];
  /** Total del servicio (con ajustes) — para el neto en vivo. */
  @Input() totalServicio = 0;

  readonly etiquetaConcepto = ETIQUETA_CONCEPTO_COMPENSACION;
  readonly fechaLegible = fechaComprobanteLegible;
  readonly MAX = MAX_COMPENSACIONES;

  filas: FilaCompensable[] = [];
  /** Compensaciones actuales cuyo movimiento ya no está disponible
   *  (anulado o sin saldo): se quitan al aplicar. */
  noDisponibles: CompensacionLiq[] = [];
  cargando = false;
  error = '';

  constructor(
    public activeModal: NgbActiveModal,
    private consulta: FinanzasConsultaService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.cargando = true;
    try {
      const compensables = await this.consulta.obtenerCompensables(
        { tipo: this.tipo, id: this.idEntidad }, this.idInfLiq, this.actuales.map(c => c.idMovimiento),
      );
      const elegidos = new Map(this.actuales.map(c => [c.idMovimiento, c.importe]));
      this.filas = compensables.map(c => ({ c, importe: elegidos.get(c.idMovimiento) ?? 0 }));
      const ids = new Set(compensables.map(c => c.idMovimiento));
      this.noDisponibles = this.actuales.filter(a => !ids.has(a.idMovimiento));
    } catch (e: any) {
      this.error = `No se pudieron leer los movimientos: ${e?.message ?? e}`;
    } finally {
      this.cargando = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Derivados
  // ---------------------------------------------------------------------------

  get totalCompensaciones(): number {
    return totalCompensacionesDe(this.filas.map(f => ({ importe: Number(f.importe) || 0 })));
  }

  get neto(): number {
    return redondear2(this.totalServicio - this.totalCompensaciones);
  }

  get elegidas(): FilaCompensable[] {
    return this.filas.filter(f => !esCero(Number(f.importe) || 0));
  }

  /** Error de validación en vivo, o null. */
  get errorValidacion(): string | null {
    const excedida = this.filas.find(f => (Number(f.importe) || 0) - f.c.disponible > TOLERANCIA_IMPORTE);
    if (excedida) return `El importe de ${excedida.c.numero} supera su disponible.`;
    if (this.filas.some(f => (Number(f.importe) || 0) < 0)) return 'Hay un importe negativo.';
    if (this.elegidas.length > this.MAX) return `Se admiten hasta ${this.MAX} compensaciones.`;
    return errorNeto(this.totalServicio, this.totalCompensaciones);
  }

  get puedeAplicar(): boolean {
    return !this.cargando && this.errorValidacion === null;
  }

  // ---------------------------------------------------------------------------
  // Gestos
  // ---------------------------------------------------------------------------

  /** Check: marcado = compensar lo que entre (hasta su disponible y sin
   *  pasar el neto a negativo); desmarcado = 0. */
  alternar(fila: FilaCompensable, marcada: boolean): void {
    if (!marcada) {
      fila.importe = 0;
      return;
    }
    const otros = redondear2(this.totalCompensaciones - (Number(fila.importe) || 0));
    const lugar = redondear2(this.totalServicio - otros);
    fila.importe = redondear2(Math.max(0, Math.min(fila.c.disponible, lugar)));
  }

  aplicar(): void {
    if (!this.puedeAplicar) return;
    const resultado: CompensacionLiq[] = this.elegidas.map(f => ({
      idMovimiento: f.c.idMovimiento,
      numero: f.c.numero,
      fecha: f.c.fecha,
      concepto: f.c.concepto,
      importe: redondear2(Number(f.importe)),
    }));
    this.activeModal.close(resultado);
  }

  cancelar(): void {
    this.activeModal.dismiss();
  }
}
```

### 3b — `compensaciones-liq.component.html`

```html
<div class="modal-header">
  <div>
    <h4 class="modal-title">Compensaciones</h4>
    <div class="text-muted">{{ nombreEntidad }}</div>
  </div>
  <button type="button" class="btn-close" (click)="cancelar()"></button>
</div>

<div class="modal-body">
  <p class="text-muted mb-2">
    Anticipos, préstamos y saldos a favor de la entidad que se descuentan en esta liquidación. Lo que se
    compensa no se paga ni se cobra: el neto es lo que queda pendiente. En un borrador es una propuesta; se aplica
    al emitir.
  </p>

  @if (cargando) {
    <app-spinner></app-spinner>
  } @else {
    @if (noDisponibles.length > 0) {
      <div class="alert alert-warning py-2">
        Ya no están disponibles y se quitan al aplicar:
        @for (n of noDisponibles; track n.idMovimiento; let ultimo = $last) {
          <b>{{ n.numero }}</b> ({{ n.importe | formatearValor: '$' }}){{ ultimo ? '.' : ',' }}
        }
      </div>
    }

    @if (filas.length === 0) {
      <div class="alert alert-info py-2">
        {{ nombreEntidad }} no tiene anticipos, préstamos ni saldos a favor para compensar.
      </div>
    } @else {
      <table class="table table-sm table-striped align-middle">
        <thead>
          <tr>
            <th style="width: 2rem;"></th>
            <th>Movimiento</th>
            <th>Fecha</th>
            <th>Concepto</th>
            <th class="text-end">Total</th>
            <th class="text-end">Disponible</th>
            <th class="text-end" style="width: 11rem;">A compensar</th>
          </tr>
        </thead>
        <tbody>
          @for (f of filas; track f.c.idMovimiento) {
            <tr>
              <td>
                <input type="checkbox" class="form-check-input" [checked]="(f.importe ?? 0) > 0"
                  (change)="alternar(f, $any($event.target).checked)" />
              </td>
              <td>
                {{ f.c.numero }}
                @if (f.c.enOtrosBorradores.length > 0) {
                  <div class="small text-warning">
                    También elegido en el borrador de {{ f.c.enOtrosBorradores.join(', ') }}
                  </div>
                }
              </td>
              <td>{{ fechaLegible(f.c.fecha) }}</td>
              <td>{{ etiquetaConcepto[f.c.concepto] }}</td>
              <td class="text-end col-importe">{{ f.c.total | formatearValor: '$' }}</td>
              <td class="text-end col-importe">{{ f.c.disponible | formatearValor: '$' }}</td>
              <td>
                <input inputmode="decimal" class="form-control form-control-sm text-end" appMonto
                  [class.is-invalid]="(f.importe ?? 0) - f.c.disponible > 0.005"
                  [(ngModel)]="f.importe" />
              </td>
            </tr>
          }
        </tbody>
      </table>
    }

    <div class="d-flex justify-content-end gap-4 resumen p-2 rounded">
      <span>Total del servicio: <b>{{ totalServicio | formatearValor: '$' }}</b></span>
      <span>Compensaciones: <b>{{ totalCompensaciones | formatearValor: '$' }}</b></span>
      <span>Neto: <b [class.text-danger]="neto < 0">{{ neto | formatearValor: '$' }}</b></span>
    </div>

    @if (errorValidacion && filas.length > 0) {
      <div class="text-danger small mt-2">{{ errorValidacion }}</div>
    }
  }
  @if (error) {
    <div class="alert alert-danger mt-2 mb-0">{{ error }}</div>
  }
</div>

<div class="modal-footer">
  <button type="button" class="btn btn-outline-secondary" (click)="cancelar()">Cancelar</button>
  <button type="button" class="btn btn-primary" [disabled]="!puedeAplicar" (click)="aplicar()">Aplicar</button>
</div>
```

### 3c — `compensaciones-liq.component.scss`

```scss
.col-importe {
  font-variant-numeric: tabular-nums;
}

.resumen {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
}

th,
td,
input,
.resumen span,
.resumen b {
  font-size: 1.2rem;
}
```

## PASO 4 — `src/app/shared/shared.module.ts`

#### 4a

BUSCAR:
```ts
import { InformeLiqNuevoDetalleComponent } from './modales/informe-liq-nuevo-detalle/informe-liq-nuevo-detalle.component';
```

REEMPLAZAR:
```ts
import { InformeLiqNuevoDetalleComponent } from './modales/informe-liq-nuevo-detalle/informe-liq-nuevo-detalle.component';
import { CompensacionesLiqComponent } from './modales/compensaciones-liq/compensaciones-liq.component';
```

#### 4b

BUSCAR:
```ts
    InformeLiqNuevoDetalleComponent,  // modal (NgbModal.open), no se exporta
```

REEMPLAZAR:
```ts
    InformeLiqNuevoDetalleComponent,  // modal (NgbModal.open), no se exporta
    CompensacionesLiqComponent,       // modal (NgbModal.open), no se exporta
```

## PASO 5 — Aviso F23 en Ajustes

### `src/app/shared/modales/ajustes-liq/ajustes-liq.component.ts`

#### 5a

BUSCAR:
```ts
  formatearValor(valor: number) : any{
```

REEMPLAZAR:
```ts
  /** F23 (Frente Finanzas): el concepto parece un adelanto / préstamo. Esos
   *  se registran en Finanzas (pago con concepto anticipo o préstamo) y se
   *  descuentan como COMPENSACIÓN de la liquidación, no como ajuste. Solo
   *  avisa; no bloquea. */
  get pareceAdelanto(): boolean {
    const patron = /adelanto|anticipo|pr[eé]stamo/i;
    return patron.test(this.descuento?.concepto ?? '') || (this.descuentos ?? []).some(d => patron.test(d.concepto ?? ''));
  }

  formatearValor(valor: number) : any{
```

### `src/app/shared/modales/ajustes-liq/ajustes-liq.component.html`

#### 5ha

BUSCAR:
```html
          @if (descuentos.length > 0) {
```

REEMPLAZAR:
```html
          @if (pareceAdelanto) {
            <div class="alert alert-warning py-2 mt-2 mb-0">
              Los <b>adelantos y préstamos</b> se registran en Finanzas (pago con concepto anticipo o préstamo) y se
              descuentan con <b>Compensaciones</b>, no como ajuste: así quedan atados a la plata entregada y no se
              descuentan dos veces.
            </div>
          }
          @if (descuentos.length > 0) {
```

## PASO 6 — Liquidación nueva

### `src/app/raiz/liquidacion/modales/liquidacion-nueva/liquidacion-nueva.component.ts`

#### 6a

BUSCAR:
```ts
import { DescuentoLiq, PeriodoLiq } from 'src/app/interfaces/informe-liq-nuevo';
```

REEMPLAZAR:
```ts
import { CompensacionLiq, DescuentoLiq, PeriodoLiq } from 'src/app/interfaces/informe-liq-nuevo';
```

#### 6b

BUSCAR:
```ts
import { AjustesLiqComponent } from 'src/app/shared/modales/ajustes-liq/ajustes-liq.component';
```

REEMPLAZAR:
```ts
import { AjustesLiqComponent } from 'src/app/shared/modales/ajustes-liq/ajustes-liq.component';
import { CompensacionesLiqComponent } from 'src/app/shared/modales/compensaciones-liq/compensaciones-liq.component';
import { FinanzasConsultaService } from 'src/app/servicios/finanzas-nueva/finanzas-consulta.service';
import {
  ETIQUETA_CONCEPTO_COMPENSACION, totalCompensacionesDe, totalDisponible,
} from 'src/app/shared/utils/compensacion.util';
import { redondear2, TOLERANCIA_IMPORTE } from 'src/app/shared/utils/finanzas.util';
```

#### 6c

BUSCAR:
```ts
  descuentos: DescuentoLiq[] = [];
  observaciones = '';
```

REEMPLAZAR:
```ts
  descuentos: DescuentoLiq[] = [];
  observaciones = '';

  // Frente Finanzas (FC1): anticipos / saldos a favor que se descuentan.
  compensaciones: CompensacionLiq[] = [];
  /** Σ disponible de la entidad para compensar (aviso). */
  saldoCompensable = 0;
  readonly etiquetaConcepto = ETIQUETA_CONCEPTO_COMPENSACION;
```

#### 6d

BUSCAR:
```ts
    private exportServ: LiquidacionExportService,
  ) {}

  ngOnInit(): void {
    this.anio = this.periodoInicial.anio;
    this.mes = this.periodoInicial.mes;
    this.nombreEntidad = nombreEntidadRef(this.entidad);
    this.columnas = columnasPorTipo(this.tipo);
    this.cargar();
  }
```

REEMPLAZAR:
```ts
    private exportServ: LiquidacionExportService,
    private finanzasConsulta: FinanzasConsultaService,
  ) {}

  ngOnInit(): void {
    this.anio = this.periodoInicial.anio;
    this.mes = this.periodoInicial.mes;
    this.nombreEntidad = nombreEntidadRef(this.entidad);
    this.columnas = columnasPorTipo(this.tipo);
    this.cargar();
    this.cargarSaldoCompensable();
  }

  /** Aviso "tiene $X sin compensar". Best-effort: si falla, no hay aviso. */
  private async cargarSaldoCompensable(): Promise<void> {
    try {
      const compensables = await this.finanzasConsulta.obtenerCompensables(
        { tipo: this.tipo, id: this.entidad.id }, null, [],
      );
      this.saldoCompensable = totalDisponible(compensables);
    } catch (e) {
      console.error('No se pudo leer el saldo compensable', e);
    }
  }
```

#### 6e

BUSCAR:
```ts
  get total(): number {
    return this.factory.calcularValores(this.seleccionados, this.descuentos).total;
  }
```

REEMPLAZAR:
```ts
  get total(): number {
    return this.factory.calcularValores(this.seleccionados, this.descuentos).total;
  }

  get totalCompensaciones(): number {
    return totalCompensacionesDe(this.compensaciones);
  }

  get neto(): number {
    return redondear2(this.total - this.totalCompensaciones);
  }

  /** Lo que la entidad tiene para compensar y no se eligió (aviso). */
  get saldoSinCompensar(): number {
    return redondear2(this.saldoCompensable - this.totalCompensaciones);
  }
```

#### 6f

BUSCAR:
```ts
    return !this.cargando && this.seleccion.size > 0 && this.seleccion.size <= this.MAX;
```

REEMPLAZAR:
```ts
    return !this.cargando && this.seleccion.size > 0 && this.seleccion.size <= this.MAX &&
      this.neto >= -TOLERANCIA_IMPORTE;
```

#### 6g

BUSCAR:
```ts
  quitarDescuento(i: number): void {
    this.descuentos = this.descuentos.filter((_, idx) => idx !== i);
  }
```

REEMPLAZAR:
```ts
  quitarDescuento(i: number): void {
    this.descuentos = this.descuentos.filter((_, idx) => idx !== i);
  }

  /** Modal de compensaciones (FC1). Devuelve la lista completa elegida. */
  async abrirCompensaciones(): Promise<void> {
    const modalRef = this.modalService.open(CompensacionesLiqComponent, {
      size: 'xl', centered: true, scrollable: true,
    });
    modalRef.componentInstance.tipo = this.tipo;
    modalRef.componentInstance.idEntidad = this.entidad.id;
    modalRef.componentInstance.nombreEntidad = this.nombreEntidad;
    modalRef.componentInstance.idInfLiq = null;
    modalRef.componentInstance.actuales = this.compensaciones.map(c => ({ ...c }));
    modalRef.componentInstance.totalServicio = this.total;
    try {
      const r: CompensacionLiq[] = await modalRef.result;
      if (Array.isArray(r)) this.compensaciones = r;
    } catch {
      // dismiss — sin cambios
    }
  }

  quitarCompensacion(i: number): void {
    this.compensaciones = this.compensaciones.filter((_, idx) => idx !== i);
  }
```

#### 6h

BUSCAR:
```ts
      observaciones: this.observaciones.trim(),
      modo: 'borrador',
      numeroInterno: null,
```

REEMPLAZAR:
```ts
      observaciones: this.observaciones.trim(),
      compensaciones: this.compensaciones,
      modo: 'borrador',
      numeroInterno: null,
```

#### 6i

BUSCAR:
```ts
      `<p>${this.seleccion.size} informe(s) — Total: $ ${this.total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>` +
```

REEMPLAZAR:
```ts
      `<p>${this.seleccion.size} informe(s) — Total: $ ${this.total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>` +
      (this.compensaciones.length > 0
        ? `<p>Compensaciones: $ ${this.totalCompensaciones.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` +
          ` — <b>Neto: $ ${this.neto.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>` +
          (accion === 'emitir' ? ' (se aplican al emitir)' : ' (propuesta: se aplican al emitir el borrador)') + '</p>'
        : '') +
```

#### 6j

BUSCAR:
```ts
        columnas: this.columnas.filter(c => c.seleccionada).map(c => c.nombre),
        observaciones: this.observaciones.trim(),
      },
    };
```

REEMPLAZAR:
```ts
        columnas: this.columnas.filter(c => c.seleccionada).map(c => c.nombre),
        observaciones: this.observaciones.trim(),
        compensaciones: this.compensaciones.map(c => ({ idMovimiento: c.idMovimiento, importe: c.importe })),
      },
    };
```

### `src/app/raiz/liquidacion/modales/liquidacion-nueva/liquidacion-nueva.component.html`

#### 6ha

BUSCAR:
```html
            <h6 class="mb-0 me-2">Ajustes</h6>
            <button
                type="button"
                class="btn btn-outline-primary btn-sm"
                (click)="abrirDescuentos()"
            >
                Editar
            </button>
        </div>
```

REEMPLAZAR:
```html
            <h6 class="mb-0 me-2">Ajustes</h6>
            <button
                type="button"
                class="btn btn-outline-primary btn-sm"
                (click)="abrirDescuentos()"
            >
                Editar
            </button>
            <h6 class="mb-0 me-2 ms-3">Compensaciones</h6>
            <button
                type="button"
                class="btn btn-outline-primary btn-sm"
                (click)="abrirCompensaciones()"
            >
                Elegir
            </button>
        </div>
```

#### 6hb

BUSCAR:
```html
        <!-- 5. COLUMNAS -->
```

REEMPLAZAR:
```html
        <!-- 4b. SALDO PARA COMPENSAR (Frente Finanzas) -->
        @if (saldoSinCompensar > 0.005) {
            <div class="alert alert-info py-2 d-flex align-items-center gap-3">
                <span
                    >{{ nombreEntidad }} tiene
                    <b>{{ saldoSinCompensar | formatearValor: "$" }}</b> en
                    anticipos o saldos a favor sin compensar.</span
                >
                <button
                    type="button"
                    class="btn btn-sm btn-outline-primary"
                    (click)="abrirCompensaciones()"
                >
                    Elegir compensaciones
                </button>
            </div>
        }
        <!-- 5. COLUMNAS -->
```

#### 6hc

BUSCAR:
```html
                    }
                </div>
            </div>

            <!-- 5. TOTALES -->
```

REEMPLAZAR:
```html
                    }
                    @if (compensaciones.length > 0) {
                        <h6 class="mt-2 mb-1">Compensaciones</h6>
                        <table
                            class="table table-bordered table-striped table-hover table-responsive table-sm mb-0"
                        >
                            <tbody>
                                @for (
                                    c of compensaciones;
                                    track c.idMovimiento;
                                    let i = $index
                                ) {
                                    <tr>
                                        <td>
                                            {{ etiquetaConcepto[c.concepto] }}
                                            {{ c.numero }}
                                        </td>
                                        <td class="col-moneda negativo">
                                            − {{ c.importe | formatearValor: "$" }}
                                        </td>
                                        <td class="text-center">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="16"
                                                height="16"
                                                fill="currentColor"
                                                class="bi bi-x-circle text-danger"
                                                type="button"
                                                viewBox="0 0 16 16"
                                                (click)="quitarCompensacion(i)"
                                            >
                                                <path
                                                    d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"
                                                />
                                                <path
                                                    d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"
                                                />
                                            </svg>
                                        </td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    }
                </div>
            </div>

            <!-- 5. TOTALES -->
```

#### 6hd

BUSCAR:
```html
                <span
                    >Total: <b>{{ total | formatearValor: "$" }}</b></span
                >
            </div>
```

REEMPLAZAR:
```html
                <span
                    >Total: <b>{{ total | formatearValor: "$" }}</b></span
                >
                @if (compensaciones.length > 0) {
                    <span
                        >Compensaciones:
                        <b class="negativo"
                            >− {{ totalCompensaciones | formatearValor: "$" }}</b
                        ></span
                    >
                    <span
                        >Neto:
                        <b [class.negativo]="neto < 0">{{
                            neto | formatearValor: "$"
                        }}</b></span
                    >
                }
            </div>
            @if (neto < 0) {
                <div class="alert alert-danger py-2">
                    Las compensaciones superan el total: el neto no puede ser
                    negativo. Reducí las compensaciones.
                </div>
            }
```

## PASO 7 — Detalle del informe

### `src/app/shared/modales/informe-liq-nuevo-detalle/informe-liq-nuevo-detalle.component.ts`

#### 7a

BUSCAR:
```ts
import { DescuentoLiq, InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
```

REEMPLAZAR:
```ts
import { CompensacionLiq, DescuentoLiq, InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
```

#### 7b

BUSCAR:
```ts
import { AjustesLiqComponent } from '../ajustes-liq/ajustes-liq.component';
```

REEMPLAZAR:
```ts
import { AjustesLiqComponent } from '../ajustes-liq/ajustes-liq.component';
import { CompensacionesLiqComponent } from '../compensaciones-liq/compensaciones-liq.component';
import {
  ETIQUETA_CONCEPTO_COMPENSACION, compensacionesDe, totalCompensacionesDe,
} from 'src/app/shared/utils/compensacion.util';
import { redondear2, TOLERANCIA_IMPORTE } from 'src/app/shared/utils/finanzas.util';
```

#### 7c

BUSCAR:
```ts
  descuentos: DescuentoLiq[] = [];
  observaciones = '';
  columnas: ColumnaLiq[] = [];
```

REEMPLAZAR:
```ts
  descuentos: DescuentoLiq[] = [];
  observaciones = '';
  columnas: ColumnaLiq[] = [];
  // Frente Finanzas (FC1): editables en borrador (propuesta) y en emitido
  // (aplicadas: al guardar, InformeLiqService.editarDatos mueve los saldos).
  compensaciones: CompensacionLiq[] = [];
  readonly etiquetaConcepto = ETIQUETA_CONCEPTO_COMPENSACION;
```

#### 7d

BUSCAR:
```ts
  get totalEditado(): number {
    return this.subtotalBase + this.descuentoTotalEditado;
  }
```

REEMPLAZAR:
```ts
  get totalEditado(): number {
    return this.subtotalBase + this.descuentoTotalEditado;
  }

  get totalCompensacionesEditado(): number {
    return totalCompensacionesDe(this.compensaciones);
  }

  /** Neto en vivo (total editado − compensaciones en edición). */
  get netoEditado(): number {
    return redondear2(this.totalEditado - this.totalCompensacionesEditado);
  }

  /** F30: no se guarda un neto negativo. */
  get netoInvalido(): boolean {
    return this.netoEditado < -TOLERANCIA_IMPORTE;
  }

  get compensacionesSinGuardar(): boolean {
    return this.compensacionesCambiaron;
  }
```

#### 7e

BUSCAR:
```ts
    return this.descuentosCambiaron || this.observacionesCambiaron || this.columnasCambiaron;
```

REEMPLAZAR:
```ts
    return this.descuentosCambiaron || this.observacionesCambiaron || this.columnasCambiaron ||
      this.compensacionesCambiaron;
```

#### 7f

BUSCAR:
```ts
  private get descuentosCambiaron(): boolean {
    return !!this.liq && !igualesPorContenido(this.descuentos, this.liq.descuentos);
  }
```

REEMPLAZAR:
```ts
  private get descuentosCambiaron(): boolean {
    return !!this.liq && !igualesPorContenido(this.descuentos, this.liq.descuentos);
  }

  private get compensacionesCambiaron(): boolean {
    if (!this.liq) return false;
    const clave = (cs: CompensacionLiq[]) => cs.map(c => ({ id: c.idMovimiento, importe: c.importe }));
    return !igualesPorContenido(clave(this.compensaciones), clave(compensacionesDe(this.liq)));
  }
```

#### 7g

BUSCAR:
```ts
      this.columnas = columnasPorTipo(this.liq.tipo, this.liq.columnas);
    } catch
```

REEMPLAZAR:
```ts
      this.columnas = columnasPorTipo(this.liq.tipo, this.liq.columnas);
      this.compensaciones = compensacionesDe(this.liq).map(c => ({ ...c }));
    } catch
```

#### 7h

BUSCAR:
```ts
  quitarDescuento(i: number): void {
    this.descuentos = this.descuentos.filter((_, idx) => idx !== i);
  }
```

REEMPLAZAR:
```ts
  quitarDescuento(i: number): void {
    this.descuentos = this.descuentos.filter((_, idx) => idx !== i);
  }

  /** Modal de compensaciones (FC1). Devuelve la lista completa elegida; se
   *  persiste con "Guardar cambios". */
  async abrirCompensaciones(): Promise<void> {
    if (!this.liq) return;
    const modalRef = this.modalService.open(CompensacionesLiqComponent, {
      size: 'xl', centered: true, scrollable: true,
    });
    modalRef.componentInstance.tipo = this.liq.tipo;
    modalRef.componentInstance.idEntidad = this.liq.entidad.id;
    modalRef.componentInstance.nombreEntidad = this.nombreEntidad;
    modalRef.componentInstance.idInfLiq = this.idInfLiq;
    modalRef.componentInstance.actuales = this.compensaciones.map(c => ({ ...c }));
    modalRef.componentInstance.totalServicio = this.totalEditado;
    try {
      const r: CompensacionLiq[] = await modalRef.result;
      if (Array.isArray(r)) this.compensaciones = r;
    } catch {
      // dismiss — sin cambios
    }
  }

  quitarCompensacion(i: number): void {
    this.compensaciones = this.compensaciones.filter((_, idx) => idx !== i);
  }
```

#### 7i

BUSCAR:
```ts
    this.columnas = columnasPorTipo(this.liq.tipo, this.liq.columnas);
  }
```

REEMPLAZAR:
```ts
    this.columnas = columnasPorTipo(this.liq.tipo, this.liq.columnas);
    this.compensaciones = compensacionesDe(this.liq).map(c => ({ ...c }));
  }
```

#### 7j

BUSCAR:
```ts
    if (!this.liq || !this.hayCambios) return;
    const cambios: CambiosDatosLiq = {};
```

REEMPLAZAR:
```ts
    if (!this.liq || !this.hayCambios || this.netoInvalido) return;
    const cambios: CambiosDatosLiq = {};
```

#### 7k

BUSCAR:
```ts
    if (this.columnasCambiaron) cambios.columnas = this.columnasSeleccionadas;
```

REEMPLAZAR:
```ts
    if (this.columnasCambiaron) cambios.columnas = this.columnasSeleccionadas;
    if (this.compensacionesCambiaron) {
      cambios.compensaciones = this.compensaciones.map(c => ({ idMovimiento: c.idMovimiento, importe: c.importe }));
    }
```

#### 7l

BUSCAR:
```ts
      valores: this.factory.recalcularTotal(this.liq.valores, this.descuentos),
    };
```

REEMPLAZAR:
```ts
      compensaciones: this.compensaciones.map(c => ({ ...c })),
      valores: this.factory.aplicarCompensaciones(
        this.factory.recalcularTotal(this.liq.valores, this.descuentos), this.compensaciones,
      ),
    };
```

### `src/app/shared/modales/informe-liq-nuevo-detalle/informe-liq-nuevo-detalle.component.html`

#### 7ha

BUSCAR:
```html
                        (click)="abrirDescuentos()"
                    >
                        Editar
                    </button>
                }
            </div>
```

REEMPLAZAR:
```html
                        (click)="abrirDescuentos()"
                    >
                        Editar
                    </button>
                }
                @if (editable || compensaciones.length > 0) {
                    <h6 class="mb-0 me-2 ms-3">Compensaciones</h6>
                }
                @if (editable) {
                    <button
                        type="button"
                        class="btn btn-outline-primary btn-sm"
                        (click)="abrirCompensaciones()"
                    >
                        Elegir
                    </button>
                }
            </div>
```

#### 7hb

BUSCAR:
```html
                Informe emitido: los cambios modifican el total de una
                liquidación que ya tiene número interno.
```

REEMPLAZAR:
```html
                Informe emitido: los cambios modifican el total de una
                liquidación que ya tiene número interno. Las compensaciones
                ya están aplicadas: si las cambiás, al guardar se mueve el
                saldo de los anticipos.
```

#### 7hc

BUSCAR:
```html
                    </table>
                }
            </div>
        </div>

        <!-- TOTALES
```

REEMPLAZAR:
```html
                    </table>
                }
                @if (compensaciones.length > 0) {
                    <h6 class="mt-2 mb-1">Compensaciones</h6>
                    <table
                        class="table table-bordered table-striped table-hover table-responsive table-sm mb-0"
                    >
                        <tbody>
                            @for (
                                c of compensaciones;
                                track c.idMovimiento;
                                let i = $index
                            ) {
                                <tr>
                                    <td>
                                        {{ etiquetaConcepto[c.concepto] }}
                                        {{ c.numero }}
                                    </td>
                                    <td class="col-moneda negativo">
                                        − {{ c.importe | formatearValor: "$" }}
                                    </td>
                                    <td class="text-center">
                                        @if (editable) {
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="16"
                                                height="16"
                                                fill="currentColor"
                                                class="bi bi-x-circle text-danger"
                                                type="button"
                                                viewBox="0 0 16 16"
                                                (click)="quitarCompensacion(i)"
                                            >
                                                <path
                                                    d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"
                                                />
                                                <path
                                                    d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"
                                                />
                                            </svg>
                                        }
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                }
            </div>
        </div>

        <!-- TOTALES
```

#### 7hd

BUSCAR:
```html
                @if (ajustesSinGuardar) {
                    <span class="badge bg-warning text-dark ms-1">sin guardar</span>
                }</span
            >
```

REEMPLAZAR:
```html
                @if (ajustesSinGuardar) {
                    <span class="badge bg-warning text-dark ms-1">sin guardar</span>
                }</span
            >
            @if (compensaciones.length > 0 || (liq.valores.totalCompensaciones ?? 0) > 0) {
                <span
                    >Compensaciones:
                    <b class="negativo"
                        >− {{ totalCompensacionesEditado | formatearValor: "$" }}</b
                    ></span
                >
                <span
                    >Neto:
                    <b [class.negativo]="netoInvalido">{{
                        netoEditado | formatearValor: "$"
                    }}</b>
                    @if (compensacionesSinGuardar) {
                        <span class="badge bg-warning text-dark ms-1">sin guardar</span>
                    }</span
                >
            }
```

#### 7he

BUSCAR:
```html
                [disabled]="!hayCambios || guardando"
                (click)="guardarCambios()"
```

REEMPLAZAR:
```html
                [disabled]="!hayCambios || guardando || netoInvalido"
                (click)="guardarCambios()"
```

## PASO 8 — Verificación

```bash
npm run build:demo
grep -rln "CompensacionesLiqComponent" src/app                        # shared.module, modal, liquidacion-nueva, detalle
grep -c "obtenerCompensables" src/app/servicios/finanzas-nueva/finanzas-consulta.service.ts   # 1
grep -c "abrirCompensaciones" src/app/shared/modales/informe-liq-nuevo-detalle/informe-liq-nuevo-detalle.component.html  # 1
grep -c "abrirCompensaciones" src/app/raiz/liquidacion/modales/liquidacion-nueva/liquidacion-nueva.component.html    # 2
git status --short
```

Esperado:

- El build termina sin errores. Los warnings de presupuesto previos no
  cuentan.
- Los conteos coinciden.
- `git status` muestra:
  - 9 archivos modificados: util, consulta, shared.module, ajustes ts y
    html, liquidacion-nueva ts y html, detalle ts y html;
  - la carpeta nueva `shared/modales/compensaciones-liq/`;
  - lo tuyo sin trackear, si lo hay.

Reportá la salida.

## Pruebas manuales (demo, admin o dev)

Preparación:

- Elegí un chofer directo o un proveedor que tenga informes ACTIVOS para
  liquidar en algún período (si no hay, generá operaciones de octubre con
  el Generador de operaciones).
- Si no tiene un anticipo pendiente, registrale uno: Finanzas → Cuentas →
  "Nuevo pago" → concepto Anticipo, $ 100.000.

Lo ideal es liquidarlo por **quincenas** (1° y 2°) para probar F35.

1. **Aviso F23.** En el modal de Ajustes, escribí "Adelanto": aparece el
   aviso amarillo y se puede agregar igual.
2. **Aviso de saldo.** Liquidación → Informes → Nueva liquidación del
   chofer, 1° quincena: aparece "… tiene $ 100.000,00 en anticipos o saldos
   a favor sin compensar".
3. **Modal.** "Compensaciones → Elegir":
   - se ve el anticipo (número, fecha, concepto, total, disponible);
   - el check pone el importe (hasta el disponible y sin pasar el total);
   - editar el importe recalcula el neto;
   - un importe mayor al disponible: error y "Aplicar" deshabilitado;
   - "Aplicar": la liquidación muestra la lista y los totales
     Compensaciones y Neto.
4. **Guardar borrador.**
   - La confirmación muestra el neto.
   - En Firestore, el informe tiene `compensaciones` (1),
     `valores.totalCompensaciones` y `valores.neto`.
   - El anticipo NO cambió: en Finanzas → Movimientos sigue con el mismo
     "Sin imputar".
5. **F35.** Nueva liquidación del mismo chofer, 2° quincena →
   Compensaciones: el anticipo aparece con "También elegido en el borrador
   de MM/AAAA". Elegilo por el disponible completo y guardá como borrador.
6. **Emitir el primero.**
   - Desde Borradores, emití el de la 1° quincena.
   - En Movimientos, el anticipo baja su "Sin imputar". Su detalle muestra
     la imputación "Compensación en liquidación" con el número LQCH y no
     ofrece "Anular" (deshabilitado).
   - En Cuentas (A pagar) del chofer, bajan los anticipos y el "Sin
     facturar" muestra el neto.
7. **Emitir el segundo.** Falla con "El movimiento OPG-… tiene $ X
   disponibles…". Abrí el borrador → Compensaciones: el disponible es lo que
   queda; bajá el importe, guardá y emití: funciona.
8. **Editar un emitido** (Facturación → Emitidos → abrir):
   - aparece la sección Compensaciones con "Elegir" y el aviso amarillo de
     emitido;
   - bajá el importe → Guardar: el anticipo recupera la diferencia;
   - quitá la compensación (✕) → Guardar: el anticipo queda libre del todo.
9. **Neto negativo.** En el detalle, agregá un ajuste negativo mayor que el
   neto: el neto queda en rojo y "Guardar cambios" deshabilitado.
   Descartar.
10. **Revertir** un emitido con compensación: el anticipo recupera el
    saldo. El detalle del revertido muestra las compensaciones en solo
    lectura.
11. **Emisión directa** desde Liquidación nueva con compensación: aplica en
    el momento (punto 6).
12. **Log** (admin): EMITIR, ALTA y EDITAR incluyen "— compensaciones $ X
    (n)".
13. **Sin compensaciones:** liquidar un cliente sin saldo a favor: no hay
    aviso, el modal dice que no hay nada para compensar y todo funciona
    como antes.

## Commit (lo hace Nico)

```
feat(finanzas): compensaciones en la liquidación — UI (FC1b)

- CompensacionesLiqComponent (shared): elegir anticipos / préstamos /
  saldos a favor de la entidad, disponible por informe, aviso de otros
  borradores (F35), neto en vivo, importes con appMonto.
- FinanzasConsultaService.obtenerCompensables + armarCompensables (puro).
- Liquidación nueva: botón Compensaciones, aviso de saldo sin compensar,
  totales Compensaciones / Neto, envío en DatosLiquidacion.
- Detalle del informe: sección Compensaciones editable en borrador y
  emitido (editarDatos), neto en vivo, bloqueo de neto negativo.
- Ajustes: aviso F23 si el concepto parece un adelanto o préstamo.
```

FIN DE LA INSTRUCCIÓN FC1b
````
