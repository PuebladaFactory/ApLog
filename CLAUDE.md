# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Aplicación web de administración para empresa de logística (Vantruck). Angular 20 SPA con Firebase (Firestore + Auth + Hosting). En producción activa — se agregan funcionalidades, se mejoran las existentes y se corrigen errores.

**Firebase plan Blaze (pay-as-you-go). Cloud Functions disponibles y en uso** (gestión de
usuarios, sync de roles, verificación programada de vencimientos — ver "Cloud Functions"
más abajo). La migración desde el plan gratuito también habilitó Firebase Storage (ver
"Módulo Legajos"). La lógica de negocio de dominio (Operaciones, Liquidaciones, Tarifas,
etc.) sigue corriendo mayormente en el cliente por continuidad arquitectónica del proyecto,
no por limitación de la plataforma.

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

`StorageService` NO desaparece: sigue manteniendo el estado de los módulos viejos.
**Actualizado (Frente Papelera, ver más abajo):** la baja con papelera de
Cliente/Chofer/Proveedor/Operación (los 4 módulos ya migrados) YA NO pasa por
`StorageService.deleteItemPapeleraCompuestoAsync()` — escribe atómico vía
`DbFirestoreService.commitBatch` + `PapeleraService` + `LogRegistroService`, igual que
el resto de sus escrituras. `StorageService` sigue siendo el único camino de papelera
para Vendedores/Facturación/Liquidación, fuera de alcance de ese frente.

Flujo de datos en módulos refactorizados:
```
Lectura:   Firestore --(listener)--> XxxService (BehaviorSubject) --> Component
Escritura (alta/edición/baja simple, y baja/restauración con papelera):
           Component --> XxxService --> DbFirestoreService.commitBatch (log +
           evento de papelera incluidos) --> Firestore
```

### Capa de datos

`DbFirestoreService` (`servicios/database/db-firestore.service.ts`) envuelve todas las operaciones de Firestore. Todas las colecciones viven bajo `/Vantruck/datos/`. Colecciones principales: `operaciones`, `clientes`, `choferes`, `proveedores`, `tarifasGralCliente/Esp/Pers`, `tarifasGralChofer/Esp`, `facturaCliente`, `facturaChofer`, `liquidaciones`, `legajos`, `vendedores`, `logs`, `registroLog`, `users`.

### Sistema de tarifas

Cada entidad (cliente, chofer, proveedor) tiene `tarifasHabilitadas:
RefTarifaHabilitada[]` (`Chofer`: `| null`, ver abajo) — reemplaza al viejo
`tarifaTipo: TarifaTipo` (4 booleanos, selección única). Una entidad puede tener
múltiples tarifas habilitadas a la vez (ej. general + especial). `RefTarifaHabilitada`
(`interfaces/tarifa-habilitada.ts`): `{ nivel: 'general' | 'eventual' }` o
`{ nivel: 'especial' | 'personalizada'; idTarifa: string }` (`idTarifa: ''` = habilitado,
tarifa concreta aún no creada — estado válido esperado, se completa desde el módulo de
Tarifas). Reglas: `'eventual'` solo válida como única entrada; al menos una tarifa
habilitada es obligatoria (`validarTarifasHabilitadas`, en los 3 factories).

**Chofer de proveedor:** `tarifasHabilitadas: null` — no tiene tarifa propia, hereda la
del proveedor. Resolver SIEMPRE vía
`ProveedorService.resolverTarifasHabilitadasChofer(chofer)` (nunca leer
`chofer.tarifasHabilitadas` directo sin chequear `contratacion.tipo` antes).

**Shim de compatibilidad:** `tarifaTipoDesdeHabilitadas(lista): TarifaTipo`
(`interfaces/tarifa-habilitada.ts`) reconstruye los 4 booleanos legacy para
consumidores que aún no resuelven multiplicidad real: `OperacionFactoryService` (varios
métodos), `operaciones-editor` (badges), `ProveedorService.getTarifaTipo`, los 3
listados, `objeto-papelera`. Marcados `// TODO: refactor Tarifas`.

> **Refactor grande planificado (no iniciado):** unificar en un tarifario único con
> interfaz común para general/especial/personalizada (eventual aparte, por ser ad-hoc
> por operación) — `TarifaBase`, `Tarifa`, `TarifaEspecial`, `TarifaEventual`. Incluye
> resolver `operaciones-editor` para multiplicidad real (hoy usa el shim, que colapsa a
> "la primera tarifa que matchea", igual que hacía `TarifaTipo` antes), migrar
> `idTarifa`/`tarifaAsignada` de las 3 entidades a `RefTarifaHabilitada`, y reescribir el
> módulo de Tarifas actual (`Xxx-tarifa-gral`/`Xxx-tarifa-especial`/
> `cliente-tarifa-personalizada`, `TarifasService`), hoy con las líneas que leían
> `tarifaTipo` comentadas al mínimo para compilar. Hasta entonces, la lógica de cálculo
> de tarifas en los servicios de Operaciones se toca al mínimo (marcada con
> `// TODO: refactor Tarifas`), no se reescribe. Ver `CHANGELOG.md` → mini-frente
> "Multiplicidad de tarifas por entidad" para el detalle completo de lo ya resuelto.

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
| `log/` | Log de actividad viejo (colección `logs`) — sigue activo para lo no migrado (ver "Frente Log") |
| `log-registro/` | `LogRegistroService` (escritura, dentro del batch atómico de negocio) + `RegistroLogConsultaService` (lectura/paginación, para `RegistroLogComponent`) sobre `registroLog` — ver "Frente Log — mecanismo unificado" |
| `papelera/` | `PapeleraService` (preparación de escrituras de baja/restauración por referencia, dentro del batch atómico de negocio) + `PapeleraConsultaService` (lectura/paginación, para `PapeleraComponent`) sobre `papeleraEventos`/`objetosEliminados` — ver "Frente Papelera — mecanismo de referencia" |
| `visualizador-objeto/` | `VisualizadorObjetoService` — dispatcher `coleccion -> modal de vista real`, usado por `RegistroLogComponent` y (desde el Frente Papelera) por `PapeleraComponent` vía el parámetro `snapshot` de `verObjeto` |
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
- `verificarVencimientosDocumentacion`: ver "Módulo Legajos — reconstrucción
  completa" → "Verificación periódica de vencimientos (Cloud Scheduler)".
  Primera función PROGRAMADA del proyecto (Cloud Scheduler vía `onSchedule`,
  las anteriores son triggers `onWrite`/`onCall`) — puede ser la primera vez
  que el proyecto usa Cloud Scheduler; si el deploy o la consola piden
  habilitar esa API o definir una ubicación, es esperable, seguir el prompt.

