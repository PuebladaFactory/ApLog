/**
 * Script de verificación manual contra el emulador de Firestore + Auth.
 * NO es un test automatizado — confirma las reglas del Frente Reportes (R1):
 *  - 'informesOp' (módulo propio): user leer+crear; demo leer; admin todo.
 *  - 'resumenesOp' (módulo 'resumenes'): user crear+editar (set+merge con
 *    increment), sin leer ni eliminar; demo leer; admin todo.
 *
 * Cómo correrlo (con el emulador ya levantado en otra terminal):
 *   firebase emulators:start --only firestore,auth
 *   cd functions
 *   node test-cierre-rules.mjs
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
  updateDoc,
  deleteDoc,
  increment,
} from "firebase/firestore";

const PROJECT_ID = "demoapplog";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.GCLOUD_PROJECT = PROJECT_ID;

let pass = 0;
let fail = 0;
function reportar(nombre, ok, detalle) {
  if (ok) { pass++; console.log(`✅ PASS — ${nombre}${detalle ? " — " + detalle : ""}`); }
  else { fail++; console.log(`❌ FAIL — ${nombre}${detalle ? " — " + detalle : ""}`); }
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
  await getIdTokenResult(clientAuth.currentUser, true);
  return getIdTokenResult(clientAuth.currentUser);
}

async function debePermitir(nombre, fn) {
  try { await fn(); reportar(nombre, true); }
  catch (err) { reportar(nombre, false, `code=${err.code}`); }
}

async function debeDenegar(nombre, fn) {
  try { await fn(); reportar(nombre, false, "se permitió y no debía"); }
  catch (err) { reportar(nombre, err.code === "permission-denied", `code=${err.code}`); }
}

const incrementoResumen = () => ({
  tipo: "general", tipoEntidad: null, entidadId: null, anio: 2026, mes: 8, periodo: 202608,
  cantidadOps: increment(1),
  cliente: { total: increment(100), niveles: { general: increment(1) } },
  actualizado: Date.now(),
});

async function main() {
  const adminApp = initAdminApp({ projectId: PROJECT_ID });
  const adminAuth = getAdminAuth(adminApp);

  const clientApp = initClientApp({ apiKey: "fake-api-key", projectId: PROJECT_ID });
  const clientAuth = getClientAuth(clientApp);
  connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = getClientFirestore(clientApp);
  connectFirestoreEmulator(db, "127.0.0.1", 8080);

  const userCred = await crearUsuarioConRol(adminAuth, "user");
  const demoCred = await crearUsuarioConRol(adminAuth, "demo");
  const adminCred = await crearUsuarioConRol(adminAuth, "admin");

  // ---------- 'user' ----------
  console.log("\n=== Rol 'user' ===");
  await loguearComo(clientAuth, userCred.email, userCred.password);
  const infUser = doc(db, "Vantruck/datos/informesOp/testInfUser");
  const resUser = doc(db, "Vantruck/datos/resumenesOp/general_2099_01");

  await debePermitir("'user' puede CREAR un InformeOp (cierre)", () => setDoc(infUser, { estado: "activo" }));
  await debePermitir("'user' puede LEER un InformeOp (anti-duplicado)", () => getDoc(infUser));
  await debeDenegar("'user' NO puede EDITAR un InformeOp", () => updateDoc(infUser, { estado: "anulado" }));
  await debeDenegar("'user' NO puede ELIMINAR un InformeOp", () => deleteDoc(infUser));

  await debePermitir("'user' puede CREAR un resumen con set+merge+increment", () =>
    setDoc(resUser, incrementoResumen(), { merge: true }));
  await debePermitir("'user' puede EDITAR un resumen existente con set+merge+increment", () =>
    setDoc(resUser, incrementoResumen(), { merge: true }));
  await debeDenegar("'user' NO puede LEER resúmenes", () => getDoc(resUser));
  await debeDenegar("'user' NO puede ELIMINAR resúmenes", () => deleteDoc(resUser));

  // ---------- 'demo' ----------
  console.log("\n=== Rol 'demo' ===");
  await loguearComo(clientAuth, demoCred.email, demoCred.password);
  await debePermitir("'demo' puede LEER un InformeOp", () => getDoc(infUser));
  await debeDenegar("'demo' NO puede CREAR un InformeOp", () =>
    setDoc(doc(db, "Vantruck/datos/informesOp/testInfDemo"), { estado: "activo" }));
  await debePermitir("'demo' puede LEER un resumen", () => getDoc(resUser));
  await debeDenegar("'demo' NO puede ESCRIBIR un resumen", () =>
    setDoc(resUser, incrementoResumen(), { merge: true }));

  // ---------- 'admin' (control) ----------
  console.log("\n=== Rol 'admin' (control) ===");
  await loguearComo(clientAuth, adminCred.email, adminCred.password);
  await debePermitir("'admin' puede EDITAR un InformeOp", () => updateDoc(infUser, { estado: "anulado" }));
  await debePermitir("'admin' puede ELIMINAR un InformeOp", () => deleteDoc(infUser));
  await debePermitir("'admin' puede LEER un resumen", () => getDoc(resUser));
  await debePermitir("'admin' puede ELIMINAR un resumen", () => deleteDoc(resUser));

  console.log(`\n=== Resultado: ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Error inesperado en el script de verificación:", err);
  process.exit(1);
});
