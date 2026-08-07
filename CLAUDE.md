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

Firebase Auth (email/password). Google Auth fue removido (sin uso
real). Al autenticarse, se lee `/users/{uid}` en Firestore (top-level,
NO bajo `/Vantruck/datos/` — única excepción a ese árbol) para obtener
el rol.

**Modelo de rol:** campo único `role: 'dev'|'admin'|'manager'|'user'|'demo'`
(interfaz `Usuario` en `interfaces/usuario.ts`). Reemplaza al modelo
viejo (`roles: {god, admin, manager, user}`, mapa de booleanos,
`god` renombrado a `dev`). Sin jerarquía en código: cada guard/directiva
enumera explícitamente los roles permitidos: `'dev'` no implica acceso
automático a rutas que no lo listen.

**`UsuarioSesionService`** (`servicios/usuario-sesion/`): fuente única
de la sesión en memoria (sin observable — no hace falta reactividad en
vivo, es sesión local). Getter síncrono `getUsuarioActual()`, más
`esRol(...roles)` para chequeos. Persiste en `localStorage` bajo la
clave `usuarioSesion` (propia, distinta de la vieja `usuario` que
`StorageService` dejó de poblar). `AuthService` es responsable solo de
Firebase Auth (login/logout); separa "autenticarse" de "quién soy y qué
puedo hacer".

**`RoleGuard`/`*appRole`**: comparación plana contra `usuario.role`
(`rolesEsperados.includes(usuario.role)` / `esRol(...)`), sin jerarquía.
Sin sesión → `/unauthorized`. Con sesión pero sin acceso a la ruta →
`/limbo` (misma pantalla que antes esperaba verificación de email; hoy
es genéricamente "sesión válida, sin acceso a esto").

**Custom Claims + Cloud Function `syncRoleClaim`:** trigger `onWrite` en
`users/{uid}` que sincroniza `role` al Custom Claim de Firebase Auth
(`functions/src/syncRoleClaim.ts`), con guard para evitar escrituras
redundantes. El Custom Claim solo lo consumen las Security Rules — el
cliente Angular sigue leyendo el documento de Firestore (vía
`UsuarioSesionService`), no el token, para no depender de refresh de
token para reactividad de UI.

⚠️ **Ventana de propagación conocida y aceptada:** un cambio de rol
tarda hasta 1 hora en reflejarse en el token de una sesión ya abierta
(comportamiento estándar de Firebase, sin mitigación agregada — decisión
consciente, bajo volumen de usuarios). Si hace falta inmediato, la
persona debe cerrar sesión y volver a entrar.

**Alta/edición/baja de usuarios — exclusiva de `dev`/`admin`, vía Cloud
Functions** (`functions/src/gestionUsuarios.ts`), NO por escritura
directa a Firestore (`firestore.rules` mantiene `write` de `/users/{uid}`
restringido a `dev` únicamente; `admin` opera solo a través de estas
funciones, que corren con Admin SDK y validan autorización en código,
no en reglas declarativas):
- `crearUsuario(email, name, role)`: crea en Auth con
  `emailVerified: true` (el admin da fe del mail, no hace falta
  verificación out-of-band), crea el documento en Firestore (dispara
  `syncRoleClaim` solo), devuelve un link de "establecer contraseña"
  (`generatePasswordResetLink`) que se comunica manualmente — sin envío
  automático de mail, no se justifica para 4-5 usuarios totales.
  `role` nunca puede ser `'dev'`.
- `editarUsuario(uid, name?, role?)`, `editarEmailUsuario(uid, nuevoEmail)`,
  `eliminarUsuario(uid)`: mismo patrón de autorización, centralizado en
  el helper `exigirObjetivoEditable` — único lugar a tocar si la regla
  de jerarquía cambia. Matriz: un usuario `'dev'` nunca es tocable desde
  la app (siempre por consola); un `'admin'` solo es tocable por `'dev'`
  o por sí mismo (y nunca puede cambiarse su propio rol); el resto,
  libre para `dev`/`admin`.
- Cambiar el email de un usuario invalida automáticamente su sesión
  (comportamiento nativo de Firebase Auth ante cambios de email o
  contraseña — no requiere código adicional para revocar). Si el cambio
  es sobre la propia cuenta, la UI fuerza `cerrarSesion()` explícito en
  vez de esperar a que el token falle solo.
- Sin envío automático del link, el modal de alta/cambio de email no
  puede cerrarse sin haber copiado el link al menos una vez (botón
  Cerrar deshabilitado, sin cierre por backdrop/Escape) — perder el
  link deja a esa persona sin forma de acceder.

**Pantalla:** `raiz/ajustes/gestion-usuarios/` (reemplaza a
`ajustes-usuarios`/`usuarios-edicion`, eliminados). Lectura puntual de
`/users` (sin listener — mismo patrón que
`CuentaCorrienteService.obtenerRankingMorosos()`, sin `ConId` porque el
doc ya trae su propio `uid`), filtrando `role !== 'dev'` siempre —
`dev` no se lista ni gestiona desde la app, exclusivamente por consola.

**Autoregistro cerrado:** `register-user` (ex `sign-up`) y
`verify-email-address` eliminados junto con toda la maquinaria de
verificación de email que dependía de ellos
(`enviarEmailVerificacion`/`chequearVerificacionEmail`/
`actualizarEmailVerificado`) — innecesaria una vez que el alta la hace
`dev`/`admin` dando fe del mail. `resetearPassword` (recuperación de
contraseña de un usuario existente) es independiente y se mantiene.

### State management

El refactor arquitectónico está migrando el manejo de estado desde un store central
único hacia servicios por entidad. Conviven dos esquemas según el módulo:

**Módulos refactorizados** (Choferes, Proveedores, Clientes; Operaciones en progreso — subsistema Asignaciones: capa de servicios y fachada completas; switch completo de `tablero-diario` → `tablero-asignaciones` (tablero-diario, carga-tablero-diario y operaciones-table eliminados); `carga-multiple` migrado a `carga-asignacion` y switch completado (carga-multiple eliminado), con caller confirmado en tablero-op (`modalCargaMultiple()`); coordinadores `bajaOperacion`/`restaurarOperacion` en OperacionService completos (atómicos,
batch + log único), con `tablero-op` ya usando `bajaOperacion` como caller para la baja
de operaciones abiertas; `editarOperacion` pendiente, depende del refactor de Tarifas):
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
| `usuario-sesion/` | Fuente única de la sesión en memoria (rol, uid, email del usuario logueado). Sin listener — no reactivo en vivo. |
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

Dos proyectos Firebase reales — no tres. `lplog-31164` fue un remanente de pruebas viejas
con un tercer proyecto, sin uso actual — limpiado del repo (`environment.ts`, `angular.json`,
esta tabla; detalle en `CHANGELOG.md`).

| Config | Proyecto Firebase | Uso |
|---|---|---|
| `development` | `demoapplog` (por defecto) | Dev local — `environment.ts` apunta a `demo` de forma estándar |
| `demo` | `demoapplog` | Staging |
| `vantruck` | `pf-logistics` | Producción |

`environment.ts` tiene un segundo bloque de config comentado con `pf-logistics` —
interruptor manual existente para debug local contra el proyecto de producción real
(descomentar temporalmente, nunca commitear activo). No es un entorno de build separado
ni un tercer proyecto, es una práctica ya establecida sobre el mismo `development`.

### Cloud Functions

Primera incorporación al proyecto (hasta ahora toda la lógica corría en
el cliente). Carpeta `functions/`, TypeScript, 2nd gen
(`firebase-functions/v2`), un solo codebase compartido entre los
proyectos `demo` y `vantruck` (mismo código, deploy independiente por
proyecto vía `--project`).

- `syncRoleClaim`: ver "Autenticación y roles".
- `crearUsuario`/`editarUsuario`/`editarEmailUsuario`/`eliminarUsuario`:
  ver "Autenticación y roles".

**Orden de deploy obligatorio** (evita ventanas de bloqueo): funciones
primero (`firebase deploy --only functions --project <alias>`), esperar
a que los claims existentes se sincronicen, recién después
`firestore.rules` (`firebase deploy --only firestore:rules --project <alias>`).
Si las reglas se despliegan antes de que los claims existan, todo el
proyecto queda bloqueado hasta que se sincronicen.

