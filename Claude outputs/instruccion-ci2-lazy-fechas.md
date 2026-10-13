````
Si no ves la línea FIN DE LA INSTRUCCIÓN CI2 al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN CI2 — Frente Lazy loading + fechas (ApLog, rama refactor)
=====================================================================
Cierre (código, 2/2): archivos huérfanos + @supabase/supabase-js

## Contexto y razonamiento

**Por qué no se habían detectado.** `tsconfig.app.json` compila a partir
de `src/main.ts` y sigue los imports. Un archivo que nadie importa no entra
en la compilación, así que el análisis de referencias y
`tsc --noUnusedLocals` no lo ven. Comparando todos los `.ts` de `src` (sin
specs) contra la lista de archivos de la compilación quedan 4 huérfanos de
código, más los esperables (`environment.prod` / `environment.vantruck`,
que entran por `fileReplacements`, `polyfills.ts` y `test.ts`):

| Archivo | Qué es |
|---|---|
| `src/app/constants/tipos-comprobante.ts` | Copia idéntica byte a byte de `src/app/constantes/tipos-comprobante.ts`, que es la que se usa. La carpeta `constants/` queda vacía y desaparece |
| `src/app/interfaces/factura-real.ts` | Interfaz `FacturaReal` (+ 3 auxiliares), nunca usada |
| `src/app/interfaces/informes-tabla.ts` | Interfaces del componente `informes-tabla`, borrado en el Frente Finanzas (F9) |
| `src/app/servicios/supabase/supabase-storage.service.ts` (+ spec) | `SupabaseStorageService`. Sus consumidores (Facturación vieja) se borraron en F9. Tiene las anon keys de Supabase escritas en el código |

**Decisión de Nico:** se borran los 4 (con el spec de Supabase) y se
desinstala `@supabase/supabase-js`.
- Si en la migración hay que leer las facturas históricas de Supabase, se
  arma una herramienta nueva en `/migracion`.
- Las keys siguen en el historial de git: borrar el archivo no las revoca.

**npm (verificado sobre una copia):**
- `npm uninstall @supabase/supabase-js --legacy-peer-deps`:
  - −1 línea en package.json;
  - lock: 1 agregada y 124 borradas. Salen los 7 paquetes `@supabase/*`
    (más el `ws` anidado de realtime-js), `@types/phoenix`, `tr46`,
    `webidl-conversions` y `whatwg-url`; `@types/ws` pasa a `"dev": true`.
- `--legacy-peer-deps` hace falta por el ERESOLVE preexistente
  (`@angular/fire` 19 con Angular 20).
- `npm ci --legacy-peer-deps` sobre el lock resultante instala limpio.
- `tsc` limpio. `build:demo` limpio, con las 9 advertencias y los tamaños
  sin cambio (el servicio no estaba en el bundle). Specs: los mismos 7
  errores previos.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- NO corras `npm run deploy:*`, `npm run build` ni `node set-version.js`.
  Para compilar usá `npm run build:demo`.
- No toques CLAUDE.md ni CHANGELOG.md.
- Si algo del PASO 0 no coincide: detenete y reportá.

## PASO 0 — Verificación (sin modificar nada)

Corré y reportá la salida:

```
git status --short
ls src/app/constants src/app/servicios/supabase
cmp src/app/constants/tipos-comprobante.ts src/app/constantes/tipos-comprobante.ts && echo IDENTICOS
grep -rln "constants/\|factura-real\|informes-tabla\|FacturaReal\|supabase\|Supabase" src --include=*.ts --include=*.html --include=*.json
grep -n "supabase" package.json angular.json tsconfig.json tsconfig.app.json
npx tsc -p tsconfig.spec.json --noEmit 2>&1 | grep -c "error TS"
```

Esperado:
1. `git status`: sin cambios pendientes.
2. `constants/`: solo `tipos-comprobante.ts`. `supabase/`:
   `supabase-storage.service.ts` y su `.spec.ts`.
3. `IDENTICOS`.
4. Solo 3 archivos, todos de los que se borran: los 2 de
   `servicios/supabase/` e `interfaces/factura-real.ts`. Ningún otro
   archivo los nombra (`informes-tabla.ts` no aparece porque no contiene
   esos términos).
5. Una sola línea: `"@supabase/supabase-js": "^2.56.0",` en package.json.
6. 7 (los errores previos de los specs).

## PASO 1 — Borrar archivos

Borrá estos 5 archivos (con `git rm`):
```
src/app/constants/tipos-comprobante.ts
src/app/interfaces/factura-real.ts
src/app/interfaces/informes-tabla.ts
src/app/servicios/supabase/supabase-storage.service.ts
src/app/servicios/supabase/supabase-storage.service.spec.ts
```
Si después quedan vacías las carpetas `src/app/constants/` y
`src/app/servicios/supabase/`, borralas.

## PASO 2 — Desinstalar la dependencia

```
npm uninstall @supabase/supabase-js --legacy-peer-deps
```

## Verificación

1. Comandos (reportá la salida):
```
git status --short
git diff --numstat -- package.json package-lock.json
grep -rn "supabase" package.json src
ls node_modules/@supabase
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit 2>&1 | grep -c "error TS"
```
Esperado:
- (a) 5 borrados (`D`) y 2 modificados: package.json y package-lock.json.
- (b) package.json `0 1`; package-lock.json `1 124`.
- (c) nada.
- (d) no existe.
- (e) sin errores.
- (f) 7, igual que en el PASO 0.

2. `npm run build:demo`. Reportá la tabla de tamaños y las advertencias.
   Referencia: sin cambios (main ≈ 1,10 MB; Initial total ≈ 1,53 MB) y
   las mismas 9 advertencias.

## Pruebas manuales en demo (las hace Nico)

No cambia nada visible. Alcanza con una recorrida rápida:
1. Login y Home.
2. Facturación → Facturados: ver un PDF de factura (va por Firebase
   Storage, no por Supabase).
3. Vincular una factura (lectura del QR): sigue funcionando.

## Mensaje de commit

```
CI2 (lazy-fechas): cierre de código — archivos huérfanos y @supabase/supabase-js

- Fuera 4 archivos que nadie importaba (no entraban en la compilación):
  constants/tipos-comprobante.ts (copia idéntica de constantes/),
  interfaces/factura-real.ts, interfaces/informes-tabla.ts y
  SupabaseStorageService (+ spec; sin consumidores desde Finanzas F9,
  con anon keys en el código).
- npm uninstall @supabase/supabase-js.
```

FIN DE LA INSTRUCCIÓN CI2
````
