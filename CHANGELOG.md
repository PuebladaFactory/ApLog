# Changelog — ApLog

## Refactorización arquitectural (en progreso)

### Infraestructura transversal

**StorageService** — métodos nuevos agregados (los existentes no fueron modificados):
- `addItemAndGetId`: alta con retorno del ID generado por Firestore
- `updateItemAsync`: edición async con log
- `deleteItemAsync`: baja async con log
- `deleteItemPapeleraCompuestoAsync`: baja con objeto compuesto en papelera

**DBFirestoreService** — métodos nuevos agregados:
- `createAndGetId`: crea documento con ID pre-generado por Firestore
- `getByField`: consulta documentos por campo y valor

**TablaGenericaComponent** (`src/app/shared/tabla/tabla-generica/`)
- Reemplaza ag-grid en módulos refactorizados
- Filtros por columna, ordenamiento, drag & drop de columnas, resize, columnas visibles
- Header sticky, scroll vertical sin paginación
- Recibe `columnas`, `filas` y `acciones` por @Input

**TablaAccionesComponent** (`src/app/shared/tabla/tabla-acciones/`)
- Renderiza botones de acción por fila usando componentes app-btn-*
- Soporta: ver, editar, eliminar, vehiculos

**Servicios de migración** (`src/app/servicios/migracion/`)
- `MigrationBackupService`: backup genérico de colecciones a `_backup_nombre_fecha`
- `ChoferMigrationService`: migración de choferes, vehículos y legajos
- `ProveedorMigrationService`: migración de proveedores, choferes de proveedor
  y reasignación de vehículos. Incluye migrarVehiculosProveedores() para corrección
  de vehículos no creados en primera pasada
- `ClienteMigrationService`: migración de clientes
- `MigracionComponent`: interfaz en `/migracion` para ejecutar migraciones

---

### Módulo Choferes — Junio 2026

**Interfaces modificadas** (`src/app/interfaces/chofer.ts`):
- `Chofer`: idChofer migrado a string, datos personales agrupados en `datosPersonales`,
  `idProveedor` reemplazado por `ContratacionChofer` (discriminated union directo/proveedor),
  campo `vehiculo[]` eliminado
- `Vehiculo`: entidad independiente con `AsignacionVehiculo` (chofer o proveedor),
  idVehiculo como string
- `Direccion`: renombrada sin tilde
- `ContratacionChofer`, `AsignacionVehiculo`: tipos nuevos
- `SeguimientoSatelital`: eliminada (estaba comentada)

**Interfaces con TODO** (migrar cuando se refactorice cada módulo):
- `informe-op.ts`, `tarifa-gral-cliente.ts`, `tarifa-eventual.ts`,
  `informe-liq.ts`, `movimiento-financiero.ts`, `ranking-moroso.ts`,
  `resumen-financiero-entidad.ts`, `resumen-venta.ts`, `log-doc.ts`, `log-entry.ts`

**Interfaces modificadas relacionadas**:
- `legajo.ts`: idLegajo y idChofer migrados a string
- `no-disponibilidad-chofer.ts`: idNoDisponibilidad y idChofer migrados a string

**Servicios nuevos**:
- `ChoferService` (`src/app/servicios/choferes/chofer.service.ts`):
  BehaviorSubject para choferes y vehículos, init() llamado desde HomeComponent,
  guardarChoferConVehiculos(), eliminarChoferConVehiculos(), toFirestore(),
  vehiculoToFirestore(), getVehiculosPorChofer(), getVehiculosPorProveedor(),
  esOperable(), verificarCuitDuplicado()
- `ChoferFactoryService`: crearChofer(), editarChofer()
- `VehiculoFactoryService`: crearVehiculo(), editarVehiculo()

**Componentes modificados**:
- `ChoferesAltaComponent`: usa ChoferFactoryService y ChoferService,
  sección de vehículos condicional según tipo de contratación,
  formularios deshabilitados en modo vista con form.disable()
