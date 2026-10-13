````
Si no ves la línea FIN DE LA INSTRUCCIÓN FE5b al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN FE5b — Frente Lazy loading + fechas (ApLog, rama refactor)
======================================================================
Consolidación de fechas (2/2): formato DD/MM/AAAA, fin de mes, ramas
muertas y fechas de nombres de archivo

## Contexto y razonamiento

Segundo y último bloque de la consolidación (D4). Con este bloque, todo el
cálculo y el formato de fechas de negocio pasan por fecha.util.

**1. Formato 'DD/MM/AAAA': una sola implementación (`fechaLegible`).**

| Función | Llamadas | Ahora |
|---|---|---|
| `fechaDMY` (liquidacion-venta-vista.util) | 5 (Vendedores) | `fechaLegible(fecha)` |
| `fechaComprobanteLegible` (factura-electronica.util) | ~35 (Finanzas, Facturación) | `fechaLegible(fecha, '')` |
| `formatearFechaIso` (formato-exportacion) | celdas 'fecha' de Excel/PDF | `fechaLegible(fecha, '')` |

- Las tres conservan su nombre y pasan a delegar, con el mismo criterio
  que `toISODateString` en FE1 (D3). Reemplazar ~40 llamadas no agrega
  nada.
- Con 'YYYY-MM-DD' y con vacío/null el resultado es idéntico al de antes.
  Todos los campos que reciben son 'YYYY-MM-DD'.
- Solo cambia un string con otro formato:
  - `fechaDMY` devolvía '—'; ahora lo devuelve tal cual (criterio de
    fechaLegible: no esconder el dato);
  - `fechaComprobanteLegible` lo partía por '-' y podía armar basura.
- Se corrige el comentario de `fechaComprobanteLegible`. Decía que el pipe
  `date` toma 'YYYY-MM-DD' como UTC y corre un día, y es falso: Angular la
  toma como fecha local (relevamiento §3).

**2. `fechaLocal` (documento-liq.util) → `instanteLegible(iso, false)`.**
- Arma "Revertido el …" / "Anulado el …" en los Excel/PDF de liquidación,
  a partir de `reversion.fecha` / `anulacion.fecha`. Esos campos son
  instantes ISO con hora (interfaz `Anulacion`).
- Antes usaba la hora del navegador. Ahora usa la hora de Argentina (D2),
  igual que el resto de los instantes. En Argentina, mismo resultado.

**3. Último día del mes: 5 cálculos → `diasDelMes` y `finDeMes`** (nuevos
en fecha.util).
- `diasDelMes(anio, mes)`, días del mes:
  - periodo.util `diasOperativos`;
  - informe-liq-factory `ventanaPeriodo`;
  - fecha.util `esFechaNegocio`.
- `finDeMes('YYYY-MM')`, la fecha del último día:
  - resumen-finanzas `rangoDeMeses`;
  - generadores de circuito y de cobros (/migracion).
- Todos eran correctos. Solo se unifican.

**4. Generadores (/migracion):** sus `sumarDias` y `ultimoDia` privados
(copias correctas) se reemplazan por los de fecha.util.

**5. Ramas muertas de `normalizarFecha` (FL2):**
- tablero.service e informe-op-factory convertían un `Date` con
  `toISOString`;
- `Operacion.fecha` es string, así que esa rama nunca corría;
- se borra el helper y se usa `op.fecha` directo.

**6. Fechas de nombres de archivo con `toISOString` (desde las 21:00 daban
mañana) → hoy de Argentina:**
- excel.service: `Clientes_…xlsx` / `Proveedores_…xlsx` y
  `Choferes_…xlsx`;
- migration-backup y legajo-migracion:
  - el sufijo `_backup_<col>_YYYYMMDD`;
  - los dos tienen que dar lo mismo: `verificarCantidad` busca el backup
    de "hoy";
  - antes, un backup a las 20:59 y una verificación a las 21:01 no se
    encontraban;
