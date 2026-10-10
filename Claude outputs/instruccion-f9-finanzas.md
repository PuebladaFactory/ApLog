````
# Instrucción F9 — Finanzas: cierre de código (retiro del módulo viejo)

## Contexto

Frente Finanzas, bloque F9. El módulo nuevo (`raiz/finanzas-nueva`) ya cubre
todo; se retira el viejo y lo que solo existía para él. Decisiones
(diseno-finanzas.md §24, F21 y F70–F73):

- **Borrar el módulo viejo:** `raiz/finanzas/`, `servicios/finanzas/`,
  `servicios/cuenta-corriente/` y sus 8 interfaces.
  - `RaizModule` lo importaba EAGER → al sacarlo baja el bundle inicial.
- **F21 — `LiquidacionService` (camino viejo):** deja de llamar a
  `FinanzasResumenService.aplicarNuevaLiquidacion` (emitir) y
  `revertirLiquidacion` (anular). Nadie lee `resumenFinanzas`.
- **Restos del viejo:** import sin uso en `db-firestore.service`,
  `generarMovimientoPdf` (+ `formatearMoneda`, que solo usa ese método) en
  `pdf.service`, `resumenFinanzas$` en `StorageService`, link comentado del
  sidebar, comentarios.
- **F71 — Facturación modelo viejo:** se borran `facturacion-listado` y
  `facturacion-historico` (rutas ya comentadas; usaban
  `FinanzasResumenService`) y lo que solo usaban ellos:
  - `informes-tabla` (su selector solo aparece en esos dos);
  - `modal-vincular-factura` (solo lo abre `facturacion-listado`);
  - `reglas/informe-liq.rules.ts` y `interfaces/estado-informeliq.ts`.
  - `interfaces/informes-tabla.ts` NO se borra (lo usa
    `shared/tabla/informes-acciones-cell`).
- **F70 — Ruta:** la URL `finanzasNueva` pasa a `finanzas` (queda libre).
  Carpetas, archivos y clases `finanzas-nueva` / `FinanzasNueva*` NO
  cambian.
- **F72 — Movimientos:** tarjeta "Devoluciones" aparte; Cobros y Pagos ya
  no las suman (`esDevolucion`, F7b).

Se quedan a propósito:

- Los mapeos de `firestore.rules` para `movimientos` y `resumenFinanzas`:
  Vantruck tiene docs de `resumenFinanzas` y se borran en la migración. Por
  eso NO hay deploy.
- La Limpieza de demo, que sigue borrando esas colecciones.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto BUSCAR no aparece, o aparece más de una vez: pará y reportá,
  sin improvisar.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar: leer, reemplazar, escribir. Nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Archivos con finales de línea LF.
- Build: `npm run build:demo`.
- No toques CLAUDE.md ni CHANGELOG (van en F10).
- Si tocás un tipo, revisá todos sus usos, incluidos .spec.ts y .html.
- Borrar = `rm` / `rm -r` (no `git rm`).
- Esta instrucción termina con la línea `FIN DE LA INSTRUCCIÓN F9`. Si no la
  ves, leé el archivo completo antes de empezar.

## PASO 0 — Verificación (sin cambios)

Corré y reportá la salida:

```bash
PAT='FinanzasModule|FinanzasResumenService|MovimientoFinancieroService|SaldoEngine|CuentaCorrienteService|CuentaCorrienteComponent|movimiento-financiero|movimiento-impresion-v-m|MovimientoImpresionVM|movimiento-form-v-m|resumen-financiero-entidad|aging-resumen|cuenta-corriente-resumen|ranking-moroso|interfaces/ledger|estado-informeliq|informe-liq.rules|FacturacionListadoComponent|FacturacionHistoricoComponent|InformesTablaComponent|ModalVincularFacturaComponent|resumenFinanzas\$|finanzasNueva'
grep -rlE "$PAT" src/ | grep -vE "^src/app/(raiz/finanzas/|servicios/finanzas/|servicios/cuenta-corriente/|raiz/nueva-facturacion/(facturacion-listado|facturacion-historico|informes-tabla|modal-vincular-factura)/|reglas/|interfaces/(aging-resumen|cuenta-corriente-resumen|estado-informeliq|ledger|movimiento-financiero|movimiento-form-v-m|movimiento-impresion-v-m|ranking-moroso|resumen-financiero-entidad)\.ts)" | sort
ls src/app/reglas/
grep -rn "app-informes-tabla\|app-modal-vincular-factura" src/ --include=*.html
grep -rn "interfaces/informes-tabla" src/ | grep -v "raiz/nueva-facturacion/"
grep -rc "finanzasNueva" src/app/raiz/finanzas-nueva | grep -v ":0$"
grep -n "generarMovimientoPdf\|formatearMoneda" src/app/servicios/informes/pdf/pdf.service.ts
wc -l src/app/servicios/informes/pdf/pdf.service.ts
```

