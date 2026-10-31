import { ColumnaDoc, HojaDoc, LibroTabular, TablaDoc, ValorCeldaDoc } from 'src/app/interfaces/documento-tabular';
import { AsignacionItem } from 'src/app/interfaces/asignacion';
import { Chofer } from 'src/app/interfaces/chofer';
import { ConIdType } from 'src/app/interfaces/conId';
import { MotivoNoDisponible } from 'src/app/interfaces/no-disponibilidad';
import { fechaLegible } from './fecha.util';
import { causaMotivo, resumirMotivos } from './no-disponibilidad.util';
import { sanearNombreArchivo } from './nombre-archivo.util';

/** Un vehículo de la flota (los que lista el pool del tablero) que no está
 *  disponible en la fecha, con los registros que lo impiden. */
export interface VehiculoNoDisponibleInforme {
  duenio: string;                       // 'Apellido, Nombre' o razón social
  tipoDuenio: 'Chofer directo' | 'Proveedor';
  dominio: string;
  categoria: string;
  motivos: MotivoNoDisponible[];
}

/** Un chofer de proveedor no disponible en la fecha. No tiene vehículo propio
 *  (los vehículos son del proveedor), así que no aparece en el pool: va aparte. */
export interface ChoferProveedorNoDisponibleInforme {
  chofer: string;
  proveedor: string;
  motivos: MotivoNoDisponible[];
}

/** La disponibilidad de la fecha, YA RESUELTA por la fachada con
 *  DisponibilidadService y `consultasDeAsignacion` — la misma regla que marca
 *  el tablero y que aplican las guardas. El util sólo la presenta. */
export interface DisponibilidadInforme {
  /** Ítems ACTIVOS del tablero no disponibles, por idItem. */
  porItem: Readonly<Record<string, MotivoNoDisponible[]>>;
  vehiculos: VehiculoNoDisponibleInforme[];
  choferesDeProveedor: ChoferProveedorNoDisponibleInforme[];
}

/** Lo que necesita el informe del tablero de asignaciones. `items` viene
 *  EXACTAMENTE como está en pantalla (el borrador en modo edición, el tablero
 *  confirmado en modo visor): el orden del array es el orden del archivo.
 *
 *  `clientes` resuelve la razón social de `item.idCliente` sin que el util
 *  conozca ningún servicio. `choferes` resuelve el nombre del chofer de un
 *  item de proveedor (`sujeto.idChofer`, que se elige después de asignar).
 *  `disponibilidad` null = no se pudo verificar (datos sin cargar): el informe
 *  lo dice, no lo omite ni lo da por disponible. */
export interface DatosLibroAsignaciones {
  fecha: string;                    // 'YYYY-MM-DD' del tablero
  estado: 'borrador' | 'confirmado';
  items: AsignacionItem[];
  clientes: { id: string; razonSocial: string }[];
  choferes: ConIdType<Chofer>[];
  disponibilidad: DisponibilidadInforme | null;
}

/** Hoja 1 — una fila por asignación.
 *
 *  `Chofer` y `Proveedor` en columnas SEPARADAS en vez de un "Asignado a" +
 *  "Tipo": así se filtra por proveedor, y la pregunta que el informe tiene que
 *  responder ("qué choferes mandé") se lee en una sola columna. En un item de
 *  chofer directo, Proveedor queda vacía; en uno de proveedor, Chofer queda
 *  vacía hasta que se resuelve en operaciones-editor.
 *
 *  `Estado` y `Motivo anulación` también separadas, por la lección de IE2b: un
 *  "Anulada: el cliente canceló" sería un valor distinto de "Anulada" para el
 *  filtro de la Tabla, y la columna dejaría de servir para filtrar.
 *
 *  `No disponible`: lo mismo que el borde rojo del ítem en el tablero.
 *
 *  NO hay columna de operación: `AsignacionItem.idOperacion` guarda el
 *  document id de Firestore, no el número de operación (ese es
 *  `Operacion.numeroOperacion`), y resolverlo pediría leer cada operación. */
const COLUMNAS_ASIGNACIONES: ColumnaDoc[] = [
  col('Cliente', 'texto', 28),
  col('Categoría', 'texto', 14),
  col('Dominio', 'texto', 11),
  col('Chofer', 'texto', 24),
  col('Proveedor', 'texto', 24),
  col('Observación', 'texto', 30),
  col('Hoja de ruta', 'texto', 24),
  col('Estado', 'texto', 10),
  col('Motivo anulación', 'texto', 26),
  col('No disponible', 'texto', 34),
];

/** Hoja 2, tabla 1 — una fila por vehículo Y CAUSA: un vehículo que cae por
 *  dos registros (taller y licencia del chofer) aparece dos veces, para poder
 *  filtrar por causa o por motivo. */