- set-version.js: `buildDate` de `version.ts`. Es Node puro y no puede
  importar fecha.util; usa `Intl` con el mismo huso.

**Fuera de alcance (quedan como estaban):**
- `legajo-migracion.service.ts:71`: rama epoch-millis (FL4), pendiente
  para revisar con datos reales antes de la migración;
- `registro.component.ts:117-118`: bloque comentado;
- `formatearFecha` de excel.service: Excel de choferes (D6), frente
  Excel/PDF.

**Verificación previa:**
- Node, 15 casos bajo 3 husos (Argentina, UTC y Tokio): todos OK.
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
- **NO corras `node set-version.js` ni `npm run build`:** reescriben
  `src/environments/version.ts`. Para compilar usá `npm run build:demo`.
- **Borrado por RANGO** (igual que en FE5a): se borra desde INICIO
  (inclusive) hasta la línea anterior a ANCLA (ANCLA se queda). Las dos se
  identifican por cómo EMPIEZA la línea, con la sangría indicada. Antes de
  borrar, verificá que cada prefijo sea único en el archivo, que ANCLA esté
  después de INICIO y que la distancia sea exactamente la indicada. Si
  algo no coincide, detenete y reportá sin borrar.

## PASO 0 — Verificación (sin modificar nada)

Corré y reportá la salida:

```
grep -rn "toISOString()\.\(slice\|split\)" src set-version.js
grep -rn "private sumarDias\|private ultimoDia\|this.sumarDias(\|this.ultimoDia(\|normalizarFecha\|fechaLocal\|, 0).getDate()\|, 0)).getUTCDate()" src
grep -rn "diasDelMes\|finDeMes" src
```

Esperado:
1. Exactamente 12 líneas:
   - tablero.service:50;
   - generador-circuito:590;
   - generador-cobros:469;
   - excel.service: 707 y 844;
   - legajo-migracion: 70 y 206 (70 es FL4: no se toca);
   - migration-backup:16;
   - informe-op-factory:70;
   - registro: 117 y 118 (bloque comentado: no se toca);
   - set-version.js:12.
2. Exactamente 25 líneas:
   - fecha.util:44;
   - documento-liq.util: 133, 137 y 217;
   - resumen-finanzas.util:60;
   - periodo.util:61;
   - tablero.service: 26 y 49;
   - generador-circuito: 184, 222, 231, 582, 584 y 588;
   - generador-cobros: 172, 183, 207, 234, 422, 461, 463 y 467;
   - informe-op-factory: 33 y 69;
   - informe-liq-factory:155.
3. Nada.

Si algo no coincide, detenete y reportá.

## PASO 1 — src/app/shared/utils/fecha.util.ts

1.1 BUSCAR:
```
  if (!esFechaNegocio(desde) || !esFechaNegocio(hasta)) return null;
  return diasEntre(desde, hasta);
}
```
REEMPLAZAR:
```
  if (!esFechaNegocio(desde) || !esFechaNegocio(hasta)) return null;
  return diasEntre(desde, hasta);
}

/** Cantidad de días del mes (mes 1..12): de 28 a 31. No depende del huso. */
export function diasDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/** Último día de un mes 'YYYY-MM' como fecha de negocio ('2026-02' →
 *  '2026-02-28'). Lanza si `mes` no es un 'YYYY-MM' válido (FE5b). */
export function finDeMes(mes: string): FechaNegocio {
  const m = /^(\d{4})-(\d{2})$/.exec(mes ?? '');
  const anio = Number(m?.[1]);
  const numMes = Number(m?.[2]);
  if (!m || numMes < 1 || numMes > 12) {
    throw new Error(`Mes inválido (YYYY-MM): '${mes}'.`);
  }
  return formatear(anio, numMes, diasDelMes(anio, numMes));
}
```

1.2 BUSCAR:
```
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return dia <= ultimo;
```
REEMPLAZAR:
```
  return dia <= diasDelMes(anio, mes);
```


