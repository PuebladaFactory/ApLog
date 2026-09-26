# Facturación sobre InformeLiqNuevo — relevamiento y propuesta (DESCUBRIR/DISEÑAR)

Fecha: 2026-09-26 · Fuente: código real del repo (CLAUDE.md + src/app) y docs `diseno-informe-liq-nuevo.md`, `diseno-baja-op-cerrada.md`, `auditoria-informe-liq.md`.
Estado: **propuesta, decisiones abiertas (§7)**. Sin instrucciones para Claude Code todavía.

---

## 1. Relevamiento del camino viejo

### 1.1 `raiz/facturacion/` — módulo muerto
- El link del sidebar está comentado. El menú apunta a `/nuevaFacturacion`.
- `FacturacionControlComponent` navega a `facturacion/emitidos` y `facturacion/gral`, rutas que no existen (el routing solo tiene `'' → redirect 'gral'` y tres rutas a PageNotFound).
- `ModalDetalleComponent`: declarado, nadie lo abre (ya lo había detectado la auditoría).
- `modales/modal-vincular-factura`: copia **idéntica** (diff vacío) de la de `nueva-facturacion`.
- `LiquidacionModule` importa `FacturacionModule`, pero este no exporta nada: el import no aporta nada.
- Conclusión: se puede borrar sin cambiar el comportamiento, en este frente o en el de retiro (pregunta 17).

### 1.2 `raiz/nueva-facturacion/` — el módulo vivo (ruta `nuevaFacturacion`, roles dev/admin/demo, permiso `facturacion.ver`)
Pestañas: "Informes Emitidos" (`FacturacionListadoComponent`) e "Informes Facturados" (`FacturacionHistoricoComponent`). Las dos usan `InformesTablaComponent` (tabla genérica con acciones por columna).

**Listado de emitidos**
- Lectura: `DbFirestoreService.getInformesLiqPorTipoYFechas` (estado + rango de `fecha` + `tipo in`) o `getInformesLiqPorPeriodo` (estado + `mes` string + `anio`). One-shot, sin listener. Texto, tipo y razón social se filtran en memoria.
- `mes` es un string ('Enero'…). La unión de tipos y el array `meses` del componente **no tienen 'Octubre'**.
- Detalle y reimpresión leen los InformeOp con `InformeOpService.obtenerPorIdsOperacion(inf.operaciones)`. Eso trae **los dos lados** de cada operación y también los anulados (bug B3 de la auditoría).
- Excel/PDF: `exportToExcelInforme` / `exportToPdfInforme(InformeLiq, informesOp, clientes, choferes, modo)`. Cruzan con el caché de StorageService (`loadInfo('clientes')`…) para resolver nombres.
- **Anular**: Swal → `BajaObjetoComponent` (motivo) → `LiquidacionService.anularLiquidacion`:
  - lock de operaciones;
  - chunks de 100 InformeOp → **no atómico** con más de 100;
  - InformeOp liquidado → activo, `idInfLiq = null`; Operación `liquidacion.<lado> = false`, `ciclo = 'cerrada'`;
  - el InformeLiq queda en estado 'anulado' con `anuladoMotivo/Por`, `fechaAnulacion`, **y conserva el número**;
  - `resumenFinanzas` se revierte **fuera** del batch (try/catch que solo loguea);
  - log viejo (`StorageService.logSimple`);
  - no valida si el informe ya tiene cobros o pagos imputados.
