---
name: modulo-vendedores
description: Vendedores y comisiones de venta de ApLog (colecciones comisionesVenta y liquidacionesVenta; VendedorService, LiquidacionVentaService) — asignación de vendedores a clientes, comisión al cerrar operaciones, liquidación y pago de comisiones, las pantallas de raiz/vendedores, Excel/PDF y recálculo. Leer antes de trabajar sobre vendedores, comisiones o sus liquidaciones.
---

## Frente Vendedores — comisiones de venta (Octubre 2026)

Vendedores, asignación a clientes, comisiones por operación y su
liquidación, reconstruidos sobre un modelo nuevo. Reemplaza a
`informesVenta` (ids `Date.now()` + azar, huérfanos al dar de baja una
cerrada, % no congelado) y `resumenVenta` (sin mapeo en `firestore.rules`,
pago doble posible, ids numéricos de cliente que ya no existen). Todo se hizo
y probó en demo. Diseño y decisiones V1–V23: doc de proyecto
`claude/diseno-vendedores.md`; instrucciones `claude/instruccion-v1…v9-vendedores.md`
(+ `v2a`, `v6a`, `v6b`, `v6-1`, `v7a`) e `instruccion-fix-restaurar-op.md`.

### Modelo
- `vendedores` (se corrigió en el lugar, mismo id de documento):
  `VendedorNuevo { datosPersonales { nombre, apellido, cuit: number,
  celular: string, email }, activo }` (`interfaces/vendedor-nuevo.ts`).
  `VendedorService` también lee el formato viejo (`idVendedor`,
  `asignaciones`, `mail`) y lo normaliza; el doc se reescribe al editarlo.
- Asignación: `Cliente.comisionesVenta?: AsignacionVenta[]`
  (`{ idVendedor, porcentaje }`), suma ≤ 100 por cliente. La escribe SOLO
  `VendedorService` ('actualizar' sobre clientes vivos);
  `ClienteService.editarCliente` la preserva.
- Snapshot: `RefCliente.comisiones` (siempre array), congelado en el alta
  de la op (`OperacionFactoryService`), como `tarifaAplicada`. Restaurar una
  op NO lo regenera (decisión: es el snapshot del alta).
- `comisionesVenta` (`interfaces/comision-venta.ts`): una por op y
  vendedor, id determinista `{idOperacion}_{idVendedor}`. Modelo saldo:
  `saldo = monto − montoLiquidado`; |saldo| < 0,005 se trata como cero.
  `base` = `valoresNuevos.cliente.aCobrar`; `monto` = base × % (0 si la op
  se dio de baja).
- `liquidacionesVenta` (`interfaces/liquidacion-venta.ts`): número
  `LVEN-0001` (`NumeradorService.leerProximoNumeroLiquidacionVenta`),
  snapshot del vendedor, mes de corte (`anio`/`mes`/`periodo`), líneas con
  `previo` / `importe` / `ajuste`, `total`, estado
  `emitida | pagada | anulada`, `pago { fecha, observacion }`,
  `anulacion { fecha, motivo }`.

### Camino en vivo (sin lecturas: 'fusionar' + increment)
`ComisionVentaFactoryService` (pura) arma las escrituras de cada gesto:

| Gesto | Orquestador | Comisiones |
|---|---|---|
| Cierre | `OperacionService.cerrarOperacion` | `escriturasCierre(op)`: monto y saldo += X, `anulada` false |
| Edición de InformeOp | `InformeOpService.armarEscriturasEdicion` | `escriturasEdicion(opVieja, opNueva)`: la diferencia |
| Baja de op cerrada | `OperacionService.bajaOperacionCerrada` | `escriturasBaja(op)`: −X, `anulada` true |
| Restauración | — | no toca (al cerrarla de nuevo suma) |

El id determinista reemplaza al anti-duplicado por query de InformeVenta.

### Liquidación (`LiquidacionVentaService`; cada gesto en `commitEnTransaccion` con un log)
- `emitir(idVendedor, periodo, totalEsperado)`: toma TODO el saldo
  pendiente del vendedor con período ≤ mes de corte (comisiones del mes +
  cierres tardíos + ajustes). Las candidatas salen de la query de pendientes
  y se releen por id en la transacción; si el total cambió respecto del
  confirmado en pantalla, aborta. Deja `montoLiquidado = monto`, saldo 0 y
  agrega el id a `idsLiquidacion`. Log EMITIR. Se permite total negativo
  (ajustes a descontar).
- `pagar` (fecha ≥ emisión + observación opcional) → PAGAR;
  `revertirPago` (motivo) → REVERTIR; `anular` (solo emitida; una pagada
  primero se revierte) devuelve el importe de cada línea al saldo de su
  comisión → ANULAR.
- `AccionLog` suma 'PAGAR' (el filtro del registro de actividad suma ANULAR
  y PAGAR).
- Límite: ~497 comisiones por liquidación (500 escrituras por transacción).

### Consultas y pantallas (`raiz/vendedores/`, ruta dev/admin/demo)
- `ComisionVentaConsultaService`: comisiones del mes (`periodo ==`),
  pendientes (`saldo != 0` con `DbFirestoreService.observarDistintoDe`),
  tablero en vivo (`armarTableroComisiones`, puro, en
  `shared/utils/tablero-comisiones.util.ts`), `saldoPendienteDe`; `mesTablero`
  recuerda el mes elegido durante la sesión.
- Shell con 3 pestañas, sin `app-tablero-fechas` (`VendedorControlComponent`
  abre el listener de `VendedorService`).
- Tablero: por vendedor, comisiones del mes, liquidado, arrastre (saldos de
  meses anteriores) y saldo a liquidar; detalle cliente → operación con
  estado; los vendedores activos con clientes asignados aparecen aunque
  estén en cero; Liquidar y Excel/PDF.
