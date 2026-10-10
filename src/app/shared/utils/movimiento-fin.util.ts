import { InformeLiqNuevo, ValoresFinancierosLiq } from 'src/app/interfaces/informe-liq-nuevo';
import {
  ConceptoMovimientoFin, EntidadMovimientoFin, EstadoMovimientoFin, ImpuestoRetencionFin, ImputacionFin,
  MedioMovimientoFin, MotivoAjusteFin, MovimientoFin, OrigenImputacionFin, TipoDocumentoImputable, TipoEntidadFin,
  TipoMedioFin, TipoMovimientoFin,
} from 'src/app/interfaces/movimiento-fin';
import {
  AcumuladoFinanciero, diasEntre, esCero, importesIguales, redondear2, totalMedios, TOLERANCIA_IMPORTE,
} from 'src/app/shared/utils/finanzas.util';

/** Armado y validación PUROS de movimientos de Finanzas (sin Firestore ni
 *  Angular). Los usa MovimientoFinService dentro de su transacción y la UI
 *  para validar antes de confirmar. Diseño: claude/diseno-finanzas.md §4.2,
 *  §9.1, §9.2. */

/** Una imputación pedida por la UI: a qué InformeLiq y cuánto. */
export interface ImputacionSolicitada {
  idInfLiq: string;
  importe: number;
}

/** Datos de un cobro / pago a registrar. */
export interface DatosMovimientoFin {
  tipo: 'cobro' | 'pago';
  entidad: EntidadMovimientoFin;
  fecha: string;                         // 'YYYY-MM-DD', ≤ hoy
  concepto: ConceptoMovimientoFin;
  medios: MedioMovimientoFin[];
  imputaciones: ImputacionSolicitada[];  // concepto 'normal': ≥ 1; anticipo/préstamo: ninguna
  observaciones: string;
}

export const ETIQUETA_MEDIO: Readonly<Record<TipoMedioFin, string>> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  cheque: 'Cheque',
  echeq: 'E-cheq',
  retencion: 'Retención',
  otro: 'Otro',
};

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Cliente → cobro (plata que entra); chofer/proveedor → pago. */
export function tipoMovimientoPara(tipoEntidad: TipoEntidadFin): 'cobro' | 'pago' {
  return tipoEntidad === 'cliente' ? 'cobro' : 'pago';
}

/** Medio listo para persistir: importe redondeado, textos recortados y en
 *  null los campos que no aplican a su tipo (Firestore no acepta undefined). */
export function normalizarMedio(m: MedioMovimientoFin): MedioMovimientoFin {
  const conBanco = m.tipo === 'transferencia' || m.tipo === 'cheque' || m.tipo === 'echeq';
  const esCheque = m.tipo === 'cheque' || m.tipo === 'echeq';
  return {
    tipo: m.tipo,
    importe: redondear2(Number(m.importe) || 0),
    referencia: (m.referencia ?? '').trim(),
    banco: conBanco && m.banco?.trim() ? m.banco.trim() : null,
    fechaCobro: esCheque && m.fechaCobro ? m.fechaCobro : null,
    retencion: m.tipo === 'retencion' && m.retencion
      ? {
          impuesto: m.retencion.impuesto,
          jurisdiccion: m.retencion.jurisdiccion?.trim() ? m.retencion.jurisdiccion.trim() : null,
          certificado: (m.retencion.certificado ?? '').trim(),
        }
      : null,
  };
}

/** Datos normalizados: medios normalizados, importes de imputación
 *  redondeados (las de importe 0 se descartan), observaciones recortadas. */
export function normalizarDatosMovimiento(d: DatosMovimientoFin): DatosMovimientoFin {
  return {
    ...d,
    medios: d.medios.map(normalizarMedio),
    imputaciones: d.imputaciones
      .map(i => ({ idInfLiq: i.idInfLiq, importe: redondear2(Number(i.importe) || 0) }))
      .filter(i => !esCero(i.importe)),
    observaciones: (d.observaciones ?? '').trim(),
  };
}

/** Validación previa, sin lecturas (los saldos de los informes se validan
 *  en la transacción). Recibe datos YA normalizados. Devuelve el mensaje de
 *  error o null. */
