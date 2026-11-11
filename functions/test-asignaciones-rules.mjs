/**
 * Script de verificación contra el emulador de Firestore + Auth: la matriz
 * completa del módulo 'asignaciones' de permitido() en firestore.rules,
 * 4 acciones x 5 roles = 20 celdas.
 *
 * Es la ÚNICA verificación de ese módulo. 'asignaciones' no está en
 * src/app/servicios/permisos/matriz-esperada.json porque ningún ModuloPermiso
 * lo alcanza, así que test-matriz-permisos-rules.mjs no lo cubre. Un cambio en
 * la rama 'asignaciones' de permitido() se refleja acá, en ESPERADO.
 *
 * Matriz esperada (ESPERADO, más abajo):
 *   - dev, admin, user: las cuatro acciones. 'asignaciones' está desacoplado de
 *     'operaciones' (el tablero es un borrador descartable): 'user' limpia un
 *     borrador aunque en 'operaciones' no tenga eliminar.
 *   - demo: sólo leer (docs/disenos/reglas-y-matriz-de-permisos.md, 2.6): el
 *     tablero de asignaciones es una pantalla de lectura para demo. Crear,
 *     editar y eliminar siguen denegadas. Los dos overrides de PermisosService
 *     que le niegan la descarga (operaciones.descargarTablero y
 *     operaciones.descargarAsignaciones) se conservan a propósito.
 *   - manager: ninguna.
 *
 * Cada acción es la operación real de Firestore: leer = get, crear = set sobre
 * un id nuevo, editar = update sobre un doc sembrado, eliminar = delete sobre un
 * doc sembrado (uno por rol, para que un delete permitido no le saque el doc al
 * rol siguiente). Los docs que se leen, editan y eliminan los siembra el rol
 * 'user' por el cliente, como en la app, y después se loguea el rol bajo prueba.
 *
 * Setup por rol: después de setear el Custom Claim se decodifica el ID token y
 * se afirma que trae el `role` pedido; si no, aborta. Para un rol con todo
 * denegado (hoy 'manager') es la única evidencia de que un rechazo significa
 * "denegó la regla" y no "el rol no llegó al token": ninguna regla lo distingue
 * de un token sin rol.
 *
 * Aislamiento: la corrida es válida sobre un emulador recién levantado y sobre
 * uno con datos de corridas anteriores. Cada corrida usa un id propio
 * (timestamp + 8 hex de un UUID) en todos sus documentos y usuarios, y antes de
 * cada celda verifica con el Admin SDK (que no pasa por las reglas) la
 * precondición: `crear` apunta a un documento que no existe (si existiera,
 * Firestore lo evaluaría como update y la celda mediría la rama 'editar'), y
 * `leer`/`editar`/`eliminar` a uno que esta corrida sembró. Si no se cumple,
 * aborta. No limpia lo que dejaron otras corridas: nunca lo toca.
 *
 * Toda la salida va a stdout; el script no escribe archivos.
 *
 * Cómo correrlo, desde la raíz del repo (levanta el emulador de cero y lo
 * apaga al terminar):
 *   firebase emulators:exec --only firestore,auth --project demo "node functions/test-asignaciones-rules.mjs"
 * O, con el emulador ya levantado en otra terminal
 * (firebase emulators:start --only firestore,auth):
 *   node functions/test-asignaciones-rules.mjs
 *
 * Setea el Custom Claim directo vía Admin SDK (sin pasar por syncRoleClaim):
 * alcanza porque permitido() lee request.auth.token.role, no /users/{uid}.
 */

import { randomUUID } from "node:crypto";

import { initializeApp as initAdminApp } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";

