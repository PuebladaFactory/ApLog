# Diseño — Eje de sesión: reconciliación de Firebase Auth con la sesión de la app

Fecha: 2026-11-05 · Rama: `refactor` · Auditoría: `docs/auditorias/eje-de-sesion-auth-rehidratacion-y-guard.md`

Estado: **spec, sin implementar.** Las contradicciones C1 a C6 quedaron decididas en el chat
de diseño el 2026-11-05 y están resueltas abajo, igual que el timeout y el `role` inválido.
Único punto abierto: el texto de `/limbo`, que sigue siendo una propuesta a confirmar.

## El problema

La app puede tener un usuario que Firebase no tiene, y al revés.

- `RoleGuard` decide con la sesión que `UsuarioSesionService` rehidrata de
  `localStorage['usuarioSesion']`, sin validarla.
- Firebase Auth (IndexedDB) no se escucha en ningún lado: no hay `onAuthStateChanged`
  ni `authState`.
- Firestore, las reglas y las Cloud Functions deciden con Firebase Auth y el Custom Claim.
- Nadie compara las dos fuentes.

## Dirección elegida

En este orden:

1. **Bloque 1:** cerrar las fugas de sesión que ya existen, que no dependen del eje.
2. **Bloque 2:** reconciliar. `UsuarioSesionService` escucha Firebase Auth y `RoleGuard`
   espera a que la sesión esté resuelta.
3. **Bloque 2b:** una red de seguridad ante `permission-denied`.
4. **Bloque 3:** que `/login` deje de mentir.

### Por qué `browserSessionPersistence` queda fuera

Queda fuera de este frente a propósito. Con la reconciliación puesta deja de ser un arreglo
y pasa a ser una política (cuánto dura una sesión), que se decide después.

**No puede ir sola, sin la reconciliación.** Al cerrar el navegador se borraría la sesión de
Auth, pero `usuarioSesion` sobrevive en `localStorage`. Entonces:

- `RoleGuard` deja pasar igual;
- los listeners salen sin autenticar y vuelven `permission-denied`;
- ningún listener tiene manejo de error.

El resultado sería una app vacía en silencio, todas las mañanas, con todos los usuarios.

## Contradicciones con el marco (van primero)

Las encontré al contrastar el marco con el código. Las dos primeras **necesitan una decisión
de Nico antes de implementar el bloque 2b**. Las otras están resueltas en esta spec o sólo
cambian la documentación.

### C1. `permission-denied` no siempre significa que la sesión es mentira

**Lo que dice el marco:** "Sólo `permission-denied` y `unauthenticated` significan que la
sesión es mentira".

**Lo que dice el código:**

- `manager` no tiene `leer` en ningún módulo de `permitido()` (`firestore.rules`).
  `PermisosService.matrizBase` lo dice explícito: "'manager' no aparece en ningún módulo de
  permitido() — sin acceso".
- Aun así, `raiz-routing` le abre `clientes`, `choferes`, `op`, `proveedores`, `liquidacion`
  y `legajos`.
- `HomeComponent.ngOnInit` abre los 9 listeners para todos los roles.

**Consecuencia:** hoy un `manager` ve la app vacía y los errores van a la consola. Con la red
del 2b tal como está escrita en el marco, **cada login de un `manager` termina deslogueado al
instante**: el primer listener vuelve `permission-denied`, la red cierra la sesión y lo manda
a `/login`.

Lo mismo le pasa a quien tenga el rol de `/users` distinto del Custom Claim, dentro de la
ventana de propagación (hasta 1 h). Por ejemplo, un `manager` al que acaban de pasar a
`user` con la sesión abierta. Eso convertiría la ventana del claim, que el frente deja como
está, en deslogueos.

**DECIDIDO (2026-11-05): se adopta esta recomendación.**

- **`unauthenticated`:** actúa siempre.
- **`permission-denied`:** actúa sólo si, en ese momento, Firebase Auth **contradice** a la
  sesión de la app: `auth.currentUser` es `null`, o su uid no es el de la sesión.
- **`permission-denied` con Auth y app de acuerdo:** la matriz de reglas le niega algo a un
  rol. No es un problema de sesión, así que no se toca: queda como hoy.

Esto cubre todas las preguntas abiertas que el marco quiere convertir en "te manda a
loguearte":

- Auth borrada de IndexedDB, refresh token revocado o logout en otra pestaña: en todos esos
  casos `currentUser` pasa a `null`.
- Tokens inválidos con usuario presente: vuelven `unauthenticated`.

**Alternativa descartada:** el criterio literal del marco más un parche para `manager`, por
ejemplo que `HomeComponent` no abra listeners que el rol no puede leer. Toca la matriz de
permisos, que está fuera de alcance.

**Por qué se decide así.** Un `permission-denied` con Auth y la app de acuerdo es un desacuerdo
entre la matriz de reglas y el gating de la UI —deuda ya registrada como "Permisos de UI
dispersos"— y no un problema de sesión. Con el criterio literal, cada uno de esos desacuerdos
se convertiría en un deslogueo forzado, y el caso `manager` lo demuestra.

**Nota sobre el discriminante.** "Auth no tiene usuario" llega como `permission-denied`, no
como `unauthenticated`: el pedido sale sin autenticar y las reglas lo niegan. Por eso mirar
`auth.currentUser` en el momento del error es lo que separa los dos casos, y por eso la red
sigue cubriendo todo lo que tenía que cubrir.

**Deuda que este criterio deja a la vista, para registrar en el bloque de cierre:** `manager`
pasa `canMatch` en seis rutas y recibe `permission-denied` en los nueve listeners. Hoy no hay
ningún usuario `manager` activo. Es del frente diferido de reglas y matriz (skill
`botones-y-permisos`), no de este.

### C2. La tabla de reconciliación conserva la sesión ante un `permission-denied` sobre `/users/{uid}`

**Lo que dice el marco:** si el `getDoc` falla ("sin conexión, o `permission-denied`") y el
uid coincide, se conserva la sesión rehidratada.

**Lo que dice el código:** `firestore.rules` deja leer `/users/{uid}` a cualquier usuario
autenticado sobre su propio documento (`request.auth.uid == uid`). Un `permission-denied`
sobre el documento propio sólo puede venir de un pedido **sin autenticar**. Es decir, la
sesión es mentira, que es exactamente el criterio del 2b.

Conservar la sesión ahí contradice al 2b dentro del mismo frente.

**DECIDIDO (2026-11-05): se adopta esta recomendación.**

- Sólo los errores de conexión y el timeout conservan la sesión (`unavailable`,
  `deadline-exceeded`, "client is offline" y el timeout propio de la reconciliación).
- `permission-denied` y `unauthenticated` sobre `/users/{uid}` → `limpiar()`.

Lo que el marco quería proteger con esa fila era el F5 sin conexión, y eso lo cubren las filas
7 y 8, que son las de los errores de conexión y el timeout. Conservar también ante un
`permission-denied` protegía un caso que no existe y contradecía al 2b dentro del mismo frente.

