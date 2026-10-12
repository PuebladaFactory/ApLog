````
Si no ves la línea FIN DE LA INSTRUCCIÓN LZ5 al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN LZ5 — Frente Lazy loading + fechas (ApLog, rama refactor)
=====================================================================
Limpieza de módulos: imports sin uso, Cloudinary, SharedRoutingModule, ɵɵDir

## Contexto y razonamiento

Con todo ya lazy (LZ1–LZ4), quedan imports de módulos que nadie usa. No
pesan casi nada en el bundle (el compilador descarta lo no referenciado),
pero confunden: hacen creer que hay dependencias que no existen. Este
bloque es solo limpieza; no cambia comportamiento (Cloudinary sí pesaba:
~70 kB de main.js).

- AppModule (sus componentes: Login, LoginHeader, ForgotPassword,
  Pagenotfound, Carga, Limbo, Logout) no usa nada de:
  - CloudinaryModule (y Cloudinary no se usa en ninguna parte: ni
    componente, ni servicio). Se desinstalan @cloudinary/ng y
    @cloudinary/url-gen. Las claves `cloudinary` de los environments NO se
    tocan (son datos de configuración inertes; se pueden limpiar en el
    cierre).
  - SharedModule (sus templates solo usan app-login-header y formGroup).
  - FilterPipeModule y DragDropModule.
  - El import de '@angular/fire/auth-guard' (AuthGuard, canActivate,
    redirectLoggedInTo, redirectUnauthorizedTo) y RouterModule/Routes:
    importados y sin uso.
- app-routing.module.ts: el import de '@angular/fire/auth-guard' y
  RoleGuard: sin uso.
- SharedRoutingModule: `RouterModule.forChild([])`, sin rutas. OJO: no es
  inofensivo borrarlo a secas. Como exporta RouterModule, es lo que hoy le
  da `routerLink` / `queryParams` a los componentes de Shared
  (TablaListadoComponent los usa: verificado, sin él el build falla con
  NG8002). Se reemplaza por un import directo de RouterModule en
  SharedModule (forma explícita, sin módulo de ruteo vacío) y se borra el
  archivo.
- FilterPipeModule (ngx-filter-pipe, pipe `filterBy`): el ÚNICO uso es
  `informe-liq-detalle` (Shared, camino viejo de Liquidación). Shared lo
  sigue importando; se saca de los 9 módulos de feature que lo importan
  sin usarlo. (Cuando LR1 retire informe-liq-detalle, sale también de
  Shared junto con la dependencia.)
- operaciones.module.ts importa `ɵɵDir` de @angular/cdk/scrolling: un
  símbolo INTERNO de Angular CDK (el prefijo ɵ marca API privada), traído
  por un auto-import accidental. No se usa.

