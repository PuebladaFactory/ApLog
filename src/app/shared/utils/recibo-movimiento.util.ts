import { DatosEmpresa } from 'src/app/interfaces/configuracion-empresa';
import { MedioMovimientoFin, MovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { formatearCuit, lineasEncabezadoEmpresa } from 'src/app/shared/utils/datos-empresa.util';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import { redondear2 } from 'src/app/shared/utils/finanzas.util';
import {
  ETIQUETA_IMPUESTO, ETIQUETA_MEDIO, ETIQUETA_ORIGEN_IMPUTACION, esDevolucion, movimientoOrigenDe,
} from 'src/app/shared/utils/movimiento-fin.util';
import { importeEnLetras } from 'src/app/shared/utils/numero-letras.util';

/** Recibo (cobro) / Orden de pago (pago) de un movimiento de Finanzas (F8c)
 *  — util PURO: arma el contenido; lo dibuja ReciboPdfService. Textos solo
 *  WinAnsi. No es un comprobante fiscal. Diseño: claude/diseno-finanzas.md
 *  §22.2 (F58 letras, F59 datos de la empresa, F60 firma). */

export interface FilaMedioRecibo {
  medio: string;
  detalle: string;
  importe: number;
}

export interface FilaImputacionRecibo {
  documento: string;
  periodo: string;
  factura: string;
  aplicacion: string;
  fecha: string;          // legible
  importe: number;
}

export interface DocumentoRecibo {
  nombreArchivo: string;
  titulo: 'RECIBO' | 'ORDEN DE PAGO';
  numero: string;
  fecha: string;          // legible
  empresa: string[];      // líneas del encabezado ([] si no hay datos)
  /** "Recibimos de X (CUIT …) la suma de PESOS … ($ …)". */
  textoPrincipal: string;
  concepto: string;
  medios: FilaMedioRecibo[];
  total: number;
  imputaciones: FilaImputacionRecibo[];
  totalImputado: number;
  sinImputar: number;
  etiquetaSinImputar: string;
  observaciones: string;
  /** Leyenda debajo de la línea de firma. */
  firma: string;
  /** null si está vigente. */
  anulacion: { fecha: string; motivo: string } | null;
}

function pesos(v: number): string {
  return `$ ${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Banco, número, fecha de cobro del cheque o datos de la retención. */
export function detalleMedioRecibo(md: MedioMovimientoFin): string {
  if (md.tipo === 'retencion' && md.retencion) {
    return [
      ETIQUETA_IMPUESTO[md.retencion.impuesto] ?? md.retencion.impuesto,
      md.retencion.jurisdiccion,
      `Certificado ${md.retencion.certificado}`,
    ].filter(Boolean).join(' · ');
  }
  return [
    md.banco,
    md.referencia ? `N° ${md.referencia}` : null,
    md.fechaCobro ? `Cobro ${fechaComprobanteLegible(md.fechaCobro)}` : null,
  ].filter(Boolean).join(' · ') || '—';
}

function periodoLegible(periodoClave: string | null): string {
  if (!periodoClave) return '—';
  const m = /^(\d{4})-(\d{2})/.exec(periodoClave);
  return m ? `${m[2]}/${m[1]}` : periodoClave;
}

function sanear(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._ -]+/g, '').trim().replace(/\s+/g, '_');
}

/** Lo que dice el renglón "en concepto de". */
function conceptoDe(m: MovimientoFin): string {
  if (esDevolucion(m)) {
    const origen = movimientoOrigenDe(m) ?? '';
    return m.tipo === 'pago' ? `devolución del saldo a favor de ${origen}` : `devolución del anticipo ${origen}`;
  }
  if (m.concepto === 'anticipo') return 'anticipo a cuenta de futuras liquidaciones';
  if (m.concepto === 'prestamo') return 'préstamo';
  return m.sinImputar > 0 ? 'cancelación de los comprobantes detallados y saldo a cuenta' : 'cancelación de los comprobantes detallados';
}

/** Tira Error con un ajuste (no tiene recibo). */
export function armarDocumentoRecibo(m: MovimientoFin, empresa: DatosEmpresa | null): DocumentoRecibo {
  if (m.tipo === 'ajuste') throw new Error('Un ajuste no tiene recibo ni orden de pago.');
  const cobro = m.tipo === 'cobro';
  const titulo = cobro ? 'RECIBO' : 'ORDEN DE PAGO';
  const entidad = `${m.entidad.razonSocial}${m.entidad.cuit ? ` (CUIT ${formatearCuit(m.entidad.cuit)})` : ''}`;
  const verbo = cobro ? 'Recibimos de' : 'Pagamos a';
  const total = redondear2(m.total);
  return {
    nombreArchivo: sanear(`${titulo === 'RECIBO' ? 'Recibo' : 'Orden de pago'} ${m.numero} ${m.entidad.razonSocial}`),
    titulo,
    numero: m.numero,
    fecha: fechaComprobanteLegible(m.fecha),
    empresa: empresa ? lineasEncabezadoEmpresa(empresa) : [],
    textoPrincipal: `${verbo} ${entidad} la suma de PESOS ${importeEnLetras(total)} (${pesos(total)}).`,
    concepto: conceptoDe(m),
    medios: (m.medios ?? []).map(md => ({
      medio: ETIQUETA_MEDIO[md.tipo] ?? md.tipo,
      detalle: detalleMedioRecibo(md),
      importe: redondear2(md.importe),
    })),
    total,
    imputaciones: (m.imputaciones ?? []).map(i => ({
      documento: i.numeroDocumento,
      periodo: periodoLegible(i.periodoClave),
      factura: i.fechaFactura ? fechaComprobanteLegible(i.fechaFactura) : '—',
      aplicacion: ETIQUETA_ORIGEN_IMPUTACION[i.origen] ?? i.origen,
      fecha: fechaComprobanteLegible(i.fecha),
      importe: redondear2(i.importe),
    })),
    totalImputado: redondear2(m.totalImputado),
    sinImputar: redondear2(m.sinImputar),
    etiquetaSinImputar: cobro ? 'Saldo a cuenta (a favor del cliente)' : 'A cuenta (anticipo / saldo pendiente)',
    observaciones: (m.observaciones ?? '').trim(),
    firma: cobro
      ? `Por ${empresa?.razonSocial || 'la empresa'}: firma y aclaración`
      : `Recibí conforme: ${m.entidad.razonSocial} — firma, aclaración y DNI`,
    anulacion: m.estado === 'anulado' && m.anulacion
      ? {
        // anulacion.fecha es un instante (ISO con hora): se muestra en hora local.
        fecha: new Date(m.anulacion.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        motivo: m.anulacion.motivo,
      }
      : null,
  };
}
