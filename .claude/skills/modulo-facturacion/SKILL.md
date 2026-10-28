---
name: modulo-facturacion
description: Facturación de ApLog sobre InformeLiqNuevo (colección informesLiq) — estados emitido/facturado/revertido, vincular y desvincular facturas por QR (FacturaQrService, facturasVinculadas), los orquestadores de InformeLiqService y la UI de raiz/nueva-facturacion. Leer antes de trabajar sobre facturación, facturas, emitidos, facturados, revertidos o la vinculación de comprobantes.
---

## Frente Facturación — InformeLiqNuevo (Septiembre 2026)

Facturación sobre el camino nuevo. Mismo criterio que Liquidación: PARALELO
al viejo (Supabase no se tocó; los componentes viejos
`FacturacionListado`/`FacturacionHistorico`, `InformesTabla` y
`ModalVincularFactura`, con sus rutas comentadas, se borraron en el Frente
Finanzas, F9). Todo se hizo y probó en demo. Diseño y decisiones D1–D19: doc de
proyecto `claude/diseno-facturacion-nueva.md`; instrucciones por bloque:
`claude/instruccion-f0…f5-facturacion.md`.

### Estados y gestos

    borrador ──emitir──▶ emitido ──vincularFactura──▶ facturado
                          │  ▲                          │
                      revertir └────desvincularFactura───┘
                          ▼
                      revertido

- `'revertido'` es el ÚNICO gesto de salida de un emitido. Guarda
  `reversion: {motivo, usuario, fecha}` y conserva número interno (no se
  reutiliza), valores y composición. Sus InformeOp vuelven a 'activo' con
  `idInfLiq = null` (re-liquidables); la Operación pasa a
  `liquidacion.<lado> = false` y, si el ciclo era 'liquidada', vuelve a
  'cerrada'.
- `'anulado'` + `anulacion`: RESERVADOS, sin escritor. Ningún escenario
  relevado lo necesita: el no pago es un evento de Finanzas (incobrable), no
  un error de liquidación; operación errónea → revertir + baja de operación
  cerrada; bonificación → ajuste o valor 0; nota de crédito → desvincular y
  revertir/editar. Agregarlo después no requiere migrar datos.
- Migración de Vantruck: el 'anulado' viejo (`anularLiquidacion`) equivale al
  'revertido' nuevo.
- Reglas: un facturado no se edita ni se revierte (primero se desvincula).
  Revertir y desvincular exigen `valoresFinancieros.totalCobrado === 0`
  (contrato con Finanzas: 'facturado' es la puerta de cobros/pagos). Un
  emitido es editable (detalle: `editable` = borrador|emitido y permiso
  `<modulo>.editar`).

### Modelo (`interfaces/informe-liq-nuevo.ts`)
- `periodoClave: 'YYYY-MM'` (`InformeLiqFactoryService.clavePeriodo`),
  persistido al crear y nunca editado. Índice `informesLiq (estado ASC,
  periodoClave DESC)`: históricos por rango de períodos, aunque crucen años
  (con `periodo.anio`/`mes` separados no se puede). Demo: backfill manual.
- `FacturaElectronicaLiq` normalizada: `cuitEmisor`, `cuitReceptor`
  (strings), `puntoVenta`/`tipoComprobante`/`numero` (number), `cae`,
  `fecha` ('YYYY-MM-DD'), `importe`, `qrData`, `origen: 'qr'|'manual'` (hoy
  solo 'qr'), `validacion {importeOk, cuitOk}`, `vinculadaPor`,
  `fechaVinculacion`.
- `facturaUrl` = PATH del PDF en Storage (`facturas/{idInfLiq}/{timestamp}_{nombre}`),
  NO la URL de descarga: la URL de `getDownloadURL` lleva un token permanente
  que saltea las reglas. Se resuelve al abrir (`InformeLiqService.obtenerUrlFactura`
  → `StorageArchivosService.urlDescarga`).
- `informesLiqSnapshots/{idInfLiq}` = `InformeLiqSnapshot {fecha, informesOp: InformeOpNuevo[]}`:
  copia congelada de los InformeOp al revertir (misma transacción, +1
  escritura, 0 lecturas extra). El detalle de un revertido lee de acá (los
  InformeOp vivos ya no le pertenecen).
- `facturasVinculadas/{cuitEmisor}_{ptoVta}_{tipo}_{nro}` = `FacturaVinculada {idInfLiq, numeroInterno, fechaVinculacion}`:
  unicidad "una factura → un InformeLiq". Una transacción no puede hacer
  queries: se lee por id dentro de la tx (mismo principio que
  `objetosEliminados`). Vincular lo crea, desvincular lo borra.
- `firestore.rules`: `informesLiqSnapshots` y `facturasVinculadas` → módulo
  'finanzas'. `storage.rules`: `facturas/{idInfLiq}/{archivo}` — read
  dev/admin/demo; create dev/admin, solo `application/pdf` < 10 MB; delete
  dev/admin. (Deployados SOLO en demo.)

