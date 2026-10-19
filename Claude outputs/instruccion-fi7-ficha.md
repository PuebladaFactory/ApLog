````
Si no ves la línea FIN DE LA INSTRUCCIÓN FI7 al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN FI7 — Ficha de entidad: detalle de valores de una tarifa (ApLog, rama refactor)
============================================================================================

## Contexto y razonamiento

Bloque posterior al cierre del frente "Ficha de entidad", con la alternativa de F3 que quedó
para analizar (diseño: `claude/diseno-ficha-entidad.md`, §11). En la pestaña Tarifas de la
ficha, cada tarifa (General, Personalizadas y Especiales) suma **"Ver valores"**, que despliega
debajo del renglón el detalle de sus valores. Solo lectura, sin edición.

**Decisiones (§11):**
- **Solo el lado de la entidad**, con la MISMA regla que el motor
  (`ValoresTarifaService.calcularLado`), para que lo que se ve sea lo que se aplica en una
  operación:
  - cliente → "A cobrar" (`aCobrar`, `adicionalKmACobrar`, `acompanianteACobrar`);
  - chofer directo → "A pagar" (`aPagar`, `adicionalKmAPagar`, `acompanianteAPagar`);
  - proveedor y chofer de proveedor → "A pagar al proveedor": la columna del proveedor si la
    tarifa la tiene cargada, si no la de chofer (`aPagarProveedor ?? aPagar`, ídem adicional y
    acompañante);
  - Especial → "Valor" (`valor`, `adicionalKm`, `adicionalAcompaniante`).
  Con adicional por km: columnas "1er sector" e "Intervalo" y, arriba, "después de P km, por
  tramos de S km" (`kmDistancia`). Tarifa por km: la columna dice "(por km)".
- **Categorías de sus vehículos:** chofer directo → los suyos; chofer de proveedor → los suyos
  más los del proveedor; proveedor → los del proveedor; cliente → ninguno. Se comparan por
  NOMBRE de categoría (como `resolverSeccionCategoria`); con varias secciones, en todas. Una
  tarifa por km tiene categorías libres: no se compara.
  - Columna "Vehículos" con los dominios de cada categoría.
  - Aviso por cada vehículo cuya categoría no está en la tarifa ("La categoría Semi (XY987ZW)
    no está en esta tarifa: no se puede usar para ese vehículo"): es justo el caso en que el
    motor descarta esa tarifa para ese vehículo.
- **Vista inicial (b):** si hay vehículos que coinciden, solo sus categorías, con "Ver todas las
  categorías"; al ver todas, las suyas quedan resaltadas. Si no coincide ninguno (o es cliente,
  o la tarifa es por km), todas.
- **Componente nuevo** (`FichaTarifaDetalleComponent`), no los viewers de `raiz/tarifas`: esos
  dibujan la tabla completa con los tres grupos de columnas y sirven a las pantallas de Tarifas,
  que no se tocan.

**Piezas:**
- NUEVO `ficha-tarifa-detalle/` (ts, html, scss): presentación; recibe `DetalleTarifaFicha`.
  Guarda solo el estado "solo sus categorías / todas" (la vista inicial se decide una vez; con
  datos vivos se respeta lo que eligió el usuario).
- REEMPLAZO COMPLETO de los tres archivos de `ficha-tarifas/` (FI4; el PASO 0 verifica sus
  hashes):
  - `ficha-tarifas.util.ts`: `LadoTarifaFicha`, `VehiculoFicha`, `ContextoTarifaFicha`,
    `RenglonDetalleTarifa`, `DetalleTarifaFicha` y `detalleTarifaFicha` (puro, con la regla de
    arriba). `filaTarifaFicha` / `filasTarifasFicha` reciben el contexto (antes, solo
    `nombreCliente`) y cada fila trae su `detalle`;
  - `ficha-tarifas.component.ts/.html`: "Ver valores / Ocultar valores" por renglón (también
    en la línea de la General); el detalle va en una fila debajo.
- `FichaEntidadComponent.armarTarifas`: arma el contexto (lado y vehículos de la entidad, que la
  ficha ya tiene en memoria).
- `SharedModule` declara el componente nuevo.

**Verificación previa (sobre una copia del repo en el estado de FI6, comparada antes con tu
repo: los 7 archivos involucrados son iguales):**
- 4 BUSCAR, cada uno encontrado una sola vez (validados todos antes de escribir); el resultado
  coincide con la referencia;
- `tsc` limpio (también `--noUnusedLocals`);
- pruebas de render con Karma + Chromium (5 casos):
  - chofer directo, General: solo "A pagar" (no "A cobrar"), solo la Maxi de su vehículo con su
    dominio, aviso por la Semi que no está, acompañante y adicional; "Ver todas" muestra el
    Furgón y deja resaltada solo la Maxi;
  - chofer directo, Especial: "Valor" y avisos por las dos categorías que no cubre;
  - chofer de proveedor: "A pagar al proveedor" (750 del Furgón) y fallback a "A pagar" en la
    Maxi sin valor de proveedor (1.400); acompañante del proveedor;
  - cliente: "A cobrar", todas las categorías, sin columna Vehículos; abrir y cerrar;
  - personalizada por km con dos secciones: "(por km)", columna Sección, sin adicional;
