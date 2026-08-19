/**
 * Script de verificación manual contra el emulador de Functions.
 * Confirma el bug real y el fix: el SDK cliente sin región configurada
 * (`getFunctions()`, default `us-central1`) NO encuentra las funciones de gestión
 * de usuarios, que están deployadas en `southamerica-east1` (ver CLAUDE.md →
 * "Cloud Functions" → región). Con `getFunctions(undefined, 'southamerica-east1')`
 * (el fix — ahora leído de `environment.functionsRegion` en app.module.ts) sí las
 * encuentra.
 *
 * El emulador de Functions SÍ reproduce este bug (a diferencia del emulador de
 * Firestore con Security Rules, que no aplica acá): cada función se registra en una
 * ruta HTTP con la región como parte del path
 * (`http://127.0.0.1:5001/demoapplog/{region}/{nombre}`), confirmado en el log de
 * arranque del emulador — así que pedir la región equivocada sí falla acá, no solo
 * en producción.
 *
 * Cómo correrlo (con el emulador ya levantado en otra terminal):
 *   cd functions && npm run build
 *   firebase emulators:start --only firestore,auth,functions
 *   cd functions
 *   node test-functions-region.mjs
 */

import { initializeApp as initAdminApp } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";

import { initializeApp as initClientApp } from "firebase/app";
import {
  getAuth as getClientAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
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
function reportar(nombre, ok, detalle) {
  if (ok) {
    pass++;
    console.log(`✅ PASS — ${nombre}${detalle ? " — " + detalle : ""}`);
  } else {
    fail++;
    console.log(`❌ FAIL — ${nombre}${detalle ? " — " + detalle : ""}`);
  }
}

async function main() {
  const adminApp = initAdminApp({ projectId: PROJECT_ID });
  const adminAuth = getAdminAuth(adminApp);
  const adminDb = getAdminFirestore(adminApp);

  // Usuario admin real (con claim), para que la llamada llegue lo más lejos posible
  // dentro de la función — nos importa si la LLAMADA LLEGA (404 de transporte vs.
  // respuesta de la función), no el resultado de negocio en sí.
  const email = `test-region-${Date.now()}@example.com`;
  const password = "Test1234!";
  const userRecord = await adminAuth.createUser({ email, password });
  await adminAuth.setCustomUserClaims(userRecord.uid, { role: "admin" });
  await adminDb.doc(`users/${userRecord.uid}`).set({
    uid: userRecord.uid, email, name: "Admin Test", role: "admin",
    displayName: "", photoURL: "", emailVerified: true,
  });

  const clientApp = initClientApp({ apiKey: "fake-api-key", projectId: PROJECT_ID });
  const clientAuth = getClientAuth(clientApp);
  connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  await signInWithEmailAndPassword(clientAuth, email, password);
  await getIdTokenResult(clientAuth.currentUser, true);

  const payload = { email: `nuevo-${Date.now()}@example.com`, name: "Nuevo", role: "user" };

  // ---------- ANTES del fix: getFunctions() sin región (default us-central1) ----------
  console.log("\n=== SIN región (comportamiento viejo, bug real) ===");
  {
    const functionsSinRegion = getFunctions(clientApp); // default us-central1
    connectFunctionsEmulator(functionsSinRegion, "127.0.0.1", 5001);
    const callCrear = httpsCallable(functionsSinRegion, "crearUsuario");
    try {
      await callCrear(payload);
      reportar("SIN región: falla como se esperaba (bug reproducido)", false, "la llamada tuvo éxito y no debía — el bug no se reprodujo");
    } catch (err) {
      const esNotFound = err.code === "functions/not-found" || err.code === "not-found" || /404/.test(String(err.message));
      reportar("SIN región: la función no se encuentra (bug reproducido)", esNotFound, `code=${err.code}, message=${err.message}`);
    }
  }

  // ---------- DESPUÉS del fix: getFunctions(undefined, 'southamerica-east1') ----------
  console.log("\n=== CON región 'southamerica-east1' (el fix) ===");
  {
    const functionsConRegion = getFunctions(clientApp, "southamerica-east1");
    connectFunctionsEmulator(functionsConRegion, "127.0.0.1", 5001);
    const callCrear = httpsCallable(functionsConRegion, "crearUsuario");
    try {
      const res = await callCrear(payload);
      reportar("CON región: la llamada llega a la función y responde OK", !!res.data?.uid, `uid=${res.data?.uid}`);
    } catch (err) {
      // Cualquier error de NEGOCIO (permission-denied, already-exists, etc.) todavía
      // cuenta como "la llamada llegó" — lo que NO debe pasar es not-found/404.
      const esNotFound = err.code === "functions/not-found" || err.code === "not-found" || /404/.test(String(err.message));
      reportar("CON región: la llamada llega a la función (no 404)", !esNotFound, `code=${err.code}, message=${err.message}`);
    }
  }

  console.log(`\n=== Resultado: ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Error inesperado en el script de verificación:", err);
  process.exit(1);
});
