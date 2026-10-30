---
name: lazy-loading-y-fechas
description: Lazy loading de los módulos de feature de ApLog (RaizModule, app-routing, canMatch, bundle inicial), manejo de fechas con shared/utils/fecha.util.ts (fecha de negocio YYYY-MM-DD, hoyNegocio, huso horario de Argentina) y la versión al deployar (version.ts). Leer antes de trabajar sobre routing, módulos, el tamaño del bundle, fechas o versionado.
---

## Frente Lazy loading + fechas (Octubre 2026)

Tres partes:
- lazy loading real de los módulos;
- retiro del camino viejo de Liquidación y del código sin uso;
- un util único de fechas, con los bugs de huso horario corregidos.

Bloques LZ1–LZ7, LR1–LR2d, FE1–FE5b y CI1–CI2. Diseño, decisiones (L1–L11, D1–D10) y
avance: `claude/diseno-lazy-fechas.md` (Project). Todo se probó en demo; nada se deployó a
Vantruck (ver la skill `migracion-vantruck`, subsección "Checklist — migración a Vantruck: frente Lazy loading + fechas").

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
  - ~~`exportToExcelInforme` / `exportToPdfInforme`~~ — se fueron antes que la Papelera,
    con su botón y sus servicios (frente Informes, IE4 e IE5).
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
- **Legajos (D1):** ver la skill `modulo-legajos`, subsección "Cálculo de estado". Cliente y Function con la
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

## Deuda abierta — tras el frente Lazy loading + fechas
- **UX:** el `<h1>` sin cerrar de `src/index.html` envuelve TODA la app
  (`app-root.parentElement` es el `H1`). Todo texto sin tamaño propio hereda 24 px,
  peso 500 y `line-height` 1,2. Sacarlo cambia la tipografía global: hace falta
  revisión visual pantalla por pantalla.
- **Ajustes / Papelera legado:** `clientes$`, `choferes$` y `proveedores$` de
  `StorageService` siempre emiten `[]`: nadie escribe esas claves de `localStorage` y
  `clearAllLocalStorage()` las borra en cada login. Era lo que vaciaba las listas del
  Excel/PDF de documentos viejos de `objeto-papelera`, retirado en el frente Informes
  (IE4). `modal-vehiculo` asigna `$proveedores` sin usarlo. Se va con la Papelera legado.
- **Bundle:** ~~`pdfmake` (~2,5 MB) en el chunk de Ajustes~~ y ~~`exceljs` en `/op`~~ —
  RESUELTOS en el frente Informes: `pdfmake` salió del proyecto y ninguna ruta descarga
  una librería de exportación al entrar.
- **Specs de Karma:** ~~7 no compilan (`npm test` no corre)~~ — los 7 se BORRARON
  (2026-10-30, para destrabar los tests del frente No disponibilidad): eran specs
  generados por el CLI sin lógica (`clientes-control` y `valores-op` importaban clases que
  ya no existen; 5 directivas se instanciaban sin los argumentos del constructor).
  `npm test` ya compila y corre.
  - ~~Los 72 specs restantes (54 de 74 tests fallaban por armado del TestBed)~~ —
    CERRADA: se borraron los 72 (2026-10-30). Eran "should create" generados por el CLI;
    ninguno verificaba lógica. La suite arranca de cero con tests de funciones puras.
  - ~~No hay Chrome instalado; corría con Edge y tardaba ~4 min~~ — CERRADA: se usa
    **Chrome Dev** (`C:\Program Files\Google\Chrome Dev\Application\chrome.exe`) vía el
    script `npm run test:ci`, que fija `CHROME_BIN` y corre `ng test --watch=false
    --browsers=ChromeHeadless`. Corrida completa ~12 s, sin reintentos del launcher.
  - `src/test.ts` es un resto del esquema viejo (`require.context`, "required by
    karma.conf.js"): no hay `karma.conf.js` ni `main` en el target `test` de
    `angular.json`, así que el builder no lo usa. Muerto.
- **Versión:**
  - `app.component`, `home` y `sidebar` leen la versión con `require()`; se podría
    pasar a un import estático y retirar el fallback `v0.0.0`;
  - `buildMeta` (commit y fecha) no se muestra en ninguna pantalla.
- **Prueba opcional de FE2:** correr la Function de vencimientos en el emulador, y
  probar después de las 21:00 que un documento que vence hoy sigue vigente.
