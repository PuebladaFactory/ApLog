import {
  ColumnaDoc,
  DocumentoTabular,
  HojaDoc,
  LibroTabular,
  TablaDoc,
  ValorCeldaDoc,
} from 'src/app/interfaces/documento-tabular';
import { LiquidacionVenta } from 'src/app/interfaces/liquidacion-venta';
import {
  EstadoLineaComision,
  TotalesTableroComision,
  VendedorTableroComision,
  redondear2,
} from 'src/app/shared/utils/tablero-comisiones.util';
import {
  etiquetaEstadoLiquidacion,
  fechaDMY,
  formatoCuit,
  mesCorteLiquidacion,
  nombreVendedorLiquidacion,
} from 'src/app/shared/utils/liquidacion-venta-vista.util';

/** QUÉ dicen el Excel/PDF de comisiones de venta (Frente Vendedores), puro:
 *  - la liquidación de un vendedor (DocumentoTabular → generar);
 *  - el tablero de comisiones del mes (LibroTabular → generarLibro).
 *  CÓMO se ven: los renderers genéricos de servicios/exportacion. Valores
 *  crudos (montos number, fechas 'YYYY-MM-DD', % como fracción). */

// ── Liquidación ──────────────────────────────────────────────────

const COLUMNAS_LIQUIDACION: ColumnaDoc[] = [
  { etiqueta: 'Cliente', tipo: 'texto', ancho: 28 },
  { etiqueta: 'N.º op', tipo: 'texto', alineacion: 'centro', ancho: 9 },
  { etiqueta: 'Fecha', tipo: 'fecha', ancho: 11 },
  { etiqueta: 'Base', tipo: 'moneda', ancho: 15 },
  { etiqueta: '%', tipo: 'porcentaje', ancho: 8 },
  { etiqueta: 'Comisión', tipo: 'moneda', ancho: 15 },
  { etiqueta: 'Liquidado antes', tipo: 'moneda', ancho: 15 },
  { etiqueta: 'Importe', tipo: 'moneda', ancho: 15 },
  { etiqueta: 'Ajuste', tipo: 'texto', alineacion: 'centro', ancho: 7 },
];
const INDICE_IMPORTE = 7;

export function armarDocumentoLiquidacionVenta(l: LiquidacionVenta): DocumentoTabular {
  const lineas = [...(l.lineas ?? [])].sort((a, b) =>
    a.razonSocial.localeCompare(b.razonSocial)
    || a.fecha.localeCompare(b.fecha)
    || a.numeroOperacion - b.numeroOperacion);

  const subtitulos = [
    `Vendedor: ${nombreVendedorLiquidacion(l)} — CUIT ${formatoCuit(l.vendedor?.cuit)}`,
    `Mes de corte: ${mesCorteLiquidacion(l)} · Emisión: ${fechaDMY(l.fechaEmision)} · ` +
    `Estado: ${etiquetaEstadoLiquidacion(l.estado)}`,
  ];
  if (l.pago) {
    subtitulos.push(
      `Pagada el ${fechaDMY(l.pago.fecha)}${l.pago.observacion ? ` — ${l.pago.observacion}` : ''}`,
    );
  }

  const anulada = l.estado === 'anulada';
  const ajustes = lineas.filter(x => x.ajuste).length;
  // Un concepto por nota (cada una va en su propio renglón en Excel y PDF).
  // Sin "−" (U+2212): la Helvetica estándar de jsPDF no lo tiene.
  const notas = [
    'Comisión: base × %.',
    'Importe: comisión menos liquidado antes.',
    'Liquidado antes: lo ya liquidado por esa operación en liquidaciones anteriores.',
  ];
  if (ajustes > 0) {
    notas.push(
      `Ajuste (${ajustes} en esta liquidación): comisión ya liquidada cuyo monto cambió por ` +
      'edición o baja de la operación. Se liquida solo la diferencia, que puede ser negativa.',
    );
  }

  return {
    nombreArchivo: limpiarNombreArchivo(
      `Liquidacion_comisiones_${l.numero}_${l.vendedor?.apellido ?? ''}_${l.vendedor?.nombre ?? ''}`,
    ),
    titulo: 'Liquidación de comisiones de venta',
    subtitulos,
    identificador: `N° ${l.numero}`,
    marca: anulada ? 'ANULADA' : null,
    leyenda: anulada && l.anulacion
      ? `Anulada el ${fechaDMY(l.anulacion.fecha)}: ${l.anulacion.motivo}`
      : null,
    columnas: COLUMNAS_LIQUIDACION,
    filas: lineas.map(x => [
      x.razonSocial,
      String(x.numeroOperacion),
      x.fecha,
      x.base ?? 0,
      (x.porcentaje ?? 0) / 100,
      x.monto ?? 0,
      x.previo ?? 0,
      x.importe ?? 0,
      x.ajuste ? 'Sí' : '',
    ]),
    columnaTotal: INDICE_IMPORTE,
    pie: [{ concepto: 'Total a liquidar', valor: l.total ?? 0, tipo: 'total' }],
    notas,
  };
}

// ── Tablero del mes ──────────────────────────────────────────────

/** Un vendedor tal como lo muestra el tablero (nombre resuelto en pantalla). */
export interface VendedorLibroComisiones {
  nombre: string;
  inactivo: boolean;
  datos: VendedorTableroComision;
}

/** Lo que necesita el Excel/PDF del tablero: exactamente lo que dibuja la
 *  pantalla (TableroActividadComponent), incluidos los vendedores en cero. */