### Orquestadores (`InformeLiqService`) — todos con `commitEnTransaccion`
| Gesto | Lee en tx | Escribe | Log |
|---|---|---|---|
| `revertirEmitido(id, motivo)` | liq (emitido, cobrado 0), InformeOp ×N (liquidado, de este informe), operaciones | liq {estado 'revertido', reversion}; InformeOp parcial ×N (activo, idInfLiq null); Operación parcial ×N; snapshot | REVERTIR (diff) |
| `vincularFactura(id, pdf, textoQr)` | liq (emitido), `facturasVinculadas/{clave}` | liq {estado 'facturado', factura, facturaUrl}; crea índice | FACTURAR (diff; el detalle nota las discrepancias) |
| `desvincularFactura(id, motivo)` | liq (facturado, cobrado 0) | liq {estado 'emitido', factura null, facturaUrl null}; borra índice | DESVINCULAR (diff; detalle con path del PDF y motivo) |
- `vincularFactura`: decodifica el QR (puro) → pre-chequeos con lecturas
  sueltas (solo para no subir un PDF en vano) → sube el PDF (storage-first,
  lo reversible primero) → transacción → si la transacción falla, borra el
  PDF (best-effort). La validación se recalcula dentro de la tx con el
  informe fresco; confirmar discrepancias es responsabilidad de la UI (D8:
  se permite, queda registrado en `factura.validacion` y en el log).
- `desvincularFactura` conserva el PDF en Storage (D18).
- Lecturas: `InformeLiqConsultaService` (solo lectura): `observarPorEstado`
  (en vivo, una igualdad, sin índice), `consultarPorPeriodo(estados, desde, hasta)`
  (`DbFirestoreService.consultarPorInYRango`), `obtenerFacturaVinculada(clave)`.
- Util puro `shared/utils/factura-electronica.util.ts`: `decodificarQrAfip`,
  `validarFacturaContraInforme` (importe vs `valores.total` ±0,01 — el total
  ya incluye IVA; CUIT receptor si es cliente, emisor si es chofer/proveedor),
  `facturaDesdeQr`, `claveComprobante`/`claveComprobanteQr`,
  `descripcionTipoComprobante`, `numeroComprobante`,
  `fechaComprobanteLegible`, `listarDiscrepancias`.
- `StorageArchivosService`: `subirYObtenerPath` y `urlDescarga` nuevos.
  `subir()`/`subirVarios()`/`ArchivoSubido` quedaron intactos a propósito:
  Legajos (`cargar-documentos`) y Operaciones (`modal-detalle-op`) persisten
  el objeto devuelto entero en Firestore.
- AccionLog: REVERTIR, FACTURAR, DESVINCULAR (y ANULAR, reservado), las
  cuatro en `LogRegistroService.ACCIONES_CON_DIFF`. AccionPermiso:
  `revertir` y `desvincular` → 'editar' (`vincularFactura` y `verFactura`
  ya existían).

### UI (`raiz/nueva-facturacion`, ruta `nuevaFacturacion`)
- Pestañas: Emitidos (tab3, default) · Facturados (tab4) · Revertidos
  (tab5). Las viejas ("Informes Emitidos"/"Informes Facturados") quedan
  comentadas en el routing y en `ControlComponent`.
- Emitidos (`FacturacionEmitidosComponent`): bandeja en vivo. Acciones Ver
  (detalle con `modulo='facturacion'`, editable), Facturar
  (`facturacion.vincularFactura`) y Revertir (`facturacion.revertir`, Swal
  con motivo obligatorio, deshabilitada si hay algo cobrado).
- `VincularFacturaLiqComponent` (modal): lee el QR al elegir el PDF
  (`FacturaQrService`, sin cambios), compara factura vs liquidación, avisa si
  el comprobante ya está vinculado a otra liquidación y pide confirmación si
  hay discrepancias. Llama al servicio él mismo: si falla, queda abierto con
  el PDF ya leído.
- Facturados / Revertidos: consulta one-shot por rango de períodos (default:
  últimos 3 meses); tipo y texto se filtran en memoria. Facturados: Ver, Ver
  factura (`facturacion.verFactura`), Desvincular (`facturacion.desvincular`,
  motivo obligatorio). Revertidos: Ver (detalle desde el snapshot).
- Detalle `InformeLiqNuevoDetalleComponent` (movido a
  `shared/modales/informe-liq-nuevo-detalle`, declarado en SharedModule junto
  con `AjustesLiqComponent`, ex `DescuentosComponent` de liquidación): bloque
  de factura + "Ver PDF" en facturado; alerta gris de reversión en revertido;
  aviso al editar un emitido.
- `TablaListadoComponent<T>` (`shared/tabla/tabla-listado`, interfaz
  `interfaces/tabla-listado.ts`): tabla genérica del camino nuevo (columnas
  con valor/orden/tipo/align/clase, acciones de texto con permiso
  'modulo.accion', cargando/bloqueada). La usan Borradores, Emitidos,
  Facturados y Revertidos. El caller filtra y recalcula el array solo al
  cambiar datos o filtros (no con un getter).
