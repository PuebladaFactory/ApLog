````
# Instrucción FC1a — Finanzas: compensaciones en la liquidación (modelo y servicio)

## Contexto

Frente Finanzas. Diseño: `claude/diseno-finanzas.md` §13, §15 y §17 (ronda 5:
F33–F35). Un InformeLiq pasa a tener tres niveles:

- **total del servicio** (como hoy);
- **compensaciones**: saldos sin imputar de movimientos de la MISMA entidad
  (anticipos, préstamos, saldos a favor). Cada una apunta a un movimiento
  real;
- **neto** (≥ 0): lo que se paga o se cobra.

FC1 se parte en dos bloques:

- **FC1a (este):** modelo, util puro y servicio. No tiene UI: lo que existe
  hoy tiene que seguir funcionando igual, y los informes nuevos quedan con
  `compensaciones: []` y `valores.neto = valores.total`.
- **FC1b (siguiente):** UI para elegir compensaciones (modal, Liquidación
  nueva, Detalle) y aviso en Ajustes.

### Reglas del contrato

- **Borrador:** las compensaciones son una propuesta y no tocan los
  movimientos. Al guardar se validan contra los movimientos sin reservar
  (F34): que exista, esté vigente, sea de la entidad y alcance el
  disponible.
- **Emitir** (directo o desde un borrador): en la misma transacción se
  revalidan y se APLICAN:
  - en el informe: `valoresFinancieros.totalCompensado` (el saldo baja al
    neto);
  - en cada movimiento: una imputación con `origen: 'compensacion'`, fecha
    de emisión, `fechaFactura: null`; bajan `sinImputar` y sube
    `totalImputado`.

  Si otro informe ya usó el saldo, la emisión se frena con un mensaje
  claro: gana el primero que se emite.
- **Editar un emitido** (F29): `editarDatos` pasa a ser UNA transacción
  (`commitEnTransaccion`). Si cambian las compensaciones, cada movimiento
  afectado queda con la nueva compensación, o sin ella si se quitó. El
  disponible de un movimiento para ESE informe es lo sin imputar más lo que
  ya le aplicó. De paso se cierra la ventana de carrera que tenía
  `editarDatos` al leer fuera de la transacción.
- **Neto ≥ 0** (F30): se valida al crear, al emitir, en `editarDatos`
  (también cuando solo cambian los ajustes) y en `editarInformeOp`.
- **Revertir un emitido:** en la misma transacción se LIBERAN las
  compensaciones: cada movimiento pierde la imputación a este informe. Las
  compensaciones quedan en el informe revertido como historia.
- **Anular un movimiento compensado:** ya está bloqueado desde F4
  (`validarAnulable`). Desvincular la factura no cambia nada.
- **Docs anteriores a FC1:** no tienen `compensaciones` ni
  `valores.totalCompensaciones` ni `valores.neto`. Por eso los campos nuevos
  son OPCIONALES y se leen con `compensacionesDe` / `netoDe`. No hay
  migración: `recalcularTotal` completa `totalCompensaciones` y `neto` en
  la primera edición.

### Dueños de las escrituras

Las escrituras sobre `movimientosFin` las arma un util PURO
(`shared/utils/compensacion.util.ts`), y `InformeLiqService` las agrega a
su propia transacción con `escrituraMovimientoParcial`.
`InformeLiqService` NO inyecta `MovimientoFinService`: ese servicio ya
inyecta `InformeLiqService` y se armaría una dependencia circular.

### Presupuesto y permisos

- Cada compensación agrega 1 lectura y 1 escritura (tope:
  `MAX_COMPENSACIONES = 20`). Entra en el límite de 500.
- Reglas: Liquidación ya mapea al módulo 'finanzas' en las reglas, igual
  que `movimientosFin`, así que los mismos roles pueden escribir. NO hay
  deploy.

Ya verificado:

- tsc estricto, con stubs.
- Una simulación en memoria con el servicio real y una base falsa:
  - emitir directo con compensación;
  - borrador sin reserva;
  - errores por disponible insuficiente, por otra entidad y por neto
    negativo;
  - dos borradores sobre el mismo anticipo: gana el primero;
  - editar un emitido subiendo, bajando y quitando compensaciones;
  - descuento que dejaría el neto negativo;
  - revertir libera;
  - invariante `totalImputado + sinImputar = total` en los movimientos.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto BUSCAR no aparece, o aparece más de una vez: pará y reportá,
  sin improvisar.
- Archivos con finales de línea LF.
- Build: `npm run build:demo`.
- No toques CLAUDE.md ni CHANGELOG.
- Tocás tipos (`InformeLiqNuevo`, `ValoresLiq`, `DatosLiquidacion`,
  `CambiosDatosLiq`, `DatosCrearInformeLiq`): los campos nuevos son
  OPCIONALES, así que no debería romper ningún uso. Igual revisá con el
  PASO 0 que no haya literales de esos tipos que necesiten cambios,
  incluidos los `.spec.ts` y los `.html`.

## PASO 0 — Verificación (sin cambios)

Corré y reportá la salida:

```bash
grep -rn "CompensacionLiq\|compensacion\.util\|totalCompensaciones\|aplicarCompensaciones\|valoresFinancierosConCompensado\|leerMovimientosFin" src/
grep -n "async editarDatos(\|async emitirBorrador(\|async revertirEmitido(\|private async crearNuevo(\|private lado(" src/app/servicios/informes-liq/informe-liq.service.ts
grep -rn "recalcularTotal(\|recalcularValoresFinancieros(\|factory.crear(\|\.editarDatos(" src/app --include=*.ts
grep -rln "ValoresLiq\b\|DatosCrearInformeLiq\|CambiosDatosLiq" src/
grep -n "export function acumularImputaciones" src/app/shared/utils/movimiento-fin.util.ts
grep -n "i.origen === 'compensacion'" src/app/shared/utils/movimiento-fin.util.ts
grep -n "'informesLiq': 'finanzas'\|'movimientosFin': 'finanzas'" firestore.rules
```

Esperado:

- El primer grep: nada.
- El segundo: 5 líneas.
- El tercero: solo `informe-liq.service.ts`, `informe-liq-factory.service.ts`
  y `informe-liq-nuevo-detalle.component.ts` (`editarDatos` y la vista
  previa); además, si existe, `liquidacion-nueva.component.ts`
  (`factory.crear`, vista previa).
- El cuarto: listá los archivos. Si aparece alguno fuera de
  `interfaces/informe-liq-nuevo.ts`, `informe-liq-factory.service.ts`,
  `informe-liq.service.ts` y el detalle, mostrá cómo usa el tipo antes de
  seguir.
- `acumularImputaciones`: 1 línea.
- `i.origen === 'compensacion'`: 1 línea (`validarAnulable`).
- Reglas: las 2 líneas. Si el formato es otro, mostrá cómo están mapeadas
  esas dos colecciones.

Si algo no coincide, pará y reportá.

## PASO 1 — `src/app/interfaces/informe-liq-nuevo.ts`