## PASO 2 — src/app/shared/utils/liquidacion-venta-vista.util.ts

2.1 BUSCAR:
```
import { periodoDeFecha } from 'src/app/shared/utils/periodo.util';
```
REEMPLAZAR:
```
import { periodoDeFecha } from 'src/app/shared/utils/periodo.util';
import { fechaLegible } from 'src/app/shared/utils/fecha.util';
```

2.2 BUSCAR:
```
/** 'YYYY-MM-DD' → 'DD/MM/YYYY' ('—' si no hay fecha válida). */
export function fechaDMY(fecha: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
}
```
REEMPLAZAR:
```
/** 'YYYY-MM-DD' → 'DD/MM/AAAA' ('—' si está vacía). Delega en fechaLegible
 *  (FE5b); el nombre se conserva por sus llamadas. */
export function fechaDMY(fecha: string | null | undefined): string {
  return fechaLegible(fecha);
}
```


## PASO 3 — src/app/shared/utils/factura-electronica.util.ts

3.1 BUSCAR:
```
import { netoDe } from './compensacion.util';
```
REEMPLAZAR:
```
import { netoDe } from './compensacion.util';
import { fechaLegible } from './fecha.util';
```

3.2 BUSCAR:
```
/** Fecha del comprobante 'YYYY-MM-DD' → 'DD/MM/YYYY'. Sin pasar por Date ni
 *  por el pipe date (que toma ese formato como UTC y corre un día). Pura. */
export function fechaComprobanteLegible(fecha: string): string {
  const [a, m, d] = (fecha ?? '').split('-');
  return a && m && d ? `${d}/${m}/${a}` : (fecha ?? '');
}
```
REEMPLAZAR:
```
/** Fecha del comprobante 'YYYY-MM-DD' → 'DD/MM/AAAA' (vacía → ''). Delega
 *  en fechaLegible (FE5b): se opera sobre el string, sin pasar por Date. El
 *  nombre se conserva por sus llamadas. Pura. */
export function fechaComprobanteLegible(fecha: string): string {
  return fechaLegible(fecha, '');
}
```


## PASO 4 — src/app/servicios/exportacion/formato-exportacion.ts

4.1 BUSCAR:
```
import { TipoCeldaDoc, ValorCeldaDoc } from 'src/app/interfaces/documento-tabular';
```
REEMPLAZAR:
```
import { TipoCeldaDoc, ValorCeldaDoc } from 'src/app/interfaces/documento-tabular';
import { fechaLegible } from 'src/app/shared/utils/fecha.util';
```

4.2 BUSCAR:
```
/** 'YYYY-MM-DD' → 'DD/MM/AAAA', sin pasar por Date (evita el corrimiento de
 *  un día por huso horario). Si no tiene ese formato, lo devuelve igual. */
export function formatearFechaIso(fecha: string): string {
  const m = FECHA_ISO.exec(fecha ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (fecha ?? '');
}
```
REEMPLAZAR:
```
/** 'YYYY-MM-DD' → 'DD/MM/AAAA', sin pasar por Date. Si no tiene ese
 *  formato, lo devuelve igual (vacía → ''). Delega en fechaLegible (FE5b). */
export function formatearFechaIso(fecha: string): string {
  return fechaLegible(fecha, '');
}
```


## PASO 5 — src/app/shared/utils/documento-liq.util.ts

5.1 BUSCAR:
```
import { ETIQUETA_CONCEPTO_COMPENSACION, compensacionesDe, netoDe } from './compensacion.util';
```
REEMPLAZAR:
```
import { ETIQUETA_CONCEPTO_COMPENSACION, compensacionesDe, netoDe } from './compensacion.util';
import { instanteLegible } from './fecha.util';
```

