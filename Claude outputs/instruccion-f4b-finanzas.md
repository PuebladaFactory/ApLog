````
# Instrucción F4b — Finanzas: imputar saldo a favor / anticipo a comprobantes

## Contexto

Frente Finanzas, camino nuevo. Diseño: `claude/diseno-finanzas.md` (§9.3 y
`OrigenImputacionFin 'saldo'`). F0–F4 están hechos: registro de cobros/pagos
(F3) y pestaña Movimientos con detalle y anulación (F4).

Un cobro o pago puede quedar con `sinImputar > 0`:

- saldo a favor del cliente (pagó de más);
- anticipo;
- préstamo.

Este bloque permite aplicar ese saldo, después, a comprobantes facturados
de la MISMA entidad.

1. **`MovimientoFinService.imputarSaldo(idMovimiento, solicitudes)`.** Es
   UNA transacción:
   - relee el movimiento: tiene que estar vigente, no ser un ajuste y
     tener saldo;
   - relee cada InformeLiq: tiene que estar facturado, ser de la entidad y
     tener saldo;
   - a cada informe le suma el importe a `totalCobrado` y recalcula `saldo`
     y `estadoFinanciero`. Es el mismo criterio que el registro: para
     chofer/proveedor, `totalCobrado` significa "pagado";
   - agrega al movimiento las imputaciones con `origen: 'saldo'` y fecha de
     hoy, y recalcula `idsDocumentos`, `totalImputado` y `sinImputar`. Es
     una escritura parcial (`'actualizar'`); el array `imputaciones` se
     reescribe entero;
   - escribe un log IMPUTAR (sin diff, como COBRAR/PAGAR).

   Si después se anula el movimiento, `anular()` (F4) ya revierte TODAS sus
   imputaciones, estas incluidas: `reversionesDe` suma por documento.
2. **Modal `ImputarSaldoComponent`.** Usa la misma tabla de comprobantes
   abiertos que el modal de registrar: más antiguos primero, el check salda,
   "Repartir" reparte FIFO.
   - Tope: el saldo sin imputar del movimiento.
   - Validación en vivo con el mismo util que el servicio
     (`validarImputacionSaldo`).
   - Importes con `appMonto` + `inputmode="decimal"` (convención del
     frente; `inputmode="decimal"` da teclado numérico con coma en el
     celular).
3. **Dónde se dispara:**
   - acción "Imputar" en la fila de Movimientos: vigente, cobro/pago,
     `sinImputar > 0`, permiso `finanzas.editar` (dev/admin);
   - botón "Imputar saldo" en el detalle del movimiento, que cierra el
     modal con `'imputar'`, igual que Anular.

   Desde Cuentas llega con F5 (Cuenta de la entidad).

Sin índices ni reglas nuevas: NO hay deploy.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto BUSCAR no aparece, o aparece más de una vez: pará y reportá,
  sin improvisar.
- Archivos con finales de línea LF.
- Build: `npm run build:demo`.
- No toques CLAUDE.md ni CHANGELOG.
- Si tocás un tipo, revisá TODOS sus usos en `src/`, incluidos los
  `.spec.ts` y los `.html`. Este bloque solo AGREGA exports y métodos.

## PASO 0 — Verificación (sin cambios)

Corré y reportá la salida:

```bash
grep -n "export function reversionesDe" src/app/shared/utils/movimiento-fin.util.ts
grep -n "export interface ImputacionSolicitada" src/app/shared/utils/movimiento-fin.util.ts
grep -n "async anular(" src/app/servicios/finanzas-nueva/movimiento-fin.service.ts
grep -c "'IMPUTAR'" src/app/servicios/log-registro/log-registro.service.ts
grep -n "editar: 'editar'" src/app/servicios/permisos/permisos.service.ts
grep -n "id: 'ver', label: 'Ver'" src/app/raiz/finanzas-nueva/movimientos/finanzas-movimientos.component.ts
grep -n "get puedeAnular" src/app/raiz/finanzas-nueva/modales/detalle-movimiento/detalle-movimiento.component.ts
grep -n "appMonto" src/app/raiz/finanzas-nueva/modales/registrar-movimiento/registrar-movimiento.component.html
grep -rn "imputarSaldo\|validarImputacionSaldo\|acumularImputaciones\|normalizarSolicitudes\|ImputarSaldoComponent" src/app
ls src/app/raiz/finanzas-nueva/modales/imputar-saldo
```

Esperado:

- Las líneas 1–3 y 5–7: 1 resultado cada una.
- `'IMPUTAR'`: un conteo de 1 o más (la firma de `agregarAlBatch`).
- `appMonto`: 2 líneas (los dos inputs de importe del modal de registrar).
- El grep de nombres nuevos: nada.
- El `ls`: falla (la carpeta no existe).

Si algo no coincide, pará y reportá.

## PASO 1 — `shared/utils/movimiento-fin.util.ts`: validación y acumulado

