Si no ves la línea FIN DE LA INSTRUCCIÓN IE3b al final, el texto llegó cortado: leé el archivo completo.

# IE3b — Switch de los tres listados y permiso de descarga

## Contexto y razonamiento

El switch de IE3: los tres botones dejan de llamar a `ExcelService` y pasan por
`EntidadesExportService`. Es el cambio que hace visible todo lo de IE3 — la columna
Vehículos de Choferes deja de salir vacía, Proveedores gana Choferes y Vehículos, Clientes
gana Vendedores asignados, y los tres archivos salen como Tabla de Excel.

**Los tres handlers quedan como `descargarOp` de IE1b**, con el mismo patrón: aviso si el
listado filtrado quedó sin registros (una Tabla sin filas se genera, pero un archivo con el
encabezado solo no le sirve a nadie), spinner mientras genera, `Swal` de error si falla, y
el spinner se apaga ANTES de cualquier `Swal` porque el overlay lo tapa. Exportan
`xxxFiltrados`, que es lo que se ve con el filtro Visibles/Todos aplicado, y ese filtro
viaja al subtítulo del archivo (decisión D4).

**El permiso.** `AccionPermiso` gana `'descargarListado'`, que mapea a `'leer'` (exporta lo
que ya está en pantalla, no escribe), más TRES overrides
`{ demo: false, user: false }` — uno por módulo. Son tres y no uno porque la clave del
override es el `ModuloPermiso` que pasa el caller (`clientes`, `choferes`, `proveedores`):
los tres comparten el módulo `entidades` de las reglas, pero no comparten la clave. El
criterio es el de IE2c: bajar el listado completo es una tarea de administración, así que
queda en **dev y admin**. Y hay una razón técnica además de la de negocio: la columna
"Vendedores asignados" lee la colección `vendedores`, que `user` no puede leer — dejarlo
descargar le rompería la descarga con `permission-denied`.

No se toca `matrizBase`: `entidades.leer` tiene que seguir en `true` para `user` y `demo`
(ven los listados), y `mapaAccionCrud` comparte `'leer'` con `'reimprimir'` y
`'descargarTablero'`.

⚠️ **Efecto por rol, incluido uno que no es solo "demo pierde algo":** el botón de descarga
de los tres listados **no tenía ningún gating** hasta hoy — lo veían y lo usaban los cinco
roles. Después de este bloque lo ven solo `dev` y `admin`. O sea: **`user` y `demo` pierden
un botón que hasta ahora tenían**, y `manager` también (ya no tenía `entidades.leer`, así
que de hecho nunca debió verlo). Es la decisión del 19/10, pero la dejo señalada acá como
en el resto del proyecto, para que no aparezca como sorpresa en producción.

**Lo que NO cambia:** los botones "Clientes/Choferes/Proveedores Visibles" quedan tal cual,
con su `[ngClass]` de `esRol('demo')` — están fuera del alcance de este frente, igual que
quedó decidido en el frente Botones y Permisos. Tampoco cambia nada más de las tres
pantallas.

**Medido en el build** (hice el build antes y después, borrando `dist/` en los dos casos):
el chunk de `exceljs` (`887.js`, **945,76 kB en bruto / 217,91 kB transferidos**) lo pedían
las rutas `clientes`, `choferes` y `proveedores`; después de este bloque **no lo pide
ninguna de las cuatro rutas**. Sumado a IE1b (que lo sacó de `/op`), `exceljs` deja de
descargarse al entrar a cualquier pantalla: se baja recién cuando se exporta, por el
`import()` del renderer. El inicial no se mueve (1,53 MB).

**Y deja el camino viejo sin consumidores reales:** después de este bloque, `ExcelService` y
`PdfService` quedan con UN solo importador cada uno, `objeto-papelera.component.ts` (la
Papelera legado), más sus propios `.spec.ts`. Eso es exactamente lo que habilita IE4 (sacar
la exportación de la Papelera legado, decisión D1) y IE5 (borrar los dos servicios y
`pdfmake`).

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Validá TODOS los BUSCAR antes de escribir el primero. Si uno no está o está repetido,
  detenete y avisá.
