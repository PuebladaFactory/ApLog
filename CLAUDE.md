# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Aplicación web de administración para empresa de logística (Vantruck). Angular 20 SPA con Firebase (Firestore + Auth + Hosting). En producción activa — se agregan funcionalidades, se mejoran las existentes y se corrigen errores.

**Firebase plan Blaze (pay-as-you-go). Cloud Functions disponibles y en uso** (gestión de
usuarios, sync de roles, verificación programada de vencimientos — ver "Cloud Functions"
más abajo). La migración desde el plan gratuito también habilitó Firebase Storage (ver
la skill `modulo-legajos`). La lógica de negocio de dominio (Operaciones, Liquidaciones, Tarifas,
etc.) sigue corriendo mayormente en el cliente por continuidad arquitectónica del proyecto,
no por limitación de la plataforma.

## Stack técnico

- **Frontend:** Angular 20, TypeScript 5.8 (strict mode), RxJS 7
- **UI:** Bootstrap 5 (`bootstrap.min.css` local, sin CDN) + ng-bootstrap; íconos
  `bootstrap-icons` locales. Tablas de datos: `TablaGenericaComponent` propio (AG Grid,
  jquery y DataTables se retiraron en el frente Lazy loading + fechas)
- **Backend/DB:** Firebase (Firestore + Auth + Hosting + Storage + Cloud Functions)
- **Exports:** ExcelJS y jsPDF (+ autotable), los dos con `import()` dinámico desde los
  renderers de `servicios/exportacion/` (PDFMake se retiró en el frente Informes)
- **Fechas:** `shared/utils/fecha.util.ts`, sin librerías (ver "Convenciones")
- **Editor:** VSCode

## Comandos

```bash
npm start                   # Dev server en localhost:4200
npm test                    # Tests con Karma (modo watch, necesita CHROME_BIN)
npm run test:ci             # Tests una vez, Karma + Chrome Dev headless (~12 s). Specs al lado del archivo (*.spec.ts)
npm run build               # Build de producción
npm run build:demo          # Build para entorno demo
npm run build:vantruck      # Build para entorno Vantruck (producción)
npm run deploy:demo         # set-version + build + firebase deploy (demo)
npm run deploy:vantruck     # set-version + build + firebase deploy (vantruck)
```

`npm install` / `npm uninstall` necesitan `--legacy-peer-deps` (`@angular/fire` 19 con
Angular 20: ERESOLVE preexistente). `deploy:*` regeneran `src/environments/version.ts`
(`set-version.js`): commitearlo después de deployar. `build:*` no lo regeneran a propósito
(cada build de verificación dejaría el archivo modificado).

## Arquitectura

### Estructura de módulos

```
src/app/
├── appLogin/          # Rutas sin autenticación (login, registro, reset)
├── componentes/       # Herramientas de /migracion (DesarrolloModule lazy, solo rol dev)
├── raiz/              # Shell (Home, Sidebar) lazy en '' + un módulo lazy por feature
│   ├── operaciones/   # Operaciones diarias (tablero, alta/baja/cierre)
│   ├── clientes/      # CRUD + tarifas
│   ├── choferes/      # CRUD + tarifas + documentación
│   ├── proveedores/   # CRUD + tarifas
│   ├── liquidacion/   # Liquidación de operaciones cerradas
│   ├── nueva-facturacion/ # Facturación (ruta nuevaFacturacion) — Emitidos/Facturados/Revertidos sobre InformeLiqNuevo
│   ├── legajos/       # Legajos de choferes
│   ├── vendedores/    # Vendedores, asignación a clientes, comisiones y liquidaciones
│   ├── reportes/      # Resúmenes mensuales de operaciones (resumenesOp)
│   ├── finanzas-nueva/ # Finanzas (ruta finanzas): cobros, pagos, ajustes, cuentas, antigüedad
│   └── ajustes/       # Usuarios, log de actividad, papelera
├── shared/            # Componentes, directivas y pipes reutilizables
├── servicios/         # 37 carpetas de servicios
├── interfaces/        # 32+ interfaces TypeScript de dominio
├── guards/            # RoleGuard (control de acceso por rol)
└── constantes/        # Constantes de negocio
```

Ruteo (frente Lazy loading + fechas):
- `AppModule` no importa `RaizModule` ni ningún módulo de feature. `app-routing`: rutas
  sin autenticación, compatibilidad `/raiz` → `/op` y `/raiz/x` → `/x`,
  `''` → `loadChildren(RaizModule)` al final y `'**'` → `PagenotfoundComponent`. Las URLs
  no llevan `/raiz`.
- `RaizModule` declara solo el shell; cada feature es un chunk lazy desde `raiz-routing`
  (y `/migracion`, `DesarrolloModule`).