### 1a — campo `compensaciones`

BUSCAR:
```ts
  valores: ValoresLiq;
  descuentos: DescuentoLiq[];
  columnas: string[];               // columnas elegidas para la exportación
```

REEMPLAZAR:
```ts
  valores: ValoresLiq;
  descuentos: DescuentoLiq[];
  // Frente Finanzas (FC1): anticipos / saldos a favor que se descuentan en
  // esta liquidación (total → compensaciones → neto). En borrador son una
  // propuesta (no tocan los movimientos); al emitir se APLICAN (imputación
  // con origen 'compensacion' en cada movimiento + valoresFinancieros.
  // totalCompensado); al revertir se liberan (quedan acá como historia).
  // Opcional: los docs anteriores a FC1 no lo tienen — leer con
  // compensacionesDe (shared/utils/compensacion.util.ts).
  compensaciones?: CompensacionLiq[];
  columnas: string[];               // columnas elegidas para la exportación
```

### 1b — `ValoresLiq` + `CompensacionLiq`

BUSCAR:
```ts
  descuentoTotal: number;
  total: number;                    // suma de los 4 totales + descuentoTotal
  totalContraParte: number;         // informativo — suma de contraParte.monto
}
```

REEMPLAZAR:
```ts
  descuentoTotal: number;
  total: number;                    // suma de los 4 totales + descuentoTotal — valor del SERVICIO
  totalContraParte: number;         // informativo — suma de contraParte.monto
  // FC1. Opcionales: los docs anteriores no los tienen — leer con netoDe /
  // compensacionesDe (shared/utils/compensacion.util.ts). Los mantiene
  // InformeLiqFactoryService (recalcularTotal / aplicarCompensaciones).
  totalCompensaciones?: number;     // Σ compensaciones.importe
  neto?: number;                    // total − totalCompensaciones (≥ 0): lo que se paga / cobra
}

/** Una compensación de la liquidación: apunta a un movimiento real de
 *  Finanzas (anticipo, préstamo o saldo a favor) con saldo sin imputar de la
 *  MISMA entidad. Snapshot de número/fecha/concepto al elegirla; `importe` es
 *  lo que se descuenta en ESTE informe (≤ disponible del movimiento). */
export interface CompensacionLiq {
  idMovimiento: string;
  numero: string;                   // 'OPG-000123'
  fecha: string;                    // 'YYYY-MM-DD' del movimiento
  concepto: 'normal' | 'anticipo' | 'prestamo';   // ConceptoMovimientoFin
  importe: number;                  // > 0
}
```

## PASO 2 — NUEVO `src/app/shared/utils/compensacion.util.ts`

```ts
import { CompensacionLiq, InformeLiqNuevo, ValoresLiq } from 'src/app/interfaces/informe-liq-nuevo';
import { EntidadMovimientoFin, ImputacionFin, MovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { esCero, redondear2, TOLERANCIA_IMPORTE } from 'src/app/shared/utils/finanzas.util';
import { acumularImputaciones } from 'src/app/shared/utils/movimiento-fin.util';

/** Compensaciones de una liquidación (Frente Finanzas, FC1) — utils PUROS.
 *  Un InformeLiq descuenta saldos sin imputar de movimientos de la MISMA
 *  entidad (anticipos, préstamos, saldos a favor): total → compensaciones →
 *  neto. En borrador son una propuesta; al emitir se aplican (imputación con
 *  origen 'compensacion' en el movimiento + totalCompensado en el informe);
 *  al revertir se liberan. Las escrituras sobre `movimientosFin` las agrega
 *  InformeLiqService a su propia transacción con escrituraMovimientoParcial
 *  (sin inyectar MovimientoFinService: evita la dependencia circular).
 *  Diseño: claude/diseno-finanzas.md §13, §15, §17. */

export const COLECCION_MOVIMIENTOS_FIN = 'movimientosFin';

/** Tope de compensaciones por informe (1 lectura + 1 escritura cada una en
 *  la transacción de emitir). */
export const MAX_COMPENSACIONES = 20;

/** Lo que manda la UI: qué movimiento y cuánto descontar. */
export interface CompensacionSolicitada {
  idMovimiento: string;
  importe: number;
}

/** Datos del informe que van en la imputación del movimiento. */
export interface DocumentoCompensado {
  idInfLiq: string;
  numeroInterno: string | null;
  periodoClave: string | null;
  totalDocumento: number;           // valores.total del informe
}

// ---------------------------------------------------------------------------
// Lectura tolerante (docs anteriores a FC1)
// ---------------------------------------------------------------------------

export function compensacionesDe(liq: Pick<InformeLiqNuevo, 'compensaciones'> | null | undefined): CompensacionLiq[] {
  return liq?.compensaciones ?? [];
}

export function totalCompensacionesDe(compensaciones: { importe: number }[]): number {
  return redondear2(compensaciones.reduce((acc, c) => acc + (Number(c.importe) || 0), 0));
}

/** Neto a pagar / cobrar: valores.neto o, en docs anteriores a FC1,
 *  total − totalCompensaciones (0). */
export function netoDe(valores: ValoresLiq): number {
  return valores.neto ?? redondear2(valores.total - (valores.totalCompensaciones ?? 0));
}

/** Mensaje si el neto quedaría negativo (F30), o null. */
export function errorNeto(total: number, totalCompensaciones: number): string | null {
  const neto = redondear2(total - totalCompensaciones);
  if (neto < -TOLERANCIA_IMPORTE) {
    return `Las compensaciones ($ ${totalCompensaciones.toFixed(2)}) superan el total de la liquidación ` +
      `($ ${redondear2(total).toFixed(2)}): el neto no puede ser negativo. Reducí las compensaciones.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Validación y armado
// ---------------------------------------------------------------------------

/** Solicitudes listas: importes redondeados, las de 0 descartadas. Sin
 *  lecturas: ids únicos, importes > 0 y tope. Devuelve las normalizadas o
 *  tira Error. */
export function normalizarCompensaciones(solicitudes: CompensacionSolicitada[] | null | undefined): CompensacionSolicitada[] {
  const normalizadas = (solicitudes ?? [])
    .map(s => ({ idMovimiento: s.idMovimiento, importe: redondear2(Number(s.importe) || 0) }))
    .filter(s => !esCero(s.importe));
  if (normalizadas.some(s => !s.idMovimiento)) throw new Error('Hay una compensación sin movimiento.');
  if (normalizadas.some(s => s.importe < 0)) throw new Error('Hay una compensación con importe negativo.');
  const ids = normalizadas.map(s => s.idMovimiento);
  if (new Set(ids).size !== ids.length) throw new Error('Un movimiento aparece más de una vez en las compensaciones.');
  if (normalizadas.length > MAX_COMPENSACIONES) {
    throw new Error(`Una liquidación admite hasta ${MAX_COMPENSACIONES} compensaciones (elegidas: ${normalizadas.length}).`);
  }
  return normalizadas;
}

