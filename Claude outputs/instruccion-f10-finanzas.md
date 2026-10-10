````
# Instrucción F10 — Finanzas: cierre del frente (CLAUDE.md, CHANGELOG.md)

## Contexto

Cierre del Frente Finanzas. Todo está probado en demo y commiteado:

- F0–F9, con sus partes F4b, F5a–F5d, F6a/b, F7a/b, F8a/b/c, F8a.1 y F8c.1;
- FC1a/b y FC2;
- G1–G3 y G4a/b.

Diseño y decisiones F1–F73: doc de proyecto `claude/diseno-finanzas.md`.

Este bloque es SOLO documentación:

1. **CLAUDE.md:**
   - Estado actual en "Estructura de módulos", "Capa de datos", "Servicios
     clave" (filas nuevas `finanzas-nueva/` y `configuracion/`; generadores
     en `desarrollo/`) y "Security Rules" (`movimientosFin`,
     `configuracion`, índice).
   - Menciones viejas en Liquidación, Facturación, Limpieza, pestaña activa
     y las secciones de Deuda: se marcan RESUELTO o se actualizan.
   - Sección NUEVA "Frente Finanzas — cobros, pagos y cuentas", antes de
     "## Deuda conocida".
   - Sección NUEVA "Deuda — Finanzas", con el checklist de migración a
     Vantruck, antes de "Pendiente — auditar fechas".
   - Las menciones históricas del frente Botones y Permisos
     (`facturacion-listado`, `informes-tabla`, `informe-liq.rules`) NO se
     tocan: son registro de lo que se hizo en su momento.
2. **CHANGELOG.md:** entrada del frente, más la lista "Pendiente"
   actualizada.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto BUSCAR no aparece, o aparece más de una vez: pará y reportá,
  sin improvisar.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar: leer, reemplazar, escribir. Nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Archivos con finales de línea LF.
- El texto a insertar va TAL CUAL. Es Markdown: las tablas, los
  `~~tachados~~` y las listas numeradas son a propósito. No hay bloques de
  código cercados adentro.
- No se toca código: no hace falta build.
- Esta instrucción termina con la línea `FIN DE LA INSTRUCCIÓN F10`. Si no la
  ves, leé el archivo completo antes de empezar.

## PASO 0 — Verificación (sin cambios)

Verificá y reportá:

- **0.1** Cada texto BUSCAR de los PASOS 1 y 2 aparece UNA sola vez en su
  archivo: 24 en CLAUDE.md, 4 en CHANGELOG.md.
- **0.2** `grep -c "## Frente Finanzas" CLAUDE.md CHANGELOG.md` → 0 en los
  dos.
- **0.3** `grep -c "### Deuda — Finanzas" CLAUDE.md` → 0.
- **0.4** `wc -l CLAUDE.md CHANGELOG.md` → reportá los números.

Si algo no coincide, pará y reportá.

## PASO 1 — CLAUDE.md

### 1.a — estructura de módulos

BUSCAR:
```
│   ├── reportes/      # (en desarrollo)
│   ├── finanzas/      # (en desarrollo)
```

REEMPLAZAR:
```
│   ├── reportes/      # Resúmenes mensuales de operaciones (resumenesOp)
│   ├── finanzas-nueva/ # Finanzas (ruta finanzas): cobros, pagos, ajustes, cuentas, antigüedad
```

### 1.b — colecciones principales

BUSCAR:
```
`comisionesVenta`, `liquidacionesVenta`, `logs`, `registroLog`,
```

REEMPLAZAR:
```
`comisionesVenta`, `liquidacionesVenta`, `movimientosFin`, `configuracion`, `logs`, `registroLog`,
```

### 1.c — servicios clave: liquidaciones/ (camino viejo)

BUSCAR:
```
reemplazado por `informes-liq/`; sin tocar hasta retirar el camino viejo |
```

REEMPLAZAR:
```
reemplazado por `informes-liq/`; sin tocar hasta retirar el camino viejo (desde el Frente Finanzas ya no escribe `resumenFinanzas`) |
```

### 1.d — servicios clave: filas nuevas finanzas-nueva/ y configuracion/

BUSCAR:
```
`LiquidacionVentaService` (emitir/pagar/revertir/anular en transacción), `ComisionesExportService` (Excel/PDF) — ver "Frente Vendedores" |
```

