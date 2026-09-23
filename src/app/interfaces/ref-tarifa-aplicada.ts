// Referencia congelada a la tarifa efectivamente aplicada a UN lado de una
// operación. Sirve para general/especial/personalizada por igual — no hace
// falta una interfaz de snapshot por nivel.
// Cableada a Operacion desde Bloque 6 (ValoresTarifaService) — se resuelve y
// congela en el alta (operacion.service.ts → calcularAlta) y NO se vuelve a
// resolver en el cierre (ValoresTarifaService.calcularCierre, llamado desde
// ModalDetalleOpComponent, reutiliza esta misma referencia con valores
// actualizados).
export interface RefTarifaAplicada {
  idTarifa: string;
  nivel: 'general' | 'especial' | 'personalizada';   // eventual no usa esta referencia
  nombreTarifa: string;       // exhibición histórica
  seccion: number;
  // Nombre de la sección al momento de resolver — igual que nombreCategoria,
  // exhibición histórica. null cuando la sección no tiene nombre (tarifas de
  // sección única: general/especial/personalizada por km con 1 sola sección),
  // mismo criterio que Seccion<T>.nombre. Documentos creados ANTES de este
  // campo no lo tienen en Firestore — al leerlos tratar como null (?? null),
  // mismo precedente que versionAnteriorId en tarifa.ts.
  nombreSeccion: string | null;
  categoria: number;
  nombreCategoria: string;    // exhibición histórica
}
