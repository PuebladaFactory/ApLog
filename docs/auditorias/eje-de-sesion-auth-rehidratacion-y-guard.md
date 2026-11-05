# Auditoría — eje de sesión: Firebase Auth, UsuarioSesionService y RoleGuard

Fecha: 2026-11-05 · Rama: refactor

## Alcance

Se relevó:
- todo lugar de `src/` que lee o escribe estado de sesión (barrido de símbolos);
- `UsuarioSesionService`, `AuthService`, `RoleGuard`, `LoginComponent`, `CargaComponent`,
  `LimboComponent`, `PagenotfoundComponent`, `HomeComponent` y `SidebarComponent`;
- `app.module.ts`, `app-routing.module.ts`, `raiz-routing.module.ts` y los routing de los
  módulos lazy;
- los consumidores de `UsuarioSesionService`;
- las lecturas de Firestore en el arranque tras un F5;
- `functions/src`, por si alguna función participa del arranque de sesión;
- el comportamiento de las librerías que decide el orden Auth ↔ Firestore. Se leyó el
  código instalado en `node_modules`: `@firebase/auth` 1.10.8, `@firebase/firestore` 4.8.0
  y `@angular/fire` 19.2.0.

Secciones de la plantilla que no aplican:
- **"Interfaces y tipos":** se reduce a `Usuario`/`RolUsuario`.
- **"Colecciones de Firestore involucradas":** se reduce a `/users/{uid}`. No es un módulo
  con colecciones propias.

Fuera de alcance, por instrucción:
- la matriz de permisos y `firestore.rules`. Sólo se nombra el límite: las reglas deciden
  por Custom Claim (`request.auth.token.role`), no por el documento de `/users`;
- el propósito y la espera de `/carga` como decisión de UX;
- el CHANGELOG;
- cualquier propuesta de diseño o de arreglo.

Lo que depende del runtime y no se ejecutó (orden real de instanciación en Ivy,
sincronización de Firebase Auth entre pestañas) va en "Preguntas abiertas".

## Contradicciones con la documentación vigente

1. **"Hoy se afirma que no hay ninguna query al arrancar" (instrucción, punto 6): no se
   sostiene.**
   - Tras un F5 sobre `/op`, sin ningún clic, salen 10 u 11 lecturas en vivo:
     - `HomeComponent.ngOnInit` llama a los `init()` de `ChoferService`, `ProveedorService`,
       `ClienteService`, `TarifarioService`, `CategoriaDocumentacionService` y
       `LegajoService`. Cada uno abre un `onSnapshot` de colección entera vía
       `DbFirestoreService.getAllStateChanges`. Las colecciones son `choferes`, `vehiculos`,
       `proveedores`, `clientes`, `tarifas`, `tarifasEspeciales`, `registrosOpEventuales`,
       `categoriasDocumentacion` y `legajos`: 9 listeners.
     - `NoDisponibilidadService.init` abre `noDisponibilidades` si
       `PermisosService.puede('operaciones')`.
     - `TableroOpComponent.ngOnInit` lanza `OperacionService.cargarOperaciones`. Eso es
       `DbFirestoreService.getAllByDateValue('operaciones', 'fecha', …)`, un
       `collectionData` en vivo. Lo dispara el rango que fija
       `restaurarRangoPropio()` o `TableroFechasComponent.ngOnInit`.
   - Lo que sí es cierto: nada lee Firestore en un constructor, en `AppModule` ni en un
     inicializador (no hay ninguno).
   - CLAUDE.md lo dice bien ("donde `HomeComponent.ngOnInit` corre los `init()`"). La
     afirmación falsa es la de la instrucción.

2. **"`browserLocalPersistence` (IndexedDB)" (premisa): el nombre está mal; la conclusión
   no.**
   - `getAuth()` (`@firebase/auth`, función `getAuth`) inicializa con
     `persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence]`.
   - La persistencia de IndexedDB es `indexedDBLocalPersistence`.
   - `browserLocalPersistence` es `localStorage`, y sólo se usa como respaldo si IndexedDB
     no está disponible.
   - CLAUDE.md ("la sesión de Firebase Auth en IndexedDB") es correcto.

3. **CLAUDE.md: `/limbo` "hoy es genéricamente 'sesión válida, sin acceso a esto'".**
   - El template sigue mostrando el texto de la verificación de email (ver
     "Componentes y puntos de consumo", `LimboComponent`).
   - El significado de la ruta cambió; la pantalla no.

4. **CLAUDE.md: "`RoleGuard`/`*appRole`: comparación plana…" y en "Deuda abierta": "quedan
   `*appRole`/`esRol()` puntuales sin migrar".**
   - No existe ninguna directiva `appRole` en `src/`: el barrido de `appRole` en `.ts` y
     `.html` da 0 resultados.
   - La única directiva de visibilidad es `PermisoDirective` (`[appPermiso]`,
     `shared/directives/permiso.directive.ts`).
   - Los `esRol()` puntuales sí existen (ver consumidores).

