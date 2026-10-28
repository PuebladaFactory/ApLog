---
name: modulo-legajos
description: Módulo Legajos de ApLog — documentación de choferes y vehículos (colecciones legajos, vencimientos, categoriasDocumentacion), cálculo de estado, la Cloud Function verificarVencimientosDocumentacion, la pantalla Próximos Vencimientos, los archivos en Firebase Storage (StorageArchivosService) y sus reglas. Leer antes de trabajar sobre legajos, documentación, vencimientos, Storage o storage.rules.
---

## Módulo Legajos — reconstrucción completa (Agosto 2026)

Frente de reconstrucción completa (no migración incremental): `interfaces/legajo.ts`
reescrita desde cero (Bloque 1) y los 3 componentes del módulo (`tablero-legajos`,
`cargar-documentos`, `consulta-legajos`) reescritos uno por uno a medida que sus
dependencias quedaban listas (Bloques 7, 9, 10), quedando rotos deliberadamente en el
medio — excepción explícita al principio de "cada bloque compila", confirmada al
arrancar el frente.

### Modelo de datos

`EstadoDocumentacion` como union type (`'enFecha' | 'porVencer' | 'vencido' | 'sinVto'`)
— reemplaza los 4 booleanos independientes del modelo viejo (`Estado`), que permitían
combinaciones inconsistentes (ej. `vencido` y `enFecha` ambos `true`).
`CategoriaDocumentacion` es un catálogo editable por el usuario (colección
`categoriasDocumentacion`, no una unión cerrada de strings), gestionado desde
`GestionCategoriasDocumentacionComponent` — un modal accesible ÚNICAMENTE desde
`tablero-legajos` (botón "Gestionar Categorías"), por diseño. `Documentacion` tiene
`idCategoria` (referencia real al catálogo) + `titulo` (snapshot del nombre, congelado al
momento de carga — mismo patrón que `RefCliente`/`RefChofer` en Operaciones: el nombre
mostrado en un documento ya cargado no cambia si la categoría se renombra después).
`Legajo` NO persiste `estadoGral` — se deriva en exhibición vía la función pura
`estadoGeneralDeLegajo()` (`interfaces/legajo.ts`), nunca se guarda en Firestore.
`DocumentacionHistorial` es una colección nueva: historial granular por documento
(Opción B del diseño) — al reemplazar un documento, la versión vieja completa se archiva
ahí ANTES de sobreescribir. Las imágenes de versiones históricas NO se borran de
Storage (quedan accesibles desde el historial en `consulta-legajos`).

### Cálculo de estado

`calcularEstadoDocumentacion()` (`interfaces/legajo.ts`) es la única fuente de verdad,
consumida por `LegajoFactoryService.crearDocumentacion()`. Se calcula UNA sola vez, al
crear/reemplazar un documento — nunca recalculado en el cliente al leer. Elimina el
patrón previo del módulo viejo (recálculo síncrono en cada carga de pantalla, e incluso
en cada apertura de la app entera vía `HomeComponent`). El mantenimiento periódico de
vencimientos (detectar que un documento pasó de "por vencer" a "vencido" sin que nadie
lo haya vuelto a cargar) lo resuelve la Cloud Function `verificarVencimientosDocumentacion`
— ver más abajo.

**Regla (decisión D1 del frente Lazy loading + fechas, Octubre 2026):** con `fechaVto = D`,
el documento está vigente todo el día D y vencido desde D+1; `'porVencer'` = de 0 a 45 días
de calendario hasta D. Se calcula sobre los strings, contra `hoyNegocio()`:
`calcularEstadoDocumentacion(fechaVto, hoy = hoyNegocio())` con `diasEntre(hoy, fechaVto)`.
Una `fechaVto` que no es 'YYYY-MM-DD' válida da `'sinVto'` (la Function además deja un
`logger.warn`). Antes se comparaba `new Date(fechaVto)` contra el instante actual: vencía a
las 21:00 del día anterior y cambiaba según la hora y el lado (cliente o servidor).

### Verificación periódica de vencimientos (Cloud Scheduler)

`functions/src/verificarVencimientosDocumentacion.ts` — primera función PROGRAMADA
del proyecto (`onSchedule`, 2nd gen; ver "Cloud Functions" en CLAUDE.md para el detalle
de región/deploy). Corre diario a las 03:00 `America/Argentina/Buenos_Aires`. Cierra
el hueco documentado arriba: sin esto, `estado` quedaba congelado en lo que era al
momento de cargar/reemplazar el documento, y nunca avanzaba solo por el paso del
tiempo (un documento "por vencer" nunca pasaba a "vencido" salvo que alguien
reabriera y volviera a guardar ese legajo).

