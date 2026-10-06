import { InformeLiqNuevo, PeriodoLiq } from 'src/app/interfaces/informe-liq-nuevo';
import { InformeOpNuevo } from 'src/app/interfaces/informe-op-nuevo';
import { ColumnaDoc, DocumentoTabular, LineaPieDoc } from 'src/app/interfaces/documento-tabular';
import { etiquetaColumna, tipoColumna, valorCrudoColumna } from './columnas-liquidacion.util';
import { nombreEntidadRef } from './entidad-informe.util';
import { descripcionTipoComprobante, fechaComprobanteLegible, numeroComprobante } from './factura-electronica.util';
import { ETIQUETA_CONCEPTO_COMPENSACION, compensacionesDe, netoDe } from './compensacion.util';

/** Cómo se presenta un InformeLiqNuevo en Excel/PDF. Se deriva del estado,
 *  salvo la vista previa, que se indica explícitamente. */
export type VarianteDocumentoLiq = 'vistaPrevia' | 'proforma' | 'emitido' | 'revertido' | 'anulado';

export interface OpcionesDocumentoLiq {
  /** true: informe armado en memoria, todavía no guardado (vista previa de
   *  LiquidacionNueva). La vista previa del Detalle NO lo usa: ahí el
   *  documento es la proforma o el emitido. */
  vistaPrevia?: boolean;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MARCA: Readonly<Record<VarianteDocumentoLiq, string | null>> = {
  vistaPrevia: 'VISTA PREVIA',
  proforma: 'PROFORMA',
  emitido: null,
  revertido: 'REVERTIDO',
  anulado: 'ANULADO',
};

/** Ancho aproximado por columna (caracteres). Las que no figuran: 18. */
const ANCHO_COLUMNA: Readonly<Record<string, number>> = {
  'Fecha': 11,
  'Quincena': 9,
  'Chofer': 24,
  'Cliente': 26,
  'Patente': 10,
  'Concepto': 16,
  'Observaciones': 28,
  'Hoja de Ruta': 14,
  'Km': 7,
  'Jornada': 14,
  'Ad Km': 13,
  'Ad Acomp': 13,
  'Extra': 13,
  'A Cobrar': 15,
};

const LEYENDA_PRELIMINAR = 'Documento preliminar — sujeto a revisión.';

/** Columnas de texto cuyo valor va centrado (valores cortos de ancho fijo). */
const COLUMNAS_CENTRADAS = ['Quincena'];

/** QUÉ dice el documento de un InformeLiqNuevo (Excel y PDF lo dibujan igual).
 *  Pura: no lee Firestore ni cachés, todo sale de los snapshots.
 *  - `informesOp`: los que componen el informe (vivos, o los del snapshot si
 *    está revertido). Se ordenan por fecha y chofer.
 *  - `liq.valores` tiene que estar al día (en memoria: el caller recalcula
 *    con InformeLiqFactoryService antes de llamar).
 *  Encabezado y pie = los del camino viejo (decisión E4). */
export function armarDocumentoLiq(
  liq: InformeLiqNuevo,
  informesOp: InformeOpNuevo[],
  opciones: OpcionesDocumentoLiq = {},
): DocumentoTabular {
  const variante = varianteDocumentoLiq(liq, opciones);
  const nombre = nombreEntidadRef(liq.entidad);

  const columnas: ColumnaDoc[] = liq.columnas.map(c => ({
    etiqueta: etiquetaColumna(c, liq.tipo),
    tipo: tipoColumna(c),
    alineacion: COLUMNAS_CENTRADAS.includes(c) ? ('centro' as const) : undefined,
    ancho: ANCHO_COLUMNA[c] ?? 18,
  }));
  const filas = ordenarInformes(informesOp).map(inf => liq.columnas.map(c => valorCrudoColumna(inf, c)));
  const indiceTotal = liq.columnas.indexOf('A Cobrar');

  return {
    nombreArchivo: nombreArchivo(liq, variante, nombre),
    titulo: variante === 'proforma' ? `Proforma ${nombre}` : `Liquidación de Servicios ${nombre}`,
    subtitulos: subtitulos(liq),
    identificador: variante !== 'vistaPrevia' && variante !== 'proforma' && liq.numeroInterno
      ? `N° ${liq.numeroInterno}`
      : null,
    marca: MARCA[variante],
    leyenda: leyenda(liq, variante),
    columnas,
    filas,
    columnaTotal: indiceTotal >= 0 ? indiceTotal : null,
    pie: pie(liq),
    notas: liq.observaciones?.trim() ? [`Observaciones: ${liq.observaciones.trim()}`] : [],
  };
}

/** Variante de presentación. 'emitido' cubre también 'facturado'. La usa la
 *  fachada para decidir el log (REIMPRIMIR solo con número, E5). */
export function varianteDocumentoLiq(
  liq: InformeLiqNuevo,
  opciones: OpcionesDocumentoLiq = {},
): VarianteDocumentoLiq {
  if (opciones.vistaPrevia) return 'vistaPrevia';
  switch (liq.estado) {
    case 'borrador': return 'proforma';
    case 'revertido': return 'revertido';
    case 'anulado': return 'anulado';
    default: return 'emitido';
  }
}

function subtitulos(liq: InformeLiqNuevo): string[] {
  const lineas = [
    `Año: ${liq.periodo.anio}  Mes: ${MESES[liq.periodo.mes - 1] ?? liq.periodo.mes}  Período liquidado: ${textoTramo(liq.periodo)}`,
  ];
  // E6: comprobante vinculado (a prueba; si no cierra, se quita esta línea).
  if (liq.estado === 'facturado' && liq.factura) {
    const f = liq.factura;
    lineas.push(
      `Factura: ${descripcionTipoComprobante(f.tipoComprobante)} N° ${numeroComprobante(f)} del ${fechaComprobanteLegible(f.fecha)}`,
    );
  }
  return lineas;
}

function leyenda(liq: InformeLiqNuevo, variante: VarianteDocumentoLiq): string | null {
  switch (variante) {
    case 'vistaPrevia':
    case 'proforma':
      return LEYENDA_PRELIMINAR;
    case 'revertido':
      return liq.reversion
        ? `Revertido el ${fechaLocal(liq.reversion.fecha)}. Motivo: ${liq.reversion.motivo}`
        : null;
    case 'anulado':
      return liq.anulacion
        ? `Anulado el ${fechaLocal(liq.anulacion.fecha)}. Motivo: ${liq.anulacion.motivo}`
        : null;
    default:
      return null;
  }
}

/** Mismo pie que el camino viejo: Subtotal y ajustes solo si hay ajustes;
 *  siempre Total. Sale de liq.valores (no se recalcula acá).
 *  Frente Finanzas (FC2): si hay compensaciones, después del Total va una
 *  línea por cada una (negativa) y el Neto a pagar / a cobrar (netoDe). */
function pie(liq: InformeLiqNuevo): LineaPieDoc[] {
  const v = liq.valores;
  const lineas: LineaPieDoc[] = [];
  if (liq.descuentos.length > 0) {
    const subtotal = v.totalTarifaBase + v.totalAcompaniante + v.totalKmMonto + v.totalAdExtra;
    lineas.push({ concepto: 'Subtotal', valor: subtotal, tipo: 'subtotal' });
    for (const d of liq.descuentos) {
      lineas.push({ concepto: d.concepto, valor: d.valor, tipo: 'ajuste' });
    }
  }
  lineas.push({ concepto: 'Total', valor: v.total, tipo: 'total' });

  const compensaciones = compensacionesDe(liq);
  if (compensaciones.length > 0) {
    for (const c of compensaciones) {
      lineas.push({
        concepto: `${ETIQUETA_CONCEPTO_COMPENSACION[c.concepto] ?? 'Compensación'} ${c.numero} del ${fechaComprobanteLegible(c.fecha)}`,
        valor: -c.importe,
        tipo: 'compensacion',
      });
    }
    lineas.push({
      concepto: liq.tipo === 'cliente' ? 'Neto a cobrar' : 'Neto a pagar',
      valor: netoDe(v),
      tipo: 'neto',
    });
  }
  return lineas;
}

function ordenarInformes(informesOp: InformeOpNuevo[]): InformeOpNuevo[] {
  const chofer = (i: InformeOpNuevo) => `${i.datosOperacion.chofer.apellido} ${i.datosOperacion.chofer.nombre}`;
  return [...informesOp].sort((a, b) =>
    a.fecha.localeCompare(b.fecha) || chofer(a).localeCompare(chofer(b), 'es'));
}

function textoTramo(periodo: PeriodoLiq): string {
  return periodo.tramo === 'mes' ? 'Mes completo'
    : periodo.tramo === '1q' ? '1° quincena' : '2° quincena';
}

/** Ej.: Liquidacion_LQCL-000123_Transportes_SA_2026-08-1q,
 *  Proforma_Transportes_SA_2026-08, VistaPrevia_…, …_REVERTIDO. */
function nombreArchivo(liq: InformeLiqNuevo, variante: VarianteDocumentoLiq, nombre: string): string {
  const p = liq.periodo;
  const periodo = `${p.anio}-${String(p.mes).padStart(2, '0')}${p.tramo === 'mes' ? '' : `-${p.tramo}`}`;
  let base: string;
  switch (variante) {
    case 'vistaPrevia': base = `VistaPrevia_${nombre}_${periodo}`; break;
    case 'proforma': base = `Proforma_${nombre}_${periodo}`; break;
    default: base = `Liquidacion_${liq.numeroInterno ?? 'sin-numero'}_${nombre}_${periodo}`;
  }
  if (variante === 'revertido') base += '_REVERTIDO';
  if (variante === 'anulado') base += '_ANULADO';
  return sanearNombreArchivo(base);
}

/** Sin acentos ni caracteres inválidos en Windows; espacios → '_'. */
function sanearNombreArchivo(texto: string): string {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Timestamp ISO completo (con hora, en UTC) → 'DD/MM/AAAA' en hora LOCAL.
 *  Para fechas 'YYYY-MM-DD' sin hora NO usar esto (ver
 *  fechaComprobanteLegible). */
function fechaLocal(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
