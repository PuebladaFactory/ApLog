````
Si no ves la línea FIN DE LA INSTRUCCIÓN FI4 al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN FI4 — Ficha de entidad: pestaña Tarifas (ApLog, rama refactor)
===========================================================================

## Contexto y razonamiento

Cuarto bloque del frente "Ficha de entidad" (diseño: `claude/diseno-ficha-entidad.md`).
Agrega la pestaña **Tarifas** a las tres fichas, con la decisión F3 (b): niveles habilitados
y tarifas vigentes HOY, **sin valores**. Los valores se siguen viendo en el módulo Tarifas; la
idea de un componente que muestre el detalle de una tarifa con sus valores queda para analizar
después de usar la ficha (§8, F3).

**Qué muestra:**
- **Niveles habilitados**, con los mismos badges y colores que el resto de la app (pipes
  `etiquetaNivelTarifa` / `claseNivelTarifa`), en el orden fijo de `nivelesHabilitados`
  (Personalizada, Especial, General, Eventual).
- **General** (si el nivel está habilitado): la General vigente hoy en una línea: nombre,
  modo, vigente desde y categorías.
- **Personalizadas vigentes** (solo clientes) y **Especiales vigentes**: tabla con nombre,
  modo (Por categoría / Por km), vigente desde y categorías (hasta 4 por nombre; más, la
  cantidad). Las especiales de chofer/proveedor suman la columna **Alcance**: "Con todos los
  clientes" o "Solo con <cliente>". Ordenadas por nombre.
- Si una entidad tiene tarifas vigentes de un nivel que NO tiene habilitado, se listan igual
  con el aviso "no está habilitado: estas tarifas no se usan en las operaciones" (dato útil
  para detectar configuraciones a medias).
- **Eventual** (si está habilitado): "Sin tarifa propia: los valores se cargan en cada
  operación".
- Cada sección tiene "Ver en Tarifas": cierra la ficha y navega a la pestaña de ese nivel del
  módulo Tarifas. No hay enlace directo a una tarifa puntual (Tarifas no lo soporta).

**Reglas que respeta:**
- **Chofer de proveedor:** los niveles salen de
  `ProveedorService.resolverTarifasHabilitadasChofer` (regla de CLAUDE.md: nunca leer
  `chofer.tarifasHabilitadas` sin chequear la contratación) y las especiales son las del
  proveedor. La pestaña lo dice: "heredados del proveedor X".
- **Vigentes:** con los getters de `TarifarioService` sin fecha
  (`getTarifaGeneralVigente`, `getTarifasPersonalizadasVigentes`,
  `getTarifasEspecialesVigentes`): exactamente la misma regla que usa la pantalla de Tarifas.
- **Datos vivos:** la suscripción única suma `tarifas$` y `tarifasEspeciales$` solo como
  disparo de refresco; si alguien carga un aumento o da de baja una tarifa, la ficha se
  actualiza. Sin lecturas nuevas a Firestore.

**Piezas:**
- NUEVO `ficha-tarifas/ficha-tarifas.util.ts` (puro): `FilaTarifaFicha`, `TarifasFicha`,
  `filaTarifaFicha`, `filasTarifasFicha`.
- NUEVO `FichaTarifasComponent` (presentación): recibe `TarifasFicha`, emite
  `irATarifas(pestaña)`.
- `FichaEntidadComponent`: `armarTarifas()` (después de armar la entidad), `irATarifas()`
  (cierra y navega con `Router`), una pestaña más en cada ficha:
  - chofer: Datos · Vehículos · Legajo · **Tarifas** · Proveedor (si es de proveedor);
  - proveedor: Datos · Contactos · Choferes · Vehículos · **Tarifas**;
  - cliente: Datos · Contactos · **Tarifas**.
- `SharedModule` declara la pestaña nueva.

La ruta `/tarifas` la pueden abrir dev, admin, user y demo: los mismos roles que llegan a la
ficha, así que "Ver en Tarifas" no necesita permiso propio.

