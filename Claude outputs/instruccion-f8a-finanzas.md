````
# Instrucción F8a — Finanzas: exportar a Excel y PDF (cuenta, Cuentas, Antigüedad, Movimientos)

## Contexto

Frente Finanzas. Diseño: `claude/diseno-finanzas.md` §22.1 (F40, F56, F57).
F8 se parte en F8a (exportaciones) y F8b (Recibo / Orden de pago). Este
bloque es F8a.

**Reutiliza lo de Reportes.** `LibroTabular` (hojas con título,
subtítulos, varias tablas con fila de total y notas) y sus renderers ya
existen:
- `ExcelTabularService.generarLibro`: una pestaña por hoja;
- `PdfTabularService.generarLibro`: cada hoja en página nueva, con logo y
  "Página X de Y".

No hay modelo nuevo ni se tocan los renderers.

**Qué se exporta.** Lo que muestra la pantalla (F57).

| Pantalla | Libro | Filtros que respeta |
|---|---|---|
| Cuentas | 1 hoja, con las columnas de la tabla y la fila Total | lado, búsqueda, orden de la tabla |
| Antigüedad | 1 hoja: tramos, días prom., estado (con la marca "N fact. +90") y fila Total; % por tramo en el subtítulo; umbrales en las notas | lado, estado, búsqueda, orden |
| Movimientos | 1 hoja; la fila "Total vigentes" no suma anulados | rango, tipo, estado, búsqueda, orden |
| Cuenta de la entidad | 4 hojas: Resumen (saldo de la cuenta y tramos), Comprobantes, Mayor (con saldo anterior pegado a lo más viejo, totales y saldo final) y Movimientos | "solo abiertos", rango y orden del Mayor |

**El orden "que se ve":** cada pestaña toma las filas del
`TablaListadoComponent` con `@ViewChild`. Su `filas` ya está ordenado por
la columna que eligió el usuario. Si la tabla no está, usa el array
filtrado.

**Piezas:**
- `shared/utils/exportacion-finanzas.util.ts` (nuevo, puro):
  `armarLibroCuentas`, `armarLibroAntiguedad`, `armarLibroMovimientos`,
  `armarLibroCuenta` y `sanearNombreArchivo`. Los valores van crudos
  (number / 'YYYY-MM-DD') y el formato lo pone cada renderer. Los textos
  usan solo caracteres WinAnsi.
- `servicios/finanzas-nueva/finanzas-export.service.ts` (nuevo):
  `descargar(libro, 'excel' | 'pdf')` genera el archivo y lo guarda con
  FileSaver (como `LiquidacionExportService`). Sin log: es lectura.
- **Botones "Excel" / "PDF":** chicos, al lado del contador en Cuentas,
  Antigüedad y Movimientos, y junto a "Registrar ajuste" en la cuenta. Se
  deshabilitan mientras carga o exporta, y cuando no hay filas. Sin
  permiso: el rol demo también exporta.

Sin índices ni reglas: NO hay deploy.

Ya verificado:

- tsc estricto (también sin locales sin uso), con stubs;
- prueba rápida de los 6 libros (cuentas a cobrar y a pagar, antigüedad
  a cobrar y a pagar con filtros, movimientos con un anulado, cuenta con
  rango del Mayor):
  - cada fila y cada total tienen la cantidad de columnas de su tabla;
  - los totales suman las columnas correctas (no el CUIT ni los días);
  - todos los textos son WinAnsi (se encontró y corrigió un "−");
  - porcentajes y montos de los subtítulos en formato es-AR.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto BUSCAR no aparece, o aparece más de una vez: pará y reportá,
  sin improvisar.
- Archivos con finales de línea LF.
- Build: `npm run build:demo`.
- No toques CLAUDE.md ni CHANGELOG.
- No se modifican tipos existentes.
- Todos los cambios a archivos existentes son BUSCAR/REEMPLAZAR. Los
  archivos nuevos dicen "NUEVO" en el título del paso.
- La instrucción termina con la línea `FIN DE LA INSTRUCCIÓN F8a`. Si no la
  ves, llegó cortada: leela completa (por partes si hace falta) antes de
  empezar.

## PASO 0 — Verificación (sin cambios)

Corré y reportá la salida:

```bash
grep -rn "generarLibro(" src/app --include=*.ts
grep -n "import \* as FileSaver from 'file-saver'" src/app/servicios/informes-liq/liquidacion-export.service.ts
grep -n "^  filas: T\[\] = \[\];" src/app/shared/tabla/tabla-listado/tabla-listado.component.ts
grep -rn "armarLibroCuentas\|FinanzasExportService\|exportacion-finanzas" src/app
ls src/app/shared/utils/exportacion-finanzas.util.ts src/app/servicios/finanzas-nueva/finanzas-export.service.ts
```

Esperado:

- El grep 1: las definiciones en `excel-tabular.service.ts` y
  `pdf-tabular.service.ts`, y los usos de Reportes.
- El grep 2: 1 línea.
- El grep 3: 1 línea. `filas` es público, así que se puede leer con
  `@ViewChild`.
- El grep 4: nada.
- El `ls`: no existen.

Si algo no coincide, pará y reportá.

## PASO 1 — NUEVO `src/app/shared/utils/exportacion-finanzas.util.ts`

```ts
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
```

## PASO 2 — NUEVO `src/app/servicios/finanzas-nueva/finanzas-export.service.ts`

```ts
import { Injectable, inject } from '@angular/core';
import * as FileSaver from 'file-saver';
import { LibroTabular } from 'src/app/interfaces/documento-tabular';
import { ExcelTabularService } from 'src/app/servicios/exportacion/excel-tabular.service';
import { PdfTabularService } from 'src/app/servicios/exportacion/pdf-tabular.service';

export type FormatoExportacionFin = 'excel' | 'pdf';

/** Exportación de Finanzas (F8a): dibuja un LibroTabular (armado por los
 *  utils puros de exportacion-finanzas.util) con los renderers genéricos y
 *  lo descarga. Solo lectura: sin log. */
@Injectable({ providedIn: 'root' })
export class FinanzasExportService {

  private excel = inject(ExcelTabularService);
  private pdf = inject(PdfTabularService);

  async descargar(libro: LibroTabular, formato: FormatoExportacionFin): Promise<void> {
    const blob = formato === 'excel' ? await this.excel.generarLibro(libro) : await this.pdf.generarLibro(libro);
    FileSaver.saveAs(blob, `${libro.nombreArchivo}.${formato === 'excel' ? 'xlsx' : 'pdf'}`);
  }
}
```

## PASO 3 — `src/app/raiz/finanzas-nueva/cuentas/finanzas-cuentas.component.ts`

#### 3a

BUSCAR:
```ts
import { Component, OnDestroy, OnInit } from '@angular/core';
```

REEMPLAZAR:
```ts
import { Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FinanzasExportService, FormatoExportacionFin } from 'src/app/servicios/finanzas-nueva/finanzas-export.service';
import { TablaListadoComponent } from 'src/app/shared/tabla/tabla-listado/tabla-listado.component';
import { armarLibroCuentas } from 'src/app/shared/utils/exportacion-finanzas.util';
```

#### 3b

BUSCAR:
```ts
  private destroy$ = new Subject<void>();
```

REEMPLAZAR:
```ts
  /** La tabla: de ahí salen las filas EN EL ORDEN que se ve (F57). */
  @ViewChild(TablaListadoComponent) tabla?: TablaListadoComponent<Fila>;
  exportando = false;
  private exportServ = inject(FinanzasExportService);

  private destroy$ = new Subject<void>();
```

#### 3c

BUSCAR:
```ts
  ngOnDestroy(): void {
```

REEMPLAZAR:
```ts
  /** Excel / PDF de lo que muestra la tabla (lado, búsqueda y orden; F8a). */
  async exportar(formato: FormatoExportacionFin): Promise<void> {
    if (this.exportando) return;
    this.exportando = true;
    try {
      const filas = this.tabla?.filas ?? this.filtradas;
      await this.exportServ.descargar(armarLibroCuentas(filas, this.filtros.lado, this.filtros.texto, this.hoy), formato);
    } catch (e: any) {
      console.error('Error al exportar Cuentas', e);
      this.error = `No se pudo exportar: ${e?.message ?? e}`;
    } finally {
      this.exportando = false;
    }
  }

  ngOnDestroy(): void {
```

