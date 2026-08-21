/** Referencia a un objeto archivado en `objetosEliminados` — parte de un
 *  PapeleraEvento. `idOriginal` es siempre string: los 4 módulos que este
 *  mecanismo conecta (Cliente/Chofer/Proveedor/Operación) ya están
 *  refactorizados a id de documento de Firestore, no id numérico legacy. */
export interface RefObjetoPapelera {
  coleccion: string;
  idOriginal: string;
  principal: boolean;
}

/** Evento de baja/restauración de papelera — un doc por acción del usuario.
 *  Sin campo `id`: se adjunta vía ConId<PapeleraEvento> al leer, mismo
 *  criterio que el resto del modelo (setDocSinId / ConId<T>). */
export interface PapeleraEvento {
  timestamp: number;
  userId: string;
  userEmail: string;
  motivoBaja: string;
  coleccionPrincipal: string;
  idPrincipal: string;
  estado: 'activo' | 'restaurado';
  refs: RefObjetoPapelera[];
}
