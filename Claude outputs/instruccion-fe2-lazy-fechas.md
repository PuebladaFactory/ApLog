````
Si no ves la línea FIN DE LA INSTRUCCIÓN FE2 al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN FE2 — Frente Lazy loading + fechas (ApLog, rama refactor)
=====================================================================
Vencimiento de documentación de legajos: regla D1 con "hoy" de Argentina

## Contexto y razonamiento

El estado de cada documento de un legajo (`vencido` / `porVencer` /
`enFecha` / `sinVto`) se calcula en DOS lugares, con el mismo código
duplicado a propósito:
- en el cliente, `calcularEstadoDocumentacion` en interfaces/legajo.ts. Se
  usa al cargar o reemplazar un documento y en la migración de legajos;
- en la Cloud Function programada `verificarVencimientosDocumentacion`. Corre
  todos los días a las 03:00 (hora de Argentina), recalcula todos los
  legajos y reconstruye la colección `vencimientos`, que alimenta el tablero
  de legajos, Vencimientos y las alertas del sidebar.

**El bug (relevamiento FV1).** Las dos copias hacen:
```
new Date(fechaVto)   // 'YYYY-MM-DD' → 00:00 UTC = 21:00 del día ANTERIOR en Argentina
Math.floor((vto - ahora) / 1 día)
```
Así, un documento que vence el 13/10:
- en el cliente, figura "vencido" desde el 12/10 a las 21:00;
- en el servidor, figura "vencido" todo el 13/10.
El umbral de "por vencer" también se corre: en la práctica son hasta 46
días. El resultado cambia según la hora y según el lado.

**La regla nueva** (decisión D1, Nico):
- un documento con fechaVto = D está vigente TODO el día D y vencido desde
  D+1;
- "por vencer" es cuando faltan de 0 a 45 días de calendario hasta D,
  inclusive;
- "hoy" es el día de Argentina (decisión D2), igual en cualquier navegador y
  en la función.
Se calcula sobre los strings 'YYYY-MM-DD', sin `new Date(fechaVto)`:
```
dias = diasEntre(hoy, fechaVto)   // vto - hoy, en días de calendario
dias < 0 → 'vencido';  dias <= 45 → 'porVencer';  si no → 'enFecha'
```

**Fecha inválida.** Si `fechaVto` no es un 'YYYY-MM-DD' real, las dos
copias devuelven 'sinVto'. Es el mismo valor seguro que ya usa la migración
para fechas irresolubles; antes daba 'enFecha' por accidente (NaN). La
función además deja un `logger.warn` por cada una, para encontrarlas. Hoy
todas las fechas guardadas tienen ese formato (el formulario usa
`input type=date` y la migración normaliza), así que no debería aparecer
ninguna.

**Cambios:**

1. **Cliente (interfaces/legajo.ts).** `calcularEstadoDocumentacion` usa
   `hoyNegocio`, `esFechaNegocio` y `diasEntre` de fecha.util (FE1).
   - Se agrega un segundo parámetro opcional `hoy` (por defecto,
     `hoyNegocio()`) para poder probarla. Las 2 llamadas existentes
     (LegajoFactoryService y LegajoMigrationService) no cambian.
2. **Cloud Function (functions/src/verificarVencimientosDocumentacion.ts).**
   - Functions es un proyecto TypeScript aparte y no puede importar de
     src/app. Por eso lleva una copia mínima de las 3 funciones del util
     (`hoyNegocio` con Intl, validación y días en UTC).
   - Calcula `hoy` una vez por corrida y lo pasa al cálculo.
   - El log informa el `hoy` usado y cuántas fechas inválidas hubo.
3. **Script de prueba con emulador (functions/test-vencimientos-scheduler.mjs).**
   - `iso(n)` armaba las fechas con `toISOString`, que después de las 21:00
     da mañana. Pasa a usar el día de Argentina.
   - Se agregan 3 casos de borde: vence hoy → `porVencer`; faltan 45 días →
     `porVencer`; faltan 46 días → `enFecha`.

**Verificación previa** (hecha antes de entregar):
- **Cliente:** 7 casos con `hoy` = 13/10, bajo 3 husos horarios: todos OK.
  - 12/10 → vencido; 13/10 → porVencer;
  - 27/11 (45 días) → porVencer; 28/11 (46 días) → enFecha;
  - null, '13/10/2026' y '2026-02-30' → sinVto.
