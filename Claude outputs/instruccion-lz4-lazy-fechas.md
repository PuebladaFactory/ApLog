````
Si no ves la línea FIN DE LA INSTRUCCIÓN LZ4 al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN LZ4 — Frente Lazy loading + fechas (ApLog, rama refactor)
=====================================================================
Estilos y scripts globales: Bootstrap duplicado, jquery, datatables, CDN

## Contexto y razonamiento

El bundle inicial carga cosas globales que sobran (angular.json →
build.options.styles / scripts, e index.html):

- Bootstrap entra DOS veces: `bootstrap/scss/bootstrap.scss` (compilado en
  cada build) y `bootstrap/dist/css/bootstrap.min.css`. Son la misma
  versión; como el .min.css va después, hoy es el que gana en la cascada.
  Se saca el .scss y se deja el .min.css → cero cambio visual (lo que hoy
  se ve es el .min.css) y el build ya no compila Bootstrap. Ningún .scss
  del proyecto importa variables de Bootstrap (las líneas @import de
  styles.scss están comentadas).
- scripts: jquery y 4 archivos de DataTables. Ningún componente usa jQuery
  ni DataTables (no hay `$(`, `jQuery`, `DataTable` en src/). Se queda
  bootstrap.bundle.min.js: lo usan los `data-bs-toggle` (dropdowns y
  collapse) de varios templates.
- index.html:
  - CSS de DataTables Responsive por CDN: sin uso.
  - bootstrap-icons por CDN (sin versión fija) duplicado: el mismo CSS ya
    entra desde node_modules (1.13.1) en styles. Verificado: los 37
    íconos `bi-*` que usa la app existen en el CSS local.
- package.json: jquery, jquery-dropdown-datepicker, datatables.net,
  datatables.net-bs5, datatables.net-responsive,
  datatables.net-responsive-bs5 y @types/jquery: sin uso. tsconfig.json
  declara "jquery" en compilerOptions.types (tsconfig.app.json y
  tsconfig.spec.json lo pisan con su propia lista): se quita.

NO se toca el `<h1>` suelto de index.html (está antes de <app-root> y
nunca se cierra). Hallazgo importante al revisarlo: el navegador mete TODA
la app dentro de ese <h1>, así que todo texto sin tamaño propio hereda
font-size 24px / font-weight 500 / line-height 1.2 del h1. Sacarlo
cambiaría la tipografía de toda la app: es una decisión visual y queda
anotada para el frente de UX. Este bloque no cambia nada visible.

