/**
 * Script de verificación manual contra el emulador de Firestore + Auth + Functions.
 * Confirma el logueo cliente de las 4 Cloud Functions de gestión de usuarios
 * (crearUsuario, editarUsuario, editarEmailUsuario, eliminarUsuario) vía
 * LogRegistroService.registrarMutacionSuelta() — ver CLAUDE.md → Complemento
 * gestión de usuarios.
 *
 * No bootstrapea Angular — llama las 4 Cloud Functions REALES contra el emulador
 * (mismo patrón que test-gestion-usuarios.mjs) y replica fielmente la lógica de
 * registrarMutacionSuelta()/construirEntrada() para la escritura del log, para
 * probar el comportamiento de datos+reglas real sin necesitar los componentes
 * Angular (que usan `inject()`, no son instanciables sueltos).
 *
 * Cómo correrlo (con el emulador ya levantado en otra terminal):
 *   cd functions && npm run build
 *   firebase emulators:start --only firestore,auth,functions
 *   cd functions
 *   node test-gestion-usuarios-log.mjs
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
import {
  getFirestore as getClientFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
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

async function crearUsuarioDirecto(adminAuth, adminDb, role, password = "Test1234!") {
  const email = `${role}-gestlog-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
  const userRecord = await adminAuth.createUser({ email, password });
  await adminDb.doc(`users/${userRecord.uid}`).set({
    uid: userRecord.uid, email, name: `Usuario ${role}`, role,
    displayName: "", photoURL: "", emailVerified: true,
  });
  return { uid: userRecord.uid, email, password };
}

/** Réplica fiel de LogRegistroService.construirEntrada + registrarMutacionSuelta. */
async function registrarMutacionSuelta(clientDb, rolActual, usuarioLogueado, accion, coleccion, idObjet, details, cambios) {
  if (rolActual === "dev") return;
  const entrada = {
    timestamp: Date.now(),
    userId: usuarioLogueado.uid,
    userEmail: usuarioLogueado.email,
    action: accion,
    coleccion,
    idObjet,
    details,
    status: "SUCCESS",
    ...(cambios && cambios.length > 0 ? { cambios } : {}),
  };
  const logId = doc(collection(clientDb, "Vantruck/datos/registroLog")).id;
  await setDoc(doc(clientDb, "Vantruck/datos/registroLog", logId), entrada);
}

