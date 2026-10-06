````
# Instrucción F4 — Finanzas: pestaña Movimientos (historial, detalle, anular)

## Contexto

Frente Finanzas, camino nuevo (`raiz/finanzas-nueva`, ruta `finanzasNueva`).
Diseño: `claude/diseno-finanzas.md` (§4.5 pantalla 4, F10, §13). Ya están
hechos F0–F3: colección `movimientosFin`, pestaña Cuentas y registro de
cobros/pagos (`MovimientoFinService.registrar`).

Este bloque agrega:

1. **Cuentas ordenada por nombre A→Z** al abrir (antes: neto descendente).
   Criterio pedido para las tablas de entidades. Los encabezados siguen
   ordenando a mano.
2. **Pestaña Movimientos.** Es el historial en vivo de `movimientosFin`.
   - Consulta: rango de `fecha` (desde/hasta). Es un rango sobre un solo
     campo, así que alcanza el índice simple automático: NO hay índice
     nuevo y NO hay deploy.
   - En memoria: filtros de tipo, estado y texto (número, nombre o CUIT).
   - Los filtros se recuerdan durante la sesión.
   - Tarjetas: cobros, pagos, sin imputar y anulados.
   - Orden inicial: fecha descendente. Es un historial, no un listado de
     entidades.
3. **Detalle del movimiento** (modal, solo lectura): datos, medios,
   imputaciones, totales y la anulación si la hay.
4. **Anular un movimiento entero** (F10: no se edita, motivo obligatorio,
   permiso `finanzas.anular` → dev/admin). Es UNA transacción en
   `MovimientoFinService.anular`:
   - relee el movimiento: tiene que estar vigente y sin compensaciones
     (FC1);
   - relee cada InformeLiq imputado y le devuelve lo que este movimiento
     le imputó: lo resta de `totalCobrado` (de `totalAjustado` en un
     ajuste) y recalcula `saldo` y `estadoFinanciero`;
   - marca el movimiento `'anulado'` con `anulacion {motivo, usuario,
     fecha}`; número, medios e imputaciones quedan como registro;
   - agrega un log ANULAR con diff, en el mismo commit.

   El `sinImputar` de un movimiento anulado deja de contar porque las
   consultas de saldo ya filtran `estado === 'vigente'`
   (`observarMovimientosConSaldo`).

Imputar un saldo a favor o un anticipo a comprobantes queda para **F4b**
(bloque siguiente). Va aparte para que esta instrucción no sea enorme.

Este bloque no tiene inputs de importe. Convención para los próximos: los
importes van con `appMonto`, sin `type="number"`.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto BUSCAR no aparece, o aparece más de una vez: pará y reportá,
  sin improvisar.
- Archivos con finales de línea LF.
- Build: `npm run build:demo`.
- No toques CLAUDE.md ni CHANGELOG (se actualizan al cerrar el frente).
- Si tocás un tipo, revisá TODOS sus usos en `src/`, incluidos los
  `.spec.ts` y los `.html`. Este bloque solo AGREGA exports, no cambia
  tipos existentes.

## PASO 0 — Verificación (sin cambios)

Corré y reportá la salida:

```bash
grep -n "observarPorRango<T>" src/app/servicios/database/db-firestore.service.ts
grep -n "'ANULAR'" src/app/servicios/log-registro/log-registro.service.ts
grep -n "anular:" src/app/servicios/permisos/permisos.service.ts
grep -n "agregarEscrituraInformeLiqParcial(escrituras" src/app/servicios/informes-liq/informe-liq.service.ts
grep -n "export function armarMovimiento" src/app/shared/utils/movimiento-fin.util.ts
grep -n "async registrar(" src/app/servicios/finanzas-nueva/movimiento-fin.service.ts
grep -n "filtrosCuentas" src/app/servicios/finanzas-nueva/finanzas-consulta.service.ts
grep -n "ordenInicial" src/app/raiz/finanzas-nueva/cuentas/finanzas-cuentas.component.ts
grep -n "path: 'cuentas'" src/app/raiz/finanzas-nueva/finanzas-nueva-routing.module.ts
grep -n "finanzasNueva/cuentas" src/app/raiz/finanzas-nueva/control/finanzas-nueva-control.component.ts
grep -rn "ETIQUETA_TIPO_MOVIMIENTO\|reversionesDe\|observarMovimientosPorFecha\|FinanzasMovimientosComponent\|DetalleMovimientoComponent" src/app
ls src/app/raiz/finanzas-nueva/movimientos src/app/raiz/finanzas-nueva/modales/detalle-movimiento
```

Esperado:

- Las 10 primeras líneas tienen 1 resultado cada una. En permisos aparece
  la línea `anular: 'editar',`.
- El grep de nombres nuevos no devuelve nada.
- Los dos `ls` fallan (las carpetas no existen).

Si algo no coincide, pará y reportá.

## PASO 1 — `shared/utils/movimiento-fin.util.ts`: etiquetas, filtros y anulación

Archivo: `src/app/shared/utils/movimiento-fin.util.ts`

### 1a — imports

BUSCAR:
```ts
import {
  ConceptoMovimientoFin, EntidadMovimientoFin, ImputacionFin, MedioMovimientoFin, MovimientoFin,
  OrigenImputacionFin, TipoEntidadFin, TipoMedioFin,
} from 'src/app/interfaces/movimiento-fin';
import { esCero, redondear2, totalMedios, TOLERANCIA_IMPORTE } from 'src/app/shared/utils/finanzas.util';
```

REEMPLAZAR:
```ts
import {
  ConceptoMovimientoFin, EntidadMovimientoFin, EstadoMovimientoFin, ImpuestoRetencionFin, ImputacionFin,
  MedioMovimientoFin, MotivoAjusteFin, MovimientoFin, OrigenImputacionFin, TipoEntidadFin, TipoMedioFin,
  TipoMovimientoFin,
} from 'src/app/interfaces/movimiento-fin';
import {
  AcumuladoFinanciero, diasEntre, esCero, redondear2, totalMedios, TOLERANCIA_IMPORTE,
} from 'src/app/shared/utils/finanzas.util';
```

