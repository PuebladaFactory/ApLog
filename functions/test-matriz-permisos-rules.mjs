/**
 * Script de verificación contra el emulador de Firestore + Auth.
 * Afirma que permitido() de firestore.rules coincide con la sección "reglas"
 * de src/app/servicios/permisos/matriz-esperada.json, celda por celda:
 * 9 módulos x 4 acciones x 5 roles = 180 celdas. La otra mitad del contrato
 * (matrizBase contra el mismo fixture) la verifica permisos.service.spec.ts.
 * Diseño: docs/disenos/reglas-y-matriz-de-permisos.md, 4.4.
 *
 * Cada módulo se prueba sobre una colección representativa bajo
 * /Vantruck/datos/, y cada acción como la operación real de Firestore:
 * leer = get, crear = set sobre un id nuevo, editar = update sobre un doc
 * sembrado, eliminar = delete sobre un doc sembrado (uno por rol, para que un
 * delete permitido no le saque el doc al rol siguiente).
 *
 * Tres clases de afirmación, contadas por separado en el resumen:
 *
 * 1. Las 180 celdas del fixture.
 *
 * 2. Controles por rol. Lo que prueba que un rechazo significa "denegó la
 *    matriz" y no "el rol no llegó al token" es el SETUP: después de setear el
 *    Custom Claim se decodifica el ID token y se afirma que trae el `role`
 *    pedido; si no, el script aborta ahí, sin reportar rechazos que no
 *    significan nada. Es la única evidencia posible para 'manager', que está
 *    en false en las 180 celdas y no aparece por nombre en ningún módulo de
 *    permitido(): ninguna regla lo distingue de un token sin rol. Para
 *    dev/admin/user/demo se afirma además al menos un permitido del fixture.
 *
 * 3. Los dos casos de legacySoloLectura (facturaCliente): 'manager' lee, y un
 *    token autenticado SIN `role` también lee. El segundo DOCUMENTA el
 *    comportamiento actual, no lo aprueba: muestra que esa lectura distingue
 *    autenticado de no autenticado, no rol presente de rol ausente (por eso no
 *    sirve de control positivo). El bucket legacySoloLectura se revisa en la
 *    migración (docs/disenos/reglas-y-matriz-de-permisos.md, 2.10); cuando
 *    cambie, este caso tiene que fallar y forzar la decisión, no cambiar en
 *    silencio.
 *
 * Aislamiento: la corrida es válida sobre un emulador recién levantado y
 * sobre uno con datos de corridas anteriores. Cada corrida usa un id propio
 * (timestamp + 8 hex de un UUID) en todos sus documentos y usuarios, y antes de cada celda
 * verifica con el Admin SDK la precondición: `crear` apunta a un documento
 * que no existe (si existiera, Firestore lo evaluaría como update y la celda
 * mediría la rama 'editar'), y `leer`/`editar`/`eliminar` a uno que esta
 * corrida sembró. Si la precondición no se cumple, aborta. No limpia lo que
 * dejaron otras corridas: no lo necesita, porque nunca lo toca.
 *
 * Toda la salida va a stdout; el script no escribe archivos.
 *
 * Cómo correrlo (con el emulador ya levantado en otra terminal):
 *   firebase emulators:start --only firestore,auth
 *   cd functions
 *   node test-matriz-permisos-rules.mjs
 */

import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

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

const aqui = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(resolve(aqui, "../src/app/servicios/permisos/matriz-esperada.json"), "utf8"),
);

const ROLES = ["dev", "admin", "manager", "user", "demo"];
const ACCIONES = ["leer", "crear", "editar", "eliminar"];

// Colección representativa de cada módulo, según moduloDe() de firestore.rules.
const COLECCION = {
  desarrollo: "generacionesPrueba",
  entidades: "clientes",
  legajos: "legajos",
  vendedores: "vendedores",
  operaciones: "operaciones",
  tarifas: "tarifas",
  finanzas: "movimientosFin",
  resumenes: "resumenesOp",
  configuracion: "configuracion",
};
const COLECCION_LEGACY = "facturaCliente"; // moduloDe → legacySoloLectura

const ruta = (coleccion, id) => `Vantruck/datos/${coleccion}/${id}`;
// Id de esta corrida: todo documento y todo usuario que el script toca lleva
// este sufijo, así que ninguno puede venir de otra corrida (ver el encabezado).
const sufijo = `${Date.now()}-${randomUUID().slice(0, 8)}`;

