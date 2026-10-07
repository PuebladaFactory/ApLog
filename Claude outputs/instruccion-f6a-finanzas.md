````
# Instrucción F6a — Finanzas: pestaña Antigüedad

## Contexto

Frente Finanzas. Diseño: `claude/diseno-finanzas.md` §19 (F41–F46).
F6 se parte en F6a (Antigüedad) y F6b (Resumen). Este bloque es F6a.

**Antigüedad** es una pestaña nueva entre Cuentas y Movimientos. Muestra
el facturado abierto de cada entidad repartido por la antigüedad de la
factura (0–30 / 31–60 / 61–90 / +90 días), al día de hoy (F44).

- Selector A cobrar · Clientes / A pagar · Choferes y proveedores y
  buscador (igual que Cuentas). Lado, texto y estado se recuerdan en la
  sesión (`filtrosAntiguedad`).
- Solo entran las cuentas con facturas abiertas. Lo emitido sin facturar y
  el saldo a favor / anticipos se muestran como referencia (en gris): no
  entran en los tramos, porque todavía no se cobran ni pagan.
- Encabezado: una tarjeta por tramo (importe y %, con borde de color), una
  tarjeta con el total y una barra apilada con el reparto (verde →
  amarillo → naranja → rojo). Todo en CSS, sin librería.
- **Estado** (F43; reemplaza el "score de riesgo" del módulo viejo): por los
  días de la factura abierta más antigua, con umbrales por lado:
  - A cobrar: ≤ 60 al día (los clientes pagan a 30–60), 61–90 atención,
    +90 crítico.
  - A pagar: ≤ 15 al día (choferes y proveedores se pagan a pocos días),
    16–30 atención, +30 atrasado.
  Los chips de estado muestran cuántas cuentas hay en cada uno y filtran la
  tabla (otro click en el mismo chip quita el filtro).
- Tabla: Entidad | (Tipo, en A pagar) | 0–30 | 31–60 | 61–90 | +90 |
  Facturado abierto | Más antigua (días) | Estado | Sin facturar | Saldo a
  favor / Anticipos. Abre ordenada por +90 descendente (lo más grave
  arriba). Acción "Ver cuenta".
- Tarjetas, barra y conteo son del lado completo: no cambian con el
  buscador ni con el filtro de estado.

**Cálculo:** no hay lecturas nuevas. Usa el mismo listener que Cuentas
(`observarCuentas` → `armarCuentas`).

- `CuentaEntidadFin` y `TotalesCuentas` suman `tramos` (el facturado por
  tramo; la fecha rota cuenta como 0–30, igual que `resumirCuentaEntidad`).
- Funciones puras nuevas en `cuentas-finanzas.util.ts`:
  - `tramosEnCero`;
  - `UMBRALES_ANTIGUEDAD`, `estadoAntiguedad`, `etiquetaEstadoAntiguedad`,
    `rangoEstadoAntiguedad`, `CLASE_ESTADO_ANTIGUEDAD`;
  - `porcentajesTramos`, `contarPorEstado`.

**Volver a la pestaña de origen:** "Ver cuenta" desde Antigüedad abre la
cuenta con `?origen=antiguedad`, y el botón de volver de la cuenta dice
"← Antigüedad" y vuelve ahí. Sin `origen` (o con uno desconocido) sigue
volviendo a Cuentas. F6b lo usa también desde el Resumen.

La pestaña inicial sigue siendo Cuentas: pasa a Resumen en F6b, cuando
exista.

Sin índices ni reglas: NO hay deploy.

Ya verificado:

- tsc estricto, con stubs;
- prueba rápida del util: tramos por entidad y totales (cliente con
  facturas de 6 y 48 días, otro de 79, otro de 159; choferes de 12 y 27
  días; fecha rota); estados por lado; porcentajes (10/20/30/40 y todo en
  0); conteo por estado; etiquetas y rangos.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto BUSCAR no aparece, o aparece más de una vez: pará y reportá,
  sin improvisar.
- Archivos con finales de línea LF.
- Build: `npm run build:demo`.
- No toques CLAUDE.md ni CHANGELOG.
- `CuentaEntidadFin` y `TotalesCuentas` suman el campo obligatorio
  `tramos`. Con el PASO 0 revisá TODOS los lugares que arman esos objetos
  (incluidos `.spec.ts`, generadores y `.html`). Si aparece alguno que no
  está en esta instrucción, pará y reportá.
- La instrucción termina con la línea `FIN DE LA INSTRUCCIÓN F6a`. Si no la
  ves, llegó cortada: leela completa (por partes si hace falta) antes de
  empezar.

## PASO 0 — Verificación (sin cambios)

Corré y reportá la salida:

```bash
grep -rln "CuentaEntidadFin\|TotalesCuentas\|totalizarCuentas" src/
grep -rn "saldoMas60:" src/
grep -rn "queryParamMap\|filtrosAntiguedad\|FinanzasAntiguedadComponent\|estadoAntiguedad\|tramosEnCero" src/app
ls src/app/raiz/finanzas-nueva/antiguedad
grep -n "HistoriaComprobanteComponent,\|alias: \['finanzasNueva/cuenta'\]" src/app/raiz/finanzas-nueva/finanzas-nueva.module.ts src/app/raiz/finanzas-nueva/control/finanzas-nueva-control.component.ts
```

Esperado:

- El grep 1: 5 archivos.
  - `shared/utils/cuentas-finanzas.util.ts`;
  - `servicios/finanzas-nueva/finanzas-consulta.service.ts`;
  - `raiz/finanzas-nueva/cuenta-entidad/cuenta-entidad.component.ts`;
  - `raiz/finanzas-nueva/cuentas/finanzas-cuentas.component.ts`;
  - `raiz/finanzas-nueva/modales/registrar-movimiento/registrar-movimiento.component.ts`.
  Ningún `.spec.ts` ni generador.
- El grep 2: 5 líneas en `cuentas-finanzas.util.ts` (2 de interfaz, el alta
  de la cuenta, el alta de los totales y el return) y 1 en
  `cuenta-entidad.component.ts`. Son los únicos lugares que arman esos
  objetos.
- El grep 3: nada.
- El `ls`: no existe.
- El grep 5: una línea en cada archivo (módulo con la historia de F5b; la
  pestaña Cuentas con el alias de la cuenta).

Si algo no coincide, pará y reportá.

## PASO 1 — `src/app/shared/utils/cuentas-finanzas.util.ts`

#### 1a

BUSCAR:
```ts
import { diasEntre, esCero, normalizarValoresFinancieros, redondear2 } from 'src/app/shared/utils/finanzas.util';
```

REEMPLAZAR:
```ts
import {
  TRAMOS_ANTIGUEDAD, TramoAntiguedad, diasEntre, esCero, normalizarValoresFinancieros, redondear2, tramoAntiguedad,
} from 'src/app/shared/utils/finanzas.util';
```

#### 1b

BUSCAR:
```ts
  /** Parte de saldoFacturado con factura de más de DIAS_ALERTA_ANTIGUEDAD días. */
  saldoMas60: number;
```

REEMPLAZAR:
```ts
  /** Parte de saldoFacturado con factura de más de DIAS_ALERTA_ANTIGUEDAD días. */
  saldoMas60: number;
  /** saldoFacturado repartido por antigüedad de la factura (F6a). */
  tramos: Record<TramoAntiguedad, number>;
```

#### 1c

BUSCAR:
```ts
export interface TotalesCuentas {
  cantidad: number;
  saldoFacturado: number;
  saldoMas60: number;
```

REEMPLAZAR:
```ts
export interface TotalesCuentas {
  cantidad: number;
  saldoFacturado: number;
  saldoMas60: number;
  tramos: Record<TramoAntiguedad, number>;
```

#### 1d

BUSCAR:
```ts
export function ladoDe(tipo: TipoEntidadFin): LadoCuenta {
```

REEMPLAZAR:
```ts
/** Los cuatro tramos en 0 (objeto nuevo en cada llamada). */
export function tramosEnCero(): Record<TramoAntiguedad, number> {
  return { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
}

export function ladoDe(tipo: TipoEntidadFin): LadoCuenta {
```

#### 1e

BUSCAR:
```ts
        saldoFacturado: 0, cantidadFacturados: 0, saldoMas60: 0, diasMasAntiguo: null,
```

REEMPLAZAR:
```ts
        saldoFacturado: 0, cantidadFacturados: 0, saldoMas60: 0, tramos: tramosEnCero(), diasMasAntiguo: null,
```

#### 1f

BUSCAR:
```ts
      const dias = diasDesde(fechaBaseAntiguedad(liq), hoy);
      if (dias !== null) {
```

REEMPLAZAR:
```ts
      const dias = diasDesde(fechaBaseAntiguedad(liq), hoy);
      const tramo = tramoAntiguedad(dias ?? 0);   // fecha rota → 0-30 (como resumirCuentaEntidad)
      c.tramos[tramo] = redondear2(c.tramos[tramo] + saldo);
      if (dias !== null) {
```

#### 1g

BUSCAR:
```ts
  const t: TotalesCuentas = { cantidad: cuentas.length, saldoFacturado: 0, saldoMas60: 0, sinFacturar: 0, saldoAFavor: 0, neto: 0 };
  for (const c of cuentas) {
    t.saldoFacturado += c.saldoFacturado;
    t.saldoMas60 += c.saldoMas60;
```

