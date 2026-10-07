import { Anulacion } from './anulacion';
import { InformeLiqNuevo } from './informe-liq-nuevo';

/** Movimiento financiero — camino nuevo del Frente Finanzas. Colección
 *  `movimientosFin` (paralela a `movimientos` del módulo viejo, que queda
 *  intacta hasta la migración de Vantruck).
 *  Diseño: claude/diseno-finanzas.md (§4.2, §9.2, §9.3, §13).
 *
 *  - cobro (RC-000001): plata que entra (clientes).
 *  - pago (OPG-000001): plata que sale (choferes directos, proveedores).
 *  - ajuste (AJ-000001): baja de saldo SIN plata: incobrable, bonificación
 *    posterior, redondeo, apertura (migración). Sin medios; total = Σ
 *    imputaciones.
 *  Un movimiento solo se ANULA entero (no se edita): revierte todas sus
 *  imputaciones en la misma transacción y conserva su número.
 *
 *  Patrón ConId: `idMovimiento` es el id del documento — NO se persiste en
 *  el body, se agrega al leer (mismo criterio que InformeLiqNuevo.idInfLiq). */
export interface MovimientoFin {
  idMovimiento: string;

  tipo: TipoMovimientoFin;
  numero: string;                   // PREFIJO_MOVIMIENTO_FIN + '-' + 6 dígitos (NumeradorService.leerProximoNumeroMovimientoFin)
  // Día en que el dinero o el valor se recibió/entregó. 'YYYY-MM-DD', nunca
  // futura (un cheque diferido se recibe hoy; su fecha de cobro va en el
  // medio: MedioMovimientoFin.fechaCobro).
  fecha: string;
  fechaRegistro: string;            // ISO 8601 con hora — cuándo se cargó (auditoría)

  entidad: EntidadMovimientoFin;    // snapshot

  // Informativo y para filtrar: el comportamiento lo da `sinImputar`. Un
  // anticipo/préstamo es un pago (o cobro) con todo o parte sin imputar, que
  // después se compensa en una liquidación (FC1) o se imputa a un documento.
  concepto: ConceptoMovimientoFin;  // ajuste: siempre 'normal'
  motivoAjuste: MotivoAjusteFin | null;   // solo tipo 'ajuste'

  medios: MedioMovimientoFin[];     // cobro/pago: ≥ 1; ajuste: []
  total: number;                    // cobro/pago: Σ medios.importe; ajuste: Σ imputaciones.importe

  imputaciones: ImputacionFin[];
  // Ids de los documentos imputados (sin repetir) — para array-contains.
  idsDocumentos: string[];
  totalImputado: number;            // Σ imputaciones.importe
  sinImputar: number;               // total − totalImputado (≥ 0): saldo a favor / anticipo pendiente

  observaciones: string;
  estado: EstadoMovimientoFin;
  anulacion: Anulacion | null;
  usuario: string;                  // email de quien lo registró
}

export type TipoMovimientoFin = 'cobro' | 'pago' | 'ajuste';
export type TipoEntidadFin = InformeLiqNuevo['tipo'];
export type ConceptoMovimientoFin = 'normal' | 'anticipo' | 'prestamo';
export type MotivoAjusteFin = 'incobrable' | 'bonificacion' | 'redondeo' | 'apertura' | 'otro';
export type TipoMedioFin = 'efectivo' | 'transferencia' | 'cheque' | 'echeq' | 'retencion' | 'otro';
export type ImpuestoRetencionFin = 'ganancias' | 'iibb' | 'iva' | 'suss';
export type EstadoMovimientoFin = 'vigente' | 'anulado';

/** Prefijo de la numeración por tipo de movimiento (F6). */
export const PREFIJO_MOVIMIENTO_FIN: Readonly<Record<TipoMovimientoFin, string>> = {
  cobro: 'RC',
  pago: 'OPG',
  ajuste: 'AJ',
};

export interface EntidadMovimientoFin {
  tipo: TipoEntidadFin;
  id: string;
  razonSocial: string;              // chofer: "Apellido Nombre"
  cuit: number;
}

/** Un medio de cobro/pago. Las retenciones son un medio más: cancelan deuda
 *  sin mover dinero (F7: tipo + impuesto + jurisdicción + certificado).
 *  Cheque/echeq (etapa 1, F8): datos del cheque; la cartera con ciclo de
 *  vida es un frente aparte. */
export interface MedioMovimientoFin {
  tipo: TipoMedioFin;
  importe: number;                  // > 0
  referencia: string;               // nro de operación bancaria, nro de cheque, etc. ('' si no aplica)
  banco: string | null;             // transferencia / cheque / echeq
  fechaCobro: string | null;        // cheque / echeq: 'YYYY-MM-DD' (puede ser futura)
  retencion: RetencionFin | null;   // solo tipo 'retencion'
}

export interface RetencionFin {
  impuesto: ImpuestoRetencionFin;
  jurisdiccion: string | null;      // IIBB: provincia
  certificado: string;              // número de certificado
}

/** Documento al que se imputa. Hoy solo InformeLiq; se suman tipos
 *  (liquidación de comisiones de venta, saldo inicial de la migración)
 *  sin cambiar los movimientos existentes (§9.3). */
export type TipoDocumentoImputable = 'informeLiq' | 'movimientoFin';   // movimientoFin: cierre / devolución de un saldo sin imputar (F7b)

export interface DocumentoImputable {
  tipo: TipoDocumentoImputable;
  id: string;
}

/** Origen de una imputación:
 *  - 'directa': hecha en el mismo gesto que registró el movimiento.
 *  - 'saldo': aplicación posterior de un saldo a favor / anticipo
 *    (gesto Imputar saldo).
 *  - 'compensacion': anticipo/préstamo compensado en una liquidación al
 *    emitirla (FC1). Se libera si la liquidación se revierte.
 *  - 'cierre' / 'devolucion' (F7b): imputación ESPEJO en un movimiento
 *    cuyo saldo sin imputar se cerró con un ajuste o se devolvió; apunta al
 *    ajuste / devolución (documento 'movimientoFin'). Se quita al anular
 *    ese movimiento. */
export type OrigenImputacionFin = 'directa' | 'saldo' | 'compensacion' | 'cierre' | 'devolucion';

export interface ImputacionFin {
  documento: DocumentoImputable;
  numeroDocumento: string;          // numeroInterno del InformeLiq (snapshot)
  periodoClave: string | null;      // 'YYYY-MM' (InformeLiq)
  fechaFactura: string | null;      // 'YYYY-MM-DD' (null en compensaciones: el informe aún no está facturado)
  totalDocumento: number;           // total del documento al imputar
  saldoAntes: number;               // saldo del documento antes de esta imputación
  importe: number;                  // > 0
  fecha: string;                    // 'YYYY-MM-DD' de la imputación
  origen: OrigenImputacionFin;
}
