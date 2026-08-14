/**
 * Script de verificación manual contra el emulador de Firestore + Auth.
 * NO es un test automatizado del proyecto — script de un solo uso para
 * confirmar el fix de firestore.rules: 'legajos' gana 'crear' para 'user'
 * (antes solo tenía 'leer'/'editar' — bloqueaba silenciosamente la cascada
 * choferes→vehiculos→legajos de ChoferService.guardarChoferConVehiculos
 * cuando el alta la hace un usuario con rol 'user').
 *
 * Extendido (fix posterior): 'categoriasDocumentacion' y 'documentacionHistorial'
 * (colecciones nuevas de los Bloques 3/8) nunca se agregaron a moduloDe() —
 * quedaban denegadas para TODOS los roles, incluido 'dev', por el fail-safe del
 * proyecto ("colección sin mapeo → denegada por defecto"). Casos agregados abajo,
 * después de los de 'legajos'.
 *
 * Cómo correrlo (con el emulador ya levantado en otra terminal):
 *   firebase emulators:start --only firestore,auth
 *   cd functions
 *   node test-legajos-rules.mjs
 *
 * Setea el Custom Claim directo vía Admin SDK (sin pasar por
 * syncRoleClaim/functions) — alcanza porque permitido() en
 * firestore.rules lee request.auth.token.role, no el documento
 * Firestore de /users/{uid}. Mismo patrón que test-asignaciones-rules.mjs.
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
  const email = `test-${role}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
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

  // ---------- 'user': caso del fix — debe poder CREAR en 'legajos' ----------
  console.log("\n=== Rol 'user' ===");
  const userCred = await crearUsuarioConRol(adminAuth, "user");
  const tokenUser = await loguearComo(clientAuth, userCred.email, userCred.password);
  console.log("role en el ID token:", tokenUser.claims.role);

  const docLegajo = doc(clientDb, "Vantruck/datos/legajos/testLegajoUser");
  try {
    await setDoc(docLegajo, { idChofer: "choferTest", documentacion: [], visible: true });
    reportar("'user' puede CREAR en 'legajos' — CASO DEL FIX", true);
  } catch (err) {
    reportar("'user' puede CREAR en 'legajos' — CASO DEL FIX", false, `code=${err.code}`);
  }

  try {
    await getDoc(docLegajo);
    reportar("'user' puede LEER en 'legajos' (sin cambios)", true);
  } catch (err) {
    reportar("'user' puede LEER en 'legajos' (sin cambios)", false, `code=${err.code}`);
  }

  try {
    await updateDoc(docLegajo, { visible: false });
    reportar("'user' puede EDITAR en 'legajos' (sin cambios)", true);
  } catch (err) {
    reportar("'user' puede EDITAR en 'legajos' (sin cambios)", false, `code=${err.code}`);
  }

  try {
    await deleteDoc(docLegajo);
    reportar("'user' NO puede ELIMINAR en 'legajos' (sin cambios)", false, "la eliminación se permitió y no debía");
  } catch (err) {
    reportar("'user' NO puede ELIMINAR en 'legajos' (sin cambios)", err.code === "permission-denied", `code=${err.code}`);
  }

  // ---------- 'demo': solo 'leer' ----------
  console.log("\n=== Rol 'demo' ===");
  const demoCred = await crearUsuarioConRol(adminAuth, "demo");
  await loguearComo(clientAuth, demoCred.email, demoCred.password);

  try {
    await getDoc(docLegajo);
    reportar("'demo' puede LEER en 'legajos' (sin cambios)", true);
  } catch (err) {
    reportar("'demo' puede LEER en 'legajos' (sin cambios)", false, `code=${err.code}`);
  }

  try {
    await setDoc(doc(clientDb, "Vantruck/datos/legajos/testLegajoDemo"), { idChofer: "x", documentacion: [], visible: true });
    reportar("'demo' NO puede CREAR en 'legajos' (sin cambios)", false, "la escritura se permitió y no debía");
  } catch (err) {
    reportar("'demo' NO puede CREAR en 'legajos' (sin cambios)", err.code === "permission-denied", `code=${err.code}`);
  }

  // ---------- 'admin': control, sin cambios esperados ----------
  console.log("\n=== Rol 'admin' (control, sin cambios esperados) ===");
  const adminCred = await crearUsuarioConRol(adminAuth, "admin");
  await loguearComo(clientAuth, adminCred.email, adminCred.password);

  const docAdmin = doc(clientDb, "Vantruck/datos/legajos/testLegajoAdmin");
  try {
    await setDoc(docAdmin, { idChofer: "y", documentacion: [], visible: true });
    await deleteDoc(docAdmin);
    reportar("'admin' puede crear Y eliminar en 'legajos' (sin cambios)", true);
  } catch (err) {
    reportar("'admin' puede crear Y eliminar en 'legajos' (sin cambios)", false, `code=${err.code}`);
  }

  // ---------- 'dev': caso del fix — colecciones nuevas sin mapear en moduloDe() ----------
  console.log("\n=== Rol 'dev' — caso del fix (categoriasDocumentacion / documentacionHistorial) ===");
  const devCred = await crearUsuarioConRol(adminAuth, "dev");
  await loguearComo(clientAuth, devCred.email, devCred.password);

  const docCategoriaDev = doc(clientDb, "Vantruck/datos/categoriasDocumentacion/testCategoriaDev");
  try {
    await setDoc(docCategoriaDev, { nombre: "Test", orden: 0, activa: true });
    reportar("'dev' puede CREAR en 'categoriasDocumentacion' — CASO DEL FIX", true);
  } catch (err) {
    reportar("'dev' puede CREAR en 'categoriasDocumentacion' — CASO DEL FIX", false, `code=${err.code}`);
  }

  const docHistorialDev = doc(clientDb, "Vantruck/datos/documentacionHistorial/testHistorialDev");
  try {
    await setDoc(docHistorialDev, {
      idLegajo: "x", idCategoria: "y",
      documento: { idCategoria: "y", titulo: "Test", fechaVto: null, estado: "sinVto", imagenes: [] },
      fechaReemplazo: new Date().toISOString(),
    });
    reportar("'dev' puede CREAR en 'documentacionHistorial' — CASO DEL FIX", true);
  } catch (err) {
    reportar("'dev' puede CREAR en 'documentacionHistorial' — CASO DEL FIX", false, `code=${err.code}`);
  }

  // ---------- 'user': crear/leer en ambas colecciones nuevas ----------
  console.log("\n=== Rol 'user' — colecciones nuevas ===");
  await loguearComo(clientAuth, userCred.email, userCred.password);

  const docCategoriaUser = doc(clientDb, "Vantruck/datos/categoriasDocumentacion/testCategoriaUser");
  try {
    await setDoc(docCategoriaUser, { nombre: "Test User", orden: 1, activa: true });
    reportar("'user' puede CREAR en 'categoriasDocumentacion'", true);
  } catch (err) {
    reportar("'user' puede CREAR en 'categoriasDocumentacion'", false, `code=${err.code}`);
  }
  try {
    await getDoc(docCategoriaUser);
    reportar("'user' puede LEER en 'categoriasDocumentacion'", true);
  } catch (err) {
    reportar("'user' puede LEER en 'categoriasDocumentacion'", false, `code=${err.code}`);
  }

  const docHistorialUser = doc(clientDb, "Vantruck/datos/documentacionHistorial/testHistorialUser");
  try {
    await setDoc(docHistorialUser, {
      idLegajo: "x", idCategoria: "y",
      documento: { idCategoria: "y", titulo: "Test", fechaVto: null, estado: "sinVto", imagenes: [] },
      fechaReemplazo: new Date().toISOString(),
    });
    reportar("'user' puede CREAR en 'documentacionHistorial'", true);
  } catch (err) {
    reportar("'user' puede CREAR en 'documentacionHistorial'", false, `code=${err.code}`);
  }
  try {
    await getDoc(docHistorialUser);
    reportar("'user' puede LEER en 'documentacionHistorial'", true);
  } catch (err) {
    reportar("'user' puede LEER en 'documentacionHistorial'", false, `code=${err.code}`);
  }

  // ---------- 'demo': solo 'leer' en ambas colecciones nuevas ----------
  console.log("\n=== Rol 'demo' — colecciones nuevas ===");
  await loguearComo(clientAuth, demoCred.email, demoCred.password);

  try {
    await getDoc(docCategoriaUser);
    reportar("'demo' puede LEER en 'categoriasDocumentacion'", true);
  } catch (err) {
    reportar("'demo' puede LEER en 'categoriasDocumentacion'", false, `code=${err.code}`);
  }
  try {
    await setDoc(doc(clientDb, "Vantruck/datos/categoriasDocumentacion/testCategoriaDemo"), { nombre: "x", orden: 9, activa: true });
    reportar("'demo' NO puede CREAR en 'categoriasDocumentacion'", false, "la escritura se permitió y no debía");
  } catch (err) {
    reportar("'demo' NO puede CREAR en 'categoriasDocumentacion'", err.code === "permission-denied", `code=${err.code}`);
  }

  try {
    await getDoc(docHistorialUser);
    reportar("'demo' puede LEER en 'documentacionHistorial'", true);
  } catch (err) {
    reportar("'demo' puede LEER en 'documentacionHistorial'", false, `code=${err.code}`);
  }
  try {
    await setDoc(doc(clientDb, "Vantruck/datos/documentacionHistorial/testHistorialDemo"), {
      idLegajo: "x", idCategoria: "y",
      documento: { idCategoria: "y", titulo: "Test", fechaVto: null, estado: "sinVto", imagenes: [] },
      fechaReemplazo: new Date().toISOString(),
    });
    reportar("'demo' NO puede CREAR en 'documentacionHistorial'", false, "la escritura se permitió y no debía");
  } catch (err) {
    reportar("'demo' NO puede CREAR en 'documentacionHistorial'", err.code === "permission-denied", `code=${err.code}`);
  }

  console.log(`\n=== Resultado: ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Error inesperado en el script de verificación:", err);
  process.exit(1);
});
