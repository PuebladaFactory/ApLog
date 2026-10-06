````
# Instrucción G3 — Finanzas: Generador de circuito con compensaciones y facturas por el neto (demo)

## Contexto

Frente Finanzas. FC1a, FC1b y FC2 dejaron las compensaciones completas:

- elegir, aplicar al emitir, editar, liberar;
- PDF y Excel con el neto;
- factura por total o neto (F28).

G2 dejó anticipos pendientes en el mes en curso. Este bloque hace que el
**Generador de circuito** (G1, en /migracion, solo demo y rol dev) los
use. Así quedan datos realistas para F5 (Cuenta de la entidad) y se puede
ver el caso "factura por el neto" sin armar un PDF a mano.

Parámetros nuevos:

- **`pctCompensar`** (por defecto 0,8). Aplica a una liquidación de chofer
  o proveedor cuya entidad tiene saldo para compensar (anticipos,
  préstamos, saldos a favor vigentes).
  - Con esa probabilidad, toma esos saldos, más antiguos primero, hasta
    cubrir como mucho el total: el neto nunca queda negativo.
  - Las manda en `DatosLiquidacion.compensaciones`, así que se aplican con
    la función real.
  - El plan lleva la cuenta de lo que ya usó, para no tomar dos veces el
    mismo saldo.
  - Si la entidad no tiene saldo, no se consume azar: el plan de las demás
    no cambia por esto.
- **`pctFacturaNeto`** (por defecto 0,7). De las que se facturan y tienen
  compensaciones, la factura de prueba va por el NETO. Al vincular, queda
  "coincide con el neto".

El resumen del plan muestra, por tipo, cuántas liquidaciones tienen
compensaciones y el total compensado. La confirmación y el lote lo
registran.

Para tener anticipos en las liquidaciones, el orden de uso es:

1. Generador de operaciones del mes en curso.
2. Generador de cobros (G2), que deja anticipos del mes en curso. Si ya
   corrió, los anticipos ya están.
3. Generador de circuito de ese mes.

Ya verificado:

- tsc estricto, con stubs;
- prueba rápida de la elección de compensaciones: más antiguos primero,
  tope en el total, no repite saldo entre liquidaciones, entidad sin saldo
  → nada.

Sin índices ni reglas: NO hay deploy.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto BUSCAR no aparece, o aparece más de una vez: pará y reportá,
  sin improvisar.
- Archivos con finales de línea LF.
- Build: `npm run build:demo`.
- No toques CLAUDE.md ni CHANGELOG.
- `ParametrosCircuito`, `LiquidacionPlaneada` y `ResumenTipoCircuito`
  suman campos OBLIGATORIOS. Con el PASO 0 revisá que solo los usen el
  servicio y el componente del generador.
- La instrucción termina con la línea `FIN DE LA INSTRUCCIÓN G3`. Si no la
  ves, llegó cortada: leela completa (por partes si hace falta) antes de
  empezar.

## PASO 0 — Verificación (sin cambios)

Corré y reportá la salida:

```bash
grep -rln "ParametrosCircuito\|LiquidacionPlaneada\|ResumenTipoCircuito\|PARAMETROS_CIRCUITO_POR_DEFECTO" src/
grep -n "export function armarCompensables\|export function netoDe\|export const MAX_COMPENSACIONES" src/app/shared/utils/compensacion.util.ts
grep -n "observarMovimientosConSaldo()" src/app/servicios/finanzas-nueva/finanzas-consulta.service.ts
grep -n "compensaciones?: CompensacionSolicitada\[\]" src/app/servicios/informes-liq/informe-liq.service.ts
grep -rn "GeneradorCircuitoService" src/app/servicios/finanzas-nueva src/app/servicios/informes-liq
```

Esperado:

- Grep 1: solo `generador-circuito.service.ts` y
  `generador-circuito.component.ts`.
- Grep 2: 3 líneas.
- Grep 3: 2 líneas (definición y uso en `observarCuentas`).
- Grep 4: 2 líneas (`DatosLiquidacion` y `CambiosDatosLiq`).
- Grep 5: nada. Si aparece, hay riesgo de dependencia circular: pará.

Si algo no coincide, pará y reportá.

## PASO 1 — `src/app/servicios/desarrollo/generador-circuito.service.ts`

#### 1a

BUSCAR:
```ts
import { Injectable, inject } from '@angular/core';
import { environment } from 'src/environments/environment';
```

REEMPLAZAR:
```ts
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
```

#### 1b

