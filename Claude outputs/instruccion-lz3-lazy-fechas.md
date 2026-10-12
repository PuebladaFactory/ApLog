````
Si no ves la línea FIN DE LA INSTRUCCIÓN LZ3 al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN LZ3 — Frente Lazy loading + fechas (ApLog, rama refactor)
=====================================================================
Retiro completo de AG Grid

## Contexto y razonamiento

AG Grid se reemplazó por TablaGenericaComponent en todos los módulos: NO
queda ningún <ag-grid-angular> en ningún template. Lo que sigue en el
código es solo peso:

- src/main.ts registra `AllCommunityModule` de ag-grid-community al
  arrancar. Ese registro mete toda la librería en main.js (~560 kB de los
  1,76 MB actuales; medido sobre una copia del repo).
- AgGridModule se importa en AppModule y en los módulos de Clientes,
  Choferes, Proveedores y Operaciones (en Raiz ya salió en LZ2).
- Dos renderers de celda de AG Grid sin uso:
  - EstadoCellRendererComponent (shared/estado-cell-renderer/), declarado
    y exportado en SharedModule; su selector app-estado-cell-renderer no
    aparece en ningún template.
  - AccionesCellRendererComponent
    (shared/tabla/ag-cell-renderers/acciones-cell-renderer/), standalone,
    importado en shared.module.ts pero sin declarar ni usar en ningún
    lado.
- angular.json → styles incluye ag-grid.css y ag-theme-alpine.css.
- package.json: ag-grid-angular y ag-grid-community.

Decisión L5 del diseño: retiro completo, incluidas las dependencias.

Sobre npm: el árbol del proyecto tiene un conflicto de peerDependencies
preexistente (@angular/fire 19 declara @angular/common ^19, el proyecto
usa Angular 20). Por eso `npm uninstall` falla con ERESOLVE sin
`--legacy-peer-deps`. Con ese flag el package-lock solo pierde las
entradas de ag-grid-angular, ag-grid-community y ag-charts-types
(verificado sobre una copia del lock).

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
grep -rln "ag-grid\|AgGrid\|ICellRenderer" src angular.json package.json
grep -rn "app-estado-cell-renderer\|app-acciones-cell-renderer\|EstadoCellRendererComponent\|AccionesCellRendererComponent" src
grep -rn "<ag-grid" src
ls src/app/shared/estado-cell-renderer src/app/shared/tabla/ag-cell-renderers src/app/shared/tabla/ag-cell-renderers/acciones-cell-renderer
```

Esperado:
- Primer grep: main.ts, angular.json, package.json, app.module.ts,
  clientes.module.ts, choferes.module.ts, proveedores.module.ts,
  operaciones.module.ts, shared.module.ts y los .ts/.spec.ts de los dos
  renderers. Nada más (en particular, ningún componente ni servicio).
- Segundo grep: solo shared.module.ts (imports, declarations y exports
  de EstadoCellRendererComponent; import de AccionesCellRendererComponent)
  y los archivos de los propios renderers (incluidos sus specs).
- Tercer grep: nada.
- ls: estado-cell-renderer → .ts, .scss, .spec.ts; ag-cell-renderers →
  solo la carpeta acciones-cell-renderer; acciones-cell-renderer → .ts,
  .html, .scss, .spec.ts.

Si algo no coincide, detenete y reportá.

## PASO 1 — src/main.ts

1.1 BUSCAR:
```
import { environment } from './environments/environment';

// AG Grid - registrar módulos
import { ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);
```
REEMPLAZAR:
```
import { environment } from './environments/environment';
```

## PASO 2 — src/app/app.module.ts

2.1 BUSCAR:
```
import { AppRoutingModule } from './app-routing.module';
import { AgGridModule } from 'ag-grid-angular';
```
REEMPLAZAR:
```
import { AppRoutingModule } from './app-routing.module';
```

2.2 BUSCAR:
```
    FilterPipeModule,
    AgGridModule,
    DragDropModule,
```
REEMPLAZAR:
```
    FilterPipeModule,
    DragDropModule,
```

## PASO 3 — src/app/raiz/clientes/clientes.module.ts

3.1 BUSCAR:
```
import { ClientesListadoComponent } from './clientes-listado/clientes-listado.component';
import { AgGridModule } from 'ag-grid-angular';
```
REEMPLAZAR:
```
import { ClientesListadoComponent } from './clientes-listado/clientes-listado.component';
```

3.2 OJO: esta línea TERMINA CON UN ESPACIO. Borrá la línea COMPLETA
(incluido el espacio final) que contiene:
```
    AgGridModule
```
por:
```
(borrar la línea)
```
(Es la última del array imports. La línea anterior, que solo tiene
espacios, se deja como está.)

## PASO 4 — src/app/raiz/choferes/choferes.module.ts

4.1 BUSCAR:
```
import { ChoferesListadoComponent } from './choferes-listado/choferes-listado.component';
import { AgGridModule } from 'ag-grid-angular';
```
REEMPLAZAR:
```
import { ChoferesListadoComponent } from './choferes-listado/choferes-listado.component';
```

4.2 Borrá la línea COMPLETA que contiene:
```
    AgGridModule
```
por:
```
(borrar la línea)
```
(Última del array imports.)

## PASO 5 — src/app/raiz/proveedores/proveedores.module.ts

5.1 BUSCAR:
```
import { ProveedoresListadoComponent } from './proveedores-listado/proveedores-listado.component';
import { AgGridModule } from 'ag-grid-angular';
```
REEMPLAZAR:
```
import { ProveedoresListadoComponent } from './proveedores-listado/proveedores-listado.component';
```

5.2 Borrá la línea COMPLETA que contiene:
```
    AgGridModule