## PASO 4 — `src/app/raiz/finanzas-nueva/cuentas/finanzas-cuentas.component.html`

#### 4a

BUSCAR:
```html
  <span class="ms-auto text-muted">{{ filtradas.length }} cuenta(s)</span>
```

REEMPLAZAR:
```html
  <span class="ms-auto text-muted">{{ filtradas.length }} cuenta(s)</span>
  <div class="btn-group btn-group-sm" role="group" aria-label="Exportar">
    <button type="button" class="btn btn-outline-secondary" [disabled]="exportando || cargando || filtradas.length === 0" (click)="exportar('excel')">Excel</button>
    <button type="button" class="btn btn-outline-secondary" [disabled]="exportando || cargando || filtradas.length === 0" (click)="exportar('pdf')">PDF</button>
  </div>
```

## PASO 5 — `src/app/raiz/finanzas-nueva/antiguedad/finanzas-antiguedad.component.ts`

#### 5a

BUSCAR:
```ts
import { Component, OnDestroy, OnInit } from '@angular/core';
```

REEMPLAZAR:
```ts
import { Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FinanzasExportService, FormatoExportacionFin } from 'src/app/servicios/finanzas-nueva/finanzas-export.service';
import { TablaListadoComponent } from 'src/app/shared/tabla/tabla-listado/tabla-listado.component';
import { armarLibroAntiguedad } from 'src/app/shared/utils/exportacion-finanzas.util';
```

#### 5b

BUSCAR:
```ts
  private destroy$ = new Subject<void>();
```

REEMPLAZAR:
```ts
  /** La tabla: de ahí salen las filas EN EL ORDEN que se ve (F57). */
  @ViewChild(TablaListadoComponent) tabla?: TablaListadoComponent<Fila>;
  exportando = false;
  private exportServ = inject(FinanzasExportService);

  private destroy$ = new Subject<void>();
```

#### 5c

BUSCAR:
```ts
  ngOnDestroy(): void {
```

REEMPLAZAR:
```ts
  /** Excel / PDF de lo que muestra la tabla (lado, estado, búsqueda y
   *  orden; F8a). */
  async exportar(formato: FormatoExportacionFin): Promise<void> {
    if (this.exportando) return;
    this.exportando = true;
    try {
      const filas = this.tabla?.filas ?? this.filtradas;
      const libro = armarLibroAntiguedad(filas, this.filtros.lado, { texto: this.filtros.texto, estado: this.filtros.estado }, this.hoy);
      await this.exportServ.descargar(libro, formato);
    } catch (e: any) {
      console.error('Error al exportar Antigüedad', e);
      this.error = `No se pudo exportar: ${e?.message ?? e}`;
    } finally {
      this.exportando = false;
    }
  }

  ngOnDestroy(): void {
```

## PASO 6 — `src/app/raiz/finanzas-nueva/antiguedad/finanzas-antiguedad.component.html`

#### 6a

BUSCAR:
```html
  <span class="ms-auto text-muted">{{ filtradas.length }} de {{ delLado.length }} cuenta(s) · al {{ hoyLegible }}</span>
```

REEMPLAZAR:
```html
  <span class="ms-auto text-muted">{{ filtradas.length }} de {{ delLado.length }} cuenta(s) · al {{ hoyLegible }}</span>
  <div class="btn-group btn-group-sm" role="group" aria-label="Exportar">
    <button type="button" class="btn btn-outline-secondary" [disabled]="exportando || cargando || filtradas.length === 0" (click)="exportar('excel')">Excel</button>
    <button type="button" class="btn btn-outline-secondary" [disabled]="exportando || cargando || filtradas.length === 0" (click)="exportar('pdf')">PDF</button>
  </div>
```

## PASO 7 — `src/app/raiz/finanzas-nueva/movimientos/finanzas-movimientos.component.ts`

#### 7a

BUSCAR:
```ts
import { Component, OnDestroy, OnInit } from '@angular/core';
```

REEMPLAZAR:
```ts
import { Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FinanzasExportService, FormatoExportacionFin } from 'src/app/servicios/finanzas-nueva/finanzas-export.service';
import { TablaListadoComponent } from 'src/app/shared/tabla/tabla-listado/tabla-listado.component';
import { armarLibroMovimientos } from 'src/app/shared/utils/exportacion-finanzas.util';
```

