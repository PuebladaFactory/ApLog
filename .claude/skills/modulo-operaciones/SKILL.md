---
name: modulo-operaciones
description: Módulo Operaciones de ApLog — tipado con snapshots (RefCliente, RefChofer), el tablero de asignaciones (tablero-asignaciones), operaciones-editor y carga-asignacion con el contrato de altaDesdeAsignacion, el tablero de operaciones (tablero-op) y la no disponibilidad de choferes, vehículos y proveedores, con su deuda abierta, más la máquina de estados de la operación (abierta, cerrada, proforma, liquidada, eliminada) y el contrato de la baja y la restauración. Leer antes de trabajar sobre operaciones, su estado, bajas o restauraciones, su alta o edición, asignaciones, tableros o la no disponibilidad.
---

### Fase D: resolución de tipado Operaciones (objetos embebidos → snapshots)

#### Resolución de datos: snapshot vs. servicio vivo

Tras el rediseño de `Operacion` (objetos embebidos → snapshots `RefCliente`/`RefChofer`/`RefVehiculo`/`RefProveedor`), el acceso a datos relacionados sigue esta jerarquía:

1. **Si el dato está en el snapshot de la op, leerlo de ahí.** Aplica a datos de exhibición histórica (razón social, nombre, apellido, patente, dominio, CUIT) Y a datos que la op congela como hecho histórico: `op.proveedor` (qué proveedor para esta op), `op.vehiculo` (qué vehículo). Para registros históricos el snapshot es lo **correcto**, no solo lo conveniente: resolver contra el vivo daría el estado actual, no el de la op.

2. **Si el dato NO está en el snapshot, resolver por ID contra el servicio vivo.** Aplica a datos de cálculo estables que no se congelan (ej. `contratacion` del chofer). Cada `XxxService` expone getters síncronos para esto:
   - `getChoferPorId(id): ConIdType<Chofer> | undefined`
   - `getTipoContratacion(idChofer): 'directo' | 'proveedor' | undefined`
   - `getContratacionChofer(idChofer): ContratacionChofer | undefined`

   **No usar helper genérico de resolución** ni inyectar XxxService en la capa de datos (`DbFirestoreService`) — produce dependencia circular. Cuando la capa de datos necesita un dato resuelto, recibe el valor ya resuelto como parámetro desde la capa de negocio (ver `eliminarInformesPorIdOperacion` (eliminado — frente Baja de Operación, C3): TableroService resuelve `tipoContratacion` y lo pasa; `TableroService` también se eliminó, con la Papelera legado).

**Regla práctica:** antes de meter un `getXxxPorId`, verificar si el dato ya está en el snapshot de la op (`op.proveedor`, `op.vehiculo`). Si está, leerlo de ahí.

#### Política de fallo cuando el dato no resuelve (papelera)

Las entidades eliminadas van a papelera (otra colección), por lo que `getXxxPorId` puede devolver `undefined` para ops históricas de entidades dadas de baja — es un caso REAL, no defensivo. Tratamiento por contexto:

| Contexto | Tratamiento del `undefined` |
|---|---|
| Exhibición (tablas, dropdowns, reportes) | Fallback al snapshot (datos congelados); `—`/etiqueta para datos no disponibles; en filtros/contadores, excluir el ítem (degradación silenciosa) |
| Cálculo de valores (motor de tarifas) | No resuelve entidades: usa lo congelado en la op (`tarifaAplicada*`, `datosTarifaEventual`) y la tarifa por id en `TarifarioService` (ver la skill `modulo-tarifas`) |
| Cálculo/cascada viva (borrados, batch) | `throw` explícito o `Swal + return` — NUNCA dejar caer en rama por defecto (riesgo de borrar/escribir colección equivocada) |

Solución futura: resolver contra la papelera (guarda id + colección de origen). Todos los puntos marcados con `// TODO: refactor Papelera`.

#### Nullable de tarifa (datosTarifaEventual)

