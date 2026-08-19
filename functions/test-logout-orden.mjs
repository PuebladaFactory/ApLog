/**
 * Script de verificación manual contra el emulador de Firestore + Auth.
 * Reproduce el bug real: escribir en `registroLog` DESPUÉS de signOut() falla con
 * permission-denied (las reglas exigen autenticado()), lo que rompía cerrarSesion()
 * para admin/user (la excepción no capturada dejaba la limpieza local sin correr).
 * Confirma el fix: escribir ANTES de signOut() funciona.
 *
 * No bootstrapea Angular — reproduce el problema al nivel real donde ocurre
 * (orden de operaciones vs. estado de auth del SDK cliente + reglas de Firestore),
 * que es exactamente la causa del bug, no algo específico de Angular.
 *
 * Cómo correrlo (con el emulador ya levantado en otra terminal):
 *   firebase emulators:start --only firestore,auth
 *   cd functions
 *   node test-logout-orden.mjs
 */

import { initializeApp as initAdminApp } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";

import { initializeApp as initClientApp } from "firebase/app";
import {
  getAuth as getClientAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  signOut,
  getIdTokenResult,
} from "firebase/auth";
import {
  getFirestore as getClientFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  collection,
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
  const email = `test-logoutorden-${role}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const password = "Test1234!";
  const userRecord = await adminAuth.createUser({ email, password });
  await adminAuth.setCustomUserClaims(userRecord.uid, { role });
  return { uid: userRecord.uid, email, password };
}

async function escribirLogout(clientDb, usuario) {
  const entrada = {
    timestamp: Date.now(),
    userId: usuario.uid,
    userEmail: usuario.email,
    action: "LOGOUT",
    coleccion: "users",
    idObjet: 0,
    details: `Usuario ${usuario.email} cerró sesión.`,
    status: "SUCCESS",
  };
  const logId = doc(collection(clientDb, "Vantruck/datos/registroLog")).id;
  await setDoc(doc(clientDb, "Vantruck/datos/registroLog", logId), entrada);
}

async function main() {
  const adminApp = initAdminApp({ projectId: PROJECT_ID });
  const adminAuth = getAdminAuth(adminApp);

  const clientApp = initClientApp({ apiKey: "fake-api-key", projectId: PROJECT_ID });
  const clientAuth = getClientAuth(clientApp);
  connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  const clientDb = getClientFirestore(clientApp);
  connectFirestoreEmulator(clientDb, "127.0.0.1", 8080);

  // ---------- ORDEN VIEJO (bug): signOut() primero, log después ----------
  console.log("\n=== Orden VIEJO — signOut() antes del log (reproduce el bug) ===");
  {
    const cred = await crearUsuarioConRol(adminAuth, "user");
    await signInWithEmailAndPassword(clientAuth, cred.email, cred.password);
    await getIdTokenResult(clientAuth.currentUser, true);

    await signOut(clientAuth); // el token ya no sirve para escribir

    try {
      await escribirLogout(clientDb, { uid: cred.uid, email: cred.email });
      reportar("Con el orden viejo, el log DEBERÍA fallar (bug reproducido)", false, "escribió sin error — el bug no se reprodujo");
    } catch (err) {
      const esPermDenied = err.code === "permission-denied";
      reportar("Con el orden viejo, escribir después de signOut() da permission-denied", esPermDenied, `code=${err.code}`);
    }
  }

  // ---------- ORDEN NUEVO (fix): log primero, signOut() después ----------
  console.log("\n=== Orden NUEVO — log antes de signOut() (el fix) ===");
  {
    const cred = await crearUsuarioConRol(adminAuth, "user");
    await signInWithEmailAndPassword(clientAuth, cred.email, cred.password);
    await getIdTokenResult(clientAuth.currentUser, true);

    let escribioOk = false;
    try {
      await escribirLogout(clientDb, { uid: cred.uid, email: cred.email });
      escribioOk = true;
    } catch (err) {
      reportar("Con el orden nuevo, el log NO debería fallar", false, `code=${err.code}`);
    }
    reportar("Con el orden nuevo, el log de LOGOUT se escribe sin error", escribioOk);

    let signOutOk = false;
    try {
      await signOut(clientAuth);
      signOutOk = true;
    } catch (err) {
      reportar("signOut() después del log no debería fallar", false, `${err}`);
    }
    reportar("signOut() se completa normalmente después del log", signOutOk);
  }

  // ---------- Control: mismo orden nuevo con rol 'admin' ----------
  console.log("\n=== Control — mismo orden nuevo, rol 'admin' ===");
  {
    const cred = await crearUsuarioConRol(adminAuth, "admin");
    await signInWithEmailAndPassword(clientAuth, cred.email, cred.password);
    await getIdTokenResult(clientAuth.currentUser, true);

    let ok = false;
    try {
      await escribirLogout(clientDb, { uid: cred.uid, email: cred.email });
      await signOut(clientAuth);
      ok = true;
    } catch (err) {
      reportar("'admin': log + signOut() en orden nuevo, sin error", false, `${err}`);
    }
    reportar("'admin': log + signOut() en orden nuevo, sin error", ok);
  }

  console.log(`\n=== Resultado: ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Error inesperado en el script de verificación:", err);
  process.exit(1);
});
