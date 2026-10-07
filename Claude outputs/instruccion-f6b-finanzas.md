````
# Instrucción F6b — Finanzas: Resumen + estado por días promedio (F47)

## Contexto

Frente Finanzas. Diseño: `claude/diseno-finanzas.md` §19 (F41–F47).
F6a dejó la pestaña Antigüedad. Este bloque hace dos cosas.

### 1. Estado por días promedio ponderados (F47)

Hoy el estado sale de la factura MÁS ANTIGUA. Un cliente con $75 M
abiertos y solo $5 M a +90 queda igual de "Crítico" que uno con $5 M,
todos a +90. Esa regla sirve para saber a quién reclamar, pero no mide
cuánto de la deuda está atrasada. Cambia así:

- `CuentaEntidadFin` (y `armarCuentas`) suma tres campos:
  - `diasPromedio`: Σ saldo × días / Σ saldo de las facturas abiertas,
    redondeado;
  - `saldoVencido`: saldo con factura de más de 60 días (A cobrar) o de
    más de 15 (A pagar), el umbral de "atención" de cada lado;
  - `cantidadCriticas`: facturas de más de 90 días (A cobrar) o de más
    de 30 (A pagar).
  `TotalesCuentas` suma `saldoVencido`.
- `estadoCuenta(c)` aplica los umbrales de F43 sobre los días PROMEDIO.
  Si alguna factura es crítica, el estado sube como mínimo a "Atención",
  para que una factura trabada no quede escondida en el promedio.
  `marcaCriticas(c)` devuelve "N fact. +90" (o +30).
  - Ejemplo A: $70 M a 30 días + $5 M a 100 días → promedio 35 →
    "Atención · 1 fact. +90".
  - Ejemplo B: $5 M a 100 días → "Crítico · 1 fact. +90".
- Antigüedad:
  - columna nueva "Días prom.";
  - el Estado usa `estadoCuenta` con la marca y se ordena por peso del
    estado y, dentro del mismo estado, por días promedio;
  - los chips cuentan por `estadoCuenta`;
  - el texto de los chips y la nota al pie lo explican.
- `estadoAntiguedad(dias, lado)` no cambia: es la regla por días, que
  ahora usa `estadoCuenta`.

### 2. Pestaña Resumen (F41, F42, F45)

Pasa a ser la pestaña inicial. Las pestañas quedan en este orden: Resumen
· Cuentas · Antigüedad · Movimientos. La ruta `finanzasNueva` redirige a
`resumen`.

- **Posición** (hoy): A cobrar y A pagar lado a lado, con facturado,
  vencido, sin facturar, a favor / anticipos y neto. Al lado va la
  "Posición neta" (neto a cobrar − neto a pagar, en verde o rojo). Es el
  mismo cálculo que Cuentas.
- **Selector de mes** (‹ mes ›, no pasa del mes actual; "Mes actual"). Se
  recuerda en la sesión (`filtrosResumen.mes`).
- **Flujo del mes**, con los movimientos VIGENTES del mes:
  - cobrado, con retenciones sufridas y anticipos recibidos;
  - pagado (solo los pagos con concepto normal), con retenciones
    practicadas;
  - anticipos y préstamos entregados;
  - ajustes de cada lado;
  - neto de caja = dinero que entró − dinero que salió. Las retenciones
    no son dinero.
- **Evolución de 6 meses** hasta el mes elegido: Clientes (facturado vs
  cobrado) y Choferes y proveedores (facturado vs pagado).
  - El facturado se toma por la fecha de la factura (total del servicio);
    cobrado y pagado, por la fecha del movimiento (lo pagado incluye
    anticipos).
  - Barras CSS con leyenda y tooltip, con el mes elegido resaltado, y una
    tabla con los valores exactos debajo.
  - Colores: facturado #0d6efd y cobrado / pagado #20c997, validados
    para daltonismo.
- **Top 5** de cada lado por saldo vencido, con facturado, días
  promedio, estado y marca. Cada fila tiene "Ver".
- **Alertas** (solo las que tienen algo):
  - clientes con saldo a favor y facturas abiertas (se puede imputar);
  - anticipos o préstamos a choferes y proveedores sin compensar de más de
    60 días;
  - liquidaciones emitidas sin factura de más de 30 días (por la fecha de
    emisión; en demo hoy no aparecen porque G1 emitió con la fecha de la
    corrida, ver G4).
  Cada alerta muestra las 5 entidades de mayor importe, con "Ver".
- "Ver" abre la cuenta con `?origen=resumen`, y el botón dice
  "← Resumen".

**Lecturas:**
- Las cuentas y las alertas usan los mismos dos listeners que Cuentas
  (`observarBaseCuentas`, nuevo, que devuelve la base sin armar).
- Para el mes elegido, dos listeners por rango sobre los 6 meses:
  - movimientos por `fecha` (`observarMovimientosPorFecha`, ya existe);
  - InformeLiq por `factura.fecha` (`observarFacturadosPorFechaFactura`,
    nuevo).
  Son rangos sobre un solo campo, así que alcanza con los índices simples
  automáticos (sin índices nuevos). Al cambiar de mes, `switchMap` corta
  los listeners del mes anterior.

**Cálculos:** el util nuevo `shared/utils/resumen-finanzas.util.ts` es
puro y tiene:
- meses `'YYYY-MM'`: `mesDe`, `sumarMeses`, `mesesHasta`, `rangoDeMeses`,
  `nombreMes`, `nombreMesCorto`;
- `flujoDelMes`, `armarEvolucion`, `armarAlertas`.

En `cuentas-finanzas.util.ts` se suman `estadoCuenta`, `marcaCriticas`,
`PESO_ESTADO_ANTIGUEDAD` y `topVencidos`.

Sin índices ni reglas: NO hay deploy.

Ya verificado:

- tsc estricto (también sin locales sin uso), con stubs;
- prueba rápida:
  - los ejemplos A y B dan "Atención · 1 fact. +90" y "Crítico · 1 fact.
    +90";
  - top 5 ordenado por vencido y, a igual vencido, por días promedio;
  - flujo con retenciones, ajuste, anticipo de otro mes y un cobro
    anulado: el neto de caja da 700;
  - evolución por mes: no cuenta los revertidos;
  - las tres alertas;
  - meses: cambio de año, febrero bisiesto y 6 meses hacia atrás.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto BUSCAR no aparece, o aparece más de una vez: pará y reportá,
  sin improvisar.
- Archivos con finales de línea LF.
- Build: `npm run build:demo`.
- No toques CLAUDE.md ni CHANGELOG.
- `CuentaEntidadFin` suma tres campos obligatorios y `TotalesCuentas` uno.
  Con el PASO 0 revisá todos los lugares que arman esos objetos (incluidos
  `.spec.ts`, generadores y `.html`). Si aparece alguno que no está en esta
  instrucción, pará y reportá.
- La instrucción termina con la línea `FIN DE LA INSTRUCCIÓN F6b`. Si no la
  ves, llegó cortada: leela completa (por partes si hace falta) antes de
  empezar.

## PASO 0 — Verificación (sin cambios)

Corré y reportá la salida:

```bash
grep -rn "saldoMas60:" src/
grep -rn "estadoAntiguedad(" src/app
grep -rn "filtrosResumen\|observarBaseCuentas\|observarFacturadosPorFechaFactura\|FinanzasResumenComponent\|estadoCuenta\|topVencidos\|resumen-finanzas" src/app
ls src/app/raiz/finanzas-nueva/resumen src/app/shared/utils/resumen-finanzas.util.ts
grep -rn "finanzasNueva" src/app --include=*.html --include=*.ts | grep -v "src/app/raiz/finanzas-nueva/\|src/app/servicios/finanzas-nueva/"
```

Esperado:

- El grep 1: las mismas 6 líneas que en F6a (5 en `cuentas-finanzas.util.ts`
  y 1 en `cuenta-entidad.component.ts`).
- El grep 2: 5 líneas.
  - `cuentas-finanzas.util.ts`: la definición y su uso en
    `contarPorEstado`;
  - `finanzas-antiguedad.component.ts`: 3 usos (filtro y columna Estado).
- El grep 3: nada.
- El `ls`: no existen.
- El grep 5 (el link del sidebar y cualquier otro link al módulo):
  - si es `finanzasNueva` (sin pestaña): no se toca, la redirección lo
    lleva a Resumen;
  - si es `finanzasNueva/cuentas`: en el PASO 10 se cambia a
    `finanzasNueva/resumen`;
  - si aparece otra cosa (otra pestaña, varios links): pará y reportá.

Si algo no coincide, pará y reportá.

## PASO 1 — `src/app/shared/utils/cuentas-finanzas.util.ts`

#### 1a

BUSCAR:
```ts
  /** Días desde la factura abierta más antigua (null si no hay facturados abiertos). */
  diasMasAntiguo: number | null;
```

