````
Si no ves la línea FIN DE LA INSTRUCCIÓN FE5a al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN FE5a — Frente Lazy loading + fechas (ApLog, rama refactor)
======================================================================
Consolidación de fechas (1/2): días entre fechas y validación de formato

## Contexto y razonamiento

FE5 consolida las funciones de fecha repetidas en un solo lugar,
fecha.util (decisión D4). Se parte en dos bloques:
- **FE5a (este):** días entre fechas y validación de 'YYYY-MM-DD'.
  Finanzas y la emisión de informes.
- **FE5b:** formato 'DD/MM/AAAA', último día del mes, generadores de
  /migracion, ramas muertas de `normalizarFecha` y nombres de archivo de
  Excel.

**Qué cambia en este bloque:**

| Lugar | Antes | Ahora |
|---|---|---|
| finanzas.util | re-export temporal de `diasEntre` (FE1) | se saca; sus 7 importadores importan de fecha.util |
| cuenta-entidad.util, cuentas-finanzas.util | `diasDesde` local (igual en los dos) | `diasEntreONulo` (nuevo en fecha.util) |
| resumen-finanzas.util | `diasSeguros` local (el mismo código) | `diasEntreONulo` |
| registrar-movimiento, registrar-ajuste, imputar-saldo | `try { diasEntre(...) } catch { null }` | `diasEntreONulo` |
| movimiento-fin.util | `FORMATO_FECHA` propio (7 validaciones) | `esFechaNegocio` |
| informe-liq.service (`validarFechaEmision`) | regex + `Date.UTC` + `toISOString` | `esFechaNegocio` |

**`diasEntreONulo(desde, hasta)`:** igual que `diasEntre`, pero devuelve
null (sin lanzar) si falta alguna fecha o no es válida. Es exactamente lo
que hacían las tres funciones locales y los tres try/catch.

**`esFechaNegocio` en movimiento-fin:** la regex vieja solo miraba el
formato y aceptaba '2026-02-30'.
- En las validaciones de alta, ajuste e imputación, ahora esa fecha da
  "Fecha inválida." en vez de pasar.
- En `validarRangoMovimientos` corrige un caso que tiraba una excepción:
  '2026-02-30' pasaba la regex y después `diasEntre` (que desde FE1 valida
  el calendario) lanzaba. Ahora devuelve "Elegí las dos fechas del rango.".
- Con el selector de fecha del navegador no se puede elegir una fecha así:
  no hay cambio visible en el uso normal.

**`validarFechaEmision`:** el chequeo viejo (formato + ida y vuelta por
`Date.UTC`) es equivalente a `esFechaNegocio`. Mismo mensaje.

**Verificación previa:**
- Node, 12 casos bajo 3 husos (Argentina, UTC y Tokio): todos OK.
- `tsc` limpio. `build:demo` limpio, con las 9 advertencias y los tamaños
  sin cambio (main ≈ 1,10 MB; Initial total ≈ 1,53 MB).

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
- **Borrado por RANGO** (igual que en LR2): se borra desde INICIO
  (inclusive) hasta la línea anterior a ANCLA (ANCLA se queda). Las dos se
  identifican por cómo EMPIEZA la línea. Antes de borrar, verificá que
  cada prefijo sea único en el archivo, que ANCLA esté después de INICIO y
  que la distancia sea exactamente la indicada. Si algo no coincide,
  detenete y reportá sin borrar.

## PASO 0 — Verificación (sin modificar nada)

Corré y reportá la salida:

```
grep -rn "diasEntre\|FORMATO_FECHA\|function diasDesde\|function diasSeguros" src --include=*.ts
grep -n "Date.UTC" src/app/servicios/informes-liq/informe-liq.service.ts
grep -rn "diasEntreONulo" src --include=*.ts
```