- `ChoferesListadoComponent`: suscripto a ChoferService, usa TablaGenericaComponent
- `ModalVehiculoComponent`: usa VehiculoFactoryService, recibe asignadoA por @Input

**HomeComponent**: agrega this.choferService.init()

---

### Módulo Proveedores — Junio 2026

**Interfaces modificadas** (`src/app/interfaces/proveedor.ts`):
- idProveedor migrado a string
- idTarifa migrado a string
- campo `activo: boolean` agregado
- `Direccion` y `TarifaTipo` importadas desde chofer.ts

**Servicios nuevos**:
- `ProveedorService` (`src/app/servicios/proveedores/proveedor.service.ts`):
  BehaviorSubject para proveedores, init() llamado desde HomeComponent,
  guardarProveedor(), guardarProveedorConVehiculos(),
  eliminarProveedorConVehiculos() (baja en cascada: proveedor + vehículos
  + choferes + legajos → papelera), toFirestore(), verificarCuitDuplicado(),
  getVehiculosPorProveedor()
- `ProveedorFactoryService`: crearProveedor(), editarProveedor()

**Componentes modificados**:
- `ProveedoresAltaComponent`: usa ProveedorFactoryService y ProveedorService,
  gestión de vehículos del proveedor (usa ModalVehiculoComponent),
  verificación de CUIT duplicado, formularios deshabilitados en modo vista
- `ProveedoresListadoComponent`: suscripto a ProveedorService y ChoferService,
  usa TablaGenericaComponent, modal de vehículos actualizado a nueva estructura

**HomeComponent**: agrega this.proveedorService.init()

---

### Módulo Clientes — Junio 2026

**Interfaces modificadas** (`src/app/interfaces/cliente.ts`):
- idCliente migrado a string
- idTarifa migrado a string
- vendedor migrado de number[] a string[]
- activo deja de ser opcional
- `Direccion` y `TarifaTipo` importadas desde chofer.ts

**Servicios nuevos**:
- `ClienteService` (`src/app/servicios/clientes/cliente.service.ts`):
  BehaviorSubject para clientes, init() llamado desde HomeComponent,
  guardarCliente(), eliminarCliente(), toFirestore(), verificarCuitDuplicado()
- `ClienteFactoryService`: crearCliente(), editarCliente()

**Componentes modificados**:
- `ClienteAltaComponent`: usa ClienteFactoryService y ClienteService,
  verificación de CUIT duplicado, formularios deshabilitados en modo vista
- `ClientesListadoComponent`: suscripto a ClienteService,
  usa TablaGenericaComponent

**HomeComponent**: agrega this.clienteService.init()

**TODO**: lógica de vendedor[] pendiente para cuando se refactorice módulo Vendedores

---

### Módulo Operaciones — Junio 2026

> Refactor en curso. La app NO compila durante esta etapa: hay errores de tipado
> pendientes que se resuelven fase por fase. Lo listado abajo es lo ya completado.

**Interfaces modificadas** (`src/app/interfaces/operacion.ts`):
- `Operacion` rediseñada: los objetos embebidos `Cliente`/`Chofer` completos se
  reemplazan por snapshots con referencia por ID. Nuevas sub-interfaces `RefCliente`,
  `RefChofer`, `RefVehiculo`, `RefProveedor` (cada una con `id` canónico + campos
  congelados al alta para exhibición y verdad histórica)
- `idOperacion` migrado de number a string (document ID de Firestore). No se persiste;
  se reconstruye al leer. Sigue siendo el eje que relaciona los InformeOp con la Operacion
- `numeroOperacion: number` agregado: correlativo visible para el usuario (pendiente de
  implementar la generación vía servicio contador)
- `patenteChofer` eliminado: reemplazado por `vehiculo.dominio` (exhibición) y
  `vehiculo.id` (identificación), al ser Vehículo ahora colección independiente
