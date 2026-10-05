import { InformeLiqNuevo, ValoresFinancierosLiq } from 'src/app/interfaces/informe-liq-nuevo';
import {
  ConceptoMovimientoFin, EntidadMovimientoFin, ImputacionFin, MedioMovimientoFin, MovimientoFin,
  OrigenImputacionFin, TipoEntidadFin, TipoMedioFin,
} from 'src/app/interfaces/movimiento-fin';
import { esCero, redondear2, totalMedios, TOLERANCIA_IMPORTE } from 'src/app/shared/utils/finanzas.util';

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