REEMPLAZAR:
```ts
  const t: TotalesCuentas = {
    cantidad: cuentas.length, saldoFacturado: 0, saldoMas60: 0, tramos: tramosEnCero(), sinFacturar: 0, saldoAFavor: 0, neto: 0,
  };
  for (const c of cuentas) {
    t.saldoFacturado += c.saldoFacturado;
    t.saldoMas60 += c.saldoMas60;
    for (const tr of TRAMOS_ANTIGUEDAD) t.tramos[tr] += c.tramos[tr];
```

#### 1h

BUSCAR:
```ts
    saldoMas60: redondear2(t.saldoMas60),
    sinFacturar: redondear2(t.sinFacturar),
    saldoAFavor: redondear2(t.saldoAFavor),
    neto: redondear2(t.neto),
  };
}
```

REEMPLAZAR:
```ts
    saldoMas60: redondear2(t.saldoMas60),
    tramos: {
      '0-30': redondear2(t.tramos['0-30']),
      '31-60': redondear2(t.tramos['31-60']),
      '61-90': redondear2(t.tramos['61-90']),
      '90+': redondear2(t.tramos['90+']),
    },
    sinFacturar: redondear2(t.sinFacturar),
    saldoAFavor: redondear2(t.saldoAFavor),
    neto: redondear2(t.neto),
  };
}

// ---------------------------------------------------------------------------
// Antigüedad (F6a)
// ---------------------------------------------------------------------------

/** Estado de una cuenta según los días de su factura abierta más antigua
 *  (F43). Reemplaza el "score de riesgo" del módulo viejo. */
export type EstadoAntiguedad = 'al-dia' | 'atencion' | 'critico';

/** Umbrales en días por lado (F43): hasta `atencion` está al día; hasta
 *  `critico`, atención; más, crítico (a cobrar) / atrasado (a pagar).
 *  Clientes pagan a 30–60 días; choferes y proveedores se pagan a pocos días
 *  de recibir su factura. */
export const UMBRALES_ANTIGUEDAD: Readonly<Record<LadoCuenta, { atencion: number; critico: number }>> = {
  cobrar: { atencion: 60, critico: 90 },
  pagar: { atencion: 15, critico: 30 },
};

/** null si la cuenta no tiene facturas abiertas (sin días). */
export function estadoAntiguedad(dias: number | null, lado: LadoCuenta): EstadoAntiguedad | null {
  if (dias === null) return null;
  const u = UMBRALES_ANTIGUEDAD[lado];
  if (dias <= u.atencion) return 'al-dia';
  if (dias <= u.critico) return 'atencion';
  return 'critico';
}

export const ESTADOS_ANTIGUEDAD: readonly EstadoAntiguedad[] = ['al-dia', 'atencion', 'critico'];

/** Texto del estado: el último cambia por lado (crítico para lo que nos
 *  deben, atrasado para lo que debemos). */
export function etiquetaEstadoAntiguedad(estado: EstadoAntiguedad, lado: LadoCuenta): string {
  if (estado === 'al-dia') return 'Al día';
  if (estado === 'atencion') return 'Atención';
  return lado === 'cobrar' ? 'Crítico' : 'Atrasado';
}

/** Clase de texto Bootstrap para el estado. */
export const CLASE_ESTADO_ANTIGUEDAD: Readonly<Record<EstadoAntiguedad, string>> = {
  'al-dia': 'text-success fw-semibold',
  atencion: 'text-warning-emphasis fw-semibold',
  critico: 'text-danger fw-bold',
};

/** Rango legible de un estado para un lado: "≤ 60 días", "61–90 días",
 *  "+90 días". */
export function rangoEstadoAntiguedad(estado: EstadoAntiguedad, lado: LadoCuenta): string {
  const u = UMBRALES_ANTIGUEDAD[lado];
  if (estado === 'al-dia') return `≤ ${u.atencion} días`;
  if (estado === 'atencion') return `${u.atencion + 1}–${u.critico} días`;
  return `+${u.critico} días`;
}

/** Porcentaje de cada tramo sobre el total facturado (0 si el total es 0).
 *  Para la barra y las tarjetas; no se redondea a 100. */
export function porcentajesTramos(tramos: Record<TramoAntiguedad, number>): Record<TramoAntiguedad, number> {
  const total = TRAMOS_ANTIGUEDAD.reduce((a, t) => a + tramos[t], 0);
  const r = tramosEnCero();
  if (esCero(total)) return r;
  for (const t of TRAMOS_ANTIGUEDAD) r[t] = Math.round((tramos[t] / total) * 1000) / 10;
  return r;
}

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

## PASO 2 — `src/app/servicios/finanzas-nueva/finanzas-consulta.service.ts`

#### 2a

BUSCAR:
```ts
import { CuentaEntidadFin, LadoCuenta, armarCuentas } from 'src/app/shared/utils/cuentas-finanzas.util';
```

REEMPLAZAR:
```ts
import { CuentaEntidadFin, EstadoAntiguedad, LadoCuenta, armarCuentas } from 'src/app/shared/utils/cuentas-finanzas.util';
```

#### 2b

BUSCAR:
```ts
  filtrosCuentas: { lado: LadoCuenta; texto: string } = { lado: 'cobrar', texto: '' };