- `facturaCliente`/`facturaChofer` renombrados a `informeOpCliente`/`informeOpChofer`
- `tarifaEventual`/`tarifaPersonalizada` (propiedades e interfaces) renombradas a
  `datosTarifaEventual`/`datosTarifaPersonalizada` (y tipos `DatosTarifaEventual`/
  `DatosTarifaPersonalizada`), ahora nullable, para no colisionar con las tarifas reales
- `acompanienteCant` corregido (typo: antes `acompaniante`)
- `EstadoOp` rediseñada de 7 flags booleanos a tres ejes ortogonales: `ciclo`
  ('abierta' | 'cerrada' | 'liquidada'), `liquidacion` ({cliente, chofer}) y
  `proforma` ({cliente, chofer}). "Liquidada total" pasa a ser derivada
  (liquidacion.cliente && liquidacion.chofer), no se almacena
- type `OperacionUI` eliminado (obsoleto, sin uso)

**Servicios modificados**:
- `LiquidacionService` (`servicios/liquidaciones/`): traducidas las cuatro transiciones
  de estado al nuevo modelo de `EstadoOp` (`actualizarOperacionProforma`,
  `actualizarOperacionInfOp`, y los bloques de estado de `revertirProforma` y
  `revertirInformeLiq`). Eliminada la mecánica vieja de apagar flags al facturar y la
  lógica condicional de reversión. Clonado de estado corregido a spread anidado
- `DbFirestoreService`: eliminados métodos muertos de liquidación/proforma ya migrados
  a LiquidacionService (procesarLiquidacion, revertirCambios, procesarProforma,
  anularProforma, anularInformeLiq + helpers). Imports huérfanos limpiados
- Lecturas/escrituras simples de estado traducidas en `reportes-op.service.ts`,
  `tablero.service.ts` y `valores-op.service.ts`

**Servicios eliminados**:
- `servicios/liquidacion/` (singular): duplicado legacy de `servicios/liquidaciones/`
  (plural, vigente), sin callers vivos

**Componentes modificados**:
- `tablero-op.component.ts`: lógica del badge de estado centralizada en
  `getEstadoLabel()` con prioridad estricta (Proforma CH > Proforma CL > Liquidada >
  Liq CL > Liq CH > Cerrada > Abierta). Nomenclatura corregida (Facturada → Liquidada).
  `getEstadoBadgeClass` actualizado
- `tablero-diario.component.ts`: guarda de eliminación traducida al nuevo modelo de estado
- `proforma.component.ts`: eliminado método muerto de armado/edición de proforma vieja

**Pendiente dentro de Operaciones**:
- Fase de conexión: componentes `tablero-diario` / `carga-multiple` / `operaciones-table`
  (integrar `altaDesdeAsignacion`, `AsignacionService.cargarFecha`, lista de items)
- Refactor módulo de carga/tablero (EstadoOp inválido en factories de carga — ver deuda crítica)
- Refactor Tarifas (rama especial deshabilitada — ver deuda crítica)
- Poblar `vendedor` en `OperacionFactoryService` (ver deuda crítica)

#### Fase D — Resolución de errores de tipado (COMPLETADA)

Resueltos los 221 errores de compilación introducidos por el rediseño de `Operacion`
(objetos embebidos → snapshots `RefCliente`/`RefChofer`/`RefVehiculo`/`RefProveedor`).
La app compila: 0 errores no-spec. 15 archivos corregidos.

**Archivos resueltos (en orden):**
db-firestore.service.ts, editar-tarifa-op.component.ts, reportes-op.service.ts,
liquidaciones-op.component.ts, tablero.service.ts, resumen-op-calculator.service.ts,
tablero-op.component.ts, editar-inf-op.component.ts, carga-multiple.component.ts,
valores-op-chofer.service.ts, valores-op-cliente.service.ts, modal-resumen-op.component.ts,
carga-tablero-diario.component.ts, operaciones-table.component.ts, valores-op.service.ts.

**Cambios estructurales (no solo de tipado):**
- Getters de resolución en ChoferService: `getChoferPorId`, `getTipoContratacion`, `getContratacionChofer`.
- `eliminarInformesPorIdOperacion` (DbFirestoreService) recibe `tipoContratacion` por parámetro
  (evita circular; la resolución vive en TableroService).