- `build:demo` con las mismas 9 advertencias; inicial 1,53 MB; el chunk compartido de la ficha
  pasa de ≈ 51 a ≈ 59 kB.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- NO corras `npm run deploy:*`, `npm run build` ni `node set-version.js`. Para compilar usá
  `npm run build:demo`.
- Validá TODOS los BUSCAR antes de escribir el primero; después aplicá los pasos EN ORDEN.
- Si un texto a BUSCAR no está o aparece más de una vez: detenete y reportá. Los BUSCAR son
  líneas completas.
- Editá cada archivo en el lugar (leer, reemplazar, escribir); nunca abras un archivo para
  escritura antes de haber leído su contenido. Los archivos de REEMPLAZO COMPLETO se escriben con
  el contenido dado, solo si el PASO 0 confirmó su hash.
- Archivos NUEVOS: crealos exactamente con el contenido dado. Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md (al terminar el análisis de F7 se documenta todo junto).

## PASO 0 — Verificación (sin modificar nada)

```
git status --short
git hash-object src/app/shared/ficha-entidad/ficha-tarifas/ficha-tarifas.util.ts src/app/shared/ficha-entidad/ficha-tarifas/ficha-tarifas.component.ts src/app/shared/ficha-entidad/ficha-tarifas/ficha-tarifas.component.html src/app/shared/ficha-entidad/ficha-entidad.component.ts
grep -n "^import { TarifasFicha\|    let personalizadas: TarifasFicha\|^  private armarTarifas" src/app/shared/ficha-entidad/ficha-entidad.component.ts
grep -n "FichaTarifasComponent" src/app/shared/shared.module.ts
grep -rln "ficha-tarifa-detalle\|FichaTarifaDetalle\|detalleTarifaFicha" src/app
```
Esperado:
1. Nada (o solo `Claude outputs/`).
2. Exactamente (los de FI4 y FI6):
   - `992d129474577bc30ed0cd285a59215e0dcceff1` (`ficha-tarifas.util.ts`);
   - `bba307231e6bf3eed565aeab9e99c35f386c4b62` (`ficha-tarifas.component.ts`);
   - `7ec5ecfdb376549c80d62b1ec89b6b619f37ca14` (`ficha-tarifas.component.html`);
   - `a6061ac84076b49454c9afc16b747207bfb78151` (`ficha-entidad.component.ts`).
   Si alguno de los tres primeros no coincide, NO sigas: se reemplazan completos.
3. 19, 266 y 271.
4. 61 y 114.
5. Nada.

Si algo no coincide, detenete y reportá.

## PASO 1 — Archivos NUEVOS (3)

1.1 NUEVO `src/app/shared/ficha-entidad/ficha-tarifa-detalle/ficha-tarifa-detalle.component.ts`
```
import { Component, Input, OnChanges } from '@angular/core';
import { DetalleTarifaFicha, RenglonDetalleTarifa } from '../ficha-tarifas/ficha-tarifas.util';

/**
 * Detalle de valores de una tarifa en la ficha (FI7): solo el lado de la
 * entidad, con las categorías de sus vehículos resaltadas. Vista inicial: si
 * hay vehículos que coinciden, solo sus categorías ("Ver todas" muestra el
 * resto como referencia). Solo presentación, sin edición.
 */
@Component({
  selector: 'app-ficha-tarifa-detalle',
  standalone: false,
  templateUrl: './ficha-tarifa-detalle.component.html',
  styleUrl: './ficha-tarifa-detalle.component.scss',
})
export class FichaTarifaDetalleComponent implements OnChanges {

  @Input({ required: true }) detalle!: DetalleTarifaFicha;

  soloSusCategorias = false;
  private inicializado = false;

  ngOnChanges(): void {
    // La vista inicial se decide una vez; si los datos se actualizan (datos
    // vivos) se respeta lo que eligió el usuario, salvo que ya no haya
    // vehículos que coincidan.
    if (!this.inicializado) {
      this.soloSusCategorias = this.detalle.conVehiculos;
      this.inicializado = true;
    } else if (!this.detalle.conVehiculos) {
      this.soloSusCategorias = false;
    }
  }

  get renglones(): RenglonDetalleTarifa[] {
    return this.soloSusCategorias
      ? this.detalle.renglones.filter(r => r.dominios.length > 0)
      : this.detalle.renglones;
  }

  get conAdicionalKm(): boolean {
    return this.detalle.kmDistancia !== null;
  }
}
```

