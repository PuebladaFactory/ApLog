import { EstadoOp } from 'src/app/interfaces/operacion';

/** Etiqueta del estado de una operación. ÚNICA definición: la usan el tablero
 *  de operaciones (columna Estado y badge) y su informe Excel, para que no
 *  puedan divergir.
 *
 *  Orden de prioridad (no es el orden de los ejes de EstadoOp, es el de
 *  exhibición): proforma primero — la de CHOFER manda, porque bloquea los
 *  InformeOp del cliente (ver "Regla de bloqueo de proformas" en CLAUDE.md) —,
 *  después la liquidación (total o por lado) y por último el ciclo. */
export function etiquetaEstadoOp(e: EstadoOp): string {
  if (e.proforma.chofer) return 'Proforma CH';
  if (e.proforma.cliente) return 'Proforma CL';
  if (e.liquidacion.cliente && e.liquidacion.chofer) return 'Liquidada';
  if (e.liquidacion.cliente) return 'Liq CL';
  if (e.liquidacion.chofer) return 'Liq CH';
  if (e.ciclo === 'cerrada') return 'Cerrada';
  if (e.ciclo === 'abierta') return 'Abierta';
  return 'Sin datos';
}
