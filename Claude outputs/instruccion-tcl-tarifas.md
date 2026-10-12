````
INSTRUCCIÓN TC-L — Tarifas (cierre): herramienta de demo para limpiar campos viejos de tarifas en operaciones
==========================================================================================================

Si no ves la línea "FIN DE LA INSTRUCCIÓN TC-L" al final, el texto llegó
cortado: leé el archivo completo antes de empezar.

## Contexto y razonamiento

Después de TC6, TC8 y TC9 el código ya no lee ni escribe estos campos de
Operacion, pero las operaciones guardadas en demo los siguen teniendo
(opToFirestore hace spread, así que una edición los re-escribe tal cual):
- `tarifaTipo` (TC8) y `datosTarifaPersonalizada` (TC6): basura.
- `adExtraConcepto`, `valores.cliente.adExtraValor`,
  `valores.chofer.adExtraValor` (TC9): son el adicional extra VIEJO. Desde
  TC9 el código lee `op.adExtra`, así que las ops que tenían adicional
  cargado con los campos viejos lo "pierden" si se cierran o se edita su
  InformeOp.

Herramienta nueva en /migracion (solo demo, bloqueada por projectId como el
generador y la limpieza de demo), en OperacionMigrationService:
1. **Auditar** (solo lectura): recorre `operaciones` y por cada una arma un
   plan:
   - sin `adExtra` en el documento → `adExtra` traducido de los campos
     viejos con armarAdExtra (todo vacío → null);
   - con `adExtra` (escrito por el código nuevo) → se conserva; si los
     campos viejos dicen otra cosa se informa como CONFLICTO (para revisar
     a mano; pasa si una op con adicional viejo se editó después de TC9);
   - lista los campos muertos presentes para borrarlos.
2. **Aplicar**: con confirmación, un `update` por op (deleteField() en los
   campos muertos + `adExtra` si corresponde), en batches de 400. No toca
   valoresNuevos ni nada más → los resúmenes no cambian.
Es idempotente: después de aplicar, una nueva auditoría da 0.

`op.valores` (el resto del espejo legacy) NO se borra acá: lo siguen
escribiendo/leyendo partes del código hasta TC10.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit. NO ejecutes la herramienta
  (la corre nico desde la pantalla).
- Si un texto a BUSCAR no está, o aparece más de una vez: detenete y reportá.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Ningún BUSCAR de esta instrucción tiene espacios al final de línea.
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.

## PASO 0 — Verificación (sin modificar nada)

0.1 operacion-migration.service.ts tiene solo `normalizarDocumentacion` y
    usa `Firestore` inyectado por constructor.
0.2 `LimpiezaDemoService.PROYECTO_DEMO` existe (servicios/desarrollo/
    limpieza-demo.service.ts) y generador-operaciones.service.ts lo usa con
    `environment.firebase.projectId` (mismo guard que se replica acá).
0.3 interfaces/operacion.ts exporta `AdicionalExtraOp` y `armarAdExtra`
    (TC9) y shared/utils/igualdad.util.ts exporta `igualesPorContenido`.
0.4 El módulo que declara MigracionComponent importa CommonModule (se usa
    el pipe `json` en el template).
0.5 `grep -rn "auditarLimpiezaCamposTarifas\|PlanLimpiezaOp" src/` → sin resultados.
Si algo no coincide, DETENETE y reportá.

## PASO 1 — src/app/servicios/migracion/operacion-migration.service.ts