`datosTarifaEventual: DatosTarifaEventual | null`. Desde el cierre de Tarifas es la ÚNICA
marca de eventual (`!== null`); el campo de datos de Personalizada y el tipo de tarifa de
4 booleanos se retiraron de `Operacion`. Mutarla solo con
`OperacionFactoryService.aplicarEventual` (mantiene el invariante). Tratamiento por contexto:
- **Exhibición que lee un valor:** `op.datosTarifaEventual?.… ?? 0/'—'`.
- **Getter de exhibición:** guard `if (!op.datosTarifaEventual) return ''/[]`.
- **Múltiples accesos en un método:** guard al inicio (`if (!op.datosTarifaEventual) return;`)
  que estrecha todo el cuerpo, en vez de `!` repetido.

#### OperacionRuntime: divergencia runtime-vs-tipo

Los componentes de carga del modelo viejo (`carga-multiple`, `carga-tablero-diario`, `operaciones-table` — los tres eliminados, ver CHANGELOG.md, sección "Switch completado — tablero-asignaciones / operaciones-editor / carga-asignacion") usaban un tipo local `OperacionRuntime`. La factory metía un `Chofer` COMPLETO en runtime, pese a que `Operacion.chofer` es `RefChofer`. El tipo se redefinía para reflejar el runtime (ejemplo histórico — el principio general de la última línea sigue vigente):
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

Se agregó `vendedor?: string[]` a `RefCliente` (snapshot). La comisión de vendedor es **por operación** (histórica), no del vendedor vigente del cliente → va al snapshot, congelada al alta. ~~Pendiente: el factory debía poblar `vendedor`~~ — RESUELTO en el Frente Vendedores con otro campo: `RefCliente.comisiones` (`{ idVendedor, porcentaje }[]`, lo puebla `OperacionFactoryService`). `vendedor` quedó legacy, sin uso; se retira en la migración de Vantruck.

#### Métodos/bloques comentados (código muerto del modelo viejo)