Esperado:

1. **Primer grep:** exactamente estos 22 archivos (ningún .spec.ts):
   ```
   src/app/raiz/finanzas-nueva/antiguedad/finanzas-antiguedad.component.ts
   src/app/raiz/finanzas-nueva/control/finanzas-nueva-control.component.ts
   src/app/raiz/finanzas-nueva/cuenta-entidad/cuenta-entidad.component.ts
   src/app/raiz/finanzas-nueva/cuentas/finanzas-cuentas.component.ts
   src/app/raiz/finanzas-nueva/enlace-cuenta.ts
   src/app/raiz/finanzas-nueva/finanzas-nueva.module.ts
   src/app/raiz/finanzas-nueva/modales/detalle-movimiento/detalle-movimiento.component.ts
   src/app/raiz/finanzas-nueva/resumen/finanzas-resumen.component.html
   src/app/raiz/finanzas-nueva/resumen/finanzas-resumen.component.ts
   src/app/raiz/nueva-facturacion/emitidos/facturacion-emitidos.component.ts
   src/app/raiz/nueva-facturacion/nueva-facturacion-routing.module.ts
   src/app/raiz/nueva-facturacion/nueva-facturacion.module.ts
   src/app/raiz/nueva-facturacion/vincular-factura-liq/vincular-factura-liq.component.ts
   src/app/raiz/raiz-routing.module.ts
   src/app/raiz/raiz.module.ts
   src/app/raiz/reportes/reportes-routing.module.ts
   src/app/raiz/sidebar/sidebar.component.html
   src/app/servicios/database/db-firestore.service.ts
   src/app/servicios/gestion-usuarios/gestion-usuarios.service.ts
   src/app/servicios/informes/pdf/pdf.service.ts
   src/app/servicios/liquidaciones/liquidacion.service.ts
   src/app/servicios/storage/storage.service.ts
   ```
2. **`ls src/app/reglas/`:** solo `informe-liq.rules.ts`.
3. **Selectores:** solo dentro de `raiz/nueva-facturacion/facturacion-listado/` y
   `facturacion-historico/`.
4. **`interfaces/informes-tabla`:** solo
   `shared/tabla/informes-acciones-cell/informes-acciones-cell.component.ts`.
5. **`finanzasNueva` por archivo** (19 en total):
   - cuenta-entidad 5;
   - control 5;
   - cuentas 2;
   - resumen html 2;
   - antiguedad, module, detalle-movimiento, resumen ts y enlace-cuenta, 1
     cada uno.
6. **`pdf.service`:** `generarMovimientoPdf` en 1 línea; `formatearMoneda` en
   4 líneas (3 usos dentro de `generarMovimientoPdf` + la definición, que
   está inmediatamente después de ese método).
7. **`wc`:** 584 líneas.

Si algo no coincide, pará y reportá.

## PASO 1 — Ediciones (17 archivos, 31 cambios)

Nota para 1.17 (`reportes-routing`): dos líneas del BUSCAR terminan con
espacios (como en el archivo). Si no coincide solo por esos espacios, borrá
el bloque comentado completo, desde `/*{path: 'historial'` hasta `*/`
inclusive, y reportalo.

### 1.1 — `src/app/raiz/raiz.module.ts`

**1.1a**

BUSCAR:
```ts
import { FinanzasModule } from './finanzas/finanzas.module';
import { NuevaFacturacionModule } from './nueva-facturacion/nueva-facturacion.module';
```

REEMPLAZAR:
```ts
import { NuevaFacturacionModule } from './nueva-facturacion/nueva-facturacion.module';
```

**1.1b**

BUSCAR:
```ts
        NuevaFacturacionModule,
        FinanzasModule,
        ReportesModule
```

REEMPLAZAR:
```ts
        NuevaFacturacionModule,
        ReportesModule
```

### 1.2 — `src/app/raiz/raiz-routing.module.ts`