BUSCAR:
```ts
import { DatosLiquidacion, InformeLiqService } from 'src/app/servicios/informes-liq/informe-liq.service';
```

REEMPLAZAR:
```ts
import { DatosLiquidacion, InformeLiqService } from 'src/app/servicios/informes-liq/informe-liq.service';
import { FinanzasConsultaService } from 'src/app/servicios/finanzas-nueva/finanzas-consulta.service';
import {
  CompensacionSolicitada, MAX_COMPENSACIONES, armarCompensables, netoDe,
} from 'src/app/shared/utils/compensacion.util';
import { redondear2 } from 'src/app/shared/utils/finanzas.util';
```

#### 1c

BUSCAR:
```ts
  pctFacturar: number;    // de lo emitido: se le vincula una factura de prueba (0..1)
  semilla: number;
}
```

REEMPLAZAR:
```ts
  pctFacturar: number;    // de lo emitido: se le vincula una factura de prueba (0..1)
  // G3 (Frente Finanzas): chofer/proveedor con saldo para compensar
  // (anticipos, préstamos, saldos a favor): se compensa en la liquidación.
  pctCompensar: number;   // (0..1)
  // De las facturadas con compensaciones: la factura es por el NETO (F28).
  pctFacturaNeto: number; // (0..1)
  semilla: number;
}
```

#### 1d

BUSCAR:
```ts
  pctFacturar: 0.85,
};
```

REEMPLAZAR:
```ts
  pctFacturar: 0.85,
  pctCompensar: 0.8,
  pctFacturaNeto: 0.7,
};
```

#### 1e

BUSCAR:
```ts
  fechaFactura: string | null;    // 'YYYY-MM-DD' (≤ hoy) — fecha del comprobante de prueba
  partida: boolean;               // la entidad/mes superó el tope de InformeOp y se partió
}
```

REEMPLAZAR:
```ts
  fechaFactura: string | null;    // 'YYYY-MM-DD' (≤ hoy) — fecha del comprobante de prueba
  partida: boolean;               // la entidad/mes superó el tope de InformeOp y se partió
  compensaciones: CompensacionSolicitada[];   // G3: saldos de la entidad que se descuentan
  totalCompensado: number;
  facturarPorNeto: boolean;       // G3: la factura de prueba va por el neto (F28)
}
```

#### 1f

BUSCAR:
```ts
  aFacturar: number;
  informesOp: number;
  total: number;
}
```

REEMPLAZAR:
```ts
  aFacturar: number;
  informesOp: number;
  total: number;
  compensadas: number;            // G3: liquidaciones con compensaciones
  totalCompensado: number;
  facturasPorNeto: number;
}
```

#### 1g

BUSCAR:
```ts
    const liquidaciones: LiquidacionPlaneada[] = [];
    let gruposSinLiquidar = 0;
```

REEMPLAZAR:
```ts
    // G3: saldos para compensar (movimientos vigentes con sinImputar > 0),
    // con el disponible que va quedando a medida que el plan los usa.
    const conSaldo = await firstValueFrom(this.finanzasConsulta.observarMovimientosConSaldo());
    const disponibleRestante = new Map<string, number>();

    const liquidaciones: LiquidacionPlaneada[] = [];
    let gruposSinLiquidar = 0;
```

#### 1h

BUSCAR:
```ts
          fechaFactura = candidata > hoy ? hoy : candidata;
        }
        liquidaciones.push({
```

REEMPLAZAR:
```ts
          fechaFactura = candidata > hoy ? hoy : candidata;
        }
        const totalEstimado = Math.round(parte.informes.reduce((acc, i) => acc + (i.valores?.total ?? 0), 0) * 100) / 100;
        const compensaciones = lista[0].tipo === 'cliente'
          ? []
          : this.elegirCompensaciones(conSaldo, disponibleRestante, lista[0].tipo, lista[0].entidad.id, totalEstimado, azar, p);
        const totalCompensado = redondear2(compensaciones.reduce((acc, c) => acc + c.importe, 0));
        const facturarPorNeto = facturar && compensaciones.length > 0 && totalEstimado - totalCompensado > 0.005 &&
          azar.chance(p.pctFacturaNeto);
        liquidaciones.push({
```

#### 1i

BUSCAR:
```ts
          totalEstimado: Math.round(parte.informes.reduce((acc, i) => acc + (i.valores?.total ?? 0), 0) * 100) / 100,
          modo,
          facturar,
          fechaFactura,
          partida: partes.length > 1,
        });
```