export function validarDatosMovimiento(d: DatosMovimientoFin, hoy: string): string | null {
  if (d.tipo !== tipoMovimientoPara(d.entidad.tipo)) {
    return d.entidad.tipo === 'cliente'
      ? 'A un cliente se le registra un cobro, no un pago.'
      : 'A un chofer o proveedor se le registra un pago, no un cobro.';
  }
  if (!d.entidad.id) return 'Falta la entidad.';
  if (d.concepto === 'prestamo' && d.tipo !== 'pago') return 'Un préstamo solo se registra como pago.';
  if (!FORMATO_FECHA.test(d.fecha)) return 'Fecha inválida.';
  if (d.fecha > hoy) return 'La fecha no puede ser futura (un cheque diferido lleva su fecha de cobro en el medio).';

  if (d.medios.length === 0) return 'Agregá al menos un medio de cobro/pago.';
  for (const m of d.medios) {
    if (!(m.importe >= 0.01)) return `Importe inválido en un medio (${ETIQUETA_MEDIO[m.tipo] ?? m.tipo}).`;
    if (m.tipo === 'retencion') {
      if (!m.retencion) return 'A la retención le falta el impuesto.';
      if (!m.retencion.certificado) return 'A la retención le falta el número de certificado.';
    }
    if (m.fechaCobro !== null && !FORMATO_FECHA.test(m.fechaCobro)) return 'Fecha de cobro del cheque inválida.';
  }

  const ids = d.imputaciones.map(i => i.idInfLiq);
  if (new Set(ids).size !== ids.length) return 'Un comprobante aparece más de una vez.';
  if (d.imputaciones.some(i => !(i.importe > 0))) return 'Hay un importe a imputar inválido.';

  if (d.concepto === 'normal' && d.imputaciones.length === 0) {
    return 'Elegí al menos un comprobante a cancelar, o registralo como anticipo.';
  }
  if (d.concepto !== 'normal' && d.imputaciones.length > 0) {
    return 'Un anticipo o préstamo no se imputa a comprobantes al registrarlo (se compensa después).';
  }

  const total = totalMedios(d.medios);
  const imputado = redondear2(d.imputaciones.reduce((acc, i) => acc + i.importe, 0));
  if (imputado - total > TOLERANCIA_IMPORTE) {
    return `Lo imputado (${imputado.toFixed(2)}) supera el total de los medios (${total.toFixed(2)}).`;
  }
  return null;
}

/** Reglas sobre el InformeLiq RELEÍDO en la transacción: facturado y de la
 *  misma entidad. Tira Error (aborta la transacción). El saldo lo valida
 *  aplicarImporte. */
export function validarDocumentoImputable(
  liq: InformeLiqNuevo,
  idInfLiq: string,
  entidad: EntidadMovimientoFin,
): void {
  const nro = liq.numeroInterno ?? idInfLiq;
  if (liq.estado !== 'facturado') {
    throw new Error(`El informe ${nro} está en estado '${liq.estado}': solo se cobra/paga un informe facturado.`);
  }
  if (liq.tipo !== entidad.tipo || liq.entidad.id !== entidad.id) {
    throw new Error(`El informe ${nro} no pertenece a ${entidad.razonSocial}.`);
  }
}

/** Snapshot de una imputación (con el saldo del documento ANTES de imputar). */
export function armarImputacion(
  liq: InformeLiqNuevo,
  idInfLiq: string,
  vfAntes: ValoresFinancierosLiq,
  importe: number,
  fecha: string,
  origen: OrigenImputacionFin,
): ImputacionFin {
  return {
    documento: { tipo: 'informeLiq', id: idInfLiq },
    numeroDocumento: liq.numeroInterno ?? idInfLiq,
    periodoClave: liq.periodoClave ?? null,
    fechaFactura: liq.factura?.fecha ?? null,
    totalDocumento: vfAntes.total,
    saldoAntes: vfAntes.saldo,
    importe: redondear2(importe),
    fecha,
    origen,
  };
}

/** Cuerpo del movimiento a persistir (sin idMovimiento: patrón ConId). */
export function armarMovimiento(p: {
  datos: DatosMovimientoFin;
  numero: string;
  fechaRegistro: string;
  usuario: string;
  imputaciones: ImputacionFin[];
}): Omit<MovimientoFin, 'idMovimiento'> {
  const total = totalMedios(p.datos.medios);
  const totalImputado = redondear2(p.imputaciones.reduce((acc, i) => acc + i.importe, 0));
  const sinImputar = redondear2(total - totalImputado);
  return {
    tipo: p.datos.tipo,
    numero: p.numero,
    fecha: p.datos.fecha,
    fechaRegistro: p.fechaRegistro,
    entidad: { ...p.datos.entidad },
    concepto: p.datos.concepto,
    motivoAjuste: null,
    medios: p.datos.medios.map(m => ({ ...m })),
    total,
    imputaciones: p.imputaciones,
    idsDocumentos: [...new Set(p.imputaciones.map(i => i.documento.id))],
    totalImputado,
    sinImputar: esCero(sinImputar) ? 0 : sinImputar,
    observaciones: p.datos.observaciones,
    estado: 'vigente',
    anulacion: null,
    usuario: p.usuario,
  };
}

// ---------------------------------------------------------------------------
// Etiquetas (F4)
// ---------------------------------------------------------------------------

export const ETIQUETA_TIPO_MOVIMIENTO: Readonly<Record<TipoMovimientoFin, string>> = {
  cobro: 'Cobro',
  pago: 'Pago',
  ajuste: 'Ajuste',
};

export const ETIQUETA_CONCEPTO: Readonly<Record<ConceptoMovimientoFin, string>> = {
  normal: 'Comprobantes',
  anticipo: 'Anticipo',
  prestamo: 'Préstamo',
};

