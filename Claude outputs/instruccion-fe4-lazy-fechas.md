````
Si no ves la línea FIN DE LA INSTRUCCIÓN FE4 al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN FE4 — Frente Lazy loading + fechas (ApLog, rama refactor)
=====================================================================
"Hoy" por defecto, cambiarDia, Registro viejo y año del informe viejo

## Contexto y razonamiento

Este bloque corrige los usos de "hoy" y de fechas de negocio que quedaban
con el patrón incorrecto. Todos usan las funciones de fecha.util (FE1).

| Lugar | Antes | Efecto | Ahora |
|---|---|---|---|
| registro-log (FV4) | rango por defecto con `hoy.toISOString()` | desde las 21:00, "hasta" queda en mañana y "desde" pierde un día | `hoyNegocio()` y `sumarDias(hoy, -7)` |
| papelera (FV4) | lo mismo + `setMonth(-1)` | lo mismo; además, un 31/03 "un mes atrás" da 03/03 | `hoyNegocio()` y `sumarDias(hoy, -30)` |
| baja-objeto (FV5) | `fecha = new Date().toISOString()…` | desde las 21:00, el modal de baja muestra la fecha de mañana | `hoyNegocio()` |
| tablero-asignaciones `cambiarDia` (FL1) | `new Date(str)` + `setDate` + `toISOString` | da bien porque se compensan dos corrimientos UTC, pero es frágil | `sumarDias(fecha, ±1)` |
| liq-gral (FL6) | `date`, `primerDia`, `ultimoDia` | campos sin ningún uso (ni en el template) | se borran |
| Registro viejo (`logs`, D5) | consulta con `new Date('YYYY-MM-DD').getTime()` | el rango va de las 21:00 del día anterior a las 21:00 de "hasta" | de las 00:00 (hora local) de "desde" a las 00:00 del día siguiente a "hasta" |
| Registro viejo: rango por defecto y selección | `toISOString()` | lo mismo que registro-log | `hoyNegocio()` y `fechaNegocioDe(...)` |
| Excel y PDF del InformeLiq viejo (Papelera legado) | `new Date(informeLiq.fecha).getFullYear()` | un informe del 1/1 muestra el año anterior | nueva función `anioDe(fecha)`, que toma el año del string |

**Notas:**
- **papelera:** "último mes" pasa a "últimos 30 días". Restar meses con
  `setMonth` desborda los días 31; 30 días es una ventana estable. Se
  aclara en su comentario.
- **Registro viejo:**
  - el "hasta" por defecto pasa de mañana a hoy. Antes se ponía mañana
    para compensar el corrimiento;
  - ahora la consulta incluye completo el día "hasta", tanto en el rango
    por defecto como en el elegido a mano;
  - el bloque comentado de `consultarRangoManual` no se toca.
- **`anioDe`** (nuevo en fecha.util): el campo `InformeLiq.fecha` viejo es
  `Date | string`.
  - Si es un string 'YYYY-MM-DD…', toma el año del string;
  - si es un Date, toma el año local;
  - si es otra cosa, devuelve null y el título muestra el año vacío. Antes
    mostraba `NaN`.
- **Quedan para FE5:** los nombres de archivo de Excel que usan
  `toISOString()` (excel.service, 2 lugares).

**Verificación previa:**
- Node, 10 casos bajo 3 husos: todos OK.
  - `anioDe` con string, string con hora, Date, vacío, null, basura y Date
    inválida.
  - Rango del Registro: exactamente 24 h, de 00:00 a 00:00 en hora local.
  - Un log de las 23:30 del 13/10 queda adentro; uno de las 21:30 del 12/10
    queda afuera.
  - Con el código viejo, `new Date('2026-01-01').getFullYear()` en
    Argentina da 2025.
