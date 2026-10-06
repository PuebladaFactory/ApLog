````
# Instrucción FC2 — Finanzas: compensaciones en PDF/Excel + factura por total o neto

## Contexto

Frente Finanzas. Diseño: `claude/diseno-finanzas.md` §13.10 y §15 (F24,
F28). Con FC1a y FC1b las liquidaciones ya tienen compensaciones y neto,
pero el documento (proforma, emitido, vista previa) todavía no los muestra
y la factura se valida solo contra el total.

1. **Documento de la liquidación** (`documento-liq.util`, puro). Si hay
   compensaciones, después del Total el pie suma:
   - una línea por compensación, en negativo: "Anticipo OPG-000123 del
     02/10/2026", "Préstamo …", "Saldo a favor …";
   - "**Neto a pagar**" (chofer o proveedor) o "**Neto a cobrar**"
     (cliente).

   Sin compensaciones, el documento queda IGUAL que hoy. Vale para Excel,
   PDF, vista previa y proforma: es lo que se le manda al chofer (F24).
2. **`DocumentoTabular`:** `LineaPieDoc.tipo` suma `'compensacion'` y
   `'neto'`.
   - Excel: la compensación es un valor; el Neto es la fórmula
     `=Total + compensaciones` (con resultado precalculado), en negrita y
     con relleno como el Total.
   - PDF: el Neto se dibuja como el Total.
   - Los Reportes no usan `LineaPieDoc`: no cambian.
3. **Factura por total o neto (F28).** `validarFacturaContraInforme`
   acepta que el importe coincida con el total o con el neto, y registra
   contra cuál en `factura.validacion.base`: `'total'`, `'neto'` o `null`
   si no coincide. El campo es opcional: las facturas vinculadas antes no
   lo tienen.
   - El modal de vincular muestra el neto debajo del total y "Sí (neto)".
   - El log FACTURAR lo dice.
   - El detalle de un facturado muestra "(neto)" junto al importe.

Ya verificado:

- tsc estricto, con stubs;
- prueba rápida de `validarFacturaContraInforme`: total → `'total'`,
  neto → `'neto'`, otro importe → `null`, sin compensaciones → `'total'`.

Sin índices ni reglas: NO hay deploy.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto BUSCAR no aparece, o aparece más de una vez: pará y reportá,
  sin improvisar.
- Archivos con finales de línea LF.
- Build: `npm run build:demo`.
- No toques CLAUDE.md ni CHANGELOG.
- Tocás tipos: `LineaPieDoc.tipo` (amplía la unión), `ValidacionFactura`
  y `FacturaElectronicaLiq.validacion` (campo opcional). Revisá con el
  PASO 0 que ningún otro uso se rompa, incluidos los `.spec.ts` y los
  `.html`.
- La instrucción termina con la línea `FIN DE LA INSTRUCCIÓN FC2`. Si no la
  ves, llegó cortada: leela completa (por partes si hace falta) antes de
  empezar.

## PASO 0 — Verificación (sin cambios)

Corré y reportá la salida:

```bash
grep -rn "LineaPieDoc\|tipo === 'total'\|tipo: 'total'" src/app --include=*.ts
grep -rn "ValidacionFactura\|validacion\.\(importeOk\|cuitOk\|base\)" src/app --include=*.ts --include=*.html
grep -rn "netoDe\|'compensacion'" src/app/shared/utils/documento-liq.util.ts src/app/shared/utils/factura-electronica.util.ts src/app/servicios/exportacion
grep -n "export function netoDe" src/app/shared/utils/compensacion.util.ts
grep -rn "factura-electronica.util" src/app/shared/utils/compensacion.util.ts src/app/shared/utils/movimiento-fin.util.ts src/app/shared/utils/finanzas.util.ts
```

Esperado:

- Grep 1: `LineaPieDoc` en `interfaces/documento-tabular.ts` y
  `documento-liq.util.ts`; `tipo === 'total'` en `excel-tabular.service.ts`
  y `pdf-tabular.service.ts`; `tipo: 'total'` en `documento-liq.util.ts`.
  Si aparece otro archivo (por ejemplo, Reportes armando un pie), mostrá
  cómo lo usa antes de seguir.
