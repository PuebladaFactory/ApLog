Si no ves la línea FIN DE LA INSTRUCCIÓN IE1b al final, el texto llegó cortado: leé el archivo completo.

# IE1b — Switch del informe de operaciones al camino nuevo (+ permiso)

## Contexto y razonamiento

Tercer bloque del frente. IE1 dejó construido el camino nuevo al lado del viejo; este
bloque hace el **switch del botón "Descargar Op"** del tablero de operaciones y nada más.
Es el cambio chico y reversible: si algo sale mal, se vuelve a la línea anterior de
`descargarOp()`.

Qué cambia:

1. **`tablero-op` deja de inyectar `ExcelService` y pasa a inyectar
   `OperacionesExportService`.** Con eso el módulo de Operaciones deja de importar el
   servicio viejo, que es lo que arrastra `exceljs` con import ESTÁTICO: `exceljs`
   (945,76 kB en bruto / 217,91 kB transferidos) **deja de descargarse al entrar a
   `/op`**. El renderer nuevo lo carga con `import()`, recién al exportar.
2. **El informe exporta LO QUE SE VE** (decisión D5): `operacionesVista` son las filas con
   los filtros aplicados y en el orden de la pantalla. Antes pasaba `operacionesPeriodo`,
   es decir TODO el rango de fechas, ignorando cliente, chofer, los filtros por columna y
   la búsqueda global. Los filtros activos se escriben en el subtítulo del archivo, así el
   Excel se explica solo.
3. **`descargarOp()` pasa a ser `async`**, porque el renderer carga `exceljs` con
   `import()` y escribe el archivo. Suma tres cosas que el método viejo no tenía: aviso si
   no quedó ninguna fila con los filtros actuales (antes bajaba un archivo con la tabla
   vacía), spinner mientras genera, y Swal de error si falla. **El spinner se apaga ANTES
   de cualquier Swal**: el overlay tapa el Swal (lección ya documentada en CLAUDE.md del
   frente Excel/PDF de liquidación).
4. **El botón gana `*appPermiso="'operaciones.descargarTablero'"`** → visible para dev,
   admin y user; no para demo ni manager. No hace falta tocar `PermisosService`:
   `descargarTablero` ya mapea a `'leer'` y ya tiene el override
   `'operaciones.descargarTablero': { demo: false }` (del Bloque 7 del frente Botones y
   Permisos); `operaciones.leer` es dev/admin/user/demo y `manager` está denegado en todos
   los módulos. La directiva ya se usa en este mismo módulo (`tablero-asignaciones`), así
   que no hay nada que declarar ni importar.

Dos correcciones de deslices míos de IE1, que no cambian comportamiento:

5. El JSDoc de `OperacionesExportService` decía "son 20 columnas" cuando el informe quedó
   con 22 (las dos columnas Extra). Se corrige el número.
6. (No es un paso de código.) La verificación 4 de IE1 pedía que
   `grep -rn "generarInformeOperaciones" src/ | wc -l` diera 2 y dio 3, porque matcheaba un
   comentario que la propia instrucción agrega — justo lo que mis reglas dicen evitar. En
   este bloque el grep es `grep -rn "\.generarInformeOperaciones(" src/`, que matchea la
   llamada y no los comentarios.

Qué NO hace este bloque: no borra `ExcelService.generarInformeOperaciones`. Queda sin
ningún consumidor (código muerto) hasta el bloque de retiro (IE5), a propósito: mientras
el método siga ahí, volver atrás es cambiar una línea. El resto de `ExcelService` sigue
sirviendo a los tres listados.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Validá TODOS los BUSCAR antes de escribir el primero. Si uno no está o está repetido,
  detenete y avisá.
- Aplicá los pasos EN ORDEN. Editá en el lugar (leé el archivo antes de escribir). LF.
- No toques CLAUDE.md ni CHANGELOG.md: van en el bloque DOC de cierre del frente.
- No toques `ExcelService` ni `PdfService`.
- NO corras `npm run build`, `deploy:*` ni `node set-version.js`. Para compilar:
  `npm run build:demo` (línea base: 9 advertencias, inicial 1,53 MB).
- npm con `--legacy-peer-deps` (en este bloque no hace falta instalar nada).

## PASO 0 — verificación, sin modificar nada

Corré esto y mostrame la salida. Si algo no coincide, detenete y avisá:

1. `git rev-parse --abbrev-ref HEAD` → `refactor`.
2. Los tres archivos a tocar, como los dejó IE1:
   - `git hash-object src/app/raiz/operaciones/tablero-op/tablero-op.component.ts` → `f477ddcc448f7e7cb424d86c93adb4a66aefcba7`
   - `git hash-object src/app/raiz/operaciones/tablero-op/tablero-op.component.html` → `2e0774fb46c861e4c60df9671baad5464c873979`
   - `git hash-object src/app/servicios/operaciones/operaciones-export.service.ts` → `ea4321308ebb007c49c4990a13ae397815bfcb04`
