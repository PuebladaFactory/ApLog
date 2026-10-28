---
name: modulo-finanzas
description: Finanzas de ApLog (colección movimientosFin, MovimientoFinService, FinanzasConsultaService) — cobros, pagos, Recibo y Orden de pago, imputación de saldos, ajustes, cuentas calculadas desde informesLiq y los generadores de demo, más el retiro del módulo viejo (movimientos, resumenFinanzas). Leer antes de trabajar sobre finanzas, cobros, pagos, cuentas o saldos.
---

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
  `estadoFinancieroDe`, FIFO, tramos; los días van con `diasEntre` /
  `diasEntreONulo` de `fecha.util`), `movimiento-fin.util`
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

## Deuda abierta — Finanzas (`movimientosFin`, camino `InformeLiqNuevo`)
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