REEMPLAZAR:
```
`LiquidacionVentaService` (emitir/pagar/revertir/anular en transacción), `ComisionesExportService` (Excel/PDF) — ver "Frente Vendedores" |
| `finanzas-nueva/` | Finanzas: `MovimientoFinService` (registrar, anular, imputar saldo, ajustes, cerrar saldo, devolución; cada gesto en transacción con log), `FinanzasConsultaService` (solo lectura, en vivo), `FinanzasExportService` (Excel/PDF de listados y cuenta), `ReciboPdfService` (Recibo / Orden de pago) — ver "Frente Finanzas" |
| `configuracion/` | `ConfiguracionEmpresaService`: datos de la empresa (`configuracion/empresa`), lectura con caché y guardado con log — ver "Frente Finanzas" |
```

### 1.e — servicios clave: desarrollo/ (generadores de Finanzas)

BUSCAR:
```
`LimpiezaDemoService`, `GeneradorOperacionesService` — ver "Herramientas de desarrollo (solo demo)".
```

REEMPLAZAR:
```
`LimpiezaDemoService`, `GeneradorOperacionesService` — ver "Herramientas de desarrollo (solo demo)"; `GeneradorCircuitoService`, `GeneradorCobrosService` — ver "Frente Finanzas".
```

### 1.f — security rules: movimientosFin, configuracion

BUSCAR:
```
  Desplegado SOLO en demo. `informesVenta` → 'operaciones' se conserva hasta
  la migración (la colección vieja existe en Vantruck).
```

REEMPLAZAR:
```
  Desplegado SOLO en demo. `informesVenta` → 'operaciones' se conserva hasta
  la migración (la colección vieja existe en Vantruck).
- `movimientosFin` → 'finanzas' (frente Finanzas): `dev`/`admin` todo;
  `demo` leer. `configuracion` → módulo propio 'configuracion' (doc
  `configuracion/empresa`): `dev` todo; `admin` leer + crear + editar;
  `user`/`demo` leer (`PermisosService` + `ModuloPermiso` 'configuracion').
  Índice compuesto `informesLiq (estado, estadoFinanciero)`. Desplegado
  SOLO en demo. `movimientos` y `resumenFinanzas` (módulo viejo, retirado)
  conservan su mapeo a 'finanzas' hasta la migración (Vantruck tiene
  `resumenFinanzas`).
```

### 1.g — liquidación: valoresFinancieros

BUSCAR:
```
- `valoresFinancieros` / `estadoFinanciero`: se inicializan, pero la cascada de
  Finanzas es TODO.
```

REEMPLAZAR:
```
- `valoresFinancieros` / `estadoFinanciero`: los mantiene Finanzas (cobros,
  pagos, ajustes, compensaciones) — ver "Frente Finanzas".
```

### 1.h — facturación: componentes viejos

BUSCAR:
```
al viejo (`FacturacionListado`/`FacturacionHistorico`, `InformesTabla`,
`ModalVincularFactura`, Supabase no se tocaron; sus rutas y pestañas quedan
comentadas en `nueva-facturacion` y se retiran con la migración de
Vantruck).
```

REEMPLAZAR:
```
al viejo (Supabase no se tocó; los componentes viejos
`FacturacionListado`/`FacturacionHistorico`, `InformesTabla` y
`ModalVincularFactura`, con sus rutas comentadas, se borraron en el Frente
Finanzas, F9).
```

### 1.i — limpieza de demo: allowlist

BUSCAR:
```
  resumenOpMensual, resumenesOp, movimientos, resumenFinanzas, registroLog,
```

REEMPLAZAR:
```
  resumenOpMensual, resumenesOp, movimientos, movimientosFin, resumenFinanzas, registroLog,
```

### 1.j — pestaña activa: ejemplo de alias

BUSCAR:
```
(ej. 'finanzas/movimiento' → Historial, '<modulo>/alta' → Alta/Listado).
```

REEMPLAZAR:
```
(ej. 'finanzas/cuenta' → Cuentas, '<modulo>/alta' → Alta/Listado).
```

### 1.k — sección NUEVA Frente Finanzas (antes de Deuda conocida)

BUSCAR:
```
## Deuda conocida

Deuda técnica activa. Actualizar cuando se salda.
```

