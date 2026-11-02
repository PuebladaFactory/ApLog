# Auditoría — baja y restauración de una operación

Fecha: 2026-11-01 · Rama: refactor

## Alcance

Se relevó, leyendo el código de la rama `refactor`:

- La pregunta abierta: si hay una traba para dar de baja una operación cerrada con un
  InformeOp liquidado y el otro activo, y dónde vive (§1).
- Los tres caminos que llevan a la baja: desde **abierta** (`bajaOperacion`), desde
  **cerrada** (`bajaOperacionCerrada`), y lo que tiene que deshacerse antes en una op
  liquidada o en proforma (`revertirEmitido`, `eliminarBorrador`) (§2).
- La restauración desde la Papelera nueva (`restaurarOperacion`) y, por completitud, el
  camino de la Papelera legado (§3).
- La lista completa de campos que reescribe `restaurarOperacion` (§4).
- La máquina de estados de la operación tal como está en el código (§5).

Quedó explícitamente afuera:

- **`firestore.rules`.** No se verificó si las reglas restringen algo por estado de la
  operación o del InformeOp. Según CLAUDE.md son una matriz rol × módulo × acción, pero eso no
  se contrastó contra el archivo para esta auditoría. Todo lo que dice este documento sobre
  "guardas" se refiere al código Angular.
- **El alta** (`altaDesdeAsignacion`), salvo que la op nace con `estadoInicial()`.
- **`editarOperacion` y la edición de InformeOp.** No cambian el estado, sólo se nombran
  cuando un campo que toca la restauración también lo escriben ellos.
- **Facturación** (`facturar`/`desvincularFactura`), salvo que un InformeLiq `'facturado'`
  tiene que desvincularse antes de poder revertirse.
- **`resumenVenta`.** No existe ninguna colección ni servicio con ese nombre. El equivalente
  actual de "el resumen del vendedor por operación" es `comisionesVenta`, y es lo que se
  relevó. `informesVenta` sólo aparece en comentarios y en la lista de purga de demo
  (`servicios/desarrollo/limpieza-demo.service.ts:60`).

## Inventario de archivos

| Archivo | Tipo | Rol |
|---|---|---|
| `src/app/servicios/operaciones/operacion.service.ts` | Servicio | `validarBaja` (:406), `agregarEscriturasBaja` (:435), `bajaOperacion` (:453), `bajaOperacionCerrada` (:504), `restaurarOperacion` (:618), `cerrarOperacion` (:795) |
| `src/app/servicios/operaciones/operacion-factory.service.ts` | Factory | `estadoInicial` (:99), defaults del alta (:40-95), `opToFirestore` (:140), `agregarEscrituraOperacionParcial` (:164-170) |
| `src/app/servicios/operaciones/asignacion.service.ts` | Servicio | Tablero: `getTableroPorFecha` (:53), `leerTableroEnTransaccion` (:62), `anularItemEnLista` (:131), `agregarEscrituraAnularItem` (:141), `reactivarItemEnLista` (:157), `reactivarItem` legado (:171) |
| `src/app/servicios/papelera/papelera.service.ts` | Servicio de apoyo | `prepararBajaEnBatch` (:63), `prepararRestauracionEnBatch` (:113) |
| `src/app/servicios/informes-op/informe-op.service.ts` | Servicio | `observarPorPeriodo` (:76), `existeParaOperacion` (:100), `leerEnTransaccion` (:141), `agregarAnulacionInformeOp` (:148), `agregarEscrituraInformeOpParcial` (:185) |
| `src/app/servicios/informes-liq/informe-liq.service.ts` | Servicio | `crearBorrador`/`emitir` → `crearNuevo` (:182-192, :815), `emitirBorrador` (:203), `eliminarBorrador` (:283), `revertirEmitido` (:566), `camposLiquidacion` (:1111), `camposReversion` (:1126) |
| `src/app/servicios/reportes/resumenes-op/resumen-op-factory.service.ts` | Factory pura | `escriturasSuma` (:101) |
| `src/app/servicios/vendedores/comision-venta-factory.service.ts` | Factory pura | `escriturasBaja` (:127) |
| `src/app/servicios/tarifario/valores-tarifa.service.ts` | Servicio | `calcularCierre` (:120), usado por la restauración |
| `src/app/servicios/tarifario/tarifario.service.ts` | Servicio | Anulación de `registrosOpEventuales` en la baja de una cerrada |
| `src/app/servicios/database/db-firestore.service.ts` | Capa de datos | `commitBatch` (:823), `aplicarEscritura` (:845), `commitEnTransaccion` (:878), `leerEnTransaccion` (:900) |
| `src/app/servicios/log-registro/log-registro.service.ts` | Servicio de apoyo | `agregarAlBatch` (:65-98), `registrarError` |
| `src/app/servicios/tablero/tablero.service.ts` | Servicio legado | `altaOperacionYActualizarTablero` (:25-45), restauración de la Papelera legado |
| `src/app/raiz/operaciones/tablero-op/tablero-op.component.{ts,html}` | Componente | Caller de `bajaOperacion` |
| `src/app/raiz/liquidacion/informe-op-listado/informe-op-listado.component.{ts,html}` | Componente | Caller de `bajaOperacionCerrada` |
| `src/app/raiz/liquidacion/borradores-liq/borradores-liq.component.ts` | Componente | Caller de `emitirBorrador` / `eliminarBorrador` |
| `src/app/raiz/nueva-facturacion/emitidos/facturacion-emitidos.component.ts` | Componente | Caller de `revertirEmitido` |
| `src/app/raiz/ajustes/papelera/papelera.component.{ts,html}` | Componente | Caller de `restaurarOperacion` |
| `src/app/raiz/ajustes/papelera-legado/papelera-legado.component.{ts,html}` | Componente legado | Restauración por `TableroService` |
| `src/app/shared/modales/baja-objeto/baja-objeto.component.ts` | Modal | Pide el motivo, sin chequeos de negocio |
| `src/app/shared/utils/estado-op.util.ts` | Util | `etiquetaEstadoOp` (:11-20), de la que depende el botón de baja de abiertas |
| `src/app/interfaces/operacion.ts`, `informe-op-nuevo.ts`, `informe-liq-nuevo.ts`, `asignacion.ts`, `registro-papelera.ts`, `anulacion.ts` | Interfaces | Ver "Interfaces y tipos" |

---

## 1. La pregunta abierta: baja de una cerrada con un InformeOp liquidado y el otro activo

> **Respuesta: la traba existe y vive SÓLO en el coordinador** (`bajaOperacionCerrada`),
> dentro de la transacción y por partida doble. **La UI no la tiene: el botón de baja
> aparece y está habilitado** en el InformeOp activo aunque la contraparte ya esté
> liquidada. El usuario hace clic, confirma el motivo y recibe el rechazo del servidor.

### Lo que hace la UI (`informe-op-listado`)

- El listado sólo carga InformeOp `'activo'` y `'proforma'` (`informe-op.service.ts:76-84`,
  filtro `['activo', 'proforma']`). El liquidado no se ve, pero su contraparte activa sí.
