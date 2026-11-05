# Auditoría — Eliminación del camino legado de la papelera y del log viejo

> **Superada (2026-11-04, `30526b9`, `beb4d26` y el frente remanente de StorageService):** las §5 (lo que sigue vivo de `StorageService` y los métodos de `DbFirestoreService` sin caller), §7 (`papelera-legado` como ruta y pestaña vivas) y §8 (`'logs'` y `'papelera'` mapeados a sus buckets con escritura) describen código y reglas que ya no existen: `StorageService` se eliminó entero y las dos colecciones viejas están en `historicoSoloLectura`. Estado actual: skills `subsistema-papelera` y `subsistema-log`, y CLAUDE.md → "Security Rules".

Fecha: 2026-11-04 · Rama: `refactor`

## Alcance

Relevamiento crudo, solo lectura de código. Sin propuesta de diseño.

Relevado: lectores y escritores de `logs`; `RegistroComponent`; `LogService`;
`PapeleraLegadoComponent`, `ObjetoPapeleraComponent`, `TableroService`;
`AsignacionService.reactivarItem`; lo que queda vivo de `StorageService`; residuos de
`objeto-papelera`; rutas y pestañas de Ajustes; `firestore.rules` y
`firestore.indexes.json`.

Fuera de alcance: datos de Firestore (ni demo ni producción). La precondición del frente
(relevar la colección `papelera` de producción) sigue pendiente.

---

## 1. Colección `logs`: lectores y escritores

### Escritores (los 3 terminan en `LogService.logEvent`)

| Escritor | Camino | Disparado por |
|---|---|---|
| `StorageService.addItem` | `StorageService` → `LogService.logEvent` (si `controlLog` da true y el rol no es `dev`) | Solo `PapeleraLegadoComponent.addItem` (restauración de no-operaciones, acción `RESTAURAR`) |
| `StorageService.deleteItem` | ídem | Solo `PapeleraLegadoComponent.addItem` sobre `papelera` con acción `INTERNA` → `controlLog('papelera', …)` cae en `default` → **no loguea**. En la práctica no escribe en `logs` |
| `StorageService.updateItem` | ídem | **Sin callers** |
| `TableroService.altaOperacionYActualizarTablero` | directo a `LogService.logEvent` (`ALTA`, `operaciones`), sin exclusión de `dev` | Solo `PapeleraLegadoComponent.addItem` (rama operaciones) |
| `AsignacionService.reactivarItem` (vía su privado `registrarLog`) | directo a `LogService.logEvent` (`EDITAR`, `asignaciones`), sin exclusión de `dev` | Solo `TableroService.altaOperacionYActualizarTablero` |

Nadie escribe `logs` directo por `DbFirestoreService`. `LogService.logEvent` usa
`setDoc` del SDK de `@angular/fire` directamente, sin pasar por `DbFirestoreService`.

Conclusión: **todo escritor vivo de `logs` cuelga de `PapeleraLegadoComponent.addItem`.**
Fuera de esa pantalla, `logs` no recibe escrituras.

### Lectores

| Lector | Camino | Método |
|---|---|---|
| `RegistroComponent.consultarRegistro` | directo `DbFirestoreService.getAllColectionRangeLimit('logs', …)` | listener (`onSnapshot`) por rango de `timestamp`, `limit` 100 |
| `RegistroComponent.consultarId` | directo `DbFirestoreService.getObjIdg('logs', 'idObjet', …)` | `getDocs` puntual |

No hay otros lectores. `RegistroLogComponent` / `RegistroLogConsultaService` leen
`registroLog`, no `logs` (el comentario de `consultarPorIdObjet` menciona
`RegistroComponent` solo como origen de la capacidad).

## 2. `RegistroComponent` — camino de lectura

- Inyecta solo `DbFirestoreService` y `StorageService`. **No inyecta ni importa
  `LogService`.**
- Lee `logs` por `DbFirestoreService.getAllColectionRangeLimit` y
  `DbFirestoreService.getObjIdg` (ver §1).