1.1 BUSCAR:
```
import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, doc, updateDoc } from '@angular/fire/firestore';
```
REEMPLAZAR:
```
import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, doc, updateDoc, writeBatch, deleteField } from '@angular/fire/firestore';
import { environment } from 'src/environments/environment';
import { AdicionalExtraOp, armarAdExtra } from 'src/app/interfaces/operacion';
import { LimpiezaDemoService } from 'src/app/servicios/desarrollo/limpieza-demo.service';
import { igualesPorContenido } from 'src/app/shared/utils/igualdad.util';

/** Plan de limpieza de UNA operación (TC-L). `adExtra` undefined = el campo
 *  no se toca (la op ya lo tiene); null o un objeto = se escribe. `borrar`:
 *  rutas (con punto) de campos muertos presentes en el documento. */
export interface PlanLimpiezaOp {
  id: string;
  numeroOperacion: number | null;
  adExtra?: AdicionalExtraOp | null;
  borrar: string[];
}

/** Op que ya tenía `adExtra` (escrito por el código nuevo) y además campos
 *  viejos de adicional con OTRO contenido: se conserva `adExtra` y se borran
 *  los viejos; se informa para revisar a mano. */
export interface ConflictoLimpiezaOp {
  id: string;
  numeroOperacion: number | null;
  adExtraActual: AdicionalExtraOp | null;
  adExtraViejo: AdicionalExtraOp | null;
}

export interface ResultadoAuditoriaLimpiezaOps {
  leidas: number;
  aLimpiar: PlanLimpiezaOp[];
  conAdicionalTraducido: number;
  conflictos: ConflictoLimpiezaOp[];
}
```

1.2 BUSCAR:
```
    console.log(`--- Normalización completada: ${actualizadas} operación(es) actualizadas, ${snapshot.size - actualizadas} ya estaban en formato correcto ---`);
  }
}
```
REEMPLAZAR:
```
    console.log(`--- Normalización completada: ${actualizadas} operación(es) actualizadas, ${snapshot.size - actualizadas} ya estaban en formato correcto ---`);
  }

  // ── TC-L: limpieza de campos viejos de tarifas en operaciones (SOLO demo) ──

  /** Campos muertos tras TC6/TC8/TC9 (rutas con punto, aptas para update). */
  private static readonly CAMPOS_MUERTOS_OP = [
    'tarifaTipo',
    'datosTarifaPersonalizada',
    'adExtraConcepto',
    'valores.cliente.adExtraValor',
    'valores.chofer.adExtraValor',
  ];

  private verificarDemo(): void {
    if (environment.firebase.projectId !== LimpiezaDemoService.PROYECTO_DEMO) {
      throw new Error(`Limpieza de campos bloqueada: el proyecto es '${environment.firebase.projectId}', no demo.`);
    }
  }

  /** Solo lectura. Por cada operación:
   *  - si NO tiene `adExtra`: lo traduce de los campos viejos (adExtraConcepto
   *    + valores.cliente/chofer.adExtraValor) con armarAdExtra (todo vacío →
   *    null);
   *  - si YA tiene `adExtra` (escrito por el código nuevo): lo conserva; si
   *    los campos viejos dicen otra cosa, lo informa como conflicto;
   *  - lista los campos muertos presentes para borrarlos.
   *  Idempotente: después de aplicar, una segunda auditoría da 0. */
  async auditarLimpiezaCamposTarifas(): Promise<ResultadoAuditoriaLimpiezaOps> {
    this.verificarDemo();
    const snap = await getDocs(collection(this.firestore, '/Vantruck/datos/operaciones'));
    const aLimpiar: PlanLimpiezaOp[] = [];
    const conflictos: ConflictoLimpiezaOp[] = [];
    let conAdicionalTraducido = 0;

    for (const d of snap.docs) {
      const o = d.data() as any;
      const numeroOperacion = o.numeroOperacion ?? null;

      const borrar = OperacionMigrationService.CAMPOS_MUERTOS_OP.filter(ruta => {
        const partes = ruta.split('.');
        let actual: any = o;
        for (let i = 0; i < partes.length - 1; i++) actual = actual?.[partes[i]];
        return actual != null && typeof actual === 'object' && partes[partes.length - 1] in actual;
      });

      const viejo = armarAdExtra(o.adExtraConcepto, o.valores?.cliente?.adExtraValor, o.valores?.chofer?.adExtraValor);
      let adExtra: AdicionalExtraOp | null | undefined = undefined;
      if (!('adExtra' in o)) {
        adExtra = viejo;
        if (viejo) conAdicionalTraducido++;
      } else if (viejo && !igualesPorContenido(viejo, o.adExtra)) {
        conflictos.push({ id: d.id, numeroOperacion, adExtraActual: o.adExtra ?? null, adExtraViejo: viejo });
      }

      if (borrar.length > 0 || adExtra !== undefined) {
        aLimpiar.push({ id: d.id, numeroOperacion, adExtra, borrar });
      }
    }

    return { leidas: snap.size, aLimpiar, conAdicionalTraducido, conflictos };
  }

  /** Aplica el plan de auditarLimpiezaCamposTarifas: por op, un update con
   *  deleteField() en cada campo muerto + `adExtra` si corresponde. Batches
   *  de 400. No toca valoresNuevos ni ningún otro campo (los resúmenes no
   *  cambian). Devuelve la cantidad de operaciones actualizadas. */
  async aplicarLimpiezaCamposTarifas(plan: PlanLimpiezaOp[]): Promise<number> {
    this.verificarDemo();
    const colRef = collection(this.firestore, '/Vantruck/datos/operaciones');
    let actualizadas = 0;
    for (let i = 0; i < plan.length; i += 400) {
      const lote = plan.slice(i, i + 400);
      const batch = writeBatch(this.firestore);
      for (const p of lote) {
        const cambios: Record<string, any> = {};
        for (const ruta of p.borrar) cambios[ruta] = deleteField();
        if (p.adExtra !== undefined) cambios['adExtra'] = p.adExtra;
        batch.update(doc(colRef, p.id), cambios);
      }
      await batch.commit();
      actualizadas += lote.length;
    }
    return actualizadas;
  }
}
```

