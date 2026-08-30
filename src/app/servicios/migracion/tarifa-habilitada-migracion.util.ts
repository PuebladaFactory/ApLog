/**
 * Conversión de tarifaTipo (legacy, 4 booleanos) a tarifasHabilitadas, para uso
 * exclusivo de los scripts de migración (datos crudos de Firestore, sin tipar).
 * Misma lógica que tenía habilitadasDesdeTarifaTipo antes de eliminarse en el
 * bloque de componentes del mini-frente RefTarifaHabilitada.
 */
export function habilitadasDesdeTarifaTipoMigracion(tarifaTipo: any): any[] {
  if (tarifaTipo?.eventual) return [{ nivel: 'eventual' }];
  if (tarifaTipo?.especial) return [{ nivel: 'especial' }];
  if (tarifaTipo?.personalizada) return [{ nivel: 'personalizada' }];
  return [{ nivel: 'general' }];
}