La tabla del bloque 2 queda escrita con esta decisión (fila 9).

### C3. Un login no siempre dispara `onAuthStateChanged`

**Lo que dice el marco:** la reconciliación "se dispara por el mismo login, porque
`signInWithEmailAndPassword` cambia el estado de Auth".

**Lo que dice el SDK:** en `@firebase/auth` 1.10.8 (`AuthImpl.notifyAuthListeners`),
`onAuthStateChanged` sólo dispara cuando cambia el uid (`lastNotifiedUid !== currentUid`).
Si Auth ya tenía al mismo usuario, el login no produce evento. Pasa, por ejemplo, cuando la
reconciliación limpió la sesión de la app por un `getDoc` fallido y la persona vuelve a
entrar con la misma cuenta.

**Consecuencia:** un `iniciarSesion` que sólo esperara al evento quedaría colgado hasta el
timeout.

**Resuelto en el diseño:** `iniciarSesion` pide la reconciliación explícitamente y se
deduplica con la del evento (ver "El escritor único").

### C4. `/unauthorized` se queda sin ningún navegador

**Lo que dice el marco:** "`/unauthorized` queda para 'estás logueado y esto no te
corresponde'".

**Lo que dice el código:** hoy sólo llegan dos caminos a `/unauthorized`, y el frente cambia
los dos:

- `RoleGuard` sin sesión: pasa a ir a `/login`.
- `iniciarSesion` en la rama `null`: pasa a ir a `/limbo` (bloque 1).

"Logueado y sin acceso a esto" ya es `/limbo`, y el guard no cambia ese destino. Después del
frente, `/unauthorized` sólo se alcanza escribiendo la URL. Es la misma pantalla que `'**'`
(`PagenotfoundComponent`).

**DECIDIDO (2026-11-05): la ruta `unauthorized` se retira, en el bloque de cierre de este
frente.**

- `PagenotfoundComponent` se conserva: sigue sirviendo `'**'`. Lo que sale es la ruta.
- Va en el cierre y no en el bloque 2 por dos razones: la verificación manual del bloque 1
  todavía aterriza en `/unauthorized` (caso 4), y así los bloques de comportamiento quedan
  verificados antes de la limpieza.
- Condición previa: barrido de `unauthorized` en `src/` (`.ts` y `.html`). Si algo más navega
  ahí, la decisión vuelve a la mesa en vez de retirarse a ciegas.

### C5. La deuda "sesión que sobrevive a la pantalla de login" no se cierra entera

Hay dos cosas distintas dentro de esa deuda:

- **La mentira** (dos fuentes de sesión sin reconciliar, `/login` que no la ve): este frente
  la cierra.
- **La supervivencia** (quien cerró el navegador sin desloguearse entra sin contraseña):
  sigue, por diseño. Es exactamente la política de persistencia que el marco deja fuera.

Al cierre, la deuda no se borra: se **reformula** como "política de persistencia de la sesión
pendiente". El bloqueante de `migracion-vantruck` pasa a ser esa decisión de política (ver
"Documentación que invalida este frente").

### C6. La "divergencia inversa segura" de `cerrarSesion` no es estable con la reconciliación

**Lo que dice el marco:** si `signOut` lanza, la app queda sin sesión y Auth autenticado, y
esa es la dirección segura.

**Matiz:** es cierto mientras la pestaña viva. En el próximo F5, la reconciliación ve a Auth
con usuario y **reconstruye la sesión**: el logout fallido se deshace solo.

No lo considero bloqueante: `signOut` es local (borra la persistencia) y es muy raro que
falle. Queda anotado para que nadie lo descubra como bug.

**DECIDIDO (2026-11-05): se acepta y se registra como deuda de una línea, no se construye el
arreglo.** El arreglo sería una marca persistente de "cierre pedido" que la reconciliación
honrara reintentando `signOut` en vez de reconstruir la sesión. Se descarta por
proporcionalidad: es otra clave origin-wide en `localStorage`, con semántica entre pestañas
propia (habría que borrarla ante cualquier login exitoso, incluido uno hecho en otra pestaña),
para cubrir la falla de una llamada local que casi nunca falla. La deuda a registrar en el
cierre: **un `signOut` que falla deja el logout deshecho en el próximo F5.**

## Invariantes del frente

1. **Ninguna rama que decida sobre la sesión termina sin haber llamado a `setUsuario` o a
   `limpiar`.**
   - Cada bloque lista, por método, qué deja la sesión en cada salida.
   - Que la reconciliación llame a `setUsuario` antes de que `iniciarSesion` decida cuenta
     como llamado: la rama no termina sin que haya ocurrido.
   - `RoleGuard`, `LoginComponent` y los demás consumidores **leen** la sesión, no deciden
     sobre ella: el invariante no les aplica.
2. **El manejador de sesión inválida no se inyecta en `DbFirestoreService`.** La capa de datos
   no recibe servicios inyectados: es lo que causa dependencias circulares. Los listeners se
   vigilan en los servicios por entidad, donde se suscriben.

## Bloque 1 — las fugas de sesión

Deja el proyecto compilando. No depende de los demás bloques. El bloque 2 reescribe
`iniciarSesion` encima de este, y las ramas quedan con la misma semántica.

**Archivos:**
- `src/app/servicios/autentificacion/auth.service.ts`
- `src/app/limbo/limbo.component.ts`
- `src/app/limbo/limbo.component.html`

### `AuthService.iniciarSesion`

- **Rama `null`** (no existe `/users/{uid}`): `signOut` + `limpiar()` y después navegar a
  `/limbo`. Hoy navega a `/unauthorized`: cambia de destino.
- **Rama `'sin-rol'`:** `signOut` + `limpiar()` y después `/limbo`.
- **El `catch`** (credenciales inválidas, red): agrega `limpiar()`.
  - Si `signInWithEmailAndPassword` lanzó, Auth no cambió.
  - La sesión de la app no debería existir, porque el formulario se usa sin sesión. Pero hoy
    `/login` no lo garantiza: hasta el bloque 3, el formulario se muestra con la sesión
    puesta.
  - El `limpiar()` hace literal el invariante.

**Qué deja la sesión en cada salida:**

| Salida | App (`usuarioSesion`) | Firebase Auth | Navega a |
|---|---|---|---|
| Con rol | `setUsuario(usuario)` | autenticado | `/carga` (log LOGIN) |
| `null` | `limpiar()` | `signOut` | `/limbo` |
| `'sin-rol'` | `limpiar()` | `signOut` | `/limbo` |
| `catch` | `limpiar()` | sin cambios (no se autenticó) | se queda en `/login` (Swal) |

### `AuthService.cerrarSesion`

Orden nuevo:

1. Log LOGOUT, si hay sesión. Va primero porque las reglas exigen autenticado y
   `construirEntrada` firma con la sesión. No cambia.
2. `limpiar()`.
3. `signOut` en su propio `try/catch`: si lanza, `registrarError` (best-effort).
4. `navigate(['/login'])`.

