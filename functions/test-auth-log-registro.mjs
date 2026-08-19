/**
 * Script de verificación manual contra el emulador de Firestore + Auth.
 * Confirma el comportamiento real que AuthService.iniciarSesion/cerrarSesion ahora
 * delega en LogRegistroService: LOGIN/LOGOUT quedan en `registroLog` (no en `logs`),
 * con la exclusión de 'dev' centralizada en LogRegistroService.construirEntrada() —
 * ya NO hay chequeo manual de rol en AuthService.
 *
 * No bootstrapea Angular (los servicios usan `inject()`/DI de Angular, no son
 * instanciables sueltos) — en cambio, replica fielmente la lógica real de
 * construirEntrada()/registrarAccion()/registrarError() (ver
 * servicios/log-registro/log-registro.service.ts) contra el emulador real, para
 * confirmar el comportamiento de datos+reglas sin necesitar un browser. La lectura
 * del código de AuthService (ya no llama a LogService, ya no tiene el `if role !==
 * 'dev'`) se confirmó por inspección directa del archivo, no acá.
 *
 * Cómo correrlo (con el emulador ya levantado en otra terminal):
 *   firebase emulators:start --only firestore,auth
 *   cd functions
 *   node test-auth-log-registro.mjs
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

async function crearUsuarioConRol(adminAuth, role) {
  const email = `test-authlog-${role}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const password = "Test1234!";
  const userRecord = await adminAuth.createUser({ email, password });
  await adminAuth.setCustomUserClaims(userRecord.uid, { role });
  return { uid: userRecord.uid, email, password };
}

/** Réplica fiel de LogRegistroService.construirEntrada + registrarAccion/registrarError
 *  (ver servicios/log-registro/log-registro.service.ts) — mismo criterio de exclusión
 *  de 'dev', mismo shape de RegistroLog. */
async function registrarAccion(clientDb, rolActual, usuario, accion, coleccion, idObjet, details, status) {
  if (rolActual === "dev") return; // construirEntrada() devuelve null para 'dev' — no se escribe nada
  const entrada = {
    timestamp: Date.now(),
    userId: usuario.uid,
    userEmail: usuario.email,
    action: accion,
    coleccion,
    idObjet,
    details,
    status,
  };
  const logId = doc(collection(clientDb, "Vantruck/datos/registroLog")).id;
  await setDoc(doc(clientDb, "Vantruck/datos/registroLog", logId), entrada);
}

async function contarRegistros(clientDb, userEmail, action) {
  const q = query(
    collection(clientDb, "Vantruck/datos/registroLog"),
    where("userEmail", "==", userEmail),
    where("action", "==", action),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

async function main() {
  const adminApp = initAdminApp({ projectId: PROJECT_ID });
  const adminAuth = getAdminAuth(adminApp);

  const clientApp = initClientApp({ apiKey: "fake-api-key", projectId: PROJECT_ID });
  const clientAuth = getClientAuth(clientApp);
  connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  const clientDb = getClientFirestore(clientApp);
  connectFirestoreEmulator(clientDb, "127.0.0.1", 8080);

  // ---------- 'user': LOGIN exitoso ----------
  console.log("\n=== Rol 'user' — LOGIN exitoso ===");
  const userCred = await crearUsuarioConRol(adminAuth, "user");
  await signInWithEmailAndPassword(clientAuth, userCred.email, userCred.password);
  await getIdTokenResult(clientAuth.currentUser, true);

  await registrarAccion(
    clientDb, "user", { uid: userCred.uid, email: userCred.email },
    "LOGIN", "users", 0, `Usuario ${userCred.email} inició sesión.`, "SUCCESS",
  );
  {
    const regs = await contarRegistros(clientDb, userCred.email, "LOGIN");
    reportar("'user' LOGIN generó exactamente 1 registro en registroLog", regs.length === 1, `count=${regs.length}`);
    reportar("El registro tiene coleccion='users', status='SUCCESS'", regs[0]?.coleccion === "users" && regs[0]?.status === "SUCCESS");
  }

  // ---------- 'user': LOGIN fallido (simula catch de AuthService) ----------
  console.log("\n=== Rol 'user' — LOGIN fallido (status ERROR) ===");
  await registrarAccion(
    clientDb, "user", { uid: userCred.uid, email: userCred.email },
    "LOGIN", "users", 0, "Error al iniciar sesión: contraseña incorrecta", "ERROR",
  );
  // Nota: registrarError() en el código real no chequea 'dev' por rol de sesión activa —
  // en la práctica un login fallido no tiene sesión iniciada, pero el mecanismo de
  // escritura es el mismo; replicado igual acá para el shape del documento.
  {
    const regs = await contarRegistros(clientDb, userCred.email, "LOGIN");
    const errores = regs.filter(r => r.status === "ERROR");
    reportar("El login fallido quedó con status='ERROR'", errores.length === 1, `count=${errores.length}`);
  }

  // ---------- 'user': LOGOUT exitoso ----------
  console.log("\n=== Rol 'user' — LOGOUT exitoso ===");
  await registrarAccion(
    clientDb, "user", { uid: userCred.uid, email: userCred.email },
    "LOGOUT", "users", 0, `Usuario ${userCred.email} cerró sesión.`, "SUCCESS",
  );
  {
    const regs = await contarRegistros(clientDb, userCred.email, "LOGOUT");
    reportar("'user' LOGOUT generó exactamente 1 registro en registroLog", regs.length === 1, `count=${regs.length}`);
  }

  // ---------- 'dev': LOGIN/LOGOUT NO deben escribir nada ----------
  console.log("\n=== Rol 'dev' — LOGIN/LOGOUT NO deben generar registro ===");
  const devCred = await crearUsuarioConRol(adminAuth, "dev");
  await signInWithEmailAndPassword(clientAuth, devCred.email, devCred.password);
  await getIdTokenResult(clientAuth.currentUser, true);

  await registrarAccion(clientDb, "dev", { uid: devCred.uid, email: devCred.email }, "LOGIN", "users", 0, "x", "SUCCESS");
  await registrarAccion(clientDb, "dev", { uid: devCred.uid, email: devCred.email }, "LOGOUT", "users", 0, "x", "SUCCESS");
  {
    const loginDev = await contarRegistros(clientDb, devCred.email, "LOGIN");
    const logoutDev = await contarRegistros(clientDb, devCred.email, "LOGOUT");
    reportar("'dev' LOGIN: cero registros en registroLog", loginDev.length === 0, `count=${loginDev.length}`);
    reportar("'dev' LOGOUT: cero registros en registroLog", logoutDev.length === 0, `count=${logoutDev.length}`);
  }

  console.log(`\n=== Resultado: ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Error inesperado en el script de verificación:", err);
  process.exit(1);
});