El resto de la premisa se sostiene, con los matices de "Inconsistencias y deuda detectada":
- `UsuarioSesionService` es fuente única y rehidrata en el constructor;
- no hay `onAuthStateChanged` ni `authState`;
- firma y destinos de `RoleGuard`;
- `provideAuth(() => getAuth())` sin persistencia explícita;
- `LoginComponent.ngOnInit` vacío;
- el orden de `iniciarSesion` y de `cerrarSesion`.

## Inventario de archivos

| Archivo | Tipo | Rol |
|---|---|---|
| `src/app/servicios/usuario-sesion/usuario-sesion.service.ts` | Servicio root | Sesión en memoria + clave `localStorage['usuarioSesion']` |
| `src/app/servicios/autentificacion/auth.service.ts` | Servicio (root y además en `providers` de `AppModule`) | Único usuario de la API de Firebase Auth: `iniciarSesion`, `obtenerDatosUsuario`, `resetearPassword`, `cerrarSesion` |
| `src/app/guards/role.guard.ts` | Guard de clase | `canMatch` / `canActivate` → `chequearAcceso` |
| `src/app/app.module.ts` | Módulo raíz | `provideFirebaseApp`, `provideFirestore`, `provideAuth(() => getAuth())`, `provideFunctions`, `provideStorage`; sin inicializadores |
| `src/app/app-routing.module.ts` | Routing raíz | Rutas sin guard: `''`→`/login`, `carga`, `login`, `forgot-password`, `unauthorized`, `limbo`, `''` lazy a `RaizModule`, `'**'` |
| `src/app/raiz/raiz-routing.module.ts` | Routing del shell | `HomeComponent` en `''` sin guard; 13 hijos lazy con `canMatch: [RoleGuard]` |
| `src/app/raiz/{ajustes,choferes,clientes,proveedores}/*-routing.module.ts` | Routing lazy | Rutas internas con `canActivate: [RoleGuard]` |
| `src/app/appLogin/login/login.component.{ts,html}` | Componente | Formulario; `ngOnInit` vacío |
| `src/app/appLogin/forgot-password/forgot-password.component.html` | Template | `authService.resetearPassword` |
| `src/app/carga/carga.component.ts` | Componente | `setTimeout` de 3 s → `navigate(['op'])` |
| `src/app/limbo/limbo.component.{ts,html}` | Componente | Pantalla "con sesión, sin acceso" |
| `src/app/pagenotfound/pagenotfound.component.{ts,html}` | Componente | `/unauthorized` y `'**'`; `volver` decide por la sesión |
| `src/app/raiz/home/home.component.ts` | Componente shell | `ngOnInit` abre los listeners por entidad |
| `src/app/raiz/sidebar/sidebar.component.ts` | Componente | Inyecta `AuthService` (instancia `Auth`); `volverLogin` → `cerrarSesion` |
| `src/app/raiz/ajustes/gestion-usuarios/modal-usuario/modal-usuario.component.ts` | Componente | `cerrarConExito` → `cerrarSesion` si cambió el email propio; `httpsCallable` |
| `src/app/raiz/ajustes/gestion-usuarios/gestion-usuarios.component.ts` | Componente | `httpsCallable('eliminarUsuario')`; lee la sesión |
| `src/app/servicios/permisos/permisos.service.ts` | Servicio | `puede` lee `getRol()` |
| `src/app/interfaces/usuario.ts` | Interfaz | `Usuario`, `RolUsuario` |
| `functions/src/*.ts` | Cloud Functions | No participan del arranque de sesión (ver "Dependencias") |

## Interfaces y tipos

`src/app/interfaces/usuario.ts`:

```typescript
export type RolUsuario = 'dev' | 'admin' | 'manager' | 'user' | 'demo';

export interface Usuario {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  emailVerified: boolean;
  role: RolUsuario;
  name: string;
}
```

- `AuthService.obtenerDatosUsuario` devuelve `Usuario | 'sin-rol' | null`. Hace un cast
  directo `data as Usuario` del documento `/users/{uid}`, sin validar los campos más allá
  de `role`.
- Lo que se guarda en `localStorage['usuarioSesion']` es ese objeto tal cual, con
  `JSON.stringify`.
- `UsuarioSesionService.rehidratarDesdeStorage` lo relee con `JSON.parse(raw) as Usuario`.
  No valida forma ni rol: si el JSON parsea, la sesión queda establecida.

## Servicios y métodos

### Servicios de sesión