**Región `southamerica-east1`.** Las 5 funciones anteriores (`syncRoleClaim`
+ las 4 de `gestionUsuarios`) corrían en la región default (`us-central1`,
implícita, nunca declarada). Al agregar `verificarVencimientosDocumentacion`
se alineó TODO el codebase a `southamerica-east1` vía
`setGlobalOptions({ region: 'southamerica-east1' })` — decisión explícita,
`demo` es un proyecto sin riesgo de corte real. Un cambio de región en una
función 2nd gen ya deployada implica delete + recreate (no hay move
in-place); la CLI lo marca explícitamente al correr
`firebase deploy --only functions --project demo` — es esperable, confirmar
el prompt. **Deuda:** alinear también `pf-logistics`/Vantruck cuando ese
frente se aborde — ahí sí es un corte real en producción, coordinar el
momento. Ver "Deuda conocida".

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
`--only firestore,auth`), `functions/test-vencimientos-scheduler.mjs`
(siembra legajos con estado desactualizado, dispara
`verificarVencimientosDocumentacion` manualmente vía el endpoint HTTP que
el emulador de Functions expone para scheduled functions —
`POST /{project}/{region}/{nombre}-0`, sufijo asignado por el emulador —
corre dos veces seguidas para confirmar que `legajos` solo se reescribe
cuando cambia y que `vencimientos` se reconstruye entera en cada corrida),
`functions/test-vencimientos-rules.mjs` (lectura para los 4 roles, sin
escritura desde el cliente para ninguno).

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
- **Logging:** toda mutación de datos debe quedar registrada con acción (`ALTA`, `EDITAR`, `BAJA`, `RESTAURAR`), nombre de colección e ID del registro. El rol `dev` queda excluido del log. Dos mecanismos conviven: el nuevo `LogRegistroService` (colección `registroLog`, log como escritura dentro del mismo batch atómico de negocio — usar este para código nuevo en los módulos ya migrados) y el viejo `LogService` (colección `logs`, log como llamada separada después del write — sigue vigente para lo no migrado). Ver "Frente Log — mecanismo unificado" para el detalle de qué está migrado y qué no.
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
- Cloud Functions están disponibles (plan Blaze) — evaluar caso por caso si una solución
  nueva conviene en el cliente o en una Cloud Function, sin asumir la vieja limitación del
  plan gratuito.

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
Alta/edición/baja simple (Clientes/Choferes/Proveedores y sus sub-entidades
`vehiculos`/`legajos`, más Legajos como módulo propio — categorías de documentación,
visibilidad, documentación): migradas al mecanismo nuevo (ver "Frente Log — mecanismo
unificado"). Escrituras de un solo doc: helpers privados `crearConLog()`/
`editarConLog()`/`eliminarConLog()` en el propio `XxxService`. Cascadas (entidad
principal + N relacionadas, ej. chofer + vehículos + legajo): un único
`EscrituraBatch[]`/`commitBatch` por cascada, armado a mano en el método (no vía los
helpers de 1 escritura), con un `agregarAlBatch` por cada escritura real — atomicidad
completa sin perder granularidad de log (Frente 2). Ninguno de los dos casos pasa ya
por `StorageService`. **Baja con papelera (actualizado, Frente Papelera):** ya NO usa
`StorageService.deleteItemPapeleraCompuestoAsync()` para Cliente/Chofer/Proveedor/
Operación — un único `EscrituraBatch[]`/`commitBatch` por cascada, igual que
alta/edición, con `PapeleraService.prepararBajaEnBatch()` armando el evento +
objetos archivados por referencia (en vez de un objeto compuesto embebido) y
`restaurarXxx()` en el `XxxService` dueño para la restauración — ver "Frente Papelera
— mecanismo de referencia" más abajo.

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

### Decisiones de arquitectura — mini-frente RefTarifaHabilitada (multiplicidad de tarifas)

Patrones fijados al resolver "una entidad puede tener múltiples tarifas habilitadas a
la vez"; aplican como precedente al frente grande de Tarifas.

**Union type discriminado por `nivel`, no un array de un tipo único con campos
opcionales.** `RefTarifaHabilitada` fuerza en el tipo que solo `especial`/
`personalizada` tienen `idTarifa` — `general`/`eventual` no pueden tenerlo por
error. Mismo criterio que `SujetoAsignacion`/`ContratacionChofer` en el resto del
proyecto.

**`null` explícito en vez de estado "vacío pero técnicamente presente", cuando el dato
no aplica.** `Chofer.tarifasHabilitadas: null` para chofer de proveedor, en vez de `[]`
o de copiar la lista del proveedor al chofer. Un array vacío sería ambiguo ("no tiene
ninguna tarifa" vs. "no aplica, mirar al proveedor"); copiar la lista duplica un
estado que requeriría sincronizarse ante cada cambio del proveedor — mismo problema que
ya tenía `ChoferFormData.tarifaTipo` antes de este frente. La resolución por ID contra
el servicio vivo (patrón ya establecido en el proyecto) no tiene costo real: es un
`.find()` en memoria sobre un `BehaviorSubject` ya cacheado, no una consulta a
Firestore.

**Puente de compatibilidad temporal, con TODO explícito de cuándo desaparece.**
`habilitadasDesdeTarifaTipo` (inverso) existió solo mientras los formularios producían
selección única; se eliminó al conectar los componentes al modelo real de lista, en el
mismo bloque que originalmente lo marcó como su fecha de vencimiento. Útil como
plantilla: un shim temporal necesita, desde que se escribe, el comentario de qué
bloque futuro lo hace innecesario — no un TODO genérico sin fecha.

**Preservar sub-estado no editable en la UI al reconstruir un objeto desde el
formulario.** El formulario solo administra el booleano (¿está habilitado o no?), nunca
`idTarifa` (responsabilidad de otro módulo). Al editar, si un nivel especial/
personalizada no se destildó, se reusa su `idTarifa` real guardado al cargar el form,
en vez de reconstruirlo con `''` cada vez — evitar que un formulario que solo conoce
una parte del objeto destruya silenciosamente la parte que no administra.

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

### Verificación periódica de vencimientos (Cloud Scheduler)

`functions/src/verificarVencimientosDocumentacion.ts` — primera función PROGRAMADA
del proyecto (`onSchedule`, 2nd gen; ver "Cloud Functions" más arriba para el detalle
de región/deploy). Corre diario a las 03:00 `America/Argentina/Buenos_Aires`. Cierra
el hueco documentado arriba: sin esto, `estado` quedaba congelado en lo que era al
momento de cargar/reemplazar el documento, y nunca avanzaba solo por el paso del
tiempo (un documento "por vencer" nunca pasaba a "vencido" salvo que alguien
reabriera y volviera a guardar ese legajo).

- **Umbral de `'porVencer'`: 45 días** (antes 30, ajustado en Agosto 2026). Decisión de
  negocio explícita, no un default técnico — 30 días quedaba corto para cubrir el ciclo
  real de renovación de un documento (sacar turno + trámite + emisión + cargarlo de
  nuevo en el legajo); 45 confirmado con el desarrollador. Vive en un solo lugar por
  copia (el `if diffDias <= 45` de cada una de las dos copias de
  `calcularEstadoDocumentacion()`) — sin tabla de configuración ni override por
  categoría, un solo número para todo el proyecto.
- **`calcularEstadoDocumentacion()` DUPLICADA manualmente**, no importada. Cloud
  Functions es un proyecto TypeScript separado (`functions/tsconfig.json`, build/deploy
  propio) que no puede importar de `src/app/` — se copió el cálculo literal en vez de
  armar un mecanismo de código compartido entre los dos `tsconfig` para una función
  pura de 15 líneas. Mantener AMBAS copias sincronizadas ante cualquier cambio en este
  cálculo (comentario espejo en las dos puntas: `interfaces/legajo.ts` y el archivo de
  la función).
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
consolidado. Ver "Frente Log — mecanismo unificado" → Frente 2 para el detalle.

### `firestore.rules` — dos fixes durante este frente

1. **Módulo `legajos`: agregado `crear` para `user`.** La cascada de alta de chofer
   requiere `crear` en `entidades` Y en `legajos` a la vez (crea el chofer y su legajo
   vacío en el mismo gesto) — la regla real solo se lo daba en `entidades`. `user` es el
   rol del único empleado activo en producción, así que este bug bloqueaba en silencio
   (por la falta de `await` mencionada arriba) la creación de legajos para altas de
   chofer hechas por ese rol.
2. **`moduloDe()`: `categoriasDocumentacion` y `documentacionHistorial` no estaban
   mapeadas.** Cualquier colección sin mapeo explícito queda denegada por defecto
   (fail-safe ya establecido del proyecto — ver "Security Rules" más arriba), lo que
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
"Deuda — migración a Vantruck..." más abajo). Como los datos de `demoapplog` son
enteramente ficticios, se optó por un reset manual posterior a la migración: se vació
`legajos` por completo y se recreó un legajo vacío por cada chofer real existente
(script ad-hoc de un solo uso, deliberadamente FUERA de `LegajoMigrationService` — ese
servicio sigue representando la lógica de migración real que algún día correrá contra
Vantruck, donde datos reales existentes nunca se borrarían y recrearían vacíos).

**Estado actual de `legajos` en demo: cada chofer tiene exactamente un legajo vacío**,
listo para pruebas reales de carga de documentación — no hay documentación real
precargada, es el estado esperado tras el reset, no un dato faltante.

## Frente Log — mecanismo unificado (Frente 1, Agosto 2026)

Reemplaza el mecanismo disperso de logging (StorageService acoplado a cada CRUD +
coordinadores atómicos llamando directo a `LogService`, con duplicados y registros
faltantes confirmados) por un mecanismo único: **el registro de log es una escritura
más dentro del mismo batch atómico que persiste el negocio**, no una llamada separada
después. Si el batch no commitea, no hay log; si commitea, el log está garantizado
adentro — estructuralmente imposible tener log duplicado o faltante en las mutaciones
migradas.

**Piezas nuevas, conviven con las viejas (no las reemplazan):**
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

**Explícitamente NO migrado en este frente (queda en el mecanismo viejo,
`LogService`/colección `logs`):**
- **Toda baja que pase por la colección `papelera`** — no solo las de Operaciones. Al
  revisar el código real se confirmó que la baja "simple" de Cliente NO existe como tal
  (`ClienteService.eliminarCliente` siempre usa
  `StorageService.deleteItemPapeleraCompuestoAsync`), y que la baja principal de
  Chofer/Proveedor (aunque sus vehículos sí tienen baja simple, migrada) también pasa
  siempre por ahí. El mecanismo nuevo no tiene forma de escribir el objeto compuesto
  de papelera (`LogDoc` con `objeto`/`motivoBaja`) — eso es del frente de Papelera,
  aparte, no de este. Consecuencia real: **hoy ningún BAJA de Cliente llega a
  `registroLog`** (todo Cliente-BAJA sigue en `logs`); Chofer/Proveedor si tienen algo
  en `registroLog` para BAJA, pero solo por sus vehículos, nunca por la entidad
  principal. Marcado con comentarios en `eliminarCliente`/`eliminarChoferConVehiculos`/
  `eliminarProveedorConVehiculos` señalando el motivo puntual en cada sitio.
- `OperacionService.bajaOperacion`/`restaurarOperacion` (papelera) y
  `AsignacionService.marcarItemAnulado`/`reactivarItem` (usados hoy solo por
  `TableroService`, facade vieja intacta) — sin cambios, ver "Deuda — integración de
  callers para bajaOperacion/restaurarOperacion" más abajo, que sigue vigente tal cual.
- Cualquier módulo sin `XxxService` propio confirmado (Vendedores, Tarifas,
  Facturación, Liquidaciones, Finanzas) — sin tocar. ⚠️ **Corrección (Frente 2):** esta
  entrada agrupaba a Legajos junto a estos módulos por error — `LegajoService` SÍ tiene
  su propio `XxxService` con escritura propia desde la reconstrucción completa del
  módulo (ver "Módulo Legajos — reconstrucción completa" más arriba), el mismo patrón
  que Cliente/Chofer/Proveedor. La exclusión de este Frente 1 fue una omisión, no una
  decisión de alcance — corregida en el Frente 2 (Legajos migrado completo, ver abajo).
- `RegistroComponent` (pantalla de log) sigue leyendo de `logs` sin cambios — la
  colección vieja pasa a ser, de hecho, el histórico de lo no migrado. Rediseño de la
  pantalla, frente aparte y posterior.

**Pendiente natural para el frente de Papelera** (cuando se aborde): decidir cómo el
nuevo mecanismo (o una extensión de `LogRegistroService`) va a cubrir la escritura a
`papelera`, para poder migrar de una vez las bajas reales de Cliente/Chofer/Proveedor
que hoy quedan fuera por este motivo — no es solo el caso de Operaciones ya anotado
abajo. ✅ **Resuelto — ver "Frente Papelera — mecanismo de referencia" más abajo:**
Cliente/Chofer/Proveedor/Operación (BAJA y RESTAURAR, entidad principal y
sub-entidades) ya llegan a `registroLog`, vía `PapeleraService` + `LogRegistroService`
dentro del mismo `commitBatch`. Vendedores/Facturación/Liquidación siguen fuera,
igual que el resto de este Frente 1.

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

**Resto del CRUD de Legajos** (fuera de las cascadas de alta/baja de Chofer/Proveedor),
migrado con el mismo patrón que Cliente/Chofer/Proveedor:
- `LegajoService.toggleVisibilidad`: `EscrituraBatch[]` de 1 + `agregarAlBatch('EDITAR', ...)`
  + `commitBatch`.
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
método que lo necesitara). Sigue en uso en `ClienteService`/`ChoferService`/
`ProveedorService` únicamente para las bajas compuestas con papelera (Frente 1).

