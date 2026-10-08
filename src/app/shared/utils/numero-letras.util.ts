/** Importe en letras (es-AR) para recibos y órdenes de pago (F8c). Puro.
 *  importeEnLetras(1234567.89) → "UN MILLÓN DOSCIENTOS TREINTA Y CUATRO MIL
 *  QUINIENTOS SESENTA Y SIETE CON 89/100". Hasta 999.999.999.999. */

const UNIDADES = [
  '', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
  'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete',
  'veintiocho', 'veintinueve',
];
const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = [
  '', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos',
  'ochocientos', 'novecientos',
];

/** 0..999 en letras ('' para 0). `apocopar`: "uno" → "un" (antes de mil /
 *  millón: "veintiún mil", "un millón"). */
function hasta999(n: number, apocopar: boolean): string {
  if (n === 0) return '';
  if (n === 100) return 'cien';
  const c = Math.floor(n / 100);
  const r = n % 100;
  let resto: string;
  if (r < 30) {
    resto = UNIDADES[r];
    if (apocopar) {
      if (r === 1) resto = 'un';
      else if (r === 21) resto = 'veintiún';
    }
  } else {
    const d = Math.floor(r / 10);
    const u = r % 10;
    const unidad = u === 1 && apocopar ? 'un' : UNIDADES[u];
    resto = u === 0 ? DECENAS[d] : `${DECENAS[d]} y ${unidad}`;
  }
  return [CENTENAS[c], resto].filter(Boolean).join(' ');
}

/** 0..999.999 en letras. */
function hastaMillon(n: number, apocopar: boolean): string {
  const miles = Math.floor(n / 1000);
  const resto = n % 1000;
  const parteMiles = miles === 0 ? '' : miles === 1 ? 'mil' : `${hasta999(miles, true)} mil`;
  return [parteMiles, hasta999(resto, apocopar)].filter(Boolean).join(' ');
}

/** Entero ≥ 0 en letras ("cero" para 0). */
export function enteroEnLetras(n: number): string {
  const entero = Math.floor(Math.abs(n));
  if (entero === 0) return 'cero';
  const millones = Math.floor(entero / 1_000_000);
  const resto = entero % 1_000_000;
  const parteMillones = millones === 0 ? '' : millones === 1 ? 'un millón' : `${hastaMillon(millones, true)} millones`;
  return [parteMillones, hastaMillon(resto, false)].filter(Boolean).join(' ');
}

/** Importe en letras, en mayúsculas, con centavos "CON NN/100". */
export function importeEnLetras(importe: number): string {
  const centavosTotales = Math.round(Math.abs(importe) * 100);
  const entero = Math.floor(centavosTotales / 100);
  const centavos = centavosTotales % 100;
  return `${enteroEnLetras(entero)} con ${String(centavos).padStart(2, '0')}/100`.toUpperCase();
}
