````
Si no ves la línea FIN DE LA INSTRUCCIÓN LR1 al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN LR1 — Frente Lazy loading + fechas (ApLog, rama refactor)
=====================================================================
Retiro de la Liquidación vieja (componentes y servicios sin ruta) + ngx-filter-pipe

## Contexto y razonamiento

Decisión D5: el camino viejo de Liquidación (anterior al modelo
InformeOp/InformeLiq nuevo) sale en este frente. No tiene ruta: las rutas
están comentadas en liquidacion-routing. No tiene consumidores vivos: las
menciones desde código vivo son solo comentarios. Va antes de los bloques
de fechas (FE) para no corregir fechas en código que se borra.

El retiro se partió en dos bloques:
- **LR1 (este):** archivos completos, módulos, rutas comentadas y la
  dependencia ngx-filter-pipe.
- **LR1b:** los métodos de servicios vivos que quedan sin uso cuando
  desaparecen estos archivos (ChoferService, DbFirestoreService,
  InformeOpService, StorageService). Se medirá con un análisis de
  referencias sobre el código ya sin LR1.

**Qué sale** (verificado con grep de cada símbolo y con un análisis de
referencias del compilador de TypeScript sobre todo src/app):

| Pieza | Dónde | Quién la usa hoy |
|---|---|---|
| ProformaComponent | raiz/liquidacion/proforma | nadie (ruta comentada) |
| LiquidacionesOpComponent | raiz/liquidacion/liquidaciones-op | nadie (3 rutas comentadas) |
| MigrarDatosComponent (+ su FilterByPipe interno) | raiz/liquidacion/migrar-datos | nadie (ruta comentada; `exports` de LiquidacionModule; `<app-migrar-datos>` solo en un comentario de carga.component.html) |
| ResumenOpLiquidadasComponent | raiz/liquidacion/modales/resumen-op-liquidadas | solo LiquidacionesOp |
| PeriodoModalComponent | raiz/liquidacion/modales/periodo-modal | solo ResumenOpLiquidadas e InformeLiqDetalle |
| InformeLiqDetalleComponent | shared/modales/informe-liq-detalle | solo Proforma |
| LiquidacionService | servicios/liquidaciones/liquidacion.service.ts | solo Proforma y LiquidacionesOp |
| LiquidacionBuilderService | servicios/liquidaciones/liquidacion-builder.service.ts | solo LiquidacionService |

Además:
- **DatePipe:** sale de `providers` de LiquidacionModule. Ningún
  componente que queda en Liquidación lo inyecta (era de
  liquidaciones-op).
- **DateRangeService:** SE QUEDA en `providers`. No es
  `providedIn: 'root'` y lo usan liq-gral, informe-op-listado e
  informe-op-anulados.
- **RoleGuard en liquidacion-routing:** sale el import, porque solo lo
  usaba la ruta comentada de `migrar`.
- **FilterPipeModule / ngx-filter-pipe:** el ÚNICO uso del pipe `filterBy`
  era informe-liq-detalle. Sale de SharedModule y se desinstala la
  dependencia.
- **liq-gral:** sale la línea comentada `<app-tablero-calendario ...>` del
  template y la propiedad `modo`, que solo usaba esa línea.

**Qué NO se toca** (D5, con conflicto o vivo):
- RegistroComponent (visor de `logs` viejo), PapeleraLegadoComponent y
  ObjetoPapeleraComponent: tienen rutas vivas.
- LogService.
- `ExcelService.exportToExcelInforme` y `PdfService.exportToPdfInforme`:
  los usa objeto-papelera.