- **Función compilada** con Firestore simulado, a las 03:00 del 13/10 (hora
  de Argentina): mismos resultados. A las 23:59 del 12/10 toma
  hoy = 12/10, y el que vence el 12/10 todavía figura `porVencer`.
- **Build de functions** (`tsc`) limpio. **Lint**: 0 errores, las 2
  advertencias de siempre (en gestionUsuarios.ts).
- **`build:demo`** limpio, con las 9 advertencias y tamaños sin cambio.

**Deploy:** este bloque cambia una Cloud Function. El deploy a demo lo hace
Nico (ver "Pruebas manuales"). Claude Code NO deploya.

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
grep -rn "calcularEstadoDocumentacion" src functions/src --include=*.ts
grep -n "new Date\|toISOString" src/app/interfaces/legajo.ts functions/src/verificarVencimientosDocumentacion.ts functions/test-vencimientos-scheduler.mjs
grep -n "^import" src/app/interfaces/legajo.ts
ls src/app/shared/utils/fecha.util.ts
cd functions && npx tsc --noEmit -p . && npx eslint --ext .js,.ts . ; cd ..
```

Esperado:
1. `calcularEstadoDocumentacion`:
   - definición en interfaces/legajo.ts;
   - usos en legajo-factory.service.ts:29 y legajo-migracion.service.ts:162;
   - en la función: el comentario de la línea 6, la definición (línea 16)
     y una llamada (línea 88).
2. `new Date` / `toISOString`:
   - legajo.ts:62-63;
   - en la función: `new Date()` y `new Date(fechaVto)`;
   - en el script: `new Date()` y `toISOString()` dentro de `iso`.
3. `legajo.ts` no tiene imports.
4. `fecha.util.ts` existe (FE1).
5. Build y lint de functions: build sin errores; lint con 0 errores y 2
   advertencias (no-explicit-any en gestionUsuarios.ts).

Si algo no coincide, detenete y reportá.

## PASO 1 — src/app/interfaces/legajo.ts

1.1 BUSCAR:
```
export type EstadoDocumentacion = 'enFecha' | 'porVencer' | 'vencido' | 'sinVto';
```
REEMPLAZAR:
```
import { FechaNegocio, diasEntre, esFechaNegocio, hoyNegocio } from 'src/app/shared/utils/fecha.util';

export type EstadoDocumentacion = 'enFecha' | 'porVencer' | 'vencido' | 'sinVto';
```

1.2 BUSCAR:
```
/**
 * Calcula el estado de una documentación en base a su fecha de vencimiento.
 * Única fuente de verdad para este cálculo — consumida por LegajoFactoryService
 * al crear/reemplazar un documento. DUPLICADA manualmente en
 * functions/src/verificarVencimientosDocumentacion.ts (Cloud Function de
 * verificación periódica) — mantener ambas copias sincronizadas ante
 * cualquier cambio en este cálculo.
 *
 * @param fechaVto ISO yyyy-MM-dd, o null si el documento no tiene vencimiento
 * @returns 'sinVto' si fechaVto es null; si no, 'vencido' | 'porVencer' (<=45 días) | 'enFecha'
 */
export function calcularEstadoDocumentacion(fechaVto: string | null): EstadoDocumentacion {
  if (!fechaVto) {
    return 'sinVto';
  }
  const hoy = new Date();
  const vto = new Date(fechaVto);
  const MILIS_DIA = 1000 * 60 * 60 * 24;
  const diffDias = Math.floor((vto.getTime() - hoy.getTime()) / MILIS_DIA);

  if (diffDias < 0) {
    return 'vencido';
  } else if (diffDias <= 45) {
    return 'porVencer';
  } else {
    return 'enFecha';
  }
}
```
REEMPLAZAR:
```
/**
 * Calcula el estado de una documentación en base a su fecha de vencimiento.
 * Única fuente de verdad para este cálculo — consumida por LegajoFactoryService
 * al crear/reemplazar un documento. DUPLICADA manualmente en
 * functions/src/verificarVencimientosDocumentacion.ts (Cloud Function de
 * verificación periódica) — mantener ambas copias sincronizadas ante
 * cualquier cambio en este cálculo.
 *
 * Regla (frente lazy-fechas, FE2 / decisión D1): un documento con fechaVto = D
 * está vigente TODO el día D y vencido desde D+1. "Por vencer": faltan de 0 a
 * 45 días de calendario hasta D (inclusive). "Hoy" es el día de Argentina
 * (fecha.util), igual en cualquier navegador y en la Cloud Function. Se opera
 * sobre los strings 'YYYY-MM-DD', sin construir un Date con la fecha.
 *
 * @param fechaVto 'YYYY-MM-DD', o null si el documento no tiene vencimiento
 * @param hoy 'YYYY-MM-DD' de referencia; por defecto, hoy en Argentina (se pasa en pruebas)
 * @returns 'sinVto' si fechaVto es null o no es una fecha válida; si no,
 *   'vencido' | 'porVencer' (0 a 45 días) | 'enFecha'
 */