1.2 NUEVO `src/app/shared/ficha-entidad/ficha-tarifa-detalle/ficha-tarifa-detalle.component.html`
```
<div class="detalle-tarifa border rounded p-2">
  <div class="text-muted mb-1">
    {{ detalle.columna }}{{ detalle.porKm ? ' (por km)' : '' }}
    @if (detalle.acompaniante !== null) {
      · Acompañante: <span class="col-numero">{{ detalle.acompaniante | formatearValor : "$" }}</span>
    }
    @if (detalle.kmDistancia; as km) {
      · Adicional por km: después de {{ km.primerSector }} km, por tramos de {{ km.sectoresSiguientes }} km
    }
  </div>

  @for (faltante of detalle.categoriasFaltantes; track faltante) {
    <div class="alert alert-warning py-1 px-2 mb-1">
      La categoría {{ faltante }} no está en esta tarifa: no se puede usar para ese vehículo.
    </div>
  }

  @if (detalle.conVehiculos) {
    <div class="mb-1">
      <button type="button" class="btn btn-sm btn-link p-0" (click)="soloSusCategorias = !soloSusCategorias">
        {{ soloSusCategorias ? 'Ver todas las categorías' : 'Solo las categorías de sus vehículos' }}
      </button>
    </div>
  }

  @if (renglones.length === 0) {
    <p class="text-muted mb-0">La tarifa no tiene categorías cargadas.</p>
  } @else {
    <div class="table-responsive">
      <table class="table table-sm table-bordered align-middle mb-0">
        <thead>
          <tr>
            @if (detalle.variasSecciones) {
              <th>Sección</th>
            }
            <th>Categoría</th>
            <th class="text-end">{{ detalle.columna }}</th>
            @if (conAdicionalKm) {
              <th class="text-end">1er sector</th>
              <th class="text-end">Intervalo</th>
            }
            @if (detalle.conVehiculos) {
              <th>Vehículos</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (r of renglones; track $index) {
            <tr [class.table-primary]="r.dominios.length > 0 && !soloSusCategorias">
              @if (detalle.variasSecciones) {
                <td>{{ r.seccion || '—' }}</td>
              }
              <td>{{ r.categoria }}</td>
              <td class="text-end col-numero">{{ r.base !== null ? (r.base | formatearValor : "$") : '—' }}</td>
              @if (conAdicionalKm) {
                <td class="text-end col-numero">{{ r.primerSector !== null ? (r.primerSector | formatearValor : "$") : '—' }}</td>
                <td class="text-end col-numero">{{ r.intervalo !== null ? (r.intervalo | formatearValor : "$") : '—' }}</td>
              }
              @if (detalle.conVehiculos) {
                <td>{{ r.dominios.join(', ') || '—' }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  }
</div>
```

1.3 NUEVO `src/app/shared/ficha-entidad/ficha-tarifa-detalle/ficha-tarifa-detalle.component.scss`
```
// Bootstrap fija .btn en rem: sin esto no escala con el tamaño de letra de la ficha.
.btn {
  font-size: 1em;
}

.detalle-tarifa {
  background-color: var(--bs-tertiary-bg);
}

.col-numero {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
```

## PASO 2 — REEMPLAZO COMPLETO (solo si el PASO 0 confirmó el hash)