**Verificación previa (sobre una copia del repo en el estado de FI3, comparada antes con tu
repo: los 7 archivos involucrados son iguales):**
- 16 BUSCAR, cada uno encontrado una sola vez (validados todos antes de escribir); el
  resultado coincide con la referencia;
- `tsc` limpio (también `--noUnusedLocals`);
- pruebas de render con Karma + Chromium (4 casos):
  - cliente: niveles, General vigente (no la inactiva), personalizadas ordenadas, una por
    km, especial de un nivel no habilitado con el aviso y sin columna Alcance, datos vivos
    (baja de una personalizada) y "Ver en Tarifas" (cierra y navega a `/tarifas/general`);
  - chofer directo: especial "Solo con Cliente SRL";
  - chofer de proveedor: niveles y especiales heredados, "Con todos los clientes";
  - chofer Eventual y ficha del proveedor;
- `build:demo` con las mismas 9 advertencias; inicial 1,53 MB; el chunk compartido de la
  ficha pasa de ≈ 39,6 a ≈ 49 kB.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- NO corras `npm run deploy:*`, `npm run build` ni `node set-version.js`. Para compilar
  usá `npm run build:demo`.
- Validá TODOS los BUSCAR antes de escribir el primero; después aplicá los pasos EN ORDEN.
- Si un texto a BUSCAR no está o aparece más de una vez: detenete y reportá. Los BUSCAR
  son líneas completas.
- Editá cada archivo en el lugar (leer, reemplazar, escribir); nunca abras un archivo
  para escritura antes de haber leído su contenido.
- Archivos NUEVOS: crealos exactamente con el contenido dado. Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md (se actualizan al cierre del frente).

## PASO 0 — Verificación (sin modificar nada)

```
git status --short
git hash-object src/app/shared/ficha-entidad/ficha-entidad.component.ts src/app/shared/ficha-entidad/ficha-entidad.component.html
grep -n "FichaChoferesComponent" src/app/shared/shared.module.ts
grep -rln "ficha-tarifas\|FichaTarifas\|irATarifas" src/app
grep -n "resolverTarifasHabilitadasChofer\|getTarifasEspecialesVigentes\|getTarifasPersonalizadasVigentes\|getTarifaGeneralVigente(fecha" src/app/servicios/proveedores/proveedor.service.ts src/app/servicios/tarifario/tarifario.service.ts
grep -n "path: 'tarifas'" -A3 src/app/raiz/raiz-routing.module.ts
```
Esperado:
1. Nada (o solo `Claude outputs/`).
2. `0790cf1e533a1d25e5d9d310b5da6876e2b9d0fd` (el `.ts`) y
   `5b26450b989b601c41e7c2efe535dee3c65b73b5` (el `.html`): los de FI3.
3. 60 y 112.
4. Nada.
5. `proveedor.service.ts:112`; `tarifario.service.ts:105, 124 y 136`.
6. La ruta `tarifas` con `data: { roles: ['dev','admin','user','demo'] }`.

Si algo no coincide, detenete y reportá.

## PASO 1 — Archivos NUEVOS (4)