`limpiar()` y la navegación corren aunque `signOut` lance.

**Por qué `limpiar()` va antes de `signOut`, y no en un `finally`:**

- Que corran aunque `signOut` lance se lograría igual con un `finally`.
- El orden es lo que deja que el bloque 2b distinga un logout deliberado de una sesión
  perdida: cuando Auth avisa `null`, la app ya no tiene sesión que perder (ver 2b).

**Costo:** el `registrarError` de un `signOut` fallido queda firmado como `'Desconocido'`,
porque la sesión ya está limpia. Lo acepto: la escritura es best-effort y el caso es raro.

**Si `signOut` lanza:** la app queda sin sesión y Auth autenticado. Es la divergencia inversa
y es la dirección segura: la app no muestra nada y las reglas siguen mandando. Con el bloque
2, un F5 la deshace (C6).

| Salida | App | Auth | Navega a |
|---|---|---|---|
| Normal | `limpiar()` | `signOut` | `/login` |
| `signOut` lanza | `limpiar()` | sigue autenticado | `/login` |

### `LimboComponent.volver` ("Salir")

Llama a `AuthService.cerrarSesion()` en vez de navegar directo a `/login`.

Tiene que tolerar que no haya ni sesión de app ni usuario de Auth, que es el caso de las
ramas `null` y `'sin-rol'`. Las dos cosas están verificadas:

- **`signOut` sin usuario es inocuo.** En `@firebase/auth` 1.10.8, `AuthImpl.signOut` corre
  `beforeStateQueue.runMiddleware(null)` y después `_updateCurrentUser(null)`. No hay
  middleware registrado (en `src/` no hay ningún `beforeAuthStateChanged`), así que poner
  `null` sobre `null` no lanza. Tampoco dispara `onAuthStateChanged`, porque el uid no
  cambia.
- **El log LOGOUT ya está condicionado a que haya sesión:** `cerrarSesion` hace
  `if (usuario)` sobre `getUsuarioActual()`.

Para la otra población (viene del guard, con sesión y rol), "Salir" pasa a ser un logout
real, con log LOGOUT. Hoy dejaba las dos sesiones vivas.

### Texto de `/limbo` — **PROPUESTA, a confirmar por Nico antes de implementarla**

**Hoy dice:** "¡Bienvenido!" / "Su correo electrónico ha sido verificado exitosamente…". Es
de la era de la verificación de email.

**Después de este bloque, `/limbo` recibe dos poblaciones:**
- con sesión y rol, pero sin acceso a esa ruta (viene del guard);
- sin documento o sin rol (viene del login). Ahí ya no hay sesión de ninguna de las dos
  clases.

El texto no puede afirmar que hay sesión ni hablar de email.

> **Título:** "Sin acceso"
> **Cuerpo:** "Tu usuario no tiene acceso a esta sección, o todavía no está habilitado en la
> aplicación. Si creés que es un error, hablá con un administrador."

El botón "Salir" se mantiene. Si el texto no está confirmado al implementar, el bloque sale
igual con la lógica y el texto espera.

### Verificación manual (Nico)

1. **Login con un usuario de Auth sin documento en `/users`.**
   - Hace falta crearlo en demo por consola. Es una escritura en demo: la hace Nico.
   - Esperado: termina en `/limbo` con el texto nuevo.
   - En DevTools → Application, `localStorage` sin la clave `usuarioSesion` e IndexedDB
     `firebaseLocalStorageDb` sin la entrada `firebase:authUser:…`.
2. **Lo mismo con un documento sin `role`.**
3. **"Salir" desde `/limbo` después de 1 o 2.**
   - Llega a `/login`.
   - Sin errores en la consola.
   - Ninguna entrada LOGOUT nueva en `registroLog`.
4. **Fuga original.**
   - Pasos: login como A, escribir `/login` (todavía muestra el formulario) y loguearse con
     el usuario sin documento.
   - Esperado: termina en `/limbo`; escribir `/op` lleva a `/unauthorized` (sin sesión, el
     guard todavía la manda ahí en este bloque); "Volver" lleva a `/login`.
   - Hoy lleva a `/op` con el rol de A.
5. **Logout normal desde el sidebar** con `admin` y con `user`: llega a `/login` y queda la
   entrada LOGOUT.
6. **`/limbo` desde el guard.**
   - Pasos: con `demo`, ir a `/ajustes/usuarios`. Termina en `/limbo`.
   - Esperado: "Salir" deja LOGOUT y llega a `/login`; un F5 posterior sobre `/op` no entra.
7. **`signOut` que lanza:** no se puede provocar a mano. Queda verificado por lectura del
   código. Lo digo así para no inventar una prueba.

## Bloque 2 — la reconciliación

Deja el proyecto compilando.

**Archivos:**
- `src/app/servicios/usuario-sesion/usuario-sesion.service.ts`
- `src/app/servicios/usuario-sesion/reconciliacion-sesion.util.ts` (nuevo) y su `.spec.ts`
- `src/app/guards/role.guard.ts` y `src/app/guards/role.guard.spec.ts` (nuevo)
- `src/app/servicios/autentificacion/auth.service.ts`

### `UsuarioSesionService`

**Lo que no cambia:**
- La rehidratación síncrona del constructor se conserva, con una validación mínima nueva
  (decidida el 2026-11-05): si el JSON no trae un `uid` no vacío y un `role` de los cinco de
  `RolUsuario`, la sesión rehidratada queda en `null`. Son dos condiciones, no una validación
  de forma completa. Cierra la inconsistencia 5 de la auditoría también para la fila 7, que es
  la única salida que usa lo rehidratado.
- `getUsuarioActual()`, `getRol()`, `esRol(...)`, `setUsuario(usuario)` y `limpiar()` **no
  cambian de firma**. Los 40 archivos que lo consumen quedan intactos, y también la spec
  existente (`usuarios-consulta.service.spec.ts`, que usa un `SpyObj`).

**Lo que agrega:**
- **Inyecta `Auth` y `Firestore` de AngularFire**, no `DbFirestoreService`:
  - `/users` es top-level, fuera de `/Vantruck/datos/`;
  - es lo mismo que hace hoy `AuthService`.
  - No hay ciclo: `DbFirestoreService` sólo inyecta `Firestore`, y ninguna dependencia de
    `Auth` o `Firestore` inyecta `UsuarioSesionService`.
- **Lectura de `/users/{uid}`:** `obtenerDatosUsuario` sale de `AuthService` y se convierte
  en la lectura privada de la reconciliación. Mismo `getDoc`, mismas tres salidas
  (`Usuario`, `'sin-rol'`, sin documento), más un timeout. Cambia una cosa (decidida el
  2026-11-05): un `role` que no sea uno de los cinco de `RolUsuario` se trata como
  `'sin-rol'`, no como rol válido (fila 11 de la tabla).