REEMPLAZAR:
```ts
          totalEstimado,
          modo,
          facturar,
          fechaFactura,
          partida: partes.length > 1,
          compensaciones,
          totalCompensado,
          facturarPorNeto,
        });
```

#### 1j

BUSCAR:
```ts
          gruposSinLiquidar: plan.resumen.gruposSinLiquidar,
        },
```

REEMPLAZAR:
```ts
          gruposSinLiquidar: plan.resumen.gruposSinLiquidar,
          compensadas: plan.resumen.porTipo.reduce((acc, t) => acc + t.compensadas, 0),
        },
```

#### 1k

BUSCAR:
```ts
          columnas: columnasPorTipo(l.tipo).filter(c => c.seleccionada).map(c => c.nombre),
          observaciones: this.OBSERVACION,
        };
```

REEMPLAZAR:
```ts
          columnas: columnasPorTipo(l.tipo).filter(c => c.seleccionada).map(c => c.nombre),
          observaciones: this.OBSERVACION,
          compensaciones: l.compensaciones,
        };
```

#### 1l

BUSCAR:
```ts
          const r = await this.facturar(res.objeto.idInfLiq, l.fechaFactura);
```

REEMPLAZAR:
```ts
          const r = await this.facturar(res.objeto.idInfLiq, l.fechaFactura, l.facturarPorNeto);
```

#### 1m

BUSCAR:
```ts
  private async facturar(idInfLiq: string, fecha: string): Promise<string | null> {
    const liq = await this.informeLiqServ.obtenerPorId(idInfLiq);
    if (!liq) return `No se encontró el informe ${idInfLiq} recién emitido.`;
    const datosQr = this.datosQr(liq, fecha);
```

REEMPLAZAR:
```ts
  private async facturar(idInfLiq: string, fecha: string, porNeto: boolean): Promise<string | null> {
    const liq = await this.informeLiqServ.obtenerPorId(idInfLiq);
    if (!liq) return `No se encontró el informe ${idInfLiq} recién emitido.`;
    const datosQr = this.datosQr(liq, fecha, porNeto);
```

#### 1n

BUSCAR:
```ts
  private datosQr(liq: InformeLiqNuevo, fecha: string): DatosQrAfip {
```

REEMPLAZAR:
```ts
  private datosQr(liq: InformeLiqNuevo, fecha: string, porNeto: boolean = false): DatosQrAfip {
```

#### 1o

BUSCAR:
```ts
      importe: liq.valores.total,
      moneda: 'PES',
```

REEMPLAZAR:
```ts
      importe: porNeto ? netoDe(liq.valores) : liq.valores.total,
      moneda: 'PES',
```

#### 1p

BUSCAR:
```ts
  /** Parte un grupo entidad × mes que supera el tope: por quincena y, si una
```

REEMPLAZAR:
```ts
  /** G3: compensaciones para una liquidación de chofer/proveedor. Con
   *  probabilidad pctCompensar, toma los saldos de la entidad (más antiguos
   *  primero) hasta cubrir como mucho el total (neto ≥ 0) y descuenta lo
   *  usado de `disponibleRestante` (el plan no usa dos veces el mismo saldo).
   *  Sin saldo → [] sin consumir azar (el plan de quien no tiene anticipos no
   *  cambia). */
  private elegirCompensaciones(
    conSaldo: Parameters<typeof armarCompensables>[0],
    disponibleRestante: Map<string, number>,
    tipo: TipoLiqCircuito,
    idEntidad: string,
    total: number,
    azar: Azar,
    p: ParametrosCircuito,
  ): CompensacionSolicitada[] {
    const candidatos = armarCompensables(conSaldo, { tipo, id: idEntidad }, null, [])
      .map(c => ({ c, disponible: disponibleRestante.get(c.idMovimiento) ?? c.disponible }))
      .filter(x => x.disponible > 0.005);
    if (candidatos.length === 0 || !(total > 0) || !azar.chance(p.pctCompensar)) return [];
    const elegidas: CompensacionSolicitada[] = [];
    let lugar = total;
    for (const { c, disponible } of candidatos) {
      if (lugar <= 0.005 || elegidas.length >= MAX_COMPENSACIONES) break;
      const importe = redondear2(Math.min(disponible, lugar));
      elegidas.push({ idMovimiento: c.idMovimiento, importe });
      disponibleRestante.set(c.idMovimiento, redondear2(disponible - importe));
      lugar = redondear2(lugar - importe);
    }
    return elegidas;
  }

  /** Parte un grupo entidad × mes que supera el tope: por quincena y, si una
```