1.1 NUEVO `src/app/shared/ficha-entidad/ficha-tarifas/ficha-tarifas.util.ts`
```
import { NivelHabilitado } from 'src/app/interfaces/tarifa-habilitada';
import { Tarifa } from 'src/app/interfaces/tarifa';
import { TarifaEspecial } from 'src/app/interfaces/tarifa-especial';
import { fechaLegible } from 'src/app/shared/utils/fecha.util';

/** Renglón de una tarifa en la pestaña Tarifas de la ficha (sin valores, F3). */
export interface FilaTarifaFicha {
  idTarifa: string;
  nombre: string;
  modo: string;
  vigenteDesde: string;
  categorias: string;
  /** Solo especiales de chofer/proveedor: con qué cliente rige. null = no aplica. */
  alcance: string | null;
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

function categoriasDe(tarifa: Tarifa | TarifaEspecial): string {
  const nombres = [...new Set(
    (tarifa.secciones ?? []).flatMap(s => (s.categorias ?? []).map(c => (c.nombre ?? '').trim())),
  )].filter(n => n !== '');
  if (nombres.length === 0) return '—';
  if (nombres.length <= MAX_CATEGORIAS_LISTADAS) return nombres.join(', ');
  return `${nombres.length} categorías`;
}

/** Una tarifa (general, personalizada o especial) como renglón de la ficha.
 *  `nombreCliente` resuelve el cliente del alcance de una especial de
 *  chofer/proveedor (undefined = dado de baja). */
export function filaTarifaFicha(
  tarifa: Tarifa | TarifaEspecial,
  nombreCliente: (idCliente: string) => string | undefined,
): FilaTarifaFicha {
  let alcance: string | null = null;
  if (tarifa.nivel === 'especial' && tarifa.entidadTipo !== 'cliente') {
    alcance = tarifa.alcance?.tipo === 'entidadCliente'
      ? `Solo con ${nombreCliente(tarifa.alcance.idCliente) ?? 'un cliente dado de baja'}`
      : 'Con todos los clientes';
  }
  return {
    idTarifa: tarifa.idTarifa,
    nombre: (tarifa.nombre ?? '').trim() || '(sin nombre)',
    modo: tarifa.modoTarifacion === 'km' ? 'Por km' : 'Por categoría',
    vigenteDesde: fechaLegible(tarifa.vigenciaDesde),
    categorias: categoriasDe(tarifa),
    alcance,
  };
}

/** Renglones por nombre (las vigentes de una entidad pueden ser varias). */
export function filasTarifasFicha(
  tarifas: (Tarifa | TarifaEspecial)[],
  nombreCliente: (idCliente: string) => string | undefined,
): FilaTarifaFicha[] {
  return tarifas
    .map(t => filaTarifaFicha(t, nombreCliente))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}
```

1.2 NUEVO `src/app/shared/ficha-entidad/ficha-tarifas/ficha-tarifas.component.ts`
```
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FilaTarifaFicha, TarifasFicha } from './ficha-tarifas.util';

/**
 * Pestaña "Tarifas" de la ficha (chofer, proveedor y cliente): niveles
 * habilitados y tarifas vigentes HOY, sin valores (F3 (b)). Los valores se ven
 * en el módulo Tarifas: "Ver en Tarifas" emite la pestaña de destino y el
 * contenedor cierra la ficha y navega. Solo presentación.
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

  habilitado(nivel: string): boolean {
    return (this.tarifas.niveles as string[]).includes(nivel);
  }

  /** La columna Alcance solo tiene sentido en especiales de chofer/proveedor. */
  conAlcance(filas: FilaTarifaFicha[]): boolean {
    return filas.some(f => f.alcance !== null);
  }
}
```

1.3 NUEVO `src/app/shared/ficha-entidad/ficha-tarifas/ficha-tarifas.component.html`
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
    <p class="mb-0">{{ g.nombre }} · {{ g.modo }} · vigente desde {{ g.vigenteDesde }} · {{ g.categorias }}</p>
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
            </tr>
          }
        </tbody>
      </table>
    </div>
  }
</ng-template>
```

1.4 NUEVO `src/app/shared/ficha-entidad/ficha-tarifas/ficha-tarifas.component.scss`
```
// Bootstrap fija .btn en rem: sin esto no escala con el tamaño de letra de la ficha.
.btn {
  font-size: 1em;
}
```

## PASO 2 — `ficha-entidad.component.ts`

2.1 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — imports de Angular. BUSCAR:
```
import { Component, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
```
REEMPLAZAR:
```
import { Component, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
```

2.2 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — TarifarioService. BUSCAR:
```
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
```
REEMPLAZAR:
```
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
import { nivelesHabilitados } from 'src/app/interfaces/tarifa-habilitada';
import { TarifasFicha, filaTarifaFicha, filasTarifasFicha } from './ficha-tarifas/ficha-tarifas.util';
```

2.3 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — estado de la pestaña. BUSCAR:
```
  /** Ficha de cliente: el cliente. */
  cliente: ConIdType<Cliente> | null = null;
```
REEMPLAZAR:
```
  /** Ficha de cliente: el cliente. */
  cliente: ConIdType<Cliente> | null = null;

  /** Pestaña Tarifas (las tres fichas); null si la entidad no existe. */
  tarifas: TarifasFicha | null = null;
```

2.4 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — inyección. BUSCAR:
```
    private clienteService: ClienteService,
    private zone: NgZone,
```
REEMPLAZAR:
```
    private clienteService: ClienteService,
    private tarifarioService: TarifarioService,
    private router: Router,
    private zone: NgZone,
```

2.5 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — la suscripción también escucha las tarifas (datos vivos). BUSCAR:
```
      this.clienteService.clientes$,
    ])