export function calcularEstadoDocumentacion(
  fechaVto: string | null,
  hoy: FechaNegocio = hoyNegocio(),
): EstadoDocumentacion {
  if (!fechaVto || !esFechaNegocio(fechaVto)) {
    return 'sinVto';
  }
  const dias = diasEntre(hoy, fechaVto);
  if (dias < 0) {
    return 'vencido';
  } else if (dias <= 45) {
    return 'porVencer';
  } else {
    return 'enFecha';
  }
}
```


## PASO 2 — functions/src/verificarVencimientosDocumentacion.ts

2.1 BUSCAR:
```
type EstadoDocumentacion = 'enFecha' | 'porVencer' | 'vencido' | 'sinVto';

function calcularEstadoDocumentacion(fechaVto: string | null): EstadoDocumentacion {
  if (!fechaVto) {
    return 'sinVto';
  }
  const hoy = new Date();
  const vto = new Date(fechaVto);
  const MILIS_DIA = 1000 * 60 * 60 * 24;
  const diffDias = Math.floor((vto.getTime() - hoy.getTime()) / MILIS_DIA);

  if (diffDias < 0) {
    return 'vencido';
  } else if (diffDias <= 45) {
    return 'porVencer';
  } else {
    return 'enFecha';
  }
}
```
REEMPLAZAR:
```
type EstadoDocumentacion = 'enFecha' | 'porVencer' | 'vencido' | 'sinVto';

// Frente lazy-fechas (FE2): copia mínima de src/app/shared/utils/fecha.util.ts
// (hoyNegocio, esFechaNegocio, diasEntre). Mismo criterio: "hoy" en el huso
// de Argentina vía Intl, y fechas de negocio operadas sobre sus partes en UTC.
const ZONA_NEGOCIO = 'America/Argentina/Buenos_Aires';
const RE_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_DIA = 86400000;

function hoyNegocio(ahora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_NEGOCIO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(ahora);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '';
  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

/** Milisegundos UTC de una fecha 'YYYY-MM-DD' válida; null si no lo es. */
function msFecha(fecha: string): number | null {
  const m = RE_FECHA.exec(fecha);
  if (!m) {
    return null;
  }
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > new Date(Date.UTC(anio, mes, 0)).getUTCDate()) {
    return null;
  }
  return Date.UTC(anio, mes - 1, dia);
}

/** Regla D1: vigente todo el día D, vencido desde D+1; "por vencer" de 0 a
 *  45 días hasta D. Fecha inválida → 'sinVto' (igual que en el cliente). */
function calcularEstadoDocumentacion(fechaVto: string | null, hoy: string): EstadoDocumentacion {
  if (!fechaVto) {
    return 'sinVto';
  }
  const msVto = msFecha(fechaVto);
  const msHoy = msFecha(hoy);
  if (msVto === null || msHoy === null) {
    return 'sinVto';
  }
  const dias = Math.round((msVto - msHoy) / MS_DIA);

  if (dias < 0) {
    return 'vencido';
  } else if (dias <= 45) {
    return 'porVencer';
  } else {
    return 'enFecha';
  }
}
```

2.2 BUSCAR:
```
    const db = getFirestore();
    const legajosRef = db.collection('Vantruck/datos/legajos');
```
REEMPLAZAR:
```
    const db = getFirestore();
    const hoy = hoyNegocio();
    let fechasInvalidas = 0;
    const legajosRef = db.collection('Vantruck/datos/legajos');
```

2.3 BUSCAR:
```
        const estadoRecalculado = calcularEstadoDocumentacion(d.fechaVto);
```
REEMPLAZAR:
```
        if (d.fechaVto && msFecha(d.fechaVto) === null) {
          fechasInvalidas++;
          logger.warn(
            `Legajo ${doc.id}: fechaVto inválida '${d.fechaVto}' (${d.titulo}); se toma como sin vencimiento.`,
          );
        }
        const estadoRecalculado = calcularEstadoDocumentacion(d.fechaVto, hoy);