5.2 BUSCAR:
```
        ? `Revertido el ${fechaLocal(liq.reversion.fecha)}. Motivo: ${liq.reversion.motivo}`
```
REEMPLAZAR:
```
        ? `Revertido el ${instanteLegible(liq.reversion.fecha, false)}. Motivo: ${liq.reversion.motivo}`
```

5.3 BUSCAR:
```
        ? `Anulado el ${fechaLocal(liq.anulacion.fecha)}. Motivo: ${liq.anulacion.motivo}`
```
REEMPLAZAR:
```
        ? `Anulado el ${instanteLegible(liq.anulacion.fecha, false)}. Motivo: ${liq.anulacion.motivo}`
```

5.4 BUSCAR:
```
    .replace(/^_|_$/g, '');
}

/** Timestamp ISO completo (con hora, en UTC) → 'DD/MM/AAAA' en hora LOCAL.
 *  Para fechas 'YYYY-MM-DD' sin hora NO usar esto (ver
 *  fechaComprobanteLegible). */
function fechaLocal(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
```
REEMPLAZAR:
```
    .replace(/^_|_$/g, '');
}
```


## PASO 6 — src/app/shared/utils/resumen-finanzas.util.ts

6.1 BUSCAR:
```
import { diasEntreONulo } from 'src/app/shared/utils/fecha.util';
```
REEMPLAZAR:
```
import { diasEntreONulo, finDeMes } from 'src/app/shared/utils/fecha.util';
```

6.2 BUSCAR:
```
export function rangoDeMeses(desde: string, hasta: string): { desde: string; hasta: string } {
  const p = partes(hasta);
  const ultimo = new Date(Date.UTC(p.anio, p.mes, 0)).getUTCDate();   // día 0 del mes siguiente
  return { desde: `${desde}-01`, hasta: `${hasta}-${String(ultimo).padStart(2, '0')}` };
}
```
REEMPLAZAR:
```
export function rangoDeMeses(desde: string, hasta: string): { desde: string; hasta: string } {
  return { desde: `${desde}-01`, hasta: finDeMes(hasta) };
}
```


## PASO 7 — src/app/shared/utils/periodo.util.ts

7.1 BUSCAR:
```
import { hoyNegocio, partesFecha } from 'src/app/shared/utils/fecha.util';
```
REEMPLAZAR:
```
import { diasDelMes, hoyNegocio, partesFecha } from 'src/app/shared/utils/fecha.util';
```

7.2 BUSCAR:
```
  const ultimoDia = periodo === actual ? h.dia : new Date(anio, mes, 0).getDate();
```
REEMPLAZAR:
```
  const ultimoDia = periodo === actual ? h.dia : diasDelMes(anio, mes);
```


## PASO 8 — src/app/servicios/informes-liq/informe-liq-factory.service.ts

8.1 BUSCAR:
```
import { aplicarImporte, estadoFinancieroDe, normalizarValoresFinancieros, redondear2 } from 'src/app/shared/utils/finanzas.util';
```
REEMPLAZAR:
```
import { aplicarImporte, estadoFinancieroDe, normalizarValoresFinancieros, redondear2 } from 'src/app/shared/utils/finanzas.util';
import { diasDelMes } from 'src/app/shared/utils/fecha.util';
```

8.2 BUSCAR:
```
    const ultimoDia = new Date(periodo.anio, periodo.mes, 0).getDate();
```
REEMPLAZAR:
```
    const ultimoDia = diasDelMes(periodo.anio, periodo.mes);
```


## PASO 9 — src/app/servicios/desarrollo/generador-circuito.service.ts

9.1 BUSCAR:
```
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
```
REEMPLAZAR:
```
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { finDeMes, sumarDias } from 'src/app/shared/utils/fecha.util';
```

9.2 BUSCAR:
```
    const hasta = `${p.hasta}-${String(this.ultimoDia(p.hasta)).padStart(2, '0')}`;
```
REEMPLAZAR:
```
    const hasta = finDeMes(p.hasta);
```

