````
Si no ves la línea FIN DE LA INSTRUCCIÓN SB1 al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN SB1 — Sidebar: modo por ancho y cierre al navegar (ApLog, rama refactor)
====================================================================================

## Contexto y razonamiento

Resuelve "Pendiente — sidebar" de CLAUDE.md. El estado del sidebar vive en
`HomeComponent` (el shell de todas las rutas de raiz).

**Cómo funcionaba:**
- `activo = innerWidth >= 1600` al iniciar Y en cada `resize`: cualquier
  cambio de tamaño pisaba lo elegido con ☰.
- Navegar no lo cerraba: con ancho < 1600, abierto con ☰ quedaba abierto en
  todas las pantallas.
- En angosto, abierto empujaba el contenido (tablas anchas).
- Resize escuchado dos veces: `addEventListener('resize', this.onResize)`
  sin bind tiraba en cada resize
  `TypeError: this.setInitialSidebarState is not a function`.
- Nombres invertidos (`activo` = abierto, clase `active` = oculto) y
  `<body id="content">` anidado (HTML inválido).

**Ahora:** dos modos con el mismo breakpoint (1600 px).
- **Ancho (≥ 1600):** igual que hoy. Fijo al lado del contenido y lo
  empuja; abierto por defecto; ☰ lo abre y lo cierra; navegar no lo cierra.
- **Angosto (< 1600):** superpuesto al contenido, con un fondo oscuro, y
  cerrado por defecto. Se cierra al navegar (`NavigationEnd`), con Esc o
  tocando el fondo.
- **Cambio de modo:** solo al CRUZAR el breakpoint
  (`matchMedia(...).addEventListener('change')`). Cambiar el tamaño sin
  cruzar no pisa la elección manual.
- **Limpieza:**
  - fuera los dos listeners de resize;
  - nombres explícitos: `sidebarAbierto`, clase `cerrado` y
    `toggleSidebar`;
  - `<body id="content">` → `<main id="content">`;
  - en el CSS, el selector `body` (que por el encapsulado matcheaba ese
    `<body>`: fuente Poppins y fondo) pasa a `#content`. El aspecto no
    cambia.
- **z-index:** sidebar superpuesto 1045 y fondo 1040, por debajo de los
  modales de ng-bootstrap (1050/1055).

**Verificación previa (build de demo + Chromium, sesión simulada):**
- **1700 px:**
  - arranca abierto y empuja el contenido;
  - ☰ lo cierra;
  - navegar no lo reabre.
- **1200 px:**
  - arranca cerrado y superpuesto;
  - ☰ lo abre con el fondo;
  - navegar lo cierra; Esc y el fondo también;
  - un resize a 1300 no lo toca;
  - al cruzar a 1700 se abre fijo.
- Sin errores en la consola. `tsc` limpio. `build:demo` limpio, con las 9
  advertencias y los tamaños sin cambio.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- NO corras `npm run deploy:*`, `npm run build` ni `node set-version.js`.
  Para compilar usá `npm run build:demo`.
- Si un texto a BUSCAR no está o aparece más de una vez: detenete y
  reportá.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Finales de línea LF.
- "REEMPLAZO COMPLETO": el archivo queda exactamente con el contenido dado.
- No toques CLAUDE.md ni CHANGELOG.md más allá del PASO 4.

## PASO 0 — Verificación (sin modificar nada)

```
grep -rn "toogleSidebar\|setInitialSidebarState\|#sidebar\|#content\|app-home" src --include=*.ts --include=*.html --include=*.css --include=*.scss
wc -l src/app/raiz/home/home.component.ts src/app/raiz/home/home.component.html src/app/raiz/home/home.component.css
grep -n "^### Pendiente — sidebar" CLAUDE.md
grep -n "^- Sidebar: no se cierra solo" CHANGELOG.md
```
Esperado:
1. 17 líneas, todas en `src/app/raiz/home/`:
   - html:9 (`toogleSidebar`);
   - ts: 22, 42, 59, 65 y 68;
   - css: 80, 90, 94, 99, 104, 109, 115, 120, 171, 184, 187 y 190 (de la 94
     en adelante, salvo la 171, son bloques comentados).
2. 74, 16 y 192.
3. 3942 (con DOC aplicado).
4. 2263 (con DOC aplicado).

Si algo no coincide, detenete y reportá.

## PASO 1 — src/app/raiz/home/home.component.ts (REEMPLAZO COMPLETO)