```
REEMPLAZAR:
```
      this.clienteService.clientes$,
      // Solo para refrescar: la pestaña Tarifas lee los vigentes con los
      // getters de TarifarioService (misma regla que la pantalla de Tarifas).
      this.tarifarioService.tarifas$,
      this.tarifarioService.tarifasEspeciales$,
    ])
```

2.6 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — ir al módulo Tarifas. BUSCAR:
```
  cerrar(): void {
    this.activeModal.dismiss();
  }
```
REEMPLAZAR:
```
  cerrar(): void {
    this.activeModal.dismiss();
  }

  /** "Ver en Tarifas": cierra la ficha y va a la pestaña del módulo Tarifas
   *  (no hay enlace directo a una tarifa puntual). */
  irATarifas(pestana: string): void {
    this.activeModal.dismiss();
    this.router.navigate(['/tarifas', pestana]);
  }
```

2.7 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — armar: la pestaña Tarifas después de la entidad. BUSCAR:
```
      this.cliente = clientes.find(c => c.idCliente === this.id) ?? null;
    }
  }
```
REEMPLAZAR:
```
      this.cliente = clientes.find(c => c.idCliente === this.id) ?? null;
    }
    this.tarifas = this.armarTarifas();
  }

  /**
   * Niveles habilitados y tarifas vigentes HOY de la entidad (sin valores).
   * Chofer: los niveles salen de ProveedorService.resolverTarifasHabilitadasChofer
   * (regla del proyecto: un chofer de proveedor hereda los del proveedor) y, si
   * es de proveedor, las especiales son las del proveedor. Personalizadas: solo
   * clientes.
   */
  private armarTarifas(): TarifasFicha | null {
    const nombreCliente = (id: string) => this.clienteService.getClientePorId(id)?.razonSocial;
    let idDueño: string | null = null;
    let niveles: TarifasFicha['niveles'] = [];
    let heredadoDe: string | null = null;
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
  }
```

2.8 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — limpiar. BUSCAR:
```
    this.cliente = null;
  }
```
REEMPLAZAR:
```
    this.cliente = null;
    this.tarifas = null;
  }
```

## PASO 3 — `ficha-entidad.component.html`: una pestaña más en cada ficha

3.1 `src/app/shared/ficha-entidad/ficha-entidad.component.html` — chofer: pestaña Tarifas después de Legajo. BUSCAR:
```
          <li class="nav-item" role="presentation">
            <button type="button" class="nav-link" role="tab" [class.active]="pestana === 'legajo'"
              [attr.aria-selected]="pestana === 'legajo'" (click)="pestana = 'legajo'">Legajo</button>
          </li>
```
REEMPLAZAR:
```
          <li class="nav-item" role="presentation">
            <button type="button" class="nav-link" role="tab" [class.active]="pestana === 'legajo'"
              [attr.aria-selected]="pestana === 'legajo'" (click)="pestana = 'legajo'">Legajo</button>
          </li>
          <li class="nav-item" role="presentation">
            <button type="button" class="nav-link" role="tab" [class.active]="pestana === 'tarifas'"
              [attr.aria-selected]="pestana === 'tarifas'" (click)="pestana = 'tarifas'">Tarifas</button>
          </li>
