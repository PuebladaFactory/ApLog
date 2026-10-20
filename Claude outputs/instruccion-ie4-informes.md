Si no ves la línea FIN DE LA INSTRUCCIÓN IE4 al final, el texto llegó cortado: leé el archivo completo.

# IE4 — Los dos botones muertos: Papelera legado y tablero de asignaciones

## Contexto y razonamiento

Este bloque saca los dos únicos consumidores que le quedaban al camino viejo. Después de
IE4, `ExcelService` y `PdfService` **no los importa ningún archivo de la app**: solo sus
propios `.spec.ts`. Eso es lo que IE5 necesita para borrarlos.

**1. Papelera legado, decisión D1.** El modal `objeto-papelera` tiene una columna
"Reimpresión" con dos botones (excel y pdf) que llaman a `exportToExcelInforme` /
`exportToPdfInforme`. Se retiran, y el modal queda.

Por qué retirarlos y no migrarlos:
- **Están rotos** (hallazgo 2 del relevamiento). Los dos pasan `this.$clientes` y
  `this.$choferes`, que vienen de `StorageService.clientes$` / `choferes$` — y esos
  observables **siempre emiten `[]`**: nadie escribe esas claves de `localStorage` y
  `clearAllLocalStorage()` las borra en cada login. Está documentado en CLAUDE.md como
  deuda del frente Ajustes.
- Son del **modelo de datos viejo** (`InformeLiq`, `facturaCliente`, `facOpLiqCliente`),
  que desaparece con la migración de Vantruck. Migrarlos sería reescribir un documento que
  solo aplica a datos que se van.
- El método `reimprimirFac` tiene además 45 líneas comentadas (el `switch` por tipo de
  factura que nunca se activó). Se va entero, comentario incluido.

Con el método se van tres inyecciones que quedan sin uso: `ExcelService`, `PdfService` y
`LogService` — este último porque su único uso en el componente era el
`logEvent('REIMPRESION', …)` de la reimpresión. Es, de paso, el último `REIMPRESION` que
escribía el log viejo.

⚠️ **Lo que queda y NO toco, a propósito:** `arrayFacOp` se sigue cargando en `ngOnInit`
(con su `console.log`) y `$choferes` se sigue asignando, pero ya nadie los lee —
`reimprimirFac` era su único consumidor. No los saco porque están entrelazados con las
ramas por `modo` del `ngOnInit` de un componente legado de 260 líneas, y el riesgo de
tocarlo no se justifica para borrar una lectura que se va a ir completa con la Papelera
legado (frente Ajustes). Lo dejo anotado acá y en el CHANGELOG del cierre.

**2. Tablero de asignaciones, decisión D6.** El botón "⬇ Descargar" está inerte desde el
switch a `tablero-asignaciones`: `descargar()` solo abre un Swal de "Próximamente" (el
informe viejo esperaba las estructuras del modelo anterior y se borró como código muerto en
LR2c). Un botón que avisa "próximamente" es peor que no tenerlo: se va el botón, su
`*appPermiso` y el método.

El informe del tablero de asignaciones, si se quiere, es un informe NUEVO del frente de
Operaciones: no es una tabla de datos cerrada (era un LAYOUT con matriz de asignados,
colores por categoría, notas de celda y una hoja oculta de metadata), así que hay que
diseñar qué informe es. Está reconstruido desde el historial de git en el §7 del diseño
del frente, para cuando se encare.

La acción `operaciones.descargarTablero` **no se toca**: la sigue usando el botón real del
tablero de operaciones (IE1b). Después de este bloque queda con un solo consumidor en vez
de dos.

**Medido en el build** (antes y después, borrando `dist/` en los dos casos): la ruta
`ajustes` pedía tres chunks que ahora no pide más —
`887.js` (exceljs, **945,76 kB / 217,91 kB transferidos**), `107.js` (jspdf,
**355,44 kB / 97,62 kB**) y `747.js` (**30,68 kB / 8,93 kB**), los tres etiquetados
`ajustes-ajustes-module`. Son **1.331,88 kB en bruto / 324,46 kB transferidos** que dejan
de descargarse al entrar a Ajustes. Los chunks siguen existiendo: los carga el renderer
nuevo con `import()` cuando de verdad se exporta algo. El inicial no se mueve (1,53 MB).

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Validá TODOS los BUSCAR antes de escribir el primero. Si uno no está o está repetido,
  detenete y avisá.
- Aplicá los pasos EN ORDEN. Editá en el lugar (leé el archivo antes de escribir). LF.
- El PASO 3 borra un método de 59 líneas, 45 de ellas comentadas: el BUSCAR las trae
  completas para que el bloque sea verificable. No "limpies" de más: lo que queda del
  archivo no se toca.
