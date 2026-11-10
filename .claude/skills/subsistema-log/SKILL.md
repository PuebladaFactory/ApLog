---
name: subsistema-log
description: Mecanismo unificado de log de ApLog (LogRegistroService, colección registroLog, agregarAlBatch dentro del commitBatch) — cómo se loguean ALTA/EDITAR/BAJA/RESTAURAR en el mismo batch atómico, las cascadas, la pantalla RegistroLogComponent, login/logout, gestión de usuarios y el log viejo (colección logs, LogService retirado; RegistroComponent como histórico). Leer antes de trabajar sobre cualquier escritura que deba loguearse, el registro de actividad o la auditoría de cambios.
---

## Frente Log — mecanismo unificado (Frente 1, Agosto 2026)

Reemplaza el mecanismo disperso de logging (StorageService acoplado a cada CRUD +
coordinadores atómicos llamando directo a `LogService`, con duplicados y registros
faltantes confirmados) por un mecanismo único: **el registro de log es una escritura
más dentro del mismo batch atómico que persiste el negocio**, no una llamada separada
después. Si el batch no commitea, no hay log; si commitea, el log está garantizado
adentro — estructuralmente imposible tener log duplicado o faltante en las mutaciones
migradas.

**Piezas nuevas, convivían con las viejas** (hasta que `LogService` y `log-doc.ts` se
eliminaron, ver "Hecho — eliminación del log viejo"):
- `interfaces/registro-log.ts` (`RegistroLog`, `AccionLog`, `CambioCampo`) — nueva,
  no reemplaza a `log-entry.ts`/`log-doc.ts`.
- `LogRegistroService` (`servicios/log-registro/`) — nuevo, no reemplaza a `LogService`
  (`servicios/log/`). Colección nueva `registroLog`, no reemplaza a `logs`.
  `agregarAlBatch(escrituras, accion, coleccion, idObjet, details)` agrega la entrada
  de log al MISMO `EscrituraBatch[]` que el caller ya armó para su negocio (no
  commitea — el caller sigue llamando `db.commitBatch(escrituras)` después). Para
  `accion === 'EDITAR'` hace una lectura one-shot (`DbFirestoreService.getById`, nuevo
  método, agregado en este frente) del documento ANTES del commit y diffea
  superficialmente (top-level, sin recursión en anidados) contra los datos que ya
  están en `escrituras`, poblando `cambios?: CambioCampo[]` solo si hubo diffs.
  `registrarAccion` (REIMPRIMIR/DESCARGAR — sin mutación, sin batch al que atarse) y
  `registrarError` (siempre suelto, fuera de cualquier batch) completan la API.
  Exclusión del rol `'dev'`: centralizada en un único punto (`construirEntrada`
  privado, devuelve `null`) — no hay otro camino para escribir un `RegistroLog`, a
  diferencia del mecanismo viejo donde cada caller de `StorageService`/`LogService`
  repetía `!usuarioSesion.esRol('dev')` por su cuenta (y al menos un caller,
  `AsignacionService.registrarLog`, se olvidaba de hacerlo — bug real corregido como
  efecto colateral de este frente en los métodos migrados).

**Migrado en este frente:**
- CRUD directo de Clientes/Choferes/Proveedores (y `vehiculos`, sub-entidad de
  Choferes/Proveedores): ALTA, EDITAR y BAJA SIMPLE (`ClienteService.guardarCliente`,
  `ChoferService`/`ProveedorService` — sus escrituras de entidad principal y de
  vehículos en `guardarChoferConVehiculos`/`guardarProveedorConVehiculos`, más las
  bajas de vehículo dentro de `eliminarChoferConVehiculos`/
  `eliminarProveedorConVehiculos`). ⚠️ **Granularidad de LOG preservada, pero
  atomicidad de ESCRITURA consolidada en el Frente 2** (ver más abajo) — al cerrar
  este Frente 1, Choferes/Proveedores todavía hacían un `commitBatch` separado por
  cada escritura de la cascada (chofer, cada vehículo alta/baja); el Frente 2 lo
  corrigió a un solo `commitBatch` por cascada sin perder ningún registro de log.
- `OperacionService.altaDesdeAsignacion`: el `logService.logEvent('ALTA', ...)` que
  antes corría DESPUÉS de `commitBatch` ahora se arma con `agregarAlBatch` ANTES,
  dentro del mismo batch que ya escribía operaciones + tablero. Catch → `registrarError`.
- `AsignacionService.guardarBorrador` / `agregarItem` / `actualizarItem` /
  `descartarBorrador`: pasaron de escritura suelta (`setDocSinId`/`deleteItem` +
  `registrarLog` después, sin atomicidad entre ambas) a `EscrituraBatch[]` de una sola
  escritura + `agregarAlBatch` + `commitBatch`.

Lo que este Frente 1 dejó afuera (bajas con papelera, Vendedores, Tarifas, Facturación,
Liquidaciones, Finanzas) se migró en frentes posteriores. El estado vigente es el
inventario de abajo, no la lista de exclusiones original.

### Cobertura de `registroLog` — qué llega y qué no (relevado 2026-11-03)

Relevado desde el código (callers de `agregarAlBatch`, `registrarMutacionSuelta`,
`registrarAccion` y `registrarError`, y todo escritor de `DbFirestoreService`,
`StorageService` y del SDK de Firestore). **Revisar antes de tocar el log y antes del corte
a Vantruck** (ver "Decisión — sin migración de `logs` a `registroLog`").

Regla transversal: **nada que haga el rol `dev` llega a `registroLog`**
(`construirEntrada` devuelve `null`). Incluye todo `/migracion`, que es sólo `dev`.

**Lo que sí llega.** Una entrada por gesto, con la colección de la entidad dueña. Las
escrituras derivadas del mismo gesto van en el mismo batch o transacción y no tienen
entrada propia.

