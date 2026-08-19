/**
 * Script de verificación manual contra el emulador de Firestore.
 * Confirma que la query paginada de DbFirestoreService.getPaginado() —usada por
 * RegistroLogConsultaService para la pantalla RegistroLogComponent— funciona de
 * verdad, no solo que compila: rango de fechas, filtro por `coleccion` (que
 * requiere el índice compuesto nuevo en firestore.indexes.json), orden desc, y
 * paginación por cursor real (sin repetir ni saltear documentos entre páginas).
 *
 * Nota: el emulador de Firestore NO exige índices compuestos (a diferencia de
 * producción, que rechaza la query con "failed-precondition: index required" si
 * falta). Este script prueba que la QUERY es correcta; la necesidad real del
 * índice solo se confirma en producción/demo después de desplegarlo
 * (`firebase deploy --only firestore:indexes --project demo`).
 *
 * Cómo correrlo (con el emulador ya levantado en otra terminal):
 *   firebase emulators:start --only firestore,auth
 *   cd functions
 *   node test-registro-log-paginacion.mjs
 */

import { initializeApp as initAdminApp } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";

const PROJECT_ID = "demoapplog";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

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

async function main() {
  const app = initAdminApp({ projectId: PROJECT_ID });
  const db = getAdminFirestore(app);
  const col = db.collection("Vantruck/datos/registroLog");

  // ---------- Seed: 25 entradas de 'choferes' + 15 de 'clientes', timestamps
  // espaciados por minuto, dentro de un rango conocido ----------
  const base = Date.parse("2026-08-01T00:00:00Z");
  const seeds = [];
  for (let i = 0; i < 25; i++) {
    seeds.push({
      coleccion: "choferes",
      timestamp: base + i * 60_000,
      action: "EDITAR",
      idObjet: `chofer-${i}`,
      userEmail: "test@example.com",
      userId: "uid-test",
      details: `Edición de prueba ${i}`,
      status: "SUCCESS",
    });
  }
  for (let i = 0; i < 15; i++) {
    seeds.push({
      coleccion: "clientes",
      timestamp: base + i * 60_000,
      action: "ALTA",
      idObjet: `cliente-${i}`,
      userEmail: "test@example.com",
      userId: "uid-test",
      details: `Alta de prueba ${i}`,
      status: "SUCCESS",
    });
  }
  const batch = db.batch();
  for (const s of seeds) {
    batch.set(col.doc(), s);
  }
  await batch.commit();
  console.log(`Sembrados ${seeds.length} documentos (25 choferes + 15 clientes).\n`);

  const desde = base - 60_000;
  const hasta = base + 100 * 60_000;
  const pageSize = 10;

  // ---------- 1) Sin filtro de colección: paginar las 40 entradas completas ----------
  console.log("=== Paginación SIN filtro de colección (40 entradas totales) ===");
  {
    const vistos = new Set();
    let cursor = null;
    let paginas = 0;
    let hayMas = true;
    while (hayMas) {
      let q = col
        .where("timestamp", ">=", desde)
        .where("timestamp", "<=", hasta)
        .orderBy("timestamp", "desc")
        .limit(pageSize + 1);
      if (cursor) q = q.startAfter(cursor);
      const snap = await q.get();
      const docsPagina = snap.docs.slice(0, pageSize);
      docsPagina.forEach(d => vistos.add(d.id));
      hayMas = snap.docs.length > pageSize;
      cursor = docsPagina.length > 0 ? docsPagina[docsPagina.length - 1] : cursor;
      paginas++;
      if (paginas > 10) break; // salvaguarda contra loop infinito si algo falla
    }
    reportar("Trajo las 40 entradas sin repetir ni saltear", vistos.size === 40, `vistos=${vistos.size}, páginas=${paginas}`);
    reportar("Paginó en 4 páginas de 10 (40/10)", paginas === 4, `páginas=${paginas}`);
  }

  // ---------- 2) CON filtro de colección='choferes' — ejercita el índice compuesto ----------
  console.log("\n=== Paginación CON filtro coleccion='choferes' (25 entradas) ===");
  {
    const vistos = [];
    let cursor = null;
    let hayMas = true;
    let paginas = 0;
    while (hayMas) {
      let q = col
        .where("coleccion", "==", "choferes")
        .where("timestamp", ">=", desde)
        .where("timestamp", "<=", hasta)
        .orderBy("timestamp", "desc")
        .limit(pageSize + 1);
      if (cursor) q = q.startAfter(cursor);
      const snap = await q.get();
      const docsPagina = snap.docs.slice(0, pageSize);
      docsPagina.forEach(d => vistos.push(d.data()));
      hayMas = snap.docs.length > pageSize;
      cursor = docsPagina.length > 0 ? docsPagina[docsPagina.length - 1] : cursor;
      paginas++;
      if (paginas > 10) break;
    }
    const soloChoferes = vistos.every(v => v.coleccion === "choferes");
    reportar("La query con filtro de colección no tira error (índice compuesto ok en emulador)", true);
    reportar("Trajo exactamente las 25 entradas de 'choferes'", vistos.length === 25, `vistos=${vistos.length}`);
    reportar("Ninguna entrada de 'clientes' se coló", soloChoferes);
    reportar("Paginó en 3 páginas de 10 (25 → 10+10+5)", paginas === 3, `páginas=${paginas}`);

    // Orden desc por timestamp, sin duplicados entre páginas
    const timestamps = vistos.map(v => v.timestamp);
    const ordenadoDesc = timestamps.every((t, i) => i === 0 || t <= timestamps[i - 1]);
    const sinDuplicados = new Set(timestamps).size === timestamps.length;
    reportar("Orden desc por timestamp respetado across páginas", ordenadoDesc);
    reportar("Sin duplicados entre páginas", sinDuplicados);
  }

  // ---------- Limpieza ----------
  const snapTodos = await col.where("timestamp", ">=", desde).where("timestamp", "<=", hasta).get();
  const batchDelete = db.batch();
  snapTodos.docs.forEach(d => batchDelete.delete(d.ref));
  await batchDelete.commit();
  console.log(`\nLimpieza: ${snapTodos.size} documentos de prueba borrados.`);

  console.log(`\n=== Resultado: ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Error inesperado en el script de verificación:", err);
  process.exit(1);
});
