````
# Instrucción F5d — Finanzas: el nombre de la entidad lleva a su cuenta

## Contexto

Frente Finanzas. Diseño: `claude/diseno-finanzas.md` §21 (F53–F55). Pedido
de Nico después de F7b. En Movimientos no había forma de ir a la cuenta de
la entidad. En lugar de sumar otro botón a una fila que ya tiene hasta
cuatro, el **nombre de la entidad pasa a ser un enlace** a su cuenta.

- **Estilo (F54):** mismo color del texto, sin subrayado, con la mano, y
  subrayado al pasar el mouse.
- **Es un `routerLink` real:** Ctrl+click o el botón del medio abren la
  cuenta en otra pestaña.

**Dónde (F53):**

| Lugar | Cómo | Volver de la cuenta |
|---|---|---|
| Movimientos, columna Entidad | columna con enlace | "← Movimientos" (origen nuevo) |
| Cuentas, columna nombre | columna con enlace (el botón "Ver cuenta" se mantiene, F55) | "← Cuentas" |
| Antigüedad, columna nombre | columna con enlace (el botón se mantiene) | "← Antigüedad" |
| Resumen, top 5 y alertas | `routerLink` en la plantilla (los botones "Ver" se mantienen) | "← Resumen" |
| Detalle de un movimiento, encabezado | click: cierra el modal y navega. Si ya estás en la cuenta de esa entidad, es texto común | "← Movimientos" |

No se pone en los modales de registrar (cobro/pago, ajuste,
cerrar/devolver): salir perdería lo cargado.

**Cómo:**

- **TablaListado (compartida por toda la app):**
  - `ColumnaListado` suma el campo opcional `enlace?: (item) => EnlaceListado | null`;
  - si una columna lo trae, la celda se dibuja como `<a class="enlace-celda" [routerLink] [queryParams]>`;
  - las tablas que no lo usan quedan exactamente igual;
  - solo aplica a columnas que no son 'moneda'.
- **`raiz/finanzas-nueva/enlace-cuenta.ts`** (nuevo): `enlaceCuenta(tipo, id, origen)` es la única fuente de la ruta de la cuenta, junto con el tipo `OrigenCuenta`.
- **Cuenta de la entidad:** el botón de volver suma el origen `movimientos`.
- **`routerLink` en SharedModule:** SharedModule importa `SharedRoutingModule`, que normalmente exporta `RouterModule`. El PASO 0 lo confirma; si no fuera así, pará y reportá.

Sin índices ni reglas: NO hay deploy.

Ya verificado: tsc estricto (también sin locales sin uso), con stubs.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto BUSCAR no aparece, o aparece más de una vez: pará y reportá,
  sin improvisar.
- Archivos con finales de línea LF.
- Build: `npm run build:demo`.
- No toques CLAUDE.md ni CHANGELOG.
- `ColumnaListado` suma un campo OPCIONAL. Los usos existentes no cambian,
  así que no hace falta tocarlos.
- La instrucción termina con la línea `FIN DE LA INSTRUCCIÓN F5d`. Si no la
  ves, llegó cortada: leela completa (por partes si hace falta) antes de
  empezar.

## PASO 0 — Verificación (sin cambios)

Corré y reportá la salida:

```bash
grep -n "RouterModule" src/app/shared/shared-routing.module.ts
grep -n "SharedRoutingModule" src/app/shared/shared.module.ts
grep -rn "EnlaceListado\|enlaceCuenta\|enlace-celda\|enlace-entidad" src/app
ls src/app/shared/tabla/tabla-listado/tabla-listado.component.scss src/app/raiz/finanzas-nueva/modales/detalle-movimiento/detalle-movimiento.component.scss src/app/raiz/finanzas-nueva/resumen/finanzas-resumen.component.scss
ls src/app/raiz/finanzas-nueva/enlace-cuenta.ts
```

Esperado:

- El grep 1: el import de `RouterModule` y `exports: [RouterModule]`. Eso
  confirma que `routerLink` funciona dentro de SharedModule.
- El grep 2: 2 líneas (el import y el uso en `imports`).
- El grep 3: nada.
- El `ls` 4: existen los 3 archivos.
- El `ls` 5: no existe.

Si algo no coincide (en especial, si SharedRoutingModule NO exporta
RouterModule), pará y reportá.

## PASO 1 — `src/app/interfaces/tabla-listado.ts`

#### 1a

BUSCAR:
```ts
  /** Clases extra de la celda (estáticas o por fila). */
  clase?: string | ((item: T) => string);
}
```

