import {onDocumentWritten} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import {getAuth} from "firebase-admin/auth";

/**
 * Mantiene sincronizado el Custom Claim `role` de Firebase Auth con el
 * campo `role` del documento `users/{uid}` en Firestore. Las Security
 * Rules leen `request.auth.token.role`, no el documento, así que este
 * claim es la única fuente de verdad que las reglas pueden consultar.
 */
export const syncRoleClaim = onDocumentWritten("users/{uid}", async (event) => {
  const uid = event.params.uid;

  const after = event.data?.after;
  if (!after || !after.exists) {
    // Documento eliminado: no se toca el claim (ver nota del alcance en
    // el encabezado del PASO 2 — borrar usuarios se encara aparte).
    return;
  }

  const role = after.data()?.["role"];
  if (role === undefined) {
    // Usuario recién autoregistrado sin rol asignado todavía
    // (AuthService.crearDocumentoUsuarioSinRol). No hay nada que
    // sincronizar hasta que dev/admin le asigne un rol.
    return;
  }

  try {
    const usuarioAuth = await getAuth().getUser(uid);
    if (usuarioAuth.customClaims?.["role"] === role) {
      // El claim ya coincide: evitar una escritura innecesaria en cada
      // write del documento (ej. editar solo el name).
      return;
    }

    await getAuth().setCustomUserClaims(uid, {role});
    logger.info(`Claim de rol sincronizado para ${uid}: role=${role}`);
  } catch (error) {
    // Ej.: el uid ya no existe en Auth aunque el documento de Firestore
    // siga ahí. No relanzar — un trigger que falla reintenta
    // automáticamente en 2nd gen, y no queremos reintentos infinitos
    // por un uid huérfano.
    logger.error(`Error al sincronizar el claim de rol para ${uid}`, error);
  }
});