- `vendedor?: string[]` agregado a `RefCliente` (snapshot histórico).
- Firmas de `$calcularKm` y `$calcularCG` (valores-op-cliente/chofer) ampliadas a tipo estructural
  mínimo `{ categoria: { catOrden: number } }` — aceptan Vehiculo y RefVehiculo.
- `OperacionRuntime` redefinido con `Omit<Operacion,'chofer'> & { chofer: Chofer; patenteChofer? }`
  en carga-multiple, carga-tablero-diario, operaciones-table.

**⚠️ DEUDA CRÍTICA — RECUPERAR ANTES DE MERGEAR A PRODUCCIÓN**

Son cambios de COMPORTAMIENTO hechos para compilar bajo el criterio "mínimo en código que se reescribe":

1. **Tarifa especial deshabilitada en cálculo y preview.**
   En `valores-op.service.ts` y `modal-resumen-op.component.ts`, toda la lógica de tarifa
   ESPECIAL está COMENTADA y "especial" se trata como "general". `op.cliente.tarifaTipo` /
   `op.chofer.tarifaTipo` no están en el snapshot. **Una op de tarifa especial se
   factura/muestra como general mientras esté así.**
   Buscar: `// TODO: refactor Tarifas — rama especial deshabilitada`.

2. **EstadoOp inválido en factories de carga.**
   `crearOperacionRuntime` (carga-multiple) y la factory de carga-tablero-diario crean `estado`
   con los 7 flags viejos, NO el `EstadoOp` de 3 ejes, tapado por `as unknown as`.
   Recuperar en el refactor del módulo de carga/tablero.

3. **vendedor no se puebla en el factory.**
   `vendedor` está en `RefCliente` pero `OperacionFactoryService` no lo puebla aún.
   Las comisiones de vendedor no se asignan en ops nuevas hasta implementarlo.
   Buscar: `// TODO: refactor Vendedores`.

**Deuda menor / observaciones (no bloquean merge)**
- `.spec.ts`: ~676 errores pre-existentes, fuera de scope (refactor de tests, fase aparte).
- Bug lógico preexistente en `carga-tablero-diario.guardar`: `operacionesFinales.map((op) => { op = this.valoresIniciales(op); })` sin return — el map no reasigna.
- Inconsistencia centinela "sin proveedor": `idProveedor === '0'` vs `=== ''` (db-firestore L1694). Unificar en refactor Facturación/Tarifas.
- Métodos huérfanos: `getProveedor` (tablero-op), `$getTarifaTipoChofer` (valores-op-chofer) — sin callers, marcados, no borrados.
- Imports huérfanos pre-existentes: `parseActionCodeURL` y `Proveedor` en valores-op-cliente (limpiar con eslint --fix).

#### Subsistema Asignaciones — capa de servicios (COMPLETADA)

**Modelo nuevo (`interfaces/asignacion.ts`):**
- Reescritura completa: las viejas `Asignacion`/`AsignacionBase`/`AsignacionChofer`
  (anidadas, clavadas a `idChofer`) se reemplazan por:
  - `Asignacion`: tablero persistido de UNA fecha (document ID = fecha). Campos:
    `idAsignacion` (reconstruido, no se persiste), `fecha`, `asignado` (borrador→confirmado,
    one-way), `timestamp`, `items: AsignacionItem[]` (lista plana, no diccionario por cliente).
  - `AsignacionItem`: 1 item ↔ 1 op. `idItem` local (`crypto.randomUUID`), `idCliente`,
    `sujeto: SujetoAsignacion`, `ref` (snapshot de exhibición), `observacion`, `hojaDeRuta`,
    `idOperacion` (`null` en borrador), `estado: EstadoAsignacion`.
  - `SujetoAsignacion`: union discriminada por contratación —
    `'directo' { idChofer, idVehiculo|null }` | `'proveedor' { idProveedor, idChofer|null, idVehiculo|null }`.
    Captura que el vehículo es el objeto dominante y que tanto en `directo` como en
    `proveedor` el chofer y el vehículo pueden diferirse a operaciones-table.
  - `EstadoAsignacion`: `'activa' | 'anulada' { motivo, timestamp }`. Reemplaza el borrado
    físico del modelo viejo: anular marca el item, NUNCA lo elimina (registro histórico íntegro).
