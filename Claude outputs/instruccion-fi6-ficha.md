````
Si no ves la línea FIN DE LA INSTRUCCIÓN FI6 al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN FI6 — Ficha de entidad: "Editar" y "Ver cuenta" (ApLog, rama refactor)
====================================================================================

## Contexto y razonamiento

Último bloque funcional del frente "Ficha de entidad" (diseño: `claude/diseno-ficha-entidad.md`,
decisiones F8 y F9). Suma dos botones al pie de la ficha, al lado de "Cerrar". Actúan sobre la
entidad que se está MOSTRANDO (si navegaste del chofer al proveedor, sobre el proveedor).

**Editar** (F8):
- Cierra la ficha y abre el MISMO modal de edición que usan los listados
  (`ChoferesAlta`, `ProveedoresAlta`, `ClienteAlta`), con el mismo contrato
  (`fromParent = { modo: 'edicion', item }`) y el mismo guardado. Al terminar de editar no se
  vuelve a la ficha (se reabre con un clic).
- Se ve solo con permiso de edición de esa entidad (`PermisosService.puede(<choferes |
  proveedores | clientes>, 'editar')`): `demo` no lo ve; `user` sí (puede editar entidades).
- **Carga diferida:** los modales de alta viven en sus módulos de feature. El servicio nuevo
  `EdicionEntidadService` los trae con `import()` dinámico recién al apretar Editar. Un import
  estático los metería en el chunk compartido de la ficha, que se descarga con cualquiera de
  los cuatro módulos que la usan (la trampa de `VisualizadorObjetoService`, §1.4 del diseño).
  Medido: los modales siguen en el chunk de su módulo; el build solo agrega tres chunks
  "puente" de ≈ 2,4 kB, y el chunk de la ficha crece ≈ 2,4 kB. Desde Legajos, el código del alta
  de choferes se descarga recién al editar.
- Si la descarga falla (sin conexión), avisa con un Swal y no hace nada más.
- Servicio aparte de `FichaEntidadService` a propósito: ese servicio importa el componente de la
  ficha; si el componente lo inyectara, habría un import circular.

**Ver cuenta** (F9):
- Cierra la ficha y navega a `/finanzas/cuenta/<tipo>/<id>` (la cuenta de la entidad en
  Finanzas; vuelve a la pestaña Cuentas, el origen por defecto).
- Se ve solo con lectura de Finanzas (`puede('finanzas', 'ver')`: dev, admin y demo; los mismos
  roles que entran a la ruta `finanzas`). `user` no lo ve.
- No se muestra en un **chofer de proveedor**: no tiene cuenta propia (se le paga al
  proveedor); su proveedor sí la tiene, desde su ficha.

Si la entidad se da de baja con la ficha abierta, los dos botones desaparecen (queda Cerrar).

**Piezas:**
- NUEVO `servicios/ficha-entidad/edicion-entidad.service.ts`: `editar(tipo, entidad)` y
  `cargarModal(tipo)` (import dinámico por tipo).
- `ficha-entidad.util.ts`: `MODULO_FICHA` (tipo de ficha → módulo de permisos).
- `FichaEntidadComponent`: `entidadActual`, `puedeEditar`, `puedeVerCuenta`, `editar()`,
  `verCuenta()`; los dos botones en el pie.

**Verificación previa (sobre una copia del repo en el estado de FI4, igual a tu repo):**
- 8 BUSCAR, cada uno encontrado una sola vez (validados todos antes de escribir); el resultado
  coincide con la referencia;
- `tsc` limpio (también `--noUnusedLocals`);
- pruebas con Karma + Chromium (3 casos):
  - admin: pie "Ver cuenta · Editar · Cerrar"; Editar cierra y pide editar el chofer
    mostrado; Ver cuenta cierra y navega a `/finanzas/cuenta/chofer/<id>` (y cliente);
  - roles y casos: user (Editar, sin Ver cuenta), demo (Ver cuenta, sin Editar), chofer de
    proveedor (sin Ver cuenta), entidad dada de baja (solo Cerrar);
  - `EdicionEntidadService` real: los tres `import()` resuelven las clases de los modales;
- `build:demo` con las mismas 9 advertencias; inicial 1,53 MB; los modales de alta NO están
  en el chunk de la ficha (verificado buscando sus selectores en los `.js` del build).

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- NO corras `npm run deploy:*`, `npm run build` ni `node set-version.js`. Para compilar
  usá `npm run build:demo`.