- `tsc` limpio. `build:demo` limpio, con las 9 advertencias y los tamaños
  sin cambio.

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
grep -n "toISOString()\.\(split\|slice\)\|new Date(informeLiq.fecha)\|new Date(this.fechasConsulta" src/app/raiz/ajustes/registro-log/registro-log.component.ts src/app/raiz/ajustes/papelera/papelera.component.ts src/app/shared/modales/baja-objeto/baja-objeto.component.ts src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.ts src/app/raiz/liquidacion/liq-gral/liq-gral.component.ts src/app/raiz/ajustes/registro/registro.component.ts src/app/servicios/informes/excel/excel.service.ts src/app/servicios/informes/pdf/pdf.service.ts
grep -rn "primerDia\|ultimoDia\|\bdate\b" src/app/raiz/liquidacion/liq-gral/
grep -rn "anioDe" src --include=*.ts
```

Esperado:
1. Exactamente 20 líneas:
   - registro-log:69 y 70;
   - papelera:78 y 79;
   - baja-objeto:24;
   - tablero-asignaciones:206;
   - liq-gral:32 y 33;
   - registro: 71, 72, 91, 96, 114, 115, 139 y 141 (114 y 115 están dentro
     de un bloque comentado y no se tocan);
   - excel.service: 87, 706 y 843 (706 y 843 quedan para FE5);
   - pdf.service:76.
2. liq-gral.component.ts:
   - la línea 3 (el import de `date-range.service`; matchea por el nombre
     del archivo);
   - las líneas 31 a 33 (`date`, `primerDia`, `ultimoDia`).
   Ningún uso en el .html.
3. `anioDe`: nada (todavía no existe).

Si algo no coincide, detenete y reportá.

## PASO 1 — src/app/shared/utils/fecha.util.ts

1.1 BUSCAR:
```
  return conHora ? `${fecha} ${v('hour')}:${v('minute')}` : fecha;
}
```
REEMPLAZAR:
```
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
```


## PASO 2 — src/app/raiz/ajustes/registro-log/registro-log.component.ts

2.1 BUSCAR:
```
import { Component, OnInit } from '@angular/core';
```
REEMPLAZAR:
```
import { Component, OnInit } from '@angular/core';
import { hoyNegocio, sumarDias } from 'src/app/shared/utils/fecha.util';
```

2.2 BUSCAR:
```
  private calcularRangoDefault(): void {
    const hoy = new Date();
    const haceUnaSemana = new Date(hoy);
    haceUnaSemana.setDate(hoy.getDate() - 7);
    this.fechaHasta = hoy.toISOString().split('T')[0];
    this.fechaDesde = haceUnaSemana.toISOString().split('T')[0];
  }
```
REEMPLAZAR:
```
  private calcularRangoDefault(): void {
    // FE4 (lazy-fechas): hoy de Argentina. Con toISOString, desde las 21:00
    // "hasta" quedaba en mañana y "desde" perdía un día.
    const hoy = hoyNegocio();
    this.fechaHasta = hoy;
    this.fechaDesde = sumarDias(hoy, -7);
  }
```


## PASO 3 — src/app/raiz/ajustes/papelera/papelera.component.ts

3.1 BUSCAR:
```
import { Component, OnInit } from '@angular/core';
```
REEMPLAZAR:
```
import { Component, OnInit } from '@angular/core';
import { hoyNegocio, sumarDias } from 'src/app/shared/utils/fecha.util';
```

3.2 BUSCAR:
```
  /** Default: último mes — rango más amplio que Registro Log porque una baja
   *  suele consultarse bastante después del hecho. */
  private calcularRangoDefault(): void {
    const hoy = new Date();
    const haceUnMes = new Date(hoy);
    haceUnMes.setMonth(hoy.getMonth() - 1);
    this.fechaHasta = hoy.toISOString().split('T')[0];
    this.fechaDesde = haceUnMes.toISOString().split('T')[0];
  }
```
REEMPLAZAR:
```
  /** Default: últimos 30 días — rango más amplio que Registro Log porque una
   *  baja suele consultarse bastante después del hecho. FE4 (lazy-fechas): hoy
   *  de Argentina y resta en días (antes, toISOString corría el rango desde las
   *  21:00 y setMonth desbordaba los días 31). */
  private calcularRangoDefault(): void {
    const hoy = hoyNegocio();
    this.fechaHasta = hoy;
    this.fechaDesde = sumarDias(hoy, -30);
  }
