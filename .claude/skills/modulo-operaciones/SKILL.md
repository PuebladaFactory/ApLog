---
name: modulo-operaciones
description: Módulo Operaciones de ApLog — tipado con snapshots (RefCliente, RefChofer), el tablero de asignaciones (tablero-asignaciones), operaciones-editor y carga-asignacion con el contrato de altaDesdeAsignacion, el tablero de operaciones (tablero-op) y la no-disponibilidad, con su deuda abierta. Leer antes de trabajar sobre operaciones, su alta o edición, asignaciones, tableros o la no-disponibilidad de choferes.
---

### Fase D: resolución de tipado Operaciones (objetos embebidos → snapshots)

#### Resolución de datos: snapshot vs. servicio vivo

Tras el rediseño de `Operacion` (objetos embebidos → snapshots `RefCliente`/`RefChofer`/`RefVehiculo`/`RefProveedor`), el acceso a datos relacionados sigue esta jerarquía:

1. **Si el dato está en el snapshot de la op, leerlo de ahí.** Aplica a datos de exhibición histórica (razón social, nombre, apellido, patente, dominio, CUIT) Y a datos que la op congela como hecho histórico: `op.proveedor` (qué proveedor para esta op), `op.vehiculo` (qué vehículo). Para registros históricos el snapshot es lo **correcto**, no solo lo conveniente: resolver contra el vivo daría el estado actual, no el de la op.

2. **Si el dato NO está en el snapshot, resolver por ID contra el servicio vivo.** Aplica a datos de cálculo estables que no se congelan (ej. `contratacion` del chofer). Cada `XxxService` expone getters síncronos para esto:
   - `getChoferPorId(id): ConIdType<Chofer> | undefined`
   - `getTipoContratacion(idChofer): 'directo' | 'proveedor' | undefined`
   - `getContratacionChofer(idChofer): ContratacionChofer | undefined`

   **No usar helper genérico de resolución** ni inyectar XxxService en la capa de datos (`DbFirestoreService`) — produce dependencia circular. Cuando la capa de datos necesita un dato resuelto, recibe el valor ya resuelto como parámetro desde la capa de negocio (ver `eliminarInformesPorIdOperacion` (eliminado — frente Baja de Operación, C3): TableroService resuelve `tipoContratacion` y lo pasa).

**Regla práctica:** antes de meter un `getXxxPorId`, verificar si el dato ya está en el snapshot de la op (`op.proveedor`, `op.vehiculo`). Si está, leerlo de ahí.

#### Política de fallo cuando el dato no resuelve (papelera)

Las entidades eliminadas van a papelera (otra colección), por lo que `getXxxPorId` puede devolver `undefined` para ops históricas de entidades dadas de baja — es un caso REAL, no defensivo. Tratamiento por contexto:

| Contexto | Tratamiento del `undefined` |
|---|---|
| Exhibición (tablas, dropdowns, reportes) | Fallback al snapshot (datos congelados); `—`/etiqueta para datos no disponibles; en filtros/contadores, excluir el ítem (degradación silenciosa) |
| Cálculo de valores (motor de tarifas) | No resuelve entidades: usa lo congelado en la op (`tarifaAplicada*`, `datosTarifaEventual`) y la tarifa por id en `TarifarioService` (ver la skill `modulo-tarifas`) |
| Cálculo/cascada viva (borrados, batch) | `throw` explícito o `Swal + return` — NUNCA dejar caer en rama por defecto (riesgo de borrar/escribir colección equivocada) |

Solución futura: resolver contra la papelera (guarda id + colección de origen). Todos los puntos marcados con `// TODO: refactor Papelera`.

#### Nullable de tarifa (datosTarifaEventual)

`datosTarifaEventual: DatosTarifaEventual | null`. Desde el cierre de Tarifas es la ÚNICA
marca de eventual (`!== null`); el campo de datos de Personalizada y el tipo de tarifa de
4 booleanos se retiraron de `Operacion`. Mutarla solo con
`OperacionFactoryService.aplicarEventual` (mantiene el invariante). Tratamiento por contexto:
- **Exhibición que lee un valor:** `op.datosTarifaEventual?.… ?? 0/'—'`.
- **Getter de exhibición:** guard `if (!op.datosTarifaEventual) return ''/[]`.
- **Múltiples accesos en un método:** guard al inicio (`if (!op.datosTarifaEventual) return;`)
  que estrecha todo el cuerpo, en vez de `!` repetido.

