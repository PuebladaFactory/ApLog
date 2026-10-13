````
Si no ves la línea FIN DE LA INSTRUCCIÓN LZ6 al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN LZ6 — Frente Lazy loading + fechas (ApLog, rama refactor)
=====================================================================
DesarrolloModule lazy: /migracion y sus herramientas salen de RaizModule

## Contexto y razonamiento

Desde LZ2, RaizModule tiene solo lo que comparten todas las pantallas
internas: el layout (`HomeComponent`) y el `SidebarComponent`. Pero todavía
declara las 7 herramientas de desarrollo:

- `MigracionComponent`, la página `/migracion`, que solo ve el rol dev;
- sus 6 hijos: `LimpiezaDemo`, los 3 generadores (`GeneradorOperaciones`,
  `GeneradorCircuito`, `GeneradorCobros`) y los 2 recálculos
  (`RecalculoResumenes`, `RecalculoComisiones`).

Por eso el chunk de Raiz, que descarga TODO usuario al entrar, incluye
estas herramientas y los servicios de migración y de generación que
arrastran. Este bloque las pasa a un módulo lazy propio,
`DesarrolloModule`. Ese chunk solo se descarga cuando un dev entra a
`/migracion`.

**Ubicación:** la carpeta `src/app/componentes/` ya contiene SOLO estas 7
herramientas (verificado). El módulo y su routing van ahí, sin mover
ningún componente; mover o renombrar carpetas sería ruido en el diff sin
beneficio.

**Ruta:**
- La URL sigue siendo `/migracion` y el link del sidebar no cambia.
- La ruta pasa de `component: MigracionComponent` a `loadChildren`. Mantiene
  el mismo `canActivate: [RoleGuard]` y `data: { roles: ['dev'] }`.
- Adentro, `DesarrolloRoutingModule` tiene una única ruta `''` →
  `MigracionComponent`.
- El paso a `canMatch` de todas las rutas se hace en LZ7, no acá.

**Dependencias de los templates** (verificado):
- `ngModel` → FormsModule;
- pipes `json` y `number` → CommonModule;
- pipe `formatearValor` (generadores) → SharedModule;
- los 6 selectores `app-*` de los hijos, que se declaran en el mismo
  módulo.

Ningún componente usa Router ni ActivatedRoute. Los servicios son
`providedIn: 'root'`: no se declaran en ningún módulo.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto a BUSCAR no está o aparece más de una vez: detenete y
  reportá.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Los archivos marcados NUEVO se crean completos con el contenido dado.
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.
- Si se toca un tipo, interfaz, módulo o export, revisá TODOS sus usos en
  src/ (incluidos .spec.ts y .html).

## PASO 0 — Verificación (sin modificar nada)

Corré y reportá la salida:

```
ls src/app/componentes
grep -rn "MigracionComponent\|LimpiezaDemoComponent\|GeneradorOperacionesComponent\|GeneradorCircuitoComponent\|GeneradorCobrosComponent\|RecalculoResumenesComponent\|RecalculoComisionesComponent" src --include=*.ts
grep -rn "app-migracion\|app-limpieza-demo\|app-generador-\|app-recalculo-" src --include=*.html
grep -rn "'/migracion'\|\"/migracion\"\|'migracion'" src/app --include=*.ts --include=*.html
grep -rln "Router\b\|ActivatedRoute" src/app/componentes
ls src/app/componentes/desarrollo.module.ts src/app/componentes/desarrollo-routing.module.ts
```

Esperado:
1. `componentes`: solo las 7 carpetas generador-circuito, generador-cobros,
   generador-operaciones, limpieza-demo, migracion, recalculo-comisiones,
   recalculo-resumenes.
2. Nombres de clase:
   - raiz.module.ts: 7 imports + 7 declaraciones;
   - raiz-routing.module.ts: el import de `MigracionComponent` y
     `component: MigracionComponent`;
   - la línea `export class` de cada componente.
   Ningún otro archivo.
3. Selectores: los 6 `<app-...>` de migracion.component.html. (Los
   `selector:` están en .ts y no entran en este grep.)