Archivo: `src/app/shared/utils/movimiento-fin.util.ts`

BUSCAR (final de `reversionesDe`, últimas líneas del archivo):
```ts
  return [...porDocumento.values()].filter(r => !esCero(r.importe));
}
```

REEMPLAZAR:
```ts
  return [...porDocumento.values()].filter(r => !esCero(r.importe));
}

// ---------------------------------------------------------------------------
// Imputar saldo (F4b)
// ---------------------------------------------------------------------------

/** Solicitudes listas para validar: importes redondeados a centavos y las
 *  de importe 0 descartadas. */
export function normalizarSolicitudes(solicitudes: ImputacionSolicitada[]): ImputacionSolicitada[] {
  return solicitudes
    .map(i => ({ idInfLiq: i.idInfLiq, importe: redondear2(Number(i.importe) || 0) }))
    .filter(i => !esCero(i.importe));
}

/** Reglas para imputar el saldo sin imputar de un movimiento (saldo a favor,
 *  anticipo o préstamo) a comprobantes. Sobre el movimiento RELEÍDO en la
 *  transacción (o el de la fila, en la UI) y solicitudes YA normalizadas.
 *  Que cada comprobante sea de la entidad, esté facturado y tenga saldo lo
 *  validan validarDocumentoImputable / aplicarImporte. Devuelve el mensaje
 *  de error o null. */
export function validarImputacionSaldo(
  mov: Pick<MovimientoFin, 'estado' | 'numero' | 'tipo' | 'sinImputar'>,
  solicitudes: ImputacionSolicitada[],
): string | null {
  if (mov.estado !== 'vigente') return `El movimiento ${mov.numero} está anulado.`;
  if (mov.tipo === 'ajuste') return 'Un ajuste no tiene saldo para imputar.';
  if (!(mov.sinImputar > 0)) return `El movimiento ${mov.numero} no tiene saldo sin imputar.`;
  if (solicitudes.length === 0) return 'Elegí al menos un comprobante.';
  const ids = solicitudes.map(i => i.idInfLiq);
  if (new Set(ids).size !== ids.length) return 'Un comprobante aparece más de una vez.';
  if (solicitudes.some(i => !(i.importe > 0))) return 'Hay un importe a imputar inválido.';
  const total = redondear2(solicitudes.reduce((acc, i) => acc + i.importe, 0));
  if (total - mov.sinImputar > TOLERANCIA_IMPORTE) {
    return `Lo imputado (${total.toFixed(2)}) supera el saldo sin imputar del movimiento (${mov.sinImputar.toFixed(2)}).`;
  }
  return null;
}

/** Campos del movimiento después de sumarle `nuevas` imputaciones (para una
 *  escritura parcial): imputaciones, idsDocumentos, totalImputado y
 *  sinImputar recalculados desde el total. Tira Error si lo imputado
 *  superaría el total (inconsistencia). */
export function acumularImputaciones(
  mov: Pick<MovimientoFin, 'numero' | 'total' | 'imputaciones'>,
  nuevas: ImputacionFin[],
): Pick<MovimientoFin, 'imputaciones' | 'idsDocumentos' | 'totalImputado' | 'sinImputar'> {
  const imputaciones = [...(mov.imputaciones ?? []), ...nuevas];
  const totalImputado = redondear2(imputaciones.reduce((acc, i) => acc + i.importe, 0));
  const sinImputar = redondear2(mov.total - totalImputado);
  if (sinImputar < -TOLERANCIA_IMPORTE) {
    throw new Error(`Lo imputado (${totalImputado.toFixed(2)}) supera el total del movimiento ${mov.numero} (${mov.total.toFixed(2)}).`);
  }
  return {
    imputaciones,
    idsDocumentos: [...new Set(imputaciones.map(i => i.documento.id))],
    totalImputado,
    sinImputar: esCero(sinImputar) ? 0 : sinImputar,
  };
}
```

## PASO 2 — `MovimientoFinService.imputarSaldo`

Archivo: `src/app/servicios/finanzas-nueva/movimiento-fin.service.ts`

### 2a — imports de finanzas.util

BUSCAR:
```ts
import {
  aplicarImporte, estadoFinancieroDe, normalizarValoresFinancieros, totalMedios,
} from 'src/app/shared/utils/finanzas.util';
```

REEMPLAZAR:
```ts
import {
  aplicarImporte, estadoFinancieroDe, normalizarValoresFinancieros, redondear2, totalMedios,
} from 'src/app/shared/utils/finanzas.util';
```

### 2b — imports de movimiento-fin.util

BUSCAR:
```ts
import {
  DatosMovimientoFin, ETIQUETA_TIPO_MOVIMIENTO, acumuladoDeMovimiento, armarImputacion, armarMovimiento,
  normalizarDatosMovimiento, reversionesDe, validarAnulable, validarDatosMovimiento, validarDocumentoImputable,
} from 'src/app/shared/utils/movimiento-fin.util';
```