- `RoleGuard`: `canMatch` en las rutas de `raiz-routing` (13, un rol sin acceso no descarga
  el chunk) y `canActivate` en **sólo 6** rutas internas: las 5 hijas de `ajustes-routing`
  y `legajos/cargarDoc`. **Las demás rutas internas no tienen guard propio y heredan sólo
  el `canMatch` del padre** — incluidas las de Finanzas, Liquidación, Facturación,
  Operaciones, Reportes, Tarifas, Vendedores y `/migracion`, las otras cuatro de Legajos y
  `listado` en los tres listados CRUD. La matriz completa de qué rol entra a qué ruta está
  en `docs/disenos/reglas-y-matriz-de-permisos.md`, sección 3; acá no se duplica. Los dos
  devuelven
  `Promise<true | UrlTree>` (esperan a que la sesión esté reconciliada, ver "Autenticación
  y roles"); nunca `false` en `canMatch` (el router seguiría buscando y caería en `'**'`).

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
de la sesión en memoria, **reconciliada con Firebase Auth** (frente eje de
sesión; diseño y contrato completos en `docs/disenos/eje-de-sesion.md`).
Getters síncronos `getUsuarioActual()`/`getRol()`/`esRol(...roles)`, sin
observable. Persiste en `localStorage` bajo la clave `usuarioSesion` y la
rehidrata de forma síncrona en su constructor, validando `uid` no vacío y
`role` de los cinco. Además escucha `onAuthStateChanged` durante toda la
app: cada cambio de Auth relee `/users/{uid}` y establece o limpia la
sesión según la tabla de `decidirReconciliacion`
(`reconciliacion-sesion.util.ts`). **La identidad es la de Auth**: el `uid`
de la sesión lo pone Auth, no el documento; un `role` fuera de los cinco
es "sin rol". **La reconciliación es el único escritor de la sesión** en el
camino de Auth y nunca llama a `signOut`. Si la lectura falla por conexión
o timeout (`TIMEOUT_RECONCILIACION_MS`, 5 s) con la misma identidad, se
conserva la sesión rehidratada (un F5 sin conexión no desloguea).
`sesionResuelta()` es lo que espera el guard; siempre resuelve, también si
el primer evento de Auth no llega. `AuthService` autentica, ya no lee
`/users`: `iniciarSesion` espera el resultado de la reconciliación para el
uid recién autenticado (`resultadoPara(uid, marca)`) y decide el gesto
(log LOGIN y `/carga`, o `signOut` + `/limbo` sin documento o sin rol).

**Cierre de sesión:** `AuthService.cerrarSesion` escribe el LOGOUT con
espera acotada (3 s), `limpiar()`, `signOut` y termina **siempre** en una
carga completa de `/login` (`location.replace`): deja en cero todo lo que
hay en memoria —servicios, caché del SDK de Firestore— para que el próximo
usuario de la pestaña no vea nada del anterior. `limpiar()` va antes de
`signOut` a propósito (distingue un logout deliberado de una sesión
perdida).

**Red de sesión inválida (`SesionInvalidaService`):** los listeners del
arranque pasan por `vigilar()`, un `tap` sobre el error que no lo traga. Si
el error es de sesión (`unauthenticated`, o `permission-denied` con Auth
contradiciendo a la app; con Auth y app de acuerdo es la matriz de reglas y
no actúa), cierra por la salida compartida con el motivo `'vencida'`. Actúa
una sola vez aunque fallen todos los listeners juntos.

**Salida compartida de un cierre forzado** (`SesionInvalidaService.cerrarSesionForzada(motivo)`):
la usan la red de sesión inválida (`'vencida'`) y el vencimiento por
inactividad (`'inactividad'`). Cierra Firebase Auth, no sólo la app (si no,
un F5 reconstruiría la sesión): marca con el motivo en `sessionStorage`,
`signOut` acotado y carga completa de `/login`, donde `LoginComponent`
elige el texto del aviso según el motivo. Decide por el motivo
(`cierreEscribeLogout`): con `'inactividad'` escribe LOGOUT (cierre real y
atribuible, con token válido) con espera acotada antes de `limpiar()` y del
`signOut`; con `'vencida'` no escribe LOGOUT (no hay token con el que
escribirlo) y `limpiar()` va primero y sincrónico.

**Vencimiento por inactividad (`InactividadService`, frente eje de sesión,
bloque 4):** es la política de persistencia de la sesión. La sesión vence
tras `INACTIVIDAD_MAXIMA_MS` (30 min) sin interacción en **ninguna**
pestaña; `AVISO_PREVIO_MS` (1 min) antes aparece un aviso con cuenta
regresiva y "Seguir conectado", y sin respuesta vence por la salida
compartida. La marca de última actividad va en `localStorage`
(`ultimaActividad`), compartida entre pestañas a propósito; la decisión es
por marca de tiempo (`estadoInactividad` en `inactividad.util.ts`), no por
tics. Actividad: click, tecla, scroll, touch y navegación entre rutas (el
mouse no; el aviso tampoco, salvo su botón). Lo arranca
`HomeComponent.ngOnInit` (`iniciar()`, idempotente); el login escribe la
marca, y `/login` no ofrece "Continuar" sobre una sesión cuya marca ya
venció: la cierra por la salida compartida. La persistencia de Firebase
Auth queda en IndexedDB (no `browserSessionPersistence`: la amenaza real es
la máquina compartida con la sesión abierta y nadie adelante, no el
navegador cerrado). Diseño: `docs/disenos/eje-de-sesion.md`, "Bloque 4".

**Secuencia de arranque:** `/login` → `AuthService.iniciarSesion` (Firebase
Auth; la reconciliación lee `/users/{uid}` y hace `setUsuario`; log LOGIN)
→ `/carga`, que espera 3 s y navega → `/op`, donde `HomeComponent.ngOnInit`
corre los `init()` de los servicios por entidad. Tras un F5 no se pasa por
`/carga`: el guard espera la reconciliación y decide con la sesión ya
reconciliada; mientras tanto se ve el spinner de arranque de `index.html`.
`/login` con sesión viva no muestra el formulario: ofrece "Continuar" o
"Cerrar sesión", sin redirigir sola (salvo que la sesión ya haya vencido
por inactividad: ahí la cierra).

**`RoleGuard`/`esRol()`**: comparación plana contra `usuario.role`
(`rolesEsperados.includes(usuario.role)` / `esRol(...)`), sin jerarquía.
Sin sesión → `/login`. Con sesión pero sin acceso a la ruta → `/limbo`.
`/limbo` ("Sin acceso") recibe dos poblaciones: con sesión y rol pero sin
acceso a esa ruta (viene del guard), y sin documento o sin rol (viene del
login, ya sin sesión de ninguna de las dos clases). Su "Salir" llama a
`cerrarSesion`. La ruta `/unauthorized` se retiró: lo que no matchea va a
`'**'` (`PagenotfoundComponent`).

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
`/users` (sin listener — `GestionUsuariosService.obtenerUsuarios()` con
`getDocs`, sin `ConId` porque el
doc ya trae su propio `uid`; devuelve `/users` completo). El filtro
`role !== 'dev'` lo aplica `GestionUsuariosComponent.cargarUsuarios`, siempre —
`dev` no se lista ni gestiona desde la app, exclusivamente por consola.
**Que `obtenerUsuarios` no filtre por rol es deliberado:** tiene dos
consumidores con criterios opuestos. Gestión de usuarios excluye a `dev`;
`UsuariosConsultaService` (nombre de usuario en Registro, Registro Log y
Papelera) los necesita, porque hay entradas de `logs` y `papeleraEventos`
escritas por un `dev`. Cada consumidor filtra lo suyo.

**Autoregistro cerrado:** `register-user` (ex `sign-up`) y
`verify-email-address` eliminados junto con toda la maquinaria de
verificación de email que dependía de ellos
(`enviarEmailVerificacion`/`chequearVerificacionEmail`/
`actualizarEmailVerificado`) — innecesaria una vez que el alta la hace
`dev`/`admin` dando fe del mail. `resetearPassword` (recuperación de
contraseña de un usuario existente) es independiente y se mantiene.

### State management

El refactor arquitectónico migró el manejo de estado desde un store central único hacia
servicios por entidad:

**Módulos refactorizados** (Choferes, Proveedores, Clientes; Operaciones en progreso — subsistema Asignaciones: capa de servicios y fachada completas; switch completo de `tablero-diario` → `tablero-asignaciones` (tablero-diario, carga-tablero-diario y operaciones-table eliminados); `carga-multiple` migrado a `carga-asignacion` y switch completado (carga-multiple eliminado), con caller confirmado en tablero-op (`modalCargaMultiple()`); coordinadores `bajaOperacion`/`restaurarOperacion` en OperacionService completos (atómicos,
batch + log único), con `tablero-op` ya usando `bajaOperacion` como caller para la baja
de operaciones abiertas; `editarOperacion` ya existe en `OperacionService` (`servicios/operaciones/operacion.service.ts`), atómico, y lo usa `modal-detalle-op`):
cada entidad tiene su `XxxService` con un BehaviorSubject propio que mantiene el estado
en memoria (NO en localStorage). El `init()` del servicio abre el listener de Firestore
y se llama al arrancar la app. Los componentes se suscriben directamente al observable
del servicio.

**Store central viejo: eliminado por completo** (frente remanente de StorageService,
2026-11-04). El estado de datos vive sólo en los servicios por entidad. `localStorage`
queda para tres cosas, sin capa intermedia: la sesión (`usuarioSesion`, de
`UsuarioSesionService`), las preferencias de UI de `tablero-op` e `informe-op-listado`,
que cada componente lee y escribe directo, con su propia clave, y la marca de
última actividad (`ultimaActividad`, de `InactividadService`), compartida entre
pestañas a propósito: la sesión vence cuando todas estuvieron quietas. Nada borra
`localStorage` entero.

**Papelera:** el único mecanismo es `PapeleraService` sobre `papeleraEventos`/
`objetosEliminados` (skill `subsistema-papelera`), escrito atómico vía
`DbFirestoreService.commitBatch`/`commitEnTransaccion` + `LogRegistroService`, igual que el
resto de las escrituras. La colección vieja `papelera` queda en Firestore sin escritores
ni lectores (la Papelera legado se eliminó).

Flujo de datos en módulos refactorizados:
```
Lectura:   Firestore --(listener)--> XxxService (BehaviorSubject) --> Component
Escritura (alta/edición/baja simple, y baja/restauración con papelera):
           Component --> XxxService --> DbFirestoreService.commitBatch (log +
           evento de papelera incluidos) --> Firestore
```

### Capa de datos

`DbFirestoreService` (`servicios/database/db-firestore.service.ts`) envuelve todas las operaciones de Firestore. Todas las colecciones viven bajo `/Vantruck/datos/`. Colecciones principales: `operaciones`, `clientes`, `choferes`, `proveedores`, `tarifas`, `tarifasEspeciales`, `registrosOpEventuales`, `facturaCliente`, `facturaChofer`, `legajos`, `vendedores`, `comisionesVenta`, `liquidacionesVenta`, `movimientosFin`, `configuracion`, `logs`, `registroLog`, `users`.

### Sistema de tarifas

Resumen del modelo; el detalle (versionado, vigencia por fecha, motor, pantallas,
reglas, migración) está en la skill `modulo-tarifas`.

- **Tarifas:** `Tarifa` (`nivel` 'general' | 'personalizada'; `aCobrar`/`aPagar`/
  `aPagarProveedor` por categoría) y `TarifaEspecial` (parche de la General para una
  entidad), en las colecciones `tarifas` y `tarifasEspeciales`. Append-only: editar o
  aumentar crea una versión nueva. Eventual no tiene documento de tarifa: los valores se
  cargan por operación (`op.datosTarifaEventual`) y el historial queda en
  `registrosOpEventuales`.
- **Entidades:** `tarifasHabilitadas: RefTarifaHabilitada[]` (`Chofer`: `| null`, ver
  abajo). `RefTarifaHabilitada` (`interfaces/tarifa-habilitada.ts`) es solo `{ nivel }`
  ('general' | 'especial' | 'personalizada' | 'eventual'), sin id de tarifa: la tarifa
  concreta se elige POR OPERACIÓN entre las vigentes de los niveles habilitados. Reglas:
  al menos una entrada; 'eventual' solo como única (`validarTarifasHabilitadas`, en los 3
  factories). Para leerla: `nivelesHabilitados(lista)` (orden fijo personalizada,
  especial, general, eventual). Personalizada: solo Clientes.
- **Operación:** `tarifaAplicadaCliente/Chofer: RefTarifaAplicada | null` (elegida antes
  del alta y congelada), `valoresNuevos` (única fuente de valores), `datosTarifaEventual`
  (única marca de eventual: `!== null`), `adExtra` (entrada del adicional extra),
  `tarifaBaseManualCliente/Chofer?`, `multiplicadorCliente/Chofer`.

**Chofer de proveedor:** `tarifasHabilitadas: null` — no tiene tarifa propia, hereda la
del proveedor. Resolver SIEMPRE vía
`ProveedorService.resolverTarifasHabilitadasChofer(chofer)` (nunca leer
`chofer.tarifasHabilitadas` directo sin chequear `contratacion.tipo` antes).

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
- Las transiciones de estado viven en `OperacionFactoryService.estadoInicial`,
  `OperacionService` (cierre) e `InformeLiqService` (liquidar / revertir). El
  `LiquidacionService` viejo se retiró en el frente Lazy loading + fechas (LR1). El
  `EstadoOp` debería construirse siempre desde el factory de Operaciones, nunca con
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
| `autentificacion/` | `AuthService`: Firebase Auth (login, logout con carga completa de `/login`, reset de contraseña). No lee `/users`: espera el resultado de la reconciliación |
| `usuario-sesion/` | `UsuarioSesionService`: fuente única de la sesión en memoria (rol, uid, email), reconciliada con Firebase Auth vía `onAuthStateChanged` (único escritor de la sesión; `sesionResuelta()` para el guard). Getters síncronos, sin observable. `SesionInvalidaService`: red ante errores de sesión en los listeners del arranque (`vigilar()`) y salida compartida de un cierre forzado (`cerrarSesionForzada(motivo)`). `InactividadService`: vencimiento por inactividad. Funciones puras en `reconciliacion-sesion.util.ts`, `sesion-invalida.util.ts` e `inactividad.util.ts`. Diseño: `docs/disenos/eje-de-sesion.md` |
| `gestion-usuarios/` | `GestionUsuariosService.obtenerUsuarios` (lectura puntual de `/users` completo, sin filtro por rol) y `UsuariosConsultaService`: resuelve el nombre de usuario en Registro, Registro Log y Papelera (`cargar()` + `nombreDe(userId, userEmail)`, por uid y después por email). Lectura puntual en memoria, sin localStorage, una por pantalla; sólo `dev`/`admin` leen `/users`, el resto y cualquier fallo degradan a email |
| `database/` | CRUD Firestore |
| `log-registro/` | `LogRegistroService` (escritura, dentro del batch atómico de negocio) + `RegistroLogConsultaService` (lectura/paginación, para `RegistroLogComponent`) sobre `registroLog` — ver la skill `subsistema-log` |
| `papelera/` | `PapeleraService` (preparación de escrituras de baja/restauración por referencia, dentro del batch atómico de negocio) + `PapeleraConsultaService` (lectura/paginación, para `PapeleraComponent`) sobre `papeleraEventos`/`objetosEliminados` — ver la skill `subsistema-papelera` |
| `visualizador-objeto/` | `VisualizadorObjetoService` — dispatcher `coleccion -> modal de vista real`, usado por `RegistroLogComponent` y (desde el Frente Papelera) por `PapeleraComponent` vía el parámetro `snapshot` de `verObjeto` |
| `ficha-entidad/` | `FichaEntidadService.abrir(tipo, id)` (ficha de solo lectura de chofer / proveedor / cliente) y `EdicionEntidadService` ("Editar" desde la ficha, con `import()` dinámico de los modales de alta) — ver la skill `ficha-entidad` |
| `tarifario/` | Tarifario nuevo: `TarifarioService` (estado y escritura de `tarifas` / `tarifasEspeciales` / `registrosOpEventuales`), factories, `TarifaGuardadoService`, motor `ValoresTarifaService` y `ResolucionTarifaOpService` — ver la skill `modulo-tarifas` |
| `informes-op/` | `InformeOpService` (+ Factory) — `InformeOpNuevo` en la colección única `informesOp` (un doc por lado de cada operación, con `contraParte`). `armarEscriturasEdicion` (armado sin commit) + `editar` (armado + commit) |
| `informes-liq/` | `InformeLiqService` + `InformeLiqFactoryService` — `InformeLiqNuevo` en `informesLiq`: borradores, emisión, edición. Ver la skill `modulo-liquidacion` |
| `exportacion/` | Renderers GENÉRICOS de `DocumentoTabular` (`generar`) y `LibroTabular` (`generarLibro`, varias hojas con varias tablas) — no saben de qué informe se trata: `PdfTabularService` (jsPDF + autotable), `ExcelTabularService` (exceljs, con Tabla de Excel real cuando la tabla trae `excel`), formatos y logo compartidos. Librerías con import dinámico. Desde el frente Informes, TODO informe tabular de la app sale de acá, por la fachada de su dominio (la única excepción es el Recibo / Orden de pago, que no es una tabla) — ver la skill `exportacion-excel-pdf` |
| `reportes/resumenes-op/` | Resúmenes mensuales de operaciones (`resumenesOp`): `ResumenOpFactoryService` (pura: aporte de una op, claves, escrituras de cierre/edición/baja, agregados del Recálculo), `ResumenOpConsultaService` (solo lectura, pantallas), `TablaResumenConfigService` (columnas y fórmulas por modo), `ResumenOpExportService` (Excel/PDF) — ver la skill `modulo-reportes` |
| `vendedores/` | Vendedores y comisiones de venta: `VendedorService` (listener en memoria; alta/edición/asignación, desactivar/reactivar), `ComisionVentaFactoryService` (pura: escrituras de cierre/edición/baja sobre `comisionesVenta`), `ComisionVentaConsultaService` (solo lectura: mes, pendientes, tablero), `LiquidacionVentaService` (emitir/pagar/revertir/anular en transacción), `ComisionesExportService` (Excel/PDF) — ver la skill `modulo-vendedores` |
| `finanzas-nueva/` | Finanzas: `MovimientoFinService` (registrar, anular, imputar saldo, ajustes, cerrar saldo, devolución; cada gesto en transacción con log), `FinanzasConsultaService` (solo lectura, en vivo), `FinanzasExportService` (Excel/PDF de listados y cuenta), `ReciboPdfService` (Recibo / Orden de pago) — ver la skill `modulo-finanzas` |
| `configuracion/` | `ConfiguracionEmpresaService`: datos de la empresa (`configuracion/empresa`), lectura con caché y guardado con log — ver la skill `modulo-finanzas` |
| `numerador/` | Generación de IDs secuenciales (operaciones, facturas) |
| `validar/` | Validación de reglas de negocio |
| `formato-numerico/` | Formateo de números/moneda estilo Argentina |
| `fechas/` | `DateRangeService` (rango del tablero) y `toISODateString` (delega en `fechaNegocioDe`). El util único de fechas es `shared/utils/fecha.util.ts` — ver la skill `lazy-loading-y-fechas` |
| `desarrollo/` | Herramientas de `/migracion`. SOLO demo (guarda projectId `demoapplog` + rol dev): `LimpiezaDemoService`, `GeneradorOperacionesService` — ver la skill `herramientas-demo`; `GeneradorCircuitoService`, `GeneradorCobrosService` — ver la skill `modulo-finanzas`. En cualquier proyecto (rol dev + confirmación escrita del id de proyecto; se usa en la migración de Vantruck): `RecalculoResumenesService` — ver la skill `modulo-reportes`; `RecalculoComisionesService` — ver la skill `modulo-vendedores`; `NormalizacionFechaNacService` — ver la skill `ficha-entidad` |

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

Budget del bundle inicial: `demo` aviso 2 MB / error 3 MB (hoy 1,53 MB); `production`
6 / 7 MB; `vantruck` sin budget hasta la migración (ver la skill `migracion-vantruck`,
subsección "Checklist — migración a Vantruck: frente Lazy loading + fechas").

### Cloud Functions

Primera incorporación al proyecto (hasta ahora toda la lógica corría en
el cliente). Carpeta `functions/`, TypeScript, 2nd gen
(`firebase-functions/v2`), un solo codebase compartido entre los
proyectos `demo` y `vantruck` (mismo código, deploy independiente por
proyecto vía `--project`).

- `syncRoleClaim`: ver "Autenticación y roles".
- `crearUsuario`/`editarUsuario`/`editarEmailUsuario`/`eliminarUsuario`:
  ver "Autenticación y roles".
- `verificarVencimientosDocumentacion`: ver la skill `modulo-legajos`,
  subsección "Verificación periódica de vencimientos (Cloud Scheduler)".
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
momento. Ver la skill `migracion-vantruck`, subsección "Deuda abierta — alinear región de Cloud Functions en `pf-logistics`/Vantruck".

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
`asignaciones`: `user` puede leer/crear/eliminar, `demo` denegado en
`leer` y `crear` —`editar` y `eliminar` de `demo` no se prueban, así que
"sin ningún acceso" no está verificado por este script—, `admin` de
control — setea el Custom Claim directo vía Admin
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
- `legacySoloLectura`: colecciones legado fuera del alcance de este refactor
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
  ⚠️ **Corregido el 2026-11-10 (auditoría de la matriz de permisos):** este bucket decía
  tener "escritura real confirmada en código vivo". No la tiene: en `src/app` no queda
  ninguna referencia a las 16 colecciones fuera de comentarios y de un título de columna
  (`liq-gral.component.ts`, `tituloFacOpCliente`, que no es un path). El propósito
  declarado —que una escritura remanente falle visible en demo— ya no puede cumplirse
  porque no hay escritura que falle. El bucket se conserva igual: se deploya el día del
  corte sobre los datos de Vantruck y su revisión va a la skill `migracion-vantruck`. Si
  se retoma, el barrido tiene que hacerse sobre **cómo se construyen los paths**, no sobre
  los nombres literales: `DbFirestoreService` los compone.
- `historicoSoloLectura`: `logs` (log viejo) y `papelera` (Papelera legado),
  histórico congelado sin escritores en código desde que se eliminaron
  `LogService` y la Papelera legado. Lectura para `dev`/`admin`/`user`/`demo`
  (los mismos que leían antes); `crear`/`editar`/`eliminar` denegados a todos,
  **`dev` incluido**, para que cualquier escritura remanente falle visible.
  Separado de `legacySoloLectura` porque esa deja leer a cualquier rol
  autenticado y `manager` está denegado en todos los módulos a propósito.
  Los buckets `logs` y `papelera` siguen existiendo para `registroLog` y
  `papeleraEventos`/`objetosEliminados`. Si en la migración hay que limpiar
  esos documentos, se hace por consola, igual que con las otras colecciones
  legadas. Verificado con `functions/test-historico-rules.mjs` contra el
  emulador (100/100, incluida la regresión de las tres colecciones nuevas).
  Desplegado en demo: las reglas de demo se deployan a medida que se modifican,
  así que demo corre siempre con el archivo actualizado.
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
- `desarrollo`: módulo solo para `dev` (todas las acciones:
  `(modulo == 'desarrollo' && r == 'dev')` en `permitido()`), para las
  herramientas de desarrollo de demo. Hoy: `generacionesPrueba` (lotes del
  generador de operaciones). Ver la skill `herramientas-demo`.
- `noOperativo` → 'operaciones': colección anterior de no disponibilidad, **en
  desuso** (ningún código la lee ni la escribe). El mapeo queda hasta migrar sus
  datos a `noDisponibilidades` (→ 'operaciones'); ver "Deuda abierta".
- `informesOp` → módulo propio 'informesOp' (frente Reportes): `dev`/`admin`
  todo; `user` leer + crear (el cierre de una operación crea el par de
  InformeOp); `demo` leer. Antes estaba en 'finanzas' y el cierre fallaba
  por reglas con `user`.
- `resumenesOp` → módulo 'resumenes': `dev`/`admin` todo; `user` crear +
  editar, sin leer ni eliminar (el cierre escribe incrementos con
  `set`+merge, que las reglas evalúan como create o update según exista el
  doc); `demo` leer. `PermisosService.matrizBase` tiene las dos entradas
  por fidelidad. Verificado con `functions/test-cierre-rules.mjs` contra el
  emulador (16/16). Desplegado SOLO en demo. `resumenOpMensual` sigue en
  'finanzas' hasta la migración (la colección vieja existe en Vantruck).
- `comisionesVenta` → módulo 'comisiones' (frente Vendedores): `dev`/`admin`
  todo; `user` crear + editar (el cierre escribe con `set`+merge); `demo`
  leer. `liquidacionesVenta` → 'vendedores' (`dev`/`admin` todo; `demo`
  leer). Ruta del módulo Vendedores: `dev`/`admin`/`demo`.
  `PermisosService.matrizBase` por fidelidad. Verificado con
  `functions/test-vendedores-rules.mjs` contra el emulador (17/17).
  Desplegado SOLO en demo. `informesVenta` → 'operaciones' se conserva hasta
  la migración (la colección vieja existe en Vantruck).
- `movimientosFin` → 'finanzas' (frente Finanzas): `dev`/`admin` todo;
  `demo` leer. `configuracion` → módulo propio 'configuracion' (doc
  `configuracion/empresa`): `dev` todo; `admin` leer + crear + editar;
  `user`/`demo` leer (`PermisosService` + `ModuloPermiso` 'configuracion').
  Índice compuesto `informesLiq (estado, estadoFinanciero)`. Desplegado
  SOLO en demo. `movimientos` y `resumenFinanzas` (módulo viejo, retirado)
  conservan su mapeo a 'finanzas' hasta la migración (Vantruck tiene
  `resumenFinanzas`).

## Convenciones

- **Interfaces:** definidas en `src/app/interfaces/`. Usar siempre interfaces tipadas, nunca `any`.
- **Logging:** toda mutación de datos debe quedar registrada con acción (`ALTA`, `EDITAR`, `BAJA`, `RESTAURAR`), nombre de colección e ID del registro. Un solo mecanismo: `LogRegistroService` sobre la colección `registroLog`, con `agregarAlBatch` como una escritura más dentro del mismo batch o transacción atómica del negocio (y `registrarError` en el `catch`). El rol `dev` queda excluido del log. La colección vieja `logs` es histórico congelado, sin escritores: la lee sólo `RegistroComponent`, directo por `DbFirestoreService`. Detalle y cobertura: skill `subsistema-log`.
- **IDs secuenciales:** usar `NumeradorService` al crear operaciones o facturas — nunca generar IDs manualmente.
- **Locale argentino:** fechas en `dd/MM/yyyy`, miles con `.` y decimales con `,`. Hay servicios de formateo para ambos.
- **Fechas:** todo pasa por `shared/utils/fecha.util.ts`. Fecha de negocio = string 'YYYY-MM-DD', operada como string o por partes; nunca `new Date('YYYY-MM-DD')` (medianoche UTC = 21:00 del día anterior en Argentina) ni `toISOString()` para obtenerla (desde las 21:00 da mañana). "Hoy" = `hoyNegocio()` (huso fijo de Argentina, igual en el cliente y en las Cloud Functions). Instantes = ISO UTC completo (`new Date().toISOString()`), mostrados con `instanteLegible`. Detalle en la skill `lazy-loading-y-fechas`, subsección "Fechas".
- **Formularios:** Reactive Forms (`FormBuilder`). Directivas propias manejan CUIT, solo-letras, solo-números y fechas.
- **Modales:** `ng-bootstrap NgbModal`. Modales reutilizables en `shared/modales/`, específicos dentro del módulo feature.
- **Estilo de código:** respetar el estilo existente en cada archivo que se modifique — nombres de variables, indentación, estructura — sin imponer patrones nuevos salvo que se indique explícitamente.
- **Finales de línea:** LF en todo el repo, definido en `.gitattributes` (`* text=auto eol=lf`; solo `.bat`/`.cmd`/`.ps1` en CRLF) y `.editorconfig` (`end_of_line = lf`). Archivos nuevos en LF. Si una herramienta deja CRLF, Git lo normaliza al commitear.

## Forma de trabajo

- Antes de implementar: explicar qué va a hacer y cómo encaja con lo existente.
- Respuestas concretas, sin relleno.
- Si algo es ambiguo, preguntar antes de asumir.
- No refactorizar funcionalidades existentes salvo que se indique explícitamente.
- Cloud Functions están disponibles (plan Blaze) — evaluar caso por caso si una solución
  nueva conviene en el cliente o en una Cloud Function, sin asumir la vieja limitación del
  plan gratuito.
- Instrucciones para Claude Code: entregar en un único bloque de código (con botón de
  copiar), incluyendo razonamiento y todos los archivos/ediciones BUSCAR-REEMPLAZAR — no
  repartidas en varios bloques separados dentro de la respuesta.
- Acceso a datos de Firebase: lectura en **demo** permitida cuando hace falta para relevar o
  verificar. **Producción (Vantruck): nada, ni lecturas.** Escrituras, migraciones o deploys
  —reglas e índices incluidos—: **en ningún proyecto sin que se pida explícitamente.**
- Documentación (CLAUDE.md, skills, docs/): **no citar números de línea.** Se rompen con
  cada edición y una cita falsa manda a leer el código equivocado. Citar el archivo y el
  nombre del método (o del componente, la función, la sección del template).
- Antes de cambiar qué hace un gesto sobre una operación, ubicarlo en la máquina de
  estados (skill `modulo-operaciones`); no inferir la semántica leyendo el método suelto.

## Contexto adicional

- Desarrollador autodidacta — primer proyecto serio.
- Se planean apps complementarias futuras: depósito, ruteos, app para choferes.

## Patrones establecidos (invariantes del proyecto)

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
- `HomeComponent.ngOnInit` llama al arrancar la app el `init()` de seis catálogos:
  `ChoferService`, `ProveedorService`, `ClienteService`, `TarifarioService`,
  `CategoriaDocumentacionService` y `LegajoService`. Sus módulos de reglas están
  declarados en `MODULOS_ARRANQUE` (`home.component.ts`), que `invariante-rutas.spec.ts`
  cruza con los roles que admiten las rutas. `NoDisponibilidadService.init` también lo
  llama Home, pero condicionado a `puede('operaciones')` (hoy un no-op) y además lo
  llaman sus propios componentes. **No son del arranque:** `VendedorService.init`,
  `OperacionService.cargarOperaciones` y `AsignacionService.cargarFecha`, que los llaman
  sus propios componentes.
- **Ningún dato de otro usuario sobrevive en memoria** (frente eje de sesión, bloque 2c).
  Los catálogos que sólo inicia `HomeComponent` (Choferes, Proveedores, Clientes,
  Tarifario, CategoríaDocumentación, Legajos) cortan su suscripción anterior con un
  Subject `reinicio$`, vacían su estado y vuelven a suscribir en cada `init()`: el
  `destroy$` de un servicio root no se dispara nunca, y sin el corte cada recreación de
  `HomeComponent` sumaba listeners. Los que llaman varios componentes contando con que
  sea idempotente (`NoDisponibilidadService.init`, `VendedorService.init`) o que se
  re-cargan por rango o fecha (`OperacionService.cargarOperaciones`,
  `AsignacionService.cargarFecha`) vacían sólo si cambió el uid de la sesión (o si el
  listener murió); el borrador en curso del tablero de asignaciones no se le entrega a
  otro usuario. La red de fondo es la carga completa de `/login` del cierre de sesión.
  Un servicio nuevo con estado en memoria tiene que cumplir lo mismo.
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
visibilidad, documentación): migradas al mecanismo nuevo (ver la skill
`subsistema-log`). Escrituras de un solo doc: helpers privados `crearConLog()`/
`editarConLog()`/`eliminarConLog()` en el propio `XxxService`. Cascadas (entidad
principal + N relacionadas, ej. chofer + vehículos + legajo): un único
`EscrituraBatch[]`/`commitBatch` por cascada, armado a mano en el método (no vía los
helpers de 1 escritura), con un `agregarAlBatch` por cada escritura real — atomicidad
completa sin perder granularidad de log (Frente 2). **Baja con papelera (Frente
Papelera):** para Cliente/Chofer/Proveedor/Operación es un único
`EscrituraBatch[]`/`commitBatch` por cascada, igual que
alta/edición, con `PapeleraService.prepararBajaEnBatch()` armando el evento +
objetos archivados por referencia (en vez de un objeto compuesto embebido) y
`restaurarXxx()` en el `XxxService` dueño para la restauración — ver la skill
`subsistema-papelera`.