REEMPLAZAR:
```ts
  /** Días desde la factura abierta más antigua (null si no hay facturados abiertos). */
  diasMasAntiguo: number | null;
  /** Días promedio de las facturas abiertas, ponderados por saldo (F47):
   *  Σ saldo × días / Σ saldo, redondeado. null si no hay facturados
   *  abiertos con fecha válida. */
  diasPromedio: number | null;
  /** Saldo con factura de más de UMBRALES_ANTIGUEDAD[lado].atencion días
   *  (cobrar: +60, pagar: +15) — lo "vencido" según el lado (F6b). */
  saldoVencido: number;
  /** Facturas abiertas con más de UMBRALES_ANTIGUEDAD[lado].critico días
   *  (cobrar: +90, pagar: +30) — se marcan aunque el promedio sea bajo (F47). */
  cantidadCriticas: number;
```

#### 1b

BUSCAR:
```ts
  saldoMas60: number;
  tramos: Record<TramoAntiguedad, number>;
  sinFacturar: number;
```

REEMPLAZAR:
```ts
  saldoMas60: number;
  saldoVencido: number;
  tramos: Record<TramoAntiguedad, number>;
  sinFacturar: number;
```

#### 1c

BUSCAR:
```ts
  const mapa = new Map<string, CuentaEntidadFin>();
```

REEMPLAZAR:
```ts
  const mapa = new Map<string, CuentaEntidadFin>();
  /** Acumuladores del promedio ponderado por cuenta: Σ saldo × días y Σ saldo. */
  const ponderado = new Map<string, { suma: number; base: number }>();
```

#### 1d

BUSCAR:
```ts
        saldoFacturado: 0, cantidadFacturados: 0, saldoMas60: 0, tramos: tramosEnCero(), diasMasAntiguo: null,
        sinFacturar: 0, cantidadSinFacturar: 0, saldoAFavor: 0, neto: 0,
```

REEMPLAZAR:
```ts
        saldoFacturado: 0, cantidadFacturados: 0, saldoMas60: 0, tramos: tramosEnCero(), diasMasAntiguo: null,
        diasPromedio: null, saldoVencido: 0, cantidadCriticas: 0,
        sinFacturar: 0, cantidadSinFacturar: 0, saldoAFavor: 0, neto: 0,
```

#### 1e

BUSCAR:
```ts
      if (dias !== null) {
        if (dias > DIAS_ALERTA_ANTIGUEDAD) c.saldoMas60 = redondear2(c.saldoMas60 + saldo);
        c.diasMasAntiguo = c.diasMasAntiguo === null ? dias : Math.max(c.diasMasAntiguo, dias);
      }
```

REEMPLAZAR:
```ts
      if (dias !== null) {
        if (dias > DIAS_ALERTA_ANTIGUEDAD) c.saldoMas60 = redondear2(c.saldoMas60 + saldo);
        c.diasMasAntiguo = c.diasMasAntiguo === null ? dias : Math.max(c.diasMasAntiguo, dias);
        const u = UMBRALES_ANTIGUEDAD[c.lado];
        if (dias > u.atencion) c.saldoVencido = redondear2(c.saldoVencido + saldo);
        if (dias > u.critico) c.cantidadCriticas++;
        const p = ponderado.get(c.clave) ?? { suma: 0, base: 0 };
        p.suma += saldo * Math.max(dias, 0);
        p.base += saldo;
        ponderado.set(c.clave, p);
      }
```

#### 1f

BUSCAR:
```ts
  for (const c of cuentas) c.neto = redondear2(c.saldoFacturado - c.saldoAFavor);
```

REEMPLAZAR:
```ts
  for (const c of cuentas) {
    c.neto = redondear2(c.saldoFacturado - c.saldoAFavor);
    const p = ponderado.get(c.clave);
    c.diasPromedio = p && p.base > 0 ? Math.round(p.suma / p.base) : null;
  }
```

#### 1g

BUSCAR:
```ts
    cantidad: cuentas.length, saldoFacturado: 0, saldoMas60: 0, tramos: tramosEnCero(), sinFacturar: 0, saldoAFavor: 0, neto: 0,
  };
  for (const c of cuentas) {
    t.saldoFacturado += c.saldoFacturado;
    t.saldoMas60 += c.saldoMas60;
```

REEMPLAZAR:
```ts
    cantidad: cuentas.length, saldoFacturado: 0, saldoMas60: 0, saldoVencido: 0, tramos: tramosEnCero(),
    sinFacturar: 0, saldoAFavor: 0, neto: 0,
  };
  for (const c of cuentas) {
    t.saldoFacturado += c.saldoFacturado;
    t.saldoMas60 += c.saldoMas60;
    t.saldoVencido += c.saldoVencido;
```

#### 1h

BUSCAR:
```ts
    saldoMas60: redondear2(t.saldoMas60),
    tramos: {
```

REEMPLAZAR:
```ts
    saldoMas60: redondear2(t.saldoMas60),
    saldoVencido: redondear2(t.saldoVencido),
    tramos: {
```

#### 1i

BUSCAR:
```ts
/** Estado de una cuenta según los días de su factura abierta más antigua
 *  (F43). Reemplaza el "score de riesgo" del módulo viejo. */
```

REEMPLAZAR:
```ts
/** Estado de una cuenta (F43, F47). Reemplaza el "score de riesgo" del
 *  módulo viejo. Ver estadoCuenta. */
```

#### 1j

BUSCAR:
```ts
/** null si la cuenta no tiene facturas abiertas (sin días). */
export function estadoAntiguedad(
```

REEMPLAZAR:
```ts
/** Estado para una cantidad de días según los umbrales del lado. null si
 *  no hay días (cuenta sin facturas abiertas). */
export function estadoAntiguedad(
```

#### 1k

BUSCAR:
```ts
/** Cantidad de cuentas por estado (las sin facturas abiertas no cuentan). */
export function contarPorEstado(cuentas: CuentaEntidadFin[]): Record<EstadoAntiguedad, number> {
  const r: Record<EstadoAntiguedad, number> = { 'al-dia': 0, atencion: 0, critico: 0 };
  for (const c of cuentas) {
    const e = estadoAntiguedad(c.diasMasAntiguo, c.lado);
    if (e) r[e]++;
  }
  return r;
}
```

REEMPLAZAR:
```ts
/** Estado de la cuenta (F47): por los días PROMEDIO ponderados por saldo
 *  (cuánto de la deuda está atrasada, no solo la factura más vieja). Si
 *  alguna factura supera el umbral crítico, sube como mínimo a 'atencion'
 *  (una factura trabada no queda oculta en el promedio). null si no hay
 *  facturas abiertas con fecha válida. */
export function estadoCuenta(c: CuentaEntidadFin): EstadoAntiguedad | null {
  const e = estadoAntiguedad(c.diasPromedio, c.lado);
  if (e === 'al-dia' && c.cantidadCriticas > 0) return 'atencion';
  return e;
}

/** Peso del estado para ordenar (crítico primero en orden descendente). */
export const PESO_ESTADO_ANTIGUEDAD: Readonly<Record<EstadoAntiguedad, number>> = {
  'al-dia': 1, atencion: 2, critico: 3,
};

/** "2 fact. +90" / "1 fact. +30" — marca de facturas críticas ('' si no hay). */
export function marcaCriticas(c: CuentaEntidadFin): string {
  return c.cantidadCriticas > 0 ? `${c.cantidadCriticas} fact. +${UMBRALES_ANTIGUEDAD[c.lado].critico}` : '';
}

/** Cantidad de cuentas por estado (las sin facturas abiertas no cuentan). */
export function contarPorEstado(cuentas: CuentaEntidadFin[]): Record<EstadoAntiguedad, number> {
  const r: Record<EstadoAntiguedad, number> = { 'al-dia': 0, atencion: 0, critico: 0 };
  for (const c of cuentas) {
    const e = estadoCuenta(c);
    if (e) r[e]++;
  }
  return r;
}

/** Top N por saldo vencido (> 0) del lado, de mayor a menor; a igual
 *  vencido, más días promedio primero (Resumen, F6b). */
export function topVencidos(cuentas: CuentaEntidadFin[], lado: LadoCuenta, n = 5): CuentaEntidadFin[] {
  return cuentas
    .filter(c => c.lado === lado && c.saldoVencido > 0)
    .sort((a, b) => b.saldoVencido - a.saldoVencido || (b.diasPromedio ?? 0) - (a.diasPromedio ?? 0))
    .slice(0, n);
}
```

## PASO 2 — NUEVO `src/app/shared/utils/resumen-finanzas.util.ts`

