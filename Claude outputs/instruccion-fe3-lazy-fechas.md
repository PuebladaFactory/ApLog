````
Si no ves la línea FIN DE LA INSTRUCCIÓN FE3 al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN FE3 — Frente Lazy loading + fechas (ApLog, rama refactor)
=====================================================================
Reportes: filtro "Últimos 12 meses" y "hoy" de Argentina en periodo.util

## Contexto y razonamiento

**El bug (relevamiento FV2).** El filtro de período de Reportes
(`app-filtro-periodo`, en resumen general y resumen por entidad) arma
"Últimos 12 meses" así:
```
const desdeDate = new Date(hoy);
desdeDate.setMonth(desdeDate.getMonth() - 11);
```
Si hoy es 31, `setMonth` intenta un día 31 en un mes que no lo tiene y
desborda al mes siguiente. Por eso, el 31/10/2026 "desde" queda en 12/2025
en vez de 11/2025, y el reporte trae 11 meses en vez de 12. Pasa también el
31/03, el 31/05, etc.

Al entrar a Reportes el problema no aparece: el período inicial lo arma
`ultimos12Meses()` (periodo.util), que cuenta bien con año y mes. Falla solo
cuando el usuario vuelve a elegir "Últimos 12 meses" en el filtro.

**El arreglo:**
- **filtro-periodo:**
  - la rama "ultimos-12" usa `ultimos12Meses()`: una sola cuenta para los
    dos caminos;
  - el año y el mes por defecto de "Año" y "Rango" salen del "hoy" de
    Argentina (`hoyNegocio`, decisión D2), no de `new Date()`.
- **periodo.util:**
  - `ultimos12Meses` y `diasOperativos` toman el año, el mes y el día de
    `hoyNegocio(hoy)` en vez de `getFullYear` / `getMonth` / `getDate`
    del navegador;
  - en Argentina el resultado es el mismo; cambia solo si el equipo tiene
    otro huso horario;
  - el parámetro `hoy: Date` se mantiene, así que las llamadas no cambian.

**Verificación previa** (Node, bajo 3 husos: Argentina, UTC y Tokio):

| Hoy (hora de Argentina) | Antes (filtro) | Ahora |
|---|---|---|
| 31/10/2026 15:00 | 12/2025 → 10/2026 ✗ | 11/2025 → 10/2026 |
| 31/03/2026 12:00 | 5/2025 → 3/2026 ✗ | 4/2025 → 3/2026 |
| 31/05/2026 10:00 | 7/2025 → 5/2026 ✗ | 6/2025 → 5/2026 |
| 31/12/2026 23:30 | 1/2026 → 12/2026; en UTC daba 2/2026 → 1/2027 ✗ | 1/2026 → 12/2026 |
| 15/01/2026 12:00 | 2/2025 → 1/2026 | 2/2025 → 1/2026 |

`diasOperativos`, octubre 2026 al 13/10: 11 días a las 00:30 y a las 23:30
(hora de Argentina). Mes futuro: 0. Septiembre completo: 26.

`build:demo` limpio, 9 advertencias, tamaños sin cambio.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto a BUSCAR no está o aparece más de una vez: detenete y
  reportá.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.
- Si se toca un tipo, interfaz, módulo o export, revisá TODOS sus usos en
  src/ (incluidos .spec.ts y .html).

## PASO 0 — Verificación (sin modificar nada)

Corré y reportá la salida:

```
grep -rn "ultimos12Meses\|diasOperativos(" src --include=*.ts
grep -rn "app-filtro-periodo" src --include=*.html
grep -n "new Date\|setMonth\|getMonth\|getFullYear\|getDate" src/app/shared/filtro-periodo/filtro-periodo.component.ts src/app/shared/utils/periodo.util.ts
grep -n "^import" src/app/shared/utils/periodo.util.ts src/app/shared/filtro-periodo/filtro-periodo.component.ts
```

Esperado:
1. `ultimos12Meses`:
   - definición en periodo.util.ts:68;
   - import y uso en resumen-op-entidad (líneas 12 y 45) y en
     resumen-op-general (líneas 8 y 25).
   `diasOperativos(`:
   - definición en periodo.util.ts:55;
   - uso en resumen-op-consulta.service.ts:59.
2. `app-filtro-periodo`: resumen-op-entidad.component.html y
   resumen-op-general.component.html.
3. Fechas:
   - filtro-periodo: líneas 15, 20, 44, 47, 48, 51, 52, 55 y 56;
   - periodo.util: el comentario de la línea 12 y las líneas 55, 56, 59,
     62, 68 y 69.
4. Imports: un solo import en cada archivo (`PeriodoFiltro`).

Si algo no coincide, detenete y reportá.

## PASO 1 — src/app/shared/utils/periodo.util.ts

