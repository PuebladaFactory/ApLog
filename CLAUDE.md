# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Aplicación web de administración para empresa de logística (Vantruck). Angular 20 SPA con Firebase (Firestore + Auth + Hosting). En producción activa — se agregan funcionalidades, se mejoran las existentes y se corrigen errores.

**Firebase plan gratuito: no hay Cloud Functions disponibles. Toda la lógica de negocio corre en el cliente.**

## Stack técnico

- **Frontend:** Angular 20, TypeScript 5.8 (strict mode), RxJS 7
- **UI:** Bootstrap 5 + ng-bootstrap. Tablas de datos: `TablaGenericaComponent` propio
  (reemplazó a AG Grid en los módulos refactorizados; AG Grid puede subsistir en módulos
  aún no migrados)
- **Backend/DB:** Firebase (Firestore + Auth + Hosting), Cloudinary (imágenes)
- **Exports:** ExcelJS, jsPDF, PDFMake
- **Editor:** VSCode

## Comandos

```bash
npm start                   # Dev server en localhost:4200
npm test                    # Tests con Karma
npm run build               # Build de producción
npm run build:demo          # Build para entorno demo
npm run build:vantruck      # Build para entorno Vantruck (producción)
npm run deploy:demo         # Build + firebase deploy (demo)
npm run deploy:vantruck     # Build + firebase deploy (vantruck)
```

## Arquitectura

### Estructura de módulos

```
src/app/
├── appLogin/          # Rutas sin autenticación (login, registro, reset)
├── raiz/              # App principal (lazy-loaded, protegida por RoleGuard)
│   ├── operaciones/   # Operaciones diarias (tablero, alta/baja/cierre)
│   ├── clientes/      # CRUD + tarifas
│   ├── choferes/      # CRUD + tarifas + documentación
│   ├── proveedores/   # CRUD + tarifas
│   ├── liquidacion/   # Liquidación de operaciones cerradas
│   ├── facturacion/   
│   ├── nueva-facturacion/ # Facturación (legacy)
│   ├── legajos/       # Legajos de choferes
│   ├── vendedores/    # CRUD + comisiones
│   ├── reportes/      # (en desarrollo)
│   ├── finanzas/      # (en desarrollo)
│   └── ajustes/       # Usuarios, log de actividad, papelera
├── shared/            # Componentes, directivas y pipes reutilizables
├── servicios/         # 22 servicios especializados
├── interfaces/        # 32+ interfaces TypeScript de dominio
├── guards/            # RoleGuard (control de acceso por rol)
└── constants/         # Constantes de negocio
```

Todos los módulos bajo `raiz/` son lazy-loaded.

### Autenticación y roles

Firebase Auth (email/password + Google). Al autenticarse, se lee `/Vantruck/datos/users/{uid}` en Firestore para obtener el objeto `roles`.

Jerarquía: `god > admin > manager > user > demo`

Flujo: login → `/carga` (resuelve roles) → `/raiz` o `/limbo`.

Las rutas declaran roles requeridos en `data: { roles: [...] }`. `RoleGuard` verifica acceso. La directiva `*appRole` oculta/muestra elementos de UI según el rol.

### State management

El refactor arquitectónico está migrando el manejo de estado desde un store central
único hacia servicios por entidad. Conviven dos esquemas según el módulo:

**Módulos refactorizados** (Choferes, Proveedores, Clientes; Operaciones en progreso — subsistema Asignaciones: capa de servicios y fachada completas; switch completo de `tablero-diario` → `tablero-asignaciones` (tablero-diario, carga-tablero-diario y operaciones-table eliminados); `carga-multiple` migrado a `carga-asignacion` y switch completado (carga-multiple eliminado), con caller confirmado en tablero-op (`modalCargaMultiple()`); coordinadores `bajaOperacion`/`restaurarOperacion` en OperacionService completos (atómicos,
batch + log único); `editarOperacion` pendiente, depende del refactor de Tarifas):
cada entidad tiene su `XxxService` con un BehaviorSubject propio que mantiene el estado
en memoria (NO en localStorage). El `init()` del servicio abre el listener de Firestore
y se llama al arrancar la app. Los componentes se suscriben directamente al observable
del servicio.

**Módulos no migrados:** todavía dependen de `StorageService`
(`servicios/storage/storage.service.ts`), que expone múltiples BehaviorSubjects y
sincroniza con localStorage.

`StorageService` NO desaparece: además del estado de los módulos viejos, sigue siendo la
**capa de escritura centralizada** por la que pasan todas las mutaciones para garantizar
el logging (ver "Escritura en Firestore" en Patrones de refactorización). Es decir, los
`XxxService` leen su propio estado pero escriben a través de `StorageService`.

Flujo de datos en módulos refactorizados:
```
Lectura:   Firestore --(listener)--> XxxService (BehaviorSubject) --> Component
Escritura: Component --> XxxService --> StorageService (log) --> DbFirestoreService --> Firestore
```