4. Ruta:
   - `path: 'migracion'` en raiz-routing.module.ts;
   - el `[routerLink]="['/migracion']"` del sidebar.
   Puede aparecer además algún texto en comentarios o mensajes; si es
   así, listalo.
5. Router/ActivatedRoute en componentes: nada.
6. `ls` de los 2 archivos nuevos: "No such file" (todavía no existen).

Si algo no coincide, detenete y reportá.

## PASO 1 — src/app/componentes/desarrollo-routing.module.ts (NUEVO)

```
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MigracionComponent } from './migracion/migracion.component';

// Frente lazy-fechas (LZ6): rutas del módulo de herramientas de desarrollo.
// raiz-routing carga este módulo en '/migracion' (con RoleGuard, solo dev).
const routes: Routes = [
  { path: '', component: MigracionComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DesarrolloRoutingModule { }
```

## PASO 2 — src/app/componentes/desarrollo.module.ts (NUEVO)

```
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DesarrolloRoutingModule } from './desarrollo-routing.module';
import { SharedModule } from '../shared/shared.module';
import { MigracionComponent } from './migracion/migracion.component';
import { LimpiezaDemoComponent } from './limpieza-demo/limpieza-demo.component';
import { GeneradorOperacionesComponent } from './generador-operaciones/generador-operaciones.component';
import { GeneradorCircuitoComponent } from './generador-circuito/generador-circuito.component';
import { GeneradorCobrosComponent } from './generador-cobros/generador-cobros.component';
import { RecalculoResumenesComponent } from './recalculo-resumenes/recalculo-resumenes.component';
import { RecalculoComisionesComponent } from './recalculo-comisiones/recalculo-comisiones.component';

// Frente lazy-fechas (LZ6): herramientas de desarrollo (/migracion, solo
// rol dev). Módulo lazy propio para que su código no viaje en el chunk de
// Raiz, que descargan todos los usuarios. NO importarlo en ningún otro
// módulo: se carga solo desde raiz-routing.
@NgModule({
  declarations: [
    MigracionComponent,
    LimpiezaDemoComponent,
    GeneradorOperacionesComponent,
    GeneradorCircuitoComponent,
    GeneradorCobrosComponent,
    RecalculoResumenesComponent,
    RecalculoComisionesComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    DesarrolloRoutingModule,
  ],
})
export class DesarrolloModule { }
```

## PASO 3 — src/app/raiz/raiz.module.ts

3.1 BUSCAR:
```
import { SidebarComponent } from './sidebar/sidebar.component';
import { MigracionComponent } from '../componentes/migracion/migracion.component';
import { LimpiezaDemoComponent } from '../componentes/limpieza-demo/limpieza-demo.component';
import { GeneradorOperacionesComponent } from '../componentes/generador-operaciones/generador-operaciones.component';
import { GeneradorCircuitoComponent } from '../componentes/generador-circuito/generador-circuito.component';
import { GeneradorCobrosComponent } from '../componentes/generador-cobros/generador-cobros.component';
import { RecalculoResumenesComponent } from '../componentes/recalculo-resumenes/recalculo-resumenes.component';
import { RecalculoComisionesComponent } from '../componentes/recalculo-comisiones/recalculo-comisiones.component';
```
REEMPLAZAR:
```
import { SidebarComponent } from './sidebar/sidebar.component';
```

3.2 BUSCAR:
```
// el lazy loading y registraba sus rutas sueltas dentro de Raiz).
```
REEMPLAZAR:
```
// el lazy loading y registraba sus rutas sueltas dentro de Raiz).
// LZ6: las herramientas de desarrollo (/migracion y sus hijos) están en
// componentes/desarrollo.module.ts, también lazy.
```

3.3 BUSCAR:
```
        SidebarComponent,
        MigracionComponent,
        LimpiezaDemoComponent,
        GeneradorOperacionesComponent,
        GeneradorCircuitoComponent,
        GeneradorCobrosComponent,
        RecalculoResumenesComponent,
        RecalculoComisionesComponent,
    ],
```
REEMPLAZAR:
```
        SidebarComponent,
    ],
```