REEMPLAZAR:
```ts
import {
  DatosMovimientoFin, ETIQUETA_TIPO_MOVIMIENTO, ImputacionSolicitada, acumularImputaciones, acumuladoDeMovimiento,
  armarImputacion, armarMovimiento, normalizarDatosMovimiento, normalizarSolicitudes, reversionesDe, validarAnulable,
  validarDatosMovimiento, validarDocumentoImputable, validarImputacionSaldo,
} from 'src/app/shared/utils/movimiento-fin.util';
```

### 2c — método nuevo al final de la clase

BUSCAR (final de `anular` y cierre de la clase, últimas líneas del archivo):
```ts
      return { exito: false, mensaje: `No se pudo anular: ${e?.message ?? e}` };
    }
  }
}
```

REEMPLAZAR:
```ts
      return { exito: false, mensaje: `No se pudo anular: ${e?.message ?? e}` };
    }
  }

  /** Aplica el saldo sin imputar de un cobro o pago (saldo a favor del
   *  cliente, anticipo o préstamo) a comprobantes facturados de la MISMA
   *  entidad. Transacción: relee el movimiento (vigente, con saldo) y cada
   *  InformeLiq (facturado, de la entidad, con saldo); a cada informe le
   *  suma el importe a totalCobrado y recalcula saldo y estadoFinanciero;
   *  agrega al movimiento las imputaciones (origen 'saldo', fecha = hoy) y
   *  recalcula totalImputado / sinImputar; log IMPUTAR. Si después se anula
   *  el movimiento, anular() revierte también estas imputaciones. */
  async imputarSaldo(idMovimiento: string, solicitudes: ImputacionSolicitada[]): Promise<Resultado<void>> {
    const pedidas = normalizarSolicitudes(solicitudes);
    if (pedidas.length === 0) return { exito: false, mensaje: 'Elegí al menos un comprobante.' };

    // Afuera del callback: puede reintentarse y tiene que ser puro.
    const fecha = toISODateString(new Date());

    try {
      const r = await this.db.commitEnTransaccion<{ numero: string; importe: number; comprobantes: number; sinImputar: number }>(
        async (tx) => {
          const mov = await this.db.leerEnTransaccion<MovimientoFin>(tx, this.COLECCION, idMovimiento);
          if (!mov) throw new Error(`No existe el movimiento ${idMovimiento}.`);
          const error = validarImputacionSaldo(mov, pedidas);
          if (error) throw new Error(error);

          const leidos = await Promise.all(pedidas.map(async imp => ({
            imp,
            liq: await this.db.leerEnTransaccion<InformeLiqNuevo>(tx, this.COL_LIQ, imp.idInfLiq),
          })));
          // — fin de lecturas —

          const escrituras: EscrituraBatch[] = [];
          const nuevas: ImputacionFin[] = [];
          for (const { imp, liq } of leidos) {
            if (!liq) throw new Error(`No existe el informe de liquidación ${imp.idInfLiq}.`);
            validarDocumentoImputable(liq, imp.idInfLiq, mov.entidad);
            const vfAntes = normalizarValoresFinancieros(liq.valoresFinancieros, liq.valores.total);
            const vf = aplicarImporte(vfAntes, 'totalCobrado', imp.importe);   // tira Error si supera el saldo
            nuevas.push(armarImputacion(liq, imp.idInfLiq, vfAntes, imp.importe, fecha, 'saldo'));
            this.informeLiqServ.agregarEscrituraInformeLiqParcial(escrituras, imp.idInfLiq, {
              valoresFinancieros: vf,
              estadoFinanciero: estadoFinancieroDe(vf, liq.estadoFinanciero),
            });
          }

          const campos = acumularImputaciones(mov, nuevas);
          escrituras.push({ coleccion: this.COLECCION, id: idMovimiento, modo: 'actualizar', data: campos });

          const importe = redondear2(nuevas.reduce((acc, i) => acc + i.importe, 0));
          await this.logRegistro.agregarAlBatch(
            escrituras, 'IMPUTAR', this.COLECCION, idMovimiento,
            `Imputación de saldo del ${ETIQUETA_TIPO_MOVIMIENTO[mov.tipo].toLowerCase()} ${mov.numero} — ` +
            `${mov.entidad.tipo} ${mov.entidad.razonSocial} — $ ${importe.toFixed(2)} a ${nuevas.length} comprobante(s) — ` +
            `queda sin imputar $ ${campos.sinImputar.toFixed(2)}`,
          );

          return {
            escrituras,
            resultado: { numero: mov.numero, importe, comprobantes: nuevas.length, sinImputar: campos.sinImputar },
          };
        },
      );

      return {
        exito: true,
        mensaje: `Se imputaron $ ${r.importe.toFixed(2)} de ${r.numero} a ${r.comprobantes} comprobante(s).` +
          (r.sinImputar > 0 ? ` Quedan $ ${r.sinImputar.toFixed(2)} sin imputar.` : ''),
      };
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'IMPUTAR', this.COLECCION, idMovimiento, `Error al imputar saldo: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `No se pudo imputar: ${e?.message ?? e}` };
    }
  }
}
```

## PASO 3 — Modal `ImputarSaldoComponent` (archivos nuevos)

Carpeta: `src/app/raiz/finanzas-nueva/modales/imputar-saldo/`

### 3a — `imputar-saldo.component.ts`

```ts
import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { MovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { FinanzasConsultaService } from 'src/app/servicios/finanzas-nueva/finanzas-consulta.service';
import { MovimientoFinService } from 'src/app/servicios/finanzas-nueva/movimiento-fin.service';
import { InformeLiqFactoryService } from 'src/app/servicios/informes-liq/informe-liq-factory.service';
import { fechaBaseAntiguedad } from 'src/app/shared/utils/cuentas-finanzas.util';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import {
  diasEntre, distribuirFifo, esCero, normalizarValoresFinancieros, redondear2, TOLERANCIA_IMPORTE,
} from 'src/app/shared/utils/finanzas.util';
import {
  ETIQUETA_CONCEPTO, ETIQUETA_TIPO_MOVIMIENTO, ImputacionSolicitada, normalizarSolicitudes, validarImputacionSaldo,
} from 'src/app/shared/utils/movimiento-fin.util';

/** Comprobante abierto de la entidad (InformeLiq facturado con saldo). */
interface FilaComprobante {
  liq: ConId<InformeLiqNuevo>;
  periodo: string;
  fechaFactura: string;     // legible
  dias: number | null;
  total: number;
  saldo: number;
  importe: number | null;   // a imputar (appMonto: null si el input queda vacío)
}

/** Finanzas — imputar el saldo sin imputar de un cobro o pago (saldo a
 *  favor del cliente, anticipo o préstamo) a comprobantes facturados de la
 *  misma entidad. Misma tabla de comprobantes que RegistrarMovimiento
 *  (más antiguos primero, saldar con el check, reparto FIFO). Valida en vivo
 *  con el mismo util que el servicio (validarImputacionSaldo) y llama a
 *  MovimientoFinService.imputarSaldo, que revalida todo en su transacción.
 *  Cierra con true si imputó; si falla, queda abierto con el error. */
@Component({
  selector: 'app-imputar-saldo',
  standalone: false,
  templateUrl: './imputar-saldo.component.html',
  styleUrl: './imputar-saldo.component.scss',
})
export class ImputarSaldoComponent implements OnInit {

  @Input() movimiento!: ConId<MovimientoFin>;

  readonly hoy = toISODateString(new Date());
  readonly etiquetaTipo = ETIQUETA_TIPO_MOVIMIENTO;
  readonly etiquetaConcepto = ETIQUETA_CONCEPTO;
  readonly fechaLegible = fechaComprobanteLegible;

  filas: FilaComprobante[] = [];
  cargando = false;
  guardando = false;
  error = '';

  constructor(
    public activeModal: NgbActiveModal,
    private consulta: FinanzasConsultaService,
    private movimientos: MovimientoFinService,
    private factory: InformeLiqFactoryService,
  ) {}

  async ngOnInit(): Promise<void> {
    const entidad = this.movimiento.entidad;
    this.cargando = true;
    try {
      const abiertos = await firstValueFrom(this.consulta.observarInformesAbiertos());
      this.filas = abiertos
        .filter(l => l.estado === 'facturado' && l.tipo === entidad.tipo && l.entidad.id === entidad.id)
        .map(l => this.armarFila(l))
        .filter(f => f.saldo > 0)
        .sort((a, b) => fechaBaseAntiguedad(a.liq).localeCompare(fechaBaseAntiguedad(b.liq)));
    } catch (e: any) {
      this.error = `No se pudieron leer los comprobantes: ${e?.message ?? e}`;
    } finally {
      this.cargando = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Derivados
  // ---------------------------------------------------------------------------

  get disponible(): number {
    return this.movimiento.sinImputar;
  }

  get totalImputado(): number {
    return redondear2(this.filas.reduce((acc, f) => acc + (Number(f.importe) || 0), 0));
  }

  get restante(): number {
    const v = redondear2(this.disponible - this.totalImputado);
    return esCero(v) ? 0 : v;
  }

  get totalSaldos(): number {
    return redondear2(this.filas.reduce((acc, f) => acc + f.saldo, 0));
  }

  /** Error de validación en vivo (mismo util que el servicio + saldo por fila). */
  get errorValidacion(): string | null {
    const excedida = this.filas.find(f => (Number(f.importe) || 0) - f.saldo > TOLERANCIA_IMPORTE);
    if (excedida) return `El importe del comprobante ${excedida.liq.numeroInterno} supera su saldo.`;
    return validarImputacionSaldo(this.movimiento, normalizarSolicitudes(this.solicitudes()));
  }

  get puedeConfirmar(): boolean {
    return !this.cargando && !this.guardando && this.errorValidacion === null;
  }

  // ---------------------------------------------------------------------------
  // Gestos
  // ---------------------------------------------------------------------------

  /** Check de la fila: marcado = saldar el comprobante con lo que quede
   *  disponible (hasta su saldo); desmarcado = 0. */
  alternarFila(fila: FilaComprobante, marcada: boolean): void {
    if (!marcada) {
      fila.importe = 0;
      return;
    }
    const otros = redondear2(this.totalImputado - (Number(fila.importe) || 0));
    fila.importe = redondear2(Math.max(0, Math.min(fila.saldo, this.disponible - otros)));
  }

  /** Reparte el saldo disponible entre los comprobantes, del más antiguo al
   *  más nuevo (distribuirFifo). */
  repartir(): void {
    const importes = distribuirFifo(this.disponible, this.filas.map(f => f.saldo));
    this.filas.forEach((f, i) => (f.importe = importes[i]));
  }

  async confirmar(): Promise<void> {
    if (!this.puedeConfirmar) return;
    this.error = '';
    const cantidad = this.filas.filter(f => (Number(f.importe) || 0) > 0).length;
    const r = await Swal.fire({
      title: `¿Imputar saldo de ${this.movimiento.numero}?`,
      html:
        `<p>${this.movimiento.entidad.razonSocial} — <b>$ ${this.totalImputado.toFixed(2)}</b> a ${cantidad} comprobante(s).</p>` +
        (this.restante > 0 ? `<p>Quedan $ ${this.restante.toFixed(2)} sin imputar.</p>` : ''),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Imputar',
      cancelButtonText: 'Volver',
    });
    if (!r.isConfirmed) return;

    this.guardando = true;
    try {
      const res = await this.movimientos.imputarSaldo(this.movimiento.idMovimiento, this.solicitudes());
      if (!res.exito) {
        this.error = res.mensaje;
        return;
      }
      await Swal.fire({ icon: 'success', text: res.mensaje, timer: 2500 });
      this.activeModal.close(true);
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.activeModal.dismiss();
  }

  // ---------------------------------------------------------------------------
  // Auxiliares
  // ---------------------------------------------------------------------------

  private solicitudes(): ImputacionSolicitada[] {
    return this.filas
      .filter(f => (Number(f.importe) || 0) > 0)
      .map(f => ({ idInfLiq: f.liq.idInfLiq, importe: Number(f.importe) }));
  }

  private armarFila(liq: ConId<InformeLiqNuevo>): FilaComprobante {
    const vf = normalizarValoresFinancieros(liq.valoresFinancieros, liq.valores.total);
    const base = fechaBaseAntiguedad(liq);
    let dias: number | null = null;
    try { dias = diasEntre(base, this.hoy); } catch { dias = null; }
    return {
      liq,
      periodo: this.factory.textoPeriodo(liq.periodo),
      fechaFactura: fechaComprobanteLegible(base),
      dias,
      total: vf.total,
      saldo: vf.saldo,
      importe: 0,
    };
  }
}
```

### 3b — `imputar-saldo.component.html`

```html
<div class="modal-header">
  <div>
    <h4 class="modal-title">Imputar saldo — {{ etiquetaTipo[movimiento.tipo] }} {{ movimiento.numero }}</h4>
    <div class="text-muted">
      <span class="text-capitalize">{{ movimiento.entidad.tipo }}</span> {{ movimiento.entidad.razonSocial }} — CUIT {{ movimiento.entidad.cuit }}
    </div>
  </div>
  <button type="button" class="btn-close" [disabled]="guardando" (click)="cancelar()"></button>
</div>

<div class="modal-body">
  <div class="row g-2 mb-3">
    <div class="col-md-3">
      <div class="dato-label">Fecha del movimiento</div>
      <div>{{ fechaLegible(movimiento.fecha) }}</div>
    </div>
    <div class="col-md-3">
      <div class="dato-label">Concepto</div>
      <div>{{ etiquetaConcepto[movimiento.concepto] }}</div>
    </div>
    <div class="col-md-3">
      <div class="dato-label">Total</div>
      <div class="col-importe">{{ movimiento.total | formatearValor: '$' }}</div>
    </div>
    <div class="col-md-3">
      <div class="dato-label">Sin imputar (disponible)</div>
      <div class="col-importe fw-bold">{{ disponible | formatearValor: '$' }}</div>
    </div>
  </div>

  <div class="d-flex align-items-center mb-1">
    <h6 class="mb-0">Comprobantes abiertos</h6>
    <button type="button" class="btn btn-sm btn-outline-secondary ms-3" [disabled]="guardando || filas.length === 0"
      (click)="repartir()">Repartir el disponible (más antiguos primero)</button>
  </div>

  @if (cargando) {
    <app-spinner></app-spinner>
  } @else if (filas.length === 0) {
    <div class="alert alert-info py-2">
      {{ movimiento.entidad.razonSocial }} no tiene informes facturados con saldo. El importe queda sin imputar hasta que haya uno.
    </div>
  } @else {
    <table class="table table-sm table-striped align-middle">
      <thead>
        <tr>
          <th style="width: 2rem;"></th>
          <th>Informe</th>
          <th>Período</th>
          <th>Factura</th>
          <th class="text-center">Días</th>
          <th class="text-end">Total</th>
          <th class="text-end">Saldo</th>
          <th class="text-end" style="width: 11rem;">A imputar</th>
        </tr>
      </thead>
      <tbody>
        @for (f of filas; track f.liq.idInfLiq) {
          <tr>
            <td>
              <input type="checkbox" class="form-check-input" [checked]="(f.importe ?? 0) > 0"
                (change)="alternarFila(f, $any($event.target).checked)" [disabled]="guardando" />
            </td>
            <td>{{ f.liq.numeroInterno }}</td>
            <td>{{ f.periodo }}</td>
            <td>{{ f.fechaFactura }}</td>
            <td class="text-center col-importe">{{ f.dias ?? '—' }}</td>
            <td class="text-end col-importe">{{ f.total | formatearValor: '$' }}</td>
            <td class="text-end col-importe">{{ f.saldo | formatearValor: '$' }}</td>
            <td>
              <input inputmode="decimal" class="form-control form-control-sm text-end" appMonto
                [class.is-invalid]="(f.importe ?? 0) - f.saldo > 0.005"
                [(ngModel)]="f.importe" [disabled]="guardando" />
            </td>
          </tr>
        }
      </tbody>
      <tfoot>
        <tr>
          <td colspan="6" class="text-end">Saldo total {{ totalSaldos | formatearValor: '$' }}</td>
          <td class="text-end fw-bold">Imputado</td>
          <td class="text-end fw-bold col-importe">{{ totalImputado | formatearValor: '$' }}</td>
        </tr>
      </tfoot>
    </table>
  }

  <div class="row g-2 mt-2">
    <div class="col-md-8 text-muted small">
      Las imputaciones quedan con fecha de hoy y origen "Imputación de saldo". Si después se anula el movimiento,
      se revierten junto con las demás.
    </div>
    <div class="col-md-4">
      <div class="resumen p-2 rounded">
        <div class="d-flex justify-content-between"><span>Disponible</span><span class="col-importe">{{ disponible | formatearValor: '$' }}</span></div>
        <div class="d-flex justify-content-between"><span>A imputar</span><span class="col-importe">{{ totalImputado | formatearValor: '$' }}</span></div>
        <div class="d-flex justify-content-between fw-bold">
          <span>Queda sin imputar</span>
          <span class="col-importe">{{ restante | formatearValor: '$' }}</span>
        </div>
      </div>
    </div>
  </div>

  @if (errorValidacion && !cargando && filas.length > 0) {
    <div class="text-danger small mt-2">{{ errorValidacion }}</div>
  }
  @if (error) {
    <div class="alert alert-danger mt-2 mb-0">{{ error }}</div>
  }
</div>

<div class="modal-footer">
  <button type="button" class="btn btn-success" [disabled]="!puedeConfirmar" (click)="confirmar()">Imputar</button>
  <button type="button" class="btn btn-outline-secondary" [disabled]="guardando" (click)="cancelar()">Cancelar</button>
</div>

@if (guardando) {
  <app-spinner></app-spinner>
}
```

### 3c — `imputar-saldo.component.scss`

```scss
.dato-label {
  font-size: 0.85rem;
  color: #6c757d;
}

.col-importe {
  font-variant-numeric: tabular-nums;
}

.resumen {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
}

th,
td,
input {
  font-size: 1.2rem;
}
```

## PASO 4 — Movimientos: acción Imputar

Archivo: `src/app/raiz/finanzas-nueva/movimientos/finanzas-movimientos.component.ts`

### 4a

BUSCAR:
```ts
import { DetalleMovimientoComponent } from '../modales/detalle-movimiento/detalle-movimiento.component';
```

REEMPLAZAR:
```ts
import { DetalleMovimientoComponent } from '../modales/detalle-movimiento/detalle-movimiento.component';
import { ImputarSaldoComponent } from '../modales/imputar-saldo/imputar-saldo.component';
```

### 4b

BUSCAR:
```ts
 *  Acciones: ver (DetalleMovimientoComponent) y anular
 *  (MovimientoFinService.anular, motivo obligatorio, finanzas.anular).
 *  Orden inicial: fecha descendente (es un historial, no un listado de
 *  entidades). Imputar saldo llega en F4b. */
```

REEMPLAZAR:
```ts
 *  Acciones: ver (DetalleMovimientoComponent), imputar el saldo sin imputar
 *  a comprobantes (ImputarSaldoComponent → MovimientoFinService.imputarSaldo,
 *  finanzas.editar) y anular (MovimientoFinService.anular, motivo
 *  obligatorio, finanzas.anular). Orden inicial: fecha descendente (es un
 *  historial, no un listado de entidades). */
```

### 4c

BUSCAR:
```ts
    { id: 'ver', label: 'Ver', clase: 'btn-outline-primary' },

```

REEMPLAZAR:
```ts
    { id: 'ver', label: 'Ver', clase: 'btn-outline-primary' },
    {
      id: 'imputar', label: 'Imputar', clase: 'btn-outline-success', permiso: 'finanzas.editar',
      visible: m => m.estado === 'vigente' && m.tipo !== 'ajuste' && m.sinImputar > 0,
    },

```

### 4d

BUSCAR:
```ts
    if (ev.id === 'ver') this.verDetalle(ev.item);
    else if (ev.id === 'anular') this.anular(ev.item);
```

REEMPLAZAR:
```ts
    if (ev.id === 'ver') this.verDetalle(ev.item);
    else if (ev.id === 'imputar') this.abrirImputar(ev.item);
    else if (ev.id === 'anular') this.anular(ev.item);
```

### 4e

BUSCAR:
```ts
  /** Detalle en modal. Si se cierra con 'anular', sigue el mismo flujo que
   *  la acción de la fila. */
```

REEMPLAZAR:
```ts
  /** Detalle en modal. Si se cierra con 'anular' o 'imputar', sigue el
   *  mismo flujo que la acción de la fila. */
```

### 4f

BUSCAR:
```ts
        if (resultado === 'anular') this.anular(m);
      })
      .catch(() => {});
  }
```

REEMPLAZAR:
```ts
        if (resultado === 'anular') this.anular(m);
        else if (resultado === 'imputar') this.abrirImputar(m);
      })
      .catch(() => {});
  }

  /** Imputar el saldo sin imputar a comprobantes de la entidad. La tabla se
   *  actualiza sola por el listener. */
  abrirImputar(m: Fila): void {
    const modalRef = this.modalService.open(ImputarSaldoComponent, {
      size: 'xl', centered: true, scrollable: true, backdrop: 'static', keyboard: false,
    });
    modalRef.componentInstance.movimiento = m;
    modalRef.result.catch(() => {});
  }
