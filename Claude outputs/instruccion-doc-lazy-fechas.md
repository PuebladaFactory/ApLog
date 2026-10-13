````
Si no ves la línea FIN DE LA INSTRUCCIÓN DOC al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN DOC — Frente Lazy loading + fechas (ApLog, rama refactor)
=====================================================================
Cierre (documentación): CLAUDE.md y CHANGELOG.md

## Contexto y razonamiento

Último bloque del frente. El código quedó cerrado en LZ1–LZ7, LR1–LR2d,
FE1–FE5b y CI1–CI2. La documentación seguía describiendo el estado anterior:
- **CLAUDE.md:**
  - "Stack": AG Grid y Cloudinary;
  - "Comandos": deploy sin set-version;
  - "Estructura de módulos": sin `componentes/`, con `constants/` y sin el
    ruteo nuevo;
  - "Operaciones": las transiciones de estado en `LiquidacionService`, que
    ya no existe;
  - "Servicios clave": la fila `liquidaciones/`;
  - la regla vieja de vencimiento de Legajos;
  - un comentario falso sobre el pipe `date`;
  - deudas ya resueltas: RaizModule eager, auditoría de fechas, camino viejo
    de Liquidación, QR en el bundle inicial, año del InformeLiq viejo.
  - Faltaban la sección del frente, el criterio de fechas en
    "Convenciones", las deudas que deja el frente y su checklist para
    Vantruck: D6, D7, D10, FL4, budget de `vantruck` y Function de
    vencimientos.
- **CHANGELOG:** sin entrada del frente y con un "Pendiente" desactualizado.

**Cambios (SOLO documentación, ningún archivo de código):**

CLAUDE.md
1. Stack técnico, Comandos (+ nota de `--legacy-peer-deps` y `version.ts`),
   Estructura de módulos (+ ruteo).
2. Operaciones (transiciones), Servicios clave (`liquidaciones/` fuera;
   `informes/` y `fechas/` al día), Entornos de build (budgets),
   Convenciones (fechas).
3. Módulo Legajos: regla D1 y la copia de la Function. Facturación: pipe
   `date` y bundle. Finanzas: `diasEntre`. Tarifas: `tarifa-gral-cliente`.
4. Sección NUEVA "## Frente Lazy loading + fechas (Octubre 2026)" antes de
   "## Deuda conocida".
5. Deuda conocida:
   - se tachan como RESUELTAS: RaizModule, auditoría de fechas, camino viejo
     de Liquidación, `obtenerPorIdsOperacion`, QR, Supabase /
     `anularLiquidacion` y el `getFullYear` de los servicios viejos;
   - se agregan D7 (checklist de Tarifas), FL4 (migración de Legajos), D6 y
     `exceljs` (Excel/PDF);
   - secciones NUEVAS al final: "Deuda — tras el frente Lazy loading +
     fechas" y "Checklist — migración a Vantruck: frente Lazy loading +
     fechas".

CHANGELOG.md
6. Entrada nueva "## Frente Lazy loading + fechas (Octubre 2026)" antes de
   "### Pendiente".
7. "Pendiente":
   - fuera la auditoría de fechas y RaizModule;
   - Ajustes y Excel/PDF al día;
   - nuevos: UX (`<h1>`) y specs de Karma;
   - la migración remite al checklist nuevo.

Verificación previa: aplicada por script sobre las versiones del
dispositivo. El resultado es idéntico a la referencia y no deja espacios al
final de línea.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- **Esta instrucción toca SOLO CLAUDE.md y CHANGELOG.md.** Es el bloque de
  cierre: acá termina la regla de no tocarlos durante el frente. Ningún
  otro archivo.
- Si un texto a BUSCAR no está o aparece más de una vez: detenete y
  reportá.
- Aplicá los cambios de cada archivo EN ORDEN (los BUSCAR siguen el orden
  del archivo).
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Ningún BUSCAR de esta instrucción tiene espacios al final de línea.
- Finales de línea LF; codificación UTF-8 (hay tildes, flechas y "→").
- Los textos a REEMPLAZAR son markdown: copialos tal cual (incluidos `~~`,
  backticks y tablas). Cuando un texto a BUSCAR o REEMPLAZAR contiene
  líneas ```, está delimitado con ~~~~ en vez de ```: copiá lo que está
  entre las ~~~~, incluidas esas líneas ```.
- "Borrá la línea COMPLETA que contiene X": borrá la línea entera (con su
  salto de línea).

## PASO 0 — Verificación (sin modificar nada)

```
git status --short CLAUDE.md CHANGELOG.md
wc -l CLAUDE.md CHANGELOG.md
grep -n "^## Deuda conocida\|^### Deuda — RaizModule\|^### Pendiente — auditar fechas" CLAUDE.md
grep -n "^### Pendiente" CHANGELOG.md
grep -c " $" CLAUDE.md
grep -c " $" CHANGELOG.md
```

Esperado:
1. Sin cambios pendientes.
2. 4250 y 2237.
3. 3410, 4046 y 4167.
4. 2197.
5. 0 y 0.

Si algo no coincide (por ejemplo, si alguno de los dos archivos cambió
desde el último commit), DETENETE y reportá: los BUSCAR están armados
contra esas versiones exactas.

## PASO 1 — CLAUDE.md

1.1 BUSCAR:
```
- **UI:** Bootstrap 5 + ng-bootstrap. Tablas de datos: `TablaGenericaComponent` propio
  (reemplazó a AG Grid en los módulos refactorizados; AG Grid puede subsistir en módulos
  aún no migrados)