| Servicio | Método | Qué hace | Escribe en | Atómico |
|---|---|---|---|---|
| `UsuarioSesionService` | `constructor` → `rehidratarDesdeStorage` (privado) | `localStorage.getItem('usuarioSesion')`, `JSON.parse`. Si falla el parseo queda `null`. Síncrono | memoria | — |
| `UsuarioSesionService` | `setUsuario(usuario)` | Memoria + `localStorage.setItem` | `localStorage['usuarioSesion']` | — |
| `UsuarioSesionService` | `getUsuarioActual()` / `getRol()` / `esRol(...roles)` | Lectura síncrona de memoria. No hay observable | — | — |
| `UsuarioSesionService` | `limpiar()` | Memoria a `null` + `localStorage.removeItem` (único borrado de la clave) | `localStorage` | — |
| `AuthService` | `iniciarSesion(email, password)` | Ver la secuencia debajo de la tabla | `localStorage` (vía `setUsuario`), `registroLog` | No (pasos secuenciales) |
| `AuthService` | `obtenerDatosUsuario(uid)` (privado) | `getDoc(doc(firestore, 'users/{uid}'))`. Sin doc → `null`; sin `role` → `'sin-rol'` | — | — |
| `AuthService` | `resetearPassword(email)` | `sendPasswordResetEmail` + Swal | — | — |
| `AuthService` | `cerrarSesion()` | Ver la secuencia debajo de la tabla | `registroLog`, `localStorage` | No |
| `RoleGuard` | `canMatch(route, segments)` / `canActivate(route, state)` | Ambos → `chequearAcceso(route.data)`. Lee `getUsuarioActual()`. Con rol incluido en `data.roles` → `true`; `null` → `UrlTree('/unauthorized')`; si no → `UrlTree('/limbo')` | — | — |
| `PermisosService` | `puede(modulo, accion?)` | `getRol()`; `null` → `false` | — | — |
| `LogRegistroService` | `construirEntrada` (privado) | `esRol('dev')` → no loguea; usa `getUsuarioActual()` para `userId`/`userEmail` | — | — |

### Secuencia de `AuthService.iniciarSesion`

`signInWithEmailAndPassword` → `obtenerDatosUsuario(uid)`, y después según el resultado:

- **`null`:** `navigate(['/unauthorized'])` y `return`.
- **`'sin-rol'`:** `navigate(['/limbo'])` y `return`.
- **Si no:**
  1. `usuarioSesion.setUsuario(usuario)`;
  2. `await logRegistro.registrarAccion('LOGIN', …)`;
  3. `navigate(['/carga'])`.

El `catch` hace `registrarError` y un Swal.

### Secuencia de `AuthService.cerrarSesion`

1. Si hay usuario en sesión: `await registrarAccion('LOGOUT', …)`.
2. `await signOut(auth)`.
3. `usuarioSesion.limpiar()`.
4. `navigate(['/login'])`.

El `catch` hace `registrarError`. Si `signOut` lanza, no se llama a `limpiar()` ni se
navega.

### Guards existentes

`RoleGuard` es el único guard de la app. No hay resolvers, `HTTP_INTERCEPTORS`,
`APP_INITIALIZER`, `provideAppInitializer` ni `ENVIRONMENT_INITIALIZER`.

## Componentes y puntos de consumo

### Barrido de símbolos (punto 1)

| Símbolo | Resultado en `src/` (sin specs) |
|---|---|
| `usuarioSesion` (clave) | Sólo en `UsuarioSesionService` (`STORAGE_KEY`). Las demás apariciones son el nombre del campo inyectado |
| `localStorage` | Sesión: `UsuarioSesionService` (`rehidratarDesdeStorage`, `setUsuario`, `limpiar`). Preferencias de UI (no sesión): `TableroOpComponent` y `InformeOpListadoComponent` |
| `sessionStorage` | 0 |
| `UsuarioSesionService` | 40 archivos lo importan (más 1 spec, `usuarios-consulta.service.spec.ts`) |
| `getAuth` / `provideAuth` | Sólo `app.module.ts` |
| `currentUser` | 0 |
| `signInWith…` | `AuthService.iniciarSesion` |
| `signOut` | `AuthService.cerrarSesion` (y un comentario en `LogRegistroService`) |
| `sendPasswordResetEmail` | `AuthService.resetearPassword` |
| `inject(Auth)` | Sólo `AuthService` (campo `auth`) |
| `getIdToken`, `idToken`, `setPersistence`, `onAuthStateChanged`, `authState`, `user(`, `authStateReady` | 0 |
| `httpsCallable` (manda el ID token de Auth implícitamente) | `GestionUsuariosComponent` (eliminar), `ModalUsuarioComponent` (crear, editar, editar email) |
| `APP_INITIALIZER` / `provideAppInitializer` | 0 |

`functions/src`:
- `syncRoleClaim`: `onDocumentWritten` sobre `users/{uid}`;
- `gestionUsuarios`: 4 `onCall`;
- `verificarVencimientosDocumentacion`: `onSchedule`.

No hay blocking functions (`beforeUserSignedIn` / `beforeUserCreated`). Ninguna participa
del arranque de sesión; `syncRoleClaim` sólo alimenta el Custom Claim que consumen las
reglas.

