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

**Borrador en curso (persistencia en memoria entre navegaciones).**
Problema: al salir y volver al componente, Angular lo destruye y recrea; el borrador
local no guardado (`itemsBorrador`) se perdía. El viejo lo preservaba vía localStorage,
que eliminamos.

Solución: el borrador en curso vive en `AsignacionService` (singleton, sobrevive a la
destrucción del componente), NO en localStorage ni en Firestore. Es un buffer en memoria
del trabajo en curso, distinto del listener (`cargarFecha`) y del borrador persistido
(`guardarBorrador`).

- `AsignacionService`: interfaz local `BorradorEnCurso { fecha, items }` + campo privado
  `_borradorEnCurso` + tres métodos (objeto plano + getter síncrono, NO `BehaviorSubject`:
  un solo consumidor que lo lee una vez al montarse, no se observa en vivo):
  `setBorradorEnCurso`, `getBorradorEnCurso`, `limpiarBorradorEnCurso`.
- `tablero-asignaciones`:
  · `ngOnInit` rehidrata: si hay borrador en curso, setea fecha/items/`modo='edicion'`/
    `borradorSucio=true` y NO va a Firestore (el borrador en curso tiene prioridad sobre
    Firestore: es lo más reciente que tocó el usuario).
  · `ngOnDestroy` espeja: si `modo==='edicion' && itemsBorrador.length>0`, llama
    `setBorradorEnCurso`. (En visor o vacío no espeja nada.)
  · `limpiarBorradorEnCurso` en: `guardarBorrador` (éxito), `altaOp` (éxito), `limpiar`
    (casos A y B), y al confirmar descartar en cambio de fecha. El trabajo persistido o
    descartado no debe reaparecer.

Alcance: cubre navegación (salir/entrar del componente). NO cubre F5/recarga de página
(el service singleton se reinicia con la app). Si se requiere F5, combinar con persistir
solo la fecha en localStorage — DIFERIDO, registrado como mejora futura.

Comportamiento por escenario:
- Borrador sin guardar → salir → volver: reaparece (rehidratado del service).
- Guardar borrador → salir → volver: NO reaparece del buffer (se limpió); el usuario
  elige fecha y `cargarTablero` lo levanta desde Firestore. Gana Firestore.
- Alta → salir → volver: NO reaparece (buffer limpio, quedó en visor/Firestore).
- Limpiar → salir → volver: NO reaparece (buffer limpio).

