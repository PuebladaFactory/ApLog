````
# Instrucción F8a.1 — PDF de Cuentas a cobrar en hoja apaisada

## Contexto

Pedido de Nico después de F8c.1. En el PDF de **Cuentas → A cobrar**, los
montos no entran en su celda: el "$" queda en un renglón y el importe en el
de abajo. En **A pagar** no pasa.

**Causa:** el PDF elige la orientación por la suma de los anchos de las
columnas. Si pasa de `ANCHO_HOJA_HORIZONTAL` (140), sale apaisado.
- A cobrar suma justo 140, así que sale vertical y no le alcanza el ancho.
- A pagar tiene la columna Tipo, suma 150 y sale apaisado.

Los demás libros (cuenta, Antigüedad, Movimientos) ya pasan de 140.

**Arreglo** (lo que propuso Nico: cambiar la orientación): los montos de
`armarLibroCuentas` pasan a ancho 17 (el valor más largo, "$
326.240.416,00", tiene 16 caracteres) y "Comprob." a 9.
- A cobrar suma 149 y sale apaisado, como A pagar.
- En el Excel, esas columnas quedan apenas más anchas.
- No se toca el renderer: el resto de los PDF sigue igual.

Ya verificado: tsc. Renderizado el PDF de A cobrar con los montos del
archivo de Nico ($ 326.240.416,00 en el total): sale apaisado y cada
importe ocupa una sola línea.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si el texto BUSCAR no aparece, o aparece más de una vez: pará y reportá.
- LF. Build: `npm run build:demo`. No toques CLAUDE.md ni CHANGELOG.
- **Editá el archivo en el lugar** (leer, reemplazar, escribir). No lo
  abras para escribir antes de leerlo: en F8c.1 eso dejó archivos vacíos.
- La instrucción termina con la línea `FIN DE LA INSTRUCCIÓN F8a.1`.

## PASO 0 — Verificación (sin cambios)

```bash
grep -c "col('Facturado abierto', 'moneda', 16)," src/app/shared/utils/exportacion-finanzas.util.ts   # 1
```

## PASO 1 — `src/app/shared/utils/exportacion-finanzas.util.ts`

BUSCAR:
```ts
  const columnas: ColumnaDoc[] = [
    col(cobrar ? 'Cliente' : 'Entidad', 'texto', 32),
    ...(cobrar ? [] : [col('Tipo', 'texto', 10)]),
    col('CUIT', 'texto', 13),
    col('Facturado abierto', 'moneda', 16),
    col('Comprob.', 'numero', 8),
    col(`+${DIAS_ALERTA_ANTIGUEDAD} días`, 'moneda', 15),
    col('Antigüedad (días)', 'numero', 10),
    col('Sin facturar', 'moneda', 15),
    col(cobrar ? 'Saldo a favor' : 'Anticipos', 'moneda', 15),
    col('Neto', 'moneda', 16),
  ];
```

REEMPLAZAR:
```ts
  // Anchos (≈ caracteres): también deciden la orientación del PDF (más de
  // ANCHO_HOJA_HORIZONTAL = 140 → apaisada). Los montos van en 17 (el valor
  // más largo, "$ 326.240.416,00", tiene 16): así A cobrar suma 149 y sale
  // apaisada como A pagar, sin partir "$" e importe en dos líneas (F8a.1).
  const columnas: ColumnaDoc[] = [
    col(cobrar ? 'Cliente' : 'Entidad', 'texto', 32),
    ...(cobrar ? [] : [col('Tipo', 'texto', 10)]),
    col('CUIT', 'texto', 13),
    col('Facturado abierto', 'moneda', 17),
    col('Comprob.', 'numero', 9),
    col(`+${DIAS_ALERTA_ANTIGUEDAD} días`, 'moneda', 17),
    col('Antigüedad (días)', 'numero', 10),
    col('Sin facturar', 'moneda', 17),
    col(cobrar ? 'Saldo a favor' : 'Anticipos', 'moneda', 17),
    col('Neto', 'moneda', 17),
  ];
```

## PASO 2 — Verificación

```bash
npm run build:demo
grep -c "'moneda', 17)" src/app/shared/utils/exportacion-finanzas.util.ts   # 5
git status --short   # 1 modificado
```

## Pruebas manuales (demo)

1. **Cuentas → A cobrar → PDF:** hoja apaisada; cada importe con su "$" en
   una sola línea, también en la fila Total.
2. **A pagar → PDF:** igual que antes.
3. **Excel de A cobrar:** las columnas de montos quedan apenas más anchas y
   el resto no cambia.

## Commit (lo hace Nico)

```
fix(finanzas): PDF de Cuentas a cobrar apaisado para que entren los montos (F8a.1)
```

FIN DE LA INSTRUCCIÓN F8a.1
````