```ts
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { MovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { CuentaEntidadFin, ladoDe } from 'src/app/shared/utils/cuentas-finanzas.util';
import { nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';
import { diasEntre, esCero, normalizarValoresFinancieros, redondear2 } from 'src/app/shared/utils/finanzas.util';

/** Resumen de Finanzas (F6b) — utils PUROS. Flujo de un mes, evolución de
 *  los últimos meses y alertas. Calculado al consultar (sin agregados).
 *  Meses como 'YYYY-MM'; fechas 'YYYY-MM-DD' (nunca new Date(string)).
 *  Diseño: claude/diseno-finanzas.md §19.2. */

/** Meses de la evolución (F41). */
export const MESES_EVOLUCION = 6;
/** Anticipos / préstamos sin compensar de más de estos días → alerta. */
export const DIAS_ALERTA_ANTICIPO = 60;
/** Liquidaciones emitidas sin factura de más de estos días → alerta. */
export const DIAS_ALERTA_SIN_FACTURAR = 30;

const NOMBRE_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// ---------------------------------------------------------------------------
// Meses
// ---------------------------------------------------------------------------

function partes(mes: string): { anio: number; mes: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(mes);
  if (!m) throw new Error(`Mes inválido: ${mes}`);
  return { anio: Number(m[1]), mes: Number(m[2]) };
}

function armar(anio: number, mes: number): string {
  return `${anio}-${String(mes).padStart(2, '0')}`;
}

/** 'YYYY-MM' de una fecha 'YYYY-MM-DD'. */
export function mesDe(fecha: string): string {
  return fecha.slice(0, 7);
}

/** Suma `delta` meses (negativo = hacia atrás). */
export function sumarMeses(mes: string, delta: number): string {
  const p = partes(mes);
  const total = p.anio * 12 + (p.mes - 1) + delta;
  return armar(Math.floor(total / 12), (total % 12) + 1);
}

/** Los `n` meses que terminan en `mes`, del más viejo al más nuevo. */
export function mesesHasta(mes: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => sumarMeses(mes, i - n + 1));
}

/** Primer y último día de un rango de meses ('YYYY-MM-DD'). */
export function rangoDeMeses(desde: string, hasta: string): { desde: string; hasta: string } {
  const p = partes(hasta);
  const ultimo = new Date(Date.UTC(p.anio, p.mes, 0)).getUTCDate();   // día 0 del mes siguiente
  return { desde: `${desde}-01`, hasta: `${hasta}-${String(ultimo).padStart(2, '0')}` };
}

/** "Octubre 2026". */
export function nombreMes(mes: string): string {
  const p = partes(mes);
  return `${NOMBRE_MES[p.mes - 1]} ${p.anio}`;
}

/** "Oct 26" — para el eje del gráfico. */
export function nombreMesCorto(mes: string): string {
  const p = partes(mes);
  return `${NOMBRE_MES[p.mes - 1].slice(0, 3)} ${String(p.anio).slice(2)}`;
}

// ---------------------------------------------------------------------------
// Flujo del mes
// ---------------------------------------------------------------------------

/** Lo que entró y salió en un mes, por movimientos VIGENTES (F42). */
export interface FlujoMes {
  cobrado: number;                 // Σ total de cobros (todos los conceptos, con retenciones)
  cantidadCobros: number;
  retencionesSufridas: number;     // parte de `cobrado` en medios 'retencion' (no es dinero)
  anticiposRecibidos: number;      // parte de `cobrado` con concepto anticipo
  pagado: number;                  // Σ total de pagos concepto 'normal'
  cantidadPagos: number;
  anticiposEntregados: number;     // Σ total de pagos concepto anticipo / préstamo
  cantidadAnticipos: number;
  retencionesPracticadas: number;  // medios 'retencion' de pagos y anticipos
  ajustesCobrar: number;           // ajustes a clientes (bajan lo que nos deben)
  ajustesPagar: number;            // ajustes a choferes / proveedores
  /** Dinero que entró − dinero que salió (las retenciones no son dinero). */
  netoCaja: number;
}

function retencionesDe(m: MovimientoFin): number {
  return (m.medios ?? []).filter(x => x.tipo === 'retencion').reduce((a, x) => a + x.importe, 0);
}

export function flujoDelMes(movimientos: MovimientoFin[], mes: string): FlujoMes {
  const f: FlujoMes = {
    cobrado: 0, cantidadCobros: 0, retencionesSufridas: 0, anticiposRecibidos: 0,
    pagado: 0, cantidadPagos: 0, anticiposEntregados: 0, cantidadAnticipos: 0, retencionesPracticadas: 0,
    ajustesCobrar: 0, ajustesPagar: 0, netoCaja: 0,
  };
  for (const m of movimientos) {
    if (m.estado !== 'vigente' || mesDe(m.fecha) !== mes) continue;
    if (m.tipo === 'cobro') {
      f.cobrado += m.total;
      f.cantidadCobros++;
      f.retencionesSufridas += retencionesDe(m);
      if (m.concepto !== 'normal') f.anticiposRecibidos += m.total;
    } else if (m.tipo === 'pago') {
      if (m.concepto === 'normal') {
        f.pagado += m.total;
        f.cantidadPagos++;
      } else {
        f.anticiposEntregados += m.total;
        f.cantidadAnticipos++;
      }
      f.retencionesPracticadas += retencionesDe(m);
    } else if (ladoDe(m.entidad.tipo) === 'cobrar') {
      f.ajustesCobrar += m.total;
    } else {
      f.ajustesPagar += m.total;
    }
  }
  const entro = f.cobrado - f.retencionesSufridas;
  const salio = f.pagado + f.anticiposEntregados - f.retencionesPracticadas;
  return {
    cobrado: redondear2(f.cobrado),
    cantidadCobros: f.cantidadCobros,
    retencionesSufridas: redondear2(f.retencionesSufridas),
    anticiposRecibidos: redondear2(f.anticiposRecibidos),
    pagado: redondear2(f.pagado),
    cantidadPagos: f.cantidadPagos,
    anticiposEntregados: redondear2(f.anticiposEntregados),
    cantidadAnticipos: f.cantidadAnticipos,
    retencionesPracticadas: redondear2(f.retencionesPracticadas),
    ajustesCobrar: redondear2(f.ajustesCobrar),
    ajustesPagar: redondear2(f.ajustesPagar),
    netoCaja: redondear2(entro - salio),
  };
}

// ---------------------------------------------------------------------------
// Evolución (F41)
// ---------------------------------------------------------------------------

export interface EvolucionMes {
  mes: string;
  facturadoCobrar: number;   // Σ total de liquidaciones de clientes facturadas en el mes (fecha de la factura)
  cobrado: number;           // Σ total de cobros vigentes del mes
  facturadoPagar: number;    // Σ total de liquidaciones de choferes / proveedores facturadas en el mes
  pagado: number;            // Σ total de pagos vigentes del mes (incluye anticipos: es dinero que salió)
}

/** Una fila por mes de `meses`. `facturados`: InformeLiq con factura (se
 *  cuentan solo los 'facturado', por la fecha de la factura y su total del
 *  servicio). `movimientos`: los del rango (se cuentan los vigentes). */
export function armarEvolucion(
  meses: string[],
  facturados: InformeLiqNuevo[],
  movimientos: MovimientoFin[],
): EvolucionMes[] {
  const filas = new Map<string, EvolucionMes>(
    meses.map(mes => [mes, { mes, facturadoCobrar: 0, cobrado: 0, facturadoPagar: 0, pagado: 0 }]),
  );
  for (const liq of facturados) {
    if (liq.estado !== 'facturado' || !liq.factura?.fecha) continue;
    const fila = filas.get(mesDe(liq.factura.fecha));
    if (!fila) continue;
    const total = normalizarValoresFinancieros(liq.valoresFinancieros, liq.valores.total).total;
    if (ladoDe(liq.tipo) === 'cobrar') fila.facturadoCobrar += total;
    else fila.facturadoPagar += total;
  }
  for (const m of movimientos) {
    if (m.estado !== 'vigente' || m.tipo === 'ajuste') continue;
    const fila = filas.get(mesDe(m.fecha));
    if (!fila) continue;
    if (m.tipo === 'cobro') fila.cobrado += m.total;
    else fila.pagado += m.total;
  }
  return meses.map(mes => {
    const f = filas.get(mes)!;
    return {
      mes,
      facturadoCobrar: redondear2(f.facturadoCobrar),
      cobrado: redondear2(f.cobrado),
      facturadoPagar: redondear2(f.facturadoPagar),
      pagado: redondear2(f.pagado),
    };
  });
}

// ---------------------------------------------------------------------------
// Alertas
// ---------------------------------------------------------------------------

export interface ItemAlerta {
  tipo: CuentaEntidadFin['tipo'];
  idEntidad: string;
  nombre: string;
  importe: number;
  detalle: string;
}

export interface AlertaFinanzas {
  id: 'saldoAFavor' | 'anticipos' | 'sinFacturar';
  titulo: string;
  descripcion: string;
  cantidad: number;          // entidades
  importe: number;
  items: ItemAlerta[];       // las 5 de mayor importe
}

const MAX_ITEMS_ALERTA = 5;

function cerrarAlerta(
  id: AlertaFinanzas['id'],
  titulo: string,
  descripcion: string,
  porEntidad: Map<string, ItemAlerta>,
): AlertaFinanzas {
  const items = [...porEntidad.values()].sort((a, b) => b.importe - a.importe);
  return {
    id, titulo, descripcion,
    cantidad: items.length,
    importe: redondear2(items.reduce((a, i) => a + i.importe, 0)),
    items: items.slice(0, MAX_ITEMS_ALERTA).map(i => ({ ...i, importe: redondear2(i.importe) })),
  };
}

/** Alertas del Resumen (solo las que tienen algo):
 *  1. Clientes con saldo a favor Y facturas abiertas: se puede imputar.
 *  2. Anticipos / préstamos a choferes o proveedores sin compensar de más
 *     de DIAS_ALERTA_ANTICIPO días (por la fecha del movimiento).
 *  3. Liquidaciones emitidas sin factura de más de DIAS_ALERTA_SIN_FACTURAR
 *     días (por la fecha de emisión), de los dos lados.
 *  `informes`: los abiertos (emitidos + facturados con saldo).
 *  `movimientos`: los vigentes con saldo sin imputar. */
export function armarAlertas(
  cuentas: CuentaEntidadFin[],
  informes: InformeLiqNuevo[],
  movimientos: MovimientoFin[],
  hoy: string,
): AlertaFinanzas[] {
  const alertas: AlertaFinanzas[] = [];

  const aFavor = new Map<string, ItemAlerta>();
  for (const c of cuentas) {
    if (c.lado !== 'cobrar' || c.saldoAFavor <= 0 || c.saldoFacturado <= 0) continue;
    aFavor.set(c.clave, {
      tipo: c.tipo, idEntidad: c.idEntidad, nombre: c.nombre,
      importe: Math.min(c.saldoAFavor, c.saldoFacturado),
      detalle: `a favor ${pesos(c.saldoAFavor)} · facturado abierto ${pesos(c.saldoFacturado)}`,
    });
  }
  if (aFavor.size) {
    alertas.push(cerrarAlerta('saldoAFavor', 'Saldo a favor para imputar',
      'Clientes con saldo a favor y facturas abiertas: se puede imputar (importe = lo que se puede aplicar).', aFavor));
  }

  const anticipos = new Map<string, ItemAlerta>();
  for (const m of movimientos) {
    if (m.estado !== 'vigente' || m.tipo !== 'pago' || m.concepto === 'normal' || esCero(m.sinImputar)) continue;
    const dias = diasSeguros(m.fecha, hoy);
    if (dias === null || dias <= DIAS_ALERTA_ANTICIPO) continue;
    const clave = `${m.entidad.tipo}_${m.entidad.id}`;
    const item = anticipos.get(clave) ?? {
      tipo: m.entidad.tipo, idEntidad: m.entidad.id, nombre: m.entidad.razonSocial, importe: 0, detalle: '',
    };
    item.importe += m.sinImputar;
    item.detalle = item.detalle ? `${item.detalle}, ${m.numero} (${dias} d)` : `${m.numero} (${dias} d)`;
    anticipos.set(clave, item);
  }
  if (anticipos.size) {
    alertas.push(cerrarAlerta('anticipos', `Anticipos sin compensar (+${DIAS_ALERTA_ANTICIPO} días)`,
      'Anticipos o préstamos a choferes y proveedores que todavía no se compensaron en una liquidación.', anticipos));
  }

  const sinFacturar = new Map<string, ItemAlerta>();
  for (const liq of informes) {
    if (liq.estado !== 'emitido') continue;
    const dias = diasSeguros(liq.fechaEmision ?? liq.fechaCreacion, hoy);
    if (dias === null || dias <= DIAS_ALERTA_SIN_FACTURAR) continue;
    const saldo = normalizarValoresFinancieros(liq.valoresFinancieros, liq.valores.total).saldo;
    const clave = `${liq.tipo}_${liq.entidad.id}`;
    const item = sinFacturar.get(clave) ?? {
      tipo: liq.tipo, idEntidad: liq.entidad.id, nombre: nombreEntidadRef(liq.entidad), importe: 0, detalle: '',
    };
    item.importe += saldo;
    const ref = `${liq.numeroInterno ?? 'sin número'} (${dias} d)`;
    item.detalle = item.detalle ? `${item.detalle}, ${ref}` : ref;
    sinFacturar.set(clave, item);
  }
  if (sinFacturar.size) {
    alertas.push(cerrarAlerta('sinFacturar', `Emitido sin facturar (+${DIAS_ALERTA_SIN_FACTURAR} días)`,
      'Liquidaciones emitidas que todavía no tienen factura: no se pueden cobrar ni pagar.', sinFacturar));
  }

  return alertas;
}

/** "$ 1.234,50" (es-AR) — para textos armados en el util. */
function pesos(v: number): string {
  return `$ ${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function diasSeguros(fecha: string | null | undefined, hoy: string): number | null {
  if (!fecha) return null;
  try {
    return diasEntre(fecha, hoy);
  } catch {
    return null;
  }
}
```

## PASO 3 — `src/app/servicios/finanzas-nueva/finanzas-consulta.service.ts`

#### 3a

BUSCAR:
```ts
import { FiltrosMovimientosFin, rangoInicialMovimientos } from 'src/app/shared/utils/movimiento-fin.util';
```

REEMPLAZAR:
```ts
import { FiltrosMovimientosFin, rangoInicialMovimientos } from 'src/app/shared/utils/movimiento-fin.util';
import { mesDe } from 'src/app/shared/utils/resumen-finanzas.util';
```

#### 3b

BUSCAR:
```ts
  /** Filtros de la pestaña Antigüedad (F6a), recordados durante la sesión. */
```

REEMPLAZAR:
```ts
  /** Resumen (F6b): mes del flujo y de la evolución ('YYYY-MM'), recordado
   *  durante la sesión. Arranca en el mes actual. */
  filtrosResumen: { mes: string } = { mes: mesDe(toISODateString(new Date())) };

  /** Filtros de la pestaña Antigüedad (F6a), recordados durante la sesión. */
```

#### 3c

BUSCAR:
```ts
  /** En vivo: una cuenta por entidad (ver armarCuentas). `hoy` en
   *  'YYYY-MM-DD' (toISODateString). */
```

REEMPLAZAR:
```ts
  /** En vivo (F6b): la base de las cuentas sin armar — informes abiertos +
   *  movimientos vigentes con saldo. El Resumen la usa para las cuentas y
   *  las alertas con los mismos dos listeners. */
  observarBaseCuentas(): Observable<{ informes: ConId<InformeLiqNuevo>[]; movimientos: ConId<MovimientoFin>[] }> {
    return combineLatest([this.observarInformesAbiertos(), this.observarMovimientosConSaldo()]).pipe(
      map(([informes, movimientos]) => ({ informes, movimientos })),
    );
  }

  /** En vivo (F6b): InformeLiq con `factura.fecha` en [desde, hasta]
   *  ('YYYY-MM-DD'). Rango sobre un solo campo (anidado) → índice simple
   *  automático. Trae todos los estados que tengan factura; el que llama
   *  filtra 'facturado'. Para la evolución del Resumen (6 meses). */
  observarFacturadosPorFechaFactura(desde: string, hasta: string): Observable<ConId<InformeLiqNuevo>[]> {
    return this.db.observarPorRango<InformeLiqNuevo>(this.COL_LIQ, 'factura.fecha', desde, hasta).pipe(
      map(items => items.map(i => ({ ...i, idInfLiq: i.id }))),
    );
  }

  /** En vivo: una cuenta por entidad (ver armarCuentas). `hoy` en
   *  'YYYY-MM-DD' (toISODateString). */
```

## PASO 4 — `src/app/raiz/finanzas-nueva/antiguedad/finanzas-antiguedad.component.ts`

#### 4a

BUSCAR:
```ts
  contarPorEstado, estadoAntiguedad, etiquetaEstadoAntiguedad, porcentajesTramos, rangoEstadoAntiguedad,
```

REEMPLAZAR:
```ts
  PESO_ESTADO_ANTIGUEDAD, contarPorEstado, estadoCuenta, etiquetaEstadoAntiguedad, marcaCriticas, porcentajesTramos,
  rangoEstadoAntiguedad,
```

#### 4b

BUSCAR:
```ts
 *  tramos). Estado por días de la factura más antigua, con umbrales por lado