### 1b — agregar al final del archivo

BUSCAR (final de `armarMovimiento`, últimas líneas del archivo):
```ts
    anulacion: null,
    usuario: p.usuario,
  };
}
```

REEMPLAZAR:
```ts
    anulacion: null,
    usuario: p.usuario,
  };
}

// ---------------------------------------------------------------------------
// Etiquetas (F4)
// ---------------------------------------------------------------------------

export const ETIQUETA_TIPO_MOVIMIENTO: Readonly<Record<TipoMovimientoFin, string>> = {
  cobro: 'Cobro',
  pago: 'Pago',
  ajuste: 'Ajuste',
};

export const ETIQUETA_CONCEPTO: Readonly<Record<ConceptoMovimientoFin, string>> = {
  normal: 'Comprobantes',
  anticipo: 'Anticipo',
  prestamo: 'Préstamo',
};

export const ETIQUETA_IMPUESTO: Readonly<Record<ImpuestoRetencionFin, string>> = {
  ganancias: 'Ganancias',
  iibb: 'Ingresos Brutos',
  iva: 'IVA',
  suss: 'SUSS',
};

export const ETIQUETA_MOTIVO_AJUSTE: Readonly<Record<MotivoAjusteFin, string>> = {
  incobrable: 'Incobrable',
  bonificacion: 'Bonificación',
  redondeo: 'Redondeo',
  apertura: 'Saldo de apertura',
  otro: 'Otro',
};

export const ETIQUETA_ORIGEN_IMPUTACION: Readonly<Record<OrigenImputacionFin, string>> = {
  directa: 'Al registrar',
  saldo: 'Imputación de saldo',
  compensacion: 'Compensación en liquidación',
};

/** "Transferencia + Retención": tipos distintos, en el orden en que aparecen. */
export function resumenMedios(medios: MedioMovimientoFin[]): string {
  const tipos = [...new Set(medios.map(m => m.tipo))];
  return tipos.length === 0 ? '—' : tipos.map(t => ETIQUETA_MEDIO[t] ?? t).join(' + ');
}

// ---------------------------------------------------------------------------
// Historial (F4): rango, filtros y totales
// ---------------------------------------------------------------------------

/** Filtros de la pestaña Movimientos. `desde`/`hasta` definen la consulta
 *  (rango sobre `fecha`); tipo, estado y texto se aplican en memoria. */
export interface FiltrosMovimientosFin {
  desde: string;                          // 'YYYY-MM-DD'
  hasta: string;                          // 'YYYY-MM-DD'
  tipo: TipoMovimientoFin | 'todos';
  estado: EstadoMovimientoFin | 'todos';
  texto: string;                          // número, razón social o CUIT
}

/** Tope del rango de la consulta (un listener sobre un año de movimientos). */
export const MAX_DIAS_RANGO_MOVIMIENTOS = 366;

/** Rango por defecto: desde el día 1 de dos meses atrás hasta hoy
 *  (hoy = '2026-10-05' → '2026-08-01' … '2026-10-05'). */
export function rangoInicialMovimientos(hoy: string): { desde: string; hasta: string } {
  const [a, m] = hoy.split('-').map(Number);
  const meses = a * 12 + (m - 1) - 2;
  const anio = Math.floor(meses / 12);
  const mes = (meses % 12) + 1;
  return { desde: `${anio}-${String(mes).padStart(2, '0')}-01`, hasta: hoy };
}

/** Mensaje de error del rango, o null si es válido. */
export function validarRangoMovimientos(desde: string, hasta: string): string | null {
  if (!FORMATO_FECHA.test(desde ?? '') || !FORMATO_FECHA.test(hasta ?? '')) return 'Elegí las dos fechas del rango.';
  if (desde > hasta) return 'La fecha "desde" es posterior a la fecha "hasta".';
  if (diasEntre(desde, hasta) > MAX_DIAS_RANGO_MOVIMIENTOS) {
    return `El rango no puede superar ${MAX_DIAS_RANGO_MOVIMIENTOS} días.`;
  }
  return null;
}

type MovimientoFiltrable = Pick<MovimientoFin, 'tipo' | 'estado' | 'numero' | 'entidad'>;

/** Filtros en memoria (tipo, estado, texto). No toca el rango. */
export function filtrarMovimientos<M extends MovimientoFiltrable>(
  movimientos: M[],
  f: Pick<FiltrosMovimientosFin, 'tipo' | 'estado' | 'texto'>,
): M[] {
  const texto = (f.texto ?? '').trim().toLowerCase();
  return movimientos.filter(m =>
    (f.tipo === 'todos' || m.tipo === f.tipo) &&
    (f.estado === 'todos' || m.estado === f.estado) &&
    (!texto ||
      m.numero.toLowerCase().includes(texto) ||
      m.entidad.razonSocial.toLowerCase().includes(texto) ||
      String(m.entidad.cuit).includes(texto)));
}

export interface TotalesMovimientos {
  cobros: number;
  cantidadCobros: number;
  pagos: number;
  cantidadPagos: number;
  sinImputar: number;                     // Σ sinImputar de cobros/pagos vigentes
  anulados: number;                       // cantidad
}

/** Totales de las tarjetas. Solo suman los VIGENTES; los anulados se
 *  cuentan aparte. Los ajustes no suman (llegan en F7). */
export function totalizarMovimientos(
  movimientos: Pick<MovimientoFin, 'tipo' | 'estado' | 'total' | 'sinImputar'>[],
): TotalesMovimientos {
  const t: TotalesMovimientos = { cobros: 0, cantidadCobros: 0, pagos: 0, cantidadPagos: 0, sinImputar: 0, anulados: 0 };
  for (const m of movimientos) {
    if (m.estado === 'anulado') {
      t.anulados++;
      continue;
    }
    if (m.tipo === 'cobro') {
      t.cobros += m.total;
      t.cantidadCobros++;
    } else if (m.tipo === 'pago') {
      t.pagos += m.total;
      t.cantidadPagos++;
    }
    if (m.tipo !== 'ajuste') t.sinImputar += m.sinImputar;
  }
  return { ...t, cobros: redondear2(t.cobros), pagos: redondear2(t.pagos), sinImputar: redondear2(t.sinImputar) };
}

// ---------------------------------------------------------------------------
// Anulación (F4)
// ---------------------------------------------------------------------------

/** Acumulado de ValoresFinancierosLiq que mueve cada tipo de movimiento:
 *  cobro/pago → totalCobrado (para chofer/proveedor significa "pagado");
 *  ajuste → totalAjustado. */
export function acumuladoDeMovimiento(tipo: TipoMovimientoFin): AcumuladoFinanciero {
  return tipo === 'ajuste' ? 'totalAjustado' : 'totalCobrado';
}

/** Reglas para anular, sobre el movimiento RELEÍDO en la transacción.
 *  Devuelve el mensaje de error o null. Un movimiento compensado en una
 *  liquidación (FC1) no se anula: primero se quita la compensación. */
export function validarAnulable(mov: Pick<MovimientoFin, 'estado' | 'numero' | 'imputaciones'>): string | null {
  if (mov.estado !== 'vigente') return `El movimiento ${mov.numero} ya está anulado.`;
  if (mov.imputaciones.some(i => i.origen === 'compensacion')) {
    return `El movimiento ${mov.numero} está compensado en una liquidación: primero quitá la compensación o revertí la liquidación.`;
  }
  return null;
}

/** Lo que vuelve a cada documento al anular. */
export interface ReversionDocumento {
  idDocumento: string;
  numeroDocumento: string;
  importe: number;                        // > 0: se RESTA del acumulado del documento
}

/** Importes a devolver, sumados por documento (un mismo informe puede tener
 *  varias imputaciones del movimiento: la directa y las de saldo
 *  posteriores). Orden de aparición. Hoy todo documento es un InformeLiq
 *  (TipoDocumentoImputable); al sumar tipos, el servicio decide por tipo. */
export function reversionesDe(imputaciones: ImputacionFin[]): ReversionDocumento[] {
  const porDocumento = new Map<string, ReversionDocumento>();
  for (const i of imputaciones) {
    const r = porDocumento.get(i.documento.id);
    if (r) {
      r.importe = redondear2(r.importe + i.importe);
    } else {
      porDocumento.set(i.documento.id, {
        idDocumento: i.documento.id,
        numeroDocumento: i.numeroDocumento,
        importe: redondear2(i.importe),
      });
    }
  }
  return [...porDocumento.values()].filter(r => !esCero(r.importe));
}
```