```


## PASO 4 — src/app/shared/modales/baja-objeto/baja-objeto.component.ts

4.1 BUSCAR:
```
import Swal from 'sweetalert2';
```
REEMPLAZAR:
```
import Swal from 'sweetalert2';
import { hoyNegocio } from 'src/app/shared/utils/fecha.util';
```

4.2 Reemplazá la línea COMPLETA que contiene:
```
  fecha = new Date().toISOString().split('T')[0];;
```
por:
```
  fecha = hoyNegocio(); // FE4: hoy de Argentina (antes, desde las 21:00 mostraba mañana)
```


## PASO 5 — src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.ts

5.1 BUSCAR:
```
import { ModalObjetosActivosComponent } from 'src/app/raiz/operaciones/modal-objetos-activos/modal-objetos-activos.component';
```
REEMPLAZAR:
```
import { ModalObjetosActivosComponent } from 'src/app/raiz/operaciones/modal-objetos-activos/modal-objetos-activos.component';
import { sumarDias } from 'src/app/shared/utils/fecha.util';
```

5.2 BUSCAR:
```
  cambiarDia(direccion: number): void {
    if (!this.fechaSeleccionada) return;
    const d = new Date(this.fechaSeleccionada);
    d.setDate(d.getDate() + direccion);
    this.fechaSeleccionada = d.toISOString().split('T')[0];
    this.onFechaSeleccionadaChange();
  }
```
REEMPLAZAR:
```
  cambiarDia(direccion: number): void {
    if (!this.fechaSeleccionada) return;
    // FE4 (lazy-fechas): suma sobre el string 'YYYY-MM-DD', sin depender del
    // huso (antes se compensaban dos corrimientos UTC: daba bien, pero frágil).
    this.fechaSeleccionada = sumarDias(this.fechaSeleccionada, direccion);
    this.onFechaSeleccionadaChange();
  }
```


## PASO 6 — src/app/raiz/liquidacion/liq-gral/liq-gral.component.ts

6.1 Borrá la línea COMPLETA que contiene:
```
  date:any = new Date();
```
por:
```
(borrar la línea)
```

6.2 Borrá la línea COMPLETA que contiene:
```
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() , 1).toISOString().split('T')[0];
```
por:
```
(borrar la línea)
```

6.3 Borrá la línea COMPLETA que contiene:
```
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];
```
por:
```
(borrar la línea)
```


## PASO 7 — src/app/raiz/ajustes/registro/registro.component.ts

7.1 BUSCAR:
```
import { LogEntry } from 'src/app/interfaces/log-entry';
```
REEMPLAZAR:
```
import { LogEntry } from 'src/app/interfaces/log-entry';
import { fechaNegocioDe, hoyNegocio, sumarDias } from 'src/app/shared/utils/fecha.util';
```

7.2 BUSCAR:
```
    let desde = new Date(this.fechasConsulta.fechaDesde).getTime();
    let hasta = new Date(this.fechasConsulta.fechaHasta).getTime();
```
REEMPLAZAR:
```
    // FE4 (lazy-fechas): los logs viejos guardan `timestamp` en ms. El rango va
    // de las 00:00 (hora local) de "desde" a las 00:00 del día siguiente a
    // "hasta", así incluye completo el último día. Antes se parseaba el string
    // solo-fecha, que da las 00:00 UTC (21:00 del día anterior en Argentina).
    let desde = new Date(this.fechasConsulta.fechaDesde + 'T00:00:00').getTime();
    let hasta = new Date(sumarDias(this.fechasConsulta.fechaHasta, 1) + 'T00:00:00').getTime();
```

7.3 BUSCAR:
```
    const today = new Date();
    this.fechasConsulta.fechaDesde = today.toISOString().split('T')[0];
    const tomorrow = new Date(today);
    // Incrementar un día al objeto "tomorrow"
    tomorrow.setDate(tomorrow.getDate() + 1);

    this.fechasConsulta.fechaHasta = tomorrow.toISOString().split('T')[0];
```
REEMPLAZAR:
```
    // FE4: hoy de Argentina. "hasta" es hoy: la consulta ya incluye el día
    // completo (antes se ponía mañana para compensar).
    const hoy = hoyNegocio();
    this.fechasConsulta.fechaDesde = hoy;
    this.fechasConsulta.fechaHasta = hoy;