async function contarRegistros(clientDb, idObjet, action) {
  const q = query(
    collection(clientDb, "Vantruck/datos/registroLog"),
    where("idObjet", "==", idObjet),
    where("action", "==", action),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data()).sort((a, b) => a.timestamp - b.timestamp);
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
  const functionsConRegion = getFunctions(clientApp, "southamerica-east1");
  connectFunctionsEmulator(functionsConRegion, "127.0.0.1", 5001);

  const callCrear = httpsCallable(functionsConRegion, "crearUsuario");
  const callEditar = httpsCallable(functionsConRegion, "editarUsuario");
  const callEditarEmail = httpsCallable(functionsConRegion, "editarEmailUsuario");
  const callEliminar = httpsCallable(functionsConRegion, "eliminarUsuario");

  // ---------- Setup: admin fundador, logueado ----------
  console.log("\n=== Setup: admin fundador ===");
  const adminCred = await crearUsuarioDirecto(adminAuth, adminDb, "admin");
  await esperarClaim(adminAuth, adminCred.uid, "admin");
  await signInWithEmailAndPassword(clientAuth, adminCred.email, adminCred.password);
  await getIdTokenResult(clientAuth.currentUser, true);
  const usuarioLogueado = { uid: adminCred.uid, email: adminCred.email };

  // ---------- 1) crearUsuario → ALTA ----------
  console.log("\n=== [1] crearUsuario → ALTA ===");
  const emailNuevo = `nuevo-gestlog-${Date.now()}@example.com`;
  const resCrear = await callCrear({ email: emailNuevo, name: "Nuevo Usuario", role: "user" });
  const uidNuevo = resCrear.data.uid;
  await registrarMutacionSuelta(
    clientDb, "admin", usuarioLogueado, "ALTA", "users", uidNuevo,
    `Usuario ${emailNuevo} creado (rol: user).`,
  );
  {
    const regs = await contarRegistros(clientDb, uidNuevo, "ALTA");
    reportar("crearUsuario generó 1 registro ALTA en registroLog", regs.length === 1, `count=${regs.length}`);
    reportar("Sin 'cambios' en el ALTA (alta nueva)", !regs[0]?.cambios);
  }

  // ---------- 2) editarUsuario (name + role) → EDITAR con cambios reales ----------
  console.log("\n=== [2] editarUsuario (name + role) → EDITAR con cambios ===");
  const nombreViejo = "Nuevo Usuario";
  const rolViejo = "user";
  const nombreNuevo = "Usuario Editado";
  const rolNuevo = "manager";
  await callEditar({ uid: uidNuevo, name: nombreNuevo, role: rolNuevo });
  const cambios = [];
  if (nombreViejo !== nombreNuevo) cambios.push({ campo: "name", anterior: nombreViejo, nuevo: nombreNuevo });
  if (rolViejo !== rolNuevo) cambios.push({ campo: "role", anterior: rolViejo, nuevo: rolNuevo });
  await registrarMutacionSuelta(
    clientDb, "admin", usuarioLogueado, "EDITAR", "users", uidNuevo,
    `Usuario ${emailNuevo} editado.`, cambios,
  );
  {
    const regs = await contarRegistros(clientDb, uidNuevo, "EDITAR");
    reportar("editarUsuario generó 1 registro EDITAR en registroLog", regs.length === 1, `count=${regs.length}`);
    const c = regs[0]?.cambios ?? [];
    reportar("El diff tiene 2 cambios reales (name + role)", c.length === 2, `cambios=${JSON.stringify(c)}`);
  }

  // ---------- 3) editarUsuario sin cambio de rol → cambios sin 'role' ----------
  console.log("\n=== [3] editarUsuario solo name (rol sin tocar) → diff sin 'role' ===");
  await callEditar({ uid: uidNuevo, name: "Usuario Re-editado" });
  const cambios2 = [];
  if (nombreNuevo !== "Usuario Re-editado") cambios2.push({ campo: "name", anterior: nombreNuevo, nuevo: "Usuario Re-editado" });
  // rolDeshabilitado=true equivalente (no se tocó el rol): no se agrega 'role'
  await registrarMutacionSuelta(
    clientDb, "admin", usuarioLogueado, "EDITAR", "users", uidNuevo,
    `Usuario ${emailNuevo} editado.`, cambios2,
  );
  {
    const regs = await contarRegistros(clientDb, uidNuevo, "EDITAR");
    const ultimo = regs[regs.length - 1];
    const c = ultimo?.cambios ?? [];
    reportar("El diff sin cambio de rol NO incluye 'role'", c.every((x) => x.campo !== "role"), `cambios=${JSON.stringify(c)}`);
    reportar("El diff sí incluye 'name'", c.some((x) => x.campo === "name"));
  }

  // ---------- 4) editarEmailUsuario → EDITAR con diff de email ----------
  console.log("\n=== [4] editarEmailUsuario → EDITAR con diff de email ===");
  const emailViejo = emailNuevo;
  const emailNuevo2 = `cambiado-gestlog-${Date.now()}@example.com`;
  await callEditarEmail({ uid: uidNuevo, nuevoEmail: emailNuevo2 });
  await registrarMutacionSuelta(
    clientDb, "admin", usuarioLogueado, "EDITAR", "users", uidNuevo,
    `Email actualizado de ${emailViejo} a ${emailNuevo2}.`,
    [{ campo: "email", anterior: emailViejo, nuevo: emailNuevo2 }],
  );
  {
    const regs = await contarRegistros(clientDb, uidNuevo, "EDITAR");
    const ultimo = regs[regs.length - 1];
    const c = ultimo?.cambios ?? [];
    reportar("El cambio de email quedó logueado con diff real", c.some((x) => x.campo === "email" && x.nuevo === emailNuevo2), `cambios=${JSON.stringify(c)}`);
  }

  // ---------- 5) eliminarUsuario → BAJA ----------
  console.log("\n=== [5] eliminarUsuario → BAJA ===");
  await callEliminar({ uid: uidNuevo });
  await registrarMutacionSuelta(
    clientDb, "admin", usuarioLogueado, "BAJA", "users", uidNuevo,
    `Usuario ${emailNuevo2} eliminado.`,
  );
  {
    const regs = await contarRegistros(clientDb, uidNuevo, "BAJA");
    reportar("eliminarUsuario generó 1 registro BAJA en registroLog", regs.length === 1, `count=${regs.length}`);
  }

  // ---------- 6) Repetir logueado como 'dev' — CERO registros ----------
  console.log("\n=== [6] Mismas 4 acciones logueado como 'dev' → CERO registros ===");
  const devCred = await crearUsuarioDirecto(adminAuth, adminDb, "dev");
  await esperarClaim(adminAuth, devCred.uid, "dev");
  await signInWithEmailAndPassword(clientAuth, devCred.email, devCred.password);
  await getIdTokenResult(clientAuth.currentUser, true);
  const usuarioLogueadoDev = { uid: devCred.uid, email: devCred.email };

  const idObjetDevTest = `dev-test-${Date.now()}`;
  await registrarMutacionSuelta(clientDb, "dev", usuarioLogueadoDev, "ALTA", "users", idObjetDevTest, "x");
  await registrarMutacionSuelta(clientDb, "dev", usuarioLogueadoDev, "EDITAR", "users", idObjetDevTest, "x", [{ campo: "name", anterior: "a", nuevo: "b" }]);
  await registrarMutacionSuelta(clientDb, "dev", usuarioLogueadoDev, "BAJA", "users", idObjetDevTest, "x");
  {
    const [regsAlta, regsEditar, regsBaja] = await Promise.all([
      contarRegistros(clientDb, idObjetDevTest, "ALTA"),
      contarRegistros(clientDb, idObjetDevTest, "EDITAR"),
      contarRegistros(clientDb, idObjetDevTest, "BAJA"),
    ]);
    reportar("'dev': ALTA no genera registro", regsAlta.length === 0, `count=${regsAlta.length}`);
    reportar("'dev': EDITAR no genera registro", regsEditar.length === 0, `count=${regsEditar.length}`);
    reportar("'dev': BAJA no genera registro", regsBaja.length === 0, `count=${regsBaja.length}`);
  }

  console.log(`\n=== Resultado: ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Error inesperado en el script de verificación:", err);
  process.exit(1);
});
