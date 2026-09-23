import { RefCliente, RefChofer, RefProveedor, RefVehiculo } from './operacion';
import { RefTarifaAplicada } from './ref-tarifa-aplicada';

export interface InformeOpNuevo {
  idInfOp: string;              // id real del documento Firestore — no se guarda en el
                                 // body, se agrega al leer (patrón ConId)
  idOperacion: string;

  tipo: 'cliente' | 'chofer' | 'proveedor';
  entidad: RefCliente | RefChofer | RefProveedor;

  fecha: string;                // ISO (YYYY-MM-DD) — fecha de la operación

  valores: Valores;

  datosOperacion: DatosOperacionInforme;

  estado: 'activo' | 'proforma' | 'liquidado' | 'anulado';
  bloqueadoPorContraparte: boolean;   // bloqueo por la proforma de la contraparte —
                                       // separado de `estado` a propósito, no lo pisa

  contraParte: { idInfOp: string; monto: number; entidad: RefCliente | RefChofer | RefProveedor };
  idInfLiq: string | null;      // link a la liquidación cuando estado es 'proforma' o
                                 // 'liquidado' — null en 'activo'/'anulado'

  observacionInforme: string;   // nota propia del informe, no ligada a la operación
}

export interface DatosOperacionInforme {
  km: number;
  vehiculo: RefVehiculo;
  chofer: RefChofer;             // copia denormalizada del chofer real de la
                                   // operación — independiente de tipo/entidad
                                   // (que describen el lado de ESTE InformeOp,
                                   // no quién manejó)
  tarifaAplicada: RefTarifaAplicada | null;                    // null ⇔ eventual
  datosEventual: DatosEventualInforme | null;                  // presente solo si
                                                                // tarifaAplicada es null
  observaciones: string;        // copia denormalizada de la operación —
                                 // EditarInfOpComponent es el único write path
  hojaRuta: string;
}

export interface DatosEventualInforme {
  concepto: string;
  valor: number;
}

export interface Valores {
  tarifaBase: number;
  // Espejo informativo de Operacion.tarifaBaseManualCliente/Chofer para este
  // lado — presente cuando este InformeOp fue facturado a un valor de
  // tarifa base cargado a mano en vez del resuelto por jerarquía (Chunk 3).
  tarifaBaseManual?: number | null;
  acompaniante: number;
  kmMonto: number;
  total: number;
  adExtra?: number;
}