- No toques `ExcelService` ni `PdfService` todavía: se borran en IE5, con sus `.spec.ts` y
  `npm uninstall pdfmake`.
- No toques `PermisosService` ni `permiso.ts`: `descargarTablero` sigue en uso.
- No toques nada más de `objeto-papelera` (en particular `arrayFacOp`, `$clientes`,
  `$choferes` y el `ngOnInit`) ni de `tablero-asignaciones`.
- No toques CLAUDE.md ni CHANGELOG.md: van en el bloque DOC de cierre del frente.
- NO corras `npm run build`, `deploy:*` ni `node set-version.js`. Para compilar:
  `npm run build:demo` (línea base: 9 advertencias, inicial 1,53 MB).

## PASO 0 — verificación, sin modificar nada

1. `git rev-parse --abbrev-ref HEAD` → `refactor`; `git log --oneline -1` → el commit de IE3b.
2. Los cuatro archivos a tocar:
   - `git hash-object src/app/shared/modales/objeto-papelera/objeto-papelera.component.ts` → `ba829d6469e200b86c2f8b926072f6897c71f6e0`
   - `git hash-object src/app/shared/modales/objeto-papelera/objeto-papelera.component.html` → `18cec9e5c9394bcbe48ba22b2c5c7e5e4b135977`
   - `git hash-object src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.ts` → `6b314594a2b69e2c99d3a32091c58f5cc0c20993`
   - `git hash-object src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.html` → `452e4a604e6044c96cd461e78e319cccbeeb0d8c`
3. El camino viejo, con sus dos últimos consumidores:
   `grep -rn "^import { ExcelService\|^import { PdfService" src/ --include=*.ts` → cuatro
   líneas: `objeto-papelera.component.ts` (las dos) y los dos `.spec.ts`.
4. `grep -rn "reimprimirFac" src/ | wc -l` → `3` (el método y los dos botones del HTML).
5. `grep -c "descargar()" src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.ts`
   → `1`.
6. `grep -c appPermiso src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.html`
   → `8`.
7. `grep -rn "operaciones.descargarTablero" src/ | cut -d: -f1 | sort | uniq -c` → `2` en
   `permisos.service.ts` y `1` en cada uno de los dos HTML (tablero-op y
   tablero-asignaciones).

## PASO 1 — src/app/shared/modales/objeto-papelera/objeto-papelera.component.ts

BUSCAR (5 líneas):

```
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { LogService } from 'src/app/servicios/log/log.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
```

REEMPLAZAR por (2 líneas):

```
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
```

## PASO 2 — src/app/shared/modales/objeto-papelera/objeto-papelera.component.ts

BUSCAR (1 línea):

```
  constructor(public activeModal: NgbActiveModal, private dbFirebase: DbFirestoreService, private storageService: StorageService,  private pdfServ: PdfService, private excelServ: ExcelService, private logService: LogService, private proveedorService: ProveedorService, private papeleraService: PapeleraService){}
```

REEMPLAZAR por (1 línea):

```
  constructor(public activeModal: NgbActiveModal, private dbFirebase: DbFirestoreService, private storageService: StorageService,  private proveedorService: ProveedorService, private papeleraService: PapeleraService){}
```

## PASO 3 — src/app/shared/modales/objeto-papelera/objeto-papelera.component.ts (BORRADO POR ANCLAS, no por BUSCAR)

⚠️ Este paso NO va por BUSCAR literal: **12 de las 59 líneas a borrar tienen
espacios finales invisibles** (es el archivo más viejo del lote). Un BUSCAR con espacios
finales no se puede verificar a ojo ni sobrevive con garantía a un copiar/pegar, y el
archivo resultante conserva otros espacios finales preexistentes, así que un REEMPLAZO
COMPLETO tampoco sirve. Se borra por anclas, y el hash del resultado lo confirma.

Borrá el método `reimprimirFac` COMPLETO, con sus líneas comentadas:

- **Primera línea a borrar:** la que empieza con `  reimprimirFac(formato: string) {`
  (después de los PASOS 1 y 2 sigue siendo la única aparición de `reimprimirFac` en este
  archivo; en HEAD es la línea 141).
- **Última línea a borrar:** la línea VACÍA que está justo antes de
  `    getProveedor(id: string){`. Es decir, borrás también el `    }` que cierra el
  método y la línea vacía que lo sigue.
- Son **59 líneas** en total (en HEAD, de la 141 a la 199).

Cómo queda la unión después del borrado (líneas 133 a 138 del archivo resultante; la 136
tiene dos espacios, preexistentes, NO la toques):

```
  }
  

    getProveedor(id: string){
      let proveedor:Proveedor[];
```