export const ETIQUETA_IMPUESTO: Readonly<Record<ImpuestoRetencionFin, string>> = {
  ganancias: 'Ganancias',
  iibb: 'Ingresos Brutos',
  iva: 'IVA',
  suss: 'SUSS',
};

export const ETIQUETA_MOTIVO_AJUSTE: Readonly<Record<MotivoAjusteFin, string>> = {
  incobrable: 'Incobrable',
  bonificacion: 'Bonificación',
  redondeo: 'Redondeo',
  apertura: 'Saldo de apertura',
  otro: 'Otro',
};

export const ETIQUETA_ORIGEN_IMPUTACION: Readonly<Record<OrigenImputacionFin, string>> = {
  directa: 'Al registrar',
  saldo: 'Imputación de saldo',
  compensacion: 'Compensación en liquidación',
  cierre: 'Cierre de saldo (ajuste)',
  devolucion: 'Devolución',
};

/** "Transferencia + Retención": tipos distintos, en el orden en que aparecen. */
export function resumenMedios(medios: MedioMovimientoFin[]): string {
  const tipos = [...new Set(medios.map(m => m.tipo))];
  return tipos.length === 0 ? '—' : tipos.map(t => ETIQUETA_MEDIO[t] ?? t).join(' + ');
}

// ---------------------------------------------------------------------------
// Historial (F4): rango, filtros y totales
// ---------------------------------------------------------------------------

/** Filtros de la pestaña Movimientos. `desde`/`hasta` definen la consulta
 *  (rango sobre `fecha`); tipo, estado y texto se aplican en memoria. */
export interface FiltrosMovimientosFin {
  desde: string;                          // 'YYYY-MM-DD'
  hasta: string;                          // 'YYYY-MM-DD'
  tipo: TipoMovimientoFin | 'todos';
  estado: EstadoMovimientoFin | 'todos';
  texto: string;                          // número, razón social o CUIT
}

/** Tope del rango de la consulta (un listener sobre un año de movimientos). */
export const MAX_DIAS_RANGO_MOVIMIENTOS = 366;

/** Rango por defecto: desde el día 1 de dos meses atrás hasta hoy
 *  (hoy = '2026-10-05' → '2026-08-01' … '2026-10-05'). */
export function rangoInicialMovimientos(hoy: string): { desde: string; hasta: string } {
  const [a, m] = hoy.split('-').map(Number);
  const meses = a * 12 + (m - 1) - 2;
  const anio = Math.floor(meses / 12);
  const mes = (meses % 12) + 1;
  return { desde: `${anio}-${String(mes).padStart(2, '0')}-01`, hasta: hoy };
}

/** Mensaje de error del rango, o null si es válido. */
export function validarRangoMovimientos(desde: string, hasta: string): string | null {
  if (!FORMATO_FECHA.test(desde ?? '') || !FORMATO_FECHA.test(hasta ?? '')) return 'Elegí las dos fechas del rango.';
  if (desde > hasta) return 'La fecha "desde" es posterior a la fecha "hasta".';
  if (diasEntre(desde, hasta) > MAX_DIAS_RANGO_MOVIMIENTOS) {
    return `El rango no puede superar ${MAX_DIAS_RANGO_MOVIMIENTOS} días.`;
  }
  return null;
}

type MovimientoFiltrable = Pick<MovimientoFin, 'tipo' | 'estado' | 'numero' | 'entidad'>;

/** Filtros en memoria (tipo, estado, texto). No toca el rango. */
export function filtrarMovimientos<M extends MovimientoFiltrable>(
  movimientos: M[],
  f: Pick<FiltrosMovimientosFin, 'tipo' | 'estado' | 'texto'>,
): M[] {
  const texto = (f.texto ?? '').trim().toLowerCase();
  return movimientos.filter(m =>
    (f.tipo === 'todos' || m.tipo === f.tipo) &&
    (f.estado === 'todos' || m.estado === f.estado) &&
    (!texto ||
      m.numero.toLowerCase().includes(texto) ||
      m.entidad.razonSocial.toLowerCase().includes(texto) ||
      String(m.entidad.cuit).includes(texto)));
}

export interface TotalesMovimientos {
  cobros: number;
  cantidadCobros: number;
  pagos: number;
  cantidadPagos: number;
  devoluciones: number;                   // F9 (F72): cobros/pagos contra el saldo de otro movimiento
  cantidadDevoluciones: number;
  sinImputar: number;                     // Σ sinImputar de cobros/pagos vigentes
  anulados: number;                       // cantidad
}

/** Totales de las tarjetas. Solo suman los VIGENTES; los anulados se
 *  cuentan aparte. Los ajustes no suman. Las devoluciones (F7b) van en su
 *  propia tarjeta, no en Cobros / Pagos (F72). */