const COLUMNAS_VEHICULOS: ColumnaDoc[] = [
  col('Dueño', 'texto', 24),
  col('Tipo', 'texto', 14),
  col('Dominio', 'texto', 11),
  col('Categoría', 'texto', 14),
  col('Causa', 'texto', 26),
  col('Desde', 'fecha', 12),
  col('Hasta', 'fecha', 12),
  col('Motivo', 'texto', 28),
];

/** Hoja 2, tabla 2 — una fila por chofer de proveedor Y CAUSA. */
const COLUMNAS_CHOFERES_PROVEEDOR: ColumnaDoc[] = [
  col('Chofer', 'texto', 24),
  col('Proveedor', 'texto', 24),
  col('Causa', 'texto', 26),
  col('Desde', 'fecha', 12),
  col('Hasta', 'fecha', 12),
  col('Motivo', 'texto', 28),
];

/** QUÉ dice el informe del tablero de asignaciones de UNA fecha: las
 *  asignaciones del día y lo que ese día no estaba disponible. Las tablas son
 *  Tabla de Excel (informes de TRABAJO: se filtran y se ordenan) y ninguna
 *  lleva fila de totales — no hay columnas numéricas que sumar. */
export function armarLibroAsignaciones(d: DatosLibroAsignaciones): LibroTabular {
  const razonSocial = new Map(d.clientes.map(c => [c.id, c.razonSocial]));
  const nombresChofer = new Map(d.choferes.map(c => [c.id, nombreChofer(c)]));

  const filasAsignaciones = d.items.map(it => filaAsignacion(it, razonSocial, nombresChofer, d.disponibilidad));

  const etiquetaEstado = d.estado === 'borrador' ? 'Borrador (sin dar de alta)' : 'Confirmado';
  const activas = d.items.filter(it => it.estado.estado === 'activa').length;

  const hojaAsignaciones: HojaDoc = {
    nombre: 'Asignaciones',
    titulo: `Tablero de asignaciones — ${fechaLegible(d.fecha)}`,
    subtitulos: [
      `${etiquetaEstado} · ${plural(d.items.length, 'asignación', 'asignaciones')}` +
        (activas === d.items.length ? '' : ` (${activas} activas)`),
    ],
    tablas: [tabla('Asignaciones', null, COLUMNAS_ASIGNACIONES, filasAsignaciones)],
    notas: [
      'Las asignaciones salen del tablero tal como está en pantalla: el borrador en modo edición, el tablero confirmado en modo visor.',
      'Chofer y Proveedor son excluyentes: un vehículo de proveedor deja Chofer vacía hasta que se elige el chofer al dar de alta las operaciones.',
      'Un tablero confirmado conserva las asignaciones anuladas, para no perder el registro de lo que se asignó ese día.',
      'No disponible: las asignaciones activas cuyo vehículo, chofer o proveedor no está disponible en la fecha (las que el tablero marca con borde rojo).',
      ...(d.disponibilidad === null ? [SIN_VERIFICAR] : []),
    ],
  };

  return {
    nombreArchivo: sanearNombreArchivo(`Asignaciones_${d.fecha}`),
    hojas: [hojaAsignaciones, hojaNoDisponibles(d)],
  };
}

// ── internos ────────────────────────────────────────────────────────

const SIN_VERIFICAR =
  'NO SE PUDO VERIFICAR LA DISPONIBILIDAD: los datos todavía no habían terminado de cargar al '
  + 'generar el informe. Volvé a descargarlo en unos segundos.';