- **Umbral de `'porVencer'`: 45 días** (antes 30, ajustado en Agosto 2026). Decisión de
  negocio explícita, no un default técnico — 30 días quedaba corto para cubrir el ciclo
  real de renovación de un documento (sacar turno + trámite + emisión + cargarlo de
  nuevo en el legajo); 45 confirmado con el desarrollador. Vive en un solo lugar por
  copia (el `dias <= 45` de cada una de las dos copias de
  `calcularEstadoDocumentacion()`) — sin tabla de configuración ni override por
  categoría, un solo número para todo el proyecto.
- **`calcularEstadoDocumentacion()` DUPLICADA manualmente**, no importada. Cloud
  Functions es un proyecto TypeScript separado (`functions/tsconfig.json`, build/deploy
  propio) que no puede importar de `src/app/` — se copió el cálculo literal en vez de
  armar un mecanismo de código compartido entre los dos `tsconfig` para una función
  pura de 15 líneas. Mantener AMBAS copias sincronizadas ante cualquier cambio en este
  cálculo (comentario espejo en las dos puntas: `interfaces/legajo.ts` y el archivo de
  la función). La copia de la Function trae su propio `hoyNegocio` (Intl, mismo huso) y
  sus helpers de fechas; la prueba en Node es `functions/test-vencimientos-scheduler.mjs`.
- **Recalcula TODOS los `Documentacion[]` de TODOS los `legajos`** en cada corrida, y
  solo reescribe (`batch.update`) los legajos cuyo estado cambió — evita escrituras
  innecesarias en los que ya estaban al día.
- **Colección `vencimientos`: reconstrucción TOTAL en cada corrida**, no diff
  incremental — se borra la colección entera y se recrea con los documentos
  `'vencido'`/`'porVencer'` vigentes al momento de esa corrida. Es una colección
  DERIVADA (una alerta calculada, no un registro histórico) — a la escala actual
  (59 legajos en demo) reconstruir entera es más simple que diffear, y evita alertas
  huérfanas de documentos que pasaron a `'enFecha'` o se eliminaron. Schema:
  `{ idLegajo, idChofer, idCategoria, titulo, fechaVto, estado }` — **sin nombre/apellido
  del chofer snapshoteado**: a diferencia del patrón de snapshot histórico de
  Operaciones (ver "Snapshot + ID para registros históricos"), acá no aplica porque es
  una colección derivada que se reconstruye entera todos los días, no un registro
  histórico — el nombre se resuelve en el cliente contra `ChoferService` por `idChofer`.
- **Nota de escala:** si `legajos` + `vencimientos` combinados superan ~400-500
  escrituras en una corrida, particionar en batches de 500 (mismo patrón que
  `commitBatch` en `DbFirestoreService`). No aplica hoy.
- **`firestore.rules`:** `vencimientos` mapeada en `moduloDe()` al módulo propio
  `'vencimientos'` (no reusa `'legajos'`), con `permitido()` dando solo `'leer'` a los
  4 roles (`dev`/`admin`/`user`/`demo`) — sin `crear`/`editar`/`eliminar` desde el
  cliente para ninguno, nunca. Lo único que escribe ahí es esta Cloud Function vía
  Admin SDK, que bypassea las rules igual.
- **Pantalla "Próximos vencimientos":** ver subsección propia justo abajo — ya
  construida, consume esta colección.
- Verificado contra el emulador con `functions/test-vencimientos-scheduler.mjs` (ver
  "Cloud Functions") — confirma recalculo real, reescritura selectiva de `legajos`, y
  reconstrucción total de `vencimientos` en corridas repetidas sin cambios de datos.

### Pantalla "Próximos Vencimientos" (frente cliente)

`raiz/legajos/vencimientos/` — 4ta pestaña de `ControlComponent` (`legajos/vencimientos`),
al lado de Tablero/Cargar Documentos/Consultar. Consume la colección `vencimientos` ya
poblada por la Cloud Function de arriba. 5 decisiones de diseño acordadas antes de
implementar:

1. **Ubicación:** 4ta pestaña dentro del módulo Legajos existente, no un módulo de
   Reportes — es una vista derivada de Legajos, no un reporte transversal.
2. **Carga de datos: listener LOCAL al componente**, no un service con
   `BehaviorSubject` + `init()` global (patrón del resto de las entidades —
   Choferes/Clientes/Legajos, calentadas al arranque de toda la app vía
   `HomeComponent`). `vencimientos` no la consume nadie más que esta pantalla, así que
   no se justifica una entrada más en el arranque global. Abre en `ngOnInit`
   (`DbFirestoreService.getAllStateChanges('vencimientos')`, acumula
   added/modified/removed igual que los servicios globales), cierra en `ngOnDestroy`
   vía `Subject` + `takeUntil` — mismo mecanismo de limpieza, alcance de vida distinto.
3. **Presentación: `TablaGenericaComponent`** (listado plano), no la matriz custom de
   `tablero-legajos` (esa resuelve "categoría × chofer", acá es "una alerta por fila",
   forma totalmente distinta). Columnas: Chofer, Categoría, Fecha de Vencimiento,
   Estado. Orden: vencidos primero, luego por vencer; dentro de cada grupo, fecha
   ascendente — se arma en el componente (`armarFilas()`), no vía el
   filtro/orden-por-columna nativo de `TablaGenericaComponent` (ese es interactivo y
   por columna, no una regla de negocio fija de dos niveles).
4. **Acción por fila "ver"** abre `CarruselComponent` con las imágenes del documento
   puntual, resuelto contra `LegajoService.getLegajoPorChofer()` (ya en memoria desde
   el arranque de la app — sin query nueva a Firestore) buscando por
   `idCategoria` dentro de `documentacion[]`. Deshabilitado (`AccionTablaGenerica.disabled`)
   si no resuelve — ver el hallazgo de wiring más abajo.
5. **Chofer no resuelto (baja):** `—`, mismo fallback y misma expresión
   (`` `${apellido} ${nombre}` `` vía `ChoferService.getChoferPorId()`) que ya usa
   `TableroLegajosComponent.getChofer()` — no una convención nueva.

**Hallazgo real, corregido de paso:** `TablaAccionesComponent` (el wrapper que
`TablaGenericaComponent` usa para renderizar los botones de acción por fila) pasaba
`[disabled]` a `app-btn-editar`/`app-btn-eliminar` pero NUNCA a `app-btn-leer` en la
rama `'ver'` — el `@Input() disabled` de `AccionTablaGenerica` se evaluaba igual en
`ejecutar()` (el click quedaba bloqueado en los hechos), pero el botón nunca se veía
gris para ningún consumidor existente de la acción `'ver'` en toda la app, porque
ninguno hasta ahora necesitaba deshabilitarla — siempre estaba disponible o no se
ofrecía la acción directamente. Esta pantalla es el primer caso real que necesita
`'ver'` condicionalmente deshabilitado (alerta cuyo documento fue reemplazado o el
chofer dado de baja desde que se generó). Corregido agregando
`[disabled]="estaDeshabilitada('ver')"` en `tabla-acciones.component.html` — una línea,
mismo patrón exacto que ya existía para `'editar'`/`'eliminar'`, sin tocar ningún otro
comportamiento (los ~90 usos existentes de `'ver'` nunca pasan `disabled`, así que
`estaDeshabilitada('ver')` sigue dando `false` para todos ellos).

**Badge de color en la columna Estado — extensión aditiva de `TablaGenericaComponent`,**
confirmada antes de tocar el componente compartido (no asumida). El `<td>` de
`tabla-generica.component.html` solo interpolaba texto plano, sin ningún mecanismo de
estilo condicional por celda. Se evaluaron dos caminos — extender el componente
compartido vs. degradar a texto plano sin color — y se optó por extender:
`ColumnaTablaGenerica` gana un campo opcional `claseCelda?: (fila: any) => string`
(interfaces/tabla-generica.ts). Aditivo y retrocompatible: ningún consumidor existente
(Choferes/Clientes/Proveedores/Usuarios) pasa ese campo, así que ninguno cambia.

