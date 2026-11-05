# Auditoría — remanente de StorageService, localStorage y la secuencia de arranque

> **Superada (2026-11-04, frente remanente de StorageService, SS1–SS3):** `StorageService` y `getAllColectionUsers` ya no existen, las tres pantallas resuelven el nombre con `UsuariosConsultaService`, `clearAllLocalStorage` y la clave `ruta` se fueron, y la contradicción 1 (el filtro `role !== 'dev'`) ya está corregida en CLAUDE.md. Estado actual: CLAUDE.md ("Autenticación y roles", "State management", "Deuda abierta") y skill `subsistema-log` ("Nombre de usuario en las pantallas de auditoría").

Fecha: 2026-11-04 · Rama: refactor (árbol limpio, sobre `beb4d26`)

Relevamiento para decidir si `StorageService` desaparece o queda reducido a un helper de
`localStorage`. Solo hechos; la decisión y el diseño no están acá. Las citas van por
archivo y nombre de método, sin números de línea (pedido explícito del frente; pisa la
regla 4 de la skill `auditar`).

## Contradicciones con el contexto de partida

1. **El filtro `role !== 'dev'` no está en `GestionUsuariosService.obtenerUsuarios`.** El
   servicio hace `getDocs(collection('users'))` y devuelve todo sin filtrar. El filtro vive
   en el consumidor, `GestionUsuariosComponent.cargarUsuarios`
   (`todos.filter((u) => u.role !== 'dev')`). CLAUDE.md, "Deuda abierta" → "Lo que queda
   de `StorageService`", dice "`obtenerUsuarios()` filtra `role !== 'dev'` siempre": es
   falso tal como está escrito. El párrafo de "Autenticación y roles" sobre la pantalla
   `gestion-usuarios` es ambiguo, pero se puede leer bien.
2. **El resto del contexto se confirmó.** Superficie de `StorageService`, guarda de
   `initializerAdmin`, `localStorage.clear()`, falta de handler de error en
   `getAllColection`, reglas de `/users` y conservación de `RegistroComponent`. Lo que
   faltaba: también existe el subject privado `_proveedores$`, y `getObservable`,
   `updateObservable` y `getAllColection` son públicos en TypeScript (no tienen
   modificador); son "internos" solo porque nadie los usa desde afuera.

## Alcance

Se relevó:
- `StorageService` completo y todos sus consumidores en `src/` y `functions/src/`.
- Todo acceso a `localStorage` y `sessionStorage` en `src/`.
- La secuencia login → `/carga` → `/op` y la población de `UsuarioSesionService`.
- El camino de error de `DbFirestoreService.getAllColectionUsers`.
- La resolución de nombre de usuario en `RegistroComponent`, `RegistroLogComponent` y
  `PapeleraComponent`, con el campo de identidad de `logs`, `registroLog`,
  `papeleraEventos` y `objetosEliminados`.
- `GestionUsuariosService` y `UsuarioSesionService`, y `proveedores$`.
- La documentación: CLAUDE.md, las skills, `docs/` y `CHANGELOG.md`.

Fuera de alcance, por pedido: la reconciliación del bucket `papelera` con
`PermisosService.matrizBase` y la migración a Vantruck. Nada se verificó ejecutando la
app: todo sale de leer el código.

## Inventario de archivos