REEMPLAZAR:
```
## Frente Finanzas — cobros, pagos y cuentas (Octubre 2026)

Módulo nuevo sobre el camino `InformeLiqNuevo`. Reemplaza al módulo viejo
(`raiz/finanzas`, `servicios/finanzas`, `servicios/cuenta-corriente`:
`resumenLiq` / `infOpLiq*`, ids numéricos, agregado `resumenFinanzas` que
necesitaba "reparar", log fuera de la transacción), retirado en F9. Todo se
hizo y probó en demo. Diseño y decisiones F1–F73: doc de proyecto
`claude/diseno-finanzas.md`; instrucciones
`claude/instruccion-f0…f9-finanzas.md` (+ `f4b`, `f5a…f5d`, `f6a`, `f6b`,
`f7a`, `f7b`, `f8a`, `f8a1`, `f8b`, `f8c`, `f8c1`), `fc1a`, `fc1b`, `fc2`
y `g1…g4b`.

### Modelo
- Saldos EN EL INFORME (F2): `InformeLiqNuevo.valoresFinancieros`
  `{ total, totalCompensado, totalCobrado, totalAjustado, saldo }` y
  `estadoFinanciero` ('pendiente' | 'parcial' | 'cobrado' | 'incobrable';
  para chofer/proveedor 'cobrado' significa pagado). No hay agregado por
  entidad: las cuentas se calculan al consultar sobre los informes abiertos
  (emitidos + facturados con saldo) y los movimientos con `sinImputar > 0`.
- `movimientosFin` (`interfaces/movimiento-fin.ts`): `tipo` cobro | pago |
  ajuste, número `RC-000001` / `OPG-000001` / `AJ-000001`
  (`NumeradorService.leerProximoNumeroMovimientoFin`, dentro de la
  transacción), `fecha` 'YYYY-MM-DD' (día en que entró o salió la plata,
  nunca futura; la fecha de un cheque diferido va en el medio),
  `fechaRegistro`, snapshot de la entidad, `concepto` normal | anticipo |
  préstamo, `medios[]` (efectivo, transferencia, cheque, e-cheq, retención
  con impuesto + jurisdicción + certificado, otro; total = Σ medios),
  `imputaciones[]`, `idsDocumentos` (array-contains), `totalImputado`,
  `sinImputar` (saldo a favor / anticipo), `motivoAjuste`, `estado`
  vigente | anulado + `anulacion`.
- Imputación con documento generalizado (§9.3):
  `documento: { tipo: 'informeLiq' | 'movimientoFin', id }` y `origen`
  'directa' | 'saldo' | 'compensacion' | 'cierre' | 'devolucion'. Cierres y
  devoluciones de un saldo sin imputar imputan al movimiento original, que
  recibe una imputación ESPEJO ('cierre' / 'devolucion') para que su
  `sinImputar` cierre sin tocar a los consumidores.
- Compensaciones en la liquidación (FC1/FC2): `InformeLiqNuevo.compensaciones`
  (cada línea apunta a un movimiento con saldo de la misma entidad),
  `valores.totalCompensaciones` y `valores.neto` (opcionales: docs viejos
  se leen con `compensacionesDe` / `netoDe`). En borrador son una propuesta
  (se validan sin reservar); al emitir se APLICAN (imputación
  'compensacion' en el movimiento, en la transacción de emitir); en un
  emitido se editan en transacción; al revertir se liberan. Neto ≥ 0. La
  factura se valida contra el total o el neto (`factura.validacion.base`).
- `configuracion/empresa` (`DatosEmpresa`, uno por proyecto): razón social,
  CUIT (dígito verificador), condición de IVA, IIBB, inicio de actividades,
  domicilio, contacto. `ConfiguracionEmpresaService` (lectura con caché,
  guardar con log ALTA/EDITAR); pantalla Ajustes → Datos de la empresa
  (dev/admin editan, demo lee). Lo usan el Recibo / Orden de pago y el
  Generador de circuito.

### Gestos (`MovimientoFinService`; cada uno en `commitEnTransaccion` con su log)
| Gesto | Qué hace | Log |
|---|---|---|
| `registrar` | Cobro (cliente) o pago (chofer/proveedor): numerador + InformeLiq **facturados** imputados (`totalCobrado`, saldo, estado) + movimiento; anticipo/préstamo sin imputar | COBRAR / PAGAR |
| `anular(id, motivo)` | Devuelve lo imputado a cada informe (`totalCobrado` / `totalAjustado`) y quita espejos; bloqueado si el movimiento tiene compensaciones aplicadas o espejos | ANULAR |
| `imputarSaldo` | Aplica `sinImputar` a comprobantes facturados (origen 'saldo') | IMPUTAR |
| `registrarAjuste` | AJ sobre comprobantes facturados: incobrable (solo clientes, saldo completo → 'incobrable'), bonificación, redondeo (≤ $ 1.000, acción rápida "Cerrar diferencia"), otro (con observación) | AJUSTAR |
| `cerrarSaldo` / `registrarDevolucion` | Saldo sin imputar que no se va a aplicar: AJ (incobrable / redondeo / otro) o devolución en sentido inverso (OPG a un cliente, RC de un chofer/proveedor) | AJUSTAR / PAGAR / COBRAR |
| Recibo / Orden de pago | PDF (`ReciboPdfService`, jsPDF): datos de la empresa, monto en letras, medios, aplicado a, saldo a cuenta, firma, marca ANULADO | REIMPRIMIR |

Contrato con Facturación: 'facturado' es la puerta de cobros y pagos;
revertir y desvincular exigen `totalCobrado === 0` y `totalAjustado === 0`
(un ajuste ata el informe a Finanzas igual que un cobro).

### Consultas y pantallas (`raiz/finanzas-nueva/`, ruta `finanzas`, dev/admin/demo; lazy, fuera de RaizModule)
- `FinanzasConsultaService`: informes abiertos y movimientos con saldo en
  vivo, movimientos por rango de `fecha`, cuenta de una entidad, facturados
  por `factura.fecha`, compensables; filtros de cada pestaña recordados en
  la sesión. Índice compuesto `informesLiq (estado, estadoFinanciero)`.
- Utils puros en `shared/utils/`: `finanzas.util` (redondeo con tolerancia,
  `estadoFinancieroDe`, FIFO, `diasEntre`, tramos), `movimiento-fin.util`
  (validar/armar movimientos, ajustes, cierres, devoluciones, totales),
  `cuentas-finanzas.util` (`armarCuentas`: facturado, +60, sin facturar, a
  favor, tramos, días promedio ponderados por saldo, estado),
  `cuenta-entidad.util` (comprobantes, Mayor, historia),
  `resumen-finanzas.util`, `compensacion.util`, `exportacion-finanzas.util`,
  `recibo-movimiento.util`, `numero-letras.util`, `datos-empresa.util`.
- Pestañas: **Resumen** (inicial: posición a cobrar / a pagar, flujo del mes
  con selector, evolución de 6 meses, top 5 vencidos, alertas) · **Cuentas**
  (A cobrar / A pagar) · **Antigüedad** (tramos 0–30 / 31–60 / 61–90 / +90
  desde la fecha de la factura, días promedio ponderados, estado por lado:
  cobrar 60/90, pagar 15/30, con piso "Atención" si alguna factura es
  crítica) · **Movimientos** (rango + filtros; tarjetas Cobros · Pagos ·
  Devoluciones · Sin imputar · Anulados).
- Cuenta de la entidad: `finanzas/cuenta/:tipo/:id` (`?origen=` para
  volver a la pestaña de origen): tarjetas, comprobantes, movimientos,
  Mayor (liquidación al DEBE con su fecha de emisión; cobros/pagos al HABER;
  cierres y devoluciones al DEBE; compensaciones informativas sin efecto en
  el saldo; saldo final = saldo de la cuenta) e historia de un comprobante.
  El nombre de la entidad es un enlace a la cuenta en las 4 pestañas y en el
  detalle del movimiento (`enlaceCuenta`, `ColumnaListado.enlace`).
- Modales: registrar movimiento, detalle, imputar saldo, registrar ajuste,
  cerrar / devolver saldo, historia; compensaciones de la liquidación
  (`shared/modales/compensaciones-liq`). Importes con `appMonto` +
  `inputmode="decimal"`; tablas de entidades por razón social A→Z,
  historiales por fecha descendente.
- Permisos: `finanzas.ver` / `agregar` / `editar` / `anular` /
  `reimprimir`.

### Excel/PDF
`exportacion-finanzas.util` arma `LibroTabular` (Cuentas, Antigüedad,
Movimientos y la cuenta de la entidad con 4 hojas) para `generarLibro`
(`FinanzasExportService`, sin log); exporta lo que se ve (filtros, orden,
rango). El PDF va apaisado si las columnas superan el ancho vertical; los
totales del pie se alinean como su columna (jspdf-autotable no aplica
`columnStyles` al foot). Solo caracteres WinAnsi.

### Generadores de demo (`/migracion`, solo demo + rol dev)
- **Generador de circuito** (`GeneradorCircuitoService`): sobre los
  InformeOp activos de un rango, liquida con `InformeLiqService` y vincula
  facturas de prueba (PDF + QR AFIP sintético) con `vincularFactura` real;
  compensa saldos de choferes/proveedores y factura por el neto. Fechas
  realistas (G4): emisión = fin del período + 1–15 días
  (`DatosLiquidacion.fechaEmision`, validada: fin del período ≤ fecha ≤ hoy;
  la UI no la manda), factura = emisión + 0–10 días; lo que caería después
  de hoy no se liquida / no se factura; ejecución cronológica (borradores al
  final); compensa solo saldos con fecha ≤ emisión; CUIT de la empresa
  desde Datos de la empresa.
- **Generador de cobros y pagos** (`GeneradorCobrosService`), dos modos:
  Anticipos (ANTES del circuito: por chofer/proveedor y mes, día 5–25,
  10–25 % del total del mes) y Cobros y pagos (DESPUÉS: clientes a 30–60
  días con atrasados, morosos, parciales, retención IIBB y saldo a favor;
  choferes/proveedores a 2–10 días de su factura).
- Regenerar demo: Limpieza → Operaciones → Cobros (Anticipos) → Circuito →
  Cobros (Cobros y pagos). No son idempotentes. Lotes en
  `generacionesPrueba`.

### Retiro del módulo viejo (F9)
Borrados: `raiz/finanzas` (era import EAGER de `RaizModule`: el bundle
inicial bajó de 8,79 a 8,60 MB), `servicios/finanzas`,
`servicios/cuenta-corriente`, sus interfaces, `PdfService.generarMovimientoPdf`,
`StorageService.resumenFinanzas$`, las llamadas de `LiquidacionService`
(camino viejo) a `FinanzasResumenService` (ya no escribe
`resumenFinanzas`), y los componentes viejos de Facturación que lo usaban
(`facturacion-listado` / `-historico`, `informes-tabla`,
`modal-vincular-factura`, `reglas/informe-liq.rules.ts`,
`estado-informeliq`). La ruta pasó de `finanzasNueva` a `finanzas`
(carpetas y clases `finanzas-nueva` / `FinanzasNueva*` sin cambio). Se
conservan: las colecciones `movimientos` / `resumenFinanzas` en Vantruck y
sus mapeos en `firestore.rules` (ver "Deuda — Finanzas").

## Deuda conocida

Deuda técnica activa. Actualizar cuando se salda.
```

