import { RefCliente, RefChofer, RefProveedor } from './operacion';
import { Anulacion } from './anulacion';
import { InformeOpNuevo } from './informe-op-nuevo';

/** Informe de liquidación — modelo nuevo (camino paralelo a InformeLiq).
 *  Colección única `informesLiq`: el borrador (ex "proforma") y el emitido
 *  son el MISMO documento en distintos estados — emitir un borrador es una
 *  transición de estado, no un documento nuevo.
 *  Patrón ConId: `idInfLiq` es el id del documento Firestore — NO se persiste
 *  en el body, se agrega al leer. Mismo criterio que InformeOpNuevo.idInfOp.
 *  Espejo: InformeOpNuevo.idInfLiq apunta a este documento mientras el
 *  InformeOp está en 'proforma' o 'liquidado'. */
export interface InformeLiqNuevo {
  idInfLiq: string;

  tipo: 'cliente' | 'chofer' | 'proveedor';
  // Snapshot de la entidad — el mismo objeto que InformeOpNuevo.entidad de
  // los InformeOp que lo componen (copiado tal cual, no re-mapeado).
  entidad: RefCliente | RefChofer | RefProveedor;

  // Liquidación produce 'borrador' y 'emitido'. Facturación produce
  // 'facturado' (vincular factura), vuelve a 'emitido' (desvincular) y
  // 'revertido' (revertir un emitido: InformeOp → 'activo', re-liquidables;
  // el informe queda como registro histórico con su número).
  // 'anulado': RESERVADO — ningún flujo lo escribe (ver diseño Facturación
  // §9.1: ningún escenario relevado lo necesita). Se conserva en el tipo
  // para poder agregarlo sin migrar datos.
  estado: 'borrador' | 'emitido' | 'facturado' | 'revertido' | 'anulado';
  numeroInterno: string | null;     // null en borrador — se asigna al emitir (serie LQCL/LQCH/LQPR)

  fechaCreacion: string;            // ISO YYYY-MM-DD — alta del documento
  fechaEmision: string | null;      // ISO YYYY-MM-DD — null en borrador

  // Lo elige el usuario ANTES de seleccionar; define la ventana de fechas de
  // los InformeOp incluidos. No editable en borrador.
  periodo: PeriodoLiq;
  // 'YYYY-MM' derivado de `periodo` (InformeLiqFactoryService.clavePeriodo),
  // persistido al crear. Existe solo para consultar por RANGO de períodos
  // (índice estado + periodoClave): un texto AAAA-MM ordena igual que la
  // fecha. Nunca se edita (el período no es editable).
  periodoClave: string;

  // idInfOp de los InformeOp que lo componen — composición congelada. Es la
  // lista de refs que usan las transacciones (no pueden hacer queries) y la
  // traza histórica. No editable en borrador (no se agregan ni quitan).
  informesOp: string[];
  cantidadOperaciones: number;      // = informesOp.length — para listados sin leer los InformeOp

  valores: ValoresLiq;
  descuentos: DescuentoLiq[];
  // Frente Finanzas (FC1): anticipos / saldos a favor que se descuentan en
  // esta liquidación (total → compensaciones → neto). En borrador son una
  // propuesta (no tocan los movimientos); al emitir se APLICAN (imputación
  // con origen 'compensacion' en cada movimiento + valoresFinancieros.
  // totalCompensado); al revertir se liberan (quedan acá como historia).
  // Opcional: los docs anteriores a FC1 no lo tienen — leer con
  // compensacionesDe (shared/utils/compensacion.util.ts).
  compensaciones?: CompensacionLiq[];
  columnas: string[];               // columnas elegidas para la exportación
  observaciones: string;

  // Frente Finanzas. Los escriben: Liquidación (total al crear/editar;
  // compensaciones al emitir — FC1) y Finanzas (cobros/pagos/ajustes, en la
  // transacción del movimiento). 'facturado' es la puerta de los cobros y
  // pagos. Leer siempre con normalizarValoresFinancieros
  // (shared/utils/finanzas.util.ts): los docs anteriores al frente no tienen
  // totalCompensado / totalAjustado.
  valoresFinancieros: ValoresFinancierosLiq;
  estadoFinanciero: EstadoFinancieroLiq;

  // Los escribe Facturación al vincular la factura (→ 'facturado') y los
  // limpia al desvincular (→ 'emitido'). `facturaUrl` es el PATH del PDF en
  // Firebase Storage (no una URL pública): la URL de descarga se resuelve
  // al abrir.
  facturaUrl: string | null;
  factura: FacturaElectronicaLiq | null;

  // La escribe Facturación al revertir un emitido. Un borrador no se
  // revierte: se elimina.
  reversion: ReversionLiq | null;

  // RESERVADO (ver `estado`): ningún flujo la escribe hoy.
  anulacion: AnulacionLiq | null;
}

/** Estados posibles de un InformeLiqNuevo (alias para filtros y consultas). */
export type EstadoInformeLiqNuevo = InformeLiqNuevo['estado'];

export interface PeriodoLiq {
  anio: number;
  mes: number;                      // 1–12
  tramo: 'mes' | '1q' | '2q';
}

export interface ValoresLiq {
  totalTarifaBase: number;
  totalAcompaniante: number;
  totalKmMonto: number;
  totalAdExtra: number;
  descuentoTotal: number;
  total: number;                    // suma de los 4 totales + descuentoTotal — valor del SERVICIO
  totalContraParte: number;         // informativo — suma de contraParte.monto
  // FC1. Opcionales: los docs anteriores no los tienen — leer con netoDe /
  // compensacionesDe (shared/utils/compensacion.util.ts). Los mantiene
  // InformeLiqFactoryService (recalcularTotal / aplicarCompensaciones).
  totalCompensaciones?: number;     // Σ compensaciones.importe
  neto?: number;                    // total − totalCompensaciones (≥ 0): lo que se paga / cobra
}