### Operaciones compuestas
Las operaciones que afectan múltiples entidades viven en XxxService, no en el componente:
- `guardarXxxConRelaciones()`: alta/edición de entidad principal + entidades relacionadas
- `eliminarXxxConRelaciones()`: baja en cascada + papelera

### Tablas

Dos componentes de tabla, no uno. `TablaGenericaComponent` es el de los listados CRUD;
`TablaListadoComponent` (`shared/tabla/tabla-listado/`, selector `app-tabla-listado`) es el
camino nuevo, usado por Finanzas y Facturación — ver "Tabla de listado" más abajo.

`TablaGenericaComponent` para los listados CRUD:
- El componente padre define `columnas: ColumnaTabla[]`, arma `filas: any[]`
  con los datos aplanados y `_objeto` como referencia al original,
  y define `acciones: AccionTabla[]` con handlers
- El filtro de visibilidad (visibles/todos) lo maneja el padre
- Los botones del toolbar (alta, descarga, visibilidad) quedan fuera de la tabla
- Celdas: `claseCelda` (badge) y `accionCelda` (enlace que ejecuta una acción, ej. abrir
  la ficha de entidad), los dos opcionales

### Tabla de listado

`TablaListadoComponent` (`shared/tabla/tabla-listado/`, genérico `<T>`), con sus interfaces
en `interfaces/tabla-listado.ts`. Es el camino nuevo y **el lugar donde hoy vive el gating
por permiso de las acciones de fila** en Finanzas y Facturación.

