import { RefTarifaAplicada } from "./ref-tarifa-aplicada";
import { AsignacionVenta } from "./vendedor-nuevo";

/** Un archivo adjunto a una Operación (remito, comprobante, foto de entrega, etc.).
 *  Sin categorías ni historial de versiones — a diferencia de Documentacion (Legajos),
 *  acá no hay ciclo de vencimiento/reemplazo: se carga una vez y queda. */
export interface DocumentoOperacion {
  nombre: string;
  url: string;
  fechaCarga: string; // ISO 8601, momento de la subida
  usuario: string;    // email de quien lo cargó
}

export interface Operacion {
  idOperacion: string;              // document ID de Firestore. NO se persiste; se reconstruye al leer.
  numeroOperacion: number;          // correlativo visible para el usuario (generado por servicio contador)
  fecha: string;
  km: number;
  documentacion: DocumentoOperacion[];
  hojaRuta: string;
  observaciones: string;

  cliente: RefCliente;
  chofer: RefChofer;
  vehiculo: RefVehiculo;
  proveedor: RefProveedor | null;

  acompaniante: boolean;
  acompanianteCant?: number;

  informeOpCliente: string;
  informeOpChofer: string;

  // Marca de eventual: datosTarifaEventual !== null (TC8: fuera los 4
  // booleanos legacy de tipo de tarifa; la tarifa elegida vive en
  // tarifaAplicada*).
  datosTarifaEventual: DatosTarifaEventual | null;
  // (TC6: retirado el campo de datos de tarifa Personalizada — no tenía
  // lectores; la Personalizada se identifica por
  // tarifaAplicadaCliente/Chofer.nivel === 'personalizada'.)
  // (TC10: retirado el espejo legacy de valores; la única fuente es
  // valoresNuevos.)

  // Sistema de Tarifas. tarifaAplicada*: referencia elegida ANTES del alta
  // (operaciones-editor / generador, vía ResolucionTarifaOpService) y
  // congelada; el alta la exige (ValoresTarifaService.calcularAlta) y nunca
  // se vuelve a resolver. valoresNuevos: calculado en el alta y recalculado
  // en cierre / edición de InformeOp / restaurar (calcularCierre). Eventual no
  // usa tarifaAplicada* (quedan en null): se identifica por
  // datosTarifaEventual !== null.
  tarifaAplicadaCliente: RefTarifaAplicada | null;
  tarifaAplicadaChofer: RefTarifaAplicada | null;
  valoresNuevos: Valores | null;

  multiplicadorCliente: number;
  multiplicadorChofer: number;
  // Adicional extra cargado a mano al editar/cerrar (ENTRADA, TC9): un
  // concepto y un valor por lado. El resultado por lado lo calcula el motor
  // en valoresNuevos.<lado>.adExtraValor (0 si el multiplicador del lado es
  // 0). null = sin adicional. Normalizar con armarAdExtra().
  adExtra: AdicionalExtraOp | null;

  // Override manual de tarifa base (Chunk 3 — edición de InformeOp): un
  // número presente congela ese lado a ese valor exacto en vez de derivarlo
  // de tarifaAplicadaCliente/Chofer — cubre acuerdos puntuales de
  // facturación. null/ausente = comportamiento normal (resuelto por
  // jerarquía). Lo respeta ValoresTarifaService.armarValoresNuevos.
  tarifaBaseManualCliente?: number | null;
  tarifaBaseManualChofer?: number | null;

  estado: EstadoOp;

  lockLiquidacion?: {
    usuario: string;
    timestamp: number;
  };
  resumenProcesado?: boolean;
}

export interface RefCliente {
  id: string;
  razonSocial: string;
  cuit: number;
  // LEGACY (modelo viejo de Vendedores): nunca se pobló en el modelo nuevo.
  // Se retira con la migración de Vantruck.
  vendedor?: string[];
  // Frente Vendedores: snapshot de Cliente.comisionesVenta congelado al ALTA
  // (la comisión es por operación, histórica: no del vendedor vigente).
  // Opcional: las ops anteriores no lo tienen (el Recálculo puede completarlo).
  comisiones?: AsignacionVenta[];
}

export interface RefChofer {
  id: string;
  nombre: string;
  apellido: string;
  cuit: number;
}

export interface RefVehiculo {
  id: string;
  dominio: string;
  categoria: { catOrden: number; nombre: string };
}

export interface RefProveedor {
  id: string;
  razonSocial: string;
  cuit: number;
}

/** Adicional extra de una operación (entrada): concepto y valor por lado. */
export interface AdicionalExtraOp {
  concepto: string;
  valorCliente: number;
  valorChofer: number;
}

/** Normaliza lo cargado en un form: concepto recortado; valores null/undefined
 *  → 0. Sin concepto y con ambos valores en 0 → null (sin adicional). */
export function armarAdExtra(
  concepto: string | null | undefined,
  valorCliente: number | null | undefined,
  valorChofer: number | null | undefined,
): AdicionalExtraOp | null {
  const c = (concepto ?? '').trim();
  const vc = valorCliente ?? 0;
  const vch = valorChofer ?? 0;
  if (!c && vc === 0 && vch === 0) return null;
  return { concepto: c, valorCliente: vc, valorChofer: vch };
}

export interface DatosTarifaEventual {
  chofer: { concepto: string; valor: number };
  cliente: { concepto: string; valor: number };
}

export interface EstadoOp {
  ciclo: 'abierta' | 'cerrada' | 'liquidada';
  liquidacion: { cliente: boolean; chofer: boolean };
  proforma: { cliente: boolean; chofer: boolean };
}

export interface Valores {
  cliente: {
    acompValor: number;
    kmAdicional: number;
    tarifaBase: number;
    aCobrar: number;
    adExtraValor?: number;
  };
  chofer: {
    acompValor: number;
    kmAdicional: number;
    tarifaBase: number;
    aPagar: number;
    adExtraValor?: number;
  };
}
