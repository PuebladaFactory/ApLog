````
Si no ves la línea FIN DE LA INSTRUCCIÓN LZ5b al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN LZ5b — Frente Lazy loading + fechas (ApLog, rama refactor)
======================================================================
Código muerto de Shared y LogoutComponent

## Contexto y razonamiento

Segunda mitad de la limpieza de LZ5. Estas piezas están declaradas (y la
mayoría exportadas) pero nadie las usa: ningún template tiene su selector y
ningún .ts las importa fuera de su propio módulo y sus propios archivos.

| Pieza | Selector | Dónde está declarada |
|---|---|---|
| AccionGenericaComponent | app-accion-generica | SharedModule (decl + export) |
| TableroCalendarioComponent | app-tablero-calendario | SharedModule (decl + export) |
| RoleDirective | [appRole] | SharedModule (decl + export) |
| FechaValidaDirective | [appFechaValida] | SharedModule (decl + export) |
| SortableDirective (+ interfaz SortEvent) | [appSortable] | SharedModule (decl + export) |
| InformesAccionesCellComponent | app-informes-acciones-cell | SharedModule (decl + export) |
| LogoutComponent | app-logout | AppModule (decl) |

- TableroCalendario: el único rastro es una línea YA COMENTADA en
  liq-gral.component.html (`<!-- <app-tablero-calendario ... -->`). Ese
  comentario NO se toca acá (es del camino viejo de Liquidación; sale con
  LR1).
- InformesAccionesCell era un cell renderer pensado para AG Grid, que ya
  se retiró en LZ3.
- LogoutComponent: el cierre de sesión real lo hace AuthService
  (`cerrarSesion`) desde el sidebar/header; este componente no tiene ruta
  ni se usa en ningún template.
- De paso: shared.module.ts importa `NgbCalendar` y `NgbDate` de
  ng-bootstrap y no los usa en ningún lado del archivo (eran para el
  TableroCalendario). La línea queda solo con `NgbDatepickerModule`, que
  sí se usa.

No cambia comportamiento. En bundle el ahorro es mínimo (el compilador ya
descartaba casi todo); el objetivo es que no queden piezas que confundan.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto a BUSCAR no está o aparece más de una vez: detenete y
  reportá.
- Aplicá los cambios de cada archivo EN ORDEN (el orden importa: varios
  nombres aparecen dos veces, en declarations y en exports; los pasos
  están ordenados para que cada BUSCAR sea único en el momento de
  aplicarlo).
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.
- Si se toca un tipo, interfaz, módulo o export, revisá TODOS sus usos en
  src/ (incluidos .spec.ts y .html).

## PASO 0 — Verificación (sin modificar nada)

Corré y reportá la salida:

```
grep -rn "AccionGenericaComponent\|TableroCalendarioComponent\|RoleDirective\|FechaValidaDirective\|SortableDirective\|SortEvent\|InformesAccionesCellComponent\|LogoutComponent" src --include=*.ts
grep -rn "app-accion-generica\|app-tablero-calendario\|appRole\|appFechaValida\|appSortable\|app-informes-acciones-cell\|app-logout" src --include=*.html --include=*.ts
grep -n "NgbCalendar\|NgbDate\b" src/app/shared/shared.module.ts
ls src/app/shared/botones/accion-generica src/app/shared/tablero-calendario src/app/shared/tabla/informes-acciones-cell src/app/appLogin/logout
ls src/app/shared/directives
```

Esperado:
1. Primer grep: solo
   - shared.module.ts (2 imports de línea + declarations + exports de
     cada pieza de Shared);
   - app.module.ts (import y declaración de LogoutComponent);
   - los propios archivos de cada pieza (su .ts y su .spec.ts).
   Ningún otro archivo.
2. Segundo grep: solo
   - los `selector:` dentro de los propios .ts de cada pieza;
   - liq-gral.component.html:14, una línea COMENTADA
     (`<!-- <app-tablero-calendario ...`).
   Ningún otro uso.
3. NgbCalendar / NgbDate: solo la línea 15 (el import).
4. Carpetas:
   - accion-generica: solo accion-generica.component.ts;
   - tablero-calendario: .html, .scss, .spec.ts, .ts;
   - informes-acciones-cell: .html, .scss, .spec.ts, .ts;
   - logout: .html, .scss, .spec.ts, .ts.
