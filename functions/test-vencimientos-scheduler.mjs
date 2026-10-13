/**
 * Script de verificación manual contra el emulador de Firestore + Functions.
 * Confirma el comportamiento de la Cloud Function programada
 * `verificarVencimientosDocumentacion`: recalcula `Documentacion.estado` en
 * `legajos` (solo reescribe legajos cuyo estado cambió) y reconstruye
 * `vencimientos` por completo en cada corrida.
 *
 * Cómo correrlo (con el emulador ya levantado en otra terminal):
 *   firebase emulators:start --only firestore,auth,functions
 *   cd functions
 *   node test-vencimientos-scheduler.mjs
 *
 * Siembra datos de prueba vía Admin SDK (bypassea las rules), dispara la
 * función manualmente contra el endpoint HTTP que expone el emulador de
 * Functions para funciones programadas (`POST /{project}/{region}/{nombre}-0`
 * — el sufijo `-0` lo asigna el emulador a las scheduled functions), y
 * corre dos veces seguidas para confirmar que la segunda corrida sin
 * cambios reales no vuelve a escribir `legajos` pero sí reconstruye
 * `vencimientos` igual.
 */

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const PROJECT_ID = "demoapplog";
const REGION = "southamerica-east1";
const FUNCTIONS_HOST = "http://127.0.0.1:5001";

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.GCLOUD_PROJECT = PROJECT_ID;

initializeApp({ projectId: PROJECT_ID });
const db = getFirestore();

let pass = 0;
let fail = 0;
function reportar(nombre, ok, detalle) {
  if (ok) {
    pass++;
    console.log(`PASS - ${nombre}${detalle ? " - " + detalle : ""}`);
  } else {
    fail++;
    console.log(`FAIL - ${nombre}${detalle ? " - " + detalle : ""}`);
  }
}

// FE2 (lazy-fechas): "hoy" en Argentina (como la función), sumando días sobre
// las partes en UTC. Antes usaba toISOString: después de las 21:00 daba mañana.
function iso(diasDesdeHoy) {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const v = (t) => Number(p.find((x) => x.type === t).value);
  const d = new Date(Date.UTC(v("year"), v("month") - 1, v("day")) + diasDesdeHoy * 86400000);
  return d.toISOString().slice(0, 10);
}

async function limpiarDatosDePrueba() {
  const legajo1 = db.doc("Vantruck/datos/legajos/TEST-legajo-1");
  const legajo2 = db.doc("Vantruck/datos/legajos/TEST-legajo-2");
  await db.batch().delete(legajo1).delete(legajo2).commit();

  const vencimientosViejos = await db.collection("Vantruck/datos/vencimientos").get();
  const batch = db.batch();
  vencimientosViejos.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

async function sembrarDatosDePrueba() {
  await db.doc("Vantruck/datos/legajos/TEST-legajo-1").set({
    idChofer: "TEST-chofer-1",
    visible: true,
    documentacion: [
      // estado guardado desactualizado a propósito: debe recalcularse a 'vencido'
      { idCategoria: "cat1", titulo: "Licencia", fechaVto: iso(-5), estado: "enFecha", imagenes: [] },
      { idCategoria: "cat2", titulo: "VTV", fechaVto: iso(10), estado: "porVencer", imagenes: [] },
      { idCategoria: "cat3", titulo: "Seguro", fechaVto: iso(90), estado: "enFecha", imagenes: [] },
      { idCategoria: "cat4", titulo: "Otro", fechaVto: null, estado: "sinVto", imagenes: [] },
      // FE2 (regla D1): vence HOY → vigente todo el día ("porVencer"), no "vencido".
      { idCategoria: "cat5", titulo: "VenceHoy", fechaVto: iso(0), estado: "vencido", imagenes: [] },
      // Bordes del umbral de 45 días.
      { idCategoria: "cat6", titulo: "En45", fechaVto: iso(45), estado: "enFecha", imagenes: [] },
      { idCategoria: "cat7", titulo: "En46", fechaVto: iso(46), estado: "porVencer", imagenes: [] },
    ],
  });

  // Legajo sin ningún vencimiento próximo — control: no debe tocarse.
  await db.doc("Vantruck/datos/legajos/TEST-legajo-2").set({
    idChofer: "TEST-chofer-2",
    visible: true,
    documentacion: [
      { idCategoria: "cat1", titulo: "Licencia", fechaVto: iso(200), estado: "enFecha", imagenes: [] },
    ],
  });
}

async function dispararFuncion() {
  const res = await fetch(`${FUNCTIONS_HOST}/${PROJECT_ID}/${REGION}/verificarVencimientosDocumentacion-0`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`Trigger manual falló: HTTP ${res.status}`);
  }
}