2.1 REEMPLAZO COMPLETO `src/app/shared/ficha-entidad/ficha-tarifas/ficha-tarifas.util.ts` (todo el contenido del archivo pasa a ser este)
```
import { NivelHabilitado } from 'src/app/interfaces/tarifa-habilitada';
import { AdicionalKmValores, KmDistancia, Tarifa } from 'src/app/interfaces/tarifa';
import { TarifaEspecial } from 'src/app/interfaces/tarifa-especial';
import { fechaLegible } from 'src/app/shared/utils/fecha.util';

/** Qué lado de la tarifa le corresponde a la entidad de la ficha (FI7). */
export type LadoTarifaFicha = 'cliente' | 'chofer' | 'proveedor';

/** Vehículo de la entidad, para resaltar sus categorías en el detalle. */
export interface VehiculoFicha {
  dominio: string;
  categoria: string;
}

/** Lo que la ficha sabe de la entidad para armar los renglones de tarifas. */
export interface ContextoTarifaFicha {
  lado: LadoTarifaFicha;
  /** Chofer: los suyos; chofer de proveedor y proveedor: los del proveedor; cliente: ninguno. */
  vehiculos: VehiculoFicha[];
  /** Resuelve el cliente del alcance de una especial (undefined = dado de baja). */
  nombreCliente: (idCliente: string) => string | undefined;
}

/** Un renglón (sección + categoría) del detalle de valores. */
export interface RenglonDetalleTarifa {
  /** Nombre de la sección; null si es la sección única sin nombre. */
  seccion: string | null;
  categoria: string;
  base: number | null;
  primerSector: number | null;
  intervalo: number | null;
  /** Dominios de los vehículos de la entidad con esta categoría. */
  dominios: string[];
}

/** Detalle de valores de una tarifa, SOLO del lado de la entidad (FI7). */
export interface DetalleTarifaFicha {
  /** Nombre de la columna: 'A cobrar', 'A pagar', 'A pagar al proveedor' o 'Valor'. */
  columna: string;
  /** Tarifa por km: la base es por km (categorías libres, sin resaltado). */
  porKm: boolean;
  /** Escalones del adicional por km; null si la tarifa no tiene adicional. */
  kmDistancia: KmDistancia | null;
  acompaniante: number | null;
  variasSecciones: boolean;
  renglones: RenglonDetalleTarifa[];
  /** Hay al menos un renglón con vehículos de la entidad (vista inicial: solo esos). */
  conVehiculos: boolean;
  /** Vehículos cuya categoría no está en la tarifa: "Semi (XY987ZW)". */
  categoriasFaltantes: string[];
}

/** Renglón de una tarifa en la pestaña Tarifas de la ficha (sin valores, F3). */
export interface FilaTarifaFicha {
  idTarifa: string;
  nombre: string;
  modo: string;
  vigenteDesde: string;
  categorias: string;
  /** Solo especiales de chofer/proveedor: con qué cliente rige. null = no aplica. */
  alcance: string | null;
  /** Valores del lado de la entidad, para "Ver valores" (FI7). */
  detalle: DetalleTarifaFicha;
}

/** Lo que muestra la pestaña Tarifas de una entidad. */
export interface TarifasFicha {
  niveles: NivelHabilitado[];
  /** Chofer de proveedor: razón social del proveedor del que hereda; null si no hereda. */
  heredadoDe: string | null;
  general: FilaTarifaFicha | null;
  personalizadas: FilaTarifaFicha[];
  especiales: FilaTarifaFicha[];
}

/** Hasta este número de categorías se listan por nombre; más, se cuentan. */
const MAX_CATEGORIAS_LISTADAS = 4;

const COLUMNA_LADO: Readonly<Record<LadoTarifaFicha, string>> = {
  cliente: 'A cobrar',
  chofer: 'A pagar',
  proveedor: 'A pagar al proveedor',
};

/** Copia ordenada por `orden` (secciones y categorías). */
function porOrden<T extends { orden: number }>(lista: T[] | null | undefined): T[] {
  return [...(lista ?? [])].sort((a, b) => a.orden - b.orden);
}

function categoriasDe(tarifa: Tarifa | TarifaEspecial): string {
  const nombres = [...new Set(
    (tarifa.secciones ?? []).flatMap(s => (s.categorias ?? []).map(c => (c.nombre ?? '').trim())),
  )].filter(n => n !== '');
  if (nombres.length === 0) return '—';
  if (nombres.length <= MAX_CATEGORIAS_LISTADAS) return nombres.join(', ');
  return `${nombres.length} categorías`;
}

/**
 * Valores de una tarifa del lado de la entidad, con la MISMA regla que el
 * motor (ValoresTarifaService.calcularLado):
 * - cliente → aCobrar / adicionalKmACobrar / acompanianteACobrar;
 * - chofer directo → aPagar / adicionalKmAPagar / acompanianteAPagar;
 * - proveedor y chofer de proveedor → la columna del proveedor si está cargada,
 *   si no la de chofer (aPagarProveedor ?? aPagar, ídem adicional y acompañante);
 * - especial → valor / adicionalKm / adicionalAcompaniante (una sola columna).
 * Las categorías de los vehículos se buscan por NOMBRE (como
 * resolverSeccionCategoria); una tarifa por km tiene categorías libres y no se
 * compara.
 */
export function detalleTarifaFicha(tarifa: Tarifa | TarifaEspecial, ctx: ContextoTarifaFicha): DetalleTarifaFicha {
  const porKm = tarifa.modoTarifacion === 'km';
  const comparaVehiculos = !porKm && ctx.vehiculos.length > 0;
  const dominiosDe = (categoria: string) =>
    comparaVehiculos ? ctx.vehiculos.filter(v => v.categoria === categoria).map(v => v.dominio).sort() : [];
  const renglones: RenglonDetalleTarifa[] = [];
  let acompaniante: number | null;

  const adicional = (a: AdicionalKmValores | undefined) => ({
    primerSector: a?.primerSector ?? null,
    intervalo: a?.sectoresSiguientes ?? null,
  });

  if (tarifa.nivel === 'especial') {
    acompaniante = tarifa.adicionalAcompaniante ?? null;
    for (const s of porOrden(tarifa.secciones)) {
      for (const c of porOrden(s.categorias)) {
        renglones.push({
          seccion: s.nombre, categoria: c.nombre, base: c.valor ?? null,
          ...adicional(c.adicionalKm), dominios: dominiosDe(c.nombre),
        });
      }
    }
  } else {
    const t = tarifa as Tarifa;
    if (ctx.lado === 'cliente') {
      acompaniante = t.acompanianteACobrar ?? null;
    } else if (ctx.lado === 'chofer') {
      acompaniante = t.acompanianteAPagar ?? null;
    } else {
      acompaniante = t.acompanianteAPagarProveedor ?? t.acompanianteAPagar ?? null;
    }
    for (const s of porOrden(t.secciones)) {
      for (const c of porOrden(s.categorias)) {
        let base: number | undefined;
        let km: AdicionalKmValores | undefined;
        if (ctx.lado === 'cliente') {
          base = c.aCobrar; km = c.adicionalKmACobrar;
        } else if (ctx.lado === 'chofer') {
          base = c.aPagar; km = c.adicionalKmAPagar;
        } else {
          base = c.aPagarProveedor ?? c.aPagar; km = c.adicionalKmAPagarProveedor ?? c.adicionalKmAPagar;
        }
        renglones.push({
          seccion: s.nombre, categoria: c.nombre, base: base ?? null,
          ...adicional(km), dominios: dominiosDe(c.nombre),
        });
      }
    }
  }

  const nombresCategorias = new Set(renglones.map(r => r.categoria));
  const categoriasFaltantes = comparaVehiculos
    ? ctx.vehiculos
        .filter(v => !nombresCategorias.has(v.categoria))
        .map(v => `${v.categoria || 'Sin categoría'} (${v.dominio})`)
    : [];

  return {
    columna: tarifa.nivel === 'especial' ? 'Valor' : COLUMNA_LADO[ctx.lado],
    porKm,
    kmDistancia: tarifa.kmDistancia ?? null,
    acompaniante,
    variasSecciones: (tarifa.secciones ?? []).length > 1,
    renglones,
    conVehiculos: renglones.some(r => r.dominios.length > 0),
    categoriasFaltantes,
  };
}

/** Una tarifa (general, personalizada o especial) como renglón de la ficha. */
export function filaTarifaFicha(tarifa: Tarifa | TarifaEspecial, ctx: ContextoTarifaFicha): FilaTarifaFicha {
  let alcance: string | null = null;
  if (tarifa.nivel === 'especial' && tarifa.entidadTipo !== 'cliente') {
    alcance = tarifa.alcance?.tipo === 'entidadCliente'
      ? `Solo con ${ctx.nombreCliente(tarifa.alcance.idCliente) ?? 'un cliente dado de baja'}`
      : 'Con todos los clientes';
  }
  return {
    idTarifa: tarifa.idTarifa,
    nombre: (tarifa.nombre ?? '').trim() || '(sin nombre)',
    modo: tarifa.modoTarifacion === 'km' ? 'Por km' : 'Por categoría',
    vigenteDesde: fechaLegible(tarifa.vigenciaDesde),
    categorias: categoriasDe(tarifa),
    alcance,
    detalle: detalleTarifaFicha(tarifa, ctx),
  };
}

/** Renglones por nombre (las vigentes de una entidad pueden ser varias). */
export function filasTarifasFicha(tarifas: (Tarifa | TarifaEspecial)[], ctx: ContextoTarifaFicha): FilaTarifaFicha[] {
  return tarifas
    .map(t => filaTarifaFicha(t, ctx))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}
```

