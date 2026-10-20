import { NoDisponibilidadChofer } from 'src/app/interfaces/no-disponibilidad-chofer';
import { FechaNegocio } from './fecha.util';

/** Reglas de no-disponibilidad de choferes. Única definición: la usan el
 *  tablero de asignaciones (para atenuar los vehículos del pool y mostrar el
 *  motivo) y el informe del tablero.
 *
 *  Antes la misma regla estaba escrita CUATRO veces: el par
 *  `calcularChoferesNoOperativosPorFecha` + `getMotivoNoDisponibilidad`,
 *  duplicado en TableroAsignacionesComponent y en CargaAsignacionComponent, y
 *  en cada par con dos implementaciones distintas (el primero comparaba con
 *  `new Date(fecha + 'T00:00:00')`, el segundo los strings). Las cuatro daban
 *  bien, pero el informe habría sido la quinta.
 *
 *  Se compara como STRING, que es la convención del proyecto para las fechas de
 *  negocio: 'YYYY-MM-DD' ordena lexicográficamente igual que cronológicamente,
 *  sin construir ningún Date ni depender del huso.
 *
 *  OJO — alcance del modelo actual: la no-disponibilidad es SOLO de choferes
 *  (`idChofer`). No existe para un proveedor ni para un vehículo suelto; eso es
 *  el rediseño pendiente anotado en CLAUDE.md ("Deuda — no-disponibilidad y
 *  tablero"). `activa` no se chequea acá: quien provee la lista ya la filtra
 *  (el tablero lo hace al suscribirse). */

/** ¿Esta no-disponibilidad cubre la fecha dada? `hasta` null = sin fin. */
export function cubreFecha(nd: NoDisponibilidadChofer, fecha: FechaNegocio): boolean {
  return fecha >= nd.desde && (!nd.hasta || fecha <= nd.hasta);
}

/** Las no-disponibilidades que cubren la fecha, en el orden recibido. */
export function noDisponibilidadesEnFecha(
  lista: NoDisponibilidadChofer[],
  fecha: FechaNegocio,
): NoDisponibilidadChofer[] {
  return lista.filter(nd => cubreFecha(nd, fecha));
}

/** Ids de los choferes no operativos en la fecha. */
export function choferesNoOperativos(
  lista: NoDisponibilidadChofer[],
  fecha: FechaNegocio,
): Set<string> {
  return new Set(noDisponibilidadesEnFecha(lista, fecha).map(nd => nd.idChofer));
}

/** Texto del motivo. `motivo` es opcional en el modelo: cuando falta, el texto
 *  por defecto es el que ya mostraba el tablero. */
export function motivoNoDisponibilidad(nd: NoDisponibilidadChofer): string {
  return nd.motivo || 'No disponible';
}

/** Motivo del chofer en la fecha; '' si ese día estaba disponible. */
export function motivoNoDisponibilidadDe(
  lista: NoDisponibilidadChofer[],
  idChofer: string,
  fecha: FechaNegocio,
): string {
  const nd = lista.find(n => n.idChofer === idChofer && cubreFecha(n, fecha));
  return nd ? motivoNoDisponibilidad(nd) : '';
}