```

REEMPLAZAR:
```ts
 *  tramos). Estado por días PROMEDIO ponderados por saldo (F47; una factura
 *  crítica lo sube como mínimo a atención), con umbrales por lado
```

#### 4c

BUSCAR:
```ts
      (estado === 'todos' || estadoAntiguedad(c.diasMasAntiguo, c.lado) === estado) &&
```

REEMPLAZAR:
```ts
      (estado === 'todos' || estadoCuenta(c) === estado) &&
```

#### 4d

BUSCAR:
```ts
        key: 'diasMasAntiguo', label: 'Más antigua (días)', valor: c => c.diasMasAntiguo ?? '—', orden: c => c.diasMasAntiguo ?? -1,
        tipo: 'numero', align: 'center',
      },
```

REEMPLAZAR:
```ts
        key: 'diasMasAntiguo', label: 'Más antigua (días)', valor: c => c.diasMasAntiguo ?? '—', orden: c => c.diasMasAntiguo ?? -1,
        tipo: 'numero', align: 'center',
      },
      {
        key: 'diasPromedio', label: 'Días prom.', valor: c => c.diasPromedio ?? '—', orden: c => c.diasPromedio ?? -1,
        tipo: 'numero', align: 'center', clase: 'fw-semibold',
      },
```

#### 4e

BUSCAR:
```ts
        valor: c => {
          const e = estadoAntiguedad(c.diasMasAntiguo, c.lado);
          return e ? etiquetaEstadoAntiguedad(e, c.lado) : '—';
        },
        orden: c => c.diasMasAntiguo ?? -1,
        clase: c => {
          const e = estadoAntiguedad(c.diasMasAntiguo, c.lado);
          return e ? CLASE_ESTADO_ANTIGUEDAD[e] : '';
        },