/** Lo que ya está compensado de `mov` en el informe `idInfLiq` (un emitido
 *  que se edita). 0 si nada. */
export function compensadoEnInforme(mov: Pick<MovimientoFin, 'imputaciones'>, idInfLiq: string | null): number {
  if (!idInfLiq) return 0;
  return redondear2((mov.imputaciones ?? [])
    .filter(i => i.origen === 'compensacion' && i.documento.id === idInfLiq)
    .reduce((acc, i) => acc + i.importe, 0));
}

/** Disponible de `mov` para el informe `idInfLiq`: lo sin imputar + lo que
 *  ya le aplicó a ESE informe (al editar un emitido se puede subir hasta ahí). */
export function disponibleParaInforme(mov: Pick<MovimientoFin, 'sinImputar' | 'imputaciones'>, idInfLiq: string | null): number {
  return redondear2((mov.sinImputar ?? 0) + compensadoEnInforme(mov, idInfLiq));
}

/** Arma las CompensacionLiq desde las solicitudes y los movimientos
 *  RELEÍDOS en la transacción (mapa id → movimiento, null si no existe).
 *  Valida cada uno: existe, vigente, no es un ajuste, es de la entidad del
 *  informe y el importe entra en su disponible. Tira Error (aborta). */
export function armarCompensaciones(
  solicitudes: CompensacionSolicitada[],
  movimientos: Map<string, MovimientoFin | null>,
  entidad: Pick<EntidadMovimientoFin, 'tipo' | 'id'>,
  idInfLiq: string | null,
): CompensacionLiq[] {
  return solicitudes.map(s => {
    const mov = movimientos.get(s.idMovimiento);
    if (!mov) throw new Error(`No existe el movimiento ${s.idMovimiento} elegido para compensar.`);
    if (mov.estado !== 'vigente') throw new Error(`El movimiento ${mov.numero} está anulado: quitalo de las compensaciones.`);
    if (mov.tipo === 'ajuste') throw new Error(`El movimiento ${mov.numero} es un ajuste: no se compensa.`);
    if (mov.entidad.tipo !== entidad.tipo || mov.entidad.id !== entidad.id) {
      throw new Error(`El movimiento ${mov.numero} es de otra entidad (${mov.entidad.razonSocial}).`);
    }
    const disponible = disponibleParaInforme(mov, idInfLiq);
    if (s.importe - disponible > TOLERANCIA_IMPORTE) {
      throw new Error(
        `El movimiento ${mov.numero} tiene $ ${disponible.toFixed(2)} disponibles y se quieren compensar $ ${s.importe.toFixed(2)}` +
        ' (¿se usó en otra liquidación o en una imputación?).',
      );
    }
    return {
      idMovimiento: s.idMovimiento,
      numero: mov.numero,
      fecha: mov.fecha,
      concepto: mov.concepto,
      importe: s.importe,
    };
  });
}

/** Solicitudes equivalentes a unas compensaciones guardadas (para
 *  revalidar las de un borrador al emitirlo). */
export function solicitudesDe(compensaciones: CompensacionLiq[]): CompensacionSolicitada[] {
  return compensaciones.map(c => ({ idMovimiento: c.idMovimiento, importe: c.importe }));
}

// ---------------------------------------------------------------------------
// Escrituras sobre el movimiento
// ---------------------------------------------------------------------------

type CamposImputacionMovimiento = Pick<MovimientoFin, 'imputaciones' | 'idsDocumentos' | 'totalImputado' | 'sinImputar'>;

/** Campos del movimiento dejando UNA compensación de `importe` en el
 *  informe `doc` (reemplaza la que hubiera para ese informe; importe 0 =
 *  solo quitar). `saldoAntes`: saldo del informe antes de esta compensación.
 *  Tira Error si el movimiento quedaría con imputado > total. */
export function fijarCompensacion(
  mov: Pick<MovimientoFin, 'numero' | 'total' | 'imputaciones'>,
  doc: DocumentoCompensado,
  importe: number,
  saldoAntes: number,
  fecha: string,
): CamposImputacionMovimiento {
  const restantes = (mov.imputaciones ?? [])
    .filter(i => !(i.origen === 'compensacion' && i.documento.id === doc.idInfLiq));
  const nuevas: ImputacionFin[] = esCero(importe) ? [] : [{
    documento: { tipo: 'informeLiq', id: doc.idInfLiq },
    numeroDocumento: doc.numeroInterno ?? doc.idInfLiq,
    periodoClave: doc.periodoClave,
    fechaFactura: null,
    totalDocumento: redondear2(doc.totalDocumento),
    saldoAntes: redondear2(saldoAntes),
    importe: redondear2(importe),
    fecha,
    origen: 'compensacion',
  }];
  return acumularImputaciones({ numero: mov.numero, total: mov.total, imputaciones: restantes }, nuevas);
}

/** Campos del movimiento sin las compensaciones aplicadas al informe
 *  `idInfLiq` (liberar al revertir o al quitarla de un emitido). */
export function quitarCompensacion(
  mov: Pick<MovimientoFin, 'numero' | 'total' | 'imputaciones'>,
  idInfLiq: string,
): CamposImputacionMovimiento {
  const restantes = (mov.imputaciones ?? [])
    .filter(i => !(i.origen === 'compensacion' && i.documento.id === idInfLiq));
  return acumularImputaciones({ numero: mov.numero, total: mov.total, imputaciones: restantes }, []);
}

/** Escritura parcial sobre un movimiento de Finanzas (modo 'actualizar'). */
export function escrituraMovimientoParcial(idMovimiento: string, campos: Record<string, any>): EscrituraBatch {
  return { coleccion: COLECCION_MOVIMIENTOS_FIN, id: idMovimiento, modo: 'actualizar', data: campos };
}
```

## PASO 3 — `src/app/servicios/informes-liq/informe-liq-factory.service.ts`

### 3a

BUSCAR:
```ts
import { normalizarValoresFinancieros } from 'src/app/shared/utils/finanzas.util';
import {
  DescuentoLiq,
  InformeLiqNuevo,
  PeriodoLiq,
  ValoresFinancierosLiq,
  ValoresLiq,
} from 'src/app/interfaces/informe-liq-nuevo';
```

REEMPLAZAR:
```ts
import { aplicarImporte, estadoFinancieroDe, normalizarValoresFinancieros, redondear2 } from 'src/app/shared/utils/finanzas.util';
import {
  CompensacionLiq,
  DescuentoLiq,
  InformeLiqNuevo,
  PeriodoLiq,
  ValoresFinancierosLiq,
  ValoresLiq,
} from 'src/app/interfaces/informe-liq-nuevo';
```

### 3b

BUSCAR:
```ts
  observaciones: string;
  modo: 'borrador' | 'emitido';
```

REEMPLAZAR:
```ts
  observaciones: string;
  // FC1: ya armadas y validadas por el orquestador (armarCompensaciones).
  // En 'emitido' quedan aplicadas (valoresFinancieros.totalCompensado).
  compensaciones?: CompensacionLiq[];
  modo: 'borrador' | 'emitido';
