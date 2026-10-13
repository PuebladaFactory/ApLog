import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

/**
 * DUPLICADO deliberado de `calcularEstadoDocumentacion()` en
 * src/app/interfaces/legajo.ts. Cloud Functions es un proyecto TypeScript
 * separado (build/deploy propio vía functions/tsconfig.json, no puede
 * importar de src/app/) — se copia manualmente en vez de armar un mecanismo
 * de código compartido entre los dos tsconfig. Mantener AMBAS copias
 * sincronizadas ante cualquier cambio en este cálculo (ver comentario
 * espejo en el archivo original).
 */
type EstadoDocumentacion = 'enFecha' | 'porVencer' | 'vencido' | 'sinVto';

// Frente lazy-fechas (FE2): copia mínima de src/app/shared/utils/fecha.util.ts
// (hoyNegocio, esFechaNegocio, diasEntre). Mismo criterio: "hoy" en el huso
// de Argentina vía Intl, y fechas de negocio operadas sobre sus partes en UTC.
const ZONA_NEGOCIO = 'America/Argentina/Buenos_Aires';
const RE_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_DIA = 86400000;

function hoyNegocio(ahora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_NEGOCIO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(ahora);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '';
  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

/** Milisegundos UTC de una fecha 'YYYY-MM-DD' válida; null si no lo es. */
function msFecha(fecha: string): number | null {
  const m = RE_FECHA.exec(fecha);
  if (!m) {
    return null;
  }
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > new Date(Date.UTC(anio, mes, 0)).getUTCDate()) {
    return null;
  }
  return Date.UTC(anio, mes - 1, dia);
}

/** Regla D1: vigente todo el día D, vencido desde D+1; "por vencer" de 0 a
 *  45 días hasta D. Fecha inválida → 'sinVto' (igual que en el cliente). */
function calcularEstadoDocumentacion(fechaVto: string | null, hoy: string): EstadoDocumentacion {
  if (!fechaVto) {
    return 'sinVto';
  }
  const msVto = msFecha(fechaVto);
  const msHoy = msFecha(hoy);
  if (msVto === null || msHoy === null) {
    return 'sinVto';
  }
  const dias = Math.round((msVto - msHoy) / MS_DIA);

  if (dias < 0) {
    return 'vencido';
  } else if (dias <= 45) {
    return 'porVencer';
  } else {
    return 'enFecha';
  }
}

interface Documentacion {
  idCategoria: string;
  titulo: string;
  fechaVto: string | null;
  estado: EstadoDocumentacion;
  imagenes: { nombre: string; url: string }[];
}

interface Legajo {
  idChofer: string;
  documentacion: Documentacion[];
  visible: boolean;
}

/**
 * Cloud Scheduler diario: recalcula el estado de cada Documentacion de cada
 * Legajo (hoy solo se calcula una vez, al cargar/reemplazar un documento —
 * ver LegajoFactoryService.crearDocumentacion — y nunca se recalcula en el
 * cliente al leer) y reescribe los legajos cuyo estado cambió. Genera además
 * la colección `vencimientos` — reconstrucción TOTAL en cada corrida (borra
 * todo y recrea), no diff incremental: a esta escala es más simple y evita
 * alertas huérfanas de documentos que pasaron a 'enFecha' o se eliminaron.
 *
 * Nota de escala: si `legajos` + `vencimientos` combinados superan ~400-500
 * escrituras en una corrida, particionar en batches de 500 (mismo patrón
 * que `commitBatch` en DbFirestoreService). Hoy (59 legajos en demo) no aplica.
 */
export const verificarVencimientosDocumentacion = onSchedule(
  {
    schedule: '0 3 * * *',
    timeZone: 'America/Argentina/Buenos_Aires',
  },
  async () => {
    const db = getFirestore();
    const hoy = hoyNegocio();
    let fechasInvalidas = 0;
    const legajosRef = db.collection('Vantruck/datos/legajos');
    const vencimientosRef = db.collection('Vantruck/datos/vencimientos');

    const [legajosSnap, vencimientosViejosSnap] = await Promise.all([
      legajosRef.get(),
      vencimientosRef.get(),
    ]);

    const batchVencimientos = db.batch();
    vencimientosViejosSnap.docs.forEach((doc) => batchVencimientos.delete(doc.ref));

    const batchLegajos = db.batch();
    let legajosActualizados = 0;
    let vencimientosGenerados = 0;

    legajosSnap.docs.forEach((doc) => {
      const legajo = doc.data() as Legajo;
      let cambio = false;

      const documentacionActualizada = legajo.documentacion.map((d) => {
        if (d.fechaVto && msFecha(d.fechaVto) === null) {
          fechasInvalidas++;
          logger.warn(
            `Legajo ${doc.id}: fechaVto inválida '${d.fechaVto}' (${d.titulo}); se toma como sin vencimiento.`,
          );
        }
        const estadoRecalculado = calcularEstadoDocumentacion(d.fechaVto, hoy);
        if (estadoRecalculado !== d.estado) {
          cambio = true;
        }
        if (estadoRecalculado === 'vencido' || estadoRecalculado === 'porVencer') {
          batchVencimientos.set(vencimientosRef.doc(), {
            idLegajo: doc.id,
            idChofer: legajo.idChofer,
            idCategoria: d.idCategoria,
            titulo: d.titulo,
            fechaVto: d.fechaVto,
            estado: estadoRecalculado,
          });
          vencimientosGenerados++;
        }
        return { ...d, estado: estadoRecalculado };
      });

      if (cambio) {
        batchLegajos.update(doc.ref, { documentacion: documentacionActualizada });
        legajosActualizados++;
      }
    });

    await batchVencimientos.commit();
    if (legajosActualizados > 0) {
      await batchLegajos.commit();
    }

    logger.info(
      `Verificación de vencimientos (hoy ${hoy}): ${legajosSnap.size} legajos revisados, ` +
      `${legajosActualizados} actualizados, ${vencimientosGenerados} vencimientos vigentes` +
      (fechasInvalidas > 0 ? `, ${fechasInvalidas} fechas inválidas.` : '.'),
    );
  }
);