### Capa de datos

`DbFirestoreService` (`servicios/database/db-firestore.service.ts`) envuelve todas las operaciones de Firestore. Todas las colecciones viven bajo `/Vantruck/datos/`. Colecciones principales: `operaciones`, `clientes`, `choferes`, `proveedores`, `tarifasGralCliente/Esp/Pers`, `tarifasGralChofer/Esp`, `facturaCliente`, `facturaChofer`, `liquidaciones`, `legajos`, `vendedores`, `logs`, `users`.

### Sistema de tarifas

Cada entidad (cliente, chofer, proveedor) tiene tres niveles: general (`Gral`), especial (`Esp`) y personalizada (`Pers`). `TarifasService` resuelve qué nivel aplica a cada operación. Es una regla de negocio central — los cambios acá afectan facturación y liquidaciones.

> **Refactor planificado (no iniciado):** se unificará en un tarifario único con interfaz
> común para general/especial/personalizada (eventual queda aparte por ser ad-hoc por
> operación), y `TarifaTipo` pasará de 4 booleanos a un union de string. Hasta entonces,
> la lógica de cálculo de tarifas en los servicios de Operaciones se toca al mínimo para
> compilar (marcada con `// TODO: refactor Tarifas`), no se reescribe.

### Operaciones — modelo de estado y reglas de dominio

Conocimiento de dominio que debe tenerse presente al tocar Operaciones, Liquidaciones o
los servicios de cálculo de valores.

**Estado de la operación (`EstadoOp`).** Tres ejes ortogonales, no flags sueltos:
```typescript
estado.ciclo: 'abierta' | 'cerrada' | 'liquidada'        // valor único, secuencial
estado.liquidacion: { cliente: boolean; chofer: boolean } // progreso por parte
estado.proforma: { cliente: boolean; chofer: boolean }    // congelamiento por parte
```
- "Liquidada total" es DERIVADO (`liquidacion.cliente && liquidacion.chofer`), nunca se
  almacena. Los flags de `liquidacion` no se apagan una vez activados.
- `ciclo = 'liquidada'` solo cuando ambas partes están liquidadas; la liquidación parcial
  se refleja en `liquidacion`, no en `ciclo`.
- En los métodos de transición, los modos `'chofer'` y `'proveedor'` afectan ambos el lado
  chofer (proveedor es variante de chofer).
- El ciclo de vida del estado de la op termina al crear el `InformeLiq`. Liquidar
  (incluir un InformeOp en un InformeLiq) NO es lo mismo que facturar (factura electrónica
  real, externa a la app): por eso el modelo dice `liquidacion`, no "factura".
- Toda transición de estado vive en `LiquidacionService` (`servicios/liquidaciones/`).
  El `EstadoOp` debería construirse siempre desde el factory de Operaciones, nunca con
  literales inline.

**Regla de bloqueo de proformas (negocio, no obvia).** La proforma de CHOFER es dominante:
bloquea los InformeOp del CLIENTE de las mismas operaciones. No se puede liquidar a un
cliente mientras sus op estén dentro de una proforma de chofer no confirmada. La regla NO
es simétrica: las proformas de cliente no bloquean los InformeOp del chofer. Las dos
proformas pueden coexistir en los datos; es el bloqueo lo que las separa en la práctica.
Por eso `Proforma CH` tiene mayor prioridad visual que `Proforma CL` en el badge del tablero.

### Servicios clave

| Servicio | Responsabilidad |
|---|---|
| `autentificacion/` | Firebase Auth, sesión de usuario |
| `database/` | CRUD Firestore |
| `storage/` | Estado de módulos no migrados (BehaviorSubjects + localStorage) y capa de escritura/logging centralizada para todos los módulos |
| `log/` | Log de actividad (ALTA / EDITAR / BAJA) |
| `tarifas/` | Resolución y cálculo de tarifas |
| `liquidaciones/` | Cálculo de liquidaciones y transiciones de estado de operación (proformas, InformeLiq) |
| `informes/` | Generación de reportes Excel y PDF |
| `numerador/` | Generación de IDs secuenciales (operaciones, facturas) |
| `validar/` | Validación de reglas de negocio |
| `formato-numerico/` | Formateo de números/moneda estilo Argentina |
| `fechas/` | Utilidades de fecha |

### Entornos de build

| Config | Proyecto Firebase | Uso |
|---|---|---|
| `development` | `pf-logistics` | Dev local |
| `demo` | demo project | Staging |
| `vantruck` | `lplog-31164` | Producción |

## Convenciones