## PASO 2 — `FinanzasConsultaService`: filtros y consulta de Movimientos

Archivo: `src/app/servicios/finanzas-nueva/finanzas-consulta.service.ts`

### 2a

BUSCAR:
```ts
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
```

REEMPLAZAR:
```ts
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
```

### 2b

BUSCAR:
```ts
import { CuentaEntidadFin, LadoCuenta, armarCuentas } from 'src/app/shared/utils/cuentas-finanzas.util';
```

REEMPLAZAR:
```ts
import { CuentaEntidadFin, LadoCuenta, armarCuentas } from 'src/app/shared/utils/cuentas-finanzas.util';
import { FiltrosMovimientosFin, rangoInicialMovimientos } from 'src/app/shared/utils/movimiento-fin.util';
```

### 2c

BUSCAR:
```ts
  filtrosCuentas: { lado: LadoCuenta; texto: string } = { lado: 'cobrar', texto: '' };
```

REEMPLAZAR:
```ts
  filtrosCuentas: { lado: LadoCuenta; texto: string } = { lado: 'cobrar', texto: '' };

  /** Filtros de la pestaña Movimientos, recordados durante la sesión. Rango
   *  inicial: desde el día 1 de dos meses atrás hasta hoy. */
  filtrosMovimientos: FiltrosMovimientosFin = {
    ...rangoInicialMovimientos(toISODateString(new Date())),
    tipo: 'todos',
    estado: 'todos',
    texto: '',
  };
```

### 2d

BUSCAR:
```ts
  /** En vivo: una cuenta por entidad (ver armarCuentas).
```

REEMPLAZAR:
```ts
  /** En vivo: movimientos con `fecha` en [desde, hasta] ('YYYY-MM-DD'),
   *  vigentes y anulados. Rango sobre un solo campo → índice simple
   *  automático; orden y demás filtros en memoria (pestaña Movimientos). */
  observarMovimientosPorFecha(desde: string, hasta: string): Observable<ConId<MovimientoFin>[]> {
    return this.db.observarPorRango<MovimientoFin>(this.COL_MOV, 'fecha', desde, hasta).pipe(
      map(items => items.map(m => ({ ...m, idMovimiento: m.id }))),
    );
  }

  /** En vivo: una cuenta por entidad (ver armarCuentas).
```

## PASO 3 — `MovimientoFinService.anular`

Archivo: `src/app/servicios/finanzas-nueva/movimiento-fin.service.ts`

### 3a — imports

BUSCAR:
```ts
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { ImputacionFin } from 'src/app/interfaces/movimiento-fin';
```

REEMPLAZAR:
```ts
import { Anulacion } from 'src/app/interfaces/anulacion';
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { ImputacionFin, MovimientoFin } from 'src/app/interfaces/movimiento-fin';
```

### 3b

BUSCAR:
```ts
import {
  DatosMovimientoFin, armarImputacion, armarMovimiento, normalizarDatosMovimiento,
  validarDatosMovimiento, validarDocumentoImputable,
} from 'src/app/shared/utils/movimiento-fin.util';
```

REEMPLAZAR:
```ts
import {
  DatosMovimientoFin, ETIQUETA_TIPO_MOVIMIENTO, acumuladoDeMovimiento, armarImputacion, armarMovimiento,
  normalizarDatosMovimiento, reversionesDe, validarAnulable, validarDatosMovimiento, validarDocumentoImputable,
} from 'src/app/shared/utils/movimiento-fin.util';
```

