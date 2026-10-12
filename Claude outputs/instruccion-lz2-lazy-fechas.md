````
Si no ves la línea FIN DE LA INSTRUCCIÓN LZ2 al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN LZ2 — Frente Lazy loading + fechas (ApLog, rama refactor)
=====================================================================
RaizModule sin imports eager de módulos de feature

## Contexto y razonamiento

LZ1 (commiteado) dejó RaizModule cargándose lazy montado en ''. Pero
RaizModule sigue importando en forma EAGER 8 módulos de feature (Ajustes,
Choferes, Legajos, Proveedores, Liquidacion, Vendedores, NuevaFacturacion,
Reportes), que además se cargan lazy desde raiz-routing. Efectos:

- El chunk lazy de Raiz pesa 5,69 MB: arrastra los 8 features y sus
  librerías (pdfmake, exceljs, jspdf, pdfjs, jsQR). Cualquier pantalla
  descarga todo eso al entrar.
- El RouterModule.forChild de cada feature registra sus rutas también
  dentro de Raiz: '/listado', '/usuarios', '/tablero', '/informes'… abren
  la pantalla del feature suelta (sin sidebar, y algunas sin RoleGuard).

No hay dependencias reales:
- Los componentes declarados en RaizModule (Home, Sidebar, Migracion,
  LimpiezaDemo, 3 generadores, 2 recálculos) solo usan cosas de
  Raiz, Shared y Common (verificado sobre templates: selectores, pipes,
  directivas y modalService.open).
- El build AOT de RaizModule sin esos 8 imports compila limpio
  (verificado sobre una copia del repo).
- Providers de módulo: solo LiquidacionModule (DatePipe,
  DateRangeService). Sus consumidores están dentro de Liquidacion u
  Operaciones (que provee su propio DateRangeService); ningún modal los
  inyecta. Sin cambio funcional.

De paso, RaizModule deja de importar AgGridModule, DragDropModule y
FilterPipeModule, que ningún componente de Raiz usa (no hay
<ag-grid-angular>, cdkDrag ni `| filterBy` en sus templates), y deja de
exportar HomeComponent (nadie importa RaizModule desde LZ1). Decisión L4:
los 8 en un solo bloque; si algo no compila, se parte.

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
grep -rn "RaizModule" src/app --include=*.ts | grep -v "^\s*//"
grep -rn "HomeComponent" src/app --include=*.ts
grep -rn "<ag-grid\|cdkDrag\|cdkDrop\|filterBy" src/app/raiz/home src/app/raiz/sidebar src/app/componentes
grep -rln "DateRangeService\|DatePipe" src/app --include=*.ts
```

Esperado:
- RaizModule: solo raiz.module.ts (la clase), app-routing.module.ts
  (loadChildren) y comentarios.
- HomeComponent: raiz.module.ts, raiz-routing.module.ts, el propio
  componente y su .spec.ts (si declara HomeComponent en un TestBed, no
  cambia: el export de RaizModule no lo afecta).
- Tercer grep: nada.
- DateRangeService/DatePipe: date-range.service.ts, tablero-fechas
  (shared), liquidacion.module.ts, liq-gral, informe-op-listado,
  informe-op-anulados, liquidaciones-op, operaciones.module.ts,
  tablero-op, vendedores.module.ts (solo en un comentario) y specs.
  Ninguno bajo modales/.

Si algo no coincide, detenete y reportá.

## PASO 1 — src/app/raiz/raiz.module.ts

1.1 BUSCAR:
```
import { ChoferesModule } from './choferes/choferes.module';

import { ProveedoresModule } from './proveedores/proveedores.module';
import { LiquidacionModule } from './liquidacion/liquidacion.module';
import { SharedModule } from "../shared/shared.module";
import { FilterPipeModule } from 'ngx-filter-pipe';
import { AgGridModule } from 'ag-grid-angular';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { AjustesModule } from './ajustes/ajustes.module';
import { LegajosModule } from './legajos/legajos.module';
import { VendedoresModule } from './vendedores/vendedores.module';
import { NuevaFacturacionModule } from './nueva-facturacion/nueva-facturacion.module';
import { ReportesModule } from './reportes/reportes.module';
/* import { NuevaFacturacionModule } from './nueva-facturacion/nueva-facturacion.module'; */
```
REEMPLAZAR:
```
import { SharedModule } from "../shared/shared.module";