BUSCAR:
```ts
    {
      path: 'finanzas',
      loadChildren: () => import('./finanzas/finanzas.module').then(m => m.FinanzasModule),
      canActivate: [RoleGuard], // Protege acceso dentro del módulo
      data: { roles: ['dev','admin'] }, // 
    },
    {
      // Frente Finanzas: módulo nuevo en paralelo al viejo ('finanzas').
      // Solo lazy: NO se importa en RaizModule. demo lee (reglas 'finanzas').
      path: 'finanzasNueva',
```

REEMPLAZAR:
```ts
    {
      // Frente Finanzas (F9): el módulo viejo se retiró; la ruta 'finanzas'
      // es el módulo nuevo (carpeta finanzas-nueva). Solo lazy: NO se
      // importa en RaizModule. demo lee (reglas 'finanzas').
      path: 'finanzas',
```

### 1.3 — `src/app/raiz/sidebar/sidebar.component.html`



BUSCAR:
```html
                            <!-- Frente Finanzas: el link viejo (raiz/finanzas) queda comentado hasta el cierre del frente. -->
                            <!-- <a [routerLink]="['/finanzas']"> -->
                            <a [routerLink]="['/finanzasNueva']">
```

REEMPLAZAR:
```html
                            <a [routerLink]="['/finanzas']">
```

### 1.4 — `src/app/servicios/liquidaciones/liquidacion.service.ts`

**1.4a**

BUSCAR:
```ts
import { FinanzasResumenService } from "../finanzas/finanzas-resumen.service";
import { EstadoOp, Operacion } from "src/app/interfaces/operacion";
```

REEMPLAZAR:
```ts
import { EstadoOp, Operacion } from "src/app/interfaces/operacion";
```

**1.4b**

BUSCAR:
```ts
    private firestore: Firestore,
    private finanzasResumenService: FinanzasResumenService,
    private builder: LiquidacionBuilderService,
```

REEMPLAZAR:
```ts
    private firestore: Firestore,
    private builder: LiquidacionBuilderService,
```

**1.4c**

BUSCAR:
```ts
      // actualizar resumen financiero
      if (params.modo === "factura") {
        try {
          await this.finanzasResumenService.aplicarNuevaLiquidacion(informeLiq);
        } catch (error) {
          console.error("Error actualizando resumen financiero", error);
        }
      }
      let respuesta = {
```

REEMPLAZAR:
```ts
      let respuesta = {
```

**1.4d**

BUSCAR:
```ts
      // actualizar resumen financiero
      if (params.modo === "factura") {
        try {
          await this.finanzasResumenService.revertirLiquidacion(params.informeLiq);
        } catch (error) {
          console.error("Error actualizando resumen financiero", error);
        }
      }
      let respuesta = {
```

REEMPLAZAR:
```ts
      let respuesta = {
```

### 1.5 — `src/app/servicios/database/db-firestore.service.ts`



BUSCAR:
```ts
import { NumeradorService } from "../numerador/numerador.service";

import { MovimientoFinanciero } from "src/app/interfaces/movimiento-financiero";
```

REEMPLAZAR:
```ts
import { NumeradorService } from "../numerador/numerador.service";
```

### 1.6 — `src/app/servicios/informes/pdf/pdf.service.ts`



BUSCAR:
```ts
import { MovimientoImpresionVM } from "src/app/interfaces/movimiento-impresion-v-m";
import { TDocumentDefinitions } from "pdfmake/interfaces";
```

REEMPLAZAR:
```ts
import { TDocumentDefinitions } from "pdfmake/interfaces";
```

### 1.7 — `src/app/servicios/storage/storage.service.ts`

**1.7a**

BUSCAR:
```ts
  public noOperativo$ = this._noOperativo$.asObservable();

  private _resumenFinanzas$ = new BehaviorSubject<any>(this.loadInfo('resumenFinanzas') || []);
  public resumenFinanzas$ = this._resumenFinanzas$.asObservable();
```

REEMPLAZAR:
```ts
  public noOperativo$ = this._noOperativo$.asObservable();
```

**1.7b**

BUSCAR:
```ts
      case 'resumenFinanzas':{
        this._resumenFinanzas$.next(data);
        break
      }
      default: {
```

REEMPLAZAR:
```ts
      default: {
```

**1.7c**

BUSCAR:
```ts
      case 'resumenFinanzas':
        return this._resumenFinanzas$.asObservable();
      default:
```

REEMPLAZAR:
```ts
      default:
```