| Archivo | Tipo | Rol |
|---|---|---|
| `src/app/servicios/storage/storage.service.ts` | Servicio | `StorageService` (133 líneas, sin spec) |
| `src/app/servicios/database/db-firestore.service.ts` | Servicio | `getAllColectionUsers`, la query que alimenta la caché `users` |
| `src/app/servicios/usuario-sesion/usuario-sesion.service.ts` | Servicio | Sesión en memoria + clave `usuarioSesion` |
| `src/app/servicios/autentificacion/auth.service.ts` | Servicio | `iniciarSesion`, `obtenerDatosUsuario`, `cerrarSesion` |
| `src/app/servicios/gestion-usuarios/gestion-usuarios.service.ts` | Servicio | `obtenerUsuarios` (lectura puntual de `/users`) |
| `src/app/carga/carga.component.ts` | Componente | Pantalla intermedia post-login; llama a `initializerAdmin` |
| `src/app/appLogin/login/login.component.ts` | Componente | `clearAllLocalStorage` en `ngOnInit` |
| `src/app/raiz/sidebar/sidebar.component.ts` (+ `.html`) | Componente | Clave `ruta` en `navegar` |
| `src/app/raiz/ajustes/registro/registro.component.ts` (+ `.html`) | Componente | `loadInfo('users')`, colección `logs` |
| `src/app/raiz/ajustes/registro-log/registro-log.component.ts` (+ `.html`) | Componente | `loadInfo('users')`, colección `registroLog` |
| `src/app/raiz/ajustes/papelera/papelera.component.ts` (+ `.html`) | Componente | `loadInfo('users')`, colección `papeleraEventos` |
| `src/app/raiz/ajustes/gestion-usuarios/gestion-usuarios.component.ts` | Componente | Único consumidor de `obtenerUsuarios` |
| `src/app/raiz/choferes/modal-vehiculo/modal-vehiculo.component.ts` (+ `.html`) | Componente | Único suscriptor de `proveedores$` |
| `src/app/raiz/operaciones/tablero-op/tablero-op.component.ts` | Componente | 4 claves propias de `localStorage` |
| `src/app/raiz/liquidacion/informe-op-listado/informe-op-listado.component.ts` | Componente | 1 clave propia de `localStorage` |
| `src/app/guards/role.guard.ts` | Guard | Lee la sesión de forma síncrona |
| `src/app/app-routing.module.ts` | Routing | Ruta `carga` sin guard |
| `src/app/interfaces/usuario.ts`, `log-entry.ts`, `registro-log.ts`, `registro-papelera.ts` | Interfaces | Forma de usuario y de las entradas |
| `firestore.rules` (`match /users/{uid}`) | Reglas | Lectura de `/users` |

## Interfaces y tipos

`Usuario` (`interfaces/usuario.ts`):
```ts
export type RolUsuario = 'dev' | 'admin' | 'manager' | 'user' | 'demo';
export interface Usuario {
  uid: string; email: string; displayName: string; photoURL: string;
  emailVerified: boolean; role: RolUsuario; name: string;
}
```

Campos de identidad de cada colección que alimenta las tres pantallas:

| Colección | Interfaz | Identidad guardada | Quién la escribe hoy |
|---|---|---|---|
| `logs` | `LogEntry` (`interfaces/log-entry.ts`) | `userId: string` (uid), `userEmail: string`. **Sin nombre** | Nadie (histórico congelado). El escritor eliminado, `LogService.createLogEntry`, ponía `usuario?.uid \|\| 'Desconocido'` y `usuario?.email \|\| 'Desconocido'` |
| `registroLog` | `RegistroLog` (`interfaces/registro-log.ts`) | `userId` (uid), `userEmail`. **Sin nombre** | `LogRegistroService.construirEntrada`: `usuario?.uid \|\| 'Desconocido'` y `usuario?.email \|\| 'Desconocido'`. Devuelve `null` si `esRol('dev')`, así que no hay entradas de dev |
| `papeleraEventos` | `PapeleraEvento` (`interfaces/registro-papelera.ts`) | `userId` (uid), `userEmail`. **Sin nombre** | `PapeleraService.prepararBajaEnBatch`: mismos fallbacks. **No excluye a dev.** Al restaurar (`armarRestauracion`) el evento se reescribe con `estado: 'restaurado'` y conserva el usuario de la baja; quién restauró no queda registrado |
| `objetosEliminados` | Sin interfaz propia (entrada `ObjetoParaPapelera`, `data: any`) | **Ninguno**: guarda la entidad cruda. El usuario solo está en el `PapeleraEvento` | `PapeleraService.prepararBajaEnBatch` |

## Servicios y métodos

### `StorageService` (`providedIn: 'root'`; inyecta `DbFirestoreService` y `UsuarioSesionService`)