- De `StorageService` usa solo `loadInfo('users')` (para mostrar nombre en vez de email).
- Importa la interfaz `LogEntry` (`interfaces/log-entry.ts`), que también usan
  `LogService` y `LogDoc`.

Consecuencia para la decisión: `LogService` no tiene ningún método de lectura ni ningún
consumidor del lado de lectura. Si `RegistroComponent` se conserva, no obliga a conservar
`LogService`; solo a conservar `LogEntry` y los dos métodos de `DbFirestoreService`.

## 3. `LogService` — inventario

| Método | Tipo | Callers |
|---|---|---|
| `logEvent(accion, coleccion, detalle, idObjeto, resultado)` | escritura en `logs` | `StorageService.addItem` / `deleteItem` / `updateItem`; `TableroService.altaOperacionYActualizarTablero`; `AsignacionService.registrarLog` (privado, solo usado por `reactivarItem`) |
| `createLogEntry(…)` | público, puro (arma el `LogEntry`) | Solo `LogService.logEvent`. **Sin callers externos** |

Inyectado en: `StorageService`, `TableroService`, `AsignacionService`. Nada más.

Callers efectivos hoy, siguiendo la cadena hasta un componente: únicamente
`PapeleraLegadoComponent`. `StorageService.updateItem` y `createLogEntry` (desde afuera)
no tienen caller.

## 4. Papelera legado

### `PapeleraLegadoComponent` (`raiz/ajustes/papelera-legado/`)

Inyecta: `DbFirestoreService`, `StorageService`, `NgbModal`, `TableroService`,
`UsuarioSesionService`.

| Método | Lee | Escribe |
|---|---|---|
| `ngOnInit` | `StorageService.users$`; además llama `StorageService.syncChangesLimit('papelera', 'idDoc', 100)` | — |
| `consultarPapelera` | `papelera` vía `DbFirestoreService.getMostRecentLimit` (listener, últimos 100 por `idDoc`) | — |
| `consultarId` | `papelera` vía `DbFirestoreService.getObjIdg('papelera', 'logEntry.idObjet', …)` | — |
| `modalObjeto` | — (abre `ObjetoPapeleraComponent` con `{modo: coleccion, item: objeto}`; para `legajos` le pasa toda la lista de la papelera) | — |
| `restaurarObjeto` → `addItem`, rama `operaciones` | — | `TableroService.altaOperacionYActualizarTablero` (ver abajo); luego `StorageService.deleteItem('papelera', …)` sin `await` |
| `restaurarObjeto` → `addItem`, resto (`clientes`, `choferes`, `proveedores`, `facturaCliente/Chofer/Proveedor`, `legajos`, `vendedores`) | — | `StorageService.addItem(coleccion, objeto, …, 'RESTAURAR')` y `StorageService.deleteItem('papelera', …)`, ambos sin `await` |

### `ObjetoPapeleraComponent` (`shared/modales/objeto-papelera/`)

Inyecta: `NgbActiveModal`, `DbFirestoreService`, `StorageService`, `ProveedorService`,
`PapeleraService`.

- Lee: `StorageService.choferes$` / `clientes$` / `proveedores$` (según `modo`) y
  `StorageService.loadInfo('clientes')`; `facOpLiqCliente` / `facOpLiqChofer` /
  `facOpLiqProveedor` vía `DbFirestoreService.getAllColectionRangeIdValue` (en
  `buscarFacOp`, modos `factura*`); `objetosEliminados` vía
  `PapeleraService.getObjetoEliminado` (en `resolverTarifaProveedorFallback`, modo
  `choferes`); en memoria `ProveedorService.getProveedorPorId`.
- Escribe: nada.
- Caller único: `PapeleraLegadoComponent.modalObjeto`. `VisualizadorObjetoService` no lo
  usa.

### `TableroService` (`servicios/tablero/`)

Un único método, `altaOperacionYActualizarTablero`. Inyecta `DbFirestoreService`,
`LogService`, `AsignacionService`, `OperacionFactoryService`.