2.2 REEMPLAZO COMPLETO `src/app/shared/ficha-entidad/ficha-tarifas/ficha-tarifas.component.ts` (todo el contenido del archivo pasa a ser este)
```
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FilaTarifaFicha, TarifasFicha } from './ficha-tarifas.util';

/**
 * Pestaña "Tarifas" de la ficha (chofer, proveedor y cliente): niveles
 * habilitados y tarifas vigentes HOY (F3 (b)). "Ver valores" despliega debajo
 * del renglón el detalle del lado de la entidad (FI7, FichaTarifaDetalle).
 * "Ver en Tarifas" emite la pestaña de destino y el contenedor cierra la ficha
 * y navega. Solo presentación.
 */
@Component({
  selector: 'app-ficha-tarifas',
  standalone: false,
  templateUrl: './ficha-tarifas.component.html',
  styleUrl: './ficha-tarifas.component.scss',
})
export class FichaTarifasComponent {

  @Input({ required: true }) tarifas!: TarifasFicha;
  /** Pestaña del módulo Tarifas: 'general' | 'personalizada' | 'especial' | 'eventual'. */
  @Output() irATarifas = new EventEmitter<string>();

  /** idTarifa de los renglones con el detalle desplegado. */
  abiertas = new Set<string>();

  habilitado(nivel: string): boolean {
    return (this.tarifas.niveles as string[]).includes(nivel);
  }

  /** La columna Alcance solo tiene sentido en especiales de chofer/proveedor. */
  conAlcance(filas: FilaTarifaFicha[]): boolean {
    return filas.some(f => f.alcance !== null);
  }

  alternar(idTarifa: string): void {
    if (this.abiertas.has(idTarifa)) {
      this.abiertas.delete(idTarifa);
    } else {
      this.abiertas.add(idTarifa);
    }
  }
}
```