- Aplicá los pasos EN ORDEN. Editá en el lugar (leé el archivo antes de escribir). LF.
- Respetá el estilo de cada archivo: `clientes-listado` usa comillas simples,
  `choferes-listado` y `proveedores-listado` usan dobles, y `proveedores-listado.component.html`
  indenta con 4 espacios. Los bloques ya vienen así.
- No toques `ExcelService` ni `PdfService`: se retiran en IE5, cuando IE4 les saque el
  último consumidor.
- No toques los botones "… Visibles" ni nada más de los tres HTML.
- No toques `matrizBase`: el cambio son `mapaAccionCrud` + tres `overrides`.
- No toques `firestore.rules`: esto es gating de UI.
- No toques CLAUDE.md ni CHANGELOG.md: van en el bloque DOC de cierre del frente.
- NO corras `npm run build`, `deploy:*` ni `node set-version.js`. Para compilar:
  `npm run build:demo` (línea base: 9 advertencias, inicial 1,53 MB).

## PASO 0 — verificación, sin modificar nada

1. `git rev-parse --abbrev-ref HEAD` → `refactor`; `git log --oneline -1` → el commit de IE3.
2. Los ocho archivos a tocar:
   - `git hash-object src/app/interfaces/permiso.ts` → `f2212dcbbb382cd0566b16ae772e51461b578acb`
   - `git hash-object src/app/servicios/permisos/permisos.service.ts` → `49a868d1411cf79a72ab28faa2d7d5c9fd833b2c`
   - `git hash-object src/app/raiz/clientes/clientes-listado/clientes-listado.component.ts` → `89cff4e6d765c056767af4ba401ee908950c19b6`
   - `git hash-object src/app/raiz/clientes/clientes-listado/clientes-listado.component.html` → `2ff990b38619f4555fb31306f52906191f20b284`
   - `git hash-object src/app/raiz/choferes/choferes-listado/choferes-listado.component.ts` → `4f4cb48480b32d611e9c0d99c665e7628c85a6bc`
   - `git hash-object src/app/raiz/choferes/choferes-listado/choferes-listado.component.html` → `301868d21306b98524c9704d71fab0162956cf40`
   - `git hash-object src/app/raiz/proveedores/proveedores-listado/proveedores-listado.component.ts` → `bc4f28cb76ce09428b89ed56f16a12b2f2284f25`
   - `git hash-object src/app/raiz/proveedores/proveedores-listado/proveedores-listado.component.html` → `506f6f89cdb6a5e60df82867098c6f2bc2af4d23`
3. Lo que dejó IE3, intacto:
   - `git hash-object src/app/shared/utils/documento-entidades.util.ts` → `be9640140970ea34c10730577d98a40c519a5b96`
   - `git hash-object src/app/servicios/entidades/entidades-export.service.ts` → `bbe5b05bac5fbef03ed9be3289aa08ea30a5e086`
4. `grep -rn "descargarListado" src/ | wc -l` → `0` (la acción no existe todavía).
5. El camino viejo, todavía conectado:
   - `grep -rn "^import { ExcelService" src/ --include=*.ts | wc -l` → `5` (los tres
     listados, `objeto-papelera` y el `.spec.ts`)
   - `grep -rn "excelServ" src/app/raiz | wc -l` → `6` (inyección y llamada en cada listado)
6. Nadie usa la fachada nueva: `grep -rn "EntidadesExportService" src/app/raiz | wc -l` → `0`.
7. Los tres HTML sin `*appPermiso`: `grep -c appPermiso` en cada uno de los tres
   `*-listado.component.html` → `0`.

## PASO 1 — src/app/interfaces/permiso.ts

BUSCAR (6 líneas):

```
  | 'cerrar'
  | 'liquidar'
  | 'descargarTablero'
  | 'limpiarTablero'
  | 'revertir'
  | 'desvincular';
```

REEMPLAZAR por (7 líneas):