3. `grep -rn "\.generarInformeOperaciones(" src/ | wc -l` → `1` (el caller en `tablero-op`,
   todavía sin tocar).
4. `grep -c "appPermiso" src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.html`
   → tiene que dar `8` o más: confirma que la directiva ya se usa en este módulo.

## PASO 1 — src/app/raiz/operaciones/tablero-op/tablero-op.component.ts

BUSCAR (1 línea):

```
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
```

REEMPLAZAR por (1 línea):

```
import { OperacionesExportService } from 'src/app/servicios/operaciones/operaciones-export.service';
```

## PASO 2 — src/app/raiz/operaciones/tablero-op/tablero-op.component.ts

BUSCAR (3 líneas):

```
    private formatoNum: FormatoNumericoService,
    private excelServ: ExcelService,
  ) {}
```

REEMPLAZAR por (3 líneas):

```
    private formatoNum: FormatoNumericoService,
    private operacionesExport: OperacionesExportService,
  ) {}
```

## PASO 3 — src/app/raiz/operaciones/tablero-op/tablero-op.component.ts

BUSCAR (3 líneas):

```
  descargarOp(){
    this.excelServ.generarInformeOperaciones(this.fechaDesde, this.fechaHasta,this.operacionesPeriodo)
  }
```

REEMPLAZAR por (61 líneas):

```
  /** Informe Excel del tablero, por la fachada del camino nuevo. Exporta LO QUE
   *  SE VE: operacionesVista son las filas con los filtros aplicados y en el
   *  orden de la pantalla (antes bajaba operacionesPeriodo, todo el rango, sin
   *  filtros). El spinner se apaga ANTES de cualquier Swal: el overlay lo tapa. */
  async descargarOp(): Promise<void> {
    if (this.operacionesVista.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No hay operaciones para exportar',
        text: 'Con los filtros actuales no queda ninguna operación en el tablero.',
      });
      return;
    }

    let error: unknown = null;
    this.isLoading = true;
    try {
      await this.operacionesExport.descargar({
        desde: this.fechaDesde,
        hasta: this.fechaHasta,
        operaciones: this.operacionesVista.map(r => r._raw),
        filtros: this.descripcionFiltros(),
      });
    } catch (e) {
      error = e;
    } finally {
      this.isLoading = false;
    }

    if (error) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo generar el informe',
        text: (error as Error)?.message ?? String(error),
      });
    }
  }

  /** Filtros activos en texto, para el subtítulo del archivo. El nombre de la
   *  entidad sale de las filas visibles (los dropdowns se reconstruyen según el
   *  filtro principal y pueden no tener el id buscado). */
  private descripcionFiltros(): string[] {
    const textos: string[] = [];

    if (this.filtros.clienteId) {
      const fila = this.operacionesVista.find(r => r.idCliente === this.filtros.clienteId);
      textos.push(`Cliente: ${fila?.cliente ?? this.filtros.clienteId}`);
    }
    if (this.filtros.choferId) {
      const fila = this.operacionesVista.find(r => r.idChofer === this.filtros.choferId);
      textos.push(`Chofer: ${fila?.chofer ?? this.filtros.choferId}`);
    }
    for (const [col, valor] of Object.entries(this.filtros.columnas)) {
      if (valor) textos.push(`${this.headerLabel(col)}: "${valor}"`);
    }
    if (this.filtros.textoGlobal) {
      textos.push(`Búsqueda: "${this.filtros.textoGlobal}"`);
    }

    return textos;
  }
```

## PASO 4 — src/app/raiz/operaciones/tablero-op/tablero-op.component.html

BUSCAR (1 línea):

```
            <button  class="btn btn-primary boton-alta" type="button" id="" (click)="descargarOp()">
```

REEMPLAZAR por (1 línea):

```
            <button *appPermiso="'operaciones.descargarTablero'" class="btn btn-primary boton-alta" type="button" id="" (click)="descargarOp()">
```

## PASO 5 — src/app/servicios/operaciones/operaciones-export.service.ts

BUSCAR (1 línea):

```
 *  Solo Excel: son 20 columnas, no entran legibles en un PDF (decisión D5 del
```

REEMPLAZAR por (1 línea):

```
 *  Solo Excel: son 22 columnas, no entran legibles en un PDF (decisión D5 del
```

## Verificación

1. Hashes resultantes:
   - `git hash-object src/app/raiz/operaciones/tablero-op/tablero-op.component.ts` → `3ad7419dcc02823261360098ef771068c0c71731`
   - `git hash-object src/app/raiz/operaciones/tablero-op/tablero-op.component.html` → `7830f2e4f09c932ee0244737899935332c78c86c`
   - `git hash-object src/app/servicios/operaciones/operaciones-export.service.ts` → `1991798909dad1c9bf6ca65b7e8a8bb9651c1fad`