- **Suscripción viva en el constructor**, después de rehidratar:
  `onAuthStateChanged(auth, user => …)`. Es para toda la vida del servicio (root), no sólo el
  primer evento. Cada evento dispara una reconciliación para ese `user`, o `null`.
- **`sesionResuelta(): Promise<void>`.**
  - Resuelve cuando terminó la primera reconciliación y no hay ninguna en curso.
  - Después de la primera, si no hay una en curso, resuelve enseguida.
  - Es lo que espera el guard.
- **Espera del login:** `marcaReconciliacion()` y
  `resultadoPara(uid, marca): Promise<ResultadoReconciliacion>`. Ver "El escritor único".
- **`sesionPerdida`** (getter de solo lectura), para el 2b.
  - Es `true` cuando una reconciliación limpió una sesión que estaba puesta, sin que nadie
    llamara a `limpiar()` antes.
  - `setUsuario` y `limpiar()` la vuelven a `false`.
  - La reconciliación limpia por un camino privado que sí la marca.

**Tipos (en `reconciliacion-sesion.util.ts`):**

```ts
export type LecturaUsuario =
  | { tipo: 'ok'; usuario: Usuario }
  | { tipo: 'sin-documento' }
  | { tipo: 'sin-rol' }
  | { tipo: 'error'; codigo: string };   // código de FirestoreError, o 'timeout'

export type ResultadoReconciliacion =
  | 'establecida'      // setUsuario con lo leído
  | 'conservada'       // lectura fallida, mismo uid: setUsuario(sesión en memoria)
  | 'sin-documento'    // limpiar
  | 'sin-rol'          // limpiar
  | 'sin-auth'         // limpiar
  | 'fallo';           // lectura fallida sin sesión del mismo uid: limpiar

/** Pura: sin Firebase, sin inyección. La tabla de abajo es su contrato. */
export function decidirReconciliacion(
  authUid: string | null,
  enMemoria: Usuario | null,
  lectura: LecturaUsuario | null,   // null cuando authUid es null (no se lee)
): { resultado: ResultadoReconciliacion; usuario: Usuario | null };
```

**`enMemoria` es la sesión en memoria al momento de reconciliar.** En un F5 es la
rehidratada. En vivo es la que haya.

El servicio aplica el resultado:
- `usuario !== null` → `setUsuario(usuario)`;
- si no → `limpiar()`, por el camino que marca `sesionPerdida` si había sesión.

**Invariante:** las seis salidas llaman a `setUsuario` o a `limpiar`. `'conservada'` hace
`setUsuario` con la sesión en memoria (reescribe lo mismo) para que ninguna rama termine sin
llamar a ninguno.

### Tabla de reconciliación

| # | Auth | Lectura de `/users/{uid}` | Sesión en memoria | Resultado | Sesión queda |
|---|---|---|---|---|---|
| 1 | sin usuario | — (no se lee) | cualquiera | `sin-auth` | `limpiar()` |
| 2 | uid X | ok, con rol | ninguna | `establecida` | `setUsuario(doc)` |
| 3 | uid X | ok, con rol | uid X (rol igual o distinto) | `establecida` | `setUsuario(doc)`: el rol desactualizado o manipulado en `localStorage` se corrige |
| 4 | uid X | ok, con rol | uid Y | `establecida` | `setUsuario(doc)`: la identidad es la de Auth |
| 5 | uid X | sin documento | cualquiera | `sin-documento` | `limpiar()` |
| 6 | uid X | sin `role` | cualquiera | `sin-rol` | `limpiar()` |
| 7 | uid X | error de conexión o timeout | uid X | `conservada` | `setUsuario(en memoria)`: la identidad coincide; lo único sin verificar es la frescura del rol |
| 8 | uid X | error de conexión o timeout | uid Y o ninguna | `fallo` | `limpiar()` |
| 9 | uid X | `permission-denied` / `unauthenticated` | uid X | `fallo` (C2, decidido) | `limpiar()`: sobre el documento propio ese error sólo puede venir de un pedido sin autenticar |
| 10 | uid X | `permission-denied` / `unauthenticated` | uid Y o ninguna | `fallo` | `limpiar()` |
| 11 | uid X | ok, con `role` fuera de `RolUsuario` | cualquiera | `sin-rol` | `limpiar()` (decidido el 2026-11-05) |

**Notas sobre la tabla:**

- **Errores de conexión** (filas 7 y 8): `unavailable`, `deadline-exceeded`, el
  "client is offline" de `getDoc` y el timeout propio. Cualquier otro código no listado cae en
  la fila 8 o en la 10 según la sesión, nunca conserva.
- **Timeout:** `TIMEOUT_RECONCILIACION_MS` = **5 s** (decidido el 2026-11-05; la spec proponía
  10 s).
  - Hace falta porque `getDoc` sin conexión y sin caché puede tardar hasta que Firestore
    declara el cliente offline, del orden de 10 s. El timeout propio corta antes a propósito:
    para eso está.
  - Por qué 5 y no 10: este timeout no es un detalle interno, es cuánto dura la pantalla en
    blanco antes de la primera ruta protegida. Y la salida del timeout no es un deslogueo sino
    la fila 7, o sea entrar con la sesión conservada: una app que funciona. Esperar 10 s para
    llegar a lo mismo es la peor de las dos fallas.
  - Sigue siendo una constante nombrada y se ajusta con la prueba sin conexión del bloque 2.
- **La reconciliación no llama a `signOut`.** En las filas 5, 6, 8 y 10, Auth puede quedar
  autenticado con la app sin sesión: es la divergencia en la dirección segura.
  - Escribir en Auth desde un listener de Auth abre la puerta a bucles.
  - Quien decide cerrar Auth es el gesto: `iniciarSesion`, `cerrarSesion` o el manejador del
    2b.
  - En un F5, ese estado se vuelve a leer, vuelve a dar el mismo resultado y es estable.
- **Consecuencia aceptada de la fila 7** (por el marco):
  - Un `usuarioSesion` con el rol manipulado más un F5 sin conexión conserva el rol
    manipulado.
  - Al volver la conexión no hay evento de Auth, así que dura hasta el próximo F5.
  - Las reglas siguen decidiendo por el claim, así que la manipulación no da acceso a datos.

### `RoleGuard`

**Lo que no cambia:**
- Las **21 declaraciones no se tocan**: 13 `canMatch: [RoleGuard]` en `raiz-routing` y 8
  `canActivate: [RoleGuard]` en `ajustes-routing`, `choferes-routing`, `clientes-routing` y
  `proveedores-routing`.
- Sigue sin devolver nunca `false` (ver el comentario existente sobre `canMatch`).

**Lo que cambia:** sólo `role.guard.ts`.
- `canMatch` y `canActivate` devuelven `Promise<true | UrlTree>`. El router ya acepta
  `MaybeAsync<GuardResult>` en los dos hooks.
- Cuerpo: `await this.usuarioSesion.sesionResuelta()` y después `chequearAcceso(data)`, igual
  que hoy salvo un destino.

**Salidas:**