```

REEMPLAZAR:
```ts
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
```

## PASO 5 — `src/app/raiz/finanzas-nueva/antiguedad/finanzas-antiguedad.component.html`

#### 5a

BUSCAR:
```html
  <span class="text-muted me-1">Estado (factura más antigua):</span>
```

REEMPLAZAR:
```html
  <span class="text-muted me-1">Estado (días promedio):</span>
```

#### 5b

BUSCAR:
```html
  son referencia: no entran en los tramos. Tarjetas, barra y estados son del lado completo (no cambian con el buscador).
```

REEMPLAZAR:
```html
  son referencia: no entran en los tramos. Tarjetas, barra y estados son del lado completo (no cambian con el buscador).
  <b>Días prom.:</b> antigüedad promedio de las facturas abiertas, ponderada por saldo (una factura grande pesa más).
  El <b>estado</b> sale de ese promedio; si alguna factura pasa el último umbral, el estado es como mínimo "Atención" y
  se indica cuántas son ("N fact. +{{ filtros.lado === 'cobrar' ? 90 : 30 }}").
```

## PASO 6 — NUEVO `src/app/raiz/finanzas-nueva/resumen/`

### 6a — `finanzas-resumen.component.ts`

```ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Subject, combineLatest, map, switchMap, takeUntil } from 'rxjs';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { FinanzasConsultaService } from 'src/app/servicios/finanzas-nueva/finanzas-consulta.service';
import {
  CLASE_ESTADO_ANTIGUEDAD, CuentaEntidadFin, EstadoAntiguedad, LadoCuenta, TotalesCuentas, UMBRALES_ANTIGUEDAD,
  armarCuentas, estadoCuenta, etiquetaEstadoAntiguedad, marcaCriticas, topVencidos, totalizarCuentas,
} from 'src/app/shared/utils/cuentas-finanzas.util';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import {
  AlertaFinanzas, EvolucionMes, FlujoMes, MESES_EVOLUCION, armarAlertas, armarEvolucion, flujoDelMes,
  mesDe, mesesHasta, nombreMes, nombreMesCorto, rangoDeMeses, sumarMeses,
} from 'src/app/shared/utils/resumen-finanzas.util';

/** Barra del gráfico de evolución (alto en % del máximo del gráfico). */
interface BarraEvolucion {
  mes: string;
  etiqueta: string;
  facturado: number;
  movido: number;            // cobrado (A cobrar) / pagado (A pagar)
  altoFacturado: number;
  altoMovido: number;
  tituloFacturado: string;     // tooltip
  tituloMovido: string;
}