## PASO 4 — src/app/raiz/raiz-routing.module.ts

4.1 BUSCAR:
```
import { RoleGuard } from '../guards/role.guard';
import { MigracionComponent } from '../componentes/migracion/migracion.component';
```
REEMPLAZAR:
```
import { RoleGuard } from '../guards/role.guard';
```

4.2 BUSCAR:
```
    {
      path: 'migracion',
      component: MigracionComponent,
      canActivate: [RoleGuard],
      data: { roles: ['dev'] },
    },
```
REEMPLAZAR:
```
    {
      // LZ6: herramientas de desarrollo en un módulo lazy propio.
      path: 'migracion',
      loadChildren: () => import('../componentes/desarrollo.module').then(m => m.DesarrolloModule),
      canActivate: [RoleGuard],
      data: { roles: ['dev'] },
    },
```

## Verificación

1. Greps (reportá la salida):
```
grep -rn "componentes/" src/app/raiz
grep -rln "DesarrolloModule" src
grep -n "MigracionComponent" src/app/raiz/raiz-routing.module.ts src/app/raiz/raiz.module.ts
git status --short
git diff -U0 -- src | grep -n "^+.* $"
```
Esperado:
- (a) solo la línea del `loadChildren` en raiz-routing.module.ts y la línea de
  comentario nueva de raiz.module.ts ("componentes/desarrollo.module.ts").
- (b) desarrollo.module.ts y raiz-routing.module.ts (el comentario de
  raiz.module.ts dice "desarrollo.module", no "DesarrolloModule").
- (c) nada.
- (d) M raiz.module.ts, M raiz-routing.module.ts y los 2 archivos nuevos
  (??). Nada más.
- (e) nada (los archivos nuevos no aparecen en git diff; revisá a ojo que
  no tengan espacios al final de línea).

2. `npm run build:demo`. Reportá la tabla de tamaños (incluidos los lazy
   chunks `raiz-raiz-module` y el nuevo `componentes-desarrollo-module`) y
   las advertencias.

   Referencia (medido sobre una copia del repo con LZ1–LZ5b + este
   cambio):
   - Initial total: sin cambio (≈ 1,55 MB; main ≈ 1,13 MB).
   - raiz-raiz-module: 391,69 kB → ≈ 76,39 kB.
   - componentes-desarrollo-module (nuevo): ≈ 173,25 kB.
   - Los números de los demás chunks lazy pueden moverse un poco (webpack
     reparte el código común en chunks compartidos).
   - Las mismas 9 advertencias.

## Pruebas manuales en demo (las hace Nico)

1. Con usuario dev:
   - entrar a `/migracion` desde el sidebar y escribiendo la URL;
   - la página carga con sus 6 secciones (limpieza, 3 generadores, 2
     recálculos);
   - en DevTools → Network, el chunk de Desarrollo recién se descarga al
     entrar a `/migracion`, no al loguearse.
2. Ejecutar alguna acción NO destructiva:
   - una vista previa de la migración de tarifas eventuales, o
   - un recálculo de resúmenes de un mes.
   Confirmar que responde igual que antes.
3. Con un usuario NO dev (admin o demo): `/migracion` escrito a mano
   tiene que seguir rebotando igual que antes (RoleGuard).
4. Recorrido rápido por el resto del sidebar: nada cambia.

## Mensaje de commit

```
LZ6 (lazy-fechas): DesarrolloModule lazy para /migracion

- NUEVO componentes/desarrollo.module.ts + desarrollo-routing.module.ts:
  MigracionComponent, LimpiezaDemo, los 3 generadores y los 2 recálculos.
- RaizModule ya no declara las herramientas de desarrollo: queda solo con
  Home y Sidebar.
- raiz-routing: '/migracion' pasa a loadChildren (mismo RoleGuard, solo
  dev). La URL no cambia.
- Efecto: el código de las herramientas y sus servicios de migración y
  generación sale del chunk de Raiz (que descargan todos los usuarios) a
  un chunk propio que solo se baja al entrar a /migracion.
```

FIN DE LA INSTRUCCIÓN LZ6
````