- **Vincular factura** (`ModalVincularFacturaComponent`):
  - Se lee el QR AFIP del PDF (pdfjs + jsQR, `FacturaQrService`) y se valida: importe contra `valores.total` (±0,01) y CUIT (cliente: `nroDocRec` contra `entidad.cuit`; chofer/proveedor: `cuit` emisor contra `entidad.cuit`). Si no coincide, alcanza con confirmar.
  - El formulario se muestra pero **se ignora**: la validación está comentada y solo vale lo que salió del QR.
  - `factura` se persiste con la forma del QR (`codAut, nroCmp, ptoVta, tipoCmp`), que **no coincide** con la interfaz `FacturaQR` (`cae, numero, puntoVenta, tipoComprobante`). `FacturaElectronicaLiq` (modelo nuevo) copió esa interfaz, así que hereda el desajuste.
  - La descripción del tipo de comprobante sale siempre 'Desconocido': busca `datosFactura.tipoComprobante`, pero la clave es `tipoCmp`.
  - El PDF se sube a **Supabase** (`SupabaseStorageService`). La anon key está hardcodeada y demo/Vantruck se eligen **comentando y descomentando código**: riesgo real de subir facturas de producción al bucket de demo (hoy está activo DEMO).
  - Escritura: `StorageService.updateItem('resumenLiq', infLiq…)` reemplaza el **documento entero** con la copia en memoria del listado. Puede pisar cambios concurrentes (por ejemplo cobros de Finanzas). Además es no atómico y usa log viejo.
  - No hay chequeo de duplicados (la misma factura se puede vincular a dos informes) ni forma de desvincular.
- Código de migración/debug con escrituras masivas sigue vivo en los componentes: `actualizarInformesLiq`, `construirResumenEntidad`, `migrarInformesAFinanzas`, `actualizarObjeto`.

**Histórico (facturados/anulados)**: mismas consultas con `filtroEstado`. El tipo admite 'cobrado', pero ese valor vive en `estadoFinanciero`, no en `estado` (la UI no lo ofrece). La columna Estado muestra `estadoFinanciero` si es cobrado/parcial. Acciones: ver, Excel/PDF, ver factura (URL firmada de Supabase de 60 s).

**Modal compartido viejo** `shared/modales/informe-liq-detalle` (modo 'facturacion'): edita descuentos, observaciones y período con `updateItem` (reemplazo completo) y resetea `valoresFinancieros.totalCobrado = 0`.

### 1.3 Contrato con Finanzas (camino viejo) — lo que Facturación define
- `aplicarNuevaLiquidacion` se ejecuta al **emitir**: el emitido ya entra en `resumenFinanzas` (deuda reconocida).
- `MovimientoFinancieroService.getInformesPendientesPorEntidad` solo ofrece para cobro/pago los informes con `estado == 'facturado'` y `estadoFinanciero in ['pendiente','parcial']`. **'facturado' es la puerta para cobrar o pagar.**
- Cuenta corriente, aging y resumen excluyen `estado == 'anulado'`. SaldoEngine ignora anulado/borrador.
- Consecuencia para el camino nuevo: anular o desvincular un informe con `totalCobrado > 0` tiene que estar prohibido desde ya. Hoy nunca pasa en demo, pero la guarda deja el modelo listo para la cascada de Finanzas.

## 2. Consumidores de InformeLiq

- **InformeLiqNuevo / `informesLiq`**: solo lo usan `InformeLiqService`, `InformeLiqFactoryService`, `LiquidacionNuevaComponent`, `BorradoresLiqComponent` e `InformeLiqNuevoDetalleComponent`. **Ningún módulo de Finanzas, Reportes, StorageService ni Excel/PDF lo lee.** El camino paralelo está aislado: se confirma.
- **InformeLiq viejo** (28 archivos, a migrar o retirar en frentes propios):
  - Finanzas: `cuenta-corriente.service`, `finanzas-resumen.service`, `movimiento-financiero.service`, `saldo-engine`, `ledger`, `informe-liq-cuenta-corriente`, `detalle-cuenta-corriente`, `finanzas-cobros`, `finanzas-pagos`, modal `movimiento-financiero`;
  - Facturación vieja (listado, histórico, informes-tabla, vincular ×2, modal-detalle muerto);
  - Liquidación vieja (liquidaciones-op, proforma, resumen-op-liquidadas, descuentos, migrar-datos);
  - shared (informe-liq-detalle, descuentos, informes-acciones-cell);
  - servicios (db-firestore, excel, pdf, liquidacion, liquidacion-builder).