/** Una compensación de la liquidación: apunta a un movimiento real de
 *  Finanzas (anticipo, préstamo o saldo a favor) con saldo sin imputar de la
 *  MISMA entidad. Snapshot de número/fecha/concepto al elegirla; `importe` es
 *  lo que se descuenta en ESTE informe (≤ disponible del movimiento). */
export interface CompensacionLiq {
  idMovimiento: string;
  numero: string;                   // 'OPG-000123'
  fecha: string;                    // 'YYYY-MM-DD' del movimiento
  concepto: 'normal' | 'anticipo' | 'prestamo';   // ConceptoMovimientoFin
  importe: number;                  // > 0
}

export interface DescuentoLiq {
  concepto: string;
  valor: number;                    // mismo criterio que el modelo viejo: se SUMA al total
}

/** Acumulados financieros de un InformeLiq (Frente Finanzas).
 *  Invariante: saldo = total − totalCompensado − totalCobrado − totalAjustado
 *  (saldoDe en shared/utils/finanzas.util.ts).
 *  - totalCompensado: anticipos/préstamos compensados en la liquidación
 *    (se aplican al emitir — FC1). No es plata nueva.
 *  - totalCobrado: plata nueva — cobros a clientes, pagos a choferes y
 *    proveedores. El nombre se conserva por el contrato con Facturación:
 *    revertir y desvincular exigen totalCobrado === 0.
 *  - totalAjustado: ajustes (incobrable, bonificación posterior, redondeo,
 *    apertura). */
export interface ValoresFinancierosLiq {
  total: number;
  totalCompensado: number;
  totalCobrado: number;
  totalAjustado: number;
  saldo: number;
}

/** Estado financiero de un InformeLiq. Para chofer/proveedor 'cobrado'
 *  significa "pagado" (mismo campo, mismo criterio). Lo deriva
 *  estadoFinancieroDe (finanzas.util); 'incobrable' solo lo pone un ajuste
 *  con ese motivo. */
export type EstadoFinancieroLiq = 'pendiente' | 'parcial' | 'cobrado' | 'incobrable';

/** Factura electrónica vinculada a un InformeLiq — datos normalizados desde
 *  el QR AFIP del PDF (el QR trae cuit, nroDocRec, ptoVta, tipoCmp, nroCmp,
 *  codAut, fecha, importe). Cliente: la emite Vantruck (se valida
 *  cuitReceptor contra la entidad). Chofer/proveedor: la emiten ellos a
 *  Vantruck (se valida cuitEmisor contra la entidad). */
export interface FacturaElectronicaLiq {
  cuitEmisor: string;          // 11 dígitos, sin guiones (QR: cuit)
  cuitReceptor: string;        // 11 dígitos, sin guiones (QR: nroDocRec)
  puntoVenta: number;          // QR: ptoVta
  tipoComprobante: number;     // código AFIP (QR: tipoCmp) — ver constantes/tipos-comprobante
  numero: number;              // QR: nroCmp
  cae: string;                 // 14 dígitos (QR: codAut)
  fecha: string;               // ISO YYYY-MM-DD — fecha del comprobante
  importe: number;
  qrData: string;              // texto completo del QR (traza/auditoría)
  origen: 'qr' | 'manual';     // hoy solo 'qr'; 'manual' = carga manual futura (D9)
  // Resultado de la validación contra el informe al vincular. Se permite
  // vincular con discrepancias (con confirmación): queda registrado acá.
  // base (FC2, F28): contra qué coincidió el importe — el total del servicio
  // o el neto (total − compensaciones); null si no coincidió. Opcional: las
  // facturas vinculadas antes de FC2 no lo tienen.
  validacion: { importeOk: boolean; cuitOk: boolean; base?: 'total' | 'neto' | null };
  vinculadaPor: string;        // email
  fechaVinculacion: string;    // ISO 8601 completo, con hora
}

/** Alias del tipo compartido (ver interfaces/anulacion.ts). RESERVADO. */
export type AnulacionLiq = Anulacion;

/** Datos de la reversión de un emitido (quién, cuándo, por qué) — mismo
 *  tipo compartido que Anulacion. */
export type ReversionLiq = Anulacion;

/** Copia congelada de los InformeOp de un InformeLiq al revertirlo —
 *  colección `informesLiqSnapshots`, doc id = idInfLiq. El detalle de un
 *  'revertido' se lee de acá (los InformeOp vivos quedan libres y pueden
 *  cambiar o re-liquidarse). Cada elemento conserva su `idInfOp`: es un
 *  elemento de array, no un documento (no aplica el patrón ConId). */
export interface InformeLiqSnapshot {
  fecha: string;                  // ISO 8601 con hora — igual a reversion.fecha
  informesOp: InformeOpNuevo[];
}

/** Índice de unicidad de facturas electrónicas: una factura → un
 *  InformeLiq. Colección `facturasVinculadas`, doc id = claveComprobante
 *  (`{cuitEmisor}_{ptoVta}_{tipoComprobante}_{numero}`, ver
 *  shared/utils/factura-electronica.util.ts). Lo crea vincularFactura y lo
 *  borra desvincularFactura. */
export interface FacturaVinculada {
  idInfLiq: string;
  numeroInterno: string | null;
  fechaVinculacion: string;       // ISO 8601 con hora
}