**Verificado:** árbol compila limpio (`tsc --noEmit` + `ng build`); el error de budget de
bundle (8.65 MB vs. 7 MB) es el mismo preexistente de siempre, confirmado por
comparación directa contra el build previo al frente — la diferencia real introducida
por este frente es de apenas ~0.01 MB.

### Fix post-cierre — `registroLog` faltaba en `moduloDe()` de `firestore.rules`

Bloqueante real, no detectado por `tsc`/`ng build` (esos no validan Security Rules):
`registroLog` (colección nueva del Frente 1) nunca se agregó a `moduloDe()` —
colección sin mapeo explícito = denegada por defecto para los 4 roles, fail-safe ya
establecido del proyecto (ver "Security Rules" más arriba). Efecto real: toda
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
firestore:rules,firestore:indexes --project demoapplog`, ver "Frente Papelera" más
abajo) — mismo archivo `firestore.rules`, un solo deploy cubrió ambos fixes
acumulados. NO deployado a `pf-logistics`/Vantruck, mismo criterio que el resto de
este archivo (ver "Cloud Functions" → orden de deploy).

### Frente 3 — pantalla `RegistroLogComponent` (Agosto 2026)

Pantalla nueva e independiente que lee exclusivamente de `registroLog` — NO toca
`RegistroComponent`/`LogService`/`logs` (siguen funcionando igual, se eliminan recién
cuando termine la migración completa de módulos al mecanismo nuevo). Las dos fuentes
de datos no se normalizan ni se mezclan a propósito.

**Ubicación:** `raiz/ajustes/registro-log/` (mismo nivel que `registro/`/`papelera/`),
ruta `ajustes/registro-log` en `ajustes-routing.module.ts`, mismo `RoleGuard` que
`registro`/`papelera` (`dev`/`admin`/`demo` — sin `user`, mismo criterio ya establecido
para pantallas de auditoría). 4ta pestaña ("Registro Log") agregada al tab bar propio
de `AjustesControlComponent` (`tab4`), junto a Usuarios/Registro/Papelera.

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
  mismo archivo — lista de las 9 colecciones que escriben a `registroLog` hoy: choferes,
  clientes, proveedores, vehiculos, legajos, documentacionHistorial,
  categoriasDocumentacion, operaciones, asignaciones — **ampliar esta lista cuando se
  migre un módulo nuevo al mecanismo de log**).
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
pensado para reusarse en Papelera más adelante (frente aparte, **no conectado
todavía** — `PapeleraComponent.modalObjeto` sigue con su mecanismo propio,
`ObjetoPapeleraComponent`, ver abajo).
- `verObjeto(coleccion, idObjet)`: `DbFirestoreService.getById` para el objeto ACTUAL
  (no un snapshot del momento del log — el diff de la fila EDITAR ya cubre eso), abre
  el modal de alta/edición REAL de esa entidad vía `NgbModal` con
  `fromParent = { modo: 'vista', item }` — mismo patrón ya establecido en
  `clientes-listado`/`choferes-listado`/`proveedores-listado`/`tablero-op`
  (`form.disable()` cuando `modo === 'vista'`), NO el mecanismo bespoke de
  `ObjetoPapeleraComponent` (ver hallazgo abajo).
- **Colecciones mapeadas hoy** (tienen modal de alta/edición real con `modo: 'vista'`
  confirmado): `clientes` → `ClienteAltaComponent`, `choferes` → `ChoferesAltaComponent`,
  `proveedores` → `ProveedoresAltaComponent`, `operaciones` → `ModalResumenOpComponent`
  (usa `modo: 'vista'` también, confirmado en `tablero-op.modalDetalle`).
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
- ⚠️ **Hallazgo real, documentado, no corregido (fuera de alcance):**
  `PapeleraComponent.modalObjeto` NO usa el patrón "modal real en modo vista" — abre
  `ObjetoPapeleraComponent` (`shared/modales/objeto-papelera/`), un componente bespoke
  con markup propio por colección (`@switch` gigante sobre campos legacy, ya señalado
  en otras partes de este archivo por su uso de `tarifaTipoDesdeHabilitadas`). Por eso
  "reusar el mismo mecanismo que ya usa Papelera" en la consigna de este frente se
  interpretó como reusar el PATRÓN de bajo nivel (`NgbModal.open` + `fromParent =
  {modo, item}`), no literalmente `ObjetoPapeleraComponent` — que sigue existiendo tal
  cual, sin relación con `VisualizadorObjetoService`. Cuando se aborde el frente de
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
  real, no solo `tsc`. Costo real, medido: bundle inicial +~90 KB (7.65 MB → 7.74 MB;
  el budget ya estaba excedido antes de este frente, ver "Deuda conocida" si aplica) —
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
   `limpiar`, `navigate`) queda en el mismo orden relativo entre sí, ahora sin que el
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
Cloud Function de vencimientos, ver "Módulo Legajos"). Con un único caller real hoy
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

## Frente Papelera — mecanismo de referencia (Agosto 2026)

Reemplaza el mecanismo de papelera de Cliente/Chofer/Proveedor/Operación (los 4
módulos ya migrados al resto del refactor) — `StorageService.deleteItemPapelera*`,
escrituras sueltas no atómicas, objeto embebido compuesto con 3 formas distintas
según el caller (`{cliente}`, `{chofer, vehiculos, legajo}`,
`{proveedor, vehiculos, choferes, legajos}`) — por uno único, atómico, y conectado a
`registroLog` (ver "Frente Log — mecanismo unificado" más arriba). Cerraba la brecha
que el Frente Log había dejado abierta a propósito ("Pendiente natural para el frente
de Papelera", ver arriba): hoy BAJA/RESTAURAR de Cliente/Chofer/Proveedor/Operación
(y sus sub-entidades vehículos/legajos) generan entradas reales en `registroLog`, no
solo en el `logs` viejo.

**Por qué por referencia y no embebido:** el mecanismo viejo guardaba el objeto
completo (y sus relacionados) DENTRO del documento de papelera, con una forma
distinta por caller — imposible de leer genéricamente. El nuevo separa el EVENTO
(quién, cuándo, por qué, qué colecciones/ids tocó) del CONTENIDO archivado (una copia
de cada entidad, en su propia colección, con id determinístico) — permite un
point-lookup directo (`getObjetoEliminado`) sin tener que saber la forma del evento
que lo generó, y una pantalla de listado genérica sobre los eventos.

**El modelo** (`interfaces/registro-papelera.ts`):
- `PapeleraEvento`: un doc por acción de baja del usuario, colección
  `papeleraEventos`. `timestamp`/`userId`/`userEmail`/`motivoBaja` (paralelo a
  `RegistroLog`), más `coleccionPrincipal`/`idPrincipal` (para poder listar/filtrar
  sin desarmar `refs`), `estado: 'activo' | 'restaurado'` (no se borra al
  restaurar — queda como historial, mismo criterio que `registroLog` nunca se
  edita/borra) y `refs: RefObjetoPapelera[]` (una entrada por entidad tocada,
  `{coleccion, idOriginal, principal}` — exactamente una con `principal: true`).
- `objetosEliminados`: un doc por cada entidad archivada (principal o secundaria),
  SIN wrapper — el documento es la entidad tal cual estaba en su colección de
  origen (mismo shape que `toFirestore()`, sin id adentro). Id determinístico
  `${coleccion}__${idOriginal}` — permite `getById` directo, sin query, tanto para
  restaurar como para el fallback de los `// TODO: refactor Papelera`.