#### 7b

BUSCAR:
```ts
  private destroy$ = new Subject<void>();
```

REEMPLAZAR:
```ts
  /** La tabla: de ahí salen las filas EN EL ORDEN que se ve (F57). */
  @ViewChild(TablaListadoComponent) tabla?: TablaListadoComponent<Fila>;
  exportando = false;
  private exportServ = inject(FinanzasExportService);

  private destroy$ = new Subject<void>();
```

#### 7c

BUSCAR:
```ts
  ngOnDestroy(): void {
```

REEMPLAZAR:
```ts
  /** Excel / PDF de lo que muestra la tabla (rango, filtros y orden; F8a). */
  async exportar(formato: FormatoExportacionFin): Promise<void> {
    if (this.exportando) return;
    this.exportando = true;
    try {
      const filas = this.tabla?.filas ?? this.filtrados;
      await this.exportServ.descargar(armarLibroMovimientos(filas, this.filtros, this.hoy), formato);
    } catch (e: any) {
      console.error('Error al exportar Movimientos', e);
      this.error = `No se pudo exportar: ${e?.message ?? e}`;
    } finally {
      this.exportando = false;
    }
  }

  ngOnDestroy(): void {
```

## PASO 8 — `src/app/raiz/finanzas-nueva/movimientos/finanzas-movimientos.component.html`

#### 8a

BUSCAR:
```html
  <span class="ms-auto text-muted">{{ filtrados.length }} movimiento(s)</span>
```

REEMPLAZAR:
```html
  <span class="ms-auto text-muted">{{ filtrados.length }} movimiento(s)</span>
  <div class="btn-group btn-group-sm" role="group" aria-label="Exportar">
    <button type="button" class="btn btn-outline-secondary" [disabled]="exportando || cargando || filtrados.length === 0" (click)="exportar('excel')">Excel</button>
    <button type="button" class="btn btn-outline-secondary" [disabled]="exportando || cargando || filtrados.length === 0" (click)="exportar('pdf')">PDF</button>
  </div>
```

## PASO 9 — `src/app/raiz/finanzas-nueva/cuenta-entidad/cuenta-entidad.component.ts`

#### 9a

BUSCAR:
```ts
import { Component, OnDestroy, OnInit } from '@angular/core';
```

REEMPLAZAR:
```ts
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FinanzasExportService, FormatoExportacionFin } from 'src/app/servicios/finanzas-nueva/finanzas-export.service';
import { armarLibroCuenta } from 'src/app/shared/utils/exportacion-finanzas.util';
```

#### 9b

BUSCAR:
```ts
  private destroy$ = new Subject<void>();
```

REEMPLAZAR:
```ts
  exportando = false;
  private exportServ = inject(FinanzasExportService);

  private destroy$ = new Subject<void>();
```

#### 9c

BUSCAR:
```ts
  ngOnDestroy(): void {
```

REEMPLAZAR:
```ts
  /** Excel / PDF de la cuenta (F40, F8a): Resumen, Comprobantes (con el
   *  filtro "solo abiertos"), Mayor (rango y orden elegidos) y Movimientos. */
  async exportar(formato: FormatoExportacionFin): Promise<void> {
    if (this.exportando || !this.resumen || !this.mayor || this.noExiste) return;
    this.exportando = true;
    try {
      const libro = armarLibroCuenta({
        tipo: this.tipo,
        nombre: this.nombre,
        cuit: this.cuit,
        resumen: this.resumen,
        comprobantes: this.comprobantesVisibles,
        soloAbiertos: this.filtros.soloAbiertos,
        mayor: this.mayor,
        lineasMayor: this.lineasMayor,
        mayorDesde: this.filtros.mayorDesde,
        mayorHasta: this.filtros.mayorHasta,
        movimientos: this.movimientos,
        hoy: this.hoy,
      });
      await this.exportServ.descargar(libro, formato);
    } catch (e: any) {
      console.error('Error al exportar la cuenta', e);
      this.error = `No se pudo exportar: ${e?.message ?? e}`;
    } finally {
      this.exportando = false;
    }
  }

  ngOnDestroy(): void {
```

## PASO 10 — `src/app/raiz/finanzas-nueva/cuenta-entidad/cuenta-entidad.component.html`

#### 10a

