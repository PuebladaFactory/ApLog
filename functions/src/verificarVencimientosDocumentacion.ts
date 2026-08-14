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

function calcularEstadoDocumentacion(fechaVto: string | null): EstadoDocumentacion {
  if (!fechaVto) {
    return 'sinVto';
  }
  const hoy = new Date();
  const vto = new Date(fechaVto);
  const MILIS_DIA = 1000 * 60 * 60 * 24;
  const diffDias = Math.floor((vto.getTime() - hoy.getTime()) / MILIS_DIA);

  if (diffDias < 0) {
    return 'vencido';
  } else if (diffDias <= 45) {
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
        const estadoRecalculado = calcularEstadoDocumentacion(d.fechaVto);
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
      `Verificación de vencimientos: ${legajosSnap.size} legajos revisados, ` +
      `${legajosActualizados} actualizados, ${vencimientosGenerados} vencimientos vigentes.`
    );
  }
);