#### 1q

BUSCAR:
```ts
        informesOp: ls.reduce((acc, l) => acc + l.idsInformesOp.length, 0),
        total: Math.round(ls.reduce((acc, l) => acc + l.totalEstimado, 0) * 100) / 100,
      };
```

REEMPLAZAR:
```ts
        informesOp: ls.reduce((acc, l) => acc + l.idsInformesOp.length, 0),
        total: Math.round(ls.reduce((acc, l) => acc + l.totalEstimado, 0) * 100) / 100,
        compensadas: ls.filter(l => l.compensaciones.length > 0).length,
        totalCompensado: redondear2(ls.reduce((acc, l) => acc + l.totalCompensado, 0)),
        facturasPorNeto: ls.filter(l => l.facturarPorNeto).length,
      };
```

#### 1r

BUSCAR:
```ts
    const pcts = [p.pctLiquidar, p.pctBorrador, p.pctFacturar];
```

REEMPLAZAR:
```ts
    const pcts = [p.pctLiquidar, p.pctBorrador, p.pctFacturar, p.pctCompensar, p.pctFacturaNeto];
```

#### 1s

BUSCAR:
```ts
  private factory = inject(InformeLiqFactoryService);
```

REEMPLAZAR:
```ts
  private factory = inject(InformeLiqFactoryService);
  private finanzasConsulta = inject(FinanzasConsultaService);
```

#### 1t

BUSCAR:
```ts
 *  Registra el lote en `generacionesPrueba` (tipo 'circuito').
```

REEMPLAZAR:
```ts
 *  G3 (Frente Finanzas): a las liquidaciones de choferes/proveedores con
 *  saldo para compensar (anticipos, préstamos, saldos a favor — por ejemplo
 *  los del Generador de cobros) les aplica compensaciones (pctCompensar) y
 *  una parte de esas facturas va por el NETO (pctFacturaNeto, F28).
 *  Registra el lote en `generacionesPrueba` (tipo 'circuito').
```

## PASO 2 — `src/app/componentes/generador-circuito/generador-circuito.component.ts`

#### 2a

BUSCAR:
```ts
  get totalAFacturar(): number {
    return this.plan?.resumen.porTipo.reduce((acc, t) => acc + t.aFacturar, 0) ?? 0;
  }
```

REEMPLAZAR:
```ts
  get totalAFacturar(): number {
    return this.plan?.resumen.porTipo.reduce((acc, t) => acc + t.aFacturar, 0) ?? 0;
  }

  get totalCompensadas(): number {
    return this.plan?.resumen.porTipo.reduce((acc, t) => acc + t.compensadas, 0) ?? 0;
  }

  get totalFacturasPorNeto(): number {
    return this.plan?.resumen.porTipo.reduce((acc, t) => acc + t.facturasPorNeto, 0) ?? 0;
  }
```

#### 2b

BUSCAR:
```ts
        `${this.totalBorradores} en borrador, con las funciones reales de Liquidación y Facturación. ` +
```

REEMPLAZAR:
```ts
        `${this.totalBorradores} en borrador, con las funciones reales de Liquidación y Facturación. ` +
        (this.totalCompensadas > 0
          ? `${this.totalCompensadas} con compensaciones (${this.totalFacturasPorNeto} facturadas por el neto). `
          : '') +
```

## PASO 3 — `src/app/componentes/generador-circuito/generador-circuito.component.html`

#### 3a

BUSCAR:
```html
        <input type="number" class="form-control" min="0" max="1" step="0.05" [(ngModel)]="parametros.pctFacturar" [disabled]="simulando || ejecutando" />
      </div>
    </div>
```

REEMPLAZAR:
```html
        <input type="number" class="form-control" min="0" max="1" step="0.05" [(ngModel)]="parametros.pctFacturar" [disabled]="simulando || ejecutando" />
      </div>
      <div class="col-md-3"></div>

      <div class="col-md-3">
        <label class="form-label mb-0">Compensar saldos de choferes/proveedores (0–1)</label>
        <input type="number" class="form-control" min="0" max="1" step="0.05" [(ngModel)]="parametros.pctCompensar" [disabled]="simulando || ejecutando" />
      </div>
      <div class="col-md-3">
        <label class="form-label mb-0">De esas facturadas: factura por el neto (0–1)</label>
        <input type="number" class="form-control" min="0" max="1" step="0.05" [(ngModel)]="parametros.pctFacturaNeto" [disabled]="simulando || ejecutando" />
      </div>
    </div>
```