El archivo pasa de 260 a 198 líneas.

## PASO 4 — src/app/shared/modales/objeto-papelera/objeto-papelera.component.html

BUSCAR (15 líneas):

```
                                <label for="Nombre" class="fs-5">Cant de Op</label>
                                <div class="input-group">
                                  <input class="w-100" type="text" [value]="objeto.operaciones.length">
                                </div>
                              </div>
                            </div>
                            <div class="col">
                              <div class="form-group mb-2">
                                <label for="Reimpresión" class="fs-5">Reimpresión</label>
                                <div class="input-group  mx-auto">
                                  <app-btn-leer name="excel" type="button"  (click)="reimprimirFac('excel')" class="me-2"></app-btn-leer>
                                  <app-btn-leer name="pdf" type="button"  (click)="reimprimirFac('pdf')"></app-btn-leer>
                                </div>
                              </div>
                            </div>
```

REEMPLAZAR por (6 líneas):

```
                                <label for="Nombre" class="fs-5">Cant de Op</label>
                                <div class="input-group">
                                  <input class="w-100" type="text" [value]="objeto.operaciones.length">
                                </div>
                              </div>
                            </div>
```

## PASO 5 — src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.ts

BUSCAR (13 líneas):

```
    this.itemsBorrador = [];
    this.borradorSucio = false;
    this.asignacionService.limpiarBorradorEnCurso();
  }

  // El informe Excel debe reescribirse para AsignacionItem[] (modelo nuevo).
  // TODO: cierre de módulo — reescribir informe Excel para el modelo nuevo.
  descargar(): void {
    Swal.fire({ icon: 'info', title: 'Próximamente',
      text: 'La descarga de informes estará disponible próximamente.' });
  }

  // ---------------------------------------------------------------------------
```

REEMPLAZAR por (6 líneas):

```
    this.itemsBorrador = [];
    this.borradorSucio = false;
    this.asignacionService.limpiarBorradorEnCurso();
  }

  // ---------------------------------------------------------------------------
```

## PASO 6 — src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.html

BUSCAR (21 líneas):

```
                    </button>
                </ng-container>
            }

            <ng-container *appPermiso="'operaciones.descargarTablero'">
                <button
                    class="btn botonera boton-descargar"
                    (click)="descargar()"
                    [disabled]="!tablero"
                    title="{{
                        tablero
                            ? 'Descargar informe'
                            : 'Debe cargar un tablero antes de descargar'
                    }}"
                >
                    ⬇ Descargar
                </button>
            </ng-container>

            @if (modo === "edicion") {
                <ng-container *appPermiso="'operaciones.limpiarTablero'">
```

REEMPLAZAR por (6 líneas):

```
                    </button>
                </ng-container>
            }

            @if (modo === "edicion") {
                <ng-container *appPermiso="'operaciones.limpiarTablero'">
```

## Verificación

1. Hashes resultantes:
   - `git hash-object src/app/shared/modales/objeto-papelera/objeto-papelera.component.ts` → `a549e845e54cd8913a59c7986dea49af5dbf7267`
   - `git hash-object src/app/shared/modales/objeto-papelera/objeto-papelera.component.html` → `0db2dcf8baea106ab13593c4e6069eb91d362cb2`
   - `git hash-object src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.ts` → `91d48f8a68b94120f576bbb64359fbf9ef9434ad`
   - `git hash-object src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.html` → `d0579e673ea421f3113c690d6dcd5be466e9f5a5`
2. `git diff --numstat` → exactamente estas cuatro líneas (en cualquier orden):
   ```
   0	15	src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.html
   0	7	src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.ts
   0	9	src/app/shared/modales/objeto-papelera/objeto-papelera.component.html
   1	63	src/app/shared/modales/objeto-papelera/objeto-papelera.component.ts
   ```
3. **El resultado del bloque:**
   `grep -rn "^import { ExcelService\|^import { PdfService" src/ --include=*.ts` → solo las
   dos líneas de los `.spec.ts`. Ningún archivo de la app los importa.
4. `grep -rn "reimprimirFac" src/ | wc -l` → `0`.
5. `grep -rn "LogService" src/app/shared/modales/objeto-papelera/objeto-papelera.component.ts | wc -l`
   → `0`.
6. El botón inerte se fue y el resto del tablero no:
   - `grep -c "descargar()" src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.ts` → `0`
   - `grep -c appPermiso src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.html` → `7`
   - `grep -c "Próximamente" src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.ts` → `0`
7. La acción del permiso sigue viva con un solo consumidor:
   `grep -rn "operaciones.descargarTablero" src/ | cut -d: -f1 | sort | uniq -c` → `2` en
   `permisos.service.ts` y `1` en `tablero-op.component.html`. Nada más.