```
  | 'cerrar'
  | 'liquidar'
  | 'descargarTablero'
  | 'descargarListado'
  | 'limpiarTablero'
  | 'revertir'
  | 'desvincular';
```

## PASO 2 — src/app/servicios/permisos/permisos.service.ts

BUSCAR (6 líneas):

```
    liquidar: 'crear',
    // Exporta el tablero de asignaciones (excel), no escribe.
    descargarTablero: 'leer',
    // Limpiar el tablero borra el borrador en curso — acción destructiva
    // sobre datos ya cargados, no una edición parcial.
    limpiarTablero: 'eliminar',
```

REEMPLAZAR por (9 líneas):

```
    liquidar: 'crear',
    // Exporta el tablero de asignaciones (excel), no escribe.
    descargarTablero: 'leer',
    // Exporta el listado de una entidad (Clientes/Choferes/Proveedores) a
    // Excel: lee lo que ya está en pantalla, no escribe.
    descargarListado: 'leer',
    // Limpiar el tablero borra el borrador en curso — acción destructiva
    // sobre datos ya cargados, no una edición parcial.
    limpiarTablero: 'eliminar',
```

## PASO 3 — src/app/servicios/permisos/permisos.service.ts

BUSCAR (6 líneas):

```
    // exige que conserve esta acción en su pantalla principal pese a no
    // tener 'eliminar' general en el módulo.
    'operaciones.limpiarTablero': { user: true },
  };

  puede(modulo: ModuloPermiso, accion?: AccionPermiso): boolean {
```

REEMPLAZAR por (19 líneas):

```
    // exige que conserve esta acción en su pantalla principal pese a no
    // tener 'eliminar' general en el módulo.
    'operaciones.limpiarTablero': { user: true },
    // Los tres listados de entidades (frente Informes, IE3b): 'descargarListado'
    // mapea a 'leer', y 'leer' en 'entidades' da user=true y demo=true — pero
    // bajar el listado completo de clientes, choferes o proveedores es una
    // tarea de administración, mismo criterio que la descarga del tablero de
    // operaciones (IE2c). Van tres entradas y no una porque la clave es el
    // ModuloPermiso que pasa el caller: los tres módulos comparten el módulo
    // 'entidades' de las reglas, pero no comparten la clave del override.
    // Además, la columna "Vendedores asignados" del listado de Clientes lee la
    // colección 'vendedores', que 'user' no puede leer: dejarlo descargar le
    // rompería la descarga con permission-denied.
    'clientes.descargarListado': { demo: false, user: false },
    'choferes.descargarListado': { demo: false, user: false },
    'proveedores.descargarListado': { demo: false, user: false },
  };

  puede(modulo: ModuloPermiso, accion?: AccionPermiso): boolean {
```

## PASO 4 — src/app/raiz/clientes/clientes-listado/clientes-listado.component.ts

BUSCAR (7 líneas):

```
import Swal from 'sweetalert2';
import { ClienteAltaComponent } from '../cliente-alta/cliente-alta.component';
import { BajaObjetoComponent } from 'src/app/shared/modales/baja-objeto/baja-objeto.component';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { VisibilidadListadosComponent } from 'src/app/shared/modales/visibilidad-listados/visibilidad-listados.component';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import { FichaEntidadService } from 'src/app/servicios/ficha-entidad/ficha-entidad.service';
```

REEMPLAZAR por (7 líneas):

```
import Swal from 'sweetalert2';
import { ClienteAltaComponent } from '../cliente-alta/cliente-alta.component';
import { BajaObjetoComponent } from 'src/app/shared/modales/baja-objeto/baja-objeto.component';
import { EntidadesExportService } from 'src/app/servicios/entidades/entidades-export.service';
import { VisibilidadListadosComponent } from 'src/app/shared/modales/visibilidad-listados/visibilidad-listados.component';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import { FichaEntidadService } from 'src/app/servicios/ficha-entidad/ficha-entidad.service';
```

## PASO 5 — src/app/raiz/clientes/clientes-listado/clientes-listado.component.ts

BUSCAR (6 líneas):