### 1.l — deuda liquidación: cascada de Finanzas

BUSCAR:
```
- Cascada de Finanzas sobre `InformeLiqNuevo` (resumenFinanzas, cuenta
  corriente, aging, movimientos, ledger, informe-liq-cuenta-corriente siguen
  leyendo las colecciones viejas), incluido el impacto de editar un emitido.
```

REEMPLAZAR:
```
- ~~Cascada de Finanzas sobre `InformeLiqNuevo`~~ — RESUELTO en el Frente
  Finanzas (saldos en `valoresFinancieros`, cuentas calculadas al consultar;
  editar un emitido respeta neto ≥ 0 con compensaciones).
```

### 1.m — deuda liquidación: pantallas viejas

BUSCAR:
```
- Pantallas viejas que leen por `InformeOpService.obtenerPorIdsOperacion`
  (proforma, facturación vieja) no filtran InformeOp 'anulado'. Se retiran
  con el camino viejo.
```

REEMPLAZAR:
```
- Pantallas viejas que leen por `InformeOpService.obtenerPorIdsOperacion`
  (proforma; la facturación vieja se borró en el Frente Finanzas) no filtran
  InformeOp 'anulado'. Se retiran con el camino viejo.
```

### 1.n — deuda facturación: cascada de Finanzas

