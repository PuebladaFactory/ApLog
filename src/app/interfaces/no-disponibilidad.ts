import { ConId } from './conId';

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

/** Por qué un sujeto no está disponible: el registro que lo causa y de dónde
 *  viene. `origen` es el tipo de sujeto DEL REGISTRO respecto del consultado:
 *  'propia' = es del sujeto consultado; 'cascadaChofer' = es de un chofer que
 *  arrastra al sujeto; 'cascadaProveedor' = es de un proveedor que lo arrastra
 *  (directo o a través de un chofer). */
export type MotivoNoDisponible = {
  origen: 'propia' | 'cascadaChofer' | 'cascadaProveedor';
  noDisponibilidad: ConId<NoDisponibilidad>;
};

export type ResultadoDisponibilidad =
  | { disponible: true }
  | { disponible: false; motivos: MotivoNoDisponible[] };

/** Entidad dueña de vehículos (lo que lista carga-asignacion). */
export type EntidadConVehiculos =
  | { tipo: 'chofer';    idChofer: string }
  | { tipo: 'proveedor'; idProveedor: string };

export interface VehiculosDisponibles<V> {
  disponibles: V[];
  noDisponibles: { vehiculo: V; motivos: MotivoNoDisponible[] }[];
}

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
