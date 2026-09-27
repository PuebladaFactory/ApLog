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
  columnas: string[];               // columnas elegidas para la exportación
  observaciones: string;

  // TODO Finanzas: se inicializan al crear, pero ningún servicio de Finanzas
  // los lee todavía (la cascada resumenFinanzas/cuenta corriente/aging es un
  // frente propio).
  valoresFinancieros: ValoresFinancierosLiq;
  estadoFinanciero: 'pendiente' | 'parcial' | 'cobrado';

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
  total: number;                    // suma de los 4 totales + descuentoTotal
  totalContraParte: number;         // informativo — suma de contraParte.monto
}

export interface DescuentoLiq {
  concepto: string;
  valor: number;                    // mismo criterio que el modelo viejo: se SUMA al total
}

export interface ValoresFinancierosLiq {
  total: number;
  totalCobrado: number;
  saldo: number;
}

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
  validacion: { importeOk: boolean; cuitOk: boolean };
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