| Módulo | Colección del log | Acciones | Dónde (servicio, método) | Derivadas sin entrada propia |
|---|---|---|---|---|
| Clientes | `clientes` | ALTA, EDITAR, BAJA, RESTAURAR | `ClienteService.guardarCliente` / `eliminarCliente` / `restaurarCliente` | papelera |
| Choferes | `choferes`, `vehiculos`, `legajos` | ALTA, EDITAR, BAJA, RESTAURAR (una entrada por escritura de la cascada) | `ChoferService.guardarChoferConVehiculos` / `eliminarChoferConVehiculos` / `restaurarChofer` | papelera |
| Proveedores | `proveedores`, `vehiculos`, `choferes`, `legajos` | ALTA, EDITAR, BAJA, RESTAURAR | `ProveedorService.guardarProveedorConVehiculos` / `eliminarProveedorConVehiculos` / `restaurarProveedor` (la baja arrastra a sus choferes y legajos) | papelera |
| Activar / desactivar | `clientes`, `choferes`, `proveedores` | EDITAR (el diff muestra `activo` anterior → nuevo) | `ActivacionEntidadService.cambiarActivo` (desde `ModalObjetosActivosComponent`, que abren `carga-asignacion` y `tablero-asignaciones`) | — |
| Legajos | `legajos`, `documentacionHistorial` | EDITAR (documentación), ALTA (archivado al historial) | `LegajoService.guardarDocumentacion` | — |
| Categorías de documentación | `categoriasDocumentacion` | ALTA, EDITAR | `CategoriaDocumentacionService` | — |
| Operaciones | `operaciones` | ALTA, EDITAR, CERRAR, BAJA (abierta y cerrada), RESTAURAR | `OperacionService.altaDesdeAsignacion` / `editarOperacion` / `cerrarOperacion` / `bajaOperacion` / `bajaOperacionCerrada` / `restaurarOperacion` | `asignaciones` (item), `informesOp`, `resumenesOp`, `comisionesVenta`, `registrosOpEventuales`, numerador, papelera |
| Asignaciones | `asignaciones` | ALTA, EDITAR, BAJA | `AsignacionService.guardarBorrador` / `agregarEscrituraActualizarItem` / `descartarBorrador` | — |
| No disponibilidad | `noDisponibilidades` | ALTA, EDITAR, ANULAR | `NoDisponibilidadService` | — |
| InformeOp | `informesOp` (+ `operaciones`) | EDITAR | `InformeOpService.armarEscriturasEdicion` (vía `editar` o `InformeLiqService.editarInformeOp`) | — |
| Liquidación / Facturación | `informesLiq` | ALTA (borrador), EMITIR, EDITAR, BAJA (eliminar borrador), REVERTIR, FACTURAR, DESVINCULAR | `InformeLiqService` (todos sus orquestadores) | `informesOp`, `operaciones`, `informesLiqSnapshots`, `facturasVinculadas`, compensaciones en `movimientosFin`, numerador |
| Tarifas | `tarifas`, `tarifasEspeciales` | ALTA, EDITAR (versión nueva), BAJA | `TarifarioService.crearTarifa` / `crearTarifaEspecial` / `versionarEnTransaccion` / `darDeBajaEnTransaccion` | — |
| Eventuales | `registrosOpEventuales` | ALTA | `TarifarioService.crearRegistroEventual`: **sólo la usa la migración del historial** (`TarifaMigrationService`, `/migracion`, rol `dev`), así que en la práctica no genera entradas. El alta y la anulación reales van como derivadas del CERRAR y la BAJA de la operación | — |
| Vendedores | `vendedores` | ALTA, EDITAR, BAJA (desactivar), RESTAURAR (reactivar) | `VendedorService.guardarVendedor` / `desactivar` / `reactivar` | asignaciones en `clientes` |
| Comisiones | `liquidacionesVenta` | EMITIR, PAGAR, REVERTIR, ANULAR | `LiquidacionVentaService` | `comisionesVenta`, numerador |
| Finanzas | `movimientosFin` | COBRAR / PAGAR (`registrar`, `registrarDevolucion`), AJUSTAR (`registrarAjuste`, `cerrarSaldo`), IMPUTAR, ANULAR | `MovimientoFinService` | `informesLiq` (valores financieros), numerador |
| Datos de la empresa | `configuracion` | ALTA, EDITAR | `ConfiguracionEmpresaService` | — |
| Usuarios | `users` | ALTA, EDITAR, BAJA (con `registrarMutacionSuelta`, después de la Cloud Function, best-effort y no atómico); LOGIN, LOGOUT (también el del cierre por inactividad, ver abajo) | `ModalUsuarioComponent`, `GestionUsuariosComponent`, `AuthService`, `SesionInvalidaService.cerrarSesionForzada('inactividad')` | — |
| Sin mutación | `informesLiq`, `movimientosFin` | REIMPRIMIR (Excel/PDF de una liquidación; PDF de un recibo u orden de pago). `DESCARGAR` existe en `AccionLog` sin uso | `LiquidacionExportService`, `ReciboPdfService` | — |

**Lo que muta y no deja rastro en `registroLog`:**

| Mutación | Dónde | Qué escribe | Rastro |
|---|---|---|---|
| Mostrar / ocultar en los listados (clientes, choferes, proveedores, legajos) | `VisibilidadListadosComponent.actualizarObjeto` | Sólo `visible`, con `DbFirestoreService.updateConResultado` | **Ninguno, por decisión** (ver "Asimetría `activo` / `visible`" abajo) |
| Recalcular el estado de los legajos y la colección `vencimientos` | Cloud Function `verificarVencimientosDocumentacion` (programada) | `legajos` (estado), `vencimientos` (se reconstruye entera) | Ninguno: escritura del servidor, sin usuario |
| Reservar números de operación | `NumeradorService.reservarRangoOperaciones` (transacción propia, antes del alta) | `numeradores/OPER` | Ninguno, por diseño: contador técnico. Los demás numeradores van dentro del batch del gesto |
| Herramientas de `/migracion` | `servicios/desarrollo/*` (generadores, limpieza, recálculos, normalización) y `servicios/migracion/*` (SDK de Firestore directo) | Varias | Ninguno: son sólo `dev`, que está excluido igual |
| Cualquier mutación hecha por un usuario `dev` | — | — | Ninguno, por diseño |
| LOGIN fallido | `AuthService.iniciarSesion` | — | Ninguno: sin usuario autenticado, las reglas rechazan la escritura (ver "Limitación conocida" en el complemento de login/logout) |
| Cierre de sesión por la red de sesión inválida | `SesionInvalidaService.cerrarSesionForzada('vencida')` (eje de sesión, bloque 2b) | Ninguna escritura: limpia la sesión, `signOut` y recarga `/login` | **Ninguno, a propósito:** no es un gesto del usuario, y con la sesión ya inválida no hay token con el que escribir. Deja un `console.warn`. El cierre por **inactividad** (bloque 4) sale por el mismo método y **sí escribe LOGOUT**: es un cierre real y atribuible, con token válido (`cierreEscribeLogout` decide por el motivo) |
| LOGOUT sin conexión | `AuthService.cerrarSesion` y el cierre por inactividad | El `setDoc` del LOGOUT | Se espera como mucho 3 s antes de la carga completa de `/login`; si no se confirma, se pierde con la recarga (caché de memoria). Antes de esa espera acotada, un logout sin conexión quedaba colgado para siempre |

**Asimetría `activo` / `visible` — decidida, no es un olvido (2026-11-03).** Los dos son
un switch por entidad sobre un campo booleano del mismo documento, y sólo uno loguea:

- **`activo` loguea** (EDITAR, en el mismo batch, `ActivacionEntidadService.cambiarActivo`)
  porque **decide quién puede ser asignado**: el pool de `tablero-asignaciones` y
  `carga-asignacion` sacan al inactivo. Filtra al leer, **no escribe cascada**: los
  vehículos de un chofer o proveedor inactivo salen del pool porque se filtran, no porque
  se les escriba algo. Una asignación ya cargada **sobrevive** a la desactivación a
  propósito (`fb9e6bf`: "activar para un solo viaje"). EDITAR y no BAJA/RESTAURAR: para
  estas entidades BAJA es la baja con papelera, y reusarla mezclaría dos gestos en el
  Registro (en Vendedores sí es BAJA porque ahí desactivar *es* la baja).
- **`visible` no loguea, en ninguna entidad**, porque es preferencia de presentación de
  los listados: no cambia qué se puede hacer con la entidad. **Los legajos sí logueaban**
  (`LegajoService.toggleVisibilidad`, EDITAR): ese log se sacó a propósito, junto con el
  método, para que el mismo switch no tenga dos políticas. No es una regresión: no lo
  "arregles".

Antes de esto, los dos gestos escribían sin rastro: `activo` con un TODO que proponía
`'INTERNA'` (o sea, ningún log) y `visible` por `StorageService.updateItem(…, 'INTERNA', …)`,
que además escribía el objeto en memoria entero, incluido `idXxx`.

Código muerto que escribiría sin log, sin caller desde ningún template:
`ProveedoresListadoComponent.actualizarActivos` (`actualizarMultiple` sobre `proveedores`
con datos de prueba).

