````
Si no ves la línea FIN DE LA INSTRUCCIÓN LR2a al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN LR2a — Frente Lazy loading + fechas (ApLog, rama refactor)
======================================================================
Limpieza de código sin uso (1/3): StorageService

## Contexto y razonamiento

Nico decidió limpiar en este frente los ~115 miembros de servicios que ya
estaban sin uso antes de LR1. Va antes de los bloques de fechas FE2 a FE5
para no corregir fechas en código que se borra: StorageService tiene, por
ejemplo, `primerDia`/`ultimoDia` calculados con toISOString.

El bloque se partió en tres:
- **LR2a (este):** StorageService.
- **LR2b:** DbFirestoreService, más los métodos que quedan huérfanos por
  LR2a.
- **LR2c:** el resto (ValidarService, ExcelService, PdfService y otros), más
  LogService.logEventDoc, que queda huérfano por LR2a.

**Cómo se fijó el alcance** (sobre el código con FE1):
- Referencias del compilador de TypeScript (`findReferences`) para cada
  miembro.
- Uso en templates por nombre (los servicios inyectados como `public` se
  pueden llamar desde el HTML).
- Uso externo de la instancia: todos los `storageService.x` y
  `this.storage.x` de src/.

**Qué usa hoy la app de StorageService**:
- métodos: `setInfo`, `loadInfo`, `clearAllLocalStorage`,
  `initializerAdmin`, `addItem`, `deleteItem`, `updateItem`,
  `syncChangesLimit` y `listenForChangesField`;
- internamente: `getAllColection`, `getObservable`, `updateObservable` y
  `controlLog`;
- observables: `clientes$`, `choferes$`, `proveedores$` y `users$`.
Todo lo demás no tiene ninguna referencia.

**Qué sale:**
- 4 campos: `date`, `primerDia`, `ultimoDia` y `logControl`. Además
  `destroy$`, que no se usaba en ningún lado.
- 43 pares de observables (privado `_x$` + público `x$`) que nadie
  suscribe.
  - Sus `case` en `updateObservable` y `getObservable` desaparecen con
    ellos. Los dos métodos quedan solo con los 4 observables vivos.
  - Para claves que no son esas 4, `setInfo` sigue guardando en
    localStorage como hoy. La única diferencia es que ya no emite en un
    observable que nadie escuchaba.
  - `getObservable` solo lo llama `getAllColection("users")`.
- 19 métodos sin uso:
  - `setInfoOne`, `clearInfo`, `getMostRecentItemId`,
    `syncChangesDateValue`, `syncChangesUsers`, `getAllSortedIdLimit`,
    `getByFieldValue`, `getByDateValue`;
  - `deleteItemPapelera`, `addSimpleLogPapelera`, `updateUser`,
    `deleteUser`, `getChoferesHabilitados`, `addItemAndGetId`,
    `updateItemAsync`, `deleteItemPapeleraAsync`, `deleteItemAsync`,
    `deleteItemPapeleraCompuestoAsync`;
  - más el bloque comentado `syncChangesByOneElemId`.
- Imports que quedan sin uso: `Subject`, `take`, `takeUntil`, `Cliente`,
  `Proveedor`, `Chofer`, `Operacion`, `NoDisponibilidadChofer` y lodash.

El archivo pasa de 1047 a ~337 líneas. NO cambia comportamiento.

**Hallazgo (NO se corrige acá).** `clientes$`, `choferes$` y
`proveedores$` se inicializan desde localStorage, pero hoy nadie escribe esas
claves: los servicios nuevos de Clientes, Choferes y Proveedores no usan
StorageService, y `clearAllLocalStorage()` las borra en cada login. Por eso
siempre emiten `[]`. Lo usan:
- `objeto-papelera`, la Papelera legado: arma el Excel/PDF de documentos
  viejos con esas listas vacías;
- `modal-vehiculo`, que asigna `$proveedores` pero no lo usa en el
  template.
Queda anotado para el frente de Ajustes/Papelera legado.

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
- **Borrado por RANGO.** Se borra desde la línea INICIO (inclusive) hasta la
  línea anterior a ANCLA (ANCLA se queda). INICIO y ANCLA se identifican
  por cómo EMPIEZA la línea, con la sangría exacta indicada. Antes de
  borrar, verificá:
  - que cada prefijo aparezca exactamente una vez en el archivo;
  - que ANCLA esté después de INICIO;
  - que la distancia sea exactamente la cantidad de líneas indicada.
  Si algo no coincide, detenete y reportá sin borrar.
  - **RANGO CON REEMPLAZO:** además, en lugar de las líneas borradas se
    inserta el bloque dado.
  - **ANCLA "última línea":** el rango llega hasta la línea anterior a la
    última del archivo (`}`, que cierra la clase). El archivo hoy termina
    sin salto de línea final; dejalo igual.
  Se usan rangos porque estos bloques tienen muchas líneas con espacios al
  final, que no pueden ir en un BUSCAR.

## PASO 0 — Verificación (sin modificar nada)

Corré y reportá la salida:

```
grep -rhoE "(storageService|this\.storage)\.[a-zA-Z_$]+" src --include=*.ts --include=*.html | sed -E 's/^(this\.)?(storageService|storage)\.//' | sort | uniq -c
grep -rn "StorageService" src --include=*.spec.ts | grep -v "storage.service.spec.ts"
wc -l src/app/servicios/storage/storage.service.ts
grep -c " $" src/app/servicios/storage/storage.service.ts
```

Esperado:
1. Exactamente estos miembros (cantidad de usos entre paréntesis):
   - addItem (2), choferes$ (1), clearAllLocalStorage (2), clientes$ (1);
   - deleteItem (2), getAllSorted (1), initializerAdmin (1);
   - listenForChangesField (1), loadInfo (8), proveedores$ (4);
   - setInfo (3), syncChangesLimit (1), syncChangesUsers (1);
   - updateItem (4), updateObservable (1), users$ (1).
   `getAllSorted`, `syncChangesUsers` y `updateObservable` aparecen SOLO en
   líneas comentadas (`//this.storageService...` en cliente-alta, registro
   y sidebar). Confirmalo.
2. Specs que nombran StorageService (fuera del suyo): reportá la lista. No
   deberían llamar a ninguno de los métodos que salen.
3. `1047`.
4. Un número (líneas con espacio final, solo de referencia).

Si aparece cualquier otro miembro usado desde afuera, detenete y reportá.

## PASO 1 — src/app/servicios/storage/storage.service.ts

Aplicá los pasos EN ORDEN. Los RANGO se verifican y aplican uno por uno sobre el archivo ya modificado por los pasos anteriores; la cantidad de líneas de cada uno no depende de los demás.

1.1 BUSCAR:
```
import { BehaviorSubject, distinctUntilChanged, Observable, Subject, take, takeUntil } from 'rxjs';
import { DbFirestoreService } from '../database/db-firestore.service';
import { Cliente } from 'src/app/interfaces/cliente';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { Chofer } from 'src/app/interfaces/chofer';
import { LogService } from '../log/log.service';
import * as _ from 'lodash';
import { Operacion } from 'src/app/interfaces/operacion';
import { NoDisponibilidadChofer } from 'src/app/interfaces/no-disponibilidad-chofer';
import { UsuarioSesionService } from '../usuario-sesion/usuario-sesion.service';
```
REEMPLAZAR:
```
import { BehaviorSubject, distinctUntilChanged, Observable } from 'rxjs';
import { DbFirestoreService } from '../database/db-firestore.service';
import { LogService } from '../log/log.service';
import { UsuarioSesionService } from '../usuario-sesion/usuario-sesion.service';
```

Campos `date`, `primerDia`, `ultimoDia` y `logControl` (sin uso; `primerDia`/`ultimoDia` además calculaban con toISOString):