```
  constructor(
    private modalService: NgbModal,
    private excelServ: ExcelService,
    private clienteService: ClienteService,
    public usuarioSesion: UsuarioSesionService,
    private fichaEntidad: FichaEntidadService,
```

REEMPLAZAR por (6 líneas):

```
  constructor(
    private modalService: NgbModal,
    private entidadesExport: EntidadesExportService,
    private clienteService: ClienteService,
    public usuarioSesion: UsuarioSesionService,
    private fichaEntidad: FichaEntidadService,
```

## PASO 6 — src/app/raiz/clientes/clientes-listado/clientes-listado.component.ts

BUSCAR (8 líneas):

```
    });
  }

  descargarClientes(){
    this.excelServ.exportarClientesTablaExcel(this.clientesFiltrados, 'Clientes')
  }

  visibilidadClientes(){
```

REEMPLAZAR por (37 líneas):

```
    });
  }

  /** Excel del listado por la fachada del camino nuevo. Exporta LO QUE SE VE:
   *  clientesFiltrados es el listado con el filtro Visibles/Todos aplicado, y ese
   *  filtro queda escrito en el subtítulo del archivo. El spinner se apaga
   *  ANTES de cualquier Swal: el overlay lo tapa. */
  async descargarClientes(): Promise<void> {
    if (this.clientesFiltrados.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No hay clientes para exportar',
        text: 'Con el filtro actual no queda ningún registro en el listado.',
      });
      return;
    }

    let error: unknown = null;
    this.isLoading = true;
    try {
      await this.entidadesExport.descargarClientes(this.clientesFiltrados, this.filtroEstado);
    } catch (e) {
      error = e;
    } finally {
      this.isLoading = false;
    }

    if (error) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo generar el listado',
        text: (error as Error)?.message ?? String(error),
      });
    }
  }

  visibilidadClientes(){
```

## PASO 7 — src/app/raiz/clientes/clientes-listado/clientes-listado.component.html

BUSCAR (7 líneas):

```
      </app-btn-leer>
    </div>
    <div class="align-self-start mt-3 mb-1">
      <button class="btn btn-primary boton-alta" type="button" (click)="descargarClientes()">
        Descargar Clientes
      </button>
    </div>
```

REEMPLAZAR por (7 líneas):

```
      </app-btn-leer>
    </div>
    <div class="align-self-start mt-3 mb-1">
      <button *appPermiso="'clientes.descargarListado'" class="btn btn-primary boton-alta" type="button" (click)="descargarClientes()">
        Descargar Clientes
      </button>
    </div>
```

## PASO 8 — src/app/raiz/choferes/choferes-listado/choferes-listado.component.ts

BUSCAR (7 líneas):

```
import Swal from "sweetalert2";
import { ChoferesAltaComponent } from "../choferes-alta/choferes-alta.component";
import { BajaObjetoComponent } from "src/app/shared/modales/baja-objeto/baja-objeto.component";
import { ExcelService } from "src/app/servicios/informes/excel/excel.service";
import { VisibilidadListadosComponent } from "src/app/shared/modales/visibilidad-listados/visibilidad-listados.component";
import { ChoferService } from "src/app/servicios/choferes/chofer.service";
import { ProveedorService } from "src/app/servicios/proveedores/proveedor.service";
```

REEMPLAZAR por (7 líneas):

```
import Swal from "sweetalert2";
import { ChoferesAltaComponent } from "../choferes-alta/choferes-alta.component";
import { BajaObjetoComponent } from "src/app/shared/modales/baja-objeto/baja-objeto.component";
import { EntidadesExportService } from "src/app/servicios/entidades/entidades-export.service";
import { VisibilidadListadosComponent } from "src/app/shared/modales/visibilidad-listados/visibilidad-listados.component";
import { ChoferService } from "src/app/servicios/choferes/chofer.service";
import { ProveedorService } from "src/app/servicios/proveedores/proveedor.service";
```

## PASO 9 — src/app/raiz/choferes/choferes-listado/choferes-listado.component.ts

BUSCAR (6 líneas):