#### OperacionRuntime: divergencia runtime-vs-tipo

Los componentes de carga del modelo viejo (`carga-multiple`, `carga-tablero-diario`, `operaciones-table` — los tres eliminados, ver CHANGELOG.md, sección "Switch completado — tablero-asignaciones / operaciones-editor / carga-asignacion") usaban un tipo local `OperacionRuntime`. La factory metía un `Chofer` COMPLETO en runtime, pese a que `Operacion.chofer` es `RefChofer`. El tipo se redefinía para reflejar el runtime (ejemplo histórico — el principio general de la última línea sigue vigente):
```typescript
type OperacionRuntime = Omit<Operacion, 'chofer'> & {
  chofer: Chofer;            // runtime: chofer completo (legacy)
  patenteChofer?: string;    // legacy del modelo viejo
  tarifaBase: ...;
  tarifaOverride: ...;
};
```
**Principio general:** cuando el runtime y el tipo divergen (factory mete X, tipo dice Y, tapado con `as unknown as`), alinear el tipo con el runtime (`Omit & redeclare`), NO forzar el acceso al tipo equivocado.

#### vendedor en RefCliente

Se agregó `vendedor?: string[]` a `RefCliente` (snapshot). La comisión de vendedor es **por operación** (histórica), no del vendedor vigente del cliente → va al snapshot, congelada al alta. ~~Pendiente: el factory debía poblar `vendedor`~~ — RESUELTO en el Frente Vendedores con otro campo: `RefCliente.comisiones` (`{ idVendedor, porcentaje }[]`, lo puebla `OperacionFactoryService`). `vendedor` quedó legacy, sin uso; se retira en la migración de Vantruck.

#### Métodos/bloques comentados (código muerto del modelo viejo)

- `limpiarPropiedadesChoferEnOperaciones` (carga-tablero-diario): reconstruía un Chofer completo desde el snapshot; estaba comentado entero + su llamada. Resuelto: el archivo entero (`carga-tablero-diario`) fue eliminado en el switch de Asignaciones — ya no existe.
- `getCategoria` (tablero-op): colapsado a `op.vehiculo.categoria` (la categoría ya está en el snapshot) — sigue vigente. `getCategoriaDesdeOperacion` (tablero.service) tuvo el mismo colapso primero y luego fue eliminado por completo en el switch de Asignaciones (sin caller externo).

### Decisiones de arquitectura — frente tablero-asignaciones

Patrones fijados en la sesión de migración de `tablero-diario`; aplican a sesiones futuras.

**Componente nuevo al lado del viejo (patrón de migración con cambio estructural profundo).**
En vez de reescribir in-place, se crea el componente nuevo en su propia carpeta y se lo declara
en el módulo. El componente viejo queda intacto. El switch (activar ruta + eliminar viejo) es
atómico y reversible, y solo ocurre cuando el nuevo está operativo end-to-end. Aplicado en
`tablero-asignaciones`; candidato para `carga-multiple`.

**Dos modos por estado del tablero (`'edicion'` / `'visor'`) según un flag de persistencia.**
Borrador local + lectura one-shot para el estado editable; listener vivo solo-lectura para el
estado confirmado. Disuelve la tensión borrador-vs-listener: no es uno u otro según la pantalla,
sino según el estado del documento. Transición one-way al confirmar. Variable `modo` explícita
en el componente (no derivada del template).

**Viewmodel de exhibición construido en el componente, no en un service.**
La resolución para EXHIBIR (construir `VehiculoPool` desde `vehiculos$` + `choferes$` +
`proveedores$`) vive donde se exhibe (el componente), no en un service compartido. La resolución
para PERSISTIR (puente `crearOperacionesDesdeAsignacion`) vive en el service. Regla: no inyectar
services cruzados (ChoferService ↔ ProveedorService) al servicio de entidad para servir UI.

**Color por identidad estable (posición en lista ordenada), no por índice de iteración.**
El color de una categoría depende de su posición en `categoriasOrdenadas` (lista fija), no de
en qué posición aparece en el array que itera el template. Garantiza que el color no cambie al
reordenar, filtrar o agregar categorías intermedias.