function hojaNoDisponibles(d: DatosLibroAsignaciones): HojaDoc {
  const disp = d.disponibilidad;
  const filasVehiculos: ValorCeldaDoc[][] = [];
  const filasChoferes: ValorCeldaDoc[][] = [];
  for (const v of disp?.vehiculos ?? []) {
    for (const m of v.motivos) {
      filasVehiculos.push([v.duenio, v.tipoDuenio, v.dominio, v.categoria, ...columnasMotivo(m)]);
    }
  }
  for (const c of disp?.choferesDeProveedor ?? []) {
    for (const m of c.motivos) {
      filasChoferes.push([c.chofer, c.proveedor, ...columnasMotivo(m)]);
    }
  }

  return {
    nombre: 'No disponibles',
    titulo: `No disponibles — ${fechaLegible(d.fecha)}`,
    subtitulos: disp === null
      ? ['Disponibilidad sin verificar']
      : [
          `${plural(disp.vehiculos.length, 'vehículo', 'vehículos')} · ` +
          `${plural(disp.choferesDeProveedor.length, 'chofer de proveedor', 'choferes de proveedor')}`,
        ],
    tablas: [
      tabla('NoDisponiblesVehiculos', 'Vehículos', COLUMNAS_VEHICULOS, filasVehiculos),
      tabla('NoDisponiblesChoferesProv', 'Choferes de proveedor', COLUMNAS_CHOFERES_PROVEEDOR, filasChoferes),
    ],
    notas: [
      ...(disp === null ? [SIN_VERIFICAR] : []),
      'Se cuenta con la misma regla que marca el tablero y que aplican las guardas: un vehículo no está disponible por un registro propio, por uno de su chofer directo, por uno de su proveedor, o si a su proveedor no le queda ningún chofer disponible.',
      'Causa: el chofer, vehículo o proveedor que tiene la no disponibilidad cargada. Un vehículo que cae por dos causas aparece en dos filas.',
      'Vehículos: los de choferes directos y proveedores activos, como el pool del tablero.',
      'Choferes de proveedor: aparte, porque no tienen vehículo propio; se eligen al dar de alta las operaciones.',
      'Solo lo que está no disponible en la fecha del tablero, no todo lo cargado.',
      'Hasta sin valor (celda vacía en el Excel, "—" en el PDF) significa sin fecha de fin prevista.',
    ],
  };
}

function columnasMotivo(m: MotivoNoDisponible): ValorCeldaDoc[] {
  const nd = m.noDisponibilidad;
  return [causaMotivo(m), nd.desde, nd.hasta, nd.motivo];
}

/** Una tabla sin fila de totales y como Tabla de Excel real.
 *  `nombre` es el nombre del ListObject: único en el LIBRO y sin espacios. */
function tabla(nombre: string, titulo: string | null, columnas: ColumnaDoc[], filas: ValorCeldaDoc[][]): TablaDoc {
  return { titulo, grupos: [], columnas, filas, filaTotal: null, excel: { nombre } };
}

function filaAsignacion(
  it: AsignacionItem,
  razonSocial: Map<string, string>,
  nombresChofer: Map<string, string>,
  disponibilidad: DisponibilidadInforme | null,
): ValorCeldaDoc[] {
  const duenio = it.ref.asignadoA;
  // Chofer directo: el nombre congelado en el snapshot (verdad histórica del
  // tablero). De proveedor: el chofer que se eligió al dar de alta, resuelto
  // contra los choferes vivos; vacío mientras no se eligió.
  const chofer = duenio.tipo === 'chofer'
    ? `${duenio.apellido}, ${duenio.nombre}`
    : nombreChoferDeSujeto(it, nombresChofer);
  const proveedor = duenio.tipo === 'proveedor' ? duenio.razonSocial : '';
  // El estado se lee del discriminante, NO de si el motivo está vacío: una
  // anulación puede haberse guardado sin motivo, y ahí "Activa" sería falso.
  const anulada = it.estado.estado === 'anulada';
  const motivoAnulacion = it.estado.estado === 'anulada' ? it.estado.motivo : '';
  return [
    razonSocial.get(it.idCliente) ?? 'Sin resolver',
    it.ref.categoria.nombre ?? '',
    it.ref.dominio ?? '',
    chofer,
    proveedor,
    it.observacion ?? '',
    it.hojaDeRuta ?? '',
    anulada ? 'Anulada' : 'Activa',
    motivoAnulacion,
    anulada ? '' : celdaDisponibilidad(it, disponibilidad),
  ];
}

function celdaDisponibilidad(it: AsignacionItem, disponibilidad: DisponibilidadInforme | null): string {
  if (disponibilidad === null) return 'Sin verificar';
  const motivos = disponibilidad.porItem[it.idItem];
  return motivos && motivos.length > 0 ? resumirMotivos(motivos) : '';
}

/** El chofer elegido para un item de proveedor. '' si todavía no se eligió;
 *  'Sin resolver' si se eligió uno que ya no está (dado de baja). */
function nombreChoferDeSujeto(it: AsignacionItem, nombresChofer: Map<string, string>): string {
  if (it.sujeto.tipo !== 'proveedor') return '';
  const id = it.sujeto.idChofer;
  if (!id) return '';
  return nombresChofer.get(id) ?? 'Sin resolver';
}

/** 'Apellido, Nombre' — el mismo formato que usa la celda del tablero. */
function nombreChofer(c: Chofer): string {
  return `${c.datosPersonales.apellido}, ${c.datosPersonales.nombre}`;
}

function plural(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

function col(
  etiqueta: string,
  tipo: ColumnaDoc['tipo'],
  ancho: number,
  alineacion?: ColumnaDoc['alineacion'],
): ColumnaDoc {
  return alineacion ? { etiqueta, tipo, ancho, alineacion } : { etiqueta, tipo, ancho };
}