```

REEMPLAZAR:
```ts
  filtrosCuentas: { lado: LadoCuenta; texto: string } = { lado: 'cobrar', texto: '' };

  /** Filtros de la pestaña Antigüedad (F6a), recordados durante la sesión. */
  filtrosAntiguedad: { lado: LadoCuenta; texto: string; estado: EstadoAntiguedad | 'todos' } = {
    lado: 'cobrar',
    texto: '',
    estado: 'todos',
  };
```

## PASO 3 — NUEVO `src/app/raiz/finanzas-nueva/antiguedad/`

### 3a — `finanzas-antiguedad.component.ts`

```ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AccionListado, ColumnaListado, EventoAccionListado, OrdenListado } from 'src/app/interfaces/tabla-listado';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { FinanzasConsultaService } from 'src/app/servicios/finanzas-nueva/finanzas-consulta.service';
import {
  CLASE_ESTADO_ANTIGUEDAD, CuentaEntidadFin, ESTADOS_ANTIGUEDAD, EstadoAntiguedad, LadoCuenta, TotalesCuentas,
  contarPorEstado, estadoAntiguedad, etiquetaEstadoAntiguedad, porcentajesTramos, rangoEstadoAntiguedad,
  totalizarCuentas, tramosEnCero,
} from 'src/app/shared/utils/cuentas-finanzas.util';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import { TRAMOS_ANTIGUEDAD, TramoAntiguedad } from 'src/app/shared/utils/finanzas.util';

type Fila = CuentaEntidadFin;

/** Clave de columna por tramo (las keys de TablaListado no llevan '+'). */
const KEY_TRAMO: Readonly<Record<TramoAntiguedad, string>> = {
  '0-30': 't0', '31-60': 't31', '61-90': 't61', '90+': 't90',
};

/** Finanzas → Antigüedad (F6a): el facturado abierto de cada entidad
 *  repartido por antigüedad de la factura (0–30 / 31–60 / 61–90 / +90), al
 *  día de hoy (F44). A cobrar (clientes) / A pagar (choferes y
 *  proveedores). Solo entidades con facturas abiertas: lo emitido sin
 *  facturar y el saldo a favor se muestran como referencia (no entran en los
 *  tramos). Estado por días de la factura más antigua, con umbrales por lado
 *  (F43). Mismo cálculo y listener que Cuentas (armarCuentas). */
@Component({
  selector: 'app-finanzas-antiguedad',
  standalone: false,
  templateUrl: './finanzas-antiguedad.component.html',
  styleUrl: './finanzas-antiguedad.component.scss',
})
export class FinanzasAntiguedadComponent implements OnInit, OnDestroy {

  cuentas: Fila[] = [];
  /** Del lado y con facturas abiertas, antes del filtro de estado/texto. */
  delLado: Fila[] = [];
  filtradas: Fila[] = [];
  totales: TotalesCuentas = totalizarCuentas([]);
  porcentajes: Record<TramoAntiguedad, number> = tramosEnCero();
  conteo: Record<EstadoAntiguedad, number> = { 'al-dia': 0, atencion: 0, critico: 0 };
  columnas: ColumnaListado<Fila>[] = [];
  cargando = true;
  error: string | null = null;

  readonly hoy = toISODateString(new Date());
  readonly hoyLegible = fechaComprobanteLegible(this.hoy);
  readonly tramos = TRAMOS_ANTIGUEDAD;
  readonly estados = ESTADOS_ANTIGUEDAD;
  readonly ordenInicial: OrdenListado = { key: KEY_TRAMO['90+'], asc: false };
  readonly trackCuenta = (c: Fila) => c.clave;