- La celda del tacho (`informe-op-listado.component.html:444-445`):
  ```html
  <td *appPermiso="'liquidaciones.eliminar'" class="text-center">
      @if (informeOp.estado === 'activo' && !informeOp.bloqueadoPorContraparte) {
  ```
  Mira sólo el InformeOp de la fila. No lee la contraparte: `contraParte` se usa en el
  template sólo para mostrar nombre, importe y porcentaje. Tampoco mira
  `op.estado.liquidacion`.
- `bloqueadoPorContraparte` no cubre este caso. Se pone en `true` sólo cuando se crea un
  **borrador** del lado chofer/proveedor, y sólo sobre el InformeOp del cliente
  (`informe-liq.service.ts:892-899`). `emitirBorrador` lo vuelve a `false`
  (`informe-liq.service.ts:245-250`). La emisión directa (`emitir`, `modo === 'emitido'`) no
  lo toca. En los dos sentidos, una vez emitido un lado, el InformeOp activo del otro lado
  tiene `bloqueadoPorContraparte: false` y muestra el tacho.
- `darDeBaja` (`informe-op-listado.component.ts:337-368`) lee la op sólo para mostrarla en el
  modal de motivo y llama a `bajaOperacionCerrada(informe.idInfOp, motivo)` (:359). No valida
  nada.
- Permiso: `liquidaciones.eliminar` → `finanzas.eliminar` → sólo `dev` y `admin`
  (`permisos.service.ts:123, 218, 232`).

### Lo que hace el coordinador (`OperacionService.bajaOperacionCerrada`)

Todo dentro de `commitEnTransaccion`, con relectura fresca de los dos InformeOp y de la op:

1. **`validarBaja(op, 'cerrada')`** (`operacion.service.ts:530`). En :408-409 rechaza:
   ```ts
   if (op.estado.liquidacion.cliente || op.estado.liquidacion.chofer) {
     return `La operación ${num} está liquidada (total o parcialmente). No se puede dar de baja.`;
   ```
   Con un lado liquidado, el flag `estado.liquidacion.<lado>` está en `true`
   (`camposLiquidacion`, `informe-liq.service.ts:1111-1122`), así que la baja se rechaza acá.
2. **Chequeo de los dos InformeOp** (`operacion.service.ts:532-539`):
   ```ts
   for (const inf of [informe, contraparte]) {
     if (inf.estado !== 'activo' || inf.idInfLiq) {
       throw new Error(`El informe ${inf.idInfOp} (${inf.tipo}) está en estado '${inf.estado}'. ...`);
   ```
   La contraparte liquidada tiene `estado: 'liquidado'` e `idInfLiq` con valor, así que
   también se rechazaría acá. En la práctica no se llega a este punto, porque el paso 1 corta
   antes.

**Cómo falla.** La excepción aborta la transacción y no se escribe nada. El `catch`
(`operacion.service.ts:598-603`) escribe un `registrarError` aparte (no atómico) y devuelve
`{ exito: false, mensaje }`. El componente lo muestra en un Swal de error con título
"No se pudo dar de baja" (`informe-op-listado.component.ts:360-364`).

**Por qué el agujero de UI no se convierte en uno real.** `bajaOperacionCerrada` tiene un solo
caller (`informe-op-listado.component.ts:359`), y la guarda vive en el método, no en el
componente. Cualquier otro camino que lo llame hereda la traba. El único otro punto que borra
documentos de `operaciones` es `agregarEscriturasBaja` (`operacion.service.ts:441`), al que
llaman sólo `bajaOperacion` y `bajaOperacionCerrada`. `bajaOperacion` aplica la misma
`validarBaja`, que también rechaza cualquier flag de liquidación. Fuera de esto sólo queda la
purga masiva de demo (`limpieza-demo.service.ts:54, 114`), con guarda de proyecto `demoapplog`
y rol `dev`.

---

## 2. La cadena de la baja

Convención de la última columna:

- **TX** = dentro del mismo `commitEnTransaccion` (lecturas y escrituras en un solo
  `runTransaction`, `db-firestore.service.ts:878-894`; aborta con más de 500 escrituras).
- **Batch** = mismo `commitBatch` (`:823-836`). Es atómico hasta 500 escrituras; por encima,
  los chunks no son atómicos entre sí.
- **Aparte** = escritura independiente.

El log entra al mismo array de escrituras (`agregarAlBatch`, `log-registro.service.ts:65-98`).
Para el rol `dev` no se agrega nada (`construirEntrada`, :32 y :94).

### 2.a Baja desde abierta — `bajaOperacion(op, motivo)` (`operacion.service.ts:453-486`)

Caller: `tablero-op.component.ts:743`.

Lecturas en TX: la op (`leerOperacionEnTransaccion`, :458) y el tablero de su fecha (:461).

Guardas en TX:
- `validarBaja(actual, 'abierta')`: sin liquidación, sin proforma, `ciclo === 'abierta'`.
- Que exista el tablero (:462-467).

| # | Qué documento | Colección | Qué cambia | ¿Mismo batch? |
|---|---|---|---|---|
| 1 | `operaciones/{idOperacion}` | `operaciones` | delete (`modo: 'eliminar'`, :441) | TX |
| 2 | `papeleraEventos/{generarId}` | `papeleraEventos` | crea el evento: `timestamp`, `userId`, `userEmail`, `motivoBaja`, `coleccionPrincipal: 'operaciones'`, `idPrincipal`, `estado: 'activo'`, `refs` (`papelera.service.ts:63-103`) | TX |
| 3 | `objetosEliminados/operaciones__{idOperacion}` | `objetosEliminados` | crea la copia: `opToFirestore(op)` tal como estaba (`set`) | TX |
| 4 | `asignaciones/{fecha}` | `asignaciones` | `set` del tablero entero con el item de la op en `{ estado: 'anulada', motivo, timestamp }` (`asignacion.service.ts:141-154`). El `timestamp` del tablero no se actualiza | TX |
| 5 | `registroLog/{generarId}` | `registroLog` | entrada `BAJA` (:471-474) | TX |
| — | `resumenesOp` | — | **no se toca** (una abierta nunca sumó) | — |
| — | `comisionesVenta` | — | **no se toca** | — |
| — | `informesOp` | — | **no se toca** (una abierta no tiene) | — |
| err | `registroLog` | `registroLog` | `registrarError` en el catch (:479-481) | Aparte |

### 2.b Baja desde cerrada — `bajaOperacionCerrada(idInfOp, motivo)` (`operacion.service.ts:504-605`)

Caller: `informe-op-listado.component.ts:359`.

Pre-lecturas **fuera** de la TX (queries que el SDK web no permite dentro):
- `informeOpServ.obtenerPorId(idInfOp)` (:507).
- `tarifario.buscarIdsRegistrosEventualesActivos(idOperacion)` (:508-510).

Lecturas en TX:
- el InformeOp (:515) y su contraparte (:518);
- la op (:524);
- el tablero (:540);
- cada `RegistroOpEventual` (:551-556).

