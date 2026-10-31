import { AsignacionItem, SujetoAsignacion } from 'src/app/interfaces/asignacion';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { ConId } from 'src/app/interfaces/conId';
import {
  ConsultaSujeto, EntidadConVehiculos, MotivoNoDisponible, NoDisponibilidad,
  ResultadoDisponibilidad, SujetoNoDisponibilidad, VehiculosDisponibles,
} from 'src/app/interfaces/no-disponibilidad';
import { FechaNegocio, fechaLegible } from './fecha.util';

/** Reglas puras de no disponibilidad (`NoDisponibilidad`, colección
 *  `noDisponibilidades`; diseño: docs/disenos/no-disponibilidad.md). Sin estado:
 *  vigencia por fecha, cascadas de resolución, qué se pregunta en cada caso
 *  (tablero, informe, guardas) y la presentación de los motivos. Las usa
 *  DisponibilidadService, que sólo les arma los datos con el estado vivo.
 *
 *  Fechas como string 'YYYY-MM-DD' (orden lexicográfico = cronológico), sin
 *  construir ningún Date. */

/** ¿Esta no disponibilidad cubre la fecha? La vigencia es DERIVADA:
 *  anulada (`activa: false`) nunca cubre, y `hasta: null` = sin fin previsto.
 *  Los dos bordes son inclusivos. */
export function cubreFecha(nd: NoDisponibilidad, fecha: FechaNegocio): boolean {
  return nd.activa && nd.desde <= fecha && (nd.hasta === null || fecha <= nd.hasta);
}

/** Las que cubren la fecha, en el orden recibido. */
export function noDisponibilidadesEnFecha<T extends NoDisponibilidad>(lista: T[], fecha: FechaNegocio): T[] {
  return lista.filter(nd => cubreFecha(nd, fecha));
}

/** ¿Se superponen dos períodos? `hasta: null` = abierto hacia adelante.
 *  Bordes inclusivos: compartir un solo día ya es solapamiento. No mira
 *  `activa`: es sólo la regla de períodos. */
export function periodosSeSolapan(
  a: { desde: FechaNegocio; hasta: FechaNegocio | null },
  b: { desde: FechaNegocio; hasta: FechaNegocio | null },
): boolean {
  const aEmpiezaAntesDelFinDeB = b.hasta === null || a.desde <= b.hasta;
  const bEmpiezaAntesDelFinDeA = a.hasta === null || b.desde <= a.hasta;
  return aEmpiezaAntesDelFinDeB && bEmpiezaAntesDelFinDeA;
}

/** Id del sujeto, sea cual sea su tipo. */
export function idDeSujeto(s: SujetoNoDisponibilidad | ConsultaSujeto): string {
  switch (s.tipo) {
    case 'chofer':    return s.idChofer;
    case 'vehiculo':  return s.idVehiculo;
    case 'proveedor': return s.idProveedor;
  }
}

/** ¿Hablan de la misma entidad? (mismo tipo y mismo id; ignora el snapshot). */
export function mismoSujeto(
  a: SujetoNoDisponibilidad | ConsultaSujeto,
  b: SujetoNoDisponibilidad | ConsultaSujeto,
): boolean {
  return a.tipo === b.tipo && idDeSujeto(a) === idDeSujeto(b);
}

/** Texto de exhibición del sujeto, desde el snapshot congelado. */
export function nombreSujeto(s: SujetoNoDisponibilidad): string {
  switch (s.tipo) {
    case 'chofer':    return `${s.apellido} ${s.nombre}`;
    case 'vehiculo':  return s.dominio;
    case 'proveedor': return s.razonSocial;
  }
}

// ── Qué se pregunta en cada caso ──────────────────────────────────
//
// La entidad Y el vehículo por separado: un chofer directo con todos sus
// vehículos fuera está él mismo disponible (no tiene registro propio), así que
// con una sola de las dos preguntas se cuela.

/** Un ítem de asignación: lo que ya se sabe de su sujeto (resolución
 *  progresiva). El vehículo si ya está resuelto; la entidad siempre; y en uno
 *  de proveedor, también el chofer si ya se eligió. */