```

### 3c

BUSCAR:
```ts
    const valores = this.calcularValores(d.informesOp, d.descuentos);
    const emitido = d.modo === 'emitido';
```

REEMPLAZAR:
```ts
    const compensaciones = (d.compensaciones ?? []).map(c => ({ ...c }));
    const valores = this.aplicarCompensaciones(this.calcularValores(d.informesOp, d.descuentos), compensaciones);
    const emitido = d.modo === 'emitido';
    const valoresFinancieros = this.valoresFinancierosIniciales(
      valores.total, emitido ? (valores.totalCompensaciones ?? 0) : 0,
    );
```

### 3d

BUSCAR:
```ts
      valores,
      descuentos: d.descuentos.map(x => ({ ...x })),
      columnas: [...d.columnas],
      observaciones: d.observaciones,
      valoresFinancieros: this.valoresFinancierosIniciales(valores.total),
      estadoFinanciero: 'pendiente',
```

REEMPLAZAR:
```ts
      valores,
      descuentos: d.descuentos.map(x => ({ ...x })),
      compensaciones,
      columnas: [...d.columnas],
      observaciones: d.observaciones,
      valoresFinancieros,
      estadoFinanciero: emitido ? estadoFinancieroDe(valoresFinancieros) : 'pendiente',
```

### 3e

BUSCAR:
```ts
    return this.recalcularTotal(
      { totalTarifaBase, totalAcompaniante, totalKmMonto, totalAdExtra, descuentoTotal: 0, total: 0, totalContraParte },
      descuentos,
    );
  }
```

REEMPLAZAR:
```ts
    return this.recalcularTotal(
      {
        totalTarifaBase, totalAcompaniante, totalKmMonto, totalAdExtra, descuentoTotal: 0, total: 0, totalContraParte,
        totalCompensaciones: 0, neto: 0,
      },
      descuentos,
    );
  }
```

### 3f

BUSCAR:
```ts
  /** Recalcula descuentoTotal y total a partir de los 4 totales base — lo
   *  usan crear() y la edición de descuentos (B3). No toca los totales base
   *  ni totalContraParte. */
  recalcularTotal(valores: ValoresLiq, descuentos: DescuentoLiq[]): ValoresLiq {
    const descuentoTotal = descuentos.reduce((acc, x) => acc + (x.valor ?? 0), 0);
    const total =
      valores.totalTarifaBase + valores.totalAcompaniante + valores.totalKmMonto +
      valores.totalAdExtra + descuentoTotal;
    return { ...valores, descuentoTotal, total };
  }
```

REEMPLAZAR:
```ts
  /** Recalcula descuentoTotal y total a partir de los 4 totales base — lo
   *  usan crear() y la edición de descuentos (B3). No toca los totales base
   *  ni totalContraParte. Mantiene totalCompensaciones (0 en docs anteriores
   *  a FC1) y recalcula neto = total − totalCompensaciones (puede quedar
   *  negativo: la guarda de neto ≥ 0 es del orquestador). */
  recalcularTotal(valores: ValoresLiq, descuentos: DescuentoLiq[]): ValoresLiq {
    const descuentoTotal = descuentos.reduce((acc, x) => acc + (x.valor ?? 0), 0);
    const total =
      valores.totalTarifaBase + valores.totalAcompaniante + valores.totalKmMonto +
      valores.totalAdExtra + descuentoTotal;
    const totalCompensaciones = valores.totalCompensaciones ?? 0;
    return { ...valores, descuentoTotal, total, totalCompensaciones, neto: redondear2(total - totalCompensaciones) };
  }

  /** FC1: fija totalCompensaciones (Σ importes) y neto sobre unos valores ya
   *  calculados. No valida neto ≥ 0 (es del orquestador). */
  aplicarCompensaciones(valores: ValoresLiq, compensaciones: CompensacionLiq[]): ValoresLiq {
    const totalCompensaciones = redondear2(compensaciones.reduce((acc, c) => acc + (c.importe ?? 0), 0));
    return { ...valores, totalCompensaciones, neto: redondear2(valores.total - totalCompensaciones) };
  }

  /** FC1: valores financieros de un informe EMITIDO con `totalCompensado`
   *  aplicado (desde cero), sin pisar cobrado/ajustado. Tira Error si el
   *  saldo quedaría negativo (neto < 0 o compensado + cobrado > total). */
  valoresFinancierosConCompensado(
    actual: ValoresFinancierosLiq | null | undefined,
    total: number,
    totalCompensado: number,
  ): ValoresFinancierosLiq {
    const base = normalizarValoresFinancieros({ ...(actual ?? {}), total, totalCompensado: 0 }, total);
    return aplicarImporte(base, 'totalCompensado', totalCompensado);
  }
```

### 3g

BUSCAR:
```ts
  private valoresFinancierosIniciales(total: number): ValoresFinancierosLiq {
    return { total, totalCompensado: 0, totalCobrado: 0, totalAjustado: 0, saldo: total };
  }
```

REEMPLAZAR:
```ts
  /** `totalCompensado`: solo en un alta emitida con compensaciones (FC1). */
  private valoresFinancierosIniciales(total: number, totalCompensado: number = 0): ValoresFinancierosLiq {
    return normalizarValoresFinancieros({ total, totalCompensado, totalCobrado: 0, totalAjustado: 0 }, total);
  }
