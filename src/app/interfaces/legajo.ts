import { FechaNegocio, diasEntre, esFechaNegocio, hoyNegocio } from 'src/app/shared/utils/fecha.util';

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
 * Documento de la colección derivada `vencimientos`, generada y reconstruida
 * enteramente por la Cloud Function `verificarVencimientosDocumentacion`
 * (ver functions/src/verificarVencimientosDocumentacion.ts). Solo lectura desde
 * el cliente — nadie escribe esto salvo la función.
 */
export interface Vencimiento {
  idLegajo: string;
  idChofer: string;
  idCategoria: string;
  titulo: string;
  fechaVto: string | null;
  estado: EstadoDocumentacion; // en la práctica siempre 'vencido' | 'porVencer' — la función solo genera alertas para esos dos casos
}

/**
 * Calcula el estado de una documentación en base a su fecha de vencimiento.
 * Única fuente de verdad para este cálculo — consumida por LegajoFactoryService
 * al crear/reemplazar un documento. DUPLICADA manualmente en
 * functions/src/verificarVencimientosDocumentacion.ts (Cloud Function de
 * verificación periódica) — mantener ambas copias sincronizadas ante
 * cualquier cambio en este cálculo.
 *
 * Regla (frente lazy-fechas, FE2 / decisión D1): un documento con fechaVto = D
 * está vigente TODO el día D y vencido desde D+1. "Por vencer": faltan de 0 a
 * 45 días de calendario hasta D (inclusive). "Hoy" es el día de Argentina
 * (fecha.util), igual en cualquier navegador y en la Cloud Function. Se opera
 * sobre los strings 'YYYY-MM-DD', sin construir un Date con la fecha.
 *
 * @param fechaVto 'YYYY-MM-DD', o null si el documento no tiene vencimiento
 * @param hoy 'YYYY-MM-DD' de referencia; por defecto, hoy en Argentina (se pasa en pruebas)
 * @returns 'sinVto' si fechaVto es null o no es una fecha válida; si no,
 *   'vencido' | 'porVencer' (0 a 45 días) | 'enFecha'
 */
export function calcularEstadoDocumentacion(
  fechaVto: string | null,
  hoy: FechaNegocio = hoyNegocio(),
): EstadoDocumentacion {
  if (!fechaVto || !esFechaNegocio(fechaVto)) {
    return 'sinVto';
  }
  const dias = diasEntre(hoy, fechaVto);
  if (dias < 0) {
    return 'vencido';
  } else if (dias <= 45) {
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