export function consultasDeAsignacion(sujeto: SujetoAsignacion): ConsultaSujeto[] {
  const consultas: ConsultaSujeto[] = [];
  if (sujeto.idVehiculo) consultas.push({ tipo: 'vehiculo', idVehiculo: sujeto.idVehiculo });
  if (sujeto.tipo === 'directo') {
    consultas.push({ tipo: 'chofer', idChofer: sujeto.idChofer });
  } else {
    consultas.push({ tipo: 'proveedor', idProveedor: sujeto.idProveedor });
    if (sujeto.idChofer) consultas.push({ tipo: 'chofer', idChofer: sujeto.idChofer });
  }
  return consultas;
}

/** El sujeto de asignación de un vehículo de la flota, tal como lo arma el
 *  tablero al arrastrarlo al pool: lo que hay que preguntar por un vehículo es
 *  lo mismo que por un ítem con ese vehículo (él y su dueño). */
export function sujetoAsignacionDeVehiculo(v: Vehiculo): SujetoAsignacion {
  const a = v.asignadoA;
  return a.tipo === 'chofer'
    ? { tipo: 'directo', idChofer: a.idChofer, idVehiculo: v.idVehiculo }
    : { tipo: 'proveedor', idProveedor: a.idProveedor, idChofer: null, idVehiculo: v.idVehiculo };
}

/** Una operación: chofer y vehículo si están resueltos, y el proveedor si es
 *  de proveedor. */
export function consultasDeOperacion(
  op: { chofer: { id: string }; vehiculo: { id: string }; proveedor?: { id: string } | null },
): ConsultaSujeto[] {
  const consultas: ConsultaSujeto[] = [];
  if (op.chofer.id) consultas.push({ tipo: 'chofer', idChofer: op.chofer.id });
  if (op.vehiculo.id) consultas.push({ tipo: 'vehiculo', idVehiculo: op.vehiculo.id });
  if (op.proveedor?.id) consultas.push({ tipo: 'proveedor', idProveedor: op.proveedor.id });
  return consultas;
}

/** 'Pérez, Juan — AB123CD' / 'Transportes Sur — AB123CD': cómo se nombra un
 *  ítem del tablero en un mensaje (el mismo texto que la tarjeta). */
export function describirItemAsignacion(item: AsignacionItem): string {
  const a = item.ref.asignadoA;
  const quien = a.tipo === 'chofer' ? `${a.apellido}, ${a.nombre}` : a.razonSocial;
  return item.ref.dominio ? `${quien} — ${item.ref.dominio}` : quien;
}

// ── Presentación de motivos ───────────────────────────────────────

const ETIQUETA_TIPO: Record<SujetoNoDisponibilidad['tipo'], string> = {
  chofer: 'Chofer', vehiculo: 'Vehículo', proveedor: 'Proveedor',
};

/** Junta los motivos de varias consultas (ej. el vehículo y su entidad) sin
 *  repetir registros: un mismo registro llega siempre con el mismo origen. */
export function unirMotivos(...listas: MotivoNoDisponible[][]): MotivoNoDisponible[] {
  const vistos = new Set<string>();
  return listas.flat().filter(m => {
    if (vistos.has(m.noDisponibilidad.id)) return false;
    vistos.add(m.noDisponibilidad.id);
    return true;
  });
}

/** Una línea por motivo, nombrando el sujeto DEL REGISTRO — así se distingue
 *  "Vehículo AB123CD: En taller" de "Chofer Pérez Juan: Licencia" —, con su
 *  período. Para el `title` de tarjetas, ítems y badges. */
export function describirMotivos(motivos: MotivoNoDisponible[]): string {
  return motivos.map(({ noDisponibilidad: nd }) => {
    const hasta = nd.hasta ? `hasta el ${fechaLegible(nd.hasta)}` : 'sin fecha de fin';
    return `${ETIQUETA_TIPO[nd.sujeto.tipo]} ${nombreSujeto(nd.sujeto)}: ${nd.motivo} `
      + `(desde el ${fechaLegible(nd.desde)}, ${hasta})`;
  }).join('\n');
}

/** 'Chofer Pérez Juan' / 'Vehículo AB123CD' / 'Proveedor Transportes Sur': el
 *  sujeto DEL REGISTRO que causa el motivo (la columna "Causa" del informe). */
export function causaMotivo(m: MotivoNoDisponible): string {
  const s = m.noDisponibilidad.sujeto;
  return `${ETIQUETA_TIPO[s.tipo]} ${nombreSujeto(s)}`;
}