// Garantía de aislamiento, verificada antes de cada celda con el Admin SDK
// (que no pasa por las reglas): `crear` apunta a un doc que NO existe —si
// existiera, Firestore evaluaría la escritura como update y la celda mediría
// la rama 'editar'—; `leer`/`editar`/`eliminar` apuntan a uno que existe
// porque esta corrida lo sembró. Si no se cumple, aborta: la celda no mediría
// lo que dice.
async function precondicion(adminDb, accion, path) {
  const existe = (await adminDb.doc(path).get()).exists;
  const debeExistir = accion !== "crear";
  if (existe !== debeExistir) {
    throw new Error(`Precondición rota para '${accion}' sobre ${path}: ` +
      `${debeExistir ? "debía existir (sembrado por esta corrida) y no existe" : "no debía existir y existe"}.`);
  }
}

// Conteo por clase de afirmación (ver el encabezado).
const CLASES = {
  celdas: "Celdas del fixture",
  controles: "Controles por rol",
  legacy: "Casos de legacySoloLectura",
};
const conteo = Object.fromEntries(Object.keys(CLASES).map((c) => [c, { pass: 0, fail: 0 }]));
let claseActual = "celdas";
const porRol = Object.fromEntries(ROLES.map((r) => [r, { permitidos: 0, rechazos: 0 }]));
function reportar(nombre, ok, detalle) {
  conteo[claseActual][ok ? "pass" : "fail"]++;
  if (ok) console.log(`✅ PASS — ${nombre}${detalle ? " — " + detalle : ""}`);
  else console.log(`❌ FAIL — ${nombre}${detalle ? " — " + detalle : ""}`);
}

