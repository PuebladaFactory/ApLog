/**
 * Script de verificación manual contra el emulador de Firestore + Auth.
 * Confirma el fix de firestore.rules: 'registroLog' (colección nueva del mecanismo
 * de log del Frente 1/2, ver CLAUDE.md → "Frente Log — mecanismo unificado") mapeada
 * en moduloDe() al mismo bucket 'logs' que la colección 'logs' vieja — antes de este
 * fix, cualquier escritura/lectura a 'registroLog' quedaba rechazada para todos los
 * roles (colección sin mapeo explícito = denegada por defecto, fail-safe ya
 * establecido del proyecto), incluido 'dev'.
 *
 * Matriz esperada (idéntica a 'logs', rama modulo == 'logs' de permitido()):
 *   dev:   leer/crear/editar/eliminar
 *   admin: leer/crear (NO editar/eliminar)
 *   user:  leer/crear (NO editar/eliminar)
 *   demo:  leer       (NO crear/editar/eliminar)
 *
 * Cómo correrlo (con el emulador ya levantado en otra terminal):
 *   firebase emulators:start --only firestore,auth
 *   cd functions
 *   node test-registro-log-rules.mjs
 */

import { initializeApp as initAdminApp } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";

import { initializeApp as initClientApp } from "firebase/app";
import {
  getAuth as getClientAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  getIdTokenResult,
} from "firebase/auth";
import {
  getFirestore as getClientFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";

const PROJECT_ID = "demoapplog";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.GCLOUD_PROJECT = PROJECT_ID;

let pass = 0;
let fail = 0;
function reportar(nombre, ok, detalle) {
  if (ok) {
    pass++;
    console.log(`✅ PASS — ${nombre}${detalle ? " — " + detalle : ""}`);
  } else {
    fail++;
    console.log(`❌ FAIL — ${nombre}${detalle ? " — " + detalle : ""}`);
  }
}

async function crearUsuarioConRol(adminAuth, role) {
  const email = `test-registrolog-${role}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const password = "Test1234!";
  const userRecord = await adminAuth.createUser({ email, password });
  await adminAuth.setCustomUserClaims(userRecord.uid, { role });
  return { uid: userRecord.uid, email, password };
}

async function loguearComo(clientAuth, email, password) {
  await signInWithEmailAndPassword(clientAuth, email, password);
  await getIdTokenResult(clientAuth.currentUser, true); // forzar refresh del token
  return getIdTokenResult(clientAuth.currentUser);
}

async function main() {
  const adminApp = initAdminApp({ projectId: PROJECT_ID });
  const adminAuth = getAdminAuth(adminApp);

  const clientApp = initClientApp({ apiKey: "fake-api-key", projectId: PROJECT_ID });
  const clientAuth = getClientAuth(clientApp);
  connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  const clientDb = getClientFirestore(clientApp);
  connectFirestoreEmulator(clientDb, "127.0.0.1", 8080);

  const entradaLog = { action: "ALTA", coleccion: "clientes", idObjet: "TEST", status: "SUCCESS" };
  const runId = Date.now(); // ids únicos por corrida — evita colisionar con docs de una corrida anterior

  // ---------- 'dev': debe poder leer/crear/editar/eliminar ----------
  console.log("\n=== Rol 'dev' ===");
  const devCred = await crearUsuarioConRol(adminAuth, "dev");
  await loguearComo(clientAuth, devCred.email, devCred.password);

  const docDev = doc(clientDb, `Vantruck/datos/registroLog/testDev-${runId}`);
  try {
    await setDoc(docDev, entradaLog);
    reportar("'dev' puede CREAR en registroLog", true);
  } catch (err) {
    reportar("'dev' puede CREAR en registroLog", false, `code=${err.code}`);
  }
  try {
    await getDoc(docDev);
    reportar("'dev' puede LEER registroLog", true);
  } catch (err) {
    reportar("'dev' puede LEER registroLog", false, `code=${err.code}`);
  }
  try {
    await updateDoc(docDev, { status: "ERROR" });
    reportar("'dev' puede EDITAR registroLog", true);
  } catch (err) {
    reportar("'dev' puede EDITAR registroLog", false, `code=${err.code}`);
  }
  try {
    await deleteDoc(docDev);
    reportar("'dev' puede ELIMINAR registroLog", true);
  } catch (err) {
    reportar("'dev' puede ELIMINAR registroLog", false, `code=${err.code}`);
  }

  // ---------- 'admin': leer/crear sí, editar/eliminar no ----------
  console.log("\n=== Rol 'admin' ===");
  const adminCred = await crearUsuarioConRol(adminAuth, "admin");
  await loguearComo(clientAuth, adminCred.email, adminCred.password);

  const docAdmin = doc(clientDb, `Vantruck/datos/registroLog/testAdmin-${runId}`);
  try {
    await setDoc(docAdmin, entradaLog);
    reportar("'admin' puede CREAR en registroLog", true);
  } catch (err) {
    reportar("'admin' puede CREAR en registroLog", false, `code=${err.code}`);
  }
  try {
    await getDoc(docAdmin);
    reportar("'admin' puede LEER registroLog", true);
  } catch (err) {
    reportar("'admin' puede LEER registroLog", false, `code=${err.code}`);
  }
  try {
    await updateDoc(docAdmin, { status: "ERROR" });
    reportar("'admin' NO puede EDITAR registroLog", false, "la edición se permitió y no debía");
  } catch (err) {
    reportar("'admin' NO puede EDITAR registroLog", err.code === "permission-denied", `code=${err.code}`);
  }
  try {
    await deleteDoc(docAdmin);
    reportar("'admin' NO puede ELIMINAR registroLog", false, "la eliminación se permitió y no debía");
  } catch (err) {
    reportar("'admin' NO puede ELIMINAR registroLog", err.code === "permission-denied", `code=${err.code}`);
  }

  // ---------- 'user': leer/crear sí, editar/eliminar no ----------
  console.log("\n=== Rol 'user' ===");
  const userCred = await crearUsuarioConRol(adminAuth, "user");
  await loguearComo(clientAuth, userCred.email, userCred.password);

  const docUser = doc(clientDb, `Vantruck/datos/registroLog/testUser-${runId}`);
  try {
    await setDoc(docUser, entradaLog);
    reportar("'user' puede CREAR en registroLog", true);
  } catch (err) {
    reportar("'user' puede CREAR en registroLog", false, `code=${err.code}`);
  }
  try {
    await getDoc(docUser);
    reportar("'user' puede LEER registroLog", true);
  } catch (err) {
    reportar("'user' puede LEER registroLog", false, `code=${err.code}`);
  }
  try {
    await updateDoc(docUser, { status: "ERROR" });
    reportar("'user' NO puede EDITAR registroLog", false, "la edición se permitió y no debía");
  } catch (err) {
    reportar("'user' NO puede EDITAR registroLog", err.code === "permission-denied", `code=${err.code}`);
  }
  try {
    await deleteDoc(docUser);
    reportar("'user' NO puede ELIMINAR registroLog", false, "la eliminación se permitió y no debía");
  } catch (err) {
    reportar("'user' NO puede ELIMINAR registroLog", err.code === "permission-denied", `code=${err.code}`);
  }

  // ---------- 'demo': solo leer ----------
  console.log("\n=== Rol 'demo' ===");
  // 'user' ya tiene un doc creado (testUser, no borrado por el fallo esperado arriba) —
  // se reusa para que 'demo' tenga algo que leer.
  const demoCred = await crearUsuarioConRol(adminAuth, "demo");
  await loguearComo(clientAuth, demoCred.email, demoCred.password);

  try {
    await getDoc(docUser);
    reportar("'demo' puede LEER registroLog", true);
  } catch (err) {
    reportar("'demo' puede LEER registroLog", false, `code=${err.code}`);
  }
  try {
    await setDoc(doc(clientDb, `Vantruck/datos/registroLog/testDemo-${runId}`), entradaLog);
    reportar("'demo' NO puede CREAR en registroLog", false, "la creación se permitió y no debía");
  } catch (err) {
    reportar("'demo' NO puede CREAR en registroLog", err.code === "permission-denied", `code=${err.code}`);
  }

  console.log(`\n=== Resultado: ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Error inesperado en el script de verificación:", err);
  process.exit(1);
});