| Miembro | Visibilidad | Qué hace | Escribe en | Consumidores externos |
|---|---|---|---|---|
| `_proveedores$` | private | `BehaviorSubject<any>(this.loadInfo('proveedores') \|\| [])` | — | — |
| `proveedores$` | public | `asObservable()` del anterior | — | `ModalVehiculoComponent.ngOnInit` |
| `_users$` | private | `BehaviorSubject<any>(this.loadInfo('users') \|\| [] \|\| null)` | — | Ninguno: nadie se suscribe |
| `updateObservable` | public (implícito) | `switch`: `"proveedores"` → `_proveedores$.next`, `"users"` → `_users$.next`, `default` no hace nada | — | Ninguno (hay una llamada comentada en `SidebarComponent.navegar`) |
| `setInfo` | public | `localStorage.setItem(clave, JSON.stringify(data))` + `updateObservable` | localStorage | `CargaComponent.ngOnInit`, `SidebarComponent.navegar` (los dos con `"ruta"`); internamente `getAllColection` (`"users"`) |
| `loadInfo` | public | `getItem` + `JSON.parse`; `[]` si no existe o el JSON es inválido (con `console.error`) | — | `SidebarComponent.navegar` (`"ruta"`), `RegistroComponent`, `RegistroLogComponent` y `PapeleraComponent` (`'users'`, en `ngOnInit`) |
| `clearAllLocalStorage` | public | `localStorage.clear()` dentro de try/catch (solo `console.error`) | localStorage (borra todo) | `LoginComponent.ngOnInit`, `AuthService.cerrarSesion` |
| `initializerAdmin` | public | Si `usuarioSesion.esRol('dev','admin')` → `getAllColection<any>("users")`; descarta el retorno | (vía `getAllColection`) | `CargaComponent.ngOnInit` (único) |
| `getAllColection` | public (implícito) | Si `loadInfo` trae datos → solo `updateObservable`, sin consultar Firestore. Si no → se suscribe a `dbFirebase.getAllColectionUsers` con `distinctUntilChanged` por `JSON.stringify` y en cada emisión hace `setInfo` + `updateObservable` (doble `next`). Sin handler de error, sin `takeUntil`, sin guardar la `Subscription`. Devuelve `getObservable` | localStorage `users` | Solo `initializerAdmin` |
| `getObservable` | public (implícito) | `'proveedores'` o `'users'`; cualquier otra clave lanza `Error('Componente no reconocido')` | — | Solo `getAllColection` |

### `DbFirestoreService.getAllColectionUsers`

- `query(collection(firestore, coleccion), where("role", "!=", "dev"))`, con un
  `onSnapshot` manual envuelto en `new Observable`.
- Emite `snapshot.docChanges().map(change => ({ id, ...data, type: change.type }))`: **solo
  los cambios de cada snapshot**, no la colección completa. La primera emisión trae todos
  los docs como `added`; las siguientes, solo los modificados, agregados o eliminados
  (incluidos los `removed`, que salen como un elemento más del array).
- Error: `(error) => observer.error(error)`, sin `catchError`.

### `UsuarioSesionService`

- Estado `private usuarioActual: Usuario | null`.
- Constructor → `rehidratarDesdeStorage()`: lee `localStorage['usuarioSesion']` de forma
  síncrona. Si el JSON falla, queda `null`.
- `setUsuario(u)`: memoria + `setItem`. `getUsuarioActual()`, `getRol()`,
  `esRol(...roles)` (`usuarioActual !== null && roles.includes(role)`) y `limpiar()`
  (memoria a `null` + `removeItem`).
- No escucha Firebase Auth: no hay `onAuthStateChanged` ni `authState` en `src/`.
- Solo conoce al usuario de la sesión: no tiene lista ni lookup de otros usuarios.

### `GestionUsuariosService`

- Un único método, `obtenerUsuarios(): Promise<Usuario[]>`: `getDocs(collection('users'))`
  → `doc.data() as Usuario`, sin filtro, sin estado, sin caché, sin listener.
- Único consumidor: `GestionUsuariosComponent.cargarUsuarios`, que filtra
  `role !== 'dev'`. La ruta `usuarios` exige `['dev','admin']`.

### `AuthService` (lo que toca el arranque)

- `iniciarSesion`, en orden:
  1. `await signInWithEmailAndPassword`.
  2. `await obtenerDatosUsuario(uid)` (`getDoc('users/{uid}')`). Si da `null` →
     `/unauthorized`; si da `'sin-rol'` → `/limbo`.
  3. `usuarioSesion.setUsuario(usuario)` (síncrono).
  4. `await logRegistro.registrarAccion('LOGIN', ...)`, que atrapa sus propios errores.
  5. `router.navigate(['/carga'])`.

  `clearAllLocalStorage` no está en este método: corre antes, en `LoginComponent.ngOnInit`.
- `cerrarSesion`: log LOGOUT → `signOut` → `clearAllLocalStorage` →
  `usuarioSesion.limpiar()` (el `removeItem` es redundante tras el `clear`; lo que agrega es
  poner la memoria en `null`) → `navigate(['/login'])`, que dispara un segundo `clear()`
  en `LoginComponent.ngOnInit`.

## Componentes y puntos de consumo