- Validá TODOS los BUSCAR antes de escribir el primero; después aplicá los pasos EN ORDEN.
- Si un texto a BUSCAR no está o aparece más de una vez: detenete y reportá. Los BUSCAR
  son líneas completas.
- Editá cada archivo en el lugar (leer, reemplazar, escribir); nunca abras un archivo
  para escritura antes de haber leído su contenido.
- Archivos NUEVOS: crealos exactamente con el contenido dado. Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md (se actualizan en el bloque DOC).

## PASO 0 — Verificación (sin modificar nada)

```
git status --short
git hash-object src/app/shared/ficha-entidad/ficha-entidad.component.ts src/app/shared/ficha-entidad/ficha-entidad.component.html src/app/shared/ficha-entidad/ficha-entidad.util.ts
ls src/app/servicios/ficha-entidad
grep -n "export class ChoferesAltaComponent\|export class ProveedoresAltaComponent\|export class ClienteAltaComponent" -r src/app/raiz
grep -n "cuenta/:tipo/:id" src/app/raiz/finanzas-nueva/finanzas-nueva-routing.module.ts
```
Esperado:
1. Nada (o solo `Claude outputs/`).
2. Los de FI4:
   - `476a40aaddb90d8aa49ac2c937794cfe01354726` (`ficha-entidad.component.ts`);
   - `1e42a0a5c34971bda0f470a95f74bfbb726369aa` (`ficha-entidad.component.html`);
   - `deb0fcd9989f94881ff8dac13064385c74b22a72` (`ficha-entidad.util.ts`).
3. Solo `ficha-entidad.service.ts`.
4. Las tres clases, en `choferes/choferes-alta/choferes-alta.component.ts`,
   `proveedores/proveedores-alta/proveedores-alta.component.ts` y
   `clientes/cliente-alta/cliente-alta.component.ts`.
5. Una línea (la ruta de la cuenta de una entidad).

Si algo no coincide, detenete y reportá.

## PASO 1 — Archivos NUEVOS (1)

1.1 NUEVO `src/app/servicios/ficha-entidad/edicion-entidad.service.ts`
```
import { inject, Injectable, Type } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConIdType } from 'src/app/interfaces/conId';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { TipoFicha } from 'src/app/shared/ficha-entidad/ficha-entidad.util';

export type EntidadEditable = ConIdType<Chofer> | ConIdType<Proveedor> | ConIdType<Cliente>;

/**
 * "Editar" desde la ficha de entidad (FI6, F8): abre el MISMO modal de
 * edición que usan los listados (mismo contrato `fromParent = { modo, item }`,
 * mismo guardado).
 *
 * Los modales de alta viven en sus módulos de feature (Clientes, Choferes,
 * Proveedores). Se cargan con import() dinámico recién al editar: un import
 * estático los metería en el chunk compartido de la ficha, que se descarga
 * con cualquiera de los módulos que la usan (ver VisualizadorObjetoService en
 * CLAUDE.md). Servicio aparte de FichaEntidadService para que el componente de
 * la ficha lo inyecte sin un import circular.
 */
@Injectable({ providedIn: 'root' })
export class EdicionEntidadService {
  private modalService = inject(NgbModal);

  async editar(tipo: TipoFicha, entidad: EntidadEditable): Promise<void> {
    let componente: Type<unknown>;
    try {
      componente = await this.cargarModal(tipo);
    } catch (e) {
      console.error('No se pudo cargar el modal de edición', e);
      Swal.fire('Error', 'No se pudo abrir la edición. Revisá la conexión y probá de nuevo.', 'error');
      return;
    }
    const modalRef = this.modalService.open(componente, {
      windowClass: 'myCustomModalClass',
      centered: true,
      size: 'lg',
    });
    modalRef.componentInstance.fromParent = { modo: 'edicion', item: entidad };
    modalRef.result.then(() => {}, () => {});
  }

  /** Clase del modal de alta/edición de cada entidad (import dinámico). */
  cargarModal(tipo: TipoFicha): Promise<Type<unknown>> {
    switch (tipo) {
      case 'chofer':
        return import('src/app/raiz/choferes/choferes-alta/choferes-alta.component').then(m => m.ChoferesAltaComponent);
      case 'proveedor':
        return import('src/app/raiz/proveedores/proveedores-alta/proveedores-alta.component').then(m => m.ProveedoresAltaComponent);
      case 'cliente':
        return import('src/app/raiz/clientes/cliente-alta/cliente-alta.component').then(m => m.ClienteAltaComponent);
    }
  }
}
```

