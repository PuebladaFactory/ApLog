/**
 * Script de verificación manual contra el emulador de Firestore + Auth.
 * Confirma la regla nueva de firestore.rules para la colección `vencimientos`
 * (derivada, generada por la Cloud Function `verificarVencimientosDocumentacion`):
 * lectura para los 4 roles (dev/admin/user/demo), sin escritura desde el
 * cliente para ninguno — lo único que escribe ahí es la Cloud Function vía
 * Admin SDK, que bypassea las rules igual.
 *
 * Cómo correrlo (con el emulador ya levantado en otra terminal):
 *   firebase emulators:start --only firestore,auth
 *   cd functions
 *   node test-vencimientos-rules.mjs
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
    console.log(`PASS - ${nombre}${detalle ? " - " + detalle : ""}`);
  } else {
    fail++;
    console.log(`FAIL - ${nombre}${detalle ? " - " + detalle : ""}`);
  }
}

async function crearUsuarioConRol(adminAuth, role) {
  const email = `test-venc-${role}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
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

async function main() {
  const adminApp = initAdminApp({ projectId: PROJECT_ID });
  const adminAuth = getAdminAuth(adminApp);

  const clientApp = initClientApp({ apiKey: "fake-api-key", projectId: PROJECT_ID });
  const clientAuth = getClientAuth(clientApp);
  connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  const clientDb = getClientFirestore(clientApp);
  connectFirestoreEmulator(clientDb, "127.0.0.1", 8080);

  const docVencimiento = doc(clientDb, "Vantruck/datos/vencimientos/TEST-lectura");

  for (const role of ["dev", "admin", "user", "demo"]) {
    console.log(`\n=== Rol '${role}' ===`);
    const cred = await crearUsuarioConRol(adminAuth, role);
    await loguearComo(clientAuth, cred.email, cred.password);

    try {
      await getDoc(docVencimiento);
      reportar(`'${role}' puede LEER 'vencimientos'`, true);
    } catch (err) {
      reportar(`'${role}' puede LEER 'vencimientos'`, false, `code=${err.code}`);
    }

    try {
      await setDoc(doc(clientDb, `Vantruck/datos/vencimientos/TEST-write-${role}`), { x: 1 });
      reportar(`'${role}' NO puede ESCRIBIR en 'vencimientos'`, false, "la escritura se permitió y no debía");
    } catch (err) {
      reportar(`'${role}' NO puede ESCRIBIR en 'vencimientos'`, err.code === "permission-denied", `code=${err.code}`);
    }
  }

  console.log(`\n=== Resultado: ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});