- Colección Firestore NUEVA: `asignaciones`. La vieja `tableroDiario` queda como
  backup intacto (sin callers nuevos).

**Servicios:**
- `OperacionFactoryService`: `crearOperacionBase` ahora recibe `chofer` y `vehiculo`
  nullable; construye `RefChofer`/`RefVehiculo` vacíos cuando están pendientes (estado
  transitorio, validado antes de persistir). `getTarifaTipo` tolera `chofer null`.
  `EstadoOp` de 3 ejes construido acá (resuelve deuda Fase D del EstadoOp inválido).
- `OperacionService`:
  - `crearOperacionesDesdeAsignacion(items, fecha) → { creadas: OperacionCreada[], errores }`:
    Puente entre asignación y operación. Resuelve cliente/vehículo/chofer/proveedor por
    `sujeto.tipo`; devuelve pares `item↔op` explícitos (`OperacionCreada`). Errores no abortan la tanda.
  - `calcularValoresIniciales(op)`: centraliza el cálculo de valores antes duplicado en
    `carga-multiple` y `carga-tablero-diario`. STUB — replica el flujo actual con
    `// TODO: refactor Tarifas`.
  - `altaDesdeAsignacion(fecha, items)`: coordinador atómico. Punto de entrada ÚNICO para
    ambos caminos de alta. Secuencia: construir → validar resolución → calcular valores →
    validar pendientes (chofer/vehículo) → reservar números (transacción) → pre-generar ids →
    armar tablero → batch atómico (ops `'crear'` + tablero `'reemplazar'`) → log único.
    Devuelve `Resultado<{creadas, errores}>`.
- `AsignacionService` (NUEVO): dueño del tablero del día. `BehaviorSubject` reemplazable con
  listener vivo (`cargarFecha`). Métodos: `getAsignacionActual`, `getTableroPorFecha`,
  `confirmarTablero` (arma sin persistir, para el batch del coordinador), `guardarBorrador`,
  `agregarItem`, `marcarItemAnulado` (marca, NUNCA borra), `actualizarItem`,
  `descartarBorrador` (solo si `asignado === false`). Escritura directa a `DbFirestoreService`
  + log directo a `LogService`.

**Infraestructura nueva:**
- `DbFirestoreService`: `generarId(coleccion)` (doc id sin escribir), `commitBatch`
  (batch atómico multi-colección, chunking ≤500, modo `crear`/`reemplazar` por escritura),
  `setDocSinId` (escribe sin inyectar id), `getDocObservable` (observable de doc único).
- `NumeradorService`: `reservarRangoOperaciones(n)` (transacción, contador `'OPER'`,
  avanza nunca retrocede, huecos tolerados).
- `interfaces/resultado.ts`: `Resultado<T>` genérico unificado.

**Deuda de Fase D resuelta en este frente:**
- `EstadoOp` de 3 ejes ahora se construye en el factory (eliminado el riesgo de los
  7 flags viejos en factories de carga).
- `crearOperacionBase` tolera snapshots pendientes (chofer/vehículo vacío transitorio).

**Deuda nueva registrada:**
- *Migración de tableros viejos* (`tableroDiario → asignaciones`): diferida al frente de
  migración de Operaciones. Se reconstruirán desde `idOperacion` (op migrada con `RefVehiculo`) —
  más fácil después de migrar las ops. Backup en colección `tableroDiario`.
- *`numeroOperacion` de ops históricas*: ops previas no tienen correlativo (contador `OPER`
  arranca en 1). Decidir en migración de Operaciones si se asigna retroactivo.
