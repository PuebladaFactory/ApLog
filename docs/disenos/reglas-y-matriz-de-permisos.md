# Diseño — Reglas y matriz de permisos

Fecha: 2026-11-10 · Rama: `refactor` · Estado: spec acordada, sin implementar

Fuente de verdad del frente. Reemplaza, para lo que acá se decide, lo que digan CLAUDE.md
y la skill `botones-y-permisos`: las dos quedaron desactualizadas y su corrección es el
primer bloque de este frente.

Auditorías que lo sostienen:

- `docs/auditorias/matriz-permisos-reglas-contra-cliente.md`
- `docs/auditorias/capas-de-acceso-por-ruta.md`

---

## 1. El problema

La UI y las reglas no coinciden, y cada capa decide acceso por su cuenta. Las auditorías
midieron el tamaño real del desacuerdo y resultó distinto del que se suponía.

**Lo que no está roto.** De 320 celdas comparables entre `permitido()` y `matrizBase`, sólo
3 divergen —las tres de `papelera`— y las tres en el sentido inocuo: las reglas permiten más
que la UI. **Ninguna** celda muestra en la UI algo que las reglas rechacen. La duplicación
mantenida a mano funcionó.

**Lo que sí está roto, en tres frentes distintos:**

1. **Peso muerto.** 10 de los 17 módulos de `matrizBase` (200 de 340 booleanos) no se
   consultan nunca, porque ningún `ModuloPermiso` llega a ellos. Se mantienen a mano con la
   regla declarada de "transcripción literal" y no deciden nada. Las tres celdas divergentes
   de `papelera` son de ese grupo: la deuda que las registra describe un efecto —"un clic
   perdido"— que no puede ocurrir.

2. **Verificación.** Los tests de emulador cubren 88 de 320 celdas comparables (27,5 %).
   Nueve módulos no tienen ninguna celda probada, entre ellos `entidades`, `operaciones` y
   `finanzas`, que son los que cargan todos los datos reales. Además, 14 celdas sólo tienen
   casos de rechazo sin ningún permitido del mismo rol en la corrida: pasarían igual si el
   rol no llegara al token.

3. **El desacuerdo entre capas, que es cruzado y no por celda.** De 39 pantallas hoja, 27
   tienen al menos dos capas en desacuerdo. La clase de error que la comparación celda por
   celda no puede ver es la importante: **la UI gatea sobre un módulo y la pantalla lee
   otro.** `op` gatea `operaciones` y lee `asignaciones`; `liquidacion` gatea `liquidaciones`
   (que mapea a `finanzas`) y lee `operaciones` e `informesOp`. Los tres casos reales
   relevados son todos de esa forma.

**Cuarto hallazgo, aparecido al implementar el bloque 1 y que ninguna de las dos auditorías
miró:** las reglas tienen **dos** tablas, no una. `permitido()` es módulo × rol × acción y el
cliente la duplica como `matrizBase`; `moduloDe()` es colección → módulo, con 75 entradas, y
el cliente **no tiene equivalente: la falsifica con un cast.**
`RegistroLogComponent.moduloDe` y `PapeleraComponent.moduloDe` hacen
`return r.coleccion as ModuloPermiso`, y el comentario del primero declara que el cast es
inofensivo "porque el botón simplemente no se renderiza" cuando no corresponde a ningún
módulo real. Es decir: **la visibilidad del botón "ver objeto" está decidida por que una
coincidencia de strings falle**, no por un permiso. El efecto real es que el affordance que el
template sí tiene escrito a propósito —el botón deshabilitado con el tooltip "Sin vista
disponible para esta colección"— queda suprimido para toda colección logueada cuyo nombre no
sea un `ModuloPermiso`: `informesOp`, `informesLiq`, `movimientosFin`, `vehiculos`,
`categoriasDocumentacion`, `users`, `tarifasEspeciales`, `registrosOpEventuales`,
`liquidacionesVenta`, `comisionesVenta`, `noDisponibilidades`. En esas filas el usuario ve una
celda vacía sin explicación. Se resuelve en el **bloque 9**.

---

## 2. Decisiones tomadas