```
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';
import { NoDisponibilidadChofer } from 'src/app/interfaces/no-disponibilidad-chofer';
import { CategoriaDocumentacionService } from 'src/app/servicios/categoria-documentacion/categoria-documentacion.service';
import { LegajoService } from 'src/app/servicios/legajos/legajo.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';

let version = 'v0.0.0'; // fallback por defecto

try {
  version = require('src/environments/version').appVersion;
} catch (e) {
  console.warn('⚠️ version.ts no encontrado, usando versión por defecto.');
}

/** Ancho desde el que el sidebar va fijo al lado del contenido. Por debajo,
 *  se superpone al contenido y se cierra al navegar. */
const BREAKPOINT_SIDEBAR = '(min-width: 1600px)';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
    standalone: false
})
export class HomeComponent implements OnInit, OnDestroy {

  appVersion = version;

  /** Sidebar — dos modos según el ancho (BREAKPOINT_SIDEBAR):
   *  - ancho: fijo al lado del contenido (lo empuja), abierto por defecto;
   *  - angosto: superpuesto con fondo oscuro, cerrado por defecto; se cierra
   *    al navegar, con Esc o tocando el fondo.
   *  El modo se recalcula solo al CRUZAR el breakpoint (matchMedia), así se
   *  respeta lo que el usuario eligió con el botón mientras el ancho no cambia
   *  de lado. */
  esAncho = false;
  sidebarAbierto = false;

  private consultaAncho = window.matchMedia(BREAKPOINT_SIDEBAR);
  private alCambiarAncho = (e: MediaQueryListEvent) => this.aplicarModo(e.matches);
  private destroy$ = new Subject<void>();

  constructor(private storageService: StorageService, private categoriaDocumentacionService: CategoriaDocumentacionService, private legajoService: LegajoService, private choferService: ChoferService, private proveedorService: ProveedorService, private clienteService: ClienteService, private tarifarioService: TarifarioService, private router: Router) { }

  ngOnInit(): void {
    this.choferService.init();
    this.proveedorService.init();
    this.clienteService.init();
    this.tarifarioService.init();
    this.categoriaDocumentacionService.init();
    this.legajoService.init();
    // TC-R3: fuera los listeners de las 7 colecciones de tarifas viejas
    // (tarifasGral/Esp/PersCliente, tarifasGral/EspChofer,
    // tarifasGral/EspProveedor) — sin lectores desde TC-R1/TC-R2. Las
    // tarifas se cargan con tarifarioService.init().
    this.storageService.listenForChangesField<NoDisponibilidadChofer>("noOperativo", "activa", true);

    this.aplicarModo(this.consultaAncho.matches);
    this.consultaAncho.addEventListener('change', this.alCambiarAncho);

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.esAncho) this.sidebarAbierto = false;
      });
  }

  ngOnDestroy(): void {
    this.consultaAncho.removeEventListener('change', this.alCambiarAncho);
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Al entrar o al cruzar el breakpoint: ancho → abierto; angosto → cerrado. */
  private aplicarModo(esAncho: boolean): void {
    this.esAncho = esAncho;
    this.sidebarAbierto = esAncho;
  }

  toggleSidebar(): void {
    this.sidebarAbierto = !this.sidebarAbierto;
  }

  cerrarSidebar(): void {
    this.sidebarAbierto = false;
  }

  @HostListener('document:keydown.escape')
  alPresionarEsc(): void {
    if (!this.esAncho && this.sidebarAbierto) this.sidebarAbierto = false;
  }

}
```

## PASO 2 — src/app/raiz/home/home.component.html (REEMPLAZO COMPLETO)

```
<div class="wrapper" [class.superpuesto]="!esAncho">
    <!-- Sidebar: fijo en pantallas anchas; superpuesto en angostas (ver HomeComponent) -->
    <nav id="sidebar" [class.cerrado]="!sidebarAbierto" class="layout-global no-print">
        <app-sidebar></app-sidebar>
    </nav>

    <!-- Fondo del sidebar superpuesto: tocarlo lo cierra -->
    @if (!esAncho && sidebarAbierto) {
        <div class="fondo-sidebar no-print" (click)="cerrarSidebar()"></div>
    }

    <!-- Page Content  -->
    <main id="content">
        <button (click)="toggleSidebar()" class="btn layout-global no-print" aria-label="Mostrar u ocultar el menú">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-list" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"/>
            </svg>
        </button>
        <router-outlet></router-outlet>
        <app-scroll-to-top></app-scroll-to-top>
    </main>
</div>
```

## PASO 3 — src/app/raiz/home/home.component.css

3.1 BUSCAR:
```
body {
    font-family: 'Poppins', sans-serif;
```
REEMPLAZAR:
```
/* FIX sidebar: antes `body`; matcheaba el <body id="content"> anidado del
   template, que pasó a <main id="content">. */
#content {
    font-family: 'Poppins', sans-serif;
```