```

## PASO 5 — Detalle: botón Imputar saldo

### 5a — `src/app/raiz/finanzas-nueva/modales/detalle-movimiento/detalle-movimiento.component.ts`

BUSCAR:
```ts
/** Finanzas — detalle de un movimiento (solo lectura): datos generales,
 *  medios, imputaciones y anulación. Muestra el movimiento tal como llegó
 *  (snapshot de la fila, no escucha cambios). El botón Anular cierra el
 *  modal con 'anular' y el que lo abrió sigue el flujo (motivo + servicio).
 *  Imprimir (recibo / orden de pago) llega en F8. */
```

REEMPLAZAR:
```ts
/** Finanzas — detalle de un movimiento (solo lectura): datos generales,
 *  medios, imputaciones y anulación. Muestra el movimiento tal como llegó
 *  (snapshot de la fila, no escucha cambios). Los botones Imputar saldo y
 *  Anular cierran el modal con 'imputar' / 'anular' y el que lo abrió sigue
 *  el flujo. Imprimir (recibo / orden de pago) llega en F8. */
```

BUSCAR:
```ts
  get puedeAnular(): boolean {
    return this.movimiento.estado === 'vigente' && !this.compensado;
  }
```

REEMPLAZAR:
```ts
  get puedeAnular(): boolean {
    return this.movimiento.estado === 'vigente' && !this.compensado;
  }

  get puedeImputar(): boolean {
    return this.movimiento.estado === 'vigente' && this.movimiento.tipo !== 'ajuste' && this.movimiento.sinImputar > 0;
  }
