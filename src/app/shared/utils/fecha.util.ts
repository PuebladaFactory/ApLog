/** Utils PUROS de fechas (frente lazy-fechas, FE1). Sin Angular ni Firestore:
 *  se pueden probar en Node.
 *
 *  Criterio de uso en toda la app:
 *  1. Una FECHA DE NEGOCIO es un string 'YYYY-MM-DD' (fecha de una operación,
 *     vencimiento de un documento, fecha de un movimiento). Se opera como
 *     string o por sus partes numéricas: NUNCA con new Date('YYYY-MM-DD')
 *     (lo toma como medianoche UTC y en Argentina, UTC−3, cae el día
 *     anterior) ni con Date.toISOString() (después de las 21:00 da mañana).
 *  2. Un INSTANTE (alta, registro, anulación, log) es un ISO completo en UTC,
 *     generado con new Date().toISOString(). Se muestra con instanteLegible.
 *  3. El "hoy de negocio" sale SOLO de hoyNegocio(): huso fijo de Argentina,
 *     igual en el cliente y en las Cloud Functions (decisión D2).
 *  4. Date → fecha de negocio: solo con fechaNegocioDe (hora local del
 *     navegador; es lo que hacía toISODateString, que ahora delega acá). */

/** Fecha de negocio: 'YYYY-MM-DD'. Alias documental (es un string). */
export type FechaNegocio = string;

/** Huso horario del negocio. La Cloud Function de vencimientos usa el mismo. */
export const ZONA_NEGOCIO = 'America/Argentina/Buenos_Aires';

const MS_DIA = 86400000;
const RE_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

function dos(n: number): string {
  return String(n).padStart(2, '0');
}

function formatear(anio: number, mes: number, dia: number): FechaNegocio {
  return `${String(anio).padStart(4, '0')}-${dos(mes)}-${dos(dia)}`;
}

/** true si `s` es un string 'YYYY-MM-DD' con una fecha de calendario real
 *  (rechaza '2026-02-30', '2026-13-01', '2026-1-5' o un ISO con hora). */
export function esFechaNegocio(s: unknown): s is FechaNegocio {
  if (typeof s !== 'string') return false;
  const m = RE_FECHA.exec(s);
  if (!m) return false;
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1) return false;
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return dia <= ultimo;
}

/** Partes numéricas de una fecha de negocio (mes 1..12). Lanza si el string
 *  no es una fecha válida 'YYYY-MM-DD'. */
export function partesFecha(f: FechaNegocio): { anio: number; mes: number; dia: number } {
  if (!esFechaNegocio(f)) {
    throw new Error(`Fecha inválida (YYYY-MM-DD): '${f}'.`);
  }
  const [anio, mes, dia] = f.split('-').map(Number);
  return { anio, mes, dia };
}

/** "Hoy" en el huso del negocio (Argentina), sin importar el huso del
 *  navegador o del servidor. `ahora` permite probar con un instante fijo. */
export function hoyNegocio(ahora: Date = new Date()): FechaNegocio {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_NEGOCIO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(ahora);
  const valor = (tipo: string) => Number(partes.find(p => p.type === tipo)?.value);
  return formatear(valor('year'), valor('month'), valor('day'));
}

/** Date → fecha de negocio con la fecha LOCAL del navegador (año, mes y día
 *  que ve el usuario). Es el comportamiento histórico de toISODateString. */
export function fechaNegocioDe(d: Date): FechaNegocio {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

/** Suma (o resta, con n negativo) días de calendario. Opera en UTC sobre las
 *  partes: no depende del huso. Lanza si `f` no es válida. */
export function sumarDias(f: FechaNegocio, n: number): FechaNegocio {
  const { anio, mes, dia } = partesFecha(f);
  const d = new Date(Date.UTC(anio, mes - 1, dia) + n * MS_DIA);
  return formatear(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Días de calendario de `desde` a `hasta`; negativo si hasta < desde.
 *  Opera en UTC sobre las partes: no depende del huso. Lanza si alguna
 *  fecha no es válida. */
export function diasEntre(desde: FechaNegocio, hasta: FechaNegocio): number {
  const a = partesFecha(desde);
  const b = partesFecha(hasta);
  const msA = Date.UTC(a.anio, a.mes - 1, a.dia);
  const msB = Date.UTC(b.anio, b.mes - 1, b.dia);
  return Math.round((msB - msA) / MS_DIA);
}

/** 'YYYY-MM-DD' → 'DD/MM/AAAA', sin pasar por Date. Vacío o nulo → `vacio`.
 *  Cualquier otro string se devuelve tal cual (no se esconde el dato). */
export function fechaLegible(f: string | null | undefined, vacio: string = '—'): string {
  if (!f) return vacio;
  const m = RE_FECHA.exec(f);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : f;
}

/** Instante ISO (UTC) → 'DD/MM/AAAA HH:mm' en hora de Argentina
 *  ('DD/MM/AAAA' si conHora = false). Vacío, nulo o inválido → '—'. */
export function instanteLegible(iso: string | null | undefined, conHora: boolean = true): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const opciones: Intl.DateTimeFormatOptions = {
    timeZone: ZONA_NEGOCIO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(conHora ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } : {}),
  };
  const partes = new Intl.DateTimeFormat('en-US', opciones).formatToParts(d);
  const v = (tipo: string) => partes.find(p => p.type === tipo)?.value ?? '';
  const fecha = `${v('day')}/${v('month')}/${v('year')}`;
  return conHora ? `${fecha} ${v('hour')}:${v('minute')}` : fecha;
}

/** Año de una fecha que puede venir como 'YYYY-MM-DD…' (se toma del string,
 *  sin pasar por Date) o como Date (año local). Cualquier otra cosa → null.
 *  Para datos viejos donde `fecha` es `Date | string` (FE4). */
export function anioDe(fecha: string | Date | null | undefined): number | null {
  if (fecha instanceof Date) {
    return isNaN(fecha.getTime()) ? null : fecha.getFullYear();
  }
  const m = /^(\d{4})-\d{2}-\d{2}/.exec(fecha ?? '');
  return m ? Number(m[1]) : null;
}
