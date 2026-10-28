---
name: modulo-liquidacion
description: Liquidación de ApLog sobre InformeLiqNuevo (colección informesLiq, InformeLiqService, InformeLiqFactoryService) — borradores, emisión y edición de liquidaciones, escritura con commitEnTransaccion, log, la UI de raiz/liquidacion y las columnas (etiquetaColumna). Leer antes de trabajar sobre liquidaciones, informes de liquidación o sus borradores.
---

## Frente Liquidación — InformeLiqNuevo (Septiembre 2026)

Camino nuevo de liquidación, PARALELO al viejo: `InformeLiq` / `resumenLiq` /
`proforma` / `LiquidacionService` / `LiquidacionBuilderService` no se tocaron
y se retiran en un frente aparte. En demo se arrancó de cero (sin migrar
datos). Vantruck tendrá su propio frente de migración. Diseño completo y
decisiones: doc de proyecto `claude/diseno-informe-liq-nuevo.md`.

### Modelo
- `interfaces/informe-liq-nuevo.ts` → `InformeLiqNuevo`, colección `informesLiq`
  (`firestore.rules`: módulo `finanzas`). `idInfLiq` = doc id, patrón ConId (no
  se persiste; se agrega al leer).
- `estado`: 'borrador' (ex proforma, `numeroInterno` null) | 'emitido' |
  'facturado' | 'revertido' | 'anulado'. 'facturado' y 'revertido' los escribe
  Facturación; 'anulado' está reservado sin escritor (ver la skill `modulo-facturacion`).
- `entidad`: snapshot `RefCliente | RefChofer | RefProveedor`.
- `periodo: {anio, mes 1-12, tramo 'mes'|'1q'|'2q'}`. Una liquidación no mezcla
  meses. El período no se edita en un borrador.
- `informesOp: string[]` (idInfOp). Hace falta porque una transacción no puede
  hacer queries: es la lista de refs a releer dentro de la tx. En la UI el
  detalle lee con `where('idInfLiq','==',id)` sobre `informesOp`. La
  composición de un borrador no se edita (para cambiarla: eliminar y rearmar).
- `valores`: totales de este lado + `totalContraParte` (informativo).
  `descuentos` (ajustes, +/-), `columnas: string[]` (nombres persistidos; ver
  "Columnas"), `observaciones`.
- `valoresFinancieros` / `estadoFinanciero`: los mantiene Finanzas (cobros,
  pagos, ajustes, compensaciones) — ver la skill `modulo-finanzas`.
- Tope: `MAX_INFORMES_OP = 150` por liquidación (presupuesto de 500
  escrituras por commit, sin chunking).

### Transiciones (InformeLiqService)
| Acción | InformeLiqNuevo | InformeOp (este lado) | Contraparte | Operación.estado |
|---|---|---|---|---|
| crearBorrador | set 'borrador' | activo → 'proforma', idInfLiq | tipo ≠ cliente: bloqueadoPorContraparte = true | proforma.<lado> = true |
| emitir (directo) | set 'emitido', número, fechaEmision | activo → 'liquidado', idInfLiq | bloqueado = false | liquidacion.<lado> = true (ciclo 'liquidada' si ambos lados) |
| emitirBorrador | mismo doc → 'emitido', número | proforma → 'liquidado' | bloqueado = false | proforma.<lado> = false, liquidacion.<lado> = true |
| eliminarBorrador | delete | proforma → 'activo', idInfLiq = null | bloqueado = false | proforma.<lado> = false |
`<lado>` = cliente | chofer (proveedor usa el flag chofer). Numeración:
misma serie LQCL/LQCH/LQPR (`NumeradorService.leerProximoNumeroInterno(tx, tipo)`).

Ediciones:
- `editarDatos(id, CambiosDatosLiq)` (descuentos/observaciones/columnas,
  borrador o emitido): recalcula `descuentoTotal`/`total`/`valoresFinancieros`
  sin pisar `totalCobrado`.
- `editarInformeOp(resultado)`: toma `InformeOpService.armarEscriturasEdicion`
  SIN commitear, recalcula por delta el InformeLiq propio y el de la
  contraparte (solo `totalContraParte`) y hace un solo `commitBatch`.
- Ruteo de UI: un InformeOp 'activo' se edita en InformeOpListado
  (`InformeOpService.editar`); uno en 'proforma' solo desde Borradores →
  detalle (`InformeLiqService.editarInformeOp`); 'liquidado' → pantalla de
  emitidos de Facturación (detalle con `modulo='facturacion'`).

### Escritura: `commitEnTransaccion`
`DbFirestoreService.commitEnTransaccion<R>(armar)`: mismo contrato
EscrituraBatch[] que `commitBatch`, aplicado dentro de `runTransaction`. Ambos
comparten `aplicarEscritura(destino, e)` (WriteBatch y Transaction tienen la
misma firma set/update/delete). Reglas:
- `armar` es PURA: Firestore puede reintentarla. Rearma el array en cada
  intento, sin efectos laterales.