Verificación previa a cualquier deploy real: emulador local
(`firebase emulators:start --only firestore,auth,functions`, requiere
JRE instalado por el emulador de Firestore). Scripts de prueba
reproducibles: `functions/test-emulator.mjs` (sync de claims + reglas
básicas), `functions/test-gestion-usuarios.mjs` (las 4 funciones de
gestión, 12 casos cubriendo la matriz de autorización completa),
`functions/test-asignaciones-rules.mjs` (reglas de la categoría
`asignaciones`: `user` puede leer/crear/eliminar, `demo` sin ningún
acceso, `admin` de control — setea el Custom Claim directo vía Admin
SDK, no necesita el emulador de `functions`, alcanza con
`--only firestore,auth`).

### Security Rules (`firestore.rules`)

Reemplaza el modelo anterior (`allow read, write: if request.auth != null`,
sin ninguna restricción real por colección, rol, ni método — toda la
seguridad vivía únicamente en Angular/UI). Matriz rol × módulo × acción
vía función `permitido()`, consumiendo el Custom Claim (`request.auth.token.role`).
Colecciones sin mapeo explícito quedan denegadas por defecto (fail-safe:
cualquier colección nueva debe agregarse a `moduloDe()` explícitamente
antes de usarse en producción, o queda bloqueada).

Categorías especiales:
- `legacySoloLectura`: colecciones legado con escritura real confirmada
  en código vivo pero fuera del alcance de este refactor
  (`facturaCliente`/`facturaChofer`/`facturaProveedor`,
  `facturaOpCliente`/.../`facturaOpProveedor`,
  `facOpLiqCliente`/.../`facOpLiqProveedor`,
  `resumenLiqClientes`/.../`resumenLiqProveedores`), y código muerto
  confirmado sin caller (`tableroDiario`,
  `tarifasChofer`/`tarifasCliente`/`tarifasProveedor` singular). Tratadas
  como solo lectura A PROPÓSITO, ni siquiera `dev` puede escribir — para
  que cualquier escritura remanente falle visiblemente en `demo` y se
  detecte antes de llegar a producción, en vez de heredar permisos
  amplios "por las dudas". Ver deuda abajo.
- `_backup_*` (prefijo dinámico de colecciones de migración): solo
  `dev`, ni lectura para el resto.
- `/users/{uid}`: excepción de path (no vive bajo `/Vantruck/datos/`).
  Lectura: `dev`/`admin`, o el propio usuario sobre su propio documento
  (imprescindible para poder loguear). Escritura directa: solo `dev` —
  `admin` opera exclusivamente vía las Cloud Functions de gestión.
- `asignaciones`: categoría propia, desacoplada de `operaciones` (antes
  `moduloDe()` las mapeaba juntas). `dev`/`admin`/`user` tienen las 4
  acciones sin distinción (`r in ['dev','admin','user']`, sin chequeo de
  `accion`); `demo`/`manager` sin ningún acceso. Un tablero de
  asignaciones es trabajo descartable/editable por naturaleza
  (borrador), perfil de riesgo distinto al de la `Operacion` real ya
  persistida — no debe heredar las restricciones de `operaciones`
  (`user` no tiene `eliminar` ahí). Separado tras un bug real en
  producción: `user` recibía "Missing or insufficient permissions" al
  limpiar un borrador (`asignaciones` heredaba `eliminar=false` de
  `operaciones`) pese a que el gating del cliente (Bloque 7 del frente
  Botones y Permisos) ya lo permitía correctamente — la corrección era
  puramente de reglas, sin tocar Angular/`PermisosService` salvo
  agregar la entrada `matrizBase.asignaciones` por fidelidad de
  transcripción (sin consumidor real desde `ModuloPermiso` todavía).
  Verificado con `functions/test-asignaciones-rules.mjs` contra el
  emulador antes de deploy (mismo patrón que `test-emulator.mjs`).

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

### Frente Botones y Permisos (en progreso)

Continuación del Refactor de Roles y Seguridad, independiente del frente de Operaciones
(que ya cerró el suyo). Ataca dos problemas relevados por auditoría de solo lectura:
el sistema de botones `app-btn-*` (5 componentes, wrappers de tabla, usos directos) sin
inventario ni consistencia documentada, y la deuda de "control de permisos de UI
disperso" (`*appRole` puntual por template, sin relación con la matriz real de
`firestore.rules`).

**Arquitectura acordada, de 4 capas:**

1. **Dominio** — `PermisosService` (`servicios/permisos/`) + reglas de negocio por fila
   (funciones tipo `puedeEditar(row)`/`puedeEliminar(row)` ya existentes en algunos
   componentes, ej. `tablero-op`) deciden QUÉ está permitido: rol × módulo × acción desde
   `PermisosService`, más el estado del registro puntual desde la regla de negocio.
2. **Gating** — cómo se aplica la decisión de la capa de dominio en el template. Dos
   mecanismos según el caso: `*appPermiso` (directiva estructural, oculta el elemento)
   para botones crudos sin componente propio; inputs `modulo`/`accion` directo en los
   `app-btn-*` (agregados a los 4 componentes en el Bloque 2, ver abajo — sin conectar
   a ningún caller todavía) para el caso más común, donde el botón ya es un componente y
   puede resolver su propio estado enabled/disabled sin que el caller arme la condición
   a mano.
3. **Presentación** — catálogo semántico (los 4 `app-btn-*`: agregar/editar/eliminar/leer,
   variantes cerradas por `name`) para las acciones CRUD repetidas, más
   `AccionGenericaComponent` (Bloque 3, ver abajo) para el resto: botones crudos
   `<button>` con texto/variante/ícono libres que no encajan en el significado cerrado
   del catálogo semántico (ej. los de `tablero-asignaciones`). No reemplaza a los 4
   `app-btn-*` — conviven, cada uno cubre un caso distinto.
4. **Consumidores** — los 3 wrappers de tabla (`TablaAccionesComponent`,
   `InformesAccionesCellComponent`, `AccionesCellRendererComponent` — este último sin
   caller activo) y los ~90 usos directos relevados por la auditoría, migrados
   progresivamente a las capas 1-3 en bloques futuros.

**Bloque 1 — fundaciones (este bloque): infraestructura creada, sin conectar a ningún
consumidor.** El árbol compila exactamente igual que antes; ningún `*appRole` existente
fue tocado ni reemplazado.

- **Interfaces de tabla renombradas** (sin cambiar campos, solo identidad — colisión de
  nombres detectada por la auditoría: dos `AccionTabla`/`ColumnaTabla` distintas e
  incompatibles convivían en el proyecto):
  `interfaces/tabla.ts` → `interfaces/tabla-generica.ts`
  (`ColumnaTabla`→`ColumnaTablaGenerica`, `AccionTabla`→`AccionTablaGenerica`; consumida
  por `TablaGenericaComponent`, `TablaAccionesComponent`, `gestion-usuarios`,
  `choferes/clientes/proveedores-listado`). `interfaces/tablas.ts` →
  `interfaces/informes-tabla.ts` (`ColumnaTabla<T>`→`ColumnaInformesTabla<T>`,
  `AccionTabla<T>`→`AccionInformesTabla<T>`, `EventoAccionTabla<T>`→`EventoInformesTabla<T>`,
  `OrdenTabla`→`OrdenInformesTabla`; consumida por `InformesTablaComponent`,
  `facturacion-listado`, `facturacion-historico`).
- **`interfaces/permiso.ts`** (nuevo): `ModuloPermiso` (unión cerrada de los 11 módulos
  reales del proyecto) y `AccionPermiso` (unión abierta a propósito — se agregan valores
  ahí a medida que aparecen casos nuevos, sin tocar callsites existentes).
