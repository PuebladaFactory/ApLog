/**
 * Script de verificación manual de las Cloud Functions callable de
 * gestión de usuarios (crearUsuario, editarUsuario, editarEmailUsuario,
 * eliminarUsuario) contra el emulador (Auth + Firestore + Functions).
 * NO es un test automatizado del proyecto — es un script de un solo uso.
 *
 * Cómo correrlo (con los emuladores ya levantados en otra terminal):
 *   firebase emulators:start --only firestore,auth,functions
 *   cd functions
 *   node test-gestion-usuarios.mjs
 */

import { initializeApp as initAdminApp } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";

import { initializeApp as initClientApp } from "firebase/app";
import {
  getAuth as getClientAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  signOut,
  getIdTokenResult,
} from "firebase/auth";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";

const PROJECT_ID = "demoapplog";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.GCLOUD_PROJECT = PROJECT_ID;

let pass = 0;
let fail = 0;
function reportar(numero, nombre, ok, detalle) {
  if (ok) {
    pass++;
    console.log(`✅ PASS — [${numero}] ${nombre}${detalle ? " — " + detalle : ""}`);
  } else {
    fail++;
    console.log(`❌ FAIL — [${numero}] ${nombre}${detalle ? " — " + detalle : ""}`);
  }
}

async function esperarClaim(adminAuth, uid, roleEsperado, intentos = 20) {
  for (let i = 0; i < intentos; i++) {
    const u = await adminAuth.getUser(uid);
    if (u.customClaims?.role === roleEsperado) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

// Crea un usuario directo (Admin SDK, bypassa reglas) con un role dado.
async function crearUsuarioDirecto(adminAuth, adminDb, role, password = "Test1234!") {
  const email = `${role}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
  const userRecord = await adminAuth.createUser({ email, password });
  await adminDb.doc(`users/${userRecord.uid}`).set({
    uid: userRecord.uid,
    email,
    name: `Usuario ${role}`,
    role,
    displayName: "",
    photoURL: "",
    emailVerified: true,
  });
  return { uid: userRecord.uid, email, password };
}

function esErrorFirebase(err, codigoEsperado) {
  // El SDK cliente antepone "functions/" al código HttpsError (ej. "permission-denied"
  // llega como err.code === "functions/permission-denied").
  return err.code === `functions/${codigoEsperado}` || err.code === codigoEsperado;
}

async function main() {
  const adminApp = initAdminApp({ projectId: PROJECT_ID });
  const adminAuth = getAdminAuth(adminApp);
  const adminDb = getAdminFirestore(adminApp);

  const clientApp = initClientApp({ apiKey: "fake-api-key", projectId: PROJECT_ID });
  const clientAuth = getClientAuth(clientApp);
  connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  const functions = getFunctions(clientApp);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);

  const callCrear = httpsCallable(functions, "crearUsuario");
  const callEditar = httpsCallable(functions, "editarUsuario");
  const callEditarEmail = httpsCallable(functions, "editarEmailUsuario");
  const callEliminar = httpsCallable(functions, "eliminarUsuario");

  // ---------- Caso 1: admin fundador A, directo por Admin SDK ----------
  console.log("\n--- [1] Crear admin fundador A (Admin SDK) y loguearlo ---");
  const adminA = await crearUsuarioDirecto(adminAuth, adminDb, "admin");
  const claimA = await esperarClaim(adminAuth, adminA.uid, "admin");
  await signInWithEmailAndPassword(clientAuth, adminA.email, adminA.password);
  await getIdTokenResult(clientAuth.currentUser, true);
  reportar(1, "Admin A creado y logueado con claim role=admin", claimA, `uid=${adminA.uid}`);

  // ---------- Caso 2: crearUsuario role='user' como A ----------
  console.log("\n--- [2] crearUsuario(role='user') como A ---");
  let userUid = null;
  try {
    const emailUser = `user-${Date.now()}@example.com`;
    const res = await callCrear({ email: emailUser, name: "Usuario Test", role: "user" });
    userUid = res.data.uid;
    const doc = await adminDb.doc(`users/${userUid}`).get();
    const data = doc.data();
    const ok =
      !!res.data.uid &&
      !!res.data.link &&
      data?.email === emailUser &&
      data?.name === "Usuario Test" &&
      data?.role === "user" &&
      data?.displayName === "" &&
      data?.photoURL === "" &&
      data?.emailVerified === true &&
      data?.uid === userUid;
    reportar(2, "crearUsuario(role='user') exitoso, doc con campos esperados", ok, `uid=${userUid}`);
  } catch (err) {
    reportar(2, "crearUsuario(role='user') exitoso, doc con campos esperados", false, `error inesperado: ${err.code}`);
  }

  // ---------- Caso 3: crearUsuario role='dev' como A → invalid-argument ----------
  console.log("\n--- [3] crearUsuario(role='dev') como A (debe rechazar) ---");
  try {
    await callCrear({ email: `dev-intento-${Date.now()}@example.com`, name: "Dev Intento", role: "dev" });
    reportar(3, "crearUsuario(role='dev') rechazado con invalid-argument", false, "se permitió y no debía");
  } catch (err) {
    reportar(3, "crearUsuario(role='dev') rechazado con invalid-argument", esErrorFirebase(err, "invalid-argument"), `code=${err.code}`);
  }

  // ---------- Caso 4: editarUsuario cambia name ----------
  console.log("\n--- [4] editarUsuario(name) sobre 'user' como A ---");
  try {
    await callEditar({ uid: userUid, name: "Usuario Test Editado" });
    const doc = await adminDb.doc(`users/${userUid}`).get();
    reportar(4, "editarUsuario cambia name", doc.data()?.name === "Usuario Test Editado");
  } catch (err) {
    reportar(4, "editarUsuario cambia name", false, `error inesperado: ${err.code}`);
  }

  // ---------- Caso 5: editarUsuario cambia role a 'manager' ----------
  console.log("\n--- [5] editarUsuario(role='manager') sobre 'user' como A ---");
  try {
    await callEditar({ uid: userUid, role: "manager" });
    const doc = await adminDb.doc(`users/${userUid}`).get();
    reportar(5, "editarUsuario cambia role a 'manager'", doc.data()?.role === "manager");
  } catch (err) {
    reportar(5, "editarUsuario cambia role a 'manager'", false, `error inesperado: ${err.code}`);
  }

  // ---------- Caso 6: admin B, A no puede tocarlo ----------
  console.log("\n--- [6] crear admin B; A intenta editarUsuario(name) sobre B (debe rechazar) ---");
  const adminB = await crearUsuarioDirecto(adminAuth, adminDb, "admin");
  try {
    await callEditar({ uid: adminB.uid, name: "Intento sobre B" });
    reportar(6, "A no puede editar a otro admin (B)", false, "se permitió y no debía");
  } catch (err) {
    reportar(6, "A no puede editar a otro admin (B)", esErrorFirebase(err, "permission-denied"), `code=${err.code}`);
  }

  // ---------- Caso 7: A edita su propio name ----------
  console.log("\n--- [7] A hace editarUsuario(name) sobre sí mismo ---");
  try {
    await callEditar({ uid: adminA.uid, name: "A Editado" });
    const doc = await adminDb.doc(`users/${adminA.uid}`).get();
    reportar(7, "A puede editar su propio name", doc.data()?.name === "A Editado");
  } catch (err) {
    reportar(7, "A puede editar su propio name", false, `error inesperado: ${err.code}`);
  }

  // ---------- Caso 8: A intenta cambiar su propio role ----------
  console.log("\n--- [8] A intenta editarUsuario(role) sobre sí mismo (debe rechazar) ---");
  try {
    await callEditar({ uid: adminA.uid, role: "manager" });
    reportar(8, "A no puede cambiar su propio role", false, "se permitió y no debía");
  } catch (err) {
    reportar(8, "A no puede cambiar su propio role", esErrorFirebase(err, "permission-denied"), `code=${err.code}`);
  }

  // ---------- Caso 9: usuario 'dev' directo; A no puede tocarlo ----------
  console.log("\n--- [9] crear usuario 'dev' directo; A intenta editarUsuario sobre él (debe rechazar) ---");
  const devDirecto = await crearUsuarioDirecto(adminAuth, adminDb, "dev");
  try {
    await callEditar({ uid: devDirecto.uid, name: "Intento sobre dev" });
    reportar(9, "A no puede editar a un usuario 'dev'", false, "se permitió y no debía");
  } catch (err) {
    reportar(9, "A no puede editar a un usuario 'dev'", esErrorFirebase(err, "permission-denied"), `code=${err.code}`);
  }

  // ---------- Caso 10: A intenta eliminarse a sí mismo ----------
  console.log("\n--- [10] A intenta eliminarUsuario sobre sí mismo (debe rechazar) ---");
  try {
    await callEliminar({ uid: adminA.uid });
    reportar(10, "A no puede eliminarse a sí mismo", false, "se permitió y no debía");
  } catch (err) {
    reportar(10, "A no puede eliminarse a sí mismo", esErrorFirebase(err, "permission-denied"), `code=${err.code}`);
  }

  // ---------- Caso 11: A elimina a 'user' (ahora 'manager') ----------
  console.log("\n--- [11] A hace eliminarUsuario sobre el usuario creado en [2] (ahora 'manager') ---");
  try {
    await callEliminar({ uid: userUid });
    const doc = await adminDb.doc(`users/${userUid}`).get();
    const borradoAuth = await adminAuth.getUser(userUid).catch(() => null);
    reportar(11, "eliminarUsuario borra el doc de Firestore (y el usuario de Auth)", !doc.exists && borradoAuth === null);
  } catch (err) {
    reportar(11, "eliminarUsuario borra el doc de Firestore (y el usuario de Auth)", false, `error inesperado: ${err.code}`);
  }

  // ---------- Caso 12: sin autenticar → permission-denied en las 4 ----------
  console.log("\n--- [12] Sin sesión iniciada: las 4 funciones deben rechazar con permission-denied ---");
  await signOut(clientAuth);

  const subcasos = [
    ["crearUsuario", () => callCrear({ email: "x@example.com", name: "X", role: "user" })],
    ["editarUsuario", () => callEditar({ uid: adminA.uid, name: "X" })],
    ["editarEmailUsuario", () => callEditarEmail({ uid: adminA.uid, nuevoEmail: "y@example.com" })],
    ["eliminarUsuario", () => callEliminar({ uid: adminB.uid })],
  ];
  let ok12 = true;
  const detalle12 = [];
  for (const [nombreFn, invocar] of subcasos) {
    try {
      await invocar();
      ok12 = false;
      detalle12.push(`${nombreFn}: se permitió y no debía`);
    } catch (err) {
      const rechazado = esErrorFirebase(err, "permission-denied");
      ok12 = ok12 && rechazado;
      detalle12.push(`${nombreFn}: code=${err.code}`);
    }
  }
  reportar(12, "Las 4 funciones rechazan sin sesión iniciada", ok12, detalle12.join(" | "));

  console.log(`\n=== Resultado: ${pass} PASS / ${fail} FAIL (de 12 casos) ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Error inesperado en el script de verificación:", err);
  process.exit(1);
});