3.2 BUSCAR (el de la línea 90, al comienzo de la línea; el de la 187 está
indentado dentro de un comentario y no se toca):
```
#sidebar.active {
    margin-left: -200px;
}
```
REEMPLAZAR:
```
#sidebar.cerrado {
    margin-left: -200px;
}

/* Pantallas angostas (HomeComponent.esAncho = false): el sidebar se
   superpone al contenido en vez de empujarlo. Por debajo de los modales de
   ng-bootstrap (z-index 1050/1055). */
.wrapper.superpuesto #sidebar {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1045;
    max-height: calc(100vh - 32px);
    overflow-y: auto;
}

.wrapper.superpuesto #sidebar.cerrado {
    margin-left: -232px;
}

.fondo-sidebar {
    position: fixed;
    inset: 0;
    z-index: 1040;
    background-color: rgba(0, 0, 0, 0.35);
}
```

## PASO 4 — CLAUDE.md y CHANGELOG.md

4.1 CLAUDE.md. BUSCAR:
```
### Pendiente — sidebar: apertura/cierre según tamaño de pantalla y navegación
```
REEMPLAZAR:
```
### ~~Pendiente — sidebar: apertura/cierre según tamaño de pantalla y navegación~~ — RESUELTO (SB1, Octubre 2026)
`HomeComponent`: dos modos con breakpoint 1600 px (`matchMedia`, se recalcula solo al
cruzar). Ancho: fijo, empuja el contenido, abierto por defecto. Angosto: superpuesto con
fondo (z-index 1045/1040, debajo de los modales), cerrado por defecto, se cierra al navegar
(`NavigationEnd`), con Esc o tocando el fondo. Fuera los listeners de resize (uno tiraba
`TypeError`), `sidebarAbierto` / clase `cerrado`, `<main id="content">`. Texto original:
```

4.2 CHANGELOG.md. BUSCAR:
```
- Sidebar: no se cierra solo al navegar en pantallas < 1600 px; revisar
  apertura/cierre por tamaño de pantalla (modo superpuesto en angostas,
  cerrar al navegar, reaccionar solo al cruzar el breakpoint) y el listener
  de resize duplicado que tira error en consola.
```
REEMPLAZAR:
```
- ~~Sidebar: cierre al navegar y modos por tamaño de pantalla~~ — RESUELTO
  (SB1): superpuesto y cerrado al navegar por debajo de 1600 px.
```

## Verificación

1. Comandos (reportá la salida):
```
grep -rn "toogleSidebar\|setInitialSidebarState\|addEventListener('resize'\|<body" src/app/raiz/home
git diff --numstat
npx tsc -p tsconfig.app.json --noEmit
```
Esperado:
- (a) nada.
- (b) home.component.ts `47 22`; home.component.html `13 8`;
  home.component.css `27 2`; CLAUDE.md y CHANGELOG.md con lo de DOC más
  este paso.
- (c) sin errores.

2. `npm run build:demo`: tamaños sin cambio (main ≈ 1,10 MB; Initial total
   ≈ 1,53 MB) y las mismas 9 advertencias.

## Pruebas manuales en demo (las hace Nico)

1. **≥ 1600 px:**
   - arranca abierto y empuja el contenido;
   - ☰ lo cierra y lo abre;
   - navegar no lo cierra.
2. **< 1600 px** (ventana más angosta o zoom del navegador al 125–150 %):
   - arranca cerrado;
   - ☰ lo abre por encima del contenido, con fondo oscuro;
   - elegir una opción del menú navega y lo cierra;
   - Esc y un clic en el fondo lo cierran.
3. **Sin cruzar los 1600:** abrilo y cambiá un poco el tamaño de la ventana.
   Tiene que quedar como estaba.
4. **Cruzar los 1600** (agrandar o achicar): pasa al modo del ancho nuevo.
5. **Con el sidebar abierto en angosto, abrir un modal** (por ejemplo, desde
   un listado): el modal queda por encima.
6. **Consola:** ya no aparece el `TypeError` al redimensionar. La fuente y
   el fondo del contenido no cambian.
7. **Imprimir** una pantalla: el sidebar y el fondo no salen.

## Mensaje de commit

```
SB1: sidebar con modo por ancho y cierre al navegar

- HomeComponent: breakpoint 1600 px con matchMedia (se recalcula solo al
  cruzar; ya no pisa la elección manual en cada resize). Ancho: fijo y
  empuja el contenido. Angosto: superpuesto con fondo, cerrado por defecto,
  se cierra al navegar, con Esc o tocando el fondo.
- Fuera los dos listeners de resize (uno sin bind tiraba TypeError).
- sidebarAbierto / clase cerrado / toggleSidebar; <body> anidado → <main>
  (el CSS de body pasa a #content).
- CLAUDE.md / CHANGELOG: pendiente del sidebar resuelto.
```

FIN DE LA INSTRUCCIÓN SB1
````