```

7.4 BUSCAR:
```
    this.fechasConsulta.fechaDesde = new Date(this.fromDate.year, this.fromDate.month - 1, this.fromDate.day).toISOString().split('T')[0];
```
REEMPLAZAR:
```
    this.fechasConsulta.fechaDesde = fechaNegocioDe(new Date(this.fromDate.year, this.fromDate.month - 1, this.fromDate.day));
```

7.5 BUSCAR:
```
      this.fechasConsulta.fechaHasta = new Date(this.toDate.year, this.toDate.month - 1, this.toDate.day).toISOString().split('T')[0];
```
REEMPLAZAR:
```
      this.fechasConsulta.fechaHasta = fechaNegocioDe(new Date(this.toDate.year, this.toDate.month - 1, this.toDate.day));
```


## PASO 8 — src/app/servicios/informes/excel/excel.service.ts

8.1 BUSCAR:
```
import { InformeLiq } from "src/app/interfaces/informe-liq";
```
REEMPLAZAR:
```
import { InformeLiq } from "src/app/interfaces/informe-liq";
import { anioDe } from "src/app/shared/utils/fecha.util";
```

8.2 BUSCAR:
```
    subTitleCell.value = `Año: ${new Date(informeLiq.fecha).getFullYear()} Mes: ${informeLiq.mes} - Periodo Liquidado: ${periodo}`;
```
REEMPLAZAR:
```
    subTitleCell.value = `Año: ${anioDe(informeLiq.fecha) ?? ''} Mes: ${informeLiq.mes} - Periodo Liquidado: ${periodo}`;
```


## PASO 9 — src/app/servicios/informes/pdf/pdf.service.ts

9.1 BUSCAR:
```
import { InformeLiq } from "src/app/interfaces/informe-liq";
```
REEMPLAZAR:
```
import { InformeLiq } from "src/app/interfaces/informe-liq";
import { anioDe } from "src/app/shared/utils/fecha.util";
```

9.2 BUSCAR:
```
    const fechaFactura = new Date(informeLiq.fecha);
    const periodo = informeLiq.periodo;
    const anio = fechaFactura.getFullYear();
```
REEMPLAZAR:
```
    const periodo = informeLiq.periodo;
    // FE4 (lazy-fechas): año tomado del string 'YYYY-MM-DD' (antes, el 1/1
    // daba el año anterior por el corrimiento UTC).
    const anio = anioDe(informeLiq.fecha) ?? '';