/** Una línea por ítem del tablero no disponible: quién, qué vehículo y por qué.
 *  Para los mensajes de las guardas sobre el tablero. */
export function listarItemsNoDisponibles(lista: { item: AsignacionItem; motivos: MotivoNoDisponible[] }[]): string {
  return lista.map(x => `• ${describirItemAsignacion(x.item)}: ${resumirMotivos(x.motivos)}`).join('\n');
}

/** Versión de una línea, sin períodos: para lugares chicos como una opción
 *  de un <select> o una fila de error. */
export function resumirMotivos(motivos: MotivoNoDisponible[]): string {
  return motivos
    .map(({ noDisponibilidad: nd }) => `${ETIQUETA_TIPO[nd.sujeto.tipo]} ${nombreSujeto(nd.sujeto)}: ${nd.motivo}`)
    .join('; ');
}

// ── Resolución y cascadas ─────────────────────────────────────────
//
// Funciones puras: reciben por argumento todo lo que necesitan. Las usa
// DisponibilidadService, que sólo les arma `DatosDisponibilidad` con el
// estado vivo de los services.
//
// Las cascadas salen de la propiedad de los bienes (docs/disenos/no-disponibilidad.md,
// "Reglas de resolución y cascadas"):
//   - vehículo no disponible  → sólo ese vehículo.
//   - chofer directo          → él y los vehículos con asignadoA { chofer, su id }.
//   - chofer de proveedor     → sólo él. Los vehículos del proveedor siguen
//                               disponibles mientras quede otro chofer del proveedor.
//   - proveedor               → sus choferes (contratacion.idProveedor) y sus
//                               vehículos (asignadoA.idProveedor).
// Transitiva: un vehículo asignado a un chofer de proveedor cae si cae el proveedor.
//
// Sólo mira no disponibilidades: ni `activo` de las entidades ni documentación
// vencida (fuera de alcance del frente).

/** Lo que necesita la resolución. Los proveedores no hacen falta: la
 *  pertenencia ya está en `Chofer.contratacion` y `Vehiculo.asignadoA`. */
export interface DatosDisponibilidad {
  noDisponibilidades: ConId<NoDisponibilidad>[];
  choferes: Chofer[];
  vehiculos: Vehiculo[];
}

/** Disponibilidad de un sujeto en la fecha, con los registros que la impiden. */
export function disponibilidadDe(
  datos: DatosDisponibilidad,
  sujeto: ConsultaSujeto,
  fecha: FechaNegocio,
): ResultadoDisponibilidad {
  const motivos = motivosDe(datos, sujeto, fecha);
  return motivos.length === 0 ? { disponible: true } : { disponible: false, motivos };
}

/** Vehículos de una entidad (asignadoA), separados en disponibles y no
 *  disponibles en la fecha. Conserva el orden recibido. */
export function vehiculosDisponiblesDe<V extends Vehiculo>(
  datos: Omit<DatosDisponibilidad, 'vehiculos'> & { vehiculos: V[] },
  entidad: EntidadConVehiculos,
  fecha: FechaNegocio,
): VehiculosDisponibles<V> {
  const resultado: VehiculosDisponibles<V> = { disponibles: [], noDisponibles: [] };
  for (const vehiculo of datos.vehiculos.filter(v => perteneceA(v, entidad))) {
    const motivos = motivosVehiculo(datos, vehiculo.idVehiculo, fecha);
    if (motivos.length === 0) resultado.disponibles.push(vehiculo);
    else resultado.noDisponibles.push({ vehiculo, motivos });
  }
  return resultado;
}

function motivosDe(datos: DatosDisponibilidad, sujeto: ConsultaSujeto, fecha: FechaNegocio): MotivoNoDisponible[] {
  switch (sujeto.tipo) {
    case 'proveedor': return motivosProveedor(datos, sujeto.idProveedor, fecha);
    case 'chofer':    return motivosChofer(datos, sujeto.idChofer, fecha);
    case 'vehiculo':  return motivosVehiculo(datos, sujeto.idVehiculo, fecha);
  }
}

/** Registros activos del sujeto que cubren la fecha. */
function propias(datos: DatosDisponibilidad, sujeto: ConsultaSujeto, fecha: FechaNegocio): ConId<NoDisponibilidad>[] {
  return datos.noDisponibilidades.filter(nd => mismoSujeto(nd.sujeto, sujeto) && cubreFecha(nd, fecha));
}