export function totalizarMovimientos(
  movimientos: Pick<MovimientoFin, 'tipo' | 'estado' | 'total' | 'sinImputar' | 'imputaciones'>[],
): TotalesMovimientos {
  const t: TotalesMovimientos = {
    cobros: 0, cantidadCobros: 0, pagos: 0, cantidadPagos: 0, devoluciones: 0, cantidadDevoluciones: 0,
    sinImputar: 0, anulados: 0,
  };
  for (const m of movimientos) {
    if (m.estado === 'anulado') {
      t.anulados++;
      continue;
    }
    if (esDevolucion(m)) {
      t.devoluciones += m.total;
      t.cantidadDevoluciones++;
    } else if (m.tipo === 'cobro') {
      t.cobros += m.total;
      t.cantidadCobros++;
    } else if (m.tipo === 'pago') {
      t.pagos += m.total;
      t.cantidadPagos++;
    }
    if (m.tipo !== 'ajuste') t.sinImputar += m.sinImputar;
  }
  return {
    ...t,
    cobros: redondear2(t.cobros),
    pagos: redondear2(t.pagos),
    devoluciones: redondear2(t.devoluciones),
    sinImputar: redondear2(t.sinImputar),
  };
}

// ---------------------------------------------------------------------------
// Anulación (F4)
// ---------------------------------------------------------------------------

/** Acumulado de ValoresFinancierosLiq que mueve cada tipo de movimiento:
 *  cobro/pago → totalCobrado (para chofer/proveedor significa "pagado");
 *  ajuste → totalAjustado. */
export function acumuladoDeMovimiento(tipo: TipoMovimientoFin): AcumuladoFinanciero {
  return tipo === 'ajuste' ? 'totalAjustado' : 'totalCobrado';
}

/** Reglas para anular, sobre el movimiento RELEÍDO en la transacción.
 *  Devuelve el mensaje de error o null. Un movimiento compensado en una
 *  liquidación (FC1) no se anula: primero se quita la compensación. */
export function validarAnulable(mov: Pick<MovimientoFin, 'estado' | 'numero' | 'imputaciones'>): string | null {
  if (mov.estado !== 'vigente') return `El movimiento ${mov.numero} ya está anulado.`;
  if (mov.imputaciones.some(i => i.origen === 'compensacion')) {
    return `El movimiento ${mov.numero} está compensado en una liquidación: primero quitá la compensación o revertí la liquidación.`;
  }
  // F7b: su saldo se cerró o se devolvió con otro movimiento.
  const espejo = mov.imputaciones.find(i => i.origen === 'cierre' || i.origen === 'devolucion');
  if (espejo) {
    return `El saldo de ${mov.numero} se ${espejo.origen === 'cierre' ? 'cerró' : 'devolvió'} con ${espejo.numeroDocumento}: ` +
      'primero anulá ese movimiento.';
  }
  return null;
}

/** Lo que vuelve a cada documento al anular. */
export interface ReversionDocumento {
  tipo: TipoDocumentoImputable;           // informeLiq: devuelve saldo al informe; movimientoFin: quita el espejo (F7b)
  idDocumento: string;
  numeroDocumento: string;
  importe: number;                        // > 0: se RESTA del acumulado del documento
}

/** Importes a devolver, sumados por documento (un mismo informe puede tener
 *  varias imputaciones del movimiento: la directa y las de saldo
 *  posteriores). Orden de aparición. El servicio decide por `tipo`: a un
 *  InformeLiq le devuelve el saldo; a un movimiento (F7b) le quita la
 *  imputación espejo. */
export function reversionesDe(imputaciones: ImputacionFin[]): ReversionDocumento[] {
  const porDocumento = new Map<string, ReversionDocumento>();
  for (const i of imputaciones) {
    const r = porDocumento.get(i.documento.id);
    if (r) {
      r.importe = redondear2(r.importe + i.importe);
    } else {
      porDocumento.set(i.documento.id, {
        tipo: i.documento.tipo,
        idDocumento: i.documento.id,
        numeroDocumento: i.numeroDocumento,
        importe: redondear2(i.importe),
      });
    }
  }
  return [...porDocumento.values()].filter(r => !esCero(r.importe));
}

// ---------------------------------------------------------------------------
// Imputar saldo (F4b)
// ---------------------------------------------------------------------------

/** Solicitudes listas para validar: importes redondeados a centavos y las
 *  de importe 0 descartadas. */
export function normalizarSolicitudes(solicitudes: ImputacionSolicitada[]): ImputacionSolicitada[] {
  return solicitudes
    .map(i => ({ idInfLiq: i.idInfLiq, importe: redondear2(Number(i.importe) || 0) }))
    .filter(i => !esCero(i.importe));
}

/** Reglas para imputar el saldo sin imputar de un movimiento (saldo a favor,
 *  anticipo o préstamo) a comprobantes. Sobre el movimiento RELEÍDO en la
 *  transacción (o el de la fila, en la UI) y solicitudes YA normalizadas.
 *  Que cada comprobante sea de la entidad, esté facturado y tenga saldo lo
 *  validan validarDocumentoImputable / aplicarImporte. Devuelve el mensaje
 *  de error o null. */
