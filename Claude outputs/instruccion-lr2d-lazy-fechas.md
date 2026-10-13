````
Si no ves la línea FIN DE LA INSTRUCCIÓN LR2d al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN LR2d — Frente Lazy loading + fechas (ApLog, rama refactor)
======================================================================
Limpieza de código sin uso (4/4): miembros sueltos y cascada final

## Contexto y razonamiento

Último bloque de la limpieza. Salen los miembros sueltos que quedaban de
los ~115 y lo que queda huérfano en cascada por LR2a, LR2b y este mismo
bloque.

**Cómo se fijó el alcance:**
- Referencias del compilador de TypeScript, uso en templates y cascada
  iterada hasta cero.
- Con este bloque aplicado, el análisis completo de src/app (servicios,
  utils, interfaces y componentes por selector) ya no encuentra NADA sin
  uso, salvo los falsos positivos conocidos:
  - `canMatch` y `canActivate` del guard (los usa el router);
  - `resetearPassword` y `puedeVer` (se usan en templates);
  - las funciones nuevas de fecha.util (para FE2 a FE5).

**Qué sale** (12 archivos):

| Archivo | Sale | Por qué |
|---|---|---|
| log.service | `logEventDoc` + import `LogDoc` | solo lo usaban métodos de StorageService retirados en LR2a |
| chofer.service | `esOperable` | sin uso |
| proveedor.service | `getVehiculosPorProveedor` | sin uso (el que se usa es el de ChoferService, que se queda) |
| vigencia-tarifa.util | `finVigencia` | export sin uso |
| date-range.service | `buildSemanaActual` | sin uso; además calculaba con new Date |
| tarifa-gral-cliente.ts | interfaces `TarifaGralCliente` y `AdicionalTarifa` | sin uso (el resto del archivo se queda) |
| asignacion.service | `getAsignacionActual`, `agregarItem`, `actualizarItem` | sin uso, o solo los usaba TableroService.actualizarAsignacionDesdeOperacion |
| numerador.service | `generarNumeroInterno`, `leerProximoNumeroMovimiento` | solo los usaba código retirado en LR2b, o el módulo viejo de Finanzas |
| informe-op.service | `obtenerPorPeriodo` + 3 imports | sin uso (el listado usa observarPorPeriodo) |
| operacion.service | `getOperacionesActuales` | sin uso |
| tablero.service | `actualizarAsignacionDesdeOperacion` + import `ConId` | reemplazado por OperacionService.editarOperacion |
| db-firestore.service | `getInformesOpPorPeriodo` | solo lo usaba obtenerPorPeriodo |

**Comentarios que quedarían falsos y se corrigen:**
- numerador: dos referencias a métodos que salen;
- asignacion: la referencia a `actualizarItem` y al TODO de TableroService;
- db-firestore: el comentario de `observarInformesOpPorPeriodo`, que se
  definía como "hermano" del que sale.

