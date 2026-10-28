---
name: modulo-reportes
description: Reportes de ApLog — resúmenes mensuales de operaciones (colección resumenesOp, ResumenOpFactoryService, ResumenOpConsultaService), escritura con fusionar + increment, recálculo del histórico, las pantallas de raiz/reportes y su Excel/PDF, que reemplazan a resumenOpMensual. Leer antes de trabajar sobre reportes, resúmenes, estadísticas por período o resumenesOp.
---

## Frente Reportes — resúmenes de operaciones (Septiembre–Octubre 2026)

Resúmenes mensuales de operaciones (general y por entidad) reconstruidos
sobre una colección NUEVA, `resumenesOp`, que reemplaza a `resumenOpMensual`
(ids `NaN` por entidad, mes corrido por huso horario, delta de edición que no
veía los cambios del editor nuevo y pisaba sub-mapas, carreras en el cierre).
Todo se hizo y probó en demo. Diseño y decisiones R1–R16: doc de proyecto
`claude/diseno-reportes.md`; instrucciones `claude/instruccion-r1…r9-*.md`,
`instruccion-r6a-botonera-modo.md`, `instruccion-r6-1-niveles.md`,
`instruccion-r7a-encabezado-compacto.md`.

### Estrategia: híbrido
- Agregados precalculados, escritos en el MISMO batch/transacción del gesto
  que cambia montos (cierre, edición de InformeOp, baja de cerrada) +
  herramienta de Recálculo idempotente que los rehace desde las operaciones
  y muestra las diferencias contra lo guardado (drift).
- Fuente de verdad: la Operacion (`op.valoresNuevos`, tarifaBase ×
  multiplicador del lado). Descuentos/ajustes del InformeLiq quedan fuera
  (resumen operativo, previo a la liquidación).

### Modelo (`interfaces/resumen-op-nuevo.ts`)
- `resumenesOp/{id}` con ids deterministas, mes con dos dígitos:
  `general_2026_08`, `cliente_{id}_2026_08`, `chofer_{id}_2026_08`,
  `proveedor_{id}_2026_08`. Por operación: general + cliente + (proveedor si
  la op tiene proveedor; si no, chofer). El chofer de un proveedor no tiene
  resumen propio: su operación cuenta para el proveedor.
- Identidad (`tipo`, `tipoEntidad` y `entidadId` string — null en general —,
  `anio`, `mes`, `periodo` = anio*100+mes) + métricas: `cantidadOps`,
  `kmRecorridos`, `acompanianteOps`, `acompanianteCantidadTotal`,
  `cliente`/`chofer` (`LadoResumen`: tarifaBase, kmAdicional, acompValor,
  adExtraValor, total y `niveles` {general, especial, personalizada,
  eventual} = conteo de operaciones POR LADO), `ganancia`, `actualizado`.
- El resumen de una entidad guarda los dos lados (el de un cliente incluye
  costo y ganancia).
- Período SIEMPRE desde el string: `periodoDeFecha('YYYY-MM-DD')`
  (`shared/utils/periodo.util.ts`, sin `Date`). En el mismo util:
  `sufijoMes`, `mesesDelRango`, `diasOperativos`, `ultimos12Meses`,
  `tituloPeriodo`, `errorPeriodoReporte`.

### Factory pura (`ResumenOpFactoryService`, sin Firestore)
- `aporteDeOperacion(op)`: métricas de una operación. Lados desde
  `valoresNuevos` (tarifaBase multiplicada; total = aCobrar / aPagar); nivel
  por lado desde `tarifaAplicadaCliente/Chofer.nivel`, o 'eventual' en los
  dos lados si hay `datosTarifaEventual`. Acompañantes:
  `acompaniante ? (acompanianteCant ?? 1) : 0` (criterio único; antes había
  tres).
- ~~Fallback legacy (`usaFuenteLegacy`)~~ — retirado en el cierre de Tarifas: una op
  sin `valoresNuevos`, o sin `tarifaAplicada` de un lado y no eventual, es un error
  del aporte. Las ops históricas de Vantruck se traducen al modelo nuevo con el
  método de migración de operaciones ANTES del Recálculo.
- `clavesDeOperacion`, `escriturasSuma(op, ±1)` (cierre +1, baja −1),
  `escriturasEdicion(opVieja, opNueva)` (resta lo viejo en SUS claves y suma
  lo nuevo en las suyas, neteo por clave, omite claves sin diferencia: cubre
  un cambio de fecha o de entidad), `agregados(ops)` (Recálculo), `sumar`.

