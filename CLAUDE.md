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
npm test                    # Tests con Karma
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
├── servicios/         # 22 servicios especializados
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
- `RoleGuard`: `canMatch` en las rutas de `raiz-routing` (un rol sin acceso no descarga
  el chunk) y `canActivate` en las rutas internas de cada módulo. Los dos devuelven
  `true | UrlTree`; nunca `false` en `canMatch` (el router seguiría buscando y caería en
  `'**'`).

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

`DbFirestoreService` (`servicios/database/db-firestore.service.ts`) envuelve todas las operaciones de Firestore. Todas las colecciones viven bajo `/Vantruck/datos/`. Colecciones principales: `operaciones`, `clientes`, `choferes`, `proveedores`, `tarifas`, `tarifasEspeciales`, `registrosOpEventuales`, `facturaCliente`, `facturaChofer`, `liquidaciones`, `legajos`, `vendedores`, `comisionesVenta`, `liquidacionesVenta`, `movimientosFin`, `configuracion`, `logs`, `registroLog`, `users`.

### Sistema de tarifas

Resumen del modelo; el detalle (versionado, vigencia por fecha, motor, pantallas,
reglas, migración) está en "Frente Tarifas — tarifario nuevo".

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
| `autentificacion/` | Firebase Auth, sesión de usuario |
| `usuario-sesion/` | Fuente única de la sesión en memoria (rol, uid, email del usuario logueado). Sin listener — no reactivo en vivo. |
| `database/` | CRUD Firestore |
| `storage/` | Estado de módulos no migrados (BehaviorSubjects + localStorage) y capa de escritura/logging centralizada para todos los módulos |
| `log/` | Log de actividad viejo (colección `logs`) — sigue activo para lo no migrado (ver "Frente Log") |
| `log-registro/` | `LogRegistroService` (escritura, dentro del batch atómico de negocio) + `RegistroLogConsultaService` (lectura/paginación, para `RegistroLogComponent`) sobre `registroLog` — ver "Frente Log — mecanismo unificado" |
| `papelera/` | `PapeleraService` (preparación de escrituras de baja/restauración por referencia, dentro del batch atómico de negocio) + `PapeleraConsultaService` (lectura/paginación, para `PapeleraComponent`) sobre `papeleraEventos`/`objetosEliminados` — ver "Frente Papelera — mecanismo de referencia" |
| `visualizador-objeto/` | `VisualizadorObjetoService` — dispatcher `coleccion -> modal de vista real`, usado por `RegistroLogComponent` y (desde el Frente Papelera) por `PapeleraComponent` vía el parámetro `snapshot` de `verObjeto` |
| `ficha-entidad/` | `FichaEntidadService.abrir(tipo, id)` (ficha de solo lectura de chofer / proveedor / cliente) y `EdicionEntidadService` ("Editar" desde la ficha, con `import()` dinámico de los modales de alta) — ver "Frente Ficha de entidad" |
| `tarifario/` | Tarifario nuevo: `TarifarioService` (estado y escritura de `tarifas` / `tarifasEspeciales` / `registrosOpEventuales`), factories, `TarifaGuardadoService`, motor `ValoresTarifaService` y `ResolucionTarifaOpService` — ver "Frente Tarifas — tarifario nuevo" |
| `informes-op/` | `InformeOpService` (+ Factory) — `InformeOpNuevo` en la colección única `informesOp` (un doc por lado de cada operación, con `contraParte`). `armarEscriturasEdicion` (armado sin commit) + `editar` (armado + commit) |
| `informes-liq/` | `InformeLiqService` + `InformeLiqFactoryService` — `InformeLiqNuevo` en `informesLiq`: borradores, emisión, edición. Ver "Frente Liquidación — InformeLiqNuevo" |
| `exportacion/` | Renderers GENÉRICOS de `DocumentoTabular` (`generar`) y `LibroTabular` (`generarLibro`, varias hojas con varias tablas) — no saben de qué informe se trata: `PdfTabularService` (jsPDF + autotable), `ExcelTabularService` (exceljs, con Tabla de Excel real cuando la tabla trae `excel`), formatos y logo compartidos. Librerías con import dinámico. Desde el frente Informes, TODO informe tabular de la app sale de acá, por la fachada de su dominio (la única excepción es el Recibo / Orden de pago, que no es una tabla) — ver "Frente Informes Excel/PDF" |
| `reportes/resumenes-op/` | Resúmenes mensuales de operaciones (`resumenesOp`): `ResumenOpFactoryService` (pura: aporte de una op, claves, escrituras de cierre/edición/baja, agregados del Recálculo), `ResumenOpConsultaService` (solo lectura, pantallas), `TablaResumenConfigService` (columnas y fórmulas por modo), `ResumenOpExportService` (Excel/PDF) — ver "Frente Reportes" |
| `vendedores/` | Vendedores y comisiones de venta: `VendedorService` (listener en memoria; alta/edición/asignación, desactivar/reactivar), `ComisionVentaFactoryService` (pura: escrituras de cierre/edición/baja sobre `comisionesVenta`), `ComisionVentaConsultaService` (solo lectura: mes, pendientes, tablero), `LiquidacionVentaService` (emitir/pagar/revertir/anular en transacción), `ComisionesExportService` (Excel/PDF) — ver "Frente Vendedores" |
| `finanzas-nueva/` | Finanzas: `MovimientoFinService` (registrar, anular, imputar saldo, ajustes, cerrar saldo, devolución; cada gesto en transacción con log), `FinanzasConsultaService` (solo lectura, en vivo), `FinanzasExportService` (Excel/PDF de listados y cuenta), `ReciboPdfService` (Recibo / Orden de pago) — ver "Frente Finanzas" |
| `configuracion/` | `ConfiguracionEmpresaService`: datos de la empresa (`configuracion/empresa`), lectura con caché y guardado con log — ver "Frente Finanzas" |
| `numerador/` | Generación de IDs secuenciales (operaciones, facturas) |
| `validar/` | Validación de reglas de negocio |
| `formato-numerico/` | Formateo de números/moneda estilo Argentina |
| `fechas/` | `DateRangeService` (rango del tablero) y `toISODateString` (delega en `fechaNegocioDe`). El util único de fechas es `shared/utils/fecha.util.ts` — ver "Frente Lazy loading + fechas" |
| `desarrollo/` | Herramientas de `/migracion`. SOLO demo (guarda projectId `demoapplog` + rol dev): `LimpiezaDemoService`, `GeneradorOperacionesService` — ver "Herramientas de desarrollo (solo demo)"; `GeneradorCircuitoService`, `GeneradorCobrosService` — ver "Frente Finanzas". En cualquier proyecto (rol dev + confirmación escrita del id de proyecto; se usa en la migración de Vantruck): `RecalculoResumenesService` — ver "Frente Reportes"; `RecalculoComisionesService` — ver "Frente Vendedores"; `NormalizacionFechaNacService` — ver "Frente Ficha de entidad" |

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
6 / 7 MB; `vantruck` sin budget hasta la migración (ver "Checklist — migración a
Vantruck: frente Lazy loading + fechas").

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
- `desarrollo`: módulo solo para `dev` (todas las acciones:
  `(modulo == 'desarrollo' && r == 'dev')` en `permitido()`), para las
  herramientas de desarrollo de demo. Hoy: `generacionesPrueba` (lotes del
  generador de operaciones). Ver "Herramientas de desarrollo (solo demo)".
- `noOperativo` → 'operaciones': agregado en el frente Generador. Faltaba en
  `moduloDe()` y la lectura directa de no-disponibilidades desde el SDK web
  fallaba con "Missing or insufficient permissions" (fail-safe).
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
- **Logging:** toda mutación de datos debe quedar registrada con acción (`ALTA`, `EDITAR`, `BAJA`, `RESTAURAR`), nombre de colección e ID del registro. El rol `dev` queda excluido del log. Dos mecanismos conviven: el nuevo `LogRegistroService` (colección `registroLog`, log como escritura dentro del mismo batch atómico de negocio — usar este para código nuevo en los módulos ya migrados) y el viejo `LogService` (colección `logs`, log como llamada separada después del write — sigue vigente para lo no migrado). Ver la skill `subsistema-log` para el detalle de qué está migrado y qué no.
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
visibilidad, documentación): migradas al mecanismo nuevo (ver la skill
`subsistema-log`). Escrituras de un solo doc: helpers privados `crearConLog()`/
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
`restaurarXxx()` en el `XxxService` dueño para la restauración — ver la skill
`subsistema-papelera`.

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
- Celdas: `claseCelda` (badge) y `accionCelda` (enlace que ejecuta una acción, ej. abrir
  la ficha de entidad), los dos opcionales

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
- **restaurarOperacion** SIEMPRE deja la op en 'abierta' (`estadoInicial()`,
  `km: 0`, `resumenProcesado: false`, `informeOpCliente/Chofer: ''`). Los
  InformeOp no se reconstruyen.
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
| Facturación: al tocar emitidos, facturados, revertidos o vinculación de facturas | `modulo-facturacion` |
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
- **Restaurar operaciones desde la Papelera legado** — `PapeleraLegadoComponent.addItem` sigue restaurando operaciones por `TableroService.altaOperacionYActualizarTablero`, que no es atómico y loguea con el `LogService` viejo; el resto de la deuda de callers está saldado. Detalle: skill `modulo-operaciones`.
- **Deuda menor del tablero de asignaciones** — la no-disponibilidad no está probada end-to-end y el borrador del tablero se pierde con F5. Detalle: skill `modulo-operaciones`.
- **operaciones-editor / Tarifas** — estilos SCSS de tarifa duplicados sin consolidar, y el patrón `@if` obligatorio para bindear tarifas nullable. Detalle: skill `modulo-operaciones`.
- **Fix de altura del modal limitado a `tablero-op`** — el ajuste que estira `carga-asignacion` dentro del modal vive en `tablero-op.component.scss`: otro caller que abra ese modal tiene que replicarlo. Detalle: skill `modulo-operaciones`.
- **No-disponibilidad y tablero** — falta el rediseño del modelo (hoy solo cubre choferes; la regla vive en `no-disponibilidad.util.ts`). Detalle: skill `modulo-operaciones`.
- **Filtros vs. listener en background (frente futuro)** — en `tablero-op` los datos pueden quedar congelados al volver de background mientras los filtros muestran otro período; las suscripciones a `operaciones$` no manejan errores. Detalle: skill `modulo-operaciones`.
- **Permisos de UI dispersos** — quedan `*appRole`/`esRol()` puntuales sin migrar a `PermisosService`, con riesgo de mostrar acciones que las Security Rules rechazan. Detalle: skill `botones-y-permisos`.
- **Tarifas tras el cierre** — quedan residuos inertes en datos de demo (`idTarifa`/`tarifaAsignada`, `adExtra: null`) y `tarifa-gral-cliente.ts` sigue vivo por la Liquidación vieja. Detalle: skill `modulo-tarifas`.
- **Migración conjunta Choferes/Vehículos/Legajos** — los IDs legacy se resuelven por relación cruzada, así que esas colecciones no se pueden migrar aisladas; revisar también las `fechaVto` en milisegundos. Detalle: skill `migracion-vantruck`.
- **Facturación (InformeLiqNuevo)** — falta la carga manual de facturas sin QR, `'anulado'` no tiene escritor, queda un `console.log` del QR y hay que rotar las anon keys de Supabase. Detalle: skill `modulo-facturacion`.
- **Reportes (`resumenesOp`)** — checklist de migración pendiente; `app-filtro-periodo` puede dar 11 meses los días 29–31; un listener por mes y clave. Detalle: skill `modulo-reportes`.
- **Vendedores** — checklist de migración pendiente; pagar una liquidación no genera movimiento financiero y restaurar un cliente no revalida vendedores desactivados. Detalle: skill `modulo-vendedores`.
- **Finanzas** — checklist de migración pendiente (incluida la apertura de saldos); las cuentas se calculan en memoria sin agregado y los generadores de demo no son idempotentes. Detalle: skill `modulo-finanzas`.
- **Generador y datos de demo** — en eventuales el pago al chofer puede superar el cobro, la limpieza no toca Storage y el `LogService` viejo sigue escribiendo en `logs`. Detalle: skill `herramientas-demo`.
- **Tras Lazy loading + fechas** — el `<h1>` sin cerrar de `index.html` envuelve toda la app y 7 specs de Karma no compilan (`npm test` no corre). Detalle: skill `lazy-loading-y-fechas`.
- **Tras Ficha de entidad** — ng-bootstrap 15 sobre Angular 20 falla en runtime con `hostDirectives` (NG0309) y quedan anonimizadores de prueba sin uso. Detalle: skill `ficha-entidad`.
- **Tras Informes Excel/PDF** — `arrayFacOp` y `$choferes` de `objeto-papelera` se cargan sin consumidor (se van con la Papelera legado). Detalle: skill `exportacion-excel-pdf`.
- **Nombre de entidad como enlace a la ficha (frente futuro)** — el pedido F7 del cliente, ampliado a ≈ 34 plantillas, con análisis de riesgos y etapas ya hecho. Detalle: skill `ficha-entidad`.