Acordadas con Nico el 2026-11-10, sobre las dos auditorías leídas.

### 2.1 `manager`: se le retiran las rutas, el rol queda declarado sin puertas

`manager` no lee ningún módulo salvo `legacySoloLectura`, cuyas 16 colecciones ningún código
toca. No hay ningún usuario con ese rol. Genera 14 de los 27 desacuerdos de capas, y 12 de
las 14 celdas de sólo-rechazo son suyas: sus denegaciones son la parte menos verificada de
la matriz.

**Decidido:** sale de los `canMatch` de `raiz-routing` y de los `canActivate` donde figure.
`RolUsuario` lo sigue declarando y `matrizBase` lo sigue denegando en todo. No se le da
lectura —diseñar el set de permisos de un rol sin usuarios y sin requerimiento es
exactamente la conjetura que este frente elimina— y no se retira el rol todavía.

**Descartado explícitamente, con su razón:** darle lectura real (inventa una decisión de
producto); retirar `RolUsuario.manager` ahora (es mecánico y TypeScript encuentra cada sitio,
pero toca 68 celdas, la validación de `crearUsuario` y el desplegable de gestión, en el medio
de un frente que ya tiene seis rutas propias que arreglar). Queda disponible para después del
corte.

### 2.2 El arranque no abre listeners que el rol no pueda leer

Corolario de 2.1, pero vale para cualquier rol futuro cuyas rutas excedan sus lecturas.
`HomeComponent.ngOnInit` abre 10 listeners; nueve son fijos y uno —`noDisponibilidades`— ya
se abre sólo si `puede('operaciones')`. **El patrón existe y está en producción: se extiende
a los otros nueve.**

Precondición dura: **antes de extenderlo hay que corregir `mapaModuloReglas.reportes`**
(ver 2.6). `puede(modulo)` sin acción resuelve a `'leer'`, así que extender el patrón sobre
un mapeo equivocado lo congela.

### 2.3 `liquidacion`: se le retira el módulo a `user`

`user` no puede leer `informesLiq` (es `finanzas`, d·a·x), así que la pestaña Borradores le
da permission-denied. Lo único que puede hacer en el módulo es leer `informesOp`, y esa
información ya la ve en Operaciones.

**Decidido:** `canMatch` de `liquidacion` pasa a d·a·x y el sidebar deja de ofrecerle la
opción. No se restringe sólo `borradores`: entrar a un módulo para leer un dato que ya está
en otra pantalla no justifica la puerta. Si más adelante el cliente quiere ampliar los
permisos de `user`, se amplían.

**No requiere cambio de reglas:** alinea la ruta con una regla que ya decía eso.

### 2.4 `vendedores`: sólo se gatea el sidebar

`canMatch` ya es d·a·x, así que `user` **ya** deriva a `/limbo`. El desacuerdo era que el
sidebar le mostraba la opción sin ningún gate.

**Decidido:** un `*appPermiso` en el `<li>`. Nada más. `demo` sigue entrando con sólo
lectura y dev/admin con todo, que es lo que las reglas ya dan.

### 2.5 `legajos/cargarDoc`: `demo` queda afuera de verdad

Hoy la pestaña lleva `[ngClass]="{ isDisabled: esRol('demo') }"` (`pointer-events: none`):
un gating que no gatea, porque la ruta se alcanza por URL. `demo` tiene sólo `leer` en
`legajos`, así que la pantalla no le sirve y cualquier guardado le da permission-denied.

**Decidido:** la ruta suma `canActivate` d·a·u y la pestaña pasa a
`*appPermiso="'legajos.agregar'"`, que resuelve a `legajos.crear` — d·a·u, exactamente lo
pedido. **La pestaña y la guarda derivan del mismo permiso**, que es el patrón para las
otras pestañas con criterio de acceso.

### 2.6 `op/asignaciones`: `demo` pasa a leer

Único cambio de `firestore.rules` de todo el frente, y obliga a cambiar la **forma** de la
rama, no un valor: `asignaciones` hoy no distingue acción (`r in ['dev','admin','user']`
para las cuatro).