- **Backend/DB:** Firebase (Firestore + Auth + Hosting), Cloudinary (imágenes)
- **Exports:** ExcelJS, jsPDF, PDFMake
```
REEMPLAZAR:
```
- **UI:** Bootstrap 5 (`bootstrap.min.css` local, sin CDN) + ng-bootstrap; íconos
  `bootstrap-icons` locales. Tablas de datos: `TablaGenericaComponent` propio (AG Grid,
  jquery y DataTables se retiraron en el frente Lazy loading + fechas)
- **Backend/DB:** Firebase (Firestore + Auth + Hosting + Storage + Cloud Functions)
- **Exports:** ExcelJS, jsPDF (+ autotable), PDFMake (solo la Papelera legado)
- **Fechas:** `shared/utils/fecha.util.ts`, sin librerías (ver "Convenciones")
```

1.2 BUSCAR:
~~~~
npm run deploy:demo         # Build + firebase deploy (demo)
npm run deploy:vantruck     # Build + firebase deploy (vantruck)
```
~~~~
REEMPLAZAR:
~~~~
npm run deploy:demo         # set-version + build + firebase deploy (demo)
npm run deploy:vantruck     # set-version + build + firebase deploy (vantruck)
```

`npm install` / `npm uninstall` necesitan `--legacy-peer-deps` (`@angular/fire` 19 con
Angular 20: ERESOLVE preexistente). `deploy:*` regeneran `src/environments/version.ts`
(`set-version.js`): commitearlo después de deployar. `build:*` no lo regeneran a propósito
(cada build de verificación dejaría el archivo modificado).
~~~~

1.3 BUSCAR:
```
├── appLogin/          # Rutas sin autenticación (login, registro, reset)
├── raiz/              # App principal (lazy-loaded, protegida por RoleGuard)
```
REEMPLAZAR:
```
├── appLogin/          # Rutas sin autenticación (login, registro, reset)
├── componentes/       # Herramientas de /migracion (DesarrolloModule lazy, solo rol dev)
├── raiz/              # Shell (Home, Sidebar) lazy en '' + un módulo lazy por feature
```

1.4 BUSCAR:
~~~~
└── constants/         # Constantes de negocio
```

Todos los módulos bajo `raiz/` son lazy-loaded.
~~~~
REEMPLAZAR:
~~~~
└── constantes/        # Constantes de negocio
```

Ruteo (frente Lazy loading + fechas):
- `AppModule` no importa `RaizModule` ni ningún módulo de feature. `app-routing`: rutas
  sin autenticación, compatibilidad `/raiz` → `/op` y `/raiz/x` → `/x`,
  `''` → `loadChildren(RaizModule)` al final y `'**'` → `PagenotfoundComponent`. Las URLs
  no llevan `/raiz`.
- `RaizModule` declara solo el shell; cada feature es un chunk lazy desde `raiz-routing`
  (y `/migracion`, `DesarrolloModule`).
- `RoleGuard`: `canMatch` en las rutas de `raiz-routing` (un rol sin acceso no descarga
  el chunk) y `canActivate` en las rutas internas de cada módulo. Los dos devuelven
  `true | UrlTree`; nunca `false` en `canMatch` (el router seguiría buscando y caería en
  `'**'`).
~~~~

1.5 BUSCAR:
```
- Toda transición de estado vive en `LiquidacionService` (`servicios/liquidaciones/`).
  El `EstadoOp` debería construirse siempre desde el factory de Operaciones, nunca con
  literales inline.
```
REEMPLAZAR:
```
- Las transiciones de estado viven en `OperacionFactoryService.estadoInicial`,
  `OperacionService` (cierre) e `InformeLiqService` (liquidar / revertir). El
  `LiquidacionService` viejo se retiró en el frente Lazy loading + fechas (LR1). El
  `EstadoOp` debería construirse siempre desde el factory de Operaciones, nunca con
  literales inline.
```

1.6 Borrá la línea COMPLETA que contiene:
```
| `liquidaciones/` | Cálculo de liquidaciones y transiciones de estado de operación (proformas, InformeLiq) — camino VIEJO (InformeLiq/resumenLiq/proforma), reemplazado por `informes-liq/`; sin tocar hasta retirar el camino viejo (desde el Frente Finanzas ya no escribe `resumenFinanzas`) |
```
por:
```
(borrar la línea)
```

1.7 BUSCAR:
```
| `informes/` | Generación de reportes Excel y PDF — camino VIEJO (`ExcelService`/`PdfService`); los documentos de InformeLiqNuevo salen de `exportacion/` + `LiquidacionExportService` |
```
REEMPLAZAR:
```
| `informes/` | Generación de reportes Excel y PDF — camino VIEJO (`ExcelService`/`PdfService`): hoy solo los listados (operaciones, clientes, choferes, proveedores) y la Papelera legado; los documentos de InformeLiqNuevo salen de `exportacion/` + `LiquidacionExportService` |
```

1.8 BUSCAR:
```
| `fechas/` | Utilidades de fecha |
```
REEMPLAZAR:
```
| `fechas/` | `DateRangeService` (rango del tablero) y `toISODateString` (delega en `fechaNegocioDe`). El util único de fechas es `shared/utils/fecha.util.ts` — ver "Frente Lazy loading + fechas" |
```

1.9 BUSCAR:
```
ni un tercer proyecto, es una práctica ya establecida sobre el mismo `development`.
```
REEMPLAZAR:
```
ni un tercer proyecto, es una práctica ya establecida sobre el mismo `development`.