#### 3b

BUSCAR:
```html
            @if (plan.resumen.partidas > 0) {
              {{ plan.resumen.partidas }} salen de partir entidades que superan el tope de informes por liquidación.
            }
          </li>
```

REEMPLAZAR:
```html
            @if (plan.resumen.partidas > 0) {
              {{ plan.resumen.partidas }} salen de partir entidades que superan el tope de informes por liquidación.
            }
          </li>
          <li>
            {{ totalCompensadas }} liquidaciones con compensaciones (anticipos / saldos a favor);
            {{ totalFacturasPorNeto }} se facturan por el neto.
          </li>
```

#### 3c

BUSCAR:
```html
              <th class="text-end">Informes</th>
              <th class="text-end">Total estimado</th>
```

REEMPLAZAR:
```html
              <th class="text-end">Informes</th>
              <th class="text-end">Total estimado</th>
              <th class="text-end">Compensadas</th>
              <th class="text-end">Compensado</th>
```

#### 3d

BUSCAR:
```html
                <td class="text-end">{{ t.total | formatearValor: '$' }}</td>
```

REEMPLAZAR:
```html
                <td class="text-end">{{ t.total | formatearValor: '$' }}</td>
                <td class="text-end">{{ t.compensadas }}</td>
                <td class="text-end">{{ t.totalCompensado | formatearValor: '$' }}</td>
```

## PASO 4 — Verificación

```bash
npm run build:demo
grep -c "elegirCompensaciones" src/app/servicios/desarrollo/generador-circuito.service.ts   # 2
grep -c "facturarPorNeto" src/app/servicios/desarrollo/generador-circuito.service.ts       # 5
grep -c "pctCompensar\|pctFacturaNeto" src/app/componentes/generador-circuito/generador-circuito.component.html  # 2
git status --short
```

Esperado:

- El build termina sin errores. Los warnings de presupuesto previos no
  cuentan.
- Los conteos coinciden.
- `git status` muestra 3 archivos modificados y lo tuyo sin trackear, si lo
  hay.

Reportá la salida.

## Pruebas manuales (demo, rol dev)

1. **Datos.**
   - Si octubre todavía no tiene operaciones: Generador de operaciones,
     octubre.
   - Si no hay anticipos pendientes en Finanzas → Cuentas (A pagar,
     columna Anticipos): Generador de cobros, o un anticipo a mano.
2. **Simular el circuito de octubre.**
   - Aparecen los 2 parámetros nuevos (0,8 y 0,7).
   - El plan dice "N liquidaciones con compensaciones; M se facturan por el
     neto".
   - La tabla muestra Compensadas y Compensado por tipo. Clientes: 0.
   - Con la misma semilla da lo mismo.
3. **Generar.** Termina sin errores.
   - Si un borrador eligió un anticipo que después usó una emisión, ese
     borrador sigue igual: es una propuesta, se resuelve al emitirlo.
4. **Revisar una liquidación compensada** (Facturación → Emitidos o
   Facturados):
   - el detalle muestra la sección Compensaciones y el Neto;
   - el PDF muestra las líneas de compensación y "Neto a pagar".
5. **Factura por el neto.** En un facturado con compensaciones, el detalle
   muestra "Importe $ … (neto)". En el log FACTURAR (dev no escribe log:
   verificalo en Firestore) `factura.validacion.base` es `'neto'`.
6. **Finanzas:**
   - en Movimientos, los anticipos usados tienen "Sin imputar" menor (o 0)
     y su detalle muestra la imputación "Compensación en liquidación";
   - en Cuentas (A pagar), los anticipos de esas entidades bajaron y el
     facturado abierto es el neto.
7. **Lote.** En Firestore, `generacionesPrueba/<idLote>` tiene en
   `parametros` `pctCompensar` y `pctFacturaNeto`, y en `resumenPlan` el
   campo `compensadas`.

## Commit (lo hace Nico)

```
feat(demo): generador de circuito con compensaciones y facturas por el neto (G3)

- ParametrosCircuito: pctCompensar (0,8) y pctFacturaNeto (0,7).
- Las liquidaciones de choferes/proveedores con saldo para compensar
  (anticipos / saldos a favor) se emiten con compensaciones (más antiguos
  primero, neto ≥ 0, sin repetir saldo en el plan) con la función real.
- Una parte de esas facturas de prueba va por el neto (F28).
- Plan, confirmación y lote muestran compensadas y total compensado.
```

FIN DE LA INSTRUCCIÓN G3
````
