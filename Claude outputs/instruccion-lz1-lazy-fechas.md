````
Si no ves la línea FIN DE LA INSTRUCCIÓN LZ1 al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN LZ1 — Frente Lazy loading + fechas (ApLog, rama refactor)
=====================================================================
RaizModule lazy montado en '' + compatibilidad /raiz + ruta comodín

## Contexto y razonamiento

Hoy AppModule importa en forma EAGER RaizModule (app.module.ts:71) y
LiquidacionModule (:82). Efectos:

- La ruta lazy 'raiz' de app-routing queda anulada: Raiz y los 8 módulos de
  feature que importa van al bundle inicial (main.js 7,49 MB; inicial
  8,49 MB con build:demo).
- Como AppModule importa RaizModule, las rutas de RaizRoutingModule
  ('' → HomeComponent con hijos op, clientes, …) quedan registradas en la
  RAÍZ del router. Por eso el sidebar funciona con '/op', '/clientes',
  etc. (sin '/raiz'). Las URLs '/raiz/...' solo se usan una vez: Carga
  navega a ['raiz'] después del login.
- Al primer clic del sidebar se pasa del árbol /raiz al árbol raíz y se
  crea un SEGUNDO HomeComponent. Su ngOnInit vuelve a llamar los init() de
  los servicios (no son idempotentes): listeners de Firestore duplicados.
- LiquidacionModule se importa en AppModule solo por un
  <app-migrar-datos> que está COMENTADO en carga.component.html. Ningún
  componente de AppModule ni de Raiz usa exports de módulos de feature
  (verificado: el build AOT sin esos imports compila limpio).

Decisiones (diseño, ronda 1: L1, L2, L3):
- L1: se mantienen las URLs actuales sin '/raiz'. RaizModule se carga
  lazy montado en '' AL FINAL de app-routing (las rutas de arriba —login,
  carga, …— tienen prioridad).
- L2: compatibilidad: '/raiz' → '/op' y '/raiz/x' → '/x'. Hacen falta las
  DOS líneas: con solo `{ path: 'raiz', redirectTo: '' }`, '/raiz' queda en
  '' y el primer redirect lo manda a '/login'.
- L3: ruta comodín '**' → PagenotfoundComponent (hoy una URL desconocida
  tira NG04002 y deja la pantalla en blanco).
- Carga navega a ['op'] en vez de ['raiz'].

Este bloque NO toca RaizModule: sigue importando los 8 módulos de feature
(eso es LZ2). Consecuencia esperada: main.js baja mucho, pero el chunk
lazy de Raiz queda grande hasta LZ2; y las rutas "sueltas" de los features
(ej. '/listado') siguen resolviendo (ahora dentro de Raiz) hasta LZ2.

Medido sobre una copia del repo con este cambio (build:demo): ver la
sección de verificación.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto a BUSCAR no está o aparece más de una vez: detenete y
  reportá.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.
- Si se toca un tipo, interfaz, módulo o export, revisá TODOS sus usos en
  src/ (incluidos .spec.ts y .html).

## PASO 0 — Verificación (sin modificar nada)

Corré y reportá la salida:

```
grep -rn "RaizModule" src/app --include=*.ts
grep -rn "LiquidacionModule" src/app --include=*.ts
grep -rn "app-migrar-datos\|MigrarDatosComponent" src/app --include=*.ts --include=*.html
grep -rn "navigate(\['raiz'\])\|'/raiz\|\"/raiz" src/app --include=*.ts --include=*.html
grep -n "loadChildren\|path: '\*\*'" src/app/app-routing.module.ts
```

Esperado:
- RaizModule: app.module.ts (import y uso), app-routing.module.ts
  (loadChildren), raiz.module.ts (clase) y su .spec.ts si existe.
- LiquidacionModule: app.module.ts (import y uso), raiz.module.ts (import y
  uso), liquidacion.module.ts (clase), raiz-routing (loadChildren).
- <app-migrar-datos>: solo dentro de un comentario <!-- --> en
  carga.component.html.
- navigate(['raiz']): solo carga.component.ts:28. Ningún '/raiz' literal.
- app-routing: un solo loadChildren (el de 'raiz'), sin '**'.

Si algo no coincide, detenete y reportá.

## PASO 1 — src/app/app.module.ts

1.1 BUSCAR:
```
import { RaizModule } from './raiz/raiz.module';
import { SharedModule } from './shared/shared.module';
```
REEMPLAZAR:
```
import { SharedModule } from './shared/shared.module';
```

1.2 BUSCAR:
```
import { ServiceWorkerModule } from '@angular/service-worker';
import { LiquidacionModule } from "./raiz/liquidacion/liquidacion.module";
```
REEMPLAZAR:
```
import { ServiceWorkerModule } from '@angular/service-worker';
```

1.3 BUSCAR:
```
    CloudinaryModule,
    RaizModule,
    SharedModule,
```
REEMPLAZAR:
```
    CloudinaryModule,
    SharedModule,
```

1.4 BUSCAR:
```
    }),
    LiquidacionModule
],
```
REEMPLAZAR:
```
    }),
],
```