| Sesión resuelta | Devuelve |
|---|---|
| con rol incluido en `data.roles` | `true` |
| sin sesión | `UrlTree('/login')` (**cambia**; hoy `/unauthorized`) |
| con sesión, rol no incluido | `UrlTree('/limbo')` (sin cambios) |

### El escritor único de la sesión

**El problema:** después de este bloque hay dos caminos que establecen la sesión.

- `iniciarSesion` hace hoy su propio `getDoc` y su propio `setUsuario`.
- La reconciliación se dispara por el mismo login.

Son dos escritores y dos `getDoc` para el mismo hecho.

**Resolución:** **la reconciliación es el único escritor.**

- `iniciarSesion` autentica, espera el resultado de la reconciliación para el uid que acaba
  de autenticar y, según ese resultado, decide la navegación y el log LOGIN.
- `AuthService` deja de inyectar `Firestore` y de leer `/users`.
- El log LOGIN se queda en `iniciarSesion`: es el gesto, no el estado.

**Mecanismo de la espera.** Tiene que cubrir tres órdenes posibles:
- el evento de Auth llega antes de que `signInWithEmailAndPassword` resuelva;
- el evento llega después;
- no hay evento, porque el uid no cambió (C3).

Funciona así:

1. Antes de `signInWithEmailAndPassword`, `iniciarSesion` toma
   `marca = usuarioSesion.marcaReconciliacion()`. Es un contador de reconciliaciones
   iniciadas.
2. Con el `result.user.uid` en mano, llama a `usuarioSesion.resultadoPara(uid, marca)`, que
   resuelve con lo primero que aplique:
   - si hay una reconciliación **en curso** para ese uid, se suma a su promesa (no hay un
     segundo `getDoc`);
   - si una reconciliación para ese uid **terminó después de la marca**, devuelve su
     resultado;
   - si no hay ninguna, **inicia una** para ese uid. Es el caso sin evento.
3. Cuando el evento de Auth llega tarde y encuentra una reconciliación en curso para el mismo
   uid, se suma a ella en vez de iniciar otra.

La lógica de "en curso, terminada después de la marca o nueva" vive en una clase chica sin
Firebase, en `reconciliacion-sesion.util.ts`. Recibe la función que reconcilia un uid, para
poder testearla sin Firebase.

**Salida por falla o timeout:**
- La reconciliación siempre termina, porque la lectura tiene timeout.
- `resultadoPara` agrega un timeout de resguardo (`TIMEOUT_RECONCILIACION_MS` más un margen).
- Nunca hay espera infinita: el timeout vuelve como `'fallo'`.

**`iniciarSesion` después del bloque 2:**

| Resultado | `iniciarSesion` hace | Sesión queda (quién llamó) | Navega a |
|---|---|---|---|
| `establecida` | log LOGIN | `setUsuario` (reconciliación) | `/carga` |
| `sin-documento` / `sin-rol` | `signOut` + `limpiar()` (bloque 1) | `limpiar()` (reconciliación y `iniciarSesion`) | `/limbo` |
| `conservada` | `signOut` + `limpiar()` + Swal "No se pudo verificar tu usuario. Probá de nuevo." | `limpiar()` (`iniciarSesion`) | se queda en `/login` |
| `fallo` (incluye timeout) | `signOut` + `limpiar()` + el mismo Swal | `limpiar()` | se queda en `/login` |
| `sin-auth` (Auth se cerró en el medio) | `limpiar()` + Swal de error | `limpiar()` | se queda en `/login` |
| `catch` (credenciales, red) | `limpiar()` + `registrarError` + Swal | `limpiar()` | se queda en `/login` |

**Por qué `conservada` es una falla en el login** (decisión de esta spec):

- El gesto de loguearse exige un rol verificado, no uno rehidratado.
- Además, si la red alcanzó para autenticar y no para leer `/users`, algo anda mal.
- Conservar sí tiene sentido en un F5, que no es un gesto.

### Qué se ve mientras se espera (F5)

**Hoy:**
- El guard resuelve síncrono.
- Lo único que se ve antes de la pantalla es la carga del chunk de `RaizModule`.
- `AppComponent` es sólo `<router-outlet>`: la página está en blanco mientras tanto.

**Con este bloque:**
- La misma pantalla en blanco se estira hasta que la reconciliación termina. Eso es:
  - la restauración de Auth desde IndexedDB;
  - la recarga del usuario que Auth hace al iniciar: un pedido de red cuando hay usuario
    guardado (`reloadAndSetCurrentUserOrClear`);
  - el `getDoc` de `/users/{uid}`.
- Con conexión, se espera del orden de una fracción de segundo a un segundo y algo. No está
  medido: se mide en la verificación manual.
- Sin conexión, hasta `TIMEOUT_RECONCILIACION_MS`, y después entra con la sesión conservada
  (fila 7).

**No se rediseña `/carga` para taparlo:** está fuera de alcance. Si la espera molesta, va al
frente de UX de `/carga`, que ya está registrado.

### Orden de instanciación (pregunta abierta 1 de la auditoría)

**Con la espera en el guard no hace falta asumirlo:**
- El guard no deja activar `HomeComponent` hasta que la reconciliación terminó.
- La reconciliación terminó después del primer evento de `onAuthStateChanged`, y ese evento
  llega después de restaurar la persistencia.
- Así que cuando corren los `init()`, Auth ya está restaurado, por construcción.

**Instanciación:** `UsuarioSesionService` inyecta `Auth`, así que `Auth` se instancia al
construir el guard, antes que hoy.

**Cómo se comprueba:**
- **Test unitario:** el guard no resuelve mientras `sesionResuelta()` esté pendiente (ver
  "Tests").
- **Manual, en demo:**
  - con una línea temporal `console.debug` en `HomeComponent.ngOnInit` que imprima
    `inject(Auth).currentUser?.uid`, un F5 sobre `/op` tiene que mostrar el uid, nunca
    `undefined`;
  - la consola no tiene ningún `permission-denied`;
  - la línea se quita antes de commitear.

### Verificación manual (Nico)

1. **F5 sobre una ruta protegida con sesión válida** (`/op`, `/clientes`), con `admin` y con
   `user`.
   - Entra.
   - Anotar cuánto dura la pantalla en blanco.
   - Ningún `permission-denied` en la consola.
2. **F5 con `usuarioSesion` presente y la sesión de Auth borrada a mano.**
   - Cómo: DevTools → Application → IndexedDB → `firebaseLocalStorageDb` → borrar la entrada
     `firebase:authUser:…`.
   - Esperado: termina en `/login`; `usuarioSesion` ya no está en `localStorage`; ningún
     listener abierto.
3. **F5 con un `usuarioSesion` manipulado.**
   - a) Cambiar el `uid` por otro: entra como el usuario real de Auth y el sidebar muestra su
     nombre.
   - b) Logueado como `user`, cambiar `role` a `admin`: el rol vuelve a `user`, el menú es el
     de `user` y `/ajustes` lleva a `/limbo`.