export function validarImputacionSaldo(
  mov: Pick<MovimientoFin, 'estado' | 'numero' | 'tipo' | 'sinImputar'>,
  solicitudes: ImputacionSolicitada[],
): string | null {
  if (mov.estado !== 'vigente') return `El movimiento ${mov.numero} está anulado.`;
  if (mov.tipo === 'ajuste') return 'Un ajuste no tiene saldo para imputar.';
  if (!(mov.sinImputar > 0)) return `El movimiento ${mov.numero} no tiene saldo sin imputar.`;
  if (solicitudes.length === 0) return 'Elegí al menos un comprobante.';
  const ids = solicitudes.map(i => i.idInfLiq);
  if (new Set(ids).size !== ids.length) return 'Un comprobante aparece más de una vez.';
  if (solicitudes.some(i => !(i.importe > 0))) return 'Hay un importe a imputar inválido.';
  const total = redondear2(solicitudes.reduce((acc, i) => acc + i.importe, 0));
  if (total - mov.sinImputar > TOLERANCIA_IMPORTE) {
    return `Lo imputado (${total.toFixed(2)}) supera el saldo sin imputar del movimiento (${mov.sinImputar.toFixed(2)}).`;
  }
  return null;
}

/** Campos del movimiento después de sumarle `nuevas` imputaciones (para una
 *  escritura parcial): imputaciones, idsDocumentos, totalImputado y
 *  sinImputar recalculados desde el total. Tira Error si lo imputado
 *  superaría el total (inconsistencia). */
export function acumularImputaciones(
  mov: Pick<MovimientoFin, 'numero' | 'total' | 'imputaciones'>,
  nuevas: ImputacionFin[],
): Pick<MovimientoFin, 'imputaciones' | 'idsDocumentos' | 'totalImputado' | 'sinImputar'> {
  const imputaciones = [...(mov.imputaciones ?? []), ...nuevas];
  const totalImputado = redondear2(imputaciones.reduce((acc, i) => acc + i.importe, 0));
  const sinImputar = redondear2(mov.total - totalImputado);
  if (sinImputar < -TOLERANCIA_IMPORTE) {
    throw new Error(`Lo imputado (${totalImputado.toFixed(2)}) supera el total del movimiento ${mov.numero} (${mov.total.toFixed(2)}).`);
  }
  return {
    imputaciones,
    idsDocumentos: [...new Set(imputaciones.map(i => i.documento.id))],
    totalImputado,
    sinImputar: esCero(sinImputar) ? 0 : sinImputar,
  };
}

// ---------------------------------------------------------------------------
// Ajustes sobre comprobantes (F7a)
// ---------------------------------------------------------------------------

/** Motivos que se eligen en la UI ('apertura' queda para la migración). */
export type MotivoAjusteElegible = Exclude<MotivoAjusteFin, 'apertura'>;

/** Saldo máximo para "Cerrar diferencia" y tope por comprobante de un
 *  ajuste por redondeo (F50). */
export const UMBRAL_CERRAR_DIFERENCIA = 1000;

/** Datos de un ajuste a registrar: baja el saldo de comprobantes facturados
 *  de la entidad sin mover dinero. */
export interface DatosAjusteFin {
  entidad: EntidadMovimientoFin;
  fecha: string;                         // 'YYYY-MM-DD', ≤ hoy
  motivo: MotivoAjusteElegible;
  imputaciones: ImputacionSolicitada[];  // ≥ 1
  observaciones: string;
}

/** Motivos permitidos por tipo de entidad: incobrable solo para clientes
 *  (lo que nos deben); bonificación, redondeo y otro para todos. */
export function motivosAjustePara(tipoEntidad: TipoEntidadFin): MotivoAjusteElegible[] {
  return tipoEntidad === 'cliente'
    ? ['incobrable', 'bonificacion', 'redondeo', 'otro']
    : ['bonificacion', 'redondeo', 'otro'];
}

/** Ayuda de cada motivo para la UI. */
export const AYUDA_MOTIVO_AJUSTE: Readonly<Record<MotivoAjusteElegible, string>> = {
  incobrable: 'La deuda no se va a cobrar. Cancela el saldo COMPLETO del comprobante y lo marca incobrable.',
  bonificacion: 'Descuento acordado después de facturar (normalmente lleva nota de crédito: la app registra la gestión).',
  redondeo: `Diferencias chicas: hasta $ ${UMBRAL_CERRAR_DIFERENCIA} por comprobante.`,
  otro: 'Cualquier otra baja de saldo. La observación es obligatoria.',
};

export function normalizarDatosAjuste(d: DatosAjusteFin): DatosAjusteFin {
  return {
    ...d,
    imputaciones: normalizarSolicitudes(d.imputaciones),
    observaciones: (d.observaciones ?? '').trim(),
  };
}

/** Validación previa, sin lecturas (el saldo de cada comprobante y la regla
 *  de incobrable por el saldo completo se validan en la transacción). Recibe
 *  datos YA normalizados. Devuelve el mensaje de error o null. */