```

## PASO 4 — `src/app/servicios/informes-liq/informe-liq.service.ts`

### 4a

BUSCAR:
```ts
import {
  DescuentoLiq, FacturaVinculada, InformeLiqNuevo, InformeLiqSnapshot, PeriodoLiq, ReversionLiq,
} from 'src/app/interfaces/informe-liq-nuevo';
```

REEMPLAZAR:
```ts
import {
  CompensacionLiq, DescuentoLiq, FacturaVinculada, InformeLiqNuevo, InformeLiqSnapshot, PeriodoLiq, ReversionLiq,
} from 'src/app/interfaces/informe-liq-nuevo';
import { MovimientoFin } from 'src/app/interfaces/movimiento-fin';
```

### 4b

BUSCAR:
```ts
import { nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';
import { ResultadoEdicionInformeOp }
```

REEMPLAZAR:
```ts
import { nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';
import {
  COLECCION_MOVIMIENTOS_FIN, CompensacionSolicitada, DocumentoCompensado, armarCompensaciones, compensacionesDe,
  errorNeto, escrituraMovimientoParcial, fijarCompensacion, normalizarCompensaciones, quitarCompensacion,
  solicitudesDe, totalCompensacionesDe,
} from 'src/app/shared/utils/compensacion.util';
import { estadoFinancieroDe, redondear2 } from 'src/app/shared/utils/finanzas.util';
import { ResultadoEdicionInformeOp }
```

### 4c

BUSCAR:
```ts
  descuentos: DescuentoLiq[];
  columnas: string[];
  observaciones: string;
}

export interface ResultadoLiquidacion {
```

REEMPLAZAR:
```ts
  descuentos: DescuentoLiq[];
  columnas: string[];
  observaciones: string;
  // FC1: movimientos a compensar (se revalidan y snapshotean en la
  // transacción). Opcional: sin compensaciones = [] (generadores, etc.).
  compensaciones?: CompensacionSolicitada[];
}

export interface ResultadoLiquidacion {
```

### 4d

BUSCAR:
```ts
export interface CambiosDatosLiq {
  descuentos?: DescuentoLiq[];
  observaciones?: string;
  columnas?: string[];
}
```

REEMPLAZAR:
```ts
export interface CambiosDatosLiq {
  descuentos?: DescuentoLiq[];
  // FC1: la lista COMPLETA de compensaciones que debe quedar (no un delta).
  compensaciones?: CompensacionSolicitada[];
  observaciones?: string;
  columnas?: string[];
}
```

### 4e

BUSCAR:
```ts
   *  número interno. valoresFinancieros se recalcula desde valores.total
   *  (puede haber cambiado por edición del borrador). */
  async emitirBorrador(idInfLiq: string): Promise<Resultado<ResultadoLiquidacion>> {
```

REEMPLAZAR:
```ts
   *  número interno. valoresFinancieros se recalcula desde valores.total
   *  (puede haber cambiado por edición del borrador).
   *  FC1: las compensaciones del borrador se revalidan contra los
   *  movimientos frescos (otro informe pudo haber usado el saldo: gana el
   *  primero que se emite) y se APLICAN: totalCompensado en el informe y una
   *  imputación 'compensacion' en cada movimiento, en la misma transacción. */
  async emitirBorrador(idInfLiq: string): Promise<Resultado<ResultadoLiquidacion>> {
```

### 4f

BUSCAR:
```ts
        const liq = await this.leerBorrador(tx, idInfLiq);
        const informes = await this.leerInformesOp(tx, liq.informesOp);
        this.validarInformesDelBorrador(informes, idInfLiq);
        const operaciones = await this.leerOperaciones(tx, informes);
        const { numeroInterno, escritura } = await this.numerador.leerProximoNumeroInterno(tx, liq.tipo);
        // — fin de lecturas —

        escrituras.push(escritura);
        this.agregarEscrituraInformeLiqParcial(escrituras, idInfLiq, {
          estado: 'emitido',
          numeroInterno,
          fechaEmision: fecha,
          valoresFinancieros: this.factory.recalcularValoresFinancieros(liq.valoresFinancieros, liq.valores.total),
          estadoFinanciero: 'pendiente',
        });
```

REEMPLAZAR:
```ts
        const liq = await this.leerBorrador(tx, idInfLiq);
        const informes = await this.leerInformesOp(tx, liq.informesOp);
        this.validarInformesDelBorrador(informes, idInfLiq);
        const operaciones = await this.leerOperaciones(tx, informes);
        const movimientos = await this.leerMovimientosFin(tx, compensacionesDe(liq).map(c => c.idMovimiento));
        const { numeroInterno, escritura } = await this.numerador.leerProximoNumeroInterno(tx, liq.tipo);
        // — fin de lecturas —

        const compensaciones = armarCompensaciones(
          solicitudesDe(compensacionesDe(liq)), movimientos, { tipo: liq.tipo, id: liq.entidad.id }, idInfLiq,
        );
        const valores = this.factory.aplicarCompensaciones(liq.valores, compensaciones);
        const errNeto = errorNeto(valores.total, valores.totalCompensaciones ?? 0);
        if (errNeto) throw new Error(errNeto);
        const vf = this.factory.valoresFinancierosConCompensado(
          liq.valoresFinancieros, valores.total, valores.totalCompensaciones ?? 0,
        );

        escrituras.push(escritura);
        this.agregarEscrituraInformeLiqParcial(escrituras, idInfLiq, {
          estado: 'emitido',
          numeroInterno,
          fechaEmision: fecha,
          compensaciones,
          'valores.totalCompensaciones': valores.totalCompensaciones,
          'valores.neto': valores.neto,
          valoresFinancieros: vf,
          estadoFinanciero: estadoFinancieroDe(vf),
        });
        this.agregarEscriturasCompensacion(
          escrituras,
          { idInfLiq, numeroInterno, periodoClave: liq.periodoClave, totalDocumento: valores.total },
          compensaciones, movimientos, fecha,
        );
```

### 4g

BUSCAR:
```ts
          `Emisión de borrador — ${numeroInterno} — ${liq.tipo} ${nombreEntidadRef(liq.entidad)} — ${informes.length} InformeOp — ${this.factory.textoPeriodo(liq.periodo)}`,
```

REEMPLAZAR:
```ts
          `Emisión de borrador — ${numeroInterno} — ${liq.tipo} ${nombreEntidadRef(liq.entidad)} — ${informes.length} InformeOp — ${this.factory.textoPeriodo(liq.periodo)}` +
          this.textoCompensaciones(compensaciones),
```

### 4h

BUSCAR:
```ts
  /** Edita descuentos / observaciones / columnas de un InformeLiq en
   *  'borrador' o 'emitido'. Si cambian los descuentos, recalcula
   *  valores.descuentoTotal, valores.total y valoresFinancieros (sin pisar
   *  totalCobrado). Un solo commitBatch con log EDITAR (diff por campo).
   *  TODO Finanzas: sobre un 'emitido', un cambio de total impacta en
   *  resumenFinanzas cuando se conecte la cascada. */
  async editarDatos(idInfLiq: string, cambios: CambiosDatosLiq): Promise<Resultado<void>> {
    const liq = await this.obtenerPorId(idInfLiq);
    if (!liq) return { exito: false, mensaje: `No existe el informe de liquidación ${idInfLiq}.` };
    if (liq.estado !== 'borrador' && liq.estado !== 'emitido') {
      return { exito: false, mensaje: `El informe está en estado '${liq.estado}' y no se puede editar.` };
    }

    const campos: Record<string, any> = {};
    if (cambios.descuentos !== undefined) {
      const valores = this.factory.recalcularTotal(liq.valores, cambios.descuentos);
      const vf = this.factory.recalcularValoresFinancieros(liq.valoresFinancieros, valores.total);
      campos['descuentos'] = cambios.descuentos.map(d => ({ concepto: d.concepto, valor: d.valor }));
      campos['valores.descuentoTotal'] = valores.descuentoTotal;
      campos['valores.total'] = valores.total;
      campos['valoresFinancieros.total'] = vf.total;
      campos['valoresFinancieros.saldo'] = vf.saldo;
    }
    if (cambios.observaciones !== undefined) campos['observaciones'] = cambios.observaciones;
    if (cambios.columnas !== undefined) campos['columnas'] = [...cambios.columnas];

    if (Object.keys(campos).length === 0) return { exito: true, mensaje: 'Sin cambios.' };

    const escrituras: EscrituraBatch[] = [];
    this.agregarEscrituraInformeLiqParcial(escrituras, idInfLiq, campos);
    const { id, idInfLiq: _omit, ...anterior } = liq as any;
    await this.logRegistro.agregarAlBatch(
      escrituras, 'EDITAR', this.COLECCION, idInfLiq,
      `Edición de datos del informe de liquidación — ${liq.tipo} ${nombreEntidadRef(liq.entidad)}`,
      anterior,
    );

    try {
      await this.db.commitBatch(escrituras);
    } catch (e: any) {
      await this.logRegistro.registrarError('EDITAR', this.COLECCION, idInfLiq, `Error al editar datos: ${e?.message ?? e}`);
      return { exito: false, mensaje: `Error al guardar: ${e?.message ?? e}` };
    }
    return { exito: true, mensaje: 'Informe actualizado correctamente.' };
  }
```

REEMPLAZAR:
```ts
  /** Edita descuentos / compensaciones / observaciones / columnas de un
   *  InformeLiq en 'borrador' o 'emitido'. Una transacción (FC1): relee el
   *  informe y, si vienen compensaciones, los movimientos de antes y de ahora.
   *   - descuentos → valores (descuentoTotal, total, neto) y
   *     valoresFinancieros (sin pisar lo imputado).
   *   - compensaciones (lista completa) → se revalidan contra los movimientos
   *     frescos (armarCompensaciones). En un borrador solo se guardan
   *     (propuesta, F34); en un EMITIDO ya están aplicadas (F29): cada
   *     movimiento afectado queda con la compensación nueva (o sin ella) y
   *     totalCompensado se recalcula.
   *   - F30: el neto no puede quedar negativo (también si solo cambian los
   *     descuentos).
   *  Log EDITAR con diff. */
  async editarDatos(idInfLiq: string, cambios: CambiosDatosLiq): Promise<Resultado<void>> {
    let solicitudes: CompensacionSolicitada[] | undefined;
    try {
      solicitudes = cambios.compensaciones === undefined ? undefined : normalizarCompensaciones(cambios.compensaciones);
    } catch (e: any) {
      return { exito: false, mensaje: e?.message ?? String(e) };
    }
    // Afuera del callback (puede reintentarse y tiene que ser puro).
    const hoy = toISODateString(new Date());

    try {
      const huboCambios = await this.db.commitEnTransaccion<boolean>(async (tx) => {
        const escrituras: EscrituraBatch[] = [];

        const data = await this.db.leerEnTransaccion<InformeLiqNuevo>(tx, this.COLECCION, idInfLiq);
        if (!data) throw new Error(`No existe el informe de liquidación ${idInfLiq}.`);
        if (data.estado !== 'borrador' && data.estado !== 'emitido') {
          throw new Error(`El informe está en estado '${data.estado}' y no se puede editar.`);
        }
        const liq: ConId<InformeLiqNuevo> = { ...data, id: idInfLiq, idInfLiq };
        const anteriores = compensacionesDe(liq);
        const movimientos = solicitudes === undefined
          ? new Map<string, MovimientoFin | null>()
          : await this.leerMovimientosFin(tx, [
            ...anteriores.map(c => c.idMovimiento),
            ...solicitudes.map(s => s.idMovimiento),
          ]);
        // — fin de lecturas —

        const campos: Record<string, any> = {};
        const emitido = liq.estado === 'emitido';
        let compensaciones = anteriores;

        if (cambios.descuentos !== undefined || solicitudes !== undefined) {
          const descuentos = cambios.descuentos ?? liq.descuentos;
          if (solicitudes !== undefined) {
            compensaciones = armarCompensaciones(solicitudes, movimientos, { tipo: liq.tipo, id: liq.entidad.id }, idInfLiq);
          }
          const valores = this.factory.aplicarCompensaciones(this.factory.recalcularTotal(liq.valores, descuentos), compensaciones);
          const errNeto = errorNeto(valores.total, valores.totalCompensaciones ?? 0);
          if (errNeto) throw new Error(errNeto);
          const vf = emitido
            ? this.factory.valoresFinancierosConCompensado(liq.valoresFinancieros, valores.total, valores.totalCompensaciones ?? 0)
            : this.factory.recalcularValoresFinancieros(liq.valoresFinancieros, valores.total);

          if (cambios.descuentos !== undefined) {
            campos['descuentos'] = descuentos.map(d => ({ concepto: d.concepto, valor: d.valor }));
            campos['valores.descuentoTotal'] = valores.descuentoTotal;
            campos['valores.total'] = valores.total;
          }
          if (solicitudes !== undefined) campos['compensaciones'] = compensaciones;
          campos['valores.totalCompensaciones'] = valores.totalCompensaciones;
          campos['valores.neto'] = valores.neto;
          campos['valoresFinancieros'] = vf;
          if (emitido) campos['estadoFinanciero'] = estadoFinancieroDe(vf, liq.estadoFinanciero);

          // Emitido: las compensaciones ya están aplicadas → cada movimiento
          // afectado (antes o ahora) queda con la nueva o sin ninguna.
          if (emitido && solicitudes !== undefined) {
            const doc: DocumentoCompensado = {
              idInfLiq, numeroInterno: liq.numeroInterno, periodoClave: liq.periodoClave, totalDocumento: valores.total,
            };
            this.agregarEscriturasCompensacion(escrituras, doc, compensaciones, movimientos, liq.fechaEmision ?? hoy);
            const vigentes = new Set(compensaciones.map(c => c.idMovimiento));
            for (const a of anteriores) {
              if (vigentes.has(a.idMovimiento)) continue;
              const mov = movimientos.get(a.idMovimiento);
              if (!mov) throw new Error(`Inconsistencia: no existe el movimiento ${a.numero} compensado en esta liquidación.`);
              escrituras.push(escrituraMovimientoParcial(a.idMovimiento, quitarCompensacion(mov, idInfLiq)));
            }
          }
        }
        if (cambios.observaciones !== undefined) campos['observaciones'] = cambios.observaciones;
        if (cambios.columnas !== undefined) campos['columnas'] = [...cambios.columnas];

        if (Object.keys(campos).length === 0) return { escrituras: [], resultado: false };

        this.agregarEscrituraInformeLiqParcial(escrituras, idInfLiq, campos);
        const { id, idInfLiq: _omit, ...anterior } = liq as any;
        await this.logRegistro.agregarAlBatch(
          escrituras, 'EDITAR', this.COLECCION, idInfLiq,
          `Edición de datos del informe de liquidación — ${liq.tipo} ${nombreEntidadRef(liq.entidad)}` +
          (solicitudes !== undefined ? this.textoCompensaciones(compensaciones) : ''),
          anterior,
        );
        return { escrituras, resultado: true };
      });
      return { exito: true, mensaje: huboCambios ? 'Informe actualizado correctamente.' : 'Sin cambios.' };
    } catch (e: any) {
      await this.logRegistro.registrarError('EDITAR', this.COLECCION, idInfLiq, `Error al editar datos: ${e?.message ?? e}`);
      return { exito: false, mensaje: `Error al guardar: ${e?.message ?? e}` };
    }
  }
```

### 4i

BUSCAR:
```ts
      }, liq.descuentos);
      const vf = this.factory.recalcularValoresFinancieros(liq.valoresFinancieros, valores.total);

      this.agregarEscrituraInformeLiqParcial(escrituras, liq.idInfLiq, {
        'valores.totalTarifaBase': valores.totalTarifaBase,
        'valores.totalAcompaniante': valores.totalAcompaniante,
        'valores.totalKmMonto': valores.totalKmMonto,
        'valores.totalAdExtra': valores.totalAdExtra,
        'valores.total': valores.total,
        'valores.totalContraParte': valores.totalContraParte,
        'valoresFinancieros.total': vf.total,
        'valoresFinancieros.saldo': vf.saldo,
      });
```

REEMPLAZAR:
```ts
      }, liq.descuentos);
      // F30: el total no puede quedar por debajo de las compensaciones.
      const errNeto = errorNeto(valores.total, valores.totalCompensaciones ?? 0);
      if (errNeto) return { exito: false, mensaje: errNeto };
      const vf = this.factory.recalcularValoresFinancieros(liq.valoresFinancieros, valores.total);

      this.agregarEscrituraInformeLiqParcial(escrituras, liq.idInfLiq, {
        'valores.totalTarifaBase': valores.totalTarifaBase,
        'valores.totalAcompaniante': valores.totalAcompaniante,
        'valores.totalKmMonto': valores.totalKmMonto,
        'valores.totalAdExtra': valores.totalAdExtra,
        'valores.total': valores.total,
        'valores.totalContraParte': valores.totalContraParte,
        'valores.totalCompensaciones': valores.totalCompensaciones,
        'valores.neto': valores.neto,
        'valoresFinancieros.total': vf.total,
        'valoresFinancieros.saldo': vf.saldo,
      });
