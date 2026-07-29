import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

type RolUsuario = 'dev' | 'admin' | 'manager' | 'user' | 'demo';
const ROLES_ASIGNABLES: RolUsuario[] = ['admin', 'manager', 'user', 'demo'];

/**
 * Confirma que quien invoca la función tiene rol dev o admin.
 * Devuelve el rol del invocador para chequeos posteriores.
 */
function exigirInvocadorAutorizado(auth: any): RolUsuario {
  const rol = auth?.token?.role as RolUsuario | undefined;
  if (!rol || !['dev', 'admin'].includes(rol)) {
    throw new HttpsError('permission-denied', 'No tenés permisos para gestionar usuarios.');
  }
  return rol;
}

/**
 * Confirma que el usuario objetivo (uid) puede ser editado/eliminado por
 * quien invoca, según la matriz:
 * - objetivo 'dev'   → nadie, siempre por consola.
 * - objetivo 'admin' → solo 'dev', o el propio admin sobre sí mismo.
 * - cualquier otro   → dev o admin, libremente.
 * Devuelve el rol actual del objetivo (útil para el caller).
 */
async function exigirObjetivoEditable(
  uidObjetivo: string,
  uidInvocador: string,
  rolInvocador: RolUsuario
): Promise<RolUsuario> {
  const db = getFirestore();
  const docObjetivo = await db.doc(`users/${uidObjetivo}`).get();
  if (!docObjetivo.exists) {
    throw new HttpsError('not-found', 'El usuario no existe.');
  }
  const rolObjetivo = docObjetivo.data()?.['role'] as RolUsuario | undefined;

  if (rolObjetivo === 'dev') {
    throw new HttpsError('permission-denied', 'No se puede modificar un usuario dev desde la app.');
  }
  if (rolObjetivo === 'admin' && uidObjetivo !== uidInvocador && rolInvocador !== 'dev') {
    throw new HttpsError('permission-denied', 'Solo dev puede modificar a otro admin.');
  }

  return rolObjetivo ?? 'demo';
}

// ═══════════════════════════════════════════
// crearUsuario
// ═══════════════════════════════════════════
export const crearUsuario = onCall(async (request) => {
  exigirInvocadorAutorizado(request.auth);

  const { email, name, role } = request.data as { email: string; name: string; role: RolUsuario };

  if (!email || !name || !role) {
    throw new HttpsError('invalid-argument', 'Faltan datos: email, nombre y rol son obligatorios.');
  }
  if (!ROLES_ASIGNABLES.includes(role)) {
    throw new HttpsError('invalid-argument', 'Rol inválido.');
  }

  const auth = getAuth();
  const db = getFirestore();

  const yaExiste = await auth.getUserByEmail(email).catch(() => null);
  if (yaExiste) {
    throw new HttpsError('already-exists', 'Ya existe un usuario con ese email.');
  }

  const nuevoUsuario = await auth.createUser({ email, emailVerified: true });

  await db.doc(`users/${nuevoUsuario.uid}`).set({
    uid: nuevoUsuario.uid,
    email,
    name,
    role,
    displayName: '',
    photoURL: '',
    emailVerified: true,
  });

  const link = await auth.generatePasswordResetLink(email);

  logger.info(`Usuario creado: ${email} (${nuevoUsuario.uid}), rol=${role}, por ${request.auth?.uid}`);

  return { uid: nuevoUsuario.uid, link };
});

// ═══════════════════════════════════════════
// editarUsuario — nombre y/o rol
// ═══════════════════════════════════════════
export const editarUsuario = onCall(async (request) => {
  const rolInvocador = exigirInvocadorAutorizado(request.auth);
  const uidInvocador = request.auth!.uid;

  const { uid, name, role } = request.data as { uid: string; name?: string; role?: RolUsuario };

  if (!uid) {
    throw new HttpsError('invalid-argument', 'Falta el uid del usuario a editar.');
  }

  await exigirObjetivoEditable(uid, uidInvocador, rolInvocador);

  const cambios: Record<string, any> = {};
  if (name !== undefined) {
    cambios['name'] = name;
  }
  if (role !== undefined) {
    if (uid === uidInvocador) {
      throw new HttpsError('permission-denied', 'No podés cambiar tu propio rol.');
    }
    if (!ROLES_ASIGNABLES.includes(role)) {
      throw new HttpsError('invalid-argument', 'Rol inválido.');
    }
    cambios['role'] = role;
  }

  if (Object.keys(cambios).length === 0) {
    throw new HttpsError('invalid-argument', 'No hay cambios para aplicar.');
  }

  await getFirestore().doc(`users/${uid}`).update(cambios);

  logger.info(`Usuario editado: ${uid}, cambios=${JSON.stringify(cambios)}, por ${uidInvocador}`);

  return { ok: true };
});

// ═══════════════════════════════════════════
// editarEmailUsuario
// ═══════════════════════════════════════════
export const editarEmailUsuario = onCall(async (request) => {
  const rolInvocador = exigirInvocadorAutorizado(request.auth);
  const uidInvocador = request.auth!.uid;

  const { uid, nuevoEmail } = request.data as { uid: string; nuevoEmail: string };

  if (!uid || !nuevoEmail) {
    throw new HttpsError('invalid-argument', 'Faltan datos: uid y nuevo email son obligatorios.');
  }

  await exigirObjetivoEditable(uid, uidInvocador, rolInvocador);

  const auth = getAuth();
  const yaExiste = await auth.getUserByEmail(nuevoEmail).catch(() => null);
  if (yaExiste) {
    throw new HttpsError('already-exists', 'Ya existe un usuario con ese email.');
  }

  await auth.updateUser(uid, { email: nuevoEmail, emailVerified: true });
  await getFirestore().doc(`users/${uid}`).update({ email: nuevoEmail });

  const link = await auth.generatePasswordResetLink(nuevoEmail);

  logger.info(`Email actualizado para ${uid}: ${nuevoEmail}, por ${uidInvocador}`);

  return { link };
});

// ═══════════════════════════════════════════
// eliminarUsuario
// ═══════════════════════════════════════════
export const eliminarUsuario = onCall(async (request) => {
  const rolInvocador = exigirInvocadorAutorizado(request.auth);
  const uidInvocador = request.auth!.uid;

  const { uid } = request.data as { uid: string };

  if (!uid) {
    throw new HttpsError('invalid-argument', 'Falta el uid del usuario a eliminar.');
  }
  if (uid === uidInvocador) {
    throw new HttpsError('permission-denied', 'No podés eliminarte a vos mismo.');
  }

  const rolObjetivo = await exigirObjetivoEditable(uid, uidInvocador, rolInvocador);

  await getAuth().deleteUser(uid);
  await getFirestore().doc(`users/${uid}`).delete();

  logger.info(`Usuario eliminado: ${uid} (rol era ${rolObjetivo}), por ${uidInvocador}`);

  return { ok: true };
});