## PASO 2 — src/app/app-routing.module.ts

2.1 OJO: la línea de la ruta 'raiz' TERMINA CON DOS ESPACIOS. Reemplazá la
línea COMPLETA (incluidos esos espacios finales) que contiene:
```
  { path: 'raiz', loadChildren: () => import('./raiz/raiz.module').then(m => m.RaizModule)},
```
por:
```
  // Frente lazy-fechas (LZ1): RaizModule se carga lazy montado en '' (al
  // final de este array) y las URLs siguen siendo /op, /clientes, ...
  // Compatibilidad con las URLs viejas: /raiz → /op; /raiz/x → /x.
  { path: 'raiz', redirectTo: '/op', pathMatch: 'full' },
  { path: 'raiz', redirectTo: '' },
```
Después del reemplazo, ninguna de esas líneas tiene que terminar en
espacios.

2.2 BUSCAR:
```
  { path: 'limbo', component: LimboComponent}
```
REEMPLAZAR:
```
  { path: 'limbo', component: LimboComponent},
  // App principal (HomeComponent + sidebar + módulos de feature). Va AL
  // FINAL: las rutas de arriba tienen prioridad.
  { path: '', loadChildren: () => import('./raiz/raiz.module').then(m => m.RaizModule) },
  // Cualquier otra URL: "¡Ups!" con botón Volver (antes: NG04002 y
  // pantalla en blanco).
  { path: '**', component: PagenotfoundComponent },
```

## PASO 3 — src/app/carga/carga.component.ts

3.1 BUSCAR:
```
        this.router.navigate(['raiz']);
```
REEMPLAZAR:
```
        this.router.navigate(['op']);
```

## Verificación

1. Greps (reportá la salida):
```
grep -n "RaizModule\|LiquidacionModule" src/app/app.module.ts
grep -c "loadChildren" src/app/app-routing.module.ts
grep -n "redirectTo\|path: '\*\*'\|path: ''" src/app/app-routing.module.ts
grep -rn "navigate(\['raiz'\])" src/app --include=*.ts
grep -n " $" src/app/app-routing.module.ts
```
Esperado: (a) nada; (b) 1; (c) las líneas de '' → /login, las dos de
'raiz', la de '' con loadChildren y la de '**' (en ese orden, con la de
'**' última); (d) nada; (e) solo la línea de 'carga' (preexistente:
`{ path: 'carga', component: CargaComponent }, ` con un espacio final), no
las líneas nuevas.

2. `npm run build:demo`. Reportá la tabla de tamaños y las advertencias.
   Referencia (medido sobre una copia del repo con este mismo cambio):
   - antes: main.js 7,49 MB, Initial total 8,49 MB;
   - después de LZ1: main.js ≈ 1,76 MB, Initial total ≈ 2,76 MB, y un
     chunk lazy grande de Raiz (≈ 5,7 MB: todavía arrastra los 8 módulos
     de feature, se resuelve en LZ2).
   Las advertencias tienen que ser las mismas 9 que antes (NG8107/NG8102 de
   templates y la de html2canvas de jspdf).

## Pruebas manuales en demo (las hace Nico)

1. Login → pantalla de carga → aterriza en /op/tablero (la URL ya NO
   tiene /raiz).
2. Sidebar: entrar a cada módulo (Operaciones, Clientes, Choferes,
   Proveedores, Liquidación, Facturación, Legajos, Vendedores, Tarifas,
   Finanzas, Reportes, Ajustes, /migracion con rol dev) y cambiar de
   pestaña en cada uno.
3. F5 en varias pantallas (ej. /clientes/listado, /finanzas/cuentas,
   /tarifas/especial): recarga en la misma pantalla.
4. Compatibilidad: escribir /raiz → /op/tablero; /raiz/clientes/listado →
   /clientes/listado.
5. URL inexistente (ej. /xyz) → pantalla "¡Ups!"; "Volver" lleva a /op
   (con sesión) o a /login (sin sesión).
6. Roles: con un usuario 'user', /ajustes → /limbo (igual que antes).
7. Cerrar sesión → /login; sin sesión, /op → /unauthorized.
8. Esperado y transitorio: /listado (ruta suelta de Choferes) todavía
   abre la pantalla sin sidebar; desaparece en LZ2.

## Mensaje de commit

```
LZ1 (lazy-fechas): RaizModule lazy montado en '' + compat /raiz + ruta comodín

- AppModule deja de importar RaizModule y LiquidacionModule (eager). El
  de Liquidacion solo estaba por un <app-migrar-datos> comentado.
- app-routing: '' → loadChildren(RaizModule) al final; las URLs siguen
  siendo /op, /clientes, ...; /raiz → /op y /raiz/x → /x; '**' →
  PagenotfoundComponent.
- Carga navega a ['op'].
- Bundle inicial (build:demo): 8,49 MB → ~2,76 MB. HomeComponent se crea
  una sola vez por sesión (antes dos: /raiz/... y luego /...).
```

FIN DE LA INSTRUCCIÓN LZ1
````