4. **Login con un usuario sin documento en `/users`.**
   - Termina en `/limbo` (bloque 1, ahora vía la reconciliación).
   - El Network muestra **una sola** lectura de `users/{uid}`.
5. **Login normal.**
   - Una sola lectura de `users/{uid}` (no dos) y la entrada LOGIN.
   - `/carga` y después `/op`.
6. **Re-login con el mismo uid sin evento de Auth** (C3).
   - Pasos: logueado como A, ir a `/login` (hasta el bloque 3 el formulario se ve con sesión)
     y volver a loguearse como A.
   - Esperado: entra sin colgarse ni esperar el timeout.
7. **Logout en una pestaña con otra abierta**, las dos en `/op`.
   - Esperado con este bloque solo: la pestaña B pierde la sesión en memoria (Auth sincroniza
     entre pestañas por IndexedDB) y se queda en la pantalla. La próxima navegación la manda
     a `/login`.
   - Anotar cuánto tarda B en enterarse.
   - Con el 2b, B tiene que ir sola a `/login` (ver el 2b).
8. **F5 sin conexión** (DevTools → Network → Offline) con sesión válida.
   - Pantalla en blanco hasta el timeout, después entra con la sesión conservada.
   - No desloguea.
9. **El orden de instanciación**, como se describe arriba.

## Bloque 2b — red de seguridad ante errores de sesión en los listeners

Deja el proyecto compilando. C1 y C2 están decididos (2026-11-05): el criterio de abajo es el
recomendado, no el literal del marco. El bloque ya no está bloqueado.

**Archivos:**
- `src/app/servicios/usuario-sesion/sesion-invalida.service.ts` (nuevo)
- `src/app/servicios/usuario-sesion/sesion-invalida.util.ts` (nuevo, función pura) y su
  `.spec.ts`
- Los sitios a vigilar: `choferes/chofer.service.ts`, `proveedores/proveedor.service.ts`,
  `clientes/cliente.service.ts`, `tarifario/tarifario.service.ts`,
  `categoria-documentacion/categoria-documentacion.service.ts`, `legajos/legajo.service.ts`,
  `operaciones/operacion.service.ts` y `no-disponibilidad/no-disponibilidad.service.ts`.
  Todos bajo `src/app/servicios/`.

### Sitios (verificados contra el código)

Los 7 de la auditoría se sostienen:

| Servicio | Suscripción | Listeners |
|---|---|---|
| `ChoferService.init` | `choferes`, `vehiculos` | 2 |
| `ProveedorService.init` | `proveedores` | 1 |
| `ClienteService.init` | `clientes` | 1 |
| `TarifarioService.init` | `tarifas`, `tarifasEspeciales`, `registrosOpEventuales` | 3 |
| `CategoriaDocumentacionService.init` | `categoriasDocumentacion` | 1 |
| `LegajoService.init` | `legajos` | 1 |
| `OperacionService.cargarOperaciones` | `operaciones` por rango (`collectionData`) | 1 query |

- Son 9 `onSnapshot` vía `DbFirestoreService.getAllStateChanges`, que propaga el error con
  `observer.error`, más la query de operaciones.
- Ninguna de esas suscripciones tiene callback de error.

**`NoDisponibilidadService.init` entra.**
- Ya maneja su error: resetea `iniciado` y hace `console.error`. Ese manejo se queda como
  está.
- Se le agrega la misma vigilancia, porque también es un listener abierto por el arranque y
  puede ser el primero en fallar.
- Son ocho sitios en total.

**Fuera:** los demás listeners en vivo que abren pantallas puntuales (Finanzas, Liquidación,
Reportes). No son del arranque. Si fallan por sesión, alguno de los ocho ya falló primero.

### Dónde vive el manejador y cómo lo consumen

`SesionInvalidaService` (root), en `servicios/usuario-sesion/`. Inyecta sólo `Auth`,
`UsuarioSesionService` y `Router`.

**No inyecta `AuthService`.** Así no arrastra `LogRegistroService` ni su grafo a los servicios
por entidad, y ninguna dependencia vuelve hacia ellos.

**Cada sitio** inyecta `SesionInvalidaService` y agrega **un operador** al `pipe` existente:

```ts
this.db.getAllStateChanges<Chofer>('choferes')
  .pipe(this.sesionInvalida.vigilar(), takeUntil(this.destroy$))
  .subscribe(changes => { … });
```

`vigilar<T>()` es `tap({ error: e => this.reportar(e) })`:
- **No traga el error.** Sigue propagándose como hoy: en los siete sin callback, a la consola
  como error no manejado; en `NoDisponibilidadService`, a su `error`.
- **No cambia el comportamiento ante errores que no son de sesión.**
- **Es una línea por suscripción**, y `DbFirestoreService` no se entera.

### Criterio (qué errores actúan)

**Nunca desloguean:** `unavailable`, `deadline-exceeded`, `resource-exhausted`, `cancelled`,
`internal`, `failed-precondition` (por ejemplo, un índice faltante en la query de
operaciones) y cualquier error que no sea un `FirestoreError`.
- Los errores de conexión no son de sesión: Firestore reintenta solo, y desloguear a alguien
  por un corte de red es peor que una pantalla quieta.
- Tampoco un listener que se duerme en background: eso es el frente de UX/background.

**Pueden actuar:**

| Código | Criterio decidido (C1) | Criterio literal del marco, descartado |
|---|---|---|
| `unauthenticated` | actúa | actúa |
| `permission-denied` | actúa sólo si `auth.currentUser` es `null` o su uid ≠ el de la sesión de la app; con Auth y app de acuerdo, no actúa (es la matriz, no la sesión) | actúa |

**Además, siempre hace falta algo que cerrar:** `getUsuarioActual() !== null` o
`sesionPerdida`.

**Función pura** (en `sesion-invalida.util.ts`):

```ts
esErrorDeSesion(codigo, authUid, sesionUid, sesionPerdida): boolean
```

### Qué hace cuando actúa, y por qué actúa una sola vez

`reportar(e)`, cuando `esErrorDeSesion` da `true`:

1. **`limpiar()`, sincrónicamente, antes de cualquier `await`.**
2. `signOut`, tolerante. Si Auth ya está en `null`, es inocuo (bloque 1).
3. `navigate(['/login'])`.
4. Un aviso (Swal): "Tu sesión se cerró o venció. Volvé a iniciar sesión."

No escribe LOGOUT: no es un gesto, y sin token válido las reglas lo rechazarían. Deja un
`console.warn`.

**Esto abre un hueco deliberado en la cobertura del log**, que es la única preocupación del log
antes del corte a Vantruck: un cierre de sesión por la red no deja rastro en `registroLog`. Se
acepta —no hay token con el que escribirlo— y se registra en la skill `subsistema-log` en el
bloque de cierre, para que el inventario de cobertura lo diga en vez de que aparezca como un
faltante.

**Una sola vez, sin un flag aparte:**
- El paso 1 hace que, para el segundo listener que falla, ya no haya nada que cerrar: sesión
  `null` y `sesionPerdida` en `false`.