**Delta contra la premisa.** La premisa anota 6 lugares:
1. el constructor de `UsuarioSesionService`;
2. `RoleGuard` (`canMatch`/`canActivate`);
3. `provideAuth` en `app.module`;
4. `LoginComponent.ngOnInit`;
5. `AuthService.iniciarSesion`;
6. `AuthService.cerrarSesion`.

El barrido da 13 lugares que tocan el núcleo de sesión (Auth o escritura/rehidratación de
la sesión) más 40 consumidores de lectura de `UsuarioSesionService`. Los 7 lugares de núcleo
que la premisa no anota son:
- `UsuarioSesionService.setUsuario` y `UsuarioSesionService.limpiar`, como puntos de
  escritura de la clave;
- `AuthService.obtenerDatosUsuario`, la lectura de `/users/{uid}`;
- `AuthService.resetearPassword`;
- los tres llamadores de los métodos de sesión: `SidebarComponent.volverLogin`,
  `ModalUsuarioComponent.cerrarConExito` y `LoginComponent` (template y `onKeydown`).

A eso se suman dos decisiones que dependen de la sesión fuera del guard:
- `PagenotfoundComponent.volver`;
- `LimboComponent.volver`, que navega a `/login` sin cerrar sesión.

También 2 componentes que usan el token de Auth vía `httpsCallable`.

### Consumidores de `UsuarioSesionService` (punto 2)

Ninguno se suscribe: el servicio no expone observable. Todos leen en el momento de la
llamada.

**Quién escribe la sesión:** `setUsuario` y `limpiar()` sólo los llama `AuthService`, desde
`iniciarSesion` y `cerrarSesion`. Nadie más escribe la sesión.

#### Lectura en el arranque o al montar

| Componente / servicio | Qué usa | Archivo |
|---|---|---|
| `RoleGuard.chequearAcceso` | `getUsuarioActual()` en cada `canMatch`/`canActivate` | `guards/role.guard.ts` |
| `PermisosService.puede` | `getRol()`. Lo consumen `HomeComponent.ngOnInit` (gating de `NoDisponibilidadService.init`), `PermisoDirective` (en el setter del `@Input`), `app-btn-*` y otros 13 archivos | `servicios/permisos/permisos.service.ts` |
| `SidebarComponent.ngOnInit` | `getUsuarioActual()` una vez → `$usuario` | `raiz/sidebar/sidebar.component.ts` |
| Tarifas | `getUsuarioActual()` una vez en `ngOnInit` de `TarifaAumentoComponent`, `TarifaEspecialAumentoComponent`, `TarifaEspecialFormComponent`, `TarifaFormComponent`, `TarifasEspecialComponent`, `TarifasGeneralComponent`, `TarifasPersonalizadaComponent` | `raiz/tarifas/*` |
| `ModalUsuarioComponent.ngOnInit` | `getUsuarioActual()` → `rolDeshabilitado` | `raiz/ajustes/gestion-usuarios/modal-usuario/` |

#### Lectura en el gesto o en el template

| Componente / servicio | Qué usa | Archivo |
|---|---|---|
| `ModalUsuarioComponent.confirmarCambioEmail` | `getUsuarioActual()` → `esCambioEmailPropio` | `raiz/ajustes/gestion-usuarios/modal-usuario/` |
| `GestionUsuariosComponent.editarDeshabilitado` / `eliminarDeshabilitado` | `getUsuarioActual()`, `getRol()` | `raiz/ajustes/gestion-usuarios/` |
| Templates con `esRol('demo')` | `ChoferesListadoComponent`, `ClientesListadoComponent`, `ProveedoresListadoComponent`, `TableroLegajosComponent`, `legajos/control` (`ControlComponent`, template inline) | `raiz/...` |
| `PapeleraComponent.puedeRestaurar`, `InformeOpAnuladosComponent.puedeVerPapelera` | `esRol(...)` | `raiz/ajustes/papelera/`, `raiz/liquidacion/informe-op-anulados/` |
| `PagenotfoundComponent.volver` | `getUsuarioActual() !== null` → `/op`, si no `/login` | `pagenotfound/` |
| `ModalDetalleOpComponent.aplicarCambiosDocumentacion` | `getUsuarioActual()` | `raiz/operaciones/modal-detalle-op/` |

#### Lectura dentro de una escritura (servicios)