- **No filtra:** el caller le pasa `items` ya filtrado y lo recalcula cuando cambian datos o
  filtros, no con un getter. Ordena internamente por encabezado.
- `ColumnaListado<T>`: `key`, `label`, `valor(item)`, `orden?` (sin ella la columna no es
  ordenable), `tipo` (`'texto'` | `'numero'` | `'moneda'`), `align`, `clase` (estática o por
  fila) y `enlace?(item)`, que muestra la celda como `[routerLink]`.
- `AccionListado<T>`: `id` (identidad de negocio — es lo que emite `(accion)` y lo que lee el
  caller), `label`, `clase`, **`permiso?: 'modulo.accion'`** (misma sintaxis que
  `*appPermiso`), `visible?(item)` y `deshabilitada?(item)`.
- **El componente inyecta `PermisosService`** y resuelve `permiso` en `tienePermiso`,
  filtrando a `accionesPermitidas` en `ngOnChanges` cuando cambia el input `acciones`. Sin
  permiso la acción **no se muestra** (se oculta, no se deshabilita) — mismo criterio que
  `*appPermiso` y que el getter `visible` de los `app-btn-*`. Sin el campo `permiso`, la
  acción siempre se muestra.
- **Permiso y regla de negocio quedan separados:** `permiso` decide si la acción existe;
  `deshabilitada(item)` y el input `bloqueada` deciden si está habilitada. `ejecutar()`
  repite el chequeo antes de emitir.
