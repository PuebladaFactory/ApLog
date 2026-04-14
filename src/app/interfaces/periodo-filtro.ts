export interface PeriodoFiltro {
  tipo: 'ultimos-12' | 'anio' | 'rango';

  desde: { anio: number; mes: number };
  hasta: { anio: number; mes: number };

  anio?: number; // solo para UI
}