- StorageService: caché `resumenLiq*` en BehaviorSubjects (camino viejo).
- Reportes: no lee InformeLiq (trabaja con operaciones y resúmenes).

## 3. Scope funcional propuesto (camino nuevo)

Facturación es dueña de la **pantalla** del InformeLiq desde 'emitido' en adelante. El **dueño de la entidad** sigue siendo `InformeLiqService` (ver §4).

Máquina de estados (lo nuevo en negrita):
```
borrador ──emitir──▶ emitido ──**vincularFactura**──▶ facturado
   │                  │  ▲                              │
eliminar          **anular**  └──**desvincularFactura**─────┘
   ▼                  ▼
 (delete)          anulado (terminal)
```

### 3.1 Listado por estado (tres pestañas nuevas)
- **Emitidos** = bandeja de trabajo (lo pendiente de facturar). Listener en vivo `estado == 'emitido'`: una igualdad, sin índice, igual que Borradores. Filtro por tipo, búsqueda (entidad / número / período) y orden por encabezado, en memoria. No necesita rango de fechas: la bandeja se vacía a medida que se factura.
- **Facturados** y **Anulados** = histórico. Consulta one-shot por estado + **rango de períodos** (desde/hasta mes), con tipo y texto en memoria. Rango por defecto: últimos 3 meses. Mejoras respecto del viejo: rango de meses en vez de un mes suelto, sin el bug de 'Octubre', período numérico.
- Columnas: N°, tipo, entidad, período, fecha de emisión, cant. de InformeOp, total. En facturados suma comprobante (tipo PV-N°) y fecha de factura. En anulados suma motivo, usuario y fecha.

### 3.2 Ver / editar
- `InformeLiqNuevoDetalleComponent` se reutiliza. `editable` pasa de "estado === 'borrador'" a "borrador **o emitido**". En emitido se edita igual que en borrador: InformeOp (liquidado) con `editarInformeOp`, y descuentos/observaciones/columnas con `editarDatos`. Los dos servicios ya soportan 'emitido'.
- Facturado y anulado: solo lectura (recomendado, pregunta 6).
- Detalle de un **anulado**: la query `where('idInfLiq','==',id)` ya no devuelve nada, porque la anulación pone `idInfLiq = null`. Se lee por la composición (`informesOp: string[]`, getById ×N, ≤150) o desde un snapshot (pregunta 5).

### 3.3 Anular un emitido
- Solo desde 'emitido', con motivo obligatorio (`BajaObjetoComponent`), `totalCobrado === 0`.
- InformeLiq: `estado 'anulado'`, `anulacion {motivo, usuario, fecha ISO}`. Se **conservan** el número, los valores y la composición (`informesOp`) como traza.
- InformeOp de este lado: `liquidado → activo`, `idInfLiq = null` → re-liquidables.
- Operación: `liquidacion.<lado> = false`. Si el ciclo era 'liquidada', vuelve a 'cerrada'. `proforma.<lado>` ya está en false (se valida).
- `bloqueadoPorContraparte`: no cambia. El bloqueo solo lo pone un **borrador** chofer/proveedor, y emitir ya lo liberó. Se valida que la contraparte no esté bloqueada por este informe.
- `totalContraParte` del informe de la contraparte: no cambia (es informativo y el monto no se modificó).

### 3.4 Vincular factura electrónica
- Solo desde 'emitido'. Gesto: elegir PDF → leer QR → mostrar datos normalizados y el resultado de la validación (importe y CUIT según el lado) → confirmar.
- El archivo se sube primero (reversible). Después, transacción: releer el informe (sigue en 'emitido'), verificar unicidad del comprobante, escribir `estado 'facturado'`, `factura`, `facturaUrl` y un log. Si la transacción falla, se borra el archivo subido (best-effort).
- `factura` normalizada (desde el QR a la interfaz) + `vinculadaPor` / `fechaVinculacion` (pregunta 11).
- Aplica a los tres tipos: cliente (factura emitida por Vantruck; valida el CUIT receptor) y chofer/proveedor (factura que ellos emiten a Vantruck; valida el CUIT emisor). Pregunta 18.

