/**
 * Script de verificación manual contra los emuladores (Auth + Firestore + Functions).
 * NO es un test automatizado del proyecto — es un script de un solo uso para
 * confirmar a mano que syncRoleClaim + firestore.rules funcionan juntos.
 *
 * Cómo correrlo (con los emuladores ya levantados en otra terminal):
 *   cd functions
 *   node test-emulator.mjs
 *
 * Requiere: firebase emulators:start --only firestore,auth,functions
 * corriendo en 127.0.0.1 (puertos default: firestore 8080, auth 9099).
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
  getFirestore as getClientFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
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

async function esperarClaim(adminAuth, uid, roleEsperado, intentos = 20) {
  for (let i = 0; i < intentos; i++) {
    const u = await adminAuth.getUser(uid);
    if (u.customClaims?.role === roleEsperado) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  // ---------- Admin SDK (bypassa reglas, para armar el estado inicial) ----------
  const adminApp = initAdminApp({ projectId: PROJECT_ID });
  const adminAuth = getAdminAuth(adminApp);
  const adminDb = getAdminFirestore(adminApp);

  const email = `usuario-test-${Date.now()}@example.com`;
  const password = "Test1234!";

  console.log("\n--- 1) Crear usuario de prueba en el emulador de Auth ---");
  const userRecord = await adminAuth.createUser({ email, password });
  const uid = userRecord.uid;
  console.log(`Usuario creado: uid=${uid} email=${email}`);

  console.log("\n--- 2) Escribir users/{uid} en Firestore con role='user' ---");
  await adminDb.doc(`users/${uid}`).set({
    uid,
    email,
    displayName: "",
    photoURL: "",
    emailVerified: false,
    name: "Usuario Test",
    role: "user",
  });

  console.log("\n--- 3) Esperar que syncRoleClaim sincronice el claim ---");
  const claimUser = await esperarClaim(adminAuth, uid, "user");
  reportar(
    "syncRoleClaim seteó role='user' en el Custom Claim",
    claimUser,
    `admin.auth().getUser('${uid}').customClaims`,
  );

  // ---------- Client SDK (respeta firestore.rules, como la app real) ----------
  const clientApp = initClientApp({
    apiKey: "fake-api-key",
    projectId: PROJECT_ID,
  });
  const clientAuth = getClientAuth(clientApp);
  connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", {
    disableWarnings: true,
  });
  const clientDb = getClientFirestore(clientApp);
  connectFirestoreEmulator(clientDb, "127.0.0.1", 8080);

  console.log("\n--- 4) Iniciar sesión como el usuario de prueba (rol 'user') ---");
  await signInWithEmailAndPassword(clientAuth, email, password);
  await getIdTokenResult(clientAuth.currentUser, true); // forzar refresh del token
  const tokenUser = await getIdTokenResult(clientAuth.currentUser);
  console.log("role en el ID token:", tokenUser.claims.role);

  console.log("\n--- 5) Intentar escribir en 'vendedores' como rol 'user' (debe RECHAZARSE) ---");
  try {
    await setDoc(doc(clientDb, "Vantruck/datos/vendedores/testDoc"), {
      razonSocial: "Vendedor de prueba",
    });
    reportar("Escritura en 'vendedores' rechazada para rol 'user'", false, "la escritura se permitió y no debía");
  } catch (err) {
    reportar(
      "Escritura en 'vendedores' rechazada para rol 'user'",
      err.code === "permission-denied",
      `code=${err.code}`,
    );
  }

  console.log("\n--- 6) Cambiar el rol a 'admin' en Firestore (vía Admin SDK) ---");
  await adminDb.doc(`users/${uid}`).set({ role: "admin" }, { merge: true });
  const claimAdmin = await esperarClaim(adminAuth, uid, "admin");
  reportar(
    "syncRoleClaim actualizó el Custom Claim a role='admin'",
    claimAdmin,
    `admin.auth().getUser('${uid}').customClaims`,
  );

  console.log("\n--- 7) Refrescar el ID token del cliente y reintentar la escritura en 'vendedores' (debe PERMITIRSE) ---");
  await getIdTokenResult(clientAuth.currentUser, true); // fuerza tomar el claim nuevo
  const tokenAdmin = await getIdTokenResult(clientAuth.currentUser);
  console.log("role en el ID token (post-refresh):", tokenAdmin.claims.role);

  try {
    await setDoc(doc(clientDb, "Vantruck/datos/vendedores/testDoc"), {
      razonSocial: "Vendedor de prueba (admin)",
    });
    reportar("Escritura en 'vendedores' permitida para rol 'admin'", true);
  } catch (err) {
    reportar("Escritura en 'vendedores' permitida para rol 'admin'", false, `code=${err.code}`);
  }

  console.log("\n--- 8) Reescribir el mismo role='admin' (solo cambia 'name'): NO debe llamar a setCustomUserClaims de nuevo ---");
  const antes = await adminAuth.getUser(uid);
  const tokensValidAfterTimeAntes = antes.tokensValidAfterTime;
  await adminDb.doc(`users/${uid}`).set({ role: "admin", name: "Usuario Test Editado" }, { merge: true });
  await new Promise((r) => setTimeout(r, 2000)); // dar tiempo a que el trigger corra si fuera a correr
  const despues = await adminAuth.getUser(uid);
  reportar(
    "No hubo escritura redundante de customClaims (tokensValidAfterTime sin cambios)",
    despues.tokensValidAfterTime === tokensValidAfterTimeAntes,
    `antes=${tokensValidAfterTimeAntes} despues=${despues.tokensValidAfterTime}`,
  );

  console.log(`\n=== Resultado: ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Error inesperado en el script de verificación:", err);
  process.exit(1);
});