Esperado:
1. Exactamente 30 líneas:
   - cuenta-entidad.util: 6, 47 y 50;
   - movimiento-fin.util: 8, 42, 94, 104, 271, 273, 515, 649 y 687;
   - fecha.util: 88 (la definición de `diasEntre`);
   - resumen-finanzas.util: 6, 326 y 329;
   - finanzas.util: 117 (el re-export);
   - cuentas-finanzas.util: 5, 88 y 91;
   - legajo.ts: 1 y 75 (ya importa de fecha.util; no se toca);
   - registrar-movimiento: 20 y 264;
   - registrar-ajuste: 13 y 189;
   - imputar-saldo: 15 y 185.
2. informe-liq.service: solo la línea 955.
3. `diasEntreONulo`: nada (todavía no existe).

Si algo no coincide, detenete y reportá.

## PASO 1 — src/app/shared/utils/fecha.util.ts

1.1 BUSCAR:
```
  const msB = Date.UTC(b.anio, b.mes - 1, b.dia);
  return Math.round((msB - msA) / MS_DIA);
}
```
REEMPLAZAR:
```
  const msB = Date.UTC(b.anio, b.mes - 1, b.dia);
  return Math.round((msB - msA) / MS_DIA);
}

/** Como diasEntre, pero devuelve null (sin lanzar) si falta alguna de las
 *  dos fechas o no es válida. Para tablas y alertas: un dato roto no corta
 *  el armado de toda la lista (FE5). */
export function diasEntreONulo(
  desde: string | null | undefined,
  hasta: string | null | undefined,
): number | null {
  if (!esFechaNegocio(desde) || !esFechaNegocio(hasta)) return null;
  return diasEntre(desde, hasta);
}
```


## PASO 2 — src/app/shared/utils/finanzas.util.ts

2.1 BUSCAR:
```
// FE1 (frente lazy-fechas): el cálculo de días entre fechas vive en
// fecha.util. Este re-export es temporal para no tocar a quienes lo importan
// desde acá; FE5 los apunta a fecha.util y lo saca.
export { diasEntre } from 'src/app/shared/utils/fecha.util';

export type TramoAntiguedad = '0-30' | '31-60' | '61-90' | '90+';
```
REEMPLAZAR:
```
export type TramoAntiguedad = '0-30' | '31-60' | '61-90' | '90+';
```


## PASO 3 — src/app/shared/utils/cuenta-entidad.util.ts

3.1 BUSCAR:
```
import {
  TRAMOS_ANTIGUEDAD, TramoAntiguedad, diasEntre, esCero, normalizarValoresFinancieros, redondear2, tramoAntiguedad,
} from 'src/app/shared/utils/finanzas.util';
```
REEMPLAZAR:
```
import { diasEntreONulo } from 'src/app/shared/utils/fecha.util';
import {
  TRAMOS_ANTIGUEDAD, TramoAntiguedad, esCero, normalizarValoresFinancieros, redondear2, tramoAntiguedad,
} from 'src/app/shared/utils/finanzas.util';
```

Borra la función local `diasDesde` completa y la línea en blanco que la sigue.

3.2 RANGO (9 líneas).
- INICIO: la línea que empieza con (0 espacios de sangría):
```
function diasDesde(
```
- ANCLA (se queda): la línea que empieza con (0 espacios de sangría):
```
/** Filas de Comprobantes:
```

3.3 BUSCAR:
```
        dias: liq.estado === 'facturado' && !esCero(vf.saldo) ? diasDesde(fechaBaseAntiguedad(liq), hoy) : null,
```
REEMPLAZAR:
```
        dias: liq.estado === 'facturado' && !esCero(vf.saldo) ? diasEntreONulo(fechaBaseAntiguedad(liq), hoy) : null,
```

3.4 BUSCAR:
```
    const dias = diasDesde(fechaBaseAntiguedad(liq), hoy);
```
REEMPLAZAR:
```
    const dias = diasEntreONulo(fechaBaseAntiguedad(liq), hoy);
```


## PASO 4 — src/app/shared/utils/cuentas-finanzas.util.ts