- Listado: `TablaGenericaComponent` con filtro Activos / Inactivos / Todos;
  modal de alta/edición/vista con la tabla de clientes asignados; desactivar
  (motivo, quita las asignaciones, avisa si tiene saldo; log BAJA) y
  reactivar (RESTAURAR).
- Historial: `liquidacionesVenta` por mes de corte (`observarPorRango`, en
  vivo) y filtros de vendedor y estado en memoria (recordados en
  `filtrosHistorial`); Pagar / Revertir pago / Anular con
  `puede('vendedores', 'editar')`; detalle en modal
  (`LiquidacionVentaDetalleComponent`).
- Helpers de presentación en `shared/utils/liquidacion-venta-vista.util.ts`.
  Valores numéricos con `.col-numero` (tabular-nums), más una regla que
  restituye la negrita de encabezados, subtotales y totales.

### Excel/PDF
`shared/utils/documento-comisiones.util.ts` (puro): la liquidación →
`DocumentoTabular` (`generar`: total con fórmula, marca ANULADA, datos de
pago, notas de a un concepto por renglón); el tablero → `LibroTabular`
(`generarLibro`: hojas Resumen y Detalle). Fachada `ComisionesExportService`,
sin log. Al liquidar desde el tablero se ofrece la descarga
(`preguntarFormatoDescarga`). Regla para los PDF: solo caracteres de la
codificación WinAnsi (la Helvetica estándar de jsPDF no tiene "−" U+2212,
comillas tipográficas, "…" ni emojis).

### Recálculo (`servicios/desarrollo/recalculo-comisiones.service.ts`, `componentes/recalculo-comisiones/`, en `/migracion`)
Por rango de fechas: simular y ejecutar (rol dev + id del proyecto escrito;
sirve en cualquier proyecto, también para la migración de Vantruck).
Completa `cliente.comisiones` de las ops sin snapshot con la asignación
vigente del cliente; conserva `montoLiquidado` / `idsLiquidacion`; nunca
borra (las que sobran quedan con monto 0 y `anulada`); escribe solo lo
distinto. `LimpiezaDemoService` vacía `comisionesVenta` y
`liquidacionesVenta` (no `vendedores`).

### Retiro del camino viejo
Borrados: `ValoresOpService.asignacionComisionVenta` e `informesVenta` del
cálculo de cierre, `OperacionService.existeInformeVenta`, `ResumenVentaDetalleComponent`
(el listado en cards y el historial sobre `resumenVenta` se reescribieron),
`ExcelService` / `PdfService.exportarResumenVenta*` y sus auxiliares, las
interfaces `vendedor.ts` / `resumen-venta.ts` / `informe-venta.ts`, los
cachés `vendedores$` / `informesVenta$` / `resumenVenta$` de
`StorageService` y el listener de `vendedores` en Home. Se conservan: las
colecciones `informesVenta` / `resumenVenta` en Vantruck y sus mapeos en
`firestore.rules`, `'informesVenta'` en `LimpiezaDemoService`,
`Cliente.vendedor` / `RefCliente.vendedor` y el caso `'vendedores'` de
`papelera-legado` (ver "Deuda — Vendedores").

## Deuda abierta — Vendedores (`comisionesVenta` / `liquidacionesVenta`)
- Migración a Vantruck, checklist de Vendedores (después del backup
  completo):
  1. Deploy de las reglas de `comisionesVenta` (módulo 'comisiones') y
     `liquidacionesVenta` en `pf-logistics` junto con el código nuevo (sin
     ellas, `user` no puede cerrar operaciones de clientes con vendedor).
  2. Vendedores en formato viejo: `asignaciones[].idCliente` es el id
     numérico viejo del cliente → armar el mapa idCliente viejo → id de
     documento ANTES de que `ClienteMigration` descarte `idCliente`, y pasar
     las asignaciones a `Cliente.comisionesVenta`.
  3. Recálculo de comisiones sobre el histórico (completa el snapshot de las
     ops con la asignación vigente; revisar en la simulación las ops cuyo
     cliente cambió de vendedor).
  4. Lo ya pagado con `resumenVenta`: decidir si se marca como liquidado
     (`montoLiquidado = monto`) o si se cargan liquidaciones de legado; y si
     `resumenVenta` se pasa a `liquidacionesVenta` o queda como vista de solo
     lectura.
  5. Después: borrar `informesVenta` / `resumenVenta`, sus mapeos en
     `firestore.rules`, `'informesVenta'` de `LimpiezaDemoService`,
     `Cliente.vendedor` / `RefCliente.vendedor` y `vendedor: []` de
     `ClienteFactoryService`.
- Restaurar una op no regenera el snapshot `cliente.comisiones`
  (decisión: es el del alta).
- Un cliente restaurado desde la papelera puede traer en `comisionesVenta`
  asignaciones a un vendedor desactivado después de la baja (no se valida al
  restaurar).
- Pagar una liquidación no genera movimiento financiero (integrarlo como
  movimiento de Finanzas: V-a, frente aparte; ver la skill `modulo-finanzas`, subsección "Deuda abierta — Finanzas").
- `.col-numero` está repetida en el tablero, el historial y el detalle de
  liquidación (y en `tabla-listado`) → consolidar en un estilo global.
- Sin uso, no tocados: caso `"vendedores"` de la lista de logueables de
  `StorageService` (~~`storageService` inyectado en `PdfService`~~ y
  ~~`tablero-calendario`~~: retirados en el frente Lazy loading + fechas). El caso `'vendedores'` de
  `papelera-legado` se conserva a propósito (vendedores viejos de Vantruck;
  `VendedorService` normaliza el formato).