```

BUSCAR:
```ts
  anular(): void {
    this.activeModal.close('anular');
  }
```

REEMPLAZAR:
```ts
  anular(): void {
    this.activeModal.close('anular');
  }

  imputar(): void {
    this.activeModal.close('imputar');
  }
```

### 5b — `src/app/raiz/finanzas-nueva/modales/detalle-movimiento/detalle-movimiento.component.html`

BUSCAR:
```html
  <button type="button" class="btn btn-outline-secondary" (click)="cerrar()">Cerrar</button>
```

REEMPLAZAR:
```html
  @if (puedeImputar) {
    <button *appPermiso="'finanzas.editar'" type="button" class="btn btn-success" (click)="imputar()">Imputar saldo</button>
  }
  <button type="button" class="btn btn-outline-secondary" (click)="cerrar()">Cerrar</button>
```

## PASO 6 — Módulo

Archivo: `src/app/raiz/finanzas-nueva/finanzas-nueva.module.ts`

BUSCAR:
```ts
import { DetalleMovimientoComponent } from './modales/detalle-movimiento/detalle-movimiento.component';
```

REEMPLAZAR:
```ts
import { DetalleMovimientoComponent } from './modales/detalle-movimiento/detalle-movimiento.component';
import { ImputarSaldoComponent } from './modales/imputar-saldo/imputar-saldo.component';
```

BUSCAR:
```ts
    DetalleMovimientoComponent,
  ],