REEMPLAZAR:
```ts
  /** Clases extra de la celda (estáticas o por fila). */
  clase?: string | ((item: T) => string);
  /** Si devuelve un enlace, el valor de la celda se muestra como un
   *  [routerLink] (mismo color, mano, subrayado al pasar). Solo columnas que
   *  no son 'moneda'. null = celda normal. */
  enlace?: (item: T) => EnlaceListado | null;
}

/** Destino de una celda con enlace (ColumnaListado.enlace). */
export interface EnlaceListado {
  ruta: any[];
  queryParams?: Record<string, string>;
}
```

## PASO 2 — `src/app/shared/tabla/tabla-listado/tabla-listado.component.ts`

#### 2a

BUSCAR:
```ts
  valorMoneda(col: ColumnaListado<T>, item: T): number | null {
```

REEMPLAZAR:
```ts
  /** Enlace de la celda (columna con `enlace`), o null. */
  enlaceDe(col: ColumnaListado<T>, item: T): EnlaceListado | null {
    return col.enlace ? col.enlace(item) : null;
  }

  valorMoneda(col: ColumnaListado<T>, item: T): number | null {
```

#### 2b

BUSCAR:
```ts
import {
  AccionListado, ColumnaListado, EventoAccionListado, OrdenListado,
} from 'src/app/interfaces/tabla-listado';
```

REEMPLAZAR:
```ts
import {
  AccionListado, ColumnaListado, EnlaceListado, EventoAccionListado, OrdenListado,
} from 'src/app/interfaces/tabla-listado';
```

## PASO 3 — `src/app/shared/tabla/tabla-listado/tabla-listado.component.html`

#### 3a

BUSCAR:
```html
              } @else {
                {{ col.valor(item) }}
              }
```

REEMPLAZAR:
```html
              } @else {
                @let enlace = enlaceDe(col, item);
                @if (enlace) {
                  <a class="enlace-celda" [routerLink]="enlace.ruta" [queryParams]="enlace.queryParams">{{ col.valor(item) }}</a>
                } @else {
                  {{ col.valor(item) }}
                }
              }
```

## PASO 4 — `src/app/shared/tabla/tabla-listado/tabla-listado.component.scss`

Agregá al FINAL del archivo, sin tocar nada de lo que ya tiene:

```scss

// Celda con enlace (ColumnaListado.enlace): mismo color, mano, subrayado al pasar.
.enlace-celda {
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}

.enlace-celda:hover {
  text-decoration: underline;
}
```

## PASO 5 — NUEVO `src/app/raiz/finanzas-nueva/enlace-cuenta.ts`

```ts
import { TipoEntidadFin } from 'src/app/interfaces/movimiento-fin';
import { EnlaceListado } from 'src/app/interfaces/tabla-listado';

/** Pestaña desde la que se abre la Cuenta de la entidad: su botón de volver
 *  regresa ahí (?origen=…). Sin origen, vuelve a Cuentas. */
export type OrigenCuenta = 'cuentas' | 'antiguedad' | 'resumen' | 'movimientos';

/** Enlace a la Cuenta de la entidad (F5d) — única fuente de la ruta para
 *  las columnas con enlace de TablaListado y los [routerLink] de las
 *  plantillas. */
export function enlaceCuenta(tipo: TipoEntidadFin, idEntidad: string, origen: OrigenCuenta): EnlaceListado {
  return { ruta: ['/finanzasNueva/cuenta', tipo, idEntidad], queryParams: { origen } };
}
```

## PASO 6 — `src/app/raiz/finanzas-nueva/listado-movimientos.ts`

#### 6a

BUSCAR:
```ts
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
```

REEMPLAZAR:
```ts
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import { enlaceCuenta } from './enlace-cuenta';
```

#### 6b

BUSCAR:
```ts
      { key: 'entidad', label: 'Entidad', valor: m => m.entidad.razonSocial, orden: m => m.entidad.razonSocial },
```

REEMPLAZAR:
```ts
      {
        key: 'entidad', label: 'Entidad', valor: m => m.entidad.razonSocial, orden: m => m.entidad.razonSocial,
        enlace: m => enlaceCuenta(m.entidad.tipo, m.entidad.id, 'movimientos'),
      },
```

## PASO 7 — `src/app/raiz/finanzas-nueva/cuentas/finanzas-cuentas.component.ts`

#### 7a

BUSCAR:
```ts
import { RegistrarMovimientoComponent } from '../modales/registrar-movimiento/registrar-movimiento.component';
```