BUSCAR:
```
- Cascada de Finanzas sobre InformeLiqNuevo: cobros/pagos sobre 'facturado'
  y estado incobrable en Finanzas (en lugar de un "anular definitivo"). Las
  guardas `totalCobrado === 0` de revertir/desvincular ya están.
```

REEMPLAZAR:
```
- ~~Cascada de Finanzas sobre InformeLiqNuevo~~ — RESUELTO en el Frente
  Finanzas: cobros/pagos sobre 'facturado', incobrable como ajuste; revertir
  y desvincular exigen `totalCobrado === 0` y `totalAjustado === 0`.
```

### 1.o — deuda facturación: estilos

BUSCAR:
```
- Estilos `col-numero`/`col-moneda` definidos por componente (tabla-listado,
  informes-tabla): consolidar en un estilo global.
```

REEMPLAZAR:
```
- Estilos `col-numero`/`col-moneda` definidos por componente (tabla-listado;
  `informes-tabla` se borró en el Frente Finanzas): consolidar en un estilo
  global.
```

### 1.p — deuda facturación: camino viejo

BUSCAR:
```
  copian a Storage); `anularLiquidacion` en chunks no atómicos, con Finanzas
  fuera del batch y sin guarda de cobros; `updateItem` de documento entero en
  vincular y en el detalle viejo (pisa `totalCobrado`); métodos de
  migración/debug con escrituras masivas en los componentes viejos
  (`actualizarInformesLiq`, `construirResumenEntidad`,
  `migrarInformesAFinanzas`, `actualizarObjeto`).
```

REEMPLAZAR:
```
  copian a Storage); `anularLiquidacion` en chunks no atómicos y sin guarda
  de cobros (desde el Frente Finanzas ya no escribe `resumenFinanzas`).
  ~~`updateItem` de documento entero en vincular y en el detalle viejo;
  métodos de migración/debug en los componentes viejos~~ — los componentes
  viejos de Facturación (`facturacion-listado` / `-historico`,
  `informes-tabla`, `modal-vincular-factura`) se borraron en el Frente
  Finanzas (F9).
```