4.1 BUSCAR:
```
import {
  TRAMOS_ANTIGUEDAD, TramoAntiguedad, diasEntre, esCero, normalizarValoresFinancieros, redondear2, tramoAntiguedad,
} from 'src/app/shared/utils/finanzas.util';
```
REEMPLAZAR:
```
import { diasEntreONulo } from 'src/app/shared/utils/fecha.util';
import {
  TRAMOS_ANTIGUEDAD, TramoAntiguedad, esCero, normalizarValoresFinancieros, redondear2, tramoAntiguedad,
} from 'src/app/shared/utils/finanzas.util';
```

Borra la función local `diasDesde` con su comentario y la línea en blanco que la sigue.

4.2 RANGO (11 líneas).
- INICIO: la línea que está 2 líneas ARRIBA de la que empieza con (0 espacios de sangría):
```
function diasDesde(
```
  (es la apertura `/**` de su comentario de documentación).
- ANCLA (se queda): la línea que empieza con (0 espacios de sangría):
```
/** Arma una fila por entidad a partir de:
```

4.3 BUSCAR:
```
      const dias = diasDesde(fechaBaseAntiguedad(liq), hoy);
```
REEMPLAZAR:
```
      const dias = diasEntreONulo(fechaBaseAntiguedad(liq), hoy);
```


## PASO 5 — src/app/shared/utils/resumen-finanzas.util.ts

5.1 BUSCAR:
```
import { diasEntre, esCero, normalizarValoresFinancieros, redondear2 } from 'src/app/shared/utils/finanzas.util';
```
REEMPLAZAR:
```
import { diasEntreONulo } from 'src/app/shared/utils/fecha.util';
import { esCero, normalizarValoresFinancieros, redondear2 } from 'src/app/shared/utils/finanzas.util';
```

5.2 BUSCAR:
```
    const dias = diasSeguros(m.fecha, hoy);
```
REEMPLAZAR:
```
    const dias = diasEntreONulo(m.fecha, hoy);
```

5.3 BUSCAR:
```
    const dias = diasSeguros(liq.fechaEmision ?? liq.fechaCreacion, hoy);
```
REEMPLAZAR:
```
    const dias = diasEntreONulo(liq.fechaEmision ?? liq.fechaCreacion, hoy);
```