### 3.5 Desvincular factura (nuevo, recomendado)
- facturado → emitido, con motivo, `totalCobrado === 0`. Borra `factura`, `facturaUrl` y la clave de unicidad. El archivo se conserva o se borra (a decidir). Es la puerta para corregir una factura mal vinculada y el paso previo obligatorio para anular algo facturado.

### 3.6 Reimpresión y vistas previas (Excel/PDF)
- **Generador nuevo**, no un adaptador. Los servicios viejos necesitan el caché de clientes/choferes y el `InformeLiq` viejo (mes string, `operaciones`, `idInfLiq` numérico). El modelo nuevo ya tiene todo en snapshots: `valorColumnaInformeOp` + `etiquetaColumna` resuelven cada celda sin cachés.
- `LiquidacionExportService.excel(liq, informesOp, opciones)` / `.pdf(...)`, con `opciones.marca: 'BORRADOR' | null`. Recibe un `InformeLiqNuevo` persistido o armado en memoria (`factory.crear` para la vista previa de LiquidacionNueva). Reutiliza el formato ExcelJS/jsPDF del servicio viejo (se copia, no se toca).
- Entran los dos botones "Vista previa" de Liquidación y la descarga en Emitidos, Facturados y Anulados (este último con marca ANULADO). Log `REIMPRIMIR` (ya existe en AccionLog, escritura suelta).

## 4. Arquitectura

### 4.1 Ownership
Todos los gestos tienen el mismo sustantivo: "anular / facturar / desvincular **un informe de liquidación**". Por la regla de ownership, los orquestadores van en **`InformeLiqService`**. Facturación es solo el lugar del clic. No se crea un "FacturacionService" dueño: sería un segundo dueño de `informesLiq`.

Para que `InformeLiqService` no crezca sin control (hoy ~600 líneas):
- **`InformeLiqConsultaService`** (lecturas puras, mismo patrón que `RegistroLogConsultaService` / `PapeleraConsultaService`): `observarPorEstado`, `consultarPorPeriodo(estado, desde, hasta)`, `obtenerInformesOpPorIds`. `observarBorradores` se puede mover ahí o quedar donde está.
- **`FacturaArchivoService`** (apoyo, sin lógica de dominio): `subir(file, idInfLiq, tipo) → path`, `urlDescarga(path)`, `borrar(path)`.
- **Funciones puras** (en `InformeLiqFactoryService` o en `shared/utils/factura-electronica.util.ts`): `facturaDesdeQr(qr) → FacturaElectronicaLiq`, `validarFacturaContraInforme(f, liq) → {importeOk, cuitOk}`, `claveComprobante(f) → string`.
- **`LiquidacionExportService`** (§3.6).

Dependencias: InformeLiqService → InformeOpService, OperacionFactoryService, LogRegistroService, DbFirestoreService. La UI llama a `FacturaArchivoService` y le pasa el path al orquestador. No aparecen ciclos.

### 4.2 Orquestadores nuevos (InformeLiqService)
| Gesto | Commit | Lecturas en tx | Escrituras | Log |
|---|---|---|---|---|
| `anularEmitido(id, motivo)` | commitEnTransaccion | liq (emitido, cobrado 0), InformeOp ×N (liquidado, idInfLiq = id), operaciones | liq parcial (estado, anulacion); InformeOp parcial ×N (activo, idInfLiq null); Operación parcial ×N (liquidacion.<lado>, ciclo) | ANULAR (con diff) |
| `vincularFactura(id, factura, path)` | commitEnTransaccion | liq (emitido), doc de unicidad | liq parcial (estado, factura, facturaUrl); crear doc de unicidad | FACTURAR (con diff) |
| `desvincularFactura(id, motivo)` | commitEnTransaccion | liq (facturado, cobrado 0) | liq parcial (estado emitido, factura null, facturaUrl null); borrar doc de unicidad | EDITAR o DESVINCULAR |
| editar (existentes) | commitBatch | — | sin cambios | EDITAR |