El comentario histórico de `OperacionService.editarOperacion` ("Reemplaza
al viejo … actualizarAsignacionDesdeOperacion") se deja: cuenta de dónde
viene.

**Fuera de alcance, queda anotado:**
- `OperacionService` inyecta `formNumServ` sin usarlo. Es una propiedad
  del constructor y no entraba en el análisis de los ~115.

No cambia comportamiento.

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
- **Borrado por RANGO** (igual que en LR2a a LR2c). Se borra desde INICIO
  (inclusive) hasta la línea anterior a ANCLA (ANCLA se queda). Las dos se
  identifican por cómo EMPIEZA la línea, con la sangría indicada. Antes de
  borrar, verificá:
  - que cada prefijo sea único en el archivo;
  - que ANCLA esté después de INICIO;
  - que la distancia sea exactamente la indicada.
  Si algo no coincide, detenete y reportá sin borrar.
  Dos variantes nuevas:
  - **INICIO "N líneas ARRIBA de X":** el rango empieza en el `/**` del
    comentario de documentación del método. Contá N líneas hacia arriba
    desde la que empieza con X.
  - **ANCLA "última línea `}`":** la última línea del archivo cuyo
    contenido es exactamente `}` (cierra la clase).

## PASO 0 — Verificación (sin modificar nada)

Corré y reportá la salida:

```
grep -rnE "\b(logEventDoc|esOperable|finVigencia|buildSemanaActual|TarifaGralCliente|AdicionalTarifa|getAsignacionActual|agregarItem|actualizarItem|generarNumeroInterno|leerProximoNumeroMovimiento|obtenerPorPeriodo|getOperacionesActuales|actualizarAsignacionDesdeOperacion|getInformesOpPorPeriodo|getVehiculosPorProveedor)\b" src --include=*.ts --include=*.html
sed -n 190,191p src/app/raiz/proveedores/proveedores-listado/proveedores-listado.component.ts
grep -rn "log-doc'" src --include=*.ts
```

Esperado:
1. Solo:
   - las definiciones de lo que sale (cada archivo de la tabla);
   - las llamadas internas entre piezas que salen juntas:
     - informe-op.service:123 llama a getInformesOpPorPeriodo;
     - tablero.service:27 llama a actualizarItem;
   - comentarios: numerador:51, :54 y :111; asignacion:189 y :191;
     operacion:669; db-firestore:629 y :647; chofer.service:147;
   - el `getVehiculosPorProveedor` de chofer.service:124, que se queda, y
     su uso en proveedores-listado:191.
   Ningún otro uso.
2. `this.choferService` / `.getVehiculosPorProveedor(...)`: la llamada es
   al de ChoferService, no al de ProveedorService (que sale).
3. log-doc: log.service.ts y objeto-papelera.component.ts. La interfaz
   LogDoc se sigue usando en objeto-papelera; solo sale su import de
   log.service.

Si aparece cualquier otro uso, detenete y reportá.

## PASO 1 — src/app/servicios/log/log.service.ts

1.1 Borrá la línea COMPLETA que contiene:
```
import { LogDoc } from 'src/app/interfaces/log-doc';
```
por:
```
(borrar la línea)
```

`logEventDoc` con su comentario de documentación (último método de la clase; solo lo usaban métodos de StorageService retirados en LR2a):

1.2 RANGO (30 líneas).
- INICIO: la línea que está 3 líneas ARRIBA de la que empieza con (2 espacios de sangría):
```
  async logEventDoc(
```
  (es la apertura `/**` de su comentario de documentación).
- ANCLA (se queda): la ÚLTIMA línea del archivo cuyo contenido es exactamente `}` (cierra la clase).


## PASO 2 — src/app/servicios/choferes/chofer.service.ts

`esOperable`:

2.1 RANGO (7 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  esOperable(chofer: ConIdType<Chofer>, vehiculos: ConIdType<Vehiculo>[]): boolean {
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  vehiculoToFirestore(
```


## PASO 3 — src/app/servicios/proveedores/proveedor.service.ts

`getVehiculosPorProveedor` de ProveedorService (sin uso; el que se usa es el de ChoferService, que se queda):

3.1 RANGO (9 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  getVehiculosPorProveedor(idProveedor: string): Observable<ConIdType<Vehiculo>[]> {
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  async guardarProveedorConVehiculos(
```


## PASO 4 — src/app/shared/utils/vigencia-tarifa.util.ts

`finVigencia` (exportada, sin uso), con su comentario:

4.1 RANGO (7 líneas).
- INICIO: la línea que empieza con (0 espacios de sangría):
```
/** Fin exclusivo ('YYYY-MM-DD') del intervalo de vigencia de `version`, o
```
- ANCLA (se queda): la línea que empieza con (0 espacios de sangría):
```
function finConSucesoras<
```


## PASO 5 — src/app/servicios/fechas/date-range.service.ts

5.1 BUSCAR:
```
    return this.subject.value;
  }

  private buildSemanaActual(): DateRange {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + (day === 0 ? -6 : 1));

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return { desde: monday, hasta: sunday, tipo: 'semana' };
  }
```
REEMPLAZAR:
```
    return this.subject.value;
  }
```


## PASO 6 — src/app/interfaces/tarifa-gral-cliente.ts

Interfaz `TarifaGralCliente` (sin uso):

6.1 RANGO (13 líneas).
- INICIO: la línea que empieza con (0 espacios de sangría):
```
export interface TarifaGralCliente {
```
- ANCLA (se queda): la línea que empieza con (0 espacios de sangría):
```
export interface CategoriaTarifa {
```

Interfaz `AdicionalTarifa` (solo la usaba TarifaGralCliente):

6.2 RANGO (8 líneas).
- INICIO: la línea que empieza con (0 espacios de sangría):
```
export interface AdicionalTarifa {
```
- ANCLA (se queda): la línea que empieza con (0 espacios de sangría):
```
export interface AdicionalKm {
```


## PASO 7 — src/app/servicios/operaciones/asignacion.service.ts

`getAsignacionActual`:

7.1 RANGO (4 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  getAsignacionActual(): Asignacion | null {
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  /** Abre listener vivo sobre el documento de la fecha. Cancela el listener anterior. */
```

`agregarItem`:

7.2 RANGO (22 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  /** Agrega un item a un tablero existente; si no existe, lo crea. Log: EDITAR. */
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  /** Puro: devuelve items con el idOperacion dado marcado como anulado. Sin efectos de red. */
```

`actualizarItem` (solo lo usaba TableroService.actualizarAsignacionDesdeOperacion, que sale abajo):

7.3 RANGO (16 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  /** Actualiza observacion/hojaDeRuta de un item por idOperacion. Log: EDITAR.
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  /** Borra un borrador. SOLO si asignado===false. Log: BAJA. */
```

7.4 BUSCAR:
```
   *  `escrituras`. Extraído de actualizarItem() para que un caller externo (ej.
   *  OperacionService.editarOperacion) pueda incluir esta escritura en SU PROPIO
   *  batch atómico — ver TODO en TableroService.actualizarAsignacionDesdeOperacion. */
```
REEMPLAZAR:
```
   *  `escrituras`, para que un caller externo (ej.
   *  OperacionService.editarOperacion) pueda incluir esta escritura en SU PROPIO
   *  batch atómico. */
```


## PASO 8 — src/app/servicios/numerador/numerador.service.ts

`generarNumeroInterno` (solo lo usaba DbFirestoreService.asignarNumerosInternosFaltantes, retirado en LR2b):

8.1 RANGO (34 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  async generarNumeroInterno(tipo:
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  /** Lee el próximo número interno de liquidación DENTRO de una transacción
```

8.2 BUSCAR:
```
   *  EscrituraBatch[] (commitEnTransaccion). Misma serie y formato que
   *  generarNumeroInterno (LQCL/LQCH/LQPR-0000), pero sin transacción propia:
   *  el número solo se consume si commitea la transacción completa del
   *  caller, así que no quedan huecos por fallos posteriores. Mismo patrón
   *  que leerProximoNumeroMovimiento. */
```
REEMPLAZAR:
```
   *  EscrituraBatch[] (commitEnTransaccion). Serie LQCL/LQCH/LQPR-0000, sin
   *  transacción propia: el número solo se consume si commitea la transacción
   *  completa del caller, así que no quedan huecos por fallos posteriores. */
```

8.3 BUSCAR:
```
   *  No confundir con leerProximoNumeroMovimiento (módulo viejo: 'RC'/'OP',
   *  sin escritura); el contador 'RC' es el mismo documento para los dos. */
```
REEMPLAZAR:
```
   *  El contador 'RC' es el mismo documento que usaba el módulo viejo de
   *  Finanzas. */
```

`leerProximoNumeroMovimiento` (módulo viejo de Finanzas, sin uso; último método de la clase):

8.4 RANGO (24 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  async leerProximoNumeroMovimiento(
```
- ANCLA (se queda): la ÚLTIMA línea del archivo cuyo contenido es exactamente `}` (cierra la clase).


## PASO 9 — src/app/servicios/informes-op/informe-op.service.ts

9.1 BUSCAR:
```
import { QueryDocumentSnapshot, DocumentData, Transaction } from '@angular/fire/firestore';
```
REEMPLAZAR:
```
import { Transaction } from '@angular/fire/firestore';
```

9.2 BUSCAR:
```
import { DbFirestoreService, EscrituraBatch, PaginaResultado } from 'src/app/servicios/database/db-firestore.service';
```
REEMPLAZAR:
```
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
```

`obtenerPorPeriodo` (sin uso; el listado usa observarPorPeriodo):

9.3 RANGO (11 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  async obtenerPorPeriodo(
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  /** InformeOp que componen un InformeLiqNuevo
```


## PASO 10 — src/app/servicios/operaciones/operacion.service.ts

`getOperacionesActuales`:

10.1 RANGO (4 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  getOperacionesActuales(): ConId<Operacion>[] {
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  /** Consulta puntual por id
```


## PASO 11 — src/app/servicios/tablero/tablero.service.ts

11.1 Borrá la línea COMPLETA que contiene:
```
import { ConId } from 'src/app/interfaces/conId';
```
por:
```
(borrar la línea)
```

`actualizarAsignacionDesdeOperacion` (reemplazado por OperacionService.editarOperacion, que hace las dos escrituras en un solo batch):

11.2 RANGO (9 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  /** Actualiza observacion/hojaDeRuta de la asignación en el tablero.
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  /** Restaurar op desde papelera:
```


## PASO 12 — src/app/servicios/database/db-firestore.service.ts

`getInformesOpPorPeriodo` (solo lo usaba InformeOpService.obtenerPorPeriodo, que sale en este bloque):

12.1 RANGO (40 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  /** Paginado de informesOp por período + tipo
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  /** Hermano en vivo de getInformesOpPorPeriodo
```

12.2 BUSCAR:
```
  /** Hermano en vivo de getInformesOpPorPeriodo — sin paginar, con estados
```
REEMPLAZAR:
```
  /** InformeOp de un período en vivo, sin paginar, con estados
```

12.3 BUSCAR:
```
    // Mismo problema y mismo fix que getInformesOpPorPeriodo: collectionData
    // con idField solo agrega 'id', no 'idInfOp'.
```
REEMPLAZAR:
```
    // collectionData con idField solo agrega 'id', no 'idInfOp'.
```

## Verificación

1. Greps (reportá la salida):
```
grep -rnE "\b(logEventDoc|esOperable|finVigencia|buildSemanaActual|TarifaGralCliente|AdicionalTarifa|getAsignacionActual|agregarItem|actualizarItem|generarNumeroInterno|leerProximoNumeroMovimiento|obtenerPorPeriodo|getOperacionesActuales|actualizarAsignacionDesdeOperacion|getInformesOpPorPeriodo|getVehiculosPorProveedor)\b" src --include=*.ts --include=*.html
git diff --numstat -- src
git diff -U0 -- src | grep -n "^+.* $"
```
Esperado:
- (a) solo 4 líneas:
  - chofer.service.ts:124 (definición de `getVehiculosPorProveedor` de
    ChoferService) y :140 (comentario);
  - operacion.service.ts:665 (comentario histórico);
  - proveedores-listado.component.ts:191 (uso de la de ChoferService).
- (b) exactamente (agregadas / borradas):
  - tarifa-gral-cliente.ts 0/21;
  - chofer.service.ts 0/7;
  - db-firestore.service.ts 2/43;
  - date-range.service.ts 0/12;
  - informe-op.service.ts 2/13;
  - log.service.ts 0/31;
  - numerador.service.ts 5/65;
  - asignacion.service.ts 2/44;
  - operacion.service.ts 0/4;
  - proveedor.service.ts 0/9;
  - tablero.service.ts 0/10;
  - vigencia-tarifa.util.ts 0/7.
- (c) nada.

2. `npm run build:demo`. Reportá la tabla de tamaños y las advertencias.
   Referencia (medido sobre una copia del repo con LR2c + este cambio):
   - main.js ≈ 1,10 MB (280,2 kB transfer);
   - Initial total ≈ 1,53 MB (347,4 kB transfer);
   - las mismas 9 advertencias.

## Pruebas manuales en demo (las hace Nico)

1. Operaciones:
   - alta, edición y cierre de una operación;
   - en el tablero de asignaciones, asignar un chofer y editar la
     observación y la hoja de ruta de una operación asignada
     (`editarOperacion` + `agregarEscrituraActualizarItem`, que se quedan);
   - restaurar una operación desde la Papelera.
2. Liquidación: Informes (listado en vivo por período), liquidar y emitir.
   La numeración LQCL/LQCH/LQPR sigue correlativa.
3. Finanzas: registrar un cobro y un pago. Los números RC-/OPG- siguen
   correlativos.
4. Proveedores: abrir el modal de choferes y vehículos de un proveedor.
5. Tarifas: alta de una versión nueva y ver el historial (vigencias).
6. Choferes: alta de un chofer con vehículo. Ajustes → Papelera legado:
   abrir un objeto.

## Mensaje de commit

```
LR2d (lazy-fechas): miembros sueltos sin uso y cascada final

- Fuera: LogService.logEventDoc, ChoferService.esOperable,
  ProveedorService.getVehiculosPorProveedor, finVigencia,
  DateRangeService.buildSemanaActual, interfaces TarifaGralCliente y
  AdicionalTarifa, AsignacionService.getAsignacionActual/agregarItem/
  actualizarItem, NumeradorService.generarNumeroInterno/
  leerProximoNumeroMovimiento, InformeOpService.obtenerPorPeriodo,
  OperacionService.getOperacionesActuales,
  TableroService.actualizarAsignacionDesdeOperacion y
  DbFirestoreService.getInformesOpPorPeriodo; imports sin uso.
- Comentarios corregidos donde nombraban métodos retirados.
- Cierra la limpieza LR2: sin miembros sin uso en src/app salvo falsos
  positivos conocidos (guard, templates, fecha.util para FE2–FE5).
```

FIN DE LA INSTRUCCIÓN LR2d
````