- `PapeleraService` (`servicios/papelera/`): servicio de apoyo "tonto respecto al
  dominio" (mismo principio que `LogRegistroService`/`db` — ver "Ownership por
  entidad primaria" más arriba) — NUNCA importa
  Cliente/Chofer/Proveedor/OperacionService ni conoce la forma de ninguna entidad.
  `prepararBajaEnBatch()`/`prepararRestauracionEnBatch()` solo arman escrituras
  sobre un `EscrituraBatch[]` que el caller ya viene armando (no commitean); cada
  `XxxService` dueño de la entidad sigue siendo quien decide CÓMO reconstruirla al
  restaurar (`restaurarCliente`/`restaurarChofer`/`restaurarProveedor`/
  `restaurarOperacion`, todos con la firma `(idEvento: string) => Promise<...>`).
  `PapeleraConsultaService` (paginación, mismo patrón que
  `RegistroLogConsultaService`) es el otro servicio nuevo.
- Patrón de caller, igual en los 4 `XxxService` (ver "Ownership por entidad
  primaria — Servicios de apoyo de bajo nivel"): un solo `EscrituraBatch[]` con
  delete(s) de la(s) colección(es) de origen + `papeleraService.prepararBajaEnBatch`
  + un `logRegistro.agregarAlBatch('BAJA', ...)` por cada entidad tocada + un solo
  `commitBatch`. Restaurar es el espejo: `papeleraService.prepararRestauracionEnBatch`
  + un `crear` por cada objeto devuelto + un `agregarAlBatch('RESTAURAR', ...)` por
  cada uno + un solo `commitBatch`. Mismo criterio de granularidad de log que el
  Frente 2 (Chofer/Proveedor + vehículos/legajo) — NO se consolida en una sola
  entrada por cascada.
- **Chofer/Proveedor:** reemplaza además una brecha de atomicidad real que tenía el
  código viejo, más allá del log — `eliminarChoferConVehiculos` hacía 2
  `commitBatch` separados (chofer+papelera, después vehículos+legajo);
  `eliminarProveedorConVehiculos` hacía 3 fases, la última un loop NO bacheado de N
  `deleteItemPapeleraCompuestoAsync` (uno por chofer del proveedor). Ambos ahora un
  solo `commitBatch` por cascada completa.
- **Operación:** `bajaOperacion`/`restaurarOperacion` en `OperacionService` dejan de
  construir un `LogDoc` a mano y de depender de `LogService`/`LogDoc` — usan
  `PapeleraService` + `LogRegistroService.agregarAlBatch`, dentro del mismo
  `commitBatch` que ya escribía operaciones/informes/tablero. `restaurarOperacion`
  cambió de firma: de `(logDoc: LogDoc)` a `(idEvento: string)`. **Sin
  secundarios** — los `informesOpXxx` que la baja elimina NO se archivan (mismo
  comportamiento que ya tenía el código viejo, deliberado: los InformeOp no se
  reconstruyen al restaurar, `restaurarOperacion` siempre deja la op `'abierta'`
  con `km: 0`, ver "Coordinadores bajaOperacion / restaurarOperacion" más arriba).
- **`VisualizadorObjetoService.verObjeto`** gana un tercer parámetro opcional
  `snapshot?: any` — cuando viene con valor, se usa en vez de `getById` contra la
  colección viva (el objeto principal de un evento `'activo'` ya no existe ahí) y
  el aviso Swal cambia de "estado actual" a "objeto eliminado". Sin `snapshot`
  (uso desde `RegistroLogComponent`, y desde `PapeleraComponent` para eventos
  `'restaurado'`), comportamiento sin cambios.
- **`// TODO: refactor Papelera` resueltos con fallback a
  `papeleraService.getObjetoEliminado()`:** `TableroService` (fallback de
  `getTipoContratacion` en la baja legacy `anularOperacionYActualizarTablero`,
  método hoy sin caller real) y `liquidaciones-op.component.ts` (mismo fallback,
  en la baja de operación cerrada desde Liquidaciones — ver Deuda actualizada
  arriba). **`objeto-papelera.component.ts` resuelto distinto:** `getTarifaLabel`
  corre síncrono desde el template, y `PapeleraService.getObjetoEliminado` es
  async — se resuelve en `ngOnInit` (fire-and-forget, popula un campo que
  `getTarifaLabel` lee) en vez de adentro del getter. **`proveedor.service.ts`
  (`resolverTarifasHabilitadasChofer`) NO resuelto, TODO se mantiene a
  propósito:** corre síncrono dentro de factories puras sin I/O por convención
  (`OperacionFactoryService`, `operaciones-editor`) — el fallback async no encaja
  ahí sin romper esa convención; documentado en el propio comentario, no forzado.

**Pantallas (PASO 6):** la pantalla vieja (`raiz/ajustes/papelera/`) se renombró a
`raiz/ajustes/papelera-legado/` (`PapeleraLegadoComponent`, ruta nueva
`ajustes/papelera-legado`) SIN tocar su lógica interna — sigue siendo el único
camino de papelera para Vendedores/Facturación/Liquidación. `raiz/ajustes/papelera/`
(la ruta `ajustes/papelera` ya existente) pasa a ser la pantalla NUEVA
(`PapeleraComponent`), sobre `PapeleraConsultaService`/`PapeleraEvento` — mismo
look&feel que la vieja, filtro `estado` (`'activo'` por default, con opción de ver
`'restaurado'`), detalle vía `VisualizadorObjetoService.verObjeto` (con snapshot
para eventos `'activo'`), objetos secundarios listados en línea sin modal propio, y
Restaurar deshabilitado si `estado !== 'activo'`. Tab nuevo ("Papelera (legado)") en
`AjustesControlComponent`, mismo patrón que el tab de Registro Log.

**Fuera de alcance — SIN tocar:** Facturación, Liquidación, Vendedores — siguen
escribiendo a la colección vieja `papelera`/`LogDoc` vía `StorageService`, sin
cambios. Motivo puntual de **Liquidación**: la baja de una operación cerrada desde
`liquidaciones-op.component.ts` también elimina los informes de liquidación
asociados (`eliminarOperacionEInformes`) — antes de poder unificarla con
`OperacionService.bajaOperacion` hay que refactorizar esa eliminación de informes,
que queda para el frente de Liquidación (ver Deuda actualizada arriba).
`StorageService.deleteItemPapelera*`/`addSimpleLogPapelera`/
`deleteItemPapeleraCompuestoAsync` quedan intactos — siguen siendo lo que usan estos
3 módulos. `BajaObjetoComponent` (modal de motivo) tampoco se tocó — lo siguen
usando callers viejos y nuevos por igual.

**Fix de permisos encontrado (Security Rules):** la rama `papelera` de
`permitido()` en `firestore.rules` no le daba a `demo` NINGÚN permiso, pese a que
TANTO la ruta nueva (`ajustes/papelera`) como la vieja (`ajustes/papelera-legado`)
permiten navegar como `demo` (mismo `RoleGuard` que `registro`/`registro-log`) —
bug preexistente al mecanismo nuevo, corregido de paso. Agregada
`(r == 'demo' && accion == 'leer')`, mismo criterio que `logs`/`registroLog`.
**Dos fixes más, encontrados al implementar el mecanismo nuevo (no en el
mecanismo viejo):** `restaurarXxx()` marca el `PapeleraEvento` como `'restaurado'`
con una escritura `modo: 'reemplazar'` sobre un doc YA EXISTENTE — Firestore evalúa
esto como `update`, no `create`, sin importar que el cliente use `set()` (no
`update()`); sin `editar` en la matriz, esto fallaba incluso para `admin` (el único
rol no-`dev` con acceso real a la pantalla de Papelera). Agregado `editar` a
`admin`. Además, `PapeleraService.getObjetoEliminado` (fallback de los
`// TODO: refactor Papelera`) es un `getById` alcanzable por `user` en flujos de
Operaciones/Liquidaciones que no pasan por la pantalla de Papelera — agregado
`leer` a `user`. `moduloDe()` gana `'papeleraEventos'`/`'objetosEliminados'` → bucket
`'papelera'` (mismo patrón que `'registroLog'` → `'logs'`). Índice compuesto nuevo
en `firestore.indexes.json`: `papeleraEventos` por `estado` (ASC) + `timestamp`
(DESC), mismo patrón que el de `registroLog`. Verificado contra el emulador
(`functions/test-papelera-rules.mjs`, nuevo, mismo patrón que
`test-registro-log-rules.mjs`: 4 roles × leer/crear/editar/eliminar × 2
colecciones, 32/32 checks) — y regresión confirmada en verde sobre
`test-registro-log-rules.mjs`/`test-asignaciones-rules.mjs` (14/14 y 6/6) tras el
cambio a `firestore.rules`.

**Deployado a `demoapplog`** (`firebase deploy --only firestore:rules,firestore:indexes
--project demoapplog`) — rules compiladas sin error, índice nuevo desplegado, sin
`--force` (no se tocó ningún índice remoto preexistente). NO deployado a
`pf-logistics`/Vantruck — pendiente hasta que se aborde ese frente, mismo criterio que
el resto de este archivo (ver "Cloud Functions" → orden de deploy).

**Fix post-implementación — `id` residual en `restaurarOperacion`:** verificación
encontró que `OperacionService.opToFirestore` no excluía el campo `id` (metadata de
`ConId`, solo `idOperacion`) — al restaurar una operación desde papelera, el
documento escrito en Firestore quedaba con un campo `id` de más en el cuerpo. Bug
preexistente al frente, no introducido por él. Fix: `opToFirestore` ahora
destructura también `id` (vía `as any`, mismo patrón que
Cliente/Chofer/Proveedor.toFirestore()). La firma del parámetro se mantuvo en
`op: Operacion` (no se cambió a `ConId<Operacion>` como se había planteado
inicialmente) porque `altaDesdeAsignacion` llama a `opToFirestore` con
`c.operacion: Operacion` a secas (recién construida por el factory, nunca tiene
`id`) — cambiar la firma rompía ese call site en `tsc`. `bajaOperacion`/
`restaurarOperacion` siguen pasando `ConId<Operacion>`, asignable a `Operacion` por
tipado estructural, así que el fix cubre ambos casos sin tocar ningún call site.

**Verificado:** `tsc --noEmit` limpio (0 errores fuera de los preexistentes de
archivos `.spec.ts`, sin type defs de test runner cargados — no relacionado con
este frente). `ng build --configuration=demo` limpio, mismo error de budget de
bundle preexistente (8.76 MB vs. 7 MB — línea consistente con el crecimiento ya
documentado en frentes anteriores, delta real de este frente no medido por
separado). Security Rules verificadas contra el emulador (ver arriba). **Prueba
manual del desarrollador contra `demo`, en curso:** baja simple (Operación) y baja
en cascada (Chofer, con vehículos + legajo) probadas — ambas OK. Pendiente todavía:
baja de Cliente y de Proveedor (cascada N-choferes), restaurar cada caso, confirmar
entradas BAJA/RESTAURAR en `RegistroLogComponent`, y confirmar en la pantalla de
Papelera nueva que el detalle abre el snapshot correcto para eventos `'activo'` y
el objeto vivo para `'restaurado'`.

## Deuda conocida

Deuda técnica activa. Actualizar cuando se salda.

### Deuda — alinear región de Cloud Functions en `pf-logistics`/Vantruck

Al agregar `verificarVencimientosDocumentacion` (ver "Cloud Functions"), todo el
codebase de funciones se alineó a `southamerica-east1` vía `setGlobalOptions`. Esto
solo se deployó contra `demoapplog` (`--project demo`) hasta ahora. Cuando este mismo
frente (o cualquier deploy de funciones) se lleve a `pf-logistics`/Vantruck, las 5
funciones ya existentes ahí (`syncRoleClaim` + las 4 de `gestionUsuarios`, corriendo en
la región default) también van a requerir delete + recreate para adoptar la región
nueva — ahí sí es un corte real en producción (a diferencia de `demo`, sin ventana de
riesgo). Coordinar el momento del deploy con el desarrollador, en una franja que no
afecte operación real, y no asumir que puede hacerse en cualquier momento como en demo.

⚠️ **Hallazgo (sesión de diseño del frente Log, ago-2026): esta desalineación ya tenía
un bug real en el cliente, preexistente, sin relación con el frente de Log.** El SDK
cliente (`app.module.ts`, `provideFunctions(() => getFunctions())`) nunca leyó región
— quedó en el default `us-central1` desde siempre, mientras las funciones de gestión de
usuarios (`crearUsuario`/`editarUsuario`/`editarEmailUsuario`/`eliminarUsuario`) corren
en `southamerica-east1` en `demoapplog` desde que se hizo el realineamiento de arriba.
Efecto real: toda llamada `httpsCallable` a esas 4 funciones desde la app en `demo`
fallaba con 404/CORS (la URL que arma el SDK sin región explícita apunta a
`us-central1-demoapplog.cloudfunctions.net`, donde esas funciones no existen).
Confirmado el bug Y el fix con el emulador de Functions — a diferencia del emulador de
Firestore con Security Rules (que ignora reglas de acceso reales), el de Functions SÍ
reproduce esto: cada función se registra en una ruta HTTP con la región como parte del
path (`http://127.0.0.1:5001/{proyecto}/{region}/{nombre}`), así que pedir la región
equivocada falla ahí también (`functions/not-found`) — ver
`functions/test-functions-region.mjs`, 2/2 checks: sin región → `not-found`; con
`southamerica-east1` → la llamada llega y responde OK.

**Fix aplicado:** el SDK cliente ahora lee la región desde `environment.functionsRegion`
(`src/environments/environment.model.ts`, interfaz `Environment` compartida por los 3
environments — `functionsRegion` es opcional a propósito) —
`provideFunctions(() => getFunctions(undefined, environment.functionsRegion))` en
`app.module.ts`. `environment.ts`/`environment.prod.ts` (ambos apuntan a `demoapplog`):
`functionsRegion: 'southamerica-east1'`. `environment.vantruck.ts`: la propiedad queda
**ausente a propósito** (ni siquiera `undefined` explícito — directamente no declarada,
válido porque es opcional en `Environment`) hasta que la deuda de arriba se pague
(realineación de `pf-logistics` a `southamerica-east1`) — con `functionsRegion:
undefined`, `getFunctions(undefined, undefined)` cae al comportamiento actual sin
cambios, cero riesgo para Vantruck. **Al pagar esa deuda: agregar `functionsRegion:
'southamerica-east1'` a `environment.vantruck.ts`** (mismo valor que los otros dos) —
es el único paso que falta del lado cliente, todo lo demás ya está armado para leerlo.

### Deuda — verificar bucket de Storage de `pf-logistics` antes de migrar a Vantruck

El mismo gap encontrado en demo (bucket de Storage nunca creado pese a que el SDK config
ya reporta un `storageBucket` válido) puede repetirse en `pf-logistics`/Vantruck — un
nombre correcto en `environment.vantruck.ts` NO es evidencia de que el bucket realmente
exista. Antes de que Legajos (o cualquier otro módulo que use `StorageArchivosService`)
llegue a producción: confirmar que el bucket existe de verdad (no solo por el nombre en
config), que tiene CORS configurado para los dominios reales de Vantruck, y que
`storage.rules` está desplegado ahí — mismas tres piezas verificadas en demo, ver
"Módulo Legajos" más arriba para el detalle completo de por qué las tres son necesarias
por separado. Aprovechar para confirmar también que la región del bucket de demo
(`SOUTHAMERICA-EAST1`, elegida sin una referencia real al momento de crearlo) coincide
con la de `pf-logistics` — si no coincide, no es un bloqueante pero vale la pena
saberlo antes de migrar.

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
- **Hallazgo (sesión de diseño del frente Log, ago-2026):** mientras `PapeleraComponent`
  siga llamando a `TableroService.altaOperacionYActualizarTablero` /
  `anularOperacionYActualizarTablero`, restaurar y dar de baja una operación generan
  **dos registros de log por una sola acción de usuario**, no uno:
  - Restaurar: `altaOperacionYActualizarTablero` loguea `'ALTA'` directo, y después llama
    a `AsignacionService.reactivarItem`, que loguea su propio `'EDITAR'` (vía
    `registrarLog`).
  - Baja: `StorageService.deleteItemPapelera` loguea `'BAJA'`, y después
    `TableroService.anularOperacionYActualizarTablero` llama a
    `AsignacionService.marcarItemAnulado`, que loguea su propio `'EDITAR'` — el propio
    comentario del método ya lo señala (línea ~127-130 de `asignacion.service.ts`).
  - Los coordinadores atómicos (`bajaOperacion`/`restaurarOperacion`) YA evitan esto:
    usan las versiones puras `anularItemEnLista`/`reactivarItemEnLista` (sin log
    propio) en vez de `marcarItemAnulado`/`reactivarItem`. Migrar los callers de arriba
    (`PapeleraComponent` → `restaurarOperacion`; baja paso a paso → `bajaOperacion`)
    elimina el duplicado como efecto colateral — no requiere trabajo aparte.
  - Diferido a propósito al frente de Papelera (no al frente de Log): decisión explícita
    tomada en la sesión de diseño de Log, porque esta migración de callers cae del lado
    "acciones que trabajan con papelera", excluido del nuevo mecanismo de log por
    criterio de esa sesión.

⚠️ **Actualizado (Frente Papelera, Agosto 2026) — parcialmente saldada, NO borrar esta
entrada, sigue habiendo deuda real:**
- `OperacionService.bajaOperacion`/`restaurarOperacion` migraron al mecanismo de
  papelera por referencia (`PapeleraService`) — `restaurarOperacion` cambió de firma,
  de `(logDoc: LogDoc)` a `(idEvento: string)`. El caller nuevo es
  `PapeleraComponent` (`raiz/ajustes/papelera/`, la pantalla NUEVA de este frente,
  no la vieja renombrada `PapeleraLegadoComponent`) — el hallazgo de arriba (doble
  log por restaurar/dar de baja una operación, vía
  `TableroService.altaOperacionYActualizarTablero`/`anularOperacionYActualizarTablero`)
  queda resuelto para este caller: `PapeleraComponent` llama directo a
  `restaurarOperacion(idEvento)`, sin pasar por `TableroService`.
  `bajaOperacion`/`restaurarOperacion` ya no dependen de `LogService`/`LogDoc` —
  loguean vía `LogRegistroService.agregarAlBatch` dentro del mismo `commitBatch`.
- **Sigue sin resolver, a propósito, fuera de este frente:** la baja de operación
  **cerrada** desde Liquidaciones (`liquidaciones-op.component.ts` →
  `openModalBaja`/`bajaInformeOp`) sigue en su camino legacy
  (`eliminarOperacionEInformes` + `TableroService.anularOpEnTablero` +
  `StorageService.addSimpleLogPapelera`) — NO pasa por `bajaOperacion`. Motivo
  puntual (ver también "Fuera de alcance" del Frente Papelera): esa baja también
  elimina los informes de liquidación, que habría que refactorizar antes de
  poder unificarla con el coordinador atómico — queda para el frente de
  Liquidación. `TableroService.anularOperacionYActualizarTablero` y
  `DbFirestoreService.eliminarInformesPorIdOperacion` por lo tanto siguen sin
  eliminarse (siguen intactos, sin caller nuevo agregado en este frente —
  `anularOperacionYActualizarTablero` de hecho quedó sin ningún caller real, ver
  nota en el propio método).
- `editarOperacion` sigue diferido al refactor de Tarifas, sin cambios.

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

### Deuda — `idTarifa`/`tarifaAsignada` en Cliente/Chofer/Proveedor

Campos legacy sin migrar a `RefTarifaHabilitada` (que no tiene `idTarifa` en los
niveles `general`/`eventual`, no alcanza para sustituirlos todavía). Consumidores
activos confirmados por auditoría: el módulo de Tarifas actual completo
(`Xxx-tarifa-gral.component.ts` × 3, `TarifasService.guardarTarifaPersonalizada`).
Resolver junto con el frente grande de Tarifas, cuando ese módulo se reescriba.

### Bug — `proveedores-tarifa-gral.component.ts` escribe en colección equivocada

Líneas ~560/~591: al asignar `idTarifa` a un `Chofer` de proveedor, hace
`updateItem("proveedores", ch, ...)` en vez de `"choferes"`. Detectado en auditoría del
mini-frente RefTarifaHabilitada (Agosto 2026), no corregido — el archivo entero se
elimina con el frente grande de Tarifas.

### Bug — `modal-resumen-op.component.html` lee `tarifaTipo` sobre snapshots sin ese campo

Lee `op.cliente.tarifaTipo`/`op.chofer.tarifaTipo` sobre `RefCliente`/`RefChofer`
(snapshots de Operación, sin ese campo desde la Fase D). Probablemente `undefined` en
runtime hoy. Detectado en auditoría del mini-frente RefTarifaHabilitada (Agosto 2026),
no corregido, sin relación con ese frente — revisar en sesión propia de ese componente.

### Deuda — migración a Vantruck: Choferes/Vehículos/Legajos (y Proveedores/Choferes-de-proveedor/Vehículos/Legajos) deben migrarse en un mismo proceso, no por colección aislada

Detectado durante el chequeo de datos del frente de refactor de Legajos (Bloque 3.5,
Agosto 2026), al cruzar `choferes` vs `legajos` en `demoapplog`: los legajos con
`idChofer` en esquema legacy (numérico, ej. `1737721846747`) no matchean contra los
choferes actuales (IDs de Firestore, ej. `0Uf2a9vefe875nscHT0t`) — arrastre de una
migración de IDs anterior, no relacionado a permisos ni al frente de Legajos en sí.

**Implicancia real para la migración de datos de producción a Vantruck (pendiente, no
iniciada):** no alcanza con migrar `choferes`, `vehiculos` y `legajos` como tres
colecciones independientes en tres pasadas separadas — sus IDs legacy se resuelven por
relación cruzada entre colecciones, no por transformación aislada de cada una. Mismo
problema, en espejo, para el lado de `proveedores` → choferes de proveedor → vehículos →
legajos.

**Secuencia correcta para este bloque de migración** (a definir en detalle cuando se
encare, pero el orden de dependencia ya es claro):
1. Backup de las colecciones involucradas (`choferes`, `vehiculos`, `legajos`,
   `proveedores`), como todo backup de migración del proyecto.
2. Migrar `choferes` primero (o `proveedores`, según el lado), generando los IDs nuevos
   de Firestore.
3. Con los choferes/proveedores ya migrados y su mapeo id-viejo → id-nuevo disponible
   (posiblemente trazado guardando el id nuevo en el documento de backup del id viejo,
   o alguna tabla de mapeo auxiliar), recién ahí migrar `legajos`, resolviendo
   `idChofer` legacy → `idChofer` nuevo por algún campo estable de cruce (CUIT es el
   candidato natural, dado que es el identificador de negocio que no cambia entre
   esquemas — a confirmar contra los datos reales si alcanza para un match 1:1 sin
   ambigüedad).
4. `vehiculos` tiene la misma dependencia (se resuelve contra el chofer/proveedor ya
   migrado), y probablemente conviene resolverse en el mismo proceso.

**No es deuda del modelo de datos de Legajos en sí** (ese frente ya resuelve el modelo
correcto hacia adelante) — es deuda del PROCESO de migración de datos legacy de
producción, que corre aparte y más adelante, cuando se aborde el traspaso completo a
Vantruck. Registrado acá para que no se pierda de vista al planificar ese proceso.