| Servicio | Qué usa | Archivo |
|---|---|---|
| `LogRegistroService.construirEntrada` | `esRol('dev')`, `getUsuarioActual()` | `servicios/log-registro/` |
| `UsuariosConsultaService.leer` | `esRol('dev','admin')` | `servicios/gestion-usuarios/` |
| Servicios de escritura (email del autor) | `getUsuarioActual()?.email ?? 'Desconocido'` en `MovimientoFinService` (`registrar`, `anular`, `registrarAjuste`, `cerrarSaldo`, `registrarDevolucion`), `InformeLiqService` (`revertirEmitido`, `vincularFactura`), `OperacionService.bajaOperacionCerrada`, `NoDisponibilidadService.anular`, `ConfiguracionEmpresaService.guardar`, `PapeleraService.prepararBajaEnBatch`, `TarifaFactoryService.crearTarifa`, `TarifaEspecialFactoryService.crearTarifaEspecial`, `TarifaGuardadoService` (`darDeBajaTarifa`, `darDeBajaTarifaEspecial`) | `servicios/...` |
| Herramientas de `/migracion` | `getRol() !== 'dev'` en `verificarEntorno` / `verificarAcceso` de `LimpiezaDemoService`, `GeneradorOperacionesService`, `GeneradorCircuitoService`, `GeneradorCobrosService`, `NormalizacionFechaNacService`, `RecalculoResumenesService`, `RecalculoComisionesService`; los tres generadores además usan `getUsuarioActual()` en `ejecutar` | `servicios/desarrollo/` |

### Textos de las pantallas de salida (punto 7)

- **`LimboComponent`** (`src/app/limbo/limbo.component.html`): muestra hoy
  - `<h1>`: "¡Bienvenido!"
  - `<h2>`: "Su correo electrónico ha sido verificado exitosamente. En breve recibirá los
    permisos necesarios para ingresar en la aplicación."
  - botón "Salir": `volver()` hace `router.navigate(['login'])`, sin `cerrarSesion`.
- **`PagenotfoundComponent`** (`/unauthorized` y `'**'`): "¡Ups!" + "Algo salió mal" +
  botón "Volver".

## Orden real en cada camino de entrada (punto 3)

### Hechos de librería y de configuración (verificados en `node_modules`)

1. **Las instancias de AngularFire son perezosas.** `provideAuth`, `provideFirestore`, etc.
   (`@angular/fire` 19.2.0) son `makeEnvironmentProviders` con `useFactory`. `getAuth()`
   corre la primera vez que alguien inyecta `Auth`.
2. **`provideFirestore` instancia `Auth` antes.** Declara `[new Optional(), AuthInstances]`
   entre sus `deps`, así que inyectar `Firestore` instancia `Auth` antes que Firestore.
3. **Quién dispara la instanciación.** Sólo `AuthService` hace `inject(Auth)`, y
   `DbFirestoreService` (vía `inject(Firestore)`) arrastra `Auth` por el punto anterior.
   `RoleGuard` no inyecta ninguno de los dos.
4. **Firestore espera el primer evento de token de Auth.** El proveedor de credenciales de
   Firestore (`@firebase/firestore` 4.8.0, `__PRIVATE_FirebaseAuthCredentialsProvider.start`)
   registra un listener de token en Auth y encola sus operaciones detrás del primer evento
   (`awaitNextToken`).
5. **Ese primer evento llega después de restaurar la persistencia.** Del lado de Auth,
   `addAuthTokenListener` → `onIdTokenChanged` → `registerStateListener`, que espera
   `_initializationPromise`, es decir, la restauración desde la persistencia.
6. **Excepción.** Si Auth no está registrado al vencer un `setTimeout(0)` desde el arranque
   del cliente de Firestore, Firestore sigue como no autenticado hasta que Auth aparezca
   (`onInit`).

### Login desde `/login`

1. Bootstrap de `AppModule`:
   - no hay inicializadores;
   - `AppComponent` sólo inyecta `SwUpdate`;
   - la ruta `login` no tiene guard.
2. `LoginComponent` se construye y se inyecta `AuthService`. Eso instancia
   `UsuarioSesionService`, que rehidrata de `localStorage`: si quedó una sesión anterior,
   la memoria la tiene. También instancia `Auth` vía `getAuth()`, que arranca la
   restauración asíncrona desde IndexedDB.
3. `ngOnInit` está vacío: no limpia nada y no redirige aunque haya sesión.
4. Clic: `signInWithEmailAndPassword`. Desde acá `Auth.currentUser` es el usuario nuevo.
5. `getDoc('users/{uid}')`.
6. `setUsuario`: la memoria y `localStorage` pasan a ser los del usuario nuevo.
7. Log LOGIN.
8. `navigate(['/carga'])`; 3 s después `navigate(['op'])`.
9. `canMatch` de `op` con la sesión ya puesta → `HomeComponent` → listeners.

### F5 sobre una ruta protegida (ej. `/op`)

1. Bootstrap. La navegación inicial matchea `''` → `loadChildren(RaizModule)`, sin guard.
2. En el chunk, `''` → `HomeComponent`, sin guard propio. El hijo `op` evalúa
   `canMatch: [RoleGuard]`:
   - el guard se construye en ese momento e instancia `UsuarioSesionService`, que rehidrata
     de forma síncrona;
   - la decisión sale **sólo** de `localStorage`.
   - En ese punto **`Auth` todavía no está instanciado** (nadie lo inyectó), así que
     Firebase Auth no tiene `currentUser`.