Diseño ajustado una vez visto en pantalla (iteración post-implementación, Agosto 2026):
la primera versión pintaba el `<td>` completo vía `[ngClass]`, con clases propias
`.rojo`/`.amarillo` — visualmente pesado, y el ancho de celda variaba según el largo del
texto ("Vencido" vs. "Por vencer"). Reemplazado por un `<span class="badge">` DENTRO de
la celda: el `<td>` de `tabla-generica.component.html` renderiza
`<span class="badge badge-ancho-fijo" [ngClass]="col.claseCelda(fila)">` cuando la
columna define `claseCelda`, texto plano si no. `claseCelda` ahora devuelve clases
Bootstrap directas (`text-bg-danger`/`text-bg-warning`, Bootstrap 5.3+) en vez de clases
propias — sin necesidad de definirlas en ningún `.scss` del proyecto. `.badge-ancho-fijo`
(`tabla-generica.component.scss`, `min-width: 90px`) es la única clase propia que queda:
fija el ancho del badge para que no salte entre estados con textos de largo distinto —
tiene que vivir en el stylesheet de `TablaGenericaComponent` (no en
`vencimientos.component.scss`): `ViewEncapsulation` por defecto de Angular no deja que
el CSS de un componente padre alcance el DOM interno de un hijo, y `.badge-ancho-fijo` sí
está en el DOM que `TablaGenericaComponent` renderiza. Queda como
precedente/mecanismo reutilizable para la próxima pantalla que necesite un badge por
celda en `TablaGenericaComponent` — nota (no deuda, nada roto): candidato natural para
cuando las tablas de Finanzas migren a `TablaGenericaComponent`, pero no generalizado de
antemano para ese caso — Finanzas no consume el componente todavía y su necesidad real
(¿un badge por celda alcanza? ¿variantes más allá de rojo/amarillo?) no está relevada;
diseñar para eso hoy sería especulativo.

### Servicios

`CategoriaDocumentacionService`, `LegajoService`, `LegajoFactoryService`
(`servicios/legajos/` y `servicios/categoria-documentacion/`) siguen el patrón estándar
ya establecido en el proyecto: `BehaviorSubject` + `init()` (llamado desde
`HomeComponent`) + getters síncronos (`getLegajoPorChofer`, `getCategoriasActivas`,
etc.). `StorageArchivosService` (`servicios/storage-archivos/`) es GENÉRICO a propósito
— sin ningún conocimiento de Legajos, pensado para reutilizarse cuando Facturación/
Finanzas necesiten subir comprobantes.

### Atomicidad Storage + Firestore

Sin batch cruzado posible entre Firebase Storage y Firestore (limitación de la
plataforma, no del proyecto). `LegajoService.guardarDocumentacion` usa una secuencia
fija: Storage primero (subida de todos los archivos pendientes), Firestore después (con
el archivado a `documentacionHistorial` incluido). Si la subida a Storage falla en
cualquier punto, no se escribe nada en Firestore y el buffer local del componente queda
intacto para reintentar sin perder lo ya armado.

### Ownership del legajo en cascadas

El legajo se comporta como `Vehiculo` en las cascadas de alta/baja de Chofer/Proveedor:
baja simple, SIN entrada propia de papelera — viaja dentro del objeto compuesto de la
entidad dueña. Creación ligada al alta de chofer (`ChoferService.guardarChoferConVehiculos`),
cerrando una deuda que venía desde la creación original de `ChoferService` (antes
llamaba al `LegajosService` viejo sin `await`, escondiendo en silencio cualquier error
de permisos — ver el primer fix de `firestore.rules` abajo, que era exactamente ese
error). ⚠️ **Frente Log → Frente 2:** `LegajoService.crearLegajoParaChofer`/
`eliminarLegajoDeChofer` (los métodos citados originalmente acá) pasaron a
`prepararLegajoVacio`/`prepararBajaLegajoDeChofer` — ya no escriben, preparan la
escritura para que `ChoferService`/`ProveedorService` la plieguen a su propio batch
consolidado. Ver la skill `subsistema-log`, subsección "Frente 2", para el detalle.

### `firestore.rules` — dos fixes durante este frente

1. **Módulo `legajos`: agregado `crear` para `user`.** La cascada de alta de chofer
   requiere `crear` en `entidades` Y en `legajos` a la vez (crea el chofer y su legajo
   vacío en el mismo gesto) — la regla real solo se lo daba en `entidades`. `user` es el
   rol del único empleado activo en producción, así que este bug bloqueaba en silencio
   (por la falta de `await` mencionada arriba) la creación de legajos para altas de
   chofer hechas por ese rol.
