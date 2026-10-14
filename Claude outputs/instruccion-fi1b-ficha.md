````
Si no ves la línea FIN DE LA INSTRUCCIÓN FI1b al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN FI1b — Ficha de entidad: pestañas sin ngbNav (fix de NG0309) (ApLog, rama refactor)
================================================================================================

## Contexto y razonamiento

Al abrir la ficha (FI1), el encabezado se ve pero el contenido no, y la consola muestra:
`NG0309: Directive NgbNavLinkBase matches multiple times on the same element`.

**Causa:** el proyecto usa ng-bootstrap 15.1.2, compilado para Angular 16. En esa
versión, `NgbNavLinkButton` (selector `button[ngbNavLink]`) y `NgbNavLink`
(`a[ngbNavLink]`) declaran `hostDirectives: [NgbNavLinkBase]`, y `NgbNavLinkBase` además
tiene su propio selector `[ngbNavLink]`. Sobre el mismo elemento, la directiva base se
aplica dos veces: Angular 16 lo toleraba; Angular 20 lo rechaza (NG0309) y corta el
render. El build no lo detecta porque el error aparece recién al renderizar. Es la
primera vez que la app usa `ngbNav`; las demás pestañas del proyecto son por ruta.

**Corrección:** las pestañas de la ficha se arman con las clases de Bootstrap
(`nav nav-tabs` / `nav-link` + `[class.active]`) y el contenido con `@switch (pestana)`.
Mismo aspecto y mismo comportamiento: solo se renderiza la pestaña activa. Sin `ngbNav`,
`main` vuelve al tamaño de antes de FI1 (inicial 1,54 → 1,53 MB). Actualizar ng-bootstrap
a la versión que corresponde a Angular 20 queda como deuda aparte (cierre del frente).

**Verificación previa:**
- Prueba de render real (Karma + Chromium headless, `TestBed` con `SharedModule` y los
  servicios simulados con `BehaviorSubject`): con el HTML de FI1 reproduce exactamente el
  NG0309; con este cambio pasa. Comprueba el encabezado (nombre, CUIT con guiones,
  "Oculto en listados", "Legajo: Vencido"), la fecha de nacimiento 01/03/1980, las 3
  pestañas, "Vehículos del proveedor …" con el dominio y "Sí (Gps)", el legajo con
  "Ver (1)" y "Falta cargar", la actualización en vivo (cambio de apellido) y el aviso de
  baja (chofer que desaparece).
- La prueba fue temporal: no se agrega al repo (los 7 specs rotos impiden `npm test`).
- `tsc` limpio; `build:demo` limpio con las 9 advertencias; main 1,10 MB, inicial
  1,53 MB, chunk de Legajos 165,59 kB.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- NO corras `npm run deploy:*`, `npm run build` ni `node set-version.js`. Para compilar
  usá `npm run build:demo`.
- Si el texto a BUSCAR no está o aparece más de una vez: detenete y reportá. Es un bloque
  de líneas completas.
- Editá el archivo en el lugar (leer, reemplazar, escribir). Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.

## PASO 0 — Verificación (sin modificar nada)

```
grep -rn "ngbNav" src/app
wc -l src/app/shared/ficha-entidad/ficha-entidad.component.html
```
Esperado:
1. 11 líneas, todas en `ficha-entidad.component.html`: 37 (`<ul ngbNav`), 38, 44 y 64
   (`ngbNavItem`), 39, 45 y 65 (`ngbNavLink`), 40, 48 y 66 (`ngbNavContent`) y 71
   (`[ngbNavOutlet]`).
2. 86.

Si algo no coincide, detenete y reportá.

## PASO 1 — src/app/shared/ficha-entidad/ficha-entidad.component.html