- Los comentarios en código vivo que mencionan las piezas borradas (por
  ejemplo, informe-op.service, ajustes-liq, columnas-liquidacion.util,
  liquidacion-nueva). Se revisan en LR1b, junto con los métodos que
  documentan.

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
grep -rn "ProformaComponent\|LiquidacionesOpComponent\|MigrarDatosComponent\|ResumenOpLiquidadasComponent\|PeriodoModalComponent\|InformeLiqDetalleComponent\|LiquidacionService\b\|LiquidacionBuilderService\|FilterByPipe" src --include=*.ts
grep -rn "app-proforma\|app-liquidaciones-op\|app-migrar-datos\|app-resumen-op-liquidadas\|app-periodo-modal\|app-informe-liq-detalle" src --include=*.html --include=*.ts
grep -rn "filterBy\|FilterPipeModule\|ngx-filter-pipe" src package.json
grep -rn "DatePipe" src/app/raiz/liquidacion --include=*.ts
grep -n "modo" src/app/raiz/liquidacion/liq-gral/liq-gral.component.ts src/app/raiz/liquidacion/liq-gral/liq-gral.component.html
ls src/app/servicios/liquidaciones
```

Esperado:

1. **Nombres de clase.** Además de lo listado abajo, aparecen los propios
   archivos de cada pieza (su .ts y su .spec.ts).
   - Fuera de esos archivos, hay referencias de código solo en:
     - liquidacion.module.ts;
     - liquidacion-routing.module.ts (incluye la ruta comentada de
       `migrar`);
     - shared.module.ts (InformeLiqDetalle);
     - proforma, liquidaciones-op, resumen-op-liquidadas e
       informe-liq-detalle, que se abren o se inyectan entre ellos.
   - Hay también COMENTARIOS que los nombran en código vivo; listalos:
     - informe-op.service.ts:71 (`usado por LiquidacionesOpComponent`);
     - ajustes-liq.component.ts;
     - columnas-liquidacion.util.ts;
     - liquidacion-nueva.component.ts;
     - y otros similares.
   Ninguna referencia de código desde un archivo que se queda.
2. **Selectores.**
   - Los `selector:` de cada pieza.
   - carga.component.html:33, dentro de un comentario HTML
     `<!-- <div class="container"> ... </div> -->`.
3. **filterBy / FilterPipeModule.**
   - informe-liq-detalle.component.html (el pipe);
   - shared.module.ts (import de archivo y en `imports`);
   - package.json (la dependencia).
   (El FilterByPipe propio de migrar-datos no se llama filterBy.)
4. **DatePipe:** solo liquidacion.module.ts (import y `providers`).
5. **modo:**
   - liq-gral.component.ts: solo la declaración `modo: string = 'liquidaciones'`;
   - liq-gral.component.html: solo la línea 14, comentada.
6. **servicios/liquidaciones:** solo liquidacion.service(.spec).ts y
   liquidacion-builder.service(.spec).ts.

Si aparece una referencia de CÓDIGO (no comentario) a alguna pieza desde un
archivo que se queda, detenete y reportá.

## PASO 1 — src/app/raiz/liquidacion/liquidacion.module.ts

1.1 BUSCAR:
```
import { CommonModule, DatePipe } from '@angular/common';
```
REEMPLAZAR:
```
import { CommonModule } from '@angular/common';
```

1.2 BUSCAR:
```
import { ResumenOpLiquidadasComponent } from './modales/resumen-op-liquidadas/resumen-op-liquidadas.component';
import { ProformaComponent } from './proforma/proforma.component';
import { LiquidacionesOpComponent } from './liquidaciones-op/liquidaciones-op.component';
import { MigrarDatosComponent } from './migrar-datos/migrar-datos.component';
import { DateRangeService } from 'src/app/servicios/fechas/date-range.service';
import { PeriodoModalComponent } from './modales/periodo-modal/periodo-modal.component';
```
REEMPLAZAR:
```
import { DateRangeService } from 'src/app/servicios/fechas/date-range.service';
```

1.3 BUSCAR:
```
    LiqGralComponent,

    LiquidacionesOpComponent,
    MigrarDatosComponent,
    ResumenOpLiquidadasComponent,
    ProformaComponent,
    PeriodoModalComponent,
    InformeOpListadoComponent,
```
REEMPLAZAR:
```
    LiqGralComponent,
    InformeOpListadoComponent,