9.3 BUSCAR:
```
        const fechaEmision = this.sumarDias(fin, azar.entero(this.DIAS_EMISION.min, this.DIAS_EMISION.max));
```
REEMPLAZAR:
```
        const fechaEmision = sumarDias(fin, azar.entero(this.DIAS_EMISION.min, this.DIAS_EMISION.max));
```

9.4 BUSCAR:
```
          const candidata = this.sumarDias(fechaEmision, azar.entero(this.DIAS_FACTURA.min, this.DIAS_FACTURA.max));
```
REEMPLAZAR:
```
          const candidata = sumarDias(fechaEmision, azar.entero(this.DIAS_FACTURA.min, this.DIAS_FACTURA.max));
```

Borra los métodos privados `ultimoDia` y `sumarDias` (con sus comentarios) y la línea en blanco que los sigue.

9.5 RANGO (12 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  /** Último día del mes 'YYYY-MM' (sin depender del huso horario). */
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  private validarParametros(
```


## PASO 10 — src/app/servicios/desarrollo/generador-cobros.service.ts

10.1 BUSCAR:
```
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
```
REEMPLAZAR:
```
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { finDeMes, sumarDias } from 'src/app/shared/utils/fecha.util';
```

10.2 BUSCAR:
```
        const fecha = this.sumarDias(fechaFactura, dias);
```
REEMPLAZAR:
```
        const fecha = sumarDias(fechaFactura, dias);
```

10.3 BUSCAR:
```
          const fecha2 = this.sumarDias(fecha, azar.entero(20, 40));
```
REEMPLAZAR:
```
          const fecha2 = sumarDias(fecha, azar.entero(20, 40));
```

10.4 BUSCAR:
```
        const fecha = this.sumarDias(fechaFactura, azar.entero(2, 10));
```
REEMPLAZAR:
```
        const fecha = sumarDias(fechaFactura, azar.entero(2, 10));
```

10.5 BUSCAR:
```
    const hasta = `${p.hasta}-${String(this.ultimoDia(p.hasta)).padStart(2, '0')}`;
```
REEMPLAZAR:
```
    const hasta = finDeMes(p.hasta);
```

10.6 BUSCAR:
```
        banco, fechaCobro: this.sumarDias(fecha, azar.entero(15, 45)), retencion: null,
```
REEMPLAZAR:
```
        banco, fechaCobro: sumarDias(fecha, azar.entero(15, 45)), retencion: null,
```

Borra los métodos privados `ultimoDia` y `sumarDias` (con sus comentarios) y la línea en blanco que los sigue.

10.7 RANGO (12 líneas).
- INICIO: la línea que empieza con (2 espacios de sangría):
```
  /** Último día del mes 'YYYY-MM' (sin depender del huso horario). */
```
- ANCLA (se queda): la línea que empieza con (2 espacios de sangría):
```
  private validarParametros(
```


## PASO 11 — src/app/servicios/tablero/tablero.service.ts

11.1 BUSCAR:
```
    const fecha = this.normalizarFecha(op.fecha);
```
REEMPLAZAR:
```
    const fecha = op.fecha;
```

11.2 BUSCAR:
```
    await this.asignacionService.reactivarItem(fecha, idOperacion);
  }

  // ---- Helpers privados ----

  private normalizarFecha(fecha: string): string {
    return typeof fecha === 'string' ? fecha : new Date(fecha).toISOString().split('T')[0];
  }
```
REEMPLAZAR:
```
    await this.asignacionService.reactivarItem(fecha, idOperacion);
  }
```


## PASO 12 — src/app/servicios/informes-op/informe-op-factory.service.ts

12.1 BUSCAR:
```
      fecha: this.normalizarFecha(op.fecha),
```
REEMPLAZAR:
```
      fecha: op.fecha,
```

12.2 BUSCAR:
```
    return op.proveedor;
  }

  private normalizarFecha(fecha: string | Date): string {
    return typeof fecha === 'string' ? fecha : fecha.toISOString().slice(0, 10);
  }
