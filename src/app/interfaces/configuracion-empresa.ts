/** Datos de la empresa (F8b) — documento único `configuracion/empresa` por
 *  proyecto de Firebase (demo y Vantruck tienen el suyo). Se editan en
 *  Ajustes → Datos de la empresa (dev / admin) y los usan los comprobantes
 *  que emite la app (Recibo / Orden de pago, F8c). Diseño:
 *  claude/diseno-finanzas.md §22.4 (F62). */

export type CondicionIvaEmpresa = 'responsable_inscripto' | 'monotributo' | 'exento';

export interface DatosEmpresa {
  razonSocial: string;
  nombreFantasia: string;           // '' si no tiene
  cuit: number | null;              // 11 dígitos
  condicionIva: CondicionIvaEmpresa;
  ingresosBrutos: string;           // n° de inscripción ('' si no aplica)
  inicioActividades: string | null; // 'YYYY-MM-DD'
  domicilio: string;
  localidad: string;                // "Ciudad, Provincia (CP)"
  telefono: string;
  email: string;
  // Auditoría (los pone el servicio al guardar)
  actualizado: string | null;       // ISO con hora
  usuario: string | null;           // email
}
