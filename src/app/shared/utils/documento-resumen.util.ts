import { ColumnaDoc, GrupoColumnasDoc, HojaDoc, LibroTabular, TablaDoc, TipoCeldaDoc } from 'src/app/interfaces/documento-tabular';
import {
  ColumnaResumen,
  FilaResumen,
  ModoVista,
} from 'src/app/servicios/reportes/reportes-op/tabla-resumen-config.service';

/** Lo que necesita el Excel/PDF del resumen: exactamente lo que dibuja la
 *  pantalla (TablaResumenComponent). */
export interface DatosLibroResumen {
  filas: FilaResumen[];
  total: FilaResumen | null;
  columnas: ColumnaResumen[];
  columnasNiveles: ColumnaResumen[];
  tipo: 'general' | 'entidad';
  tipoEntidad?: 'cliente' | 'chofer' | 'proveedor';
  razonSocial: string;
  tituloPeriodo: string;
}

const MODOS: { modo: ModoVista; nombre: string }[] = [
  { modo: 'totales', nombre: 'Totales' },
  { modo: 'promedios', nombre: 'Promedios' },
  { modo: 'porcentajes', nombre: 'Porcentajes' },
];

const NOTA_PROMEDIOS =
  'Ops/día y niveles por día: divididos por los días operativos del mes ' +
  '(días sin domingos; el mes en curso, hasta hoy). Montos: promedio por operación ' +
  '(acompañante: por operación con acompañante).';

/** QUÉ dice el Excel/PDF del resumen de operaciones (puro): una hoja por
 *  modo, cada una con la tabla principal y la de niveles de tarifa, con los
 *  mismos valores que la pantalla (las valueFn de TablaResumenConfigService). */
export function armarLibroResumen(d: DatosLibroResumen): LibroTabular {
  return {
    nombreArchivo: nombreArchivoResumen(d),
    hojas: MODOS.map(m => armarHoja(d, m.modo, m.nombre)),
  };
}

function armarHoja(d: DatosLibroResumen, modo: ModoVista, nombre: string): HojaDoc {
  return {
    nombre,
    titulo: d.tipo === 'general'
      ? 'Resumen general de operaciones'
      : `Resumen de operaciones — ${d.razonSocial}`,
    subtitulos: [`Período: ${d.tituloPeriodo}`, `Vista: ${nombre}`],
    tablas: [
      armarTabla(d, d.columnas, modo, gruposPrincipal(d), null),
      armarTabla(d, d.columnasNiveles, modo, gruposNiveles(d), 'Operaciones por nivel de tarifa'),
    ],
    notas: modo === 'promedios' ? [NOTA_PROMEDIOS] : [],
  };
}

function armarTabla(
  d: DatosLibroResumen,
  columnas: ColumnaResumen[],
  modo: ModoVista,
  grupos: GrupoColumnasDoc[],
  titulo: string | null,
): TablaDoc {
  const visibles = columnas.filter(c => c.visible);
  const columnasDoc: ColumnaDoc[] = [
    { etiqueta: 'Período', tipo: 'texto', ancho: 10 },
    ...visibles.map(c => ({
      etiqueta: c.label,
      tipo: tipoCelda(c, modo),
      ancho: c.tipo === 'currency' ? 16 : 11,
    })),
  ];
  return {
    titulo,
    grupos,
    columnas: columnasDoc,
    filas: d.filas.map(f => [f.etiqueta, ...visibles.map(c => c.valueFn(f, modo))]),
    filaTotal: d.total
      ? [d.total.etiqueta, ...visibles.map(c => c.valueFn(d.total!, modo))]
      : null,
  };
}

/** Tipo de celda según la columna y el modo (mismo criterio que formatValue). */
function tipoCelda(c: ColumnaResumen, modo: ModoVista): TipoCeldaDoc {
  if (modo === 'porcentajes') return 'porcentaje';
  if (c.tipo === 'currency') return 'moneda';
  return modo === 'totales' ? 'numero' : 'decimal';
}

/** Igual que el encabezado de la tabla principal en pantalla: Período +
 *  Operación (4) + Totales (3) + Cliente/Chofer (4 c/u) o Valores (4). */
function gruposPrincipal(d: DatosLibroResumen): GrupoColumnasDoc[] {
  const base: GrupoColumnasDoc[] = [
    { etiqueta: '', span: 1 },
    { etiqueta: 'Operación', span: 4 },
    { etiqueta: 'Totales', span: 3 },
  ];
  return d.tipo === 'general'
    ? [...base, { etiqueta: 'Cliente', span: 4 }, { etiqueta: 'Chofer', span: 4 }]
    : [...base, { etiqueta: 'Valores', span: 4 }];
}

function gruposNiveles(d: DatosLibroResumen): GrupoColumnasDoc[] {
  if (d.tipo === 'general') {
    return [{ etiqueta: '', span: 1 }, { etiqueta: 'Cliente', span: 4 }, { etiqueta: 'Chofer', span: 4 }];
  }
  return [{ etiqueta: '', span: 1 }, { etiqueta: d.tipoEntidad === 'cliente' ? 'Cliente' : 'Chofer', span: 4 }];
}

/** "Resumen_op_<razón social>_<período>", sin caracteres inválidos. */
function nombreArchivoResumen(d: DatosLibroResumen): string {
  const limpio = (s: string) => s.replace(/[\\/:*?"<>|→]+/g, '-').replace(/\s+/g, '_').replace(/_+/g, '_');
  return limpio(`Resumen_op_${d.razonSocial || 'General'}_${d.tituloPeriodo}`);
}