```
REEMPLAZAR:
```
    return op.proveedor;
  }
```


## PASO 13 — src/app/servicios/informes/excel/excel.service.ts

13.1 BUSCAR:
```
import { anioDe } from "src/app/shared/utils/fecha.util";
```
REEMPLAZAR:
```
import { anioDe, hoyNegocio } from "src/app/shared/utils/fecha.util";
```

13.2 BUSCAR:
```
      `${modo}_${new Date().toISOString().slice(0, 10)}.xlsx`,
```
REEMPLAZAR:
```
      `${modo}_${hoyNegocio()}.xlsx`,
```

13.3 BUSCAR:
```
      `Choferes_${new Date().toISOString().slice(0, 10)}.xlsx`,
```
REEMPLAZAR:
```
      `Choferes_${hoyNegocio()}.xlsx`,
```


## PASO 14 — src/app/servicios/migracion/migration-backup.service.ts

14.1 BUSCAR:
```
} from '@angular/fire/firestore';
```
REEMPLAZAR:
```
} from '@angular/fire/firestore';
import { hoyNegocio } from 'src/app/shared/utils/fecha.util';
```

14.2 BUSCAR:
```
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
```
REEMPLAZAR:
```
    // FE5b (lazy-fechas): sufijo con el hoy de Argentina (antes, desde las
    // 21:00 daba mañana). legajo-migracion.verificarCantidad usa el mismo.
    const fecha = hoyNegocio().replace(/-/g, '');
```


## PASO 15 — src/app/servicios/migracion/legajo-migracion.service.ts

15.1 BUSCAR:
```
import { MigrationBackupService } from './migration-backup.service';
```
REEMPLAZAR:
```
import { MigrationBackupService } from './migration-backup.service';
import { hoyNegocio } from 'src/app/shared/utils/fecha.util';
```

15.2 BUSCAR:
```
    const fecha = fechaBackupYYYYMMDD ?? new Date().toISOString().slice(0, 10).replace(/-/g, '');
```
REEMPLAZAR:
```
    const fecha = fechaBackupYYYYMMDD ?? hoyNegocio().replace(/-/g, ''); // mismo sufijo que backupColeccion (FE5b)