// Frente lazy-fechas (LZ2): RaizModule NO importa módulos de feature. Cada
// feature se carga solo lazy desde raiz-routing (importarlos acá anulaba
// el lazy loading y registraba sus rutas sueltas dentro de Raiz).
```

1.2 BUSCAR:
```
    exports: [
        HomeComponent,
    ],
    imports: [
        CommonModule,
        FormsModule,
        RaizRoutingModule,
        AjustesModule,
        ChoferesModule,
        LegajosModule,
        ProveedoresModule,
        LiquidacionModule,
        VendedoresModule,
        SharedModule,
        FilterPipeModule,
        AgGridModule,
```
REEMPLAZAR:
```
    imports: [
        CommonModule,
        FormsModule,
        RaizRoutingModule,
        SharedModule,
```

1.3 OJO: esta línea TERMINA CON UN ESPACIO. Borrá la línea COMPLETA
(incluido el espacio final) que contiene:
```
        DragDropModule,
```
por:
```
(borrar la línea)
```
(Es la que está dentro del array imports; el `import { DragDropModule }`
del encabezado ya se fue en 1.1.)

1.4 BUSCAR:
```
        NuevaFacturacionModule,
        ReportesModule
    ],
```
REEMPLAZAR:
```
    ],
```

Resultado esperado del decorador:
```
@NgModule({
    declarations: [
        HomeComponent,
        SidebarComponent,
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
        RaizRoutingModule,
        SharedModule,
    ],
})
```

## Verificación

1. Greps (reportá la salida):
```
grep -n "Module" src/app/raiz/raiz.module.ts
grep -n " $" src/app/raiz/raiz.module.ts
```
Esperado: (a) solo NgModule, CommonModule, FormsModule,
RaizRoutingModule (import y uso), SharedModule (import y uso), la línea
del comentario nuevo y `export class RaizModule`; (b) nada.

2. `npm run build:demo`. Reportá la tabla de tamaños y las advertencias.
   Referencia (medido sobre una copia del repo con LZ1 + este cambio):
   - Initial total ≈ 2,76 MB (sin cambios: main ya no tenía Raiz);
   - chunk de Raiz: 5,69 MB → ≈ 0,39 MB;
   - aparecen chunks lazy por feature (ajustes, choferes, proveedores,
     legajos, liquidacion, vendedores, nueva-facturacion, reportes) y
     chunks comunes (exceljs ≈ 0,95 MB, pdfmake ≈ 2,5 MB, jspdf,
     pdfjs+jsQR).
   - Las mismas 9 advertencias.

## Pruebas manuales en demo (las hace Nico)

1. Login → /op/tablero.
2. Entrar a CADA módulo desde el sidebar y recorrer sus pestañas:
   Operaciones (tablero, asignaciones), Clientes, Choferes, Proveedores
   (alta/listado), Liquidación (informes, borradores, anulados),
   Facturación (emitidos, facturados, revertidos), Legajos (tablero,
   cargar, consulta, vencimientos), Vendedores (tablero, listado,
   historial), Tarifas, Finanzas, Reportes (general, entidad), Ajustes
   (usuarios, registro, papelera, registro-log, papelera-legado,
   empresa), /migracion (rol dev).
3. Modales que cruzan módulos: en Proveedores → listado, abrir un
   vehículo (modal de Choferes); en Ajustes → Registro de actividad y
   Papelera, "ver objeto" de un cliente/chofer/proveedor/operación;
   Tarifas → Eventual, ver la operación.
4. Fechas de Liquidación y del tablero de operaciones: cambiar período
   (semana/quincena/mes) y navegar ← → (usan DateRangeService).
5. Rutas sueltas: /listado, /usuarios, /tablero → pantalla "¡Ups!" (ya no
   abren pantallas de features).
6. Exportar un Excel (ej. clientes) y un PDF de liquidación: la primera
   vez se descarga un chunk extra; tiene que funcionar igual.

## Mensaje de commit

```
LZ2 (lazy-fechas): RaizModule sin imports eager de módulos de feature

- RaizModule deja de importar Ajustes, Choferes, Legajos, Proveedores,
  Liquidacion, Vendedores, NuevaFacturacion y Reportes (se cargan solo
  lazy desde raiz-routing), y AgGridModule/DragDropModule/FilterPipeModule
  (sin uso en Raiz). Fuera exports: [HomeComponent].
- Chunk de Raiz: 5,69 MB → ~0,39 MB; cada feature en su chunk. Las rutas
  de los features ya no resuelven sueltas (/listado, /usuarios, ...).
```

FIN DE LA INSTRUCCIÓN LZ2
````
