import { TipoEntidadFin } from 'src/app/interfaces/movimiento-fin';
import { EnlaceListado } from 'src/app/interfaces/tabla-listado';

/** Pestaña desde la que se abre la Cuenta de la entidad: su botón de volver
 *  regresa ahí (?origen=…). Sin origen, vuelve a Cuentas. */
export type OrigenCuenta = 'cuentas' | 'antiguedad' | 'resumen' | 'movimientos';

/** Enlace a la Cuenta de la entidad (F5d) — única fuente de la ruta para
 *  las columnas con enlace de TablaListado y los [routerLink] de las
 *  plantillas. */
export function enlaceCuenta(tipo: TipoEntidadFin, idEntidad: string, origen: OrigenCuenta): EnlaceListado {
  return { ruta: ['/finanzasNueva/cuenta', tipo, idEntidad], queryParams: { origen } };
}