**Flujo de alta de dos caminos (tablero-asignaciones / carga-asignacion) que convergen.**
Los dos caminos de alta convergen en `operaciones-editor` (editor de ops finales — reemplazó a
`operaciones-table`, eliminado) y luego en `altaDesdeAsignacion` (persistencia). El editor
completa los datos que el usuario introduce; el servicio hace el procesamiento final (valores,
sujeto, validación, persistencia). `altaDesdeAsignacion` es el paso FINAL de persistencia, no el
único del flujo.

**Estado de larga vida en un service singleton, no en el componente ni en localStorage.**
El borrador en curso (trabajo no persistido que debe sobrevivir a salir/entrar de un componente)
vive en el service de la entidad (`AsignacionService`), no en el componente (se destruye con la
navegación) ni en localStorage (eliminado del frente). El componente espeja al destruirse y
rehidrata al montarse. El borrador en curso tiene prioridad sobre Firestore al rehidratar (es lo
más reciente). Patrón aplicable a cualquier componente con trabajo en curso que deba sobrevivir
navegación.

**Dos memorias separadas para el estado del tablero al navegar:** borrador en curso (solo
trabajo local no guardado, se espeja solo si `borradorSucio`) y última fecha vista (la
fecha en cualquier estado). Al volver: borrador en curso tiene prioridad (rehidrata
local); si no hay, la última fecha vista reconstruye el estado vía `cargarTablero` (que
pasa por la máquina de estados y setea badges/modo/tablero correctamente). Principio: NO
reconstruir el estado a mano al rehidratar; delegar en la máquina de estados
(`cargarTablero`) salvo el borrador local puro, que no está en Firestore y es el único que
se rehidrata de memoria.

**Modal genérico autónomo por modo:** un modal que sirve a varias entidades recibe solo
un discriminante (`modo`) y resuelve sus datos desde el service correspondiente; el
componente que lo abre no pre-mastica arrays. Resolución de exhibición vive en el modal.
Aplicado en `ModalObjetosActivosComponent`.

**CRUD-con-Resultado en la capa de datos:** las escrituras CRUD directas a DbFirestore
devuelven `Resultado` (éxito/error) para alimentar el log, reemplazando progresivamente
las escrituras vía StorageService. `updateConResultado` es el primer caso. El caller
loguea según el Resultado (TODO: refactor Log). Familia futura: `createConResultado`,
`deleteConResultado`. La interfaz `Resultado` local de db-firestore ({exito, mensaje})
difiere de la genérica `Resultado<T>` de interfaces — deuda de unificación pendiente.

**Una asignación existente siempre es visible**, independiente del estado activo de sus
entidades (cliente inactivo con items → columna visible; chofer inactivo asignado →
tarjeta visible). El estado activo controla disponibilidad FUTURA, no borra hechos ya
cargados.

> El primer uso real de `overrides` en `tablero-asignaciones` está documentado en la skill `botones-y-permisos`.

## Contratos vigentes — operaciones-editor y altaDesdeAsignacion

### `operaciones-editor`

**Contrato (cumplido):**
- Entrada: `@Input() operacionesCreadas: OperacionCreada[]` (lista PLANA, tipada — NO
  `fromParent` con cast). El caller setea `modalRef.componentInstance.operacionesCreadas`.
- Salida: `modalRef.result` resuelve con `OperacionCreada[]` finales (sin las eliminadas);
  dismiss = cancela.
- Agrupa por `item.idCliente` internamente (viewmodel efímero `GrupoEditor`).

**El editor NO calcula valores ni persiste:** edita un snapshot en memoria y devuelve
(con las referencias de tarifa elegidas). El cálculo (`calcularAlta`) y la persistencia
siguen en `altaDesdeAsignacion`. Sin suscripciones (resolución síncrona puntual): edita,
no observa.

### `operaciones-editor` — conducta del componente

**Eliminar = excluir del resultado (Opción B):** `Set<idItem>` de eliminadas; se ocultan
del render y se excluyen del array devuelto. NO muta `operacionesCreadas` (cancelar reabre
desde cero, inocuo). NO toca Firestore.

**Toggle eventual reversible:** `eventualOriginal: Map<idItem, boolean>` guarda si la op
era eventual al entrar (estado de UI, no ensucia la Operacion — reemplaza el viejo
`OperacionRuntime`). La mutación coherente (`datosTarifaEventual`, manteniendo el
invariante) vive en `OperacionFactoryService.aplicarEventual`.