- *`commitBatch` usa `set` para modo `'crear'`*: el SDK web v11 no expone `batch.create()`.
  Protección anti-duplicado actual: bloqueo de UI. Si aparecen duplicados por reintento,
  agregar clave de idempotencia en `runTransaction` (el `modo` ya distingue qué escrituras
  la necesitan).
- *Interfaces `Resultado`/`ResultadoConObjeto` viejas* (en `db-firestore.service.ts`, con
  callers en tarifas/reportes/cliente-tarifa-personalizada): unificar con `Resultado<T>` nuevo
  y mover a `interfaces/`. Tarea de Facturación/Tarifas.
- *Exclusión del rol `'god'` del log*: se pierde al llamar `LogService` directo (antes vivía
  en `StorageService`). Redefinir en refactor de Roles.
- *Vínculo `item↔op`*: resuelto con pares explícitos (`OperacionCreada`), ya no por índice
  de array (cambio de diseño registrado en esta sesión).

#### Fachada de TableroService (COMPLETADA)

**TableroService** reescrito como fachada delgada PROVISORIA. Los cuatro callers externos
siguen llamándolo, pero ahora traduce al modelo nuevo (colección `asignaciones`, items con
estado `activa`/`anulada`) delegando en `AsignacionService`:

- `actualizarAsignacionDesdeOperacion` (modal-resumen) → `AsignacionService.actualizarItem`
- `anularOpEnTablero` (liquidaciones) → `marcarItemAnulado`. Ahora recibe `motivo`
  (el caller ya lo tenía del modal; se le agregó como parámetro).
- `anularOperacionYActualizarTablero` (tablero-op) → `marcarItemAnulado`. RETIENE la
  lógica de baja de op vieja (papelera + eliminar informes) hasta construir
  `OperacionService.bajaOperacion` (patrón A2).
- `altaOperacionYActualizarTablero` (papelera) → `reactivarItem` + reinicia estado
  (`OperacionFactoryService.estadoInicial`) y km, re-guarda con `setDocSinId`.
- `AsignacionService`: agregado `reactivarItem` (inverso de `marcarItemAnulado`).
- `PapeleraComponent`: comentada la mutación al EstadoOp viejo (7 flags) y km en
  `restaurarObjeto`; el reinicio correcto lo hace ahora la fachada.
- Imports y código muerto del modelo viejo limpiados en TableroService (`ChoferAsignado`
  local, `ExcelService`, `Swal`). `deleteTablero` comentado (sin callers).

**Convivencia de formatos (estado transitorio conocido):**
Toda la app escribe el tablero en el modelo NUEVO (`asignaciones`) EXCEPTO los dos
componentes de carga (`tablero-diario`, `carga-multiple`), que aún escriben el VIEJO
(`tableroDiario`) hasta su migración. Métodos viejos de TableroService que siguen activos
con callers desde los componentes de carga (a eliminar cuando migren): `getTableroPorFecha`,
`guardarTablero`, `altaMultipleOperacionesYActualizarTablero`, `getCategoriaDesdeOperacion`.

**Hueco conocido por la convivencia:** una op dada de alta desde `carga-multiple` se escribe
en `tableroDiario`; si luego se anula desde un caller externo (ya en modelo nuevo),
`marcarItemAnulado` busca el item en `asignaciones` y no lo encuentra. Se cierra al migrar
los componentes de carga — por eso esa migración es el cierre necesario del frente, no
opcional.

**Pendiente del frente Asignaciones (fase de conexión, próxima sesión):**
- Migrar `tablero-diario`: grilla por VEHÍCULOS (no choferes), resolución vía
  `ChoferService.getVehiculosActuales`/`getVehiculosPorChofer`, producir `AsignacionItem[]`
  con sujeto discriminado, usar `cargarFecha`/`guardarBorrador`/`descartarBorrador`,
  alta vía `OperacionService.altaDesdeAsignacion`. Eliminar `OperacionRuntime` (chofer
  completo) y `patenteChofer`.