1.1 BUSCAR:
```
import { PeriodoFiltro } from 'src/app/interfaces/periodo-filtro';
```
REEMPLAZAR:
```
import { PeriodoFiltro } from 'src/app/interfaces/periodo-filtro';
import { hoyNegocio, partesFecha } from 'src/app/shared/utils/fecha.util';
```

1.2 BUSCAR:
```
/** Días operativos de un mes para el promedio de ops por día: días del mes
 *  sin domingos (sin calendario de feriados). Mes en curso: solo hasta hoy
 *  inclusive. Mes futuro: 0. Fechas locales construidas con números (sin
 *  parsear strings). */
export function diasOperativos(anio: number, mes: number, hoy: Date = new Date()): number {
  const actual = hoy.getFullYear() * 100 + (hoy.getMonth() + 1);
  const periodo = anio * 100 + mes;
  if (periodo > actual) return 0;
  const ultimoDia = periodo === actual ? hoy.getDate() : new Date(anio, mes, 0).getDate();
```
REEMPLAZAR:
```
/** Días operativos de un mes para el promedio de ops por día: días del mes
 *  sin domingos (sin calendario de feriados). Mes en curso: solo hasta hoy
 *  inclusive, con el "hoy" de Argentina (frente lazy-fechas, FE3). Mes
 *  futuro: 0. Fechas locales construidas con números (sin parsear strings). */
export function diasOperativos(anio: number, mes: number, hoy: Date = new Date()): number {
  const h = partesFecha(hoyNegocio(hoy));
  const actual = h.anio * 100 + h.mes;
  const periodo = anio * 100 + mes;
  if (periodo > actual) return 0;
  const ultimoDia = periodo === actual ? h.dia : new Date(anio, mes, 0).getDate();
```

1.3 BUSCAR:
```
/** Período "últimos 12 meses" (incluye el mes actual). */
export function ultimos12Meses(hoy: Date = new Date()): PeriodoFiltro {
  const hasta = { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 };
```
REEMPLAZAR:
```
/** Período "últimos 12 meses" (incluye el mes actual). El mes actual sale del
 *  "hoy" de Argentina (frente lazy-fechas, FE3); `hoy` es el instante de
 *  referencia (por defecto, ahora). */
export function ultimos12Meses(hoy: Date = new Date()): PeriodoFiltro {
  const actual = partesFecha(hoyNegocio(hoy));
  const hasta = { anio: actual.anio, mes: actual.mes };
```


## PASO 2 — src/app/shared/filtro-periodo/filtro-periodo.component.ts

2.1 BUSCAR:
```
import { PeriodoFiltro } from "src/app/interfaces/periodo-filtro";
```
REEMPLAZAR:
```
import { PeriodoFiltro } from "src/app/interfaces/periodo-filtro";
import { hoyNegocio, partesFecha } from "src/app/shared/utils/fecha.util";
import { ultimos12Meses } from "src/app/shared/utils/periodo.util";
```

2.2 BUSCAR:
```
  tipo: "ultimos-12" | "anio" | "rango" = "ultimos-12";

  anio = new Date().getFullYear();

  desdeMes = 1;
  desdeAnio = this.anio;

  hastaMes = new Date().getMonth() + 1;
  hastaAnio = this.anio;
```
REEMPLAZAR:
```
  tipo: "ultimos-12" | "anio" | "rango" = "ultimos-12";

  // Año y mes actuales según el "hoy" de Argentina (frente lazy-fechas, FE3).
  private readonly actual = partesFecha(hoyNegocio());

  anio = this.actual.anio;

  desdeMes = 1;
  desdeAnio = this.anio;

  hastaMes = this.actual.mes;
  hastaAnio = this.anio;
```

2.3 BUSCAR:
```
    if (this.tipo === "ultimos-12") {
      const hoy = new Date();

      hasta = {
        anio: hoy.getFullYear(),
        mes: hoy.getMonth() + 1,
      };

      const desdeDate = new Date(hoy);
      desdeDate.setMonth(desdeDate.getMonth() - 11);

      desde = {
        anio: desdeDate.getFullYear(),
        mes: desdeDate.getMonth() + 1,
      };
    } else if (this.tipo === "anio") {
```
REEMPLAZAR:
```
    if (this.tipo === "ultimos-12") {
      // Misma cuenta que el período por defecto de Reportes (ultimos12Meses).
      // Antes se restaban 11 meses con setMonth sobre la fecha de hoy: un 31
      // (o un 29/30 hacia febrero) desbordaba al mes siguiente y "desde"
      // quedaba un mes corrido.
      const periodo = ultimos12Meses();
      desde = periodo.desde;
      hasta = periodo.hasta;
    } else if (this.tipo === "anio") {
```

## PASO 3 — Prueba en Node (no modifica el repo)

