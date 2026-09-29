/** Período mensual de negocio. `periodo` = anio*100 + mes (ej. 202608),
 *  apto para filtros por rango en Firestore. */
export interface PeriodoMensual {
  anio: number;
  mes: number;      // 1..12
  periodo: number;  // anio*100 + mes
}

/** Año y mes de una fecha de negocio 'YYYY-MM-DD', tomados del STRING.
 *  A propósito NO usa `new Date(fecha)`: un string solo-fecha se interpreta
 *  como medianoche UTC y, leído en hora local (Argentina, UTC−3), el día 1
 *  cae en el mes anterior. Lanza si el string no empieza con 'YYYY-MM'. */
export function periodoDeFecha(fecha: string): PeriodoMensual {
  const m = /^(\d{4})-(\d{2})/.exec(fecha ?? '');
  if (!m) {
    throw new Error(`periodoDeFecha: fecha inválida "${fecha}" (se esperaba YYYY-MM-DD).`);
  }
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12) {
    throw new Error(`periodoDeFecha: mes fuera de rango en "${fecha}".`);
  }
  return { anio, mes, periodo: anio * 100 + mes };
}

/** Sufijo de mes para ids de documento: 'YYYY_MM' (mes con dos dígitos,
 *  ordena bien en la consola de Firestore). */
export function sufijoMes(p: { anio: number; mes: number }): string {
  return `${p.anio}_${String(p.mes).padStart(2, '0')}`;
}