Budget del bundle inicial: `demo` aviso 2 MB / error 3 MB (hoy 1,53 MB); `production`
6 / 7 MB; `vantruck` sin budget hasta la migración (ver "Checklist — migración a
Vantruck: frente Lazy loading + fechas").
```

1.10 BUSCAR:
```
- **Locale argentino:** fechas en `dd/MM/yyyy`, miles con `.` y decimales con `,`. Hay servicios de formateo para ambos.
```
REEMPLAZAR:
```
- **Locale argentino:** fechas en `dd/MM/yyyy`, miles con `.` y decimales con `,`. Hay servicios de formateo para ambos.
- **Fechas:** todo pasa por `shared/utils/fecha.util.ts`. Fecha de negocio = string 'YYYY-MM-DD', operada como string o por partes; nunca `new Date('YYYY-MM-DD')` (medianoche UTC = 21:00 del día anterior en Argentina) ni `toISOString()` para obtenerla (desde las 21:00 da mañana). "Hoy" = `hoyNegocio()` (huso fijo de Argentina, igual en el cliente y en las Cloud Functions). Instantes = ISO UTC completo (`new Date().toISOString()`), mostrados con `instanteLegible`. Detalle en "Frente Lazy loading + fechas → Fechas".
```

1.11 BUSCAR:
```
lo haya vuelto a cargar) lo resuelve la Cloud Function `verificarVencimientosDocumentacion`
— ver más abajo.
```
REEMPLAZAR:
```
lo haya vuelto a cargar) lo resuelve la Cloud Function `verificarVencimientosDocumentacion`
— ver más abajo.

**Regla (decisión D1 del frente Lazy loading + fechas, Octubre 2026):** con `fechaVto = D`,
el documento está vigente todo el día D y vencido desde D+1; `'porVencer'` = de 0 a 45 días
de calendario hasta D. Se calcula sobre los strings, contra `hoyNegocio()`:
`calcularEstadoDocumentacion(fechaVto, hoy = hoyNegocio())` con `diasEntre(hoy, fechaVto)`.
Una `fechaVto` que no es 'YYYY-MM-DD' válida da `'sinVto'` (la Function además deja un
`logger.warn`). Antes se comparaba `new Date(fechaVto)` contra el instante actual: vencía a
las 21:00 del día anterior y cambiaba según la hora y el lado (cliente o servidor).
```

1.12 BUSCAR:
```
  nuevo en el legajo); 45 confirmado con el desarrollador. Vive en un solo lugar por
  copia (el `if diffDias <= 45` de cada una de las dos copias de
  `calcularEstadoDocumentacion()`) — sin tabla de configuración ni override por
```
REEMPLAZAR:
```
  nuevo en el legajo); 45 confirmado con el desarrollador. Vive en un solo lugar por
  copia (el `dias <= 45` de cada una de las dos copias de
  `calcularEstadoDocumentacion()`) — sin tabla de configuración ni override por
```

1.13 BUSCAR:
```
  la función).
- **Recalcula TODOS los `Documentacion[]` de TODOS los `legajos`** en cada corrida, y
```
REEMPLAZAR:
```
  la función). La copia de la Function trae su propio `hoyNegocio` (Intl, mismo huso) y
  sus helpers de fechas; la prueba en Node es `functions/test-vencimientos-scheduler.mjs`.
- **Recalcula TODOS los `Documentacion[]` de TODOS los `legajos`** en cada corrida, y
```

1.14 BUSCAR:
```
- Las fechas 'YYYY-MM-DD' no van por el pipe `date` (las toma como UTC y en
  Argentina muestra el día anterior): `fechaComprobanteLegible`.
```
REEMPLAZAR:
```
- Las fechas 'YYYY-MM-DD' se muestran con `fechaComprobanteLegible` (desde el
  frente Lazy loading + fechas delega en `fechaLegible`). Corrección: el pipe
  `date` de Angular toma 'YYYY-MM-DD' como fecha LOCAL, no como UTC; igual se
  prefiere el util para no depender de Date.
```

1.15 BUSCAR:
```
- Bundle: el modal nuevo vuelve a traer pdfjs + jsQR (`FacturaQrService`),
  +~0,5 MB al bundle inicial (8,02 → 8,54 MB) porque RaizModule importa los
  módulos de feature en forma eager (ver Deuda).
```
REEMPLAZAR:
```
- Bundle: el modal nuevo vuelve a traer pdfjs + jsQR (`FacturaQrService`),
  +~0,5 MB al bundle inicial (8,02 → 8,54 MB) porque RaizModule importa los
  módulos de feature en forma eager (ver Deuda). RESUELTO en el frente Lazy
  loading + fechas: Facturación es lazy y pdfjs + jsQR se cargan con `import()`
  recién al leer una factura.
```

1.16 BUSCAR:
```
  `estadoFinancieroDe`, FIFO, `diasEntre`, tramos), `movimiento-fin.util`
```
REEMPLAZAR:
```
  `estadoFinancieroDe`, FIFO, tramos; los días van con `diasEntre` /
  `diasEntreONulo` de `fecha.util`), `movimiento-fin.util`
```

1.17 BUSCAR:
```
- Se queda `interfaces/tarifa-gral-cliente.ts` (tipos viejos): lo usan `InformeOp`
  viejo, `migrar-datos` y `choferes-alta`; se va con la Liquidación vieja.