### 1.8 — `src/app/raiz/nueva-facturacion/nueva-facturacion.module.ts`

**1.8a**

BUSCAR:
```ts
import { FacturacionListadoComponent } from './facturacion-listado/facturacion-listado.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
```

REEMPLAZAR:
```ts
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
```

**1.8b**

BUSCAR:
```ts
import { ModalVincularFacturaComponent } from './modal-vincular-factura/modal-vincular-factura.component';
import { FacturacionHistoricoComponent } from './facturacion-historico/facturacion-historico.component';
import { InformesTablaComponent } from './informes-tabla/informes-tabla.component';
import { FacturacionEmitidosComponent } from './emitidos/facturacion-emitidos.component';
```

REEMPLAZAR:
```ts
import { FacturacionEmitidosComponent } from './emitidos/facturacion-emitidos.component';
```

**1.8c**

BUSCAR:
```ts
    ControlComponent,
    FacturacionListadoComponent,
    ModalVincularFacturaComponent,
    FacturacionHistoricoComponent,
    InformesTablaComponent,
    FacturacionEmitidosComponent,
```

REEMPLAZAR:
```ts
    ControlComponent,
    FacturacionEmitidosComponent,
```

### 1.9 — `src/app/raiz/nueva-facturacion/nueva-facturacion-routing.module.ts`

**1.9a**

BUSCAR:
```ts
import { FacturacionListadoComponent } from './facturacion-listado/facturacion-listado.component';
import { FacturacionHistoricoComponent } from './facturacion-historico/facturacion-historico.component';
import { FacturacionEmitidosComponent } from './emitidos/facturacion-emitidos.component';
```

REEMPLAZAR:
```ts
import { FacturacionEmitidosComponent } from './emitidos/facturacion-emitidos.component';
```

**1.9b**

BUSCAR:
```ts
        {path: 'revertidos', component: FacturacionRevertidosComponent},
        // Camino viejo (InformeLiq / resumenLiq) — se retira con la migración de Vantruck:
        //{path: 'listado', component:FacturacionListadoComponent},
        //{path: 'historial', component:FacturacionHistoricoComponent},
```

REEMPLAZAR:
```ts
        {path: 'revertidos', component: FacturacionRevertidosComponent},
```

### 1.10 — `src/app/raiz/nueva-facturacion/emitidos/facturacion-emitidos.component.ts`



BUSCAR:
```ts
 *  revertir (InformeLiqService.revertirEmitido). Camino paralelo a
 *  FacturacionListadoComponent (modelo viejo, resumenLiq). */
```

REEMPLAZAR:
```ts
 *  revertir (InformeLiqService.revertirEmitido). */
```

### 1.11 — `src/app/raiz/nueva-facturacion/vincular-factura-liq/vincular-factura-liq.component.ts`



BUSCAR:
```ts
 *  revalida todo en su transacción). Cierra con `true` si vinculó.
 *  Camino paralelo a ModalVincularFacturaComponent (modelo viejo). */
```

REEMPLAZAR:
```ts
 *  revalida todo en su transacción). Cierra con `true` si vinculó. */
```

### 1.12 — `src/app/servicios/gestion-usuarios/gestion-usuarios.service.ts`



BUSCAR:
```ts
   * Lectura puntual (no listener) de toda la colección `users`. Mismo
   * patrón que CuentaCorrienteService.obtenerRankingMorosos(): getDocs
   * directo sobre la colección, sin ConId (el doc ya trae su propio
```

REEMPLAZAR:
```ts
   * Lectura puntual (no listener) de toda la colección `users`: getDocs
   * directo sobre la colección, sin ConId (el doc ya trae su propio
```

### 1.13 — `src/app/shared/utils/tabs-url.util.ts`



BUSCAR:
```ts
 *  no tienen pestaña propia, ej. 'finanzas/movimiento' → Historial). */
```

REEMPLAZAR:
```ts
 *  no tienen pestaña propia, ej. 'finanzas/cuenta' → Cuentas). */
```

### 1.14 — `src/app/servicios/informes-liq/informe-liq.service.ts`

**1.14a**

BUSCAR:
```ts
 *  Camino paralelo a LiquidacionService (modelo viejo, sin tocar).
 *
 *  TODO Finanzas: ningún orquestador actualiza resumenFinanzas / cuenta
 *  corriente — la cascada de Finanzas es un frente propio. */
```

