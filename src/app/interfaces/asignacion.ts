// La entidad persistida: el tablero de UNA fecha.
// El document ID de Firestore ES la fecha (un tablero por día).
export interface Asignacion {
  idAsignacion: string;          // = fecha. Document ID Firestore. NO se persiste;
                                 // se reconstruye al leer (patrón idXxx del proyecto).
  fecha: string;                 // 'YYYY-MM-DD'
  asignado: boolean;             // false = borrador; true = ya generó operaciones
  timestamp: number;             // momento del último guardado
  items: AsignacionItem[];       // lista plana (NO diccionario por cliente)
}

// Sujeto de la asignación: quién aporta el vehículo y qué se conoce al asignar.
// 'directo'   → se conoce el chofer (dueño del vehículo). idVehiculo puede
//               quedar null si el chofer tiene varios vehículos (se elige en
//               operaciones-table).
// 'proveedor' → se conoce el proveedor. El chofer se elige en operaciones-table
//               entre los choferes del proveedor (idChofer null hasta entonces).
//               idVehiculo igual: null hasta resolverse.
export type SujetoAsignacion =
  | { tipo: 'directo';   idChofer: string;    idVehiculo: string | null }
  | { tipo: 'proveedor'; idProveedor: string; idChofer: string | null; idVehiculo: string | null };

// Una asignación individual: un vehículo enviado a un cliente. 1 item ↔ 1 op.
export interface AsignacionItem {
  idItem: string;                // identidad local de la fila (crypto.randomUUID()).
                                 // NO es document ID; el item vive dentro de Asignacion.
                                 // Necesario porque el mismo vehículo puede repetirse
                                 // en el mismo cliente el mismo día.
  idCliente: string;
  sujeto: SujetoAsignacion;      // lleva tipo + ids según contratación.
  ref: AsignacionRef;            // snapshot de exhibición para pintar la celda.
  observacion: string;
  hojaDeRuta: string;
  idOperacion: string | null;    // null mientras es borrador; seteado al generar la op.
                                 // La op (papelera) es la fuente de verdad del hecho;
                                 // el estado de abajo es reflejo para exhibición histórica.
  estado: EstadoAsignacion;
}

// Snapshot mínimo para exhibición en la celda del tablero.
// Verdad histórica del tablero: qué se veía el día que se asignó.
// Acotado a lo que la grilla necesita (NO es el RefVehiculo de la op).
export interface AsignacionRef {
  dominio: string;                                 // patente, para la celda.
                                                   // puede ser '' si idVehiculo es null.
  categoria: { catOrden: number; nombre: string }; // para color y agrupamiento por categoría.
  asignadoA:                                       // a quién pertenece el vehículo.
    | { tipo: 'chofer';    idChofer: string;    nombre: string; apellido: string }
    | { tipo: 'proveedor'; idProveedor: string; razonSocial: string };
}

// Estado de la asignación. Reflejo congelado, NO fuente de verdad.
// 'anulada' reemplaza el borrado físico del modelo viejo: el item nunca
// se elimina de la lista, se marca — preservando el registro histórico del tablero.
export type EstadoAsignacion =
  | { estado: 'activa' }
  | { estado: 'anulada'; motivo: string; timestamp: number };