export function validarDatosAjuste(d: DatosAjusteFin, hoy: string): string | null {
  if (!d.entidad?.id) return 'Falta la entidad.';
  if (!motivosAjustePara(d.entidad.tipo).includes(d.motivo)) {
    return d.motivo === 'incobrable'
      ? 'Incobrable es solo para clientes (lo que nos deben).'
      : 'Motivo de ajuste inválido.';
  }
  if (!FORMATO_FECHA.test(d.fecha)) return 'Fecha inválida.';
  if (d.fecha > hoy) return 'La fecha no puede ser futura.';
  if (d.imputaciones.length === 0) return 'Elegí al menos un comprobante a ajustar.';
  const ids = d.imputaciones.map(i => i.idInfLiq);
  if (new Set(ids).size !== ids.length) return 'Un comprobante aparece más de una vez.';
  if (d.imputaciones.some(i => !(i.importe > 0))) return 'Hay un importe a ajustar inválido.';
  if (d.motivo === 'redondeo' && d.imputaciones.some(i => i.importe - UMBRAL_CERRAR_DIFERENCIA > TOLERANCIA_IMPORTE)) {
    return `Un ajuste por redondeo no puede superar $ ${UMBRAL_CERRAR_DIFERENCIA} por comprobante.`;
  }
  if (d.motivo === 'otro' && !d.observaciones) return 'Con motivo "Otro" la observación es obligatoria.';
  return null;
}

/** Regla de incobrable sobre el saldo RELEÍDO en la transacción (F49): el
 *  importe tiene que ser el saldo completo. Devuelve el mensaje o null. */
export function validarImporteAjuste(
  motivo: MotivoAjusteElegible,
  saldo: number,
  importe: number,
  numeroDocumento: string,
): string | null {
  if (motivo === 'incobrable' && !importesIguales(importe, saldo)) {
    return `Incobrable va por el saldo completo: el comprobante ${numeroDocumento} tiene saldo ` +
      `$ ${saldo.toFixed(2)} y se pidió $ ${importe.toFixed(2)}.`;
  }
  return null;
}

/** Cuerpo del ajuste a persistir (sin idMovimiento: patrón ConId). Sin
 *  medios; total = Σ imputaciones; nada queda sin imputar. */
export function armarAjuste(p: {
  datos: DatosAjusteFin;
  numero: string;
  fechaRegistro: string;
  usuario: string;
  imputaciones: ImputacionFin[];
}): Omit<MovimientoFin, 'idMovimiento'> {
  const total = redondear2(p.imputaciones.reduce((acc, i) => acc + i.importe, 0));
  return {
    tipo: 'ajuste',
    numero: p.numero,
    fecha: p.datos.fecha,
    fechaRegistro: p.fechaRegistro,
    entidad: { ...p.datos.entidad },
    concepto: 'normal',
    motivoAjuste: p.datos.motivo,
    medios: [],
    total,
    imputaciones: p.imputaciones,
    idsDocumentos: [...new Set(p.imputaciones.map(i => i.documento.id))],
    totalImputado: total,
    sinImputar: 0,
    observaciones: p.datos.observaciones,
    estado: 'vigente',
    anulacion: null,
    usuario: p.usuario,
  };
}

// ---------------------------------------------------------------------------
// Saldos sin imputar (F7b): cierre por ajuste y devolución
// ---------------------------------------------------------------------------

/** Motivos para cerrar un saldo sin imputar con un ajuste. */
export type MotivoCierreSaldo = 'incobrable' | 'redondeo' | 'otro';

/** Datos para cerrar (todo o parte) el saldo sin imputar de un movimiento
 *  con un ajuste: un anticipo / préstamo que no se va a recuperar, un saldo
 *  a favor de un cliente que no se va a usar. */
export interface DatosCierreSaldo {
  fecha: string;                 // 'YYYY-MM-DD', ≤ hoy y ≥ fecha del movimiento
  motivo: MotivoCierreSaldo;
  importe: number;
  observaciones: string;
}

/** Datos de una devolución: plata en sentido contrario contra el saldo sin
 *  imputar (pago a un cliente que pagó de más; cobro a un chofer o
 *  proveedor que devuelve un adelanto). Un solo medio, sin retenciones. */
export interface DatosDevolucion {
  fecha: string;                 // 'YYYY-MM-DD', ≤ hoy y ≥ fecha del movimiento
  medio: MedioMovimientoFin;     // importe = lo devuelto
  observaciones: string;
}

type MovimientoConSaldo = Pick<MovimientoFin, 'estado' | 'numero' | 'tipo' | 'fecha' | 'sinImputar' | 'imputaciones'>;

/** Imputación propia de un cierre / devolución hacia el movimiento
 *  original (las espejo del original, origen 'cierre' | 'devolucion',
 *  también apuntan a un movimiento pero NO cuentan). */
function esImputacionSobreSaldo(i: ImputacionFin): boolean {
  return i.documento.tipo === 'movimientoFin' && i.origen !== 'cierre' && i.origen !== 'devolucion';
}

/** Movimiento creado CONTRA el saldo de otro (cierre o devolución): su
 *  imputación apunta a un movimiento, no a un comprobante. */