```

1.4 BUSCAR:
```
    SharedModule,
  ],
   exports:[
      MigrarDatosComponent,
    ],

  providers: [
```
REEMPLAZAR:
```
    SharedModule,
  ],
  providers: [
```

1.5 Borrá la línea COMPLETA que contiene:
```
    DatePipe,
```
por:
```
(borrar la línea)
```
(La línea tiene un espacio al final. Después de 1.1 es la única que
contiene `DatePipe`.)

## PASO 2 — src/app/raiz/liquidacion/liquidacion-routing.module.ts

2.1 BUSCAR:
```
import { LiqGralComponent } from './liq-gral/liq-gral.component';

import { ProformaComponent } from './proforma/proforma.component';
import { LiquidacionesOpComponent } from './liquidaciones-op/liquidaciones-op.component';
import { MigrarDatosComponent } from './migrar-datos/migrar-datos.component';
import { RoleGuard } from 'src/app/guards/role.guard';
import { InformeOpListadoComponent } from './informe-op-listado/informe-op-listado.component';
```
REEMPLAZAR:
```
import { LiqGralComponent } from './liq-gral/liq-gral.component';
import { InformeOpListadoComponent } from './informe-op-listado/informe-op-listado.component';
```

2.2 BUSCAR:
```
      {path: '', redirectTo: 'informes', pathMatch: 'full' },
      //{path: 'proformas', component:ProformaComponent},
      //{path: 'cliente', component:LiquidacionesOpComponent},
      //{path: 'chofer', component:LiquidacionesOpComponent},
      //{path: 'proveedor', component:LiquidacionesOpComponent},
      {path: 'informes', component:InformeOpListadoComponent},
```
REEMPLAZAR:
```
      {path: '', redirectTo: 'informes', pathMatch: 'full' },
      {path: 'informes', component:InformeOpListadoComponent},
```

2.3 BUSCAR:
```
      {path: 'anulados', component: InformeOpAnuladosComponent},
      /* {path: 'migrar', component:MigrarDatosComponent,
      canActivate: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['dev'] }, // Accesible para todos los roles
      }, */
    ]
```
REEMPLAZAR:
```
      {path: 'anulados', component: InformeOpAnuladosComponent},
    ]
```

## PASO 3 — src/app/shared/shared.module.ts

3.1 Borrá la línea COMPLETA que contiene:
```
import { InformeLiqDetalleComponent } from './modales/informe-liq-detalle/informe-liq-detalle.component';
```
por:
```
(borrar la línea)
```

3.2 Borrá la línea COMPLETA que contiene:
```
import { FilterPipeModule } from 'ngx-filter-pipe';
```
por:
```
(borrar la línea)
```

3.3 Borrá la línea COMPLETA que contiene:
```
    FilterPipeModule,
```
por:
```
(borrar la línea)
```

3.4 `InformeLiqDetalleComponent,` aparece ahora DOS veces, en dos líneas
idénticas: `    InformeLiqDetalleComponent, ` (con espacio al final). Una está
en `declarations` y otra en `exports`. Borralas en este orden:

  a. En `declarations`: borrá la línea que está INMEDIATAMENTE DEBAJO de
     `    ObjetoPapeleraComponent,`. Es `    InformeLiqDetalleComponent, `.
     Verificá que sea esa antes de borrarla. `ObjetoPapeleraComponent,`
     aparece una sola vez fuera del import de archivo.
  b. En `exports`: ahora queda una sola línea que contiene
     `InformeLiqDetalleComponent`. Borrala completa.

## PASO 4 — src/app/raiz/liquidacion/liq-gral/liq-gral.component.html

4.1 Borrá la línea COMPLETA que contiene:
```
<!-- <app-tablero-calendario [modo]="modo" [ngClass]="{'invisible': ocultarCalendario}"></app-tablero-calendario> -->
```
por:
```
(borrar la línea)
```

## PASO 5 — src/app/raiz/liquidacion/liq-gral/liq-gral.component.ts

5.1 Borrá la línea COMPLETA que contiene:
```
  modo: string = 'liquidaciones'
```
por:
```
(borrar la línea)
```

## PASO 6 — src/app/carga/carga.component.html

6.1 BUSCAR:
```
</div> -->
<!-- <div class="container">
    <app-migrar-datos></app-migrar-datos>
