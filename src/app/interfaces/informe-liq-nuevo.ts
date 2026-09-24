import { RefCliente, RefChofer, RefProveedor } from './operacion';

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

  // 'facturado' / 'anulado' los escribe el módulo Facturación (fuera de este
  // frente). Liquidación solo produce 'borrador' y 'emitido'.
  estado: 'borrador' | 'emitido' | 'facturado' | 'anulado';
  numeroInterno: string | null;     // null en borrador — se asigna al emitir (serie LQCL/LQCH/LQPR)

  fechaCreacion: string;            // ISO YYYY-MM-DD — alta del documento
  fechaEmision: string | null;      // ISO YYYY-MM-DD — null en borrador

  // Lo elige el usuario ANTES de seleccionar; define la ventana de fechas de
  // los InformeOp incluidos. No editable en borrador.
  periodo: PeriodoLiq;

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

  // Los escribe Facturación (fuera de este frente).
  facturaUrl: string | null;
  factura: FacturaElectronicaLiq | null;

  // La escribe Facturación al anular un emitido (fuera de este frente). Un
  // borrador no se anula: se elimina.
  anulacion: AnulacionLiq | null;
}

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

export interface FacturaElectronicaLiq {
  cuit: string;
  nroDocRec: string;
  cae: string;
  numero: string;
  puntoVenta: string;
  tipoComprobante: string;
  fecha: string;
  importe: number;
  qrData?: string;
}

export interface AnulacionLiq {
  motivo: string;
  usuario: string;
  fecha: string;
}
