import { ConsultaSujeto, NoDisponibilidad, SujetoNoDisponibilidad } from 'src/app/interfaces/no-disponibilidad';
import { FechaNegocio } from './fecha.util';

/** Reglas puras de fechas sobre el modelo NUEVO de no disponibilidad
 *  (`NoDisponibilidad`, colección `noDisponibilidades`). Sin estado.
 *
 *  Convive con `no-disponibilidad.util.ts`, que sigue sirviendo al modelo
 *  viejo (`NoDisponibilidadChofer`) hasta que sus consumidores se migren; en
 *  el bloque 7 del frente se retira aquel y estas reglas quedan como las
 *  únicas. Los nombres pueden coincidir (`cubreFecha`): son módulos distintos
 *  y ningún archivo importa los dos.
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