- A diferencia de los `app-btn-*`, el `(click)` vive en el `<button>` real del componente y
  el caller escucha el `@Output() accion`: **no tiene el bug del listener en el host** (ver
  la skill `botones-y-permisos`).
- Evalúa el permiso una sola vez por cambio de `acciones`, igual que `*appPermiso` en su
  setter.
- Consumidores (21 acciones): `finanzas-cuentas`, `cuenta-entidad`, `listado-movimientos`,
  `borradores-liq`, `facturacion-emitidos`, `facturacion-facturados` y
  `facturacion-revertidos`.

### Formularios en modo vista
Usar `form.disable()` y `formTipoTarifa.disable()` en ngOnInit cuando
`fromParent.modo === 'vista'`, no clases CSS.

### Migración de datos
Cada módulo tiene su XxxMigrationService con:
- Backup previo via MigrationBackupService
- Transformación de documentos con mapeo viejo→nuevo de IDs
- Verificación final de cantidad de documentos
- Métodos de corrección separados para limpiar campos residuales

### Operatoria compleja atómica (Operaciones en adelante)

Los módulos con operatorias que afectan varias entidades de forma atómica (alta de N ops + tablero) escriben **directo a `DbFirestoreService`** mediante un batch o transacción atómica (`commitBatch` / `commitEnTransaccion`), con el log como una escritura más dentro de ese mismo batch (`LogRegistroService.agregarAlBatch`).