- Todas las lecturas protegidas van por `leerEnTransaccion` (tx.get). Las
  escrituras se aplican recién cuando `armar` termina: lecturas antes que
  escrituras por construcción.
- Sin chunking (rompe la atomicidad); límite 500 escrituras.
- Transacción para crear/emitir/eliminar (leen fresco, verifican estados,
  reservan número). `commitBatch` para ediciones (el caller ya leyó).
  `lockLiquidacion` no se usa en el camino nuevo.
Helpers síncronos en el servicio dueño, divididos por mecanismo:
`agregarEscrituraInformeLiqCompleto` / `Parcial` / `agregarEliminacionInformeLiq`,
`OperacionFactoryService.agregarEscrituraOperacionParcial` (dot-notation sobre
`estado.*`).

### Log
- Un registro por InformeLiq, no por InformeOp: ALTA (borrador), EMITIR
  (emisión directa con `anterior = null`, y emitirBorrador con diff), BAJA
  (eliminar borrador), EDITAR (con diff).
- AccionLog suma 'CERRAR' (`OperacionService.cerrarOperacion`) y 'EMITIR'.
  `LogRegistroService.agregarAlBatch(..., anterior?)` calcula diff en
  EDITAR | EMITIR.
- `diffParcial`: diff para escrituras parciales en dot-notation (antes el diff
  de 'actualizar' salía roto).
- Igualdad de valores en diffs y en "hay cambios" de UI: `igualesPorContenido`
  (`shared/utils/igualdad.util.ts`), serialización con claves ordenadas.
  **No usar JSON.stringify para comparar objetos leídos de Firestore:**
  Firestore no preserva el orden de las claves de un map, y eso producía
  diffs falsos y "cambios sin guardar" fantasma.
- `cerrarOperacion` ya no persiste `idInfOp` en el body de la operación (generaba un diff
  falso `idInfOp → null`).

### UI (raiz/liquidacion)
- `LiqGralComponent`: pestañas Informes (`liquidacion/informes`), Borradores
  (`liquidacion/borradores`) y Anulados (`liquidacion/anulados`). Las del
  modelo viejo quedan comentadas. El calendario se oculta en Borradores.
- `InformeOpListadoComponent`: resumen por entidad + detalle expandible.
  "Liquidar" por fila (`liquidaciones.liquidar`) abre `LiquidacionNuevaComponent`.
  El lápiz aparece solo en activo y no bloqueado. Badges de estado y de
  "Bloqueado". Filas en proforma o bloqueadas atenuadas (`.isDisabled`).
  Columnas: "Total a Cobrar/Pagar" (monto propio) y "Contraparte a
  Pagar/Cobrar" (Σ contraParte.monto). Orden por encabezado con ícono. El
  orden se conserva entre emisiones del listener. La expansión va por id de
  entidad.
- `LiquidacionNuevaComponent` (modal): mes/año/tramo → preselección automática,
  en la que solo se puede desmarcar. Alertas arriba y repetidas en la
  confirmación, ajustes (verde ≥0 / rojo <0), observaciones, columnas (la
  tabla se arma con las seleccionadas). Devuelve `{accion: 'emitir'|'borrador',
  datos}`. "Vista previa" (PDF en pestaña, marca VISTA PREVIA): ver
  la skill `exportacion-excel-pdf`.
- `BorradoresLiqComponent`: listado en vivo (`observarBorradores`), filtro por
  tipo, búsqueda, orden por encabezado. Acciones Ver/Emitir/Eliminar.
- `InformeLiqNuevoDetalleComponent` (modal): columnas guardadas, edición de
  InformeOp vía `InformeOpEditorComponent` → `editarInformeOp`. editarDatos con
  Guardar/Descartar. Totales en vivo con badge "sin guardar". "Vista previa"
  con lo que está en pantalla (ver la skill `exportacion-excel-pdf`).
- `InformeOpAnuladosComponent`: InformeOp 'anulado' (baja de operación
  cerrada) por período/tipo, solo lectura. Muestra `anulacion`
  (motivo/usuario/fecha); "Ver" abre InformeOpDetalleComponent; "Ver en
  papelera" navega a `ajustes/papelera?evento=<idEventoPapelera>`
  (PapeleraComponent admite ese deep link: muestra solo ese evento, con
  "Ver todos").

### Columnas (`shared/utils/columnas-liquidacion.util.ts`)
`columnasPorTipo`, `tipoColumna` (texto/numero/moneda/fecha), `esColumnaMonto`,
`valorCrudoColumna` (number para montos/km, 'YYYY-MM-DD' para la fecha — única
definición de cada columna, la usan la pantalla y el Excel/PDF),
`valorColumnaInformeOp` (= crudo + formato, para pantalla), `etiquetaColumna`.
El nombre PERSISTIDO de la columna de monto propio es 'A Cobrar' para todo
tipo. `etiquetaColumna(nombre, tipo)` lo muestra como 'A Pagar' para
chofer/proveedor. Cualquier salida nueva (Excel/PDF) debe usar
`etiquetaColumna`, no el nombre crudo.