- **Interfaces:** definidas en `src/app/interfaces/`. Usar siempre interfaces tipadas, nunca `any`.
- **Logging:** toda mutación de datos debe llamar a `LogService` con acción (`ALTA`, `EDITAR`, `BAJA`), nombre de colección e ID del registro. El rol `god` queda excluido del log.
- **IDs secuenciales:** usar `NumeradorService` al crear operaciones o facturas — nunca generar IDs manualmente.
- **Locale argentino:** fechas en `dd/MM/yyyy`, miles con `.` y decimales con `,`. Hay servicios de formateo para ambos.
- **Formularios:** Reactive Forms (`FormBuilder`). Directivas propias manejan CUIT, solo-letras, solo-números y fechas.
- **Modales:** `ng-bootstrap NgbModal`. Modales reutilizables en `shared/modales/`, específicos dentro del módulo feature.
- **Estilo de código:** respetar el estilo existente en cada archivo que se modifique — nombres de variables, indentación, estructura — sin imponer patrones nuevos salvo que se indique explícitamente.

## Forma de trabajo

- Antes de implementar: explicar qué va a hacer y cómo encaja con lo existente.
- Respuestas concretas, sin relleno.
- Si algo es ambiguo, preguntar antes de asumir.
- No refactorizar funcionalidades existentes salvo que se indique explícitamente.
- Tener en cuenta la limitación de Firebase sin Cloud Functions al proponer soluciones.

## Contexto adicional

- Desarrollador autodidacta — primer proyecto serio.
- Se planean apps complementarias futuras: depósito, ruteos, app para choferes.

## Patrones de refactorización establecidos

### Servicios por entidad
Cada entidad tiene dos servicios dedicados:
- `XxxService`: maneja estado en memoria (BehaviorSubject), operaciones de escritura
  coordinadas y lógica de negocio específica del dominio
- `XxxFactoryService`: construye y valida objetos tipados a partir de datos del formulario

**El factory NO toca la base de datos ni inyecta otros services: solo construye.** Recibe
los datos ya resueltos (campos de formulario y/o entidades completas) y devuelve el objeto
tipado. Si construir un objeto requiere otras entidades (ej. una Operacion necesita el
Cliente y el Chofer vivos para extraer snapshots), quien llama al factory resuelve esas
entidades y se las pasa ya resueltas.

**Patrón puente (resolución de IDs).** Cuando un `XxxService` necesita construir un objeto
a partir de IDs de otras entidades, actúa de puente: resuelve cada ID contra el getter
síncrono del service correspondiente (ver "Estado en memoria") y le pasa las entidades
resueltas al factory. Ejemplo: `OperacionService.crearOperacionesDesdeAsignacion` resuelve
cliente/chofer/proveedor por ID y delega a `OperacionFactoryService.crearOperacionBase`.
La resolución que falla no aborta la tanda: se recolectan los errores y se devuelven junto
con los objetos creados, para que el componente avise al usuario.

### IDs
Todos los IDs son string (Firebase document ID).
- El campo `idXxx` se asigna en `XxxService` desde `ConIdType.id` al recibir datos de Firestore
- `toFirestore()` excluye `idXxx`, `id` y `type` antes de escribir en Firestore
- Los IDs numéricos legacy tienen comentario TODO en las interfaces no migradas

### Snapshot + ID para registros históricos
Las entidades que son registros históricos (ej. `Operacion`) NO embeben los objetos
relacionados completos. Guardan, por cada entidad relacionada, un snapshot mínimo con el
ID canónico + los campos congelados al momento del alta. Criterio de qué va al snapshot:
- **Datos de exhibición histórica** (razón social, nombre, patente, CUIT al momento del
  alta) — al snapshot, para mostrar sin leer la entidad viva y para preservar la verdad
  histórica aunque la entidad cambie después.
- **Datos de cálculo** (contratación, tipo de tarifa, etc.) — NO se congelan; se resuelven
  por ID contra el `XxxService` vivo en el momento que se necesitan.

### Estado en memoria
- BehaviorSubject en XxxService, nunca en localStorage para datos de colecciones
- `init()` se llama desde HomeComponent al arrancar la app
- Los componentes se suscriben directamente al observable del servicio
- **Getter síncrono:** cada XxxService expone un `getXxxActuales()` que devuelve el array
  actual del BehaviorSubject (`.getValue()`), para que otros services resuelvan entidades
  por ID sin suscribirse (ver "Patrón puente").
- **Carga por rango (Operaciones):** las colecciones acotadas por consulta (ej. Operaciones,
  que se traen por rango de fechas, no completas) usan un BehaviorSubject que se REEMPLAZA
  entero en cada carga, no acumula. Al cambiar de rango se cancela la suscripción anterior
  con un Subject dedicado (`cancelarRango$`) + `takeUntil(merge(destroy$, cancelarRango$))`,
  para no dejar streams superpuestos. Difiere del patrón de catálogos completos
  (Clientes/Choferes/Proveedores), que acumulan added/modified/removed.

### Escritura en Firestore
Siempre pasar por StorageService para mantener el log centralizado:
- Alta: `addItemAndGetId()` — retorna el ID generado
- Edición: `updateItemAsync()`
- Baja simple: `deleteItemAsync()`
- Baja con papelera: `deleteItemPapeleraCompuestoAsync()` con objeto compuesto
  que incluye todas las entidades relacionadas