  readonly acciones: AccionListado<Fila>[] = [
    { id: 'cuenta', label: 'Ver cuenta', clase: 'btn-outline-primary' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private consulta: FinanzasConsultaService,
    private router: Router,
  ) {}

  get filtros(): { lado: LadoCuenta; texto: string; estado: EstadoAntiguedad | 'todos' } {
    return this.consulta.filtrosAntiguedad;
  }

  ngOnInit(): void {
    this.columnas = this.armarColumnas();
    this.consulta.observarCuentas(this.hoy)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: cuentas => {
          this.cuentas = cuentas;
          this.aplicarFiltros();
          this.cargando = false;
        },
        error: e => {
          console.error('Error al leer la antigüedad de Finanzas', e);
          this.error = `No se pudo leer la antigüedad: ${e?.message ?? e}`;
          this.cargando = false;
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cambiarLado(lado: LadoCuenta): void {
    if (this.filtros.lado === lado) return;
    this.filtros.lado = lado;
    this.columnas = this.armarColumnas();
    this.aplicarFiltros();
  }

  onTexto(texto: string): void {
    this.filtros.texto = texto;
    this.aplicarFiltros();
  }

  /** Click en un chip de estado: filtra; otro click en el mismo, lo quita. */
  cambiarEstado(estado: EstadoAntiguedad): void {
    this.filtros.estado = this.filtros.estado === estado ? 'todos' : estado;
    this.aplicarFiltros();
  }

  /** Tarjetas, barra y conteo salen del LADO completo (no cambian con el
   *  buscador ni con el estado); la tabla, de lo filtrado. */
  aplicarFiltros(): void {
    const lado = this.filtros.lado;
    this.delLado = this.cuentas.filter(c => c.lado === lado && c.cantidadFacturados > 0);
    this.totales = totalizarCuentas(this.delLado);
    this.porcentajes = porcentajesTramos(this.totales.tramos);
    this.conteo = contarPorEstado(this.delLado);

    const texto = this.filtros.texto.trim().toLowerCase();
    const estado = this.filtros.estado;
    this.filtradas = this.delLado.filter(c =>
      (estado === 'todos' || estadoAntiguedad(c.diasMasAntiguo, c.lado) === estado) &&
      (!texto || c.nombre.toLowerCase().includes(texto) || String(c.cuit).includes(texto)));
  }

  /** "0 a 30 días", …, "Más de 90 días". */
  etiquetaTramo(t: TramoAntiguedad): string {
    return t === '90+' ? 'Más de 90 días' : `${t.replace('-', ' a ')} días`;
  }

  etiquetaEstado(estado: EstadoAntiguedad): string {
    return etiquetaEstadoAntiguedad(estado, this.filtros.lado);
  }

  rangoEstado(estado: EstadoAntiguedad): string {
    return rangoEstadoAntiguedad(estado, this.filtros.lado);
  }

  onAccion(ev: EventoAccionListado<Fila>): void {
    if (ev.id === 'cuenta') {
      this.router.navigate(['/finanzasNueva/cuenta', ev.item.tipo, ev.item.idEntidad], { queryParams: { origen: 'antiguedad' } });
    }
  }

  private armarColumnas(): ColumnaListado<Fila>[] {
    const cobrar = this.filtros.lado === 'cobrar';
    const columnas: ColumnaListado<Fila>[] = [
      { key: 'nombre', label: cobrar ? 'Cliente' : 'Entidad', valor: c => c.nombre, orden: c => c.nombre },
    ];
    if (!cobrar) {
      columnas.push({ key: 'tipo', label: 'Tipo', valor: c => c.tipo, orden: c => c.tipo, clase: 'text-capitalize' });
    }
    for (const t of TRAMOS_ANTIGUEDAD) {
      columnas.push({
        key: KEY_TRAMO[t],
        label: t === '90+' ? '+90' : t.replace('-', '–'),
        valor: c => c.tramos[t],
        orden: c => c.tramos[t],
        tipo: 'moneda',
        clase: c => (c.tramos[t] <= 0 ? 'text-muted' : t === '90+' ? 'text-danger fw-semibold' : ''),
      });
    }
    columnas.push(
      {
        key: 'saldoFacturado', label: 'Facturado abierto', valor: c => c.saldoFacturado, orden: c => c.saldoFacturado,
        tipo: 'moneda', clase: 'fw-semibold',
      },
      {
        key: 'diasMasAntiguo', label: 'Más antigua (días)', valor: c => c.diasMasAntiguo ?? '—', orden: c => c.diasMasAntiguo ?? -1,
        tipo: 'numero', align: 'center',
      },
      {
        key: 'estado', label: 'Estado', align: 'center',
        valor: c => {
          const e = estadoAntiguedad(c.diasMasAntiguo, c.lado);
          return e ? etiquetaEstadoAntiguedad(e, c.lado) : '—';
        },
        orden: c => c.diasMasAntiguo ?? -1,
        clase: c => {
          const e = estadoAntiguedad(c.diasMasAntiguo, c.lado);
          return e ? CLASE_ESTADO_ANTIGUEDAD[e] : '';
        },
      },
      { key: 'sinFacturar', label: 'Sin facturar', valor: c => c.sinFacturar, orden: c => c.sinFacturar, tipo: 'moneda', clase: 'text-muted' },
      {
        key: 'saldoAFavor', label: cobrar ? 'Saldo a favor' : 'Anticipos', valor: c => c.saldoAFavor, orden: c => c.saldoAFavor,
        tipo: 'moneda', clase: 'text-muted',
      },
    );
    return columnas;
  }
}
```

### 3b — `finanzas-antiguedad.component.html`

```html
<div class="d-flex flex-wrap gap-2 align-items-center mt-3 mb-3">
  <div class="btn-group" role="group" aria-label="Lado de la cuenta">
    <button
      type="button"
      class="btn"
      [ngClass]="filtros.lado === 'cobrar' ? 'btn-primary' : 'btn-outline-primary'"
      (click)="cambiarLado('cobrar')"
    >A cobrar · Clientes</button>
    <button
      type="button"
      class="btn"
      [ngClass]="filtros.lado === 'pagar' ? 'btn-primary' : 'btn-outline-primary'"
      (click)="cambiarLado('pagar')"
    >A pagar · Choferes y proveedores</button>
  </div>
  <input
    class="form-control buscador"
    type="text"
    [ngModel]="filtros.texto"
    (ngModelChange)="onTexto($event)"
    placeholder="Buscar por nombre o CUIT"
  />
  <span class="ms-auto text-muted">{{ filtradas.length }} de {{ delLado.length }} cuenta(s) · al {{ hoyLegible }}</span>
</div>

@if (error) {
  <div class="alert alert-danger">{{ error }}</div>
}

<div class="row g-3 mb-2">
  @for (t of tramos; track t) {
    <div class="col-6 col-lg">
      <div class="card tarjeta h-100" [ngClass]="'tramo-' + $index">
        <div class="card-body">
          <div class="tarjeta-label">{{ etiquetaTramo(t) }}</div>
          <div class="tarjeta-valor" [class.text-danger]="t === '90+' && totales.tramos[t] > 0">
            {{ totales.tramos[t] | formatearValor: '$' }}
          </div>
          <div class="tarjeta-pct">{{ porcentajes[t] }} %</div>
        </div>
      </div>
    </div>
  }
  <div class="col-12 col-lg">
    <div class="card tarjeta tarjeta-total h-100">
      <div class="card-body">
        <div class="tarjeta-label">{{ filtros.lado === 'cobrar' ? 'Nos deben (facturado)' : 'Les debemos (facturado)' }}</div>
        <div class="tarjeta-valor">{{ totales.saldoFacturado | formatearValor: '$' }}</div>
        <div class="tarjeta-pct">{{ delLado.length }} cuenta(s)</div>
      </div>
    </div>
  </div>
</div>

<div class="barra-tramos mb-3" role="img" [attr.aria-label]="'Reparto por antigüedad'">
  @for (t of tramos; track t) {
    @if (porcentajes[t] > 0) {
      <div class="segmento" [ngClass]="'tramo-' + $index" [style.width.%]="porcentajes[t]" [title]="etiquetaTramo(t) + ': ' + porcentajes[t] + ' %'">
        @if (porcentajes[t] >= 6) {
          {{ porcentajes[t] }} %
        }
      </div>
    }
  }
</div>

<div class="d-flex flex-wrap gap-2 align-items-center mb-3">
  <span class="text-muted me-1">Estado (factura más antigua):</span>
  @for (e of estados; track e) {
    <button
      type="button"
      class="btn btn-sm chip-estado"
      [ngClass]="['estado-' + e, filtros.estado === e ? 'activo' : '']"
      (click)="cambiarEstado(e)"
    >
      {{ etiquetaEstado(e) }} <span class="text-muted small">({{ rangoEstado(e) }})</span>: <b>{{ conteo[e] }}</b>
    </button>
  }
  @if (filtros.estado !== 'todos') {
    <button type="button" class="btn btn-sm btn-link" (click)="cambiarEstado(filtros.estado)">Ver todos</button>
  }
</div>

<app-tabla-listado
  [items]="filtradas"
  [columnas]="columnas"
  [ordenInicial]="ordenInicial"
  [cargando]="cargando"
  [trackKey]="trackCuenta"
  [acciones]="acciones"
  (accion)="onAccion($event)"
  [mensajeVacio]="filtros.lado === 'cobrar' ? 'No hay clientes con facturas abiertas.' : 'No hay choferes ni proveedores con facturas abiertas.'"
></app-tabla-listado>

<p class="text-muted small mt-2">
  Antigüedad al día de hoy, contada desde la <b>fecha de la factura</b>. Solo entran las cuentas con facturas abiertas
  (las demás se ven en Cuentas). <b>Sin facturar</b> y <b>{{ filtros.lado === 'cobrar' ? 'saldo a favor' : 'anticipos' }}</b>
  son referencia: no entran en los tramos. Tarjetas, barra y estados son del lado completo (no cambian con el buscador).
</p>
```

### 3c — `finanzas-antiguedad.component.scss`

```scss
.buscador {
  max-width: 22rem;
}

.tarjeta {
  border-left: 4px solid #0d6efd;
}

.tarjeta-total {
  border-left-color: #0d6efd;
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

.tarjeta-pct {
  font-size: 0.85rem;
  color: #6c757d;
  font-variant-numeric: tabular-nums;
}

.barra-tramos {
  display: flex;
  height: 1.6rem;
  border-radius: 0.375rem;
  overflow: hidden;
  background-color: #e9ecef;
}

.segmento {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
}

// Colores por tramo (tarjetas y barra): verde → amarillo → naranja → rojo.
.tarjeta.tramo-0 { border-left-color: #198754; }
.tarjeta.tramo-1 { border-left-color: #ffc107; }
.tarjeta.tramo-2 { border-left-color: #fd7e14; }
.tarjeta.tramo-3 { border-left-color: #dc3545; }
.segmento.tramo-0 { background-color: #198754; }
.segmento.tramo-1 { background-color: #ffc107; }
.segmento.tramo-2 { background-color: #fd7e14; }
.segmento.tramo-3 { background-color: #dc3545; }

// Texto oscuro sobre el amarillo.
.segmento.tramo-1 {
  color: #212529;
}

.chip-estado {
  border: 1px solid #dee2e6;
  background-color: #fff;
}

.chip-estado.activo {
  box-shadow: 0 0 0 2px #0d6efd;
}

.estado-al-dia {
  border-left: 4px solid #198754;
}

.estado-atencion {
  border-left: 4px solid #ffc107;
}

.estado-critico {
  border-left: 4px solid #dc3545;
}
```

## PASO 4 — `src/app/raiz/finanzas-nueva/finanzas-nueva.module.ts`

#### 4a

BUSCAR:
```ts
import { CuentaEntidadComponent } from './cuenta-entidad/cuenta-entidad.component';
```

REEMPLAZAR:
```ts
import { CuentaEntidadComponent } from './cuenta-entidad/cuenta-entidad.component';
import { FinanzasAntiguedadComponent } from './antiguedad/finanzas-antiguedad.component';
```

#### 4b

BUSCAR:
```ts
    HistoriaComprobanteComponent,
  ],
```

REEMPLAZAR:
```ts
    HistoriaComprobanteComponent,
    FinanzasAntiguedadComponent,
  ],
```

## PASO 5 — `src/app/raiz/finanzas-nueva/finanzas-nueva-routing.module.ts`

#### 5a

BUSCAR:
```ts
import { CuentaEntidadComponent } from './cuenta-entidad/cuenta-entidad.component';
```

REEMPLAZAR:
```ts
import { CuentaEntidadComponent } from './cuenta-entidad/cuenta-entidad.component';
import { FinanzasAntiguedadComponent } from './antiguedad/finanzas-antiguedad.component';
```

#### 5b

BUSCAR:
```ts
      { path: 'movimientos', component: FinanzasMovimientosComponent },
```

REEMPLAZAR:
```ts
      { path: 'antiguedad', component: FinanzasAntiguedadComponent },
      { path: 'movimientos', component: FinanzasMovimientosComponent },
```

## PASO 6 — `src/app/raiz/finanzas-nueva/control/finanzas-nueva-control.component.ts`

#### 6a

BUSCAR:
```ts
    { id: 'movimientos', name: 'Movimientos', route: 'finanzasNueva/movimientos' },
```

REEMPLAZAR:
```ts
    { id: 'antiguedad', name: 'Antigüedad', route: 'finanzasNueva/antiguedad' },
    { id: 'movimientos', name: 'Movimientos', route: 'finanzasNueva/movimientos' },
```

## PASO 7 — `src/app/raiz/finanzas-nueva/cuenta-entidad/cuenta-entidad.component.ts`

#### 7a

BUSCAR:
```ts
      saldoMas60: 0,
      diasMasAntiguo: this.resumen.diasMasAntiguo,
```

REEMPLAZAR:
```ts
      saldoMas60: 0,
      tramos: { ...this.resumen.tramos },
      diasMasAntiguo: this.resumen.diasMasAntiguo,
```

#### 7b

BUSCAR:
```ts
  volver(): void {
    this.router.navigate(['/finanzasNueva/cuentas']);
  }
```

REEMPLAZAR:
```ts
  /** Pestaña desde la que se abrió la cuenta (?origen=…, F6a); por defecto
   *  Cuentas. Solo valores conocidos: un origen inventado vuelve a Cuentas. */
  get origen(): { ruta: string; etiqueta: string } {
    const o = this.route.snapshot.queryParamMap.get('origen');
    if (o === 'antiguedad') return { ruta: '/finanzasNueva/antiguedad', etiqueta: 'Antigüedad' };
    return { ruta: '/finanzasNueva/cuentas', etiqueta: 'Cuentas' };
  }

  volver(): void {
    this.router.navigate([this.origen.ruta]);
  }
```

## PASO 8 — `src/app/raiz/finanzas-nueva/cuenta-entidad/cuenta-entidad.component.html`

#### 8a

BUSCAR:
```html
(click)="volver()">← Cuentas</button>
```

REEMPLAZAR:
```html
(click)="volver()">← {{ origen.etiqueta }}</button>
```

## PASO 9 — Verificación

```bash
npm run build:demo
grep -c "tramos" src/app/shared/utils/cuentas-finanzas.util.ts   # 17
grep -c "export function estadoAntiguedad\|export function tramosEnCero\|export function porcentajesTramos\|export function contarPorEstado" src/app/shared/utils/cuentas-finanzas.util.ts   # 4
grep -c "filtrosAntiguedad" src/app/servicios/finanzas-nueva/finanzas-consulta.service.ts   # 1
grep -c "FinanzasAntiguedadComponent" src/app/raiz/finanzas-nueva/finanzas-nueva.module.ts src/app/raiz/finanzas-nueva/finanzas-nueva-routing.module.ts   # 2 y 2
grep -n "antiguedad" src/app/raiz/finanzas-nueva/control/finanzas-nueva-control.component.ts   # 1 línea
grep -n "tramos: {" src/app/raiz/finanzas-nueva/cuenta-entidad/cuenta-entidad.component.ts   # 1 línea
git status --short
```

Esperado:

- El build termina sin errores. Los warnings de presupuesto previos no
  cuentan.
- Los conteos coinciden.
- `git status` muestra:
  - 7 archivos modificados: util, consulta, módulo, routing, control y
    `cuenta-entidad` (ts y html);
  - la carpeta nueva `raiz/finanzas-nueva/antiguedad/`;
  - lo tuyo sin trackear, si lo hay.

Reportá la salida.

## Pruebas manuales (demo)

1. **Pestañas:** Cuentas · Antigüedad · Movimientos. Antigüedad se resalta
   al entrar y la URL es `/finanzasNueva/antiguedad`.
2. **A cobrar:**
   - las 4 tarjetas de tramo suman el total "Nos deben (facturado)", y ese
     total coincide con la tarjeta "Nos deben (facturado)" de Cuentas;
   - la barra muestra los 4 colores en proporción, con el % adentro si el
     segmento es ancho;
   - la tabla abre ordenada por +90 descendente; cada fila: los 4 tramos
     suman su "Facturado abierto"; los tramos en 0 en gris; +90 en rojo.
3. **Estado:** un cliente con su factura más antigua de 61–90 días dice
   "Atención" (amarillo); +90, "Crítico" (rojo); hasta 60, "Al día"
   (verde). Los chips muestran la cantidad de cada uno; un click filtra, otro
   click en el mismo (o "Ver todos") quita el filtro. Las tarjetas y la
   barra no cambian al filtrar.
4. **A pagar:** columna Tipo (chofer / proveedor); los chips dicen "≤ 15
   días", "16–30 días" y "Atrasado (+30 días)". Un chofer con factura de 20
   días aparece en "Atención".
5. **Buscador:** filtra la tabla por nombre o CUIT; las tarjetas no cambian;
   el contador dice "N de M cuenta(s)".
6. **Sesión:** elegir A pagar, filtrar "Atrasado", ir a Movimientos y
   volver: sigue en A pagar con el filtro.
7. **Ver cuenta:**
   - desde Antigüedad abre la cuenta con `?origen=antiguedad` en la URL, el
     botón dice "← Antigüedad" y vuelve a Antigüedad;
   - desde Cuentas, el botón sigue diciendo "← Cuentas";
   - `/finanzasNueva/cuenta/cliente/<id>?origen=xxx` vuelve a Cuentas.
   - Los tramos de la cuenta coinciden con los de su fila en Antigüedad.
8. **Regresión de Cuentas:** tarjetas, tabla, "+60 días" y "Registrar
   cobro/pago" iguales que antes. Registrar desde la cuenta de la entidad
   sigue funcionando (el objeto que arma ahora lleva `tramos`).

## Commit (lo hace Nico)

```
feat(finanzas): pestaña Antigüedad (F6a)

- Antigüedad: facturado abierto por entidad en tramos 0-30 / 31-60 /
  61-90 / +90 desde la fecha de la factura, al día de hoy; A cobrar / A
  pagar, buscador, tarjetas por tramo con %, barra apilada; estado por
  días de la factura más antigua con umbrales por lado (cobrar 60/90,
  pagar 15/30) y chips que filtran; Ver cuenta. Filtros de sesión.
- cuentas-finanzas.util: CuentaEntidadFin/TotalesCuentas suman tramos;
  tramosEnCero, UMBRALES_ANTIGUEDAD, estadoAntiguedad, etiquetas,
  porcentajesTramos, contarPorEstado.
- Cuenta de la entidad: vuelve a la pestaña de origen (?origen=antiguedad).
```

FIN DE LA INSTRUCCIÓN F6a
````