- Los 9 listeners y la query fallando juntos producen un aviso y una navegación.
- El próximo login establece sesión de nuevo y la red vuelve a quedar armada.

**Logout deliberado sin aviso:**
- `cerrarSesion` limpia antes de `signOut` (bloque 1).
- Cuando los listeners vivos fallan después del `signOut` (siguen abiertos: los servicios son
  root y nada los cierra en el logout), no hay sesión y `sesionPerdida` es `false`, así que
  la red no actúa.

**Logout en otra pestaña:**
- Auth avisa `null`, la reconciliación limpia y marca `sesionPerdida`, y los listeners
  fallan.
- La red actúa una vez y manda a `/login` con el aviso.

### Qué cubre

Las preguntas abiertas de la auditoría pasan de "app vacía en silencio" a "te manda a
loguearte":
- Auth borrada de IndexedDB con la app abierta (se nota en la próxima renovación de token o
  en el próximo F5);
- refresh token revocado al cambiar el email o eliminar al usuario: cuando vence el ID token
  en curso, Auth no lo puede renovar y pasa a `null`;
- segunda pestaña;
- navegador sin IndexedDB.

### Fuera de alcance acá

- El manejo de errores completo con reintentos de todos los listeners.
- El listener que se duerme en background: es el frente de UX/background, ya registrado.
- Un detalle que no cambia: después de que la red actúa, los listeners viejos murieron por
  error. Al volver a loguearse, `HomeComponent.ngOnInit` los vuelve a abrir, igual que hoy
  después de un logout y login en la misma pestaña.
- Los catálogos en memoria de los servicios por entidad no se vacían en el logout. Es
  preexistente, no lo introduce este bloque, y queda fuera.

### Verificación manual (Nico)

1. **Logout en la pestaña A con B abierta en `/op`.**
   - B va sola a `/login`.
   - **Un** aviso y **una** navegación: contar los Swal.
   - En la consola de B, los `permission-denied` siguen apareciendo, como hoy.
2. **Logout deliberado desde el sidebar:** llega a `/login` **sin** el aviso.
3. **Sin conexión con la app abierta**, un minuto en Offline.
   - No desloguea.
   - Al volver la conexión, los datos siguen actualizándose.
4. **Si se adopta la recomendación de C1:** login con un usuario `manager` en demo.
   - Hace falta crearlo, por consola o por Gestión de usuarios: es una escritura en demo y la
     hace Nico.
   - La app queda como hoy: vacía, sin deslogueo y sin bucle.
   - **Con el criterio literal del marco, este caso desloguea en cada login: es la prueba que
     muestra C1.**
5. **F5 con la sesión de Auth borrada** (bloque 2, caso 2): sigue terminando en `/login` sin
   el aviso, porque el guard no deja abrir listeners.

## Bloque 3 — `/login` honesto

Deja el proyecto compilando.

**Archivos:**
- `src/app/appLogin/login/login.component.ts`
- `src/app/appLogin/login/login.component.html`
- `src/app/appLogin/login/login.component.css`, si hace falta estilo para los botones

**Comportamiento:**

- **`LoginComponent` inyecta `UsuarioSesionService` y `Router`.**
- **En `ngOnInit`:**
  - pone `resolviendo = true` y espera `sesionResuelta()`;
  - lee `sesionViva = getUsuarioActual()` **después de la reconciliación**, no de
    `localStorage`;
  - pone `resolviendo = false`.
- **Mientras resuelve, no muestra nada**, en la misma línea que el `@else {}` vacío que ya
  existe.
- **Con sesión viva:** muestra "Hay una sesión abierta como {{email}}" y dos botones. No
  muestra el formulario. **No redirige sola:** quien entra a `/login` con sesión puede querer
  cambiar de usuario.
  - **"Continuar"** → `router.navigate(['/op'])`, directo, sin pasar por la espera de
    `/carga`. `op` admite los cinco roles.
  - **"Cerrar sesión"** → `await authService.cerrarSesion()`, y después
    `sesionViva = null`.
    - `cerrarSesion` navega a `/login`, que es la misma URL. Con la configuración por defecto
      del router (`onSameUrlNavigation: 'ignore'`), el componente no se recrea.
    - Por eso hay que actualizar el estado a mano, para que aparezca el formulario.
- **Sin sesión:** el formulario, como hoy.

Este componente sólo lee la sesión: el invariante no le aplica. Las salidas de sus botones son
las de `cerrarSesion` y las del guard.

**Caso que deja de existir:** "Auth autenticado, app sin sesión" ya no se ve en `/login`
cuando el documento de `/users` existe. La reconciliación reconstruye la sesión y `/login`
ofrece continuar. Esto es lo que hace honesta a la pantalla.

Que quien cerró el navegador sin desloguearse siga entrando sin contraseña es la política de
persistencia, fuera de alcance (C5).

**Verificación manual (Nico):**

1. Con sesión, escribir `/login`.
   - Aparece "sesión abierta como …" con los dos botones, sin formulario y sin redirigir.
2. "Continuar" lleva a `/op` sin los 3 s de `/carga`.
3. "Cerrar sesión":
   - se queda en `/login`, aparece el formulario y queda la entrada LOGOUT;
   - un F5 en `/op` lleva a `/login`.
4. Sin sesión, escribir `/login`: aparece el formulario.
5. Escribir el dominio solo (`''` redirige a `/login`), con sesión: mismo resultado que el
   caso 1.
6. Cerrar el navegador sin desloguearse, abrirlo y escribir `/login`.
   - Aparece "Continuar".
   - Es el comportamiento esperado de este frente, no un bug: la política de persistencia
     queda fuera.

## Tests unitarios

Hoy hay 45 en verde. Este frente agrega:

- **`reconciliacion-sesion.util.spec.ts`:**
  - `decidirReconciliacion`: la tabla completa, las 10 filas, con la variante de la fila 9
    que se decida.
  - Comprueba que todas las salidas traen `usuario` o la orden de limpiar, nunca ninguna de
    las dos (el invariante).
  - Comprueba que un código desconocido nunca conserva.
- **El coordinador de la espera del login**, en el mismo spec y con una función de
  reconciliación falsa:
  - se suma a una reconciliación en curso para el mismo uid, con una sola llamada a la
    lectura;
  - reutiliza una terminada después de la marca;
  - inicia una cuando no hubo evento (C3);
  - no reutiliza una terminada **antes** de la marca;
  - el timeout devuelve `'fallo'` y no cuelga.
- **`role.guard.spec.ts`**, con un `UsuarioSesionService` falso:
  - las tres salidas (`true`, `UrlTree('/login')`, `UrlTree('/limbo')`), por `canMatch` y
    por `canActivate`;
  - el guard no resuelve mientras `sesionResuelta()` esté pendiente;
  - `data` sin `roles` no deja pasar a nadie (es el comportamiento actual, queda fijado).