2.3 REEMPLAZO COMPLETO `src/app/shared/ficha-entidad/ficha-tarifas/ficha-tarifas.component.html` (todo el contenido del archivo pasa a ser este)
```
<h6>Niveles habilitados</h6>
@if (tarifas.heredadoDe) {
  <p class="text-muted mb-1">Chofer de proveedor: heredados del proveedor {{ tarifas.heredadoDe }}.</p>
}
<div class="d-flex flex-wrap gap-1 mb-3">
  @for (nivel of tarifas.niveles; track nivel) {
    <span class="badge" [ngClass]="nivel | claseNivelTarifa">{{ nivel | etiquetaNivelTarifa }}</span>
  } @empty {
    <span class="text-muted">Sin tarifas habilitadas.</span>
  }
</div>

@if (habilitado('general')) {
  <div class="d-flex align-items-center gap-2 mt-3">
    <h6 class="mb-0">General</h6>
    <button type="button" class="btn btn-sm btn-link p-0" (click)="irATarifas.emit('general')">Ver en Tarifas</button>
  </div>
  @if (tarifas.general; as g) {
    <p class="mb-0">
      {{ g.nombre }} · {{ g.modo }} · vigente desde {{ g.vigenteDesde }} · {{ g.categorias }}
      <button type="button" class="btn btn-sm btn-link p-0 ms-2" (click)="alternar(g.idTarifa)">
        {{ abiertas.has(g.idTarifa) ? 'Ocultar valores' : 'Ver valores' }}
      </button>
    </p>
    @if (abiertas.has(g.idTarifa)) {
      <app-ficha-tarifa-detalle [detalle]="g.detalle"></app-ficha-tarifa-detalle>
    }
  } @else {
    <p class="text-muted mb-0">No hay una tarifa General vigente.</p>
  }
}

@if (habilitado('personalizada') || tarifas.personalizadas.length > 0) {
  <div class="d-flex align-items-center gap-2 mt-3">
    <h6 class="mb-0">Personalizadas vigentes</h6>
    <button type="button" class="btn btn-sm btn-link p-0" (click)="irATarifas.emit('personalizada')">Ver en Tarifas</button>
  </div>
  @if (!habilitado('personalizada')) {
    <p class="text-muted mb-1">El nivel Personalizada no está habilitado: estas tarifas no se usan en las operaciones.</p>
  }
  <ng-container *ngTemplateOutlet="tabla; context: { filas: tarifas.personalizadas, conAlcance: false }"></ng-container>
}

@if (habilitado('especial') || tarifas.especiales.length > 0) {
  <div class="d-flex align-items-center gap-2 mt-3">
    <h6 class="mb-0">Especiales vigentes</h6>
    <button type="button" class="btn btn-sm btn-link p-0" (click)="irATarifas.emit('especial')">Ver en Tarifas</button>
  </div>
  @if (!habilitado('especial')) {
    <p class="text-muted mb-1">El nivel Especial no está habilitado: estas tarifas no se usan en las operaciones.</p>
  }
  <ng-container *ngTemplateOutlet="tabla; context: { filas: tarifas.especiales, conAlcance: conAlcance(tarifas.especiales) }"></ng-container>
}

@if (habilitado('eventual')) {
  <div class="d-flex align-items-center gap-2 mt-3">
    <h6 class="mb-0">Eventual</h6>
    <button type="button" class="btn btn-sm btn-link p-0" (click)="irATarifas.emit('eventual')">Ver en Tarifas</button>
  </div>
  <p class="text-muted mb-0">Sin tarifa propia: los valores se cargan en cada operación.</p>
}

<ng-template #tabla let-filas="filas" let-conAlcance="conAlcance">
  @if (filas.length === 0) {
    <p class="text-muted mb-0">No hay tarifas vigentes.</p>
  } @else {
    <div class="table-responsive">
      <table class="table table-sm table-striped align-middle mb-0">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Modo</th>
            <th>Vigente desde</th>
            <th>Categorías</th>
            @if (conAlcance) {
              <th>Alcance</th>
            }
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (f of filas; track f.idTarifa) {
            <tr>
              <td>{{ f.nombre }}</td>
              <td class="text-nowrap">{{ f.modo }}</td>
              <td class="text-nowrap">{{ f.vigenteDesde }}</td>
              <td>{{ f.categorias }}</td>
              @if (conAlcance) {
                <td>{{ f.alcance ?? '—' }}</td>
              }
              <td class="text-nowrap">
                <button type="button" class="btn btn-sm btn-link p-0" (click)="alternar(f.idTarifa)">
                  {{ abiertas.has(f.idTarifa) ? 'Ocultar valores' : 'Ver valores' }}
                </button>
              </td>
            </tr>
            @if (abiertas.has(f.idTarifa)) {
              <tr>
                <td [attr.colspan]="conAlcance ? 6 : 5">
                  <app-ficha-tarifa-detalle [detalle]="f.detalle"></app-ficha-tarifa-detalle>
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
    </div>
  }
</ng-template>
```

