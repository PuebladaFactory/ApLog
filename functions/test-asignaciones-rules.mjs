/**
 * Script de verificación manual contra el emulador de Firestore + Auth.
 * NO es un test automatizado del proyecto — script de un solo uso para
 * confirmar el fix de firestore.rules: 'asignaciones' desacoplado de
 * 'operaciones', 'user' puede eliminar (limpiar borrador), 'demo' no
 * tiene ningún acceso a 'asignaciones'.
 *
 * Cómo correrlo (con el emulador ya levantado en otra terminal):
 *   firebase emulators:start --only firestore,auth
 *   cd functions
 *   node test-asignaciones-rules.mjs
 *
 * Setea el Custom Claim directo vía Admin SDK (sin pasar por
 * syncRoleClaim/functions) — alcanza porque permitido() en
 * firestore.rules lee request.auth.token.role, no el documento
 * Firestore de /users/{uid}.
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
  const email = `test-${role}-${Date.now()}@example.com`;
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

  // ---------- 'user': debe poder leer/crear/editar/eliminar en 'asignaciones' ----------
  console.log("\n=== Rol 'user' ===");
  const userCred = await crearUsuarioConRol(adminAuth, "user");
  const tokenUser = await loguearComo(clientAuth, userCred.email, userCred.password);
  console.log("role en el ID token:", tokenUser.claims.role);

  const docUser = doc(clientDb, "Vantruck/datos/asignaciones/testBorradorUser");
  try {
    await setDoc(docUser, { itemsBorrador: [], asignado: false });
    reportar("'user' puede CREAR un borrador de asignaciones", true);
  } catch (err) {
    reportar("'user' puede CREAR un borrador de asignaciones", false, `code=${err.code}`);
  }

  try {
    await getDoc(docUser);
    reportar("'user' puede LEER un borrador de asignaciones", true);
  } catch (err) {
    reportar("'user' puede LEER un borrador de asignaciones", false, `code=${err.code}`);
  }

  try {
    await deleteDoc(docUser);
    reportar("'user' puede ELIMINAR (limpiar) un borrador de asignaciones — bug reportado", true);
  } catch (err) {
    reportar("'user' puede ELIMINAR (limpiar) un borrador de asignaciones — bug reportado", false, `code=${err.code}`);
  }

  // ---------- 'demo': no debe tener NINGÚN acceso a 'asignaciones' ----------
  console.log("\n=== Rol 'demo' ===");
  const demoCred = await crearUsuarioConRol(adminAuth, "demo");
  const tokenDemo = await loguearComo(clientAuth, demoCred.email, demoCred.password);
  console.log("role en el ID token:", tokenDemo.claims.role);

  const docDemoTarget = doc(clientDb, "Vantruck/datos/asignaciones/testBorradorUser2");
  // Sembrar un doc con el usuario 'user' primero para poder probar lectura como demo
  await loguearComo(clientAuth, userCred.email, userCred.password);
  await setDoc(doc(clientDb, "Vantruck/datos/asignaciones/testBorradorParaDemo"), { itemsBorrador: [] });
  await loguearComo(clientAuth, demoCred.email, demoCred.password);

  try {
    await getDoc(doc(clientDb, "Vantruck/datos/asignaciones/testBorradorParaDemo"));
    reportar("'demo' NO puede LEER asignaciones", false, "la lectura se permitió y no debía");
  } catch (err) {
    reportar("'demo' NO puede LEER asignaciones", err.code === "permission-denied", `code=${err.code}`);
  }

  try {
    await setDoc(docDemoTarget, { itemsBorrador: [] });
    reportar("'demo' NO puede CREAR en asignaciones", false, "la escritura se permitió y no debía");
  } catch (err) {
    reportar("'demo' NO puede CREAR en asignaciones", err.code === "permission-denied", `code=${err.code}`);
  }

  // ---------- 'admin': sin cambios, debe seguir teniendo las 4 acciones ----------
  console.log("\n=== Rol 'admin' (control, sin cambios esperados) ===");
  const adminCred = await crearUsuarioConRol(adminAuth, "admin");
  await loguearComo(clientAuth, adminCred.email, adminCred.password);

  const docAdmin = doc(clientDb, "Vantruck/datos/asignaciones/testBorradorAdmin");
  try {
    await setDoc(docAdmin, { itemsBorrador: [] });
    await deleteDoc(docAdmin);
    reportar("'admin' puede crear Y eliminar en asignaciones (sin cambios)", true);
  } catch (err) {
    reportar("'admin' puede crear Y eliminar en asignaciones (sin cambios)", false, `code=${err.code}`);
  }

  console.log(`\n=== Resultado: ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Error inesperado en el script de verificación:", err);
  process.exit(1);
});
