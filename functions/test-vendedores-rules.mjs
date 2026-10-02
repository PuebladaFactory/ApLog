/**
 * Script de verificación manual contra el emulador de Firestore + Auth.
 * NO es un test automatizado — confirma las reglas del Frente Vendedores (V1):
 *  - 'comisionesVenta' (módulo 'comisiones'): user crear+editar (set+merge
 *    con increment), sin leer ni eliminar; demo leer; admin todo.
 *  - 'liquidacionesVenta' (módulo 'vendedores'): dev/admin todo; demo leer;
 *    user nada.
 *  - 'vendedores': user no lee (control, sin cambios).
 *
 * Cómo correrlo (con el emulador ya levantado en otra terminal):
 *   firebase emulators:start --only firestore,auth
 *   cd functions
 *   node test-vendedores-rules.mjs
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

const escrituraComision = (monto) => ({
  idOperacion: "opTest", numeroOperacion: 1, fecha: "2099-01-15",
  anio: 2099, mes: 1, periodo: 209901,
  idCliente: "cliTest", razonSocial: "Cliente Test",
  idVendedor: "venTest", porcentaje: 5,
  base: 1000,
  monto: increment(monto),
  saldo: increment(monto),
  montoLiquidado: increment(0),
  anulada: false,
  actualizado: Date.now(),
});

const liquidacion = () => ({
  numero: "LVEN-9999", idVendedor: "venTest",
  vendedor: { apellido: "Test", nombre: "Vendedor", cuit: 20111111112 },
  anio: 2099, mes: 1, periodo: 209901, fechaEmision: "2099-02-01",
  lineas: [], total: 0, estado: "emitida", pago: null, anulacion: null,
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

  const com = doc(db, "Vantruck/datos/comisionesVenta/opTest_venTest");
  const liq = doc(db, "Vantruck/datos/liquidacionesVenta/liqTest");
  const ven = doc(db, "Vantruck/datos/vendedores/venTest");

  // ---------- 'user' ----------
  console.log("\n=== Rol 'user' ===");
  await loguearComo(clientAuth, userCred.email, userCred.password);
  await debePermitir("'user' puede CREAR una comisión con set+merge+increment (cierre)", () =>
    setDoc(com, escrituraComision(50), { merge: true }));
  await debePermitir("'user' puede EDITAR una comisión existente con set+merge+increment", () =>
    setDoc(com, escrituraComision(-50), { merge: true }));
  await debeDenegar("'user' NO puede LEER comisiones", () => getDoc(com));
  await debeDenegar("'user' NO puede ELIMINAR comisiones", () => deleteDoc(com));
  await debeDenegar("'user' NO puede CREAR liquidaciones", () => setDoc(liq, liquidacion()));
  await debeDenegar("'user' NO puede LEER liquidaciones", () => getDoc(liq));
  await debeDenegar("'user' NO puede LEER vendedores (control)", () => getDoc(ven));

  // ---------- 'admin' ----------
  console.log("\n=== Rol 'admin' ===");
  await loguearComo(clientAuth, adminCred.email, adminCred.password);
  await debePermitir("'admin' puede CREAR una liquidación", () => setDoc(liq, liquidacion()));
  await debePermitir("'admin' puede EDITAR una liquidación", () => updateDoc(liq, { estado: "pagada" }));
  await debePermitir("'admin' puede LEER una comisión", () => getDoc(com));
  await debePermitir("'admin' puede EDITAR una comisión", () => updateDoc(com, { montoLiquidado: 0, saldo: 0 }));

  // ---------- 'demo' ----------
  console.log("\n=== Rol 'demo' ===");
  await loguearComo(clientAuth, demoCred.email, demoCred.password);
  await debePermitir("'demo' puede LEER una comisión", () => getDoc(com));
  await debeDenegar("'demo' NO puede ESCRIBIR una comisión", () =>
    setDoc(com, escrituraComision(10), { merge: true }));
  await debePermitir("'demo' puede LEER una liquidación", () => getDoc(liq));
  await debeDenegar("'demo' NO puede EDITAR una liquidación", () => updateDoc(liq, { estado: "anulada" }));

  // ---------- 'admin' (limpieza) ----------
  console.log("\n=== Rol 'admin' (limpieza) ===");
  await loguearComo(clientAuth, adminCred.email, adminCred.password);
  await debePermitir("'admin' puede ELIMINAR una comisión", () => deleteDoc(com));
  await debePermitir("'admin' puede ELIMINAR una liquidación", () => deleteDoc(liq));

  console.log(`\n=== Resultado: ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Error inesperado en el script de verificación:", err);
  process.exit(1);
});