REEMPLAZAR:
```ts
 *  Camino paralelo a LiquidacionService (modelo viejo, sin tocar).
 *  Finanzas no usa un agregado por entidad: los saldos viven en
 *  valoresFinancieros del informe y la cuenta se calcula al consultar
 *  (diseno-finanzas.md F2). */
```

**1.14b**

BUSCAR:
```ts
   *  ventana de carrera es la del editor abierto).
   *  TODO Finanzas: sobre un 'emitido', el cambio de total impacta en
   *  resumenFinanzas cuando se conecte la cascada. */
```

REEMPLAZAR:
```ts
   *  ventana de carrera es la del editor abierto). */
```

**1.14c**

BUSCAR:
```ts
   *  compensación (≤ MAX_COMPENSACIONES).
   *  TODO Finanzas: cuando exista la cascada, revertir tiene que descontar
   *  el informe de resumenFinanzas / cuenta corriente. */
```

REEMPLAZAR:
```ts
   *  compensación (≤ MAX_COMPENSACIONES). */
```

### 1.15 — `src/app/shared/utils/movimiento-fin.util.ts`

**1.15a**

BUSCAR:
```ts
  pagos: number;
  cantidadPagos: number;
  sinImputar: number;                     // Σ sinImputar de cobros/pagos vigentes
```

REEMPLAZAR:
```ts
  pagos: number;
  cantidadPagos: number;
  devoluciones: number;                   // F9 (F72): cobros/pagos contra el saldo de otro movimiento
  cantidadDevoluciones: number;
  sinImputar: number;                     // Σ sinImputar de cobros/pagos vigentes
```

**1.15b**

BUSCAR:
```ts
/** Totales de las tarjetas. Solo suman los VIGENTES; los anulados se
 *  cuentan aparte. Los ajustes no suman (llegan en F7). */
```

REEMPLAZAR:
```ts
/** Totales de las tarjetas. Solo suman los VIGENTES; los anulados se
 *  cuentan aparte. Los ajustes no suman. Las devoluciones (F7b) van en su
 *  propia tarjeta, no en Cobros / Pagos (F72). */
```

**1.15c**

BUSCAR:
```ts
  movimientos: Pick<MovimientoFin, 'tipo' | 'estado' | 'total' | 'sinImputar'>[],
): TotalesMovimientos {
  const t: TotalesMovimientos = { cobros: 0, cantidadCobros: 0, pagos: 0, cantidadPagos: 0, sinImputar: 0, anulados: 0 };
  for (const m of movimientos) {
    if (m.estado === 'anulado') {
      t.anulados++;
      continue;
    }
    if (m.tipo === 'cobro') {
```

REEMPLAZAR:
```ts
  movimientos: Pick<MovimientoFin, 'tipo' | 'estado' | 'total' | 'sinImputar' | 'imputaciones'>[],
): TotalesMovimientos {
  const t: TotalesMovimientos = {
    cobros: 0, cantidadCobros: 0, pagos: 0, cantidadPagos: 0, devoluciones: 0, cantidadDevoluciones: 0,
    sinImputar: 0, anulados: 0,
  };
  for (const m of movimientos) {
    if (m.estado === 'anulado') {
      t.anulados++;
      continue;
    }
    if (esDevolucion(m)) {
      t.devoluciones += m.total;
      t.cantidadDevoluciones++;
    } else if (m.tipo === 'cobro') {
```

**1.15d**

BUSCAR:
```ts
  return { ...t, cobros: redondear2(t.cobros), pagos: redondear2(t.pagos), sinImputar: redondear2(t.sinImputar) };
```

REEMPLAZAR:
```ts
  return {
    ...t,
    cobros: redondear2(t.cobros),
    pagos: redondear2(t.pagos),
    devoluciones: redondear2(t.devoluciones),
    sinImputar: redondear2(t.sinImputar),
  };
```

### 1.16 — `src/app/raiz/finanzas-nueva/movimientos/finanzas-movimientos.component.html`



BUSCAR:
```html
        <div class="tarjeta-label">Pagos ({{ totales.cantidadPagos }})</div>
        <div class="tarjeta-valor">{{ totales.pagos | formatearValor: '$' }}</div>
      </div>
    </div>
  </div>
```