- `abrirUrlEnPestana` (`shared/utils/abrir-url.util.ts`): abre la pestaña
  ANTES del await (si se abre después, el bloqueador de ventanas emergentes
  la frena). Se llama sin awaits previos desde el click.
- Las fechas 'YYYY-MM-DD' se muestran con `fechaComprobanteLegible` (desde el
  frente Lazy loading + fechas delega en `fechaLegible`). Corrección: el pipe
  `date` de Angular toma 'YYYY-MM-DD' como fecha LOCAL, no como UTC; igual se
  prefiere el util para no depender de Date.
- Bundle: el modal nuevo vuelve a traer pdfjs + jsQR (`FacturaQrService`),
  +~0,5 MB al bundle inicial (8,02 → 8,54 MB) porque RaizModule importa los
  módulos de feature en forma eager (ver Deuda). RESUELTO en el frente Lazy
  loading + fechas: Facturación es lazy y pdfjs + jsQR se cargan con `import()`
  recién al leer una factura.

### Limpieza y fixes durante el frente
- F0: eliminado `raiz/facturacion/` (módulo muerto: rutas inexistentes,
  modal duplicado), su ruta en raiz-routing y los imports en
  LiquidacionModule y RaizModule.
- Fix Papelera: restaurar dejaba el listado vacío (`buscar()` se llamaba con
  `cargando = true` y `cargarPagina()` salía por su guarda). Ahora recarga
  después del `finally`.
- Fix Registro Log: textos sin espacios (paths de Storage, `qrData` en
  base64) desbordaban la tabla. `.celda-larga { overflow-wrap: anywhere; }`
  en Detalle y en los valores del diff. `anywhere` y no `break-word`: solo
  `anywhere` reduce el ancho mínimo de la celda, que es lo que manda en una
  tabla con layout automático.
- Sidebar: eliminado el link comentado a `/facturacion`.

## Deuda abierta — Facturación (camino InformeLiqNuevo)
- ~~Excel/PDF en Emitidos/Facturados/Revertidos + vistas previas~~ —
  RESUELTO en el Frente Excel/PDF (Septiembre 2026).
- Carga manual de la factura cuando el QR no se puede leer (D9;
  `origen: 'manual'` ya previsto en el tipo).
- ~~Cascada de Finanzas sobre InformeLiqNuevo~~ — RESUELTO en el Frente
  Finanzas: cobros/pagos sobre 'facturado', incobrable como ajuste; revertir
  y desvincular exigen `totalCobrado === 0` y `totalAjustado === 0`.
- `'anulado'` + `anulacion` reservados sin escritor (ver "Frente
  Facturación → Estados y gestos").
- Prueba con una factura REAL que coincida en importe y CUIT con un emitido
  de demo (camino "todo coincide"): pendiente por falta de un PDF adecuado.
  El camino con discrepancias, unicidad, ver PDF y desvincular sí se probaron.
- `FacturaQrService`: deja un `console.log` con el texto del QR. ~~Carga pdfjs
  + jsQR en el bundle inicial~~ — RESUELTO en el frente Lazy loading + fechas
  (import dinámico).
- Estilos `col-numero`/`col-moneda` definidos por componente (tabla-listado;
  `informes-tabla` se borró en el Frente Finanzas): consolidar en un estilo
  global.
- Camino viejo de Facturación: las facturas históricas viven en Supabase;
  decidir en la migración si se copian a Storage (con una herramienta nueva
  de `/migracion`). ~~`SupabaseStorageService` con anon key hardcodeada~~ y
  ~~`anularLiquidacion` en chunks no atómicos~~ — borrados en el frente Lazy
  loading + fechas (CI2 y LR1). Las anon keys siguen en el historial de git:
  rotarlas en Supabase.
  ~~`updateItem` de documento entero en vincular y en el detalle viejo;
  métodos de migración/debug en los componentes viejos~~ — los componentes
  viejos de Facturación (`facturacion-listado` / `-historico`,
  `informes-tabla`, `modal-vincular-factura`) se borraron en el Frente
  Finanzas (F9).
- Migración a Vantruck, checklist de Facturación: viejo 'anulado' → nuevo
  'revertido'; `periodoClave` en los documentos migrados; deploy del índice
  `informesLiq (estado, periodoClave)`, de las rules de
  `informesLiqSnapshots`/`facturasVinculadas` y de `storage.rules`
  (`facturas/…`) — más la verificación del bucket (ver la skill `migracion-vantruck`,
  subsección "Deuda abierta — verificar bucket de Storage de `pf-logistics`…"); poblar `facturasVinculadas` con las
  facturas históricas para que la unicidad valga también para ellas.
- ~~Finales de línea mezclados~~ — RESUELTO: `.gitattributes` +
  `.editorconfig`, todo el repo en LF (ver "Convenciones").