```

2.4 BUSCAR:
```
    logger.info(
      `Verificación de vencimientos: ${legajosSnap.size} legajos revisados, ` +
      `${legajosActualizados} actualizados, ${vencimientosGenerados} vencimientos vigentes.`
    );
```
REEMPLAZAR:
```
    logger.info(
      `Verificación de vencimientos (hoy ${hoy}): ${legajosSnap.size} legajos revisados, ` +
      `${legajosActualizados} actualizados, ${vencimientosGenerados} vencimientos vigentes` +
      (fechasInvalidas > 0 ? `, ${fechasInvalidas} fechas inválidas.` : '.'),
    );
```


## PASO 3 — functions/test-vencimientos-scheduler.mjs

3.1 BUSCAR:
```
function iso(diasDesdeHoy) {
  const d = new Date();
  d.setDate(d.getDate() + diasDesdeHoy);
  return d.toISOString().slice(0, 10);
}
```
REEMPLAZAR:
```
// FE2 (lazy-fechas): "hoy" en Argentina (como la función), sumando días sobre
// las partes en UTC. Antes usaba toISOString: después de las 21:00 daba mañana.
function iso(diasDesdeHoy) {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const v = (t) => Number(p.find((x) => x.type === t).value);
  const d = new Date(Date.UTC(v("year"), v("month") - 1, v("day")) + diasDesdeHoy * 86400000);
  return d.toISOString().slice(0, 10);
}
```

3.2 BUSCAR:
```
      { idCategoria: "cat4", titulo: "Otro", fechaVto: null, estado: "sinVto", imagenes: [] },
    ],
  });
```
REEMPLAZAR:
```
      { idCategoria: "cat4", titulo: "Otro", fechaVto: null, estado: "sinVto", imagenes: [] },
      // FE2 (regla D1): vence HOY → vigente todo el día ("porVencer"), no "vencido".
      { idCategoria: "cat5", titulo: "VenceHoy", fechaVto: iso(0), estado: "vencido", imagenes: [] },
      // Bordes del umbral de 45 días.
      { idCategoria: "cat6", titulo: "En45", fechaVto: iso(45), estado: "enFecha", imagenes: [] },
      { idCategoria: "cat7", titulo: "En46", fechaVto: iso(46), estado: "porVencer", imagenes: [] },
    ],
  });
```

3.3 BUSCAR:
```
  reportar("cat4 sigue 'sinVto'", estadoCat4 === "sinVto", `estado=${estadoCat4}`);
```
REEMPLAZAR:
```
  reportar("cat4 sigue 'sinVto'", estadoCat4 === "sinVto", `estado=${estadoCat4}`);

  const estadoCat5 = legajo1a.documentacion.find((d) => d.idCategoria === "cat5").estado;
  reportar("cat5 (vence hoy) queda 'porVencer', no 'vencido' (D1)", estadoCat5 === "porVencer", `estado=${estadoCat5}`);

  const estadoCat6 = legajo1a.documentacion.find((d) => d.idCategoria === "cat6").estado;
  reportar("cat6 (faltan 45 días) queda 'porVencer'", estadoCat6 === "porVencer", `estado=${estadoCat6}`);

  const estadoCat7 = legajo1a.documentacion.find((d) => d.idCategoria === "cat7").estado;
  reportar("cat7 (faltan 46 días) queda 'enFecha'", estadoCat7 === "enFecha", `estado=${estadoCat7}`);