```
REEMPLAZAR:
```
- Se queda `interfaces/tarifa-gral-cliente.ts` (tipos viejos): lo usan `InformeOp`
  viejo y `choferes-alta`; se va con la Liquidación vieja (`migrar-datos` y las
  interfaces `TarifaGralCliente` / `AdicionalTarifa` se retiraron en el frente Lazy
  loading + fechas).
```

1.18 BUSCAR:
```
  `opToFirestore` reescribe lo que se leyó (spread).

## Deuda conocida
```
REEMPLAZAR:
```
  `opToFirestore` reescribe lo que se leyó (spread).

## Frente Lazy loading + fechas (Octubre 2026)

Tres partes:
- lazy loading real de los módulos;
- retiro del camino viejo de Liquidación y del código sin uso;
- un util único de fechas, con los bugs de huso horario corregidos.

Bloques LZ1–LZ7, LR1–LR2d, FE1–FE5b y CI1–CI2. Diseño, decisiones (L1–L11, D1–D10) y
avance: `claude/diseno-lazy-fechas.md` (Project). Todo se probó en demo; nada se deployó a
Vantruck (ver "Checklist — migración a Vantruck: frente Lazy loading + fechas").

### Lazy loading
- Ruteo nuevo: ver "Estructura de módulos" (`''` lazy al final de `app-routing`,
  compatibilidad `/raiz`, `'**'`, `canMatch`).
- `RaizModule` sin imports de feature: cada feature es su propio chunk. `/migracion` y
  sus herramientas en `DesarrolloModule` (`componentes/desarrollo.module.ts`), lazy, solo
  rol dev.
- `RoleGuard` con `canMatch` y `canActivate` devolviendo `UrlTree`; se retiró `canLoad`
  (deprecado).
- Retirados: AG Grid (registro, módulos, CSS, 2 renderers, dependencias), jquery y
  DataTables (`scripts` y dependencias), los CDN de `index.html`, el `bootstrap.scss`
  duplicado (queda `bootstrap.min.css`, el que ganaba en la cascada), Cloudinary,
  `ngx-filter-pipe`, `SharedRoutingModule` y `LogoutComponent`, más declaraciones muertas
  de Shared (`AccionGenerica`, `TableroCalendario`, `Role`, `FechaValida`, `Sortable`,
  `InformesAccionesCell`).
- `FacturaQrService` carga `pdfjs-dist` y `jsqr` con `import()`. El chunk de Facturación
  baja de 523 a 36 kB.
- Budget del inicial en la configuración `demo`: aviso 2 MB, error 3 MB.
- Resultado: bundle inicial 8,49 → 1,53 MB.
- Trampas:
  - `SharedModule` importa `RouterModule` directo: `tabla-listado` usa `routerLink`, y
    antes lo traía `SharedRoutingModule`;
  - `@types/lodash` es devDependency explícita: antes llegaba solo por Cloudinary.

### Retiro del camino viejo y código sin uso
- **LR1 / LR1b, Liquidación vieja sin ruta:**
  - componentes: `Proforma`, `LiquidacionesOp`, `MigrarDatos` (+ `FilterByPipe`),
    `ResumenOpLiquidadas`, `PeriodoModal`, `InformeLiqDetalle` y `Descuentos`;
  - `CalcularPorcentajeV2Pipe`;
  - `LiquidacionService` y `LiquidacionBuilderService`, con los miembros que quedaron
    huérfanos.
- **LR2a–LR2d:** los miembros sin uso de servicios vivos, iterando la cascada hasta cero.
  StorageService pasó de 1047 a 337 líneas y DbFirestoreService de 1547 a 1063 (conserva
  el bloque comentado "NO BORRAARRR"); además ValidarService, ExcelService, PdfService y
  otros.
- **CI1:** imports, inyecciones `private` y variables locales sin uso
  (`tsc --noUnusedLocals`: 58 → 1).
- **CI2:** archivos que nadie importaba (`constants/` duplicada, `FacturaReal`,
  interfaces de `informes-tabla`, `SupabaseStorageService`) y `@supabase/supabase-js`.
- **Se quedan** (decisión D5; retirarlos es decisión de producto del frente Ajustes):
  - Registro viejo (`logs`) y `LogService`;
  - Papelera legado + `ObjetoPapelera`;
  - `exportToExcelInforme` / `exportToPdfInforme`.
- **Excepción a no borrar:** el import de `appVersion` en `app.component.ts`. Parece sin
  uso, pero mete `version.ts` en la compilación: los `require()` de versión (app, home,
  sidebar) no los ve tsc, y sin ese import el build falla.
- **Método para buscar código sin uso:**
  1. `findReferences` del LanguageService de TypeScript sobre exports y miembros;
  2. uso en templates, por selector y por nombre de pipe;
  3. `tsc --noUnusedLocals`;
  4. archivos que no entran en la compilación (`.ts` de `src` contra
     `tsc -p tsconfig.app.json --listFiles`).
  Falsos positivos conocidos: `RoleGuard.canMatch` / `canActivate` (los usa el router) y
  `resetearPassword` / `puedeVer` (templates).

### Fechas — `shared/utils/fecha.util.ts`
Criterio (está también en el encabezado del util):
1. **Fecha de negocio:** string 'YYYY-MM-DD' (fecha de una operación, vencimiento de un
   documento, fecha de un movimiento). Se opera como string o por sus partes.
2. **Instante:** ISO UTC completo (alta, registro, anulación, log). Se muestra con
   `instanteLegible`, en hora de Argentina.