5.4 BUSCAR:
```
function pesos(v: number): string {
  return `$ ${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function diasSeguros(fecha: string | null | undefined, hoy: string): number | null {
  if (!fecha) return null;
  try {
    return diasEntre(fecha, hoy);
  } catch {
    return null;
  }
}
```
REEMPLAZAR:
```
function pesos(v: number): string {
  return `$ ${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
```


## PASO 6 — src/app/shared/utils/movimiento-fin.util.ts

6.1 BUSCAR:
```
import {
  AcumuladoFinanciero, diasEntre, esCero, importesIguales, redondear2, totalMedios, TOLERANCIA_IMPORTE,
} from 'src/app/shared/utils/finanzas.util';
```
REEMPLAZAR:
```
import { diasEntre, esFechaNegocio } from 'src/app/shared/utils/fecha.util';
import {
  AcumuladoFinanciero, esCero, importesIguales, redondear2, totalMedios, TOLERANCIA_IMPORTE,
} from 'src/app/shared/utils/finanzas.util';
```

Borra la constante `FORMATO_FECHA` y la línea en blanco que la sigue.

6.2 RANGO (2 líneas).
- INICIO: la línea que empieza con (0 espacios de sangría):
```
const FORMATO_FECHA
```
- ANCLA (se queda): la línea que empieza con (0 espacios de sangría):
```
/** Cliente → cobro
```

6.3 BUSCAR:
```
  if (!FORMATO_FECHA.test(d.fecha)) return 'Fecha inválida.';
  if (d.fecha > hoy) return 'La fecha no puede ser futura (un cheque diferido lleva su fecha de cobro en el medio).';
```
REEMPLAZAR:
```
  if (!esFechaNegocio(d.fecha)) return 'Fecha inválida.';
  if (d.fecha > hoy) return 'La fecha no puede ser futura (un cheque diferido lleva su fecha de cobro en el medio).';
```

6.4 BUSCAR:
```
    if (m.fechaCobro !== null && !FORMATO_FECHA.test(m.fechaCobro)) return 'Fecha de cobro del cheque inválida.';
```
REEMPLAZAR:
```
    if (m.fechaCobro !== null && !esFechaNegocio(m.fechaCobro)) return 'Fecha de cobro del cheque inválida.';
```

6.5 BUSCAR:
```
  if (!FORMATO_FECHA.test(desde ?? '') || !FORMATO_FECHA.test(hasta ?? '')) return 'Elegí las dos fechas del rango.';
```
REEMPLAZAR:
```
  if (!esFechaNegocio(desde) || !esFechaNegocio(hasta)) return 'Elegí las dos fechas del rango.';
```

6.6 BUSCAR:
```
  if (!FORMATO_FECHA.test(d.fecha)) return 'Fecha inválida.';
  if (d.fecha > hoy) return 'La fecha no puede ser futura.';
  if (d.imputaciones.length === 0) return 'Elegí al menos un comprobante a ajustar.';
```
REEMPLAZAR:
```
  if (!esFechaNegocio(d.fecha)) return 'Fecha inválida.';
  if (d.fecha > hoy) return 'La fecha no puede ser futura.';
  if (d.imputaciones.length === 0) return 'Elegí al menos un comprobante a ajustar.';
```

6.7 BUSCAR:
```
  if (!FORMATO_FECHA.test(fecha)) return 'Fecha inválida.';
```
REEMPLAZAR:
```
  if (!esFechaNegocio(fecha)) return 'Fecha inválida.';
```

6.8 BUSCAR:
```
  if (d.medio.fechaCobro !== null && !FORMATO_FECHA.test(d.medio.fechaCobro)) return 'Fecha de cobro del cheque inválida.';
```
REEMPLAZAR:
```
  if (d.medio.fechaCobro !== null && !esFechaNegocio(d.medio.fechaCobro)) return 'Fecha de cobro del cheque inválida.';
```


## PASO 7 — src/app/raiz/finanzas-nueva/modales/registrar-movimiento/registrar-movimiento.component.ts

7.1 BUSCAR:
```
import {
  diasEntre, distribuirFifo, esCero, normalizarValoresFinancieros, redondear2, TOLERANCIA_IMPORTE,
} from 'src/app/shared/utils/finanzas.util';
```
REEMPLAZAR:
```
import { diasEntreONulo } from 'src/app/shared/utils/fecha.util';
import {
  distribuirFifo, esCero, normalizarValoresFinancieros, redondear2, TOLERANCIA_IMPORTE,
} from 'src/app/shared/utils/finanzas.util';
```

7.2 BUSCAR:
```
    let dias: number | null = null;
    try { dias = diasEntre(base, this.hoy); } catch { dias = null; }
```
REEMPLAZAR:
```
    const dias = diasEntreONulo(base, this.hoy);
```


## PASO 8 — src/app/raiz/finanzas-nueva/modales/registrar-ajuste/registrar-ajuste.component.ts

8.1 BUSCAR:
```
import {
  TOLERANCIA_IMPORTE, diasEntre, normalizarValoresFinancieros, redondear2,
} from 'src/app/shared/utils/finanzas.util';
```
REEMPLAZAR:
```
import { diasEntreONulo } from 'src/app/shared/utils/fecha.util';
import {
  TOLERANCIA_IMPORTE, normalizarValoresFinancieros, redondear2,
} from 'src/app/shared/utils/finanzas.util';
```

8.2 BUSCAR:
```
    let dias: number | null = null;
    try { dias = diasEntre(base, this.hoy); } catch { dias = null; }
```
REEMPLAZAR:
```
    const dias = diasEntreONulo(base, this.hoy);
```


## PASO 9 — src/app/raiz/finanzas-nueva/modales/imputar-saldo/imputar-saldo.component.ts

9.1 BUSCAR:
```
import {
  diasEntre, distribuirFifo, esCero, normalizarValoresFinancieros, redondear2, TOLERANCIA_IMPORTE,
} from 'src/app/shared/utils/finanzas.util';
```
REEMPLAZAR:
```
import { diasEntreONulo } from 'src/app/shared/utils/fecha.util';
import {
  distribuirFifo, esCero, normalizarValoresFinancieros, redondear2, TOLERANCIA_IMPORTE,
} from 'src/app/shared/utils/finanzas.util';
```

9.2 BUSCAR:
```
    let dias: number | null = null;
    try { dias = diasEntre(base, this.hoy); } catch { dias = null; }
```
REEMPLAZAR:
```
    const dias = diasEntreONulo(base, this.hoy);
```


## PASO 10 — src/app/servicios/informes-liq/informe-liq.service.ts

10.1 BUSCAR:
```
import { estadoFinancieroDe, redondear2 } from 'src/app/shared/utils/finanzas.util';
```
REEMPLAZAR:
```
import { estadoFinancieroDe, redondear2 } from 'src/app/shared/utils/finanzas.util';
import { esFechaNegocio } from 'src/app/shared/utils/fecha.util';
```

10.2 BUSCAR:
```
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f ?? '');
    const valida = !!m &&
      new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toISOString().slice(0, 10) === f;
    if (!valida) return `Fecha de emisión inválida: '${f}' (se espera YYYY-MM-DD).`;
```
REEMPLAZAR:
```
    if (!esFechaNegocio(f)) return `Fecha de emisión inválida: '${f}' (se espera YYYY-MM-DD).`;
```

## PASO 11 — Prueba en Node (no modifica el repo)

Compilá los dos utils a una carpeta temporal FUERA del repo (como en FE3):

```
D=<carpeta temporal fuera del repo>
npx tsc src/app/shared/utils/movimiento-fin.util.ts src/app/shared/utils/fecha.util.ts --outDir "$D" --rootDir . --baseUrl . --module commonjs --target ES2022 --strict --skipLibCheck
```

Creá `$D/prueba-fe5a.js` con este contenido exacto:

```
const path = require('path');
const F = require(path.join(__dirname, 'src/app/shared/utils/fecha.util.js'));
const M = require(path.join(__dirname, 'src/app/shared/utils/movimiento-fin.util.js'));
let ok = 0, mal = 0;
function caso(nombre, obtenido, esperado) {
  const bien = JSON.stringify(obtenido) === JSON.stringify(esperado);
  bien ? ok++ : mal++;
  console.log(`${bien ? 'OK   ' : 'FALLA'} ${nombre}: ${JSON.stringify(obtenido)}${bien ? '' : ' (esperado ' + JSON.stringify(esperado) + ')'}`);
}
caso('diasEntreONulo 01/10 → 13/10', F.diasEntreONulo('2026-10-01', '2026-10-13'), 12);
caso('diasEntreONulo negativo', F.diasEntreONulo('2026-10-13', '2026-10-01'), -12);
caso('diasEntreONulo cruce de año', F.diasEntreONulo('2025-12-31', '2026-01-01'), 1);
caso('diasEntreONulo null', F.diasEntreONulo(null, '2026-10-13'), null);
caso('diasEntreONulo vacío', F.diasEntreONulo('2026-10-13', ''), null);
caso('diasEntreONulo 30/02', F.diasEntreONulo('2026-02-30', '2026-03-01'), null);
caso('diasEntreONulo ISO con hora', F.diasEntreONulo('2026-10-13T00:00:00.000Z', '2026-10-13'), null);
caso('rango válido', M.validarRangoMovimientos('2026-10-01', '2026-10-13'), null);
caso('rango con 30/02 (antes lanzaba)', M.validarRangoMovimientos('2026-02-30', '2026-03-10'), 'Elegí las dos fechas del rango.');
caso('rango vacío', M.validarRangoMovimientos('', '2026-10-13'), 'Elegí las dos fechas del rango.');
caso('rango undefined', M.validarRangoMovimientos(undefined, '2026-10-13'), 'Elegí las dos fechas del rango.');
caso('rango invertido', M.validarRangoMovimientos('2026-10-13', '2026-10-01'), 'La fecha "desde" es posterior a la fecha "hasta".');
console.log(mal === 0 ? `TODO OK (${ok})` : `${mal} FALLA(S)`);
process.exitCode = mal ? 1 : 0;
```

Corré (NODE_PATH apunta a `$D`, para que resuelva los imports
`src/app/...`):
```
NODE_PATH="$D" node "$D/prueba-fe5a.js"
```
Repetilo bajo los husos de Argentina, UTC y Tokio. En Windows, si `TZ=`
no toma efecto, fijalo dentro del proceso como en FE1. Esperado: 12 OK y
`TODO OK (12)` en los 3. Borrá `$D` al terminar.

## Verificación

1. Greps (reportá la salida):
```
grep -rn "diasDesde\|diasSeguros\|FORMATO_FECHA\|export { diasEntre" src --include=*.ts
grep -rln "\bdiasEntre\b" src --include=*.ts
grep -rn "diasEntreONulo" src --include=*.ts | wc -l
grep -n "Date.UTC" src/app/servicios/informes-liq/informe-liq.service.ts
git diff --numstat -- src
git diff -U0 -- src | grep -n "^+.* $"
```
Esperado:
- (a) nada.
- (b) solo 3 archivos: fecha.util.ts, movimiento-fin.util.ts (usa
  `diasEntre` después de validar el rango) y legajo.ts.
- (c) 15: la definición, 6 imports y 8 usos.
- (d) nada.
- (e) exactamente (agregadas / borradas):
  - imputar-saldo 3/3;
  - registrar-ajuste 3/3;
  - registrar-movimiento 3/3;
  - informe-liq.service 2/4;
  - cuenta-entidad.util 4/12;
  - cuentas-finanzas.util 3/13;
  - fecha.util 11/0;
  - finanzas.util 0/5;
  - movimiento-fin.util 8/9;
  - resumen-finanzas.util 4/12.
- (f) nada.

2. `npm run build:demo`. Reportá la tabla de tamaños y las advertencias.
   Referencia: sin cambios (main ≈ 1,10 MB; Initial total ≈ 1,53 MB) y
   las mismas 9 advertencias.

## Pruebas manuales en demo (las hace Nico)

No hay cambio visible esperado. Se verifica que todo lo que calcula días o
valida fechas en Finanzas siga igual.
1. **Finanzas → Resumen:** las alertas de anticipos sin compensar y de
   informes sin facturar muestran los mismos días que antes.
2. **Finanzas → Cuentas y Antigüedad:** mismos tramos y días.
3. **Cuenta de una entidad:** la columna de días de los comprobantes es
   la misma.
4. **Registrar un cobro o un pago, un ajuste y una imputación de saldo:**
   - la tabla de comprobantes muestra los días;
   - se registra bien con fecha de hoy;
   - un cheque con fecha de cobro se guarda bien.
5. **Finanzas → Movimientos:** filtrar por rango de fechas (y un rango
   mayor al máximo: tiene que dar el mensaje de siempre).
6. **Liquidación:** emitir un informe con fecha de emisión elegida a mano.
   Una fecha anterior al fin del período o posterior a hoy da el mismo
   mensaje que antes.

## Mensaje de commit

```
FE5a (lazy-fechas): días entre fechas y validación de formato en fecha.util

- NUEVO diasEntreONulo en fecha.util (null si falta una fecha o no es
  válida). Reemplaza a diasDesde (cuenta-entidad, cuentas-finanzas),
  diasSeguros (resumen-finanzas) y a los try/catch de registrar-movimiento,
  registrar-ajuste e imputar-saldo.
- Fuera el re-export temporal de diasEntre en finanzas.util; los
  importadores importan de fecha.util.
- movimiento-fin.util: FORMATO_FECHA → esFechaNegocio (valida el
  calendario; validarRangoMovimientos ya no lanza con '2026-02-30').
- informe-liq.service.validarFechaEmision: esFechaNegocio en vez de regex
  + Date.UTC (equivalente).
```

FIN DE LA INSTRUCCIÓN FE5a
````