BUSCAR (líneas 37 a 71):
```
        <ul ngbNav #nav="ngbNav" [(activeId)]="pestana" class="nav-tabs flex-nowrap overflow-auto">
          <li ngbNavItem="datos">
            <button type="button" ngbNavLink>Datos personales</button>
            <ng-template ngbNavContent>
              <app-ficha-chofer-datos [chofer]="ch"></app-ficha-chofer-datos>
            </ng-template>
          </li>
          <li ngbNavItem="vehiculos">
            <button type="button" ngbNavLink>
              Vehículos <span class="badge rounded-pill bg-secondary">{{ cantidadVehiculos }}</span>
            </button>
            <ng-template ngbNavContent>
              @if (!esChoferDeProveedor || vehiculosPropios.length > 0) {
                <app-ficha-vehiculos
                  [vehiculos]="vehiculosPropios"
                  mensajeVacio="El chofer no tiene vehículos asignados.">
                </app-ficha-vehiculos>
              }
              @if (esChoferDeProveedor) {
                <h6 class="mt-2">Vehículos del proveedor {{ proveedor?.razonSocial ?? '' }}</h6>
                <app-ficha-vehiculos
                  [vehiculos]="vehiculosProveedor"
                  mensajeVacio="El proveedor no tiene vehículos cargados.">
                </app-ficha-vehiculos>
              }
            </ng-template>
          </li>
          <li ngbNavItem="legajo">
            <button type="button" ngbNavLink>Legajo</button>
            <ng-template ngbNavContent>
              <app-ficha-legajo [legajo]="legajo" [categoriasActivas]="categoriasActivas"></app-ficha-legajo>
            </ng-template>
          </li>
        </ul>
        <div [ngbNavOutlet]="nav" class="mt-3"></div>
```
REEMPLAZAR:
```
        <!-- Pestañas con las clases de Bootstrap, sin ngbNav: ng-bootstrap 15 (hecho
             para Angular 16) aplica NgbNavLinkBase dos veces en button/a[ngbNavLink] y
             Angular 20 lo rechaza (NG0309). -->
        <ul class="nav nav-tabs flex-nowrap overflow-auto" role="tablist">
          <li class="nav-item" role="presentation">
            <button type="button" class="nav-link" role="tab" [class.active]="pestana === 'datos'"
              [attr.aria-selected]="pestana === 'datos'" (click)="pestana = 'datos'">Datos personales</button>
          </li>
          <li class="nav-item" role="presentation">
            <button type="button" class="nav-link" role="tab" [class.active]="pestana === 'vehiculos'"
              [attr.aria-selected]="pestana === 'vehiculos'" (click)="pestana = 'vehiculos'">
              Vehículos <span class="badge rounded-pill bg-secondary">{{ cantidadVehiculos }}</span>
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button type="button" class="nav-link" role="tab" [class.active]="pestana === 'legajo'"
              [attr.aria-selected]="pestana === 'legajo'" (click)="pestana = 'legajo'">Legajo</button>
          </li>
        </ul>
        <div class="mt-3" role="tabpanel">
          @switch (pestana) {
            @case ('datos') {
              <app-ficha-chofer-datos [chofer]="ch"></app-ficha-chofer-datos>
            }
            @case ('vehiculos') {
              @if (!esChoferDeProveedor || vehiculosPropios.length > 0) {
                <app-ficha-vehiculos
                  [vehiculos]="vehiculosPropios"
                  mensajeVacio="El chofer no tiene vehículos asignados.">
                </app-ficha-vehiculos>
              }
              @if (esChoferDeProveedor) {
                <h6 class="mt-2">Vehículos del proveedor {{ proveedor?.razonSocial ?? '' }}</h6>
                <app-ficha-vehiculos
                  [vehiculos]="vehiculosProveedor"
                  mensajeVacio="El proveedor no tiene vehículos cargados.">
                </app-ficha-vehiculos>
              }
            }
            @case ('legajo') {
              <app-ficha-legajo [legajo]="legajo" [categoriasActivas]="categoriasActivas"></app-ficha-legajo>
            }
          }
        </div>
```

## Verificación

1. Comandos (reportá la salida):
```
grep -rn "ngbNav\b\|ngbNavLink\|ngbNavItem\|ngbNavContent\|ngbNavOutlet" src/app --include=*.html --include=*.ts
git diff --numstat
git diff -U0 | grep "^+" | grep -v "^+++" | grep -c " $"
npx tsc -p tsconfig.app.json --noEmit
```
Esperado:
- (a) 2 líneas, las del comentario nuevo: `ficha-entidad.component.html:37` y `:38`.
- (b) con FI1 sin commitear, `git diff --numstat` muestra los 18 archivos de FI1 y
  `ficha-entidad.component.html` pasa a `95 0` (era `86 0`). Si FI1 ya está commiteado:
  solo `ficha-entidad.component.html` `27 18`.
- (c) 0.
- (d) sin errores.

2. `npm run build:demo`: las mismas 9 advertencias; main ≈ 1,10 MB; Initial total
   ≈ 1,53 MB (vuelve al tamaño de antes de FI1); chunk grande de Legajos ≈ 165,6 kB.

## Pruebas manuales en demo (las hace Nico)

Repetir las pruebas 1 a 10 de FI1. En particular:
1. La ficha abre sin errores en la consola y muestra Datos personales.
2. Las 3 pestañas cambian al hacer clic; la activa queda marcada.
3. "Ver (n)" en Legajo abre el carrusel encima de la ficha.

## Mensaje de commit

Si FI1 todavía no está commiteado, un solo commit con el mensaje de FI1 más esta línea:
```
- Pestañas de la ficha con clases de Bootstrap en vez de ngbNav: ng-bootstrap 15 en
  Angular 20 tira NG0309 (NgbNavLinkBase aplicado dos veces).
```
Si FI1 ya está commiteado:
```
FI1b: pestañas de la ficha sin ngbNav (NG0309)

- ng-bootstrap 15 (Angular 16) aplica NgbNavLinkBase dos veces en
  button/a[ngbNavLink]; Angular 20 lo rechaza y la ficha no mostraba contenido.
- Pestañas con nav-tabs + @switch; el inicial vuelve a 1,53 MB.
```

FIN DE LA INSTRUCCIÓN FI1b
````