**Decidido:** la rama pasa a rol × acción — `leer`: d·a·u·x; `crear`/`editar`/`eliminar`:
d·a·u.

Los dos overrides que le niegan a `demo` la descarga (`operaciones.descargarTablero` y
`operaciones.descargarAsignaciones`) **se conservan**: `demo` ve el tablero y no se lo baja.
Son una decisión de negocio previa y descargar, aunque sea una lectura, no estaba incluido
en "demo solo puede leer".

### 2.7 Las tres rutas `alta` se retiran

`choferes/alta`, `clientes/alta` y `proveedores/alta` tienen `canActivate` d·a·m, ningún
enlace las alcanza —el alta real se abre como modal desde el listado— y el componente inyecta
`NgbActiveModal`, que ninguna ruta provee.

**Decidido:** se retiran las tres declaraciones de ruta y el `alias: ['<x>/alta']` de la
pestaña de cada shell, que queda sin poder matchear nada.

**Precondición:** barrido de símbolo confirmando que nada navega ahí —`routerLink`,
`router.navigate`, y el string `'alta'` en los tres módulos— antes de borrar. La auditoría lo
afirma, pero es una afirmación negativa y se verifica antes de actuar.

### 2.8 Tarifas: `user` y `demo` siguen leyendo

Coherente con las reglas (`tarifas.leer` es d·a·u·x, las escrituras d·a) y `user` necesita
ver el tarifario para operar. No se le aplica el criterio de 2.3 porque acá el dato no está
en otra pantalla.

**Decidido:** el módulo queda d·a·u·x. Se migran las 7 comparaciones de rol directas de los
componentes de Tarifas (`['dev','admin'].includes(usuario.role)` y `esDev`) a `*appPermiso`.

### 2.9 `ajustes` pasa a d·a, y el costo de `empresa` ya estaba pagado

La deuda F8b registra que mover Ajustes a dev/admin le cuesta a `demo` la pantalla de datos
de la empresa. **No cuesta nada:** el menú entero está gateado con `usuarios.ver` (d·a) y
`ajustes` pelado redirige a `usuarios`, donde `demo` cae en `/limbo`. La única vía de `demo`
a `empresa` es escribir la URL a mano. La intención de "solo lectura para demo" nunca
funcionó.

**Decidido:** `canMatch` de `ajustes` pasa a d·a. Con eso el `redirectTo` deja de tirar
`demo` a `/limbo` por sí solo. Si alguna vez se quiere que `demo` vea esa pantalla, hay que
moverla fuera de Ajustes — es un pedido nuevo, no un costo de esta decisión.

La pestaña de Registro, hoy comentada en `AjustesControlComponent`, se restaura: con el
módulo en d·a su ruta y su puerta coinciden, y es la primera verificación del corte en la
migración.

### 2.10 `legacySoloLectura` no se toca en este frente

Su justificación se cayó —CLAUDE.md dice que esas 16 colecciones tienen "escritura real
confirmada en código vivo" y no queda ninguna referencia en `src/app`— pero el bucket se
deploya el día del corte sobre los datos de Vantruck.

**Decidido:** queda como está. Va a la skill `migracion-vantruck`. Cuando se retome, el
barrido tiene que hacerse **sobre cómo se construyen los paths**, no sobre los nombres
literales de colección: `DbFirestoreService` los compone, así que una referencia armada desde
una constante o una variable no aparece en un grep por nombre.

---

## 3. Matriz objetivo

`d` dev · `a` admin · `m` manager · `u` user · `x` demo

