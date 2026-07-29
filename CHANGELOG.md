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