3. Si el guard pasa, se activa `HomeComponent`:
   - sus servicios por entidad inyectan `DbFirestoreService` → `Firestore` → `Auth`, que
     arranca la restauración desde IndexedDB;
   - `SidebarComponent` → `AuthService` → `Auth`.
4. `HomeComponent.ngOnInit` abre los listeners y `TableroOpComponent.ngOnInit` la query de
   `operaciones`. Por los hechos 4 y 5, esas lecturas salen con el token del usuario
   restaurado, siempre que `Auth` esté registrado antes del `setTimeout(0)` del cliente de
   Firestore; por el hecho 2, lo está.
5. No se pasa por `/carga`.

### Navegación directa escribiendo la URL

- Es una carga completa de página: mismo orden que el F5.
- Escribir sólo el dominio (`''`) redirige a `/login`, que muestra el formulario aunque
  haya sesión.
- La navegación interna del router (sin recarga) usa la sesión ya en memoria.

### Segunda pestaña del mismo origen

- Contexto JS nuevo: mismo orden que el F5. `localStorage` (la clave `usuarioSesion`) e
  IndexedDB (la sesión de Auth) son compartidos por el origen.
- No hay listener del evento `storage` en `src/`. Después del arranque, la memoria de
  `UsuarioSesionService` de una pestaña no se entera de un `setUsuario`/`limpiar` hecho en
  otra.

### Cierre y reapertura del navegador

- La clave `usuarioSesion` (`localStorage`) y la sesión de Auth (IndexedDB) sobreviven.
- Escribir una ruta protegida entra sin contraseña con el mismo orden que el F5. Ya está
  registrado como deuda.

## Qué hay entre el arranque y la primera pantalla (punto 4)

- **Inicializadores:** no hay `APP_INITIALIZER`, `provideAppInitializer` ni
  `ENVIRONMENT_INITIALIZER`.
- **Router:** `RouterModule.forRoot(appRoutes)` sin opciones (`initialNavigation` por
  defecto).
- **Guards:** `canMatch` de `RoleGuard` en los hijos de `raiz-routing` y `canActivate` en
  rutas internas. Ninguno en `app-routing` ni en `HomeComponent`.
- **Resolvers:** ninguno.
- **`ServiceWorkerModule`:** se registra con `registerWhenStable:30000` (no decide nada de
  sesión).
- **`/carga` (`CargaComponent.ngOnInit`):** sólo `setTimeout` de 3000 ms →
  `navigate(['op'])`. No espera nada de Auth ni de datos. Sólo llega ahí
  `AuthService.iniciarSesion`.

## Qué tendría que cambiar para una decisión asíncrona en `RoleGuard` (punto 5, hechos)

- **Firma actual:**
  - `RoleGuard` es una clase `@Injectable({ providedIn: 'root' })`, no un guard funcional;
  - `canMatch(route: Route, segments: UrlSegment[]): true | UrlTree`;
  - `canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): true | UrlTree`;
  - las dos delegan en `chequearAcceso(data): true | UrlTree`, síncrono.
  - El router de Angular acepta en ambos hooks `Observable` o `Promise` de
    `boolean | UrlTree` (`MaybeAsync<GuardResult>`): el tipo de retorno actual es el que lo
    restringe a síncrono.
- **Declaraciones de `canMatch: [RoleGuard]` (13, todas en `raiz-routing.module.ts`):**

  | Ruta | `data.roles` |
  |---|---|
  | `clientes`, `choferes`, `op`, `proveedores`, `liquidacion`, `legajos` | dev, admin, manager, user, demo |
  | `ajustes`, `nuevaFacturacion`, `vendedores`, `finanzas`, `reportes` | dev, admin, demo |
  | `tarifas` | dev, admin, user, demo |
  | `migracion` | dev |

- **Declaraciones de `canActivate: [RoleGuard]` (8):**
  - `ajustes-routing`: `usuarios` (dev, admin); `registro`, `registro-log`, `papelera`,
    `empresa` (dev, admin, demo);
  - `choferes-routing`, `clientes-routing`, `proveedores-routing`: `alta` (dev, admin,
    manager).
- **Rutas lazy sin guard interno:** `operaciones`, `liquidacion`, `legajos`,
  `nueva-facturacion`, `vendedores`, `finanzas-nueva`, `reportes`, `tarifas` y
  `desarrollo`.
- **Rutas de `app-routing`:** ninguna tiene guard.
- **Otros guards:** no existen.
- **Consumidores que asumen la decisión síncrona** (todos leen la sesión en el momento, sin
  esperar):
  - `PermisosService.puede`, desde `HomeComponent.ngOnInit` antes de abrir
    `noDisponibilidades`, desde `PermisoDirective` en el setter del `@Input` (crea o limpia
    la vista una sola vez) y desde los `app-btn-*`;
  - `SidebarComponent.ngOnInit` (`$usuario` una vez);
  - los `ngOnInit` de Tarifas;
  - `ModalUsuarioComponent.ngOnInit`;
  - los templates con `esRol('demo')`;
  - `PagenotfoundComponent.volver`;
  - `LogRegistroService.construirEntrada`.

  Ninguno re-evalúa si la sesión cambia después del primer render.

