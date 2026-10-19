import { Operacion } from 'src/app/interfaces/operacion';
import { NivelTarifa } from 'src/app/interfaces/tarifa';
import { RefTarifaAplicada } from 'src/app/interfaces/ref-tarifa-aplicada';
import { ORDEN_NIVELES } from 'src/app/interfaces/tarifa-habilitada';

/** Nivel de tarifa aplicado a UN lado de la operación. Eventual es a nivel de
 *  operación completa, así que se chequea ANTES que tarifaAplicada*. Si la
 *  resolución no pudo determinar un ganador (operación previa al tarifario
 *  nuevo — caso real en Vantruck — u otro caso sin resolver), da null.
 *  Extraído de TableroOpComponent.nivelLado, que ahora delega acá. */
export function nivelLadoOp(op: Operacion, lado: 'cliente' | 'chofer'): NivelTarifa | null {
  if (op.datosTarifaEventual !== null) return 'eventual';
  const ref = lado === 'cliente' ? op.tarifaAplicadaCliente : op.tarifaAplicadaChofer;
  return ref?.nivel ?? null;
}

/** Nivel de tarifa de la OPERACIÓN, uno solo: el de mayor jerarquía entre los
 *  dos lados. Los dos lados coinciden salvo en un caso real — uno con General y
 *  el otro con Especial (en cualquier combinación) — y ahí gana el más
 *  específico, igual que el orden de ORDEN_NIVELES ('personalizada',
 *  'especial', 'general', 'eventual'). Un lado sin resolver (null) pierde
 *  contra cualquier nivel; los dos sin resolver dan null. */
export function nivelTarifaOp(op: Operacion): NivelTarifa | null {
  return ganador(op) === 'chofer'
    ? nivelLadoOp(op, 'chofer')
    : nivelLadoOp(op, 'cliente');
}

/** Referencia congelada de la tarifa del lado que gana la jerarquía (ver
 *  nivelTarifaOp), para mostrar el NOMBRE de la tarifa efectivamente aplicada.
 *  null en eventual (no hay documento de tarifa: los valores se cargan por
 *  operación) y cuando ningún lado resolvió. */
export function refTarifaOp(op: Operacion): RefTarifaAplicada | null {
  if (op.datosTarifaEventual !== null) return null;
  return ganador(op) === 'chofer' ? op.tarifaAplicadaChofer : op.tarifaAplicadaCliente;
}

/** Etiqueta del nivel para exhibición. Única definición: la usan el pipe
 *  `etiquetaNivelTarifa` (pantallas) y el Excel del informe de operaciones. */
export function etiquetaNivelTarifa(nivel: NivelTarifa | null | undefined): string {
  switch (nivel) {
    case 'eventual': return 'Eventual';
    case 'personalizada': return 'Personalizada';
    case 'especial': return 'Especial';
    case 'general': return 'General';
    default: return 'Sin resolver';
  }
}

/** Qué lado gana la jerarquía. Empate (mismo nivel, o los dos sin resolver) →
 *  'cliente', para que el nombre de la tarifa salga siempre del mismo lado. */
function ganador(op: Operacion): 'cliente' | 'chofer' {
  return peso(nivelLadoOp(op, 'chofer')) < peso(nivelLadoOp(op, 'cliente')) ? 'chofer' : 'cliente';
}

/** Posición en ORDEN_NIVELES: menor = más específico = gana. null no está en la
 *  lista y queda último. */
function peso(nivel: NivelTarifa | null): number {
  if (nivel === null) return ORDEN_NIVELES.length;
  const i = ORDEN_NIVELES.indexOf(nivel);
  return i < 0 ? ORDEN_NIVELES.length : i;
}