| Módulo | `canMatch` hoy | `canMatch` objetivo | Sidebar hoy | Sidebar objetivo | Reglas |
|---|---|---|---|---|---|
| `clientes` | d·a·m·u·x | d·a·u·x | sin gate | `clientes.ver` | sin cambio |
| `choferes` | d·a·m·u·x | d·a·u·x | sin gate | `choferes.ver` | sin cambio |
| `proveedores` | d·a·m·u·x | d·a·u·x | sin gate | `proveedores.ver` | sin cambio |
| `op` | d·a·m·u·x | d·a·u·x | sin gate | `operaciones.ver` | `asignaciones`: +`leer` para demo |
| `liquidacion` | d·a·m·u·x | **d·a·x** | sin gate | `liquidaciones.ver` | sin cambio |
| `legajos` | d·a·m·u·x | d·a·u·x | sin gate | `legajos.ver` | sin cambio |
| `ajustes` | d·a·x | **d·a** | `usuarios.ver` | igual | sin cambio |
| `nuevaFacturacion` | d·a·x | igual | `facturacion.ver` | igual | sin cambio |
| `vendedores` | d·a·x | igual | **sin gate** | `vendedores.ver` | sin cambio |
| `tarifas` | d·a·u·x | igual | **sin gate** | `tarifas.ver` | sin cambio |
| `finanzas` | d·a·x | igual | `finanzas.ver` | igual | sin cambio |
| `reportes` | d·a·x | igual | `reportes.ver` | igual | `reportes` → `resumenes` |
| `migracion` | d | igual | `role === 'dev'` | `desarrollo.ver` | sin cambio |

Hojas con criterio propio:

| Ruta | Hoy | Objetivo |
|---|---|---|
| `legajos/cargarDoc` | sin `canActivate`; pestaña con `ngClass` de `demo` | `canActivate` d·a·u; pestaña con `*appPermiso="'legajos.agregar'"` |
| `ajustes/registro` | `canActivate` d·a·x; pestaña comentada | `canActivate` d·a; pestaña restaurada |
| `ajustes/usuarios`, `registro-log`, `papelera`, `empresa` | `canActivate` variados sobre `canMatch` d·a·x | `canActivate` d·a, alineados al padre |
| `choferes/alta`, `clientes/alta`, `proveedores/alta` | `canActivate` d·a·m, sin puerta | retiradas, con su alias |

Los 13 `<li>` del sidebar quedan gateados con `*appPermiso`. `manager` queda sin menú por
construcción, porque `matrizBase` lo deniega en todos los módulos: no hace falta una regla
propia para él.

---

## 4. La fuente única: duplicación con verificación

De las tres salidas planteadas —una deriva de la otra, se generan, o se acepta la duplicación
con una verificación que falle cuando se separen— **se elige la tercera**, con una poda
previa.

**Por qué no generar.** Generar `matrizBase` desde `permitido()` exige un parser de `.rules`;
invertir la dirección y generar el archivo de reglas desde una fuente compartida es lo único
que previene la divergencia por construcción, pero haría que `firestore.rules` —lo único que
de verdad protege los datos— sea parcialmente escrito por una herramienta, justo antes de la
migración a producción. Con una divergencia medida de tres celdas inocuas, el canje no cierra.
Y `overrides` tiene que seguir escrito a mano de todos modos, porque codifica desvíos
deliberados: la generación nunca iba a cubrir el archivo entero. **Si la divergencia reaparece
después del corte, generar vuelve a la mesa con datos.**

### 4.1 Poda

Se borran de `ModuloReglas`/`matrizBase` los 8 módulos que ningún `ModuloPermiso` alcanza:

`asignaciones`, `tarifasHistorial`, `informesOp`, `comisiones`, `legacySoloLectura`,
`numeradores`, `logs`, `papelera`.

Esto resuelve por eliminación la deuda de `matrizBase.papelera` (desaparece el módulo) y dos
de las tres de "módulos de `permitido()` sin equivalente": `historicoSoloLectura` y
`vencimientos` dejan de ser omisiones a corregir y pasan a ser lo que son, módulos de reglas
sin consumidor de UI.

**La poda tiene una razón de fondo, no es prolijidad.** Los módulos que salen son celdas que
`user` necesita en las reglas para escrituras que ninguna pantalla expone: el cierre de una
operación escribe `informesOp`, `comisiones`, `resumenes` y `registroLog`. No son asunto de
la UI. Que estén muertas en `matrizBase` es correcto.

