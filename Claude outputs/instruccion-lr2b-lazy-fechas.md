````
Si no ves la línea FIN DE LA INSTRUCCIÓN LR2b al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN LR2b — Frente Lazy loading + fechas (ApLog, rama refactor)
======================================================================
Limpieza de código sin uso (2/3): DbFirestoreService

## Contexto y razonamiento

Segundo bloque de la limpieza decidida por Nico. Alcance medido sobre el
código con LR2a:
- referencias del compilador de TypeScript;
- uso en templates;
- uso por instancia (`db.`, `dbFirebase.`, `dbFirestore.`, los nombres con
  que se inyecta el servicio).
Ninguno de los miembros que salen tiene una sola referencia fuera de su
definición.

**Qué sale de DbFirestoreService:**
- **18 miembros que ya estaban sin uso:**
  - interfaces exportadas `ResultadoConObjeto` y `ResultadoEliminacion`;
  - propiedades `componente`, `basePath` y `mensajesError`;
  - métodos `buscarColeccionRangoFechaIdCampo`, `obtenerTarifaIdTarifa`,
    `obtenerTarifaMasReciente`, `get`, `guardarMultipleGeneral` y
    `actualizarOperacionesBatch`;
  - métodos `setItem`, `getItemByField`, `deleteItem`,
    `getInformesLiqPorTipoYFechas`, `getInformesLiqPorPeriodo`,
    `asignarNumerosInternosFaltantes` y `existeCuit`.
- **6 que quedaron sin uso con LR2a** (solo los llamaba StorageService):
  `getMostRecentId`, `getAllSortedIdLimit`, `getByDateValue`, `updateUser`,
  `deleteUser` y `createAndGetId`.
- **Inyección de NumeradorService:** solo la usaba
  `asignarNumerosInternosFaltantes`. El constructor queda vacío. En
  cascada, `NumeradorService.generarNumeroInterno` queda sin uso; sale en
  LR2c junto con el otro método muerto de ese servicio.
- **Imports sin uso:**
  - que quedan sin uso por este bloque: `Swal`, `InformeLiq`,
    `ValoresFinancieros` y `NumeradorService`;
  - que ya estaban sin uso: `CollectionReference`, `increment`,
    `WriteBatch`, `firstValueFrom` y `Operacion`.

**Qué NO se toca:** los bloques de código COMENTADO del archivo, incluido
el marcado `//////////NO BORRAARRR!!!!!!!!!!!`. Los rangos empiezan en el
método o en su comentario pegado, nunca en esos bloques.

El archivo pasa de 1547 a ~1063 líneas. No cambia comportamiento.

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
- **Borrado por RANGO** (igual que en LR2a). Se borra desde INICIO
  (inclusive) hasta la línea anterior a ANCLA (ANCLA se queda). Las dos se
  identifican por cómo EMPIEZA la línea, con la sangría indicada. Antes de
  borrar, verificá:
  - que cada prefijo sea único en el archivo;
  - que ANCLA esté después de INICIO;
  - que la distancia sea exactamente la indicada.
  Si algo no coincide, detenete y reportá sin borrar.

## PASO 0 — Verificación (sin modificar nada)

Corré y reportá la salida:

```
grep -rnE "\b(db|dbFirebase|dbFirestore)\.(componente|basePath|getMostRecentId|buscarColeccionRangoFechaIdCampo|getAllSortedIdLimit|getByDateValue|obtenerTarifaIdTarifa|obtenerTarifaMasReciente|get|updateUser|deleteUser|guardarMultipleGeneral|mensajesError|actualizarOperacionesBatch|setItem|getItemByField|deleteItem|getInformesLiqPorTipoYFechas|getInformesLiqPorPeriodo|asignarNumerosInternosFaltantes|existeCuit|createAndGetId)\b" src --include=*.ts --include=*.html
grep -rn "ResultadoConObjeto\|ResultadoEliminacion" src --include=*.ts
grep -rn "DbFirestoreService" src --include=*.spec.ts | grep -v "db-firestore.service.spec.ts"
grep -n "numeradorService" src/app/servicios/database/db-firestore.service.ts
grep -n "NO BORRAARRR" src/app/servicios/database/db-firestore.service.ts
wc -l src/app/servicios/database/db-firestore.service.ts
```

Esperado:
1. Usos de los métodos que salen, por instancia: nada.
2. Las 2 interfaces: solo su definición en db-firestore.service.ts (líneas
   51 y 93).
