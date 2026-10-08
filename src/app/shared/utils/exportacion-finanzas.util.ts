import { ColumnaDoc, HojaDoc, LibroTabular, TablaDoc, ValorCeldaDoc } from 'src/app/interfaces/documento-tabular';
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { MovimientoFin, TipoEntidadFin } from 'src/app/interfaces/movimiento-fin';
import {
  FilaComprobanteCuenta, LineaMayor, MayorCuenta, ResumenCuentaEntidad, presentarSaldo, textoPeriodoCorto,
} from 'src/app/shared/utils/cuenta-entidad.util';
import {
  CuentaEntidadFin, DIAS_ALERTA_ANTIGUEDAD, EstadoAntiguedad, LadoCuenta, UMBRALES_ANTIGUEDAD, estadoCuenta, etiquetaEstadoAntiguedad,
  marcaCriticas, totalizarCuentas,
} from 'src/app/shared/utils/cuentas-finanzas.util';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import { TRAMOS_ANTIGUEDAD, redondear2 } from 'src/app/shared/utils/finanzas.util';
import {
  ETIQUETA_TIPO_MOVIMIENTO, FiltrosMovimientosFin, etiquetaConceptoMovimiento, resumenMedios,
} from 'src/app/shared/utils/movimiento-fin.util';

/** Exportación de Finanzas (F8a) — utils PUROS que arman un LibroTabular
 *  (Reportes) con lo que la pantalla muestra (F57: filtros, rango y orden
 *  actuales). Lo dibujan ExcelTabularService.generarLibro (una pestaña por
 *  hoja) y PdfTabularService.generarLibro (una página por hoja). Solo
 *  caracteres WinAnsi en los textos (el PDF usa las fuentes estándar).
 *  Diseño: claude/diseno-finanzas.md §22.1. */

const ETIQUETA_ESTADO_LIQ: Readonly<Record<InformeLiqNuevo['estado'], string>> = {
  borrador: 'Borrador',
  emitido: 'Emitido (sin facturar)',
  facturado: 'Facturado',
  revertido: 'Revertido',
  anulado: 'Anulado',
};

const ETIQUETA_TIPO_ENTIDAD: Readonly<Record<TipoEntidadFin, string>> = {
  cliente: 'Cliente',
  chofer: 'Chofer',
  proveedor: 'Proveedor',
};

const ETIQUETA_TRAMO: Readonly<Record<string, string>> = {
  '0-30': '0–30', '31-60': '31–60', '61-90': '61–90', '90+': '+90',
};

/** Nombre de archivo sin acentos ni caracteres problemáticos. */
export function sanearNombreArchivo(texto: string): string {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._ -]+/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 120) || 'finanzas';
}

