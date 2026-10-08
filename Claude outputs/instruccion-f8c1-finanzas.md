````
# Instrucción F8c.1 — PDF: los totales alineados a la derecha

## Contexto

Pedido de Nico después de F8c. En los PDF, el importe de la fila de total
("Total", "Total aplicado") sale alineado a la IZQUIERDA de su celda,
aunque el resto de los montos de la columna salen a la derecha.

**Causa:** jspdf-autotable aplica `columnStyles` (donde está el
`halign: 'right'` de cada columna) al cuerpo de la tabla, pero NO al pie
(`foot`). Se confirmó renderizando la misma tabla con y sin el arreglo.

**Arreglo:** cada celda del pie lleva su propia alineación
(`{ content, styles: { halign } }`).

1. **Recibo / Orden de pago** (`recibo-pdf.service.ts`): "Total" de los
   valores y "Total aplicado".
2. **`PdfTabularService.generarLibro`**: la fila Total de cada tabla toma
   la alineación de su columna con la función `alineacion()` que ya existe
   (montos y números a la derecha, fechas al centro, texto a la
   izquierda). Este renderer lo comparten Finanzas (exportaciones F8a),
   Reportes y Vendedores, así que el arreglo también corrige sus PDF.
   `generar` (el documento de la liquidación) no tiene pie de tabla, así
   que no cambia.

Ya verificado: tsc con los tipos reales; el recibo y un libro de prueba
renderizados, con los totales a la derecha.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto BUSCAR no aparece, o aparece más de una vez: pará y reportá.
- LF. Build: `npm run build:demo`. No toques CLAUDE.md ni CHANGELOG.
- La instrucción termina con la línea `FIN DE LA INSTRUCCIÓN F8c.1`.

## PASO 0 — Verificación (sin cambios)

```bash
grep -n "foot:" src/app/servicios/finanzas-nueva/recibo-pdf.service.ts src/app/servicios/exportacion/pdf-tabular.service.ts
grep -n "^function alineacion" src/app/servicios/exportacion/pdf-tabular.service.ts
```

Esperado:

- El grep 1: 2 líneas en `recibo-pdf.service.ts` y 1 en
  `pdf-tabular.service.ts` (la de `generarLibro`).
- El grep 2: 1 línea.

## PASO 1 — `src/app/servicios/finanzas-nueva/recibo-pdf.service.ts`

#### 1a

BUSCAR:
```ts
      foot: [['Total', '', formatearMoneda(doc.total)]],
```

REEMPLAZAR:
```ts
      // jspdf-autotable NO aplica columnStyles al pie: el total se alinea a mano.
      foot: [['Total', '', { content: formatearMoneda(doc.total), styles: { halign: 'right' } }]],
```

#### 1b

BUSCAR:
```ts
        foot: [['Total aplicado', '', '', '', '', formatearMoneda(doc.totalImputado)]],
```

REEMPLAZAR:
```ts
        foot: [['Total aplicado', '', '', '', '', { content: formatearMoneda(doc.totalImputado), styles: { halign: 'right' } }]],
```

## PASO 2 — `src/app/servicios/exportacion/pdf-tabular.service.ts`

#### 2a

BUSCAR:
```ts
          foot: tabla.filaTotal
            ? [tabla.filaTotal.map((v, i) => formatearCelda(v, tabla.columnas[i].tipo))]
            : undefined,
```

REEMPLAZAR:
```ts
          // jspdf-autotable NO aplica columnStyles al pie: cada celda de la
          // fila Total lleva la alineación de su columna (montos a la derecha).
          foot: tabla.filaTotal
            ? [tabla.filaTotal.map((v, i) => ({
                content: formatearCelda(v, tabla.columnas[i].tipo),
                styles: { halign: alineacion(tabla.columnas[i]) },
              }))]
            : undefined,
```

## PASO 3 — Verificación

```bash
npm run build:demo
grep -c "halign: 'right' } }" src/app/servicios/finanzas-nueva/recibo-pdf.service.ts   # 2
grep -n "styles: { halign: alineacion(tabla.columnas\[i\]) }" src/app/servicios/exportacion/pdf-tabular.service.ts   # 1 línea
git status --short   # 2 modificados
```

## Pruebas manuales (demo)

1. Imprimí un recibo: "Total" y "Total aplicado" quedan a la derecha, en
   la misma línea vertical que los importes de arriba.
2. Exportá a PDF la cuenta de una entidad, Antigüedad y Movimientos: las
   filas Total tienen los montos a la derecha.
3. Un PDF de Reportes y uno de comisiones de Vendedores: lo mismo, y el
   resto igual que antes.

## Commit (lo hace Nico)

```
fix(pdf): totales alineados como su columna en el pie de las tablas (F8c.1)

- jspdf-autotable no aplica columnStyles al foot: el recibo / orden de
  pago y PdfTabularService.generarLibro (Finanzas, Reportes, Vendedores)
  alinean cada celda del total como su columna.
```

FIN DE LA INSTRUCCIÓN F8c.1
````
