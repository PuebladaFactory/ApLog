import { CompensacionLiq, InformeLiqNuevo, ValoresLiq } from 'src/app/interfaces/informe-liq-nuevo';
import { EntidadMovimientoFin, ImputacionFin, MovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { esCero, redondear2, TOLERANCIA_IMPORTE } from 'src/app/shared/utils/finanzas.util';
import { acumularImputaciones } from 'src/app/shared/utils/movimiento-fin.util';

/** Compensaciones de una liquidación (Frente Finanzas, FC1) — utils PUROS.
 *  Un InformeLiq descuenta saldos sin imputar de movimientos de la MISMA
 *  entidad (anticipos, préstamos, saldos a favor): total → compensaciones →
 *  neto. En borrador son una propuesta; al emitir se aplican (imputación con
 *  origen 'compensacion' en el movimiento + totalCompensado en el informe);
 *  al revertir se liberan. Las escrituras sobre `movimientosFin` las agrega
 *  InformeLiqService a su propia transacción con escrituraMovimientoParcial
 *  (sin inyectar MovimientoFinService: evita la dependencia circular).
 *  Diseño: claude/diseno-finanzas.md §13, §15, §17. */

export const COLECCION_MOVIMIENTOS_FIN = 'movimientosFin';

/** Tope de compensaciones por informe (1 lectura + 1 escritura cada una en
 *  la transacción de emitir). */
export const MAX_COMPENSACIONES = 20;

/** Lo que manda la UI: qué movimiento y cuánto descontar. */
export interface CompensacionSolicitada {
  idMovimiento: string;
  importe: number;
}

/** Datos del informe que van en la imputación del movimiento. */
export interface DocumentoCompensado {
  idInfLiq: string;
  numeroInterno: string | null;
  periodoClave: string | null;
  totalDocumento: number;           // valores.total del informe
}

// ---------------------------------------------------------------------------
// Lectura tolerante (docs anteriores a FC1)
// ---------------------------------------------------------------------------

export function compensacionesDe(liq: Pick<InformeLiqNuevo, 'compensaciones'> | null | undefined): CompensacionLiq[] {
  return liq?.compensaciones ?? [];
}

export function totalCompensacionesDe(compensaciones: { importe: number }[]): number {
  return redondear2(compensaciones.reduce((acc, c) => acc + (Number(c.importe) || 0), 0));
}

/** Neto a pagar / cobrar: valores.neto o, en docs anteriores a FC1,
 *  total − totalCompensaciones (0). */
export function netoDe(valores: ValoresLiq): number {
  return valores.neto ?? redondear2(valores.total - (valores.totalCompensaciones ?? 0));
}

/** Mensaje si el neto quedaría negativo (F30), o null. */
export function errorNeto(total: number, totalCompensaciones: number): string | null {
  const neto = redondear2(total - totalCompensaciones);
  if (neto < -TOLERANCIA_IMPORTE) {
    return `Las compensaciones ($ ${totalCompensaciones.toFixed(2)}) superan el total de la liquidación ` +
      `($ ${redondear2(total).toFixed(2)}): el neto no puede ser negativo. Reducí las compensaciones.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Validación y armado
// ---------------------------------------------------------------------------

/** Solicitudes listas: importes redondeados, las de 0 descartadas. Sin
 *  lecturas: ids únicos, importes > 0 y tope. Devuelve las normalizadas o
 *  tira Error. */
export function normalizarCompensaciones(solicitudes: CompensacionSolicitada[] | null | undefined): CompensacionSolicitada[] {
  const normalizadas = (solicitudes ?? [])
    .map(s => ({ idMovimiento: s.idMovimiento, importe: redondear2(Number(s.importe) || 0) }))
    .filter(s => !esCero(s.importe));
  if (normalizadas.some(s => !s.idMovimiento)) throw new Error('Hay una compensación sin movimiento.');
  if (normalizadas.some(s => s.importe < 0)) throw new Error('Hay una compensación con importe negativo.');
  const ids = normalizadas.map(s => s.idMovimiento);
  if (new Set(ids).size !== ids.length) throw new Error('Un movimiento aparece más de una vez en las compensaciones.');
  if (normalizadas.length > MAX_COMPENSACIONES) {
    throw new Error(`Una liquidación admite hasta ${MAX_COMPENSACIONES} compensaciones (elegidas: ${normalizadas.length}).`);
  }
  return normalizadas;
}

/** Lo que ya está compensado de `mov` en el informe `idInfLiq` (un emitido
 *  que se edita). 0 si nada. */
export function compensadoEnInforme(mov: Pick<MovimientoFin, 'imputaciones'>, idInfLiq: string | null): number {
  if (!idInfLiq) return 0;
  return redondear2((mov.imputaciones ?? [])
    .filter(i => i.origen === 'compensacion' && i.documento.id === idInfLiq)
    .reduce((acc, i) => acc + i.importe, 0));
}

/** Disponible de `mov` para el informe `idInfLiq`: lo sin imputar + lo que
 *  ya le aplicó a ESE informe (al editar un emitido se puede subir hasta ahí). */
export function disponibleParaInforme(mov: Pick<MovimientoFin, 'sinImputar' | 'imputaciones'>, idInfLiq: string | null): number {
  return redondear2((mov.sinImputar ?? 0) + compensadoEnInforme(mov, idInfLiq));
}

/** Arma las CompensacionLiq desde las solicitudes y los movimientos
 *  RELEÍDOS en la transacción (mapa id → movimiento, null si no existe).
 *  Valida cada uno: existe, vigente, no es un ajuste, es de la entidad del
 *  informe y el importe entra en su disponible. Tira Error (aborta). */
export function armarCompensaciones(
  solicitudes: CompensacionSolicitada[],
  movimientos: Map<string, MovimientoFin | null>,
  entidad: Pick<EntidadMovimientoFin, 'tipo' | 'id'>,
  idInfLiq: string | null,
): CompensacionLiq[] {
  return solicitudes.map(s => {
    const mov = movimientos.get(s.idMovimiento);
    if (!mov) throw new Error(`No existe el movimiento ${s.idMovimiento} elegido para compensar.`);
    if (mov.estado !== 'vigente') throw new Error(`El movimiento ${mov.numero} está anulado: quitalo de las compensaciones.`);
    if (mov.tipo === 'ajuste') throw new Error(`El movimiento ${mov.numero} es un ajuste: no se compensa.`);
    if (mov.entidad.tipo !== entidad.tipo || mov.entidad.id !== entidad.id) {
      throw new Error(`El movimiento ${mov.numero} es de otra entidad (${mov.entidad.razonSocial}).`);
    }
    const disponible = disponibleParaInforme(mov, idInfLiq);
    if (s.importe - disponible > TOLERANCIA_IMPORTE) {
      throw new Error(
        `El movimiento ${mov.numero} tiene $ ${disponible.toFixed(2)} disponibles y se quieren compensar $ ${s.importe.toFixed(2)}` +
        ' (¿se usó en otra liquidación o en una imputación?).',
      );
    }
    return {
      idMovimiento: s.idMovimiento,
      numero: mov.numero,
      fecha: mov.fecha,
      concepto: mov.concepto,
      importe: s.importe,
    };
  });
}

/** Solicitudes equivalentes a unas compensaciones guardadas (para
 *  revalidar las de un borrador al emitirlo). */
export function solicitudesDe(compensaciones: CompensacionLiq[]): CompensacionSolicitada[] {
  return compensaciones.map(c => ({ idMovimiento: c.idMovimiento, importe: c.importe }));
}

// ---------------------------------------------------------------------------
// Escrituras sobre el movimiento
// ---------------------------------------------------------------------------

type CamposImputacionMovimiento = Pick<MovimientoFin, 'imputaciones' | 'idsDocumentos' | 'totalImputado' | 'sinImputar'>;

/** Campos del movimiento dejando UNA compensación de `importe` en el
 *  informe `doc` (reemplaza la que hubiera para ese informe; importe 0 =
 *  solo quitar). `saldoAntes`: saldo del informe antes de esta compensación.
 *  Tira Error si el movimiento quedaría con imputado > total. */
export function fijarCompensacion(
  mov: Pick<MovimientoFin, 'numero' | 'total' | 'imputaciones'>,
  doc: DocumentoCompensado,
  importe: number,
  saldoAntes: number,
  fecha: string,
): CamposImputacionMovimiento {
  const restantes = (mov.imputaciones ?? [])
    .filter(i => !(i.origen === 'compensacion' && i.documento.id === doc.idInfLiq));
  const nuevas: ImputacionFin[] = esCero(importe) ? [] : [{
    documento: { tipo: 'informeLiq', id: doc.idInfLiq },
    numeroDocumento: doc.numeroInterno ?? doc.idInfLiq,
    periodoClave: doc.periodoClave,
    fechaFactura: null,
    totalDocumento: redondear2(doc.totalDocumento),
    saldoAntes: redondear2(saldoAntes),
    importe: redondear2(importe),
    fecha,
    origen: 'compensacion',
  }];
  return acumularImputaciones({ numero: mov.numero, total: mov.total, imputaciones: restantes }, nuevas);
}

/** Campos del movimiento sin las compensaciones aplicadas al informe
 *  `idInfLiq` (liberar al revertir o al quitarla de un emitido). */
export function quitarCompensacion(
  mov: Pick<MovimientoFin, 'numero' | 'total' | 'imputaciones'>,
  idInfLiq: string,
): CamposImputacionMovimiento {
  const restantes = (mov.imputaciones ?? [])
    .filter(i => !(i.origen === 'compensacion' && i.documento.id === idInfLiq));
  return acumularImputaciones({ numero: mov.numero, total: mov.total, imputaciones: restantes }, []);
}

/** Escritura parcial sobre un movimiento de Finanzas (modo 'actualizar'). */
export function escrituraMovimientoParcial(idMovimiento: string, campos: Record<string, any>): EscrituraBatch {
  return { coleccion: COLECCION_MOVIMIENTOS_FIN, id: idMovimiento, modo: 'actualizar', data: campos };
}

// ---------------------------------------------------------------------------
// UI (FC1b): qué se puede compensar
// ---------------------------------------------------------------------------

/** Etiqueta del concepto del movimiento compensado ('normal' = un cobro o
 *  pago que quedó con saldo a favor). */
export const ETIQUETA_CONCEPTO_COMPENSACION: Readonly<Record<CompensacionLiq['concepto'], string>> = {
  normal: 'Saldo a favor',
  anticipo: 'Anticipo',
  prestamo: 'Préstamo',
};

/** Un movimiento que se puede compensar en un informe. */
export interface CompensableFin {
  idMovimiento: string;
  numero: string;
  fecha: string;                    // 'YYYY-MM-DD'
  concepto: CompensacionLiq['concepto'];
  total: number;                    // total del movimiento
  disponible: number;               // disponibleParaInforme
  enOtrosBorradores: string[];      // períodos 'MM/AAAA' de OTROS borradores que lo eligieron (F35)
}

/** Lista de compensables para el informe `idInfLiq` (null = informe nuevo)
 *  de la entidad: movimientos vigentes, no ajustes, de la entidad, con
 *  disponible > 0 (incluye los ya aplicados a este informe aunque su
 *  sinImputar sea 0). Marca los elegidos en otros borradores. Orden: más
 *  antiguos primero. Puro. */
export function armarCompensables(
  movimientos: (MovimientoFin & { idMovimiento: string })[],
  entidad: Pick<EntidadMovimientoFin, 'tipo' | 'id'>,
  idInfLiq: string | null,
  borradores: (Pick<InformeLiqNuevo, 'compensaciones' | 'periodoClave'> & { idInfLiq: string })[],
): CompensableFin[] {
  const vistos = new Set<string>();
  const lista: CompensableFin[] = [];
  for (const m of movimientos) {
    if (vistos.has(m.idMovimiento)) continue;
    vistos.add(m.idMovimiento);
    if (m.estado !== 'vigente' || m.tipo === 'ajuste') continue;
    if (m.entidad.tipo !== entidad.tipo || m.entidad.id !== entidad.id) continue;
    const disponible = disponibleParaInforme(m, idInfLiq);
    if (!(disponible > 0)) continue;
    const enOtrosBorradores = borradores
      .filter(b => b.idInfLiq !== idInfLiq && compensacionesDe(b).some(c => c.idMovimiento === m.idMovimiento))
      .map(b => {
        const [a, mes] = (b.periodoClave ?? '').split('-');
        return mes ? `${mes}/${a}` : (b.periodoClave ?? '');
      });
    lista.push({
      idMovimiento: m.idMovimiento,
      numero: m.numero,
      fecha: m.fecha,
      concepto: m.concepto,
      total: m.total,
      disponible,
      enOtrosBorradores,
    });
  }
  return lista.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.numero.localeCompare(b.numero));
}

/** Σ disponible de una lista de compensables. */
export function totalDisponible(compensables: Pick<CompensableFin, 'disponible'>[]): number {
  return redondear2(compensables.reduce((acc, c) => acc + c.disponible, 0));
}