```


## PASO 16 — set-version.js

16.1 BUSCAR:
```
// Fecha de build
const buildDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
```
REEMPLAZAR:
```
// Fecha de build en hora de Argentina (FE5b; antes, desde las 21:00 daba el
// día siguiente). El formato 'en-CA' es YYYY-MM-DD.
const buildDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
```

## PASO 17 — Prueba en Node (no modifica el repo)

Compilá los utils a una carpeta temporal FUERA del repo (como en FE5a):

```
D=<carpeta temporal fuera del repo>
npx tsc src/app/shared/utils/fecha.util.ts src/app/shared/utils/liquidacion-venta-vista.util.ts src/app/shared/utils/factura-electronica.util.ts src/app/servicios/exportacion/formato-exportacion.ts src/app/shared/utils/resumen-finanzas.util.ts --outDir "$D" --rootDir . --baseUrl . --module commonjs --target ES2022 --strict --skipLibCheck
```

Creá `$D/prueba-fe5b.js` con este contenido exacto:

```
const path = require('path');
const r = p => require(path.join(__dirname, p));
const F = r('src/app/shared/utils/fecha.util.js');
const LV = r('src/app/shared/utils/liquidacion-venta-vista.util.js');
const FE = r('src/app/shared/utils/factura-electronica.util.js');
const FX = r('src/app/servicios/exportacion/formato-exportacion.js');
const RF = r('src/app/shared/utils/resumen-finanzas.util.js');
let ok = 0, mal = 0;
function caso(nombre, obtenido, esperado) {
  const bien = JSON.stringify(obtenido) === JSON.stringify(esperado);
  bien ? ok++ : mal++;
  console.log(`${bien ? 'OK   ' : 'FALLA'} ${nombre}: ${JSON.stringify(obtenido)}${bien ? '' : ' (esperado ' + JSON.stringify(esperado) + ')'}`);
}
function lanza(f) { try { f(); return 'no lanza'; } catch { return 'lanza'; } }
caso('diasDelMes feb 2026', F.diasDelMes(2026, 2), 28);
caso('diasDelMes feb 2024', F.diasDelMes(2024, 2), 29);
caso('diasDelMes abr / dic', [F.diasDelMes(2026, 4), F.diasDelMes(2026, 12)], [30, 31]);
caso('finDeMes 2026-02 / 2024-02 / 2026-12', [F.finDeMes('2026-02'), F.finDeMes('2024-02'), F.finDeMes('2026-12')], ['2026-02-28', '2024-02-29', '2026-12-31']);
caso('finDeMes inválido', [lanza(() => F.finDeMes('2026-13')), lanza(() => F.finDeMes('2026-2')), lanza(() => F.finDeMes(''))], ['lanza', 'lanza', 'lanza']);
caso('esFechaNegocio 29/02', [F.esFechaNegocio('2024-02-29'), F.esFechaNegocio('2026-02-29'), F.esFechaNegocio('2026-04-31')], [true, false, false]);
caso('fechaDMY', [LV.fechaDMY('2026-10-13'), LV.fechaDMY(null), LV.fechaDMY('')], ['13/10/2026', '—', '—']);
caso('fechaComprobanteLegible', [FE.fechaComprobanteLegible('2026-10-13'), FE.fechaComprobanteLegible(''), FE.fechaComprobanteLegible(null)], ['13/10/2026', '', '']);
caso('formatearFechaIso', [FX.formatearFechaIso('2026-01-01'), FX.formatearFechaIso('texto'), FX.formatearFechaIso('')], ['01/01/2026', 'texto', '']);
caso('formatearCelda fecha', FX.formatearCelda('2026-10-13', 'fecha'), '13/10/2026');
caso('rangoDeMeses', RF.rangoDeMeses('2026-01', '2026-02'), { desde: '2026-01-01', hasta: '2026-02-28' });
caso('anulación 22:30 del 13/10 (ART)', F.instanteLegible('2026-10-14T01:30:00.000Z', false), '13/10/2026');
caso('sumarDias del generador (cruce de año)', F.sumarDias('2026-12-20', 15), '2027-01-04');
caso('nombre de build 22:30 del 13/10 (ART)', new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date('2026-10-14T01:30:00Z')), '2026-10-13');
caso('sufijo de backup', /^\d{8}$/.test(F.hoyNegocio(new Date('2026-10-14T01:30:00Z')).replace(/-/g, '')) && F.hoyNegocio(new Date('2026-10-14T01:30:00Z')).replace(/-/g, ''), '20261013');
console.log(mal === 0 ? `TODO OK (${ok})` : `${mal} FALLA(S)`);
process.exitCode = mal ? 1 : 0;
```

Corré:
```
NODE_PATH="$D" node "$D/prueba-fe5b.js"
```
Repetilo bajo los husos de Argentina, UTC y Tokio. En Windows, si `TZ=`
no toma efecto, fijalo dentro del proceso como en FE1. Esperado: 15 OK y
`TODO OK (15)` en los 3. Borrá `$D` al terminar.

## Verificación

1. Greps (reportá la salida):
```
grep -rn "toISOString()\.\(slice\|split\)" src set-version.js
grep -rn "private sumarDias\|private ultimoDia\|this.sumarDias(\|this.ultimoDia(\|normalizarFecha\|fechaLocal\|, 0).getDate()\|, 0)).getUTCDate()" src
grep -rn "diasDelMes\|finDeMes" src | wc -l
grep -rn "fechaLegible(" src --include=*.ts | grep -v "fecha.util.ts"
git diff --numstat -- src set-version.js
git diff -U0 -- src set-version.js | grep -n "^+.* $"
git status --short src/environments
```
Esperado:
- (a) solo 3 líneas:
  - legajo-migracion:71 (FL4);
  - registro: 117 y 118 (comentadas).
- (b) solo fecha.util:108 (la definición de `diasDelMes`).
- (c) 14.
- (d) 3 líneas: las delegaciones en factura-electronica.util,
  liquidacion-venta-vista.util y formato-exportacion.
- (e) exactamente (agregadas / borradas):
  - set-version.js 3/2;
  - generador-circuito 4/15;
  - generador-cobros 6/17;
  - formato-exportacion 4/4;
  - informe-liq-factory 2/1;
  - informe-op-factory 1/5;
  - excel.service 3/3;
  - legajo-migracion 2/1;
  - migration-backup 4/1;
  - tablero.service 1/7;
  - documento-liq.util 3/11;
  - factura-electronica.util 5/4;
  - fecha.util 18/2;
  - liquidacion-venta-vista.util 4/3;
  - periodo.util 2/2;
  - resumen-finanzas.util 2/4.
- (f) nada.
- (g) nada (version.ts sin cambios).

2. `npm run build:demo`. Reportá la tabla de tamaños y las advertencias.
   Referencia: sin cambios (main ≈ 1,10 MB; Initial total ≈ 1,53 MB) y
   las mismas 9 advertencias.

## Pruebas manuales en demo (las hace Nico)

1. **Vendedores:**
   - historial y detalle de una liquidación de comisiones: emisión, pago
     y anulación en DD/MM/AAAA;
   - exportar su PDF.
2. **Finanzas:**
   - movimientos, cuenta de una entidad, detalle de un movimiento y
     recibo PDF: fechas en DD/MM/AAAA, igual que antes;
   - Resumen: el rango de meses termina el último día del mes (probá
     febrero si podés).
3. **Facturación:** facturados y vincular factura: fecha del comprobante
   igual que antes.
4. **Liquidación:**
   - Excel/PDF de un informe revertido o anulado: "Revertido el
     DD/MM/AAAA" / "Anulado el DD/MM/AAAA" con la fecha correcta;
   - liquidación nueva: la preselección de período (mes, 1q y 2q)
     termina el día correcto.
5. **Reportes:** el promedio de ops/día de un mes pasado no cambia.
6. **Operaciones:**
   - cerrar una operación: los informes de operación se crean con la
     fecha de la operación;
   - Papelera: restaurar una operación; vuelve al tablero en su fecha.
7. **Listados:** exportar Clientes, Proveedores y Choferes a Excel; el
   nombre del archivo lleva la fecha de hoy (si podés, después de las
   21:00).
8. **/migracion (opcional):** en el generador de circuito y en el de
   cobros (modo anticipos), "planificar" con un rango que termine en
   febrero: el plan cubre hasta el 28/29.

## Mensaje de commit

```
FE5b (lazy-fechas): formato DD/MM/AAAA, fin de mes, ramas muertas y fechas de archivo

- fechaDMY, fechaComprobanteLegible y formatearFechaIso delegan en
  fechaLegible (se conservan los nombres, D3); se corrige el comentario
  falso sobre el pipe date.
- documento-liq.util: fechaLocal → instanteLegible(iso, false) (hora de
  Argentina, D2).
- NUEVOS diasDelMes y finDeMes en fecha.util; los usan esFechaNegocio,
  diasOperativos, ventanaPeriodo, rangoDeMeses y los generadores.
- Generadores de circuito y cobros: sumarDias/ultimoDia privados → los de
  fecha.util.
- tablero.service e informe-op-factory: fuera normalizarFecha (rama Date
  muerta, FL2).
- Nombres de archivo de Excel, sufijo de backup de migración y buildDate
  de set-version.js con el hoy de Argentina (antes toISOString: desde las
  21:00 daba mañana).
```

FIN DE LA INSTRUCCIÓN FE5b
````