```

3.2 `src/app/shared/ficha-entidad/ficha-entidad.component.html` — chofer: contenido. BUSCAR:
```
            @case ('legajo') {
              <app-ficha-legajo [legajo]="legajo" [categoriasActivas]="categoriasActivas"></app-ficha-legajo>
            }
```
REEMPLAZAR:
```
            @case ('legajo') {
              <app-ficha-legajo [legajo]="legajo" [categoriasActivas]="categoriasActivas"></app-ficha-legajo>
            }
            @case ('tarifas') {
              @if (tarifas; as t) {
                <app-ficha-tarifas [tarifas]="t" (irATarifas)="irATarifas($event)"></app-ficha-tarifas>
              }
            }
```

3.3 `src/app/shared/ficha-entidad/ficha-entidad.component.html` — proveedor: pestaña Tarifas al final. BUSCAR:
```
            <button type="button" class="nav-link" role="tab" [class.active]="pestana === 'vehiculos'"
              [attr.aria-selected]="pestana === 'vehiculos'" (click)="pestana = 'vehiculos'">
              Vehículos <span class="badge rounded-pill bg-secondary">{{ vehiculosProveedor.length }}</span>
            </button>
          </li>
```
REEMPLAZAR:
```
            <button type="button" class="nav-link" role="tab" [class.active]="pestana === 'vehiculos'"
              [attr.aria-selected]="pestana === 'vehiculos'" (click)="pestana = 'vehiculos'">
              Vehículos <span class="badge rounded-pill bg-secondary">{{ vehiculosProveedor.length }}</span>
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button type="button" class="nav-link" role="tab" [class.active]="pestana === 'tarifas'"
              [attr.aria-selected]="pestana === 'tarifas'" (click)="pestana = 'tarifas'">Tarifas</button>
          </li>
```

3.4 `src/app/shared/ficha-entidad/ficha-entidad.component.html` — proveedor: contenido. BUSCAR:
```
              <app-ficha-vehiculos
                [vehiculos]="vehiculosProveedor"
                mensajeVacio="El proveedor no tiene vehículos cargados.">
              </app-ficha-vehiculos>
            }
          }
```
REEMPLAZAR:
```
              <app-ficha-vehiculos
                [vehiculos]="vehiculosProveedor"
                mensajeVacio="El proveedor no tiene vehículos cargados.">
              </app-ficha-vehiculos>
            }
            @case ('tarifas') {
              @if (tarifas; as t) {
                <app-ficha-tarifas [tarifas]="t" (irATarifas)="irATarifas($event)"></app-ficha-tarifas>
              }
            }
          }
```

3.5 `src/app/shared/ficha-entidad/ficha-entidad.component.html` — cliente: pestaña Tarifas al final. BUSCAR:
```
              Contactos <span class="badge rounded-pill bg-secondary">{{ contactosCliente.length }}</span>
            </button>
          </li>
```
REEMPLAZAR:
```
              Contactos <span class="badge rounded-pill bg-secondary">{{ contactosCliente.length }}</span>
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button type="button" class="nav-link" role="tab" [class.active]="pestana === 'tarifas'"
              [attr.aria-selected]="pestana === 'tarifas'" (click)="pestana = 'tarifas'">Tarifas</button>
          </li>
```

3.6 `src/app/shared/ficha-entidad/ficha-entidad.component.html` — cliente: contenido. BUSCAR:
```
            @case ('contactos') {
              <app-ficha-contactos [contactos]="contactosCliente"></app-ficha-contactos>
            }
```
REEMPLAZAR:
```
            @case ('contactos') {
              <app-ficha-contactos [contactos]="contactosCliente"></app-ficha-contactos>
            }
            @case ('tarifas') {
              @if (tarifas; as t) {
                <app-ficha-tarifas [tarifas]="t" (irATarifas)="irATarifas($event)"></app-ficha-tarifas>
              }
            }