8. `npx tsc -p tsconfig.app.json --noEmit` → sin errores.
9. `npx tsc -p tsconfig.app.json --noEmit --noUnusedLocals` → solo el error preexistente de
   `appVersion` en `app.component.ts`.
10. `npm run build:demo` → OK, 9 advertencias, inicial 1,53 MB.
11. **Medición.** Borrá `dist/` antes de compilar. Después, buscá el chunk del shell (el
    único con `path:"ajustes"`) y listá los ids que pide esa ruta. **No tienen que estar**
    los chunks de `exceljs` ni de `jspdf` (`grep -l "exceljs" dist/ap-log/*.js` y
    `grep -l "jspdf" dist/ap-log/*.js` te dicen cuáles son).
    Mi medición: ANTES `ajustes` pedía
    `[490, 474, 150, 27, 775, 310, 663, 5, 316, `**`887`**`, `**`107`**`, `**`747`**`, 76, 658]`
    y DESPUÉS pide `[490, 474, 150, 27, 775, 310, 663, 5, 316, 76, 33]`. Pegame las dos
    listas (la tuya de antes la tenés en el build de IE3b, si lo guardaste; si no, alcanza
    con la de después y los dos greps).

## Pruebas manuales en demo (las hago yo)

1. **Papelera legado** (Ajustes → Papelera (legado)): abrí el detalle de un objeto
   eliminado de los que tienen ese bloque (una factura vieja). El modal tiene que abrirse
   igual, con todos sus datos, **sin la columna "Reimpresión"**. Probá también con un
   objeto de otra colección (cliente, chofer, operación) para confirmar que el resto del
   modal no se movió.
2. **Papelera nueva** (Ajustes → Papelera): sin cambios, el detalle sigue abriendo el modal
   real de la entidad (ese camino nunca pasó por `objeto-papelera`).
3. **Tablero de asignaciones** (Operaciones → Tablero de asignaciones), con `dev`/`admin` y
   con `user`: el botón "⬇ Descargar" **ya no está**. Los otros siguen: los 4 de gestión,
   Alta de Op, Guardar y Limpiar (con `user`, Limpiar sigue visible por su override).
4. **Tablero de operaciones:** "Descargar Op" sigue funcionando igual (es el que usa la
   misma acción de permiso).
5. **Red:** al ENTRAR a Ajustes ya no tienen que descargarse los chunks de `exceljs`
   (~945 kB) ni de `jspdf` (~355 kB).

## Mensaje de commit

```
IE4 (informes): se van los dos botones muertos (Papelera legado y tablero de asignaciones)

- objeto-papelera: fuera la columna "Reimpresion" (los dos botones excel/pdf) y
  el metodo reimprimirFac completo, con sus 45 lineas comentadas. Estaba roto
  (D1 / hallazgo 2): pasaba $clientes y $choferes, que vienen de StorageService
  y siempre emiten [] porque nadie escribe esas claves de localStorage y
  clearAllLocalStorage() las borra en cada login. Ademas es del modelo viejo
  (InformeLiq / facturaCliente), que se va con la migracion de Vantruck.
- Con el metodo se van tres inyecciones sin uso: ExcelService, PdfService y
  LogService (su unico uso era el logEvent REIMPRESION de la reimpresion: el
  ultimo REIMPRESION que escribia el log viejo).
- tablero-asignaciones: fuera el boton "Descargar", su *appPermiso y el metodo
  descargar() (D6). Estaba inerte desde el switch del modulo: solo abria un
  Swal de "Proximamente". El informe, si se quiere, es un informe NUEVO del
  frente de Operaciones (era un layout, no una tabla; esta reconstruido en el
  diseno del frente).
- La accion 'operaciones.descargarTablero' no se toca: la sigue usando el boton
  real de tablero-op, ahora como unico consumidor.
- RESULTADO: ExcelService y PdfService no los importa ningun archivo de la app,
  solo sus propios .spec.ts. Es lo que IE5 necesita para borrarlos.
- Medido en el build: la ruta ajustes deja de pedir 887 (exceljs, 945,76 kB /
  217,91 kB transferidos), 107 (jspdf, 355,44 kB / 97,62 kB) y 747 (30,68 kB /
  8,93 kB): 1.331,88 kB en bruto / 324,46 kB transferidos. Los chunks siguen
  existiendo, los carga el renderer nuevo con import() al exportar.
- Queda anotado: arrayFacOp y $choferes se siguen cargando en objeto-papelera
  sin consumidor. No se tocan por ahora (estan entrelazados con el ngOnInit del
  componente legado); se van completos con la Papelera legado.
```

FIN DE LA INSTRUCCIÓN IE4