2. `git diff --numstat` → exactamente estas tres líneas (en cualquier orden):
   ```
   1	1	src/app/raiz/operaciones/tablero-op/tablero-op.component.html
   62	4	src/app/raiz/operaciones/tablero-op/tablero-op.component.ts
   1	1	src/app/servicios/operaciones/operaciones-export.service.ts
   ```
3. `grep -rn "\.generarInformeOperaciones(" src/ | wc -l` → `0` (el método viejo queda sin
   ningún caller; se borra en IE5).
4. `grep -c "ExcelService\|excelServ" src/app/raiz/operaciones/tablero-op/tablero-op.component.ts`
   → `0`.
5. `npx tsc -p tsconfig.app.json --noEmit` → sin errores.
6. `npx tsc -p tsconfig.app.json --noEmit --noUnusedLocals` → solo el error preexistente de
   `appVersion` en `app.component.ts`.
7. `npm run build:demo` → OK, 9 advertencias, inicial 1,53 MB.
8. **El objetivo del bloque, medido en el build.** Borrá `dist/` antes de compilar (para
   que no queden chunks de builds anteriores). Después:
   - `grep -l "exceljs" dist/ap-log/*.js` → tiene que dar UN solo archivo: el chunk de
     `exceljs`. Anotá su número (en mi copia fue `887.js`; los ids cambian de build en
     build, no los tomes como fijos).
   - Buscá el chunk del shell: el único que contiene el texto `path:"op"` (en mi copia,
     `49.js`). Ahí cada ruta lazy declara los chunks que pide, con la forma
     `path:"op",loadChildren:()=>Promise.all([t.e(728),t.e(474),…])`. Listá los ids de
     `op`, `clientes`, `choferes` y `proveedores`.
   - **El id del chunk de `exceljs` NO tiene que estar en la lista de `op`**, y SÍ tiene
     que seguir estando en las de `clientes`, `choferes` y `proveedores` (que todavía
     inyectan `ExcelService`).
   Mi medición sobre la copia limpia, para comparar: ANTES de este bloque `/op` pedía
   `[728, 474, 824, 887, 150, 649, 316, 169, 76, 580]` (con el 887) y DESPUÉS pide
   `[728, 474, 824, 150, 437, 316, 514, 76, 901]` (sin el 887). Son 945,76 kB en bruto /
   217,91 kB transferidos que dejan de descargarse al entrar al tablero.
   Pegame las cuatro listas en el reporte.

## Pruebas manuales en demo (las hago yo)

Con rol dev o admin, en Operaciones → Tablero de operaciones:

1. **Sin filtros:** "Descargar Op" baja `Operaciones_<desde>_<hasta>.xlsx` con todas las
   operaciones del rango. En el subtítulo: "Desde … hasta … · N operación(es)", sin línea
   de "Filtros:".
2. **Con filtros:** filtrar por cliente, por chofer, por alguna columna y con la búsqueda
   global; el archivo tiene que traer SOLO esas filas, en el mismo orden que la pantalla
   (incluido el orden por encabezado), y el subtítulo tiene que listar los filtros
   aplicados.
3. **Sin resultados:** filtrar hasta que no quede ninguna fila → aviso "No hay operaciones
   para exportar", sin descarga.
4. **Spinner:** mientras genera se ve el spinner y se apaga al terminar.
5. **Red:** con la pestaña de red abierta, al ENTRAR a `/op` ya no tiene que descargarse el
   chunk de ~945 kB (`exceljs`); tiene que descargarse recién al apretar "Descargar Op".
6. **Permiso:** con un usuario `demo` el botón "Descargar Op" no tiene que verse (con
   `user`, sí).

## Mensaje de commit

```
IE1b (informes): switch del informe de operaciones al camino nuevo

- tablero-op: descargarOp() pasa por OperacionesExportService (camino nuevo) y
  exporta LO QUE SE VE (operacionesVista: filas filtradas, en el orden de la
  pantalla) en vez de todo el rango. Ahora es async, con aviso si no quedan
  filas, spinner mientras genera y Swal de error; el spinner se apaga antes del
  Swal (el overlay lo tapa). descripcionFiltros() escribe los filtros activos en
  el subtitulo del archivo.
- tablero-op deja de inyectar ExcelService: exceljs (945,76 kB) ya no se
  descarga al entrar a /op, solo al exportar (import() del renderer nuevo).
- El boton gana *appPermiso="'operaciones.descargarTablero'" (dev/admin/user;
  demo y manager no). Sin cambios en PermisosService: la accion y su override
  ya existian.
- ExcelService.generarInformeOperaciones queda sin consumidor; se borra en el
  bloque de retiro (IE5).
- Corregido el JSDoc de OperacionesExportService: son 22 columnas, no 20.
```

FIN DE LA INSTRUCCIÓN IE1b