3. **"Hoy de negocio":** solo `hoyNegocio()`, con huso fijo
   `America/Argentina/Buenos_Aires` vía `Intl` (D2). Da lo mismo en cualquier navegador y
   en las Cloud Functions.
4. **Date → fecha de negocio:** `fechaNegocioDe` (fecha local). `toISODateString` se
   conserva y delega en él (D3).

| Función | Qué hace |
|---|---|
| `FechaNegocio`, `ZONA_NEGOCIO` | Alias de string 'YYYY-MM-DD'; huso del negocio |
| `esFechaNegocio(s)` | Formato y fecha de calendario real (rechaza '2026-02-30') |
| `partesFecha(f)` | `{ anio, mes, dia }`; lanza si es inválida |
| `hoyNegocio(ahora?)` | Hoy en Argentina |
| `fechaNegocioDe(d)` | Date → 'YYYY-MM-DD' con la fecha local |
| `sumarDias(f, n)` | Suma o resta días, sin depender del huso |
| `diasEntre(desde, hasta)` / `diasEntreONulo` | Días de calendario; la segunda devuelve null en vez de lanzar |
| `diasDelMes(anio, mes)` / `finDeMes('YYYY-MM')` | Último día del mes |
| `fechaLegible(f, vacio?)` | 'YYYY-MM-DD' → 'DD/MM/AAAA'; otro string, tal cual |
| `instanteLegible(iso, conHora?)` | ISO → 'DD/MM/AAAA HH:mm' en hora de Argentina |
| `anioDe(fecha)` | Año de un 'YYYY-MM-DD…' o de un Date (datos viejos) |

`fechaDMY`, `fechaComprobanteLegible` y `formatearFechaIso` conservan el nombre y delegan
en `fechaLegible`.

**Correcciones:**
- **Legajos (D1):** ver "Módulo Legajos → Cálculo de estado". Cliente y Function con la
  misma regla y el mismo "hoy".
- **Reportes:** "Últimos 12 meses" restaba meses con `setMonth`, y los días 31 daba 11
  meses; ahora usa `ultimos12Meses()`. El año y el mes por defecto, y `diasOperativos`,
  usan `hoyNegocio`.
- **"Hoy" por defecto** con `hoyNegocio` / `sumarDias`: registro-log, papelera (pasa a
  "últimos 30 días"), baja-objeto y `cambiarDia` del tablero de asignaciones.
- **Registro viejo:** el rango va de las 00:00 locales de "desde" a las 00:00 del día
  siguiente a "hasta".
- **Año del InformeLiq viejo** en Excel/PDF: `anioDe`.
- **Consolidación (D4):**
  - Finanzas usa `diasEntre` / `diasEntreONulo` (fuera `diasDesde` / `diasSeguros`);
  - `esFechaNegocio` en las validaciones de movimientos y de fecha de emisión;
  - `diasDelMes` / `finDeMes` en lugar de 5 cálculos;
  - generadores con `sumarDias`;
  - fuera `normalizarFecha` (rama muerta) y `fechaLocal`.
- **Fechas en nombres de archivo** con el hoy de Argentina: Excel de listados, sufijo de
  los backups de migración (`migration-backup` y `legajo-migracion` tienen que coincidir)
  y `buildDate` de `set-version.js`.
- **Pruebas:** cada bloque probó el util en Node bajo varios husos.
  - Compilar con `tsc … --skipLibCheck`.
  - En Windows, fijar `process.env.TZ` dentro del proceso: `TZ=` por entorno no toma
    efecto.

### Versión al deployar
`deploy:demo` y `deploy:vantruck` corren `node set-version.js` antes del build. Regenera
`version.ts` con la versión de package.json, el commit y la fecha. La app muestra solo
`appVersion` (sidebar).

## Deuda conocida
```

1.19 BUSCAR:
```
- `interfaces/tarifa-gral-cliente.ts` sobrevive por `InformeOp` viejo, `migrar-datos`
  (sus arrays de operaciones son `any[]`) y `choferes-alta`; se va con la Liquidación
  vieja.
```
REEMPLAZAR:
```
- `interfaces/tarifa-gral-cliente.ts` sobrevive por `InformeOp` viejo y `choferes-alta`;
  se va con la Liquidación vieja (`migrar-datos` se borró en el frente Lazy loading +
  fechas).
```

1.20 BUSCAR:
```
5. Eventual: previsualizar y confirmar → `registrosOpEventuales`.
```
REEMPLAZAR:
```
5. Eventual: previsualizar y confirmar → `registrosOpEventuales`. ANTES, corregir el
   parseo de `fecha` en `TarifaMigrationService` (decisión D7 del frente Lazy loading +
   fechas): en `tarifasEventuales` de Vantruck `fecha` es un string 'YYYY-MM-DD' y el
   código actual lo pasa por `Date` y lo deja un día antes; tomar el string tal cual.
   Revisar contra la fecha de su operación los 214 registros ya migrados en demo.