### 1.q — deuda RaizModule: Finanzas ya no es eager

BUSCAR:
```
NuevaFacturacion, Finanzas, Reportes), que además se cargan lazy desde
```

REEMPLAZAR:
```
NuevaFacturacion, Reportes; Finanzas salió en el Frente Finanzas), que además se cargan lazy desde
```

### 1.r — deuda vendedores: pago sin movimiento

BUSCAR:
```
- Pagar una liquidación no genera movimiento financiero (falta el frente de
  herramientas de pago de Finanzas).
```

REEMPLAZAR:
```
- Pagar una liquidación no genera movimiento financiero (integrarlo como
  movimiento de Finanzas: V-a, frente aparte; ver "Deuda — Finanzas").
```

### 1.s — deuda vendedores: col-numero

BUSCAR:
```
- `.col-numero` está repetida en el tablero, el historial, el detalle de
  liquidación e `informes-tabla` → consolidar en un estilo global.
```

REEMPLAZAR:
```
- `.col-numero` está repetida en el tablero, el historial y el detalle de
  liquidación (y en `tabla-listado`) → consolidar en un estilo global.
```

### 1.t — sección NUEVA Deuda — Finanzas (antes de Pendiente — auditar fechas)

BUSCAR:
```
### Pendiente — auditar fechas 'YYYY-MM-DD' vs huso horario en toda la app
```

REEMPLAZAR:
```
### Deuda — Finanzas (`movimientosFin`, camino `InformeLiqNuevo`)
- Migración a Vantruck, checklist de Finanzas (después del backup
  completo):
  1. Deploy en `pf-logistics` de las reglas de `movimientosFin` ('finanzas')
     y `configuracion` (módulo 'configuracion') y del índice
     `informesLiq (estado, estadoFinanciero)`, junto con el código nuevo.
  2. Cargar Ajustes → Datos de la empresa (lo usan el Recibo / Orden de
     pago).
  3. Liquidaciones históricas: conservar su `fechaEmision` real
     (`DatosLiquidacion.fechaEmision` ya lo permite); si no, el Mayor
     muestra los cobros antes que sus liquidaciones.
  4. Apertura (§9.4 del diseño): fecha de corte, AJ con motivo 'apertura'
     para lo resuelto antes del corte, saldos reales de lo impago;
     documento `saldoInicial` para deudas anteriores a la app (hoy
     `TipoDocumentoImputable` es 'informeLiq' | 'movimientoFin': agregarlo);
     importador desde Excel en `/migracion`. Conciliar saldos por entidad
     con la empresa.
  5. Ajustes "Adelanto / Anticipo / Préstamo" ya cargados como `descuentos`
     en liquidaciones de Vantruck (F32): quedan como historia o se
     convierten en compensaciones contra un anticipo de apertura.
  6. Después: borrar `movimientos` y `resumenFinanzas`, sus mapeos en
     `firestore.rules` y sus entradas en `LimpiezaDemoService`;
     `NumeradorService.leerProximoNumeroMovimiento` (módulo viejo, sin uso;
     el contador `numeradores/RC` es el mismo documento que usan los RC
     nuevos).
- Frentes aparte (fuera de este): cartera de cheques con ciclo de vida
  (hoy el cheque es un medio con datos); pago de liquidaciones de
  vendedores como movimiento (V-a); plazo de pago por entidad (hoy la
  antigüedad cuenta desde la factura); antigüedad "a una fecha pasada"
  (hoy al día de hoy).
- Las cuentas se calculan en memoria desde los informes abiertos y los
  movimientos con saldo (sin agregado): si el volumen abierto crece mucho,
  evaluar un agregado por entidad con 'fusionar' + increment.
- El Recibo / Orden de pago es un comprobante interno, no fiscal.
- Generadores de demo no idempotentes: para rehacer, Limpieza y regenerar
  en el orden de "Frente Finanzas → Generadores de demo".

### Pendiente — auditar fechas 'YYYY-MM-DD' vs huso horario en toda la app
```

### 1.u — auditar fechas: archivos borrados

BUSCAR:
```
  anterior en Argentina (el 1/1 cae en el año anterior): `excel.service`,
  `facturacion-historico`, `facturacion-listado`, `liquidaciones-op`,
  `proforma`. También `pdf.service` y `cuenta-corriente.service` con
  `new Date(<fecha>)`.
```

REEMPLAZAR:
```
  anterior en Argentina (el 1/1 cae en el año anterior): `excel.service`,
  `liquidaciones-op`, `proforma` (`facturacion-historico` / `-listado` y
  `cuenta-corriente.service` se borraron en el Frente Finanzas). También
  `pdf.service` con `new Date(<fecha>)`.
```

