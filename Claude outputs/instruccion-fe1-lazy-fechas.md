````
Si no ves la línea FIN DE LA INSTRUCCIÓN FE1 al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN FE1 — Frente Lazy loading + fechas (ApLog, rama refactor)
=====================================================================
Util único de fechas: shared/utils/fecha.util.ts

## Contexto y razonamiento

Primer bloque de fechas. Crea el util del que van a depender FE2 a FE5.
En este bloque NO cambia ningún comportamiento visible: se crea el util y
se mueven a él dos funciones que ya eran correctas.

**El problema de fondo** (relevamiento §3). En Argentina (UTC−3):
- `new Date('YYYY-MM-DD')` es medianoche UTC, o sea las 21:00 del día
  ANTERIOR en hora local;
- `new Date().toISOString().split('T')[0]` después de las 21:00 devuelve el
  día de MAÑANA.
De ahí salen los bugs de vencimientos de legajos (FE2), del filtro de
período (FE3) y de los "hoy" por defecto (FE4).

**Criterio** (§4.2 y decisiones D2/D3), escrito también en el encabezado
del util:
1. Una fecha de negocio es un string 'YYYY-MM-DD' y se opera como string
   o por sus partes.
2. Un instante es un ISO UTC completo y se muestra con `instanteLegible`.
3. El "hoy de negocio" sale solo de `hoyNegocio()`, con el huso fijo
   `America/Argentina/Buenos_Aires` vía `Intl`. Da lo mismo en cualquier
   navegador y en la Cloud Function (D2).
4. `Date` → fecha de negocio: con `fechaNegocioDe` (hora local).

**API:**

| Función | Qué hace |
|---|---|
| `FechaNegocio` (type) | Alias de string 'YYYY-MM-DD' |
| `ZONA_NEGOCIO` | 'America/Argentina/Buenos_Aires' |
| `esFechaNegocio(s)` | Valida formato y fecha de calendario real |
| `partesFecha(f)` | { anio, mes, dia }; lanza si es inválida |
| `hoyNegocio(ahora?)` | Hoy en Argentina (Intl), independiente del huso del equipo |
| `fechaNegocioDe(d)` | Date → 'YYYY-MM-DD' con fecha local (lo que hacía toISODateString) |
| `sumarDias(f, n)` | Suma o resta días en UTC sobre las partes |
| `diasEntre(desde, hasta)` | Días de calendario (negativo si hasta < desde) |
| `fechaLegible(f, vacio?)` | 'YYYY-MM-DD' → 'DD/MM/AAAA' sin Date |
| `instanteLegible(iso, conHora?)` | ISO → 'DD/MM/AAAA HH:mm' en hora de Argentina |

**Cambios en código existente** (sin cambio de comportamiento):
- **`toISODateString`** (date-range.service.ts) delega en `fechaNegocioDe`.
  Tiene 69 llamadas, todas correctas, y quedan intactas (D3).
- **`diasEntre`** se mueve de finanzas.util.ts a fecha.util.ts.
  - Finanzas.util lo re-exporta temporalmente, así sus 7 importadores no
    se tocan. FE5 los apunta al util nuevo y saca el re-export.
  - Única diferencia: el nuevo valida la fecha de calendario completa. El
    viejo aceptaba '2026-02-30' y lo corría al 2 de marzo. Los llamadores
    con datos de usuario ya tienen try/catch; los demás pasan fechas
    guardadas, que son válidas.

**Verificación previa** (hecha antes de entregar): el util se compiló con
tsc y se probó en Node con 34 casos bajo 4 husos horarios (Argentina, UTC,
Tokio y Los Ángeles). Todos dan lo mismo. Los casos de borde incluyen:
- 21:30 y 23:59 del 12/10 en Argentina → '2026-10-12';
- 00:00 del 13/10 → '2026-10-13';
- 31/12 a las 23:00 → año viejo;
- 29/02 en año bisiesto y no bisiesto;
- cruces de mes y de año en `sumarDias`.
El PASO 4 repite esa prueba en tu máquina.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto a BUSCAR no está o aparece más de una vez: detenete y
  reportá.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Los archivos marcados NUEVO se crean completos con el contenido dado.
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.
- Si se toca un tipo, interfaz, módulo o export, revisá TODOS sus usos en
  src/ (incluidos .spec.ts y .html).