El código muerto de Shared (AccionGenerica, TableroCalendario,
FechaValida, Role, Sortable, InformesAccionesCell) y LogoutComponent van
en LZ5b, aparte, para que este bloque quede chico.

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
grep -rn "filterBy" src --include=*.html --include=*.ts
grep -rln "FilterPipeModule" src --include=*.ts
grep -rn "cloudinary\|Cloudinary" src package.json --include=*.ts --include=*.html --include=*.json
grep -rn "SharedRoutingModule\|ɵɵDir" src --include=*.ts
grep -rn "routerLink\|queryParams" src/app/shared --include=*.html
grep -rn "cdkDrag\|cdkDrop" src --include=*.html
grep -rn "AuthGuard\|canActivate\|redirectLoggedInTo\|redirectUnauthorizedTo\|RoleGuard\|RouterModule\|Routes\b" src/app/app.module.ts src/app/app-routing.module.ts
```

Esperado:
- filterBy: solo informe-liq-detalle.component.html.
- FilterPipeModule: shared.module.ts, app.module.ts y los 9 módulos
  ajustes, choferes, clientes, legajos, liquidacion, nueva-facturacion,
  operaciones, proveedores, reportes.
- cloudinary: app.module.ts (import y uso), package.json (2) y los
  environments (claves `cloudinary`, no se tocan). Ningún otro .ts/.html.
- SharedRoutingModule: shared.module.ts y shared-routing.module.ts.
  ɵɵDir: solo operaciones.module.ts (import y uso).
- routerLink/queryParams en shared: tabla-listado.component.html (por eso
  SharedModule pasa a importar RouterModule directo).
- cdkDrag/cdkDrop: solo tablero-asignaciones (Operaciones, que importa
  DragDropModule y lo conserva).
- app.module.ts: el bloque de import de auth-guard (4 nombres) y
  RouterModule/Routes solo en su línea de import; app-routing.module.ts:
  el import de auth-guard (línea 2), RoleGuard solo en su import,
  RouterModule/Routes en uso (se quedan).

Si algo no coincide, detenete y reportá.

## PASO 1 — src/app/app.module.ts

1.1 BUSCAR:
```
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
```
REEMPLAZAR:
```
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
```

1.2 BUSCAR:
```
import { AuthService } from './servicios/autentificacion/auth.service';
import {
  AuthGuard,
  canActivate,
  redirectLoggedInTo,
  redirectUnauthorizedTo,
} from '@angular/fire/auth-guard';
```
REEMPLAZAR:
```
import { AuthService } from './servicios/autentificacion/auth.service';
```

1.3 BUSCAR:
```
import { PagenotfoundComponent } from './pagenotfound/pagenotfound.component';

import { SharedModule } from './shared/shared.module';
```
REEMPLAZAR:
```
import { PagenotfoundComponent } from './pagenotfound/pagenotfound.component';
```

1.4 BUSCAR:
```
import { CargaComponent } from './carga/carga.component';
import { CloudinaryModule } from '@cloudinary/ng';
import { LimboComponent } from './limbo/limbo.component';
import { FilterPipeModule } from 'ngx-filter-pipe';
import { AppRoutingModule } from './app-routing.module';
import { DragDropModule } from '@angular/cdk/drag-drop';
```
REEMPLAZAR:
```
import { CargaComponent } from './carga/carga.component';
import { LimboComponent } from './limbo/limbo.component';
import { AppRoutingModule } from './app-routing.module';
```

1.5 BUSCAR:
```
    ReactiveFormsModule,
    CloudinaryModule,
    SharedModule,
    FilterPipeModule,
    DragDropModule,
```
REEMPLAZAR:
```
    ReactiveFormsModule,
```

## PASO 2 — src/app/app-routing.module.ts

2.1 BUSCAR:
```
import { NgModule } from '@angular/core';
import { redirectUnauthorizedTo, redirectLoggedInTo, canActivate } from '@angular/fire/auth-guard';
```
REEMPLAZAR:
```
import { NgModule } from '@angular/core';
```

2.2 BUSCAR:
```
import { PagenotfoundComponent } from './pagenotfound/pagenotfound.component';
import { RoleGuard } from './guards/role.guard';
```
REEMPLAZAR:
```
import { PagenotfoundComponent } from './pagenotfound/pagenotfound.component';
```

## PASO 3 — src/app/shared/shared.module.ts

3.1 BUSCAR:
```
import { CommonModule, JsonPipe, TitleCasePipe } from '@angular/common';

import { SharedRoutingModule } from './shared-routing.module';
```
REEMPLAZAR:
```
import { CommonModule, JsonPipe, TitleCasePipe } from '@angular/common';
// RouterModule directo (antes llegaba vía SharedRoutingModule, vacío):
// routerLink/queryParams en componentes de Shared (ej. tabla-listado).
import { RouterModule } from '@angular/router';
```

3.2 BUSCAR:
```
    CommonModule,
    SharedRoutingModule,
    FormsModule,
```
REEMPLAZAR:
```
    CommonModule,
    RouterModule,
    FormsModule,