```
  constructor(
    private modalService: NgbModal,
    private excelServ: ExcelService,
    private choferService: ChoferService,
    private proveedorService: ProveedorService,
    public usuarioSesion: UsuarioSesionService,
```

REEMPLAZAR por (6 líneas):

```
  constructor(
    private modalService: NgbModal,
    private entidadesExport: EntidadesExportService,
    private choferService: ChoferService,
    private proveedorService: ProveedorService,
    public usuarioSesion: UsuarioSesionService,
```

## PASO 10 — src/app/raiz/choferes/choferes-listado/choferes-listado.component.ts

BUSCAR (8 líneas):

```
    this.destroy$.complete();
  }

  descargarChoferes() {
    this.excelServ.exportarChoferesTablaExcel(this.choferesFiltrados);
  }

  visibilidadChoferes() {
```

REEMPLAZAR por (37 líneas):

```
    this.destroy$.complete();
  }

  /** Excel del listado por la fachada del camino nuevo. Exporta LO QUE SE VE:
   *  choferesFiltrados es el listado con el filtro Visibles/Todos aplicado, y ese
   *  filtro queda escrito en el subtítulo del archivo. El spinner se apaga
   *  ANTES de cualquier Swal: el overlay lo tapa. */
  async descargarChoferes(): Promise<void> {
    if (this.choferesFiltrados.length === 0) {
      Swal.fire({
        icon: "info",
        title: "No hay choferes para exportar",
        text: "Con el filtro actual no queda ningún registro en el listado.",
      });
      return;
    }

    let error: unknown = null;
    this.isLoading = true;
    try {
      await this.entidadesExport.descargarChoferes(this.choferesFiltrados, this.filtroEstado);
    } catch (e) {
      error = e;
    } finally {
      this.isLoading = false;
    }

    if (error) {
      Swal.fire({
        icon: "error",
        title: "No se pudo generar el listado",
        text: (error as Error)?.message ?? String(error),
      });
    }
  }

  visibilidadChoferes() {
```

## PASO 11 — src/app/raiz/choferes/choferes-listado/choferes-listado.component.html

BUSCAR (7 líneas):

```
      </app-btn-leer>
    </div>
    <div class="align-self-start mt-3 mb-1">
      <button class="btn btn-primary boton-alta" type="button" (click)="descargarChoferes()">
        Descargar Choferes
      </button>
    </div>
```

REEMPLAZAR por (7 líneas):

```
      </app-btn-leer>
    </div>
    <div class="align-self-start mt-3 mb-1">
      <button *appPermiso="'choferes.descargarListado'" class="btn btn-primary boton-alta" type="button" (click)="descargarChoferes()">
        Descargar Choferes
      </button>
    </div>
```

## PASO 12 — src/app/raiz/proveedores/proveedores-listado/proveedores-listado.component.ts

BUSCAR (7 líneas):

```
import Swal from "sweetalert2";
import { ProveedoresAltaComponent } from "../proveedores-alta/proveedores-alta.component";
import { BajaObjetoComponent } from "src/app/shared/modales/baja-objeto/baja-objeto.component";
import { ExcelService } from "src/app/servicios/informes/excel/excel.service";
import { VisibilidadListadosComponent } from "src/app/shared/modales/visibilidad-listados/visibilidad-listados.component";
import { DbFirestoreService } from "src/app/servicios/database/db-firestore.service";
import { ProveedorService } from "src/app/servicios/proveedores/proveedor.service";
```

REEMPLAZAR por (7 líneas):

```
import Swal from "sweetalert2";
import { ProveedoresAltaComponent } from "../proveedores-alta/proveedores-alta.component";
import { BajaObjetoComponent } from "src/app/shared/modales/baja-objeto/baja-objeto.component";
import { EntidadesExportService } from "src/app/servicios/entidades/entidades-export.service";
import { VisibilidadListadosComponent } from "src/app/shared/modales/visibilidad-listados/visibilidad-listados.component";
import { DbFirestoreService } from "src/app/servicios/database/db-firestore.service";
import { ProveedorService } from "src/app/servicios/proveedores/proveedor.service";
```