## Lecturas de Firestore en el arranque (punto 6)

Ver la contradicción 1. Resumen tras un F5 sobre `/op`:

- **Listeners `onSnapshot` de colección entera:** 9 desde `HomeComponent.ngOnInit` (vía
  `DbFirestoreService.getAllStateChanges`), más `noDisponibilidades` condicionado a
  `PermisosService.puede('operaciones')`.
- **Query en vivo:** 1 `collectionData` sobre `operaciones` por rango, desde
  `TableroOpComponent.ngOnInit`.
- **Lecturas puntuales:** ninguna `getDoc`/`getDocs` puntual al arrancar.
- **Constructores e inicializadores:** ninguna lectura en constructores de servicios root
  ni en inicializadores.

Las decisiones sobre qué abrir (`puede('operaciones')`) salen de la sesión de
`localStorage`, no del token. Por los hechos de librería 4 y 5, las lecturas esperan la
restauración de Auth. No hay código de la app que la espere.

**Manejo de errores:**
- `getAllStateChanges` propaga el error del `onSnapshot` con `observer.error` y no
  reintenta.
- Los `init()` de Choferes, Proveedores, Clientes, Tarifario, CategoríaDocumentación y
  Legajos se suscriben sin callback de error.
- `NoDisponibilidadService.init` sí maneja el error: resetea `iniciado`/`cargado` y hace
  `console.error`.
- La suscripción de `OperacionService.cargarOperaciones` no tiene callback de error.

## Colecciones de Firestore involucradas

- **`/users/{uid}`** (top-level, fuera de `/Vantruck/datos/`).
  - Forma: la de `Usuario`.
  - Escriben: las Cloud Functions de `gestionUsuarios`, y `dev` por consola.
  - Lee en el login: `AuthService.obtenerDatosUsuario` (`getDoc`).
  - El trigger `syncRoleClaim` copia `role` al Custom Claim.
- **Límite con las reglas (fuera de alcance):** `firestore.rules` decide con
  `request.auth.token.role`. La app decide con el `role` del documento guardado en
  `localStorage`. Son dos fuentes de rol distintas.
- **`registroLog`:** recibe LOGIN/LOGOUT (`LogRegistroService.registrarAccion`, best-effort).

## Dependencias con otros módulos

- **Log** (`LogRegistroService`): depende de `getUsuarioActual()` para firmar cada entrada.
  `cerrarSesion` loguea antes de `signOut` porque las reglas exigen autenticado.
- **Permisos** (`PermisosService`, `PermisoDirective`, `app-btn-*`): todo el gating de UI
  sale de `getRol()` de la sesión rehidratada.
- **Gestión de usuarios:** `ModalUsuarioComponent` fuerza `cerrarSesion` al cambiar el email
  propio. Las `httpsCallable` usan el token de Auth, no la sesión de la app.
- **Escrituras de dominio** (Finanzas, Liquidación, Operaciones, Tarifas, Papelera,
  Configuración, No disponibilidad): firman con `getUsuarioActual()?.email ?? 'Desconocido'`.
- **Herramientas de `/migracion`:** guarda de rol `dev` por `getRol()`.
- **Cloud Functions:** `syncRoleClaim` (claim para reglas). Ninguna interviene en el
  arranque.
- **Modelo viejo:** no queda ninguno en este eje. `StorageService` y `localStorage.clear()`
  salieron en SS2: barrido de `clearAllLocalStorage` y `StorageService` sin uso en
  `AuthService`/`LoginComponent`.

## Inconsistencias y deuda detectada

1. **Dos fuentes de sesión que nunca se reconcilian.**
   - La app decide con `localStorage['usuarioSesion']` (rehidratado sin validar).
   - Firestore, las reglas y las Cloud Functions deciden con Firebase Auth (IndexedDB).
   - Ningún código compara las dos: no hay `onAuthStateChanged` ni `authState`.
2. **`iniciarSesion` con documento inexistente o sin rol** (`null` / `'sin-rol'`):
   - navega a `/unauthorized` o `/limbo` **sin `signOut` y sin `setUsuario` ni `limpiar`**;
   - Firebase Auth queda autenticado con el usuario nuevo;
   - `UsuarioSesionService` conserva lo que tuviera en memoria. Puede ser la sesión de otro
     usuario rehidratada de `localStorage`, porque `/login` ya no limpia.
   - En ese estado, `PagenotfoundComponent.volver` (sesión `!== null`) navega a `/op` con el
     rol del usuario anterior.