- Migrar `carga-multiple`: listar directos + proveedores (no choferes de proveedor sueltos),
  producir la misma `AsignacionItem[]`, converger en `altaDesdeAsignacion`.
- `operaciones-table`: selección de vehículo/chofer cuando quedó pendiente (proveedor o
  multi-vehículo); recálculo de `tarifaTipo` al resolver chofer de proveedor.
- Al cerrar lo anterior: eliminar métodos viejos de TableroService, `deleteTablero`, e
  interfaces `TableroDiario`/`ChoferAsignadoBase` (definidas en tablero-diario.component.ts).

**Coordinadores pendientes en OperacionService (frentes propios posteriores):**
- `bajaOperacion` (atómico: papelera + eliminar informes + `marcarItemAnulado`). Hoy la baja
  vive retenida en la fachada (A2) y en liquidaciones-op paso a paso.
- `editarOperacion` (atómico: update op + `actualizarItem` tablero). Hoy en modal-resumen
  paso a paso.
- `restaurarOperacion` (atómico: reinicio estado/km + re-guardar + `reactivarItem`). Hoy en
  la fachada.

#### Módulo Operaciones — Componente tablero-asignaciones (migración de tablero-diario)

Componente nuevo creado de cero con el modelo nuevo del subsistema Asignaciones.
Reemplaza a `tablero-diario` (que queda intacto hasta el switch). Ubicación:
`src/app/raiz/operaciones/tablero-asignaciones/`. Declarado en OperacionesModule.
Construido al lado del viejo; el switch (activar ruta + eliminar viejo) está diferido
hasta migrar `operaciones-table` (ver deuda en CLAUDE.md).

**Estado:** completo en su dominio. El alta NO cierra end-to-end hasta migrar
`operaciones-table`.

**Pool de vehículos** (no choferes): 1 tarjeta por vehículo, construido reactivo
(`combineLatest` de `vehiculos$`/`choferes$`/`proveedores$`). Criterio de entrada:
vehículo existe + dueño (chofer/proveedor) ACTIVO y resoluble. Dueño en papelera o
inactivo → excluido. `asignadoA` resuelto contra ChoferService/ProveedorService;
muestra chofer (apellido, nombre) o proveedor (razón social).

**Viewmodels efímeros** (en el componente, NO en `interfaces/`): `VehiculoPool`
(`asignadoA` reusa `AsignacionRef['asignadoA']`), `GrupoCategoriaPool`, `EstiloCategoria`.

**Categorías:** catálogo desde `StorageService.loadInfo("tarifasGralCliente")[0].cargasGenerales`
(campo real `orden`, mapeado a `catOrden`). `// TODO: refactor Tarifas`. `categoriasOrdenadas`
(asc por `catOrden`) es la base de agrupamiento y color.

**Color híbrido posicional** (`getEstiloCategoria`): posición en `categoriasOrdenadas` < 7 →
clase Bootstrap; ≥ 7 → HSL ángulo áureo (`hue = pos * 137.5 % 360`, sat 65%, luz 45%, texto
blanco); -1 (sin categoría) → gris. Reemplaza los 3 métodos viejos `getColorClassFor*`. Color
por IDENTIDAD (posición estable), no por índice de iteración.

**No-disponibilidad:** solo aplica a vehículos de chofer DIRECTO (`vehiculoNoOperativo()`).
Proveedor nunca se atenúa acá (chofer diferido a operaciones-table). Recalcula al cambiar de
fecha, NO recompone el pool.

**Dos modos** según `asignado`:
- `'edicion'`: tablero null o `asignado:false` → borrador local `itemsBorrador`, lectura
  one-shot `getTableroPorFecha`, sin listener.
- `'visor'`: `asignado:true` → solo lectura, listener vivo `cargarFecha` + `asignacion$`.

Variable explícita `modo:'edicion'|'visor'`. Transición al alta: one-way a visor.