## PASO 2 — `ficha-entidad.util.ts`

2.1 `src/app/shared/ficha-entidad/ficha-entidad.util.ts` — import de ModuloPermiso. BUSCAR:
```
import { EntidadTipo } from 'src/app/interfaces/tarifa';
```
REEMPLAZAR:
```
import { EntidadTipo } from 'src/app/interfaces/tarifa';
import { ModuloPermiso } from 'src/app/interfaces/permiso';
```

2.2 `src/app/shared/ficha-entidad/ficha-entidad.util.ts` — módulo de permisos de cada tipo de ficha. BUSCAR:
```
export type TipoFicha = EntidadTipo;
```
REEMPLAZAR:
```
export type TipoFicha = EntidadTipo;

/** Módulo de PermisosService de cada entidad (para "Editar", FI6). */
export const MODULO_FICHA: Readonly<Record<TipoFicha, ModuloPermiso>> = {
  chofer: 'choferes',
  proveedor: 'proveedores',
  cliente: 'clientes',
};
```

## PASO 3 — `ficha-entidad.component.ts`

3.1 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — imports. BUSCAR:
```
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
```
REEMPLAZAR:
```
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
import { PermisosService } from 'src/app/servicios/permisos/permisos.service';
import { EdicionEntidadService, EntidadEditable } from 'src/app/servicios/ficha-entidad/edicion-entidad.service';
```

3.2 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — import de MODULO_FICHA. BUSCAR:
```
  CLASE_ESTADO_LEGAJO, ETIQUETA_ESTADO_LEGAJO, FilaChoferFicha, TipoFicha, contactoLegible, cuitLegible,
```
REEMPLAZAR:
```
  CLASE_ESTADO_LEGAJO, ETIQUETA_ESTADO_LEGAJO, FilaChoferFicha, MODULO_FICHA, TipoFicha, contactoLegible, cuitLegible,
```

3.3 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — inyección. BUSCAR:
```
    private router: Router,
```
REEMPLAZAR:
```
    private router: Router,
    private permisos: PermisosService,
    private edicionEntidad: EdicionEntidadService,
```

3.4 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — entidad actual y permisos de los botones. BUSCAR:
```
  get contactosCliente(): Contacto[] {
```
REEMPLAZAR:
```
  /** La entidad de la ficha que se está mostrando; null si no existe (baja). */
  get entidadActual(): EntidadEditable | null {
    if (this.tipo === 'chofer') return this.chofer;
    if (this.tipo === 'proveedor') return this.proveedor;
    return this.cliente;
  }

  /** "Editar": con permiso de edición de esa entidad (demo no lo tiene). */
  get puedeEditar(): boolean {
    return this.entidadActual !== null && this.permisos.puede(MODULO_FICHA[this.tipo], 'editar');
  }

  /** "Ver cuenta": con lectura de Finanzas (user no la tiene). Un chofer de
   *  proveedor no tiene cuenta propia (se le paga al proveedor). */
  get puedeVerCuenta(): boolean {
    return this.entidadActual !== null && !(this.tipo === 'chofer' && this.esChoferDeProveedor)
      && this.permisos.puede('finanzas', 'ver');
  }

  get contactosCliente(): Contacto[] {
```

3.5 `src/app/shared/ficha-entidad/ficha-entidad.component.ts` — acciones Editar y Ver cuenta. BUSCAR:
```
  irATarifas(pestana: string): void {
    this.activeModal.dismiss();
    this.router.navigate(['/tarifas', pestana]);
  }
```
REEMPLAZAR:
```
  irATarifas(pestana: string): void {
    this.activeModal.dismiss();
    this.router.navigate(['/tarifas', pestana]);
  }

  /** Cierra la ficha y abre el modal de edición de la entidad mostrada (el
   *  mismo de los listados). */
  editar(): void {
    const entidad = this.entidadActual;
    if (!entidad || !this.puedeEditar) return;
    this.activeModal.dismiss();
    this.edicionEntidad.editar(this.tipo, entidad);
  }

  /** Cierra la ficha y va a la cuenta de la entidad en Finanzas. */
  verCuenta(): void {
    if (!this.puedeVerCuenta) return;
    this.activeModal.dismiss();
    this.router.navigate(['/finanzas', 'cuenta', this.tipo, this.id]);
  }
```