```

## PASO 4 — Borrar src/app/shared/shared-routing.module.ts

Borrá el archivo (no tiene spec).

## PASO 5 — src/app/raiz/ajustes/ajustes.module.ts

5.1 Borrá la línea COMPLETA que contiene:
```
import { FilterPipeModule } from 'ngx-filter-pipe';
```
por:
```
(borrar la línea)
```

5.2 Borrá la línea COMPLETA (termina con espacios) que contiene:
```
    FilterPipeModule,
```
por:
```
(borrar la línea)
```

## PASO 6 — src/app/raiz/choferes/choferes.module.ts

6.1 Borrá la línea COMPLETA que contiene:
```
import { FilterPipeModule } from 'ngx-filter-pipe';
```
por:
```
(borrar la línea)
```

6.2 Borrá la línea COMPLETA que contiene:
```
    FilterPipeModule,
```
por:
```
(borrar la línea)
```

## PASO 7 — src/app/raiz/clientes/clientes.module.ts

7.1 Borrá la línea COMPLETA que contiene:
```
import { FilterPipeModule } from 'ngx-filter-pipe';
```
por:
```
(borrar la línea)
```

7.2 Borrá la línea COMPLETA que contiene:
```
    FilterPipeModule,
```
por:
```
(borrar la línea)
```

## PASO 8 — src/app/raiz/legajos/legajos.module.ts

8.1 Borrá la línea COMPLETA que contiene:
```
import { FilterPipeModule } from 'ngx-filter-pipe';
```
por:
```
(borrar la línea)
```

8.2 Borrá la línea COMPLETA que contiene:
```
    FilterPipeModule,
```
por:
```
(borrar la línea)
```

## PASO 9 — src/app/raiz/liquidacion/liquidacion.module.ts

9.1 Borrá la línea COMPLETA que contiene:
```
import { FilterPipeModule } from 'ngx-filter-pipe';
```
por:
```
(borrar la línea)
```

9.2 Borrá la línea COMPLETA que contiene:
```
    FilterPipeModule,
```
por:
```
(borrar la línea)
```

## PASO 10 — src/app/raiz/nueva-facturacion/nueva-facturacion.module.ts

10.1 Borrá la línea COMPLETA que contiene:
```
import { FilterPipeModule } from 'ngx-filter-pipe';
```
por:
```
(borrar la línea)
```

10.2 Borrá la línea COMPLETA que contiene:
```
    FilterPipeModule,
```
por:
```
(borrar la línea)
```

## PASO 11 — src/app/raiz/operaciones/operaciones.module.ts

11.1 Borrá la línea COMPLETA que contiene:
```
import { FilterPipeModule } from 'ngx-filter-pipe';
```
por:
```
(borrar la línea)
```

11.2 Borrá la línea COMPLETA que contiene:
```
    FilterPipeModule,
```
por:
```
(borrar la línea)
```

## PASO 12 — src/app/raiz/proveedores/proveedores.module.ts

12.1 Borrá la línea COMPLETA que contiene:
```
import { FilterPipeModule } from 'ngx-filter-pipe';
```
por:
```
(borrar la línea)
```

12.2 Borrá la línea COMPLETA que contiene:
```
    FilterPipeModule,
```
por:
```
(borrar la línea)
```

## PASO 13 — src/app/raiz/reportes/reportes.module.ts

13.1 Borrá la línea COMPLETA que contiene:
```
import { FilterPipeModule } from 'ngx-filter-pipe';
```
por:
```
(borrar la línea)
```

13.2 Borrá la línea COMPLETA que contiene:
```
    FilterPipeModule,