REEMPLAZAR:
```ts
import { RegistrarMovimientoComponent } from '../modales/registrar-movimiento/registrar-movimiento.component';
import { enlaceCuenta } from '../enlace-cuenta';
```

#### 7b

BUSCAR:
```ts
      { key: 'nombre', label: cobrar ? 'Cliente' : 'Entidad', valor: c => c.nombre, orden: c => c.nombre },
```

REEMPLAZAR:
```ts
      {
        key: 'nombre', label: cobrar ? 'Cliente' : 'Entidad', valor: c => c.nombre, orden: c => c.nombre,
        enlace: c => enlaceCuenta(c.tipo, c.idEntidad, 'cuentas'),
      },
```

## PASO 8 — `src/app/raiz/finanzas-nueva/antiguedad/finanzas-antiguedad.component.ts`

#### 8a

BUSCAR:
```ts
import { TRAMOS_ANTIGUEDAD, TramoAntiguedad } from 'src/app/shared/utils/finanzas.util';
```

REEMPLAZAR:
```ts
import { TRAMOS_ANTIGUEDAD, TramoAntiguedad } from 'src/app/shared/utils/finanzas.util';
import { enlaceCuenta } from '../enlace-cuenta';
```

#### 8b

BUSCAR:
```ts
      { key: 'nombre', label: cobrar ? 'Cliente' : 'Entidad', valor: c => c.nombre, orden: c => c.nombre },
```

REEMPLAZAR:
```ts
      {
        key: 'nombre', label: cobrar ? 'Cliente' : 'Entidad', valor: c => c.nombre, orden: c => c.nombre,
        enlace: c => enlaceCuenta(c.tipo, c.idEntidad, 'antiguedad'),
      },
```

## PASO 9 — `src/app/raiz/finanzas-nueva/resumen/finanzas-resumen.component.html`

#### 9a

BUSCAR:
```html
                    <td>{{ c.nombre }} @if (lado === 'pagar') {
```

REEMPLAZAR:
```html
                    <td><a class="enlace-entidad" [routerLink]="['/finanzasNueva/cuenta', c.tipo, c.idEntidad]"
                        [queryParams]="{ origen: 'resumen' }">{{ c.nombre }}</a> @if (lado === 'pagar') {
```

#### 9b

BUSCAR:
```html
                      {{ i.nombre }}
```

REEMPLAZAR:
```html
                      <a class="enlace-entidad" [routerLink]="['/finanzasNueva/cuenta', i.tipo, i.idEntidad]"
                        [queryParams]="{ origen: 'resumen' }">{{ i.nombre }}</a>
```

## PASO 10 — Estilo `.enlace-entidad` (Resumen y detalle del movimiento)

Agregá al FINAL de estos dos archivos, sin tocar nada de lo que ya tienen:

- `src/app/raiz/finanzas-nueva/resumen/finanzas-resumen.component.scss`
- `src/app/raiz/finanzas-nueva/modales/detalle-movimiento/detalle-movimiento.component.scss`

```scss
// F5d: nombre de entidad que lleva a su cuenta (sin estilo de link clásico).
.enlace-entidad {
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}

.enlace-entidad:hover {
  text-decoration: underline;
}
```

## PASO 11 — `src/app/raiz/finanzas-nueva/modales/detalle-movimiento/detalle-movimiento.component.ts`

#### 11a

BUSCAR:
```ts
import { Component, Input } from '@angular/core';
```

REEMPLAZAR:
```ts
import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
```

#### 11b

BUSCAR:
```ts
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
```

REEMPLAZAR:
```ts
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import { enlaceCuenta } from '../../enlace-cuenta';
```

#### 11c

BUSCAR:
```ts
  constructor(public activeModal: NgbActiveModal) {}
```

REEMPLAZAR:
```ts
  constructor(
    public activeModal: NgbActiveModal,
    private router: Router,
  ) {}

  /** Si ya estamos en la cuenta de esta entidad, no hay a dónde ir (F5d). */
  get enCuentaDeLaEntidad(): boolean {
    const ruta = `/finanzasNueva/cuenta/${this.movimiento.entidad.tipo}/${this.movimiento.entidad.id}`;
    return this.router.url.split('?')[0] === ruta;
  }

  /** Nombre de la entidad → su cuenta: cierra el modal y navega (F5d). */
  irACuenta(): void {
    const e = enlaceCuenta(this.movimiento.entidad.tipo, this.movimiento.entidad.id, 'movimientos');
    this.activeModal.dismiss();
    this.router.navigate(e.ruta, { queryParams: e.queryParams });
  }
```