**Requisito de la poda: el razonamiento no se borra con las celdas.** Los comentarios de
`asignaciones`, `informesOp`, `resumenes` y `comisiones` explican por qué `user` tiene
escritura ahí, y ese razonamiento no está en ningún otro lugar del cliente. Al podar, va un
bloque de comentario junto a `ModuloReglas` que liste los módulos de `permitido()` que la UI
deliberadamente no consulta, con una línea por cada uno. Eso convierte la ausencia en una
decisión escrita y cierra la deuda vieja en sus propios términos ("al retomarla, agregarlos o
dejar escrito por qué no"): se elige dejar escrito por qué no.

### 4.2 Los dos `ModuloPermiso` nuevos, y el orden

Gatear el sidebar de Tarifas y de Migración necesita `ModuloPermiso 'tarifas'` y
`'desarrollo'`. Eso cambia la poda:

- `tarifas` **sale de la lista de poda** (iba a borrarse);
- `resumenes` también, porque es a donde apunta el `mapaModuloReglas.reportes` corregido;
- `desarrollo` no sólo no se borra: **hay que agregarlo** a `ModuloReglas` y a `matrizBase`
  (las cuatro acciones, sólo `dev`, según la rama 1 de `permitido()`, que no distingue
  acción). La tercera deuda de "módulos sin equivalente" se invierte: deja de ser una
  omisión a documentar y pasa a ser una entrada necesaria.

**Orden obligatorio: primero se fija la lista del sidebar, después se poda.** Al revés, la
poda borra celdas que el sidebar está por consultar.

Estado final de `ModuloReglas`: 10 módulos (`entidades`, `legajos`, `vendedores`,
`operaciones`, `tarifas`, `finanzas`, `resumenes`, `configuracion`, `desarrollo`, `usuarios`)
× 4 acciones × 5 roles = **200 celdas**, todas consultables.

### 4.3 El comentario

`PermisosService` dice hoy "Transcripción LITERAL de la función `permitido()` de
`firestore.rules` — no reinterpretada", y no lo es. Pasa a decir qué es: la porción de
`permitido()` que la UI consulta, con `usuarios` como excepción documentada y `overrides`
como los desvíos deliberados.

### 4.4 Fixture y los dos tests

Un **fixture único** con la matriz esperada. No es una tercera copia en el sentido malo: es
la única copia mantenida a mano, y las otras dos se verifican contra ella.

Va en JSON y al lado del servicio que verifica
(`src/app/servicios/permisos/matriz-esperada.json`), porque `PermisosService` es la de las
dos copias que se edita más seguido. JSON y no TypeScript porque lo tienen que leer los dos
lados: el test de emulador es un `.mjs` de Node, que no puede importar TS. Con dos secciones
que hacen explícito el alcance de cada test: los 9 módulos que se comparan contra
`permitido()` (180 celdas) y `usuarios` aparte (20), que no pasa por `permitido()` y cuya
divergencia con las reglas es deliberada.

- **Test de emulador** (`functions/test-matriz-permisos-rules.mjs`): afirma que las reglas
  reales coinciden con el fixture, celda por celda. Cubre los 9 módulos que pasan por
  `permitido()` — **180 celdas**.
- **Test unitario** (spec al lado de `permisos.service.ts`): afirma que `matrizBase`,
  resuelta a través de `mapaModuloReglas` y `mapaAccionCrud`, coincide con el fixture. Cubre
  las 200.

`usuarios` queda fuera de la comparación contra reglas y dentro de la del fixture: no pasa
por `permitido()` (tiene su propio `match` en `/users/{uid}`, con `write` sólo `dev`) y su
divergencia con `matrizBase` —`admin` en crear/editar/eliminar— es deliberada y documentada:
`admin` opera por Cloud Functions con Admin SDK, no por escritura directa. El fixture
registra la intención, no la regla.

**Dónde se hace valer cada lado, que no es simétrico** (corregido el 2026-11-10 tras
implementar el bloque 2; la versión anterior decía "separarse en cualquier dirección rompe el
build", y es falso):

- **El lado del cliente queda bloqueado.** El spec unitario corre en `npm run test:ci`, que
  **se agregó al hook de Stop** (decidido el 2026-11-10, en el cierre del bloque 2). El hook
  corre `tsc --noEmit -p tsconfig.hook.json`, `npm run test:ci` y `npm run build:demo`, en
  ese orden: el más barato primero, para fallar rápido. Con eso, tocar `matrizBase` sin que
  el fixture coincida deja de pasar el hook. Costo: ~12 s por corrida. Riesgo asumido: si
  algún test se vuelve frágil o dependiente del entorno —`test:ci` necesita resolver Chrome
  headless— el hook falla por motivos ajenos al cambio; por eso tiene que decir **qué paso**
  falló, o se vuelve ruido que se termina apagando.
  El hook dispara por extensión, y **`.json` entró en la lista junto a `.ts`/`.html`/`.scss`
  por este frente**: el fixture es el pivote de la verificación, cualquier cambio de reglas
  que afecte a los 9 módulos obliga a tocarlo, y ese toque es lo que hace correr el spec.
  Sin `.json`, el camino más natural para introducir una divergencia —actualizar el fixture
  y olvidarse del cliente— no disparaba nada. `.rules` deliberadamente **no** entró: si
  cambia sólo `firestore.rules`, el spec compara `matrizBase` contra el fixture y ninguno de
  los dos cambió, así que disparar el hook no aportaría.
  Se consideró y **no se implementó** que el hook imprima un recordatorio de correr el test
  de emulador cuando `firestore.rules` esté entre los archivos modificados. Sería el único
  refuerzo posible del lado que no se puede bloquear, al costo de romper el silencio del
  hook en ese caso. Queda disponible.
- **El lado de las reglas no puede.** El test de emulador necesita el emulador levantado
  (JRE, `firestore` y `auth`), así que no entra en un hook por cada Stop. Su punto de control
  es el ritual de deploy, que ya existe y está escrito en CLAUDE.md: ninguna regla se deploya
  sin pasar el emulador antes. Eso es proceso, no build, y hay que decirlo así: si alguien
  cambia `firestore.rules` y deploya sin correr el `.mjs`, la divergencia viaja.

La asimetría es tolerable porque las reglas cambian raro y su deploy es manual, pero la
verificación es un bloqueo de un lado y una disciplina del otro. Decirlo como "rompe el
build" sería volver a la convención que ya falló.

El test de emulador **es** la cobertura que falta: las 180 celdas quedan al 100 %, y
`entidades`, `operaciones` y `finanzas` dejan de estar en cero. Los 10 módulos de `permitido()` que la UI no consulta quedan fuera del fixture
a propósito y siguen cubiertos por los scripts que ya existen
(`test-historico-rules`, `test-cierre-rules`, `test-vendedores-rules`,
`test-asignaciones-rules`, `test-vencimientos-rules`, `test-legajos-rules`,
`test-papelera-rules`, `test-registro-log-rules`): el fixture verifica el acuerdo entre
cliente y reglas, que sólo existe donde la UI consulta.

**Requisito sobre el test, que sale del hallazgo de las 14 celdas de sólo-rechazo:** un
control positivo por rol en cada corrida. Si una corrida afirma rechazos de un rol, tiene que
afirmar también al menos un permitido de ese mismo rol, o no distingue "denegó la matriz" de
"el rol no llegó al token". Es la lección de que un caso cuyo resultado correcto es "no pasa
nada" no prueba nada por sí solo, encontrada esta vez dentro de los tests.

**Para `manager` el control positivo no puede salir del fixture.** Con `legacySoloLectura`
podado, `manager` queda en `false` en las 180 celdas: 36 rechazos y ningún permitido, que es
el caso de sólo-rechazo llevado al extremo. El control positivo es una lectura de una
colección de `legacySoloLectura`, que `permitido()` concede a cualquier rol autenticado sin
condición de rol.

⚠️ **Ese control prueba menos de lo que esta spec afirmaba** (corregido el 2026-11-10). Decía
que probaba "que el token llegó con `role: 'manager'`". No: el bloque 2 verificó que un token
**sin** rol obtiene esa misma lectura, así que la afirmación distingue autenticado de no
autenticado, no rol presente de rol ausente. Si `setCustomUserClaims` fallara en silencio para
`manager`, los 36 rechazos pasarían igual — exactamente el modo de falla que el control existe
para descartar.

Y no hay forma de arreglarlo desde las reglas: **`manager` no tiene ni un permiso que lo
distinga de un token sin rol**, porque no aparece por nombre en ningún módulo de
`permitido()`. Entonces la verificación de que el rol llegó tiene que ser una afirmación de
*setup*, fuera de las reglas: después de setear el Custom Claim, decodificar el token y
afirmar que trae el `role` esperado. Va para los cinco roles, no sólo `manager`, y convierte
"creemos que el token traía el rol" en un hecho chequeado.

Corolario para la decisión 2.1: mientras `manager` no tenga ningún permiso propio, su
comportamiento no es verificable al nivel de las reglas. Es un argumento más para retirar el
rol después del corte.

### 4.5 El invariante cruzado

El fixture no alcanza, porque compara cada módulo contra sí mismo y la clase de error real es
cruzada.

**Invariante: para cada ruta, para cada rol que la ruta admite, toda colección que la pantalla
lee al abrirse tiene que ser legible por ese rol en `permitido()`.**

Un tercer test lo verifica, con la columna "Reglas (al abrir)" de
`docs/auditorias/capas-de-acceso-por-ruta.md` como punto de partida de la tabla ruta →
colecciones. Es el chequeo que habría encontrado a `manager` el día que se le abrieron las
rutas, y el que encuentra a `demo` en `asignaciones` y a `user` en `borradores`.

Mantener la tabla ruta → colecciones a mano es el costo de este test. Se acepta: es la única
forma de atrapar la clase, y la alternativa —derivarla del código— es un análisis estático que
no vale lo que cuesta para 39 pantallas.

---

## 5. Bloques

Numerados. Cada uno deja el árbol compilando.

**Bloque 0 — documentación, solo y antes que todo.** Las 16 contradicciones de las dos
auditorías, sobre CLAUDE.md y la skill `botones-y-permisos`. En la skill no es corrección de
detalle: los bloques 3, 5 y 6 describen `AccionGenericaComponent`, `InformesTablaComponent`,
`InformesAccionesCellComponent`, `proforma`, `liquidaciones-op`, `facturacion-listado` y
`facturacion-historico`, que no existen — hoy esa función la cumple `TablaListadoComponent`
con el campo `permiso` por acción. Commit propio, antes de cualquier bloque de código: un
cambio verificado no se mezcla con uno sin verificar.

**Bloque 1 — fundaciones de la matriz, sin efecto visible.** `mapaModuloReglas.reportes` →
`resumenes`. `ModuloPermiso` suma `tarifas` y `desarrollo`, con sus entradas en
`mapaModuloReglas`. `ModuloReglas`/`matrizBase` suman `desarrollo`. Se corrige el comentario
(4.3). Ningún consumidor cambia; el árbol compila igual.

**Bloque 2 — poda, fixture y los dos tests.** En este orden, con la lista del sidebar ya
fijada por el Bloque 1. La poda define el alcance del fixture, así que van juntos. Al cerrar,
los dos tests verdes contra el estado actual de las reglas.

**Bloque 3 — gating de UI: sidebar, pestañas y los `ngClass` por rol.** Los 13 `<li>` con
`*appPermiso`; la pestaña de `cargarDoc` de `ngClass` a `*appPermiso`; la de Registro
restaurada; y los otros cuatro `[ngClass]` que gatean por rol con `pointer-events: none`
(los tres botones "Visibles" de los listados CRUD y el dropup de `tablero-legajos`). Van
juntos porque son la misma operación en la misma capa —cambiar un chequeo de rol por un
chequeo de permiso— y migrar uno dejando cuatro idénticos sería arbitrario. Va **antes** del
routing: así, cuando el Bloque 4 le cierre las rutas, `manager` ya no tiene menú. Al revés
queda un estado transitorio de menú completo con todo cayendo en `/limbo`.

*Corrección del 2026-11-10: la versión anterior de este bloque sólo nombraba `cargarDoc` de
los cinco `ngClass`, y la spec no le asignaba bloque a los 7 `esRol()` de gating de UI, que
son uno de los cuatro objetivos del relevamiento. Cinco de esos siete son los `ngClass` de
este bloque; los otros dos van al Bloque 10.*

**Bloque 4 — routing.** `canMatch`: `manager` afuera de las seis; `user` afuera de
`liquidacion`; `ajustes` a d·a. `canActivate` de `legajos/cargarDoc` y de las cuatro hojas de
Ajustes. Retiro de las tres rutas `alta` y sus alias, con el barrido previo de 2.7.

**Bloque 5 — reglas.** La rama `asignaciones` a rol × acción con `leer` para `demo`, y el
fixture actualizado en la misma pasada para que el test de emulador quede verde. El deploy a
demo lo hace Nico, no Claude Code.

**Bloque 6 — el invariante cruzado.** El tercer test. Al final, porque necesita las rutas en
su estado final.

**Bloque 7 — el arranque.** Extender a los otros nueve listeners de `HomeComponent.ngOnInit`
el patrón que ya usa `noDisponibilidades`. Depende del Bloque 1 (el mapeo de `reportes`
corregido).

**Bloque 8 — Tarifas.** Las 7 comparaciones de rol directas a `*appPermiso`. Independiente de
los anteriores salvo el Bloque 1; puede ir en paralelo.

**Bloque 9 — los dos casts de colección a `ModuloPermiso`.** Agregado el 2026-11-10 a partir
del cuarto hallazgo de la sección 1. `VisualizadorObjetoService` ya tiene el mapa colección →
handler con sus cuatro entradas (`clientes`, `choferes`, `proveedores`, `operaciones`), así
que es el dueño natural del permiso de cada una: `HandlerVisualizador` suma un campo
`modulo: ModuloPermiso`, el servicio expone `moduloDe(coleccion): ModuloPermiso | null`, y
`RegistroLogComponent.moduloDe` y `PapeleraComponent.moduloDe` dejan de castear y le
preguntan. Quedan dos chequeos ortogonales y los dos intencionales: el permiso del módulo
decide si el botón existe, `puedeVer` decide si está habilitado, y el tooltip empieza a
aparecer donde corresponde. Independiente; va en cualquier momento después del Bloque 1.

---

## 6. Fuera de alcance

- La migración y sus checklists. `legacySoloLectura` (2.10) va ahí.
- Retirar `RolUsuario.manager` (2.1). Disponible para después del corte.
- El mapeo de `noOperativo` en las reglas: sale cuando termine la migración de esa colección,
  que va después de Choferes.
- Los 12 listeners fuera del arranque que no pasan por `SesionInvalidaService.vigilar()`
  (`VencimientosComponent`, los de `FinanzasConsultaService`, `InformeLiqConsultaService`,
  `InformeLiqService`, `InformeOpService`, los de Comisiones y Liquidación de venta,
  `ResumenOpConsultaService`, `RegistroComponent`). CLAUDE.md sólo registraba dos; el número
  real queda anotado en el Bloque 0 y el arreglo es otro frente.
- Conectar `modulo`/`accion` en los ~90 usos directos de los `app-btn-*` que nunca tuvieron
  gating de rol.
- Finanzas, Facturación y sus frentes propios. El frente de UX. El CHANGELOG.

---

## 7. Preguntas abiertas

- ~~Comportamiento de un rol ausente en el token dentro de `legacySoloLectura`~~
  **Respondido en el bloque 2 (2026-11-10): `let r = rol()` no falla con el rol ausente, y la
  lectura se permite.** Un token autenticado sin `role` en sus claims lee las 16 colecciones
  de `legacySoloLectura`. No es un agujero grave —toda cuenta la crea `dev`/`admin`, y esas
  colecciones no tienen escritores ni lectores en código vivo— pero es un acceso que nadie
  decidió: el bucket concede lectura a cualquier autenticado *incluido quien no tiene rol*,
  no protege nada escribible, y se justificaba con una premisa falsa (ver 2.10). Dato para
  cuando la migración retome el bucket, no para reabrirlo acá.
- `liquidaciones` figura en CLAUDE.md como colección principal, no está en `moduloDe()` y
  ningún código la usa. Se corrige la documentación en el Bloque 0; si existe en Vantruck, es
  dato para la migración.