### Operaciones compuestas
Las operaciones que afectan múltiples entidades viven en XxxService, no en el componente:
- `guardarXxxConRelaciones()`: alta/edición de entidad principal + entidades relacionadas
- `eliminarXxxConRelaciones()`: baja en cascada + papelera

### Tablas
`TablaGenericaComponent` para todos los listados:
- El componente padre define `columnas: ColumnaTabla[]`, arma `filas: any[]`
  con los datos aplanados y `_objeto` como referencia al original,
  y define `acciones: AccionTabla[]` con handlers
- El filtro de visibilidad (visibles/todos) lo maneja el padre
- Los botones del toolbar (alta, descarga, visibilidad) quedan fuera de la tabla

### Formularios en modo vista
Usar `form.disable()` y `formTipoTarifa.disable()` en ngOnInit cuando
`fromParent.modo === 'vista'`, no clases CSS.

### Migración de datos
Cada módulo tiene su XxxMigrationService con:
- Backup previo via MigrationBackupService
- Transformación de documentos con mapeo viejo→nuevo de IDs
- Verificación final de cantidad de documentos
- Métodos de corrección separados para limpiar campos residuales

### Fase D: resolución de tipado Operaciones (objetos embebidos → snapshots)

#### Resolución de datos: snapshot vs. servicio vivo

Tras el rediseño de `Operacion` (objetos embebidos → snapshots `RefCliente`/`RefChofer`/`RefVehiculo`/`RefProveedor`), el acceso a datos relacionados sigue esta jerarquía:

1. **Si el dato está en el snapshot de la op, leerlo de ahí.** Aplica a datos de exhibición histórica (razón social, nombre, apellido, patente, dominio, CUIT) Y a datos que la op congela como hecho histórico: `op.proveedor` (qué proveedor para esta op), `op.vehiculo` (qué vehículo). Para registros históricos el snapshot es lo **correcto**, no solo lo conveniente: resolver contra el vivo daría el estado actual, no el de la op.

2. **Si el dato NO está en el snapshot, resolver por ID contra el servicio vivo.** Aplica a datos de cálculo estables que no se congelan (ej. `contratacion` del chofer). Cada `XxxService` expone getters síncronos para esto:
   - `getChoferPorId(id): ConIdType<Chofer> | undefined`
   - `getTipoContratacion(idChofer): 'directo' | 'proveedor' | undefined`
   - `getContratacionChofer(idChofer): ContratacionChofer | undefined`

   **No usar helper genérico de resolución** ni inyectar XxxService en la capa de datos (`DbFirestoreService`) — produce dependencia circular. Cuando la capa de datos necesita un dato resuelto, recibe el valor ya resuelto como parámetro desde la capa de negocio (ver `eliminarInformesPorIdOperacion`: TableroService resuelve `tipoContratacion` y lo pasa).

**Regla práctica:** antes de meter un `getXxxPorId`, verificar si el dato ya está en el snapshot de la op (`op.proveedor`, `op.vehiculo`). Si está, leerlo de ahí.

#### Política de fallo cuando el dato no resuelve (papelera)

Las entidades eliminadas van a papelera (otra colección), por lo que `getXxxPorId` puede devolver `undefined` para ops históricas de entidades dadas de baja — es un caso REAL, no defensivo. Tratamiento por contexto:

| Contexto | Tratamiento del `undefined` |
|---|---|
| Exhibición (tablas, dropdowns, reportes) | Fallback al snapshot (datos congelados); `—`/etiqueta para datos no disponibles; en filtros/contadores, excluir el ítem (degradación silenciosa) |
| Cálculo en servicios `valores-op*` | `op.datosTarifaX!` + `// TODO: refactor Tarifas` |
| Cálculo/cascada viva (borrados, batch) | `throw` explícito o `Swal + return` — NUNCA dejar caer en rama por defecto (riesgo de borrar/escribir colección equivocada) |

Solución futura: resolver contra la papelera (guarda id + colección de origen). Todos los puntos marcados con `// TODO: refactor Papelera`.

#### Nullable de tarifa (datosTarifaEventual / datosTarifaPersonalizada)

Ahora son `| null`. Invariante confirmado: `datosTarifaEventual !== null ⟺ tarifaTipo.eventual` (idem personalizada). Tratamiento por contexto:
- **Cálculo:** `op.datosTarifaX!` + `// TODO: refactor Tarifas`.
- **Exhibición que lee un valor:** `op.datosTarifaX?.… ?? 0/'—'`.
- **Getter de exhibición:** guard `if (!op.datosTarifaX) return ''/[]`.
- **Múltiples accesos en un método de una sola tarifa:** guard al inicio (`if (!op.datosTarifaX) return;`) que estrecha todo el cuerpo, en vez de `!` repetido.

#### OperacionRuntime: divergencia runtime-vs-tipo