Guardas en TX:
- existe la contraparte (:519-523) y pertenece a la misma op (:525-529);
- `validarBaja(op, 'cerrada')` (:530);
- los dos InformeOp están en `'activo'` sin `idInfLiq` (:532-539);
- existe el tablero (:541-546);
- el InformeOp no cambió de operación respecto de la pre-lectura (:547-549).

Orden real en que se empujan las escrituras:

| # | Qué documento | Colección | Qué cambia | ¿Mismo batch? |
|---|---|---|---|---|
| 1 | `general_{mes}`, `cliente_{id}_{mes}`, `chofer_{id}_{mes}` o `proveedor_{id}_{mes}` | `resumenesOp` | `set` merge con `increment()` negativo del aporte de la op (`cantidadOps`, `kmRecorridos`, `acompanianteOps`, `acompanianteCantidadTotal`, `ganancia`, `cliente{…}`, `chofer{…}`) + `actualizado` (`resumen-op-factory.service.ts:101-104, 175-185`). **Sólo si `op.resumenProcesado`** (:560-562). Sin lecturas | TX |
| 2 | `{idOperacion}_{idVendedor}` por cada vendedor del snapshot | `comisionesVenta` | `set` merge: `monto` y `saldo` `increment(-monto)`, `anulada: true` + campos de identidad (`comision-venta-factory.service.ts:127-149`). Si `op.cliente.comisiones` está vacío, no hay escrituras | TX |
| 3 | `operaciones/{idOperacion}` | `operaciones` | delete | TX |
| 4 | `papeleraEventos/{generarId}` | `papeleraEventos` | crea el evento (igual que en 2.a) | TX |
| 5 | `objetosEliminados/operaciones__{id}` | `objetosEliminados` | copia de la op cerrada tal como estaba | TX |
| 6 | `asignaciones/{fecha}` | `asignaciones` | item anulado (igual que en 2.a) | TX |
| 7 | `informesOp/{idInfOp}` | `informesOp` | `update`: `estado: 'anulado'`, `anulacion: { motivo, usuario, fecha, idEventoPapelera }` (`informe-op.service.ts:148-154, 185-187`) | TX |
| 8 | `informesOp/{contraparte}` | `informesOp` | ídem | TX |
| 9 | `registrosOpEventuales/{id}` por cada uno activo | `registrosOpEventuales` | anulación con el mismo objeto `anulacion` (:578-580) | TX |
| 10 | `registroLog/{generarId}` | `registroLog` | entrada `BAJA` con detalle de InformeOp, resúmenes, comisiones y eventuales (:582-592) | TX |
| err | `registroLog` | `registroLog` | `registrarError` (:599-602) | Aparte |

**Los InformeOp no se borran, se anulan.** Siguen en `informesOp` y salen del listado, que
sólo observa `activo`/`proforma`.

**Las factories pueden lanzar.** `escriturasSuma` lanza si la op no tiene `valoresNuevos` o si
le falta un id de entidad válido (`resumen-op-factory.service.ts:46-48, 87-89`).
`escriturasBaja` lanza si hay comisiones sin `valoresNuevos` (`comision-venta-factory.service.ts:59-63`).
Como corren dentro de la TX, cualquiera de esos errores aborta la baja entera.

### 2.c Lo que precede a la baja de una op liquidada o en proforma

`validarBaja` exige `liquidacion` y `proforma` en `false` en **los dos** lados. No hay un
"anular InformeLiq": `'anulado'` de InformeLiq está reservado y ningún flujo lo escribe
(`informe-liq-nuevo.ts:25-27, 82`). Los dos únicos métodos que devuelven un InformeOp a
`'activo'` con `idInfLiq: null` son estos dos.

#### `eliminarBorrador(idInfLiq)` (`informe-liq.service.ts:283-329`) — para un lado en proforma

Caller: `borradores-liq.component.ts:188`, permiso `liquidaciones.eliminar`.

Guardas en TX:
- el InformeLiq está en `'borrador'` (:1006-1013);
- cada InformeOp está en `'proforma'` con ese `idInfLiq` (:995-1003);
- existe cada InformeOp y cada op (:1049-1068, :305-307).

| # | Qué documento | Colección | Qué cambia | ¿Mismo batch? |
|---|---|---|---|---|
| 1 | cada `informesOp/{idInfOp}` del borrador | `informesOp` | `{ estado: 'activo', idInfLiq: null }` (:296-299) | TX |
| 2 | `informesOp/{contraParte}` de cada uno, sólo si `liq.tipo !== 'cliente'` | `informesOp` | `{ bloqueadoPorContraparte: false }` (:300-304) | TX |
| 3 | cada `operaciones/{id}` | `operaciones` | `estado.proforma.<lado> = false`. `ciclo` y `liquidacion` no se tocan (:308-310) | TX |
| 4 | `informesLiq/{idInfLiq}` | `informesLiq` | delete físico (:313) | TX |
| 5 | `registroLog` | `registroLog` | `BAJA` sin diff (:314-317) | TX |
| — | `movimientosFin`, `resumenesOp`, `comisionesVenta` | — | no se tocan | — |

#### `revertirEmitido(idInfLiq, motivo)` (`informe-liq.service.ts:566-638`) — para un lado liquidado

Caller: `facturacion-emitidos.component.ts:181`, permiso `facturacion.revertir`.

Guardas:
- Fuera de la TX: motivo no vacío (:567-568).
- En TX: el InformeLiq está en `'emitido'` (:1016-1023). Uno `'facturado'` tiene que pasar
  antes por `desvincularFactura`.
- En TX: `valoresFinancieros.totalCobrado === 0` (:582-586).
- En TX: cada InformeOp está en `'liquidado'` con ese `idInfLiq` (:1037-1045).
- En TX: existen las ops y los movimientos compensados.

| # | Qué documento | Colección | Qué cambia | ¿Mismo batch? |
|---|---|---|---|---|
| 1 | `informesLiq/{idInfLiq}` | `informesLiq` | `{ estado: 'revertido', reversion }` (:594) | TX |
| 2 | cada movimiento compensado | `movimientosFin` | se quita la imputación de compensación de este informe (`quitarCompensacion`, :595-598) | TX |
| 3 | `informesLiqSnapshots/{idInfLiq}` | `informesLiqSnapshots` | crea la copia congelada de los InformeOp (:599-602) | TX |
| 4 | cada `informesOp/{idInfOp}` | `informesOp` | `{ estado: 'activo', idInfLiq: null }` (:606-609) | TX |
| 5 | cada `operaciones/{id}` | `operaciones` | `camposReversion`: `estado.liquidacion.<lado> = false` y, si `ciclo === 'liquidada'`, `ciclo = 'cerrada'` (:611-613, :1126-1130) | TX |
| 6 | `registroLog` | `registroLog` | `REVERTIR` con diff (:617-623) | TX |
| — | InformeOp de la contraparte, `bloqueadoPorContraparte`, `estado.proforma`, `resumenesOp`, `comisionesVenta` | — | no se tocan | — |

Para una op liquidada **en los dos lados**, hay que revertir los dos InformeLiq (y
desvincular la factura de cada uno, si están facturados) antes de que `validarBaja` deje
pasar la baja. Revertir un solo lado deja `ciclo: 'cerrada'` con
`liquidacion.<otro>: true`, y la baja se sigue rechazando.