function comoMotivos(
  registros: ConId<NoDisponibilidad>[],
  origen: MotivoNoDisponible['origen'],
): MotivoNoDisponible[] {
  return registros.map(noDisponibilidad => ({ origen, noDisponibilidad }));
}

/** Un proveedor sólo cae por sus propios registros. */
function motivosProveedor(datos: DatosDisponibilidad, idProveedor: string, fecha: FechaNegocio): MotivoNoDisponible[] {
  return comoMotivos(propias(datos, { tipo: 'proveedor', idProveedor }, fecha), 'propia');
}

/** Un chofer cae por los suyos y, si es de proveedor, por los del proveedor. */
function motivosChofer(datos: DatosDisponibilidad, idChofer: string, fecha: FechaNegocio): MotivoNoDisponible[] {
  const motivos = comoMotivos(propias(datos, { tipo: 'chofer', idChofer }, fecha), 'propia');
  const chofer = datos.choferes.find(c => c.idChofer === idChofer);
  if (chofer?.contratacion.tipo === 'proveedor') {
    motivos.push(...comoMotivos(
      propias(datos, { tipo: 'proveedor', idProveedor: chofer.contratacion.idProveedor }, fecha),
      'cascadaProveedor',
    ));
  }
  return motivos;
}

/** Un vehículo cae por los suyos y por los de su dueño:
 *  - asignado a un chofer: todo lo que tumba al chofer (incluido su proveedor).
 *  - asignado a un proveedor: el proveedor, o que no le quede NINGÚN chofer
 *    disponible (si tiene al menos uno). Un proveedor sin choferes no tumba
 *    sus vehículos: no hay registro que citar como motivo. */
function motivosVehiculo(datos: DatosDisponibilidad, idVehiculo: string, fecha: FechaNegocio): MotivoNoDisponible[] {
  const motivos = comoMotivos(propias(datos, { tipo: 'vehiculo', idVehiculo }, fecha), 'propia');
  const vehiculo = datos.vehiculos.find(v => v.idVehiculo === idVehiculo);
  if (!vehiculo) return motivos;

  const dueño = vehiculo.asignadoA;
  if (dueño.tipo === 'chofer') {
    motivos.push(...motivosChofer(datos, dueño.idChofer, fecha).map(heredadoDeChofer));
  } else {
    motivos.push(...motivosProveedor(datos, dueño.idProveedor, fecha)
      .map(m => ({ ...m, origen: 'cascadaProveedor' as const })));
    const choferes = datos.choferes.filter(c =>
      c.contratacion.tipo === 'proveedor' && c.contratacion.idProveedor === dueño.idProveedor);
    const motivosPorChofer = choferes.map(c => motivosChofer(datos, c.idChofer, fecha));
    if (motivosPorChofer.length > 0 && motivosPorChofer.every(m => m.length > 0)) {
      motivos.push(...motivosPorChofer.flat().map(heredadoDeChofer));
    }
  }
  return sinRepetidos(motivos);
}

/** Lo propio del chofer, visto desde su vehículo, es cascada de chofer; lo que
 *  al chofer le llega de su proveedor sigue siendo cascada de proveedor. */
function heredadoDeChofer(m: MotivoNoDisponible): MotivoNoDisponible {
  return m.origen === 'propia' ? { ...m, origen: 'cascadaChofer' } : m;
}

/** Un mismo registro puede llegar por varios caminos, pero siempre con el mismo
 *  origen: el origen sale del DUEÑO del registro, no del camino recorrido. Por
 *  eso alcanza con dejarlo una vez y no hay nada que desempatar. */
function sinRepetidos(motivos: MotivoNoDisponible[]): MotivoNoDisponible[] {
  const vistos = new Set<string>();
  return motivos.filter(m => {
    if (vistos.has(m.noDisponibilidad.id)) return false;
    vistos.add(m.noDisponibilidad.id);
    return true;
  });
}

function perteneceA(vehiculo: Vehiculo, entidad: EntidadConVehiculos): boolean {
  const a = vehiculo.asignadoA;
  return entidad.tipo === 'chofer'
    ? a.tipo === 'chofer' && a.idChofer === entidad.idChofer
    : a.tipo === 'proveedor' && a.idProveedor === entidad.idProveedor;
}