/** "$ 1.234,50" (es-AR) para los textos. */
function pesos(v: number): string {
  return `$ ${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function col(etiqueta: string, tipo: ColumnaDoc['tipo'], ancho: number, alineacion?: ColumnaDoc['alineacion']): ColumnaDoc {
  return alineacion ? { etiqueta, tipo, ancho, alineacion } : { etiqueta, tipo, ancho };
}

function suma(filas: ValorCeldaDoc[][], i: number): number {
  return redondear2(filas.reduce((acc, f) => acc + (typeof f[i] === 'number' ? (f[i] as number) : 0), 0));
}

/** Fila de totales: suma las columnas indicadas; `etiqueta` en la primera. */
function filaTotal(columnas: ColumnaDoc[], filas: ValorCeldaDoc[][], indices: number[], etiqueta = 'Total'): ValorCeldaDoc[] {
  return columnas.map((_, i) => (i === 0 ? etiqueta : indices.includes(i) ? suma(filas, i) : null));
}

function tabla(titulo: string | null, columnas: ColumnaDoc[], filas: ValorCeldaDoc[][], total: ValorCeldaDoc[] | null): TablaDoc {
  return { titulo, grupos: [], columnas, filas, filaTotal: total };
}

function textoLado(lado: LadoCuenta): string {
  return lado === 'cobrar' ? 'A cobrar · Clientes' : 'A pagar · Choferes y proveedores';
}

// ---------------------------------------------------------------------------
// Cuentas
// ---------------------------------------------------------------------------

/** Pestaña Cuentas: las filas en el orden de la tabla. */
export function armarLibroCuentas(cuentas: CuentaEntidadFin[], lado: LadoCuenta, texto: string, hoy: string): LibroTabular {
  const cobrar = lado === 'cobrar';
  const columnas: ColumnaDoc[] = [
    col(cobrar ? 'Cliente' : 'Entidad', 'texto', 32),
    ...(cobrar ? [] : [col('Tipo', 'texto', 10)]),
    col('CUIT', 'texto', 13),
    col('Facturado abierto', 'moneda', 16),
    col('Comprob.', 'numero', 8),
    col(`+${DIAS_ALERTA_ANTIGUEDAD} días`, 'moneda', 15),
    col('Antigüedad (días)', 'numero', 10),
    col('Sin facturar', 'moneda', 15),
    col(cobrar ? 'Saldo a favor' : 'Anticipos', 'moneda', 15),
    col('Neto', 'moneda', 16),
  ];
  const filas: ValorCeldaDoc[][] = cuentas.map(c => [
    c.nombre,
    ...(cobrar ? [] : [ETIQUETA_TIPO_ENTIDAD[c.tipo]]),
    String(c.cuit ?? ''),
    c.saldoFacturado, c.cantidadFacturados, c.saldoMas60, c.diasMasAntiguo,
    c.sinFacturar, c.saldoAFavor, c.neto,
  ]);
  const off = cobrar ? 0 : 1;
  const montos = [2, 3, 4, 6, 7, 8].map(i => i + off);   // CUIT es la 1; antigüedad (5) no se suma
  const hoja: HojaDoc = {
    nombre: cobrar ? 'Cuentas a cobrar' : 'Cuentas a pagar',
    titulo: `Cuentas — ${textoLado(lado)}`,
    subtitulos: [`Al ${fechaComprobanteLegible(hoy)} · ${cuentas.length} cuenta(s)`, ...(texto.trim() ? [`Búsqueda: "${texto.trim()}"`] : [])],
    tablas: [tabla(null, columnas, filas, filaTotal(columnas, filas, montos))],
    notas: [
      'Facturado abierto: informes facturados con saldo. Sin facturar: emitidos sin factura (todavía no se cobran ni pagan).',
      `Neto: facturado abierto menos ${cobrar ? 'saldo a favor' : 'anticipos'}.`,
    ],
  };
  return { nombreArchivo: sanearNombreArchivo(`Cuentas ${cobrar ? 'a cobrar' : 'a pagar'} ${hoy}`), hojas: [hoja] };
}

// ---------------------------------------------------------------------------
// Antigüedad
// ---------------------------------------------------------------------------

export function armarLibroAntiguedad(
  cuentas: CuentaEntidadFin[],
  lado: LadoCuenta,
  filtros: { texto: string; estado: string },
  hoy: string,
): LibroTabular {
  const cobrar = lado === 'cobrar';
  const u = UMBRALES_ANTIGUEDAD[lado];
  const columnas: ColumnaDoc[] = [
    col(cobrar ? 'Cliente' : 'Entidad', 'texto', 30),
    ...(cobrar ? [] : [col('Tipo', 'texto', 10)]),
    ...TRAMOS_ANTIGUEDAD.map(t => col(ETIQUETA_TRAMO[t], 'moneda', 14)),
    col('Facturado abierto', 'moneda', 15),
    col('Más antigua (días)', 'numero', 9),
    col('Días prom.', 'numero', 8),
    col('Estado', 'texto', 20),
    col('Sin facturar', 'moneda', 14),
    col(cobrar ? 'Saldo a favor' : 'Anticipos', 'moneda', 14),
  ];
  const filas: ValorCeldaDoc[][] = cuentas.map(c => {
    const e = estadoCuenta(c);
    const marca = marcaCriticas(c);
    const estado = e ? etiquetaEstadoAntiguedad(e, c.lado) + (marca ? ` · ${marca}` : '') : null;
    return [
      c.nombre,
      ...(cobrar ? [] : [ETIQUETA_TIPO_ENTIDAD[c.tipo]]),
      ...TRAMOS_ANTIGUEDAD.map(t => c.tramos[t]),
      c.saldoFacturado, c.diasMasAntiguo, c.diasPromedio, estado, c.sinFacturar, c.saldoAFavor,
    ];
  });
  const off = cobrar ? 0 : 1;
  const montos = [1, 2, 3, 4, 5, 9, 10].map(i => i + off);
  const t = totalizarCuentas(cuentas);
  const pct = (v: number) => (t.saldoFacturado > 0
    ? `${(Math.round((v / t.saldoFacturado) * 1000) / 10).toLocaleString('es-AR', { maximumFractionDigits: 1 })} %`
    : '0 %');
  const subtitulos = [
    `Al ${fechaComprobanteLegible(hoy)} · ${cuentas.length} cuenta(s) con facturas abiertas`,
    TRAMOS_ANTIGUEDAD.map(tr => `${ETIQUETA_TRAMO[tr]}: ${pct(t.tramos[tr])}`).join(' · '),
  ];
  const filtrosTexto = [
    filtros.estado !== 'todos' ? `estado ${etiquetaEstadoAntiguedad(filtros.estado as EstadoAntiguedad, lado).toLowerCase()}` : '',
    filtros.texto.trim() ? `búsqueda "${filtros.texto.trim()}"` : '',
  ].filter(Boolean).join(', ');
  if (filtrosTexto) subtitulos.push(`Filtros: ${filtrosTexto}`);
  const hoja: HojaDoc = {
    nombre: cobrar ? 'Antigüedad a cobrar' : 'Antigüedad a pagar',
    titulo: `Antigüedad — ${textoLado(lado)}`,
    subtitulos,
    tablas: [tabla(null, columnas, filas, filaTotal(columnas, filas, montos))],
    notas: [
      'Antigüedad desde la fecha de la factura. Sin facturar y saldo a favor / anticipos son referencia: no entran en los tramos.',
      `Estado por días promedio ponderados por saldo: hasta ${u.atencion} días al día, ${u.atencion + 1}–${u.critico} atención, ` +
        `más de ${u.critico} ${cobrar ? 'crítico' : 'atrasado'}. Con alguna factura de más de ${u.critico} días, como mínimo atención.`,
    ],
  };
  return { nombreArchivo: sanearNombreArchivo(`Antiguedad ${cobrar ? 'a cobrar' : 'a pagar'} ${hoy}`), hojas: [hoja] };
}

// ---------------------------------------------------------------------------
// Movimientos
// ---------------------------------------------------------------------------

function columnasMovimientos(conEntidad: boolean): ColumnaDoc[] {
  return [
    col('Fecha', 'fecha', 11),
    col('Número', 'texto', 12),
    col('Tipo', 'texto', 8),
    col('Concepto', 'texto', 18),
    ...(conEntidad ? [col('Entidad', 'texto', 26), col('Tipo entidad', 'texto', 10)] : []),
    col('Medios', 'texto', 18),
    col('Total', 'moneda', 15),
    col('Imputado', 'moneda', 15),
    col('Sin imputar', 'moneda', 14),
    col('Estado', 'texto', 9),
  ];
}

function filasMovimientos(movimientos: MovimientoFin[], conEntidad: boolean): ValorCeldaDoc[][] {
  return movimientos.map(m => [
    m.fecha,
    m.numero,
    ETIQUETA_TIPO_MOVIMIENTO[m.tipo],
    etiquetaConceptoMovimiento(m),
    ...(conEntidad ? [m.entidad.razonSocial, ETIQUETA_TIPO_ENTIDAD[m.entidad.tipo]] : []),
    resumenMedios(m.medios),
    m.total, m.totalImputado, m.sinImputar,
    m.estado === 'anulado' ? 'Anulado' : 'Vigente',
  ]);
}

/** Totales SOLO de los vigentes (los anulados se listan pero no suman). */
function totalVigentes(columnas: ColumnaDoc[], movimientos: MovimientoFin[], conEntidad: boolean): ValorCeldaDoc[] {
  const vigentes = filasMovimientos(movimientos.filter(m => m.estado === 'vigente'), conEntidad);
  const base = conEntidad ? 7 : 5;
  return filaTotal(columnas, vigentes, [base, base + 1, base + 2], 'Total vigentes');
}

export function armarLibroMovimientos(
  movimientos: MovimientoFin[],
  filtros: FiltrosMovimientosFin,
  hoy: string,
): LibroTabular {
  const columnas = columnasMovimientos(true);
  const filas = filasMovimientos(movimientos, true);
  const detalle = [
    filtros.tipo !== 'todos' ? `tipo ${ETIQUETA_TIPO_MOVIMIENTO[filtros.tipo].toLowerCase()}` : '',
    filtros.estado !== 'todos' ? `estado ${filtros.estado}` : '',
    filtros.texto.trim() ? `búsqueda "${filtros.texto.trim()}"` : '',
  ].filter(Boolean).join(', ');
  const hoja: HojaDoc = {
    nombre: 'Movimientos',
    titulo: 'Movimientos de Finanzas',
    subtitulos: [
      `Del ${fechaComprobanteLegible(filtros.desde)} al ${fechaComprobanteLegible(filtros.hasta)} · ${movimientos.length} movimiento(s)`,
      ...(detalle ? [`Filtros: ${detalle}`] : []),
    ],
    tablas: [tabla(null, columnas, filas, totalVigentes(columnas, movimientos, true))],
    notas: ['Los totales suman solo los movimientos vigentes. Sin imputar: saldo a favor del cliente o anticipo / préstamo pendiente.'],
  };
  return { nombreArchivo: sanearNombreArchivo(`Movimientos ${filtros.desde} a ${filtros.hasta}`), hojas: [hoja] };
}

// ---------------------------------------------------------------------------
// Cuenta de la entidad (F40)
// ---------------------------------------------------------------------------

export interface DatosExportCuenta {
  tipo: TipoEntidadFin;
  nombre: string;
  cuit: number | null;
  resumen: ResumenCuentaEntidad;
  /** Las filas visibles (filtro "solo abiertos" aplicado). */
  comprobantes: FilaComprobanteCuenta[];
  soloAbiertos: boolean;
  mayor: MayorCuenta;
  /** Líneas del Mayor en el orden elegido. */
  lineasMayor: LineaMayor[];
  mayorDesde: string;               // '' = sin límite
  mayorHasta: string;
  movimientos: MovimientoFin[];
  hoy: string;
}

export function armarLibroCuenta(d: DatosExportCuenta): LibroTabular {
  const cliente = d.tipo === 'cliente';
  const cobrado = cliente ? 'Cobrado' : 'Pagado';
  const encabezado = `${ETIQUETA_TIPO_ENTIDAD[d.tipo]} ${d.nombre}${d.cuit ? ` — CUIT ${d.cuit}` : ''}`;
  const fecha = `Al ${fechaComprobanteLegible(d.hoy)}`;

  // --- Resumen ---
  const st = presentarSaldo(d.resumen.saldoTotal, d.tipo);
  const resumen = tabla('Saldo de la cuenta', [col('Concepto', 'texto', 40), col('Importe', 'moneda', 18)], [
    [`Facturado abierto (${d.resumen.cantidadFacturados})`, d.resumen.saldoFacturado],
    [`Emitido sin facturar (${d.resumen.cantidadSinFacturar})`, d.resumen.sinFacturar],
    [cliente ? 'Saldo a favor del cliente' : 'Anticipos / saldo a favor', -d.resumen.saldoAFavor],
  ], ['Saldo de la cuenta', d.resumen.saldoTotal]);
  const tramos = tabla('Antigüedad del facturado', [
    ...TRAMOS_ANTIGUEDAD.map(t => col(`${ETIQUETA_TRAMO[t]} días`, 'moneda', 15)),
    col('Más antigua (días)', 'numero', 12),
  ], [[...TRAMOS_ANTIGUEDAD.map(t => d.resumen.tramos[t]), d.resumen.diasMasAntiguo]], null);
  const hojaResumen: HojaDoc = {
    nombre: 'Resumen',
    titulo: `Cuenta — ${d.nombre}`,
    subtitulos: [encabezado, `${fecha} · saldo: ${pesos(st.importe)} ${st.texto}`],
    tablas: [resumen, tramos],
    notas: [`Saldo de la cuenta = facturado abierto + emitido sin facturar - ${cliente ? 'saldo a favor' : 'anticipos / saldo a favor'}.`],
  };

  // --- Comprobantes ---
  const colsComp: ColumnaDoc[] = [
    col('Número', 'texto', 13), col('Período', 'texto', 12), col('Estado', 'texto', 18),
    col('Emisión', 'fecha', 11), col('Factura', 'fecha', 11),
    col('Total', 'moneda', 15), col('Compensado', 'moneda', 14), col(cobrado, 'moneda', 15),
    col('Ajustado', 'moneda', 13), col('Saldo', 'moneda', 15), col('Días', 'numero', 6),
  ];
  const filasComp: ValorCeldaDoc[][] = d.comprobantes.map(f => [
    f.liq.numeroInterno ?? '—',
    textoPeriodoCorto(f.liq.periodo),
    ETIQUETA_ESTADO_LIQ[f.estado] + (f.estadoFinanciero === 'incobrable' ? ' · incobrable' : ''),
    f.fechaEmision, f.fechaFactura,
    f.total, f.compensado, f.cobrado, f.ajustado, f.saldo, f.dias,
  ]);
  const hojaComp: HojaDoc = {
    nombre: 'Comprobantes',
    titulo: `Comprobantes — ${d.nombre}`,
    subtitulos: [encabezado, `${fecha} · ${d.soloAbiertos ? 'solo abiertos' : 'todos'} · ${d.comprobantes.length} comprobante(s)`],
    tablas: [tabla(null, colsComp, filasComp, filaTotal(colsComp, filasComp, [5, 6, 7, 8, 9]))],
    notas: [],
  };

  // --- Mayor ---
  const colsMayor: ColumnaDoc[] = [
    col('Fecha', 'fecha', 11), col('Tipo', 'texto', 13), col('Comprobante', 'texto', 13), col('Detalle', 'texto', 44),
    col('Liquidado', 'moneda', 15), col(cobrado, 'moneda', 15), col('Saldo', 'moneda', 15), col('Situación', 'texto', 16),
  ];
  const filaMayor = (l: LineaMayor): ValorCeldaDoc[] => [
    l.fecha, tipoLineaMayor(l), l.referencia, l.detalle,
    l.debe || null, l.haber || null,
    l.informativa ? null : l.saldo,
    l.informativa ? 'informativa' : presentarSaldo(l.saldo, d.tipo).texto,
  ];
  const filasMayor = d.lineasMayor.map(filaMayor);
  if (d.mayorDesde) {
    const anterior: ValorCeldaDoc[] = [
      d.mayorDesde, 'Saldo anterior', null, `Saldo antes del ${fechaComprobanteLegible(d.mayorDesde)}`,
      null, null, d.mayor.saldoAnterior, presentarSaldo(d.mayor.saldoAnterior, d.tipo).texto,
    ];
    // Pegada a lo más viejo: arriba si el orden es ascendente, abajo si es descendente.
    const ascendente = d.lineasMayor.length < 2 || d.lineasMayor[0].fecha <= d.lineasMayor[d.lineasMayor.length - 1].fecha;
    if (ascendente) filasMayor.unshift(anterior);
    else filasMayor.push(anterior);
  }
  const rango = d.mayorDesde && d.mayorHasta
    ? `Del ${fechaComprobanteLegible(d.mayorDesde)} al ${fechaComprobanteLegible(d.mayorHasta)}`
    : d.mayorDesde ? `Desde el ${fechaComprobanteLegible(d.mayorDesde)}`
      : d.mayorHasta ? `Hasta el ${fechaComprobanteLegible(d.mayorHasta)}` : 'Toda la historia';
  const sf = presentarSaldo(d.mayor.saldoFinal, d.tipo);
  const hojaMayor: HojaDoc = {
    nombre: 'Mayor',
    titulo: `Mayor — ${d.nombre}`,
    subtitulos: [encabezado, `${rango} · saldo final ${pesos(sf.importe)} ${sf.texto}`],
    tablas: [tabla(null, colsMayor, filasMayor, [
      'Totales del rango / saldo final', null, null, null, d.mayor.totalDebe, d.mayor.totalHaber, d.mayor.saldoFinal, sf.texto,
    ])],
    notas: [
      'Liquidado: liquidaciones emitidas, a la fecha de emisión. Las compensaciones son informativas (no mueven el saldo).',
      'Una devolución o un cierre de saldo van en Liquidado: suben el saldo porque la entidad deja de tener saldo a favor.',
      `Saldo positivo: ${cliente ? 'nos debe' : 'le debemos'}; negativo: ${cliente ? 'a favor del cliente' : 'a favor nuestro'}.`,
    ],
  };

  // --- Movimientos ---
  const colsMov = columnasMovimientos(false);
  const hojaMov: HojaDoc = {
    nombre: 'Movimientos',
    titulo: `Movimientos — ${d.nombre}`,
    subtitulos: [encabezado, `${fecha} · ${d.movimientos.length} movimiento(s)`],
    tablas: [tabla(null, colsMov, filasMovimientos(d.movimientos, false), totalVigentes(colsMov, d.movimientos, false))],
    notas: ['Los totales suman solo los movimientos vigentes.'],
  };

  return {
    nombreArchivo: sanearNombreArchivo(`Cuenta ${d.nombre} ${d.hoy}`),
    hojas: [hojaResumen, hojaComp, hojaMayor, hojaMov],
  };
}

function tipoLineaMayor(l: LineaMayor): string {
  switch (l.tipo) {
    case 'liquidacion': return 'Liquidación';
    case 'compensacion': return 'Compensación';
    case 'ajuste': return 'Ajuste';
    default:
      if (l.concepto === 'anticipo') return 'Anticipo';
      if (l.concepto === 'prestamo') return 'Préstamo';
      if (l.concepto === 'devolucion') return 'Devolución';
      return l.tipo === 'cobro' ? 'Cobro' : 'Pago';
  }
}