**Memoria del tablero al salir/entrar — corrección de badges y recuerdo del alta.**
El borrador en curso (arriba) cubría el trabajo local no guardado, pero dejaba dos casos
mal al volver al componente:
- Borrador PERSISTIDO: al volver mostraba badges incorrectos ("Sin tablero para esta
  fecha" + "Cambios sin guardar") aunque el tablero existiera guardado, porque la
  rehidratación seteaba `itemsBorrador` pero dejaba `this.tablero=null` y forzaba
  `borradorSucio=true`, saltándose `cargarTablero`.
- Tablero DADO DE ALTA: no se recordaba al volver — `ngOnDestroy` solo espejaba en modo
  edición; no existía recuerdo de la fecha en visor.

Solución (enfoque B — dos memorias separadas):
- Borrador en curso (ya existía): SOLO trabajo local no guardado.
- Última fecha vista (nueva, en `AsignacionService`): la fecha en cualquier estado.

`AsignacionService`: agregado `_ultimaFechaVista` con `setUltimaFechaVista` /
`getUltimaFechaVista` / `limpiarUltimaFechaVista` — memoria en el singleton, sobrevive
navegación (no F5), mismo patrón que el borrador en curso.

`tablero-asignaciones`:
- `ngOnInit`: prioridad (1) borrador en curso → rehidrata local (`tablero=null`,
  `borradorSucio=true`, correcto para trabajo no guardado); si no hay, (2) última fecha
  vista → `cargarTablero(fecha)`, que reconstruye modo/tablero/badges/`borradorSucio`
  correctamente desde Firestore porque pasa por la máquina de estados en vez de saltarla.
  Los badges se corrigen justamente por dejar que `cargarTablero` haga su trabajo.
- `ngOnDestroy`: (1) espeja el borrador en curso SOLO si `modo==='edicion' &&
  borradorSucio` (corrección respecto al diseño inicial, que usaba
  `itemsBorrador.length>0`: tras guardar, los items quedan poblados pero limpios, y
  `length>0` reproducía el bug original — `borradorSucio` es el criterio correcto de
  "trabajo local sin guardar"); (2) recuerda la última fecha vista siempre que haya
  `fechaSeleccionada` (cualquier modo/estado).
- `limpiar()` caso A (descartar borrador persistido): además de `limpiarBorradorEnCurso`,
  llama `limpiarUltimaFechaVista()` y resetea `fechaSeleccionada=''` y
  `fechaAnterior=null` (el tablero de esa fecha ya no existe → el componente vuelve a
  estado inicial; además evita que `ngOnDestroy` regrabe la fecha descartada).
- `guardarBorrador` y `altaOp`: mantienen `limpiarBorradorEnCurso` (tras persistir, el
  trabajo está en Firestore → al volver cae en última fecha vista → estado correcto). NO
  limpian la última fecha vista (el tablero sigue existiendo en esa fecha, se puede volver
  a él).

Comportamiento por escenario (verificado):
- Borrador local no guardado → salir → volver: reaparece, badge "sin tablero" + sucio
  (correcto para local).
- Guardar borrador → salir → volver: reaparece, badge "Borrador guardado, sin alta", SIN
  "cambios sin guardar". (corrige el bug principal)
- Tablero dado de alta → salir → volver: reaparece en modo visor, badge "Dado de alta".
  (corrige el caso no cubierto)
- Descartar borrador persistido → salir → volver: NO reaparece, arranca sin fecha.

**Limitación conocida y aceptada (no es bug pendiente):** borrador PERSISTIDO + cambios
locales sin guardar → al volver muestra badges "sin tablero / cambios sin guardar". Causa:
hay borrador en curso (los cambios sin guardar), que tiene prioridad y rehidrata como
local, perdiendo visualmente que había una versión persistida debajo. Es coherente (hay
trabajo sin guardar, el estado real ES "sucio"). Resolverlo requeriría guardar en el
borrador en curso también el tablero persistido — la fragilidad del enfoque A que se
descartó. Se deja así deliberadamente.

---

#### Módulo Operaciones — Componente operaciones-editor (migración de operaciones-table)

Componente nuevo creado de cero, reemplaza a `operaciones-table` (que queda intacto hasta el
switch). Ubicación: `src/app/raiz/operaciones/operaciones-editor/`. Cierra el alta
end-to-end desde tablero-asignaciones.

**Contrato cumplido:** `@Input() operacionesCreadas: OperacionCreada[]` (plano, tipado) in /
`OperacionCreada[]` out por `modalRef.result`. Agrupa por `item.idCliente` internamente.

**Resolución de pendientes en la tabla:**
- Chofer de proveedor (`op.chofer.id === ''`): selector con `getChoferesPorProveedor`;
  recalcula tarifaTipo con la tarifa del PROVEEDOR.
- Vehículo (`op.vehiculo.id === ''`): selector con vehículos del dueño (proveedor o chofer).

**Eliminar = excluir del resultado (Opción B):** `Set<idItem>`, sin mutar el input, sin tocar
Firestore. Cancelar el modal es inocuo.

**Toggle eventual:** `OperacionRuntime` ELIMINADO. El tipo original se guarda en un
`Map<idItem, TarifaTipo>` del componente (estado de UI); la mutación coherente vive en el
factory.

**Servicios — getters síncronos nuevos:**
- `ChoferService.getChoferesPorProveedor(idProveedor)`
- `ProveedorService.getTarifaTipo(idProveedor)` — fuente de verdad de la tarifa heredada por
  choferes de proveedor (reemplaza leer `chofer.tarifaTipo` para ese caso).
- `ClienteService.getClientePorId(id)`

**OperacionFactoryService — refactor + 3 métodos:**
- `getTarifaTipo` privado reemplazado por `resolverJerarquiaTarifa(cliente, tarifaSecundaria)`
  (jerarquía parametrizada, una sola fuente de verdad). `crearOperacionBase` sin cambio de
  comportamiento.
- `recalcularTarifaTipo(cliente, tarifaSecundaria)` — público, para el recálculo al resolver
  chofer de proveedor.
- `aplicarTarifaEventual(op, activar, tarifaOriginal)` — toggle eventual con invariante
  datosTarifaX.
- `aplicarTarifaTipo(op, tipo)` — aplica un tipo resuelto con invariante datosTarifaX.

**Integración:** `tablero-asignaciones.altaOp()` abre `OperacionesEditorComponent` directo
(`componentInstance.operacionesCreadas = opsBasicas`). Eliminado el `as any` y el TODO del
contrato provisorio.

**Deuda registrada:**
- `idCliente` de TarifaPersonalizadaCliente: interfaz dice `number`, datos corregidos a string
  en Firestore; `getTarifaPersonalizada(idCliente: any)`. Verificar alta/edición de tarifas
  personalizadas al refactor de Tarifas.
- Estilos SCSS duplicados de operaciones-table (consolidar en el switch).

---

#### Módulo Operaciones — Componente carga-asignacion (migración de carga-multiple)

Componente nuevo creado de cero, reemplaza a `carga-multiple` (ELIMINADO en esta
misma sesión — ver más abajo). Ubicación:
`src/app/raiz/operaciones/carga-asignacion/`. Declarado en OperacionesModule.

**Selección sin pool de vehículos:** a diferencia de `tablero-asignaciones`
(que arrastra vehículos concretos vía drag&drop), acá se eligen CHOFERES
DIRECTOS o PROVEEDORES (checkboxes, dos listas separadas — no choferes de
proveedor sueltos como en el viejo). Filtro defensivo asimétrico: choferes
directos sin vehículo asociado se excluyen (tener vehículo es requisito de
alta de chofer directo — seguro, no regla activa); proveedores sin vehículo
NO se excluyen (caso válido, se resuelve después).

**Pre-resolución de vehículo único:** si la entidad seleccionada tiene
exactamente un vehículo, `armarItems()` completa `sujeto.idVehiculo` y `ref`
(dominio, categoria) de inmediato — sin necesidad de elegir en
operaciones-editor. Con 2+ vehículos, queda pendiente como antes.

**Detección temprana de borrador sin confirmar:** nuevo método
`AsignacionService.existeBorradorSinConfirmar(fecha)`. Al cambiar de fecha,
si existe un tablero borrador para esa fecha, deshabilita todo el formulario
y muestra aviso — evita que el usuario arme una selección que
`altaDesdeAsignacion` bloquearía igual al final.

**Flujo de alta:** igual a `tablero-asignaciones.altaOp()` en 3 etapas
(`crearOperacionesDesdeAsignacion` → modal `operaciones-editor` →
`altaDesdeAsignacion(fecha, opsFinales, 'bloquear')`), sin borrador propio ni
modo edición/visor — no hay estado de larga vida entre navegaciones.

**Orden alfabético** en las tres listas de selección (clientes, choferes
directos, proveedores).

**`OperacionService.altaDesdeAsignacion` extendido:**
- Nuevo parámetro `siExisteBorrador: 'reemplazar' | 'bloquear' = 'reemplazar'`.
- Antes de armar el tablero final, lee el existente vía `getTableroPorFecha`:
  si `asignado === true`, fusiona `existente.items` con `creadas` (habilita
  altas parciales repetidas sobre una fecha ya confirmada — necesario para que
  `carga-asignacion` pueda agregar operaciones a un tablero ya dado de alta
  desde `tablero-asignaciones`). Si `asignado === false` (borrador) y el modo
  es `'bloquear'`, aborta sin escribir nada.
- `c.item.ref` ahora se reconstruye en el mismo paso donde ya se reconstruía
  `c.item.sujeto`, usando los datos finales de la op. Idempotente para
  `tablero-asignaciones` (el ref ya nacía correcto desde el pool); corrige el
  placeholder (`dominio:''`, `categoria:{catOrden:0,nombre:''}`) que nace en
  `carga-asignacion` cuando el vehículo queda pendiente hasta operaciones-editor.

**Layout del modal:** fix de altura flex (`.modal-content > *`) agregado en
`tablero-op.component.scss` (único caller actual de `modal-super-xl`) — el
host del componente ahora se estira para ocupar el alto fijo del modal,
corrigiendo que el footer quedara a mitad de altura. Cards de choferes/
proveedores igualadas en alto (flex-grow-1/h-100). DEUDA: fix scopeado a ese
archivo, no global — replicar si otro caller abre el mismo modal sin pasar
por tablero-op.

**Eliminación de `carga-multiple` (mismo frente, cierre):**
- Diagnóstico previo confirmó sin referencias cruzadas: `OperacionRuntime`,
  `TarifaBase`, `GrupoTabla` eran definiciones/copias locales de
  `carga-multiple.component.ts`, sin uso externo. Las copias de
  `OperacionRuntime` en `carga-tablero-diario` y `operaciones-table` son
  independientes (ya documentado en Fase D), no importan del archivo eliminado.
- Eliminados: `carga-multiple.component.ts/.html/.scss/.spec.ts` completos.
- `OperacionesModule`: quitado import + declaración.
- `tablero-op.component.ts`: quitado import muerto (el call site ya abría
  `CargaAsignacionComponent` desde antes de esta limpieza).
- Switch PARCIAL, no el switch completo de la deuda crítica: `tablero-diario`,
  `operaciones-table` y los métodos viejos de `TableroService` siguen
  pendientes e intactos.

(Corrección de redacción: una versión anterior de esta entrada afirmaba
erróneamente que carga-asignacion no tenía caller — sí lo tenía, ver
CLAUDE.md sección 'Switch completado' para el estado confirmado.)

---

#### Switch completo — eliminación de tablero-diario / carga-tablero-diario / operaciones-table

Cierre del frente de migración a Asignaciones. Diagnóstico previo (mismo
criterio ya aplicado a carga-multiple) confirmó que los tres formaban un
bloque único: operaciones-table se usa como selector embebido
(app-operaciones-table) dentro de carga-tablero-diario, que a su vez solo
es abierto como modal desde tablero-diario — ningún componente eliminable
por separado.

**Eliminados** (archivos completos, .ts/.html/.scss/.spec.ts):
- tablero-diario
- carga-tablero-diario
- operaciones-table

**Interfaces eliminadas** (definidas en tablero-diario.component.ts,
sin consumidores fuera del bloque): TableroDiario, ChoferAsignadoBase.

**Métodos eliminados** (sin caller externo al bloque, confirmado por
diagnóstico):
- TableroService: getTableroPorFecha (viejo, sobre colección tableroDiario
  — no confundir con el de AsignacionService), guardarTablero,
  altaMultipleOperacionesYActualizarTablero (ya @deprecated),
  getCategoriaDesdeOperacion (sin caller propio, solo interno al anterior),
  deleteTablero (ya comentado).
- DbFirestoreService.getTableroPorFecha: no contemplado en el alcance
  original — detectado durante la ejecución al quedar con import roto
  (TableroDiario) tras la eliminación de tablero-diario.component.ts.
  Verificado sin caller propio antes de eliminar.

**Routing y UI:**
- Ruta 'diario' quitada de operaciones-routing.module.ts.
- Pestaña "Tablero Diario" quitada del array tabs de OpControlComponent
  (shell de Operaciones). Única pestaña de tablero de asignaciones activa:
  "Tablero Asignaciones" → tablero-asignaciones.

**Corrección de diagnóstico durante la sesión:** un diagnóstico previo
había calificado a operaciones-table como "huérfano, eliminable de forma
aislada" — incorrecto: solo se había buscado por nombre de clase/modal.open(),
no por selector en templates. Corregido antes de ejecutar ningún borrado.
Mismo error de método se repitió al evaluar si '/diario'/'asignaciones'
tenían acceso de UI real: la búsqueda inicial solo cubrió routerLink
literal, sin detectar la navegación programática (router.navigate()) que
arma OpControlComponent — ambas rutas sí eran alcanzables por pestaña,
no solo por URL manual. Corregido antes de decidir el alcance del switch.

**Deuda nueva detectada (no resuelta, no bloqueante):** desincronización
entre `selectedTab` y la ruta activa en OpControlComponent — el resaltado
de pestaña no se sincroniza con la URL real al refrescar o entrar por
deep-link. Mismo patrón shell-con-pestañas se repite en ~12 componentes
*-control del proyecto. Ver CLAUDE.md para detalle.

---

#### Coordinadores OperacionService.bajaOperacion / restaurarOperacion

- Dos coordinadores nuevos, mismo patrón de `altaDesdeAsignacion`: ownership por entidad
  primaria, batch atómico, log único, `Resultado<T>` como retorno.
- `bajaOperacion`: valida liquidación (fuera de alcance si en curso), resuelve
  `tipoContratacion`, busca informes SOLO si ciclo `'cerrada'` (aborta si no existen), arma
  `LogDoc` de papelera con `LogService.createLogEntry` (método puro, sin escribir), anula el
  item de asignación con el nuevo método puro, todo en un `commitBatch`.
- `restaurarOperacion`: resuelve id real de papelera vía `getByField`, reinicia estado/km,
  reactiva el item de asignación, mismo `commitBatch`.
- `AsignacionService`: agregados `anularItemEnLista`/`reactivarItemEnLista` (puros);
  `marcarItemAnulado`/`reactivarItem` refactorizados para delegarles la lógica sin cambiar su
  comportamiento externo.
- `DbFirestoreService`: `EscrituraBatch` admite modo `'eliminar'` (`batch.delete`), aditivo.
- Deuda registrada: caller de PapeleraComponent y de la baja paso a paso siguen sin migrar a
  estos coordinadores (ver CLAUDE.md).

---

#### Componente tablero-op — migración a servicios nuevos + conexión de bajaOperacion

Migración de consultas y catálogos del modelo viejo (`StorageService`) al esquema de
servicios por entidad, y conexión del coordinador `bajaOperacion` como caller real.

**Consultas de operaciones:**
- Reemplazado `StorageService.syncChangesDateValue` + `storage.getObservable` por
  `OperacionService.cargarOperaciones(desde, hasta, 'desc')` + suscripción única a
  `operacionService.operaciones$`.
- La suscripción a `operaciones$` se movió a `ngOnInit`, **fuera** del callback de
  `dateRange.range$` (que ahora solo llama `cargarOperaciones`). Corrige una fuga de
  suscripciones preexistente: antes cada cambio de rango agregaba una suscripción nueva
  a `storage.getObservable` sin liberar la anterior (todas vivían hasta `destroy$`).
- Como `getAllByDateValue` usa un listener vivo de Firestore, ya no hace falta
  re-disparar una carga manual después de la baja: el listener refleja el borrado solo.

**Catálogos de clientes/choferes/proveedores eliminados del componente:**
Se confirmó que ningún método del componente los consumía — los datos que se muestran
(nombre de cliente, chofer, proveedor) salen de los snapshots (`RefCliente`/`RefChofer`/
`RefProveedor`) de cada operación, no de un catálogo completo. Se sacaron las
propiedades `choferes`/`clientes`/`proveedores`, su carga en `ngOnInit`, y los imports
correspondientes (`ChoferService`/`ClienteService`/`ProveedorService` no se inyectan en
este componente).

**`getProveedor(idProveedor)` eliminado:** confirmado huérfano (CLAUDE.md ya lo tenía
marcado como sin caller); se borró en vez de solo mantenerlo marcado.

**Tipado de IDs corregido:** `OpRow.idCliente`/`idChofer` y `FiltrosState.clienteId`/
`choferId` pasaron de `number` a `string` (venían con `Number(op.cliente.id)` /
`Number(op.chofer.id)` marcados con TODO desde la Fase D). Ajustado en cascada:
`seleccionarCliente`/`seleccionarChofer`, `rebuildDropdownsDesdeFiltradas` (`Map<string,string>`),
y el binding en el HTML de los `<select>` de filtro cruzado (se sacó el cast a `+number`).

**Baja conectada a `OperacionService.bajaOperacion`:** `openModalBaja()` reemplazó el
llamado a `TableroService.anularOperacionYActualizarTablero` por
`OperacionService.bajaOperacion(opSeleccionada, motivo)`, manejando `Resultado<void>`
(Swal de error con `resultado.mensaje` si `exito:false`). `TableroService` dejó de
inyectarse en este componente (sin otros usos acá).

**Alcance confirmado (decisión de negocio):** el botón de baja sigue habilitado solo
para operaciones en `'Abierta'` (`puedeEliminar()` sin cambios) — las cerradas se anulan
desde el módulo de Liquidaciones, no desde tablero-op.

**Fuera de esta sesión (sin tocar):** edición, cierre, e informe Excel de `descargarOp()`
— siguen dependiendo del refactor de Tarifas / verificación aparte.

---

### Refactor de Roles y Seguridad — Julio 2026

Primer frente que toca autenticación/autorización desde el arranque del
proyecto (adaptado de un proyecto anterior, sin revisión previa) y
primera incorporación de Cloud Functions. Hasta este frente, toda la
seguridad era de UI (`RoleGuard`/`*appRole`); Firestore no tenía
ninguna restricción real por rol.

**Modelo de datos:**
- `roles: {god, admin, manager, user}` (mapa de booleanos) → `role: 'dev'|'admin'|'manager'|'user'|'demo'`
  (string único). `god` renombrado a `dev` en código y en los valores
  reales de Firestore. Migración de documentos reales hecha manualmente
  por el desarrollador (pocos usuarios, no ameritaba
  `XxxMigrationService`).
- Nueva interfaz `Usuario` (`interfaces/usuario.ts`), primera interfaz
  tipada para el usuario (antes todo `any`).

**Servicios nuevos:**
- `UsuarioSesionService`: fuente única de la sesión en memoria,
  reemplaza el caché disperso de `StorageService` bajo la clave
  `'usuario'` (que `AuthService` dejó de poblar — se auditaron y
  corrigieron ~14 puntos de lectura de ese caché que hubieran quedado
  rotos en producción, incluyendo `LogService.createLogEntry`,
  transversal a todas las escrituras del proyecto).
- `GestionUsuariosService`: lectura puntual de `/users` (sin listener),
  siguiendo el precedente ya existente de
  `CuentaCorrienteService.obtenerRankingMorosos()`.

**`AuthService` reescrito de cero:**
- Métodos renombrados a español (`iniciarSesion`, `cerrarSesion`,
  `resetearPassword`).
- Eliminado: login con Google (`GoogleAuth`/`AuthLogin`, sin uso real,
  además estaba incompleto/roto — no navegaba ni poblaba sesión tras
  loguear).
- Corregido bug real: `VerifyEmailComponent.SendVerificationMail` usaba
  `this.afAuth.currentUser` nunca inyectado (`afAuth: any` sin asignar)
  — no funcionaba nunca. Corregido en su momento, luego el componente
  entero fue eliminado al cerrar el autoregistro (ver más abajo).
- Corregido: `StorageService.initializerAdmin()` traía la colección
  completa de `users` (emails, roles) al navegador de CUALQUIER usuario
  logueado sin chequear rol — bug de exposición de datos activo desde
  antes de este frente, sin relación directa con el refactor pero
  detectado y corregido en el camino porque las Security Rules nuevas
  lo iban a exponer como error en runtime para roles no autorizados.
- `SignOut`: orden de operaciones corregido (cerrar sesión en Firebase
  antes de limpiar storage, no al revés). `Swal` reemplaza
  `window.alert` en toda mensajería de error, consistente con el resto
  del proyecto.

**`RoleGuard`/`*appRole`:** migrados a comparación contra `role` string.
Sin jerarquía (confirmado por auditoría que no existía en código, pese a
la jerarquía documentada como intención en `CLAUDE.md` desde el inicio
del proyecto) — se preserva el comportamiento plano ya existente, no se
introduce jerarquía nueva.

**Migración de ~30 puntos de lectura de `roles.xxx`** en toda la app
(componentes, templates, `StorageService`, `LogService`, directiva
`*appRole` en 11 archivos adicionales detectados por el chequeo de
tipos de TypeScript al migrar `RolUsuario`) a `usuarioSesion.esRol(...)`.
Incluye rename `god`→`dev` en 7 routing modules y en la query Firestore
de `getAllColectionUsers`.

**Cloud Functions (primera incorporación al proyecto):**
- Proyecto `functions/` inicializado (TypeScript, 2nd gen, codebase
  único compartido entre `demo`/`vantruck`).
- `syncRoleClaim`: sincroniza `role` del documento al Custom Claim de
  Auth, con guard anti-escrituras-redundantes.
- `crearUsuario`/`editarUsuario`/`editarEmailUsuario`/`eliminarUsuario`:
  gestión completa de usuarios por `dev`/`admin`, autorización validada
  en código (Admin SDK, no depende de Security Rules). Detalle completo
  en `CLAUDE.md` → "Autenticación y roles".
- Verificado end-to-end contra el emulador de Firebase antes de
  cualquier deploy real: sincronización de claims, matriz de
  autorización completa (12 casos), rechazo/permiso de escritura por
  rol contra las reglas nuevas.

**`firestore.rules` reescrito de cero:** de
`allow read, write: if request.auth != null` (sin restricción real) a
matriz rol × módulo × acción. Fail-safe por defecto (colección sin
mapear → denegada). Detalle completo de categorías y excepciones en
`CLAUDE.md` → "Security Rules". Desplegado y verificado en `demo`
(encontró y expuso un bug real de UI preexistente: botones de baja
visibles para rol `user` en Operaciones/Clientes que las reglas
bloquean correctamente — ver deuda en `CLAUDE.md`).

**Pantalla de gestión de usuarios** (`raiz/ajustes/gestion-usuarios/`):
reemplaza a `ajustes-usuarios`/`usuarios-edicion` (eliminados
completos). Alta con generación de link de contraseña
(`generatePasswordResetLink`, comunicado manualmente, sin envío
automático de mail), edición de nombre/rol, cambio de email como acción
secundaria, eliminación con confirmación. Protecciones agregadas tras
pruebas: modal no cerrable sin haber copiado el link generado
(`backdrop: 'static'`, `keyboard: false`, botón Cerrar y botón × del
header deshabilitados hasta copiar) — perder el link sin copiarlo deja
a esa persona sin forma de generar contraseña. Cambiar el email de la
propia cuenta fuerza cierre de sesión inmediato (Firebase invalida el
refresh token automáticamente ante cambios de email; se adelanta el
cierre en vez de esperar a que el token falle solo).

**Cierre de autoregistro:** `register-user` (ex `sign-up`) y
`verify-email-address` eliminados junto con toda la maquinaria de
verificación de email asociada (innecesaria: el alta ahora la hace
`dev`/`admin`, que da fe del mail al crearlo con `emailVerified: true`
directo). `LimboComponent` se mantiene, cambia de propósito (de
"esperando verificación" a "sesión válida sin rol/acceso"; ya era el
mismo componente usado por `RoleGuard`). `resetearPassword` no se toca,
es independiente.

**Deuda nueva registrada** (detalle en `CLAUDE.md` → Deuda conocida):
control de permisos de UI disperso en `*appRole` por componente, sin
relación con la matriz real de Security Rules — candidato a
`PermisosService` centralizado, no abordado en este frente.

**Pendiente de este frente:**
- Réplica completa en `vantruck` (funciones → esperar propagación →
  reglas → código Angular + migración manual de documentos reales de
  producción), una vez validado el comportamiento en `demo`.

---

### Botones y Permisos — Julio 2026 (en progreso)

Frente de auditoría y rediseño del sistema de botones de acción
(`app-btn-*`) y del chequeo de rol disperso en `*appRole`/`esRol()`,
continuación del refactor de Roles y Seguridad.

**`BtnReimpresionComponent` eliminado** (`shared/botones/btn-reimpresion/`):
reemplazado por `app-btn-leer name="print"` en su único caller
(`finanzas/historial-movimientos.component.html`). No era código
muerto — el botón se renderizaba igual (sin `@if` sobre `nombre`) y su
`(click)="imprimirDetalle(m)"` era funcional — pero sus dos `@Input()`
(`nombre`, `disabled`) nunca se leían en el template: un componente con
Inputs muertos, no un componente sin uso.

**Bloque 1 — fundaciones de `PermisosService`/`*appPermiso` (sin conectar):**
infraestructura nueva agregada sin tocar ningún consumidor — el árbol
compila igual que antes, ningún `*appRole` existente fue reemplazado.
Detalle completo de la arquitectura de 4 capas acordada (dominio /
gating / presentación / consumidores) en `CLAUDE.md` → "Frente Botones
y Permisos".

- Interfaces de tabla renombradas (colisión de nombres detectada por la
  auditoría — dos `AccionTabla`/`ColumnaTabla` distintas e
  incompatibles convivían en el proyecto): `interfaces/tabla.ts` →
  `interfaces/tabla-generica.ts` (`ColumnaTablaGenerica`,
  `AccionTablaGenerica`), `interfaces/tablas.ts` →
  `interfaces/informes-tabla.ts` (`ColumnaInformesTabla<T>`,
  `AccionInformesTabla<T>`, `EventoInformesTabla<T>`,
  `OrdenInformesTabla`). Solo nombres, campos sin cambios. Imports
  actualizados en los 9 consumidores (`TablaGenericaComponent`,
  `TablaAccionesComponent`, `gestion-usuarios`,
  `choferes/clientes/proveedores-listado`, `InformesTablaComponent`,
  `facturacion-listado`, `facturacion-historico`).
- `interfaces/permiso.ts` (nuevo): `ModuloPermiso` (unión cerrada, 11
  módulos reales) y `AccionPermiso` (unión abierta a propósito).
- `PermisosService` (`servicios/permisos/`, nuevo): `matrizBase`
  traducida literal de `permitido()` en `firestore.rules`, granularidad
  por módulo (no por acción). `liquidaciones`/`facturacion`/`reportes`
  espejan `finanzas` 1:1 — sus colecciones reales comparten el mismo
  módulo `'finanzas'` en `moduloDe()`, sin distinción propia en las
  reglas hoy (confirmado con el desarrollador antes de asumir).
  `overrides` (por `'modulo.accion'`) queda vacío, listo para casos
  reales en frentes futuros. Hallazgo de la traducción: el rol
  `'manager'` no tiene ningún acceso real en `firestore.rules`
  (`permitido()` no lo menciona en ningún módulo), pese a que la UI lo
  habilita ampliamente vía `*appRole` — traducido literal (`false`).
  Resuelto como decisión explícita en el Bloque 2 (ver abajo), no deuda.
- `*appPermiso` (`shared/directives/permiso.directive.ts`, nuevo):
  calco de `RoleDirective`, sintaxis `'modulo'` o `'modulo.accion'`.
  Declarada en `SharedModule` junto a `RoleDirective`. Sin consumidores.

**Bloque 2 — los 4 `app-btn-*` consumen `PermisosService` (sin conectar
todavía):** ningún caller pasa `modulo`/`accion` todavía, comportamiento
visible idéntico a antes salvo la corrección de bug descrita abajo.

- **Bug de `disabled` inerte corregido** (independiente de permisos):
  20 de 40 ramas `@if` con `<button>` real entre los 4 componentes
  recibían `@Input() disabled` pero nunca lo bindeaban al `<button>`
  interno. Agregado `[disabled]=disabled` en 13 variantes de
  `BtnAgregarComponent` (Cerrar, Guardar, Descargar Legajo,
  GuardarClaro, GuardarCambios, GuardarCambiosClaro, guardarTarifa,
  Agregar, Confirmar, 'Agregar Contacto', AgregarContactoClaro,
  Facturar, Pagar) y 7 de `BtnLeerComponent` (DetalleColor, Detalle,
  Vehiculos, Imprimir, excel, pdf, print). `BtnEditarComponent`/
  `BtnEliminarComponent` ya estaban bien. La rama muerta `editarTarifa`
  de `BtnAgregarComponent` (0 invocaciones, valor real vive en
  `BtnEditarComponent`) quedó intacta a propósito, fuera de este
  arreglo. Caller real que este fix pone a funcionar por primera vez:
  `modal-contacto-proveedores.component.html` pasa
  `[disabled]="formContacto.invalid"` a `app-btn-agregar name="Agregar"`
  — antes el formulario inválido no bloqueaba el submit pese a la
  intención explícita del caller.
- **Inputs `modulo?: ModuloPermiso` / `accion?: AccionPermiso`**
  agregados a `BtnAgregarComponent`/`BtnEditarComponent`/
  `BtnEliminarComponent`/`BtnLeerComponent`, mismo patrón en los
  cuatro: inyectan `PermisosService`, getter `visible` (`!modulo ||
  permisosService.puede(modulo, accion)`) — sin `modulo`, siempre
  `true`, compatibilidad total con los ~90 sitios de uso existentes.
- Las 40 ramas `@if` de los 4 componentes envueltas con `&& visible`,
  sin excepción (incluidas variantes sin caller activo detectadas por
  la auditoría).
- **Decisión sobre `'manager'`:** rol teórico sin uso actual, sin
  ningún usuario real asignado. `PermisosService` lo deniega en los 11
  módulos a propósito. La migración de `*appRole`→`*appPermiso` en
  bloques futuros le va a quitar también el acceso visible en la UI
  (hoy incluido en varios `*appRole` de tarifas generales) — no se
  mantiene como botón visible sin respaldo real en las reglas. Detalle
  en `CLAUDE.md` → "Frente Botones y Permisos".

**Bloque 3 — `AccionGenericaComponent` (capa de Presentación, sin
conectar todavía):** componente nuevo (`shared/botones/accion-generica/`,
selector `app-accion-generica`) para botones crudos `<button>` repetidos
por la app que no encajan en el catálogo semántico cerrado de los 4
`app-btn-*` (ej. los de `tablero-asignaciones`) — no los reemplaza,
cubre un caso distinto.

- `label`/`variante`/`tamano`/`disabled` como inputs; `claseCompleta`
  arma `btn btn-${variante}` + `btn-${tamano}` si se pasa. `disabled`
  bindeado real al `<button>`, mismo criterio que los otros 4 (nunca
  `ngClass`). `<ng-content select="[icono]">` para ícono opcional.
- Mismo patrón de permisos que los otros 4: `modulo?`/`accion?`,
  `PermisosService` inyectado, getter `visible`.
- Sin `@Output()` — `(click)` se bindea directo en el host, igual que
  los otros 4 `app-btn-*` (burbujea del `<button>` interno).
- Declarado en `SharedModule`. Cero callers — se conecta en un bloque
  posterior.

**Bloque 4 — `TablaAccionesComponent` conectado a `PermisosService`, con
callers reales.** No es funcionalidad nueva: cierra en producción el
hallazgo de la auditoría "ningún `accionesTabla` de los 3 listados CRUD
vía `TablaAccionesComponent` aplica chequeo de rol a editar/eliminar"
(deuda ya registrada en `CLAUDE.md`).

- `TablaAccionesComponent`/`TablaGenericaComponent` reciben
  `@Input() modulo?: ModuloPermiso` y lo reenvían en cascada hasta los
  4 `app-btn-*`, con `accion` fija por bloque (`ver`/`editar`/
  `eliminar`/`vehiculos` — coinciden 1:1 con `AccionPermiso`, sin
  rename necesario). El `[disabled]="estaDeshabilitada(tipo)"` de
  editar/eliminar no se tocó, sigue siendo la regla de negocio por
  fila.
- 4 callers con `modulo` conectado: `clientes-listado="clientes"`,
  `choferes-listado="choferes"`, `proveedores-listado="proveedores"`,
  `gestion-usuarios="usuarios"`.
- **Efecto real al momento de este bloque** (`matrizBase` todavía
  colapsada por módulo, ver corrección abajo): `manager` pierde
  ver/editar/eliminar/vehiculos en los 3 listados CRUD (antes sin
  chequeo alguno); `gestion-usuarios` además oculta editar/eliminar
  para `user`/`demo` (antes solo corría la regla de jerarquía
  dev/admin, sin filtro de acceso al módulo). En ese momento, sin
  cambios para `user`/`demo` en los 3 listados CRUD — eso lo corrige el
  bloque siguiente. Sin cambios para `dev`/`admin`, antes ni después.
- No tocado: botón de alta crudo de cada listado (esquema `*appRole`
  viejo, migra después); `InformesTablaComponent`/
  `InformesAccionesCellComponent` (bloque aparte, necesita rename).

**Corrección (no es un bloque nuevo — corrige el Bloque 1):**
`matrizBase` de `PermisosService` rediseñada. El diseño original
colapsaba a un solo booleano por `[modulo][rol]`; pruebas manuales
post-Bloque 4 encontraron que `user`/`demo` heredaban `eliminar` en
clientes/choferes/proveedores por tener `leer` permitido en el
módulo — el mismo bug que este frente busca cerrar. Firma pública
`puede(modulo, accion?)` sin cambios; los Bloques 2-4 no requirieron
ningún ajuste.

- `matrizBase` pasa a `Record<ModuloReglas, Record<AccionCrud,
  Record<RolUsuario, boolean>>>` — transcripción literal, entrada por
  entrada, de `permitido()` en `firestore.rules` (11 módulos reales +
  `'usuarios'` como caso especial). `AccionCrud`
  (`'leer'|'crear'|'editar'|'eliminar'`) nuevo en
  `interfaces/permiso.ts`.
- `mapaModuloReglas` (`ModuloPermiso` → módulo real de las reglas) y
  `mapaAccionCrud` (`AccionPermiso` → `AccionCrud`) nuevos, privados en
  `PermisosService`.
- `usuarios` poblado directo (Opción A): `dev`/`admin` `true` en las 4
  acciones, resto `false` — no pasa por `permitido()`/`moduloDe()`
  (regla propia `/users/{uid}`). La jerarquía fina por fila
  (`editarDeshabilitado`/`eliminarDeshabilitado` en
  `gestion-usuarios.component.ts`) no se toca.
- Sin `accion`: default `'leer'` (gating de sección completa = "¿puede
  al menos leer?").
- El caso de deuda `operaciones.eliminar` para `user` (citado desde el
  Bloque 1) queda resuelto por la matriz sin necesitar `override` —
  pendiente solo de cablear `tablero-op` a `PermisosService`, no de
  lógica.

**Bloque 5 — Facturación: reglas de negocio ya escritas, cableadas por
primera vez.** No son reglas nuevas: `puede()`/`puedeAnular()`/
`puedeVincularFactura()` en `facturacion-listado` y `puede()` en
`facturacion-historico` (usando `informe-liq.rules.ts`) existían desde
la creación de ambos componentes pero nunca se llamaban desde ningún
template — el único gating real era `disbledDemo()` (3 columnas
enteras, solo rol `demo`, sin distinguir fila ni estado). Corrección de
un mecanismo roto desde su creación, no funcionalidad nueva.

- `InformesTablaComponent`: eliminado código muerto confirmado
  (`@Input() acciones` a nivel de componente, nunca poblado por ningún
  caller; `ejecutarAccion()`/`mostrarAccion()`/`accionDeshabilitada()`,
  nunca en el camino real de render; import de `EventoInformesTabla`
  sin uso; `disbledDemo()` y su `UsuarioSesionService` inyectado).
- `ColumnaInformesTabla<T>.acciones`: `string[]` → `AccionInformesTabla<T>[]`
  (interfaz ya existente, uso real por primera vez).
- `AccionInformesTabla<T>` gana `accionPermiso?: AccionPermiso` (campo
  nuevo, no interfaz nueva): `id` es la identidad de negocio (lo que
  lee `onAccion()`), `accionPermiso` la desambigua cuando no coincide
  con el `AccionPermiso` real para `PermisosService` — primer caso:
  `excel`/`pdf` (dos ids distintos, necesarios para que `onAccion()`
  siga eligiendo el formato correcto) comparten `accionPermiso:
  'reimprimir'`. Fallback `accion.accionPermiso ?? accion.id` para el
  resto (donde sí coinciden).
- Ids renombrados para alinear con `AccionInformeLiq`: `detalle`→`ver`
  (ambos componentes); `factura`→`vincularFactura` en
  `facturacion-listado`; `factura`→`verFactura` en
  `facturacion-historico` (acción de negocio distinta pese a compartir
  botón visual hoy). `onAccion()` actualizado en cascada.
- `columnas[].acciones` de ambos componentes pobladas con `disabled`
  real conectado a los métodos ya existentes (`puede`/`puedeAnular`/
  `puedeVincularFactura`), sin reescribirlos.
- `InformesAccionesCellComponent` reescrito: itera `acciones` en vez
  de `@if (acciones.includes(...))` fijo por string; mismo mapeo
  visual id→botón que antes; pasa `disabled` real +
  `modulo`/`accion` a cada `app-btn-*`.
- Cascada de `modulo="facturacion"` (mismo patrón que Bloque 4):
  ambos callers → `InformesTablaComponent` → `InformesAccionesCellComponent`
  → cada `app-btn-*`.
- ⚠️ Gap residual conocido, fuera de alcance (`app-btn-*` no se toca
  en este bloque): la rama `'electronica'` de `BtnAgregarComponent`
  (usada por vincularFactura/verFactura) no bindea `[disabled]` al
  `<button>` — no estaba en las 13 variantes corregidas en el Bloque 2.
  El click sigue bloqueado igual (`ejecutar()` no emite si
  `disabled` es `true`), pero el botón no se ve gris. Pendiente:
  sumarla a la lista de variantes corregidas. **Corregido, ver más
  abajo.**
- **Verificado:** informe `anulado` (`REGLAS_ESTADO_INFORME.anulado =
  ['ver']`) ahora deshabilita correctamente reimprimir/verFactura en
  `facturacion-historico` — antes quedaban clickeables sin importar el
  estado del informe.

**Corrección de alcance incompleto del Bloque 2:** `BtnAgregarComponent`,
rama `'electronica'`, quedó afuera de las 13 variantes corregidas por
error de conteo al enumerarlas — mismo bug de `disabled` inerte que las
otras 13, no un caso nuevo. Agregado `[disabled]=disabled` al
`<button>`. Efecto visible: el botón de vincularFactura/verFactura en
Facturación ahora se ve gris cuando el informe no permite la acción,
consistente con el bloqueo de click que ya funcionaba por el guard en
`ejecutar()` (Bloque 5).

**Bloque 6 (sub-bloque 1) — barrido de `*appRole`/`esRol()`/`ngClass`
sueltos: `tablero-op.component.html`.** Caso más enredado de la
auditoría: `[disabled]` nativo + `[ngClass]` + regla de negocio +
`esRol('demo')` repetido en los 3 botones de acción de la fila, más un
botón crudo de alta con su propio `esRol('demo')` inline.

- `AccionPermiso` gana `'cerrar'`; `mapaAccionCrud['cerrar'] =
  'editar'` (cerrar una operación actualiza `EstadoOp.ciclo`, no crea
  ni elimina).
- Los 4 botones de la fila (`DetalleColor`/`EditarColor`/
  `EliminarColor`/`FacturaColor`) reciben `modulo="operaciones"` +
  `accion` (`ver`/`editar`/`eliminar`/`cerrar`). `[ngClass]`/`[disabled]`
  con `esRol('demo')` mezclado quitados; `[disabled]` queda como única
  fuente, apuntando solo a la regla de negocio existente
  (`puedeEditar`/`puedeEliminar`/`puedeCerrar`).
- Botón crudo "Alta de Operación": `[disabled]="esRol('demo')"` →
  `*appPermiso="'operaciones.agregar'"`.
- `UsuarioSesionService` (inyección + import) eliminado de
  `tablero-op.component.ts` — sin otros usos confirmados antes de
  quitarla.
- ⚠️ **Efecto real para `demo`, más amplio que "verse igual pero
  bloqueado":** `demo` solo tiene `leer` en `operaciones` — `modulo`/
  `accion` oculta el botón entero si no hay permiso (no solo lo
  deshabilita), así que Editar/Eliminar/Cerrar dejan de verse para
  `demo` (antes se veían grises); solo queda visible Ver. Mismo efecto
  para `user` en Eliminar específicamente (el caso de deuda
  `operaciones.eliminar`/`user` ya cerrado en la corrección de
  `PermisosService`, ahora reflejado en la UI). `dev`/`admin` sin
  cambios.

**Corrección — bug estructural preexistente en los 5 `app-btn-*`/
`AccionGenericaComponent`:** encontrado en pruebas manuales del
sub-bloque anterior, no específico de Operaciones ni introducido por
este frente. Con rol `admin`, una operación `'Cerrada'` (`disabled`
correctamente presente en el `<button>` interno) igual ejecutaba
`eliminar()` al hacer clic en el margen del botón. Causa: `(click)` se
declara sobre el tag host en los ~95 call sites (estos componentes
nunca definieron `@Output() click`, Angular lo trata como listener DOM
nativo del host); `[disabled]` en el `<button>` interno bloquea clics
en su propia caja pero no en el `margin: 10px`, que es layout del host
— un clic ahí cae directo sobre el host y dispara la acción igual. El
Bloque 2 corrigió que `disabled` llegara al `<button>`, pero eso nunca
iba a alcanzar: el problema vive un nivel más arriba.

- `@HostBinding('style.pointer-events')` agregado a los 5 componentes
  (`'none'` si `disabled`, si no `null`) — `pointer-events` se hereda,
  así que el `<button>` interno también queda fuera del hit-testing
  cuando corresponde. Ningún clic en la caja del host llega al
  listener. Sin `@Output()` nuevo, sin tocar `(click)="..."` en ningún
  caller.
- ⚠️ Este bug pudo haber afectado cualquier sitio de la app con
  `disabled` ya cableado antes de este frente, no solo los migrados acá
  — sin forma práctica de auditar retroactivamente cada caso histórico.
  De acá en más queda blindado en la base para todos, migrados o no.

**Bloque 6 (sub-bloque 2) — `proforma.component`.** A diferencia de
`tablero-op`/Facturación, acá no existía ningún método `puedeXxx` de
regla de negocio — el único gating eran 9 `[ngClass]` de
`esRol('demo')` (3 tablas × `print`/`Eliminar`/`Factura`); `Detalle`
sin gating de ningún tipo. Solo se conecta permiso, no hay regla de
negocio que cablear porque no existe.

- `AccionPermiso` gana `'liquidar'` (crea un `InformeLiq` nuevo desde
  una proforma, distinto de `vincularFactura`/`anular`);
  `mapaAccionCrud['liquidar'] = 'crear'`.
- Las 3 tablas: `Detalle`→`accion="ver"` (nuevo), `print`→
  `accion="reimprimir"`, `Eliminar`→`accion="anular"`,
  `Factura`→`accion="liquidar"`, `modulo="liquidaciones"` en los 4.
  `ngClass` de `esRol('demo')` quitado en los 9 sitios que lo tenían.
  Sin `[disabled]` en ninguno (no hay regla de negocio). `usuarioSesion`
  se mantiene inyectada (uso real confirmado en `ngOnInit`).
- ⚠️ **Efecto real por rol, con matices:** `liquidaciones` espeja
  `finanzas`. `Detalle`: antes abierto para los 5 roles, ahora oculto
  para `manager`/`user`. `print`: antes bloqueado visual solo para
  `demo`, ahora oculto para `manager`/`user` y **habilitado para
  `demo`** (`reimprimir`→`leer`, que `demo` sí tiene — desbloqueo real,
  no solo restricción). `Eliminar`/`Factura`: antes **sin ningún
  gating** para `manager`/`user` (podían anular proformas y liquidar
  sin restricción alguna) — ahora visibles solo para `dev`/`admin`,
  cierra una exposición real no señalada como deuda hasta ahora.
  `dev`/`admin` sin cambios.

**Bloque 6 (sub-bloque 3) — `liquidaciones-op.component`** (reusado por
cliente/chofer/proveedor vía `llamadaOrigen`). Dos columnas usaban
`*appRole` sobre `<td>` completo (SVG crudo, no `app-btn-*`); el botón
"Liquidar" mezclaba `[ngClass]` con `||` de regla de UI + rol sobre un
`<button>` crudo. Reutiliza `'editar'`/`'eliminar'`/`'liquidar'` — sin
extender `AccionPermiso`.

- Botón "Liquidar": envuelto en `<ng-container
  *appPermiso="'liquidaciones.liquidar'">` (dos directivas
  estructurales no van en el mismo elemento). `[disabled]="!mostrarTabla[i]"`
  como única fuente; `esRol('demo')` quitado del `ngClass`.
- Columnas editar/eliminar de `informeOp`: `*appRole="['dev','admin','manager']"`
  → `*appPermiso="'liquidaciones.editar'"` / `'liquidaciones.eliminar'`
  — quitando `'manager'` (decisión ya tomada en el frente). Header
  combinado con `colspan="2"`: un solo `*appPermiso="'liquidaciones.editar'"`
  alcanza porque ambas columnas comparten rol hoy.
- Checkboxes de selección (armado local, no escriben en Firestore): sin
  gating, `ngClass` de `esRol('demo')` quitado sin reemplazo — mismo
  criterio que `Detalle` en proforma.
- `usuarioSesion` se mantiene (otro uso real confirmado).
- ⚠️ **Efecto real, en los 3 orígenes:** Editar/Eliminar — `manager`
  los pierde (estaba en el `*appRole`), `user`/`demo` sin cambio (nunca
  los vieron). Liquidar — `demo` pasa de gris a oculto (el caso
  señalado), pero **`manager`/`user` también lo pierden por completo**
  (antes sin ninguna restricción para ellos, no solo `demo` — efecto
  adicional no cubierto por el pedido original). Checkboxes — `demo`
  gana acceso (antes bloqueado, ahora libre). `dev`/`admin` sin
  cambios.

**Bloque 6 (sub-bloque 4, ÚLTIMO) — botón de alta de los 4 listados
CRUD, `vendedores-listado`, `sidebar`, `nueva-facturacion/modal-detalle`.**
Cierra el barrido de `*appRole`/`esRol()`/`ngClass` sueltos.

- Botón de alta de los 4 listados: `ngClass` de `esRol('demo')`
  quitado, `modulo`/`accion="agregar"` agregado. `'Descargar X'`/
  `'X Visibles'` sin tocar (decisión ya tomada, incluye el `ngClass`
  de `demo` en `'Visibles'`).
- `vendedores-listado` (cards, no `TablaGenericaComponent`):
  Editar/Eliminar conectados a `modulo="vendedores"`.
- `sidebar`: 4 `@if (esRol(...))` → `*appPermiso` sobre el `<li>`
  completo. Configuración/Facturación/Reportes coinciden 1:1 con el
  comportamiento anterior (verificado contra la matriz). **Finanzas
  cambia a propósito:** antes solo `dev`, ahora fiel a
  `matrizBase.finanzas.leer` — `admin` y `demo` ganan el link. Resto
  del sidebar sin gating (protegido por `RoleGuard` de ruta).
- `nueva-facturacion/modal-detalle`: único `*appRole` del archivo →
  `*appPermiso="'facturacion.eliminar'"`, quitando `'manager'`.

**Bloque 6 CERRADO.** Verificado por grep: el único `*appRole` restante
en toda la app son los 6 sitios de Tarifas (cliente/choferes/proveedores
× gral/especial) — frente aparte, pendiente. (`facturacion/modal-detalle`
legacy comentado y `acciones-cell-renderer` sin caller también usan
`*appRole` pero por código muerto/orfandad, no por ser Tarifas.)

### Bloque 7 (ÚLTIMO) — `tablero-asignaciones`, primer uso real de
`overrides` en `PermisosService`

8 botones crudos sin gating hasta ahora (4 modales de gestión + Alta de
Op/Guardar/Descargar/Limpiar, esta última con el TODO comentado ya
señalado como deuda). Requisito de negocio: `user` (único empleado
activo en producción) conserva los 8 sin excepción; `demo` no ve
ninguno.

- `AccionPermiso` gana `'descargarTablero'`/`'limpiarTablero'`;
  `mapaAccionCrud`: `descargarTablero→'leer'`, `limpiarTablero→'eliminar'`.
- Primeros dos `overrides` reales (vacío desde el Bloque 1):
  `'operaciones.descargarTablero': { demo: false }` (bloquea la
  descarga del tablero para `demo` sin afectar `'reimprimir'` en
  Facturación) y `'operaciones.limpiarTablero': { user: true }`
  (`user` conserva la acción pese a que `'eliminar'` general le daría
  `false`).
- 4 botones de gestión (izquierda) → `*appPermiso="'operaciones.editar'"`
  en los 4. 4 de acción (derecha): Alta de Op→`'operaciones.agregar'`,
  Guardar→`'operaciones.editar'`, Descargar→`'operaciones.descargarTablero'`,
  Limpiar→`'operaciones.limpiarTablero'`. `[disabled]` propio de cada
  botón (UI/negocio) intacto. TODO de `esRol('demo')` eliminado.
- **Verificado contra la matriz, exacto:** `user` ve y usa los 8;
  `demo` no ve ninguno; `dev`/`admin` sin cambios.

## FRENTE BOTONES Y PERMISOS — CERRADO

4 capas operativas de punta a punta: `PermisosService` (matriz real +
overrides reales) → `*appPermiso`/`modulo`+`accion` en los 4 `app-btn-*`
→ catálogo semántico + `AccionGenericaComponent` (con el bug
estructural de `pointer-events` corregido en los 5) → wrappers de tabla
+ ~15 componentes migrados directamente. Único `*appRole` restante en
toda la app: los 6 sitios de Tarifas, frente aparte no iniciado. Detalle
completo de los 7 bloques y las 3 correcciones intercaladas en
`CLAUDE.md` → "Frente Botones y Permisos".

### Fix post-cierre — `firestore.rules`: `asignaciones` desacoplado de `operaciones`

Bug real reportado en producción: `user` recibía "Missing or
insufficient permissions" al usar "Limpiar" (caso A, borrar un
borrador) en `tablero-asignaciones`. El gating del cliente (Bloque 7)
ya estaba correcto — el servidor no lo reflejaba: `moduloDe()` mapeaba
`asignaciones` al mismo módulo que `operaciones`, heredando su
`eliminar=false` para `user`. Son colecciones con perfil de riesgo
distinto (un tablero borrador es descartable; una `Operacion` real no)
y debían desacoplarse.

- `firestore.rules`: `asignaciones` con categoría propia en
  `moduloDe()`; nueva rama en `permitido()` —
  `dev`/`admin`/`user` con las 4 acciones sin distinción, `demo`/`manager`
  denegados por completo (fail-safe).
- `PermisosService`: `matrizBase.asignaciones` agregada (mismos
  valores) por fidelidad de transcripción con `firestore.rules`, aunque
  ningún `ModuloPermiso` de Angular la consume todavía — evita dejar
  una categoría real de las reglas sin representar en el servicio,
  causa raíz de esta clase de bug. Sin más cambios en Angular: el
  gating de `tablero-asignaciones` (Bloque 7) ya era correcto.
- Verificado contra el emulador (`functions/test-asignaciones-rules.mjs`,
  mismo patrón que `test-emulator.mjs`) antes de deploy: `user`
  leer/crear/eliminar en `asignaciones` — OK; `demo` sin ningún acceso
  — OK; `admin` sin cambios — OK. 6/6 PASS.
- Deploy de `firestore.rules` a `demo` (`demoapplog`) únicamente —
  alias confirmado contra `.firebaserc` antes de ejecutar. **NO
  desplegado a Vantruck/producción** — la réplica queda diferida hasta
  cerrar la restructuración completa del proyecto, según el proceso ya
  establecido. Smoke test real en demo con un usuario `user` real
  queda pendiente de confirmación manual (sin credenciales ni browser
  automation disponibles en este entorno para hacerlo de punta a
  punta).

### Limpieza — proyecto Firebase remanente `lplog-31164` (sin relación con el frente de Botones y Permisos)

Discrepancia detectada durante ese frente entre `CLAUDE.md` (tabla
"Entornos de build": `vantruck` → `lplog-31164`) y la config real
(`environment.ts` usa `pf-logistics` como producción). Confirmado por
el desarrollador: `lplog-31164` es remanente de pruebas viejas con un
tercer proyecto Firebase, sin uso actual. Los dos proyectos reales son
`demo` (`demoapplog`) y `vantruck`/producción (`pf-logistics`).

Auditoría de solo lectura previa (grep de `lplog-31164` en todo el
repo, 6 ocurrencias en 3 archivos) antes de tocar nada, confirmando
puntualmente: `.firebaserc` sin ningún alias apuntando a
`lplog-31164` (los reales: `demo`→`demoapplog`, `default`→`demoapplog`,
`vantruck`→`pf-logistics`); `deploy:demo`/`deploy:vantruck` en
`package.json` usan `firebase use <alias> && firebase deploy`, no
`ng deploy` — confirmado que ningún script invoca el builder
`@angular/fire:deploy` de `angular.json` antes de tocarlo; dos bloques
comentados distintos en `environment.ts` (uno con `lplog-31164` mal
etiquetado "PARA PRODUCCION", otro separado con `pf-logistics` que es
el interruptor manual intencional de debug local, sin tocar).

- `src/environments/environment.ts`: bloque comentado de `lplog-31164`
  eliminado. Bloque de `pf-logistics` (debug local) intacto.
- `angular.json`: bloque `"deploy"` (builder `@angular/fire:deploy`,
  apuntaba a `lplog-31164`) eliminado — sin invocador confirmado.
- `.firebaserc`: sin cambios, no tenía ninguna referencia a
  `lplog-31164`.
- `build:demo`/`build:vantruck` verificados sin errores tras la
  limpieza.
- `CLAUDE.md`: tabla "Entornos de build" corregida — `vantruck` →
  `pf-logistics` (no `lplog-31164`); aclarado que `development` apunta
  a `demo` por defecto, y que el bloque de `pf-logistics` en
  `environment.ts` es un interruptor manual existente para debug
  local, no un tercer entorno.

### Mini-frente — Multiplicidad de tarifas por entidad (`RefTarifaHabilitada`) — Agosto 2026

Frente derivado del refactor grande de Tarifas (diseñado en chat aparte, aún no
iniciado). Resuelve la pieza específica de cómo Cliente/Chofer/Proveedor administran
múltiples tarifas habilitadas a la vez, reemplazando el viejo `tarifaTipo: TarifaTipo`
(4 booleanos, selección única). El resto del frente de Tarifas (interfaces
`Tarifa`/`TarifaEspecial`/`TarifaEventual`, el cálculo, el módulo de administración de
tarifas en sí) sigue sin iniciar — ver `CLAUDE.md` → "Sistema de tarifas".

**Modelo nuevo:**

```typescript
export type RefTarifaHabilitada =
  | { nivel: 'general' }
  | { nivel: 'especial'; idTarifa: string }       // '' = habilitado, tarifa aún no creada
  | { nivel: 'personalizada'; idTarifa: string }  // '' = habilitado, tarifa aún no creada
  | { nivel: 'eventual' };
```

`Cliente`/`Proveedor`: `tarifasHabilitadas: RefTarifaHabilitada[]`. `Chofer`:
`tarifasHabilitadas: RefTarifaHabilitada[] | null` — `null` para
`contratacion.tipo === 'proveedor'` (hereda la tarifa del proveedor, nunca se copia al
chofer — ver más abajo).

**Reglas de negocio** (validadas en los 3 factories, `interfaces/tarifa-habilitada.ts` →
`validarTarifasHabilitadas`): `'eventual'` solo es válida como única entrada de la
lista; debe haber al menos una tarifa habilitada (lista vacía inválida).

**Chofer de proveedor — resolución centralizada, no duplicada:**
`ProveedorService.resolverTarifasHabilitadasChofer(chofer)` es la única fuente de
verdad — directo lee `chofer.tarifasHabilitadas`, proveedor resuelve por ID contra el
proveedor vivo (`getProveedorPorId`). Reemplaza el patrón viejo donde `ChoferFormData`
copiaba `tarifaTipo` también para choferes de proveedor (dato duplicado, ya señalado
como deuda en un comentario preexistente de `ProveedorService.getTarifaTipo` antes de
este frente). Consumido por `OperacionFactoryService.crearOperacionBase`,
`operaciones-editor` (badge de chofer), `choferes-listado`, `objeto-papelera`.

**Shim de compatibilidad, vigente:** `tarifaTipoDesdeHabilitadas(lista):  TarifaTipo`
(en `interfaces/tarifa-habilitada.ts`) reconstruye los 4 booleanos legacy para
consumidores que todavía no resuelven multiplicidad real:
`OperacionFactoryService` (`crearOperacionBase`, `resolverJerarquiaTarifa`,
`recalcularTarifaTipo`, `aplicarTarifaTipo`, `aplicarTarifaEventual`),
`operaciones-editor` (badges), `ProveedorService.getTarifaTipo`. Marcados
`// TODO: refactor Tarifas — operaciones-editor con multiplicidad` — la resolución real
de "qué pasa cuando cliente Y chofer tienen múltiples tarifas a la vez" es problema
propio, explícitamente fuera de alcance de este mini-frente, a encarar en el frente
grande de Tarifas.

**El puente inverso `habilitadasDesdeTarifaTipo` (temporal) ya NO existe** — se usó
solo mientras los formularios producían selección única, y se eliminó al conectar los
3 componentes de alta al modelo real de lista (ver "Componentes" más abajo).

**Servicios — reordenamiento Component→Service→Factory (aprovechado de paso):**
`ClienteService`/`ChoferService`/`ProveedorService` ganan `altaXxx`/`editarXxx`, que
invocan al factory internamente y persisten — los 3 componentes de alta dejan de
inyectar `XxxFactoryService` directo. Efecto colateral no buscado pero bienvenido:
antes del reordenamiento, un `throw` del factory (p. ej. `validarTarifasHabilitadas`)
quedaba como promise rejection no manejada, porque el `.catch()` del componente colgaba
solo de la promesa de `guardarXxx`, no de la construcción vía factory. Con la llamada
al factory dentro de la función `async` del servicio, el `throw` se propaga
correctamente al `.catch()` del componente.

**Componentes — switches multi-select:** `formTipoTarifa` pasa de comportarse como
radio (`onTarifaTipoChange`, un solo `true` a la vez) a switches independientes.
`'eventual'` es excluyente: tildarlo destilda y deshabilita los otros 3; tildar
cualquier otro deshabilita `'eventual'` mientras haya al menos uno activo
(`onEventualChange`/`onOtraTarifaChange`). Alta: arranca sin nada tildado (antes
`general: true` por defecto) — coherente con que general ya no es implícito en el
modelo de datos. Guard nuevo en `onSubmit()`: bloquea si los 4 switches están
apagados. **Preservación de `idTarifa` al editar:** cada componente guarda
`tarifasHabilitadas` original al cargar el form (`armarForm()`); si el usuario no
destilda especial/personalizada ya habilitada, se reusa su `idTarifa` real en vez de
resetear a `''` en cada guardado — sin esto, cada edición de una entidad con tarifa
especial/personalizada ya creada hubiera roto la referencia real a esa tarifa
(pérdida de datos silenciosa).

**Migración de datos (demo):** nuevo método `migrarTarifasHabilitadas()` en los 3
`XxxMigrationService`, sobre documentos ya migrados una vez (no requiere backup nuevo,
mismo criterio que los métodos `corregirIdXxx` ya existentes — transforma el campo
puntual y sobreescribe el documento completo, `idTarifa`/`tarifaAsignada` intactos).
Helper de conversión recreado en `servicios/migracion/tarifa-habilitada-migracion.util.ts`
(`habilitadasDesdeTarifaTipoMigracion`, uso exclusivo de scripts de migración —
trabajan sobre `any`, no sobre tipos de dominio). Choferes de proveedor migrados
directo a `tarifasHabilitadas: null`, ignorando el `tarifaTipo` legacy que tenían
(dato duplicado desde siempre, nunca fuente de verdad real). **Pendiente: réplica en
Vantruck/producción**, diferida al proceso ya establecido (toda la reestructuración se
corre en demo primero).

**Ajustes post-prueba manual:**
- Los 3 listados (`clientes`/`choferes`/`proveedores-listado`) mostraban solo la
  PRIMERA tarifa habilitada en la columna "Tarifa" (`tarifaTipoDesdeHabilitadas` +
  ternaria en cascada, correcto con selección única, incorrecto con multiplicidad).
  Corregido a listar todas, separadas por coma. `TablaGenericaComponent` ganó `[title]`
  en la celda genérica (afecta a todos los listados, no solo Tarifa) aprovechando el
  truncado por columna que ya existía (`text-overflow: ellipsis` + `max-width` por
  `col.width`).
- **Código muerto eliminado en `ProveedoresAltaComponent`:** gestión de vehículos
  completa (`vehiculos`, `openModalVehiculo`/`editarVehiculo`/`eliminarVehiculo`/
  `cargarVehiculosProveedor`, y `ngOnDestroy`/`Subject`/`takeUntil` que solo existían
  para esa suscripción) — nunca tuvo sección correspondiente en el `.html`, nunca se
  renderizaba, y `addItem()` nunca la persistía (`guardarProveedor` sin vehículos, no
  `guardarProveedorConVehiculos`). Confirmado con evidencia real que los vehículos de
  proveedor se administran en un modal propio de `proveedores-listado.component.ts`
  (acción `'vehiculos'` de `TablaAccionesComponent` → `mostrarVehiculos()` →
  `guardarVehiculos()` → `ProveedorService.guardarProveedorConVehiculos`, su único
  caller real, confirmado por grep) — no era un gap a corregir, era código que nunca
  debió sobrevivir al copy-paste original entre `ChoferesAltaComponent` (que sí
  gestiona vehículos, porque un chofer directo los necesita) y `ProveedoresAltaComponent`.

**Deuda registrada (no resuelta en este frente, a propósito):**
- `idTarifa: string`/`tarifaAsignada: boolean` en las 3 entidades: NO se tocaron.
  Cumplían exactamente el rol que hoy vive en cada entrada `{ idTarifa }` de
  `tarifasHabilitadas`, pero `RefTarifaHabilitada` no tiene `idTarifa` en los niveles
  `general`/`eventual`, así que no alcanza para sustituirlos limpio todavía. Quedan con
  `// TODO: refactor Tarifas — reemplazar por RefTarifaHabilitada` en las 3 interfaces.
  Auditoría confirmó consumidores externos activos en el módulo de Tarifas actual
  (`Xxx-tarifa-gral.component.ts` × 3, `TarifasService.guardarTarifaPersonalizada`) —
  ese módulo entero desaparece con el frente grande de Tarifas, momento natural para
  resolver esta deuda también.
- **Bug preexistente, no relacionado, detectado en la auditoría:**
  `proveedores-tarifa-gral.component.ts` (líneas ~560, ~591) escribe `idTarifa` de un
  `Chofer` en la colección `"proveedores"` en vez de `"choferes"`. No corregido — el
  archivo entero se elimina con el frente grande de Tarifas.
- **Bug preexistente, no relacionado, detectado en la auditoría:**
  `modal-resumen-op.component.html` lee `op.cliente.tarifaTipo`/`op.chofer.tarifaTipo`
  sobre `RefCliente`/`RefChofer`, que no tienen ese campo desde la Fase D (snapshots).
  Probablemente lee `undefined` en runtime hoy. No corregido, fuera de alcance — queda
  para revisión de ese componente en particular.
- Módulo de Tarifas actual (`Xxx-tarifa-gral`/`Xxx-tarifa-especial`/
  `cliente-tarifa-personalizada`, `TarifasService`): las líneas que leían/escribían
  `entidad.tarifaTipo` fueron comentadas al mínimo (`// TODO: eliminar en frente
  Tarifas — módulo completo a reescribir`) para mantener el árbol compilando. Ningún
  tratamiento fino — el módulo entero desaparece con el frente grande.

---

### Pendiente

- Módulo Vendedores (incluye lógica de vendedor[] en Cliente)
- Módulo Liquidaciones
- Módulo Facturación
- Módulo Finanzas
- Módulo Reportes
- Módulo Legajos (revisión post-migración)
- Módulo Ajustes
- Tarifas (refactorización del sistema completo)
- Restauración desde papelera (EntidadResolverService)