| Componente | Cómo usa `StorageService` | Archivo |
|---|---|---|
| `LoginComponent` | `ngOnInit` → `clearAllLocalStorage()` cada vez que se monta `/login` | `appLogin/login/login.component.ts` |
| `CargaComponent` | `ngOnInit` → `initializerAdmin()`; luego `setTimeout` de 3000 ms (el comentario dice "5000 milisegundos = 5 segundos") → `setInfo("ruta", ["op"])` + `navigate(['op'])`. Tiene campos sin uso (`usuario`, `operaciones`, `opFacturadas`) e imports de `Operacion`/`ConId` | `carga/carga.component.ts` |
| `SidebarComponent` | `navegar(ruta)`: `loadInfo("ruta")`; si `rutaActual[0] !== ruta` → `setInfo("ruta", [ruta])`. Llamada comentada a `updateObservable("ruta", ...)` | `raiz/sidebar/sidebar.component.ts` |
| `RegistroComponent` | `ngOnInit`: `$usuariosTodos = loadInfo('users')`. Comentarios: `syncChangesUsers("users")` y `setInfo("fechasConsulta", ...)` | `raiz/ajustes/registro/registro.component.ts` |
| `RegistroLogComponent` | `ngOnInit`: `usuariosTodos = loadInfo('users')` | `raiz/ajustes/registro-log/registro-log.component.ts` |
| `PapeleraComponent` | `ngOnInit`: `usuariosTodos = loadInfo('users')` | `raiz/ajustes/papelera/papelera.component.ts` |
| `ModalVehiculoComponent` | `ngOnInit`: `proveedores$.pipe(takeUntil(destroy$)).subscribe(data => this.$proveedores = data)` | `raiz/choferes/modal-vehiculo/modal-vehiculo.component.ts` |
| `AuthService` | `cerrarSesion` → `clearAllLocalStorage()` | `servicios/autentificacion/auth.service.ts` |