Sobre npm: igual que en LZ3, `npm uninstall` necesita
`--legacy-peer-deps` (conflicto preexistente de @angular/fire). Verificado
sobre una copia del lock: solo salen los 7 paquetes de arriba más
@types/sizzle (dependencia de @types/jquery).

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
grep -rn "jquery\|jQuery\|DataTable\|datatables\|\$(" src --include=*.ts --include=*.html
grep -rn "@import\|@use" src --include=*.scss --include=*.css
grep -n "jquery\|datatables" angular.json package.json tsconfig.json tsconfig.app.json tsconfig.spec.json
grep -n "cdn\." src/index.html
```

Esperado:
- Primer grep: solo la línea del CSS de DataTables en src/index.html (el
  patrón `$(` no tiene que aparecer en ningún .ts/.html).
- Segundo grep: `@use 'sass:color'` (styles.scss y scroll-to-top), los
  dos @import de bootstrap COMENTADOS en styles.scss, y los @import de
  fontawesome / Google Fonts (login, forgot-password, home). Ningún
  @import/@use de bootstrap sin comentar.
- Tercer grep: angular.json (5 scripts: jquery + 4 datatables),
  package.json (7 dependencias) y tsconfig.json ("jquery" en types).
- Cuarto grep: las dos líneas de CDN (datatables y jsdelivr).

Si algo no coincide, detenete y reportá.

## PASO 1 — angular.json (build.options)

1.1 BUSCAR:
```
              "node_modules/bootstrap/scss/bootstrap.scss",
              "node_modules/bootstrap/dist/css/bootstrap.min.css",
```
REEMPLAZAR:
```
              "node_modules/bootstrap/dist/css/bootstrap.min.css",
```

1.2 BUSCAR:
```
                "node_modules/jquery/dist/jquery.min.js",
                "node_modules/bootstrap/dist/js/bootstrap.bundle.min.js",
                "node_modules/datatables.net/js/dataTables.min.js",
                "node_modules/datatables.net-bs5/js/dataTables.bootstrap5.js",
                "node_modules/datatables.net-responsive/js/dataTables.responsive.js",
                "node_modules/datatables.net-responsive-bs5/js/responsive.bootstrap5.js"
```
REEMPLAZAR:
```
                "node_modules/bootstrap/dist/js/bootstrap.bundle.min.js"
```

Verificá que sigue siendo JSON válido:
`node -e "JSON.parse(require('fs').readFileSync('angular.json','utf8')); console.log('angular.json OK')"`

## PASO 2 — src/index.html

2.1 BUSCAR:
```
  <link rel="stylesheet" href="https://cdn.datatables.net/responsive/2.4.0/css/responsive.bootstrap5.min.css">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css" rel="stylesheet">
```
REEMPLAZAR:
```
  <!-- Bootstrap, bootstrap-icons y estilos globales entran por angular.json (styles). -->
```
(El `<h1>` de más abajo NO se toca.)

## PASO 3 — tsconfig.json

3.1 BUSCAR:
```
      "@angular/localize",
      "jquery"
```
REEMPLAZAR:
```
      "@angular/localize"
```

## PASO 4 — Dependencias

```
npm uninstall jquery jquery-dropdown-datepicker datatables.net datatables.net-bs5 datatables.net-responsive datatables.net-responsive-bs5 @types/jquery --legacy-peer-deps
```
Reportá `git diff --stat package.json package-lock.json`. En el lock solo
tienen que desaparecer esos 7 paquetes y @types/sizzle. Si cambia
cualquier otra dependencia, detenete y reportá.

## Verificación

1. Greps (reportá la salida):
```
grep -rn "jquery\|datatables\|bootstrap.scss" angular.json package.json tsconfig.json src/index.html
grep -c "jquery\|datatables" package-lock.json
grep -n "<h1>" src/index.html
git diff -U0 -- angular.json src/index.html tsconfig.json | grep -n "^+.* $"
```
Esperado: (a) nada; (b) 0; (c) la línea del `<h1>` (sin cambios);
(d) nada.

2. `npm run build:demo`. Reportá la tabla de tamaños y las advertencias.
   Referencia (medido sobre una copia del repo con LZ1–LZ3 + este
   cambio):
   - styles.css: 473 kB → ≈ 310 kB;
   - scripts.js: 286 kB → ≈ 80 kB;
   - Initial total: 1,99 MB → ≈ 1,62 MB;
   - las mismas 9 advertencias. El build tiene que ser un poco más rápido
     (ya no compila Bootstrap desde SCSS).

## Pruebas manuales en demo (las hace Nico)

1. Revisión visual (no tiene que cambiar nada): login, sidebar, una
   pantalla de listado (Clientes), tablero de operaciones, un modal de
   alta, Finanzas → Resumen.
2. Componentes de Bootstrap que usan su JS: dropdowns con
   `data-bs-toggle` (Ajustes → Registro, Legajos → tablero) y el collapse
   del modal de vehículo (Choferes → editar → vehículo). Los dropdowns de
   ng-bootstrap (ngbDropdown) y los modales siguen igual.
3. Íconos (bootstrap-icons) en botones de acciones, sidebar y tablas.
4. Consola del navegador sin errores nuevos (en particular, nada de
   "$ is not defined" ni 404 de CDN).

## Mensaje de commit

```
LZ4 (lazy-fechas): estilos y scripts globales sin duplicados ni librerías sin uso

- angular.json: fuera bootstrap.scss (Bootstrap entraba dos veces; queda
  el .min.css, que es el que ya ganaba), jquery y los 4 scripts de
  DataTables (sin uso). Queda bootstrap.bundle (data-bs-toggle).
- index.html: fuera el CSS de DataTables y bootstrap-icons por CDN
  (duplicado del de node_modules).
- tsconfig.json: fuera "jquery" de types.
- npm uninstall jquery, jquery-dropdown-datepicker, datatables.net*,
  @types/jquery (--legacy-peer-deps).
- Bundle inicial: ~1,99 MB → ~1,62 MB. Sin cambios visuales (el <h1>
  suelto de index.html queda para el frente de UX).
```

FIN DE LA INSTRUCCIÓN LZ4
````