## PASO 13 — src/app/raiz/proveedores/proveedores-listado/proveedores-listado.component.ts

BUSCAR (6 líneas):

```
  constructor(
    private modalService: NgbModal,
    private excelServ: ExcelService,
    private dbFirestore: DbFirestoreService,
    private proveedorService: ProveedorService,
    private choferService: ChoferService,
```

REEMPLAZAR por (6 líneas):

```
  constructor(
    private modalService: NgbModal,
    private entidadesExport: EntidadesExportService,
    private dbFirestore: DbFirestoreService,
    private proveedorService: ProveedorService,
    private choferService: ChoferService,
```

## PASO 14 — src/app/raiz/proveedores/proveedores-listado/proveedores-listado.component.ts

BUSCAR (11 líneas):

```
    this.destroy$.complete();
  }

  descargarProveedores() {
    this.excelServ.exportarClientesTablaExcel(
      this.proveedoresFiltrados,
      "Proveedores",
    );
  }

  visibilidadProveedores() {
```

REEMPLAZAR por (37 líneas):

```
    this.destroy$.complete();
  }

  /** Excel del listado por la fachada del camino nuevo. Exporta LO QUE SE VE:
   *  proveedoresFiltrados es el listado con el filtro Visibles/Todos aplicado, y ese
   *  filtro queda escrito en el subtítulo del archivo. El spinner se apaga
   *  ANTES de cualquier Swal: el overlay lo tapa. */
  async descargarProveedores(): Promise<void> {
    if (this.proveedoresFiltrados.length === 0) {
      Swal.fire({
        icon: "info",
        title: "No hay proveedores para exportar",
        text: "Con el filtro actual no queda ningún registro en el listado.",
      });
      return;
    }

    let error: unknown = null;
    this.isLoading = true;
    try {
      await this.entidadesExport.descargarProveedores(this.proveedoresFiltrados, this.filtroEstado);
    } catch (e) {
      error = e;
    } finally {
      this.isLoading = false;
    }

    if (error) {
      Swal.fire({
        icon: "error",
        title: "No se pudo generar el listado",
        text: (error as Error)?.message ?? String(error),
      });
    }
  }

  visibilidadProveedores() {
```

## PASO 15 — src/app/raiz/proveedores/proveedores-listado/proveedores-listado.component.html

BUSCAR (6 líneas):

```
        </div>
        <div class="align-self-start mt-3 mb-1">
            <button
                class="btn btn-primary boton-alta"
                type="button"
                (click)="descargarProveedores()"
```

REEMPLAZAR por (7 líneas):

```
        </div>
        <div class="align-self-start mt-3 mb-1">
            <button
                *appPermiso="'proveedores.descargarListado'"
                class="btn btn-primary boton-alta"
                type="button"
                (click)="descargarProveedores()"
```

## Verificación

1. Hashes resultantes:
   - `git hash-object src/app/interfaces/permiso.ts` → `7db2a8b4a4bb37c927bcbc1ab5b725a4813ec42d`
   - `git hash-object src/app/servicios/permisos/permisos.service.ts` → `0d457cd6af3e30682d20a5c6c7a297829c29af78`
   - `git hash-object src/app/raiz/clientes/clientes-listado/clientes-listado.component.ts` → `12e74f8083f3e11cf346869790fd99f0e59fab94`
   - `git hash-object src/app/raiz/clientes/clientes-listado/clientes-listado.component.html` → `df12d5ae1479f5ca57d322483e908a145ff1efb2`
   - `git hash-object src/app/raiz/choferes/choferes-listado/choferes-listado.component.ts` → `327f83af78bc2100a583e6c3e4c146a4d839ae52`
   - `git hash-object src/app/raiz/choferes/choferes-listado/choferes-listado.component.html` → `460603303d59ac30136f31c517ef79bce660e79d`
   - `git hash-object src/app/raiz/proveedores/proveedores-listado/proveedores-listado.component.ts` → `ad22cc3291d3c61a4f9894a3df4bf237343dee3b`
   - `git hash-object src/app/raiz/proveedores/proveedores-listado/proveedores-listado.component.html` → `f8ff74124b07a4265cb373e1dd622fa414328c7d`