Compilá los dos utils a una carpeta temporal FUERA del repo y corré la
prueba. Usá `--skipLibCheck` (lección de FE1).

```
D=<carpeta temporal fuera del repo>
npx tsc src/app/shared/utils/periodo.util.ts src/app/shared/utils/fecha.util.ts --outDir "$D" --rootDir . --baseUrl . --module commonjs --target ES2022 --strict --skipLibCheck
```

Creá `$D/prueba-fe3.js` con este contenido exacto:

```
const { ultimos12Meses, diasOperativos } = require('./src/app/shared/utils/periodo.util.js');
const fmt=p=>`${p.desde.anio}-${p.desde.mes} → ${p.hasta.anio}-${p.hasta.mes}`;
const casos=[['2026-10-31T15:00:00-03:00','2025-11 → 2026-10'],['2026-12-31T23:30:00-03:00','2026-1 → 2026-12'],['2026-03-31T12:00:00-03:00','2025-4 → 2026-3'],['2026-05-31T10:00:00-03:00','2025-6 → 2026-5'],['2026-01-15T12:00:00-03:00','2025-2 → 2026-1']];
let f=0; for (const [i,e] of casos){ const r=fmt(ultimos12Meses(new Date(i))); if(r!==e)f++; console.log(r===e?'OK   ':'FALLA', i.slice(0,16), r); }
const d=[[2026,10,'2026-10-13T23:30:00-03:00',11],[2026,10,'2026-10-13T00:30:00-03:00',11],[2026,11,'2026-10-13T12:00:00-03:00',0],[2026,9,'2026-10-13T12:00:00-03:00',26]];
for (const [a,m,i,e] of d){ const r=diasOperativos(a,m,new Date(i)); if(r!==e)f++; console.log(r===e?'OK   ':'FALLA','diasOperativos',a,m,i.slice(0,16),r); }
console.log(f?'FALLAS '+f:'TODO OK');
```

Corré (NODE_PATH apunta a `$D`, para que resuelva los imports
`src/app/...`):
```
NODE_PATH="$D" node "$D/prueba-fe3.js"
```
Esperado: 9 líneas OK y `TODO OK`. Si querés, repetí con otro huso. En
Windows, si `TZ=` no toma efecto, fijalo dentro del proceso como en FE1.
El resultado tiene que ser el mismo. Borrá `$D` al terminar.

## Verificación

1. Greps (reportá la salida):
```
grep -n "setMonth\|new Date()" src/app/shared/filtro-periodo/filtro-periodo.component.ts
grep -n "getFullYear\|getMonth\|getDate" src/app/shared/utils/periodo.util.ts
git diff --numstat -- src
git diff -U0 -- src | grep -n "^+.* $"
```
Esperado:
- (a) solo la línea del comentario nuevo que explica el bug ("Antes se
  restaban 11 meses con setMonth…");
- (b) solo `new Date(anio, mes, 0).getDate()` dentro de `diasOperativos`.
  Es el último día de un mes PASADO, construido con números: correcto;
- (c) filtro-periodo.component.ts `14	16`, periodo.util.ts `11	6`;
- (d) nada.

2. `npm run build:demo`. Reportá la tabla de tamaños y las advertencias.
   Referencia: sin cambios (main ≈ 1,10 MB; Initial total ≈ 1,53 MB) y
   las mismas 9 advertencias.

## Pruebas manuales en demo (las hace Nico)

1. **Reportes → Resumen general:**
   - al entrar, el período por defecto es "Últimos 12 meses" (11/2025 a
     10/2026 en octubre);
   - cambiar a "Año" y volver a "Últimos 12 meses": tiene que dar
     exactamente el mismo rango y los mismos totales que al entrar;
   - en "Año" y "Rango", el año y el mes por defecto son los actuales.
2. **Reportes → Resumen por entidad:** lo mismo, con una entidad
   cualquiera.
3. **Ops/día del mes en curso:** el promedio usa los días transcurridos
   hasta hoy sin domingos. En octubre, al 13/10, son 11.
4. Exportar a Excel/PDF un resumen de "Últimos 12 meses": el título y las
   columnas coinciden con la pantalla.

## Mensaje de commit

```
FE3 (lazy-fechas): "Últimos 12 meses" y hoy de Argentina en Reportes

- filtro-periodo: la opción "Últimos 12 meses" usa ultimos12Meses() (antes
  restaba 11 meses con setMonth y los días 31 desbordaban al mes
  siguiente: el rango quedaba de 11 meses). Año/mes por defecto desde
  hoyNegocio().
- periodo.util: ultimos12Meses y diasOperativos toman año/mes/día de
  hoyNegocio(hoy) (huso de Argentina, D2); firmas sin cambio.
```

FIN DE LA INSTRUCCIÓN FE3
````