**Pantallas:** `RegistroLogComponent` (Frente 3, más abajo) lee `registroLog`.
`RegistroComponent` sigue leyendo `logs` (directo por `DbFirestoreService`, ver "Hecho —
eliminación del log viejo"). Su pestaña en Ajustes está comentada y la ruta
`ajustes/registro` sigue viva: es el histórico congelado del log viejo.

### Frente 2 — consolidación de cascadas en batch (Chofer/Proveedor/Legajos, Agosto 2026)

Continuación directa del Frente 1. Cerraba una brecha real: las cascadas de
Chofer/Proveedor (entidad principal + N vehículos, + legajo en el alta de Chofer) y de
Legajos (archivado de histórico + actualización del legajo) seguían haciendo un
`commitBatch` **separado por cada escritura** — atómico escritura-por-escritura (log
garantizado con su propio write, el problema que resolvió el Frente 1), pero NO atómico
entre sí: si fallaba el segundo vehículo de tres, el chofer y el primer vehículo ya
habían quedado committeados, dejando un estado a medio camino sin ningún rollback.
Decisión de diseño explícita (evaluada antes de implementar): **un solo
`EscrituraBatch[]`/`commitBatch` por cascada, con un `agregarAlBatch` por cada escritura
real** — atomicidad completa de la cascada SIN perder granularidad de auditoría (mismo
número de entradas en `registroLog` que antes, cada vehículo/legajo con su propio
`idObjet`/`details`). Se descartó a propósito la alternativa de consolidar también los
logs en una sola entrada por cascada: el diff `cambios` de
`LogRegistroService.agregarAlBatch` es inherentemente de un solo documento (lee un
"anterior" y lo compara contra una escritura de esa misma colección+id) — condensar
chofer+vehículos en un único registro EDITAR habría perdido el diff estructurado de los
vehículos (quedaría prosa armada a mano en `details`), sin ninguna ganancia real de
atomicidad sobre la opción elegida.

**Chofer/Proveedor + vehículos** (`ChoferService.guardarChoferConVehiculos`,
`ProveedorService.guardarProveedorConVehiculos`, alta y edición de ambos):
- **Reconciliación por `dominio`** en la rama de edición (`ChoferService.reconciliarVehiculos`,
  pública — `ProveedorService` la reusa vía `this.choferService.reconciliarVehiculos(...)`
  en vez de duplicarla, ya que solo necesita `vehiculoToFirestore`, que ChoferService ya
  posee y expone; mismo patrón de delegación que `getVehiculosPorProveedor`). `dominio`
  es la única clave de negocio estable que tiene `Vehiculo` — no hay persistencia por id
  estable (cada guardado históricamente reconstruía la lista completa de vehículos del
  chofer/proveedor, borrando y recreando todos). Los vehículos idénticos (mismo dominio,
  mismos datos — comparados campo por campo con `vehiculosIguales`, no con
  `JSON.stringify` del objeto completo, para no depender del orden de claves; mismo
  criterio que `LogRegistroService.diffCampos`) se excluyen del batch por completo: sin
  escritura, sin log. El resto (agregados, sacados, o mismo dominio con datos distintos)
  se resuelve igual que antes de este frente — baja del doc viejo + alta de uno nuevo,
  ahora aplicado selectivamente en vez de a la lista entera.
  ⚠️ **Evaluado y descartado a propósito:** reconciliar por id estable (persistir
  vehículos con un id de negocio en vez de un id de Firestore nuevo en cada guardado,
  para que un vehículo editado apareciera como EDITAR con diff real en vez de
  BAJA+ALTA). Requeriría cambiar el modelo de persistencia de `vehiculos` completo —
  desproporcionado para este frente; la reconciliación por `dominio` ya resuelve el
  problema real (escrituras/logs innecesarios para vehículos sin cambios).
- **Alta de Chofer también incluye el legajo** en el mismo batch (ver punto siguiente)
  — único caso con 3 tipos de entidad en una sola cascada (chofer + vehículos + legajo).
  Alta/edición de Proveedor no crea legajo en ningún punto (los choferes de un
  proveedor se dan de alta vía `ChoferService.altaChofer`, con `contratacion.tipo:
  'proveedor'` — mismo camino y mismo legajo que cualquier chofer, no hay una cascada de
  legajo separada en `ProveedorService`; confirmado antes de implementar, no asumido).

**Legajo en las cascadas de Chofer/Proveedor** — `LegajoService` cambia de contrato:
antes escribía por su cuenta (fuera de cualquier batch), ahora PREPARA la escritura sin
ejecutarla, para que el dueño de la cascada (`ChoferService`/`ProveedorService`) la
pliegue a su propio `EscrituraBatch[]`:
- `crearLegajoParaChofer(idChofer): Promise<string>` (escribía) →
  `prepararLegajoVacio(idChofer): EscrituraBatch` (sincrónico — `LegajoFactoryService.crearLegajoVacio`
  ya era puro sin I/O, y `db.generarId` es local; no había ninguna razón real para que
  fuera async). El caller hace `escrituras.push(...)` + su propio `agregarAlBatch`.
- `eliminarLegajoDeChofer(idChofer): Promise<ConIdType<Legajo>|null>` (leía y escribía) →
  `prepararBajaLegajoDeChofer(idChofer): Promise<{legajo, escritura}|null>` (sigue
  async — todavía lee, vía `getByField`, para poder devolver el `legajo` completo que
  el caller necesita para su objeto compuesto de papelera; solo deja de escribir). Usado
  en `eliminarChoferConVehiculos` (baja de 1 legajo) y en
  `eliminarProveedorConVehiculos` (baja de N legajos, uno por cada chofer del
  proveedor — cascada confirmada existente antes de tocarla; mismo tratamiento).
- En ambas cascadas de baja, el chofer/proveedor en sí sigue en el camino viejo de
  papelera (`deleteItemPapeleraCompuestoAsync`, sin `EscrituraBatch[]` — no hay batch al
  que sumarse ahí, ver Frente 1). Lo que SÍ se consolida es el resto: vehículos + legajo
  (chofer) o vehículos + legajos de todos los choferes (proveedor), todos "sin papelera
  propia", en un único `commitBatch` después de la baja compuesta del dueño.
  **Vencido (Frente Papelera):** hoy la baja de chofer o proveedor es UN solo
  `commitBatch` con la entidad, los vehículos, los legajos, la papelera por referencia y
  sus logs; `deleteItemPapeleraCompuestoAsync` ya no se usa para estas entidades (skill
  `subsistema-papelera`).

**Resto del CRUD de Legajos** (fuera de las cascadas de alta/baja de Chofer/Proveedor),
migrado con el mismo patrón que Cliente/Chofer/Proveedor:
- `LegajoService.toggleVisibilidad`: `EscrituraBatch[]` de 1 + `agregarAlBatch('EDITAR', ...)`
  + `commitBatch`. **Retirado (2026-11-03):** la visibilidad dejó de loguearse en todas
  las entidades; ver "Asimetría `activo` / `visible`".
- `LegajoService.guardarDocumentacion`: antes hacía 1 `addItemAndGetId` a
  `documentacionHistorial` POR CADA documento reemplazado que ya tenía categoría, más 1
  `updateItemAsync` final a `legajos` — mismo problema de cascada no atómica que
  Chofer/Proveedor. Consolidado en un único `EscrituraBatch[]` (N archivados +
  actualización final), un `agregarAlBatch` por cada escritura real, un `commitBatch`.
  La subida a Storage (`StorageArchivosService`, resuelta por el caller ANTES de llamar
  a este método) no se tocó — sin cambio de comportamiento ahí.
- `CategoriaDocumentacionService` (`crearCategoria`/`editarNombreCategoria`/
  `toggleActiva`/`actualizarOrden`): los 4 eran escritura simple de un solo doc, sin
  cascada — migrados al patrón estándar (`crearConLog`/`editarConLog`, mismos helpers
  privados que ya usa `ChoferService`/`ProveedorService`).
- NO tocado: `LegajoService.getHistorialDocumento` (lectura, no escribe),
  `LegajoMigrationService` (script de migración de datos, ad-hoc, no es CRUD en vivo).

**`StorageService` queda sin ningún uso en `LegajoService`/`CategoriaDocumentacionService`**
tras este frente — import y constructor param eliminados de ambos (ya no había ningún
método que lo necesitara). Después del Frente Papelera tampoco lo usan
`ClienteService`/`ChoferService`/`ProveedorService`. (El servicio entero se eliminó en el
frente remanente de StorageService, 2026-11-04.)

**Verificado:** árbol compila limpio (`tsc --noEmit` + `ng build`); el error de budget de
bundle (8.65 MB vs. 7 MB) es el mismo preexistente de siempre, confirmado por
comparación directa contra el build previo al frente — la diferencia real introducida
por este frente es de apenas ~0.01 MB.

### Fix post-cierre — `registroLog` faltaba en `moduloDe()` de `firestore.rules`

Bloqueante real, no detectado por `tsc`/`ng build` (esos no validan Security Rules):
`registroLog` (colección nueva del Frente 1) nunca se agregó a `moduloDe()` —
colección sin mapeo explícito = denegada por defecto para los 4 roles, fail-safe ya
establecido del proyecto (ver "Security Rules" en CLAUDE.md). Efecto real: toda
escritura de `LogRegistroService` (incluida la de `agregarAlBatch`, adentro del mismo
`commitBatch` que el negocio) fallaba con `permission-denied` — y por venir empaquetada
dentro de un batch atómico, hacía fallar el batch ENTERO (chofer, operación, tablero,
lo que fuera), no solo el log. Bloqueaba incluso a `dev`, que en la matriz de `'logs'`
tiene las 4 acciones sin condición.

**Fix:** agregada `'registroLog': 'logs',` en `moduloDe()`, junto a la entrada ya
existente de `'logs'` — mismo patrón que `informesVenta`→`'operaciones'` o
`documentacionHistorial`→`'legajos'` (colección nueva que reusa el bucket de permisos
de una colección hermana ya mapeada, sin entrada propia en `permitido()`). Matriz
resultante para `registroLog` (heredada de la rama `modulo == 'logs'`): `dev`
leer/crear/editar/eliminar; `admin`/`user` leer/crear (no editar/eliminar — el
mecanismo nuevo nunca actualiza ni borra una entrada de log ya escrita, coherente);
`demo` solo leer.

**Verificado contra el emulador** (`functions/test-registro-log-rules.mjs`, nuevo,
mismo patrón que `test-vencimientos-rules.mjs`/`test-asignaciones-rules.mjs`): con el
fix, los 4 roles dan el resultado esperado (14/14 checks) — confirmado además
revirtiendo la línea temporalmente con el emulador corriendo (recarga las reglas solo
con guardar el archivo, sin reiniciar) y viendo caer a 5/14, incluido `dev`, antes de
restaurar el fix. Sin este chequeo contra el emulador el bug no se detecta: es
puramente de Security Rules, invisible para `tsc`/`ng build`.

**Deployado a `demoapplog`** — el fix quedó sin desplegar durante un tiempo (bloqueo
real contra el proyecto real mientras tanto), resuelto recién junto con el deploy de
Security Rules del Frente Papelera (`firebase deploy --only
firestore:rules,firestore:indexes --project demoapplog`, ver la skill
`subsistema-papelera`) — mismo archivo `firestore.rules`, un solo deploy cubrió ambos fixes
acumulados. NO deployado a `pf-logistics`/Vantruck, mismo criterio que el resto de
CLAUDE.md (ver "Cloud Functions" → orden de deploy).

### Frente 3 — pantalla `RegistroLogComponent` (Agosto 2026)

Pantalla nueva e independiente que lee exclusivamente de `registroLog` — NO toca
`RegistroComponent`/`LogService`/`logs`. Las dos fuentes de datos no se normalizan ni se
mezclan a propósito. (Al cerrar este frente se pensaba eliminar la pantalla vieja al
terminar la migración de módulos. **Vencido:** la decisión vigente es "Decisión — sin
migración de `logs` a `registroLog`", más abajo: `RegistroComponent` queda como histórico
congelado; `LogService` se eliminó junto con la Papelera legado.)

**Ubicación:** `raiz/ajustes/registro-log/` (mismo nivel que `registro/`/`papelera/`),
ruta `ajustes/registro-log` en `ajustes-routing.module.ts`, mismo `RoleGuard` que
`registro`/`papelera` (`dev`/`admin`/`demo` — sin `user`, mismo criterio ya establecido
para pantallas de auditoría). 4ta pestaña ("Registro Log") agregada al tab bar propio
de `AjustesControlComponent` (`tab4`), junto a Usuarios/Registro/Papelera. Hoy las
pestañas de Ajustes son Usuarios, Registro Log, Papelera y Datos de la empresa: las de
Registro (`RegistroComponent`) está comentada en el template y su ruta (`ajustes/registro`)
sigue viva, sólo por URL. La Papelera legado (pestaña, ruta y pantalla) se eliminó.

**Query y paginación:**
- `DbFirestoreService.getPaginado<T>(coleccion, campoFecha, desde, hasta, pageSize,
  cursor, filtro?)` — método genérico nuevo (no específico de `registroLog`,
  reutilizable), lectura one-shot con cursor real (`startAfter`, nunca offset/skip).
  Pide `pageSize + 1` docs para saber si hay más página sin una query extra: si
  vuelven de más, descarta el último y `hayMas = true`.
- `RegistroLogConsultaService` (`servicios/log-registro/registro-log-consulta.service.ts`,
  nuevo, stateless — no acumula páginas, las devuelve; el componente es dueño del
  array acumulado + cursor activo, mismo criterio que
  `LegajoService.getHistorialDocumento`): `cargarPagina(desde, hasta, cursor,
  coleccion?)` con tamaño de página fijo (`PAGE_SIZE = 50`) por carga — no es techo
  total, "Cargar más" repite hasta agotar el rango. `consultarPorIdObjet(idObjet)`
  como capacidad secundaria (heredada de la pantalla vieja): un solo `where`, sin
  paginación ni índice compuesto.
- **Filtros server-side** (van a Firestore): rango de fechas (obligatorio, default
  última semana) + colección opcional (`COLECCIONES_REGISTRO_LOG`, exportado desde el
  mismo archivo — hoy 10: choferes, clientes, proveedores, vehiculos, legajos,
  documentacionHistorial, categoriasDocumentacion, operaciones, asignaciones,
  noDisponibilidades — **ampliar esta lista cuando se migre un módulo nuevo al mecanismo
  de log**). ⚠️ Incompleta: otras 10 colecciones ya escriben en `registroLog` y no están
  (users, informesOp, informesLiq, movimientosFin, tarifas, tarifasEspeciales,
  registrosOpEventuales, vendedores, liquidacionesVenta, configuracion); deuda en
  CLAUDE.md. Las 10 tienen escritor en el código (ver "Cobertura de `registroLog`");
  `registrosOpEventuales` sólo desde la migración del historial de eventuales, que corre
  `dev`, así que en la práctica no aparece. El selector muestra el nombre crudo de la colección (no hay mapa de
  etiquetas).
- **Filtros client-side** (sobre `registros` ya cargado en memoria, sin ida a
  Firestore): acción, usuario (por email, texto libre), status. El componente avisa en
  el propio template que estos filtros no traen más resultados — si no hay matches en
  el lote cargado, hace falta "Cargar más" para ampliar la ventana de fechas.
- **Índice compuesto nuevo:** `firestore.indexes.json` creado (no existía archivo de
  índices en el proyecto hasta este frente — registrado en `firebase.json` →
  `firestore.indexes`). Una entrada: `registroLog` por `coleccion` (ASC) +
  `timestamp` (DESC) — necesaria porque el filtro de colección combina una igualdad
  con el rango+orden de fecha. **Deployado a `demoapplog`**, junto con el fix de
  `firestore.rules` de más arriba y el índice del Frente Papelera, en el mismo deploy
  (ver nota de deploy más arriba). ⚠️ El emulador de Firestore NO exige índices
  compuestos (a diferencia de producción) — verificado que la query en sí funciona
  bien contra el emulador
  (`functions/test-registro-log-paginacion.mjs`, nuevo: siembra 40 documentos, pagina
  sin filtro y con filtro de colección, confirma orden desc, sin duplicados ni saltos
  entre páginas — 8/8 checks), pero la necesidad real del índice en producción/demo
  solo la confirma ese deploy.

**Fila expandible — diff de EDITAR:** clickeable solo si `action === 'EDITAR'` y
`cambios` no vacío (`esExpandible()`); expande una tabla `{campo, anterior, nuevo}` por
cada `CambioCampo`.

**`VisualizadorObjetoService`** (`servicios/visualizador-objeto/`, nuevo — UI-layer a
propósito, `LogRegistroService` no lo conoce, mantiene ese servicio "tonto respecto al
dominio"): dispatcher `coleccion -> handler` (`Record` simple, sin abstraer más),
pensado para reusarse en Papelera más adelante. **Ya conectado (Frente Papelera):**
`PapeleraComponent` abre el objeto con `verObjeto(coleccion, id, snapshot)` (el
parámetro `snapshot` muestra la copia archivada de un objeto dado de baja).
`ObjetoPapeleraComponent` se eliminó con la Papelera legado.
- `verObjeto(coleccion, idObjet)`: `DbFirestoreService.getById` para el objeto ACTUAL
  (no un snapshot del momento del log — el diff de la fila EDITAR ya cubre eso), abre
  el modal de alta/edición REAL de esa entidad vía `NgbModal` con
  `fromParent = { modo: 'vista', item }` — mismo patrón ya establecido en
  `clientes-listado`/`choferes-listado`/`proveedores-listado`/`tablero-op`
  (`form.disable()` cuando `modo === 'vista'`), NO el mecanismo bespoke de
  `ObjetoPapeleraComponent` (ver hallazgo abajo).
- **Colecciones mapeadas hoy** (tienen modal de alta/edición real con `modo: 'vista'`
  confirmado): `clientes` → `ClienteAltaComponent`, `choferes` → `ChoferesAltaComponent`,
  `proveedores` → `ProveedoresAltaComponent`, `operaciones` → `ModalDetalleOpComponent`
  (al cerrar este frente era `ModalResumenOpComponent`; el mapa vigente está en
  `VisualizadorObjetoService`).
- **Sin mapear, confirmado antes de excluir (no asumido):** `vehiculos` (el único modal,
  `ModalVehiculoComponent`, es de alta/edición DENTRO del array de un chofer/proveedor,
  no abre por id suelto), `legajos` (sin modal `NgbModal`-abrible por id — el módulo
  reconstruido expone `ConsultaLegajosComponent`, una pantalla ruteada con selector de
  chofer propio, no un componente con contrato `@Input() fromParent`/`NgbActiveModal`),
  `documentacionHistorial`/`categoriasDocumentacion`/`asignaciones` (sin vista
  individual con sentido de negocio). El botón "ver objeto" de la fila se deshabilita
  vía `visualizador.puedeVer(coleccion)` — sin intento de apertura, sin error visible.
- **Objeto ya no existe** (`getById` → `null`, dado de baja después del registro de
  log): mensaje claro (`Swal`), no abre modal vacío/roto.
- **Aclaración "estado actual, no foto del momento":** no se editó el template de cada
  modal (costoso tocar 4 componentes ajenos por una sola línea de aclaración) — en
  cambio, un `Swal` informativo no bloqueante (`timer`, sin botón de confirmar) se
  dispara justo antes de abrir el modal.
- ~~Hallazgo, no corregido en este frente~~ — **resuelto en el Frente Papelera**
  (`PapeleraComponent` usa `VisualizadorObjetoService`). Historia:
  `PapeleraComponent.modalObjeto` NO usaba el patrón "modal real en modo vista" — abre
  `ObjetoPapeleraComponent` (`shared/modales/objeto-papelera/`), un componente bespoke
  con markup propio por colección (`@switch` gigante sobre campos legacy, ya señalado
  en otras partes de este archivo; el shim de tarifas que usaba se retiró en el cierre de Tarifas). Por eso
  "reusar el mismo mecanismo que ya usa Papelera" en la consigna de este frente se
  interpretó como reusar el PATRÓN de bajo nivel (`NgbModal.open` + `fromParent =
  {modo, item}`), no literalmente `ObjetoPapeleraComponent` (que después se eliminó con
  la Papelera legado). Cuando se aborde el frente de
  Papelera, ahí se decide si conviene migrar `PapeleraComponent` a
  `VisualizadorObjetoService` (ganando los modales reales en vez del bespoke) o
  mantenerlos separados.
- ⚠️ **Precedente arquitectónico nuevo:** primera vez que un servicio fuera de un
  módulo feature (`VisualizadorObjetoService`, usado desde `AjustesModule`) importa
  directo componentes declarados en OTROS módulos feature (`ClientesModule`,
  `ChoferesModule`, `ProveedoresModule`, `OperacionesModule`) para abrirlos
  dinámicamente vía `NgbModal`. Funciona sin problema bajo Ivy (la resolución de
  pipes/directivas de cada componente queda resuelta en su propia compilación, no
  depende de que su NgModule esté "activo" en runtime) — confirmado con `ng build`
  real, no solo `tsc`. Costo medido en su momento (antes del frente Lazy loading +
  fechas, que llevó Ajustes y todos los módulos a chunks lazy y el bundle inicial a
  ≈ 1,5 MB: estos números ya no describen el bundle actual): bundle inicial +~90 KB (7.65 MB → 7.74 MB;
  el budget ya estaba excedido antes de este frente, ver "Deuda abierta" en CLAUDE.md si aplica) —
  antes esas piezas de Clientes/Choferes/Proveedores/Operaciones vivían enteras en sus
  chunks lazy; ahora una porción se comparte con el chunk de Ajustes. Aceptado a
  propósito por ser exactamente el diseño pedido (reusar los modales reales, no
  duplicar UI) — si en el futuro esto se vuelve un problema de tamaño real, la
  alternativa sería un dispatcher más desacoplado (ej. rutas dedicadas de "solo
  vista" en vez de imports directos de componentes), no evaluado en este frente.

**Verificado:** árbol compila limpio (`tsc --noEmit` + `ng build`, mismo criterio de
siempre — el error de budget de bundle es el mismo preexistente, con el incremento
puntual ya descripto arriba). Paginación/cursor/orden/filtro de colección verificados
contra el emulador con datos sembrados (`test-registro-log-paginacion.mjs`, 8/8).
Prueba manual pendiente de quien lo despliegue: carga inicial, "Cargar más" sin
repetir/saltear con datos reales, filtros client-side, fila expandible con diff real
(necesita una EDITAR real con `cambios` no vacío en los datos), botón "ver objeto" en
colección mapeada vs. no mapeada.

### Complemento — login/logout migrados a `LogRegistroService` (Agosto 2026)

`AuthService.iniciarSesion`/`cerrarSesion` seguían logueando vía `LogService` viejo
(colección `logs`) — por eso no aparecían en `RegistroLogComponent`, que lee
exclusivamente `registroLog`. Migrados al mecanismo nuevo.

⚠️ **`AuthService` no había sido incluido en las listas de "migrado"/"NO migrado" del
Frente 1 — por omisión, no por decisión de alcance.** No es un módulo CRUD de
entidad ni una cascada de Operaciones/Legajos, así que quedó fuera del relevamiento
original sin que nadie lo excluyera a propósito. Corregido acá, no es deuda nueva —
es cerrar un caso que se pasó por alto.

- `AccionLog` gana `'LOGIN'`/`'LOGOUT'`, en el grupo de "acciones operativas sin
  mutación de datos" (junto a `REIMPRIMIR`/`DESCARGAR`) — no hay negocio con el que
  ser atómico, se escriben sueltas vía `registrarAccion()`/`registrarError()`, no
  `agregarAlBatch()`. `LogRegistroService.registrarAccion()` amplía su tipo de
  parámetro para aceptarlas; `registrarError()` no necesitó cambios (ya aceptaba
  `AccionLog` completo).
- `AuthService`: `LogService` → `LogRegistroService`. **Se sacó el chequeo manual de
  `role !== 'dev'`** en los dos call sites (`iniciarSesion`: envolvía el log de
  éxito; `cerrarSesion`: colgaba del mismo `if (usuario)` que también hacía de
  null-guard, ahora separado — el null-guard se mantiene, el chequeo de rol no) — la
  exclusión de `'dev'` ya la hace `LogRegistroService.construirEntrada()`
  internamente, centralizada, mismo criterio que el resto de los módulos migrados en
  Frente 1 (repetirla en el caller es exactamente el patrón que Frente 1 vino a
  eliminar). **Orden en `cerrarSesion`:** el log de `LOGOUT` se escribe ANTES de
  `usuarioSesion.limpiar()` porque `construirEntrada()` lee el usuario actual desde
  ahí para `userId`/`userEmail` — loguear después de `limpiar()` hubiera quedado con
  `'Desconocido'`. ⚠️ **Ese primer orden (log antes de `limpiar()`, pero después de
  `signOut()`) tenía un bug real, corregido en un segundo pase — ver más abajo.**
- `RegistroLogComponent`: `LOGIN`/`LOGOUT` agregados al array `acciones` que alimenta
  el filtro client-side del dropdown.
- **Verificado:** `tsc --noEmit` + `ng build` limpios. Contra el emulador
  (`functions/test-auth-log-registro.mjs`, nuevo, 6/6 checks): rol `'user'` — LOGIN
  exitoso genera 1 registro (`coleccion:'users'`, `status:'SUCCESS'`), LOGIN fallido
  queda con `status:'ERROR'`, LOGOUT genera 1 registro; rol `'dev'` — LOGIN y LOGOUT
  generan CERO registros. El script no bootstrapea Angular (los servicios usan
  `inject()`, no son instanciables sueltos) — replica fielmente la lógica real de
  `construirEntrada()`/`registrarAccion()` contra el emulador para probar el
  comportamiento de datos+reglas; la lectura de que `AuthService` ya no llama a
  `LogService` ni tiene el chequeo manual de rol se confirmó por inspección directa
  del archivo. Prueba manual real (login/logout haciendo clic en la app contra demo)
  no se hizo en esa sesión por no disponer de automatización de browser — el bug de
  abajo es exactamente lo que esa prueba manual hubiera encontrado.

#### Fix — bug real encontrado en producción/demo: `cerrarSesion()` rota para admin/user

Con rol `admin`/`user`, cerrar sesión tiraba `"Missing or insufficient permissions"` y
la sesión quedaba trabada: Firebase Auth ya había cerrado la sesión (`signOut()`
corrido y confirmado), pero la excepción no capturada cortaba el resto de la función
— `storage.clearAllLocalStorage()`, `usuarioSesion.limpiar()` y el `navigate(['/login'])`
nunca llegaban a correr. Con `dev` "funcionaba" solo porque `construirEntrada()` nunca
intenta escribir nada para ese rol — el bug estaba igual de presente, solo invisible.

**Causa:** el primer pase de esta migración escribía el log de `LOGOUT` DESPUÉS de
`signOut()` (antes de `usuarioSesion.limpiar()`, ver bullet de arriba) — para ese
momento el token del cliente ya es inválido, y `firestore.rules` exige `autenticado()`
para escribir en `registroLog`. La escritura fallaba con `permission-denied`, y como
`registrarAccion()` no atrapaba ese error, se propagaba hasta el `try/catch` de
`cerrarSesion()` — que la trataba como si hubiera fallado el propio `signOut()`.

**Fix, dos partes:**
1. **`LogRegistroService.registrarAccion()`/`registrarError()`: best-effort real.**
   `registrarError()` ya decía en su comentario "best-effort" pero no lo cumplía (no
   atrapaba el error del `setDoc`); `registrarAccion()` tampoco. Ambas ahora envuelven
   la escritura en su propio `try/catch` — si falla, `console.error` y no relanzan.
   Un log fallido nunca debe interrumpir el flujo del caller. `agregarAlBatch()`
   queda **sin tocar** a propósito: participa del batch atómico del negocio, ahí sí
   tiene que seguir propagando errores (si el log no se puede agregar, el batch entero
   no debería commitear con un log roto adentro).
2. **`AuthService.cerrarSesion()`: reorden.** El log de `LOGOUT` ahora se escribe
   ANTES de `signOut()` (no solo antes de `limpiar()`) — mientras el usuario todavía
   está autenticado de verdad. El resto de la función (`signOut`, `clearAllLocalStorage`,
   `limpiar`, `navigate`; **hoy sin `clearAllLocalStorage`**, eliminado en el frente
   remanente de StorageService — `limpiar()` es lo único que borra `usuarioSesion`)
   queda en el mismo orden relativo entre sí, ahora sin que el
   log bloquee nada. Ya no hace falta un `try/catch` local alrededor de la llamada al
   log (cubierto por el punto 1). `registrarError()` en el `catch` de `cerrarSesion`
   queda donde estaba — ahí el usuario sigue autenticado, porque lo que falló fue el
   propio `signOut()`, no el log. `iniciarSesion()` no se tocó — ya quedaba protegido
   por el fix del punto 1 sin cambios adicionales (loguea mientras el usuario sigue
   autenticado, ese orden nunca fue el problema).

**Verificado con el emulador** (`functions/test-logout-orden.mjs`, nuevo, 4/4 checks):
reproduce el bug real — con el orden viejo (`signOut()` antes del log), escribir en
`registroLog` da `permission-denied`; con el orden nuevo (log antes de `signOut()`),
la escritura funciona y `signOut()` se completa normalmente después, para `user` y
`admin`. `tsc --noEmit` + `ng build` limpios (mismo error de budget preexistente).
Prueba manual real (cerrar sesión haciendo clic en la app, con `admin` y `user`,
contra demo) sigue pendiente de quien lo despliegue.

⚠️ **Limitación conocida que queda, no es una regresión de este fix:** un LOGIN
fallido (contraseña incorrecta) no puede loguear su `ERROR` en `registroLog`, porque
en ese momento no hay ningún usuario autenticado — `autenticado()` en las reglas lo
rechaza igual que rechazaba el LOGOUT después de `signOut()`. El mecanismo viejo
(`LogService`/`logs`) tenía exactamente el mismo límite, de forma silenciosa (el
`catch` de `LogService.logEvent` ya hacía `console.error` y tragaba el error, así que
nunca se notó como bug — solo como "el LOGIN fallido nunca se logueaba"). Arreglarlo
de raíz requeriría debilitar `autenticado()` en `firestore.rules` para permitir
escritura no autenticada en `registroLog` bajo alguna condición acotada (ej. solo
`action == 'LOGIN'` y `status == 'ERROR'`) — evaluado y descartado por ahora: amplía
la superficie de escritura sin autenticar de una colección de auditoría, no
proporcional a resolver que un intento de login fallido no quede logueado. Fuera de
alcance de este fix.

#### Complemento — frente eje de sesión (2026-11)

Cambió el orden de los dos métodos de `AuthService` (diseño completo en
`docs/disenos/eje-de-sesion.md`):

- **`cerrarSesion`:** log LOGOUT (si hay sesión) → `limpiar()` → `signOut` en su propio
  `try/catch` → carga completa de `/login`. El LOGOUT sigue siendo lo primero, antes de
  `signOut`, por el motivo del fix de arriba. Novedades:
  - `limpiar()` va **antes** de `signOut`, no en un `finally`: así, cuando Auth avisa
    `null`, la app ya no tiene sesión que perder y la red de sesión inválida distingue un
    logout deliberado de una sesión perdida. Costo aceptado: el `registrarError` de un
    `signOut` fallido queda firmado como `'Desconocido'`.
  - La escritura del LOGOUT y la del `registrarError` se esperan como mucho 3 s
    (`esperarConLimite`, `ESPERA_MAXIMA_CIERRE_MS`): la página no se va con la escritura
    en vuelo, pero sin conexión el logout ya no queda colgado (ver la tabla de lo que no
    deja rastro).
  - Termina siempre en `location.replace` hacia `/login`, también si `signOut` lanza.
- **`iniciarSesion`:** ya no hace `setUsuario` ni lee `/users`. La sesión la establece la
  reconciliación de `UsuarioSesionService` (`onAuthStateChanged`), e `iniciarSesion`
  espera su resultado para el uid recién autenticado y recién entonces escribe el LOGIN,
  que sigue siendo del gesto. El `catch` hace `limpiar()` **antes** del `registrarError`:
  un intento fallido no se puede atribuir a la sesión que hubiera en memoria (pueden ser
  otras credenciales), así que queda firmado como `'Desconocido'`.

### Complemento — gestión de usuarios migrada a `LogRegistroService` (Agosto 2026)

Las 4 Cloud Functions de gestión de usuarios (`crearUsuario`/`editarUsuario`/
`editarEmailUsuario`/`eliminarUsuario`, `functions/src/gestionUsuarios.ts`) escriben
`/users/{uid}` con Admin SDK del lado servidor — no pasan por ninguna escritura del
cliente, así que no había ningún log de estas 4 acciones ni en el mecanismo viejo ni
en el nuevo. Logueadas ahora desde el cliente (`ModalUsuarioComponent`/
`GestionUsuariosComponent`), inmediatamente después de que cada `httpsCallable`
resuelve OK.

**Por qué el logueo es del lado cliente y no del lado Functions:** loguear desde
adentro de la Cloud Function requeriría duplicar `AccionLog`/`RegistroLog`/la
exclusión de `'dev'` en un runtime completamente distinto (Node/Admin SDK vs.
Angular/cliente) — mismo problema, a otra escala, que ya se documentó para
`calcularEstadoDocumentacion()` (duplicada a mano entre `interfaces/legajo.ts` y la
Cloud Function de vencimientos, ver la skill `modulo-legajos`). Con un único caller real hoy
(estos 4 componentes) no se justifica esa duplicación — si en el futuro estas
funciones ganan más callers (otro flujo que también las invoque), reevaluar.

**`LogRegistroService.registrarMutacionSuelta()`** (nuevo, junto a `registrarAccion`):
la pieza que faltaba para este caso — es una MUTACIÓN real (ALTA/EDITAR/BAJA/
RESTAURAR, puede llevar `cambios`), pero su escritura ya ocurrió fuera de cualquier
`EscrituraBatch` propio del cliente (la hizo el Admin SDK, del otro lado de la Cloud
Function) — no hay batch al que plegarla con `agregarAlBatch()`. A diferencia de
`agregarAlBatch()` (que hace su propia lectura `getById` para armar el diff), acá el
caller arma `cambios` a mano: ya tiene el antes/después en memoria (el `Usuario`
original que abrió el modal + el payload que mandó), no hace falta leer de nuevo.
Mismo trade-off de atomicidad que LOGIN/LOGOUT (escritura suelta, best-effort, nunca
tira — mismo `try/catch` interno que `registrarAccion`/`registrarError`). **Es el
método a usar para cualquier mutación futura cuya escritura real ocurra fuera de un
`EscrituraBatch` del cliente** — Cloud Functions con Admin SDK es el caso de hoy, pero
aplica a cualquier otro caso similar que aparezca (ej. una integración externa que
escriba directo).

- `ModalUsuarioComponent.guardar()`: alta → `registrarMutacionSuelta('ALTA', 'users',
  resultado.data.uid, ...)` sin `cambios` (alta nueva, no hay "anterior"). Edición →
  diff armado a mano comparando `this.usuario!.name`/`.role` contra el `payload`
  mandado — cada campo entra al array `cambios` SOLO si cambió de verdad (mismo
  criterio que `diffCampos`, pero sin la función: acá no hace falta, son 2 campos
  fijos conocidos, no un objeto genérico). El rol se compara únicamente si
  `!this.rolDeshabilitado` (si el campo ni se mandó, no hay diff que armar).
- `ModalUsuarioComponent.confirmarCambioEmail()`: `EDITAR` con `cambios` de un solo
  campo (`email`, siempre — cambiar el email es la única razón de existir de ese
  flujo, a diferencia de la edición general donde el campo puede no haber cambiado).
- `GestionUsuariosComponent.eliminarUsuario()`: `BAJA`, sin `cambios`. El `.then()` de
  `llamarEliminarUsuario` pasó a `async` para poder `await` el log antes de las
  acciones de UI (`Swal.fire` + `cargarUsuarios()`).
- **Sin `registrarError()` en ningún catch de estos 3 sitios, a propósito:** son
  escrituras server-side — si la Cloud Function falla, no mutó nada real, y el error
  ya se le muestra al usuario vía `errorMsg`/`errorEmail`. Loguear un intento fallido
  de una acción que ni siquiera llegó a existir sería sobre-loguear sin ganar nada
  (distinto del caso LOGIN, donde el intento fallido sí es un evento real de negocio
  — alguien trató de entrar y no pudo).
- **Verificado con el emulador completo** (Firestore + Auth + Functions,
  `functions/test-gestion-usuarios-log.mjs`, nuevo, 11/11 checks): las 4 Cloud
  Functions reales (no una réplica) invocadas contra el emulador como `admin`, log
  correspondiente confirmado para cada una — `ALTA` sin `cambios`, `EDITAR` de
  nombre+rol con diff de 2 campos, `EDITAR` de solo nombre sin `'role'` en el diff
  (confirma que el filtro "solo si cambió de verdad" funciona), `EDITAR` de email con
  diff de 1 campo, `BAJA` sin `cambios`. Repetido logueado como `dev`: las 3 acciones
  (ALTA/EDITAR/BAJA) dan CERO registros — misma exclusión centralizada que el resto
  de los módulos migrados. `tsc --noEmit` + `ng build` limpios (mismo error de budget
  preexistente). Prueba manual real (crear/editar/cambiar email/eliminar un usuario
  haciendo clic en la app, contra demo) pendiente de quien lo despliegue.

### Decisión — sin migración de `logs` a `registroLog` (Agosto 2026)

Evaluado y descartado explícitamente: migrar los registros viejos (colección
`logs`, interfaz `LogEntry`) al mecanismo nuevo (`registroLog`, `RegistroLog`)
cuando este frente llegue a Vantruck. Motivos:

- Los EDITAR viejos no tienen diff (`LogEntry` no tiene el equivalente a
  `cambios`) — cualquier migración degrada el dato, no lo preserva.
- `idObjet` en los registros viejos usa los ids numéricos legacy de las
  entidades. Resolverlos a los ids string de Firestore requeriría TODAS las
  entidades ya migradas a id string, y ni así sería 1:1 garantizado — una
  sub-entidad recreada varias veces (ej. vehículos) no tiene "el" id string
  correspondiente a un momento pasado.
- Uso esperado de esta pantalla: bajo (consulta ocasional de auditoría, no
  registro con requisito de retención/compliance) — no justifica el costo.

Alternativas evaluadas y descartadas: pantalla única que lea ambas colecciones
(mismo problema de id sin resolver para el botón "ver objeto", más el costo de
normalizar dos esquemas distintos en tiempo de lectura — `LogEntry` no tiene
`cambios` ni `action` como unión cerrada); leer directo de los backups para
reconstruir historial de entidades ya eliminadas (la más cara, para el caso
más marginal).

Decisión: `RegistroComponent` (pantalla vieja, colección `logs`) queda viva
indefinidamente como histórico congelado a la fecha del corte a Vantruck —
no recibe escrituras nuevas del mecanismo nuevo, solo se consulta.
`RegistroLogComponent` (`registroLog`) arranca en blanco desde esa fecha.
Sin fusión de pantallas ni migración de datos entre ambas colecciones.

**Consecuencia del corte.** `registroLog` arranca **en blanco** en Vantruck el día del
corte, y `RegistroComponent` queda congelado como histórico. Consecuencia: toda mutación
que no escriba en `registroLog` ese día queda **sin rastro en producción de forma
permanente** — no aparece en otra pantalla, no existe. Antes del corte, revisar el
inventario de "Cobertura de `registroLog` — qué llega y qué no" de esta skill.

**La capa de eventos no condiciona la migración.** Los campos de un flujo de eventos
tipado —entidad afectada, severidad, requiere acción— son derivables de lo que
`registroLog` ya guarda: la entidad es `coleccion` + `idObjet`, y severidad y
requiere-acción salen de una tabla central sobre `(accion, coleccion)`, aplicable también
al leer entradas anteriores. El único que no se deriva, "atendido", es estado del usuario
que se escribe después del evento y arranca vacío para todo. Así que la capa de eventos se
puede construir como derivación sobre `registroLog` en cualquier momento, sin backfill y
sin una segunda colección. No hay ventana que se cierre con el corte.

## No disponibilidad — en el log nuevo

La no disponibilidad (colección `noDisponibilidades`, `NoDisponibilidadService`) escribe con
`LogRegistroService.agregarAlBatch` dentro del mismo `commitBatch`: `ALTA`, `EDITAR` (también
cerrar, que es escribir `hasta`) y `ANULAR`. El `anterior` del diff sale del estado en memoria
del listener (no se lee del servidor), y el `registrarError` del `catch` no se espera. Este
circuito **no pasa por `StorageService` ni por el `LogService` viejo**.

`noDisponibilidades` está en `COLECCIONES_REGISTRO_LOG`: se puede filtrar por colección en
`RegistroLogComponent`.

## Hecho — eliminación del log viejo (`LogService`) (2026-11-04)

Se eliminó el camino de **escritura** de `logs`, junto con la Papelera legado (skill
`subsistema-papelera`, "Hecho — eliminación del camino legado de la papelera"), que era su
último escritor. Salieron `LogService` (`servicios/log/`, con `logEvent` y `createLogEntry`),
`StorageService.addItem`/`deleteItem`/`updateItem`/`controlLog`,
`TableroService.altaOperacionYActualizarTablero` y `AsignacionService.reactivarItem` con su
privado `registrarLog`, más la interfaz `LogDoc`. Hoy **nadie escribe en `logs`**.

**El camino de lectura se conserva.** `RegistroComponent` (ruta `ajustes/registro`, sin
pestaña) sigue vivo como **histórico congelado** del log viejo. Nunca dependió de
`LogService` (que sólo escribía): lee `logs` directo por `DbFirestoreService` —
`getAllColectionRangeLimit` (listener por rango de `timestamp`, en `consultarRegistro`) y
`getObjIdg` (búsqueda por `idObjet`, en `consultarId`)—, con la interfaz `LogEntry`
(`interfaces/log-entry.ts`). Esos dos métodos y `LogEntry` se quedan por eso.

**Qué no se tocó:** la colección `logs` en Firestore (sus documentos quedan donde están).

**Congelada también en las reglas (después del frente):** en `moduloDe()`, `'logs'` pasó al
bucket `historicoSoloLectura`: lectura para `dev`/`admin`/`user`/`demo`, ninguna escritura
para nadie, `dev` incluido. Así una escritura remanente falla visible en vez de pasar. El
bucket `logs` sigue existiendo para `registroLog`, sin cambios. Verificado con
`functions/test-historico-rules.mjs` contra el emulador. Sin desplegar: el deploy lo hace Nico.

## Nombre de usuario en las pantallas de auditoría (frente remanente de StorageService, 2026-11-04)

`RegistroComponent` (`logs`), `RegistroLogComponent` (`registroLog`) y `PapeleraComponent`
(`papeleraEventos`) muestran la columna Usuario con
`UsuariosConsultaService.nombreDe(userId, userEmail)` (`servicios/gestion-usuarios/`).
Reemplaza a tres copias locales de `getUsuario(email)` que leían una caché de `/users` en
`localStorage` (rota: se pisaba con deltas del listener, excluía a los `dev` y no se poblaba
para `demo`).

- **`cargar()`**, una vez por `ngOnInit`, sin caché entre pantallas. Sólo para `dev`/`admin`
  lee `/users` completo, reusando `GestionUsuariosService.obtenerUsuarios` (sin filtro por
  rol, a propósito). Para el resto no consulta: las reglas de `/users` se lo negarían. Si la
  lectura falla, `console.error` y sigue sin resolución; nunca lanza.
- **`nombreDe`**, síncrono: busca por `uid === userId` y después por `email === userEmail`.
  Sin usuario, o con `name` vacío, ausente o sólo espacios, devuelve el `userEmail` de la
  entrada (`''` si tampoco hay). El literal `'Desconocido'` de las entradas viejas se muestra
  tal cual.
- **Invariante de render:** cada pantalla guarda la promesa de `cargar()` y la espera antes de
  pedir filas (`consultarRegistro`/`consultarId`; `cargarPagina`/`consultarPorIdObjet`;
  `cargarPagina`/`cargarEvento`), así ninguna fila se pinta con emails que después no se
  refrescan.
- **Cambios visibles respecto de antes:** las entradas escritas por un `dev` en `logs` y en
  `papeleraEventos` ahora resuelven nombre (la caché vieja excluía a los `dev`); las de un
  usuario que cambió de email también (por uid); un usuario sin `name` muestra el email en
  vez de una celda en blanco; `demo` ve emails en las tres pantallas (antes, en
  `RegistroComponent`, la celda quedaba en blanco).
- En `RegistroComponent` el buscador (`globalFilter` sobre siete campos) y el orden por
  usuario siguen trabajando sobre `userEmail`; el placeholder lo dice ("Buscar: usuario
  (email), acción, colección, detalle…").

## ~~Deuda abierta — política de persistencia de la sesión~~ — RESUELTA (frente eje de sesión, bloque 4)

Antes "sesión que sobrevive a la pantalla de login". Desde el frente remanente de
StorageService (SS2), abrir `/login` dejó de cortar la sesión de la app. Había tres salidas
reales; el frente eje de sesión (`docs/disenos/eje-de-sesion.md`) cerró el problema así:
- ~~atar `UsuarioSesionService` a `onAuthStateChanged`~~ — HECHO: la sesión de la app se
  reconcilia con Firebase Auth en cada arranque y en cada cambio de Auth; ya no puede haber
  un usuario en la app que Firebase no tiene;
- ~~que `/login` detecte la sesión y ofrezca continuar o cerrarla~~ — HECHO: con sesión
  viva (ya reconciliada) muestra "Continuar" y "Cerrar sesión", sin redirigir sola;
- ~~`browserSessionPersistence`~~ — DESCARTADA: la política se resolvió con el
  **vencimiento por inactividad** (bloque 4, `InactividadService`: 30 min sin interacción en
  ninguna pestaña, aviso un minuto antes). La amenaza real es la máquina compartida con la
  sesión abierta y nadie adelante, no el navegador cerrado; `browserSessionPersistence` no
  se dispara en ese caso y cobra loguearse en cada apertura y una sesión por pestaña. La
  persistencia de Firebase Auth queda en IndexedDB.

Ya no es bloqueante de la promoción. El cierre por inactividad escribe LOGOUT (ver la tabla
de cobertura).

## Deuda abierta — la pestaña "Registro" está comentada

En `AjustesControlComponent` la entrada `tab2` sigue en el array `tabs`, pero el bloque de la
pestaña "Registro" del template está comentado. `RegistroComponent` (histórico congelado de
`logs`) no tiene punto de entrada en la UI para ningún rol: sólo se llega escribiendo
`/ajustes/registro`. Consecuencia para el corte: la primera verificación del día del corte
en `migracion-vantruck` (render de esa pantalla con datos reales) sólo se puede ejecutar con
la URL escrita.

## Deuda abierta — `RegistroComponent.consultarId` no encuentra ids string

`RegistroComponent.consultarId` hace `Number()` sobre el id buscado antes de llamar a
`DbFirestoreService.getObjIdg('logs', 'idObjet', …)`: viene del modelo viejo de ids
numéricos. En `logs` quedaron entradas con `idObjet` string, escritas por la restauración
legada de clientes, choferes y proveedores (`StorageService.addItem`, ya eliminado): por ese
buscador no se encuentran nunca. Pantalla congelada (histórico), impacto cosmético; el
listado por rango de fechas (`consultarRegistro`) sí las muestra.