- **`PermisosService`** (`servicios/permisos/`, nuevo): `matrizBase` traducida
  literalmente de la función `permitido()` de `firestore.rules` (no inventada).
  `liquidaciones`/`facturacion`/`reportes` espejan `finanzas` 1:1 a propósito (confirmado
  con el desarrollador): sus colecciones reales no tienen módulo propio en `moduloDe()`
  de `firestore.rules` hoy, comparten `'finanzas'`. `overrides` (por `'modulo.accion'`)
  queda vacío en este bloque — se completa caso a caso en frentes futuros. Método
  `puede(modulo, accion?)`: sin sesión → `false`; override definido para el rol → gana;
  si no, se consulta `matrizBase`.
  ⚠️ **Diseño original de `matrizBase`, corregido después de este bloque:** en el Bloque 1
  la matriz colapsaba a un solo booleano por `[modulo][rol]` (granularidad de módulo, no de
  acción). Causó un bug real, encontrado en pruebas manuales post-Bloque 4 y corregido en
  el bloque siguiente — ver "Corrección — granularidad de `matrizBase` por acción" más
  abajo. Esta entrada queda como registro histórico del Bloque 1; el diseño vigente hoy es
  el corregido.
  ⚠️ **Hallazgo de la traducción, resuelto como decisión explícita (no deuda):** el rol
  `'manager'` no aparece en ningún módulo de `permitido()` en `firestore.rules` — no tiene
  ningún acceso real a Firestore. Es un rol teórico sin uso actual (`RolUsuario` lo declara,
  pero ningún usuario real del proyecto lo tiene asignado hoy). `PermisosService` lo
  deniega en `matrizBase` para los 11 módulos, a propósito — no es una omisión a corregir.
  La migración de los `*appRole` existentes a `*appPermiso` (bloques futuros) va a quitarle
  también el acceso visible en la UI (tarifas generales de cliente/chofer/proveedor, hoy
  con `'manager'` incluido en la lista de roles permitidos) en vez de mantenerlo como
  botón visible sin respaldo real en las reglas — mismo criterio que el resto del frente:
  la UI no debe mostrar una acción que la regla real va a rechazar.
- **`*appPermiso`** (`shared/directives/permiso.directive.ts`, nuevo): calco de
  `RoleDirective` (mismo patrón `@Input() set` + `viewContainer.createEmbeddedView`/`clear()`).
  Sintaxis `'modulo'` o `'modulo.accion'`, parseada por `.` internamente. Declarada en
  `SharedModule` junto a `RoleDirective`. Sin ningún consumidor todavía — se agrega, no se
  conecta.

**Bloque 2 — los 4 `app-btn-*` consumen `PermisosService` (sin conectar todavía).**
`BtnReimpresionComponent` ya no existe (eliminado en chunk previo, código muerto real —
ver más abajo); quedan `BtnAgregarComponent`/`BtnEditarComponent`/`BtnEliminarComponent`/
`BtnLeerComponent`. Ningún caller pasa `modulo`/`accion` todavía — comportamiento visible
idéntico a antes en toda la app, salvo la corrección de bug de disabled (ver siguiente
punto).

- **Bug de `disabled` inerte corregido, independiente de permisos:** 20 de las 40 ramas
  `@if` con `<button>` real entre los 4 componentes recibían `@Input() disabled` pero
  nunca lo bindeaban al `<button>` interno — el input llegaba, pero no hacía nada. Corregido
  agregando `[disabled]=disabled` en las variantes que faltaban (13 en
  `BtnAgregarComponent`: Cerrar, Guardar, Descargar Legajo, GuardarClaro, GuardarCambios,
  GuardarCambiosClaro, guardarTarifa, Agregar, Confirmar, 'Agregar Contacto',
  AgregarContactoClaro, Facturar, Pagar; 7 en `BtnLeerComponent`: DetalleColor, Detalle,
  Vehiculos, Imprimir, excel, pdf, print). `BtnEditarComponent`/`BtnEliminarComponent` ya
  lo bindeaban correctamente en todas sus variantes activas. La rama muerta `editarTarifa`
  de `BtnAgregarComponent` (0 invocaciones confirmadas, el valor real vive en
  `BtnEditarComponent`) quedó intacta a propósito, fuera de este arreglo — no se le agregó
  `[disabled]`, sigue siendo dead code sin tocar. Caller real que este arreglo pone a
  funcionar por primera vez: `modal-contacto-proveedores.component.html` pasa
  `[disabled]="formContacto.invalid"` a `app-btn-agregar name="Agregar"` — antes el
  formulario inválido no bloqueaba el submit pese a la intención explícita del caller,
  ahora sí.
- **Inputs `modulo?: ModuloPermiso` / `accion?: AccionPermiso`** agregados a los 4
  componentes, mismo patrón en los cuatro: inyectan `PermisosService`, exponen un getter
  `visible` (`!this.modulo || this.permisosService.puede(this.modulo, this.accion)`).
  Sin `modulo`, `visible` es siempre `true` — compatibilidad hacia atrás total con los
  ~90 sitios de uso existentes, que no pasan `modulo`/`accion` hasta que se migren en
  bloques futuros.
- **Las 40 ramas `@if` de los 4 componentes envueltas con `&& visible`**, sin excepción
  (incluidas las variantes sin uso activo detectadas por la auditoría, ej. `x` en
  `BtnEliminarComponent`, `chofer`/`proveedor`/`tarifa` en `BtnLeerComponent`,
  `editarTarifa`/`electronica`/`Cerrar` en `BtnAgregarComponent` — se envuelven igual por
  consistencia del componente, aunque hoy no tengan caller).

**Bloque 3 — `AccionGenericaComponent` (capa de Presentación, sin conectar todavía).**
`shared/botones/accion-generica/`, selector `app-accion-generica`. Cubre el caso que los
4 `app-btn-*` no cubren: botones `<button>` crudos y repetidos por la app (texto, color y
tamaño libres, no un catálogo cerrado de `name`), como los de `tablero-asignaciones`.
Mismo patrón de permisos que los otros 4 (inyecta `PermisosService`, `modulo?`/`accion?`,
getter `visible`), y mismo criterio de `disabled` real (nunca `ngClass`).

- `@Input() label!: string` (texto), `@Input() variante = 'primary'` (mapea a
  `btn-${variante}` de Bootstrap), `@Input() tamano?: 'sm' | 'lg'` (agrega `btn-sm`/
  `btn-lg` si se pasa), `@Input() disabled = false`. `claseCompleta` getter arma
  `btn btn-${variante}` + `btn-${tamano}` si corresponde.
  `<ng-content select="[icono]">` para un ícono opcional dentro del botón — el caller
  decide si lo usa, el componente no trae íconos propios (a diferencia de los 4
  `app-btn-*`, que sí traen su propio SVG fijo por variante).
- Sin `@Output()`: el `(click)` se bindea directo en `<app-accion-generica (click)="...">`
  igual que en los otros 4 `app-btn-*` — burbujea del `<button>` interno al host nativo,
  no hace falta un `EventEmitter` propio.
- Declarado en `SharedModule` junto a los otros 4. Sin ningún caller todavía — se conecta
  en un bloque posterior (botones crudos con permiso real, ej. `tablero-asignaciones`).

**Bloque 4 — `TablaAccionesComponent` conectado a `PermisosService` (primer wrapper con
callers reales conectados).** Cierra en producción, para este wrapper puntual, el caso
concreto de la deuda "control de permisos de UI disperso" (ver más abajo) — no es
funcionalidad nueva, es el hallazgo de la auditoría ya resuelto acá.

- `TablaAccionesComponent` recibe `@Input() modulo?: ModuloPermiso` y lo reenvía a los 4
  `app-btn-*` que ya renderiza, con `accion="ver"`/`"editar"`/`"eliminar"`/`"vehiculos"`
  fijo según el bloque `@if` correspondiente (los 4 valores de `AccionTablaGenerica.tipo`
  ya coincidían 1:1 con `AccionPermiso`, sin necesidad de rename — a diferencia de
  Informes, que lo va a necesitar en un bloque aparte). El `[disabled]="estaDeshabilitada(tipo)"`
  existente en editar/eliminar no se tocó — sigue siendo la regla de negocio por fila,
  ortogonal al permiso de módulo.
- `TablaGenericaComponent` recibe `@Input() modulo?: ModuloPermiso` y lo reenvía a
  `<app-tabla-acciones>`.
- 4 callers actualizados con `modulo` literal: `clientes-listado` → `"clientes"`,
  `choferes-listado` → `"choferes"`, `proveedores-listado` → `"proveedores"`,
  `gestion-usuarios` → `"usuarios"`.