export function esSobreSaldo(m: Pick<MovimientoFin, 'imputaciones'>): boolean {
  return (m.imputaciones ?? []).some(esImputacionSobreSaldo);
}

/** Devolución = cobro o pago creado contra el saldo de otro movimiento. */
export function esDevolucion(m: Pick<MovimientoFin, 'tipo' | 'imputaciones'>): boolean {
  return m.tipo !== 'ajuste' && esSobreSaldo(m);
}

/** Número del movimiento cuyo saldo se cerró o devolvió (o null). */
export function movimientoOrigenDe(m: Pick<MovimientoFin, 'imputaciones'>): string | null {
  return (m.imputaciones ?? []).find(esImputacionSobreSaldo)?.numeroDocumento ?? null;
}

/** Concepto legible de un movimiento para listados y detalle: el motivo en
 *  un ajuste (con "cierre de saldo" si cierra el de otro movimiento),
 *  "Devolución" en una devolución, el concepto en el resto. */
export function etiquetaConceptoMovimiento(m: Pick<MovimientoFin, 'tipo' | 'concepto' | 'motivoAjuste' | 'imputaciones'>): string {
  if (m.tipo === 'ajuste') {
    const motivo = m.motivoAjuste ? ETIQUETA_MOTIVO_AJUSTE[m.motivoAjuste] : '—';
    return esSobreSaldo(m) ? `${motivo} · cierre de saldo` : motivo;
  }
  return esDevolucion(m) ? 'Devolución' : ETIQUETA_CONCEPTO[m.concepto];
}

/** Motivos de cierre según el movimiento: lo que entregamos (pago: anticipo,
 *  préstamo, pago de más) puede ser incobrable; lo que nos dejó un cliente
 *  (cobro) solo se cierra por redondeo u otro. */
export function motivosCierrePara(tipo: TipoMovimientoFin): MotivoCierreSaldo[] {
  return tipo === 'pago' ? ['incobrable', 'redondeo', 'otro'] : ['redondeo', 'otro'];
}

/** Reglas comunes a cierre y devolución sobre el movimiento original. */
function validarSaldoDisponible(mov: MovimientoConSaldo, importe: number, fecha: string, hoy: string): string | null {
  if (mov.estado !== 'vigente') return `El movimiento ${mov.numero} está anulado.`;
  if (mov.tipo === 'ajuste') return 'Un ajuste no tiene saldo sin imputar.';
  if (esDevolucion(mov)) return `${mov.numero} es una devolución: no tiene saldo propio.`;
  if (!(mov.sinImputar > 0)) return `El movimiento ${mov.numero} no tiene saldo sin imputar.`;
  if (!FORMATO_FECHA.test(fecha)) return 'Fecha inválida.';
  if (fecha > hoy) return 'La fecha no puede ser futura.';
  if (fecha < mov.fecha) return `La fecha no puede ser anterior a la del movimiento ${mov.numero}.`;
  if (!(importe > 0)) return 'El importe tiene que ser mayor a cero.';
  if (importe - mov.sinImputar > TOLERANCIA_IMPORTE) {
    return `El importe (${importe.toFixed(2)}) supera el saldo sin imputar de ${mov.numero} (${mov.sinImputar.toFixed(2)}).`;
  }
  return null;
}

export function normalizarCierreSaldo(d: DatosCierreSaldo): DatosCierreSaldo {
  return { ...d, importe: redondear2(Number(d.importe) || 0), observaciones: (d.observaciones ?? '').trim() };
}

/** Sobre el movimiento (de la fila en la UI, releído en la transacción) y
 *  datos YA normalizados. Devuelve el mensaje de error o null. */
export function validarCierreSaldo(mov: MovimientoConSaldo, d: DatosCierreSaldo, hoy: string): string | null {
  const error = validarSaldoDisponible(mov, d.importe, d.fecha, hoy);
  if (error) return error;
  if (!motivosCierrePara(mov.tipo).includes(d.motivo)) return 'Motivo inválido para este movimiento.';
  if (d.motivo === 'incobrable' && !importesIguales(d.importe, mov.sinImputar)) {
    return `Incobrable va por el saldo completo: $ ${mov.sinImputar.toFixed(2)}.`;
  }
  if (d.motivo === 'redondeo' && d.importe - UMBRAL_CERRAR_DIFERENCIA > TOLERANCIA_IMPORTE) {
    return `Un cierre por redondeo no puede superar $ ${UMBRAL_CERRAR_DIFERENCIA}.`;
  }
  if (d.motivo === 'otro' && !d.observaciones) return 'Con motivo "Otro" la observación es obligatoria.';
  return null;
}

export function normalizarDevolucion(d: DatosDevolucion): DatosDevolucion {
  return { ...d, medio: normalizarMedio(d.medio), observaciones: (d.observaciones ?? '').trim() };
}