1.2 RANGO (4 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  date:any = new Date();
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  // los componentes trabajan solo con el storage
```

1.3 Borrá la línea COMPLETA que contiene:
```
  private destroy$ = new Subject<void>();
```
por:
```
(borrar la línea)
```

Observables sin suscriptores, de `_operaciones$` a `facturaOpProveedor$` (30 pares privado/público), con sus líneas en blanco:

1.4 RANGO (90 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  private _operaciones$ = new BehaviorSubject
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  private _users$ = new BehaviorSubject
```

Observables sin suscriptores de `_ruta$` a `noOperativo$` (13 pares) y el `updateObservable` completo, que se reemplaza por la versión reducida:

1.5 RANGO CON REEMPLAZO (279 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  private _ruta$ = new BehaviorSubject
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  // metodos del storage
```
En lugar de las líneas borradas, insertá exactamente:
```
  // LR2a (frente lazy-fechas): solo quedan los observables que tienen
  // suscriptores. El resto de las claves solo se guarda en localStorage.
  updateObservable(componente: any, data: any) {
    switch (componente) {
      case "clientes": {
        this._clientes$.next(data);
        break;
      }
      case "choferes": {
        this._choferes$.next(data);
        break;
      }
      case "proveedores": {
        this._proveedores$.next(data);
        break;
      }
      case "users": {
        this._users$.next(data);
        break;
      }
      default: {
        break;
      }
    }
  }
```
seguido de UNA línea en blanco (queda entre lo insertado y la ANCLA).

`setInfoOne` (sin uso):

1.6 RANGO (6 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  public setInfoOne(
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  public loadInfo(
```

`clearInfo` (sin uso):

1.7 RANGO (5 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  public clearInfo(
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  public clearAllLocalStorage(
```

`getMostRecentItemId`, el bloque comentado `syncChangesByOneElemId`, `syncChangesDateValue` y `syncChangesUsers` (sin uso):

1.8 RANGO (66 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  getMostRecentItemId<T>(
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  syncChangesLimit<T>(
```

`getObservable` (se reemplaza por la versión reducida), `getAllSortedIdLimit`, `getByFieldValue` y `getByDateValue` (sin uso):

1.9 RANGO CON REEMPLAZO (94 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  getObservable<T>(
```
- ANCLA (se queda): la línea que empieza con (6 espacios de sangría):
```
      public addItem(
```
En lugar de las líneas borradas, insertá exactamente:
```
  getObservable<T>(componente: string): Observable<T[]> {
    switch (componente) {
      case 'clientes':
        return this._clientes$.asObservable();
      case 'choferes':
        return this._choferes$.asObservable();
      case 'proveedores':
        return this._proveedores$.asObservable();
      case 'users':
        return this._users$.asObservable();
      default:
        throw new Error(`Componente no reconocido: ${componente}`);
    }
  }
```
seguido de UNA línea en blanco (queda entre lo insertado y la ANCLA).

`deleteItemPapelera` y `addSimpleLogPapelera` (sin uso):

1.10 RANGO (22 líneas).
- INICIO: la línea que empieza con (6 espacios de sangría):
```
      public deleteItemPapelera(
```
- ANCLA (se queda): la línea que empieza con (6 espacios de sangría):
```
      public updateItem(
```

`updateUser` y `deleteUser` (sin uso):

1.11 RANGO (30 líneas).
- INICIO: la línea que empieza con (6 espacios de sangría):
```
      public updateUser(
```
- ANCLA (se queda): la línea que empieza con (6 espacios de sangría):
```
      private controlLog(
```

`getChoferesHabilitados`, `addItemAndGetId`, `updateItemAsync`, `deleteItemPapeleraAsync`, `deleteItemAsync` y `deleteItemPapeleraCompuestoAsync` (sin uso), hasta el final de la clase:

1.12 RANGO (148 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  getChoferesHabilitados(
```
- ANCLA: la ÚLTIMA línea del archivo, `}` (cierra la clase). Se queda.

## Verificación

1. Greps (reportá la salida):
```
grep -nE "primerDia|ultimoDia|logControl|destroy\$|setInfoOne|clearInfo|getMostRecentItemId|syncChangesDateValue|syncChangesUsers|getAllSortedIdLimit|getByFieldValue|getByDateValue|deleteItemPapelera|addSimpleLogPapelera|updateUser|deleteUser|getChoferesHabilitados|addItemAndGetId|updateItemAsync|deleteItemAsync|syncChangesByOneElemId" src/app/servicios/storage/storage.service.ts
grep -c "new BehaviorSubject" src/app/servicios/storage/storage.service.ts
grep -c "case " src/app/servicios/storage/storage.service.ts
wc -l src/app/servicios/storage/storage.service.ts
git diff --numstat -- src
git diff -U0 -- src | grep -n "^+.* $"
```
Esperado:
- (a) nada;
- (b) `4`;
- (c) `44`: 8 `case` entre `updateObservable` y `getObservable`, más 36
  de `controlLog`, que no se toca.
- (d) `337`;
- (e) `10	720	src/app/servicios/storage/storage.service.ts` (solo ese archivo);
- (f) nada.

2. `npm run build:demo`. Reportá la tabla de tamaños y las advertencias.
   Referencia (medido sobre una copia del repo con FE1 + este cambio):
   - main.js: 1,12 MB → ≈ 1,11 MB (281,9 kB transfer);
   - Initial total: 1,55 MB → ≈ 1,54 MB (349,2 kB transfer);
   - las mismas 9 advertencias.

## Pruebas manuales en demo (las hace Nico)

1. Login con admin:
   - carga → /op;
   - Ajustes → Usuarios lista los usuarios (`getAllColection("users")`
     y `users$`).
2. Sidebar: navegar entre módulos y recargar (F5). Vuelve a la última ruta
   (`setInfo`/`loadInfo` de "ruta").
3. Operaciones: dar de alta, editar y dar de baja una no disponibilidad de
   chofer (`addItem`/`updateItem` sobre "noOperativo").
4. Home: la alerta o listado de choferes no disponibles se actualiza al
   instante (`listenForChangesField`).
5. Legajos: cambiar la visibilidad de un legajo en un listado (`updateItem`
   sobre "legajos").
6. Ajustes:
   - Papelera legado: lista, abre un objeto y lo restaura o borra si hay
     alguno de prueba (`addItem`/`deleteItem`/`syncChangesLimit`);
   - Registro viejo: lista.
7. Logout y login de nuevo: sin errores en consola.

## Mensaje de commit

```
LR2a (lazy-fechas): StorageService sin código muerto

- Fuera 43 pares de observables sin suscriptores (y sus case en
  updateObservable/getObservable), los campos date/primerDia/ultimoDia/
  logControl/destroy$ y 19 métodos sin uso (setInfoOne, clearInfo,
  getMostRecentItemId, syncChangesDateValue, syncChangesUsers,
  getAllSortedIdLimit, getByFieldValue, getByDateValue, deleteItemPapelera,
  addSimpleLogPapelera, updateUser, deleteUser, getChoferesHabilitados,
  addItemAndGetId, updateItemAsync, deleteItemPapeleraAsync,
  deleteItemAsync, deleteItemPapeleraCompuestoAsync) + el bloque comentado
  syncChangesByOneElemId e imports sin uso.
- Sin cambio de comportamiento: quedan los 4 observables con suscriptores
  (clientes$, choferes$, proveedores$, users$) y los métodos que usa la app.
```

FIN DE LA INSTRUCCIÓN LR2a
````