- Grep 2: `factura-electronica.util.ts`, `informe-liq.service.ts`,
  `vincular-factura-liq.component.ts/.html`. Ningún `.base` todavía.
- Grep 3: nada.
- `netoDe`: 1 línea.
- Grep 5: nada. Si aparece, hay riesgo de import circular: pará y
  reportá.

Si algo no coincide, pará y reportá.

## PASO 1 — `src/app/interfaces/documento-tabular.ts`

#### 1a

BUSCAR:
```ts
export interface LineaPieDoc {
  concepto: string;
  valor: number;
  tipo: 'subtotal' | 'ajuste' | 'total';
}
```

REEMPLAZAR:
```ts
/** Pie de la tabla. 'compensacion' y 'neto' (Frente Finanzas): anticipos /
 *  saldos a favor descontados DESPUÉS del total (valor negativo) y el neto
 *  resultante (se dibuja como un total; en Excel, Neto = Total +
 *  compensaciones). */
export interface LineaPieDoc {
  concepto: string;
  valor: number;
  tipo: 'subtotal' | 'ajuste' | 'total' | 'compensacion' | 'neto';
}
```

## PASO 2 — `src/app/servicios/exportacion/excel-tabular.service.ts`

#### 2a

BUSCAR:
```ts
    let celdaSubtotal: string | null = null;
    const celdasAjuste: string[] = [];

    for (const linea of doc.pie) {
      if (colValor > 2) ws.mergeCells(fila, 1, fila, colValor - 1);
      const esTotal = linea.tipo === 'total';
      const destacada = esTotal || linea.tipo === 'subtotal';
```

REEMPLAZAR:
```ts
    let celdaSubtotal: string | null = null;
    const celdasAjuste: string[] = [];
    // Compensaciones (Frente Finanzas): Neto = Total + compensaciones (negativas).
    let celdaTotal: string | null = null;
    const celdasCompensacion: string[] = [];

    for (const linea of doc.pie) {
      if (colValor > 2) ws.mergeCells(fila, 1, fila, colValor - 1);
      const esTotal = linea.tipo === 'total' || linea.tipo === 'neto';
      const destacada = esTotal || linea.tipo === 'subtotal';
```

#### 2b

BUSCAR:
```ts
      if (conFormulas && linea.tipo === 'subtotal') {
        valor.value = { formula: `SUM(${rango})`, result: linea.valor };
        celdaSubtotal = ref;
      } else if (conFormulas && esTotal) {
        const formula = celdaSubtotal ? [celdaSubtotal, ...celdasAjuste].join('+') : `SUM(${rango})`;
        valor.value = { formula, result: linea.valor };
      } else {
        valor.value = linea.valor;
        if (linea.tipo === 'ajuste') celdasAjuste.push(ref);
      }
```

REEMPLAZAR:
```ts
      if (conFormulas && linea.tipo === 'subtotal') {
        valor.value = { formula: `SUM(${rango})`, result: linea.valor };
        celdaSubtotal = ref;
      } else if (linea.tipo === 'neto' && celdaTotal) {
        valor.value = { formula: [celdaTotal, ...celdasCompensacion].join('+'), result: linea.valor };
      } else if (conFormulas && linea.tipo === 'total') {
        const formula = celdaSubtotal ? [celdaSubtotal, ...celdasAjuste].join('+') : `SUM(${rango})`;
        valor.value = { formula, result: linea.valor };
        celdaTotal = ref;
      } else {
        valor.value = linea.valor;
        if (linea.tipo === 'ajuste') celdasAjuste.push(ref);
        if (linea.tipo === 'compensacion') celdasCompensacion.push(ref);
        if (linea.tipo === 'total') celdaTotal = ref;
      }
```

## PASO 3 — `src/app/servicios/exportacion/pdf-tabular.service.ts`

#### 3a

BUSCAR:
```ts
        if (linea?.tipo === 'total') {
```

REEMPLAZAR:
```ts
        if (linea?.tipo === 'total' || linea?.tipo === 'neto') {
```

