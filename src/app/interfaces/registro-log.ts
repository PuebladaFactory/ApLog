export type AccionLog =
  // Mutación de datos — la entrada se escribe DENTRO del batch atómico de negocio.
  | 'ALTA'
  | 'EDITAR'
  | 'BAJA'
  | 'RESTAURAR'
  | 'CERRAR'      // cierre de operación (ciclo abierta → cerrada + alta del par de InformeOp)
  | 'EMITIR'      // emisión de un informe de liquidación (asigna numeroInterno) — lleva diff
  | 'REVERTIR'    // reversión de un InformeLiq emitido (InformeOp → activo) — lleva diff
  | 'FACTURAR'    // vinculación de factura electrónica (emitido → facturado) — lleva diff
  | 'DESVINCULAR' // desvinculación de factura (facturado → emitido) — lleva diff
  | 'ANULAR'      // anulación de una liquidación de comisiones (LiquidacionVentaService) o de un movimiento de Finanzas (movimientosFin) — lleva diff. InformeLiq 'anulado' sigue reservado.
  | 'PAGAR'       // pago registrado: liquidación de comisiones (emitida → pagada) u orden de pago de Finanzas (movimientosFin) — sin diff
  | 'COBRAR'      // cobro registrado en Finanzas (movimientosFin) — sin diff
  | 'AJUSTAR'     // ajuste financiero: incobrable, bonificación, redondeo, apertura (movimientosFin) — sin diff
  | 'IMPUTAR'     // aplicación de un saldo a favor / anticipo a documentos (movimientosFin) — sin diff
  // Acciones operativas sin mutación de datos — no hay batch de negocio al cual
  // atarse, se escriben sueltas. Ampliar esta lista a medida que se necesiten
  // (cobros/pagos y liquidación cuando se implemente Finanzas, etc.).
  | 'REIMPRIMIR'
  | 'DESCARGAR'
  | 'LOGIN'
  | 'LOGOUT';

export interface CambioCampo {
  campo: string;
  anterior: any;
  nuevo: any;
}

export interface RegistroLog {
  timestamp: number;
  userId: string;
  userEmail: string;
  action: AccionLog;
  coleccion: string;        // colección "dueña" de la acción, no lista de afectadas
  idObjet: string | number;
  details: string;
  status: 'SUCCESS' | 'ERROR';
  cambios?: CambioCampo[];  // solo en acciones con diff (ver LogRegistroService.ACCIONES_CON_DIFF), y solo si hubo diffs
}