2. **`moduloDe()`: `categoriasDocumentacion` y `documentacionHistorial` no estaban
   mapeadas.** Cualquier colección sin mapeo explícito queda denegada por defecto
   (fail-safe ya establecido del proyecto — ver "Security Rules" en CLAUDE.md), lo que
   bloqueaba incluso a `dev`/`admin`, no era un problema de rol. Agregadas al mismo
   módulo `legajos`. Encontrado en pruebas manuales reales (error real de permisos al
   crear una categoría desde el modal), no en el diseño original del frente.
   **Aprendizaje a dejar explícito:** cualquier colección nueva de un frente futuro debe
   verificarse contra `moduloDe()` explícitamente antes de darlo por cerrado — no asumir
   que hereda el mapeo de una colección "hermana" del mismo dominio.

### `storage.rules` + activación de Firebase Storage en demo

Primera vez que el proyecto usa Firebase Storage en código real (antes solo Cloudinary).
Al probar la carga de archivos real, apareció un 404 en el preflight CORS que resultó
ser un síntoma de algo más profundo: **el bucket de Storage de `demoapplog` no existía**
— ni con el nombre legacy (`demoapplog.appspot.com`, el que tenía `environment.ts`) ni
con el nuevo (`demoapplog.firebasestorage.app`, el que reporta el SDK config). El plan
Blaze habilita la posibilidad de usar Storage, pero crear el bucket por defecto es un
paso aparte (wizard "Comenzar" en Firebase Console → Storage) que nunca se había
completado. Activado manualmente desde la Console, región `SOUTHAMERICA-EAST1` (elegida
para consistencia futura con la región real de `pf-logistics`/Vantruck — **confirmar esa
consistencia real, no asumirla, antes de la migración**, ver Deuda abajo).

Tres piezas necesarias para que una subida funcione, verificadas cada una por
separado (ninguna alcanza sin las otras dos):
1. `storageBucket` correcto en `environment.ts`/`environment.prod.ts` (el bucket real,
   confirmado contra el SDK config, no adivinado).
2. CORS configurado a nivel de bucket — NO es código de la app, se configra aparte
   (normalmente `gsutil cors set`; en este entorno sin `gsutil`/`gcloud` disponibles, se
   hizo vía el cliente Node de Cloud Storage directo).
3. `storage.rules` (existía desde el Bloque 2, pero solo se había verificado contra el
   emulador) desplegado realmente a demo — sin esto, el bucket ya creado y con CORS
   igual rechazaba todo con `storage/unauthorized`.

Verificado end-to-end contra el browser real (no solo el emulador, que no aplica
políticas CORS de la misma manera que un bucket real) — login real, subida real,
`getDownloadURL()` devolviendo una URL válida, confirmado además leyendo el documento
resultante directo de Firestore.

**Aprendizaje a dejar explícito:** activar un producto de Firebase por primera vez no es
solo escribir el código cliente — el bucket, su CORS, y el deploy de reglas son pasos de
infraestructura separados, cada uno con su propio punto de falla, que hay que verificar
uno por uno. Relevante para cuando Facturación/Finanzas empiecen a usar el mismo
`StorageArchivosService`.

### Migración de datos (demo) — estado real actualizado

`LegajoMigrationService` se ejecutó una vez contra demo: 59/59 legajos migrados desde el
modelo legacy, cero casos de `documentosSinMatchCategoria`/`documentosFechaRequiereRevision`
(detalle técnico ya registrado en el cierre del Bloque 5). Sin embargo, esa migración
heredó una mezcla de `idChofer` legacy (numérico) y nuevo (string) entre distintos
legajos — arrastre de una migración de IDs anterior, sin relación con este frente (ver
la skill `migracion-vantruck`, subsección "Deuda abierta — migración a Vantruck..."). Como los datos de `demoapplog` son
enteramente ficticios, se optó por un reset manual posterior a la migración: se vació
`legajos` por completo y se recreó un legajo vacío por cada chofer real existente
(script ad-hoc de un solo uso, deliberadamente FUERA de `LegajoMigrationService` — ese
servicio sigue representando la lógica de migración real que algún día correrá contra
Vantruck, donde datos reales existentes nunca se borrarían y recrearían vacíos).

**Estado actual de `legajos` en demo: cada chofer tiene exactamente un legajo vacío**,
listo para pruebas reales de carga de documentación — no hay documentación real
precargada, es el estado esperado tras el reset, no un dato faltante.