## PASO 4 — `src/app/shared/utils/documento-liq.util.ts`

#### 4a

BUSCAR:
```ts
import { descripcionTipoComprobante, fechaComprobanteLegible, numeroComprobante } from './factura-electronica.util';
```

REEMPLAZAR:
```ts
import { descripcionTipoComprobante, fechaComprobanteLegible, numeroComprobante } from './factura-electronica.util';
import { ETIQUETA_CONCEPTO_COMPENSACION, compensacionesDe, netoDe } from './compensacion.util';
```

#### 4b

BUSCAR:
```ts
/** Mismo pie que el camino viejo: Subtotal y ajustes solo si hay ajustes;
 *  siempre Total. Sale de liq.valores (no se recalcula acá). */
```

REEMPLAZAR:
```ts
/** Mismo pie que el camino viejo: Subtotal y ajustes solo si hay ajustes;
 *  siempre Total. Sale de liq.valores (no se recalcula acá).
 *  Frente Finanzas (FC2): si hay compensaciones, después del Total va una
 *  línea por cada una (negativa) y el Neto a pagar / a cobrar (netoDe). */
```

#### 4c

BUSCAR:
```ts
  lineas.push({ concepto: 'Total', valor: v.total, tipo: 'total' });
  return lineas;
}
```

REEMPLAZAR:
```ts
  lineas.push({ concepto: 'Total', valor: v.total, tipo: 'total' });

  const compensaciones = compensacionesDe(liq);
  if (compensaciones.length > 0) {
    for (const c of compensaciones) {
      lineas.push({
        concepto: `${ETIQUETA_CONCEPTO_COMPENSACION[c.concepto] ?? 'Compensación'} ${c.numero} del ${fechaComprobanteLegible(c.fecha)}`,
        valor: -c.importe,
        tipo: 'compensacion',
      });
    }
    lineas.push({
      concepto: liq.tipo === 'cliente' ? 'Neto a cobrar' : 'Neto a pagar',
      valor: netoDe(v),
      tipo: 'neto',
    });
  }
  return lineas;
}
```

## PASO 5 — `src/app/interfaces/informe-liq-nuevo.ts`

#### 5a

BUSCAR:
```ts
  validacion: { importeOk: boolean; cuitOk: boolean };
```

REEMPLAZAR:
```ts
  // base (FC2, F28): contra qué coincidió el importe — el total del servicio
  // o el neto (total − compensaciones); null si no coincidió. Opcional: las
  // facturas vinculadas antes de FC2 no lo tienen.
  validacion: { importeOk: boolean; cuitOk: boolean; base?: 'total' | 'neto' | null };
```

## PASO 6 — `src/app/shared/utils/factura-electronica.util.ts`

#### 6a

BUSCAR:
```ts
import { TIPOS_COMPROBANTE } from 'src/app/constantes/tipos-comprobante';
```

REEMPLAZAR:
```ts
import { TIPOS_COMPROBANTE } from 'src/app/constantes/tipos-comprobante';
import { netoDe } from './compensacion.util';
```

#### 6b

BUSCAR:
```ts
export interface ValidacionFactura {
  importeOk: boolean;
  cuitOk: boolean;
```

REEMPLAZAR:
```ts
export interface ValidacionFactura {
  importeOk: boolean;
  cuitOk: boolean;
  /** Contra qué coincidió el importe (F28): el total del servicio o el neto
   *  (total − compensaciones); null si no coincidió. Opcional: facturas
   *  vinculadas antes de FC2. */
  base?: 'total' | 'neto' | null;
```

#### 6c

BUSCAR:
```ts
/** Valida la factura contra el informe (D8: se permite vincular con
 *  discrepancias, con confirmación; el resultado queda registrado).
 *  - Importe: igual a valores.total (tolerancia 1 centavo).
```

REEMPLAZAR:
```ts
/** Valida la factura contra el informe (D8: se permite vincular con
 *  discrepancias, con confirmación; el resultado queda registrado).
 *  - Importe: igual a valores.total o, si hay compensaciones, al neto
 *    (F28; tolerancia 1 centavo). `base` registra contra cuál coincidió.
```