### Escritura: modo `'fusionar'` de `EscrituraBatch`
- `'fusionar'` = `set(ref, data, { merge: true })` (WriteBatch y
  Transaction). Con `increment()` crea el doc si no existe y mergea los mapas
  anidados: sin lecturas previas, sin carrera entre los dos primeros cierres
  del mes, sin pisar sub-mapas.
- Regla INVERSA a `'actualizar'`: con merge, los campos anidados van como
  OBJETO anidado (`{cliente: {total: increment(x)}}`); una clave con punto
  se guardaría como un campo literal llamado "cliente.total".
- Cada escritura lleva los campos de identidad como valores fijos
  (idempotentes) + los incrementos + `actualizado`.

### Gestos
| Gesto | Orquestador | Resúmenes |
|---|---|---|
| Cierre | `OperacionService.cerrarOperacion`, ahora en `commitEnTransaccion`: lee la op fresca y aborta si no está 'abierta' o ya tiene `resumenProcesado` (guarda real contra doble cierre); `existeParaOperacion` queda como pre-chequeo (es una query). Escribe op + par de InformeOp + comisiones de venta (`comisionesVenta`, desde el Frente Vendedores) + log CERRAR + resúmenes | `escriturasSuma(op, +1)` |
| Edición de InformeOp (activo o dentro de un InformeLiq) | `InformeOpService.armarEscriturasEdicion` (`editar` / `InformeLiqService.editarInformeOp`) | `escriturasEdicion(opVieja, opNueva)` |
| Baja de op cerrada | `OperacionService.bajaOperacionCerrada` | `escriturasSuma(op, −1)` si `resumenProcesado` |
| Restauración | — | no toca (la op vuelve 'abierta'; al cerrarla de nuevo suma) |
| Liquidar / emitir / facturar / revertir | — | no tocan (no cambian montos de la op) |

- Editor de InformeOp (`InformeOpEditorComponent`): después de
  `calcularCierre` reutiliza `ValoresOpClienteService` /
  `ValoresOpChoferService` (calculadoras puras sobre `valoresNuevos`) y guarda
  en el InformeOp la tarifaBase multiplicada (igual que el cierre). Con la
  contraparte congelada (proforma/liquidada), el lado contrario de
  `valoresNuevos` vuelve al de la op original.
- ~~Editores viejos (`editar-tarifa-op`, `editar-inf-op`)~~ — borrados en el
  cierre de Tarifas.

### Recálculo (`servicios/desarrollo/recalculo-resumenes.service.ts`, `componentes/recalculo-resumenes/`, en `/migracion`)
- Por rango de meses (YYYY-MM). Lee las operaciones del rango
  (`DbFirestoreService.consultarPorRango`: un campo, sin índice compuesto),
  suma las que no están 'abierta' con `agregados` y compara doc por doc
  contra lo guardado: nuevo / distinto (con los campos) / sobra. "Simular"
  es también el "verificar": no escribe.
- "Ejecutar": confirmación escrita del id del proyecto; recalcula de nuevo,
  reemplaza (set sin merge) los docs del rango y borra los que sobran. Se
  BLOQUEA si hay operaciones con error. No es atómico entre lotes de 500 pero
  es idempotente: si se corta, se vuelve a ejecutar.
- Guarda: rol dev en CUALQUIER proyecto (a diferencia de Limpieza y
  Generador), porque se usa en la migración de Vantruck.
- Demo, agosto 2026: 508 leídas, 93 abiertas, 415 sumadas, 0 legacy; 65
  docs; facturado 125.018.682, costo 91.629.055, ganancia 33.389.627.
  Ejecutado → re-simulación con 0 diferencias.

### Pantallas (`raiz/reportes/`)
- Ruta con RoleGuard dev/admin/demo (`user` no entra).
- `ResumenOpConsultaService`: lectura por ids deterministas
  (`getDocObservable` por mes + `combineLatest`), sin queries ni índices
  compuestos; tope 36 meses; `armarTabla` → una fila por mes (meses sin datos
  en cero) + fila Total.
- Resumen general y resumen por entidad (entidades desde `ClienteService` /
  `ChoferService` / `ProveedorService`; choferes de proveedor fuera del
  combo; inactivos marcados "(inactivo)").
- `TablaResumenComponent` + `TablaResumenConfigService`: botonera de radios
  Totales / Promedios / Porcentajes; tabla principal + "Operaciones por nivel
  de tarifa" (general: cliente + chofer; entidad: solo su lado), las dos con
  el mismo modo; fila Total (promedios y porcentajes sobre los totales del
  período). Ops/día y promedios por día: días del mes sin domingos
  (`diasOperativos`; el mes en curso hasta hoy, los futuros 0). Totales en
  enteros; promedios con 1 decimal (es-AR).