```

## PASO 4 — `shared.module.ts`

4.1 `src/app/shared/shared.module.ts` — import. BUSCAR:
```
import { FichaChoferesComponent } from './ficha-entidad/ficha-choferes/ficha-choferes.component';
```
REEMPLAZAR:
```
import { FichaChoferesComponent } from './ficha-entidad/ficha-choferes/ficha-choferes.component';
import { FichaTarifasComponent } from './ficha-entidad/ficha-tarifas/ficha-tarifas.component';
```

4.2 `src/app/shared/shared.module.ts` — declaración. BUSCAR:
```
    FichaChoferesComponent,
```
REEMPLAZAR:
```
    FichaChoferesComponent,
    FichaTarifasComponent,
```

## Verificación

1. Comandos (reportá la salida):
```
grep -c "@case ('tarifas')" src/app/shared/ficha-entidad/ficha-entidad.component.html
grep -c "Ficha.*Component" src/app/shared/shared.module.ts
git add -N src/app/shared/ficha-entidad/ficha-tarifas
git diff --numstat
git diff -U0 | grep "^+" | grep -v "^+++" | grep -c " $"
npx tsc -p tsconfig.app.json --noEmit
```
Esperado:
- (a) 3.
- (b) 16.
- (c) sin salida.
- (d) 7 archivos:
  - `src/app/shared/ficha-entidad/ficha-entidad.component.html` `27 0`;
  - `src/app/shared/ficha-entidad/ficha-entidad.component.ts` `65 0`;
  - `src/app/shared/ficha-entidad/ficha-tarifas/ficha-tarifas.component.html` `88 0`;
  - `src/app/shared/ficha-entidad/ficha-tarifas/ficha-tarifas.component.scss` `4 0`;
  - `src/app/shared/ficha-entidad/ficha-tarifas/ficha-tarifas.component.ts` `30 0`;
  - `src/app/shared/ficha-entidad/ficha-tarifas/ficha-tarifas.util.ts` `70 0`;
  - `src/app/shared/shared.module.ts` `2 0`.
- (e) 0.
- (f) sin errores.

2. `npm run build:demo`: las mismas 9 advertencias; main ≈ 1,10 MB; Initial total
   ≈ 1,53 MB; el chunk compartido de la ficha (el que antes pesaba ≈ 39,6 kB) ≈ 49 kB.

## Pruebas manuales en demo (las hace Nico)

1. **Cliente con Personalizada** (Clientes → ver): pestaña Tarifas con los niveles en badges,
   la General vigente en una línea (si General está habilitada) y la tabla de personalizadas
   vigentes, con las mismas que muestra Tarifas → Personalizada para ese cliente.
2. **Chofer directo con Especial**: tabla de especiales con la columna Alcance ("Con todos
   los clientes" / "Solo con <cliente>"), igual que Tarifas → Especial.
3. **Chofer de proveedor**: "heredados del proveedor X" y las especiales del proveedor.
4. **Proveedor**: sus niveles y especiales.
5. **Eventual**: un cliente o chofer con solo Eventual muestra el aviso de valores por
   operación.
6. **"Ver en Tarifas"** de cada sección: cierra la ficha y abre la pestaña correspondiente
   de Tarifas.
7. **Datos vivos**: con la ficha abierta en Tarifas, en otra pestaña del navegador cargá un
   aumento de una personalizada → la fecha "vigente desde" se actualiza.
8. Rol **user** y **demo**: ven la pestaña y "Ver en Tarifas" los lleva al módulo.

## Mensaje de commit

```
FI4: pestaña Tarifas en la ficha de entidad

- Niveles habilitados (badges) y tarifas vigentes hoy, sin valores: General, Personalizadas
  (clientes) y Especiales con su alcance; aviso si hay vigentes de un nivel no habilitado.
- Chofer de proveedor: niveles y especiales heredados del proveedor
  (resolverTarifasHabilitadasChofer).
- "Ver en Tarifas": cierra la ficha y abre la pestaña del módulo Tarifas.
- Datos vivos: la suscripción de la ficha escucha tarifas$ y tarifasEspeciales$.
- ficha-tarifas.util: filaTarifaFicha / filasTarifasFicha (puros).
```

FIN DE LA INSTRUCCIÓN FI4
````