## PASO 12 — `src/app/raiz/finanzas-nueva/modales/detalle-movimiento/detalle-movimiento.component.html`

#### 12a

BUSCAR:
```html
      <span class="text-capitalize">{{ m.entidad.tipo }}</span> {{ m.entidad.razonSocial }} — CUIT {{ m.entidad.cuit }}
```

REEMPLAZAR:
```html
      <span class="text-capitalize">{{ m.entidad.tipo }}</span>
      @if (enCuentaDeLaEntidad) {
        {{ m.entidad.razonSocial }}
      } @else {
        <a class="enlace-entidad" role="link" tabindex="0" (click)="irACuenta()" (keydown.enter)="irACuenta()"
          title="Ver la cuenta">{{ m.entidad.razonSocial }}</a>
      }
      — CUIT {{ m.entidad.cuit }}
```

## PASO 13 — `src/app/raiz/finanzas-nueva/cuenta-entidad/cuenta-entidad.component.ts`

#### 13a

BUSCAR:
```ts
    if (o === 'resumen') return { ruta: '/finanzasNueva/resumen', etiqueta: 'Resumen' };
```

REEMPLAZAR:
```ts
    if (o === 'resumen') return { ruta: '/finanzasNueva/resumen', etiqueta: 'Resumen' };
    if (o === 'movimientos') return { ruta: '/finanzasNueva/movimientos', etiqueta: 'Movimientos' };
```

## PASO 14 — Verificación

```bash
npm run build:demo
grep -c "enlace" src/app/interfaces/tabla-listado.ts src/app/shared/tabla/tabla-listado/tabla-listado.component.html   # 3 y 3
grep -rn "enlaceCuenta(" src/app/raiz/finanzas-nueva   # 5: la definición + listado-movimientos, cuentas, antigüedad y detalle
grep -c "enlace-entidad" src/app/raiz/finanzas-nueva/resumen/finanzas-resumen.component.html src/app/raiz/finanzas-nueva/modales/detalle-movimiento/detalle-movimiento.component.html   # 2 y 1
grep -n "'movimientos'" src/app/raiz/finanzas-nueva/cuenta-entidad/cuenta-entidad.component.ts
git status --short
```

Esperado:

- El build termina sin errores. Los warnings de presupuesto previos no
  cuentan.
- `git status` muestra:
  - 13 archivos modificados: interfaz, tabla (ts, html, scss),
    listado-movimientos, cuentas, antigüedad, resumen (html, scss),
    detalle (ts, html, scss) y cuenta-entidad (ts);
  - el archivo nuevo `enlace-cuenta.ts`;
  - lo tuyo sin trackear, si lo hay.

Reportá la salida.

## Pruebas manuales (demo)

1. **Movimientos:** el nombre de la entidad no se ve como link (mismo
   color, sin subrayado).
   - Al pasar el mouse aparecen la mano y el subrayado.
   - El click abre la cuenta y el botón dice "← Movimientos" y vuelve ahí
     (con los filtros de la sesión).
   - Ctrl+click la abre en otra pestaña.
2. **Cuentas y Antigüedad:** el nombre lleva a la cuenta ("← Cuentas" /
   "← Antigüedad"). El botón "Ver cuenta" sigue funcionando.
3. **Resumen:** los nombres del top 5 y de las alertas llevan a la cuenta
   ("← Resumen"). Los botones "Ver" siguen.
4. **Detalle de un movimiento:**
   - abierto desde Movimientos, el nombre del encabezado cierra el modal y
     abre la cuenta ("← Movimientos");
   - abierto desde la cuenta de esa misma entidad, el nombre es texto común
     (no es un enlace).
   - Con Tab + Enter también funciona.
5. **Regresión:** las demás tablas de la app (Facturación, Liquidaciones,
   Vendedores) se ven y ordenan igual. Ninguna celda cambió de aspecto.
6. **Ordenar** por la columna con enlace sigue funcionando.

## Commit (lo hace Nico)

```
feat(finanzas): el nombre de la entidad lleva a su cuenta (F5d)

- TablaListado: ColumnaListado.enlace opcional → celda con routerLink
  (mismo color, mano, subrayado al pasar); el resto de las tablas sin
  cambios.
- enlaceCuenta(tipo, id, origen): única fuente de la ruta de la cuenta.
- Enlaces en Movimientos, Cuentas, Antigüedad, Resumen (top 5 y alertas)
  y encabezado del detalle del movimiento; la cuenta vuelve también a
  Movimientos (?origen=movimientos).
```

FIN DE LA INSTRUCCIÓN F5d
````