## PASO 3 — `ficha-entidad.component.ts`: contexto del detalle

3.1 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — imports del util de tarifas. BUSCAR:
```
import { TarifasFicha, filaTarifaFicha, filasTarifasFicha } from './ficha-tarifas/ficha-tarifas.util';
```
REEMPLAZAR:
```
import {
  ContextoTarifaFicha, LadoTarifaFicha, TarifasFicha, filaTarifaFicha, filasTarifasFicha,
} from './ficha-tarifas/ficha-tarifas.util';
```

3.2 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — armarTarifas: lado y vehículos de la entidad (contexto del detalle). BUSCAR:
```
    let personalizadas: TarifasFicha['personalizadas'] = [];

    if (this.tipo === 'chofer' && this.chofer) {
      niveles = nivelesHabilitados(this.proveedorService.resolverTarifasHabilitadasChofer(this.chofer));
      const contratacion = this.chofer.contratacion;
      if (contratacion.tipo === 'proveedor') {
        idDueño = contratacion.idProveedor;
        heredadoDe = this.proveedor?.razonSocial ?? '(dado de baja)';
      } else {
        idDueño = this.chofer.id;
      }
    } else if (this.tipo === 'proveedor' && this.proveedor) {
      idDueño = this.proveedor.idProveedor;
      niveles = nivelesHabilitados(this.proveedor.tarifasHabilitadas);
    } else if (this.tipo === 'cliente' && this.cliente) {
      idDueño = this.cliente.idCliente;
      niveles = nivelesHabilitados(this.cliente.tarifasHabilitadas);
      personalizadas = filasTarifasFicha(this.tarifarioService.getTarifasPersonalizadasVigentes(idDueño), nombreCliente);
    }
    if (!idDueño) return null;

    const general = this.tarifarioService.getTarifaGeneralVigente();
    return {
      niveles,
      heredadoDe,
      general: general ? filaTarifaFicha(general, nombreCliente) : null,
      personalizadas,
      especiales: filasTarifasFicha(this.tarifarioService.getTarifasEspecialesVigentes(idDueño), nombreCliente),
    };
```
REEMPLAZAR:
```
    let personalizadas: TarifasFicha['personalizadas'] = [];
    // FI7: lado de la tarifa que se le aplica a la entidad y vehículos con los
    // que se resaltan sus categorías en "Ver valores".
    let lado: LadoTarifaFicha = 'cliente';
    let vehiculos: ConIdType<Vehiculo>[] = [];

    if (this.tipo === 'chofer' && this.chofer) {
      niveles = nivelesHabilitados(this.proveedorService.resolverTarifasHabilitadasChofer(this.chofer));
      const contratacion = this.chofer.contratacion;
      if (contratacion.tipo === 'proveedor') {
        idDueño = contratacion.idProveedor;
        heredadoDe = this.proveedor?.razonSocial ?? '(dado de baja)';
        lado = 'proveedor';
        vehiculos = [...this.vehiculosPropios, ...this.vehiculosProveedor];
      } else {
        idDueño = this.chofer.id;
        lado = 'chofer';
        vehiculos = this.vehiculosPropios;
      }
    } else if (this.tipo === 'proveedor' && this.proveedor) {
      idDueño = this.proveedor.idProveedor;
      niveles = nivelesHabilitados(this.proveedor.tarifasHabilitadas);
      lado = 'proveedor';
      vehiculos = this.vehiculosProveedor;
    } else if (this.tipo === 'cliente' && this.cliente) {
      idDueño = this.cliente.idCliente;
      niveles = nivelesHabilitados(this.cliente.tarifasHabilitadas);
    }
    if (!idDueño) return null;

    const ctx: ContextoTarifaFicha = {
      lado,
      vehiculos: vehiculos.map(v => ({ dominio: v.dominio, categoria: v.categoria?.nombre ?? '' })),
      nombreCliente,
    };
    if (this.tipo === 'cliente') {
      personalizadas = filasTarifasFicha(this.tarifarioService.getTarifasPersonalizadasVigentes(idDueño), ctx);
    }
    const general = this.tarifarioService.getTarifaGeneralVigente();
    return {
      niveles,
      heredadoDe,
      general: general ? filaTarifaFicha(general, ctx) : null,
      personalizadas,
      especiales: filasTarifasFicha(this.tarifarioService.getTarifasEspecialesVigentes(idDueño), ctx),
    };
```

## PASO 4 — `shared.module.ts`