- Escribe `operaciones` (`DbFirestoreService.setDocSinId`, con `estado` reiniciado por
  `OperacionFactoryService.estadoInicial` y `km = 0`).
- Escribe `logs` (`LogService.logEvent`).
- Escribe `asignaciones` vía `AsignacionService.reactivarItem` (que a su vez escribe otro
  registro en `logs`).
- Caller único: `PapeleraLegadoComponent.addItem`. `TableroService` no se inyecta en
  ningún otro lado (la mención en `OperacionService` es un comentario sobre un método ya
  inexistente, `actualizarAsignacionDesdeOperacion`).

### Quién más usa los servicios que inyectan

| Servicio | ¿Se va con la Papelera legado? |
|---|---|
| `TableroService` | Sí, caller único |
| `LogService` | Sí (ver §3) |
| `StorageService` | **No** — ver §5 |
| `DbFirestoreService` | No (transversal). Pero ver §5 sobre métodos que quedan sin caller |
| `ProveedorService`, `PapeleraService`, `UsuarioSesionService`, `NgbModal` | No (transversales) |
| `AsignacionService` | No; solo `reactivarItem` y `registrarLog` quedan sin caller |

## 5. `AsignacionService.reactivarItem` y `StorageService`

- `AsignacionService.reactivarItem`: caller único
  `TableroService.altaOperacionYActualizarTablero`. Su privado `registrarLog` solo lo
  usa `reactivarItem`, y es el único uso de `LogService` dentro de `AsignacionService`.
  `reactivarItemEnLista` (puro) **sí** tiene otro uso (`restaurarOperacion`) y no se toca.
- `StorageService.updateItem`: **sin callers.**

### Qué de `StorageService` sigue vivo con callers

| Miembro | Callers |
|---|---|
| `clearAllLocalStorage` | `LoginComponent`, `AuthService` |
| `initializerAdmin` (→ `getAllColection('users')` → `DbFirestoreService.getAllColectionUsers`) | `CargaComponent` |
| `setInfo` | `CargaComponent` (`ruta`), `SidebarComponent` (`ruta`) |
| `loadInfo` | `SidebarComponent` (`ruta`); `loadInfo('users')` en `RegistroComponent`, `RegistroLogComponent`, `PapeleraComponent` (la nueva); `loadInfo('clientes')` en `ObjetoPapeleraComponent` |
| `users$` | `PapeleraLegadoComponent` |
| `proveedores$` | `ModalVehiculoComponent` (asigna `$proveedores` sin usarlo, ya señalado en la skill `lazy-loading-y-fechas`), `ObjetoPapeleraComponent` |
| `clientes$`, `choferes$` | Solo `ObjetoPapeleraComponent` |
| `addItem`, `deleteItem`, `syncChangesLimit` | Solo `PapeleraLegadoComponent` |
| `updateItem`, `listenForChangesField` | **Sin callers** |
| `getObservable`, `updateObservable`, `getAllColection`, `controlLog` | Solo internos |

`ValidarService` tiene una inyección de `StorageService` pero dentro de un bloque
comentado: no cuenta.

Al irse la Papelera legado, `StorageService` queda con: `clearAllLocalStorage`,
`initializerAdmin` (+ internos), `setInfo`/`loadInfo`, y `proveedores$` para
`ModalVehiculoComponent`. `clientes$`/`choferes$`, `addItem`, `deleteItem`,
`updateItem`, `syncChangesLimit`, `listenForChangesField`, `controlLog` y la inyección
de `LogService` quedan sin uso.

### Métodos de `DbFirestoreService` que quedan sin caller

| Método | Callers hoy |
|---|---|
| `getObjIdg` | `RegistroComponent.consultarId`, `PapeleraLegadoComponent.consultarId` |
| `getAllColectionRangeLimit` | `RegistroComponent.consultarRegistro` |
| `getMostRecentLimit` | `PapeleraLegadoComponent.consultarPapelera`, `StorageService.syncChangesLimit` |
| `getAllColectionRangeIdValue` | `ObjetoPapeleraComponent.buscarFacOp` |
| `create`, `delete` | Solo `StorageService.addItem` / `deleteItem` |
| `update` | `StorageService.updateItem` y `DbFirestoreService.updateConResultado` (este último sigue) |
| `getAllStateChangesByField` | Solo `StorageService.listenForChangesField` (ya sin caller) |