3. **`LimboComponent.volver` ("Salir")** navega a `/login` sin `cerrarSesion`: la sesión de
   la app y la de Auth siguen vivas. El texto de la pantalla es el de la verificación de
   email (contradicción 3).
4. **`cerrarSesion` con `signOut` que falla:** no corre `limpiar()` ni la navegación, y el
   `catch` sólo loguea el error. La sesión de la app queda puesta.
5. **Rehidratación sin validación:** cualquier JSON parseable en
   `localStorage['usuarioSesion']` con un `role` válido pasa `RoleGuard`. Las reglas siguen
   decidiendo por el claim.
6. **`HomeComponent` no tiene guard propio.** Se activa sólo como padre de un hijo que pasó
   `canMatch` (el `''` de `app-routing` redirige a `/login` antes). Su `ngOnInit` abre los
   listeners sin chequear sesión ni Auth.
7. **Listeners sin manejo de error** en seis `init()` y en `cargarOperaciones`. Un
   `permission-denied` deja el `BehaviorSubject` en `[]` sin reintento (ver punto 6).
8. **No hay sincronización entre pestañas de la sesión de la app.** Sin listener de
   `storage`, cada pestaña conserva en memoria la sesión con la que arrancó.
9. **Deuda ya registrada, contrastada:**
   - **"Sesión que sobrevive a la pantalla de login"** (CLAUDE.md, skill `subsistema-log`,
     puntero en `migracion-vantruck` "Bloqueantes para la promoción"): confirmada. Se
     verificaron cuatro cosas:
     - `LoginComponent.ngOnInit` vacío;
     - `usuarioSesion` persiste;
     - Auth en IndexedDB;
     - `RoleGuard` decide con la rehidratación.
     La afirmación "`LoginComponent` tampoco detecta que ya hay sesión" se sostiene.
   - **`/carga` sin propósito claro** (CLAUDE.md): confirmada. Sólo espera 3 s.
   - **"Preferencias de UI compartidas entre usuarios del mismo navegador"** (CLAUDE.md):
     consistente. Las claves de `TableroOpComponent`/`InformeOpListadoComponent` no tienen
     uid y nada las borra.
   - **"Criterio de acceso de `demo` al módulo Ajustes"** (`botones-y-permisos`):
     confirmada en el routing. `canMatch` de `ajustes` admite `demo`; el `redirectTo` lleva
     a `usuarios`, que no lo admite → `/limbo`, con el texto de la contradicción 3.
   - **"Permisos de UI dispersos — `*appRole`/`esRol()`"**: `*appRole` ya no existe
     (contradicción 4); `esRol()` sí.
   - **`lazy-loading-y-fechas`** ("`RoleGuard` con `canMatch` y `canActivate` devolviendo
     `UrlTree`; se retiró `canLoad`"): confirmada.
   - **Ventana de propagación del Custom Claim** (CLAUDE.md, hasta 1 h): consistente con el
     código. El cliente lee el rol del documento y no refresca el token
     (`getIdToken` / `getIdTokenResult` sin uso).

## Preguntas abiertas

1. **Orden de instanciación en Ivy.** ¿Se instancian `SidebarComponent` y los servicios de
   `HomeComponent` antes de que corra el primer `onSnapshot`?
   - Por la dependencia `provideFirestore → AuthInstances`, `Auth` existe antes que
     `Firestore` en cualquier orden.
   - Falta confirmar en ejecución que las lecturas del F5 salen con token. Se infiere del
     código de la librería; no se ejecutó.
2. **Auth borrada de IndexedDB con `usuarioSesion` presente.** ¿Qué pasa en un F5 si la
   sesión de Auth en IndexedDB no existe o expiró y `usuarioSesion` sí está (por ejemplo,
   datos del sitio borrados en parte, o un refresh token revocado al cambiar el email o
   eliminar el usuario)?
   - Por el código: `RoleGuard` deja pasar y los listeners salen como no autenticados →
     `permission-denied`.
   - Qué ve el usuario no se verificó.
3. **Segunda pestaña.** Cuando una pestaña hace logout o login con otro usuario, ¿Firebase
   Auth propaga el cambio a la otra pestaña ya abierta, y cuánto tarda (sincronización de
   la persistencia de IndexedDB)?
   - La app no tiene código para eso. El resultado combinado (sesión de la app vieja +
     Auth nueva o nula) depende del SDK y no se verificó.
4. **Navegadores sin IndexedDB.** En navegadores donde IndexedDB no esté disponible, ¿qué
   persistencia queda efectivamente: `browserLocalPersistence` o
   `browserSessionPersistence`? No se relevaron los navegadores de los usuarios.
5. **Service worker y caché.** ¿El service worker (`ngsw-worker.js`) cachea algo que
   intervenga en el arranque de sesión?
   - No se leyó `ngsw-config.json`.
   - Por el código, Firestore y Auth no pasan por `HttpClient`.
