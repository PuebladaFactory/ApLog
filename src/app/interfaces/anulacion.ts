/** Datos de una anulación: quién, cuándo y por qué. Compartido por los
 *  objetos que se anulan en vez de borrarse (InformeLiqNuevo, InformeOpNuevo).
 *  `fecha`: ISO 8601 completo, con hora. `usuario`: email. */
export interface Anulacion {
  motivo: string;
  usuario: string;
  fecha: string;
}