</div> -->
```
REEMPLAZAR:
```
</div> -->
```

## PASO 7 — Borrar archivos

Borrá (con rm; NO uses git rm):

Carpetas completas:
```
src/app/raiz/liquidacion/proforma/
src/app/raiz/liquidacion/liquidaciones-op/
src/app/raiz/liquidacion/migrar-datos/
src/app/raiz/liquidacion/modales/resumen-op-liquidadas/
src/app/raiz/liquidacion/modales/periodo-modal/
src/app/shared/modales/informe-liq-detalle/
src/app/servicios/liquidaciones/
```
La última carpeta contiene solo los 4 archivos de LiquidacionService y
LiquidacionBuilderService (PASO 0, punto 6). `modales/` de liquidacion
NO se borra: queda `liquidacion-nueva`.

## PASO 8 — Dependencia

```
npm uninstall ngx-filter-pipe --legacy-peer-deps
```
Reportá `git diff package.json` y `git diff --stat package-lock.json`.
Esperado:
- package.json: sale solo la línea `"ngx-filter-pipe": "^3.0.1",`.
- package-lock.json: sale solo el paquete `node_modules/ngx-filter-pipe`
  y su entrada en las dependencias de la raíz.
- Ninguna otra dependencia cambia de versión.
Si algo no coincide, detenete y reportá.

## Verificación

1. Greps (reportá la salida):
```
grep -rn "ProformaComponent\|LiquidacionesOpComponent\|MigrarDatosComponent\|ResumenOpLiquidadasComponent\|PeriodoModalComponent\|InformeLiqDetalleComponent\|LiquidacionBuilderService\|FilterByPipe" src --include=*.ts --include=*.html | grep -v "^\S*:[0-9]*:\s*\(//\|\*\|/\*\)"
grep -rn "LiquidacionService\b" src --include=*.ts | grep -v "^\S*:[0-9]*:\s*\(//\|\*\|/\*\)"
grep -rn "app-migrar-datos\|app-tablero-calendario\|filterBy\|FilterPipeModule\|ngx-filter-pipe" src package.json
grep -rn "DatePipe\|RoleGuard" src/app/raiz/liquidacion/liquidacion.module.ts src/app/raiz/liquidacion/liquidacion-routing.module.ts
grep -c "InformeLiqDetalle" src/app/shared/shared.module.ts
git status --short
git diff -U0 -- src | grep -n "^+.* $"
```
Esperado:
- (a) nada. Las líneas de comentario quedan filtradas; si aparece algún
  comentario de bloque que el filtro no atrapa, listalo y seguí.
- (b) nada (ídem).
- (c) nada.
- (d) nada.
- (e) `0`.
- (f) modificados (M):
  - liquidacion.module.ts, liquidacion-routing.module.ts;
  - shared.module.ts;
  - liq-gral.component.html, liq-gral.component.ts;
  - carga.component.html;
  - package.json, package-lock.json.
  Borrados (D): 28 archivos.
  - proforma, liquidaciones-op, migrar-datos, resumen-op-liquidadas,
    periodo-modal e informe-liq-detalle: 4 cada uno (.ts, .html, .scss,
    .spec.ts), 24 en total;
  - servicios/liquidaciones: 4.
  Nada más.
- (g) nada.

2. `npm run build:demo`. Reportá la tabla de tamaños y las advertencias.
   Referencia (medido sobre una copia del repo con LZ1–LZ7 + este
   cambio):
   - Initial total: ≈ 1,55 MB.
   - Los chunks de liquidacion-liquidacion-module, prácticamente sin
     cambio. El compilador ya descartaba este código del bundle porque
     nada lo referenciaba. El beneficio del bloque es de mantenimiento y
     de claridad, no de peso.
   - Las mismas 9 advertencias.

## Pruebas manuales en demo (las hace Nico)

1. Liquidación: entrar a Informes, Borradores y Anulados.
   - Liquidar algo nuevo (modal de liquidación nueva) y abrir un borrador.
   - Cambiar de mes con el selector de fechas.
2. Facturación y Finanzas: abrir algún informe de liquidación (detalle
   nuevo), editar ajustes/descuentos si corresponde.
3. Ajustes:
   - Papelera legado: abrir un objeto y exportarlo a Excel/PDF (usa
     ExcelService/PdfService viejos, que se quedan);
   - Registro viejo: que liste.
4. Carga (`/carga` después del login): sigue redirigiendo a /op.

## Mensaje de commit

```
LR1 (lazy-fechas): retiro de la Liquidación vieja sin ruta

- Borrados: ProformaComponent, LiquidacionesOpComponent,
  MigrarDatosComponent (+ FilterByPipe), ResumenOpLiquidadasComponent,
  PeriodoModalComponent, InformeLiqDetalleComponent (Shared),
  LiquidacionService y LiquidacionBuilderService. Sin ruta ni
  consumidores vivos (D5).
- LiquidacionModule: fuera sus declaraciones, el exports de MigrarDatos y
  el provider DatePipe. liquidacion-routing: fuera las rutas comentadas y
  los imports sin uso (incluido RoleGuard).
- SharedModule: fuera InformeLiqDetalle y FilterPipeModule;
  npm uninstall ngx-filter-pipe (su único uso era informe-liq-detalle).
- liq-gral: fuera la línea comentada de app-tablero-calendario y la
  propiedad modo. carga: fuera el comentario con app-migrar-datos.
- Se quedan (D5): Registro viejo, Papelera legado + ObjetoPapelera,
  LogService y los exports Excel/PDF que usa la Papelera.
```

FIN DE LA INSTRUCCIÓN LR1
````