```

1.21 BUSCAR:
```
**No es deuda del modelo de datos de Legajos en sí** (ese frente ya resuelve el modelo
```
REEMPLAZAR:
```
**Fechas de vencimiento (FL4, frente Lazy loading + fechas):** `LegajoMigracionService`
convierte una `fechaVto` vieja en milisegundos con `toISOString()` (fecha UTC). Es correcto
solo si el valor era medianoche de Argentina; revisarlo contra los datos reales de Vantruck
antes de migrar (el Legajos viejo guardaba `new Date(fecha).getTime()`, 00:00 UTC).

**No es deuda del modelo de datos de Legajos en sí** (ese frente ya resuelve el modelo
```

1.22 BUSCAR:
```
- `revertirInformeLiq` (camino viejo) no restaura `bloqueadoPorContraparte`.
- Retirar el camino viejo (LiquidacionesOp, Proforma, LiquidacionService,
  LiquidacionBuilderService, rutas comentadas en liquidacion-routing y
  LiqGral) una vez migrado Vantruck.
```
REEMPLAZAR:
```
- ~~`revertirInformeLiq` (camino viejo) no restaura `bloqueadoPorContraparte`~~ y
  ~~retirar el camino viejo (LiquidacionesOp, Proforma, LiquidacionService,
  LiquidacionBuilderService, rutas comentadas en liquidacion-routing y
  LiqGral)~~ — RESUELTO en el frente Lazy loading + fechas (LR1): no tenía ruta
  ni consumidores vivos. Se quedan el Registro viejo y la Papelera legado
  (frente Ajustes).
```

1.23 BUSCAR:
```
- Pantallas viejas que leen por `InformeOpService.obtenerPorIdsOperacion`
  (proforma; la facturación vieja se borró en el Frente Finanzas) no filtran
  InformeOp 'anulado'. Se retiran con el camino viejo.
```
REEMPLAZAR:
```
- ~~Pantallas viejas que leen por `InformeOpService.obtenerPorIdsOperacion`~~
  — RESUELTO: el método y `proforma` se borraron en el frente Lazy loading +
  fechas (LR1 / LR1b).
```

1.24 BUSCAR:
```
- `FacturaQrService`: deja un `console.log` con el texto del QR; carga pdfjs
  + jsQR en el bundle inicial. Pasarlo a import dinámico cuando se resuelva
  la deuda de RaizModule.
```
REEMPLAZAR:
```
- `FacturaQrService`: deja un `console.log` con el texto del QR. ~~Carga pdfjs
  + jsQR en el bundle inicial~~ — RESUELTO en el frente Lazy loading + fechas
  (import dinámico).
```

1.25 BUSCAR:
```
- Camino viejo de Facturación (se retira con la migración de Vantruck):
  Supabase con anon key hardcodeada y toggle demo/Vantruck comentando
  código (las facturas históricas viven ahí: decidir en la migración si se
  copian a Storage); `anularLiquidacion` en chunks no atómicos y sin guarda
  de cobros (desde el Frente Finanzas ya no escribe `resumenFinanzas`).
```
REEMPLAZAR:
```
- Camino viejo de Facturación: las facturas históricas viven en Supabase;
  decidir en la migración si se copian a Storage (con una herramienta nueva
  de `/migracion`). ~~`SupabaseStorageService` con anon key hardcodeada~~ y
  ~~`anularLiquidacion` en chunks no atómicos~~ — borrados en el frente Lazy
  loading + fechas (CI2 y LR1). Las anon keys siguen en el historial de git:
  rotarlas en Supabase.
```

1.26 BUSCAR:
```
### Deuda — RaizModule importa los módulos de feature en forma eager
`RaizModule` importa en forma EAGER casi todos los módulos de feature
```
REEMPLAZAR:
```
### ~~Deuda — RaizModule importa los módulos de feature en forma eager~~ — RESUELTO (frente Lazy loading + fechas, Octubre 2026)
Ver "Frente Lazy loading + fechas → Lazy loading" (bundle inicial 8,49 → 1,53 MB). Texto
original:
`RaizModule` importa en forma EAGER casi todos los módulos de feature
```

1.27 BUSCAR:
```
- Sin uso, no tocados: `storageService` inyectado en `PdfService`; caso
  `"vendedores"` de la lista de logueables de `StorageService`; modo
  `"vendedores"` de `tablero-calendario`. El caso `'vendedores'` de
```
REEMPLAZAR:
```
- Sin uso, no tocados: caso `"vendedores"` de la lista de logueables de
  `StorageService` (~~`storageService` inyectado en `PdfService`~~ y
  ~~`tablero-calendario`~~: retirados en el frente Lazy loading + fechas). El caso `'vendedores'` de
```

1.28 BUSCAR:
```
### Pendiente — auditar fechas 'YYYY-MM-DD' vs huso horario en toda la app
Averiguar si la inconsistencia de `getPeriodo` se repite en otros lugares.
```
REEMPLAZAR:
```
### ~~Pendiente — auditar fechas 'YYYY-MM-DD' vs huso horario en toda la app~~ — RESUELTO (frente Lazy loading + fechas, Octubre 2026)
Ver "Frente Lazy loading + fechas → Fechas" y "Convenciones". Lo que quedó afuera está en
"Deuda — tras el frente Lazy loading + fechas". Texto original:
Averiguar si la inconsistencia de `getPeriodo` se repite en otros lugares.
```

1.29 BUSCAR:
```
- Los servicios viejos usan `new Date('YYYY-MM-DD').getFullYear()` (ver
  "Pendiente — auditar fechas").
```
REEMPLAZAR:
```
- ~~Los servicios viejos usan `new Date('YYYY-MM-DD').getFullYear()`~~ — RESUELTO
  en el frente Lazy loading + fechas (`anioDe`).
- Excel de choferes (decisión D6 del frente Lazy loading + fechas):
  `ExcelService.formatearFecha` muestra `fechaNac` un día antes (`new Date` sobre
  un string 'YYYY-MM-DD'), y `Chofer.datosPersonales.fechaNac` está tipado `Date`
  aunque se guarda como string. Se corrige al reescribir esa exportación sobre
  `DocumentoTabular` (`fechaLegible`).
- `exceljs` (~0,95 MB) se descarga al entrar a `/op` porque `tablero-op` inyecta
  `ExcelService` (import estático). Se resuelve con la misma reescritura
  (`ExcelTabularService` ya lo carga con `import()`).

### Deuda — tras el frente Lazy loading + fechas
- **UX:** el `<h1>` sin cerrar de `src/index.html` envuelve TODA la app
  (`app-root.parentElement` es el `H1`). Todo texto sin tamaño propio hereda 24 px,
  peso 500 y `line-height` 1,2. Sacarlo cambia la tipografía global: hace falta
  revisión visual pantalla por pantalla.
- **Ajustes / Papelera legado:** `clientes$`, `choferes$` y `proveedores$` de
  `StorageService` siempre emiten `[]`: nadie escribe esas claves de `localStorage` y
  `clearAllLocalStorage()` las borra en cada login. Afecta al Excel/PDF de documentos
  viejos en `objeto-papelera` (listas vacías). `modal-vehiculo` asigna `$proveedores`
  sin usarlo. Se va con la Papelera legado.
- **Bundle:**
  - `pdfmake` (~2,5 MB) queda en el chunk de Ajustes, solo por `papelera-legado`; se va
    con la Papelera legado;
  - `exceljs` en `/op`: ver "Deuda — Excel/PDF".
- **Specs de Karma:** 7 no compilan (`npm test` no corre). Son nombres de clase que ya
  no existen (`clientes-control`, `valores-op`) y directivas instanciadas sin
  argumentos (5 specs). Preexistente.
- **Versión:**
  - `app.component`, `home` y `sidebar` leen la versión con `require()`; se podría
    pasar a un import estático y retirar el fallback `v0.0.0`;
  - `buildMeta` (commit y fecha) no se muestra en ninguna pantalla.
- **Prueba opcional de FE2:** correr la Function de vencimientos en el emulador, y
  probar después de las 21:00 que un documento que vence hoy sigue vigente.

### Checklist — migración a Vantruck: frente Lazy loading + fechas
Después del backup completo y de deployar este código en `pf-logistics`:
1. **Cloud Functions:** deployar `verificarVencimientosDocumentacion` con la regla
   nueva (D1) y forzar una corrida. Recalcula el estado de todos los legajos y la
   colección `vencimientos`.
2. **Budget:** agregar a la configuración `vantruck` de `angular.json` el budget del
   inicial (aviso 2 MB, error 3 MB), y actualizar o quitar el de `production`
   (6 / 7 MB).
3. **Eventuales (D7):** ver "Checklist — migración de Tarifas a Vantruck", paso 5.
4. **Legajos (FL4):** ver "Deuda — migración a Vantruck: Choferes/Vehículos/Legajos"
   → fechas de vencimiento.
5. **Producción hoy (`main`, D10; revisado sin tocar):**
   - FV1: el Legajos viejo vence a las 21:00 del día anterior (estado calculado en el
     cliente con `new Date(fechaVto)`, umbral de 30 días);
   - FV2: "Últimos 12 meses" de Reportes da 11 meses los días 31.
   Los dos se corrigen solos con la migración (Vantruck pasa a correr este código). Al
   migrar, avisar al usuario que "por vencer" pasa de 30 a 45 días.
6. **Supabase:** decidir qué hacer con las facturas históricas (ver "Deuda —
   Facturación") y rotar las anon keys.
```


## PASO 2 — CHANGELOG.md

2.1 BUSCAR:
```
---

### Pendiente

Detalle de cada punto en `CLAUDE.md` → "Deuda conocida".
```
REEMPLAZAR:
```
---

## Frente Lazy loading + fechas (Octubre 2026)

- **Lazy loading:**
  - `AppModule` sin `RaizModule`; `''` lazy al final de `app-routing`, con
    compatibilidad `/raiz` y `'**'` → página no encontrada;
  - `RaizModule` sin imports de feature: cada módulo es su chunk, y
    `/migracion` va en `DesarrolloModule`;
  - `RoleGuard` con `canMatch`;
  - QR de facturas con `import()`;
  - budget del inicial en `demo` (2 / 3 MB);
  - bundle inicial 8,49 → 1,53 MB.
- **Fuera:**
  - dependencias: AG Grid, jquery, DataTables, Cloudinary,
    `ngx-filter-pipe` y `@supabase/supabase-js`;
  - los CDN de `index.html` y el Bootstrap duplicado;
  - la Liquidación vieja sin ruta (Proforma, LiquidacionesOp, MigrarDatos,
    `LiquidacionService`, `LiquidacionBuilderService` y sus modales);
  - los miembros, imports, inyecciones y archivos sin uso (StorageService
    1047 → 337 líneas; DbFirestoreService 1547 → 1063).
- **Fechas** (util único `shared/utils/fecha.util.ts`, "hoy" con huso fijo
  de Argentina):
  - Legajos: vigente todo el día del vencimiento y vencido desde el
    siguiente, igual en el cliente y en la Cloud Function (deployada en
    demo);
  - "Últimos 12 meses" de Reportes (los días 31 daba 11 meses);
  - "hoy" por defecto en Registro, Papelera (últimos 30 días) y baja: antes
    daba mañana desde las 21:00;
  - flechas de día del tablero de asignaciones;
  - rango del Registro viejo y año del InformeLiq viejo;
  - consolidación de los helpers duplicados (días, formato DD/MM/AAAA, fin
    de mes);
  - nombres de archivo con la fecha de Argentina.
- **`deploy:demo` / `deploy:vantruck`** regeneran `version.ts`
  (`set-version.js`).

Detalle en `CLAUDE.md` → "Frente Lazy loading + fechas"; deudas en "Deuda —
tras el frente Lazy loading + fechas"; pasos para Vantruck en "Checklist —
migración a Vantruck: frente Lazy loading + fechas".

**Verificación:** `ng build --configuration=demo` limpio en cada bloque
(mismas 9 advertencias), pruebas del util en Node bajo varios husos y
pruebas manuales en demo. Diseño y avance: `claude/diseno-lazy-fechas.md`
(Project).

---

### Pendiente

Detalle de cada punto en `CLAUDE.md` → "Deuda conocida".
```

2.2 BUSCAR:
```
- Ajustes: retirar el `LogService` viejo (colección `logs`) y la Papelera
  legado.
```
REEMPLAZAR:
```
- Ajustes: retirar el `LogService` viejo (colección `logs`) y la Papelera
  legado (con `objeto-papelera`, `exportToExcelInforme` / `exportToPdfInforme`
  y PDFMake).
- UX: el `<h1>` sin cerrar de `index.html` envuelve toda la app (ver "Deuda —
  tras el frente Lazy loading + fechas").
```

2.3 BUSCAR:
```
- Auditoría de fechas 'YYYY-MM-DD' vs huso horario en toda la app.
- Excel/PDF de los demás informes sobre `DocumentoTabular` + los renderers
  de `servicios/exportacion/`.
- RaizModule: imports eager de los módulos de feature (lazy loading, bundle
  inicial).
```
REEMPLAZAR:
```
- Excel/PDF de los demás informes sobre `DocumentoTabular` + los renderers
  de `servicios/exportacion/` (incluye el Excel de choferes, D6, y saca
  `exceljs` del chunk de `/op`).
- Specs de Karma: 7 no compilan (`npm test` no corre).
```

2.4 BUSCAR:
```
  `resumenFinanzas` y de las colecciones viejas de tarifas, y retiro del
  camino viejo (LiquidacionesOp, Proforma, exportaciones viejas de
  liquidación).
```
REEMPLAZAR:
```
  `resumenFinanzas` y de las colecciones viejas de tarifas. Del frente Lazy
  loading + fechas: "Checklist — migración a Vantruck: frente Lazy loading +
  fechas" (deploy de la Function de vencimientos, budget de `vantruck`,
  eventuales D7, legajos FL4).
```

## Verificación

1. Comandos (reportá la salida):
```
grep -n "^## Frente Lazy loading + fechas\|^## Deuda conocida\|^### Deuda — tras el frente Lazy\|^### Checklist — migración a Vantruck: frente" CLAUDE.md
grep -c "Cloudinary (imágenes)\|Toda transición de estado vive en\|^| \`liquidaciones/\`" CLAUDE.md
grep -c "^## Frente Lazy loading + fechas" CHANGELOG.md
grep -c "Auditoría de fechas 'YYYY-MM-DD'" CHANGELOG.md
wc -l CLAUDE.md CHANGELOG.md
grep -c " $" CLAUDE.md
grep -c " $" CHANGELOG.md
git diff --numstat
git status --short
```
Esperado:
- (a) 4 líneas, en este orden: 3449 (Frente), 3573 (Deuda conocida), 4439
  (Deuda — tras el frente) y 4463 (Checklist).
- (b) 0.
- (c) 1.
- (d) 0.
- (e) 4481 y 2286.
- (f) 0 y 0.
- (g) CHANGELOG.md `57 8`; CLAUDE.md `278 47`.
- (h) solo CLAUDE.md y CHANGELOG.md modificados (más los `.md` de
  instrucciones sin trackear, si los hay).

2. Mostrá el diff completo de los dos archivos.

No hace falta build: no se toca código.

## Revisión (Nico)

Leé en el diff:
1. CLAUDE.md → "## Frente Lazy loading + fechas": que el ruteo, lo retirado y
   el criterio de fechas coincidan con lo que ves en el código y en demo.
2. "Módulo Legajos → Cálculo de estado": la regla D1.
3. "Deuda — tras el frente Lazy loading + fechas" y "Checklist — migración a
   Vantruck: frente Lazy loading + fechas": que no falte nada de lo anotado
   en el frente.
4. CHANGELOG: la entrada nueva y el "Pendiente".

## Mensaje de commit

```
docs(lazy-fechas): cierre del frente — CLAUDE.md y CHANGELOG (DOC)

- CLAUDE.md: Stack, Comandos, Estructura de módulos (+ ruteo lazy),
  Operaciones, Servicios clave, Entornos de build (budgets) y Convenciones
  (criterio de fechas) al día; regla D1 de vencimientos en Legajos; sección
  nueva "Frente Lazy loading + fechas"; deudas resueltas tachadas (RaizModule,
  auditoría de fechas, camino viejo de Liquidación, QR, Supabase); nuevas
  "Deuda — tras el frente Lazy loading + fechas" y "Checklist — migración a
  Vantruck: frente Lazy loading + fechas" (D6, D7, D10, FL4, budget, Function).
- CHANGELOG: entrada del frente y "Pendiente" al día.
```

FIN DE LA INSTRUCCIÓN DOC
````