- `limpiarPropiedadesChoferEnOperaciones` (carga-tablero-diario): reconstruía un Chofer completo desde el snapshot; estaba comentado entero + su llamada. Resuelto: el archivo entero (`carga-tablero-diario`) fue eliminado en el switch de Asignaciones — ya no existe.
- `getCategoria` (tablero-op): colapsado a `op.vehiculo.categoria` (la categoría ya está en el snapshot) — sigue vigente. `getCategoriaDesdeOperacion` (tablero.service) tuvo el mismo colapso primero y luego fue eliminado por completo en el switch de Asignaciones (sin caller externo).

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
devuelven `Resultado` (éxito/error) para que el caller decida el log.
`updateConResultado` es el primer caso. **Actualizado
(2026-11-03):** `ModalObjetosActivosComponent` ya no lo usa: `activo` pasa por
`ActivacionEntidadService.cambiarActivo` (batch con log EDITAR). Hoy lo usa
`VisibilidadListadosComponent`, sin log por decisión (skill `subsistema-log`, "Asimetría
`activo` / `visible`"). Familia futura: `createConResultado`,
`deleteConResultado`. La interfaz `Resultado` local de db-firestore ({exito, mensaje})
difiere de la genérica `Resultado<T>` de interfaces — deuda de unificación pendiente.

**Una asignación existente siempre es visible**, independiente del estado activo de sus
entidades (cliente inactivo con items → columna visible; chofer inactivo asignado →
tarjeta visible). El estado activo controla disponibilidad FUTURA, no borra hechos ya
cargados.

> El primer uso real de `overrides` en `tablero-asignaciones` está documentado en la skill `botones-y-permisos`.

## Máquina de estados de la operación

Fuente única de esta máquina. Las skills `modulo-liquidacion`, `modulo-facturacion` y
`subsistema-papelera` apuntan acá; no la copian. Antes de cambiar qué hace un método que toca
`op.estado`, ubicarlo en esta tabla: la semántica de cada gesto sale de acá, no de leer el
método suelto.

### Estados

El estado vive en el documento de la operación, `op.estado: EstadoOp`
(`interfaces/operacion.ts`):

```ts
ciclo: 'abierta' | 'cerrada' | 'liquidada';
liquidacion: { cliente: boolean; chofer: boolean };
proforma: { cliente: boolean; chofer: boolean };
```

`chofer` cubre también al proveedor (proveedor es variante de chofer). A esos tres ejes se suma
un estado que no está en el documento: **eliminada** — no existe `operaciones/{id}`, hay un
`papeleraEventos` con `estado: 'activo'` y la copia en `objetosEliminados` (skill
`subsistema-papelera`).

Combinaciones que el código produce, con la etiqueta de la UI (`etiquetaEstadoOp`,
`shared/utils/estado-op.util.ts`; la prioridad de la etiqueta es el orden de la tabla):

| Estado | `ciclo` | `proforma` (cl / ch) | `liquidacion` (cl / ch) | Etiqueta |
|---|---|---|---|---|
| E1 Abierta | abierta | F / F | F / F | Abierta |
| E2 Cerrada | cerrada | F / F | F / F | Cerrada |
| E3 Proforma de un lado (o de los dos) | cerrada | al menos uno T | sin cambio | Proforma CH / Proforma CL |
| E4 Liquidada de un lado | cerrada | F en ese lado | uno T | Liq CL / Liq CH |
| E5 Liquidada total | liquidada | F / F | T / T | Liquidada |
| E6 Eliminada | — (sin doc) | — | — | — |

- **E3 y E4 se combinan:** un lado liquidado y el otro en proforma es alcanzable
  (`crearBorrador` no mira el otro lado). La etiqueta muestra la proforma.
- **Las dos proformas pueden coexistir** si primero se arma el borrador del cliente y después
  el del chofer. Al revés no: el borrador del chofer marca `bloqueadoPorContraparte` en el
  InformeOp del cliente y la liquidación lo rechaza (regla de bloqueo de proformas, CLAUDE.md).
- Los InformeOp acompañan con su propio `estado: 'activo' | 'proforma' | 'liquidado' |
  'anulado'`, uno por lado. Existen desde E2. Lado X en proforma ⇔ InformeOp X `'proforma'`;
  lado X liquidado ⇔ InformeOp X `'liquidado'`; en los dos casos con `idInfLiq`.

### Transiciones

| De → A | Método (archivo) | Qué la habilita | Qué la impide |
|---|---|---|---|
| (nada) → E1 | alta: `OperacionFactoryService.crearOperacionBase` con `estadoInicial()` (`operacion-factory.service.ts`), vía `OperacionService.altaDesdeAsignacion` | — | — |
| E1 → E2 | `OperacionService.cerrarOperacion`: `ciclo: 'cerrada'`, crea el par de InformeOp `'activo'`, `resumenProcesado: true`, suma `resumenesOp` y `comisionesVenta`, en transacción | — | Antes de la transacción: ya existe un InformeOp no anulado para la op (`InformeOpService.existeParaOperacion`). En la transacción: `ciclo !== 'abierta'` o `resumenProcesado: true` |
| E2 → E3 (lado X) | `InformeLiqService.crearBorrador`: `proforma.X = true`; InformeOp X → `'proforma'` + `idInfLiq`; si X ≠ cliente, InformeOp del cliente → `bloqueadoPorContraparte: true` | permiso `liquidaciones.liquidar` | InformeOp no `'activo'`, `bloqueadoPorContraparte`, otro tipo/entidad, fuera del período, op repetida |
| E3 (lado X) → estado previo de ese lado | `InformeLiqService.eliminarBorrador`: `proforma.X = false`, InformeOp X → `'activo'`, `idInfLiq: null`, borra el InformeLiq | permiso `liquidaciones.eliminar` | InformeLiq no `'borrador'`; InformeOp no `'proforma'` con ese `idInfLiq` |
| E3 (lado X) → E4 o E5 | `InformeLiqService.emitirBorrador` (`camposLiquidacion`): `proforma.X = false`, `liquidacion.X = true`, `ciclo: 'liquidada'` si el otro lado ya estaba liquidado; InformeOp X → `'liquidado'`; desbloquea al cliente | permiso `liquidaciones.liquidar` | InformeLiq no `'borrador'`; InformeOp no `'proforma'` con ese `idInfLiq` |
| E2/E4 (lado X activo) → E4 o E5 | `InformeLiqService.emitir` (emisión directa, `camposLiquidacion`): ídem; InformeOp X → `'liquidado'` + `idInfLiq`. No toca `bloqueadoPorContraparte` | permiso `liquidaciones.liquidar` | las mismas que el borrador |
| E4/E5 (lado X) → E2/E4 | `InformeLiqService.revertirEmitido` (`camposReversion`): `liquidacion.X = false` y `ciclo 'liquidada' → 'cerrada'`; InformeOp X → `'activo'`, `idInfLiq: null`; InformeLiq → `'revertido'` | permiso `facturacion.revertir`; motivo no vacío | InformeLiq no `'emitido'` (uno facturado pasa antes por `desvincularFactura`); `totalCobrado !== 0`; `totalAjustado !== 0` (defensiva; estados del InformeLiq en la skill `modulo-facturacion`); InformeOp no `'liquidado'` con ese `idInfLiq` |
| E1 → E6 | `OperacionService.bajaOperacion` (desde `tablero-op`) | `operaciones.eliminar`; botón habilitado si la etiqueta es `'Abierta'` | En transacción: `validarBaja(op, 'abierta')`; no hay tablero para la fecha |
| E2 → E6 | `OperacionService.bajaOperacionCerrada` (desde `informe-op-listado`, tacho por InformeOp) | `liquidaciones.eliminar`. `darDeBaja` corre `validarBaja(op, 'cerrada')` antes de pedir el motivo y muestra su mensaje tal cual | En transacción: `validarBaja(op, 'cerrada')`; alguno de los dos InformeOp no `'activo'` o con `idInfLiq`; falta la contraparte o es de otra op; no hay tablero |
| E3/E4/E5 → E6 | **No hay transición directa** (ver abajo) | — | `validarBaja` rechaza cualquier flag de liquidación o proforma |
| E6 → E1 | `OperacionService.restaurarOperacion` (desde `PapeleraComponent`). Ver "Contrato vigente — `restaurarOperacion`". Es el único camino: el legado (`TableroService.altaOperacionYActualizarTablero`, Papelera legado) se eliminó | evento `'activo'`; rol distinto de `demo` | ver el contrato |

**Los dos hechos que más cuestan de descubrir leyendo el código:**

- **No hay ningún camino de cerrada a abierta salvo dar de baja y restaurar.** Los únicos
  escritores de `estadoInicial()` son el alta y `restaurarOperacion` (el camino legado de
  `TableroService` se eliminó con la Papelera legado). Ningún gesto "reabre" una op cerrada: si hay que corregir algo de una
  cerrada, se edita su InformeOp o se da de baja y se restaura.
- **Una op en proforma o liquidada no se puede dar de baja directamente.** Primero hay que
  volverla a E2 **en cada lado**: `eliminarBorrador` para un lado en proforma,
  `revertirEmitido` para uno liquidado (y antes `desvincularFactura` si está facturado).
  Revertir un solo lado de una E5 deja `ciclo: 'cerrada'` con `liquidacion.<otro>: true` —
  la misma forma que E4 — y la baja se sigue rechazando. No existe "anular InformeLiq": el
  `'anulado'` de InformeLiq está reservado sin escritor.

Escritores de `ciclo`, por relevamiento: `'cerrada'` sólo `cerrarOperacion` y
`camposReversion` (`informe-liq.service.ts`); `'liquidada'` sólo `camposLiquidacion`.

## Contrato vigente — `restaurarOperacion`

`OperacionService.restaurarOperacion(idEvento)`, transición E6 → E1 de la máquina de estados.
Caller único: `PapeleraComponent.restaurar`.

**Semántica.** La restauración devuelve la operación a **abierta** —su propósito es que se
pueda volver a trabajar— y **no descarta información que el usuario cargó**. Los campos quedan
como estaban al momento de la baja (`km`, acompañantes, multiplicadores, tarifa base manual,
`adExtra`, `tarifaAplicada*`, `datosTarifaEventual`, snapshots): se precargan y el usuario los
ajusta en el nuevo cierre. `valoresNuevos` se recalcula con `ValoresTarifaService.calcularCierre`
sobre esos datos y la tarifa congelada; sus errores van al texto del log `RESTAURAR`, no abortan.

**Resetea exactamente tres cosas, y ninguna se puede sacar:**

| Campo | Valor | Por qué no se puede sacar |
|---|---|---|
| `estado` | `estadoInicial()` | Es el propósito de la restauración. |
| `resumenProcesado` | `false` | `cerrarOperacion` rechaza cualquier op que llegue con `true`: conservarlo deja la op restaurada **sin poder volver a cerrarse nunca**. Además es correcto: la baja ya restó su aporte de `resumenesOp`. |
| `informeOpCliente` / `informeOpChofer` | `''` | Los InformeOp quedaron `'anulado'` en la baja y el próximo cierre crea un par nuevo: conservarlos dejaría referencias muertas. |

El código tiene el mismo comentario al lado de cada reset. Agregar un reset (volver `km` a 0,
los multiplicadores a 1, etc.) es descartar datos del usuario, no "terminar la limpieza".
Historia: antes reseteaba 13 campos para "volver al estado del alta", que no se persiste en
ningún lado; eso perdía datos cargados en el alta (auditoría
`docs/auditorias/baja-y-restauracion-de-operacion.md`).

**Transaccional** (`commitEnTransaccion`). Lee dentro de la transacción el evento y la copia
archivada (`PapeleraService.prepararRestauracionEnTransaccion`, variante transaccional de
`prepararRestauracionEnBatch` con las mismas validaciones), la operación y el tablero
(`AsignacionService.leerTableroEnTransaccion`). Escribe todo en la misma transacción: borrado
de la copia, evento → `'restaurado'`, la op (`'crear'`), el tablero con el item reactivado y el
log `RESTAURAR`. Dos restauraciones simultáneas del mismo evento no pueden pasar las dos, y el
`set` del tablero entero no pisa ediciones concurrentes.

**Aborta sin escribir nada** —todo vuelve como `Resultado` con `exito: false` y pasa por
`registrarError`; ninguna falla se escapa como excepción— si:

- el evento no existe o ya fue restaurado, o falta la copia archivada;
- el evento no es de `'operaciones'`;
- **ya existe `operaciones/{id}`**: `'crear'` es un `set` plano y lo pisaría;
- no existe el tablero de la fecha de la op;
- **el tablero no tiene ningún item con ese `idOperacion`**: `reactivarItemEnLista` no hace
  nada si no lo encuentra, así que la op restaurada quedaría fuera de todo tablero, en
  silencio. El mensaje nombra la fecha y el `idOperacion`. Falla cerrada a propósito: abortar
  cuesta un mensaje; una op fuera de todo tablero no se ve. Sin probar con datos reales (ver
  deuda abajo).

No toca `resumenesOp`, `comisionesVenta`, `informesOp` ni `registrosOpEventuales`: quedan con
la resta o anulación de la baja, y el próximo cierre vuelve a sumar.

## Contratos vigentes — operaciones-editor y altaDesdeAsignacion

### `operaciones-editor`

**Contrato (cumplido):**
- Entrada: `@Input() operacionesCreadas: OperacionCreada[]` (lista PLANA, tipada — NO
  `fromParent` con cast). El caller setea `modalRef.componentInstance.operacionesCreadas`.
- Salida: `modalRef.result` resuelve con `OperacionCreada[]` finales (sin las eliminadas);
  dismiss = cancela.
- Agrupa por `item.idCliente` internamente (viewmodel efímero `GrupoEditor`).

**El editor NO calcula valores ni persiste:** edita un snapshot en memoria y devuelve
(con las referencias de tarifa elegidas). El cálculo (`calcularAlta`) y la persistencia
siguen en `altaDesdeAsignacion`. Sin suscripciones (resolución síncrona puntual): edita,
no observa.

### `operaciones-editor` — conducta del componente

**Eliminar = excluir del resultado (Opción B):** `Set<idItem>` de eliminadas; se ocultan
del render y se excluyen del array devuelto. NO muta `operacionesCreadas` (cancelar reabre
desde cero, inocuo). NO toca Firestore.

**Toggle eventual reversible:** `eventualOriginal: Map<idItem, boolean>` guarda si la op
era eventual al entrar (estado de UI, no ensucia la Operacion — reemplaza el viejo
`OperacionRuntime`). La mutación coherente (`datosTarifaEventual`, manteniendo el
invariante) vive en `OperacionFactoryService.aplicarEventual`.

**Badges de tarifa del encabezado:** los niveles habilitados del CLIENTE vivo
(`nivelesHabilitados(cliente.tarifasHabilitadas)`), uno por nivel; informativos. La
tarifa elegida de cada lado se ve en su fila.

### `altaDesdeAsignacion` reconstruye el `ref`

**`AsignacionRef` placeholder corregido en `altaDesdeAsignacion`:** `OperacionService.altaDesdeAsignacion`
(`servicios/operaciones/operacion.service.ts`) reconstruye `c.item.ref` con los datos reales
de la op final en el mismo loop donde ya reconstruye `c.item.sujeto` (paso 3). Para
`tablero-asignaciones` es idempotente (el ref ya viene correcto desde el pool de vehículos).
Para `carga-asignacion` corrige el placeholder una vez que `operaciones-editor` resolvió el
vehículo pendiente. Es el único punto de verdad para "cómo se ve un `AsignacionItem`
persistido" — no reconstruir `ref` en ningún otro caller.

### `altaDesdeAsignacion` — `siExisteBorrador`

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

Callers con `'bloquear'`: `carga-asignacion` (`carga-asignacion.component.ts`, `altaOp`) y el
generador de operaciones de demo (`servicios/desarrollo/generador-operaciones.service.ts`,
`ejecutar`, en el alta de cada día), que da de alta día por día. Con el default `'reemplazar'`: `tablero-asignaciones`.

## Conducta vigente — `carga-asignacion`

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

## Deuda abierta — tablero-asignaciones (menor)

~~**Informe Excel (`descargar`):** inerte, muestra aviso.~~ — el botón y su método se
borraron en el frente Informes (IE4, D6), y el informe VOLVIÓ en AS1, reescrito de cero
sobre `LibroTabular`, con Excel y PDF y una hoja de no disponibles — ver la skill
`exportacion-excel-pdf`, subsección "Informe del tablero de asignaciones". El viejo quedó registrado en
`claude/diseno-informes-excel-pdf.md` §7.

**Persistencia del borrador en F5:** el borrador en curso vive en memoria del service; un F5 lo
pierde. Si se requiere, persistir solo la fecha en localStorage y recuperar de Firestore (cubre
tableros guardados/dados de alta, no el borrador local no guardado). DIFERIDO.

## Deuda abierta — operaciones-editor / Tarifas

~~**`idCliente` de TarifaPersonalizadaCliente: tipo vs dato divergen.**~~ — RESUELTO en el
cierre de Tarifas (la interfaz y el módulo viejo ya no existen).

**Estilos duplicados:** las clases SCSS de tarifa eventual/personalizada se copiaron de
operaciones-table a operaciones-editor. operaciones-table ya fue eliminado en el switch de
Asignaciones (Bloques 13-19) — pendiente ahora consolidar los estilos duplicados en
operaciones-editor (ya no hay original que mantenga la copia sincronizada).

**Celdas de tarifa en el template:** los bindings a `datosTarifaEventual`
usan guarda `@if (objeto)` (no `[disabled]` + `!`): el `disabled` NO impide que Angular evalúe
el binding, y el `!` revienta en runtime cuando el objeto es null. Patrón a respetar en
cualquier template que bindee tarifas nullable.

**`clientesVisibles` getter "con trabajo"** (arma Map + ordena en cada acceso): candidato
a cachear si hubiera cientos de clientes. Hoy trivial.

**Item con cliente borrado** (papelera) sin columna: `// TODO: refactor Papelera`.

## No disponibilidad

Diseño completo, reglas y decisiones: `docs/disenos/no-disponibilidad.md`. Lo que hay que tener
presente al tocar operaciones:

- **Modelo:** `NoDisponibilidad` (`interfaces/no-disponibilidad.ts`) sobre un sujeto
  discriminado — chofer (directo o de proveedor), vehículo (con su dueño en el snapshot) o
  proveedor — con `desde`, `hasta | null` (sin fecha de fin prevista), `motivo` y `activa`
  (false = anulada por error, con `anulacion`). Colección `noDisponibilidades`. La vigencia es
  derivada (`cubreFecha`), nunca guardada.
- **Servicios:** `NoDisponibilidadService` (listener de la colección completa, `init()` desde
  `HomeComponent` con permiso de lectura de `operaciones`; alta/editar/anular con `commitBatch`
  + `Resultado` + `LogRegistroService`), `NoDisponibilidadFactoryService`, y
  `DisponibilidadService` (la resolución: `disponibilidadDe`, `vehiculosDisponiblesDe`,
  `itemsNoDisponibles`, `motivosDeOperacion`, `motivosDe`, `datosCargados`).
- **Funciones puras** en `shared/utils/no-disponibilidad.util.ts` (con tests): cascadas de
  propiedad (vehículo / chofer directo / chofer de proveedor / proveedor) y **la regla única
  de qué se pregunta**: `consultasDeAsignacion` (ítem de tablero) y `consultasDeOperacion`
  (operación). La usan el tablero, la carga, el editor, el informe, el generador y las
  guardas: **siempre la entidad y el vehículo por separado** — un chofer directo con todos sus
  vehículos fuera está él mismo disponible.
- **Consumidores**, siempre contra la fecha del tablero o de la operación:
  `tablero-asignaciones` (pool atenuado y sin arrastre; ítems colocados con borde rojo),
  `carga-asignacion` (categoría atenuada si no le queda vehículo; entidad bloqueada si ella no
  está o no le queda ninguno; preselección de vehículo único entre los disponibles),
  `operaciones-editor` (candidatos no disponibles deshabilitados con el motivo; autoselección
  sólo del único disponible; confirmar bloquea), y el modal
  `modal-no-disponibilidad` (botón "No disponibles" en tablero y carga, permiso
  `operaciones.noDisponibilidad`).
- **Guardas duras** (devuelven `Resultado`, no lanzan): botón "Alta de Op" del tablero,
  `AsignacionService.guardarBorrador`, `OperacionService.altaDesdeAsignacion` (primer paso,
  aborta el alta completa) y `OperacionService.editarOperacion` (sólo si cambia chofer,
  vehículo o proveedor hacia uno no disponible).
- **"No se pudo verificar" no es "disponible":** si `datosCargados()` da false, las pantallas
  bloquean, las guardas rechazan y el informe lo dice.
- `ResolucionTarifaOpService.choferesDisponibles` / `vehiculosDisponibles` **no miran
  disponibilidad**: devuelven candidatos de tarifa (renombre pendiente, skill `modulo-tarifas`).

## Deuda abierta — Frente futuro — persistencia de filtros/rango de fechas vs. listener en background

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
  correcto para sobrevivir F5; solo cambia dónde vive el acceso. Ver también la deuda
  siguiente: las claves no distinguen usuario.

## Deuda abierta — preferencias de UI compartidas entre usuarios del mismo navegador

Cinco claves de `localStorage`, escritas y leídas inline por cada componente:
- `tablero-op`: `tablero_op_range_v1` (rango), `tablero_op_filtros_v2` (filtros, más
  `clienteSeleccionado` y `choferSeleccionado`), `tablero_op_colwidth_v1` (anchos de
  columna) y `op_cols` (columnas visibles);
- `informe-op-listado`: `informe_op_listado_range_v1` (rango).

Hasta el frente remanente de StorageService (2026-11-04), `localStorage.clear()` corría en
cada montaje de `/login` y en cada logout, así que estas claves "sobrevivían a F5" pero no
al login. Desde que se sacó ese `clear()` sobreviven a todo: **el siguiente usuario del
mismo navegador hereda las del anterior**, incluido el cliente o chofer filtrado. No es un
problema de permisos (los datos se leen con el rol de quien está logueado), pero confunde.

**Arreglo:** namespacear las claves por uid (`<clave>:<uid>`), idealmente dentro del
servicio chico de preferencias de la deuda anterior. Al hacerlo, las claves viejas sin uid
quedan huérfanas: borrarlas una vez o ignorarlas.

Relacionado: `TableroOpComponent.restaurarRangoPropio` hace `JSON.parse` sin `try/catch`;
ahora que la clave vive más, un valor corrupto rompe la pantalla hasta borrarlo a mano.

## Deuda abierta — fix de altura del modal limitado a tablero-op

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

## Deuda abierta — guarda del item del tablero sin probar

La guarda "el tablero no tiene el item de la op" de `restaurarOperacion` no se pudo probar:
dependía de encontrar un evento viejo con ese problema. Falla cerrada. Probablemente aparezca
en la migración (ops viejas, o restauradas por el camino legado sobre otro tablero). Si
aparece, el mensaje dice exactamente qué no encontró y se decide si relajarla.

## Deuda abierta — tablero: `timestamp` sin actualizar al anular o reactivar

El camino nuevo (`AsignacionService.agregarEscrituraAnularItem` en la baja y el reactivado de
`restaurarOperacion`) reescribe el tablero sin tocar su `timestamp`; el legado
(`AsignacionService.reactivarItem`, eliminado con la Papelera legado) sí lo actualizaba. **Antes de arreglarlo, verificar qué lee
ese `timestamp`:** si algo lo usa para invalidar caché o detectar cambios, una baja o una
restauración son invisibles para ese mecanismo.

## Deuda abierta — `resumenProcesado` falsy en ops cerradas

El campo es opcional y puede haber ops cerradas de legado sin él. En ésas la baja no resta de
`resumenesOp` (sólo revierte si `op.resumenProcesado`) pero el recierre después de restaurar
suma: el resumen queda inflado. Verificar si existen; se corrige con el Recálculo de
resúmenes de `/migracion` (skill `modulo-reportes`).

## Deuda abierta — detalles de UI de la baja

- Dos títulos para el mismo gesto: el éxito de la baja se titula "Operación eliminada" en
  `tablero-op` y "Operación dada de baja" en `informe-op-listado`.
- El tacho de `informe-op-listado` no se deshabilita mientras `guardando`; sólo lo tapa el
  overlay del spinner.

## Preguntas abiertas — baja y restauración

De la auditoría `docs/auditorias/baja-y-restauracion-de-operacion.md`, sin investigar:

1. **`firestore.rules`:** ¿alguna regla impide borrar o reescribir `operaciones` o
   `informesOp` según su estado, o la única guarda de negocio es la del coordinador? No se
   relevó.
2. **Coherencia entre `op.estado` y los InformeOp:** el código los mantiene en las mismas
   transacciones, pero no se verificó en datos si hay ops con flags que no coinciden con el
   estado de sus InformeOp. Las dos guardas de `bajaOperacionCerrada` cubren cualquiera de
   las dos divergencias.
3. **`lockLiquidacion`:** está en la interfaz `Operacion` y la restauración lo conserva. No se
   sabe si algo lo escribe o lo lee: puede ser un campo muerto.
4. **Tablero con items sin `idOperacion` coincidente** (ops viejas, o restauradas por el
   camino legado sobre otro tablero): la baja reescribe el tablero sin cambios y sin aviso
   (la restauración ahora aborta, ver arriba). No se sabe si el caso existe en datos.

## Deuda abierta — `editarOperacion` puede fallar sin devolver `Resultado`

`OperacionService.editarOperacion` arma la escritura del ítem del tablero **antes** del
`try`. Si no existe tablero de asignaciones para la fecha de la operación, la excepción se
escapa: el método no devuelve `Resultado` y el error no pasa por `registrarError`. El usuario
queda sin saber qué ocurrió.

Viola el invariante de que toda operatoria compleja devuelve `Resultado<T>` y registra el
error.

**La forma correcta está en `restaurarOperacion` y en las dos bajas:** las lecturas y los
chequeos van dentro del `try` y un tablero inexistente se devuelve como
`{ exito: false, mensaje: ... }` con el detalle de la inconsistencia. El arreglo es replicar
esa forma: mover el armado de la escritura dentro del `try`, o hacer el chequeo temprano con
retorno de `Resultado`.

Caller único: `modal-detalle-op.component.ts`.

## Deuda abierta — renombre de `modalCargaMultiple()` (cosmética)

**Caller confirmado:** `tablero-op.component.ts`, método `modalCargaMultiple()` (nombre
heredado del componente viejo, no renombrado — el cuerpo ya abre `CargaAsignacionComponent`).
Candidato a renombrar el método en una sesión futura por claridad, no urgente.
