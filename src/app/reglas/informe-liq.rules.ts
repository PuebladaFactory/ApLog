import { EstadoInformeLiq } from "../interfaces/estado-informeliq";

export type AccionInformeLiq =
  | 'ver'
  | 'editar'
  | 'reimprimir'
  | 'vincularFactura'
  | 'anular'
  | 'verFactura';


export interface AccionesInformeLiq {
  puedeEditar: boolean;
  puedeAnular: boolean;
  puedeVincularFactura: boolean;
  puedeVerFactura: boolean;
  puedeEliminar: boolean;
}

// Reglas de negocio
export const REGLAS_ESTADO_INFORME: Record<
  EstadoInformeLiq,
  AccionInformeLiq[]
> = {
  borrador: ['ver', 'editar'],
  emitido: ['ver', 'editar', 'reimprimir', 'vincularFactura', 'anular'],
  facturado: ['ver', 'reimprimir', 'verFactura'],
  cobrado: ['ver', 'reimprimir', 'verFactura'],
  anulado: ['ver']
};

// Helper
export function puedeEjecutarAccion(
  estado: EstadoInformeLiq,
  accion: AccionInformeLiq
): boolean {
  return REGLAS_ESTADO_INFORME[estado]?.includes(accion) ?? false;
}