async function main() {
  await limpiarDatosDePrueba();
  await sembrarDatosDePrueba();

  console.log("\n=== Primera corrida ===");
  await dispararFuncion();

  const legajo1a = (await db.doc("Vantruck/datos/legajos/TEST-legajo-1").get()).data();
  const legajo2a = (await db.doc("Vantruck/datos/legajos/TEST-legajo-2").get()).data();
  const vencimientosA = await db.collection("Vantruck/datos/vencimientos")
    .where("idLegajo", "==", "TEST-legajo-1").get();

  const estadoCat1 = legajo1a.documentacion.find((d) => d.idCategoria === "cat1").estado;
  reportar("cat1 recalculado de 'enFecha' (desactualizado) a 'vencido'", estadoCat1 === "vencido", `estado=${estadoCat1}`);

  const estadoCat3 = legajo1a.documentacion.find((d) => d.idCategoria === "cat3").estado;
  reportar("cat3 sigue 'enFecha' (ya estaba correcto)", estadoCat3 === "enFecha", `estado=${estadoCat3}`);

  const estadoCat4 = legajo1a.documentacion.find((d) => d.idCategoria === "cat4").estado;
  reportar("cat4 sigue 'sinVto'", estadoCat4 === "sinVto", `estado=${estadoCat4}`);

  const estadoCat5 = legajo1a.documentacion.find((d) => d.idCategoria === "cat5").estado;
  reportar("cat5 (vence hoy) queda 'porVencer', no 'vencido' (D1)", estadoCat5 === "porVencer", `estado=${estadoCat5}`);

  const estadoCat6 = legajo1a.documentacion.find((d) => d.idCategoria === "cat6").estado;
  reportar("cat6 (faltan 45 días) queda 'porVencer'", estadoCat6 === "porVencer", `estado=${estadoCat6}`);

  const estadoCat7 = legajo1a.documentacion.find((d) => d.idCategoria === "cat7").estado;
  reportar("cat7 (faltan 46 días) queda 'enFecha'", estadoCat7 === "enFecha", `estado=${estadoCat7}`);

  reportar("legajo-2 (todo en fecha) no se modifica", legajo2a.documentacion[0].estado === "enFecha");

  reportar(
    "vencimientos generados: exactamente cat1 (vencido) + cat2, cat5 y cat6 (porVencer)",
    vencimientosA.size === 4 &&
    vencimientosA.docs.some((d) => d.data().idCategoria === "cat5" && d.data().estado === "porVencer") &&
    vencimientosA.docs.some((d) => d.data().idCategoria === "cat6" && d.data().estado === "porVencer") &&
    vencimientosA.docs.some((d) => d.data().idCategoria === "cat1" && d.data().estado === "vencido") &&
    vencimientosA.docs.some((d) => d.data().idCategoria === "cat2" && d.data().estado === "porVencer"),
    `size=${vencimientosA.size}`
  );

  console.log("\n=== Segunda corrida (sin cambios reales en los datos) ===");
  const idsVencimientosA = vencimientosA.docs.map((d) => d.id).sort();
  await dispararFuncion();

  const vencimientosB = await db.collection("Vantruck/datos/vencimientos")
    .where("idLegajo", "==", "TEST-legajo-1").get();
  const idsVencimientosB = vencimientosB.docs.map((d) => d.id).sort();

  reportar(
    "vencimientos se reconstruye igual (mismo contenido)",
    vencimientosB.size === 4 &&
    vencimientosB.docs.some((d) => d.data().idCategoria === "cat1" && d.data().estado === "vencido") &&
    vencimientosB.docs.some((d) => d.data().idCategoria === "cat2" && d.data().estado === "porVencer"),
    `size=${vencimientosB.size}`
  );
  reportar(
    "vencimientos se RECONSTRUYE (ids nuevos), no hace diff incremental",
    JSON.stringify(idsVencimientosA) !== JSON.stringify(idsVencimientosB)
  );

  const legajo1b = (await db.doc("Vantruck/datos/legajos/TEST-legajo-1").get()).data();
  reportar(
    "legajos no se reescribe en la segunda corrida (ya estaba correcto)",
    JSON.stringify(legajo1a.documentacion) === JSON.stringify(legajo1b.documentacion)
  );

  await limpiarDatosDePrueba();

  console.log(`\n=== Resultado: ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Error inesperado en el script de verificación:", err);
  process.exit(1);
});