REEMPLAZAR:
```html
        <div class="tarjeta-label">Pagos ({{ totales.cantidadPagos }})</div>
        <div class="tarjeta-valor">{{ totales.pagos | formatearValor: '$' }}</div>
      </div>
    </div>
  </div>
  <div class="col-6 col-lg">
    <div class="card tarjeta h-100">
      <div class="card-body">
        <div class="tarjeta-label">Devoluciones ({{ totales.cantidadDevoluciones }})</div>
        <div class="tarjeta-valor">{{ totales.devoluciones | formatearValor: '$' }}</div>
      </div>
    </div>
  </div>
```

### 1.17 — `src/app/raiz/reportes/reportes-routing.module.ts`



BUSCAR:
```ts
            {path: 'opEntidad', component:ResumenOpEntidadComponent},
            /*{path: 'historial', component:HistorialMovimientosComponent},
            {path: 'movimiento/:id',component: MovimientoDetalleComponent},          
            {path: 'cuenta-corriente',component: CuentaCorrienteComponent},
            {path: 'cuenta-corriente/:id',component: DetalleCuentaCorrienteComponent},
            {path: 'informe/:id', component: InformeLiqCuentaCorrienteComponent },
            {path: 'ledger', component: LedgerComponent},
            {path: 'aging', component: AgingListadoComponent},
            {path: 'ranking', component: RankingMorososComponent},          
                                          */
```

REEMPLAZAR:
```ts
            {path: 'opEntidad', component:ResumenOpEntidadComponent},
```

## PASO 2 — `src/app/servicios/informes/pdf/pdf.service.ts`: quitar `generarMovimientoPdf`

Después del PASO 1 (ya sin el import de `MovimientoImpresionVM`), borrá, en
el lugar:

- **Desde** la línea en blanco inmediatamente anterior a
  `  generarMovimientoPdf(vm: MovimientoImpresionVM): void {`
- **hasta** el `  }` que cierra `  private formatearMoneda(valor: number): string {`,
  inclusive.

El archivo tiene que terminar así (la llave del método anterior, una línea
en blanco y la de la clase):

```ts
      default: {
        return "";
      }
    }
  }

}
```

Verificá:

- `grep -c "generarMovimientoPdf\|formatearMoneda\|MovimientoImpresionVM"` = 0;
- `wc -l` = 372.

## PASO 3 — Ruta `finanzasNueva` → `finanzas` (F70)

En estos 9 archivos reemplazá TODAS las apariciones del texto literal
`finanzasNueva` (respetando mayúsculas: NO toca `FinanzasNueva…` ni
`finanzas-nueva`) por `finanzas`:

```
src/app/raiz/finanzas-nueva/cuenta-entidad/cuenta-entidad.component.ts   (5)
src/app/raiz/finanzas-nueva/control/finanzas-nueva-control.component.ts  (5)
src/app/raiz/finanzas-nueva/cuentas/finanzas-cuentas.component.ts        (2)
src/app/raiz/finanzas-nueva/resumen/finanzas-resumen.component.html      (2)
src/app/raiz/finanzas-nueva/antiguedad/finanzas-antiguedad.component.ts  (1)
src/app/raiz/finanzas-nueva/finanzas-nueva.module.ts                     (1)
src/app/raiz/finanzas-nueva/modales/detalle-movimiento/detalle-movimiento.component.ts (1)
src/app/raiz/finanzas-nueva/resumen/finanzas-resumen.component.ts        (1)
src/app/raiz/finanzas-nueva/enlace-cuenta.ts                             (1)
```

Son rutas (`'/finanzasNueva/cuenta'`, `'finanzasNueva/resumen'`, …) y
comentarios. Las pestañas del shell quedan `finanzas/resumen`,
`finanzas/cuentas` (alias `finanzas/cuenta`), `finanzas/antiguedad` y
`finanzas/movimientos`.

## PASO 4 — Borrar

```bash
rm -r src/app/raiz/finanzas
rm -r src/app/servicios/finanzas
rm -r src/app/servicios/cuenta-corriente
rm -r src/app/raiz/nueva-facturacion/facturacion-listado
rm -r src/app/raiz/nueva-facturacion/facturacion-historico
rm -r src/app/raiz/nueva-facturacion/informes-tabla
rm -r src/app/raiz/nueva-facturacion/modal-vincular-factura
rm -r src/app/reglas
rm src/app/interfaces/aging-resumen.ts src/app/interfaces/cuenta-corriente-resumen.ts src/app/interfaces/estado-informeliq.ts src/app/interfaces/ledger.ts src/app/interfaces/movimiento-financiero.ts src/app/interfaces/movimiento-form-v-m.ts src/app/interfaces/movimiento-impresion-v-m.ts src/app/interfaces/ranking-moroso.ts src/app/interfaces/resumen-financiero-entidad.ts
```

