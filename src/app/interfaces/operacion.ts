import { TarifaTipo } from "./tarifa-gral-cliente";
import { RefTarifaAplicada } from "./ref-tarifa-aplicada";

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

  tarifaTipo: TarifaTipo;
  datosTarifaEventual: DatosTarifaEventual | null;
  datosTarifaPersonalizada: DatosTarifaPersonalizada | null;

  valores: Valores;

  // Sistema nuevo de Tarifas (Bloque 6) — corre en paralelo al sistema viejo
  // (tarifaTipo/valores) sin reemplazarlo todavía. Se completa en el alta
  // (ValoresTarifaService.calcularAlta, jerarquía Eventual > Personalizada >
  // Especial > General) y se recalcula en el cierre (calcularCierre) sin
  // volver a resolver la jerarquía. Si la resolución automática no puede
  // determinar un único ganador queda en null — no bloquea el alta, se
  // registra en el log de actividad. Eventual no usa tarifaAplicada*: se
  // identifica leyendo datosTarifaEventual de la operación.
  tarifaAplicadaCliente: RefTarifaAplicada | null;
  tarifaAplicadaChofer: RefTarifaAplicada | null;
  valoresNuevos: Valores | null;

  multiplicadorCliente: number;
  multiplicadorChofer: number;
  adExtraConcepto?: string;

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
  // Histórico: vendedores que cobran comisión por la operación (congelados al alta).
  // Comisión es por operación, no del vendedor vigente del cliente.
  vendedor?: string[];
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

export interface DatosTarifaEventual {
  chofer: { concepto: string; valor: number };
  cliente: { concepto: string; valor: number };
}

export interface DatosTarifaPersonalizada {
  seccion: number;
  categoria: number;
  nombre: string;
  aCobrar: number;
  aPagar: number;
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