**Badges de tarifa del encabezado:** los niveles habilitados del CLIENTE vivo
(`nivelesHabilitados(cliente.tarifasHabilitadas)`), uno por nivel; informativos. La
tarifa elegida de cada lado se ve en su fila.

### `altaDesdeAsignacion` reconstruye el `ref`

**`AsignacionRef` placeholder corregido en `altaDesdeAsignacion`:** `OperacionService.altaDesdeAsignacion`
(`servicios/operaciones/operacion.service.ts`) reconstruye `c.item.ref` con los datos reales
de la op final en el mismo loop donde ya reconstruye `c.item.sujeto` (paso 3). Para
`tablero-asignaciones` es idempotente (el ref ya viene correcto desde el pool de vehículos).
Para `carga-asignacion` corrige el placeholder una vez que `operaciones-editor` resolvió el
vehículo pendiente. Es el único punto de verdad para "cómo se ve un `AsignacionItem`
persistido" — no reconstruir `ref` en ningún otro caller.

### `altaDesdeAsignacion` — `siExisteBorrador`

**Fusión con tablero existente y bloqueo de borrador ajeno (agregado en la sesión de
carga-asignacion):** `altaDesdeAsignacion(fecha, creadas, siExisteBorrador: 'reemplazar'|'bloquear' = 'reemplazar')`.
Antes de armar el tablero final, lee el existente: si `asignado===true`, fusiona
(`existente.items ++ creadas`) — habilita altas parciales repetidas sobre la misma fecha ya
confirmada. Si `asignado===false` (borrador) y `siExisteBorrador==='bloquear'`, aborta sin
escribir con mensaje explicando que debe resolverse desde el Tablero de Asignaciones. El
default `'reemplazar'` preserva el comportamiento de `tablero-asignaciones` (que ya manda su
`itemsBorrador` completo, no un delta — fusionar ahí duplicaría). La validación de
pendientes (chofer/vehículo) sigue aplicando solo a `creadas`, nunca a los items previos que
arrastra la fusión. `ref` del item también se reconstruye en este mismo paso (junto con
`sujeto`) desde los datos finales de la op — idempotente para `tablero-asignaciones`,
corrige el placeholder de `carga-asignacion`.

Callers con `'bloquear'`: `carga-asignacion` (`carga-asignacion.component.ts:383-384`) y el
generador de operaciones de demo (`servicios/desarrollo/generador-operaciones.service.ts:305-307`),
que da de alta día por día. Con el default `'reemplazar'`: `tablero-asignaciones`.

## Conducta vigente — `carga-asignacion`

**Filtro defensivo asimétrico (choferes directos vs. proveedores):** `choferesDirectosBase`
excluye choferes directos sin vehículos (`vehiculos.length === 0`) porque tener vehículo es
requisito de alta de chofer directo — es un seguro, no una regla de negocio activa.
`proveedoresBase` NO aplica ese filtro: un proveedor sin vehículos es un caso válido a
mostrar (el chofer/vehículo del proveedor se resuelve después, en operaciones-editor).

**Flujo de alta:** igual a `tablero-asignaciones.altaOp()` en 3 etapas (crear ops básicas vía
`crearOperacionesDesdeAsignacion` → editar en `operaciones-editor` modal → `altaDesdeAsignacion`
con `siExisteBorrador: 'bloquear'`), pero sin borrador ni modo edición/visor: no hay estado de
larga vida que sobreviva navegación. El componente arma items en memoria y delega el resto a
`OperacionService`; sí usa `AsignacionService`, pero solo para la consulta de lectura de
`existeBorradorSinConfirmar` (ver más abajo), no para estado persistente propio.

**Pre-resolución de vehículo único:** al armar los items (`armarItems()`), si el chofer
directo o proveedor seleccionado tiene exactamente UN vehículo asociado, se resuelve de
inmediato: `sujeto.idVehiculo` y `ref` (dominio, categoria) se completan con los datos reales
en ese momento, en vez de nacer vacíos. Con 2+ vehículos, sigue diferido a
`operaciones-editor` sin cambios. El viewmodel `ChoferDirectoSeleccionable`/
`ProveedorSeleccionable` pasó de guardar `categorias: Categoria[]` a
`vehiculos: ConIdType<Vehiculo>[]` (las categorías para los badges se derivan de ahí). El
filtro defensivo de choferes directos sin vehículo ahora chequea `vehiculos.length === 0`
(antes `categorias.length === 0`), mismo criterio.