## PASO 2 — src/app/componentes/migracion/migracion.component.ts

2.1 BUSCAR:
```
import { OperacionMigrationService } from 'src/app/servicios/migracion/operacion-migration.service';
```
REEMPLAZAR:
```
import { OperacionMigrationService, PlanLimpiezaOp, ConflictoLimpiezaOp } from 'src/app/servicios/migracion/operacion-migration.service';
```

2.2 BUSCAR:
```
  estadoDocumentacionOperaciones: string = '';
```
REEMPLAZAR:
```
  estadoDocumentacionOperaciones: string = '';

  estadoLimpiezaCamposOp: string = '';
  planLimpiezaCamposOp: PlanLimpiezaOp[] = [];
  conflictosLimpiezaCamposOp: ConflictoLimpiezaOp[] = [];
```

2.3 BUSCAR:
```
  async migrarProveedores(): Promise<void> {
```
REEMPLAZAR:
```
  /** TC-L — paso 1: auditoría (solo lectura). */
  async auditarLimpiezaCamposOp(): Promise<void> {
    this.ejecutando = true;
    this.estadoLimpiezaCamposOp = 'Auditando operaciones...';
    this.planLimpiezaCamposOp = [];
    this.conflictosLimpiezaCamposOp = [];
    try {
      const r = await this.operacionMigration.auditarLimpiezaCamposTarifas();
      this.planLimpiezaCamposOp = r.aLimpiar;
      this.conflictosLimpiezaCamposOp = r.conflictos;
      this.estadoLimpiezaCamposOp =
        `Leídas: ${r.leidas} — a actualizar: ${r.aLimpiar.length} — ` +
        `con adicional traducido a adExtra: ${r.conAdicionalTraducido} — conflictos: ${r.conflictos.length}.`;
      console.log('Auditoría limpieza campos de tarifas (operaciones)', r);
    } catch (e: any) {
      this.estadoLimpiezaCamposOp = `Error: ${e.message}`;
      console.error('Error en auditoría de limpieza de campos de operaciones:', e);
    } finally {
      this.ejecutando = false;
    }
  }

  /** TC-L — paso 2: aplica el plan de la última auditoría. */
  async aplicarLimpiezaCamposOp(): Promise<void> {
    if (this.planLimpiezaCamposOp.length === 0) {
      this.estadoLimpiezaCamposOp = 'No hay nada para aplicar — corré primero la auditoría.';
      return;
    }
    const confirmacion = await Swal.fire({
      icon: 'warning',
      title: '¿Aplicar limpieza de campos de tarifas?',
      text: `Se van a actualizar ${this.planLimpiezaCamposOp.length} operación(es) en demo. No se puede deshacer.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, aplicar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirmacion.isConfirmed) return;

    this.ejecutando = true;
    this.estadoLimpiezaCamposOp = 'Aplicando...';
    try {
      const n = await this.operacionMigration.aplicarLimpiezaCamposTarifas(this.planLimpiezaCamposOp);
      this.estadoLimpiezaCamposOp = `✅ ${n} operación(es) actualizadas. Volvé a auditar: tiene que dar 0.`;
      this.planLimpiezaCamposOp = [];
    } catch (e: any) {
      this.estadoLimpiezaCamposOp = `Error: ${e.message}`;
      console.error('Error al aplicar limpieza de campos de operaciones:', e);
    } finally {
      this.ejecutando = false;
    }
  }

  async migrarProveedores(): Promise<void> {
```

## PASO 3 — src/app/componentes/migracion/migracion.component.html

3.1 BUSCAR:
```
  <app-recalculo-comisiones></app-recalculo-comisiones>
```
REEMPLAZAR:
```
  <app-recalculo-comisiones></app-recalculo-comisiones>

  <div style="margin-bottom: 2rem; border-bottom: 1px solid #ccc; padding-bottom: 1rem;">
    <h4>Limpieza de campos viejos de tarifas en operaciones (demo, TC-L)</h4>
    <p class="text-muted mb-2">
      Traduce el adicional extra viejo (adExtraConcepto + valores.cliente/chofer.adExtraValor)
      a adExtra y borra tarifaTipo, datosTarifaPersonalizada y esos campos viejos.
      Auditar no escribe nada.
    </p>
    <button
      (click)="auditarLimpiezaCamposOp()"
      [disabled]="ejecutando"
      class="btn btn-info me-2">
      1. Auditar
    </button>
    <button
      (click)="aplicarLimpiezaCamposOp()"
      [disabled]="ejecutando || planLimpiezaCamposOp.length === 0"
      class="btn btn-danger me-2">
      2. Aplicar
    </button>
    <p *ngIf="estadoLimpiezaCamposOp" style="margin-top: 0.5rem;">{{ estadoLimpiezaCamposOp }}</p>
    <div *ngIf="conflictosLimpiezaCamposOp.length > 0" style="margin-top: 0.5rem;">
      <p><strong>Conflictos (se conserva adExtra; revisar a mano):</strong></p>
      <ul>
        <li *ngFor="let c of conflictosLimpiezaCamposOp">
          Op N° {{ c.numeroOperacion ?? c.id }} — adExtra actual: {{ c.adExtraActual | json }} — viejo: {{ c.adExtraViejo | json }}
        </li>
      </ul>
    </div>
  </div>
```

## Verificación

1. `grep -rn "auditarLimpiezaCamposTarifas\|aplicarLimpiezaCamposTarifas" src/`
   → definiciones en operacion-migration.service.ts y una llamada a cada
   una en migracion.component.ts.
2. `npm run build:demo` sin errores nuevos.
3. Mostrá el diff completo de los 3 archivos.

## Uso y pruebas (demo — lo hace nico)

1. /migracion → "Limpieza de campos viejos de tarifas en operaciones" →
   **1. Auditar**. Anotá: leídas, a actualizar, adicionales traducidos y
   conflictos. Si hay conflictos, revisá la lista antes de seguir (se
   conserva el adExtra actual).
2. **2. Aplicar** → confirmar.
3. **1. Auditar** de nuevo → "a actualizar: 0".
4. En Firestore, una op que tenía adicional viejo: tiene `adExtra` con
   concepto y valores, y ya no tiene adExtraConcepto,
   valores.*.adExtraValor, tarifaTipo ni datosTarifaPersonalizada.
5. Abrir esa op (editar o detalle): el adicional se ve cargado. Si está
   abierta, cerrarla: el adicional se incluye en valores e InformeOp.
6. Recálculo de resúmenes → Simular rango completo: 0 errores, 0
   diferencias (la limpieza no toca valoresNuevos).

## Mensaje de commit

feat(migracion): herramienta de demo para limpiar campos viejos de tarifas en operaciones (TC-L)

- OperacionMigrationService: auditarLimpiezaCamposTarifas (traduce el
  adicional viejo a adExtra, detecta conflictos, lista campos muertos) y
  aplicarLimpiezaCamposTarifas (deleteField + adExtra, batches de 400).
  Solo demo.
- /migracion: sección con Auditar / Aplicar y lista de conflictos.

FIN DE LA INSTRUCCIÓN TC-L
````
