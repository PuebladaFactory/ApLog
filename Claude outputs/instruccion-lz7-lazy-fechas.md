````
Si no ves la línea FIN DE LA INSTRUCCIÓN LZ7 al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN LZ7 — Frente Lazy loading + fechas (ApLog, rama refactor)
=====================================================================
RoleGuard con canMatch, budgets en demo, FacturaQrService con import dinámico

## Contexto y razonamiento

Último bloque de la parte "lazy" del frente. Son tres cambios chicos e
independientes:

### A. RoleGuard: canMatch en raiz-routing (decisión L9)

Hoy las 13 rutas de raiz-routing usan `canActivate: [RoleGuard]`.
- **Problema:** con `loadChildren`, `canActivate` se evalúa DESPUÉS de
  descargar el chunk del módulo. Un usuario sin sesión que escribe `/op`,
  o un rol que no tiene acceso a `/ajustes`, descarga el código del módulo
  igual y recién después lo rebota.
- **Con `canMatch`:** el guard se evalúa ANTES de elegir la ruta. Si
  rechaza, el chunk no se descarga.

Hay un detalle importante:
- **Qué hace `canMatch` al devolver `false`:** el router NO corta. Sigue
  probando las rutas siguientes y termina en el comodín `'**'`
  (Pagenotfound).
- **Qué hace hoy el guard:** navega él mismo con `router.navigate(...)` y
  devuelve `false`. Con `canMatch` eso dejaría dos navegaciones compitiendo:
  la del guard (a /unauthorized o /limbo) y la del comodín.
- **La forma correcta:** devolver un `UrlTree` (`router.createUrlTree(...)`).
  El router lo toma como "redirigí acá" y no sigue buscando. Sirve igual
  para `canActivate`.

Cambios en el guard:
- `chequearAcceso` devuelve `true | UrlTree`.
- Se agrega `canMatch` y se mantiene `canActivate`: las rutas INTERNAS de
  ajustes, choferes, clientes, liquidacion y proveedores lo siguen usando.
  Ahí el chunk ya está cargado y no hace falta cambiarlas.
- Sale `canLoad`: está deprecado en Angular y ninguna ruta lo usa
  (verificado).
- La lógica de roles y los destinos no cambian:
  - sin sesión → /unauthorized;
  - con sesión y sin rol → /limbo.

`UsuarioSesionService.getUsuarioActual()` es sincrónico (se rehidrata de
localStorage en el constructor), así que el guard funciona igual en
`canMatch` que en `canActivate`, también al recargar la página.

### B. Budgets en la configuración demo (decisión L10)

Hoy `build:demo` no evalúa ningún budget: solo `production` los tiene, y
con límites viejos de 6/7 MB. Se agrega a `demo` el budget del inicial:
aviso en 2 MB y error en 3 MB. El inicial hoy es 1,55 MB.

Es una alarma barata: si algo vuelve a meter una librería pesada en el
inicial (por ejemplo, un import eager de un módulo de feature), el build
avisa. NO se agrega el budget `anyComponentStyle` de production. NO se
agrega `outputHashing` (decidido en L10).

### C. FacturaQrService: import dinámico (decisión L7)

- `pdfjs-dist` y `jsqr` se importan arriba del archivo, así que viajan
  dentro del chunk de Facturación (~0,8 MB). Hoy cualquiera que entra a
  Facturación los descarga.
- Con `import()` dentro del método, webpack los separa en chunks propios.
  Solo se descargan la primera vez que se lee el QR de una factura
  (vincular-factura-liq).
- El worker de pdfjs sigue igual: `assets/pdfjs/pdf.worker.min.mjs`, que lo
  copia angular.json.