### 3c — método nuevo al final de la clase

BUSCAR (final de `registrar` y cierre de la clase, últimas líneas del archivo):
```ts
      return { exito: false, mensaje: `No se pudo registrar el ${etiqueta.toLowerCase()}: ${e?.message ?? e}` };
    }
  }
}
```

REEMPLAZAR:
```ts
      return { exito: false, mensaje: `No se pudo registrar el ${etiqueta.toLowerCase()}: ${e?.message ?? e}` };
    }
  }

  /** Anula un movimiento ENTERO (F10: no se edita; motivo obligatorio).
   *  Transacción: relee el movimiento (vigente, sin compensaciones) y cada
   *  InformeLiq imputado; a cada informe le devuelve lo que este movimiento
   *  le imputó (lo resta del acumulado — totalCobrado; totalAjustado en un
   *  ajuste — y recalcula saldo y estadoFinanciero); marca el movimiento
   *  'anulado' con quién, cuándo y por qué (conserva número, medios e
   *  imputaciones como registro) y agrega un log ANULAR con diff.
   *  El saldo sin imputar de un movimiento anulado deja de contar: las
   *  consultas filtran por estado 'vigente'. */
  async anular(idMovimiento: string, motivo: string): Promise<Resultado<void>> {
    const motivoLimpio = (motivo ?? '').trim();
    if (!motivoLimpio) return { exito: false, mensaje: 'Falta el motivo de la anulación.' };

    // Afuera del callback: puede reintentarse y tiene que ser puro.
    const usuario = this.usuarioSesion.getUsuarioActual()?.email ?? 'Desconocido';
    const fecha = new Date().toISOString();

    try {
      const r = await this.db.commitEnTransaccion<{ numero: string; comprobantes: number }>(async (tx) => {
        const mov = await this.db.leerEnTransaccion<MovimientoFin>(tx, this.COLECCION, idMovimiento);
        if (!mov) throw new Error(`No existe el movimiento ${idMovimiento}.`);
        const error = validarAnulable(mov);
        if (error) throw new Error(error);

        const reversiones = reversionesDe(mov.imputaciones ?? []);
        const leidos = await Promise.all(reversiones.map(async rev => ({
          rev,
          liq: await this.db.leerEnTransaccion<InformeLiqNuevo>(tx, this.COL_LIQ, rev.idDocumento),
        })));
        // — fin de lecturas —

        const escrituras: EscrituraBatch[] = [];
        const acumulado = acumuladoDeMovimiento(mov.tipo);
        for (const { rev, liq } of leidos) {
          if (!liq) throw new Error(`No existe el informe de liquidación ${rev.numeroDocumento}. Anulación abortada.`);
          if (liq.estado !== 'facturado') {
            throw new Error(
              `El informe ${rev.numeroDocumento} está en estado '${liq.estado}' (se esperaba 'facturado'). Anulación abortada.`,
            );
          }
          const vfAntes = normalizarValoresFinancieros(liq.valoresFinancieros, liq.valores.total);
          const vf = aplicarImporte(vfAntes, acumulado, -rev.importe);   // tira Error si el acumulado quedaría negativo
          this.informeLiqServ.agregarEscrituraInformeLiqParcial(escrituras, rev.idDocumento, {
            valoresFinancieros: vf,
            estadoFinanciero: estadoFinancieroDe(vf, liq.estadoFinanciero),
          });
        }

        const anulacion: Anulacion = { motivo: motivoLimpio, usuario, fecha };
        escrituras.push({
          coleccion: this.COLECCION, id: idMovimiento, modo: 'actualizar',
          data: { estado: 'anulado', anulacion },
        });

        await this.logRegistro.agregarAlBatch(
          escrituras, 'ANULAR', this.COLECCION, idMovimiento,
          `Anulación del ${ETIQUETA_TIPO_MOVIMIENTO[mov.tipo].toLowerCase()} ${mov.numero} — ` +
          `${mov.entidad.tipo} ${mov.entidad.razonSocial} — $ ${mov.total.toFixed(2)} — motivo: ${motivoLimpio} — ` +
          `${reversiones.length} comprobante(s) recuperan saldo`,
          mov,
        );

        return { escrituras, resultado: { numero: mov.numero, comprobantes: reversiones.length } };
      });

      return {
        exito: true,
        mensaje: `Movimiento ${r.numero} anulado.` +
          (r.comprobantes > 0 ? ` ${r.comprobantes} comprobante(s) recuperaron su saldo.` : ''),
      };
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'ANULAR', this.COLECCION, idMovimiento, `Error al anular el movimiento: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `No se pudo anular: ${e?.message ?? e}` };
    }
  }
}
```

## PASO 4 — Modal de detalle (archivos nuevos)

Carpeta: `src/app/raiz/finanzas-nueva/modales/detalle-movimiento/`

### 4a — `detalle-movimiento.component.ts`

```ts
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ConId } from 'src/app/interfaces/conId';
import { MedioMovimientoFin, MovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import {
  ETIQUETA_CONCEPTO, ETIQUETA_IMPUESTO, ETIQUETA_MEDIO, ETIQUETA_MOTIVO_AJUSTE, ETIQUETA_ORIGEN_IMPUTACION,
  ETIQUETA_TIPO_MOVIMIENTO,
} from 'src/app/shared/utils/movimiento-fin.util';

/** Finanzas — detalle de un movimiento (solo lectura): datos generales,
 *  medios, imputaciones y anulación. Muestra el movimiento tal como llegó
 *  (snapshot de la fila, no escucha cambios). El botón Anular cierra el
 *  modal con 'anular' y el que lo abrió sigue el flujo (motivo + servicio).
 *  Imprimir (recibo / orden de pago) llega en F8. */
@Component({
  selector: 'app-detalle-movimiento',
  standalone: false,
  templateUrl: './detalle-movimiento.component.html',
  styleUrl: './detalle-movimiento.component.scss',
})
export class DetalleMovimientoComponent {

  @Input() movimiento!: ConId<MovimientoFin>;

  readonly etiquetaTipo = ETIQUETA_TIPO_MOVIMIENTO;
  readonly etiquetaConcepto = ETIQUETA_CONCEPTO;
  readonly etiquetaMedio = ETIQUETA_MEDIO;
  readonly etiquetaMotivoAjuste = ETIQUETA_MOTIVO_AJUSTE;
  readonly etiquetaOrigen = ETIQUETA_ORIGEN_IMPUTACION;
  readonly fechaLegible = fechaComprobanteLegible;

  constructor(public activeModal: NgbActiveModal) {}

  get m(): ConId<MovimientoFin> {
    return this.movimiento;
  }

  get compensado(): boolean {
    return this.movimiento.imputaciones.some(i => i.origen === 'compensacion');
  }

  get puedeAnular(): boolean {
    return this.movimiento.estado === 'vigente' && !this.compensado;
  }

  /** Etiqueta de lo no imputado según el lado: saldo a favor del cliente o
   *  anticipo/préstamo pendiente de compensar. */
  get etiquetaSinImputar(): string {
    if (this.movimiento.tipo === 'cobro') return 'Saldo a favor del cliente';
    return this.movimiento.concepto === 'prestamo' ? 'Préstamo pendiente' : 'Anticipo / saldo pendiente';
  }

  /** fechaRegistro y anulacion.fecha son ISO con hora (instante): se
   *  muestran en hora local. Las fechas de negocio 'YYYY-MM-DD' van con
   *  fechaLegible (nunca new Date sobre ellas). */
  fechaHora(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString('es-AR');
  }

  detalleMedio(md: MedioMovimientoFin): string {
    if (md.tipo === 'retencion' && md.retencion) {
      return [
        ETIQUETA_IMPUESTO[md.retencion.impuesto] ?? md.retencion.impuesto,
        md.retencion.jurisdiccion,
        `Certificado ${md.retencion.certificado}`,
      ].filter(Boolean).join(' · ');
    }
    const partes = [
      md.banco,
      md.referencia ? `N° ${md.referencia}` : null,
      md.fechaCobro ? `Cobro ${fechaComprobanteLegible(md.fechaCobro)}` : null,
    ].filter(Boolean);
    return partes.length > 0 ? partes.join(' · ') : '—';
  }

  anular(): void {
    this.activeModal.close('anular');
  }

  cerrar(): void {
    this.activeModal.dismiss();
  }
}
```

### 4b — `detalle-movimiento.component.html`

```html
<div class="modal-header">
  <div>
    <h4 class="modal-title">
      {{ etiquetaTipo[m.tipo] }} {{ m.numero }}
      @if (m.estado === 'anulado') {
        <span class="badge bg-danger ms-2">Anulado</span>
      }
    </h4>
    <div class="text-muted">
      <span class="text-capitalize">{{ m.entidad.tipo }}</span> {{ m.entidad.razonSocial }} — CUIT {{ m.entidad.cuit }}
    </div>
  </div>
  <button type="button" class="btn-close" (click)="cerrar()"></button>
</div>

<div class="modal-body">
  @if (m.anulacion) {
    <div class="alert alert-danger py-2">
      <b>Anulado</b> el {{ fechaHora(m.anulacion.fecha) }} por {{ m.anulacion.usuario }}.
      Motivo: {{ m.anulacion.motivo }}
    </div>
  }

  <div class="row g-2 mb-3">
    <div class="col-md-3">
      <div class="dato-label">Fecha</div>
      <div>{{ fechaLegible(m.fecha) }}</div>
    </div>
    <div class="col-md-3">
      <div class="dato-label">{{ m.tipo === 'ajuste' ? 'Motivo del ajuste' : 'Concepto' }}</div>
      <div>{{ m.tipo === 'ajuste' ? (m.motivoAjuste ? etiquetaMotivoAjuste[m.motivoAjuste] : '—') : etiquetaConcepto[m.concepto] }}</div>
    </div>
    <div class="col-md-6">
      <div class="dato-label">Registrado</div>
      <div>{{ fechaHora(m.fechaRegistro) }} — {{ m.usuario }}</div>
    </div>
  </div>

  @if (m.medios.length > 0) {
    <h6>Medios</h6>
    <table class="table table-sm align-middle">
      <thead>
        <tr>
          <th style="width: 11rem;">Tipo</th>
          <th style="width: 10rem;" class="text-end">Importe</th>
          <th>Datos</th>
        </tr>
      </thead>
      <tbody>
        @for (md of m.medios; track $index) {
          <tr>
            <td>{{ etiquetaMedio[md.tipo] }}</td>
            <td class="text-end col-importe">{{ md.importe | formatearValor: '$' }}</td>
            <td>{{ detalleMedio(md) }}</td>
          </tr>
        }
      </tbody>
    </table>
  }

  <h6 class="mt-3">Imputaciones</h6>
  @if (m.imputaciones.length === 0) {
    <div class="text-muted mb-3">Sin imputaciones.</div>
  } @else {
    <table class="table table-sm table-striped align-middle">
      <thead>
        <tr>
          <th>Comprobante</th>
          <th>Período</th>
          <th>Factura</th>
          <th class="text-end">Total</th>
          <th class="text-end">Saldo antes</th>
          <th class="text-end">Imputado</th>
          <th class="text-center">Fecha</th>
          <th>Origen</th>
        </tr>
      </thead>
      <tbody>
        @for (i of m.imputaciones; track $index) {
          <tr>
            <td>{{ i.numeroDocumento }}</td>
            <td>{{ i.periodoClave ?? '—' }}</td>
            <td>{{ i.fechaFactura ? fechaLegible(i.fechaFactura) : '—' }}</td>
            <td class="text-end col-importe">{{ i.totalDocumento | formatearValor: '$' }}</td>
            <td class="text-end col-importe">{{ i.saldoAntes | formatearValor: '$' }}</td>
            <td class="text-end col-importe fw-bold">{{ i.importe | formatearValor: '$' }}</td>
            <td class="text-center">{{ fechaLegible(i.fecha) }}</td>
            <td>{{ etiquetaOrigen[i.origen] }}</td>
          </tr>
        }
      </tbody>
    </table>
  }

  <div class="row g-2 mt-2">
    <div class="col-md-8">
      <div class="dato-label">Observaciones</div>
      <div class="observaciones">{{ m.observaciones || '—' }}</div>
    </div>
    <div class="col-md-4">
      <div class="resumen p-2 rounded">
        <div class="d-flex justify-content-between"><span>Total</span><span class="col-importe">{{ m.total | formatearValor: '$' }}</span></div>
        <div class="d-flex justify-content-between"><span>Imputado</span><span class="col-importe">{{ m.totalImputado | formatearValor: '$' }}</span></div>
        @if (m.tipo !== 'ajuste') {
          <div class="d-flex justify-content-between fw-bold">
            <span>{{ etiquetaSinImputar }}</span>
            <span class="col-importe">{{ m.sinImputar | formatearValor: '$' }}</span>
          </div>
        }
      </div>
    </div>
  </div>

  @if (compensado && m.estado === 'vigente') {
    <div class="alert alert-info py-2 mt-3 mb-0">
      Este movimiento está compensado en una liquidación: para anularlo, primero quitá la compensación o revertí la liquidación.
    </div>
  }
</div>

<div class="modal-footer">
  @if (puedeAnular) {
    <button *appPermiso="'finanzas.anular'" type="button" class="btn btn-outline-danger me-auto" (click)="anular()">Anular</button>
  }
  <button type="button" class="btn btn-outline-secondary" (click)="cerrar()">Cerrar</button>
</div>
```

### 4c — `detalle-movimiento.component.scss`

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

.observaciones {
  white-space: pre-wrap;
}

th,
td {
  font-size: 1.2rem;
}
```

## PASO 5 — Pestaña Movimientos (archivos nuevos)

Carpeta: `src/app/raiz/finanzas-nueva/movimientos/`

### 5a — `finanzas-movimientos.component.ts`

```ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject, Subject, switchMap, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { EstadoMovimientoFin, MovimientoFin, TipoMovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { AccionListado, ColumnaListado, EventoAccionListado, OrdenListado } from 'src/app/interfaces/tabla-listado';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { FinanzasConsultaService } from 'src/app/servicios/finanzas-nueva/finanzas-consulta.service';
import { MovimientoFinService } from 'src/app/servicios/finanzas-nueva/movimiento-fin.service';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import {
  ETIQUETA_CONCEPTO, ETIQUETA_MOTIVO_AJUSTE, ETIQUETA_TIPO_MOVIMIENTO, FiltrosMovimientosFin,
  TotalesMovimientos, filtrarMovimientos, resumenMedios, totalizarMovimientos, validarRangoMovimientos,
} from 'src/app/shared/utils/movimiento-fin.util';
import { DetalleMovimientoComponent } from '../modales/detalle-movimiento/detalle-movimiento.component';

type Fila = ConId<MovimientoFin>;

/** Finanzas → Movimientos: historial de cobros, pagos y ajustes
 *  (`movimientosFin`), en vivo. La consulta es por rango de `fecha` (índice
 *  simple); tipo, estado y texto se filtran en memoria. Filtros recordados
 *  en la sesión (FinanzasConsultaService.filtrosMovimientos).
 *  Acciones: ver (DetalleMovimientoComponent) y anular
 *  (MovimientoFinService.anular, motivo obligatorio, finanzas.anular).
 *  Orden inicial: fecha descendente (es un historial, no un listado de
 *  entidades). Imputar saldo llega en F4b. */
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

  readonly acciones: AccionListado<Fila>[] = [
    { id: 'ver', label: 'Ver', clase: 'btn-outline-primary' },
    {
      id: 'anular', label: 'Anular', clase: 'btn-outline-danger', permiso: 'finanzas.anular',
      visible: m => m.estado === 'vigente',
      deshabilitada: m => m.imputaciones.some(i => i.origen === 'compensacion'),
    },
  ];

  readonly columnas: ColumnaListado<Fila>[] = this.armarColumnas();

  private rango$!: BehaviorSubject<{ desde: string; hasta: string }>;
  private destroy$ = new Subject<void>();

  constructor(
    private consulta: FinanzasConsultaService,
    private movimientoServ: MovimientoFinService,
    private modalService: NgbModal,
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
    if (ev.id === 'ver') this.verDetalle(ev.item);
    else if (ev.id === 'anular') this.anular(ev.item);
  }

  /** Detalle en modal. Si se cierra con 'anular', sigue el mismo flujo que
   *  la acción de la fila. */
  verDetalle(m: Fila): void {
    const modalRef = this.modalService.open(DetalleMovimientoComponent, {
      size: 'xl', centered: true, scrollable: true,
    });
    modalRef.componentInstance.movimiento = m;
    modalRef.result
      .then(resultado => {
        if (resultado === 'anular') this.anular(m);
      })
      .catch(() => {});
  }

  /** Pide el motivo (obligatorio) y delega en MovimientoFinService.anular,
   *  que revalida todo en su transacción. Sin refresco manual: el listener
   *  trae el cambio de estado. */
  async anular(m: Fila): Promise<void> {
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

    this.procesando = true;
    try {
      const res = await this.movimientoServ.anular(m.idMovimiento, r.value as string);
      Swal.fire({ icon: res.exito ? 'success' : 'error', text: res.mensaje });
    } finally {
      this.procesando = false;
    }
  }

  private importe(valor: number): string {
    return valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private armarColumnas(): ColumnaListado<Fila>[] {
    const tachado = (m: Fila) => (m.estado === 'anulado' ? 'text-decoration-line-through text-muted' : '');
    return [
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
  }
}
```

### 5b — `finanzas-movimientos.component.html`

```html
<div class="d-flex flex-wrap gap-2 align-items-end mt-3 mb-3">
  <div>
    <label class="form-label mb-0">Desde</label>
    <input type="date" class="form-control" [ngModel]="desde" (ngModelChange)="desde = $event; onRango()" />
  </div>
  <div>
    <label class="form-label mb-0">Hasta</label>
    <input type="date" class="form-control" [ngModel]="hasta" (ngModelChange)="hasta = $event; onRango()" />
  </div>
  <div>
    <label class="form-label mb-0">Tipo</label>
    <select class="form-select" [ngModel]="filtros.tipo" (ngModelChange)="onTipo($event)">
      <option value="todos">Todos</option>
      <option value="cobro">Cobros</option>
      <option value="pago">Pagos</option>
      <option value="ajuste">Ajustes</option>
    </select>
  </div>
  <div>
    <label class="form-label mb-0">Estado</label>
    <select class="form-select" [ngModel]="filtros.estado" (ngModelChange)="onEstado($event)">
      <option value="todos">Todos</option>
      <option value="vigente">Vigentes</option>
      <option value="anulado">Anulados</option>
    </select>
  </div>
  <div class="buscador">
    <label class="form-label mb-0">Buscar</label>
    <input
      class="form-control"
      type="text"
      [ngModel]="filtros.texto"
      (ngModelChange)="onTexto($event)"
      placeholder="Número, nombre o CUIT"
    />
  </div>
  <span class="ms-auto text-muted">{{ filtrados.length }} movimiento(s)</span>
</div>

@if (errorRango) {
  <div class="alert alert-warning py-2">{{ errorRango }} Se sigue mostrando el rango anterior.</div>
}
@if (error) {
  <div class="alert alert-danger">{{ error }}</div>
}

<div class="row g-3 mb-3">
  <div class="col-6 col-lg">
    <div class="card tarjeta h-100">
      <div class="card-body">
        <div class="tarjeta-label">Cobros ({{ totales.cantidadCobros }})</div>
        <div class="tarjeta-valor">{{ totales.cobros | formatearValor: '$' }}</div>
      </div>
    </div>
  </div>
  <div class="col-6 col-lg">
    <div class="card tarjeta h-100">
      <div class="card-body">
        <div class="tarjeta-label">Pagos ({{ totales.cantidadPagos }})</div>
        <div class="tarjeta-valor">{{ totales.pagos | formatearValor: '$' }}</div>
      </div>
    </div>
  </div>
  <div class="col-6 col-lg">
    <div class="card tarjeta h-100">
      <div class="card-body">
        <div class="tarjeta-label">Sin imputar (saldo a favor / anticipos)</div>
        <div class="tarjeta-valor" [class.text-warning]="totales.sinImputar > 0">{{ totales.sinImputar | formatearValor: '$' }}</div>
      </div>
    </div>
  </div>
  <div class="col-6 col-lg">
    <div class="card tarjeta tarjeta-anulados h-100">
      <div class="card-body">
        <div class="tarjeta-label">Anulados</div>
        <div class="tarjeta-valor">{{ totales.anulados }}</div>
      </div>
    </div>
  </div>
</div>

<app-tabla-listado
  [items]="filtrados"
  [columnas]="columnas"
  [ordenInicial]="ordenInicial"
  [cargando]="cargando"
  [bloqueada]="procesando"
  [trackKey]="trackMovimiento"
  [acciones]="acciones"
  (accion)="onAccion($event)"
  mensajeVacio="No hay movimientos con estos filtros."
></app-tabla-listado>

<p class="text-muted small mt-2">
  <b>Fecha:</b> día en que se recibió o entregó el dinero.
  <b>Imputado:</b> parte aplicada a comprobantes.
  <b>Sin imputar:</b> saldo a favor del cliente o anticipo/préstamo entregado, pendiente de aplicar.
  Las tarjetas suman solo los movimientos vigentes de la tabla filtrada.
  Un movimiento compensado en una liquidación no se puede anular.
</p>

@if (procesando) {
  <app-spinner></app-spinner>
}
```

### 5c — `finanzas-movimientos.component.scss`

```scss
.buscador {
  min-width: 16rem;
  max-width: 22rem;
  flex: 1 1 16rem;
}

.tarjeta {
  border-left: 4px solid #0d6efd;
}

.tarjeta-anulados {
  border-left-color: #dc3545;
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
```

## PASO 6 — Módulo, ruta y pestaña

### 6a — `src/app/raiz/finanzas-nueva/finanzas-nueva.module.ts`

BUSCAR:
```ts
import { RegistrarMovimientoComponent } from './modales/registrar-movimiento/registrar-movimiento.component';
```

REEMPLAZAR:
```ts
import { RegistrarMovimientoComponent } from './modales/registrar-movimiento/registrar-movimiento.component';
import { FinanzasMovimientosComponent } from './movimientos/finanzas-movimientos.component';
import { DetalleMovimientoComponent } from './modales/detalle-movimiento/detalle-movimiento.component';
```

BUSCAR:
```ts
    RegistrarMovimientoComponent,
  ],
```

REEMPLAZAR:
```ts
    RegistrarMovimientoComponent,
    FinanzasMovimientosComponent,
    DetalleMovimientoComponent,
  ],
```

### 6b — `src/app/raiz/finanzas-nueva/finanzas-nueva-routing.module.ts`

BUSCAR:
```ts
import { FinanzasCuentasComponent } from './cuentas/finanzas-cuentas.component';
```

REEMPLAZAR:
```ts
import { FinanzasCuentasComponent } from './cuentas/finanzas-cuentas.component';
import { FinanzasMovimientosComponent } from './movimientos/finanzas-movimientos.component';
```

BUSCAR:
```ts
      { path: 'cuentas', component: FinanzasCuentasComponent },
```

REEMPLAZAR:
```ts
      { path: 'cuentas', component: FinanzasCuentasComponent },
      { path: 'movimientos', component: FinanzasMovimientosComponent },
```

### 6c — `src/app/raiz/finanzas-nueva/control/finanzas-nueva-control.component.ts`

BUSCAR:
```ts
    { id: 'cuentas', name: 'Cuentas', route: 'finanzasNueva/cuentas' },
```

REEMPLAZAR:
```ts
    { id: 'cuentas', name: 'Cuentas', route: 'finanzasNueva/cuentas' },
    { id: 'movimientos', name: 'Movimientos', route: 'finanzasNueva/movimientos' },
```

## PASO 7 — Cuentas: orden inicial por nombre

Archivo: `src/app/raiz/finanzas-nueva/cuentas/finanzas-cuentas.component.ts`

BUSCAR:
```ts
  readonly ordenInicial: OrdenListado = { key: 'neto', asc: false };
```

REEMPLAZAR:
```ts
  readonly ordenInicial: OrdenListado = { key: 'nombre', asc: true };
```

## PASO 8 — Verificación

```bash
npm run build:demo
grep -rl "ETIQUETA_TIPO_MOVIMIENTO" src/app --include=*.ts | wc -l      # 4 archivos (util, service, movimientos, detalle)
grep -c "async anular(" src/app/servicios/finanzas-nueva/movimiento-fin.service.ts   # 1
grep -c "observarMovimientosPorFecha" src/app/servicios/finanzas-nueva/finanzas-consulta.service.ts   # 1
grep -n "path: 'movimientos'" src/app/raiz/finanzas-nueva/finanzas-nueva-routing.module.ts
grep -n "finanzasNueva/movimientos" src/app/raiz/finanzas-nueva/control/finanzas-nueva-control.component.ts
grep -n "key: 'nombre', asc: true" src/app/raiz/finanzas-nueva/cuentas/finanzas-cuentas.component.ts
git status --short
```

Esperado:

- El build termina sin errores. Los warnings de presupuesto previos no
  cuentan.
- Los conteos coinciden con lo indicado.
- `git status` muestra solo:
  - 7 archivos modificados: util, 2 servicios, módulo, routing, control y
    cuentas.
  - 2 carpetas nuevas: `movimientos/` y `modales/detalle-movimiento/`.

Reportá la salida.

## Pruebas manuales (demo, `ng serve` con environment demo)

Algunas pruebas usan un usuario **admin**: con dev no se escribe log.

1. **Cuentas.** Abre ordenada por nombre A→Z en "A cobrar" y en "A
   pagar". Click en "Neto" sigue ordenando.
2. **Pestaña Movimientos.**
   - Aparece al lado de Cuentas y navega a `/finanzasNueva/movimientos`.
   - Con F5 sigue resaltada.
   - Rango por defecto: del día 1 de dos meses atrás hasta hoy.
   - Se ven los cobros/pagos de las pruebas de F3, del más nuevo al más
     viejo.
3. **Filtros.**
   - Tipo, estado y texto (número `RC-…`, nombre, CUIT) filtran y
     recalculan las tarjetas.
   - Pasar a Cuentas y volver conserva los filtros y el rango.
4. **Rango inválido.**
   - Desde > hasta: aviso amarillo y la tabla sigue con el rango anterior.
   - Un rango de más de 366 días: el mismo aviso.
   - Al corregirlo, consulta de nuevo.
5. **Detalle.** "Ver" en un cobro con varios medios (si hay, con
   retención) muestra:
   - medios con sus datos (banco, N°, impuesto, certificado);
   - imputaciones con saldo antes e importe;
   - totales y quién lo registró.

   En un anticipo: sin imputaciones y "Anticipo / saldo pendiente".
6. **Anular un cobro con comprobantes** (admin). Antes, anotá en Cuentas
   el "Facturado abierto" del cliente.
   - "Anular" sin motivo: no deja seguir.
   - Con motivo: mensaje de éxito; la fila pasa a Anulado (número y total
     tachados) sin refrescar.
   - En Cuentas, el facturado abierto del cliente sube exactamente lo
     imputado.
   - En Firestore (`informesLiq/<id>`): `valoresFinancieros.totalCobrado`
     bajó, `saldo` subió y `estadoFinanciero` es `pendiente` o `parcial`.
   - En `movimientosFin/<id>`: `estado: 'anulado'` y `anulacion` con
     motivo, usuario y fecha.
7. **Anular un anticipo o un pago con saldo sin imputar.** En Cuentas
   bajan "Anticipos" / "Saldo a favor" de esa entidad. En Movimientos, la
   tarjeta "Sin imputar" (estado Todos) ya no lo suma.
8. **Anular desde el detalle.** "Ver" → "Anular" cierra el modal y pide el
   motivo; el resultado es el mismo que desde la fila. En un movimiento
   anulado, ni la fila ni el detalle muestran "Anular", y el detalle
   muestra el bloque rojo con motivo, usuario y fecha.
9. **Log** (admin). En Ajustes → Log aparece ANULAR en `movimientosFin`
   con el detalle (número, entidad, total, motivo, comprobantes) y los
   cambios `estado` / `anulacion`.
10. **Rol demo.** Ve la pestaña, filtra y abre el detalle. No ve "Anular"
    (ni en la fila ni en el modal) ni "Nuevo cobro/pago".
11. **En vivo.** Registrar un cobro desde Cuentas: aparece en Movimientos
    sin refrescar (si su fecha está en el rango).

## Commit (lo hace Nico)

```
feat(finanzas): pestaña Movimientos — historial, detalle y anulación (F4)

- Movimientos: historial en vivo de movimientosFin por rango de fecha
  (índice simple), filtros de tipo/estado/texto en memoria y recordados en
  la sesión, tarjetas de cobros, pagos, sin imputar y anulados.
- Detalle del movimiento (modal): medios, imputaciones, totales, anulación.
- MovimientoFinService.anular: una transacción. Devuelve lo imputado a
  cada InformeLiq (totalCobrado / totalAjustado, saldo, estadoFinanciero),
  marca el movimiento anulado con motivo y agrega log ANULAR con diff.
  Bloqueado si el movimiento está compensado en una liquidación.
- movimiento-fin.util: etiquetas, resumenMedios, rango/filtros/totales del
  historial, acumuladoDeMovimiento, validarAnulable, reversionesDe.
- Cuentas abre ordenada por nombre.
```
````