// Payload del ID token decodificado a mano (base64url del JWT), sin pasar por
// getIdTokenResult: lo que se afirma es lo que viaja en el token.
function claimsDelToken(idToken) {
  const payload = idToken.split(".")[1];
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

// Afirmación de setup: el token trae exactamente el rol pedido (o ningún rol,
// con rolPedido null). Si no, aborta: los rechazos que siguieran no
// significarían nada.
function afirmarRolEnToken(rolPedido, idToken) {
  const llego = claimsDelToken(idToken).role;
  const ok = rolPedido === null ? llego === undefined : llego === rolPedido;
  const pedido = rolPedido === null ? "(sin rol)" : `'${rolPedido}'`;
  reportar(`setup: el ID token trae role=${pedido}`, ok, `llegó role=${JSON.stringify(llego)}`);
  if (!ok) {
    throw new Error(`Setup inválido: se pidió role=${pedido} y el ID token trae role=${JSON.stringify(llego)}. ` +
      "Se aborta antes de afirmar celdas con un token que no tiene el rol.");
  }
}

async function afirmar(rol, nombre, esperado, fn) {
  let permitido;
  let code;
  try { await fn(); permitido = true; }
  catch (err) { permitido = false; code = err.code; }
  const ok = esperado
    ? permitido
    : !permitido && code === "permission-denied";
  // Sólo cuenta para el control positivo lo que se afirmó Y pasó.
  if (ok) porRol[rol][esperado ? "permitidos" : "rechazos"]++;
  reportar(`${nombre} → ${esperado ? "permitido" : "denegado"}`, ok,
    permitido ? (esperado ? "" : "se permitió y no debía") : `code=${code}`);
}

async function crearUsuario(adminAuth, role) {
  const email = `matriz-${role ?? "sinrol"}-${sufijo}@example.com`;
  const password = "Test1234!";
  const u = await adminAuth.createUser({ email, password });
  if (role) await adminAuth.setCustomUserClaims(u.uid, { role });
  return { email, password };
}

// Devuelve el ID token crudo (JWT), forzando el refresh para que traiga los
// Custom Claims recién seteados.
async function loguearComo(clientAuth, { email, password }) {
  await signInWithEmailAndPassword(clientAuth, email, password);
  return getIdToken(clientAuth.currentUser, true);
}

async function sembrar(adminDb) {
  const batch = adminDb.batch();
  for (const coleccion of Object.values(COLECCION)) {
    batch.set(adminDb.doc(ruta(coleccion, `leer-${sufijo}`)), { semilla: true });
    batch.set(adminDb.doc(ruta(coleccion, `editar-${sufijo}`)), { semilla: true, n: 0 });
    for (const rol of ROLES) {
      batch.set(adminDb.doc(ruta(coleccion, `eliminar-${rol}-${sufijo}`)), { semilla: true });
    }
  }
  batch.set(adminDb.doc(ruta(COLECCION_LEGACY, `leer-${sufijo}`)), { semilla: true });
  await batch.commit();
}

async function main() {
  const modulos = Object.keys(fixture.reglas);
  const faltan = modulos.filter((m) => !COLECCION[m]);
  if (faltan.length) throw new Error(`Módulos del fixture sin colección representativa: ${faltan.join(", ")}`);

  const adminApp = initAdminApp({ projectId: PROJECT_ID });
  const adminAuth = getAdminAuth(adminApp);
  const adminDb = getAdminFirestore(adminApp);

  const clientApp = initClientApp({ apiKey: "fake-api-key", projectId: PROJECT_ID });
  const clientAuth = getClientAuth(clientApp);
  connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = getClientFirestore(clientApp);
  connectFirestoreEmulator(db, "127.0.0.1", 8080);

  await sembrar(adminDb);

  let celdas = 0;
  for (const rol of ROLES) {
    console.log(`\n=== Rol '${rol}' ===`);
    const idToken = await loguearComo(clientAuth, await crearUsuario(adminAuth, rol));
    claseActual = "controles";
    afirmarRolEnToken(rol, idToken);

    claseActual = "celdas";
    for (const modulo of modulos) {
      const col = COLECCION[modulo];
      for (const accion of ACCIONES) {
        celdas++;
        const esperado = fixture.reglas[modulo][accion][rol];
        const nombre = `${rol} ${accion} ${modulo} (${col})`;
        const id = {
          leer: `leer-${sufijo}`,
          crear: `nuevo-${rol}-${sufijo}`,
          editar: `editar-${sufijo}`,
          eliminar: `eliminar-${rol}-${sufijo}`,
        }[accion];
        const ref = doc(db, ruta(col, id));
        const operacion = {
          leer: () => getDoc(ref),
          crear: () => setDoc(ref, { creadoPor: rol }),
          editar: () => updateDoc(ref, { editadoPor: rol }),
          eliminar: () => deleteDoc(ref),
        }[accion];
        await precondicion(adminDb, accion, ruta(col, id));
        await afirmar(rol, nombre, esperado, operacion);
      }
    }

    if (rol === "manager") {
      // Clase 3. No es el control positivo de 'manager' (ese es el setup):
      // un token sin rol obtiene la misma lectura, ver el caso de abajo.
      claseActual = "legacy";
      await afirmar(rol, `manager leer legacySoloLectura (${COLECCION_LEGACY})`, true,
        () => getDoc(doc(db, ruta(COLECCION_LEGACY, `leer-${sufijo}`))));
    }
  }

  // Clase 2, segunda parte: con el rol ya probado en el token, al menos un
  // permitido del fixture por rol. 'manager' no tiene ninguno en el fixture ni
  // en permitido() fuera de legacySoloLectura: su evidencia es sólo el setup.
  console.log("\n=== Controles por rol: al menos un permitido del fixture ===");
  claseActual = "controles";
  for (const rol of ROLES.filter((r) => r !== "manager")) {
    const { permitidos, rechazos } = porRol[rol];
    reportar(`'${rol}' tiene al menos un permitido del fixture`, permitidos > 0,
      `${permitidos} permitidos, ${rechazos} rechazos`);
  }

  // Clase 3. DOCUMENTA el comportamiento actual, no lo aprueba: un token
  // autenticado sin `role` lee legacySoloLectura, porque esa rama de
  // permitido() no mira el rol (y `let r = rol()` con el claim ausente no
  // rompe la evaluación). El bucket se revisa en la migración (spec, 2.10):
  // cuando eso cambie, este caso tiene que fallar y forzar la decisión.
  console.log("\n=== legacySoloLectura: token autenticado SIN rol ===");
  const idTokenSinRol = await loguearComo(clientAuth, await crearUsuario(adminAuth, null));
  claseActual = "controles";
  afirmarRolEnToken(null, idTokenSinRol);
  claseActual = "legacy";
  try {
    await getDoc(doc(db, ruta(COLECCION_LEGACY, `leer-${sufijo}`)));
    reportar(`token sin rol leer legacySoloLectura (${COLECCION_LEGACY}) → permitido (documenta, no aprueba)`, true);
  } catch (err) {
    reportar(`token sin rol leer legacySoloLectura (${COLECCION_LEGACY}) → permitido (documenta, no aprueba)`, false,
      `code=${err.code} — cambió el comportamiento de legacySoloLectura: decidir (spec, 2.10)`);
  }

  console.log("\n=== Resumen por clase ===");
  let fallas = 0;
  for (const [clase, titulo] of Object.entries(CLASES)) {
    const { pass, fail } = conteo[clase];
    fallas += fail;
    console.log(`${titulo}: ${pass} PASS / ${fail} FAIL`);
  }
  console.log(`(celdas del fixture recorridas: ${celdas} de 180)\n`);
  process.exit(fallas > 0 || celdas !== 180 ? 1 : 0);
}

main().catch((err) => {
  console.error("Error inesperado en el script de verificación:", err);
  process.exit(1);
});