export interface DatosLibroComisiones {
  mes: string;          // 'YYYY-MM'
  tituloMes: string;    // 'Agosto 2026'
  vendedores: VendedorLibroComisiones[];
  totales: TotalesTableroComision;
}

const ETIQUETA_ESTADO_LINEA: Record<EstadoLineaComision, string> = {
  pendiente: 'Pendiente',
  liquidada: 'Liquidada',
  ajuste: 'Ajuste',
  anulada: 'Anulada',
};

const NOTA_RESUMEN =
  'Arrastre: saldos pendientes de meses anteriores (cierres tardíos, ajustes, bajas). ' +
  'Saldo a liquidar: saldo pendiente del mes + arrastre.';

const NOTA_DETALLE =
  'Estado: Pendiente (sin liquidar), Liquidada, Ajuste (ya liquidada y con diferencia por ' +
  'edición o baja de la operación), Anulada (operación dada de baja). "(arrastre)": comisión ' +
  'de un mes anterior con saldo pendiente.';

export function armarLibroTableroComisiones(d: DatosLibroComisiones): LibroTabular {
  return {
    nombreArchivo: limpiarNombreArchivo(`Comisiones_vendedores_${d.mes}`),
    hojas: [hojaResumen(d), hojaDetalle(d)],
  };
}

function nombreConEstado(v: VendedorLibroComisiones): string {
  return v.inactivo ? `${v.nombre} (inactivo)` : v.nombre;
}

function hojaResumen(d: DatosLibroComisiones): HojaDoc {
  const t = d.totales;
  const tabla: TablaDoc = {
    titulo: null,
    grupos: [],
    columnas: [
      { etiqueta: 'Vendedor', tipo: 'texto', ancho: 30 },
      { etiqueta: 'Ops del mes', tipo: 'numero', ancho: 10 },
      { etiqueta: 'Comisiones del mes', tipo: 'moneda', ancho: 16 },
      { etiqueta: 'Liquidado del mes', tipo: 'moneda', ancho: 16 },
      { etiqueta: 'Arrastre', tipo: 'moneda', ancho: 16 },
      { etiqueta: 'Saldo a liquidar', tipo: 'moneda', ancho: 16 },
    ],
    filas: d.vendedores.map(v => [
      nombreConEstado(v),
      v.datos.cantidadOps,
      v.datos.comisionesMes,
      v.datos.liquidadoMes,
      v.datos.arrastre,
      v.datos.saldoALiquidar,
    ]),
    filaTotal: ['TOTAL', t.cantidadOps, t.comisionesMes, t.liquidadoMes, t.arrastre, t.saldoALiquidar],
  };
  return {
    nombre: 'Resumen',
    titulo: `Comisiones de ${d.tituloMes}`,
    subtitulos: ['Resumen por vendedor'],
    tablas: [tabla],
    notas: [NOTA_RESUMEN],
  };
}

function hojaDetalle(d: DatosLibroComisiones): HojaDoc {
  const columnas: ColumnaDoc[] = [
    { etiqueta: 'Cliente', tipo: 'texto', ancho: 28 },
    { etiqueta: 'N.º op', tipo: 'texto', alineacion: 'centro', ancho: 9 },
    { etiqueta: 'Fecha', tipo: 'fecha', ancho: 11 },
    { etiqueta: 'Base', tipo: 'moneda', ancho: 15 },
    { etiqueta: '%', tipo: 'porcentaje', ancho: 8 },
    { etiqueta: 'Comisión', tipo: 'moneda', ancho: 15 },
    { etiqueta: 'Liquidado', tipo: 'moneda', ancho: 15 },
    { etiqueta: 'Saldo', tipo: 'moneda', ancho: 15 },
    { etiqueta: 'Estado', tipo: 'texto', ancho: 16 },
  ];

  const tablas: TablaDoc[] = d.vendedores
    .filter(v => v.datos.clientes.length > 0)
    .map(v => {
      const filas: ValorCeldaDoc[][] = [];
      let monto = 0;
      let liquidado = 0;
      let saldo = 0;
      for (const cl of v.datos.clientes) {
        for (const l of cl.lineas) {
          filas.push([
            cl.razonSocial,
            String(l.numeroOperacion),
            l.fecha,
            l.base ?? 0,
            (l.porcentaje ?? 0) / 100,
            l.monto ?? 0,
            l.montoLiquidado ?? 0,
            l.saldo ?? 0,
            `${ETIQUETA_ESTADO_LINEA[l.estado] ?? l.estado}${l.arrastre ? ' (arrastre)' : ''}`,
          ]);
          monto += l.monto ?? 0;
          liquidado += l.montoLiquidado ?? 0;
          saldo += l.saldo ?? 0;
        }
      }
      return {
        titulo: nombreConEstado(v),
        grupos: [],
        columnas,
        filas,
        filaTotal: ['Total', '', '', null, null, redondear2(monto), redondear2(liquidado), redondear2(saldo), ''],
      };
    });

  return {
    nombre: 'Detalle',
    titulo: `Comisiones de ${d.tituloMes}`,
    subtitulos: ['Detalle por operación'],
    tablas,
    notas: tablas.length > 0
      ? [NOTA_DETALLE]
      : ['Sin comisiones en el mes ni saldos pendientes de meses anteriores.'],
  };
}

// ── Común ────────────────────────────────────────────────────────

/** Sin caracteres inválidos para el sistema de archivos; espacios → '_'. */
function limpiarNombreArchivo(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '_').replace(/_+/g, '_').replace(/_$/, '');
}
