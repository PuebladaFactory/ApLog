/**
 * Script de verificación manual contra el emulador de Firestore + Auth.
 * Confirma firestore.rules tras congelar las colecciones viejas 'logs' y
 * 'papelera' en el bucket 'historicoSoloLectura' (sin escritores en código desde
 * que se eliminaron LogService y la Papelera legado), y que las colecciones nuevas
 * que comparten los buckets 'logs' y 'papelera' no cambian.
 *
 * Matriz esperada, 5 roles × 4 acciones por colección:
 *   logs, papelera (historicoSoloLectura):
 *     leer: dev/admin/user/demo; manager no. crear/editar/eliminar: nadie, dev incluido.
 *   registroLog (bucket 'logs'):
 *     dev todo; admin/user leer + crear; demo leer; manager nada.
 *   papeleraEventos, objetosEliminados (bucket 'papelera'):
 *     dev y admin todo; user leer + crear; demo leer; manager nada.
 *
 * Los documentos de prueba se siembran con el Admin SDK (salta las reglas): con el
 * bucket nuevo ni 'dev' puede crear, así que no se puede sembrar como 'dev'.
 * CREAR se prueba sobre un id nuevo; LEER/EDITAR/ELIMINAR sobre el sembrado.
 *
 * Cómo correrlo (con el emulador ya levantado en otra terminal):
 *   firebase emulators:start --only firestore,auth
 *   cd functions
 *   node test-historico-rules.mjs
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
  updateDoc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";

const PROJECT_ID = "demoapplog";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.GCLOUD_PROJECT = PROJECT_ID;

const ROLES = ["dev", "admin", "manager", "user", "demo"];

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

/** m(leer, crear, editar, eliminar) */
const m = (leer, crear, editar, eliminar) => ({ leer, crear, editar, eliminar });
const NADA = m(false, false, false, false);
const SOLO_LEER = m(true, false, false, false);
const TODO = m(true, true, true, true);

const HISTORICO = { dev: SOLO_LEER, admin: SOLO_LEER, manager: NADA, user: SOLO_LEER, demo: SOLO_LEER };
const BUCKET_LOGS = { dev: TODO, admin: m(true, true, false, false), manager: NADA,
  user: m(true, true, false, false), demo: SOLO_LEER };
const BUCKET_PAPELERA = { dev: TODO, admin: TODO, manager: NADA,
  user: m(true, true, false, false), demo: SOLO_LEER };

const CASOS = [
  ["logs", HISTORICO, { accion: "ALTA", coleccion: "clientes", idObjet: 1, resultado: "TEST", timestamp: Date.now() }],
  ["papelera", HISTORICO, { idDoc: 1, logEntry: { idObjet: 1 }, objeto: { razonSocial: "TEST" } }],
  ["registroLog", BUCKET_LOGS, { action: "ALTA", coleccion: "clientes", idObjet: "TEST", status: "SUCCESS" }],
  ["papeleraEventos", BUCKET_PAPELERA, { timestamp: Date.now(), userId: "TEST", motivoBaja: "test",
    coleccionPrincipal: "clientes", idPrincipal: "TEST", estado: "activo", refs: [] }],
  ["objetosEliminados", BUCKET_PAPELERA, { razonSocial: "TEST" }],
];

async function crearUsuarioConRol(adminAuth, role) {
  const email = `test-historico-${role}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const password = "Test1234!";
  const userRecord = await adminAuth.createUser({ email, password });
  await adminAuth.setCustomUserClaims(userRecord.uid, { role });
  return { email, password };
}

async function loguearComo(clientAuth, email, password) {
  await signInWithEmailAndPassword(clientAuth, email, password);
  await getIdTokenResult(clientAuth.currentUser, true); // forzar refresh del token
}

async function probar(nombre, esperado, fn) {
  try {
    await fn();
    reportar(nombre, esperado, esperado ? undefined : "se permitió y no debía");
  } catch (err) {
    reportar(nombre, !esperado && err.code === "permission-denied", `code=${err.code}`);
  }
}

async function main() {
  const adminApp = initAdminApp({ projectId: PROJECT_ID });
  const adminAuth = getAdminAuth(adminApp);
  const adminDb = getAdminFirestore(adminApp);

  const clientApp = initClientApp({ apiKey: "fake-api-key", projectId: PROJECT_ID });
  const clientAuth = getClientAuth(clientApp);
  connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  const clientDb = getClientFirestore(clientApp);
  connectFirestoreEmulator(clientDb, "127.0.0.1", 8080);

  const runId = Date.now();

  for (const role of ROLES) {
    const cred = await crearUsuarioConRol(adminAuth, role);
    await loguearComo(clientAuth, cred.email, cred.password);

    for (const [coleccion, matriz, entrada] of CASOS) {
      const esperado = matriz[role];
      console.log(`\n=== ${coleccion} — Rol '${role}' ===`);

      const idSembrado = `seed-${role}-${runId}`;
      await adminDb.doc(`Vantruck/datos/${coleccion}/${idSembrado}`).set(entrada);
      const refSembrado = doc(clientDb, `Vantruck/datos/${coleccion}/${idSembrado}`);
      const refNuevo = doc(clientDb, `Vantruck/datos/${coleccion}/nuevo-${role}-${runId}`);
      const v = (b) => (b ? "puede" : "NO puede");

      await probar(`'${role}' ${v(esperado.crear)} CREAR en ${coleccion}`, esperado.crear,
        () => setDoc(refNuevo, entrada));
      await probar(`'${role}' ${v(esperado.leer)} LEER ${coleccion}`, esperado.leer,
        () => getDoc(refSembrado));
      await probar(`'${role}' ${v(esperado.editar)} EDITAR ${coleccion}`, esperado.editar,
        () => updateDoc(refSembrado, { status: "ERROR" }));
      await probar(`'${role}' ${v(esperado.eliminar)} ELIMINAR ${coleccion}`, esperado.eliminar,
        () => deleteDoc(refSembrado));
    }
  }

  console.log(`\n=== Resultado: ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Error inesperado en el script de verificación:", err);
  process.exit(1);
});