**Orden alfabético:** `clientesActivos`, `choferesDirectosBase` y `proveedoresBase` se
ordenan por `localeCompare` (`razonSocial` / `apellido`) al construirse — antes llegaban en
el orden crudo de sus respectivos observables.

**Detección temprana de borrador sin confirmar:** `AsignacionService.existeBorradorSinConfirmar(fecha)`
— nuevo método, indica si existe un tablero `asignado:false` para la fecha. Se consulta en
`onFechaChange()` (async) antes de que el usuario invierta tiempo armando una selección que
`altaDesdeAsignacion` bloquearía igual al final. Si detecta un borrador: `bloqueadoPorBorrador
= true`, deshabilita select de cliente + checkboxes + botón de alta, y muestra un banner de
alerta persistente en el body (no solo un Swal transitorio) indicando que debe resolverse
desde el Tablero de Asignaciones. No reemplaza la validación de `altaDesdeAsignacion` (que
sigue siendo la protección real) — es una advertencia temprana adicional.

## Deuda abierta — integración de callers para bajaOperacion/restaurarOperacion

- `PapeleraComponent.addItem` (caso `'operaciones'`): hoy llama a
  `TableroService.altaOperacionYActualizarTablero` (no atómico) — migrar a
  `OperacionService.restaurarOperacion(logDoc)`. Requiere resolver el id real del doc de
  papelera vía `getByField('papelera','idDoc',...)` porque `PapeleraComponent` solo tiene
  `LogDoc` plano, no el id de Firestore.

## Deuda abierta — tablero-asignaciones (menor)

~~**Informe Excel (`descargar`):** inerte, muestra aviso.~~ — el botón y su método se
borraron en el frente Informes (IE4, D6), y el informe VOLVIÓ en AS1, reescrito de cero
sobre `LibroTabular`, con Excel y PDF y una hoja de choferes no disponibles — ver la skill
`exportacion-excel-pdf`, subsección "Informe del tablero de asignaciones". El viejo quedó registrado en
`claude/diseno-informes-excel-pdf.md` §7.

**No-disponibilidad sin probar end-to-end:** la atenuación de vehículos de proveedor está
correctamente ausente en el tablero (diferida a operaciones-editor), pero verificar la
atenuación de directos al integrar con datos reales en operaciones-editor.

**Persistencia del borrador en F5:** el borrador en curso vive en memoria del service; un F5 lo
pierde. Si se requiere, persistir solo la fecha en localStorage y recuperar de Firestore (cubre
tableros guardados/dados de alta, no el borrador local no guardado). DIFERIDO.

## Deuda abierta — operaciones-editor / Tarifas

~~**`idCliente` de TarifaPersonalizadaCliente: tipo vs dato divergen.**~~ — RESUELTO en el
cierre de Tarifas (la interfaz y el módulo viejo ya no existen).

**Estilos duplicados:** las clases SCSS de tarifa eventual/personalizada se copiaron de
operaciones-table a operaciones-editor. operaciones-table ya fue eliminado en el switch de
Asignaciones (Bloques 13-19) — pendiente ahora consolidar los estilos duplicados en
operaciones-editor (ya no hay original que mantenga la copia sincronizada).

**Celdas de tarifa en el template:** los bindings a `datosTarifaEventual`
usan guarda `@if (objeto)` (no `[disabled]` + `!`): el `disabled` NO impide que Angular evalúe
el binding, y el `!` revienta en runtime cuando el objeto es null. Patrón a respetar en
cualquier template que bindee tarifas nullable.

## Deuda abierta — no-disponibilidad y tablero

**Rediseño de no-disponibilidad (frente propio):** modelo rico con sujeto discriminado
(chofer-entidad / proveedor-entidad / vehiculo / chofer-de-proveedor), fecha desde +
hasta|null, motivo, activa. Lógica derivada "si el único vehículo no está, la entidad
no está". Rehace la interfaz `NoDisponibilidadChofer`, el modal completo y el consumo del
tablero; toca `operaciones-editor` (no-disp de choferes de proveedor se resuelve allá).
El modal actual quedó con arreglo mínimo hasta entonces.

⚠️ **Desde AS1 la regla "¿está no operativo en esta fecha?" vive en
`shared/utils/no-disponibilidad.util.ts`**, no en los componentes (antes estaba escrita
cuatro veces entre `tablero-asignaciones` y `carga-asignacion`): el rediseño la cambia
ahí. Y el informe del tablero deja dicho en una nota el límite del modelo actual —la
no-disponibilidad es solo de choferes, no de proveedores ni de vehículos sueltos—, que es
justo lo que este rediseño viene a levantar: al hacerlo hay que actualizar esa nota.