**Distinción clave (cuántas entradas de log deja un gesto, tal como está en el código):**
- *CRUD por entidad y sus cascadas* (Choferes/Clientes/Proveedores con vehículos y legajo, y sus bajas/restauraciones con papelera): **una entrada por escritura real** (un `agregarAlBatch` por cada entidad tocada), todas en el mismo batch — atomicidad sin perder granularidad (skill `subsistema-log`, "Granularidad de LOG preservada" y Frente 2).
- *Operatoria compleja de Operaciones* (`altaDesdeAsignacion`, `bajaOperacion`, `bajaOperacionCerrada`, `cerrarOperacion`, `restaurarOperacion`): **una entrada por gesto** (la acción principal del usuario), puesta por el coordinador; los movimientos derivados (tablero, InformeOp, resúmenes, comisiones) no loguean por separado y las piezas no loguean. Excepción vigente: `editarOperacion` deja dos entradas, EDITAR de la operación y EDITAR del tablero (`AsignacionService.agregarEscrituraActualizarItem` agrega la suya).

**Reglas:**
- **Log:** según el caso de arriba. En Operaciones, el log vive en el método coordinador, no en las piezas.
- **Coordinación entre servicios:** el servicio primario (`OperacionService`) inyecta al secundario (`AsignacionService`), nunca al revés. El coordinador decide el CONTENIDO del batch (negocio); `DbFirestoreService` EJECUTA el batch (mecánica Firestore).
- **Pre-generación de id:** para que un documento referencie el id de otro dentro de un batch, se pre-genera el doc id (`generarId`) antes del commit.
- **Punto de entrada único:** el componente llama al coordinador (`altaDesdeAsignacion`), no a los servicios parciales por separado.

> Ya retro-aplicado a los casos compuestos de Choferes/Proveedores (chofer + vehículos + legajo): un único `commitBatch` por cascada desde el Frente 2 (skill `subsistema-log`).

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

- **Dos orquestadores de baja, por gesto** (`OperacionService`, ambos con
  `commitEnTransaccion`; la operación, el tablero y los InformeOp se releen
  frescos dentro de la transacción):
  - `bajaOperacion(op, motivo)` — operación ABIERTA, desde tablero-op.
    Rechaza cerradas ("se da de baja desde Liquidación").
  - `bajaOperacionCerrada(idInfOp, motivo)` — operación CERRADA, desde
    InformeOpListado (tacho por InformeOp, permiso `liquidaciones.eliminar`).
- **Reglas** (`validarBaja(op, cicloEsperado)`): sin liquidación ni proforma
  en ningún lado; ciclo igual al esperado. En la cerrada, además: el
  InformeOp y su contraparte existen, son de esa operación, están en
  'activo' y sin `idInfLiq`. Falta la contraparte → inconsistencia, aborta.
- **Piezas encapsuladas** (empujan EscrituraBatch, no commitean, no loguean):
  `OperacionService.agregarEscriturasBaja` (delete op + papelera + item de
  tablero anulado), `AsignacionService.leerTableroEnTransaccion` /
  `agregarEscrituraAnularItem`, `InformeOpService.leerEnTransaccion` /
  `agregarAnulacionInformeOp`, `ResumenOpFactoryService.escriturasSuma(op, -1)`
  (resta en `resumenesOp` con `'fusionar'`, sin lecturas — ver la skill
  `modulo-reportes`). Un único log BAJA por gesto, lo pone el orquestador.
- **InformeOp en la baja de una cerrada: se ANULAN, no se borran.**
  `existeParaOperacion` ignora los anulados, así que la operación restaurada
  se puede volver a cerrar (genera un par nuevo). Con `anulacion` {motivo,
  usuario, fecha, idEventoPapelera} (tipo `Anulacion` compartido en
  interfaces/anulacion.ts; `AnulacionLiq` es alias).
- **Resúmenes:** se revierten solo si `op.resumenProcesado`. Desde el frente
  Reportes, `escriturasSuma(op, -1)` resta el MISMO aporte que sumó el
  cierre, calculado desde la op (NUNCA leyendo el valor interno de
  `increment()`: propiedad minificada del SDK; así estaba antes del frente
  Operaciones y podía no restar nada, en silencio). Si el doc del resumen no
  existía, el merge lo crea en negativo y el Recálculo lo detecta (antes se
  omitía en silencio).