---

## 3. La cadena de la restauración

### 3.a `restaurarOperacion(idEvento)` (`operacion.service.ts:618-691`)

**Desde dónde se la invoca.** Un solo caller: `PapeleraComponent.restaurar`
(`papelera.component.ts:180-229`, caso `'operaciones'` en :208-211).

- Gate de UI: `puedeRestaurar` (:176-178) = `evento.estado === 'activo' && !esRol('demo')`.
  Lo chequea al entrar a `restaurar()`; en el template es sólo una clase CSS
  (`papelera.component.html:72-74`).
- Ruta con `RoleGuard` `['dev','admin','demo']` (`ajustes-routing.module.ts:28-31`), así que en
  la práctica restauran `dev` y `admin`.

**No es transaccional.** Las lecturas son sueltas y la escritura es un `commitBatch`.

Lecturas, todas fuera de transacción:
- `prepararRestauracionEnBatch` lee el evento y cada objeto archivado con `db.getById`
  (`papelera.service.ts:113-142`).
- `getTableroPorFecha` lee el tablero con `firstValueFrom(getDocObservable)`
  (`asignacion.service.ts:53-58`).

**Precondiciones que exige:**

| Precondición | Dónde | Cómo falla |
|---|---|---|
| El evento existe | `papelera.service.ts:118-120` | **Excepción** (no hay try alrededor, `operacion.service.ts:621`) |
| El evento está en `'activo'` (no restaurado antes) | `papelera.service.ts:121-123` | **Excepción** |
| Existe cada objeto archivado | `papelera.service.ts:127-132` | **Excepción** |
| `coleccionPrincipal === 'operaciones'` | `operacion.service.ts:622-628` | `Resultado` `{ exito: false }` |
| Existe el tablero de `op.fecha` | `operacion.service.ts:656-663` | `Resultado` `{ exito: false }`. Nada commiteado todavía |
| El commit no falla | `operacion.service.ts:681-688` | `Resultado` `{ exito: false }` + `registrarError` aparte |