- Interop verificado:
  - `import('pdfjs-dist')` devuelve el namespace con
    `GlobalWorkerOptions` y `getDocument`;
  - `import('jsqr')` devuelve la función en `.default`.
  - La lectura de un QR desde un PDF real se probó en Chromium con este
    mismo código.

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
grep -rn "canLoad\|canMatch" src --include=*.ts
grep -c "canActivate: \[RoleGuard\]" src/app/raiz/raiz-routing.module.ts
grep -rln "RoleGuard" src --include=*.ts
grep -rn "pdfjs-dist\|from 'jsqr'\|FacturaQrService" src --include=*.ts
grep -n '"budgets"\|"demo": {' angular.json
grep -n "getUsuarioActual\|rehidratarDesdeStorage" src/app/servicios/usuario-sesion/usuario-sesion.service.ts
```

Esperado:
1. canLoad/canMatch: solo `canLoad(` en role.guard.ts:13.
2. `13`.
3. RoleGuard en:
   - role.guard.ts y role.guard.spec.ts;
   - raiz-routing.module.ts;
   - los routing de ajustes, choferes, clientes, liquidacion y
     proveedores.
   Además, comentarios en limpieza-demo.service.ts e
   informe-op-anulados.component.ts. Ninguno se toca.
4. pdfjs-dist y jsqr: solo factura-qr.service.ts (líneas 2 y 3).
   FacturaQrService: factura-qr.service.ts, su spec y
   vincular-factura-liq.component.ts (import e inyección).
5. Un solo `"budgets"` (el de production) y un solo `"demo": {`.
6. `getUsuarioActual` sincrónico y `rehidratarDesdeStorage` llamado en el
   constructor.

Si algo no coincide, detenete y reportá.

## PASO 1 — src/app/guards/role.guard.ts

1.1 BUSCAR:
```
import { Route, UrlSegment, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
```
REEMPLAZAR:
```
import { Route, UrlSegment, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree, Data } from '@angular/router';
```

1.2 BUSCAR:
```
  canLoad(route: Route, segments: UrlSegment[]): boolean {
    return this.chequearAcceso(route);
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.chequearAcceso(route);
  }

  private chequearAcceso(route: any): boolean {
    const rolesEsperados: RolUsuario[] = route.data?.['roles'] || [];
    const usuario = this.usuarioSesion.getUsuarioActual();

    if (usuario && rolesEsperados.includes(usuario.role)) {
      return true;
    }

    if (usuario === null) {
      this.router.navigate(['/unauthorized']);
    } else {
      this.router.navigate(['/limbo']);
    }
    return false;
  }
```
REEMPLAZAR:
```
  // Frente lazy-fechas (LZ7): raiz-routing usa canMatch, que se evalúa
  // ANTES de elegir la ruta, así un rol sin acceso no descarga el chunk del
  // módulo. canActivate se mantiene para las rutas internas de los módulos
  // (el chunk ya está cargado). canLoad (deprecado) salió: nadie lo usaba.
  canMatch(route: Route, segments: UrlSegment[]): true | UrlTree {
    return this.chequearAcceso(route.data);
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): true | UrlTree {
    return this.chequearAcceso(route.data);
  }

  // Devuelve un UrlTree en vez de navegar y devolver false: con canMatch, un
  // false hace que el router siga probando rutas (terminaría en '**'); el
  // UrlTree es una redirección explícita y corta ahí.
  private chequearAcceso(data: Data | undefined): true | UrlTree {
    const rolesEsperados: RolUsuario[] = data?.['roles'] || [];
    const usuario = this.usuarioSesion.getUsuarioActual();

    if (usuario && rolesEsperados.includes(usuario.role)) {
      return true;
    }

    return usuario === null
      ? this.router.createUrlTree(['/unauthorized'])
      : this.router.createUrlTree(['/limbo']);
  }
```

## PASO 2 — src/app/raiz/raiz-routing.module.ts

2.1 Reemplazá TODAS las apariciones (son 13) del texto exacto
```
canActivate: [RoleGuard]
```
por
```
canMatch: [RoleGuard]
```
Reemplazá solo ese texto. El resto de cada línea queda igual (sangría,
coma, comentarios, espacios finales si los hubiera). No toques ninguna
otra línea ni los routing de los módulos de feature.

## PASO 3 — angular.json (configuración demo)

3.1 BUSCAR:
```
            "demo": {
              "fileReplacements": [
```
REEMPLAZAR:
```
            "demo": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "2mb",
                  "maximumError": "3mb"
                }
              ],
              "fileReplacements": [
```

## PASO 4 — src/app/servicios/factura-qr/factura-qr.service.ts

4.1 BUSCAR:
```
import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';
import jsQR from 'jsqr';

// ✅ Usar el worker local (ya lo copiaste correctamente en angular.json)
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = 'assets/pdfjs/pdf.worker.min.mjs';
```
REEMPLAZAR:
```
import { Injectable } from '@angular/core';

// Frente lazy-fechas (LZ7): pdfjs-dist y jsqr se cargan con import dinámico
// dentro del método, así no viajan en el chunk de Facturación y solo se
// descargan la primera vez que se lee una factura. NO importarlos arriba.
// El worker de pdfjs es el local (angular.json lo copia a assets/pdfjs).
const PDFJS_WORKER_SRC = 'assets/pdfjs/pdf.worker.min.mjs';
```

4.2 BUSCAR:
```
  async decodificarQRdesdePDF(file: File): Promise<any> {
    const arrayBuffer = await file.arrayBuffer();
```
REEMPLAZAR:
```
  async decodificarQRdesdePDF(file: File): Promise<any> {
    const [pdfjsLib, { default: jsQR }] = await Promise.all([
      import('pdfjs-dist'),
      import('jsqr'),
    ]);
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;

    const arrayBuffer = await file.arrayBuffer();
```

El resto del método (el loop por páginas, `jsQR(...)` y el `return`) queda
igual: usa las mismas variables `pdfjsLib` y `jsQR`, ahora locales.

## Verificación

1. Greps (reportá la salida):
```
grep -c "canMatch: \[RoleGuard\]" src/app/raiz/raiz-routing.module.ts
grep -c "canActivate" src/app/raiz/raiz-routing.module.ts
grep -rn "canLoad\|router.navigate" src/app/guards/role.guard.ts
grep -rn "from 'pdfjs-dist'\|from 'jsqr'" src --include=*.ts
grep -n "import('pdfjs-dist')\|import('jsqr')" src/app/servicios/factura-qr/factura-qr.service.ts
node -e "const a=require('./angular.json');const p=Object.values(a.projects)[0];console.log(JSON.stringify(p.architect.build.configurations.demo.budgets))"
git diff --stat
git diff -U0 -- src angular.json | grep -n "^+.* $"
```
Esperado:
- (a) `13`; (b) `0`; (c) nada; (d) nada.
- (e) las 2 líneas de import dinámico.
- (f) `[{"type":"initial","maximumWarning":"2mb","maximumError":"3mb"}]`.
- (g) 4 archivos: role.guard.ts, raiz-routing.module.ts, angular.json,
  factura-qr.service.ts.
- (h) nada.

2. `npm run build:demo`. Reportá la tabla completa de tamaños y las
   advertencias.
   Referencia (medido sobre una copia del repo con LZ1–LZ6 + este
   cambio):
   - Initial total: sin cambio (≈ 1,55 MB). Como está por debajo de 2 MB,
     el budget NO genera advertencia: siguen las mismas 9.
   - El chunk de nueva-facturacion baja mucho. Aparecen 2 chunks lazy
     nuevos sin nombre de módulo: pdfjs (el más grande) y jsqr.

## Pruebas manuales en demo (las hace Nico)

1. Guard (sin sesión): cerrar sesión, escribir a mano `/op` y
   `/clientes/listado`.
   - Tiene que ir a "unauthorized", igual que antes.
   - En DevTools → Network (filtro JS), NO se tiene que descargar el chunk
     de operaciones ni el de clientes.
2. Guard (rol sin acceso): con un usuario `user`, escribir `/ajustes` y
   `/finanzas`.
   - Tiene que ir a /limbo, igual que antes.
   - No se tienen que descargar esos chunks.
3. Guard (acceso normal): con dev/admin, recorrer todo el sidebar,
   incluido `/migracion` con dev. Recargar la página (F5) estando dentro
   de un módulo: tiene que quedarse ahí, sin rebotar.
4. Rutas internas con canActivate:
   - entrar a Ajustes → Usuarios / Registro / Papelera con admin;
   - entrar a un alta de cliente o de chofer.
   Tiene que funcionar igual que antes.
5. Factura QR: en Facturación, vincular una factura a un informe leyendo
   el QR de un PDF real.
   - El QR se lee igual que antes.
   - En Network, los chunks de pdfjs y jsqr recién se descargan al elegir
     el PDF, no al entrar a Facturación.

## Mensaje de commit

```
LZ7 (lazy-fechas): RoleGuard con canMatch, budgets en demo y QR lazy

- RoleGuard: nuevo canMatch y canActivate devolviendo UrlTree (redirección
  explícita a /unauthorized o /limbo, sin navigate + false). Fuera canLoad
  (deprecado, sin uso).
- raiz-routing: las 13 rutas pasan de canActivate a canMatch; un rol sin
  acceso ya no descarga el chunk del módulo. Las rutas internas de los
  módulos siguen con canActivate.
- angular.json: budget del inicial en la configuración demo (aviso 2 MB,
  error 3 MB).
- FacturaQrService: pdfjs-dist y jsqr con import dinámico; salen del chunk
  de Facturación y se descargan solo al leer una factura.
```

FIN DE LA INSTRUCCIÓN LZ7
````