**Borrador local:** copia profunda (`structuredClone`) de items al cargar. `borradorSucio`
(flag) para avisar antes de descartar al cambiar de fecha (Swal de confirmación). Sin
localStorage (eliminado por completo respecto al viejo).

**Drag & drop:** pool SOLO fuente; columnas de cliente SOLO destino. Drop CREA un
`AsignacionItem` nuevo (`idItem` `crypto.randomUUID`, sujeto derivado de `asignadoA`, ref
copiado del pool, `idOperacion null`, estado `activa`). NO `transferArrayItem`. Duplicados
permitidos. Solo en modo edición.

**Items por cliente ordenados** (`itemsDeCliente`): primario `ref.categoria.catOrden` asc;
desempate `claveOrden` alfabético (apellido+nombre chofer / razónSocial proveedor) con
`localeCompare`. Orden VISUAL (`itemsBorrador` conserva orden de inserción).

**Quitar item:** solo modo edición, filter por `idItem`, sin Firestore, sin modal. NO existe
baja de operaciones desde este componente (se hace en tablero-op).

**Feedback del pool** (solo edición): opacidad si asignado, contador `vecesAsignado`, tooltip
`clientesAsignados` (recorre `itemsBorrador` por `sujeto.idVehiculo`).

**Items anulados en visor:** se muestran atenuados con motivo en tooltip (registro histórico),
no se filtran.

**Acciones:**
- `guardarBorrador`: `AsignacionService.guardarBorrador` + recargar.
- `altaOp`: orquestador de 3 etapas (ver abajo).
- `limpiar`: caso A — `descartarBorrador` si hay borrador guardado en Firestore, con
  confirmación destructiva; caso B — vaciar local, confirmación liviana solo si `borradorSucio`.
- `descargar`: DIFERIDO, muestra aviso.

Regla unificada: toda persistencia exitosa termina en `cargarTablero(fecha)`.

**OperacionService.altaDesdeAsignacion — firma y cuerpo nuevos** (Bloque 1):
- Firma nueva: `altaDesdeAsignacion(fecha, creadas: OperacionCreada[])` — recibe ops FINALES,
  no `AsignacionItem[]`.
- Ya NO llama a `crearOperacionesDesdeAsignacion` (lo hace el componente antes de abrir la tabla).
- Paso nuevo: reconstruye `item.sujeto` desde la op final. El tipo directo/proveedor se resuelve
  vía `ChoferService.getTipoContratacion(op.chofer.id)`. `ref` NO se toca.
- Guardas: tipo `undefined` o proveedor sin `op.proveedor` → aborta sin escribir.
- Orden: validaciones que abortan ANTES de reservar números (evita huecos en el correlativo).
  `calcularValoresIniciales` se mantiene en el servicio (depende de datos que el usuario completa
  en la tabla — debe vivir acá).
- `crearOperacionesDesdeAsignacion` y `calcularValoresIniciales` NO se modificaron.

**Flujo de alta — 3 etapas:**

```
componente
  → crearOperacionesDesdeAsignacion(items, fecha)   [ops básicas, todo-o-nada, sin red]
  → operaciones-table (modal)                       [usuario completa → ops finales]
  → altaDesdeAsignacion(fecha, opsFinales)          [persiste atómico]
```

Cancelar el modal es inofensivo: ops básicas en memoria, nada persistido hasta el batch final.

**Prerequisito agregado:** `ProveedorService.getProveedorPorId(id)` — patrón de `getChoferPorId`.

---

### Pendiente

- Módulo Operaciones — fase de conexión: `operaciones-table` y `carga-multiple`; switch (activar ruta `tablero-asignaciones`, eliminar `tablero-diario`) diferido hasta migrar `operaciones-table`
- Módulo Vendedores (incluye lógica de vendedor[] en Cliente)
- Módulo Liquidaciones
- Módulo Facturación
- Módulo Finanzas
- Módulo Reportes
- Módulo Legajos (revisión post-migración)
- Módulo Ajustes
- Tarifas (refactorización del sistema completo)
- Restauración desde papelera (EntidadResolverService)