### Excel/PDF del resumen
- `LibroTabular` / `HojaDoc` / `TablaDoc` / `GrupoColumnasDoc` en
  `interfaces/documento-tabular.ts`, al lado de `DocumentoTabular`; tipos de
  celda 'porcentaje' y 'decimal'; `ValorCeldaDoc` admite null ("—").
- `generarLibro` en `ExcelTabularService` y `PdfTabularService` (el
  `generar(doc)` de liquidación no cambió): 3 hojas (Totales / Promedios /
  Porcentajes), cada una con la tabla principal + la de niveles y el
  encabezado agrupado Cliente/Chofer; título y subtítulos a la altura del
  logo, a la derecha; en el PDF, márgenes compactos (8/10 mm).
- `armarLibroResumen` (`shared/utils/documento-resumen.util.ts`, pura,
  mismas `valueFn` que la pantalla) → `ResumenOpExportService.descargar(datos,
  'excel' | 'pdf')`.

### Retiro del camino viejo
Borrados: `ReportesOpService`, `ResumenOpCalculatorService`,
`ResumenBuilderService`, `interfaces/resumen-op-base.ts` /
`resumen-op-tabla.ts`, `DbFirestoreService.aplicarUpdatesResumen` /
`buildBaseData` / `actualizarOperacionInformeOpYFactura` /
`obtenerOperacionPorIdOperacion`, `ExcelService.exportarResumenOperaciones`
y sus helpers, `LogRegistroService.construirEntradaSuelta`,
`StorageService.resumenOpMensual$`, `tablero-op.crearResumenOp`.
`TablaResumenConfigService` pasó a `servicios/reportes/resumenes-op/` (la
carpeta `reportes-op/` ya no existe). Se conservan: la colección
`resumenOpMensual` en Vantruck y su mapeo en `firestore.rules` /
`LimpiezaDemoService` (hasta la migración). (`buscarContraParteInformeOp` se
borró con `editar-inf-op` en el cierre de Tarifas.)

## Deuda abierta — Reportes (`resumenesOp`)
- ~~`resumenOpMensual`: mes corrido por huso horario, ids NaN por entidad,
  lectura de `op.valores` / `op.tarifaTipo`~~ — RESUELTO en el Frente
  Reportes (Octubre 2026): colección nueva `resumenesOp`, `periodoDeFecha`,
  ids string, fuente `valoresNuevos`. Ver "Frente Reportes".
- Migración a Vantruck, checklist de Reportes: deploy de las reglas de
  `informesOp` (módulo 'informesOp') y `resumenesOp` (módulo 'resumenes') en
  `pf-logistics` junto con el código nuevo (sin ellas, `user` no puede cerrar
  operaciones); Recálculo de todo el histórico (rol dev + id del proyecto),
  simulando primero un rango (las ops con error bloquean la ejecución); las
  ops históricas tienen que estar ya traducidas al modelo nuevo (ver
  la skill `migracion-vantruck`, "Checklist — migración de Tarifas a Vantruck", paso 6); después, borrar la
  colección `resumenOpMensual`, su mapeo en `firestore.rules` y en
  `LimpiezaDemoService`, y los índices compuestos de su query que se habían
  creado desde la consola.
- ~~Fallback legacy de `aporteDeOperacion`~~ — retirado en el cierre de
  Tarifas.
- `app-filtro-periodo` (shared): "últimos 12 meses" calcula el desde con
  `setMonth(getMonth() - 11)` → los días 29–31 puede desbordar al mes
  siguiente y el rango queda de 11 meses. No se corrigió (componente
  compartido); el valor inicial de las pantallas de Reportes sale de
  `ultimos12Meses` (periodo.util), que no tiene el problema. Corregir con
  `periodo.util` cuando se toque el componente.
- Pantallas: un listener por mes y por clave (12 docs para un año). Con el
  tope de 36 meses está bien; para rangos mayores, pasar a una query por
  `periodo` con índice.
- ~~Editores viejos (`editar-tarifa-op`, `editar-inf-op`)~~ — borrados en el
  cierre de Tarifas.
- Cierre: `existeParaOperacion` sigue siendo una query fuera de la
  transacción (el SDK web no las permite adentro); la guarda real es el
  estado de la op leído en la transacción. ~~Anti-duplicado de InformeVenta~~
  — RESUELTO en el Frente Vendedores: `comisionesVenta` tiene id
  determinista y se escribe sin query.