**`clientesVisibles` getter "con trabajo"** (arma Map + ordena en cada acceso): candidato
a cachear si hubiera cientos de clientes. Hoy trivial.

**Item con cliente borrado** (papelera) sin columna: `// TODO: refactor Papelera`.

**Cadena de dependencias — esta deuda es el primer eslabón:** `rehacer noDisponibilidad` → `eliminar el log viejo` → `eliminar el camino legado de la papelera`.
La no-disponibilidad todavía se escribe con el mecanismo viejo: `modal-choferes-no-disponibles`
usa `StorageService.addItem`/`updateItem` sobre `noOperativo`, que loguea con el `LogService`
viejo (colección `logs`). Mientras no se rehaga sobre el modelo nuevo (con `LogRegistroService`),
el log viejo no se puede eliminar. **No la bloquea ninguna de las otras dos; rehacerla destraba
la eliminación del log viejo** (skill `subsistema-log`) y, detrás de esa, la del camino legado de
la papelera (skill `subsistema-papelera`).

## Deuda abierta — Frente futuro — persistencia de filtros/rango de fechas vs. listener en background

**Síntoma reportado (sin confirmar con pruebas propias):** en `tablero-op`, al cambiar
de pestaña del navegador (o abrir otra app) y volver después de un rato, el rango de
fechas y los filtros siguen mostrando la selección correcta, pero los datos de la tabla
no corresponden a ese período/filtro.

**Hipótesis de causa:** no es un problema de dónde se guarda la preferencia de UI
(`localStorage` es el mecanismo correcto para eso, y sigue siendo así — funciona bien
para navegación interna salir/entrar del componente). El sospechoso real es que el
listener vivo de Firestore (`onSnapshot`/`collectionData`, usado por
`OperacionService.cargarOperaciones` vía `getAllByDateValue`) se corta o queda mudo
mientras la pestaña está en background (throttling del navegador, expiración de token
de Auth, error transitorio de reconexión), y ninguna suscripción a `operaciones$` tiene
manejo de error — si el observable interno emite error, la suscripción de RxJS se corta
sin aviso visible y los datos quedan congelados en el último estado recibido, mientras
el rango/filtros (que viven en variables locales del componente) siguen mostrando la
selección correcta. Posible causa adicional a confirmar: carrera de inicialización entre
`DateRangeService`/`app-tablero-fechas` (que puede calcular su propio rango por defecto)
y la restauración de rango desde `localStorage` — no verificada, requiere revisar ese
código si se encara este frente.

**Quedó descartado como solución:** migrar la persistencia de filtros/rango de
`localStorage` a una colección de Firestore. Eso resolvería una persistencia de
preferencia de UI que ya funciona bien; no toca la causa real (listener silencioso).

**Líneas de acción para cuando se encare:**
- Manejo de error explícito + reintento/reconexión en las suscripciones a `operaciones$`
  (y futuros observables de catálogos).
- Escuchar `document.visibilitychange`/`window.focus` para re-disparar
  `cargarOperaciones()` con el rango actual al volver de background, en vez de confiar
  en que el listener siga vivo.
- Si se toca la persistencia de preferencias (filtros, rango, ancho de columnas, hoy
  desparramados en 4 claves de `localStorage` manejadas inline en `tablero-op`),
  encapsularlas en un servicio chico dedicado — sigue siendo `localStorage` por debajo,
  correcto para sobrevivir F5; solo cambia dónde vive el acceso.

## Deuda abierta — fix de altura del modal limitado a tablero-op

**Layout: altura del modal y tarjetas parejas:** fix de altura aplicado en
`tablero-op.component.scss` (único caller actual del modal, `windowClass modal-super-xl`) con
`.modal-content > *` (`display:flex`/`flex-direction:column`/`flex:1 1 auto`/`min-height:0`),
para que el host del componente se estire dentro del modal y el footer quede pegado al fondo
(antes flotaba a mitad de altura). Las cards de choferes/proveedores usan
`flex-grow-1`/`h-100` para igualar alturas entre sí. DEUDA: el fix está scopeado a
`tablero-op.component.scss`, no es global — si otro caller futuro abre este modal (o
`carga-asignacion`) sin pasar por `tablero-op`, hay que replicarlo ahí. `operaciones-editor`
también se beneficia por compartir módulo lazy-loaded, pero no fue verificado a fondo, solo
visualmente de paso.