- **Efecto real al momento de este bloque** (con `matrizBase` todavía colapsada a
  `[modulo][rol]`, ver corrección más abajo): `manager` pierde las 4 acciones en los 3
  listados CRUD (antes se veían igual que para cualquier rol, cero chequeo);
  `gestion-usuarios` además oculta editar/eliminar para `user`/`demo` (antes solo corría
  la regla de jerarquía `editarDeshabilitado`/`eliminarDeshabilitado`, sin filtro de
  acceso al módulo). En ese momento, sin cambios para `user`/`demo` en los 3 listados
  CRUD — la corrección de granularidad por acción (bloque siguiente) es la que además les
  quita `eliminar` (y a `demo` también `editar`) en `clientes`/`choferes`/`proveedores`.
  Sin cambios para `dev`/`admin` en ningún caso, antes ni después de la corrección.
- **No tocado:** el botón de "alta" crudo (con `ngClass` + `esRol('demo')`) de cada uno de
  los 4 listados — sigue en el esquema viejo, migra en el bloque de barrido de `*appRole`.
  `InformesTablaComponent`/`InformesAccionesCellComponent` — bloque aparte (necesita el
  rename de acciones mencionado arriba).

**Corrección — granularidad de `matrizBase` por acción (no es un bloque nuevo, corrige el
Bloque 1).** Pruebas manuales post-Bloque 4 encontraron que `manager` estaba correctamente
oculto en los 3 listados CRUD, pero `user`/`demo` seguían viendo (y pudiendo ejecutar)
`eliminar` en `clientes`/`choferes`/`proveedores` — exactamente el bug que este frente
busca cerrar. Causa: `matrizBase` original era `Record<ModuloPermiso, Record<RolUsuario,
boolean>>` — un solo booleano por módulo, así que `user`/`demo` heredaban `eliminar` por
el simple hecho de tener `leer` permitido en el módulo. `firestore.rules` sí distingue
`leer`/`crear`/`editar`/`eliminar` por separado en `permitido()`; la simplificación de
`matrizBase` no lo reflejaba.

**Rediseño, sin cambiar la firma pública `puede(modulo, accion?)`** (los Bloques 2-4 no
requirieron ningún cambio):

- `matrizBase` pasó a `Record<ModuloReglas, Record<AccionCrud, Record<RolUsuario,
  boolean>>>` — tipo nuevo `AccionCrud` (`'leer' | 'crear' | 'editar' | 'eliminar'`,
  agregado a `interfaces/permiso.ts`) y `ModuloReglas` (tipo interno de
  `PermisosService`, los 11 módulos reales de `permitido()` — `entidades`, `legajos`,
  `vendedores`, `operaciones`, `tarifas`, `tarifasHistorial`, `finanzas`,
  `legacySoloLectura`, `numeradores`, `logs`, `papelera` — más `'usuarios'`, caso
  especial). Transcripción literal de `permitido()`, entrada por entrada — incluye
  módulos sin `ModuloPermiso` equivalente todavía (`numeradores`/`logs`/`papelera`),
  poblados igual por completitud para cuando haga falta.
- `mapaModuloReglas: Record<Exclude<ModuloPermiso,'usuarios'>, ModuloReglas>`: traduce
  `ModuloPermiso` (Angular) al módulo real de las reglas — varios comparten uno
  (`clientes`/`choferes`/`proveedores` → `'entidades'`; `facturacion`/`liquidaciones`/
  `finanzas`/`reportes` → `'finanzas'`). `'usuarios'` queda fuera del tipo a propósito
  (excluido con `Exclude<>`, error de compilación si algo intenta usarlo).
- `mapaAccionCrud: Record<AccionPermiso, AccionCrud>`: `ver`/`vehiculos`/`verFactura`/
  `reimprimir` → `leer`; `agregar` → `crear`; `editar`/`vincularFactura`/`anular` →
  `editar` (anular un `InformeLiq` es una actualización de estado, no un delete — ver
  `LiquidacionService.anularLiquidacion`); `eliminar` → `eliminar`. Toda `AccionPermiso`
  actual mapea sin ambigüedad; una `AccionPermiso` nueva que no encaje claramente queda
  con TODO explícito, no se asume.
- **`usuarios` (Opción A, decisión explícita):** no pasa por `permitido()`/`moduloDe()` —
  regla propia (`/users/{uid}`: `write` solo `dev`). `matrizBase.usuarios` poblada directo
  (`leer`/`crear`/`editar`/`eliminar`: `dev`/`admin` `true`, resto `false`) — refleja
  "puede intentar la acción" (capa de permiso); `admin` sí edita/elimina usuarios en la
  práctica pero vía Cloud Functions con autorización propia (`exigirObjetivoEditable`),
  no por escritura directa. La jerarquía fina por fila (`editarDeshabilitado`/
  `eliminarDeshabilitado` en `gestion-usuarios.component.ts`) no se duplica ni se toca.
- **Sin `accion` (`*appPermiso="'modulo'"` sin `.accion`, gating de sección completa):**
  default `'leer'` — decisión de diseño explícita ("¿puede al menos leer?"), documentada
  en el código, no un valor arbitrario.