```

3.4 BUSCAR:
```
  reportar(
    "vencimientos generados: exactamente cat1 (vencido) + cat2 (porVencer)",
    vencimientosA.size === 2 &&
```
REEMPLAZAR:
```
  reportar(
    "vencimientos generados: exactamente cat1 (vencido) + cat2, cat5 y cat6 (porVencer)",
    vencimientosA.size === 4 &&
    vencimientosA.docs.some((d) => d.data().idCategoria === "cat5" && d.data().estado === "porVencer") &&
    vencimientosA.docs.some((d) => d.data().idCategoria === "cat6" && d.data().estado === "porVencer") &&
```

3.5 BUSCAR:
```
    "vencimientos se reconstruye igual (mismo contenido)",
    vencimientosB.size === 2 &&
```
REEMPLAZAR:
```
    "vencimientos se reconstruye igual (mismo contenido)",
    vencimientosB.size === 4 &&
```

## PASO 4 — Prueba local de la función compilada (sin emulador)

1. Compilá functions:
```
cd functions && npm run build && npm run lint ; cd ..
```
   Esperado: build sin errores; lint con 0 errores y las mismas 2
   advertencias de gestionUsuarios.ts. Ninguna en
   verificarVencimientosDocumentacion.ts.

2. Creá un archivo temporal FUERA del repo (por ejemplo, en la carpeta
   temporal del sistema), `prueba-fe2.js`, con este contenido exacto:

```
// Prueba local de la Cloud Function compilada (sin emulador): mockea
// Firestore y el logger, fija el reloj y corre el handler una vez.
// Uso: node prueba-fe2.js <ruta a functions/lib/verificarVencimientosDocumentacion.js> <instante ISO>
const Module = require('module');
const [, , rutaLib, instante] = process.argv;
const FIJO = Date.parse(instante);
const RealDate = Date;
global.Date = class extends RealDate {
  constructor(...a) { super(...(a.length ? a : [FIJO])); }
  static now() { return FIJO; }
};
const legajos = [{ idChofer: 'c1', visible: true, documentacion: [
  { idCategoria: 'a', titulo: 'Ayer', fechaVto: '2026-10-12', estado: 'enFecha', imagenes: [] },
  { idCategoria: 'b', titulo: 'Hoy', fechaVto: '2026-10-13', estado: 'vencido', imagenes: [] },
  { idCategoria: 'c', titulo: 'En45', fechaVto: '2026-11-27', estado: 'enFecha', imagenes: [] },
  { idCategoria: 'd', titulo: 'En46', fechaVto: '2026-11-28', estado: 'porVencer', imagenes: [] },
  { idCategoria: 'e', titulo: 'Sin', fechaVto: null, estado: 'sinVto', imagenes: [] },
  { idCategoria: 'f', titulo: 'Rara', fechaVto: '13/10/2026', estado: 'enFecha', imagenes: [] },
] }];
const updates = [];
const sets = [];
const fakeDb = {
  collection: (p) => ({
    get: async () => {
      const docs = p.endsWith('legajos') ? legajos.map((l, i) => ({ id: 'L' + i, ref: 'L' + i, data: () => l })) : [];
      return { size: docs.length, docs };
    },
    doc: () => 'nuevo',
  }),
  batch: () => ({
    set: (r, d) => sets.push(d),
    delete: () => {},
    update: (r, d) => updates.push(d),
    commit: async () => {},
  }),
};
const cargaOriginal = Module._load;
Module._load = function (pedido, ...resto) {
  if (pedido === 'firebase-admin/firestore') return { getFirestore: () => fakeDb };
  if (pedido === 'firebase-functions') {
    return { logger: { info: (m) => console.log('INFO', m), warn: (m) => console.log('WARN', m) } };
  }
  return cargaOriginal.call(this, pedido, ...resto);
};
const { verificarVencimientosDocumentacion: f } = require(rutaLib);
(async () => {
  await f.run({});
  for (const u of updates) {
    console.log('ESTADOS', u.documentacion.map((x) => x.titulo + '=' + x.estado).join(' '));
  }
  console.log('VENCIMIENTOS', sets.map((s) => s.titulo + '=' + s.estado).join(' '));
})();
```

3. Corré, pasándole la ruta ABSOLUTA del `.js` compilado:
```
node <tmp>/prueba-fe2.js "<ruta absoluta del repo>/functions/lib/verificarVencimientosDocumentacion.js" 2026-10-13T06:00:00Z
node <tmp>/prueba-fe2.js "<ruta absoluta del repo>/functions/lib/verificarVencimientosDocumentacion.js" 2026-10-13T02:59:00Z
```
   Esperado, primera corrida (03:00 del 13/10 en Argentina):
```
WARN Legajo L0: fechaVto inválida '13/10/2026' (Rara); se toma como sin vencimiento.
INFO Verificación de vencimientos (hoy 2026-10-13): 1 legajos revisados, 1 actualizados, 3 vencimientos vigentes, 1 fechas inválidas.
ESTADOS Ayer=vencido Hoy=porVencer En45=porVencer En46=enFecha Sin=sinVto Rara=sinVto
VENCIMIENTOS Ayer=vencido Hoy=porVencer En45=porVencer
```
   Esperado, segunda corrida (23:59 del 12/10 en Argentina):
```
WARN Legajo L0: fechaVto inválida '13/10/2026' (Rara); se toma como sin vencimiento.
INFO Verificación de vencimientos (hoy 2026-10-12): 1 legajos revisados, 1 actualizados, 2 vencimientos vigentes, 1 fechas inválidas.
ESTADOS Ayer=porVencer Hoy=porVencer En45=enFecha En46=enFecha Sin=sinVto Rara=sinVto
VENCIMIENTOS Ayer=porVencer Hoy=porVencer
```
   Borrá el archivo temporal al terminar. `functions/lib/` es salida de
   build: no lo agregues a git (verificá que esté en functions/.gitignore).

## PASO 5 — Prueba con emulador (opcional)

Si tenés el emulador de Firebase disponible:
```
firebase emulators:start --only firestore,auth,functions
cd functions && node test-vencimientos-scheduler.mjs
```
Esperado: todos PASS, 11 en total, incluidos los 3 casos nuevos (cat5,
cat6 y cat7). Si no podés levantar el emulador, salteá este paso y
reportalo: lo corre Nico.

## Verificación

1. Greps (reportá la salida):
```
grep -n "new Date\|toISOString\|getTime" src/app/interfaces/legajo.ts
grep -n "new Date(fechaVto)\|getTime()\|Math.floor" functions/src/verificarVencimientosDocumentacion.ts
grep -n "hoyNegocio\|diasEntre\|esFechaNegocio" src/app/interfaces/legajo.ts
git status --short
git diff --numstat
git diff -U0 | grep -n "^+.* $"
```
Esperado:
- (a) nada;
- (b) nada;
- (c) 4 líneas: el import y, en calcularEstadoDocumentacion, el parámetro
  `hoy`, la validación y el cálculo;
- (d) M en src/app/interfaces/legajo.ts,
  functions/src/verificarVencimientosDocumentacion.ts y
  functions/test-vencimientos-scheduler.mjs. Nada en functions/lib/;
- (e) referencia (agregadas / borradas):
  - legajo.ts 20/11;
  - verificarVencimientosDocumentacion.ts 56/10;
  - test-vencimientos-scheduler.mjs 26/5;
- (f) nada.

2. `npm run build:demo`. Reportá la tabla de tamaños y las advertencias.
   Referencia: sin cambios (main ≈ 1,10 MB; Initial total ≈ 1,53 MB) y
   las mismas 9 advertencias.

## Pruebas manuales en demo (las hace Nico)

1. **Deploy de la función a demo.** Lo hacés vos; Claude Code no deploya:
```
firebase deploy --only functions:verificarVencimientosDocumentacion --project demo
```
2. **Forzar una corrida** para no esperar a las 03:00: Google Cloud Console
   (proyecto demo) → Cloud Scheduler → el job
   `firebase-schedule-verificarVencimientosDocumentacion-southamerica-east1`
   → "Forzar ejecución". En los logs de la función tiene que aparecer
   "Verificación de vencimientos (hoy 2026-10-13): …" con la fecha de hoy y
   sin "fechas inválidas".
3. **Legajos** (en un legajo de prueba):
   - cargar un documento que vence HOY: tiene que figurar "por vencer", no
     "vencido";
   - uno que venció AYER: "vencido";
   - uno a 45 días: "por vencer";
   - uno a 46 días: "en fecha".
   Revisá tablero de legajos, Vencimientos y alerta del sidebar, antes y
   después de forzar la corrida: tienen que coincidir.
4. Si podés, repetí el punto 3 después de las 21:00: el documento que
   vence hoy tiene que seguir "por vencer".

## Mensaje de commit

```
FE2 (lazy-fechas): vencimiento de legajos con regla D1 y "hoy" de Argentina

- calcularEstadoDocumentacion (cliente) usa fecha.util: hoyNegocio +
  diasEntre sobre 'YYYY-MM-DD', sin new Date(fechaVto). Regla D1: vigente
  todo el día D, vencido desde D+1; "por vencer" de 0 a 45 días. Fecha
  inválida → 'sinVto'. Parámetro opcional `hoy` para pruebas.
- Cloud Function verificarVencimientosDocumentacion: misma regla con copia
  mínima del util (Intl con huso de Argentina); hoy calculado una vez por
  corrida; log con el hoy usado y las fechas inválidas.
- test-vencimientos-scheduler.mjs: iso() con el día de Argentina y 3 casos
  de borde (vence hoy, 45 y 46 días).
- Deploy de functions a demo: manual (Nico).
```

FIN DE LA INSTRUCCIÓN FE2
````