```
por:
```
(borrar la línea)
```

## PASO 14 — src/app/raiz/operaciones/operaciones.module.ts (ɵɵDir)

14.1 Borrá la línea COMPLETA que contiene:
```
import { ɵɵDir } from "@angular/cdk/scrolling";
```
por:
```
(borrar la línea)
```

14.2 BUSCAR:
```
    DragDropModule,
    ɵɵDir
],
```
REEMPLAZAR:
```
    DragDropModule,
],
```

## PASO 15 — Dependencias

```
npm uninstall @cloudinary/ng @cloudinary/url-gen --legacy-peer-deps
npm install --save-dev @types/lodash@4.17.20 --legacy-peer-deps
```
Por qué el segundo comando: los tipos de lodash (`@types/lodash`) hoy
llegan SOLO como dependencia transitiva de @cloudinary
(@types/lodash.clonedeep / .debounce). storage.service.ts y
liquidacion.service.ts importan 'lodash'; sin esos tipos el build falla
(TS7016, strict). Se declaran explícitos como devDependency, con la MISMA
versión que hoy tiene el lock (4.17.20).

Reportá `git diff --stat package.json package-lock.json` y
`git diff package.json`. Esperado:
- package.json: salen "@cloudinary/ng" y "@cloudinary/url-gen" de
  dependencies; entra "@types/lodash": "^4.17.20" en devDependencies.
- package-lock.json: desaparecen @cloudinary/html (+ su typescript
  anidado), @cloudinary/ng, @cloudinary/transformation-builder-sdk,
  @cloudinary/url-gen, @types/lodash.clonedeep, @types/lodash.debounce y
  lodash.clonedeep. @types/lodash SE QUEDA (4.17.20). Ninguna otra
  dependencia cambia de versión.
Si algo no coincide, detenete y reportá.

## Verificación

1. Greps (reportá la salida):
```
grep -rln "FilterPipeModule" src --include=*.ts
grep -rn "cloudinary\|Cloudinary" src/app package.json
grep -n "@types/lodash" package.json
grep -rn "SharedRoutingModule\|ɵɵDir\|auth-guard\|RoleGuard" src/app/app.module.ts src/app/app-routing.module.ts src/app/shared/shared.module.ts src/app/raiz/operaciones/operaciones.module.ts
grep -n "SharedModule\|DragDropModule" src/app/app.module.ts
git diff -U0 -- src | grep -n "^+.* $"
```
Esperado: (a) solo shared.module.ts; (b) nada; (c) la línea de
devDependencies; (d) nada; (e) nada; (f) nada.

2. `npm run build:demo`. Reportá la tabla de tamaños y las advertencias.
   Referencia (medido sobre una copia del repo con LZ1–LZ4 + este
   cambio, con node_modules reinstalado desde el lock resultante):
   - main.js: 1,20 MB → ≈ 1,13 MB (Cloudinary sí quedaba en el bundle);
   - Initial total: 1,62 MB → ≈ 1,55 MB;
   - las mismas 9 advertencias.

## Pruebas manuales en demo (las hace Nico)

1. Login, olvidé mi contraseña, carga → /op.
2. Recorrer los 12 módulos desde el sidebar (es limpieza: no tiene que
   cambiar nada). En Liquidación, Facturación y Operaciones abrir algún
   modal.
3. Tablero de asignaciones: arrastrar y soltar (DragDropModule sigue en
   Operaciones).

## Mensaje de commit

```
LZ5 (lazy-fechas): limpieza de imports de módulos sin uso

- AppModule: fuera CloudinaryModule, SharedModule, FilterPipeModule,
  DragDropModule y los imports sin uso de auth-guard y RouterModule.
- app-routing: fuera imports sin uso (auth-guard, RoleGuard).
- SharedRoutingModule (vacío) borrado; SharedModule importa RouterModule
  directo (routerLink en tabla-listado).
- FilterPipeModule fuera de 9 módulos de feature (solo lo usa
  informe-liq-detalle, en Shared).
- Operaciones: fuera el import accidental de ɵɵDir (símbolo interno de
  @angular/cdk).
- npm uninstall @cloudinary/ng @cloudinary/url-gen (sin uso);
  @types/lodash pasa a devDependency explícita (antes llegaba solo vía
  Cloudinary).
```

FIN DE LA INSTRUCCIÓN LZ5
````
