import { ConId } from 'src/app/interfaces/conId';
import { InformeOpNuevo } from 'src/app/interfaces/informe-op-nuevo';
import { RefCliente, RefChofer, RefProveedor } from 'src/app/interfaces/operacion';

/** Nombre para mostrar de la entidad de un InformeOp — mismo criterio que
 *  ya usan LiquidacionesOpComponent.nombreEntidad e
 *  InformeLiqDetalleComponent.nombreEntidad (duplicado ahí, no unificado
 *  todavía). Se centraliza acá para no sumar una tercera copia; unificar
 *  los otros dos call sites queda pendiente, fuera del alcance de este
 *  chunk. */
export function nombreEntidadInforme(informe: ConId<InformeOpNuevo> | InformeOpNuevo): string {
  if (informe.tipo === 'chofer') {
    const ref = informe.entidad as RefChofer;
    return `${ref.apellido} ${ref.nombre}`;
  }
  return (informe.entidad as RefCliente | RefProveedor).razonSocial;
}

/** Clase de badge Bootstrap para el estado de un InformeOp — usado en
 *  InformeOpDetalleComponent e InformeOpEditorComponent. */
export function claseBadgeEstadoInforme(estado: 'activo' | 'proforma' | 'liquidado' | 'anulado'): string {
  switch (estado) {
    case 'activo':    return 'badge bg-success';
    case 'proforma':  return 'badge bg-warning text-dark';
    case 'liquidado': return 'badge bg-info text-dark';
    case 'anulado':   return 'badge bg-danger';
  }
}