2. `git diff --numstat` → exactamente estas ocho líneas (en cualquier orden):
   ```
   1	0	src/app/interfaces/permiso.ts
   1	1	src/app/raiz/choferes/choferes-listado/choferes-listado.component.html
   33	4	src/app/raiz/choferes/choferes-listado/choferes-listado.component.ts
   1	1	src/app/raiz/clientes/clientes-listado/clientes-listado.component.html
   33	4	src/app/raiz/clientes/clientes-listado/clientes-listado.component.ts
   1	0	src/app/raiz/proveedores/proveedores-listado/proveedores-listado.component.html
   33	7	src/app/raiz/proveedores/proveedores-listado/proveedores-listado.component.ts
   16	0	src/app/servicios/permisos/permisos.service.ts
   ```
3. El switch quedó completo:
   - `grep -rn "excelServ" src/app/raiz | wc -l` → `0`
   - `grep -rn "EntidadesExportService" src/app/raiz | wc -l` → `6` (import e inyección en
     cada uno de los tres listados)
   - `grep -rn "^import { ExcelService" src/ --include=*.ts | cut -d: -f1` → solo DOS
     archivos: `objeto-papelera.component.ts` y `excel.service.spec.ts`
4. El permiso:
   - `grep -c "descargarListado" src/app/interfaces/permiso.ts` → `1`
   - `grep -c "descargarListado: 'leer'," src/app/servicios/permisos/permisos.service.ts` → `1`
   - `grep -c "descargarListado': { demo: false, user: false }," src/app/servicios/permisos/permisos.service.ts`
     → `3` (clientes, choferes y proveedores)
   - `grep -c appPermiso` en cada uno de los tres `*-listado.component.html` → `1`
5. Los tres handlers son async y tienen el guard:
   `grep -c "async descargar" ` en cada `*-listado.component.ts` → `1`, y
   `grep -c "length === 0"` en cada uno → `1`.
6. `npx tsc -p tsconfig.app.json --noEmit` → sin errores.
7. `npx tsc -p tsconfig.app.json --noEmit --noUnusedLocals` → solo el error preexistente de
   `appVersion` en `app.component.ts`.
8. `npm run build:demo` → OK, 9 advertencias, inicial 1,53 MB.
9. **El objetivo del bloque, medido en el build.** Borrá `dist/` antes de compilar. Después:
   - `grep -l "exceljs" dist/ap-log/*.js` → UN solo archivo: el chunk de `exceljs`. Anotá su
     número (en mi copia, `887.js`; los ids cambian de build en build).
   - Buscá el chunk del shell (el único que contiene `path:"clientes"`) y listá los ids que
     piden las rutas `op`, `clientes`, `choferes` y `proveedores`, con la forma
     `path:"clientes",loadChildren:()=>Promise.all([t.e(728),…])`.
   - **El id del chunk de `exceljs` no tiene que estar en NINGUNA de las cuatro listas.**
   Mi medición, para comparar: ANTES de este bloque `clientes` pedía
   `[728, 824, 27, `**`887`**`, 604, 310, 22, 225]`, `choferes`
   `[728, 824, 27, `**`887`**`, 775, 604, 5, 22, 117]` y `proveedores`
   `[728, 824, 27, `**`887`**`, 775, 604, 663, 22, 238]`; DESPUÉS ninguna lo pide
   (`clientes` → `[164, 490, 27, 604, 310, 934, 225]`, y `op` sigue sin él desde IE1b).
   Pegame las cuatro listas en el reporte.

## Pruebas manuales en demo (las hago yo)

Con rol **dev** o **admin**, en Clientes → Listado, Choferes → Listado y Proveedores →
Listado:

1. **El archivo nuevo:** "Descargar" baja `Clientes_<hoy>.xlsx` /
   `Choferes_<hoy>.xlsx` / `Proveedores_<hoy>.xlsx` con logo, título, el subtítulo con la
   cantidad de registros y el filtro, y la tabla con botón de filtro en cada columna.
