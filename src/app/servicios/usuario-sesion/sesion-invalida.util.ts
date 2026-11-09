/* Eje de sesión, bloque 2b — red de seguridad ante errores de sesión en los
 * listeners. Puro: sin Firebase y sin inyección. Contrato:
 * docs/disenos/eje-de-sesion.md, "Bloque 2b", "Criterio (qué errores actúan)". */

/** Códigos de FirestoreError que nunca desloguean: conexión, cuotas, fallas
 *  internas y precondiciones (ej. un índice faltante). Firestore reintenta
 *  solo los de conexión; desloguear por un corte de red es peor que una
 *  pantalla quieta. */
export const CODIGOS_QUE_NUNCA_ACTUAN: ReadonlyArray<string> = [
  'unavailable', 'deadline-exceeded', 'resource-exhausted', 'cancelled', 'internal', 'failed-precondition',
];

/** Códigos que pueden significar que la sesión es mentira. Cualquier código
 *  que no esté en esta lista ni en la anterior no actúa. */
export const CODIGOS_DE_SESION: ReadonlyArray<string> = ['unauthenticated', 'permission-denied'];

/** El código de un error de Firebase, reconocido por su FORMA y no por la
 *  identidad de la clase: `name === 'FirebaseError'` y un `code` string. Un
 *  `instanceof FirestoreError` depende de que la clase sea la misma (realm,
 *  copia del paquete, reempaquetado) y en la verificación del 2b no actuó
 *  (corrección del 2026-11-07). null si el error no tiene esa forma. Los
 *  códigos de Auth (`auth/...`) salen tal cual y no están en ninguna lista. */
export function codigoDeError(e: unknown): string | null {
  if (typeof e !== 'object' || e === null) return null;
  const { name, code } = e as { name?: unknown; code?: unknown };
  return name === 'FirebaseError' && typeof code === 'string' ? code : null;
}

/* ── Bloque 2c, cuarta pieza: el cierre de sesión termina en una carga
 *    completa de /login. Deja en cero todo lo que hay en memoria (servicios,
 *    caché del SDK de Firestore), incluido lo que no sabemos que existe. ── */

/** Texto del aviso de sesión cerrada o vencida (red del 2b). */
export const TEXTO_AVISO_SESION = 'Su sesión se cerró o venció. Vuelva a iniciar sesión.';

/** Clave de sessionStorage (por pestaña) con la que el aviso cruza la recarga. */
export const MARCA_AVISO_SESION = 'avisoSesionCerrada';

/** Espera máxima de una escritura o un signOut antes de recargar: la página
 *  no se va con eso en vuelo, pero una falla tampoco cuelga el cierre. */
export const ESPERA_MAXIMA_CIERRE_MS = 3000;

export function dejarMarcaAvisoSesion(storage: Pick<Storage, 'setItem'>): void {
  try { storage.setItem(MARCA_AVISO_SESION, '1'); } catch { /* sin storage: sin aviso */ }
}

/** Lee la marca y la BORRA antes de devolverla, para que una recarga
 *  posterior no repita el aviso. */
export function tomarMarcaAvisoSesion(storage: Pick<Storage, 'getItem' | 'removeItem'>): boolean {
  try {
    const habia = storage.getItem(MARCA_AVISO_SESION) !== null;
    storage.removeItem(MARCA_AVISO_SESION);
    return habia;
  } catch {
    return false;
  }
}

/** Espera `promesa` como mucho `ms`. Devuelve 'listo' o 'vencido'; nunca
 *  lanza (un rechazo cuenta como 'listo': ya no está en vuelo). */
export function esperarConLimite(promesa: Promise<unknown>, ms: number): Promise<'listo' | 'vencido'> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const vencida = new Promise<'vencido'>(resolve => { timer = setTimeout(() => resolve('vencido'), ms); });
  const lista = promesa.then(() => 'listo' as const, () => 'listo' as const);
  return Promise.race([lista, vencida]).finally(() => clearTimeout(timer));
}

/** Carga completa de /login, reemplazando la entrada del historial: la
 *  pantalla autenticada no queda a un botón Atrás de distancia. */
export function cargarLoginDeCero(): void {
  window.location.replace(new URL('login', document.baseURI).href);
}

/** Hay algo que cerrar: sesión de la app o sesión perdida. */
export function hayAlgoQueCerrar(sesionUid: string | null, sesionPerdida: boolean): boolean {
  return sesionUid !== null || sesionPerdida;
}

/**
 * ¿Este error de un listener significa que la sesión de la app es mentira y
 * hay que cerrarla?
 *
 * @param codigo        `codigoDeError(e)`; null si el error no tiene la forma
 *                      de un error de Firebase (nunca actúa).
 * @param authUid       uid de `auth.currentUser` en este momento (null: sin usuario).
 * @param sesionUid     uid de la sesión de la app (null: sin sesión).
 * @param sesionPerdida la reconciliación limpió una sesión puesta sin que nadie
 *                      llamara a limpiar() (UsuarioSesionService.sesionPerdida).
 *
 * - Hace falta algo que cerrar: sesión de la app o sesión perdida. Sin eso no
 *   actúa nunca (logout deliberado, o el segundo listener que falla después de
 *   que la red ya actuó).
 * - `unauthenticated`: actúa siempre.
 * - `permission-denied` (C1): actúa sólo si Auth contradice a la app (sin
 *   usuario, o con otro uid). Con Auth y la app de acuerdo es la matriz de
 *   reglas contra el gating de la UI, no la sesión: no actúa. Con el criterio
 *   literal, un `manager` quedaría deslogueado en cada login.
 */
export function esErrorDeSesion(
  codigo: string | null,
  authUid: string | null,
  sesionUid: string | null,
  sesionPerdida: boolean,
): boolean {
  if (!hayAlgoQueCerrar(sesionUid, sesionPerdida) || codigo === null) return false;
  if (codigo === 'unauthenticated') return true;
  if (codigo === 'permission-denied') return authUid === null || authUid !== sesionUid;
  return false;
}