Presupuesto de anular: 2 escrituras por InformeOp (InformeOp + Operación) + liq + log → ≤302 con el tope de 150. Entra.

Piezas nuevas encapsuladas: `camposAnulacionOperacion(estado, lado)` (espejo de `camposLiquidacion`), `validarInformesDelEmitido(informes, id)` (espejo de `validarInformesDelBorrador`). Se reutilizan `leerInformesOp`, `leerOperaciones`, `agregarEscrituraInformeLiqParcial`, `agregarEscrituraInformeOpParcial` y `agregarEscrituraOperacionParcial`.

### 4.3 Unicidad del comprobante (recomendado)
Una transacción no puede hacer queries. Para garantizar "una factura → un informe" de forma atómica: colección **`facturasVinculadas`** con doc id determinístico `claveComprobante` = `{cuitEmisor}_{ptoVta}_{tipoCmp}_{nroCmp}` y body `{idInfLiq, numeroInterno, fecha}`. Vincular hace `tx.get` y aborta si existe; si no, lo crea. Desvincular lo borra. Es el mismo principio que `objetosEliminados` (id determinístico = point lookup).

### 4.4 Log
- AccionLog suma **'ANULAR'** y **'FACTURAR'** (y opcionalmente 'DESVINCULAR'), las tres con diff: `agregarAlBatch` calcula diff en EDITAR|EMITIR y habría que extenderlo.
- Un registro por gesto, sobre `informesLiq`. No se loguea cada InformeOp (decisión 10 del frente anterior).

### 4.5 Reglas e índices (solo demo)
- `firestore.rules`: `'facturasVinculadas': 'finanzas'` en `moduloDe`. `informesLiq` ya está.
- Si el PDF va a Firebase Storage: `storage.rules` para `facturas/**` (leer: dev/admin/demo; escribir/borrar: dev/admin). Mismo criterio que la matriz 'finanzas'.
- `firestore.indexes.json`: `informesLiq (estado ASC, periodoClave DESC)` para los históricos. Si también se filtra por fecha de emisión: `(estado ASC, fechaEmision DESC)`. Emitidos no necesita índice.
- `periodoClave: 'YYYY-MM'` (derivado de `periodo`, se persiste al crear): permite rangos de meses con una sola desigualdad. Con `periodo.anio` + `periodo.mes` separados no se puede hacer un rango que cruce años. En demo se arrancó de cero: para los documentos existentes alcanza con un backfill manual chico, o con borrarlos.

### 4.6 UI / módulos
- En `nueva-facturacion/ControlComponent` se agregan pestañas nuevas (Emitidos / Facturados / Anulados, rutas nuevas) y se comentan las viejas. Mismo precedente que LiqGral.
- `InformeLiqNuevoDetalleComponent` (y el `DescuentosComponent` de liquidación que usa) está declarado en `LiquidacionModule`. `NuevaFacturacionModule` no puede importar `LiquidacionModule`: registraría sus rutas. Se mueven a `SharedModule`, que es donde viven los modales compartidos (`InformeOpEditorComponent`). Ojo: hay dos `DescuentosComponent` (shared y liquidacion/modales); hay que mover el de liquidación con otro selector o reutilizar el shared si es compatible.
- Permisos: ya existen `facturacion.{ver, editar, anular, vincularFactura, verFactura, reimprimir}` en la matriz (→ 'finanzas': solo dev/admin escriben; demo lee). No hay que tocar PermisosService.

## 5. Interfaz — ajustes propuestos
- `FacturaElectronicaLiq` normalizada: `{cuitEmisor, cuitReceptor, puntoVenta: number, tipoComprobante: number, numero: number, cae, fecha, importe, qrData?, vinculadaPor, fechaVinculacion}`. La interfaz actual no la usa nadie todavía, así que cambiarla es gratis.
- `facturaUrl` se mantiene como **path** del archivo (no URL pública). La URL se resuelve al abrir.
- `periodoClave: string` (si se aprueba). Lo escribe `InformeLiqFactoryService.crear`.