3. Specs que nombran DbFirestoreService (fuera del suyo): reportá la
   lista. No deberían llamar a ninguno de los métodos que salen.
4. `numeradorService`: la inyección en el constructor y una única llamada,
   dentro de asignarNumerosInternosFaltantes.
5. Una línea (la 200). Se queda.
6. `1547`.

Si aparece cualquier uso de lo que sale, detenete y reportá.

## PASO 1 — src/app/servicios/database/db-firestore.service.ts

Aplicá los pasos EN ORDEN. Cada RANGO se verifica sobre el archivo ya modificado por los pasos anteriores.

1.1 Borrá la línea COMPLETA que contiene:
```
  CollectionReference,
```
por:
```
(borrar la línea)
```

1.2 Borrá la línea COMPLETA que contiene:
```
  increment,
```
por:
```
(borrar la línea)
```

1.3 Borrá la línea COMPLETA que contiene:
```
  WriteBatch,
```
por:
```
(borrar la línea)
```

1.4 BUSCAR:
```
import { firstValueFrom, from, Observable } from "rxjs";
```
REEMPLAZAR:
```
import { from, Observable } from "rxjs";
```

1.5 BUSCAR:
```
import { Operacion } from "src/app/interfaces/operacion";
import Swal from "sweetalert2";
import { Firestore } from "@angular/fire/firestore";
import { inject } from "@angular/core";
import { InformeOpNuevo } from "src/app/interfaces/informe-op-nuevo";
import { InformeLiq, ValoresFinancieros } from "src/app/interfaces/informe-liq";
import { NumeradorService } from "../numerador/numerador.service";
```
REEMPLAZAR:
```
import { Firestore } from "@angular/fire/firestore";
import { inject } from "@angular/core";
import { InformeOpNuevo } from "src/app/interfaces/informe-op-nuevo";
```

Interfaz exportada `ResultadoConObjeto` (sin uso):

1.6 RANGO (6 líneas).
- INICIO: la línea que empieza con (0 espacios de sangría):
```
export interface ResultadoConObjeto {
```
- ANCLA (se queda): la línea que empieza con (0 espacios de sangría):
```
export type ModoEscritura =
```

Interfaz exportada `ResultadoEliminacion` (sin uso):

1.7 RANGO (12 líneas).
- INICIO: la línea que empieza con (0 espacios de sangría):
```
export interface ResultadoEliminacion {
```
- ANCLA (se queda): la línea que empieza con (0 espacios de sangría):
```
@Injectable({
```

1.8 Borrá la línea COMPLETA que contiene:
```
  componente: string = "";
```
por:
```
(borrar la línea)
```

1.9 BUSCAR:
```
  private firestore = inject(Firestore);
  basePath: string = `/Vantruck/datos`;

  constructor(
    private numeradorService: NumeradorService,
  ) {}
```
REEMPLAZAR:
```
  private firestore = inject(Firestore);

  constructor() {}
```

`getMostRecentId` con su comentario. Los bloques comentados de arriba, incluido el marcado "NO BORRAARRR", NO se tocan:

1.10 RANGO (26 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  //BUSCAR ELEMENTOS PARA VERIFICAR SI ESTAN DUPLICADOS
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  getMostRecentLimit<T>(
```

`buscarColeccionRangoFechaIdCampo`:

1.11 RANGO (33 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  buscarColeccionRangoFechaIdCampo<T>(
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  getAllColectionRangeIdValue<T>(
```

`getAllSortedIdLimit`, más las 2 líneas comentadas idénticas que le siguen (`// this.firestore.collection('Employees'...`). El bloque de comentarios que está ARRIBA del método, que termina en la línea de barras `////…`, NO se toca:

1.12 RANGO (34 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  getAllSortedIdLimit<T>(
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  getByFieldValue<T>(
```

`getByDateValue`, `obtenerTarifaIdTarifa` y `obtenerTarifaMasReciente`:

1.13 RANGO (93 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  getByDateValue<T>(
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  getDocObservable<T>(
```

`get`:

1.14 RANGO (8 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  get(id: string) {
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  create(componente: string, item: any) {
```

`updateUser`, `deleteUser`, `guardarMultipleGeneral`, `mensajesError` y `actualizarOperacionesBatch`:

1.15 RANGO (118 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  updateUser(item: any) {
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  async actualizarMultiple(
```

`setItem` (con su comentario), `getItemByField`, `deleteItem`, `getInformesLiqPorTipoYFechas`, `getInformesLiqPorPeriodo`, `asignarNumerosInternosFaltantes` y `existeCuit`:

1.16 RANGO (131 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  // 🔹 Guarda o reemplaza el tablero diario
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  getObjIdg<T>(
```

`createAndGetId`:

1.17 RANGO (12 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  createAndGetId(componente: string, item: any): Promise<string> {
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  async getByField<T>(
```

## Verificación

1. Greps (reportá la salida):
```
grep -rnE "\b(db|dbFirebase|dbFirestore)\.(componente|basePath|getMostRecentId|buscarColeccionRangoFechaIdCampo|getAllSortedIdLimit|getByDateValue|obtenerTarifaIdTarifa|obtenerTarifaMasReciente|get|updateUser|deleteUser|guardarMultipleGeneral|mensajesError|actualizarOperacionesBatch|setItem|getItemByField|deleteItem|getInformesLiqPorTipoYFechas|getInformesLiqPorPeriodo|asignarNumerosInternosFaltantes|existeCuit|createAndGetId)\b" src --include=*.ts --include=*.html
grep -nE "^  (async )?(getMostRecentId|buscarColeccionRangoFechaIdCampo|getAllSortedIdLimit|getByDateValue|obtenerTarifaIdTarifa|obtenerTarifaMasReciente|get|updateUser|deleteUser|guardarMultipleGeneral|actualizarOperacionesBatch|setItem|getItemByField|deleteItem|getInformesLiqPorTipoYFechas|getInformesLiqPorPeriodo|asignarNumerosInternosFaltantes|existeCuit|createAndGetId)(<|\()|mensajesError|basePath|^  componente: string = |ResultadoConObjeto|ResultadoEliminacion|NumeradorService|Swal|ValoresFinancieros" src/app/servicios/database/db-firestore.service.ts
grep -n "NO BORRAARRR" src/app/servicios/database/db-firestore.service.ts
wc -l src/app/servicios/database/db-firestore.service.ts
git diff --numstat -- src
git diff -U0 -- src | grep -n "^+.* $"
```
Esperado:
- (a) nada;
- (b) nada;
- (c) una línea (la 171: el bloque marcado se conserva);
- (d) `1063`;
- (e) `2	486	src/app/servicios/database/db-firestore.service.ts` (solo ese
  archivo);
- (f) nada.

2. `npm run build:demo`. Reportá la tabla de tamaños y las advertencias.
   Referencia (medido sobre una copia del repo con LR2a + este cambio):
   - main.js: 1,11 MB → ≈ 1,10 MB (280,4 kB transfer);
   - Initial total: 1,54 MB → ≈ 1,53 MB (347,7 kB transfer);
   - las mismas 9 advertencias.

## Pruebas manuales en demo (las hace Nico)

DbFirestoreService es la base de casi todo. La prueba es un recorrido
general. Si algo falla, el build ya lo habría detectado; esto confirma el
comportamiento en ejecución.
1. Login (admin) → /op. Tablero de operaciones y tablero de asignaciones
   cargan.
2. Alta y edición de una operación; cierre de una operación.
3. Clientes, Choferes y Proveedores: listados y una edición cada uno.
4. Liquidación: liquidar, ver borrador, emitir. Facturación: abrir un
   emitido.
5. Finanzas: registrar un cobro y ver la cuenta de la entidad.
6. Ajustes: Usuarios, Registro, Papelera y Papelera legado listan.
7. Legajos: tablero y vencimientos.
8. Sin errores en consola en todo el recorrido.

## Mensaje de commit

```
LR2b (lazy-fechas): DbFirestoreService sin código muerto

- Fuera 24 miembros sin uso: 18 que ya lo estaban (ResultadoConObjeto,
  ResultadoEliminacion, componente, basePath, mensajesError,
  buscarColeccionRangoFechaIdCampo, obtenerTarifaIdTarifa,
  obtenerTarifaMasReciente, get, guardarMultipleGeneral,
  actualizarOperacionesBatch, setItem, getItemByField, deleteItem,
  getInformesLiqPorTipoYFechas, getInformesLiqPorPeriodo,
  asignarNumerosInternosFaltantes, existeCuit) y 6 que quedaron sin uso
  con LR2a (getMostRecentId, getAllSortedIdLimit, getByDateValue,
  updateUser, deleteUser, createAndGetId).
- Fuera la inyección de NumeradorService (solo la usaba
  asignarNumerosInternosFaltantes) e imports sin uso.
- Los bloques de código comentado se conservan (incluido "NO BORRAARRR").
```

FIN DE LA INSTRUCCIÓN LR2b
````