#### 6d

BUSCAR:
```ts
  const importeOk = Math.abs(qr.importe - liq.valores.total) < 0.01;
```

REEMPLAZAR:
```ts
  const total = liq.valores.total;
  const neto = netoDe(liq.valores);
  const coincide = (x: number) => Math.abs(qr.importe - x) < 0.01;
  const base: ValidacionFactura['base'] = coincide(total) ? 'total' : coincide(neto) ? 'neto' : null;
  const importeOk = base !== null;
```

#### 6e

BUSCAR:
```ts
  return { importeOk, cuitOk: cuitEntidad !== '' && cuitEntidad === cuitFactura };
```

REEMPLAZAR:
```ts
  return { importeOk, cuitOk: cuitEntidad !== '' && cuitEntidad === cuitFactura, base };
```

#### 6f

BUSCAR:
```ts
    validacion: { importeOk: validacion.importeOk, cuitOk: validacion.cuitOk },
```

REEMPLAZAR:
```ts
    validacion: { importeOk: validacion.importeOk, cuitOk: validacion.cuitOk, base: validacion.base ?? null },
```

## PASO 7 — `src/app/servicios/informes-liq/informe-liq.service.ts` (log FACTURAR)

#### 7a

BUSCAR:
```ts
          `Factura ${comprobante} vinculada a la liquidación ${liq.numeroInterno} — ${liq.tipo} ${nombreEntidadRef(liq.entidad)}` +
          (discrepancias.length > 0 ? ` — vinculada con discrepancias (${discrepancias.join(', ')})` : ''),
```

REEMPLAZAR:
```ts
          `Factura ${comprobante} vinculada a la liquidación ${liq.numeroInterno} — ${liq.tipo} ${nombreEntidadRef(liq.entidad)}` +
          (validacion.base === 'neto' ? ' — importe = neto (con compensaciones)' : '') +
          (discrepancias.length > 0 ? ` — vinculada con discrepancias (${discrepancias.join(', ')})` : ''),
```

## PASO 8 — Vincular factura

### `src/app/raiz/nueva-facturacion/vincular-factura-liq/vincular-factura-liq.component.ts`

#### 8a

BUSCAR:
```ts
import { nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';
```

REEMPLAZAR:
```ts
import { nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';
import { netoDe } from 'src/app/shared/utils/compensacion.util';
```

#### 8b

BUSCAR:
```ts
  get discrepancias(): string[] {
```

REEMPLAZAR:
```ts
  /** FC2: la liquidación tiene compensaciones → la factura puede ser por el
   *  total del servicio o por el neto (F28). */
  get neto(): number {
    return netoDe(this.liq.valores);
  }

  get tieneCompensaciones(): boolean {
    return Math.abs(this.neto - this.liq.valores.total) >= 0.01;
  }

  get discrepancias(): string[] {
```

#### 8c

BUSCAR:
```ts
          `liquidación ${this.formato.transform(this.liq.valores.total, '$')}`,
```

REEMPLAZAR:
```ts
          `liquidación ${this.formato.transform(this.liq.valores.total, '$')}` +
          (this.tieneCompensaciones ? ` (neto ${this.formato.transform(this.neto, '$')})` : ''),
```

### `src/app/raiz/nueva-facturacion/vincular-factura-liq/vincular-factura-liq.component.html`

#### 8Ha

BUSCAR:
```html
          <td class="text-end">{{ liq.valores.total | formatearValor: "$" }}</td>
          <td class="text-center">
            <span class="badge" [ngClass]="validacion.importeOk ? 'bg-success' : 'bg-danger'">
              {{ validacion.importeOk ? 'Sí' : 'No' }}
            </span>
          </td>
```

REEMPLAZAR:
```html
          <td class="text-end">
            {{ liq.valores.total | formatearValor: "$" }}
            @if (tieneCompensaciones) {
              <div class="small text-muted">neto {{ neto | formatearValor: "$" }}</div>
            }
          </td>
          <td class="text-center">
            <span class="badge" [ngClass]="validacion.importeOk ? 'bg-success' : 'bg-danger'">
              {{ validacion.importeOk ? (validacion.base === 'neto' ? 'Sí (neto)' : 'Sí') : 'No' }}
            </span>
          </td>
```