Más referencias a `StorageService` que no son uso real:
- Inyecciones sin uso: ninguna. Las 8 inyecciones reales usan el servicio.
- Tests: ningún `*.spec.ts` lo nombra y no existe `storage.service.spec.ts`.
- `functions/src/`: ninguna referencia.
- Comentarios:
  - `validar.service.ts`: inyección y un `ValidarService` viejo, todo dentro de `/* */`.
  - `cliente-alta.component.ts`: `getAllSorted` comentado.
  - JSDoc que menciona `StorageService` como reemplazado: `informe-op-listado.component.ts`,
    `operacion.service.ts`, `proveedor.service.ts`, `categoria-documentacion.service.ts` y
    `db-firestore.service.ts` (incluye un "TODO: refactor Log — el log centralizado de
    StorageService no aplica acá").
- Texto visible en la UI: `componentes/limpieza-demo/limpieza-demo.component.html` dice
  "StorageService guarda copias de colecciones en localStorage".

### Resolución identidad → nombre en las tres pantallas

| Pantalla | Fuente | Método | Busca por | Si no encuentra | Si encuentra sin `name` | Lugar en el template |
|---|---|---|---|---|---|---|
| `RegistroComponent` | `loadInfo('users')`, una vez en `ngOnInit` | `getUsuario(email)` | `u.email === email` | `''` (celda en blanco) | `undefined !== ''` → devuelve `undefined` (en blanco) | Columna "Usuario": `getUsuario(r.userEmail)`. El filtro global (`"userEmail"`) y `ordenarPor('usuario')` operan sobre el email |
| `RegistroLogComponent` | ídem | `getUsuario(email)` | `u.email === email` | el email recibido | `undefined` (en blanco) | Columna "Usuario": `getUsuario(r.userEmail)`. El filtro `registrosFiltrados` va por `userEmail` ("Usuario (email)") |
| `PapeleraComponent` | ídem | `getUsuario(email)`, idéntico carácter por carácter al de `RegistroLogComponent` | `u.email === email` | el email recibido | `undefined` (en blanco) | Columna "Usuario", segunda: `getUsuario(e.userEmail)` |

- No comparten lógica: hay tres copias locales (dos idénticas y una variante), sin pipe ni
  util común.
- Ninguna busca por `userId`, aunque las tres colecciones lo guardan.
- Las tres rutas aceptan `['dev','admin','demo']` (`ajustes-routing.module.ts`).
- `PapeleraComponent` inyecta `UsuarioSesionService` solo para `puedeRestaurar`
  (`!esRol('demo')`).

## Colecciones de Firestore y claves de localStorage involucradas

### Firestore

- **`/users/{uid}`** (top-level). La lee `AuthService.obtenerDatosUsuario` (`getDoc`
  propio), `StorageService` vía `getAllColectionUsers` (listener, `role != 'dev'`) y
  `GestionUsuariosService.obtenerUsuarios` (`getDocs`). Reglas:
  `allow read: if autenticado() && (rol() in ['dev','admin'] || request.auth.uid == uid)`,
  donde `rol()` sale del Custom Claim del token, no del documento.
- **`logs`, `registroLog`, `papeleraEventos`, `objetosEliminados`**: ver "Interfaces y
  tipos".

### localStorage (`sessionStorage`: sin ningún uso en `src/`)

| Clave | Escritor | Lector | Forma | Estado |
|---|---|---|---|---|
| `usuarioSesion` | `UsuarioSesionService.setUsuario` (vía `AuthService.iniciarSesion`), directo, sin `StorageService` | `UsuarioSesionService.rehidratarDesdeStorage` (constructor) | JSON de `Usuario` (el doc `/users/{uid}` tal cual) | Viva |
| `usuario` | — | — | — | Muerta: sin ninguna referencia en código |
| `users` | `StorageService.getAllColection` vía `initializerAdmin`, solo con dev/admin y caché vacía | Inicializador de `_users$`; chequeo de caché de `getAllColection`; `ngOnInit` de `RegistroComponent`, `RegistroLogComponent` y `PapeleraComponent` | Array de `{ id, ...docUsuario, type }`, sin dev; después del primer snapshot puede quedar solo el delta | Viva y condicional |
| `proveedores` | **Ninguno** | Inicializador de `_proveedores$` | (array esperado) | **Huérfana** |
| `ruta` | `CargaComponent.ngOnInit` (`["op"]`), `SidebarComponent.navegar` (`[ruta]`) | `SidebarComponent.navegar`, solo para decidir si reescribe la misma clave | Array de un string | Viva, sin efecto funcional |
| `tablero_op_range_v1` | `TableroOpComponent.ngOnInit` (suscripción a `range$`) | `TableroOpComponent.restaurarRangoPropio` (`JSON.parse` sin try/catch) | `{ desde, hasta, tipo }` | Viva |
| `tablero_op_filtros_v2` | `TableroOpComponent.guardarFiltrosEnStorage` | `TableroOpComponent.cargarFiltrosDeStorage` (con `removeItem` si el JSON es inválido); `limpiarFiltrosTotales` también la borra | `{ filtros, clienteSeleccionado, choferSeleccionado }` | Viva |
| `tablero_op_colwidth_v1` | `TableroOpComponent.saveColumnWidths` | `TableroOpComponent.loadColumnWidths` | `Record<string, number>` | Viva |
| `op_cols` | `TableroOpComponent.toggleCol` | `TableroOpComponent.cargarColumnasVisibles` | `string[]` | Viva |
| `informe_op_listado_range_v1` | `InformeOpListadoComponent.ngOnInit` | `InformeOpListadoComponent.restaurarRangoPropio` | `{ desde, hasta, tipo }` | Viva |

Más sobre `ruta`:
- El único llamador de `SidebarComponent.navegar` es el logo del `sidebar.component.html`:
  `<a (click)="navegar('op')">`, sin `routerLink`. `navegar` no usa `Router`, así que ese
  clic no navega.
- Los demás ítems del sidebar usan `[routerLink]` y no tocan `ruta`.
- Ningún código marca un ítem activo a partir de `ruta`.
- En `CargaComponent` la navegación a `op` está fija en el código, no sale del valor.

`clearAllLocalStorage` borra **todas** las claves de la tabla, incluidas las preferencias de
`tablero-op` e `informe-op-listado`, en cada montaje de `/login` y en cada logout. La
persistencia de Firebase Auth no la usa el código (`provideAuth(() => getAuth())` en
`app.module.ts`, sin persistencia propia).

## La secuencia de arranque

1. `/login` → `LoginComponent.ngOnInit` → `localStorage.clear()`. `StorageService` se
   construye al inyectarse en `LoginComponent`, o sea **antes** del `clear`. Por eso
   `_users$` y `_proveedores$` toman lo que hubiera en `localStorage` en ese momento.
2. `AuthService.iniciarSesion` (orden en "Servicios y métodos"). `usuarioSesion` queda
   poblado, en memoria y en `localStorage`, antes de navegar.
3. `/carga` (ruta en `app-routing.module.ts`, `appRoutes`, **sin guard**) →
   `CargaComponent.ngOnInit`:
   1. `initializerAdmin()` como primera sentencia, síncrona.
   2. `setTimeout` de 3000 ms → `setInfo("ruta", ["op"])` → `navigate(['op'])`.
4. `/op` → carga lazy de `RaizModule` → `HomeComponent.ngOnInit` llama a `init()` de
   Chofer, Proveedor, Cliente, Tarifario, CategoriaDocumentacion y Legajo, y a
   `NoDisponibilidadService.init()` si `permisosService.puede('operaciones')`.
   `HomeComponent` no usa `StorageService`.

El único que navega a `/carga` es `AuthService.iniciarSesion`.

### ¿Puede `esRol('dev','admin')` dar false para un dev/admin legítimo?

- **Login normal: no.** `setUsuario` corre de forma síncrona antes de
  `navigate(['/carga'])`, y `esRol` lee la memoria.
- **F5 en cualquier ruta de `RaizModule`:** `CargaComponent` no corre, así que
  `initializerAdmin` tampoco. `UsuarioSesionService` rehidrata de `usuarioSesion` de forma
  síncrona y `RoleGuard.chequearAcceso` decide con eso, sin esperar a Firebase Auth. La
  caché `users` queda como la dejó la pestaña antes de recargar: no se borra ni se vuelve a
  suscribir.
- **F5 sobre `/carga` (ventana de 3 s):** `esRol` da true si existe la clave
  `usuarioSesion`.
- **Sí da false si falta la clave `usuarioSesion` al recargar.** `localStorage` es
  compartido por todas las pestañas del origen. Si otra pestaña monta `/login` (o `''`, que
  redirige a `/login`), su `LoginComponent.ngOnInit` hace `localStorage.clear()`. La
  pestaña original sigue con el usuario en memoria, pero si se recarga la rehidratación da
  `null`: en `/carga` `esRol` da false y en rutas guardadas `RoleGuard` manda a
  `/unauthorized`.
- **`esRol` true no implica permiso en Firestore.** El cliente decide con el `role` del
  documento; las reglas, con el Custom Claim del token. Si el claim falta o está viejo (ver
  "Ventana de propagación" en CLAUDE.md), `initializerAdmin` abre la query y recibe
  `permission-denied`.

### Camino de error de `getAllColectionUsers`

- `onSnapshot` falla → `observer.error(error)`. No hay `catchError` en
  `DbFirestoreService` ni en `StorageService.getAllColection`, cuyo `subscribe` solo tiene
  el callback de next.
- Con eso, RxJS informa el error como no manejado (`reportUnhandledError`, re-lanzado en un
  `setTimeout`). No hay un `ErrorHandler` propio: `ErrorHandler` no aparece en `src/` ni en
  `AppModule.providers`. El error termina en la consola.
- El listener queda terminado y no se reintenta.
- La clave `users` no se escribe y queda ausente, porque el `clear` del login la borró.
  Los tres lectores reciben `[]`.
- `_users$` conserva su valor inicial, que nadie lee.
- No llega ningún aviso al usuario.

## Dependencias con otros módulos

| Dependiente | De qué depende | Modelo |
|---|---|---|
| Ajustes: `RegistroComponent`, `RegistroLogComponent`, `PapeleraComponent` | Caché `users` en `localStorage` para mostrar nombres | `StorageService` (viejo); `RegistroComponent` lee además `logs`, histórico |
| Login / Auth | `clearAllLocalStorage` | `StorageService` |
| Arranque (`CargaComponent`) | `initializerAdmin`, `setInfo('ruta')` | `StorageService` |
| Sidebar | `setInfo`/`loadInfo('ruta')` | `StorageService` |
| Choferes / Proveedores (`ModalVehiculoComponent`, que abren `ChoferesAltaComponent` y `ProveedoresListadoComponent`) | `proveedores$`, valor sin uso | `StorageService` |
| `tablero-op`, `informe-op-listado` | `localStorage` directo, sin `StorageService`, pero alcanzados por `clearAllLocalStorage` | Nuevo |
| Sesión y guards | `usuarioSesion` directo, sin `StorageService`, pero alcanzado por `clearAllLocalStorage` | Nuevo |

## Inconsistencias y deuda detectada

1. **La caché `users` se pisa con deltas.** `getAllColectionUsers` emite `docChanges()` y
   `getAllColection` hace `setInfo('users', data)` con cada emisión. Cualquier cambio en
   `/users` mientras el listener está vivo (alta, edición, baja desde Gestión de usuarios)
   deja en caché solo los documentos cambiados, `removed` incluidos. Desde ahí, las tres
   pantallas dejan de resolver el resto de los nombres.
2. **El listener de `users` nunca se cancela**: no hay `takeUntil` ni se guarda la
   `Subscription`. Sobrevive al logout y podría volver a escribir `users` después del
   `clear()`.
3. **El error del listener queda sin manejar** (ver "Camino de error").
4. **`demo` entra a las tres pantallas sin caché de usuarios.** `initializerAdmin` no carga
   para `demo`, y las reglas tampoco le permitirían la query. Resultado: en
   `RegistroComponent` la columna queda en blanco; en `RegistroLogComponent` y
   `PapeleraComponent` se ve el email.
5. **Los dev nunca están en la caché** (`where("role","!=","dev")`). Afecta a las entradas
   de dev en `logs` (escritores viejos sin exclusión) y en `papeleraEventos`
   (`prepararBajaEnBatch` no excluye a dev). `registroLog` no tiene entradas de dev.
6. **La resolución va por email, no por uid.** Si un usuario cambió de email (existe
   `editarEmailUsuario`), sus entradas viejas dejan de resolver aunque `userId` esté
   guardado.
7. **El fallback cambia según la pantalla** (`''` contra email). En las tres, un usuario
   sin `name` sale en blanco: la condición `name !== ''` no cubre `undefined`.
8. **Las tres pantallas leen la caché una sola vez**, en `ngOnInit`.
9. **`proveedores$` es código muerto.** La clave no tiene escritor y nada emite en el
   subject, así que `proveedores$` siempre da el valor inicial (`[]` en la práctica).
   `ModalVehiculoComponent.$proveedores` está tipado `Proveedor` (singular) y no se lee ni
   en el `.ts` ni en el `.html`. En el mismo componente, `proveedorSeleccionado` y
   `changeProveedor` tampoco se usan en el template. El `seguimientoForm.proveedor` es texto
   libre de seguimiento satelital, sin relación con la colección `proveedores`.
10. **`ruta` no tiene efecto funcional.** Además, el logo del sidebar no navega.
11. **`clearAllLocalStorage` borra las preferencias de UI** de `tablero-op` e
    `informe-op-listado` en cada login y logout.
12. **`clearAllLocalStorage` no toca la memoria.** No limpia `usuarioActual` (eso lo hace
    `limpiar()`, solo en el logout) ni los subjects de `StorageService`.
13. **Tipado laxo:**
    - los subjects son `<any>`;
    - el parámetro `componente: any` de `updateObservable`;
    - el `|| [] || null` redundante de `_users$`;
    - `getAllColection` y `getObservable` son públicos sin uso externo.
14. **Restos en `CargaComponent`:** campos e imports sin uso y un comentario de duración que
    no coincide con el código (3000 ms contra "5 segundos").

### Documentación desactualizada (Bloque 6)

Vigente y correcto:
- CLAUDE.md:
  - "State management" (párrafo `StorageService`);
  - el párrafo de `UsuarioSesionService`;
  - "Convenciones → Logging";
  - "Security Rules → `historicoSoloLectura`".
- `subsistema-papelera`, sección "Hecho — eliminación del camino legado de la papelera".
- `subsistema-log`:
  - "Hecho — eliminación del log viejo";
  - "Fix — `cerrarSesion()`".
- `lazy-loading-y-fechas`, deuda "`StorageService.proveedores$`".

Desactualizado o incorrecto:

| Documento | Sección | Qué dice | Estado |
|---|---|---|---|
| CLAUDE.md | Deuda abierta → "Lo que queda de `StorageService`" | "`obtenerUsuarios()` filtra `role !== 'dev'` siempre" | **Incorrecto**: el filtro está en `GestionUsuariosComponent.cargarUsuarios` |
| CLAUDE.md | Servicios clave, fila `storage/` | caché `ruta`, `users` y `clearAllLocalStorage` | Incompleto: omite `proveedores$` |
| CLAUDE.md | Escritura en Firestore | "ya NO usa `StorageService.deleteItemPapeleraCompuestoAsync()`" | Nombra un método que no existe desde LR2a, sin aclararlo |
| CLAUDE.md | Estado en memoria | "`init()` se llama desde HomeComponent" | Impreciso: `VendedorService.init()` va por `vendedor-control`/`recalculo-comisiones` |
| `lazy-loading-y-fechas` | Retiro del camino viejo | "StorageService pasó de 1047 a 337 líneas"; rótulo "Se quedan" | Cifra histórica: hoy son 133 líneas, y de "Se quedan" solo queda `RegistroComponent` |
| `herramientas-demo` | Limpieza de demo | "StorageService cachea colecciones en localStorage" | Desactualizado: solo `users` y `ruta`. El mismo texto está en `limpieza-demo.component.html` |
| `botones-y-permisos` | Frente Botones y Permisos | "los 11 módulos reales de `permitido()`" | Desactualizado: `ModuloReglas` tiene 16, y `historicoSoloLectura` (de `beb4d26`) no tiene equivalente en `ModuloReglas`/`matrizBase` |
| `modulo-operaciones` | Deuda → persistencia de filtros/rango | `localStorage` "para sobrevivir F5" | No menciona que `clearAllLocalStorage` borra esas claves en cada login y logout |
| `docs/auditorias/eliminacion-papelera-legado-y-log-viejo.md` | §5 (callers de `StorageService` y métodos de `DbFirestoreService` sin caller), §7 (`papelera-legado` "viva"), §8 (mapeo `'logs': 'logs'`, `'papelera': 'papelera'`) | Foto previa a `30526b9` y `beb4d26` | Sin nota de ejecución |
| `docs/auditorias/baja-y-restauracion-de-operacion.md` | §3.b "Camino legado… Sigue vivo" y las tablas con `TableroService`, `reactivarItem`, `PapeleraLegadoComponent` | Código eliminado como vivo | Sin nota |
| `docs/auditorias/no-disponibilidad-choferes-vehiculos-proveedores.md` | Todo lo referido a `StorageService`/`LogService` y al listener de Home sobre `noOperativo` | `listenForChangesField`, `addItem`, `updateItem`, `controlLog` | Ninguno existe; sin nota |
| `CHANGELOG.md` | "Pendiente" de Ajustes; "Se quedan el Registro viejo y la Papelera legado" | — | Histórico por política del archivo, pero contradice el estado actual. No hay entradas para `30526b9` ni `beb4d26` |

La secuencia de arranque no está documentada en ningún lado:
- la ruta `/carga` y su espera de 3 s;
- el `clear()` de `LoginComponent.ngOnInit`;
- el alcance real de `clearAllLocalStorage`;
- la caché de deltas.

## Preguntas abiertas

1. **Orden Auth/Firestore tras F5 sobre `/carga`.** ¿El `onSnapshot` de
   `getAllColectionUsers` puede salir antes de que Firebase Auth restaure el usuario de
   forma asíncrona y fallar como no autenticado? El SDK normalmente espera el estado
   inicial de Auth, pero el repo no lo confirma.
2. **Claim y documento desalineados.** ¿Existen hoy, en demo o en producción, dev/admin con
   el Custom Claim ausente o desactualizado respecto de `role` en `/users`? En ese caso
   `esRol` da true y la query de `initializerAdmin` falla con `permission-denied`, en
   silencio para el usuario.
3. **Cómo se ve el error no manejado.** ¿Sale como "ERROR" por el `ErrorHandler` por
   defecto de Angular o como error no capturado de `window`? Depende de si el
   `onSnapshot` de `@angular/fire` corre dentro de la zona.
4. **Caché de deltas en la práctica.** ¿Pasa con usuarios reales? Requiere un cambio en
   `/users` con el listener vivo, por ejemplo un admin que edita usuarios en la misma
   sesión en que entró por `/carga`. Leyendo el código pasa; no se reprodujo.
5. **Entradas de dev.** ¿Cuántas entradas de `logs` y `papeleraEventos` escribió un dev
   (que nunca resuelven nombre por la caché)? Requiere leer datos.
6. **Emails cambiados.** ¿Hay usuarios con email cambiado cuyas entradas viejas ya no
   resuelven? Requiere datos.
7. **Usuarios sin `name`.** ¿Hay docs de `/users` sin campo `name`? Saldrían en blanco en
   las tres pantallas.
8. **Preferencias borradas en cada login.** ¿Es intencional que se borren las preferencias
   de `tablero-op` e `informe-op-listado`, o es un efecto lateral del `localStorage.clear()`
   pensado para las cachés viejas? El código no lo dice.
9. **Restos en navegadores.** ¿Quedan claves `proveedores` o `usuario` en navegadores
   reales? Las borraría el primer `clear()`, pero el inicializador de `_proveedores$` lee
   antes del `clear` de `LoginComponent`.
10. **Propósito de `/carga`.** ¿La pantalla con su espera de 3 s tiene otro propósito
    además de `initializerAdmin`, por ejemplo uno visual? El template no se auditó en
    detalle.