- **restaurarOperacion** (transaccional) deja la op en 'abierta' y NO descarta
  datos cargados por el usuario. Resetea exactamente tres cosas, ninguna
  removible: `estado` (`estadoInicial()`), `resumenProcesado: false` (si no,
  `cerrarOperacion` la rechaza para siempre) e `informeOpCliente/Chofer: ''`
  (los InformeOp quedaron anulados). Aborta si ya existe la op o si el tablero
  no tiene su item. Los InformeOp no se reconstruyen. Contrato completo y
  máquina de estados: skill `modulo-operaciones`.
- **Item de asignación:** nunca se borra, se anula/reactiva
  (`anularItemEnLista`/`reactivarItemEnLista`).
- ~~Fuera de alcance: InformeVenta del cierre (comisiones) quedan sin tocar
  en la baja de una cerrada~~ — RESUELTO en el Frente Vendedores: la baja
  de una cerrada escribe `escriturasBaja` sobre `comisionesVenta`.

## Conocimiento por módulo

El detalle de cada módulo y subsistema vive en skills que se cargan cuando corresponde, no en
este archivo. Antes de trabajar sobre un módulo, leer su skill.

| Módulo / tema | Skill |
|---|---|
| Operaciones: al tocar operaciones, tableros, operaciones-editor, carga-asignacion o no-disponibilidad | `modulo-operaciones` |
| Legajos: al tocar legajos, vencimientos o Storage | `modulo-legajos` |
| Liquidación: al tocar liquidaciones o `InformeLiqNuevo` | `modulo-liquidacion` |
| Facturación: al tocar emitidos, facturados, revertidos, vinculación de facturas o el estado de un InformeLiq (máquina de estados) | `modulo-facturacion` |
| Tarifas: al tocar tarifas, tarifas habilitadas o el cálculo de valores | `modulo-tarifas` |
| Reportes: al tocar reportes o `resumenesOp` | `modulo-reportes` |
| Vendedores: al tocar vendedores o comisiones | `modulo-vendedores` |
| Finanzas: al tocar cobros, pagos, cuentas o `movimientosFin` | `modulo-finanzas` |
| Log: al escribir cualquier mutación que deba loguearse o tocar el registro | `subsistema-log` |
| Papelera: al tocar bajas, restauraciones o la papelera | `subsistema-papelera` |
| Botones y permisos: al tocar botones de acción, `PermisosService` o visibilidad por rol | `botones-y-permisos` |
| Excel/PDF: al tocar cualquier informe descargable | `exportacion-excel-pdf` |
| Lazy loading y fechas: al tocar routing, módulos, bundle o fechas | `lazy-loading-y-fechas` |
| Ficha de entidad: al tocar la ficha o enlaces a ella | `ficha-entidad` |
| Herramientas de demo: al tocar `/migracion`, la limpieza o el generador | `herramientas-demo` |
| Migración a Vantruck: antes de planificar o ejecutar la migración o un deploy a `pf-logistics` | `migracion-vantruck` |
| Shells con pestañas: al crear o modificar un componente `*-control` con pestañas | `shells-con-pestanas` |

## Deuda abierta

Deuda técnica activa. Actualizar cuando se salda.