Los componentes de carga del modelo viejo (`carga-multiple`, `carga-tablero-diario`, `operaciones-table` — los tres eliminados, ver "Deuda conocida") usaban un tipo local `OperacionRuntime`. La factory metía un `Chofer` COMPLETO en runtime, pese a que `Operacion.chofer` es `RefChofer`. El tipo se redefinía para reflejar el runtime (ejemplo histórico — el principio general de la última línea sigue vigente):
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

Se agregó `vendedor?: string[]` a `RefCliente` (snapshot). La comisión de vendedor es **por operación** (histórica), no del vendedor vigente del cliente → va al snapshot, congelada al alta. Opcional porque las ops históricas no lo tienen. **Pendiente:** el factory (`OperacionFactoryService`) debe poblar `vendedor` al crear la op (TODO marcado); hasta entonces queda `undefined` y la asignación de comisiones no corre para ops nuevas (acceso protegido por `&&`).

#### Métodos/bloques comentados (código muerto del modelo viejo)

- `limpiarPropiedadesChoferEnOperaciones` (carga-tablero-diario): reconstruía un Chofer completo desde el snapshot; estaba comentado entero + su llamada. Resuelto: el archivo entero (`carga-tablero-diario`) fue eliminado en el switch de Asignaciones — ya no existe.
- `getCategoria` (tablero-op): colapsado a `op.vehiculo.categoria` (la categoría ya está en el snapshot) — sigue vigente. `getCategoriaDesdeOperacion` (tablero.service) tuvo el mismo colapso primero y luego fue eliminado por completo en el switch de Asignaciones (sin caller externo).

### Operatoria compleja atómica (Operaciones en adelante)

Los módulos con operatorias que afectan varias entidades de forma atómica (alta de N ops + tablero) no pasan por el esquema "una acción a la vez vía StorageService". Su servicio escribe **directo a `DbFirestoreService`** mediante un batch atómico (`commitBatch`), e informa al log llamando directo a `LogService`.

**Distinción clave:**
- *CRUD por entidad* (Choferes/Clientes/Proveedores): escritura vía `StorageService`, log acoplado a cada escritura.
- *Operatoria compleja atómica* (Operaciones en adelante): escritura directa + batch + log en el coordinador.

**Reglas:**
- **Log:** una transacción atómica = UN registro (la acción principal del usuario). Los movimientos derivados no loguean por separado. El log vive en el método coordinador, no en las piezas.
- **Coordinación entre servicios:** el servicio primario (`OperacionService`) inyecta al secundario (`AsignacionService`), nunca al revés. El coordinador decide el CONTENIDO del batch (negocio); `DbFirestoreService` EJECUTA el batch (mecánica Firestore).
- **Pre-generación de id:** para que un documento referencie el id de otro dentro de un batch, se pre-genera el doc id (`generarId`) antes del commit.
- **Punto de entrada único:** el componente llama al coordinador (`altaDesdeAsignacion`), no a los servicios parciales por separado.

> Candidato a retro-aplicarse a los casos compuestos de módulos ya refactorizados (ej. alta de chofer + legajo + vehículos, hoy hecha acción por acción) cuando se revise `StorageService`.

### Ownership por entidad primaria (acciones que encadenan varias entidades)