```

### 4j

BUSCAR:
```ts
   *  La contraparte no cambia. Un log REVERTIR con diff.
   *  Presupuesto: 2 por InformeOp + informe + copia + log (≤ 303).
```

REEMPLAZAR:
```ts
   *  La contraparte no cambia. Un log REVERTIR con diff.
   *  FC1: las compensaciones aplicadas se LIBERAN (cada movimiento pierde su
   *  imputación 'compensacion' a este informe y recupera el saldo sin
   *  imputar). Quedan en el informe revertido como historia.
   *  Presupuesto: 2 por InformeOp + informe + copia + log (≤ 303) + 1 por
   *  compensación (≤ MAX_COMPENSACIONES).
```

### 4k

BUSCAR:
```ts
        const informes = await this.leerInformesOp(tx, liq.informesOp);
        this.validarInformesDelEmitido(informes, idInfLiq);
        const operaciones = await this.leerOperaciones(tx, informes);
        // — fin de lecturas —

        this.agregarEscrituraInformeLiqParcial(escrituras, idInfLiq, { estado: 'revertido', reversion });
```

REEMPLAZAR:
```ts
        const informes = await this.leerInformesOp(tx, liq.informesOp);
        this.validarInformesDelEmitido(informes, idInfLiq);
        const operaciones = await this.leerOperaciones(tx, informes);
        const compensaciones = compensacionesDe(liq);
        const movimientos = await this.leerMovimientosFin(tx, compensaciones.map(c => c.idMovimiento));
        // — fin de lecturas —

        this.agregarEscrituraInformeLiqParcial(escrituras, idInfLiq, { estado: 'revertido', reversion });
        for (const [idMov, mov] of movimientos) {
          if (!mov) throw new Error(`Inconsistencia: no existe el movimiento ${idMov} compensado en esta liquidación.`);
          escrituras.push(escrituraMovimientoParcial(idMov, quitarCompensacion(mov, idInfLiq)));
        }
