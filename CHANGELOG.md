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

### Pendiente

- Módulo Operaciones
- Módulo Vendedores (incluye lógica de vendedor[] en Cliente)
- Módulo Liquidaciones
- Módulo Facturación
- Módulo Finanzas
- Módulo Reportes
- Módulo Legajos (revisión post-migración)
- Módulo Ajustes
- Tarifas (refactorización del sistema completo)
- Restauración desde papelera (EntidadResolverService)