Las excepciones de `prepararRestauracionEnBatch` salen de `restaurarOperacion` sin pasar por
`registrarError`. Las captura el `try/catch` de `PapeleraComponent` (:221-222) y las muestra
en un Swal de error. El componente convierte un `Resultado` con `exito: false` en excepción
(:210) y lo muestra en el mismo Swal. En el éxito, el Swal es genérico ("El objeto ha sido
restaurado.") y no muestra el `mensaje` del servicio.

**No valida:**
- el estado del item del tablero;
- si existe un item para esa op (`reactivarItemEnLista` no hace nada si no lo encuentra,
  `asignacion.service.ts:157-163`);
- si ya existe un documento `operaciones/{id}`. `'crear'` es un `set` plano
  (`db-firestore.service.ts:852-853`) y pisaría el documento.

**Si el tablero no existe:** devuelve `{ exito: false, mensaje: 'Inconsistencia: no existe
tablero … Restauración abortada.' }` antes de commitear. El evento sigue en `'activo'` y la
copia archivada sigue en su lugar.

**Si el tablero está "cerrado":** no aplica. `Asignacion` no tiene un estado cerrado
(`interfaces/asignacion.ts:26-33`, sólo `asignado: boolean`), y ni la baja ni la restauración
miran `asignado`.

**Escrituras**, todas en el mismo `commitBatch` (`operacion.service.ts:682`), en este orden:

| # | Qué documento | Colección | Qué cambia | ¿Mismo batch? |
|---|---|---|---|---|
| 1 | `objetosEliminados/operaciones__{id}` | `objetosEliminados` | delete (`papelera.service.ts:133`) | Batch |
| 2 | `papeleraEventos/{idEvento}` | `papeleraEventos` | `set` del evento entero con `estado: 'restaurado'` (`papelera.service.ts:136-137`) | Batch |
| 3 | `operaciones/{idOperacion}` | `operaciones` | `set` de la op reconstruida (ver §4) (:667) | Batch |
| 4 | `asignaciones/{fecha}` | `asignaciones` | `set` del tablero entero, releído fuera de transacción, con el item en `{ estado: 'activa' }`. `timestamp` no se actualiza (:668-672) | Batch |
| 5 | `registroLog/{generarId}` | `registroLog` | `RESTAURAR`, con los errores del recálculo si los hubo (:675-679) | Batch |
| err | `registroLog` | `registroLog` | `registrarError` (:684-686), sólo para errores del commit | Aparte |

**¿Toca `resumenOp` o `comisionesVenta`?** **No.** No hay escrituras a `resumenesOp`,
`comisionesVenta`, `informesOp` ni `registrosOpEventuales` en el método (:618-691). Los
InformeOp quedan `'anulado'`, los registros eventuales también, y los resúmenes y comisiones
quedan con la resta que hizo la baja. La skill `modulo-reportes` (tabla, fila "Restauración")
y la skill `modulo-vendedores` (fila "Restauración") documentan lo mismo: "no toca, al
cerrarla de nuevo suma".

**Recierre después de restaurar:**
- `existeParaOperacion` ignora los anulados (`informe-op.service.ts:100-105`).
- La op vuelve con `resumenProcesado: false`.
- Por eso `cerrarOperacion` la acepta y crea un par nuevo de InformeOp.

### 3.b Camino legado — Papelera legado

`PapeleraLegadoComponent.addItem` (`papelera-legado.component.ts:197-217`) →
`TableroService.altaOperacionYActualizarTablero` (`tablero.service.ts:25-45`). Sigue vivo.

Escrituras, todas **aparte** (ninguna atómica con otra):

| # | Qué documento | Colección | Qué cambia | ¿Mismo batch? |
|---|---|---|---|---|
| 1 | `operaciones/{id}` | `operaciones` | `setDocSinId` con la op del `LogDoc`, con `estado = estadoInicial()` y `km = 0` | Aparte |
| 2 | `logs` | `logs` (log viejo) | `ALTA` "Restauración de operación…" | Aparte |
| 3 | `asignaciones/{fecha}` | `asignaciones` | `reactivarItem`: relee el tablero y lo reescribe con el item activo + `timestamp` (`asignacion.service.ts:171-184`). Lanza si no hay tablero, **después** de haber escrito la op | Aparte |
| 4 | `logs` | `logs` | log viejo `EDITAR` del item reactivado | Aparte |
| 5 | `papelera/{idDoc}` | `papelera` (vieja) | `storageService.deleteItem`, **sin `await`** (`papelera-legado.component.ts:201-207`) | Aparte |

Este camino reinicia sólo `estado` y `km`. No reinicia `resumenProcesado`, `informeOpCliente`/
`informeOpChofer`, multiplicadores, tarifa base manual, `adExtra` ni acompañante, y no
recalcula `valoresNuevos`. `restaurarObjeto` no chequea rol en TS. En el template sólo hay
`[ngClass]="{'isDisabled': usuarioSesion.esRol('demo')}"`
(`papelera-legado.component.html:62`). Es deuda ya registrada en CLAUDE.md ("Restaurar
operaciones desde la Papelera legado").

---

## 4. El "ajuste" de la operación restaurada

Lectura completa de `restaurarOperacion` (`operacion.service.ts:618-691`). Ésta es la lista
exhaustiva de lo que el método asigna sobre el objeto que se escribe:

| Línea | Asignación | Tipo |
|---|---|---|
| 631 | `op = { ...principal.data, idOperacion: principal.idOriginal, id: principal.idOriginal }` | **Reconstrucción**: copia superficial de la op archivada (tal como estaba al momento de la baja) + `idOperacion` + `id`. Los dos se descartan en `opToFirestore` (`operacion-factory.service.ts:140-143`) |
| 632 | `op.estado = this.operacionFactory.estadoInicial()` | **Reconstrucción del objeto** `estado`: `{ ciclo: 'abierta', liquidacion: {false,false}, proforma: {false,false} }` (`operacion-factory.service.ts:99-105`) |
| 633 | `op.km = 0` | campo |
| 637 | `op.resumenProcesado = false` | campo |
| 638 | `op.informeOpCliente = ''` | campo |
| 639 | `op.informeOpChofer = ''` | campo |
| 645 | `op.acompaniante = false` | campo |
| 646 | `op.acompanianteCant = 0` | campo |
| 647 | `op.multiplicadorCliente = 1` | campo |
| 648 | `op.multiplicadorChofer = 1` | campo |
| 649 | `op.tarifaBaseManualCliente = null` | campo |
| 650 | `op.tarifaBaseManualChofer = null` | campo |
| 651 | `op.adExtra = null` | campo |
| 654 | `this.valoresTarifaServ.calcularCierre(op)` | **Mutación indirecta de `op.valoresNuevos`** (ver abajo) |

**Respuesta directa: no hay "un tercero", hay once campos además de `acompaniante` y
`acompanianteCant`, más la reconstrucción de `estado` y el recálculo de `valoresNuevos`.**

**`calcularCierre`** (`valores-tarifa.service.ts:120-141`) muta la op que recibe:

- **Eventual** (`datosTarifaEventual !== null`): `op.valoresNuevos = this.valoresEventual(op)`
  (:123-125). Usa `datosTarifaEventual` y los acompañantes, multiplicadores y `adExtra` ya
  reseteados (:477-513).
- **Sin referencia en ningún lado** (las dos `tarifaAplicada*` en `null`): **no toca**
  `valoresNuevos` y devuelve sin errores (:128-131). Queda el `valoresNuevos` que la op tenía
  al momento de la baja.
- **Resto:** `op.valoresNuevos = armarValoresNuevos(...)` con las `tarifaAplicada*` congeladas
  (:136). Si una sola referencia es `null`, igual se reasigna y se agrega un error al log
  (:137-138).
- En la restauración, los errores sólo se agregan al texto del log RESTAURAR (:677-678). No
  abortan nada.

**Lo que el método NO toca** y por lo tanto queda como estaba al momento de la baja (no al
del alta):
- `tarifaAplicadaCliente`, `tarifaAplicadaChofer`.
- `datosTarifaEventual`.
- `cliente` (incluido el snapshot `cliente.comisiones`), `chofer`, `vehiculo`, `proveedor`.
- `fecha`, `numeroOperacion`, `documentacion`, `hojaRuta`, `observaciones`.
- `lockLiquidacion` (campo opcional de `Operacion`, `interfaces/operacion.ts:73-76`).

**Cruce con la deuda registrada.** La skill `modulo-operaciones` ("Deuda abierta —
`restaurarOperacion` aproxima el estado del alta…") ya identifica `acompaniante`/
`acompanianteCant` y `tarifaAplicada*`. Esa sección cita `operacion.service.ts:622-629` para
el chequeo de tablero de la restauración. Hoy ese chequeo está en :656-663: las líneas
corrieron.

---

## 5. La máquina de estados, como está en el código

### Estados

El estado de una operación vive en `op.estado: EstadoOp` (`interfaces/operacion.ts:138-142`):

```ts
ciclo: 'abierta' | 'cerrada' | 'liquidada';
liquidacion: { cliente: boolean; chofer: boolean };
proforma: { cliente: boolean; chofer: boolean };
```

A eso se suma un estado que no está en el documento: **eliminada**. En ese estado no existe
`operaciones/{id}`, hay un `papeleraEventos` con `estado: 'activo'` y una copia en
`objetosEliminados`.

Combinaciones que el código produce, con la etiqueta que les da la UI (`etiquetaEstadoOp`,
`estado-op.util.ts:11-20`; el orden de prioridad es el de la tabla):

| Estado | `ciclo` | `proforma` (cl / ch) | `liquidacion` (cl / ch) | Etiqueta |
|---|---|---|---|---|
| E1 Abierta | abierta | F / F | F / F | Abierta |
| E2 Cerrada | cerrada | F / F | F / F | Cerrada |
| E3 Proforma de un lado (o de los dos) | cerrada | al menos uno T | sin cambio | Proforma CH / Proforma CL |
| E4 Liquidada de un lado | cerrada | F en ese lado | uno T | Liq CL / Liq CH |
| E5 Liquidada total | liquidada | F / F | T / T | Liquidada |
| E6 Eliminada | — (sin doc) | — | — | — |

Notas:
- **E3 y E4 se pueden combinar.** Un lado liquidado y el otro en proforma es alcanzable:
  `crearBorrador` no mira el estado del otro lado, sólo que el InformeOp propio esté
  `'activo'` y sin `bloqueadoPorContraparte` (`informe-liq.service.ts:965-991`). La etiqueta
  muestra la proforma, que tiene prioridad.
- **Las dos proformas pueden coexistir:** primero se arma el borrador del cliente y después el
  del chofer. Al revés no, porque el borrador del chofer marca `bloqueadoPorContraparte` en el
  InformeOp del cliente y `validarInformesParaLiquidar` lo rechaza.

Los InformeOp acompañan con su propio `estado: 'activo' | 'proforma' | 'liquidado' |
'anulado'` (`informe-op-nuevo.ts:26`), uno por lado. Existen desde E2.

### Transiciones

| De → A | Método | Qué la habilita | Qué la impide |
|---|---|---|---|
| (nada) → E1 | alta (`OperacionFactoryService.crearOperacionBase`, `estado: this.estadoInicial()`, `operacion-factory.service.ts:94`) | — | fuera de alcance |
| E1 → E2 | `OperacionService.cerrarOperacion` (`operacion.service.ts:795-859`): `estado = { ciclo: 'cerrada', …F }`, crea el par de InformeOp `'activo'`, `resumenProcesado: true`, suma `resumenesOp` y `comisionesVenta`, todo en TX | — | Fuera de la TX: ya existe un InformeOp no anulado para la op (`existeParaOperacion`, :798-800). En la TX: `ciclo !== 'abierta'` (:837-841) o `resumenProcesado` en `true` (:842-844) |
| E2 → E3 (lado X) | `InformeLiqService.crearBorrador` → `crearNuevo` modo borrador: `estado.proforma.X = true`; InformeOp X → `'proforma'` + `idInfLiq`; si X ≠ cliente, InformeOp cliente → `bloqueadoPorContraparte: true` (`informe-liq.service.ts:888-905`) | permiso `liquidaciones.liquidar` | InformeOp no `'activo'`, `bloqueadoPorContraparte`, otro tipo, otra entidad, fuera del período o op repetida (:965-991) |
| E3 (lado X) → E2 (o al estado previo de ese lado) | `InformeLiqService.eliminarBorrador`: `proforma.X = false`, InformeOp X → `'activo'`, `idInfLiq: null`; se borra el InformeLiq (:283-329) | permiso `liquidaciones.eliminar` | InformeLiq no `'borrador'`; InformeOp no `'proforma'` con ese `idInfLiq` |
| E3 (lado X) → E4 o E5 | `InformeLiqService.emitirBorrador`: `camposLiquidacion` → `proforma.X = false`, `liquidacion.X = true`, y `ciclo = 'liquidada'` si el otro lado ya estaba liquidado; InformeOp X → `'liquidado'`; si X ≠ cliente, InformeOp cliente → `bloqueadoPorContraparte: false` (:203-277, :1111-1122) | permiso `liquidaciones.liquidar` | InformeLiq no `'borrador'`; InformeOp no `'proforma'` con ese `idInfLiq` |
| E2/E4 (lado X activo) → E4 o E5 | `InformeLiqService.emitir` → `crearNuevo` modo emitido: `camposLiquidacion` (ídem); InformeOp X → `'liquidado'` + `idInfLiq`. No toca `bloqueadoPorContraparte` | permiso `liquidaciones.liquidar` | las mismas que el borrador |
| E4/E5 (lado X) → E2/E4 | `InformeLiqService.revertirEmitido`: `camposReversion` → `liquidacion.X = false`, y `ciclo 'liquidada' → 'cerrada'`; InformeOp X → `'activo'`, `idInfLiq: null`; InformeLiq → `'revertido'` (:566-638, :1126-1130) | permiso `facturacion.revertir`; motivo no vacío | InformeLiq no `'emitido'` (uno facturado necesita `desvincularFactura` antes); `totalCobrado !== 0`; InformeOp no `'liquidado'` con ese `idInfLiq` |
| E1 → E6 | `OperacionService.bajaOperacion` (§2.a) | UI: botón visible para `dev`/`admin` (`operaciones.eliminar`, `permisos.service.ts:85`), habilitado si la etiqueta es `'Abierta'` (`tablero-op.component.ts:866-870`) | En TX: `validarBaja('abierta')` (cualquier flag de liquidación o proforma, o `ciclo ≠ 'abierta'`); no hay tablero para la fecha |
| E2 → E6 | `OperacionService.bajaOperacionCerrada` (§2.b) | UI: tacho visible para `dev`/`admin` si el InformeOp de la fila es `'activo'` y no está `bloqueadoPorContraparte` | En TX: `validarBaja('cerrada')`; cualquiera de los dos InformeOp no `'activo'` o con `idInfLiq`; falta la contraparte o es de otra op; no hay tablero |
| E3/E4/E5 → E6 | **No hay transición directa.** Primero hay que volver a E2 por `eliminarBorrador` y/o `revertirEmitido` en cada lado | — | `validarBaja` rechaza cualquier flag de liquidación o proforma |
| E6 → E1 | `OperacionService.restaurarOperacion` (§3.a). También el camino legado `TableroService.altaOperacionYActualizarTablero` (§3.b) | UI: evento `'activo'` y rol distinto de `demo` | Evento inexistente o ya restaurado; falta la copia archivada; `coleccionPrincipal ≠ 'operaciones'`; no hay tablero para la fecha |

Observaciones:
- **No hay ningún camino E2 → E1 directo.** Los escritores de `estadoInicial()` son el alta,
  `restaurarOperacion` (:632) y `TableroService` (`tablero.service.ts:30`).
- **Los únicos escritores de `ciclo: 'cerrada'`** son `cerrarOperacion` (:806-810) y
  `camposReversion` (`informe-liq.service.ts:1128`), según el relevamiento por grep.
- **El único escritor de `ciclo: 'liquidada'`** es `camposLiquidacion` (:1117).
- **Una op restaurada desde E2** vuelve a E1. Su par de InformeOp anulado queda en
  `informesOp`, y el próximo cierre crea un par nuevo.

---

## Interfaces y tipos

`src/app/interfaces/operacion.ts`:
```ts
// :28-32
acompaniante: boolean;
acompanianteCant?: number;
informeOpCliente: string;
informeOpChofer: string;
// :37, :51-53, :55-56, :61, :68-69
datosTarifaEventual: DatosTarifaEventual | null;
tarifaAplicadaCliente: RefTarifaAplicada | null;
tarifaAplicadaChofer: RefTarifaAplicada | null;
valoresNuevos: Valores | null;
multiplicadorCliente: number;
multiplicadorChofer: number;
adExtra: AdicionalExtraOp | null;
tarifaBaseManualCliente?: number | null;
tarifaBaseManualChofer?: number | null;
// :71-77
estado: EstadoOp;
lockLiquidacion?: { usuario: string; timestamp: number; };
resumenProcesado?: boolean;
// :138-142
export interface EstadoOp {
  ciclo: 'abierta' | 'cerrada' | 'liquidada';
  liquidacion: { cliente: boolean; chofer: boolean };
  proforma: { cliente: boolean; chofer: boolean };
}
```

`src/app/interfaces/informe-op-nuevo.ts`:
```ts
// :8-10
AnulacionInformeOp extends Anulacion { idEventoPapelera: string; }
// :26-35
estado: 'activo' | 'proforma' | 'liquidado' | 'anulado';
bloqueadoPorContraparte: boolean;
idInfLiq: string | null;      // null en 'activo'/'anulado'
anulacion?: AnulacionInformeOp | null;   // solo en 'anulado'
```

`src/app/interfaces/anulacion.ts:4`:
`Anulacion { motivo: string; usuario: string; fecha: string; }`

`src/app/interfaces/informe-liq-nuevo.ts`:
```ts
// :28
estado: 'borrador' | 'emitido' | 'facturado' | 'revertido' | 'anulado';  // 'anulado' reservado (:25-27)
// :80, :83
reversion: ReversionLiq | null;
anulacion: AnulacionLiq | null;
// :182
export type ReversionLiq = Anulacion;
// :189
export interface InformeLiqSnapshot { fecha: string; informesOp: InformeOpNuevo[]; }
```

`src/app/interfaces/registro-papelera.ts`:
```ts
// :5
RefObjetoPapelera { coleccion: string; idOriginal: string; principal: boolean; }
// :14
PapeleraEvento {
  timestamp: number;
  userId: string;
  userEmail: string;
  motivoBaja: string;
  coleccionPrincipal: string;
  idPrincipal: string;
  estado: 'activo' | 'restaurado';
  refs: RefObjetoPapelera[];
}
```

`src/app/interfaces/asignacion.ts`:
```ts
// :26
Asignacion { idAsignacion: string; fecha: string; asignado: boolean; timestamp: number; items: AsignacionItem[]; }
// :47
AsignacionItem { idItem; idCliente; sujeto; ref; observacion; hojaDeRuta; idOperacion: string | null; estado: EstadoAsignacion; }
// :78
EstadoAsignacion = { estado: 'activa' } | { estado: 'anulada'; motivo: string; timestamp: number };
```

`src/app/servicios/database/db-firestore.service.ts`:
- `:44` — `ModoEscritura = 'crear' | 'reemplazar' | 'eliminar' | 'actualizar' | 'fusionar'`.
- `:845-861` — `'crear'` y `'reemplazar'` son los dos `set` plano.

## Servicios y métodos

| Servicio | Método | Qué hace | Escribe en | Atómico |
|---|---|---|---|---|
| `OperacionService` | `validarBaja` | Rechaza liquidación, proforma o ciclo distinto del esperado | — | — |
| `OperacionService` | `agregarEscriturasBaja` | Empuja delete de la op + papelera + item anulado | `operaciones`, `papeleraEventos`, `objetosEliminados`, `asignaciones` | No commitea |
| `OperacionService` | `bajaOperacion` | Baja de abierta | ídem + `registroLog` | Sí, `commitEnTransaccion` |
| `OperacionService` | `bajaOperacionCerrada` | Baja de cerrada desde un InformeOp | ídem + `resumenesOp`, `comisionesVenta`, `informesOp`, `registrosOpEventuales` | Sí, `commitEnTransaccion`; las pre-queries quedan fuera |
| `OperacionService` | `restaurarOperacion` | Restaura a abierta con reseteo de campos | `objetosEliminados`, `papeleraEventos`, `operaciones`, `asignaciones`, `registroLog` | Escritura en un `commitBatch`; lecturas fuera de transacción |
| `OperacionService` | `cerrarOperacion` | E1 → E2 | `operaciones`, `informesOp`, `comisionesVenta`, `resumenesOp`, `registrosOpEventuales`, `registroLog` | Sí, `commitEnTransaccion` |
| `PapeleraService` | `prepararBajaEnBatch` | Arma evento + copias | `papeleraEventos`, `objetosEliminados` | No commitea, sin lecturas |
| `PapeleraService` | `prepararRestauracionEnBatch` | Lee evento + copias, arma delete de copias + evento `'restaurado'` | `objetosEliminados`, `papeleraEventos` | No commitea; lee con `getById` |
| `AsignacionService` | `agregarEscrituraAnularItem` | `set` del tablero con el item anulado | `asignaciones` | No commitea |
| `AsignacionService` | `reactivarItem` (legado) | Relee y reescribe el tablero, log viejo | `asignaciones`, `logs` | Escritura propia, no atómica |
| `InformeOpService` | `agregarAnulacionInformeOp` | `update` a `'anulado'` + `anulacion` | `informesOp` | No commitea |
| `InformeLiqService` | `eliminarBorrador` | Proforma → activo, borra el InformeLiq | `informesOp`, `operaciones`, `informesLiq`, `registroLog` | Sí, `commitEnTransaccion` |
| `InformeLiqService` | `revertirEmitido` | Liquidado → activo, InformeLiq → revertido | `informesLiq`, `movimientosFin`, `informesLiqSnapshots`, `informesOp`, `operaciones`, `registroLog` | Sí, `commitEnTransaccion` |
| `ResumenOpFactoryService` | `escriturasSuma(op, ±1)` | Incrementos por mes y entidad | `resumenesOp` (`fusionar`) | Pura |
| `ComisionVentaFactoryService` | `escriturasBaja` | `increment(-monto)` + `anulada: true` | `comisionesVenta` (`fusionar`) | Pura |
| `TableroService` | `altaOperacionYActualizarTablero` (legado) | Restauración vieja | `operaciones`, `logs`, `asignaciones` | No |

## Componentes y puntos de consumo

| Componente | Cómo lo usa | Archivo |
|---|---|---|
| `TableroOpComponent` | `app-btn-eliminar` con `[disabled]="!puedeEliminar(row)"` (sólo si la etiqueta es `'Abierta'`), visible por `operaciones.eliminar` → `bajaOperacion`. Muestra el `Resultado` en un Swal; el título de éxito es "Operación eliminada" | `tablero-op.component.html:190-196`, `.ts:685-758, 866-870` |
| `InformeOpListadoComponent` | Tacho por InformeOp `'activo'` y no bloqueado, permiso `liquidaciones.eliminar` → `bajaOperacionCerrada`. No mira la contraparte ni `op.estado` | `informe-op-listado.component.html:444-461`, `.ts:337-368` |
| `BajaObjetoComponent` | Pide un motivo no vacío y confirma. Sin chequeos de negocio | `shared/modales/baja-objeto/baja-objeto.component.ts:43-86` |
| `BorradoresLiqComponent` | `emitirBorrador` (:140), `eliminarBorrador` (:188) | `raiz/liquidacion/borradores-liq/borradores-liq.component.ts` |
| `FacturacionEmitidosComponent` | `revertirEmitido`, botón deshabilitado si `totalCobrado !== 0` | `raiz/nueva-facturacion/emitidos/facturacion-emitidos.component.ts:57-61, 160-186` |
| `PapeleraComponent` | `restaurarOperacion` por `coleccionPrincipal` | `raiz/ajustes/papelera/papelera.component.ts:176-229` |
| `PapeleraLegadoComponent` | `TableroService.altaOperacionYActualizarTablero` | `raiz/ajustes/papelera-legado/papelera-legado.component.ts:119-217` |
| `LimpiezaDemoService` | Vaciado masivo de `operaciones` (sólo demo + `dev`) | `servicios/desarrollo/limpieza-demo.service.ts:54, 91, 106, 114` |

## Colecciones de Firestore involucradas

| Colección | Forma relevante | Escriben (en esta cadena) | Leen (en esta cadena) |
|---|---|---|---|
| `operaciones` | `Operacion` sin `idOperacion` | baja (delete), restaurar (`set`), cierre, liquidación, reversión, borrador (`update` parcial de `estado.*`) | todos los coordinadores, en TX salvo la restauración |
| `informesOp` | `InformeOpNuevo` | cierre (crear), borrador / emisión / reversión / eliminar borrador (`update`), baja de cerrada (anular) | `bajaOperacionCerrada` (TX), `existeParaOperacion` (query), listado (listener `activo`/`proforma`) |
| `informesLiq` | `InformeLiqNuevo` | `crearNuevo`, `emitirBorrador`, `eliminarBorrador` (delete), `revertirEmitido` | ídem |
| `informesLiqSnapshots` | `InformeLiqSnapshot` | `revertirEmitido` (crear) | — |
| `asignaciones` | `Asignacion`, id = fecha | baja (`set` con item anulado), restaurar (`set` con item activo), `reactivarItem` legado | bajas (TX), restaurar (`getDocObservable`, fuera de TX) |
| `papeleraEventos` | `PapeleraEvento` | baja (crear), restaurar (`set` con `'restaurado'`) | restaurar (`getById`), `PapeleraComponent` |
| `objetosEliminados` | entidad tal cual, id = `operaciones__{id}` | baja (crear), restaurar (delete) | restaurar (`getById`) |
| `resumenesOp` | agregados por mes/entidad con `increment()` | cierre (+1), baja de cerrada (−1, si `resumenProcesado`) | — (no se lee en la cadena) |
| `comisionesVenta` | id `{idOperacion}_{idVendedor}` | cierre (+), baja de cerrada (−, `anulada: true`) | — |
| `registrosOpEventuales` | `RegistroOpEventual` | cierre (crear), baja de cerrada (anular) | baja de cerrada (query afuera + relectura en TX) |
| `movimientosFin` | `MovimientoFin` | `revertirEmitido` (quita compensaciones), emisión (aplica) | `revertirEmitido` (TX) |
| `registroLog` | entrada de log | todos los coordinadores (en el mismo batch/TX) + `registrarError` (aparte) | — |
| `logs`, `papelera` | modelo viejo | sólo el camino legado | `PapeleraLegadoComponent` |

## Dependencias con otros módulos

- **Liquidación / Facturación** (`InformeLiqService`, modelo nuevo). Es la única vía para
  sacar a una op de E3/E4/E5 y dejarla en condiciones de baja.
- **Reportes** (`resumenesOp`, modelo nuevo). La baja de una cerrada resta y la restauración no
  toca.
- **Vendedores** (`comisionesVenta`, modelo nuevo). Ídem.
- **Tarifas** (`ValoresTarifaService.calcularCierre`, `TarifarioService` para
  `registrosOpEventuales`). La restauración recalcula `valoresNuevos` y la baja de una cerrada
  anula registros eventuales.
- **Papelera** (`PapeleraService`, modelo nuevo; `PapeleraLegadoComponent` + `TableroService`,
  **modelo viejo**).
- **Log** (`LogRegistroService`, nuevo; `LogService` / colección `logs`, **viejo**, sólo en el
  camino legado).
- **Asignaciones** (`AsignacionService`). `reactivarItem` es la pieza vieja que usa sólo
  `TableroService`.

## Inconsistencias y deuda detectada

Hechos, sin propuestas:

1. **La baja de una cerrada con un lado liquidado o en proforma no tiene guarda en la UI.**
   El tacho de `informe-op-listado` aparece en el InformeOp activo aunque la contraparte esté
   `'liquidado'` (o `'proforma'`, si el borrador es del cliente). La guarda real está sólo en
   `bajaOperacionCerrada` (§1).
2. **`restaurarOperacion` no es transaccional.**
   - Lee el evento, las copias y el tablero fuera de transacción y escribe con `commitBatch`.
   - Dos restauraciones simultáneas del mismo evento pueden pasar las dos el chequeo
     `estado !== 'activo'` (`papelera.service.ts:121`).
   - El tablero se reescribe entero (`set`) desde una lectura que puede estar desactualizada
     (`operacion.service.ts:656, 668-672`).
3. **`restaurarOperacion` falla por dos vías distintas.**
   - Los errores de `prepararRestauracionEnBatch` (evento inexistente o ya restaurado, copia
     faltante) se escapan como excepción, sin `Resultado` ni `registrarError`
     (`operacion.service.ts:621`).
   - El resto devuelve `Resultado`.
4. **`restaurarOperacion` escribe la op con `'crear'`, que es un `set` plano**
   (`db-firestore.service.ts:852-853`). No verifica que `operaciones/{id}` no exista.
5. **`restaurarOperacion` no verifica que el item del tablero exista.**
   `reactivarItemEnLista` no hace nada si no lo encuentra (`asignacion.service.ts:157-163`).
   Lo mismo con `anularItemEnLista` en la baja (:131-137).
6. **`calcularCierre` no reasigna `valoresNuevos` cuando las dos `tarifaAplicada*` son `null`
   y la op no es eventual** (`valores-tarifa.service.ts:128-131`). En ese caso la op
   restaurada conserva el `valoresNuevos` que tenía al momento de la baja.
7. **`restaurarOperacion` resetea a valores fijos campos que el alta también puede cargar**
   (`acompaniante`, `acompanianteCant`) y conserva campos que pueden cambiar después del alta
   (`tarifaAplicada*`). Ya registrado como deuda bloqueante en CLAUDE.md y en la skill
   `modulo-operaciones`.
8. **La skill `modulo-operaciones` cita líneas desactualizadas.** Dice
   `operacion.service.ts:622-629` para el chequeo de tablero de la restauración y
   `operacion.service.ts:665/670` para `editarOperacion`. Hoy son :656-663 y :699/:707.
9. **El tablero no actualiza su `timestamp`** al anular o reactivar un item en el camino nuevo
   (`asignacion.service.ts:141-154`, `operacion.service.ts:668-672`). El camino legado
   (`reactivarItem`, :176) sí lo actualiza.
10. **`revertirEmitido` deja `ciclo: 'cerrada'` con `liquidacion.<otro>: true`** cuando el
    otro lado sigue liquidado (`informe-liq.service.ts:1128`). Es el mismo estado que una
    liquidación parcial (E4).
11. **`revertirEmitido` no chequea `totalAjustado`** (:582-586), mientras que
    `desvincularFactura` sí lo hace (:762-773).
12. **El camino legado de restauración** (§3.b) no es atómico, escribe en `logs`, borra de
    `papelera` sin `await` y deja la op con los campos del cierre (`resumenProcesado`, ids de
    InformeOp, multiplicadores, etc.). Ya registrado en CLAUDE.md.
13. **Mensajes distintos para el mismo gesto.** El éxito de la baja se titula "Operación
    eliminada" en `tablero-op` y "Operación dada de baja" en `informe-op-listado`.
14. **El tacho de `informe-op-listado` no se deshabilita mientras `guardando`.** Sólo lo tapa
    el overlay del spinner (html:483-485).

## Preguntas abiertas

1. **`firestore.rules`:** ¿hay alguna regla que impida borrar o reescribir `operaciones` o
   `informesOp` según su estado, o la única guarda de negocio es la del coordinador? No se
   relevó.
2. **`datosTarifaEventual` después del alta:** ¿se modifica en el cierre o en la edición de
   InformeOp? La restauración lo conserva. Si se edita después del alta, la op restaurada lleva
   el valor posterior y no el del alta. No se verificó quién lo escribe además del alta.
3. **`tarifaAplicada*` después del alta:** la skill `modulo-operaciones` dice que el flujo
   Personalizada de `modal-detalle-op.component.ts:125-133` las cambia. No se reverificó
   leyendo ese componente en esta auditoría.
4. **Coherencia entre `op.estado` y los InformeOp:** el código mantiene los dos en las mismas
   transacciones, pero no se verificó en datos si existen ops con flags que no coinciden con
   el estado de sus InformeOp. Las dos guardas de `bajaOperacionCerrada` cubren cualquiera de
   las dos divergencias.
5. **`lockLiquidacion`:** está en la interfaz y la restauración lo conserva. No se relevó si
   algo lo escribe o lo lee hoy.
6. **Tablero con items sin `idOperacion` coincidente** (ops viejas, o restauradas por el
   camino legado sobre un tablero distinto): la baja y la restauración reescriben el tablero
   sin cambios y sin aviso. No se determinó si ese caso existe en datos.
