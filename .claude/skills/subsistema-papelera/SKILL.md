---
name: subsistema-papelera
description: Papelera por referencia (soft delete) de ApLog — PapeleraService, colección papeleraEventos, baja y restauración atómicas de clientes, choferes, proveedores y operaciones (bajaOperacion, restaurarOperacion), la pantalla PapeleraComponent y la Papelera legado (PapeleraLegadoComponent, colección papelera). Leer antes de trabajar sobre bajas, eliminar o dar de baja, restaurar, la papelera o soft delete.
---

## Frente Papelera — mecanismo de referencia (Agosto 2026)

Reemplaza el mecanismo de papelera de Cliente/Chofer/Proveedor/Operación (los 4
módulos ya migrados al resto del refactor) — `StorageService.deleteItemPapelera*`,
escrituras sueltas no atómicas, objeto embebido compuesto con 3 formas distintas
según el caller (`{cliente}`, `{chofer, vehiculos, legajo}`,
`{proveedor, vehiculos, choferes, legajos}`) — por uno único, atómico, y conectado a
`registroLog` (ver la skill `subsistema-log`). Cerraba la brecha
que el Frente Log había dejado abierta a propósito ("Pendiente natural para el frente
de Papelera", ver la skill `subsistema-log`): hoy BAJA/RESTAURAR de Cliente/Chofer/Proveedor/Operación
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
  entidad primaria" en CLAUDE.md) — NUNCA importa
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
  con `km: 0`, ver "Coordinadores bajaOperacion / restaurarOperacion" en CLAUDE.md).
- **`VisualizadorObjetoService.verObjeto`** gana un tercer parámetro opcional
  `snapshot?: any` — cuando viene con valor, se usa en vez de `getById` contra la
  colección viva (el objeto principal de un evento `'activo'` ya no existe ahí) y
  el aviso Swal cambia de "estado actual" a "objeto eliminado". Sin `snapshot`
  (uso desde `RegistroLogComponent`, y desde `PapeleraComponent` para eventos
  `'restaurado'`), comportamiento sin cambios.
- **`// TODO: refactor Papelera` resueltos con fallback a
  `papeleraService.getObjetoEliminado()`:** `TableroService` (fallback de
  `getTipoContratacion` en la baja legacy `anularOperacionYActualizarTablero`
  (eliminado — frente Baja de Operación, C3),
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
asociados (`eliminarOperacionEInformes`, eliminado — frente Baja de Operación, C3) — antes de poder unificarla con
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
el resto de CLAUDE.md (ver "Cloud Functions" → orden de deploy).

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