## PASO 0 — Verificación (sin modificar nada)

Corré y reportá la salida:

```
ls src/app/shared/utils/fecha.util.ts
grep -rn "export function diasEntre\|function msUtc\|FORMATO_FECHA" src --include=*.ts
grep -rln "diasEntre" src --include=*.ts
grep -rn "export function toISODateString" src --include=*.ts
grep -rln "toISODateString" src --include=*.ts | wc -l
node --version
```

Esperado:
1. `fecha.util.ts`: no existe.
2. `diasEntre`, `msUtc` y `FORMATO_FECHA`:
   - finanzas.util.ts (líneas 114, 116, 117 y 125);
   - movimiento-fin.util.ts:42, que tiene su PROPIA constante
     `FORMATO_FECHA` (más sus usos). No se toca acá; es candidata a
     consolidar en FE5.
3. Archivos con `diasEntre`: finanzas.util.ts y sus 7 importadores:
   - cuenta-entidad.util.ts;
   - movimiento-fin.util.ts;
   - resumen-finanzas.util.ts;
   - cuentas-finanzas.util.ts;
   - registrar-movimiento.component.ts;
   - registrar-ajuste.component.ts;
   - imputar-saldo.component.ts.
4. `toISODateString`: definido solo en date-range.service.ts.
5. Un número: la cantidad de archivos que usan `toISODateString`
   (referencia: 29).
6. Node 18 o superior (necesario para Intl con husos horarios completos).

Si algo no coincide, detenete y reportá.

## PASO 1 — src/app/shared/utils/fecha.util.ts (NUEVO)

```
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
```

## PASO 2 — src/app/servicios/fechas/date-range.service.ts

2.1 BUSCAR:
```
import { BehaviorSubject } from 'rxjs';
```
REEMPLAZAR:
```
import { BehaviorSubject } from 'rxjs';
import { fechaNegocioDe } from 'src/app/shared/utils/fecha.util';
```

2.2 BUSCAR:
```
export function toISODateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');

  return `${y}-${m}-${day}`;
}
```
REEMPLAZAR:
```
/** Date → 'YYYY-MM-DD' con la fecha local. Delega en fecha.util (FE1); se
 *  conserva por sus llamadas existentes (decisión D3). */
export function toISODateString(d: Date): string {
  return fechaNegocioDe(d);
}
```

## PASO 3 — src/app/shared/utils/finanzas.util.ts

3.1 BUSCAR:
```
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function msUtc(fecha: string): number {
  if (!FORMATO_FECHA.test(fecha)) throw new Error(`Fecha inválida (YYYY-MM-DD): '${fecha}'.`);
  const [a, m, d] = fecha.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
}

/** Días de calendario de `desde` a `hasta` (ambas 'YYYY-MM-DD'); negativo
 *  si hasta < desde. Opera en UTC sobre las partes del string: no depende
 *  del huso horario. */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((msUtc(hasta) - msUtc(desde)) / 86400000);
}
```
REEMPLAZAR:
```
// FE1 (frente lazy-fechas): el cálculo de días entre fechas vive en
// fecha.util. Este re-export es temporal para no tocar a quienes lo importan
// desde acá; FE5 los apunta a fecha.util y lo saca.
export { diasEntre } from 'src/app/shared/utils/fecha.util';
```

## PASO 4 — Prueba del util en Node (no modifica el repo)

Compilá el util a una carpeta temporal FUERA del repo y corré la prueba
bajo varios husos horarios. Después borrá la carpeta temporal.

```
D=$(mktemp -d)
npx tsc src/app/shared/utils/fecha.util.ts --outDir "$D" --target ES2022 --module commonjs --strict
```

Creá el archivo `$D/prueba.js` con este contenido exacto:

```
const f = require(process.argv[2]);
let fallas = 0;
const ok = (desc, real, esperado) => {
  const bien = JSON.stringify(real) === JSON.stringify(esperado);
  if (!bien) fallas++;
  console.log(`${bien ? 'OK   ' : 'FALLA'} ${desc} -> ${JSON.stringify(real)}${bien ? '' : ' (esperado ' + JSON.stringify(esperado) + ')'}`);
};
// hoyNegocio: instantes UTC fijos
ok('hoy 13/10 00:30Z (21:30 AR del 12)', f.hoyNegocio(new Date('2026-10-13T00:30:00Z')), '2026-10-12');
ok('hoy 13/10 02:59Z (23:59 AR del 12)', f.hoyNegocio(new Date('2026-10-13T02:59:00Z')), '2026-10-12');
ok('hoy 13/10 03:00Z (00:00 AR del 13)', f.hoyNegocio(new Date('2026-10-13T03:00:00Z')), '2026-10-13');
ok('hoy 01/01 02:00Z (23:00 AR 31/12)', f.hoyNegocio(new Date('2027-01-01T02:00:00Z')), '2026-12-31');
ok('hoy 01/01 03:30Z (00:30 AR 01/01)', f.hoyNegocio(new Date('2027-01-01T03:30:00Z')), '2027-01-01');
// fechaNegocioDe: hora local del proceso
ok('fechaNegocioDe(new Date(2026,0,1,23,59))', f.fechaNegocioDe(new Date(2026, 0, 1, 23, 59)), '2026-01-01');
ok('fechaNegocioDe(new Date(2026,11,31,0,0))', f.fechaNegocioDe(new Date(2026, 11, 31, 0, 0)), '2026-12-31');
// esFechaNegocio
ok('es 2026-02-28', f.esFechaNegocio('2026-02-28'), true);
ok('es 2026-02-29', f.esFechaNegocio('2026-02-29'), false);
ok('es 2028-02-29', f.esFechaNegocio('2028-02-29'), true);
ok('es 2026-13-01', f.esFechaNegocio('2026-13-01'), false);
ok('es 2026-1-5', f.esFechaNegocio('2026-1-5'), false);
ok('es ISO con hora', f.esFechaNegocio('2026-10-12T21:00:00.000Z'), false);
ok('es null', f.esFechaNegocio(null), false);
// partesFecha
ok('partes 2026-10-05', f.partesFecha('2026-10-05'), { anio: 2026, mes: 10, dia: 5 });
let lanza = false; try { f.partesFecha('2026-02-30'); } catch { lanza = true; }
ok('partes 2026-02-30 lanza', lanza, true);
// sumarDias
ok('sumar +1 2026-10-31', f.sumarDias('2026-10-31', 1), '2026-11-01');
ok('sumar +1 2026-12-31', f.sumarDias('2026-12-31', 1), '2027-01-01');
ok('sumar -1 2026-03-01', f.sumarDias('2026-03-01', -1), '2026-02-28');
ok('sumar -1 2028-03-01', f.sumarDias('2028-03-01', -1), '2028-02-29');
ok('sumar +45 2026-10-13', f.sumarDias('2026-10-13', 45), '2026-11-27');
ok('sumar 0', f.sumarDias('2026-10-13', 0), '2026-10-13');
// diasEntre
ok('dias 12/10 -> 13/10', f.diasEntre('2026-10-12', '2026-10-13'), 1);
ok('dias 13/10 -> 12/10', f.diasEntre('2026-10-13', '2026-10-12'), -1);
ok('dias 01/01/26 -> 01/01/27', f.diasEntre('2026-01-01', '2027-01-01'), 365);
ok('dias 01/03/28 - 28/02/28', f.diasEntre('2028-02-28', '2028-03-01'), 2);
// fechaLegible
ok('legible 2026-10-05', f.fechaLegible('2026-10-05'), '05/10/2026');
ok('legible null', f.fechaLegible(null), '—');
ok('legible "" con vacio', f.fechaLegible('', ''), '');
ok('legible texto raro', f.fechaLegible('sin fecha'), 'sin fecha');
// instanteLegible
ok('instante 2026-10-13T00:30Z', f.instanteLegible('2026-10-13T00:30:00.000Z'), '12/10/2026 21:30');
ok('instante 2026-10-13T03:05Z', f.instanteLegible('2026-10-13T03:05:00.000Z'), '13/10/2026 00:05');
ok('instante sin hora', f.instanteLegible('2026-10-13T00:30:00.000Z', false), '12/10/2026');
ok('instante inválido', f.instanteLegible('xx'), '—');
ok('instante null', f.instanteLegible(undefined), '—');
console.log(fallas === 0 ? 'TODO OK' : `FALLAS: ${fallas}`);
process.exit(fallas ? 1 : 0);
```