## 6. Deuda detectada (fuera del frente, a registrar)
- `raiz/facturacion` muerto + import inútil en LiquidacionModule (si no entra en este frente).
- Supabase con key hardcodeada y toggle por comentario (camino viejo; relevante para la migración de Vantruck: las facturas históricas viven ahí).
- `anularLiquidacion` viejo: chunks no atómicos, Finanzas fuera del batch, sin guarda de cobros.
- `updateItem` de documento entero en vincular y en el detalle viejo (pisa `totalCobrado`).
- Métodos de migración/debug con escrituras masivas en los componentes de Facturación vieja.

## 7. Decisiones abiertas
1. Anular emitido → InformeOp vuelven a 'activo' (re-liquidables). ¿OK?
2. El `numeroInterno` del anulado se conserva y no se reutiliza (el hueco queda explicado por el documento anulado). ¿OK?
3. ¿Se puede anular un 'facturado'? Recomendación: no. Primero desvincular (gesto propio) y después anular.
4. Guarda `valoresFinancieros.totalCobrado === 0` para anular y desvincular. ¿OK?
5. Detalle de un anulado: ¿InformeOp actuales, leídos por la composición (pueden haber cambiado o re-liquidado), o snapshot congelado al anular (subcolección o doc aparte, hasta ~225 KB)?
6. ¿Facturado editable? Recomendación: no (hay que desvincular antes).
7. PDF de la factura: ¿Firebase Storage (recomendado; ya activo, storage-first, reglas por rol) o Supabase?
8. Unicidad de la factura: ¿colección `facturasVinculadas` en la transacción (recomendado), query previa no atómica, o nada?
9. Si la validación no coincide (importe/CUIT): ¿se permite con confirmación y queda registrada la discrepancia, o se bloquea?
10. ¿Carga manual cuando el QR no se puede leer?
11. Forma de `FacturaElectronicaLiq` (§5), incluidos `vinculadaPor` y `fechaVinculacion`. ¿OK?
12. Log: ¿'ANULAR' y 'FACTURAR' nuevas? ¿Desvincular como 'EDITAR' o 'DESVINCULAR'?
13. ¿`periodoClave` persistido para rangos de meses?
14. Filtro de los históricos: ¿período liquidado, fecha de emisión, o ambos?
15. UI: pestañas nuevas en `nueva-facturacion` con las viejas comentadas, y detalle movido a SharedModule. ¿OK?
16. Excel/PDF: ¿generador nuevo dentro de este frente (incluye las vistas previas de Liquidación)?
17. ¿Borrar `raiz/facturacion` (muerto) en este frente o en el de retiro?
18. ¿Chofer/proveedor también vinculan factura (la que emiten a Vantruck), con el mismo flujo?
19. Desvincular: ¿el PDF se borra de Storage o se conserva?

## 8. Plan de bloques (borrador)
- **F0 — base**: interfaz (FacturaElectronicaLiq, periodoClave), AccionLog, diff en las acciones nuevas, índices y reglas (deploy demo), mover el detalle a SharedModule, `InformeLiqConsultaService`.
- **F1 — Emitidos**: pestañas en ControlComponent (viejas comentadas), bandeja en vivo, Ver/Editar con el detalle (`editable` en emitido).
- **F2 — Anular**: `anularEmitido` + UI + pestaña Anulados (con detalle por composición o snapshot).
- **F3 — Facturar**: `FacturaArchivoService`, utils de QR/validación, modal nuevo, `vincularFactura` / `desvincularFactura`, pestaña Facturados + ver factura.
- **F4 — Excel/PDF**: `LiquidacionExportService`, descarga en las tres pestañas, dos vistas previas en Liquidación.
- **F5 — cierre**: limpieza (según pregunta 17), CLAUDE.md, CHANGELOG, TODOs de Finanzas, commit.

Cada bloque deja el proyecto compilando y se prueba en demo antes de pasar al siguiente.