5. directives: incluye fecha-valida.directive(.spec).ts,
   role.directive(.spec).ts y sortable.directive(.spec).ts (las demás se
   quedan).

Si algo no coincide (en especial, si aparece un uso real de alguna pieza),
detenete y reportá.

## PASO 1 — src/app/app.module.ts

1.1 Borrá la línea COMPLETA que contiene:
```
import { LogoutComponent } from './appLogin/logout/logout.component';
```
por:
```
(borrar la línea)
```

1.2 Borrá la línea COMPLETA que contiene:
```
    LogoutComponent,
```
por:
```
(borrar la línea)
```

## PASO 2 — src/app/shared/shared.module.ts

Imports de archivo:

2.1 Borrá la línea COMPLETA que contiene:
```
import { AccionGenericaComponent } from './botones/accion-generica/accion-generica.component';
```
por:
```
(borrar la línea)
```

2.2 Borrá la línea COMPLETA que contiene:
```
import { TableroCalendarioComponent } from './tablero-calendario/tablero-calendario.component';
```
por:
```
(borrar la línea)
```

2.3 BUSCAR:
```
import { NgbCalendar, NgbDate, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
```
REEMPLAZAR:
```
import { NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
```

2.4 Borrá la línea COMPLETA que contiene:
```
import { RoleDirective } from './directives/role.directive';
```
por:
```
(borrar la línea)
```

2.5 Borrá la línea COMPLETA que contiene:
```
import { FechaValidaDirective } from './directives/fecha-valida.directive';
```
por:
```
(borrar la línea)
```

2.6 Borrá la línea COMPLETA que contiene:
```
import { InformesAccionesCellComponent } from './tabla/informes-acciones-cell/informes-acciones-cell.component';
```
por:
```
(borrar la línea)
```

2.7 Borrá la línea COMPLETA que contiene:
```
import { SortableDirective } from './directives/sortable.directive';
```
por:
```
(borrar la línea)
```

declarations (principio):

2.8 BUSCAR:
```
  declarations: [
    BtnAgregarComponent,
    BtnEditarComponent,
    BtnEliminarComponent,
    BtnLeerComponent,
    AccionGenericaComponent,
    TableroCalendarioComponent,
```
REEMPLAZAR:
```
  declarations: [
    BtnAgregarComponent,
    BtnEditarComponent,
    BtnEliminarComponent,
    BtnLeerComponent,
```

exports:

2.9 BUSCAR:
```
  exports:[
    BtnAgregarComponent,
    BtnEditarComponent,
    BtnEliminarComponent,
    BtnLeerComponent,
    AccionGenericaComponent,
    TableroCalendarioComponent,
```
REEMPLAZAR:
```
  exports:[
    BtnAgregarComponent,
    BtnEditarComponent,
    BtnEliminarComponent,
    BtnLeerComponent,
```

2.10 BUSCAR:
```
    SoloLetrasDirective,

    RoleDirective,
    PermisoDirective,
    BajaObjetoComponent,
    FechaValidaDirective,
```
REEMPLAZAR:
```
    SoloLetrasDirective,

    PermisoDirective,
    BajaObjetoComponent,
```

2.11 BUSCAR:
```
    DescuentosComponent,
    BuscarPorChoferPipe,
    VisibilidadListadosComponent,
    TableroFechasComponent,
    InformesAccionesCellComponent,
```
REEMPLAZAR:
```
    DescuentosComponent,
    BuscarPorChoferPipe,
    VisibilidadListadosComponent,
    TableroFechasComponent,
```

2.12 BUSCAR:
```
    SortableDirective,
    CalcularPorcentajeV2Pipe,
    FiltroPeriodoComponent,
    TablaAccionesComponent,
    TablaGenericaComponent,
    TablaListadoComponent,
    IconoArchivoPipe,
    AcortarNombreArchivoPipe,
  ]
```
REEMPLAZAR:
```
    CalcularPorcentajeV2Pipe,
    FiltroPeriodoComponent,
    TablaAccionesComponent,
    TablaGenericaComponent,
    TablaListadoComponent,
    IconoArchivoPipe,
    AcortarNombreArchivoPipe,
  ]
```
(En declarations el mismo tramo termina en una línea vacía y `  ],`, por
eso este BUSCAR solo coincide con exports.)

declarations (resto). A esta altura cada uno de estos nombres aparece una
sola vez en el archivo:

2.13 Reemplazá la línea COMPLETA que contiene:
```
    RoleDirective, PermisoDirective, BajaObjetoComponent,
```
por:
```
    PermisoDirective, BajaObjetoComponent,
```

2.14 (Está en declarations y termina con un espacio al final.) Borrá la
línea COMPLETA que contiene:
```
    FechaValidaDirective,
```
por:
```
(borrar la línea)
```

2.15 Borrá la línea COMPLETA que contiene:
```
    InformesAccionesCellComponent,
```
por:
```
(borrar la línea)
```

2.16 Borrá la línea COMPLETA que contiene:
```
    SortableDirective,
```
por:
```
(borrar la línea)
```

## PASO 3 — Borrar archivos

Borrá (con rm; NO uses git rm, no hay que tocar el índice):

Carpetas completas:
```
src/app/shared/botones/accion-generica/
src/app/shared/tablero-calendario/
src/app/shared/tabla/informes-acciones-cell/
src/app/appLogin/logout/
```

Archivos:
```
src/app/shared/directives/fecha-valida.directive.ts
src/app/shared/directives/fecha-valida.directive.spec.ts
src/app/shared/directives/role.directive.ts
src/app/shared/directives/role.directive.spec.ts
src/app/shared/directives/sortable.directive.ts
src/app/shared/directives/sortable.directive.spec.ts
```

## Verificación

1. Greps (reportá la salida):
```
grep -rn "AccionGenerica\|TableroCalendario\|RoleDirective\|FechaValidaDirective\|SortableDirective\|SortEvent\|InformesAccionesCell\|LogoutComponent" src --include=*.ts
grep -rn "app-accion-generica\|app-tablero-calendario\|appRole\|appFechaValida\|appSortable\|app-informes-acciones-cell\|app-logout" src --include=*.html --include=*.ts
grep -n "PermisoDirective\|NgbDatepickerModule\|NgbCalendar\|NgbDate\b" src/app/shared/shared.module.ts
git status --short
git diff -U0 -- src | grep -n "^+.* $"
```
Esperado:
- (a) nada.
- (b) solo liq-gral.component.html:14 (la línea comentada, se queda).
- (c) PermisoDirective 3 veces (import, declarations, exports);
  NgbDatepickerModule 2 veces (import de archivo e imports del módulo);
  NgbCalendar / NgbDate: ninguna. (Fuera de shared.module.ts, NgbCalendar
  y NgbDate SÍ se usan en tablero-fechas y en registro: no se tocan.)
- (d) M app.module.ts, M shared.module.ts y los 20 archivos borrados (D):
  1 de accion-generica, 4 de tablero-calendario, 4 de
  informes-acciones-cell, 4 de logout, 6 de directives. Nada más.
- (e) nada.

2. `npm run build:demo`. Reportá la tabla de tamaños y las advertencias.
   Referencia (medido sobre una copia del repo con LZ1–LZ5 + este
   cambio): sin cambios apreciables de tamaño (main.js ≈ 1,13 MB, Initial
   total ≈ 1,55 MB) y las mismas 9 advertencias.

## Pruebas manuales en demo (las hace Nico)

Es borrado de código sin uso: la prueba es que todo siga igual.
1. Login, olvidé mi contraseña, carga → /op. Cerrar sesión desde la app
   (sigue funcionando: lo hace AuthService, no LogoutComponent).
2. Recorrer los módulos desde el sidebar; en Liquidación (liq-gral),
   Facturación y Finanzas abrir algún listado y algún modal.
3. Algún listado con ordenamiento por columna y algún botón restringido
   por rol/permiso (PermisoDirective se queda; RoleDirective no se usaba).

## Mensaje de commit

```
LZ5b (lazy-fechas): borrado de código muerto en Shared y LogoutComponent

- SharedModule: fuera AccionGenericaComponent, TableroCalendarioComponent,
  RoleDirective, FechaValidaDirective, SortableDirective e
  InformesAccionesCellComponent (declarados/exportados, sin ningún uso).
  Se borran sus archivos y specs.
- SharedModule: fuera los imports sin uso NgbCalendar y NgbDate.
- AppModule: fuera LogoutComponent (sin ruta ni uso; el cierre de sesión
  lo hace AuthService). Se borra la carpeta appLogin/logout.
```

FIN DE LA INSTRUCCIÓN LZ5b
````