- **`sesion-invalida.util.spec.ts`:** `esErrorDeSesion` con:
  - cada código de la lista de los que nunca desloguean, que da `false`;
  - `unauthenticated`;
  - `permission-denied` con Auth `null`, con uid distinto y con uid igual (este último
    depende de C1);
  - sin sesión y sin `sesionPerdida`, que da `false`: es lo que hace que actúe una vez y que
    el logout deliberado no avise.

**Sin test unitario, cubierto por la verificación manual:**
- el cableado con Firebase (`onAuthStateChanged`, `getDoc`, `signOut`, que son funciones de
  módulo de AngularFire, no inyectables);
- `cerrarSesion`;
- `LimboComponent`;
- `LoginComponent`.

## Documentación que invalida este frente

Para el bloque de cierre. **No se corrige ahora.**

- **CLAUDE.md, "Autenticación y roles":**
  - `UsuarioSesionService` "sin escuchar a Firebase Auth (no hay `onAuthStateChanged`)";
  - "Sin sesión → `/unauthorized`";
  - la descripción de `/limbo`;
  - la **secuencia de arranque**: el login ya no hace `setUsuario`; tras un F5 el guard
    espera a la reconciliación.
- **CLAUDE.md, "Servicios clave":**
  - la fila `usuario-sesion/` ("Sin listener — no reactivo en vivo");
  - la fila `autentificacion/`, si se quiere precisar que ya no lee `/users`;
  - la fila nueva o la mención de `SesionInvalidaService`.
- **CLAUDE.md, "Deuda abierta":**
  - "Sesión que sobrevive a la pantalla de login": se reformula como política de persistencia
    pendiente (C5), no se borra;
  - la ruta `unauthorized` retirada (C4), con `PagenotfoundComponent` sirviendo sólo `'**'`;
  - **deuda nueva:** `manager` pasa `canMatch` en seis rutas y recibe `permission-denied` en
    los nueve listeners (C1), del frente diferido de reglas y matriz;
  - **deuda nueva:** un `signOut` que falla deja el logout deshecho en el próximo F5 (C6).
- **Skill `subsistema-log`:**
  - "Deuda abierta — sesión que sobrevive a la pantalla de login": las tres salidas listadas;
    dos quedan implementadas y la tercera, `browserSessionPersistence`, queda como política
    pendiente;
  - el "Complemento — login/logout": el orden de `cerrarSesion` pasa a ser log →
    `limpiar()` → `signOut` → navegar, y el `registrarError` de un `signOut` fallido queda
    firmado como `'Desconocido'`. El LOGIN ya no lo precede un `setUsuario` de
    `iniciarSesion`;
  - el inventario de cobertura: un cierre de sesión por la red del 2b no escribe LOGOUT, a
    propósito y sin token con el que escribirlo.
- **Skill `migracion-vantruck`:** el puntero en "Bloqueantes para la promoción" ("Decisión
  pendiente — sesión que sobrevive a la pantalla de login") pasa a ser la decisión de
  política de persistencia.
- **Skill `lazy-loading-y-fechas`:** donde describe `RoleGuard` devolviendo
  `true | UrlTree`, ahora es una promesa de eso. Sigue sin `false`.
- **Skill `botones-y-permisos`:** sin cambios de contenido. `PermisoDirective` evalúa una vez
  en el setter, y con el guard esperando, evalúa sobre la sesión reconciliada. Conviene una
  línea que lo diga.

## Preguntas abiertas de la auditoría

**Cierra:**

1. **Orden de instanciación:** queda garantizado por construcción (la espera en el guard) y
   comprobado con un test y con la verificación manual del bloque 2.
2. **Auth borrada de IndexedDB con `usuarioSesion` presente:**
   - en un F5, la reconciliación limpia y el guard manda a `/login`;
   - con la app abierta, la red del 2b, cuando Auth se entera.

**Cierra en parte:**

3. **Segunda pestaña:**
   - El logout en otra pestaña queda cubierto: `onAuthStateChanged`, más la red del 2b.
   - **Sigue abierto:** un login con **otro** usuario en otra pestaña cambia la sesión de esta
     en silencio (fila 4), con la UI ya pintada para el rol anterior hasta la próxima
     navegación. La sincronización en vivo está fuera de alcance.
   - Cuánto tarda Auth en propagar entre pestañas se mide en la verificación, no se asume.

**Sigue abierta:**

4. **Navegadores sin IndexedDB:** sigue sin relevarse qué persistencia queda.
   - Con la reconciliación, cualquiera que sea, la app sigue a Auth.
   - Si cae en `browserSessionPersistence`, ese usuario ve `/login` al reabrir, sin
     inconsistencia.
5. **Service worker:** el frente no toca `ngsw-worker.js` ni `ngsw-config.json`.

**De las inconsistencias de la auditoría:**

- **Cierra:** la 1 (dos fuentes), la 2 (`null` / `'sin-rol'`), la 3 (`LimboComponent`), la 4
  (`signOut` que falla) y la 5 (rehidratación sin validar: ahora decide Auth, salvo la fila 7).
- **Mitiga:** la 6 (`HomeComponent` sin guard propio: sus hijos esperan la reconciliación), la
  7 (listeners: sólo los errores de sesión) y la 8 (pestañas: sólo lo que da
  `onAuthStateChanged`).

## Fuera de alcance del frente

- La matriz de permisos y `firestore.rules`, incluido el acceso de `manager` (ver C1).
- La ventana de propagación del Custom Claim, que queda como está.
- `browserSessionPersistence` y cualquier política de expiración.
- El propósito y la espera de 3 s de `/carga`.
- Las preferencias de UI namespaceadas por uid.
- La sincronización en vivo entre pestañas más allá de lo que dé `onAuthStateChanged`.
- El manejo de errores completo de los listeners y el background.
- El CHANGELOG.

## Decidido el 2026-11-05

Todo en el chat de diseño, con la spec leída. El detalle y el por qué están en cada
contradicción.

1. **C1:** `unauthenticated` actúa siempre; `permission-denied` actúa sólo si Auth contradice a
   la app. Se adopta la recomendación de la spec, no el criterio literal del marco.
2. **C2:** fila 9 → `fallo` / `limpiar()`.
3. **C4:** la ruta `unauthorized` se retira en el bloque de cierre, con barrido previo.
4. **C6:** se acepta y se registra como deuda; no se construye la marca de "cierre pedido".
5. **`TIMEOUT_RECONCILIACION_MS` = 5 s**, ajustable con la prueba sin conexión.
6. **Un `role` fuera de `RolUsuario`** se trata como `'sin-rol'` (fila 11), y la rehidratación
   valida `uid` y `role` antes de establecer la sesión rehidratada.

## Sin decidir

1. **El texto de `/limbo`.** La propuesta del bloque 1 está escrita en voseo y el texto que
   reemplaza está en usted ("Su correo electrónico ha sido verificado…"). Falta elegir el
   registro que usa el resto de la app y confirmar el texto. El bloque 1 se implementa igual:
   la lógica no depende del texto.