### 1.v — auditar fechas: Finanzas

BUSCAR:
```
  `papelera`, `baja-objeto`; además Finanzas, `StorageService` y servicios
```

REEMPLAZAR:
```
  `papelera`, `baja-objeto`; además `StorageService` y servicios
```

### 1.w — deuda generador: Finanzas sobre colecciones purgadas

BUSCAR:
```
  Frente Vendedores (los vendedores se desactivan); Finanzas lee/escribe
  colecciones purgadas en demo (`resumenLiq`, `infOpLiq*`: sus pantallas
  quedan vacías en demo; se resuelve en su frente; Vendedores ya no usa
  `resumenVenta`); `firestore.rules` conserva el mapeo de las
```

REEMPLAZAR:
```
  Frente Vendedores (los vendedores se desactivan); ~~Finanzas lee/escribe
  colecciones purgadas en demo~~ — resuelto en el Frente Finanzas (módulo
  nuevo sobre `informesLiq` / `movimientosFin`; Vendedores ya no usa
  `resumenVenta`); `firestore.rules` conserva el mapeo de las
```

### 1.x — deuda excel/pdf: servicios viejos

BUSCAR:
```
  `exportToPdfInforme` en LiquidacionesOp, Proforma, FacturacionListado,
  FacturacionHistorico y objeto-papelera) y por los demás informes de la app
  (operaciones, asignaciones, clientes, choferes, movimientos; el resumen
  de Reportes ya sale de `generarLibro`, ver "Frente Reportes", y las
  comisiones de venta de `ComisionesExportService`, ver "Frente
  Vendedores"). Se retiran los de liquidación con el camino viejo
```

REEMPLAZAR:
```
  `exportToPdfInforme` en LiquidacionesOp, Proforma y objeto-papelera;
  FacturacionListado / FacturacionHistorico se borraron en el Frente
  Finanzas) y por los demás informes de la app (operaciones, asignaciones,
  clientes, choferes; el resumen de Reportes ya sale de `generarLibro`, ver
  "Frente Reportes", las comisiones de venta de `ComisionesExportService`,
  ver "Frente Vendedores", y Finanzas de `FinanzasExportService` /
  `ReciboPdfService`, ver "Frente Finanzas"). Se retiran los de liquidación con el camino viejo
```

## PASO 2 — CHANGELOG.md

### 2.a — entrada NUEVA del frente (antes de ### Pendiente)

BUSCAR:
```
Detalle completo en `CLAUDE.md` → "Frente Vendedores — comisiones de venta".

**Verificación:** `ng build --configuration=demo` limpio.

---

### Pendiente
```

REEMPLAZAR:
```
Detalle completo en `CLAUDE.md` → "Frente Vendedores — comisiones de venta".

**Verificación:** `ng build --configuration=demo` limpio.

---

## Frente Finanzas — cobros, pagos y cuentas (Octubre 2026)

- Módulo nuevo `raiz/finanzas-nueva` (ruta `finanzas`, dev/admin/demo,
  lazy): pestañas Resumen (posición, flujo del mes, evolución de 6 meses,
  top 5, alertas), Cuentas, Antigüedad (tramos, días promedio ponderados,
  estado por lado) y Movimientos; página Cuenta de la entidad con
  comprobantes, movimientos, Mayor e historia de un comprobante; el nombre
  de la entidad enlaza a su cuenta.
- Saldos en el informe (`valoresFinancieros` con `totalCompensado` /
  `totalCobrado` / `totalAjustado`; `estadoFinanciero` + 'incobrable') y
  cuentas calculadas al consultar, sin agregado por entidad.
- Colección nueva `movimientosFin` (RC / OPG / AJ): cobros y pagos con
  varios medios (transferencia, cheque, e-cheq, efectivo, retenciones),
  anticipos y préstamos sin imputar, imputar saldo, anular, ajustes
  (incobrable, bonificación, redondeo, otro), cierre de saldos y
  devoluciones; cada gesto en una transacción con su log.
- Compensaciones en la liquidación (anticipos / saldos a favor descontados
  en el borrador, aplicados al emitir, liberados al revertir); neto en el
  PDF/Excel de la liquidación; la factura se valida contra el total o el
  neto.
- Excel/PDF de Cuentas, Antigüedad, Movimientos y la cuenta de la entidad;
  Recibo / Orden de pago en PDF con monto en letras.
- Datos de la empresa (`configuracion/empresa`, Ajustes → Datos de la
  empresa) con módulo de permisos 'configuracion'.
- Facturación: desvincular también exige `totalAjustado = 0`.
- Generadores de demo: Circuito (liquidar, facturar, compensar, con fechas
  realistas) y Cobros y pagos (modos Anticipos y Cobros y pagos);
  `DatosLiquidacion.fechaEmision` opcional para cargar liquidaciones con
  fecha pasada.
- Reglas: `movimientosFin` ('finanzas') y `configuracion`; índice
  `informesLiq (estado, estadoFinanciero)` (desplegado solo en demo).
- Retiro del módulo viejo (`raiz/finanzas`, `servicios/finanzas`,
  `servicios/cuenta-corriente`, interfaces, `resumenFinanzas$`,
  `generarMovimientoPdf`, llamadas de `LiquidacionService`) y de los
  componentes viejos de Facturación que dependían de él; `FinanzasModule`
  ya no se importa en `RaizModule` (bundle inicial 8,79 → 8,60 MB).

Detalle completo en `CLAUDE.md` → "Frente Finanzas — cobros, pagos y cuentas".

**Verificación:** `ng build --configuration=demo` limpio.

---

### Pendiente
```

