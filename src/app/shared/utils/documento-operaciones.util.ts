import { ColumnaDoc, HojaDoc, LibroTabular, TablaDoc, ValorCeldaDoc } from 'src/app/interfaces/documento-tabular';
import { ConId } from 'src/app/interfaces/conId';
import { Operacion } from 'src/app/interfaces/operacion';
import { etiquetaEstadoOp } from './estado-op.util';
import { fechaLegible } from './fecha.util';
import { sanearNombreArchivo } from './nombre-archivo.util';

/** Lo que necesita el Excel del informe de operaciones. `operaciones` viene
 *  EXACTAMENTE como se ve en el tablero: ya filtrada y ordenada por la
 *  pantalla (el orden del array es el orden del archivo). `filtros` son los
 *  filtros activos en texto, para que el archivo se explique solo. */
export interface DatosLibroOperaciones {
  desde: string;   // 'YYYY-MM-DD'
  hasta: string;   // 'YYYY-MM-DD'
  operaciones: ConId<Operacion>[];
  filtros: string[];
}

/** Columnas del informe: las 20 del informe viejo
 *  (ExcelService.generarInformeOperaciones), en el mismo orden, más 'Extra Cl'
 *  y 'Extra Ch' — el adicional extra de la operación, que el informe viejo no
 *  mostraba aunque entraba en los totales. Van dentro del desglose de cada
 *  lado (base → km → acompañante → extra → total), así las columnas suman el
 *  total. No dependen de las columnas visibles del tablero: el informe es
 *  siempre completo. */
const COLUMNAS: ColumnaDoc[] = [
  col('Estado', 'texto', 12),
  col('Fecha', 'fecha', 11),
  col('Operacion', 'numero', 10),
  col('Km', 'numero', 7),

  col('Cliente', 'texto', 26),
  col('Tarifa Base Cl', 'moneda', 14),
  col('Adic Km Cl', 'moneda', 13),
  col('Acomp Cl', 'moneda', 13),
  col('Extra Cl', 'moneda', 13),
  col('Total Cl', 'moneda', 15),

  col('Chofer', 'texto', 24),
  col('Proveedor', 'texto', 20),
  col('Patente', 'texto', 10),
  col('Categoria', 'texto', 16),
  col('Tarifa Base Ch', 'moneda', 14),
  col('Adic Km Ch', 'moneda', 13),
  col('Acomp Ch', 'moneda', 13),
  col('Extra Ch', 'moneda', 13),
  col('Total Ch', 'moneda', 15),

  col('Acompañante', 'texto', 12, 'centro'),
  col('Hoja Ruta', 'texto', 14),
  col('Observaciones', 'texto', 30),
];

/** Índices que se suman en la fila Total: Km y las 10 columnas de monto. */
const INDICES_TOTAL = [3, 5, 6, 7, 8, 9, 14, 15, 16, 17, 18];

/** QUÉ dice el Excel del informe de operaciones (puro: no lee Firestore ni
 *  cachés, todo sale de la Operacion y sus snapshots).
 *
 *  Los montos salen SIEMPRE de `valoresNuevos` (única fuente desde TC10), con
 *  la tarifa base multiplicada por el multiplicador de ese lado — igual que el
 *  informe viejo y que el InformeOp. El extra es `adExtraValor` del lado (la
 *  SALIDA que calculó el motor, no la entrada `op.adExtra`): con multiplicador
 *  0 el motor lo deja en 0, y así la columna coincide con el total. Una
 *  operación sin `valoresNuevos` (nunca debería pasar en el modelo nuevo) deja
 *  los 10 montos en null: el renderer dibuja "—" y la fila Total no la suma,
 *  en vez de mentir con ceros. */
export function armarLibroOperaciones(d: DatosLibroOperaciones): LibroTabular {
  const filas: ValorCeldaDoc[][] = d.operaciones.map(op => {
    const vn = op.valoresNuevos;
    return [
      etiquetaEstadoOp(op.estado),
      op.fecha,
      op.numeroOperacion,
      op.km,

      op.cliente.razonSocial,
      vn ? vn.cliente.tarifaBase * (op.multiplicadorCliente ?? 0) : null,
      vn ? vn.cliente.kmAdicional : null,
      vn ? vn.cliente.acompValor : null,
      vn ? (vn.cliente.adExtraValor ?? 0) : null,
      vn ? vn.cliente.aCobrar : null,

      `${op.chofer.apellido} ${op.chofer.nombre}`,
      op.proveedor?.razonSocial ?? 'No',
      op.vehiculo.dominio,
      op.vehiculo.categoria?.nombre ?? 'Sin categoría',
      vn ? vn.chofer.tarifaBase * (op.multiplicadorChofer ?? 0) : null,
      vn ? vn.chofer.kmAdicional : null,
      vn ? vn.chofer.acompValor : null,
      vn ? (vn.chofer.adExtraValor ?? 0) : null,
      vn ? vn.chofer.aPagar : null,

      op.acompaniante ? 'Sí' : 'No',
      op.hojaRuta ?? '',
      op.observaciones ?? '',
    ];
  });

  const tabla: TablaDoc = {
    titulo: null,
    grupos: [],
    columnas: COLUMNAS,
    filas,
    filaTotal: filas.length > 0 ? filaTotal(filas) : null,
  };

  const hoja: HojaDoc = {
    nombre: 'Operaciones',
    titulo: 'Informe de Operaciones',
    subtitulos: [
      `Desde ${fechaLegible(d.desde, '—')} hasta ${fechaLegible(d.hasta, '—')} · ${d.operaciones.length} operación(es)`,
      ...(d.filtros.length > 0 ? [`Filtros: ${d.filtros.join(' · ')}`] : []),
    ],
    tablas: [tabla],
    notas: [
      'Montos por lado desde los valores de la operación: Total = tarifa base (por el multiplicador del lado) + adicional por km + acompañante + extra.',
      'Extra Cl / Extra Ch: adicional extra cargado al cerrar o al editar el InformeOp. El concepto no se exporta, solo el importe de cada lado.',
      'Totales: suma de las filas exportadas (las que se ven en el tablero con los filtros aplicados).',
    ],
  };

  return {
    nombreArchivo: sanearNombreArchivo(`Operaciones_${d.desde}_${d.hasta}`),
    hojas: [hoja],
  };
}

function col(
  etiqueta: string,
  tipo: ColumnaDoc['tipo'],
  ancho: number,
  alineacion?: ColumnaDoc['alineacion'],
): ColumnaDoc {
  return alineacion ? { etiqueta, tipo, ancho, alineacion } : { etiqueta, tipo, ancho };
}

/** Fila de totales: la etiqueta en la primera columna, la suma en Km y en las
 *  10 columnas de monto, null (→ "—") en el resto. */
function filaTotal(filas: ValorCeldaDoc[][]): ValorCeldaDoc[] {
  return COLUMNAS.map((_, i) => {
    if (i === 0) return `Total (${filas.length})`;
    if (!INDICES_TOTAL.includes(i)) return null;
    const suma = filas.reduce((acc, f) => acc + (typeof f[i] === 'number' ? (f[i] as number) : 0), 0);
    return Math.round(suma * 100) / 100;
  });
}