## Deuda abierta — `restaurarOperacion` aproxima el estado del alta con una lista manual (BLOQUEANTE para la promoción)

`restaurarOperacion` promete devolver la operación "al estado del ALTA", pero **el estado del
alta no se persiste en ninguna parte**. El método lo aproxima con una lista escrita a mano:
algunos campos se fuerzan al default y otros se conservan.

Esa lista es correcta para los campos que sólo escribe el cierre, e **incorrecta para
cualquier campo escribible tanto en el alta como en el cierre**. Hay al menos dos:

- **`acompaniante` / `acompanianteCant`.** El comentario del código los da como "datos que se
  cargan al cerrar o al editar el InformeOp" y los fuerza a `false` / `0`. Pero el editor del
  alta también los carga (`operaciones-editor.component.html:186,199`) y el editor de InformeOp
  también (commit `897dfee`). Forzarlos a cero **pierde el dato del alta**; conservarlos
  guardaría el del cierre. Ninguna de las dos opciones es "el estado del alta".
- **`tarifaAplicadaCliente` / `tarifaAplicadaChofer`.** Se conservan, lo que equivale al valor
  del alta salvo que se hayan cambiado después en el flujo Personalizada
  (`modal-detalle-op.component.ts:125-133`), caso en que se conserva el del cierre.

**Impacto: los dos afectan montos.** El acompañante entra en la valorización y la tarifa
aplicada define los valores enteros. El cambio es silencioso: nadie se entera hasta que
alguien compara contra el remito.

**Por qué no se arregla re-resolviendo.** El encabezado de `ValoresTarifaService` documenta que
la elección de la tarifa de cada lado la hace el usuario sobre los candidatos, y que con dos o
más "no hay forma automática de saber cuál corresponde y se elige a mano". Un re-resolver
automático en la restauración no puede reproducir una elección manual.

**Por qué no se arregla parcheando los dos campos.** Un parche en acompañante deja la tarifa
mal, y uno en la tarifa no es implementable (arriba). Y sobre todo deja la clase de bug
intacta: el próximo campo que se vuelva escribible en los dos momentos repite el problema sin
que nadie lo note.

**Dirección de la solución.** Persistir el snapshot del alta: congelar al alta lo que el alta
definió, que es el mismo patrón de snapshot que el proyecto ya usa en `RefCliente`,
`RefChofer` y el `titulo` de `CategoriaDocumentacion`. Con ese snapshot, `restaurarOperacion`
deja de aproximar y vuelve literalmente al alta, y la lista escrita a mano desaparece.

**Estado.** No urgente mientras `refactor` no esté en producción. **Bloqueante antes de la
promoción:** es cambio silencioso de montos en el camino de restaurar. Necesita su propio
frente de diseño, no un parche.

## Deuda abierta — `editarOperacion` puede fallar sin devolver `Resultado`

`editarOperacion` (`operacion.service.ts:665`) arma la escritura del ítem del tablero
(`:670`) **antes** del `try`. Si no existe tablero de asignaciones para la fecha de la
operación, la excepción se escapa: el método no devuelve `Resultado` y el error no pasa por
`registrarError`. El usuario queda sin saber qué ocurrió.

Viola el invariante de que toda operatoria compleja devuelve `Resultado<T>` y registra el
error.

**La forma correcta ya existe dos métodos más abajo:** `restaurarOperacion`
(`operacion.service.ts:622-629`) consulta el tablero antes y, si no existe, devuelve
`{ exito: false, mensaje: ... }` con el detalle de la inconsistencia. El arreglo es replicar
esa forma: o mover el armado de la escritura dentro del `try`, o hacer el chequeo temprano con
retorno de `Resultado` como hace la restauración.

Caller único: `modal-detalle-op.component.ts:246`.

## Deuda abierta — renombre de `modalCargaMultiple()` (cosmética)

**Caller confirmado:** `tablero-op.component.ts`, método `modalCargaMultiple()` (nombre
heredado del componente viejo, no renombrado — el cuerpo ya abre `CargaAsignacionComponent`).
Candidato a renombrar el método en una sesión futura por claridad, no urgente.