2. **Choferes — la columna que estaba rota:** los choferes directos tienen que mostrar sus
   vehículos (dominio, marca, modelo y categoría, uno por renglón). Un chofer de proveedor
   tiene que quedar con la celda VACÍA, y sus vehículos tienen que aparecer en el listado de
   Proveedores.
3. **Proveedores:** las dos columnas nuevas, Choferes y Vehículos, con un renglón por
   elemento. Un proveedor sin choferes ni vehículos deja las dos celdas vacías.
4. **Clientes:** la columna Vendedores asignados con `Apellido, Nombre (35%)`. Probá primero
   SIN entrar a Vendedores en esa sesión (ahí se usa la lectura puntual) y después entrando
   primero a Vendedores (ahí ya está en memoria): el resultado tiene que ser el mismo. Si
   algún cliente tiene asignado un vendedor desactivado, esa línea dice
   `Sin resolver (x%)`.
5. **Fecha de Nacimiento (Choferes):** tiene que ser una FECHA en Excel (se puede ordenar y
   filtrar como fecha, y la celda se alinea a la derecha), no texto.
6. **Filtro Visibles/Todos:** cambiar el filtro y descargar de nuevo; el archivo tiene que
   traer solo esas filas y el subtítulo tiene que decir cuál filtro estaba puesto.
7. **Listado vacío:** filtrá hasta que no quede ninguna fila (o usá un listado sin
   registros visibles) → aviso "No hay … para exportar", sin descarga.
8. **Permisos:** con **`user`** y con **`demo`**, el botón "Descargar" de los tres listados
   **ya no se ve** (sí siguen viendo el listado y el botón de Visibles).
9. **Red:** con la pestaña de red abierta, al ENTRAR a Clientes / Choferes / Proveedores ya
   no tiene que descargarse el chunk de ~945 kB (`exceljs`); tiene que bajarse recién al
   apretar "Descargar".
10. **Que no se rompió nada más:** el alta, la edición, la baja, la ficha (el ojo) y el
    modal de Visibles de los tres listados siguen funcionando igual.

## Mensaje de commit

```
IE3b (informes): switch de los tres listados al camino nuevo y permiso de descarga

- clientes-listado, choferes-listado y proveedores-listado dejan de inyectar
  ExcelService y pasan por EntidadesExportService. Los tres handlers quedan
  como descargarOp (IE1b): async, aviso si el listado filtrado no tiene
  registros, spinner mientras genera y Swal de error; el spinner se apaga antes
  del Swal (el overlay lo tapa). Exportan xxxFiltrados (lo que se ve) y el
  filtro Visibles/Todos viaja al subtitulo del archivo.
- Con esto se ven los arreglos de IE3: la columna Vehiculos de Choferes deja de
  salir vacia, Proveedores gana Choferes y Vehiculos, Clientes gana Vendedores
  asignados, y los tres archivos salen como Tabla de Excel.
- AccionPermiso gana 'descargarListado' → 'leer', con tres overrides
  { demo: false, user: false } (uno por modulo: la clave del override es el
  ModuloPermiso del caller, aunque los tres compartan 'entidades' en las
  reglas). Queda en dev/admin, mismo criterio que IE2c; ademas, la columna de
  vendedores lee la coleccion 'vendedores', que user no puede leer.
- Efecto por rol: el boton de descarga no tenia ningun gating, lo veian los
  cinco roles. Ahora lo ven solo dev y admin: user, demo y manager lo pierden.
- Medido en el build: exceljs (945,76 kB / 217,91 kB transferidos) ya no lo
  pide ninguna de las cuatro rutas (clientes, choferes, proveedores y op). Se
  descarga recien al exportar, por el import() del renderer.
- ExcelService y PdfService quedan con un solo importador real cada uno
  (objeto-papelera, la Papelera legado): es lo que habilita IE4 y IE5.
```

FIN DE LA INSTRUCCIÓN IE3b