BUSCAR:
```html
    (click)="registrarAjuste()"
  >Registrar ajuste</button>
```

REEMPLAZAR:
```html
    (click)="registrarAjuste()"
  >Registrar ajuste</button>
  <div class="btn-group btn-group-sm" role="group" aria-label="Exportar">
    <button type="button" class="btn btn-outline-secondary" [disabled]="exportando || cargando || noExiste || !resumen || !mayor" (click)="exportar('excel')">Excel</button>
    <button type="button" class="btn btn-outline-secondary" [disabled]="exportando || cargando || noExiste || !resumen || !mayor" (click)="exportar('pdf')">PDF</button>
  </div>
```

## PASO 11 — Verificación

```bash
npm run build:demo
grep -c "^export function" src/app/shared/utils/exportacion-finanzas.util.ts   # 5
grep -rln "exportar('excel')" src/app/raiz/finanzas-nueva   # 4 html
grep -rn "@ViewChild(TablaListadoComponent)" src/app/raiz/finanzas-nueva   # 3
git status --short
```

Esperado:

- El build termina sin errores. Los warnings de presupuesto previos no
  cuentan.
- Los conteos coinciden.
- `git status` muestra:
  - 8 archivos modificados: Cuentas, Antigüedad, Movimientos y
    cuenta-entidad, ts y html de cada uno;
  - 2 archivos nuevos: el util y el servicio;
  - lo tuyo sin trackear, si lo hay.

Reportá la salida.

## Pruebas manuales (demo)

1. **Cuentas (A cobrar):**
   - Excel: una pestaña "Cuentas a cobrar" con logo, título, fecha, las
     columnas de la tabla y la fila Total. Los montos son números (se
     pueden sumar en Excel);
   - ordená por "Facturado abierto" y volvé a exportar: el Excel respeta
     ese orden;
   - con una búsqueda, el subtítulo la muestra y solo salen esas filas;
   - PDF: lo mismo, apaisado si no entra en vertical.
2. **Cuentas (A pagar):** incluye la columna Tipo.
3. **Antigüedad:**
   - con el filtro "Crítico", solo esas cuentas y el subtítulo "Filtros:
     estado crítico";
   - % por tramo en el subtítulo y umbrales en la nota;
   - Estado con la marca ("Atención · 1 fact. +90").
4. **Movimientos:**
   - el rango y los filtros en el subtítulo;
   - un anulado aparece con estado Anulado, pero "Total vigentes" no lo
     suma;
   - las fechas son fechas de Excel (no texto).
5. **Cuenta de un cliente con historia:**
   - Excel con 4 pestañas (Resumen, Comprobantes, Mayor, Movimientos);
   - Resumen: el saldo de la cuenta coincide con la tarjeta;
   - Mayor: con "Desde" a mitad de la historia, la fila "Saldo anterior"
     queda pegada a lo más viejo (abajo con "más recientes primero",
     arriba con el orden invertido) y el saldo final coincide;
   - Comprobantes: con "solo abiertos" desmarcado salen todos.
6. **Cuenta de un chofer con anticipo compensado y devolución (F7b):** en
   el Mayor, las etiquetas Anticipo / Compensación / Devolución y la
   columna "Situación" ("le debemos" / "a favor nuestro").
7. **PDF de la cuenta:** cada hoja empieza en página nueva. Los acentos y
   la ñ se ven bien: no hay caracteres raros.
8. **Botones:** se deshabilitan mientras carga y con la tabla vacía. Con el
   rol demo también aparecen.

## Commit (lo hace Nico)

```
feat(finanzas): exportar a Excel y PDF — cuenta, Cuentas, Antigüedad y Movimientos (F8a)

- exportacion-finanzas.util: armarLibroCuentas, armarLibroAntiguedad,
  armarLibroMovimientos, armarLibroCuenta (Resumen, Comprobantes, Mayor,
  Movimientos) sobre LibroTabular; lo que se ve (filtros, rango, orden).
- FinanzasExportService.descargar: generarLibro (Excel / PDF) +
  FileSaver.
- Botones Excel / PDF en las tres pestañas y en la cuenta de la entidad;
  orden de la tabla vía @ViewChild(TablaListadoComponent).
```

FIN DE LA INSTRUCCIÓN F8a
````
