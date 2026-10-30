/** No disponibilidad de un chofer, un vehículo o un proveedor durante un
 *  período (diseño: docs/disenos/no-disponibilidad.md). Reemplaza a
 *  `NoDisponibilidadChofer` (colección vieja `noOperativo`), que convive hasta
 *  el bloque 7 del frente.
 *
 *  Tres casos, no cuatro: el chofer de proveedor es un `Chofer` con
 *  `contratacion.tipo === 'proveedor'` y entra por `{ tipo: 'chofer' }`.
 *  Etiqueta 'chofer' alineada con `AsignacionVehiculo`, NO con
 *  `SujetoAsignacion` (que responde otra pregunta).
 *
 *  Cada caso lleva el id (para resolver en vivo) y el snapshot de exhibición
 *  congelado al crear. */
export type SujetoNoDisponibilidad =
  | { tipo: 'chofer';    idChofer: string;    nombre: string; apellido: string }
  | { tipo: 'vehiculo';  idVehiculo: string;  dominio: string }
  | { tipo: 'proveedor'; idProveedor: string; razonSocial: string };

/** El sujeto sólo por id, sin snapshot: lo que se elige en un formulario o se
 *  consulta en la resolución de disponibilidad. */
export type ConsultaSujeto =
  | { tipo: 'chofer';    idChofer: string }
  | { tipo: 'vehiculo';  idVehiculo: string }
  | { tipo: 'proveedor'; idProveedor: string };

export interface NoDisponibilidad {
  idNoDisponibilidad: string;      // = document ID de Firestore. NO se persiste;
                                   // se reconstruye al leer (patrón idXxx del proyecto).
  sujeto: SujetoNoDisponibilidad;
  desde: string;                   // 'YYYY-MM-DD'. Obligatorio.
  hasta: string | null;            // 'YYYY-MM-DD' o null = SIN FECHA DE FIN PREVISTA.
  motivo: string;                  // Obligatorio.
  activa: boolean;                 // false = ANULADA (cargada por error).
                                   // NO expresa vigencia: la vigencia es derivada
                                   // (ver vigencia-no-disponibilidad.util.ts).
  timestamp: number;               // último guardado
}
