/**
 * Script de verificación manual contra el emulador de Firestore + Auth.
 * Confirma firestore.rules para el Frente Papelera (mecanismo por referencia,
 * ver CLAUDE.md → "Frente Papelera"): las colecciones nuevas 'papeleraEventos' y
 * 'objetosEliminados' mapeadas en moduloDe() al bucket 'papelera' ya existente
 * (mismo patrón que 'registroLog' -> 'logs').
 *
 * Matriz esperada (rama modulo == 'papelera' de permitido(), extendida en este
 * frente respecto de la que ya tenía la papelera vieja):
 *   dev:   leer/crear/editar/eliminar
 *   admin: leer/crear/editar/eliminar  ('editar' agregado — necesario para que
 *          restaurarCliente/Chofer/Proveedor/Operacion puedan marcar el
 *          PapeleraEvento como 'restaurado', Firestore evalúa ese set() sobre un
 *          doc existente como 'update')
 *   user:  leer/crear                  ('leer' agregado — PapeleraService.
 *          getObjetoEliminado es un getById alcanzable desde flujos de
 *          Operaciones/Liquidaciones sin pasar por la pantalla de Papelera)
 *   demo:  leer                        (bug encontrado y corregido en este frente:
 *          antes 'demo' no tenía ningún permiso pese a poder navegar
 *          ajustes/papelera y ajustes/papelera-legado)
 *
 * Cómo correrlo (con el emulador ya levantado en otra terminal):
 *   firebase emulators:start --only firestore,auth
 *   cd functions
 *   node test-papelera-rules.mjs
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
  const email = `test-papelera-${role}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
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

/** Corre la matriz completa (crear/leer/editar/eliminar) para un rol sobre una
 *  colección, comparando contra lo esperado. */
async function verificarRol(clientDb, coleccion, runId, role, entrada, esperado) {
  console.log(`\n=== ${coleccion} — Rol '${role}' ===`);
  const ref = doc(clientDb, `Vantruck/datos/${coleccion}/test-${role}-${runId}`);

  try {
    await setDoc(ref, entrada);
    reportar(`'${role}' ${esperado.crear ? "puede" : "NO puede"} CREAR en ${coleccion}`,
      esperado.crear, esperado.crear ? undefined : "se permitió y no debía");
  } catch (err) {
    reportar(`'${role}' ${esperado.crear ? "puede" : "NO puede"} CREAR en ${coleccion}`,
      !esperado.crear && err.code === "permission-denied", `code=${err.code}`);
  }

  // Si la creación falló y se esperaba que fallara, sembramos el doc como 'admin'
  // para poder seguir probando leer/editar/eliminar sobre un doc real.
  if (!esperado.crear) {
    // (sembrado externo, ver main())
  }

  try {
    await getDoc(ref);
    reportar(`'${role}' ${esperado.leer ? "puede" : "NO puede"} LEER ${coleccion}`,
      esperado.leer, esperado.leer ? undefined : "se permitió y no debía");
  } catch (err) {
    reportar(`'${role}' ${esperado.leer ? "puede" : "NO puede"} LEER ${coleccion}`,
      !esperado.leer && err.code === "permission-denied", `code=${err.code}`);
  }

  try {
    await updateDoc(ref, { status: "ERROR" });
    reportar(`'${role}' ${esperado.editar ? "puede" : "NO puede"} EDITAR ${coleccion}`,
      esperado.editar, esperado.editar ? undefined : "se permitió y no debía");
  } catch (err) {
    reportar(`'${role}' ${esperado.editar ? "puede" : "NO puede"} EDITAR ${coleccion}`,
      !esperado.editar && err.code === "permission-denied", `code=${err.code}`);
  }

  try {
    await deleteDoc(ref);
    reportar(`'${role}' ${esperado.eliminar ? "puede" : "NO puede"} ELIMINAR ${coleccion}`,
      esperado.eliminar, esperado.eliminar ? undefined : "se permitió y no debía");
  } catch (err) {
    reportar(`'${role}' ${esperado.eliminar ? "puede" : "NO puede"} ELIMINAR ${coleccion}`,
      !esperado.eliminar && err.code === "permission-denied", `code=${err.code}`);
  }
}

async function main() {
  const adminApp = initAdminApp({ projectId: PROJECT_ID });
  const adminAuth = getAdminAuth(adminApp);

  const clientApp = initClientApp({ apiKey: "fake-api-key", projectId: PROJECT_ID });
  const clientAuth = getClientAuth(clientApp);
  connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  const clientDb = getClientFirestore(clientApp);
  connectFirestoreEmulator(clientDb, "127.0.0.1", 8080);

  const runId = Date.now();

  const entradaEvento = {
    timestamp: Date.now(), userId: "TEST", userEmail: "test@example.com",
    motivoBaja: "test", coleccionPrincipal: "clientes", idPrincipal: "TEST",
    estado: "activo", refs: [],
  };
  const entradaObjeto = { razonSocial: "TEST" };

  const matriz = {
    dev:   { crear: true,  leer: true,  editar: true,  eliminar: true },
    admin: { crear: true,  leer: true,  editar: true,  eliminar: true },
    user:  { crear: true,  leer: true,  editar: false, eliminar: false },
    demo:  { crear: false, leer: true,  editar: false, eliminar: false },
  };

  for (const [coleccion, entrada] of [
    ["papeleraEventos", entradaEvento],
    ["objetosEliminados", entradaObjeto],
  ]) {
    for (const role of ["dev", "admin", "user", "demo"]) {
      const cred = await crearUsuarioConRol(adminAuth, role);
      await loguearComo(clientAuth, cred.email, cred.password);

      // 'demo' no puede crear — sembramos el doc como 'dev' antes, para poder
      // seguir probando leer/editar/eliminar sobre un doc real.
      if (!matriz[role].crear) {
        const devCred = await crearUsuarioConRol(adminAuth, "dev");
        await loguearComo(clientAuth, devCred.email, devCred.password);
        await setDoc(doc(clientDb, `Vantruck/datos/${coleccion}/test-${role}-${runId}`), entrada);
        await loguearComo(clientAuth, cred.email, cred.password);
      }

      await verificarRol(clientDb, coleccion, runId, role, entrada, matriz[role]);
    }
  }

  console.log(`\n=== Resultado: ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Error inesperado en el script de verificación:", err);
  process.exit(1);
});