Los dos primeros dependen de si `RegistroComponent` se conserva.

## 6. Residuos de `objeto-papelera`

### Exportación Excel/PDF

En código no queda ninguna referencia a renderers ni servicios de exportación (la columna
"Reimpresión" y `reimprimirFac` se retiraron en IE4). Lo que queda es carga sin consumidor
en `ObjetoPapeleraComponent`:

- `arrayFacOp` y `buscarFacOp` / `encontrarMaximoYMinimo`: se cargan para modos `factura*`
  y el template no los usa.
- `$choferes`: se asigna desde `StorageService.choferes$` y el template no lo usa.
- `getProveedor` lee `$proveedores` de `StorageService.proveedores$`, que siempre emite
  `[]` (skill `lazy-loading-y-fechas`).

Documentado en la skill `exportacion-excel-pdf` (sección "Lo que se borró" y la deuda
de `arrayFacOp`/`$choferes`) y en "Deuda abierta" de `CLAUDE.md`.

### Lazy loading / routing

- `ObjetoPapeleraComponent` está **declarado en `SharedModule`** (no exportado; se abre
  con `NgbModal`). `SharedModule` lo importan 14 módulos (`RaizModule`, `AjustesModule`,
  `DesarrolloModule` y los de feature), así que el componente viaja en el chunk común,
  no solo en el de Ajustes, pese a que su único caller está en Ajustes.
- `PapeleraLegadoComponent` y `RegistroComponent`: declarados en `AjustesModule`,
  ruteados en `AjustesRoutingModule` (chunk lazy de Ajustes).
- La skill `lazy-loading-y-fechas` (sección del inventario "Se quedan", decisión D5)
  lista "Registro viejo (`logs`) y `LogService`" y "Papelera legado + `ObjetoPapelera`"
  como pendientes del frente Ajustes.

> **Corrección (2026-11-04, medido al ejecutar el frente):** lo de que
> `ObjetoPapeleraComponent` "viaja en el chunk común" es falso. En el build de producción
> (AOT) las `declarations` de un NgModule no retienen código: el componente viajaba con su
> único importador, `PapeleraLegadoComponent`, en el chunk de Ajustes. `build:demo` al
> eliminarlo: chunk de Ajustes de 103,20 a 64,47 kB, bundle inicial de 1.525.476 a
> 1.520.653 B, ningún chunk común con cambios. Mismo error en el hallazgo 7. Detalle: skill
> `lazy-loading-y-fechas`.

## 7. Rutas y pestañas (Ajustes)

`ajustes-routing.module.ts`:

| Ruta | Estado | Roles |
|---|---|---|
| `registro` (`RegistroComponent`) | **viva** | `dev`, `admin`, `demo` |
| `papelera-legado` (`PapeleraLegadoComponent`) | **viva** | `dev`, `admin`, `demo` |

`AjustesControlComponent` (template inline en el `.ts`):

- Pestaña "Registro" (`tab2`): **comentada** en el template; la entrada
  `{ id: 'tab2', route: 'ajustes/registro' }` sigue en el array `tabs`.
- Pestaña "Papelera (legado)" (`tab5`): **comentada** en el template; la entrada
  `{ id: 'tab5', route: 'ajustes/papelera-legado' }` sigue en `tabs`.

Las dos pantallas no tienen pestaña pero se alcanzan por URL directa
(`/ajustes/registro`, `/ajustes/papelera-legado`). No hay otros enlaces a esas rutas
en el código (sidebar, home, etc.).

## 8. `firestore.rules` y `firestore.indexes.json`

### Reglas

`moduloDe()`:

- `'logs': 'logs'` y `'registroLog': 'logs'` — **comparten el bucket `logs`**.
- `'papelera': 'papelera'`, `'papeleraEventos': 'papelera'`,
  `'objetosEliminados': 'papelera'` — **comparten el bucket `papelera`**.

`permitido()`:

- `logs`: `dev` todo; `admin`/`user` leer + crear; `demo` leer.
- `papelera`: `dev` todo; `admin` leer/crear/editar/eliminar; `user` leer + crear;
  `demo` leer.

No hay reglas específicas por colección para `logs` ni `papelera`: retirarlas es sacar
dos entradas del mapa; los módulos `logs` y `papelera` siguen necesarios para
`registroLog`, `papeleraEventos` y `objetosEliminados`.

### Índices

`firestore.indexes.json` no tiene índices para `logs` ni para `papelera` (hay
`registroLog` y `papeleraEventos`). `fieldOverrides` vacío. Las consultas legadas no
los necesitan: `getAllColectionRangeLimit` ordena y filtra por el mismo campo
(`timestamp`); `getMostRecentLimit` y `getObjIdg` usan un solo campo.

---

## Hallazgos y ambigüedades

1. **`RegistroComponent` no depende de `LogService`.** Lee `logs` directo por
   `DbFirestoreService`. `LogService` es solo escritura y puede irse completo con
   independencia de qué se decida con `RegistroComponent`.
2. **Decisión abierta: `RegistroComponent`.** Es el único lector de `logs`. Si se elimina,
   los datos históricos de `logs` quedan en Firestore sin pantalla (igual que pasa con
   `papelera`). Si se conserva, quedan `LogEntry`, `getObjIdg`,
   `getAllColectionRangeLimit` y la entrada `'logs': 'logs'` de las reglas (solo lectura
   haría falta). Hoy no tiene pestaña.
3. **`StorageService.deleteItem('papelera', …)` no loguea** (`INTERNA` + `controlLog`
   devuelve false para `papelera`). La skill `subsistema-papelera` lo lista como escritor
   de `logs`; en la rama de no-operaciones el que escribe es `addItem`.
4. **La skill `subsistema-papelera` dice que `updateItem` es "lo único fuera de la
   Papelera legado que todavía referencia a `LogService`".** Es correcto en cuanto a
   referencias, pero `updateItem` no tiene callers: no hay escritura viva de `logs` fuera
   de la Papelera legado.
5. **Restauración legada de no-operaciones usa `DbFirestoreService.create` = `addDoc`:**
   el objeto restaurado recibe un **id de documento nuevo**, no el original. Para
   `clientes`/`choferes`/`proveedores` (ya migrados, con id = doc id) eso produce una
   entidad con id distinto al que referencian operaciones y tarifas. Para
   `facturaCliente/Chofer/Proveedor` la escritura falla por reglas (`legacySoloLectura`),
   y como `addItem` no se espera, `PapeleraLegadoComponent` muestra "restaurado" igual
   y borra el `LogDoc` de `papelera` (se pierde el objeto). No cambia la decisión, la
   refuerza; sirve para el relevamiento de producción.
6. **`PermisosService.matrizBase.papelera` no coincide con `firestore.rules`:** la matriz
   tiene `admin.editar = false`, `user.leer = false` y `demo.leer = false`; las reglas
   permiten los tres. `matrizBase.logs` coincide con las reglas. No es de este frente
   pero aparece al tocar el bucket.
7. **`ObjetoPapeleraComponent` está en `SharedModule`**, cargado por 14 módulos: su
   retiro achica el chunk común, no solo el de Ajustes.
8. **`PapeleraLegadoComponent.ngOnInit` abre un listener extra** vía
   `StorageService.syncChangesLimit('papelera', …)` cuyo resultado se descarta, y
   `addItem` vuelve a llamar `ngOnInit` tras cada restauración (listeners y
   suscripciones acumuladas). Irrelevante si se elimina.
9. **`createLogEntry` y `getAllStateChangesByField`/`listenForChangesField`** ya están sin
   caller externo hoy, independientemente de este frente.