### 2.b — pendiente: Finanzas

BUSCAR:
```
- Finanzas: cascada sobre InformeLiqNuevo (cobros/pagos sobre 'facturado',
  cuenta corriente, aging, ledger, incobrable); hoy lee las colecciones
  viejas.
```

REEMPLAZAR:
```
- Finanzas (frentes aparte): cartera de cheques, pago de liquidaciones de
  vendedores como movimiento, plazo de pago por entidad.
```

### 2.c — pendiente: estilo global

BUSCAR:
```
- Estilo global `.col-numero` (hoy repetido en Vendedores e
  `informes-tabla`).
```

REEMPLAZAR:
```
- Estilo global `.col-numero` (hoy repetido en Vendedores y
  `tabla-listado`).
```

### 2.d — pendiente: migración a Vantruck

BUSCAR:
```
  `informesOp` / `resumenesOp` / `comisionesVenta` / `liquidacionesVenta`),
  Recálculo de `resumenesOp` y de `comisionesVenta` sobre el histórico,
  vendedores y asignaciones (mapa de idCliente viejo), lo pagado con
  `resumenVenta`, borrado de `resumenOpMensual` / `informesVenta` /
  `resumenVenta`, y retiro del camino viejo (LiquidacionesOp, Proforma,
  facturación vieja, exportaciones viejas de liquidación).
```

REEMPLAZAR:
```
  `informesOp` / `resumenesOp` / `comisionesVenta` / `liquidacionesVenta` /
  `movimientosFin` / `configuracion` y el índice
  `informesLiq (estado, estadoFinanciero)`), Recálculo de `resumenesOp` y
  de `comisionesVenta` sobre el histórico, vendedores y asignaciones (mapa
  de idCliente viejo), lo pagado con `resumenVenta`, Datos de la empresa,
  apertura de Finanzas (fecha de corte, saldos reales, importador),
  liquidaciones históricas con su `fechaEmision` real, borrado de
  `resumenOpMensual` / `informesVenta` / `resumenVenta` / `movimientos` /
  `resumenFinanzas`, y retiro del camino viejo (LiquidacionesOp, Proforma,
  exportaciones viejas de liquidación).
```

## Verificación

Corré y reportá:

- `grep -c "## Frente Finanzas — cobros, pagos y cuentas" CLAUDE.md CHANGELOG.md`
  → 1 en cada uno.
- `grep -c "### Deuda — Finanzas" CLAUDE.md` → 1.
- `grep -n "(en desarrollo)" CLAUDE.md` → no aparece en "Estructura de
  módulos".
- `grep -n "resumenFinanzas" CLAUDE.md` → reportá la lista. Las apariciones
  que quedan tienen que ser históricas, tachadas o marcadas RESUELTO, o
  estar en la sección del frente, en su deuda, en "Security Rules" o en la
  Limpieza.
- `git diff --stat` → solo CLAUDE.md y CHANGELOG.md.

## Revisión (Nico)

Leé:

- en CLAUDE.md, las secciones "Frente Finanzas" y "Deuda — Finanzas";
- en CHANGELOG.md, la entrada del frente y "Pendiente".

## Commit (lo hace Nico)

```
docs(finanzas): cierre del Frente Finanzas (F10)

- CLAUDE.md: sección "Frente Finanzas — cobros, pagos y cuentas" y "Deuda —
  Finanzas" (checklist de migración a Vantruck); estructura, colecciones,
  servicios, reglas y deudas de otros frentes actualizadas.
- CHANGELOG.md: entrada del frente y Pendiente actualizado.
```

FIN DE LA INSTRUCCIÓN F10
````