Cuando un gesto del usuario toca varias entidades, lo administra el servicio de la
**entidad primaria** del gesto — identificada por el sustantivo de la acción ("dar de
baja una OPERACIÓN", "restaurar una OPERACIÓN"), no por el módulo desde donde se
dispara ni por las entidades secundarias que toca.

- **El módulo de origen** (liquidaciones, papelera, tablero-op) es solo el LUGAR del clic;
  no es el dueño de la acción. Dispara y muestra el resultado.
- **El servicio dueño orquesta:** arma las escrituras, las ejecuta atómico (`commitBatch`
  multi-colección donde se pueda), y loguea UNA vez (la acción principal del usuario).
- **Entidades secundarias con su propio servicio:** el dueño las inyecta y les pide su
  parte. Dirección única (primaria → secundaria), nunca en ciclo.
  Ej.: `OperacionService` → `AsignacionService`.
- **Servicios de apoyo de bajo nivel** (papelera, log, db): son tontos respecto al dominio.
  La papelera mueve documentos, NO sabe restaurar una op/chofer/legajo; cada servicio de
  entidad tiene su `restaurarXxx` con sus reglas. Esto evita que un servicio de apoyo se
  vuelva un dios que conoce todos los dominios.
- **Segmentación por GESTO, no por mecánica:** un método coordinador por gesto del usuario
  (`bajaOperacion`, `editarOperacion`, `restaurarOperacion`, `altaDesdeAsignacion`),
  nombrado por la intención, atómico. NO un `procesarXxx(tipo)` genérico con switch.
- **Atomicidad sin Cloud Functions:** meter en un `commitBatch` todo lo posible; lo que no
  entre, secuenciar con orden cuidado (reversible primero, irreversible al final).

#### Coordinadores bajaOperacion / restaurarOperacion (Operaciones)

- **Alcance:** SOLO operaciones NO liquidadas (`estado.liquidacion.cliente` y `.chofer`
  ambos `false`). Liquidadas quedan fuera — revertir la liquidación
  (`LiquidacionService.revertirInformeLiq`) es un gesto previo y separado.
- **Regla de ciclo en la baja:** `ciclo === 'abierta'` → no busca informes. `ciclo === 'cerrada'`
  → DEBE existir informe en `informesOpClientes` y en `informesOpChoferes`/`Proveedores` (según
  `tipoContratacion`); si falta alguno, ABORTA toda la operatoria sin escribir nada (es una
  inconsistencia real, no un caso vacío legítimo). Corrige el bug del código legacy
  (`eliminarInformesPorIdOperacion`) donde el `throw` quedaba atrapado en un try/catch que solo
  hacía `console.error` sin re-lanzar.
- **Atomicidad real:** un solo `commitBatch` con delete de la operación (+ informes si
  corresponde) + crear entrada de papelera + reemplazar tablero del día. Reemplaza las 3
  escrituras independientes sin rollback del código legacy
  (`TableroService.anularOperacionYActualizarTablero` + `eliminarInformesPorIdOperacion`).
- **restaurarOperacion** SIEMPRE deja la op en `'abierta'` (estado vía
  `OperacionFactoryService.estadoInicial()`, `km:0`). Los `InformeOp` NO se reconstruyen — se
  eliminaron en la baja, no se archivaron. Si la op estaba `'cerrada'` antes de la baja, hay que
  volver a cerrarla manualmente tras restaurar.
- **Item de asignación:** nunca se borra, se anula/reactiva vía métodos puros nuevos en
  `AsignacionService` (`anularItemEnLista`/`reactivarItemEnLista` — arman la lista, no
  escriben), consumidos directo por el batch del coordinador. `marcarItemAnulado`/
  `reactivarItem` (los async existentes) pasaron a ser wrappers finos sobre estos puros — mismo
  comportamiento externo, sin duplicar lógica.
- **EscrituraBatch/commitBatch** (`DbFirestoreService`) extendido con un tercer modo
  `'eliminar'` (`batch.delete`), aditivo — no cambia `'crear'`/`'reemplazar'`.
- **Caller legacy** (`TableroService.anularOperacionYActualizarTablero`,
  `DbFirestoreService.eliminarInformesPorIdOperacion`) queda INTACTO, no migrado en esta
  sesión — candidato a eliminar en sesión futura de integración de callers.

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

## Deuda conocida

Deuda técnica activa. Actualizar cuando se salda.

### Deuda — integración de callers para bajaOperacion/restaurarOperacion

Los coordinadores existen y son atómicos (ver "Coordinadores bajaOperacion / restaurarOperacion
(Operaciones)" más arriba) pero NO tienen caller nuevo todavía. Pendiente:
- `PapeleraComponent.addItem` (caso `'operaciones'`): hoy llama a
  `TableroService.altaOperacionYActualizarTablero` (no atómico) — migrar a
  `OperacionService.restaurarOperacion(logDoc)`. Requiere resolver el id real del doc de
  papelera vía `getByField('papelera','idDoc',...)` porque `PapeleraComponent` solo tiene
  `LogDoc` plano, no el id de Firestore.
- Baja de operación paso a paso (liquidaciones-op / tablero-op, lugar exacto a confirmar):
  migrar a `OperacionService.bajaOperacion(op, motivo)`.
- Al migrar ambos callers: evaluar eliminar `TableroService.anularOperacionYActualizarTablero`
  y `DbFirestoreService.eliminarInformesPorIdOperacion` (único caller).
- `editarOperacion` sigue diferido al refactor de Tarifas (sin cambios respecto a la deuda ya
  registrada).

### Switch completado — tablero-asignaciones / operaciones-editor / carga-asignacion

tablero-diario, carga-tablero-diario y operaciones-table (y su modal embebido) fueron
eliminados junto con sus interfaces exclusivas (TableroDiario, ChoferAsignadoBase) y los
métodos acotados de TableroService/DbFirestoreService que solo ellos usaban
(getTableroPorFecha viejo, guardarTablero, altaMultipleOperacionesYActualizarTablero,
getCategoriaDesdeOperacion, deleteTablero — el último ya estaba comentado).

Única ruta de tablero de asignaciones activa hoy: tablero-asignaciones (pestaña 'Tablero
Asignaciones' en el shell de Operaciones). La pestaña 'Tablero Diario' fue quitada de
op-control.component.ts. La ruta 'diario' fue quitada del routing — /op/diario ya no
resuelve a ningún componente.

Los dos caminos de alta activos son tablero-asignaciones (principal) y carga-asignacion
(caso especial — agregar a fecha ya confirmada o alta puntual), ambos convergiendo en
operaciones-editor + altaDesdeAsignacion.

Nota (no bloqueante, no priorizada): tablero-asignaciones no aplica `[disabled]` por rol
demo en sus botones de acción. Se abordará, si corresponde, cuando se encare el refactor
general de Roles.

### Deuda — desincronización selectedTab vs. ruta activa (patrón shell-con-pestañas)

**Desincronización selectedTab vs. ruta activa (OpControlComponent y patrón
shell-con-pestañas):** el resaltado de la pestaña activa depende solo de clicks previos en
la sesión del componente (selectedTab), no de la URL real. Al refrescar (F5) o entrar por
deep-link a una ruta hija (ej. /op/asignaciones), el router-outlet renderiza el componente
correcto pero la pestaña resaltada queda desincronizada (siempre vuelve a 'Tablero de
Operaciones'). Detectado en op-control.component.ts durante el switch de Asignaciones; el
mismo patrón se repite en los otros ~12 componentes *-control del proyecto (uno por módulo
bajo raiz/). No resuelto, no bloqueante — candidato a frente propio si se decide atacarlo
(ActivatedRoute + Router.events para sincronizar selectedTab con la URL real, en vez de
solo con clicks).

### Deuda menor — tablero-asignaciones

**Informe Excel (`descargar`):** inerte, muestra aviso. `generarInformeAsignaciones` recibía
estructuras del modelo viejo; reescribir para `AsignacionItem[]`. Diferido a cierre de módulo.

**No-disponibilidad sin probar end-to-end:** la atenuación de vehículos de proveedor está
correctamente ausente en el tablero (diferida a operaciones-editor), pero verificar la
atenuación de directos al integrar con datos reales en operaciones-editor.

**Persistencia del borrador en F5:** el borrador en curso vive en memoria del service; un F5 lo
pierde. Si se requiere, persistir solo la fecha en localStorage y recuperar de Firestore (cubre
tableros guardados/dados de alta, no el borrador local no guardado). DIFERIDO.

### Deuda — operaciones-editor / Tarifas

**`idCliente` de TarifaPersonalizadaCliente: tipo vs dato divergen.** La interfaz declara
`idCliente: number`, pero los datos en Firestore se corrigieron a string (consola Firestore)
para cruzar con `op.cliente.id` (string). `getTarifaPersonalizada(idCliente: any)` usa `any`
para forzar la igualdad sin romper la interfaz. RIESGO: el alta/edición de tarifas
personalizadas en el módulo viejo lee `idCliente` esperando number — verificar al refactor de
Tarifas. Marcado `// TODO: refactor Tarifas`.

**Estilos duplicados:** las clases SCSS de tarifa eventual/personalizada se copiaron de
operaciones-table a operaciones-editor. operaciones-table ya fue eliminado en el switch de
Asignaciones (Bloques 13-19) — pendiente ahora consolidar los estilos duplicados en
operaciones-editor (ya no hay original que mantenga la copia sincronizada).

**Celdas de tarifa en el template:** los bindings a `datosTarifaEventual`/`datosTarifaPersonalizada`
usan guarda `@if (objeto)` (no `[disabled]` + `!`): el `disabled` NO impide que Angular evalúe
el binding, y el `!` revienta en runtime cuando el objeto es null. Patrón a respetar en
cualquier template que bindee tarifas nullable.

### Componente operaciones-editor (migración de operaciones-table — COMPLETADA)

`operaciones-table` migrado a un componente NUEVO `operaciones-editor`
(`src/app/raiz/operaciones/operaciones-editor/`), construido de cero al lado del viejo
(patrón de migración estructural profunda). `operaciones-table` fue eliminado por completo
en el switch de Asignaciones (Bloques 13-19) — ya no está declarado en OperacionesModule.

**Contrato (cumplido):**
- Entrada: `@Input() operacionesCreadas: OperacionCreada[]` (lista PLANA, tipada — NO
  `fromParent` con cast). El caller setea `modalRef.componentInstance.operacionesCreadas`.
- Salida: `modalRef.result` resuelve con `OperacionCreada[]` finales (sin las eliminadas);
  dismiss = cancela.
- Agrupa por `item.idCliente` internamente (viewmodel efímero `GrupoEditor`).

**Resolución de pendientes:**
- Chofer (caso proveedor, `op.chofer.id === ''`): selector con
  `ChoferService.getChoferesPorProveedor(idProveedor)`. Al resolver, recalcula `tarifaTipo`
  con la tarifa del PROVEEDOR (`ProveedorService.getTarifaTipo`, NO `chofer.tarifaTipo`) vía
  `OperacionFactoryService.recalcularTarifaTipo` + `aplicarTarifaTipo`.
- Vehículo (`op.vehiculo.id === ''`): selector con vehículos del dueño (proveedor si
  `op.proveedor`, chofer si directo), filtro síncrono sobre `getVehiculosActuales()`.

**Eliminar = excluir del resultado (Opción B):** `Set<idItem>` de eliminadas; se ocultan
del render y se excluyen del array devuelto. NO muta `operacionesCreadas` (cancelar reabre
desde cero, inocuo). NO toca Firestore.

**Toggle eventual reversible:** `tarifaOriginal: Map<idItem, TarifaTipo>` guarda el tipo
original (estado de UI, no ensucia la Operacion — reemplaza el viejo `OperacionRuntime`).
La mutación coherente (tarifaTipo + datosTarifaX, manteniendo el invariante) vive en
`OperacionFactoryService.aplicarTarifaEventual`.

**Badge tarifa de cliente:** inmune a toggles — leído del cliente vivo
(`ClienteService.getClientePorId(idCliente)?.tarifaTipo`), con fallback al snapshot si el
cliente está en papelera.

**Badge tarifa de chofer (informativo):** resuelto por ID, no congelado. Directo →
`chofer.tarifaTipo`; proveedor → `ProveedorService.getTarifaTipo`. Solo display.

**El editor NO calcula valores ni persiste:** edita un snapshot en memoria y devuelve.
`calcularValoresIniciales` + persistencia siguen en `altaDesdeAsignacion`. Sin suscripciones
(resolución síncrona puntual): edita, no observa.

`OperacionRuntime` y `patenteChofer` ELIMINADOS en operaciones-editor. El viejo
operaciones-table (que sí los usaba) fue eliminado por completo en el switch de
Asignaciones — no quedan copias vivas de estos tipos en ningún componente.

### Componente carga-asignacion (migración de carga-multiple — COMPLETADA)

`carga-multiple` migrado a un componente NUEVO `carga-asignacion`
(`src/app/raiz/operaciones/carga-asignacion/`), construido de cero al lado del viejo (mismo
patrón que `tablero-asignaciones`/`operaciones-editor`). `carga-multiple` ELIMINADO en sesión
posterior (ver "Eliminado en esta sesión" más abajo).

**Selección sin pool de vehículos:** a diferencia de `tablero-asignaciones` (que arrastra
vehículos concretos), acá se elige CHOFER DIRECTO o PROVEEDOR (checkboxes), sin resolver
vehículo. `armarItems()` arma cada `AsignacionItem` con `sujeto.idVehiculo: null` siempre —
la resolución de vehículo (único candidato o varios) queda enteramente para
`operaciones-editor`. El `item.ref` que arma este componente es un placeholder
(`dominio: ''`, `categoria: {catOrden:0, nombre:''}`); ver más abajo cómo se corrige.

**`AsignacionRef` placeholder corregido en `altaDesdeAsignacion`:** `OperacionService.altaDesdeAsignacion`
(`servicios/operaciones/operacion.service.ts`) reconstruye `c.item.ref` con los datos reales
de la op final en el mismo loop donde ya reconstruye `c.item.sujeto` (paso 3). Para
`tablero-asignaciones` es idempotente (el ref ya viene correcto desde el pool de vehículos).
Para `carga-asignacion` corrige el placeholder una vez que `operaciones-editor` resolvió el
vehículo pendiente. Es el único punto de verdad para "cómo se ve un `AsignacionItem`
persistido" — no reconstruir `ref` en ningún otro caller.

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

**Eliminado en esta sesión:** `carga-multiple.component.ts/.html/.scss/.spec.ts` borrados
completos, entrada quitada de `OperacionesModule`, import muerto quitado de
`tablero-op.component.ts`. Diagnóstico previo confirmó sin referencias cruzadas
(`OperacionRuntime`/`TarifaBase`/`GrupoTabla` eran copias locales en
`carga-tablero-diario`/`operaciones-table`, no compartidas — ambos componentes fueron, a su
vez, eliminados en una sesión posterior junto con `tablero-diario`, ver "Switch completado").

**Caller confirmado:** `tablero-op.component.ts`, método `modalCargaMultiple()` (nombre
heredado del componente viejo, no renombrado — el cuerpo ya abre `CargaAsignacionComponent`).
Candidato a renombrar el método en una sesión futura por claridad, no urgente.

### Deuda — no-disponibilidad y tablero

**Rediseño de no-disponibilidad (frente propio):** modelo rico con sujeto discriminado
(chofer-entidad / proveedor-entidad / vehiculo / chofer-de-proveedor), fecha desde +
hasta|null, motivo, activa. Lógica derivada "si el único vehículo no está, la entidad
no está". Rehace la interfaz `NoDisponibilidadChofer`, el modal completo y el consumo del
tablero; toca `operaciones-editor` (no-disp de choferes de proveedor se resuelve allá).
El modal actual quedó con arreglo mínimo hasta entonces.

**`clientesVisibles` getter "con trabajo"** (arma Map + ordena en cada acceso): candidato
a cachear si hubiera cientos de clientes. Hoy trivial.

**Item con cliente borrado** (papelera) sin columna: `// TODO: refactor Papelera`.