```
por:
```
(borrar la línea)
```
(Última del array imports.)

## PASO 6 — src/app/raiz/operaciones/operaciones.module.ts

6.1 BUSCAR:
```
import { FilterPipeModule } from 'ngx-filter-pipe';
import { AgGridModule } from 'ag-grid-angular';
```
REEMPLAZAR:
```
import { FilterPipeModule } from 'ngx-filter-pipe';
```

6.2 BUSCAR:
```
    NgbModule,
    AgGridModule,
    DragDropModule,
```
REEMPLAZAR:
```
    NgbModule,
    DragDropModule,
```
(El `ɵɵDir` que sigue no se toca en este bloque: va en LZ5.)

## PASO 7 — src/app/shared/shared.module.ts

7.1 BUSCAR:
```
import { GlobalFilterPipe } from './pipes/global-filter.pipe';
import { EstadoCellRendererComponent } from './estado-cell-renderer/estado-cell-renderer.component';
import { AccionesCellRendererComponent } from './tabla/ag-cell-renderers/acciones-cell-renderer/acciones-cell-renderer.component';
```
REEMPLAZAR:
```
import { GlobalFilterPipe } from './pipes/global-filter.pipe';
```

7.2 (declarations) BUSCAR:
```
    GlobalFilterPipe,

    EstadoCellRendererComponent,
    InformeOpDetalleComponent,
```
REEMPLAZAR:
```
    GlobalFilterPipe,

    InformeOpDetalleComponent,
```

7.3 (exports) BUSCAR:
```
    GlobalFilterPipe,
    EstadoCellRendererComponent,
    DescuentosComponent,
```
REEMPLAZAR:
```
    GlobalFilterPipe,
    DescuentosComponent,
```

## PASO 8 — Borrar los renderers

Borrá estas carpetas completas (con todo su contenido):
- src/app/shared/estado-cell-renderer/
- src/app/shared/tabla/ag-cell-renderers/

## PASO 9 — angular.json (array build.options.styles)

9.1 OJO: esta línea TERMINA CON ESPACIOS. Reemplazá la línea COMPLETA
(incluidos los espacios finales) que contiene:
```
              "src/styles.scss",
```
por:
```
              "src/styles.scss"
```
(Sin coma: pasa a ser el último elemento del array.)

9.2 Borrá la línea COMPLETA que contiene:
```
              "node_modules/ag-grid-community/styles/ag-grid.css",
```
por:
```
(borrar la línea)
```

9.3 Borrá la línea COMPLETA que contiene:
```
              "node_modules/ag-grid-community/styles/ag-theme-alpine.css"
```
por:
```
(borrar la línea)
```

Después de 9.1–9.3 verificá que angular.json sigue siendo JSON válido:
`node -e "JSON.parse(require('fs').readFileSync('angular.json','utf8')); console.log('angular.json OK')"`

## PASO 10 — Dependencias

```
npm uninstall ag-grid-angular ag-grid-community --legacy-peer-deps
```
(Sin `--legacy-peer-deps` falla con ERESOLVE por el conflicto preexistente
de @angular/fire; no es nuevo.) Reportá `git diff --stat package.json
package-lock.json`: package.json pierde 2 líneas; en el lock solo tienen
que desaparecer ag-grid-angular, ag-grid-community y ag-charts-types. Si
el lock cambia otras dependencias, detenete y reportá.

## Verificación

1. Greps (reportá la salida):
```
grep -rn "ag-grid\|AgGrid\|ICellRenderer\|CellRenderer\|ag-charts" src angular.json package.json
grep -c "ag-grid\|ag-charts" package-lock.json
git diff -U0 -- src angular.json | grep -n "^+.* $"
```
Esperado: (a) nada; (b) 0; (c) nada (ninguna línea agregada o modificada
por este bloque termina en espacios; los archivos tienen otras líneas con
espacios finales preexistentes que no se tocan).

2. `npm run build:demo`. Reportá la tabla de tamaños y las advertencias.
   Referencia (medido sobre una copia del repo con LZ1 + LZ2 + este
   cambio):
   - main.js: 1,76 MB → ≈ 1,20 MB;
   - styles.css: 672 kB → ≈ 473 kB (sale el CSS de ag-grid; el
     Bootstrap duplicado se va en LZ4);
   - Initial total: 2,76 MB → ≈ 1,99 MB;
   - las mismas 9 advertencias.

## Pruebas manuales en demo (las hace Nico)

1. Login → /op/tablero.
2. Listados: Clientes, Choferes y Proveedores (orden, filtros, acciones,
   alta/edición/baja desde el listado). Tablero de operaciones y tablero
   de asignaciones (drag & drop).
3. Revisión visual rápida de tablas y botones en 3–4 pantallas: no tendría
   que cambiar nada (no había ningún grid).

## Mensaje de commit

```
LZ3 (lazy-fechas): retiro completo de AG Grid

- Sin uso desde que TablaGenericaComponent reemplazó a los grids: fuera
  el registro de AllCommunityModule en main.ts, AgGridModule en App,
  Clientes, Choferes, Proveedores y Operaciones, los dos renderers de
  celda sin uso (EstadoCellRenderer, AccionesCellRenderer), el CSS de
  ag-grid en angular.json y las dependencias ag-grid-angular /
  ag-grid-community (npm uninstall --legacy-peer-deps).
- Bundle inicial: ~2,76 MB → ~1,99 MB (main.js 1,76 → 1,20 MB; styles
  672 → 473 kB).
```

FIN DE LA INSTRUCCIÓN LZ3
````