Corré:
```
for tz in America/Argentina/Buenos_Aires UTC Asia/Tokyo America/Los_Angeles; do echo "== TZ=$tz"; TZ=$tz node "$D/prueba.js" "$D/fecha.util.js" | tail -1; done
rm -rf "$D"
```

Esperado: `TODO OK` en los 4 husos. Si en Windows la variable TZ no tiene
efecto, igual tiene que dar TODO OK: el resultado no depende del huso. Si
aparece alguna FALLA, corré sin `| tail -1` y reportá la salida completa.

## Verificación

1. Greps (reportá la salida):
```
grep -n "function msUtc\|FORMATO_FECHA" src/app/shared/utils/finanzas.util.ts
grep -rn "export function diasEntre\|export { diasEntre }" src --include=*.ts
grep -n "fechaNegocioDe" src/app/servicios/fechas/date-range.service.ts
grep -n "new Date(\|toISOString" src/app/shared/utils/fecha.util.ts
git status --short
git diff -U0 -- src | grep -n "^+.* $"
grep -n " $" src/app/shared/utils/fecha.util.ts
```
Esperado:
- (a) nada.
- (b) fecha.util.ts (`export function diasEntre`) y finanzas.util.ts (el
  re-export).
- (c) el import y la llamada (2 líneas).
- (d) en código:
  - `new Date(Date.UTC(...))` (2 veces, en esFechaNegocio y sumarDias);
  - `new Date(iso)` en instanteLegible;
  - el `ahora: Date = new Date()` del parámetro de hoyNegocio.
  Además, 3 líneas de comentario del encabezado (7, 9 y 11) que nombran
  `new Date('YYYY-MM-DD')`, `Date.toISOString()` y
  `new Date().toISOString()`, para explicar qué NO hacer y cómo se genera
  un instante.
- (e) M date-range.service.ts, M finanzas.util.ts y ?? fecha.util.ts.
- (f) nada.
- (g) nada.

2. `npm run build:demo`. Reportá la tabla de tamaños y las advertencias.
   Referencia (medido sobre una copia del repo con LR1b + este cambio):
   tamaños sin cambio apreciable (Initial total ≈ 1,55 MB) y las mismas 9
   advertencias.

## Pruebas manuales en demo (las hace Nico)

No hay cambio visible: es infraestructura. Alcanza con verificar que lo que
ya usaba estas funciones siga igual.
1. Finanzas:
   - Antigüedad (aging): mismos tramos que antes;
   - Cuentas y Cuenta de una entidad: los días de antigüedad se ven igual;
   - registrar un cobro o un pago con fecha de hoy.
2. Movimientos de Finanzas: filtrar por un rango de fechas (valida el rango
   máximo con diasEntre).
3. Operaciones / Liquidación / Tablero: las fechas "hoy" y los rangos por
   defecto se ven igual que antes (toISODateString).

## Mensaje de commit

```
FE1 (lazy-fechas): util único de fechas (shared/utils/fecha.util.ts)

- NUEVO fecha.util.ts, puro y probado en Node bajo 4 husos: FechaNegocio,
  ZONA_NEGOCIO, esFechaNegocio, partesFecha, hoyNegocio (huso fijo de
  Argentina vía Intl, D2), fechaNegocioDe, sumarDias, diasEntre,
  fechaLegible e instanteLegible. El encabezado documenta el criterio
  (fecha de negocio vs instante).
- toISODateString delega en fechaNegocioDe (sin cambio de comportamiento;
  sus llamadas quedan, D3).
- diasEntre pasa de finanzas.util a fecha.util; finanzas.util lo
  re-exporta hasta FE5.
```

FIN DE LA INSTRUCCIÓN FE1
````