import { initializeApp as initClientApp } from "firebase/app";
import {
  getAuth as getClientAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  getIdToken,
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

const ROLES = ["dev", "admin", "manager", "user", "demo"];
const ACCIONES = ["leer", "crear", "editar", "eliminar"];
const TODAS = { leer: true, crear: true, editar: true, eliminar: true };
const NINGUNA = { leer: false, crear: false, editar: false, eliminar: false };

// La rama 'asignaciones' de permitido(), escrita como matriz (ver el encabezado).
const ESPERADO = {
  dev: TODAS,
  admin: TODAS,
  user: TODAS,
  manager: NINGUNA,
  demo: { ...NINGUNA, leer: true },
};
const CELDAS = ROLES.length * ACCIONES.length;

const ruta = (id) => `Vantruck/datos/asignaciones/${id}`;
// Id de esta corrida: todo documento y todo usuario que el script toca lleva
// este sufijo, así que ninguno puede venir de otra corrida (ver el encabezado).
const sufijo = `${Date.now()}-${randomUUID().slice(0, 8)}`;
const ids = (rol) => ({
  leer: `leer-${sufijo}`,
  crear: `nuevo-${rol}-${sufijo}`,
  editar: `editar-${sufijo}`,
  eliminar: `eliminar-${rol}-${sufijo}`,
});

// Garantía de aislamiento, verificada antes de cada celda con el Admin SDK:
// `crear` apunta a un doc que NO existe; `leer`/`editar`/`eliminar` a uno que
// existe porque esta corrida lo sembró. Si no se cumple, aborta.
async function precondicion(adminDb, accion, path) {
  const existe = (await adminDb.doc(path).get()).exists;
  const debeExistir = accion !== "crear";
  if (existe !== debeExistir) {
    throw new Error(`Precondición rota para '${accion}' sobre ${path}: ` +
      `${debeExistir ? "debía existir (sembrado por esta corrida) y no existe" : "no debía existir y existe"}.`);
  }
}

const CLASES = { setup: "Setup por rol (role en el ID token)", celdas: "Celdas de 'asignaciones'" };
const conteo = Object.fromEntries(Object.keys(CLASES).map((c) => [c, { pass: 0, fail: 0 }]));
let claseActual = "celdas";
function reportar(nombre, ok, detalle) {
  conteo[claseActual][ok ? "pass" : "fail"]++;
  if (ok) console.log(`✅ PASS — ${nombre}${detalle ? " — " + detalle : ""}`);
  else console.log(`❌ FAIL — ${nombre}${detalle ? " — " + detalle : ""}`);
}

// Payload del ID token decodificado a mano (base64url del JWT): lo que se
// afirma es lo que viaja en el token.
function claimsDelToken(idToken) {
  const payload = idToken.split(".")[1];
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

function afirmarRolEnToken(rolPedido, idToken) {
  const llego = claimsDelToken(idToken).role;
  const ok = llego === rolPedido;
  claseActual = "setup";
  reportar(`setup: el ID token trae role='${rolPedido}'`, ok, `llegó role=${JSON.stringify(llego)}`);
  claseActual = "celdas";
  if (!ok) {
    throw new Error(`Setup inválido: se pidió role='${rolPedido}' y el ID token trae role=${JSON.stringify(llego)}. ` +
      "Se aborta antes de afirmar celdas con un token que no tiene el rol.");
  }
}

async function afirmar(nombre, esperado, fn) {
  let permitido;
  let code;
  try { await fn(); permitido = true; }
  catch (err) { permitido = false; code = err.code; }
  const ok = esperado ? permitido : !permitido && code === "permission-denied";
  reportar(`${nombre} → ${esperado ? "permitido" : "denegado"}`, ok,
    permitido ? (esperado ? "" : "se permitió y no debía") : `code=${code}`);
}

async function crearUsuario(adminAuth, role) {
  const email = `asignaciones-${role}-${sufijo}@example.com`;
  const password = "Test1234!";
  const u = await adminAuth.createUser({ email, password });
  await adminAuth.setCustomUserClaims(u.uid, { role });
  return { email, password };
}

// ID token crudo (JWT), con refresh forzado para que traiga el Custom Claim.
async function loguearComo(clientAuth, { email, password }) {
  await signInWithEmailAndPassword(clientAuth, email, password);
  return getIdToken(clientAuth.currentUser, true);
}

async function main() {
  const adminApp = initAdminApp({ projectId: PROJECT_ID });
  const adminAuth = getAdminAuth(adminApp);
  const adminDb = getAdminFirestore(adminApp);

  const clientApp = initClientApp({ apiKey: "fake-api-key", projectId: PROJECT_ID });
  const clientAuth = getClientAuth(clientApp);
  connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = getClientFirestore(clientApp);
  connectFirestoreEmulator(db, "127.0.0.1", 8080);

  const credenciales = {};
  for (const rol of ROLES) credenciales[rol] = await crearUsuario(adminAuth, rol);

  // Siembra como 'user', por el cliente: lo que cada rol lee, edita y elimina.
  // Si 'user' perdiera crear, la siembra falla acá y la corrida aborta.
  console.log("\n=== Siembra (como 'user') ===");
  afirmarRolEnToken("user", await loguearComo(clientAuth, credenciales.user));
  await setDoc(doc(db, ruta(`leer-${sufijo}`)), { itemsBorrador: [], semilla: true });
  await setDoc(doc(db, ruta(`editar-${sufijo}`)), { itemsBorrador: [], semilla: true });
  for (const rol of ROLES) {
    await setDoc(doc(db, ruta(`eliminar-${rol}-${sufijo}`)), { itemsBorrador: [], semilla: true });
  }

  let celdas = 0;
  for (const rol of ROLES) {
    console.log(`\n=== Rol '${rol}' ===`);
    afirmarRolEnToken(rol, await loguearComo(clientAuth, credenciales[rol]));
    for (const accion of ACCIONES) {
      celdas++;
      const path = ruta(ids(rol)[accion]);
      const ref = doc(db, path);
      const operacion = {
        leer: () => getDoc(ref),
        crear: () => setDoc(ref, { itemsBorrador: [], creadoPor: rol }),
        editar: () => updateDoc(ref, { editadoPor: rol }),
        eliminar: () => deleteDoc(ref),
      }[accion];
      await precondicion(adminDb, accion, path);
      await afirmar(`${rol} ${accion} asignaciones`, ESPERADO[rol][accion], operacion);
    }
  }

  console.log("\n=== Resumen por clase ===");
  let fallas = 0;
  for (const [clase, titulo] of Object.entries(CLASES)) {
    const { pass, fail } = conteo[clase];
    fallas += fail;
    console.log(`${titulo}: ${pass} PASS / ${fail} FAIL`);
  }
  console.log(`(celdas recorridas: ${celdas} de ${CELDAS})\n`);
  process.exit(fallas > 0 || celdas !== CELDAS ? 1 : 0);
}

main().catch((err) => {
  console.error("Error inesperado en el script de verificación:", err);
  process.exit(1);
});