```

## PASO 10 — Prueba en Node (no modifica el repo)

Compilá fecha.util a una carpeta temporal FUERA del repo y corré la prueba
(`--skipLibCheck`; si `TZ=` no toma efecto en Windows, fijalo dentro del
proceso como en FE1):

```
npx tsc src/app/shared/utils/fecha.util.ts --outDir <tmp> --module commonjs --target ES2022 --strict --skipLibCheck
```

Creá `<tmp>/prueba-fe4.js` con este contenido exacto:

```
const f = require('./fecha.util.js');
let fallas = 0;
const ok = (d, r, e) => { const b = JSON.stringify(r) === JSON.stringify(e); if (!b) fallas++; console.log(`${b ? 'OK   ' : 'FALLA'} ${d} -> ${JSON.stringify(r)}`); };
ok("anioDe('2026-01-01')", f.anioDe('2026-01-01'), 2026);
ok("anioDe('2025-12-31T23:00:00')", f.anioDe('2025-12-31T23:00:00'), 2025);
ok('anioDe(new Date(2026, 0, 1))', f.anioDe(new Date(2026, 0, 1)), 2026);
ok("anioDe('')", f.anioDe(''), null);
ok('anioDe(null)', f.anioDe(null), null);
ok("anioDe('basura')", f.anioDe('basura'), null);
ok('anioDe(Date inválida)', f.anioDe(new Date('x')), null);
// Rango del Registro viejo: 13/10 → [00:00 13/10, 00:00 14/10) hora local
const desde = new Date('2026-10-13' + 'T00:00:00').getTime();
const hasta = new Date(f.sumarDias('2026-10-13', 1) + 'T00:00:00').getTime();
ok('rango registro (horas)', (hasta - desde) / 3600000, 24);
ok('log 13/10 23:30 local dentro', new Date('2026-10-13T23:30:00').getTime() < hasta, true);
ok('log 12/10 21:30 local fuera', new Date('2026-10-12T21:30:00').getTime() >= desde, false);
console.log(fallas ? 'FALLAS ' + fallas : 'TODO OK');
```

Corré `node <tmp>/prueba-fe4.js` bajo los husos de Argentina, UTC y Tokio.
Esperado: 10 OK y `TODO OK` en los 3. Borrá `<tmp>` al terminar.

## Verificación

1. Greps (reportá la salida):
```
grep -n "toISOString()\.\(split\|slice\)\|new Date(informeLiq.fecha)\|new Date(this.fechasConsulta" src/app/raiz/ajustes/registro-log/registro-log.component.ts src/app/raiz/ajustes/papelera/papelera.component.ts src/app/shared/modales/baja-objeto/baja-objeto.component.ts src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.ts src/app/raiz/liquidacion/liq-gral/liq-gral.component.ts src/app/raiz/ajustes/registro/registro.component.ts src/app/servicios/informes/excel/excel.service.ts src/app/servicios/informes/pdf/pdf.service.ts
grep -rn "primerDia\|ultimoDia" src/app/raiz/liquidacion/liq-gral/
git diff --numstat -- src
git diff -U0 -- src | grep -n "^+.* $"
```
Esperado:
- (a) solo 5 líneas:
  - registro:76 (`new Date(this.fechasConsulta.fechaDesde + 'T00:00:00')`,
    correcto);
  - registro:117 y 118 (dentro del bloque comentado);
  - excel.service:707 y 844 (nombres de archivo, FE5).
- (b) nada.
- (c) referencia (agregadas / borradas):
  - papelera 8/7;
  - registro-log 6/5;
  - registro 14/11;
  - liq-gral 0/3;
  - tablero-asignaciones 4/3;
  - excel.service 2/1;
  - pdf.service 4/2;
  - baja-objeto 2/1;
  - fecha.util 11/0.
- (d) nada.

2. `npm run build:demo`. Reportá la tabla de tamaños y las advertencias.
   Referencia: sin cambios (main ≈ 1,10 MB; Initial total ≈ 1,53 MB) y
   las mismas 9 advertencias.

## Pruebas manuales en demo (las hace Nico)

1. **Ajustes → Registro de actividad:**
   - por defecto, "hasta" = hoy y "desde" = hace 7 días;
   - si podés, probalo después de las 21:00: "hasta" sigue siendo hoy.
2. **Ajustes → Papelera:** por defecto, "hasta" = hoy y "desde" = hace 30
   días.
3. **Dar de baja algo** (una operación, por ejemplo): la fecha que muestra
   el modal es hoy.
4. **Tablero de asignaciones:** con las flechas, avanzar y retroceder días,
   incluido un cambio de mes (31 → 1 y 1 → 31) y de año si hay datos.
5. **Ajustes → Registro viejo:**
   - por defecto, desde = hasta = hoy;
   - consultar: aparecen los logs de hoy, incluidos los de antes de las
     03:00 y los de después de las 21:00 si hay;
   - elegir un rango a mano: incluye completo el último día.
6. **Papelera legado:** exportar a Excel y PDF un informe de liquidación
   viejo; el título muestra el año correcto. Si hay uno del 1 de enero,
   mejor.

## Mensaje de commit

```
FE4 (lazy-fechas): "hoy" por defecto, cambiarDia, Registro viejo y año del informe viejo

- registro-log, papelera y baja-objeto: rangos/fecha por defecto con
  hoyNegocio() y sumarDias() (antes toISOString: desde las 21:00 daba
  mañana; papelera pasa a "últimos 30 días").
- tablero-asignaciones.cambiarDia: sumarDias sobre el string.
- liq-gral: fuera date/primerDia/ultimoDia (sin uso).
- Registro viejo: consulta de 00:00 local de "desde" a 00:00 del día
  siguiente a "hasta"; defaults y selección con hoyNegocio/fechaNegocioDe.
- Excel/PDF del InformeLiq viejo: año con anioDe() (nuevo en fecha.util),
  tomado del string (antes el 1/1 mostraba el año anterior).
```

FIN DE LA INSTRUCCIÓN FE4
````
