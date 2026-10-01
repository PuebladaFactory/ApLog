import { PeriodoFiltro } from 'src/app/interfaces/periodo-filtro';

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

/** Meses del rango [desde, hasta], inclusive, en orden ascendente. */
export function mesesDelRango(
  desde: { anio: number; mes: number },
  hasta: { anio: number; mes: number },
): PeriodoMensual[] {
  const meses: PeriodoMensual[] = [];
  const fin = hasta.anio * 100 + hasta.mes;
  let anio = desde.anio;
  let mes = desde.mes;
  while (anio * 100 + mes <= fin) {
    meses.push({ anio, mes, periodo: anio * 100 + mes });
    mes++;
    if (mes > 12) { mes = 1; anio++; }
  }
  return meses;
}

/** Días operativos de un mes para el promedio de ops por día: días del mes
 *  sin domingos (sin calendario de feriados). Mes en curso: solo hasta hoy
 *  inclusive. Mes futuro: 0. Fechas locales construidas con números (sin
 *  parsear strings). */
export function diasOperativos(anio: number, mes: number, hoy: Date = new Date()): number {
  const actual = hoy.getFullYear() * 100 + (hoy.getMonth() + 1);
  const periodo = anio * 100 + mes;
  if (periodo > actual) return 0;
  const ultimoDia = periodo === actual ? hoy.getDate() : new Date(anio, mes, 0).getDate();
  let dias = 0;
  for (let d = 1; d <= ultimoDia; d++) {
    if (new Date(anio, mes - 1, d).getDay() !== 0) dias++;
  }
  return dias;
}

/** Período "últimos 12 meses" (incluye el mes actual). */
export function ultimos12Meses(hoy: Date = new Date()): PeriodoFiltro {
  const hasta = { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 };
  let anio = hasta.anio;
  let mes = hasta.mes - 11;
  if (mes < 1) { mes += 12; anio--; }
  return { tipo: 'ultimos-12', desde: { anio, mes }, hasta };
}

/** Título legible de un período de reporte. */
export function tituloPeriodo(p: PeriodoFiltro): string {
  if (p.tipo === 'ultimos-12') return 'Últimos 12 meses';
  if (p.tipo === 'anio') return `Año ${p.anio}`;
  const fmt = (x: { anio: number; mes: number }) => `${String(x.mes).padStart(2, '0')}-${x.anio}`;
  return `${fmt(p.desde)} → ${fmt(p.hasta)}`;
}

/** Valida un período de reporte; devuelve el mensaje de error o null. */
export function errorPeriodoReporte(p: PeriodoFiltro, maxMeses: number): string | null {
  const desde = p.desde.anio * 100 + p.desde.mes;
  const hasta = p.hasta.anio * 100 + p.hasta.mes;
  if (desde > hasta) return 'El período "desde" no puede ser posterior a "hasta".';
  if (mesesDelRango(p.desde, p.hasta).length > maxMeses) {
    return `El período no puede superar ${maxMeses} meses.`;
  }
  return null;
}