Ojo: `src/app/raiz/finanzas` (viejo) — NO `finanzas-nueva`.

## PASO 5 — Verificación

```bash
npm run build:demo
grep -rnE "$PAT" src/     # (mismo PAT del PASO 0)
grep -rn "finanzas-nueva" src/app/raiz/raiz-routing.module.ts
ls src/app/raiz/finanzas-nueva >/dev/null && echo "finanzas-nueva OK"
git status --short | grep -c "^ D"
git status --short | grep "^ M"
```

Esperado:

- El build termina sin errores. Los warnings de presupuesto previos no
  cuentan; si el bundle inicial bajó, reportá el tamaño.
- **Grep del PAT:** 0 líneas.
- **`raiz-routing`:** 2 líneas (el comentario nuevo y el `loadChildren`
  del módulo nuevo, ahora bajo `path: 'finanzas'`).
- Aparece `finanzas-nueva OK`.
- `git status`:
  - archivos borrados ( D): reportá la cantidad;
  - modificados ( M): exactamente estos 26 (los 17 del PASO 1 + `pdf.service` ya
    incluido + los 9 del PASO 3):
    `raiz.module`, `raiz-routing`, `sidebar.component.html`,
    `liquidacion.service`, `db-firestore.service`, `pdf.service`,
    `storage.service`, `nueva-facturacion.module`,
    `nueva-facturacion-routing.module`, `facturacion-emitidos.component.ts`,
    `vincular-factura-liq.component.ts`, `gestion-usuarios.service`,
    `tabs-url.util`, `informe-liq.service`, `movimiento-fin.util`,
    `finanzas-movimientos.component.html`, `reportes-routing.module`, y los 9
    de finanzas-nueva del PASO 3.

Reportá la salida.

## Pruebas manuales (demo)

1. **Sidebar → Finanzas:** abre `/finanzas` en la pestaña Resumen. Navegá
   las 4 pestañas: la URL es `/finanzas/...` y la pestaña activa se marca
   bien.
2. **Cuenta de una entidad:** desde Cuentas, Antigüedad, Resumen (top 5 y
   alertas) y Movimientos (nombre en la tabla y botón del detalle) → URL
   `/finanzas/cuenta/<tipo>/<id>`. "Volver" vuelve a la pestaña de origen y
   Cuentas queda resaltada mientras estás en la cuenta.
3. **Movimientos:** tarjetas Cobros · Pagos · Devoluciones · Sin imputar ·
   Anulados.
   - Con una devolución en el rango (RC de un chofer u OPG a un cliente;
     si no hay, registrá una con "Cerrar / devolver" sobre un anticipo),
     aparece en Devoluciones y no en Cobros/Pagos.
   - Cobros + Pagos + Devoluciones = suma de los vigentes no-ajuste de la
     tabla.
4. **Ruta vieja:** `/finanzasNueva` ya no existe (comportamiento de ruta
   desconocida, como cualquier otra).
5. **Facturación:** Emitidos, Facturados, Revertidos y Vincular factura
   funcionan igual.
6. **Liquidación camino viejo** (si se puede probar en demo): emitir y anular
   no muestran errores en consola.

## Commit (lo hace Nico)

```
refactor(finanzas): retiro del módulo viejo y ruta /finanzas (F9)

- Borrado raiz/finanzas, servicios/finanzas, servicios/cuenta-corriente y
  sus interfaces; FinanzasModule fuera de RaizModule (era eager).
- LiquidacionService (camino viejo) ya no escribe resumenFinanzas (F21);
  fuera resumenFinanzas$ de StorageService, generarMovimientoPdf de
  PdfService e import sin uso en DbFirestoreService.
- Facturación: borrados facturacion-listado/historico (modelo viejo, rutas
  comentadas), informes-tabla, modal-vincular-factura y
  reglas/informe-liq.rules + estado-informeliq.
- Ruta finanzasNueva → finanzas (carpetas y clases sin cambio).
- Movimientos: tarjeta Devoluciones aparte; Cobros/Pagos sin devoluciones.
- Reglas de movimientos/resumenFinanzas se quedan hasta la migración (sin
  deploy).
```

FIN DE LA INSTRUCCIÓN F9
````