```

### 4l

BUSCAR:
```ts
          `${informes.length} InformeOp vuelven a 'activo' — ${this.factory.textoPeriodo(liq.periodo)} — motivo: ${motivoLimpio}`,
          anterior,
        );

        return { escrituras, resultado: liq.numeroInterno };
```

REEMPLAZAR:
```ts
          `${informes.length} InformeOp vuelven a 'activo' — ${this.factory.textoPeriodo(liq.periodo)} — motivo: ${motivoLimpio}` +
          (compensaciones.length > 0 ? ` — ${compensaciones.length} compensación(es) liberada(s)` : ''),
          anterior,
        );

        return { escrituras, resultado: liq.numeroInterno };
```

### 4m

BUSCAR:
```ts
    const error = this.validarDatos(d);
    if (error) return { exito: false, mensaje: error };

    // Afuera del callback: el callback puede reintentarse y tiene que ser puro.
    const idInfLiq = this.db.generarId(this.COLECCION);
```

REEMPLAZAR:
```ts
    const error = this.validarDatos(d);
    if (error) return { exito: false, mensaje: error };
    let solicitudes: CompensacionSolicitada[];
    try {
      solicitudes = normalizarCompensaciones(d.compensaciones);
    } catch (e: any) {
      return { exito: false, mensaje: e?.message ?? String(e) };
    }

    // Afuera del callback: el callback puede reintentarse y tiene que ser puro.
    const idInfLiq = this.db.generarId(this.COLECCION);
```

### 4n

BUSCAR:
```ts
          numero = n.numeroInterno;
          escrituras.push(n.escritura);
        }
        // — fin de lecturas —

        const informeLiq = this.factory.crear(idInfLiq, {
          tipo: d.tipo,
          entidad: informes[0].entidad,
          periodo: d.periodo,
          informesOp: informes,
          descuentos: d.descuentos,
          columnas: d.columnas,
          observaciones: d.observaciones,
          modo,
          numeroInterno: numero,
          fecha,
        });
        this.agregarEscrituraInformeLiqCompleto(escrituras, informeLiq, 'crear');
```

REEMPLAZAR:
```ts
          numero = n.numeroInterno;
          escrituras.push(n.escritura);
        }
        const movimientos = await this.leerMovimientosFin(tx, solicitudes.map(s => s.idMovimiento));
        // — fin de lecturas —

        // FC1: snapshot + validación de las compensaciones (borrador: solo se
        // guardan; emitido: se aplican en los movimientos).
        const compensaciones = armarCompensaciones(
          solicitudes, movimientos, { tipo: d.tipo, id: informes[0].entidad.id }, null,
        );
        const informeLiq = this.factory.crear(idInfLiq, {
          tipo: d.tipo,
          entidad: informes[0].entidad,
          periodo: d.periodo,
          informesOp: informes,
          descuentos: d.descuentos,
          columnas: d.columnas,
          observaciones: d.observaciones,
          compensaciones,
          modo,
          numeroInterno: numero,
          fecha,
        });
        const errNeto = errorNeto(informeLiq.valores.total, informeLiq.valores.totalCompensaciones ?? 0);
        if (errNeto) throw new Error(errNeto);
        this.agregarEscrituraInformeLiqCompleto(escrituras, informeLiq, 'crear');
        if (modo === 'emitido') {
          this.agregarEscriturasCompensacion(
            escrituras,
            { idInfLiq, numeroInterno: numero, periodoClave: informeLiq.periodoClave, totalDocumento: informeLiq.valores.total },
            compensaciones, movimientos, fecha,
          );
        }