## PASO 4 — `ficha-entidad.component.html`

4.1 `src/app/shared/ficha-entidad/ficha-entidad.component.html` — botones en el pie. BUSCAR:
```
<div class="modal-footer">
  <button type="button" class="btn btn-secondary" (click)="cerrar()">Cerrar</button>
</div>
```
REEMPLAZAR:
```
<div class="modal-footer">
  @if (puedeVerCuenta) {
    <button type="button" class="btn btn-outline-primary" (click)="verCuenta()">Ver cuenta</button>
  }
  @if (puedeEditar) {
    <button type="button" class="btn btn-primary" (click)="editar()">Editar</button>
  }
  <button type="button" class="btn btn-secondary" (click)="cerrar()">Cerrar</button>
</div>
```

## Verificación

1. Comandos (reportá la salida):
```
grep -n "import('src/app/raiz" src/app/servicios/ficha-entidad/edicion-entidad.service.ts
grep -rn "AltaComponent" src/app/shared/ficha-entidad src/app/servicios/ficha-entidad/ficha-entidad.service.ts
git add -N src/app/servicios/ficha-entidad/edicion-entidad.service.ts
git diff --numstat
git diff -U0 | grep "^+" | grep -v "^+++" | grep -c " $"
npx tsc -p tsconfig.app.json --noEmit
```
Esperado:
- (a) 3 líneas (choferes, proveedores, clientes).
- (b) nada (ningún import estático de un modal de alta en la ficha).
- (c) sin salida.
- (d) 4 archivos:
  - `src/app/servicios/ficha-entidad/edicion-entidad.service.ts` `57 0`;
  - `src/app/shared/ficha-entidad/ficha-entidad.component.html` `6 0`;
  - `src/app/shared/ficha-entidad/ficha-entidad.component.ts` `40 1`;
  - `src/app/shared/ficha-entidad/ficha-entidad.util.ts` `8 0`.
- (e) 0.
- (f) sin errores.

2. `npm run build:demo`: las mismas 9 advertencias; main ≈ 1,10 MB; Initial total
   ≈ 1,53 MB; el chunk compartido de la ficha ≈ 51 kB (antes ≈ 49) y tres chunks nuevos de
   ≈ 2,4 kB con nombres `src-app-raiz-…-alta-component`.

## Pruebas manuales en demo (las hace Nico)

1. **Editar, con admin:** abrí la ficha de un cliente desde el listado → "Editar" → se cierra la
   ficha y se abre el modal de edición con sus datos. Cambiá un contacto y guardá → el listado
   se actualiza y, al reabrir la ficha, se ve el cambio.
2. **Editar desde Legajos:** tablero de Legajos → ficha de un chofer → Editar → el modal de
   edición del chofer abre igual (la primera vez puede tardar un instante: descarga el
   código). Guardá sin cambios → todo sigue igual.
3. **Editar un proveedor navegado:** desde la ficha de un chofer de proveedor → "Abrir ficha del
   proveedor" → Editar → se edita el proveedor (no el chofer).
4. **Ver cuenta:** ficha de un cliente → "Ver cuenta" → abre Finanzas → cuenta de ese
   cliente. Igual con un chofer directo y un proveedor. Un chofer de proveedor no muestra el
   botón.
5. **Roles:**
   - user: ve Editar, no ve Ver cuenta;
   - demo: ve Ver cuenta, no ve Editar.
6. **Baja con la ficha abierta** (otra pestaña del navegador): los botones desaparecen y
   queda Cerrar.

## Mensaje de commit

```
FI6: "Editar" y "Ver cuenta" en la ficha de entidad

- Editar (permiso <entidad>.editar): cierra la ficha y abre el modal de edición de los
  listados. EdicionEntidadService carga los modales de alta con import() dinámico: siguen en
  el chunk de su módulo, no en el de la ficha.
- Ver cuenta (finanzas.ver): cierra la ficha y navega a /finanzas/cuenta/:tipo/:id. No se
  muestra en un chofer de proveedor (sin cuenta propia).
- ficha-entidad.util: MODULO_FICHA.
```

FIN DE LA INSTRUCCIÓN FI6
````