```

REEMPLAZAR:
```ts
    DetalleMovimientoComponent,
    ImputarSaldoComponent,
  ],
```

## PASO 7 — Verificación

```bash
npm run build:demo
grep -c "async imputarSaldo(" src/app/servicios/finanzas-nueva/movimiento-fin.service.ts        # 1
grep -rl "validarImputacionSaldo" src/app --include=*.ts | wc -l                               # 3 (util, service, modal)
grep -c "ImputarSaldoComponent" src/app/raiz/finanzas-nueva/finanzas-nueva.module.ts           # 2
grep -c "abrirImputar" src/app/raiz/finanzas-nueva/movimientos/finanzas-movimientos.component.ts  # 3
grep -n "appMonto" src/app/raiz/finanzas-nueva/modales/imputar-saldo/imputar-saldo.component.html
git status --short
```

Esperado:

- El build termina sin errores. Los warnings de presupuesto previos no
  cuentan.
- Los conteos coinciden.
- `git status` muestra solo:
  - 6 archivos modificados: util, servicio, movimientos ts, detalle ts y
    html, módulo;
  - la carpeta nueva `modales/imputar-saldo/`;
  - lo tuyo sin trackear, si lo hay.

Reportá la salida.

## Pruebas manuales (demo)

Algunas pruebas usan un usuario **admin**: con dev no se escribe log.

1. **Preparación.** Registrá un cobro a un cliente con facturas abiertas:
   imputá solo una parte para que quede saldo a favor, por ejemplo $ 500
   sin imputar. Registrá también un anticipo a un chofer directo o
   proveedor que tenga informes facturados.
2. **Acción visible.**
   - En Movimientos, "Imputar" aparece solo en movimientos vigentes con
     "Sin imputar" > 0.
   - No aparece en anulados, ni en movimientos totalmente imputados, ni
     para el rol demo.
   - El detalle muestra "Imputar saldo" en los mismos casos.
3. **Modal.**
   - Muestra el disponible y los comprobantes facturados con saldo de esa
     entidad, del más antiguo al más nuevo.
   - Con el check marcado, el comprobante se salda hasta lo que quede
     disponible.
   - "Repartir" distribuye el disponible FIFO.
   - Los importes se formatean al escribir (`appMonto`).
   - Si pasás el disponible o el saldo de un comprobante, aparece el error
     en rojo y "Imputar" queda deshabilitado.
4. **Imputar parcial** (admin). Imputá una parte, por ejemplo $ 300 de
   los $ 500:
   - mensaje de éxito; en Movimientos, la fila muestra Imputado +300 y
     Sin imputar 200, sin refrescar;
   - en el detalle aparece la imputación nueva con origen "Imputación de
     saldo" y fecha de hoy;
   - en Cuentas, el cliente baja $ 300 en Facturado abierto y $ 300 en
     Saldo a favor (el neto no cambia);
   - en Firestore (`informesLiq/<id>`): `valoresFinancieros.totalCobrado`
     subió, `saldo` bajó y `estadoFinanciero` es `parcial` o `cobrado`.
5. **Imputar el resto.** Con los $ 200 restantes: Sin imputar queda en 0,
   la acción "Imputar" desaparece de la fila y el saldo a favor del cliente
   ya no figura en Cuentas.
6. **Anticipo a chofer/proveedor.** Mismo circuito del lado "A pagar":
   bajan el facturado abierto y los anticipos de esa entidad.
7. **Anular después de imputar.** Anulá el cobro del punto 1:
   - todos los comprobantes recuperan lo imputado, la parte directa del
     registro y las imputaciones de saldo;
   - en Cuentas, el facturado abierto vuelve al valor anterior al punto 1.
8. **Sin comprobantes.** Con una entidad que tenga saldo sin imputar pero
   ningún facturado con saldo, el modal muestra el aviso azul y no deja
   imputar.
9. **Log** (admin). Ajustes → Log muestra IMPUTAR en `movimientosFin` con
   número, entidad, importe, cantidad de comprobantes y lo que queda sin
   imputar.

## Commit (lo hace Nico)

```
feat(finanzas): imputar saldo a favor / anticipo a comprobantes (F4b)

- MovimientoFinService.imputarSaldo: una transacción. Suma a totalCobrado
  de cada InformeLiq facturado de la entidad (saldo y estadoFinanciero),
  agrega al movimiento imputaciones con origen 'saldo' y recalcula
  totalImputado / sinImputar; log IMPUTAR.
- ImputarSaldoComponent: comprobantes abiertos de la entidad, saldar con el
  check, reparto FIFO del disponible, validación en vivo, importes con
  appMonto.
- Movimientos: acción Imputar (finanzas.editar); detalle: botón Imputar
  saldo.
- movimiento-fin.util: normalizarSolicitudes, validarImputacionSaldo,
  acumularImputaciones.
```
````