## PASO 9 — Detalle (facturado)

### `src/app/shared/modales/informe-liq-nuevo-detalle/informe-liq-nuevo-detalle.component.html`

#### 9a

BUSCAR:
```html
                        Importe {{ liq.factura.importe | formatearValor: "$" }} —
```

REEMPLAZAR:
```html
                        Importe {{ liq.factura.importe | formatearValor: "$" }}{{
                            liq.factura.validacion.base === "neto" ? " (neto)" : ""
                        }} —
```

## PASO 10 — Verificación

```bash
npm run build:demo
grep -c "'compensacion'\|'neto'" src/app/interfaces/documento-tabular.ts                     # 2 (comentario + tipo)
grep -c "celdasCompensacion" src/app/servicios/exportacion/excel-tabular.service.ts          # 3
grep -n "linea?.tipo === 'neto'" src/app/servicios/exportacion/pdf-tabular.service.ts        # 1 línea
grep -c "netoDe" src/app/shared/utils/documento-liq.util.ts                                  # 3 (import, comentario, uso)
grep -c "base" src/app/shared/utils/factura-electronica.util.ts                              # ≥ 4
git status --short
```

Esperado:

- El build termina sin errores. Los warnings de presupuesto previos no
  cuentan.
- Los conteos coinciden.
- `git status` muestra 10 archivos modificados (los de los pasos 1 a 9) y
  lo tuyo sin trackear, si lo hay.

Reportá la salida.

## Pruebas manuales (demo)

1. **Proforma con compensaciones.** Abrí un borrador con compensaciones
   (FC1b) → Vista previa: el pie muestra Total, una línea por compensación
   en negativo ("Anticipo OPG-… del DD/MM/AAAA") y "Neto a pagar"
   resaltado como el Total.
2. **Excel de un emitido con compensaciones** (Liquidación o Facturación →
   Excel):
   - mismo pie que el PDF;
   - la celda del Neto es una fórmula (Total + compensaciones);
   - si cambiás a mano el importe de una compensación en el Excel, el Neto
     se recalcula.
3. **PDF de un emitido con compensaciones:** igual que el punto 1, con
   número y sin marca.
4. **Vista previa desde Liquidación nueva** con compensaciones elegidas y
   sin guardar: aparecen en el pie.
5. **Sin compensaciones:** Excel y PDF de una liquidación sin
   compensaciones salen idénticos a antes (Subtotal / ajustes / Total y
   las fórmulas del Excel).
6. **Reportes:** un Excel y un PDF de un reporte mensual siguen saliendo
   igual.
7. **Vincular factura** a un emitido con compensaciones (podés usar un PDF
   de factura de prueba de otro informe):
   - la fila Importe muestra el total y, debajo, "neto $ …";
   - si no coincide, la confirmación dice "liquidación $ X (neto $ Y)".

   Una factura por el importe del neto daría "Sí (neto)". Si no tenés un
   PDF así, ese caso queda cubierto por la prueba rápida del util y por el
   próximo bloque del generador.
8. **Facturado viejo:** el detalle de una liquidación facturada antes de
   este bloque se ve igual, sin "(neto)".

## Commit (lo hace Nico)

```
feat(finanzas): compensaciones en PDF/Excel y factura por total o neto (FC2)

- Documento de liquidación: después del Total, una línea por compensación
  (negativa) y Neto a pagar / a cobrar. Sin compensaciones, igual que antes.
- DocumentoTabular: LineaPieDoc.tipo 'compensacion' | 'neto'; Excel con
  Neto = Total + compensaciones (fórmula); PDF destaca el Neto.
- F28: validarFacturaContraInforme acepta total o neto y registra
  factura.validacion.base; vincular factura muestra el neto y "Sí (neto)";
  log FACTURAR y detalle lo indican.
```

FIN DE LA INSTRUCCIÓN FC2
````