function pesos(v: number): string {
  return `$ ${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Finanzas → Resumen (F6b, pestaña inicial): tablero de lectura.
 *  - Posición A cobrar / A pagar (mismo cálculo que Cuentas).
 *  - Flujo del mes elegido (F42, recordado en la sesión).
 *  - Top 5 por saldo vencido de cada lado, con estado (F47).
 *  - Alertas (saldo a favor para imputar, anticipos viejos, emitido sin
 *    facturar).
 *  - Evolución de los 6 meses que terminan en el mes elegido (F41):
 *    facturado vs cobrado / pagado, barras CSS + tabla.
 *  Lecturas: informes abiertos + movimientos con saldo (como Cuentas) y, por
 *  mes elegido, movimientos y facturados del rango de 6 meses. */
@Component({
  selector: 'app-finanzas-resumen',
  standalone: false,
  templateUrl: './finanzas-resumen.component.html',
  styleUrl: './finanzas-resumen.component.scss',
})
export class FinanzasResumenComponent implements OnInit, OnDestroy {

  readonly hoy = toISODateString(new Date());
  readonly hoyLegible = fechaComprobanteLegible(this.hoy);
  readonly mesActual = mesDe(this.hoy);
  readonly umbrales = UMBRALES_ANTIGUEDAD;

  totalesCobrar: TotalesCuentas = totalizarCuentas([]);
  totalesPagar: TotalesCuentas = totalizarCuentas([]);
  topCobrar: CuentaEntidadFin[] = [];
  topPagar: CuentaEntidadFin[] = [];
  alertas: AlertaFinanzas[] = [];
  flujo: FlujoMes | null = null;
  evolucion: EvolucionMes[] = [];
  barrasCobrar: BarraEvolucion[] = [];
  barrasPagar: BarraEvolucion[] = [];

  cargandoBase = true;
  cargandoMes = true;
  error: string | null = null;

  private mes$!: BehaviorSubject<string>;
  private destroy$ = new Subject<void>();

  constructor(
    private consulta: FinanzasConsultaService,
    private router: Router,
  ) {}

  get mes(): string {
    return this.consulta.filtrosResumen.mes;
  }

  get nombreMesElegido(): string {
    return nombreMes(this.mes);
  }

  get esMesActual(): boolean {
    return this.mes >= this.mesActual;
  }

  /** Nos deben − les debemos (facturado abierto neto de saldos a favor). */
  get posicionNeta(): number {
    return Math.round((this.totalesCobrar.neto - this.totalesPagar.neto) * 100) / 100;
  }

  ngOnInit(): void {
    this.consulta.observarBaseCuentas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ informes, movimientos }) => {
          const cuentas = armarCuentas(informes, movimientos, this.hoy);
          this.totalesCobrar = totalizarCuentas(cuentas.filter(c => c.lado === 'cobrar' && this.tieneAlgo(c)));
          this.totalesPagar = totalizarCuentas(cuentas.filter(c => c.lado === 'pagar' && this.tieneAlgo(c)));
          this.topCobrar = topVencidos(cuentas, 'cobrar');
          this.topPagar = topVencidos(cuentas, 'pagar');
          this.alertas = armarAlertas(cuentas, informes, movimientos, this.hoy);
          this.cargandoBase = false;
        },
        error: e => this.fallo(e),
      });

    this.mes$ = new BehaviorSubject<string>(this.mes);
    this.mes$
      .pipe(
        switchMap(mes => {
          this.cargandoMes = true;
          const meses = mesesHasta(mes, MESES_EVOLUCION);
          const rango = rangoDeMeses(meses[0], meses[meses.length - 1]);
          return combineLatest([
            this.consulta.observarMovimientosPorFecha(rango.desde, rango.hasta),
            this.consulta.observarFacturadosPorFechaFactura(rango.desde, rango.hasta),
          ]).pipe(
            // el mes viaja con los datos; si cambia en el medio, switchMap corta el listener viejo
            map(([movimientos, facturados]) => ({ mes, meses, movimientos, facturados })),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: ({ mes, meses, movimientos, facturados }) => {
          this.flujo = flujoDelMes(movimientos, mes);
          this.evolucion = armarEvolucion(meses, facturados, movimientos);
          this.barrasCobrar = this.armarBarras('cobrar');
          this.barrasPagar = this.armarBarras('pagar');
          this.cargandoMes = false;
        },
        error: e => this.fallo(e),
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Mes anterior / siguiente (no pasa del mes actual). */
  moverMes(delta: number): void {
    const nuevo = sumarMeses(this.mes, delta);
    if (nuevo > this.mesActual) return;
    this.cambiarMes(nuevo);
  }

  irAlMesActual(): void {
    this.cambiarMes(this.mesActual);
  }

  estadoDe(c: CuentaEntidadFin): { texto: string; clase: string } {
    const e: EstadoAntiguedad | null = estadoCuenta(c);
    if (!e) return { texto: '—', clase: '' };
    return { texto: etiquetaEstadoAntiguedad(e, c.lado), clase: CLASE_ESTADO_ANTIGUEDAD[e] };
  }

  marca(c: CuentaEntidadFin): string {
    return marcaCriticas(c);
  }

  nombreCorto(mes: string): string {
    return nombreMesCorto(mes);
  }

  verCuenta(tipo: CuentaEntidadFin['tipo'], idEntidad: string): void {
    this.router.navigate(['/finanzasNueva/cuenta', tipo, idEntidad], { queryParams: { origen: 'resumen' } });
  }

  trackMes = (_: number, b: { mes: string }) => b.mes;

  private cambiarMes(mes: string): void {
    if (mes === this.mes) return;
    this.consulta.filtrosResumen.mes = mes;
    this.mes$.next(mes);
  }

  /** Cuentas que suman en la posición: algo facturado, sin facturar o a favor. */
  private tieneAlgo(c: CuentaEntidadFin): boolean {
    return c.saldoFacturado > 0 || c.sinFacturar > 0 || c.saldoAFavor > 0;
  }

  private armarBarras(lado: LadoCuenta): BarraEvolucion[] {
    const movido = lado === 'cobrar' ? 'Cobrado' : 'Pagado';
    const filas = this.evolucion.map(e => ({
      mes: e.mes,
      facturado: lado === 'cobrar' ? e.facturadoCobrar : e.facturadoPagar,
      movido: lado === 'cobrar' ? e.cobrado : e.pagado,
    }));
    const max = Math.max(0, ...filas.map(f => Math.max(f.facturado, f.movido)));
    const alto = (v: number) => (max > 0 ? Math.round((v / max) * 1000) / 10 : 0);
    return filas.map(f => ({
      ...f,
      etiqueta: nombreMesCorto(f.mes),
      altoFacturado: alto(f.facturado),
      altoMovido: alto(f.movido),
      tituloFacturado: `${nombreMesCorto(f.mes)} · Facturado: ${pesos(f.facturado)}`,
      tituloMovido: `${nombreMesCorto(f.mes)} · ${movido}: ${pesos(f.movido)}`,
    }));
  }

  private fallo(e: any): void {
    console.error('Error al leer el resumen de Finanzas', e);
    this.error = `No se pudo leer el resumen: ${e?.message ?? e}`;
    this.cargandoBase = false;
    this.cargandoMes = false;
  }
}
```

### 6b — `finanzas-resumen.component.html`

```html
@if (error) {
  <div class="alert alert-danger mt-3">{{ error }}</div>
}

<!-- Posición -->
<h5 class="mt-3 mb-2">Posición al {{ hoyLegible }}</h5>
<div class="row g-3 mb-4">
  @for (lado of ['cobrar', 'pagar']; track lado) {
    @let t = lado === 'cobrar' ? totalesCobrar : totalesPagar;
    <div class="col-12 col-lg-5">
      <div class="card h-100 tarjeta" [ngClass]="lado === 'cobrar' ? 'lado-cobrar' : 'lado-pagar'">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-baseline">
            <h6 class="mb-2">{{ lado === 'cobrar' ? 'A cobrar · Clientes' : 'A pagar · Choferes y proveedores' }}</h6>
            <span class="text-muted small">{{ t.cantidad }} cuenta(s)</span>
          </div>
          <table class="table table-sm mb-0 posicion">
            <tbody>
              <tr>
                <td>{{ lado === 'cobrar' ? 'Nos deben (facturado)' : 'Les debemos (facturado)' }}</td>
                <td class="text-end fw-semibold">{{ t.saldoFacturado | formatearValor: '$' }}</td>
              </tr>
              <tr>
                <td>Vencido (+{{ lado === 'cobrar' ? umbrales.cobrar.atencion : umbrales.pagar.atencion }} días)</td>
                <td class="text-end" [class.text-danger]="t.saldoVencido > 0">{{ t.saldoVencido | formatearValor: '$' }}</td>
              </tr>
              <tr>
                <td class="text-muted">Emitido sin facturar</td>
                <td class="text-end text-muted">{{ t.sinFacturar | formatearValor: '$' }}</td>
              </tr>
              <tr>
                <td>{{ lado === 'cobrar' ? 'Saldo a favor de clientes' : 'Anticipos entregados' }}</td>
                <td class="text-end">− {{ t.saldoAFavor | formatearValor: '$' }}</td>
              </tr>
              <tr class="fw-bold">
                <td>Neto (facturado − {{ lado === 'cobrar' ? 'a favor' : 'anticipos' }})</td>
                <td class="text-end">{{ t.neto | formatearValor: '$' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  }
  <div class="col-12 col-lg-2">
    <div class="card h-100 tarjeta tarjeta-neta">
      <div class="card-body d-flex flex-column justify-content-center">
        <div class="tarjeta-label">Posición neta</div>
        <div class="tarjeta-valor" [ngClass]="posicionNeta >= 0 ? 'text-success' : 'text-danger'">
          {{ posicionNeta | formatearValor: '$' }}
        </div>
        <div class="tarjeta-label">neto a cobrar − neto a pagar</div>
      </div>
    </div>
  </div>
</div>

<!-- Selector de mes -->
<div class="d-flex flex-wrap gap-2 align-items-center mb-3">
  <h5 class="mb-0 me-2">Flujo del mes</h5>
  <div class="btn-group" role="group" aria-label="Mes">
    <button type="button" class="btn btn-outline-secondary" (click)="moverMes(-1)" title="Mes anterior">‹</button>
    <span class="btn btn-outline-secondary disabled mes-elegido">{{ nombreMesElegido }}</span>
    <button type="button" class="btn btn-outline-secondary" (click)="moverMes(1)" [disabled]="esMesActual" title="Mes siguiente">›</button>
  </div>
  @if (!esMesActual) {
    <button type="button" class="btn btn-sm btn-link" (click)="irAlMesActual()">Mes actual</button>
  } @else {
    <span class="badge bg-light text-dark border">en curso</span>
  }
</div>

<!-- Flujo del mes -->
@if (flujo; as f) {
  <div class="row g-3 mb-4" [class.opacity-50]="cargandoMes">
    <div class="col-6 col-lg">
      <div class="card h-100 tarjeta lado-cobrar">
        <div class="card-body">
          <div class="tarjeta-label">Cobrado ({{ f.cantidadCobros }})</div>
          <div class="tarjeta-valor">{{ f.cobrado | formatearValor: '$' }}</div>
          <div class="tarjeta-detalle">retenciones sufridas {{ f.retencionesSufridas | formatearValor: '$' }}</div>
          @if (f.anticiposRecibidos > 0) {
            <div class="tarjeta-detalle">anticipos recibidos {{ f.anticiposRecibidos | formatearValor: '$' }}</div>
          }
        </div>
      </div>
    </div>
    <div class="col-6 col-lg">
      <div class="card h-100 tarjeta lado-pagar">
        <div class="card-body">
          <div class="tarjeta-label">Pagado ({{ f.cantidadPagos }})</div>
          <div class="tarjeta-valor">{{ f.pagado | formatearValor: '$' }}</div>
          <div class="tarjeta-detalle">retenciones practicadas {{ f.retencionesPracticadas | formatearValor: '$' }}</div>
        </div>
      </div>
    </div>
    <div class="col-6 col-lg">
      <div class="card h-100 tarjeta lado-anticipo">
        <div class="card-body">
          <div class="tarjeta-label">Anticipos / préstamos entregados ({{ f.cantidadAnticipos }})</div>
          <div class="tarjeta-valor">{{ f.anticiposEntregados | formatearValor: '$' }}</div>
        </div>
      </div>
    </div>
    <div class="col-6 col-lg">
      <div class="card h-100 tarjeta lado-ajuste">
        <div class="card-body">
          <div class="tarjeta-label">Ajustes</div>
          <div class="tarjeta-detalle">a clientes {{ f.ajustesCobrar | formatearValor: '$' }}</div>
          <div class="tarjeta-detalle">a choferes / proveedores {{ f.ajustesPagar | formatearValor: '$' }}</div>
        </div>
      </div>
    </div>
    <div class="col-12 col-lg">
      <div class="card h-100 tarjeta tarjeta-neta">
        <div class="card-body">
          <div class="tarjeta-label">Neto de caja</div>
          <div class="tarjeta-valor" [ngClass]="f.netoCaja >= 0 ? 'text-success' : 'text-danger'">{{ f.netoCaja | formatearValor: '$' }}</div>
          <div class="tarjeta-detalle">dinero que entró − dinero que salió (sin retenciones)</div>
        </div>
      </div>
    </div>
  </div>
} @else if (cargandoMes) {
  <app-spinner></app-spinner>
}

<!-- Evolución -->
<h5 class="mb-2">Evolución · {{ evolucion.length }} meses hasta {{ nombreMesElegido }}</h5>
<div class="row g-3 mb-4" [class.opacity-50]="cargandoMes">
  @for (lado of ['cobrar', 'pagar']; track lado) {
    @let barras = lado === 'cobrar' ? barrasCobrar : barrasPagar;
    @let movido = lado === 'cobrar' ? 'Cobrado' : 'Pagado';
    <div class="col-12 col-xl-6">
      <div class="card h-100">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-baseline mb-2">
            <h6 class="mb-0">{{ lado === 'cobrar' ? 'Clientes: facturado vs cobrado' : 'Choferes y proveedores: facturado vs pagado' }}</h6>
            <div class="leyenda small">
              <span class="muestra muestra-facturado"></span> Facturado
              <span class="muestra muestra-movido ms-2"></span> {{ movido }}
            </div>
          </div>
          <div class="grafico" role="img" [attr.aria-label]="'Facturado y ' + movido.toLowerCase() + ' por mes'">
            @for (b of barras; track b.mes) {
              <div class="grupo" [class.grupo-elegido]="b.mes === mes">
                <div class="barras">
                  <div class="barra barra-facturado" [style.height.%]="b.altoFacturado" [title]="b.tituloFacturado"></div>
                  <div class="barra barra-movido" [style.height.%]="b.altoMovido" [title]="b.tituloMovido"></div>
                </div>
                <div class="eje">{{ b.etiqueta }}</div>
              </div>
            }
          </div>
          <table class="table table-sm mt-2 mb-0 tabla-evolucion">
            <thead>
              <tr>
                <th>Mes</th>
                <th class="text-end">Facturado</th>
                <th class="text-end">{{ movido }}</th>
              </tr>
            </thead>
            <tbody>
              @for (b of barras; track b.mes) {
                <tr [class.fw-bold]="b.mes === mes">
                  <td>{{ b.etiqueta }}</td>
                  <td class="text-end">{{ b.facturado | formatearValor: '$' }}</td>
                  <td class="text-end">{{ b.movido | formatearValor: '$' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  }
</div>

<!-- Top 5 -->
<div class="row g-3 mb-4">
  @for (lado of ['cobrar', 'pagar']; track lado) {
    @let top = lado === 'cobrar' ? topCobrar : topPagar;
    <div class="col-12 col-xl-6">
      <div class="card h-100">
        <div class="card-body">
          <h6 class="mb-2">
            {{ lado === 'cobrar' ? 'Clientes con más deuda vencida' : 'Choferes y proveedores con pagos más atrasados' }}
            <span class="text-muted small">(+{{ lado === 'cobrar' ? umbrales.cobrar.atencion : umbrales.pagar.atencion }} días)</span>
          </h6>
          @if (top.length) {
            <table class="table table-sm align-middle mb-0 tabla-top">
              <thead>
                <tr>
                  <th>{{ lado === 'cobrar' ? 'Cliente' : 'Entidad' }}</th>
                  <th class="text-end">Vencido</th>
                  <th class="text-end">Facturado</th>
                  <th class="text-center">Días prom.</th>
                  <th class="text-center">Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (c of top; track c.clave) {
                  @let st = estadoDe(c);
                  <tr>
                    <td>{{ c.nombre }} @if (lado === 'pagar') { <span class="text-muted small text-capitalize">· {{ c.tipo }}</span> }</td>
                    <td class="text-end text-danger">{{ c.saldoVencido | formatearValor: '$' }}</td>
                    <td class="text-end">{{ c.saldoFacturado | formatearValor: '$' }}</td>
                    <td class="text-center">{{ c.diasPromedio ?? '—' }}</td>
                    <td class="text-center">
                      <span [ngClass]="st.clase">{{ st.texto }}</span>
                      @if (marca(c)) {
                        <div class="text-muted small">{{ marca(c) }}</div>
                      }
                    </td>
                    <td class="text-end">
                      <button type="button" class="btn btn-sm btn-outline-primary" (click)="verCuenta(c.tipo, c.idEntidad)">Ver</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          } @else if (!cargandoBase) {
            <p class="text-muted mb-0">{{ lado === 'cobrar' ? 'Ningún cliente con deuda vencida.' : 'Ningún pago atrasado.' }}</p>
          }
        </div>
      </div>
    </div>
  }
</div>

<!-- Alertas -->
<h5 class="mb-2">Alertas</h5>
@if (alertas.length) {
  <div class="row g-3 mb-3">
    @for (a of alertas; track a.id) {
      <div class="col-12 col-xl-4">
        <div class="card h-100 alerta">
          <div class="card-body">
            <h6 class="mb-1">{{ a.titulo }}</h6>
            <div class="text-muted small mb-2">{{ a.descripcion }}</div>
            <div class="mb-2"><b>{{ a.cantidad }}</b> entidad(es) · <b>{{ a.importe | formatearValor: '$' }}</b></div>
            <table class="table table-sm align-middle mb-0">
              <tbody>
                @for (i of a.items; track i.tipo + i.idEntidad) {
                  <tr>
                    <td>
                      {{ i.nombre }}
                      <div class="text-muted small">{{ i.detalle }}</div>
                    </td>
                    <td class="text-end text-nowrap">{{ i.importe | formatearValor: '$' }}</td>
                    <td class="text-end">
                      <button type="button" class="btn btn-sm btn-outline-primary" (click)="verCuenta(i.tipo, i.idEntidad)">Ver</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            @if (a.cantidad > a.items.length) {
              <div class="text-muted small mt-1">y {{ a.cantidad - a.items.length }} más.</div>
            }
          </div>
        </div>
      </div>
    }
  </div>
} @else if (!cargandoBase) {
  <p class="text-muted">Sin alertas.</p>
}

@if (cargandoBase) {
  <app-spinner></app-spinner>
}

<p class="text-muted small mt-2">
  <b>Posición:</b> lo abierto hoy (igual que Cuentas). <b>Vencido:</b> facturas de más de {{ umbrales.cobrar.atencion }} días (clientes)
  o {{ umbrales.pagar.atencion }} días (choferes y proveedores), desde la fecha de la factura.
  <b>Flujo del mes:</b> movimientos vigentes con fecha en el mes; los pagos con concepto anticipo o préstamo van aparte.
  <b>Evolución:</b> facturado por la fecha de la factura (total del servicio); cobrado y pagado por la fecha del movimiento
  (el pagado incluye anticipos). <b>Días prom.:</b> antigüedad promedio de las facturas abiertas, ponderada por saldo.
</p>
```

### 6c — `finanzas-resumen.component.scss`

```scss
// Colores de las dos series de la evolución (validados para daltonismo;
// la tabla debajo de cada gráfico da los valores exactos).
$color-facturado: #0d6efd;
$color-movido: #20c997;

.tarjeta {
  border-left: 4px solid #6c757d;
}

.lado-cobrar {
  border-left-color: #0d6efd;
}

.lado-pagar {
  border-left-color: #dc3545;
}

.lado-anticipo {
  border-left-color: #ffc107;
}

.lado-ajuste {
  border-left-color: #0dcaf0;
}

.tarjeta-neta {
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

.tarjeta-detalle {
  font-size: 0.8rem;
  color: #6c757d;
  font-variant-numeric: tabular-nums;
}

.posicion td,
.tabla-evolucion td,
.tabla-top td {
  font-variant-numeric: tabular-nums;
}

.mes-elegido {
  min-width: 11rem;
  opacity: 1 !important;     // .disabled lo atenúa: acá es solo una etiqueta
  color: #212529 !important;
}

// --- Gráfico de evolución (barras CSS) ---
.leyenda {
  color: #6c757d;
}

.muestra {
  display: inline-block;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 2px;
  vertical-align: middle;
}

.muestra-facturado {
  background-color: $color-facturado;
}

.muestra-movido {
  background-color: $color-movido;
}

.grafico {
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
  height: 11rem;
  border-bottom: 1px solid #ced4da;
}

.grupo {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  border-radius: 4px;
}

.grupo-elegido {
  background-color: #f1f3f5;
}

.barras {
  flex: 1 1 auto;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
  padding: 0 4px;
}

.barra {
  width: 40%;
  max-width: 1.75rem;
  min-height: 1px;
  border-radius: 4px 4px 0 0;
}

.barra-facturado {
  background-color: $color-facturado;
}

.barra-movido {
  background-color: $color-movido;
}

.eje {
  text-align: center;
  font-size: 0.8rem;
  color: #6c757d;
  padding-top: 0.25rem;
}
```

## PASO 7 — `src/app/raiz/finanzas-nueva/finanzas-nueva.module.ts`

#### 7a

BUSCAR:
```ts
import { FinanzasAntiguedadComponent } from './antiguedad/finanzas-antiguedad.component';
```

REEMPLAZAR:
```ts
import { FinanzasAntiguedadComponent } from './antiguedad/finanzas-antiguedad.component';
import { FinanzasResumenComponent } from './resumen/finanzas-resumen.component';
```

#### 7b

BUSCAR:
```ts
    FinanzasAntiguedadComponent,
  ],
```

REEMPLAZAR:
```ts
    FinanzasAntiguedadComponent,
    FinanzasResumenComponent,
  ],
```

## PASO 8 — `src/app/raiz/finanzas-nueva/finanzas-nueva-routing.module.ts`

#### 8a

BUSCAR:
```ts
import { FinanzasAntiguedadComponent } from './antiguedad/finanzas-antiguedad.component';
```

REEMPLAZAR:
```ts
import { FinanzasAntiguedadComponent } from './antiguedad/finanzas-antiguedad.component';
import { FinanzasResumenComponent } from './resumen/finanzas-resumen.component';
```

#### 8b

BUSCAR:
```ts
      { path: '', redirectTo: 'cuentas', pathMatch: 'full' },
      { path: 'cuentas', component: FinanzasCuentasComponent },
```

REEMPLAZAR:
```ts
      { path: '', redirectTo: 'resumen', pathMatch: 'full' },
      { path: 'resumen', component: FinanzasResumenComponent },
      { path: 'cuentas', component: FinanzasCuentasComponent },
```

## PASO 9 — `src/app/raiz/finanzas-nueva/control/finanzas-nueva-control.component.ts`

#### 9a

BUSCAR:
```ts
  readonly tabs: TabRuta[] = [
    { id: 'cuentas',
```

REEMPLAZAR:
```ts
  readonly tabs: TabRuta[] = [
    { id: 'resumen', name: 'Resumen', route: 'finanzasNueva/resumen' },
    { id: 'cuentas',
```

## PASO 10 — Link del sidebar (solo si el PASO 0 lo indicó)

Si el grep 5 mostró `finanzasNueva/cuentas`, reemplazá ese texto por
`finanzasNueva/resumen` en ese archivo (una sola ocurrencia; si hay más de
una, pará y reportá). Si mostró `finanzasNueva` a secas, no hagas nada.

## PASO 11 — `src/app/raiz/finanzas-nueva/cuenta-entidad/cuenta-entidad.component.ts`

#### 11a

BUSCAR:
```ts
      tramos: { ...this.resumen.tramos },
      diasMasAntiguo: this.resumen.diasMasAntiguo,
```

REEMPLAZAR:
```ts
      tramos: { ...this.resumen.tramos },
      diasMasAntiguo: this.resumen.diasMasAntiguo,
      // Solo para el modal de registrar (no los usa): sin cálculo de antigüedad.
      diasPromedio: null,
      saldoVencido: 0,
      cantidadCriticas: 0,
```

#### 11b

BUSCAR:
```ts
    if (o === 'antiguedad') return { ruta: '/finanzasNueva/antiguedad', etiqueta: 'Antigüedad' };
```

REEMPLAZAR:
```ts
    if (o === 'antiguedad') return { ruta: '/finanzasNueva/antiguedad', etiqueta: 'Antigüedad' };
    if (o === 'resumen') return { ruta: '/finanzasNueva/resumen', etiqueta: 'Resumen' };
```

## PASO 12 — Verificación

```bash
npm run build:demo
grep -c "diasPromedio\|saldoVencido\|cantidadCriticas" src/app/shared/utils/cuentas-finanzas.util.ts   # 16
grep -c "export function" src/app/shared/utils/resumen-finanzas.util.ts   # 9
grep -c "estadoCuenta(" src/app/raiz/finanzas-nueva/antiguedad/finanzas-antiguedad.component.ts   # 4
grep -rn "estadoAntiguedad(" src/app   # 2 líneas, las dos en cuentas-finanzas.util.ts
grep -c "FinanzasResumenComponent" src/app/raiz/finanzas-nueva/finanzas-nueva.module.ts src/app/raiz/finanzas-nueva/finanzas-nueva-routing.module.ts   # 2 y 2
grep -n "redirectTo" src/app/raiz/finanzas-nueva/finanzas-nueva-routing.module.ts   # 'resumen'
grep -n "observarBaseCuentas\|observarFacturadosPorFechaFactura\|filtrosResumen" src/app/servicios/finanzas-nueva/finanzas-consulta.service.ts
git status --short
```

Esperado:

- El build termina sin errores. Los warnings de presupuesto previos no
  cuentan.
- Los conteos coinciden.
- `estadoAntiguedad(` quedó solo en el util: la definición y su uso
  dentro de `estadoCuenta`.
- `git status` muestra:
  - 8 archivos modificados: util de cuentas, consulta, antigüedad (ts y
    html), módulo, routing, control y `cuenta-entidad.component.ts`. Uno
    más si cambiaste el sidebar;
  - nuevos: `resumen-finanzas.util.ts` y la carpeta `resumen/`;
  - lo tuyo sin trackear, si lo hay.

Reportá la salida.

## Pruebas manuales (demo)

1. **Pestaña inicial:** el sidebar (o `/finanzasNueva`) abre Resumen.
   Pestañas: Resumen · Cuentas · Antigüedad · Movimientos.
2. **Posición:**
   - "Nos deben (facturado)" y "Les debemos (facturado)" coinciden con las
     tarjetas de Cuentas en cada lado, igual que sin facturar, a favor y
     neto;
   - vencido A cobrar = la tarjeta "Facturas de más de 60 días" de
     Cuentas;
   - la posición neta es la resta de los dos netos (verde si es positiva).
3. **Flujo del mes (octubre):** cobrado y pagado coinciden con los totales
   de la pestaña Movimientos filtrada en octubre, solo vigentes. Ahí los
   pagos con concepto anticipo están dentro de "Pagos"; acá van aparte en
   "Anticipos / préstamos". El neto de caja = (cobrado − retenciones
   sufridas) − (pagado + anticipos − retenciones practicadas).
4. **Selector:** ‹ va a septiembre; el flujo y la evolución cambian (la
   evolución pasa a abril–septiembre). › no pasa de octubre ("en curso").
   "Mes actual" vuelve. Ir a Cuentas y volver conserva el mes elegido.
5. **Evolución:**
   - 6 grupos de barras por gráfico, con el mes elegido resaltado;
   - el tooltip de cada barra da mes, serie e importe;
   - la tabla de abajo da los mismos valores, con el mes elegido en
     negrita.
   - Con los datos de demo: facturado de clientes en los meses de las
     facturas (G1), cobrado en los meses de los cobros (G2), y anticipos
     de octubre dentro de lo pagado.
6. **Top 5:**
   - clientes ordenados por vencido;
   - estado y marca coherentes con Antigüedad;
   - "Ver" abre la cuenta y el botón dice "← Resumen" y vuelve.
7. **Alertas:**
   - "Saldo a favor para imputar": aparecen los clientes de G2 que pagaron
     de más y tienen facturas abiertas;
   - "Emitido sin facturar (+30 días)": en demo no debería aparecer (G1
     emitió hace pocos días).
   - "Anticipos sin compensar (+60 días)": en demo no debería aparecer
     (los anticipos de G2 son de octubre).
   - Si no hay ninguna alerta, dice "Sin alertas".
8. **Antigüedad (F47):**
   - columna "Días prom.";
   - un cliente con mucho saldo reciente y una factura vieja dice
     "Atención · 1 fact. +90" (no "Crítico");
   - los chips dicen "Estado (días promedio)" y cuentan con la regla
     nueva;
   - ordenar por Estado pone primero los críticos (descendente).
9. **Regresión:** Cuentas, Movimientos, la cuenta de la entidad (volver
   desde Cuentas / Antigüedad / Resumen) y "Registrar" desde la cuenta
   siguen iguales.

## Commit (lo hace Nico)

```
feat(finanzas): Resumen y estado por días promedio ponderados (F6b)

- Resumen (pestaña inicial): posición A cobrar / A pagar y neta; flujo
  del mes elegido (cobrado, pagado, anticipos, retenciones, ajustes, neto
  de caja; mes en sesión); evolución de 6 meses facturado vs
  cobrado/pagado (barras CSS + tabla); top 5 por saldo vencido; alertas
  (saldo a favor para imputar, anticipos +60 d, emitido sin facturar
  +30 d). Ver cuenta con ?origen=resumen.
- F47: CuentaEntidadFin suma diasPromedio (ponderado por saldo),
  saldoVencido y cantidadCriticas; estadoCuenta por días promedio con
  piso "Atención" si hay facturas críticas; Antigüedad con columna
  Días prom. y marca "N fact. +90".
- resumen-finanzas.util (meses, flujoDelMes, armarEvolucion,
  armarAlertas); consulta: observarBaseCuentas,
  observarFacturadosPorFechaFactura, filtrosResumen.
```

FIN DE LA INSTRUCCIÓN F6b
````
