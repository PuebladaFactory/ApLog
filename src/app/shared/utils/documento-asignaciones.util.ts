import { ColumnaDoc, HojaDoc, LibroTabular, TablaDoc, ValorCeldaDoc } from 'src/app/interfaces/documento-tabular';
import { AsignacionItem } from 'src/app/interfaces/asignacion';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { ConIdType } from 'src/app/interfaces/conId';
import { NoDisponibilidadChofer } from 'src/app/interfaces/no-disponibilidad-chofer';
import { fechaLegible } from './fecha.util';
import { motivoNoDisponibilidad, noDisponibilidadesEnFecha } from './no-disponibilidad.util';
import { sanearNombreArchivo } from './nombre-archivo.util';

/** Lo que necesita el informe del tablero de asignaciones. `items` viene
 *  EXACTAMENTE como está en pantalla (el borrador en modo edición, el tablero
 *  confirmado en modo visor): el orden del array es el orden del archivo.
 *
 *  `clientes` resuelve la razón social de `item.idCliente` sin que el util
 *  conozca ningún servicio. `choferes` resuelve el nombre del chofer de un
 *  item de proveedor (`sujeto.idChofer`, que se elige después de asignar) y el
 *  de cada no-disponibilidad. `vehiculosPorChofer` sale de
 *  `agruparVehiculosPorDuenio` (la misma función pura que usan los listados). */
export interface DatosLibroAsignaciones {
  fecha: string;                    // 'YYYY-MM-DD' del tablero
  estado: 'borrador' | 'confirmado';
  items: AsignacionItem[];
  clientes: { id: string; razonSocial: string }[];
  /** Activas; el tablero las filtra al suscribirse. */
  noDisponibilidades: NoDisponibilidadChofer[];
  choferes: ConIdType<Chofer>[];
  vehiculosPorChofer: Readonly<Record<string, Vehiculo[]>>;
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
];

/** Hoja 2 — una fila por chofer no disponible Y VEHÍCULO. Un chofer con dos
 *  camiones aparece dos veces; uno sin vehículos aparece igual, con Dominio y
 *  Categoría vacías. Es lo que permite filtrar por categoría: con los
 *  vehículos en renglones dentro de una celda no se podría. */
const COLUMNAS_NO_DISPONIBLES: ColumnaDoc[] = [
  col('Chofer', 'texto', 24),
  col('Dominio', 'texto', 11),
  col('Categoría', 'texto', 14),
  col('Desde', 'fecha', 12),
  col('Hasta', 'fecha', 12),
  col('Motivo', 'texto', 28),
];

/** QUÉ dice el informe del tablero de asignaciones de UNA fecha: las
 *  asignaciones del día y los choferes que ese día no estaban disponibles. Las
 *  dos hojas son Tabla de Excel (informes de TRABAJO: se filtran y se ordenan)
 *  y ninguna lleva fila de totales — no hay columnas numéricas que sumar. */
export function armarLibroAsignaciones(d: DatosLibroAsignaciones): LibroTabular {
  const razonSocial = new Map(d.clientes.map(c => [c.id, c.razonSocial]));
  const nombresChofer = new Map(d.choferes.map(c => [c.id, nombreChofer(c)]));

  const filasAsignaciones = d.items.map(it => filaAsignacion(it, razonSocial, nombresChofer));
  const filasNoDisponibles = armarFilasNoDisponibles(d, nombresChofer);

  const etiquetaEstado = d.estado === 'borrador' ? 'Borrador (sin dar de alta)' : 'Confirmado';
  const activas = d.items.filter(it => it.estado.estado === 'activa').length;

  const hojaAsignaciones: HojaDoc = {
    nombre: 'Asignaciones',
    titulo: `Tablero de asignaciones — ${fechaLegible(d.fecha)}`,
    subtitulos: [
      `${etiquetaEstado} · ${plural(d.items.length, 'asignación', 'asignaciones')}` +
        (activas === d.items.length ? '' : ` (${activas} activas)`),
    ],
    tablas: [tabla('Asignaciones', COLUMNAS_ASIGNACIONES, filasAsignaciones)],
    notas: [
      'Las asignaciones salen del tablero tal como está en pantalla: el borrador en modo edición, el tablero confirmado en modo visor.',
      'Chofer y Proveedor son excluyentes: un vehículo de proveedor deja Chofer vacía hasta que se elige el chofer al dar de alta las operaciones.',
      'Un tablero confirmado conserva las asignaciones anuladas, para no perder el registro de lo que se asignó ese día.',
    ],
  };

  const hojaNoDisponibles: HojaDoc = {
    nombre: 'No disponibles',
    titulo: `Choferes no disponibles — ${fechaLegible(d.fecha)}`,
    subtitulos: [
      plural(filasNoDisponibles.length, 'registro', 'registros'),
    ],
    tablas: [tabla('NoDisponibles', COLUMNAS_NO_DISPONIBLES, filasNoDisponibles)],
    notas: [
      'Solo las no-disponibilidades vigentes en la fecha del tablero, no todas las cargadas.',
      'Una fila por chofer y vehículo: un chofer con dos vehículos aparece dos veces, y uno sin vehículos propios aparece con Dominio y Categoría vacías.',
      'Hasta sin valor (celda vacía en el Excel, "—" en el PDF) significa sin fecha de fin definida.',
      'La no-disponibilidad del sistema es solo de choferes: no se puede marcar como no disponible a un proveedor ni a un vehículo suelto.',
    ],
  };

  return {
    nombreArchivo: sanearNombreArchivo(`Asignaciones_${d.fecha}`),
    hojas: [hojaAsignaciones, hojaNoDisponibles],
  };
}

// ── internos ────────────────────────────────────────────────────────

/** Una hoja, una tabla, sin fila de totales y como Tabla de Excel real.
 *  `nombre` es el nombre del ListObject: único en el LIBRO y sin espacios. */
function tabla(nombre: string, columnas: ColumnaDoc[], filas: ValorCeldaDoc[][]): TablaDoc {
  return { titulo: null, grupos: [], columnas, filas, filaTotal: null, excel: { nombre } };
}

function filaAsignacion(
  it: AsignacionItem,
  razonSocial: Map<string, string>,
  nombresChofer: Map<string, string>,
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
  ];
}

/** El chofer elegido para un item de proveedor. '' si todavía no se eligió;
 *  'Sin resolver' si se eligió uno que ya no está (dado de baja). */
function nombreChoferDeSujeto(it: AsignacionItem, nombresChofer: Map<string, string>): string {
  if (it.sujeto.tipo !== 'proveedor') return '';
  const id = it.sujeto.idChofer;
  if (!id) return '';
  return nombresChofer.get(id) ?? 'Sin resolver';
}

function armarFilasNoDisponibles(
  d: DatosLibroAsignaciones,
  nombresChofer: Map<string, string>,
): ValorCeldaDoc[][] {
  const filas: ValorCeldaDoc[][] = [];
  for (const nd of noDisponibilidadesEnFecha(d.noDisponibilidades, d.fecha)) {
    const nombre = nombresChofer.get(nd.idChofer) ?? 'Sin resolver';
    const motivo = motivoNoDisponibilidad(nd);
    const vehiculos = d.vehiculosPorChofer[nd.idChofer] ?? [];
    if (vehiculos.length === 0) {
      filas.push([nombre, '', '', nd.desde, nd.hasta, motivo]);
      continue;
    }
    for (const v of vehiculos) {
      filas.push([nombre, v.dominio ?? '', v.categoria?.nombre ?? '', nd.desde, nd.hasta, motivo]);
    }
  }
  return filas;
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