- **Región de Cloud Functions en Vantruck** — las funciones de `pf-logistics` siguen en la región default: alinearlas a `southamerica-east1` exige delete + recreate (corte en producción) y agregar `functionsRegion` a `environment.vantruck.ts`. Detalle: skill `migracion-vantruck`.
- **Bucket de Storage de `pf-logistics`** — antes de llevar Legajos a producción hay que confirmar que el bucket existe, tiene CORS y tiene `storage.rules` desplegadas. Detalle: skill `migracion-vantruck`.
- **Herramienta de recálculo de tarifas (sólo en `main`)** — existe en producción (`98edb35`) y no en `refactor`; hay que reimplementarla sobre el modelo nuevo porque `RefTarifaAplicada` queda congelada al cerrar y una tarifa con vigencia retroactiva no corrige las operaciones ya cerradas. Detalle: skill `migracion-vantruck`.
- **`editarOperacion` puede fallar sin devolver `Resultado`** — arma la escritura del tablero antes del `try`: si no hay tablero para la fecha, la excepción se escapa sin `Resultado` ni `registrarError` y el usuario no se entera. Detalle: skill `modulo-operaciones`.
- **Baja y restauración de operaciones — pendientes chicos** — la guarda "el tablero no tiene el item" de `restaurarOperacion` quedó sin probar (falla cerrada; probablemente aparezca en la migración); ops cerradas con `resumenProcesado` falsy (legado) no restan en la baja pero suman al recerrar (verificar si existen, se corrige con el Recálculo de `/migracion`); dos títulos distintos para el éxito de la baja y el tacho de `informe-op-listado` sin deshabilitar mientras `guardando`. Detalle: skill `modulo-operaciones`.
- **`timestamp` del tablero al anular o reactivar un item** — el camino nuevo no lo actualiza (el legado, `AsignacionService.reactivarItem`, ya eliminado, sí lo hacía). **Antes de arreglarlo, verificar qué lee ese `timestamp`:** si algo lo usa para invalidar caché, una baja o una restauración son invisibles para ese mecanismo. Detalle: skill `modulo-operaciones`.
- **Preguntas abiertas de baja y restauración** — si `firestore.rules` impone algo según el estado de la op; coherencia en datos entre `op.estado` y los InformeOp; `lockLiquidacion` (en la interfaz, la restauración lo conserva, nadie sabe si se lee o escribe: posible campo muerto); items del tablero sin `idOperacion` coincidente. Detalle: skill `modulo-operaciones`.
- **Deuda menor del tablero de asignaciones** — el borrador del tablero se pierde con F5. Detalle: skill `modulo-operaciones`.
- **operaciones-editor / Tarifas** — estilos SCSS de tarifa duplicados sin consolidar, y el patrón `@if` obligatorio para bindear tarifas nullable. Detalle: skill `modulo-operaciones`.
- **Fix de altura del modal limitado a `tablero-op`** — el ajuste que estira `carga-asignacion` dentro del modal vive en `tablero-op.component.scss`: otro caller que abra ese modal tiene que replicarlo. Detalle: skill `modulo-operaciones`.
- **Migración de `noOperativo`** — la colección anterior de no disponibilidad quedó sin lectores: 6 documentos en demo y los de producción (2 vigentes al relevar), con la forma y el trabajo de "Datos de la colección anterior" en `docs/disenos/no-disponibilidad.md`. **Va después de la migración de Choferes**: 3 de los 6 de demo tienen `idChofer` numéricos del modelo viejo que sólo resuelven con su mapeo; al revés, se pierden.
- **Mapeo de `noOperativo` en `firestore.rules`** — se saca recién cuando termine esa migración.
- **`manager` declarado sin rutas ni permisos** — saldada la parte C1 del eje de sesión (ya no pasa ningún `canMatch`, así que no vuelve a ver la app vacía con `permission-denied`: cualquier URL lo manda a `/limbo` y el login lo deposita ahí). Lo que queda: el rol existe en `RolUsuario`, `matrizBase` lo deniega en los diez módulos y no hay ningún usuario con él. Retirarlo queda para después del corte — es mecánico y TypeScript encuentra cada sitio, pero toca 40 celdas de `matrizBase`, la validación de `crearUsuario` y el desplegable de gestión. Mientras no tenga ningún permiso propio, su comportamiento **no es verificable al nivel de las reglas**: no hay nada que lo distinga de un token sin rol. Detalle: `docs/disenos/reglas-y-matriz-de-permisos.md`, 2.1.
- **Un `signOut` que falla se deshace en el próximo F5** (C6 del eje de sesión) — `cerrarSesion` limpia la sesión de la app antes del `signOut`; si `signOut` lanza, Auth queda autenticado y la reconciliación del próximo arranque reconstruye la sesión. Aceptado: `signOut` es local y muy raro que falle. No se construyó una marca de "cierre pedido".
- **Huecos conocidos en la cobertura del LOGOUT** — un cierre por la red de sesión inválida no escribe LOGOUT (no es un gesto y no hay token con el que escribirlo; el cierre por inactividad sí lo escribe), y el LOGOUT de `cerrarSesion` y el del cierre por inactividad se esperan como mucho 3 s antes de la recarga: sin conexión se pierden (antes, el logout quedaba colgado para siempre). Detalle: skill `subsistema-log`.
- **Listeners fuera de la red de sesión inválida** — si su sesión muere, no avisan. Cumplen el invariante de memoria del bloque 2c, no el de la red. Los 11 usos de `vigilar()` cubren sólo el arranque: `ChoferService.init` (×2), `ProveedorService.init`, `ClienteService.init`, `TarifarioService.init` (×3), `CategoriaDocumentacionService.init`, `LegajoService.init`, `NoDisponibilidadService.init` y `OperacionService.cargarOperaciones`. **Quedan afuera 14** (lista completa al 2026-11-10, auditoría de capas de acceso): `VendedorService.init`, `AsignacionService.cargarFecha`, `AsignacionService.getTableroPorFecha`, `VencimientosComponent.ngOnInit`, `RegistroComponent.consultarRegistro`, los cinco de `FinanzasConsultaService` (`observarInformesAbiertos`, `observarMovimientosConSaldo`, `observarMovimientosPorFecha`, `observarCuentaEntidad`, `observarFacturadosPorFechaFactura`), `InformeLiqConsultaService.observarPorEstado`, `InformeLiqService.observarBorradores`, `InformeOpService.observarPorPeriodo` y `observarAnuladosPorPeriodo`, `LiquidacionVentaService.observarPorPeriodos`, `ComisionVentaConsultaService.observarDelMes` y `observarPendientes`, y `ResumenOpConsultaService.observar`. Antes esta entrada nombraba sólo los dos primeros.
- **Preferencias de UI compartidas entre usuarios del mismo navegador** — las cinco claves de `localStorage` de `tablero-op` e `informe-op-listado` ya no se borran en el login: el cliente o chofer filtrado por un usuario le aparece al siguiente. Arreglo: namespacearlas por uid. Detalle: skill `modulo-operaciones`.
- **`/carga` sin propósito claro** — sólo espera 3 s y navega a `/op`. Si el valor es visual, la espera debería justificarse; si no, la pantalla sobra. Dato para la decisión: desde el eje de sesión, `index.html` tiene un spinner de arranque, así que el camino del login tiene ese spinner **y** los 3 s de `/carga`. Frente de UX.
- **Filtro por colección del Registro de actividad incompleto** — `COLECCIONES_REGISTRO_LOG` (`registro-log-consulta.service.ts`) no tiene 10 colecciones que ya escriben en `registroLog`: `users`, `informesOp`, `informesLiq`, `movimientosFin`, `tarifas`, `tarifasEspeciales`, `registrosOpEventuales`, `vendedores`, `liquidacionesVenta` y `configuracion`. Sus entradas se ven sin filtrar, pero no se pueden filtrar por colección. Detalle: skill `subsistema-log`.
- **Cuatro copias de `escapar`** — en `modal-no-disponibilidad`, `operaciones-editor`, `vendedor-historial` y `shared/utils/texto-html.util.ts`: unificar sobre `escaparHtml`/`textoAHtml` del util.
- **Filtros vs. listener en background (frente futuro)** — en `tablero-op` los datos pueden quedar congelados al volver de background mientras los filtros muestran otro período; las suscripciones a `operaciones$` no manejan errores. Detalle: skill `modulo-operaciones`.
- **Permisos de UI dispersos — lo que queda** — de los 7 `esRol()` que gateaban UI se migraron 5 en el frente de reglas y matriz. Faltan `PapeleraComponent.puedeRestaurar` e `InformeOpAnuladosComponent.puedeVerPapelera`, que mezclan regla de negocio con rol y necesitan diseño (bloque 10). Y aparte quedan **7 comparaciones de rol directas** en los componentes de Tarifas (`['dev','admin'].includes(usuario.role)` y `esDev`): no usan `esRol`, así que un barrido de ese símbolo no las encuentra (bloque 8). Detalle: skill `botones-y-permisos` y `docs/disenos/reglas-y-matriz-de-permisos.md`.
- **Tarifas tras el cierre** — quedan residuos inertes en datos de demo (`idTarifa`/`tarifaAsignada`, `adExtra: null`) y `tarifa-gral-cliente.ts` sigue vivo por la Liquidación vieja. Detalle: skill `modulo-tarifas`.
- **Migración conjunta Choferes/Vehículos/Legajos** — los IDs legacy se resuelven por relación cruzada, así que esas colecciones no se pueden migrar aisladas; revisar también las `fechaVto` en milisegundos. Detalle: skill `migracion-vantruck`.
- **El ajuste atrapado** — un ajuste imputado sólo se puede quitar anulando el movimiento, y sólo mientras el informe siga en `'facturado'`; un ajuste vigente sobre un informe en cualquier otro estado no se puede quitar por ningún camino existente. La app hoy no lo produce; los ajustes de `'apertura'` de la migración tienen que imputarse sobre informes `'facturado'` o nacen atrapados. Detalle: skill `modulo-finanzas` (y `migracion-vantruck`).
- **Facturación (InformeLiqNuevo)** — falta la carga manual de facturas sin QR, `'anulado'` no tiene escritor, queda un `console.log` del QR y hay que rotar las anon keys de Supabase. Detalle: skill `modulo-facturacion`.
- **Reportes (`resumenesOp`)** — checklist de migración pendiente; `app-filtro-periodo` puede dar 11 meses los días 29–31; un listener por mes y clave. Detalle: skill `modulo-reportes`.
- **Vendedores** — checklist de migración pendiente; pagar una liquidación no genera movimiento financiero y restaurar un cliente no revalida vendedores desactivados. Detalle: skill `modulo-vendedores`.
- **Finanzas** — checklist de migración pendiente (incluida la apertura de saldos); las cuentas se calculan en memoria sin agregado y los generadores de demo no son idempotentes. Detalle: skill `modulo-finanzas`.
- **Generador y datos de demo** — en eventuales el pago al chofer puede superar el cobro y la limpieza no toca Storage. Detalle: skill `herramientas-demo`.
- **Tras Lazy loading + fechas** — el `<h1>` sin cerrar de `index.html` envuelve toda la app y `src/test.ts` quedó como resto sin uso. Detalle: skill `lazy-loading-y-fechas`.
- **Tras Ficha de entidad** — ng-bootstrap 15 sobre Angular 20 falla en runtime con `hostDirectives` (NG0309) y quedan anonimizadores de prueba sin uso. Detalle: skill `ficha-entidad`.
- **CHANGELOG con huecos** — 18 de los últimos 25 commits (al 2026-11-04) no tienen entrada: el frente no-disponibilidad completo, papelera y restauración, tooling y documentación. Antes de completarlo hay que decidir dos cosas: la granularidad (una entrada por commit o una por frente) y si el archivo aporta hoy algo que no esté ya en las skills y en los mensajes de commit.
- **Nombre de entidad como enlace a la ficha (frente futuro)** — el pedido F7 del cliente, ampliado a ≈ 34 plantillas, con análisis de riesgos y etapas ya hecho. Detalle: skill `ficha-entidad`.