4.1 `src/app/shared/shared.module.ts` — import. BUSCAR:
```
import { FichaTarifasComponent } from './ficha-entidad/ficha-tarifas/ficha-tarifas.component';
```
REEMPLAZAR:
```
import { FichaTarifasComponent } from './ficha-entidad/ficha-tarifas/ficha-tarifas.component';
import { FichaTarifaDetalleComponent } from './ficha-entidad/ficha-tarifa-detalle/ficha-tarifa-detalle.component';
```

4.2 `src/app/shared/shared.module.ts` — declaración. BUSCAR:
```
    FichaTarifasComponent,
```
REEMPLAZAR:
```
    FichaTarifasComponent,
    FichaTarifaDetalleComponent,
```

## Verificación

1. Comandos (reportá la salida):
```
grep -c "app-ficha-tarifa-detalle" src/app/shared/ficha-entidad/ficha-tarifas/ficha-tarifas.component.html
grep -rn "c.aPagarProveedor ?? c.aPagar" src/app/shared/ficha-entidad/ficha-tarifas/ficha-tarifas.util.ts
git add -N src/app/shared/ficha-entidad/ficha-tarifa-detalle
git diff --numstat
git diff -U0 | grep "^+" | grep -v "^+++" | grep -c " $"
npx tsc -p tsconfig.app.json --noEmit
```
Esperado:
- (a) 2 (la General y la tabla de personalizadas/especiales).
- (b) 1 línea (la regla del proveedor: `c.aPagarProveedor ?? c.aPagar`).
- (c) sin salida.
- (d) 8 archivos:
  - `src/app/shared/ficha-entidad/ficha-entidad.component.ts` `23 4`;
  - `src/app/shared/ficha-entidad/ficha-tarifa-detalle/ficha-tarifa-detalle.component.html` `68 0`;
  - `src/app/shared/ficha-entidad/ficha-tarifa-detalle/ficha-tarifa-detalle.component.scss` `13 0`;
  - `src/app/shared/ficha-entidad/ficha-tarifa-detalle/ficha-tarifa-detalle.component.ts` `44 0`;
  - `src/app/shared/ficha-entidad/ficha-tarifas/ficha-tarifas.component.html` `22 1`;
  - `src/app/shared/ficha-entidad/ficha-tarifas/ficha-tarifas.component.ts` `15 3`;
  - `src/app/shared/ficha-entidad/ficha-tarifas/ficha-tarifas.util.ts` `149 14`;
  - `src/app/shared/shared.module.ts` `2 0`.
- (e) 0.
- (f) sin errores.

2. `npm run build:demo`: las mismas 9 advertencias; main ≈ 1,10 MB; Initial total ≈ 1,53 MB; el
   chunk compartido de la ficha ≈ 59 kB (antes ≈ 51).

## Pruebas manuales en demo (las hace Nico)

Compará cada valor con la pantalla de Tarifas (misma tarifa, misma columna).

1. **Chofer directo con General:** Tarifas → "Ver valores" en la General: columna "A pagar",
   solo las categorías de sus vehículos con sus dominios, acompañante y adicional por km si la
   tarifa lo tiene. "Ver todas las categorías" → aparecen las demás y las suyas quedan
   resaltadas. "Ocultar valores" lo cierra.
2. **Chofer con un vehículo de una categoría que no está** en la tarifa (por ejemplo una
   Especial que no la cubre): aparece el aviso con la categoría y el dominio.
3. **Chofer de proveedor y proveedor:** "A pagar al proveedor"; si la tarifa no tiene la
   columna del proveedor cargada en una categoría, muestra el "A pagar" (igual que lo que paga
   el motor). Las categorías resaltadas son las de los vehículos del proveedor.
4. **Cliente:** General y Personalizada con "A cobrar", todas las categorías, sin columna
   Vehículos.
5. **Tarifa por km o con varias secciones:** "(por km)" en la columna y la columna Sección.
6. **Datos vivos:** con un detalle abierto, cargá un aumento de esa tarifa en otra pestaña del
   navegador → los valores se actualizan y el detalle queda en la misma vista.
7. **Navegación:** desde la ficha de un chofer de proveedor, abrí la del proveedor y volvé: los
   detalles se arman para cada entidad.

## Mensaje de commit

```
FI7: detalle de valores de una tarifa en la ficha de entidad

- Pestaña Tarifas: "Ver valores" en la General, las Personalizadas y las Especiales despliega
  el detalle debajo del renglón (FichaTarifaDetalleComponent, solo lectura).
- Solo el lado de la entidad, con la regla del motor: cliente a cobrar; chofer directo a
  pagar; proveedor y chofer de proveedor a pagar al proveedor (o a pagar si no está cargado);
  especial su valor. Adicional por km y acompañante del mismo lado.
- Categorías de los vehículos de la entidad (por nombre): vista inicial solo las suyas, "Ver
  todas" las resalta; aviso por cada vehículo cuya categoría no está en la tarifa.
- ficha-tarifas.util: detalleTarifaFicha (puro) y contexto (lado + vehículos).
```

FIN DE LA INSTRUCCIÓN FI7
````