export function validarDevolucion(mov: MovimientoConSaldo, d: DatosDevolucion, hoy: string): string | null {
  const error = validarSaldoDisponible(mov, d.medio.importe, d.fecha, hoy);
  if (error) return error;
  if (d.medio.tipo === 'retencion') return 'Una devolución no lleva retenciones.';
  if (d.medio.fechaCobro !== null && !FORMATO_FECHA.test(d.medio.fechaCobro)) return 'Fecha de cobro del cheque inválida.';
  return null;
}

/** Imputación de un movimiento sobre OTRO movimiento (documento
 *  'movimientoFin'). Se usa en los dos sentidos: en el ajuste / devolución
 *  (apunta al original, origen 'directa') y, como espejo, en el original
 *  (apunta al ajuste / devolución, origen 'cierre' | 'devolucion'), para que
 *  su totalImputado / sinImputar lo reflejen. */
export function imputacionSobreMovimiento(
  doc: { id: string; numero: string; total: number },
  saldoAntes: number,
  importe: number,
  fecha: string,
  origen: OrigenImputacionFin,
): ImputacionFin {
  return {
    documento: { tipo: 'movimientoFin', id: doc.id },
    numeroDocumento: doc.numero,
    periodoClave: null,
    fechaFactura: null,
    totalDocumento: doc.total,
    saldoAntes: redondear2(saldoAntes),
    importe: redondear2(importe),
    fecha,
    origen,
  };
}

/** Cuerpo del ajuste que cierra el saldo de `mov` (sin idMovimiento). */
export function armarCierreSaldo(p: {
  mov: Pick<MovimientoFin, 'numero' | 'total' | 'sinImputar' | 'entidad'>;
  idMovimientoOrigen: string;
  datos: DatosCierreSaldo;
  numero: string;
  fechaRegistro: string;
  usuario: string;
}): Omit<MovimientoFin, 'idMovimiento'> {
  const imputacion = imputacionSobreMovimiento(
    { id: p.idMovimientoOrigen, numero: p.mov.numero, total: p.mov.total },
    p.mov.sinImputar, p.datos.importe, p.datos.fecha, 'directa',
  );
  return {
    tipo: 'ajuste',
    numero: p.numero,
    fecha: p.datos.fecha,
    fechaRegistro: p.fechaRegistro,
    entidad: { ...p.mov.entidad },
    concepto: 'normal',
    motivoAjuste: p.datos.motivo,
    medios: [],
    total: imputacion.importe,
    imputaciones: [imputacion],
    idsDocumentos: [p.idMovimientoOrigen],
    totalImputado: imputacion.importe,
    sinImputar: 0,
    observaciones: p.datos.observaciones,
    estado: 'vigente',
    anulacion: null,
    usuario: p.usuario,
  };
}

/** Cuerpo de la devolución contra el saldo de `mov` (sin idMovimiento):
 *  tipo inverso (cobro → pago, pago → cobro), un medio, todo imputado al
 *  original. */
export function armarDevolucion(p: {
  mov: Pick<MovimientoFin, 'tipo' | 'numero' | 'total' | 'sinImputar' | 'entidad'>;
  idMovimientoOrigen: string;
  datos: DatosDevolucion;
  numero: string;
  fechaRegistro: string;
  usuario: string;
}): Omit<MovimientoFin, 'idMovimiento'> {
  const imputacion = imputacionSobreMovimiento(
    { id: p.idMovimientoOrigen, numero: p.mov.numero, total: p.mov.total },
    p.mov.sinImputar, p.datos.medio.importe, p.datos.fecha, 'directa',
  );
  return {
    tipo: tipoDevolucionDe(p.mov.tipo),
    numero: p.numero,
    fecha: p.datos.fecha,
    fechaRegistro: p.fechaRegistro,
    entidad: { ...p.mov.entidad },
    concepto: 'normal',
    motivoAjuste: null,
    medios: [{ ...p.datos.medio }],
    total: imputacion.importe,
    imputaciones: [imputacion],
    idsDocumentos: [p.idMovimientoOrigen],
    totalImputado: imputacion.importe,
    sinImputar: 0,
    observaciones: p.datos.observaciones,
    estado: 'vigente',
    anulacion: null,
    usuario: p.usuario,
  };
}

/** Tipo de la devolución: al cliente se le PAGA lo que dejó de más; lo que
 *  devuelve un chofer o proveedor entra como un COBRO. */
export function tipoDevolucionDe(tipoOriginal: TipoMovimientoFin): 'cobro' | 'pago' {
  return tipoOriginal === 'cobro' ? 'pago' : 'cobro';
}

/** Campos del movimiento original sin las imputaciones espejo de
 *  `idDocumento` (al anular el ajuste o la devolución): devuelve el saldo
 *  sin imputar. */
export function quitarImputacionesDe(
  mov: Pick<MovimientoFin, 'numero' | 'total' | 'imputaciones'>,
  idDocumento: string,
): Pick<MovimientoFin, 'imputaciones' | 'idsDocumentos' | 'totalImputado' | 'sinImputar'> {
  const restantes = (mov.imputaciones ?? []).filter(i => i.documento.id !== idDocumento);
  return acumularImputaciones({ numero: mov.numero, total: mov.total, imputaciones: restantes }, []);
}
