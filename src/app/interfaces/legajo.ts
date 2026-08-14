export type EstadoDocumentacion = 'enFecha' | 'porVencer' | 'vencido' | 'sinVto';

export interface CategoriaDocumentacion {
  idCategoria: string;
  nombre: string;
  activa: boolean;
  orden: number;
}

export interface Documentacion {
  idCategoria: string;
  titulo: string;              // snapshot del nombre de la categoría, congelado al momento de carga
  fechaVto: string | null;     // ISO 8601 (yyyy-MM-dd), null si estado === 'sinVto'
  estado: EstadoDocumentacion; // persistido; se recalcula solo al crear/reemplazar el documento
  imagenes: { nombre: string; url: string }[];
}

export interface Legajo {
  idLegajo: string;
  idChofer: string;
  documentacion: Documentacion[];
  visible: boolean; // filtro de exhibición (tablero), sin relación con baja del chofer/proveedor
}

export interface DocumentacionHistorial {
  idLegajo: string;
  idCategoria: string;
  documento: Documentacion;   // versión completa reemplazada
  fechaReemplazo: string;     // ISO 8601, momento del reemplazo
}

/**
 * Calcula el estado de una documentación en base a su fecha de vencimiento.
 * Única fuente de verdad para este cálculo — consumida por LegajoFactoryService
 * al crear/reemplazar un documento. Candidata a reutilizarse literal en la futura
 * Cloud Function de verificación periódica de vencimientos (frente aparte, no iniciado).
 *
 * @param fechaVto ISO yyyy-MM-dd, o null si el documento no tiene vencimiento
 * @returns 'sinVto' si fechaVto es null; si no, 'vencido' | 'porVencer' (<=30 días) | 'enFecha'
 */
export function calcularEstadoDocumentacion(fechaVto: string | null): EstadoDocumentacion {
  if (!fechaVto) {
    return 'sinVto';
  }
  const hoy = new Date();
  const vto = new Date(fechaVto);
  const MILIS_DIA = 1000 * 60 * 60 * 24;
  const diffDias = Math.floor((vto.getTime() - hoy.getTime()) / MILIS_DIA);

  if (diffDias < 0) {
    return 'vencido';
  } else if (diffDias <= 30) {
    return 'porVencer';
  } else {
    return 'enFecha';
  }
}

/**
 * Deriva el estado general de un legajo a partir de sus documentos, para exhibición
 * (nunca se persiste — reemplaza al viejo campo estadoGral). Prioridad: vencido >
 * porVencer > enFecha > vacio (sin documentos cargados).
 */
export function estadoGeneralDeLegajo(legajo: { documentacion: Documentacion[] }): EstadoDocumentacion | 'vacio' {
  if (legajo.documentacion.length === 0) {
    return 'vacio';
  }
  const docsConVto = legajo.documentacion.filter(d => d.estado !== 'sinVto');
  if (docsConVto.some(d => d.estado === 'vencido')) return 'vencido';
  if (docsConVto.some(d => d.estado === 'porVencer')) return 'porVencer';
  if (docsConVto.length > 0 && docsConVto.every(d => d.estado === 'enFecha')) return 'enFecha';
  return 'sinVto';
  // Nota: si TODOS los documentos son 'sinVto' (ninguno tiene vencimiento configurado),
  // el legajo general también resulta 'sinVto' — caso válido, no es 'vacio' (sí hay
  // documentación cargada, solo que ninguna tiene fecha de control).
}