```

### 4o

BUSCAR:
```ts
          `${accion} de liquidación${numero ? ` ${numero}` : ''} — ${d.tipo} ${nombreEntidadRef(informeLiq.entidad)} — ${informes.length} InformeOp — ${this.factory.textoPeriodo(d.periodo)}`,
          null,
```

REEMPLAZAR:
```ts
          `${accion} de liquidación${numero ? ` ${numero}` : ''} — ${d.tipo} ${nombreEntidadRef(informeLiq.entidad)} — ${informes.length} InformeOp — ${this.factory.textoPeriodo(d.periodo)}` +
          this.textoCompensaciones(compensaciones),
          null,
```

### 4p

BUSCAR:
```ts
  private lado(tipo: 'cliente' | 'chofer' | 'proveedor'): Lado {
```

REEMPLAZAR:
```ts
  /** FC1: relee los movimientos de Finanzas (ids sin repetir) dentro de la
   *  transacción. null si alguno no existe (lo resuelve quien lo usa). */
  private async leerMovimientosFin(tx: Transaction, ids: string[]): Promise<Map<string, MovimientoFin | null>> {
    const mapa = new Map<string, MovimientoFin | null>();
    await Promise.all([...new Set(ids)].map(async (id) => {
      mapa.set(id, await this.db.leerEnTransaccion<MovimientoFin>(tx, COLECCION_MOVIMIENTOS_FIN, id));
    }));
    return mapa;
  }

  /** FC1: aplica las compensaciones de un informe EMITIDO en sus
   *  movimientos (una imputación 'compensacion' por movimiento, que
   *  reemplaza la anterior a este informe si la había). `saldoAntes` baja en
   *  el orden de la lista. Los movimientos ya están validados por
   *  armarCompensaciones. */
  private agregarEscriturasCompensacion(
    escrituras: EscrituraBatch[],
    doc: DocumentoCompensado,
    compensaciones: CompensacionLiq[],
    movimientos: Map<string, MovimientoFin | null>,
    fecha: string,
  ): void {
    let saldo = doc.totalDocumento;
    for (const c of compensaciones) {
      const mov = movimientos.get(c.idMovimiento);
      if (!mov) throw new Error(`No existe el movimiento ${c.numero} elegido para compensar.`);
      escrituras.push(escrituraMovimientoParcial(c.idMovimiento, fijarCompensacion(mov, doc, c.importe, saldo, fecha)));
      saldo = redondear2(saldo - c.importe);
    }
  }

  /** ' — compensaciones $ X (N)' para los logs ('' si no hay). */
  private textoCompensaciones(compensaciones: CompensacionLiq[]): string {
    if (compensaciones.length === 0) return '';
    return ` — compensaciones $ ${totalCompensacionesDe(compensaciones).toFixed(2)} (${compensaciones.length})`;
  }

  private lado(tipo: 'cliente' | 'chofer' | 'proveedor'): Lado {
```

## PASO 5 — Verificación

```bash
npm run build:demo
grep -c "leerMovimientosFin" src/app/servicios/informes-liq/informe-liq.service.ts          # 5 (definición + 4 usos)
grep -c "agregarEscriturasCompensacion" src/app/servicios/informes-liq/informe-liq.service.ts  # 4 (definición + 3 usos)
grep -c "errorNeto(" src/app/servicios/informes-liq/informe-liq.service.ts                  # 4
grep -n "commitBatch" src/app/servicios/informes-liq/informe-liq.service.ts                # 2 líneas, ambas en editarInformeOp
git status --short
```

Esperado:

- El build termina sin errores. Los warnings de presupuesto previos no
  cuentan.
- Los conteos coinciden.
- `commitBatch` aparece solo en `editarInformeOp` (el comentario y la
  llamada): `editarDatos` ya no lo usa.
- `git status` muestra:
  - 3 archivos modificados: interfaz, factory y servicio;
  - el util nuevo;
  - lo tuyo sin trackear, si lo hay.

Reportá la salida.

## Pruebas manuales (demo, con usuario admin o dev)

Este bloque no tiene UI de compensaciones: se prueba que todo lo existente
siga igual y que los informes nuevos tengan los campos nuevos. El circuito
de compensaciones se prueba con FC1b.

1. **Borrador nuevo.** Liquidación → Informes → Nueva liquidación →
   Guardar borrador. En Firestore, el informe tiene `compensaciones: []`,
   `valores.totalCompensaciones: 0`, `valores.neto` = `valores.total` y
   `valoresFinancieros.totalCompensado: 0`.
2. **Emitir el borrador.** Desde Borradores: se emite con su número, con
   `estadoFinanciero: 'pendiente'` y `valoresFinancieros.saldo` = `total`.
3. **Emisión directa.** Igual que el punto 1, con número y estado
   `emitido`.
4. **Editar ajustes.**
   - En un borrador y en un emitido: agregá un ajuste y guardá. Se guarda
     bien; `valores.total` y `valores.neto` cambian juntos y
     `valoresFinancieros.saldo` = nuevo total.
   - Sobre un informe de ANTES de este bloque (sin `neto`): después de
     guardar ya tiene `totalCompensaciones: 0` y `neto`.
5. **Solo observaciones o columnas.** Guarda bien. "Guardar" sin cambios
   no hace nada.
6. **Editar un InformeOp dentro de una liquidación** (lápiz del detalle):
   recalcula `total` y `neto`.
7. **Revertir un emitido** (Facturación → Emitidos → Revertir): funciona
   igual que antes.
8. **Finanzas.** Cuentas y Movimientos se ven igual. Un cobro o pago
   nuevo y un anular siguen funcionando.
9. **Log.** La edición de datos sigue dejando EDITAR con diff (con admin).

## Commit (lo hace Nico)

```
feat(finanzas): compensaciones en la liquidación — modelo y servicio (FC1a)

- InformeLiqNuevo.compensaciones (CompensacionLiq → movimiento real) y
  ValoresLiq.totalCompensaciones / neto (opcionales; docs anteriores se
  leen con compensacionesDe / netoDe).
- compensacion.util (puro): normalizar, validar contra movimientos
  releídos (vigente, misma entidad, disponible), neto ≥ 0, fijar/quitar la
  imputación 'compensacion' en el movimiento, escritura parcial.
- Factory: recalcularTotal mantiene neto; aplicarCompensaciones;
  valoresFinancierosConCompensado; alta emitida con totalCompensado.
- InformeLiqService: crear/emitir/emitir borrador validan y (al emitir)
  aplican las compensaciones en la misma transacción; revertir las libera;
  editarDatos pasa a transacción y edita compensaciones (en emitido mueve
  los movimientos); guarda neto ≥ 0 también en editarInformeOp.
```
````