- **Efecto retroactivo, sin tocar ningún caller:** el caso de deuda ya documentado
  `operaciones.eliminar` para `user` (citado desde el Bloque 1 como "primer caso a cargar
  en `overrides`") queda resuelto por la matriz corregida sin necesitar ningún override —
  `entidades`/`operaciones`.`eliminar`.`user` ya da `false` con la transcripción literal
  de las reglas. Conectado a `tablero-op` en el Bloque 6 (sub-bloque 1) — ver más abajo.

**Bloque 5 — Facturación: reglas de negocio ya escritas, cableadas por primera vez.**
`FacturacionListadoComponent`/`FacturacionHistoricoComponent` ya tenían `puede()`/
`puedeAnular()`/`puedeVincularFactura()` (usando `informe-liq.rules.ts` →
`REGLAS_ESTADO_INFORME`/`puedeEjecutarAccion`) desde su creación, pero **nunca se llamaban
desde ningún template** — el único gating real era `disbledDemo()` (bloqueaba 3 columnas
enteras, solo para rol `demo`, sin distinguir fila ni estado del informe). No son reglas
nuevas: es la corrección de un mecanismo roto desde que se escribió.

- **`InformesTablaComponent` — código muerto eliminado:** `@Input() acciones:
  AccionInformesTabla<T>[]` (nunca recibía datos de ningún caller), `ejecutarAccion()`,
  `mostrarAccion()`, `accionDeshabilitada()` (el camino real de renderizado siempre fue
  `col.acciones` vía `InformesAccionesCellComponent`, nunca estos métodos). Import de
  `EventoInformesTabla` quitado (sin uso real en ningún lado del proyecto, solo la propia
  declaración). `disbledDemo()` y su `UsuarioSesionService` inyectado también eliminados
  (Paso 8) — quedan completamente reemplazados por permiso (`modulo`/`accion`) + regla de
  negocio por fila (`disabled`).
- **`ColumnaInformesTabla<T>.acciones`** pasó de `string[]` a `AccionInformesTabla<T>[]`
  — la interfaz ya existía (`id`, `label`, `icon?`, `class?`, `visible?`, `disabled?`), se
  le dio uso real por primera vez.
- **`AccionInformesTabla<T>` gana `accionPermiso?: AccionPermiso`** (campo nuevo, no
  interfaz nueva). Motivo: `id` sirve dos propósitos que se asumían siempre iguales —
  identidad de negocio (lo que emite el click, lo que lee el `switch` de `onAccion()`) y
  parámetro de permiso para `PermisosService`. Primer caso real donde no coinciden: las
  columnas de descarga tienen DOS entradas (`id:'excel'`, `id:'pdf'`, necesario para que
  `onAccion()` siga distinguiendo qué formato exportar) pero ambas comparten la misma
  regla de permiso (`'reimprimir'`, que sí es un `AccionPermiso` válido — `'excel'`/`'pdf'`
  no lo son). `accionPermiso` desambigua sin tocar `PermisosService` ni el significado de
  `id`; `InformesAccionesCellComponent.accionPermiso()` hace `accion.accionPermiso ??
  accion.id` — fallback al `id` cuando coinciden, el caso general.
- **Ids renombrados** para coincidir con `AccionInformeLiq` (antes strings sueltos sin
  relación): `'detalle'`→`'ver'` (ambos componentes); `'factura'`→`'vincularFactura'` en
  `facturacion-listado` (dispara `vincularFacElec()`); `'factura'`→`'verFactura'` en
  `facturacion-historico` (dispara `verPdf()`) — acción de negocio distinta pese a
  compartir hoy ícono/botón (`app-btn-agregar name="electronica"`), no unificadas. `excel`/
  `pdf` sin cambios de id, dos entradas. `editar`/`anular` sin cambios. `onAccion()`
  actualizado en cascada en ambos componentes.
- **`columnas[].acciones` poblado con `disabled` real**, conectando los métodos
  existentes tal cual: `editar` → `!puede(inf,'editar')`; `excel`/`pdf` → ambos
  `!puede(inf,'reimprimir')`; `vincularFactura` → `!puedeVincularFactura(inf)` (más
  específico que `puede()` genérico); `anular` → `!puedeAnular(inf)`; `verFactura`
  (historico) → `!puede(inf,'verFactura')`. `ver`/`detalle` sin `disabled` (siempre
  permitido si hay fila y hay permiso de módulo).
- **`InformesAccionesCellComponent`** reescrito: `@Input() acciones` pasa de `string[]` a
  `AccionInformesTabla<InformeLiq>[]`; el template itera (`@for`) en vez de `@if
  (acciones.includes(...))` fijo, selecciona el `app-btn-*` según `accion.id` (mismo mapeo
  visual de antes: `ver`→`btn-leer DetalleColor`, `editar`→`btn-editar EditarColor`,
  `excel`/`pdf`→`btn-leer excel/pdf`, `vincularFactura`/`verFactura`→`btn-agregar
  electronica`, `anular`→`btn-eliminar EliminarColor`), pasa `[disabled]` desde
  `accion.disabled?.(item)` y `[modulo]`/`[accion]` (este último vía el getter
  `accionPermiso()`) a cada botón. `ejecutar()` gana el mismo guard defensivo que
  `TablaAccionesComponent.ejecutar()` (`if (accion.disabled?.(item)) return;`).
- **Cascada de `modulo` (mismo patrón que Bloque 4):**
  `facturacion-listado`/`facturacion-historico` → `modulo="facturacion"` en
  `<app-informes-tabla>` → `InformesTablaComponent` lo reenvía a
  `<app-informes-acciones-cell>` → de ahí a cada `app-btn-*`.
- ⚠️ **Gap residual conocido, no resuelto en este bloque (`app-btn-*` fuera de alcance):**
  la rama `name === 'electronica'` de `BtnAgregarComponent` (usada por
  `vincularFactura`/`verFactura`) no bindea `[disabled]` al `<button>` interno — no estaba
  en la lista de 13 variantes corregidas en el Bloque 2 (nadie la necesitaba entonces).
  El `[disabled]` que le pasa `InformesAccionesCellComponent` llega al componente pero no
  se refleja visualmente en el botón. No es un agujero de seguridad — `ejecutar()` sigue
  bloqueando el evento de click con el guard mencionado arriba (`puedeVincularFactura`/
  `puede(inf,'verFactura')` en `false` → no se emite el click, `vincularFacElec()`/
  `verPdf()` nunca se llaman) — pero el botón no se ve gris ni cambia el cursor cuando
  debería estar deshabilitado. Corrección real pendiente: sumar `'electronica'` a la
  lista de variantes con `[disabled]` real en `BtnAgregarComponent` (mismo arreglo del
  Bloque 2, ahora sí con un caller real que lo necesita).
- **Verificado:** informe en estado `anulado` (`REGLAS_ESTADO_INFORME.anulado = ['ver']`
  únicamente) ahora deshabilita correctamente `reimprimir` (`excel`/`pdf`) y `verFactura`
  en `facturacion-historico` — antes, sin este cableado, esos botones quedaban clickeables
  sobre cualquier informe sin importar su estado (el bug señalado desde el diseño de este
  frente). `facturacion-listado` normalmente no lista informes `anulado` (`cargarInformes`
  consulta fijo por `"emitido"`), así que el efecto visible ahí es menor pero la regla
  queda igual de correcta si algún flujo futuro lista otros estados.

**Bloque 6 (sub-bloque 1) — barrido de `*appRole`/`esRol()`/`ngClass` sueltos:
`tablero-op.component.html`.** Primer sitio migrado del barrido general (caso más enredado
de la auditoría: `[disabled]` nativo + `[ngClass]` + regla de negocio + `esRol('demo')`
repetido en los 3 botones de acción de la fila, más un botón crudo de alta con su propio
`esRol('demo')` inline).

- `AccionPermiso` gana `'cerrar'` (unión abierta, mecanismo ya dejado documentado en el
  Bloque 1); `mapaAccionCrud['cerrar'] = 'editar'` — cerrar una operación es una
  actualización de `EstadoOp.ciclo`, no una creación ni un delete.
- Columna de acciones de la tabla, los 4 botones: `DetalleColor` → `modulo="operaciones"
  accion="ver"`, sin `disabled` (no hay regla de negocio sobre ver). `EditarColor` →
  `modulo="operaciones" accion="editar"`, `[ngClass]="{isDisabled: !puedeEditar(row) ||
  esRol('demo')}"` reemplazado por `[disabled]="!puedeEditar(row)"` — el chequeo de rol
  manual desaparece, cubierto por `modulo`/`accion`. `EliminarColor`/`FacturaColor`
  (`accion="eliminar"`/`accion="cerrar"`): mismo tratamiento, `[disabled]`/`[ngClass]` con
  `esRol('demo')` quitados, `[disabled]="!puedeEliminar(row)"`/`[disabled]="!puedeCerrar(row)"`
  quedan como única fuente (regla de negocio pura, sin rol mezclado).
- Botón crudo "Alta de Operación": `[disabled]="usuarioSesion.esRol('demo')"` reemplazado
  por `*appPermiso="'operaciones.agregar'"` sobre el `<button>`.
- `UsuarioSesionService` (inyección + import) eliminado de `tablero-op.component.ts` —
  confirmado sin otros usos en el componente antes de quitarla.
- ⚠️ **Efecto real para `demo`, distinto de "verse igual pero bloqueado":** `demo` en
  `matrizBase.operaciones` solo tiene `leer: true` (`crear`/`editar`/`eliminar`: `false`).
  Como `modulo`/`accion` controla el getter `visible` de cada `app-btn-*` (oculta el
  elemento entero si no hay permiso, no solo lo deshabilita — mecanismo del Bloque 2),
  `demo` deja de VER los botones Editar/Eliminar/Cerrar de la fila (antes los veía
  grises); solo le queda visible el botón Ver. Coherente con el principio ya establecido
  en este frente ("la UI no debe mostrar una acción que la regla real va a rechazar") y
  con el mismo tratamiento ya aplicado al botón de alta — pero más amplio de lo que
  "comportarse igual visualmente" hubiera sugerido. Mismo efecto para `user`: pierde
  visibilidad de Eliminar (antes visible y bloqueado solo al escribir en Firestore, el
  caso de deuda original) — Editar/Cerrar siguen visibles para `user` (sí tiene
  `editar` en `operaciones`), gobernados por `puedeEditar(row)`/`puedeCerrar(row)`.
  `dev`/`admin` sin cambios (tienen las 4 acciones, gobernados solo por la regla de
  negocio de cada botón, como antes).

### Bug estructural preexistente en los 5 `app-btn-*`/`AccionGenericaComponent`: `(click)` en el host, `disabled` en el `<button>` interno

Encontrado durante pruebas manuales del Bloque 6 (sub-bloque 1), **no específico de
Operaciones ni introducido por este frente** — existe desde la creación original de estos
componentes. Con rol `admin`, una operación `'Cerrada'` (`puedeEliminar` = `false`,
`disabled` presente y confirmado por inspección de DOM en el `<button>` interno) igual
ejecutaba `eliminar()` al hacer clic.

**Causa raíz:** los ~95 call sites de estos componentes escriben `(click)="..."` sobre el
tag host (`<app-btn-eliminar (click)="...">`), no sobre el `<button>` interno — ninguno de
estos 5 componentes definió jamás `@Output() click`, así que Angular trata ese binding
como listener DOM nativo del host. El `<button [disabled]>` bloquea clics dentro de su
propia caja (por eso el ícono siempre estuvo protegido), pero `margin: 10px` del botón es
espacio de layout del padre — un clic ahí no toca al `<button>` deshabilitado, cae directo
sobre el host, y el listener nativo lo dispara igual. El Bloque 2 corrigió que `disabled`
llegara realmente al `<button>` (antes ni eso pasaba en 20 de 40 variantes), pero eso
nunca iba a alcanzar: el problema vive un nivel más arriba, en dónde está el listener.

**Corrección:** `@HostBinding('style.pointer-events')` en los 5 componentes
(`BtnAgregarComponent`, `BtnEditarComponent`, `BtnEliminarComponent`, `BtnLeerComponent`,
`AccionGenericaComponent`) — `'none'` cuando `disabled` es `true`, `null` (sin estilo
inline, sin efecto) cuando es `false`. `pointer-events` es una propiedad heredada: al no
overridearla el `<button>` interno, hereda `none` del host cuando corresponde, sacando
tanto el margen como el botón mismo del hit-testing del navegador — ningún clic, en
ningún punto de la caja del host, llega al listener. No requiere `@Output()` nuevo ni
toca la sintaxis `(click)="..."` de ningún caller.

⚠️ **Alcance real del hallazgo:** este bug pudo haber estado causando el mismo
comportamiento (click "fantasma" en el margen ejecutando la acción pese a `disabled`) en
cualquier otro sitio de la app que ya tuviera `disabled` cableado correctamente antes de
este frente — no es exclusivo de los sitios que este frente migró. No hay forma práctica
de auditar retroactivamente cada caso histórico (requeriría probar clic por clic, sitio
por sitio, con datos que reproduzcan cada estado bloqueado). De acá en adelante queda
blindado en la base: cualquier componente que use `[disabled]` en estos 5 `app-btn-*`/
`AccionGenericaComponent` — ya migrado a `modulo`/`accion` o no — hereda la corrección
automáticamente, sin cambios propios.

**Bloque 6 (sub-bloque 2) — `proforma.component` (3 tablas: clientes/choferes/
proveedores, 4 botones por fila cada una).** A diferencia de `tablero-op` y Facturación,
acá no existía ningún método `puedeXxx` de regla de negocio — el único gating era
`[ngClass]="{isDisabled: esRol('demo')}"` repetido en 9 sitios (3 tablas × 3 botones:
`print`/`Eliminar`/`Factura`); `Detalle` no tenía gating de ningún tipo. Este sub-bloque
conecta solo permiso (`modulo`/`accion`) — no hay regla de negocio por fila que cablear,
porque no existe.

- `AccionPermiso` gana `'liquidar'` (`liquidarProforma()` crea un `InformeLiq` nuevo a
  partir de una proforma — distinta de `'vincularFactura'`, que adjunta un archivo a un
  informe ya existente en Facturación, y de `'anular'`); `mapaAccionCrud['liquidar'] =
  'crear'`.
- Las 3 tablas, mismo tratamiento en cada una: `Detalle` → `modulo="liquidaciones"
  accion="ver"` (nuevo, sin gating previo). `print` → `accion="reimprimir"`, `ngClass`
  quitado. `Eliminar` (dispara `'baja'` → `anularProforma`) → `accion="anular"`, `ngClass`
  quitado. `Factura` (dispara `'factura'` → `liquidarProforma`) → `accion="liquidar"`,
  `ngClass` quitado. Ninguno de los 4 lleva `[disabled]` — no hay regla de negocio que
  conectar. `usuarioSesion` (inyección) confirmada con otro uso real
  (`getUsuarioActual()` en `ngOnInit`, usado para `anuladoPor`/email) — se mantiene, solo
  se quitaron las 9 referencias puntuales a `esRol('demo')`.
- ⚠️ **Efecto real por rol — más amplio que "solo demo pierde acceso", con matices no
  triviales.** `liquidaciones` espeja `finanzas`: `leer` → dev/admin/demo `true`,
  manager/user `false`; `crear`/`editar` → solo dev/admin `true`. `ver`/`reimprimir`
  mapean a `leer`; `anular`/`liquidar` a `editar`/`crear`.
  - **`Detalle`:** antes visible+habilitado para los 5 roles (cero gating). Ahora oculto
    para `manager`/`user` — pierden un botón que nunca había estado restringido.
  - **`print`:** antes visible para todos, bloqueado visualmente solo para `demo`. Ahora
    oculto para `manager`/`user` (restricción nueva) y **`demo` pasa de bloqueado a
    habilitado** — `reimprimir` mapea a `leer`, que `demo` sí tiene en `finanzas`. No es
    solo "menos acceso": para `demo` es un desbloqueo real, consistente con que
    `firestore.rules` ya le permite leer el módulo — el gating viejo (mismo `ngClass` en
    los 3 botones, sin distinguir tipo de acción) era más restrictivo de lo necesario para
    una acción de solo lectura.
  - **`Eliminar`/`Factura`:** antes visibles y **sin ningún gating** para
    `manager`/`user` (solo `demo` estaba bloqueado) — esto significa que antes de este
    sub-bloque, `manager`/`user` podían ejecutar `anularProforma()`/`liquidarProforma()`
    sin ninguna restricción de rol ni de negocio. Ahora ambos botones quedan ocultos para
    `manager`/`user`/`demo`, visibles solo para `dev`/`admin` — cierra una exposición real
    que no estaba señalada como deuda explícita hasta este sub-bloque.
  - `dev`/`admin` sin cambios en los 4 botones, en las 3 tablas.

**Bloque 6 (sub-bloque 3) — `liquidaciones-op.component`** (reusado por 3 rutas:
cliente/chofer/proveedor vía `llamadaOrigen`). Estructura distinta a los sub-bloques
anteriores: dos columnas usaban `*appRole` sobre `<td>` completo (SVG crudo con `(click)`
directo, no `app-btn-*`), y el botón "Liquidar" mezclaba `[ngClass]` con `||` de regla de
UI + rol sobre un `<button>` crudo. Reutiliza `'editar'`/`'eliminar'` (ya existentes) y
`'liquidar'` (agregado en el sub-bloque de proforma, misma semántica: crea un `InformeLiq`
nuevo — acá vía `procesarInformeLiq → crearLiquidacion`) — sin extender
`AccionPermiso`/`mapaAccionCrud`.

- Botón "Liquidar" (el de `$`, dispara `liquidarInformesObjeto`): envuelto en
  `<ng-container *appPermiso="'liquidaciones.liquidar'">` (Angular no permite dos
  directivas estructurales en el mismo elemento). Adentro, `[disabled]="!mostrarTabla[i]"`
  como única fuente — el `[ngClass]="{isDisabled: !mostrarTabla[i] || esRol('demo')}"`
  quitado por completo. Regla de UI (fila expandida) y permiso quedan separados, mismo
  criterio que `tablero-op`.
- Columnas de acción de `informeOp` (editar con lápiz, eliminar con tacho), antes
  `<td *appRole="['dev','admin','manager']">`: reemplazadas por
  `<td *appPermiso="'liquidaciones.editar'">` y `<td *appPermiso="'liquidaciones.eliminar'">`
  respectivamente — **quitando `'manager'` de la lista** (decisión ya tomada en el frente:
  rol sin uso real, se le retira acceso visible en cada sitio migrado). El header
  combinado (`<th *appRole="['dev','admin','manager']" colspan="2">`) recibe
  `*appPermiso="'liquidaciones.editar'"` — alcanza con uno solo de los dos permisos
  porque ambas columnas comparten exactamente el mismo rol (`dev`/`admin`) hoy;
  simplificación válida mientras seguro sea así, a revisar si algún día divergen.
- Checkbox "seleccionar todos" y los individuales por fila (`liquidarBoleano`): sin
  gating — son estado de armado local que no escribe en Firestore, la escritura real
  ocurre recién en el botón "Liquidar" ya protegido. El `[ngClass]` de `esRol('demo')`
  en el checkbox "todos" se quitó sin reemplazo, mismo criterio que `Detalle` en
  proforma (preparación/lectura no requiere permiso).
- `usuarioSesion` confirmada con otro uso real (`getUsuarioActual()` en `ngOnInit`) — se
  mantiene, solo se quitaron las referencias puntuales a `esRol('demo')`.
- ⚠️ **Efecto real por rol, en los 3 orígenes (mismo componente reusado):**
  - **Editar/Eliminar de `informeOp`:** `manager` los veía (estaba en el `*appRole`) y
    ahora no — pérdida esperada, coherente con la decisión ya tomada sobre ese rol.
    `user` nunca los vio (no estaba en la lista original) y sigue sin verlos, sin cambio.
    `demo` tampoco los veía y sigue sin verlos, sin cambio.
  - **Botón Liquidar:** `demo` pasa de verlo gris (bloqueado) a no verlo — el caso
    señalado explícitamente. Pero además, **`manager` y `user` también lo pierden por
    completo** — antes lo veían plenamente habilitado (el único `esRol()` en el `ngClass`
    filtraba solo `demo`, sin ninguna restricción para `manager`/`user`), ahora
    `matrizBase.finanzas.crear` es `false` para ambos, así que el botón queda oculto.
    Es un cambio adicional no cubierto por la frase original del pedido ("demo pierde el
    botón Liquidar"), señalado acá igual que en los sub-bloques anteriores.
  - **Checkboxes de selección:** `demo` gana acceso (antes bloqueado visualmente, ahora
    sin restricción) — consistente con que es preparación local, no escritura.
  - `dev`/`admin` sin cambios en ningún elemento, en los 3 orígenes.

**Bloque 6 (sub-bloque 4, ÚLTIMO) — botón de alta de los 4 listados CRUD,
`vendedores-listado` (cards), `sidebar`, `nueva-facturacion/modal-detalle`.** Cierra el
barrido de `*appRole`/`esRol()`/`ngClass` sueltos del audit original.

- Botón de alta en `clientes-listado`/`choferes-listado`/`proveedores-listado`/
  `vendedores-listado` (`app-btn-leer` con `name="Cliente"/"Chofer"/"Proveedor"/"Vendedor"`):
  `[ngClass]` de `esRol('demo')` quitado, `modulo`/`accion="agregar"` agregado según cada
  listado. Decisión ya tomada: los botones `'Descargar X'`/`'X Visibles'` de estos mismos
  4 archivos quedan **sin tocar**, incluido el `ngClass` de `demo` en `'Visibles'` —
  fuera del alcance de este frente.
- `vendedores-listado` (único de los 4 con layout de cards, no `TablaGenericaComponent`
  — por eso no recibió el tratamiento del Bloque 4): `Editar`/`Eliminar` de cada card
  conectados a `modulo="vendedores"` `accion="editar"`/`"eliminar"`, `ngClass` de
  `esRol('demo')` quitado.
- `sidebar.component.html`: los 4 `@if (usuarioSesion.esRol(...))` reemplazados por
  `*appPermiso` envolviendo el `<li>` completo (directiva estructural, no `@if`):
  `Configuración`→`'usuarios.ver'`, `Facturación`→`'facturacion.ver'`,
  `Finanzas`→`'finanzas.ver'`, `Reportes`→`'reportes.ver'`. Verificado 1:1 contra la
  matriz real: Configuración/Facturación/Reportes coinciden exactamente con el
  comportamiento anterior (mismos roles, sin cambio). **Finanzas es el único cambio de
  comportamiento intencional del sub-bloque:** antes solo `dev` lo veía
  (`esRol('dev')` a mano, sin relación con la matriz real); migrado fiel a
  `matrizBase.finanzas.leer`, `admin` y `demo` GANAN visibilidad del link — no es un bug,
  es la corrección de una restricción que nunca reflejó la matriz real de permisos. El
  resto de los `<li>` del sidebar (clientes, choferes, proveedores, operaciones,
  liquidación, legajos, vendedores, migración) quedan sin gating — protegidos por
  `RoleGuard` a nivel de ruta, fuera de alcance. `usuarioSesion.getUsuarioActual()`
  (nombre de usuario) y "Cerrar Sesión" no se tocaron.
- `nueva-facturacion/modal-detalle.component.html`: único `*appRole` del archivo
  (`app-btn-eliminar name="Eliminar"`, dispara `bajaOp`) →
  `*appPermiso="'facturacion.eliminar'"`, quitando `'manager'`. Las columnas
  `excel`/`pdf`/`Detalle` de la misma fila quedan sin gating — no estaban en el listado
  original de `*appRole` del audit, fuera de alcance.

**Bloque 6 CERRADO.** Verificado por grep: el único `*appRole` que queda en toda la app
son los 6 sitios de Tarifas (`cliente`/`choferes`/`proveedores` × `gral`/`especial`),
excluidos a propósito — pertenecen al frente de Tarifas, pendiente y separado de este.
(`facturacion/modal-detalle` legacy, comentado, y `acciones-cell-renderer`, wrapper sin
caller activo, también usan `*appRole` pero están fuera de alcance por ser código muerto
u orfandad ya documentada, no por pertenecer a Tarifas.)

### Bloque 7 (ÚLTIMO del frente) — `tablero-asignaciones`, primer uso real de `overrides`

Dos franjas de botones crudos sin ningún gating hasta este bloque: 4 modales de gestión
(Choferes/Proveedores/Clientes/No Operativos — definen estado activo/no-disponible, no
son de lectura pura) y 4 acciones de tablero (Alta de Op/Guardar/Descargar/Limpiar — esta
última con el TODO comentado ya señalado como deuda, ahora resuelto). Requisito de
negocio explícito y verificado contra la matriz real: `'user'` (rol del único empleado
activo en producción, uso principal de este componente) conserva los 8 botones sin
excepción; `'demo'` no ve ninguno de los 8.

- `AccionPermiso` gana `'descargarTablero'` y `'limpiarTablero'`; `mapaAccionCrud`:
  `descargarTablero → 'leer'` (exporta, no escribe), `limpiarTablero → 'eliminar'`
  (borra el borrador en curso — acción destructiva, no una edición parcial).
- **Primeros dos `overrides` reales del servicio** (vacío desde el Bloque 1):
  - `'operaciones.descargarTablero': { demo: false }` — `'leer'` da `demo=true` por
    defecto en `operaciones`, pero el negocio pide bloquear puntualmente la descarga del
    tablero para `demo` sin afectar `'reimprimir'` en Facturación/Liquidaciones (que
    también mapea a `'leer'` pero en el módulo `finanzas`, sin relación).
  - `'operaciones.limpiarTablero': { user: true }` — `'eliminar'` da `user=false` por
    defecto en `operaciones`, pero `user` es el único empleado activo en producción y
    necesita conservar esta acción en su pantalla principal.
  - Ambos overrides son deliberadamente puntuales — no tocan `matrizBase` ni
    `mapaAccionCrud` en general, solo la combinación `modulo.accion` exacta que lo
    necesita. El resto de cada acción (`user` en `descargarTablero`, `demo` en
    `limpiarTablero`) sigue resolviendo por `matrizBase` sin override, y da el resultado
    correcto sin necesitarlo.
- Los 4 botones de gestión (franja izquierda): `<ng-container *appPermiso="'operaciones.editar'">`
  en los 4 — mismo permiso, todos gestionan disponibilidad/estado, no son de lectura.
- Los 4 de la franja derecha: Alta de Op → `'operaciones.agregar'`; Guardar →
  `'operaciones.editar'`; Descargar → `'operaciones.descargarTablero'`; Limpiar →
  `'operaciones.limpiarTablero'`. El `[disabled]` propio de cada botón (`isLoading`,
  `itemsBorrador.length`, `!tablero`) no se tocó — sigue siendo regla de UI/negocio,
  ortogonal al permiso, mismo criterio que todos los bloques anteriores. El TODO
  `agregar [disabled]="esRol('demo')"...` se eliminó, resuelto por este bloque.
- **Verificado contra la matriz real, exacto:** `user` ve y puede usar los 8 (izquierda:
  `editar`=true; Alta=`crear`=true; Guardar=`editar`=true; Descargar=`leer`=true vía
  `matrizBase` sin necesitar override; Limpiar=`eliminar`=false por defecto pero `true`
  vía el override). `demo` no ve ninguno (izquierda: `editar`=false; Alta=`crear`=false;
  Guardar=`editar`=false; Descargar=`leer`=true por defecto pero `false` vía el override;
  Limpiar=`eliminar`=false por defecto, sin necesitar override en ese lado). `dev`/`admin`
  sin cambios — ya tenían las 4 acciones (`leer`/`crear`/`editar`/`eliminar`) en `true`.

## Cierre del frente Botones y Permisos

Los 7 bloques (más las correcciones intercaladas: `matrizBase` por acción, `pointer-events`
en el host, el fix de `'electronica'`) dejan las 4 capas acordadas en el Bloque 1
operativas de punta a punta, con consumidores reales conectados:

1. **Dominio** — `PermisosService` (`servicios/permisos/`): `matrizBase` transcripción
   literal de `firestore.rules` por acción real (`leer`/`crear`/`editar`/`eliminar`, no
   por módulo — ver la corrección post-Bloque 4), `overrides` ahora con dos casos reales
   poblados (Bloque 7) para cuando el negocio necesita apartarse puntualmente de la
   matriz sin reinterpretarla. Reglas de negocio por fila (`puedeEditar(row)`,
   `puedeAnular(inf)`, etc.) siguen viviendo en cada componente, ortogonales al permiso.
2. **Gating** — `*appPermiso` (directiva estructural, oculta si no hay permiso) para
   botones crudos; inputs `modulo`/`accion` directo en los 4 `app-btn-*` para el caso más
   común. Ambos consumen `PermisosService.puede(modulo, accion?)` — misma firma pública
   desde el Bloque 1, nunca modificada pese a que la implementación interna sí cambió.
3. **Presentación** — los 4 `app-btn-*` (catálogo semántico cerrado por `name`) +
   `AccionGenericaComponent` (botones crudos con texto/variante/ícono libres). Los 5
   comparten el mismo bug estructural encontrado y corregido en el barrido
   (`@HostBinding('style.pointer-events')`: el `(click)` vive en el host en los ~95 call
   sites, no en el `<button>` interno, así que `disabled` por sí solo no bloqueaba clics
   en el margen del botón — corregido de raíz para los 5, sin tocar ningún caller).
4. **Consumidores** — `TablaAccionesComponent`/`TablaGenericaComponent`,
   `InformesAccionesCellComponent`/`InformesTablaComponent` (con el mismo campo
   `accionPermiso?` resolviendo los casos donde el id de negocio no coincide con el
   `AccionPermiso` real, ej. `excel`/`pdf`→`reimprimir`), y ~15 componentes migrados
   directamente (`tablero-op`, `proforma`, `liquidaciones-op`, los 4 listados CRUD +
   `vendedores-listado`, `sidebar`, `nueva-facturacion/modal-detalle`,
   `tablero-asignaciones`) — todos con el `*appRole`/`esRol()`/`ngClass` suelto que tenían
   reemplazado por `modulo`/`accion` real, y su efecto por rol verificado contra la
   matriz en cada bloque, no asumido.

**Estado final:** único `*appRole` restante en toda la app: los 6 sitios de Tarifas
(cliente/choferes/proveedores × gral/especial), excluidos a propósito — frente de Tarifas
aparte, no iniciado. `AccionesCellRendererComponent` (wrapper de AG Grid sin caller activo,
detectado en la auditoría original) queda sin consumidor real — no se le asignó uno en
este frente porque no lo necesitaba, no es deuda nueva. Pendiente real, fuera de este
frente: conectar `modulo`/`accion` en el resto de los ~90 sitios de uso directo de los 4
`app-btn-*` que la auditoría relevó pero que no tenían ningún `*appRole`/`esRol()`/`ngClass`
de por medio (no eran un problema de seguridad/UX a cerrar, quedan para cuando se toque
cada pantalla por otro motivo); diseño de un botón de acción genérico más rico en la capa
de Presentación, si se justifica más adelante; el `'manager'` sin acceso real documentado
como decisión, no deuda.

**Fix post-cierre (`firestore.rules`, no un bloque nuevo):** bug real detectado en
producción — `user` recibía "Missing or insufficient permissions" al limpiar un borrador
de `tablero-asignaciones`. El gating del cliente (Bloque 7) ya estaba correcto; el
servidor no lo reflejaba porque `moduloDe()` mapeaba `asignaciones` al mismo módulo que
`operaciones`, heredando su `eliminar=false` para `user`. Corregido desacoplando
`asignaciones` en su propia categoría de reglas (`dev`/`admin`/`user` con las 4 acciones,
sin restricción por acción — ver "Security Rules" más arriba). Sin cambios en Angular
salvo agregar `matrizBase.asignaciones` en `PermisosService` por fidelidad de
transcripción (sin `ModuloPermiso` que la consuma todavía) — confirma que este frente,
una vez cerrado, sigue sirviendo como referencia para detectar y corregir esta clase de
divergencia cliente/servidor.

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
- `tablero-op` ya usa `OperacionService.bajaOperacion` para la baja de operaciones
  abiertas (sesión de migración de tablero-op). Sigue pendiente:
  - Caller de `restaurarOperacion` desde `PapeleraComponent` (sin cambios respecto a
    lo ya registrado).
  - Caller de `bajaOperacion` para operaciones **cerradas** desde el módulo de
    Liquidaciones (hoy la baja de una op cerrada sigue el camino paso a paso legacy,
    lugar exacto a confirmar en esa sesión).

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

**Cerrado (Bloque 7 del frente Botones y Permisos):** los 8 botones de acción de
`tablero-asignaciones` (4 modales de gestión + Alta de Op/Guardar/Descargar/Limpiar)
conectados a `PermisosService` vía `*appPermiso`. Detalle completo, incluidos los dos
primeros `overrides` reales del servicio, en "Frente Botones y Permisos" → Bloque 7.

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

### Frente futuro — persistencia de filtros/rango de fechas vs. listener en background

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

### Deuda — control de permisos de UI disperso, sin fuente única

Detectado durante las pruebas del refactor de Roles: las Security Rules
nuevas bloquean correctamente acciones que la UI todavía muestra como
disponibles (ej. botón de baja de Operación/Cliente visible y clickeable
para rol `user`, que la regla rechaza — comportamiento seguro, pero mala
UX: el usuario ve un error de permisos en vez de no ver la opción).

Causa: el control de qué se muestra vive disperso en `*appRole` puntual
por template, sin relación con la matriz real de Security Rules — son
dos fuentes de verdad independientes, mantenidas a mano, que ya
divergieron al menos en los dos casos detectados (sin auditoría
exhaustiva del resto de los módulos).

**En progreso:** ver "Frente Botones y Permisos" más arriba.

**Parcialmente cerrado (Bloque 4 + corrección de granularidad):** el caso concreto que
motivó esta entrada de deuda — "ningún `accionesTabla` de los 3 listados CRUD vía
`TablaAccionesComponent` aplica chequeo de rol a editar/eliminar" — ya no es cierto para
`clientes-listado`/`choferes-listado`/`proveedores-listado`/`gestion-usuarios`: los 4
pasan `modulo` a `app-tabla-generica`, que lo reenvía a `app-tabla-acciones` y de ahí a
cada `app-btn-*`. Con `matrizBase` ya corregida a granularidad por acción (ver "Frente
Botones y Permisos" → corrección post-Bloque 4): `manager` pierde `ver`/`editar`/
`eliminar`/`vehiculos` en los 3 listados CRUD; `user`/`demo` pierden `eliminar` ahí
también (`demo` pierde además `editar`); `gestion-usuarios` oculta editar/eliminar para
`user`/`demo` (antes solo corría la regla de jerarquía `editarDeshabilitado`/
`eliminarDeshabilitado`, sin ningún filtro de rol de acceso al módulo).

El caso original citado en el ejemplo de esta deuda, `operaciones.eliminar` para `user`,
ya daba el resultado correcto (`false`) en `PermisosService` sin necesitar ningún
`override` desde la corrección de granularidad — pero seguía sin conectar a `tablero-op`.
**Cerrado en el Bloque 6 (sub-bloque 1):** `tablero-op.component.html` ya pasa
`modulo="operaciones"` + `accion` (`ver`/`editar`/`eliminar`/`cerrar`) a los 4 botones de
la fila y `*appPermiso="'operaciones.agregar'"` al botón de alta — el botón de baja de
Operación para `user` ahora refleja el resultado correcto en la UI (oculto, no solo
bloqueado al escribir). Detalle completo en "Frente Botones y Permisos" → Bloque 6. El
resto de los `*appRole`/`esRol()` puntuales sigue sin migrar, ver "Pendiente" ahí.
