// Referencia congelada a la tarifa efectivamente aplicada a UN lado de una
// operación. Sirve para general/especial/personalizada por igual — no hace
// falta una interfaz de snapshot por nivel.
// Cableada a Operacion desde Bloque 6 (ValoresTarifaService) — se resuelve y
// congela en el alta (operacion.service.ts → calcularAlta) y NO se vuelve a
// resolver en el cierre (modal-resumen-op.component.ts → calcularCierre
// reutiliza esta misma referencia con valores actualizados).
export interface RefTarifaAplicada {
  idTarifa: string;
  nivel: 'general' | 'especial' | 'personalizada';   // eventual no usa esta referencia
  nombreTarifa: string;       // exhibición histórica
  seccion: number;
  categoria: number;
  nombreCategoria: string;    // exhibición histórica
}
