````
INSTRUCCIÓN TC1b — Tarifas (cierre): límites de tramo del adicional por km
==========================================================================

Si no ves la línea "FIN DE LA INSTRUCCIÓN TC1b" al final, el texto llegó
cortado: leé el archivo completo antes de empezar.

## Contexto y razonamiento

Configuración real (demo y Vantruck): primerSector = 50 km,
sectoresSiguientes = 10 km. Regla de negocio confirmada por nico: el corte
de cada tramo es INCLUSIVO en su límite superior.
  - 0-50  → sin adicional (lo cubre la tarifa base)
  - 51-60 → adicional "1er sector"
  - 61-70 → + 1 intervalo
  - 71-80 → + 2 intervalos, etc.

La fórmula actual (heredada del sistema viejo, `$calcularKm`) trata cada
límite como inicio del tramo siguiente:
  - `if (km < P) return 0` → 50 km ya cobra el 1er sector;
  - `Math.floor((km - P) / S)` → 60 km ya suma un intervalo, 70 dos, etc.
Por eso no alcanza con cambiar un símbolo: con solo `<` → `<=`, 50 queda
bien pero 60, 70, 80… siguen cobrando un intervalo de más.

Fórmula nueva (P = primerSector, S = sectoresSiguientes):
  - km <= P → 0
  - si no: valor 1er sector + (ceil((km - P) / S) - 1) × valor intervalo
`ceil(...) - 1` cuenta los tramos de S km EMPEZADOS después del primero, con
el límite cerrando su tramo. Funciona igual con km decimales (50,5 → 1er
sector).

Comparación (1er sector $1.000, intervalo $300):
  km   antes   ahora
  49       0       0
  50   1.000       0
  51   1.000   1.000
  60   1.300   1.000
  61   1.300   1.300
  70   1.600   1.300
  71   1.600   1.600
Solo cambian los km exactamente en un límite (50, 60, 70, ...).

Alcance: solo el motor nuevo (ValoresTarifaService). Afecta los cálculos
que se hagan de acá en adelante (alta, cierre, edición de InformeOp,
restaurar, generador). Las operaciones ya cerradas conservan sus valores
guardados; si se edita su InformeOp, se recalcula con la regla nueva.
`ValoresOpClienteService.$calcularKm` (fórmula vieja) NO se toca: es código
muerto que se retira en un bloque posterior.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto a BUSCAR no está, o aparece más de una vez: detenete y reportá.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.

## PASO 0 — Verificación (sin modificar nada)

0.1 En src/app/servicios/tarifario/valores-tarifa.service.ts,
    `calcularKmAdicional` está como lo dejó TC1 (con la línea
    `if (kmDistancia.sectoresSiguientes <= 0) return monto;`).
0.2 `grep -rn "calcularKmAdicional" src/app` → solo en
    valores-tarifa.service.ts (definición + 1 llamada en calcularLado).
Si algo no coincide, DETENETE y reportá.

## PASO 1 — src/app/servicios/tarifario/valores-tarifa.service.ts

BUSCAR:
```
  /** Adicional por km: primer sector + un monto por cada sector completo
   *  siguiente. Guard: sectoresSiguientes <= 0 (dato inválido — el form lo
   *  bloquea desde TC1, pero puede haber tarifas ya guardadas así) cobra solo
   *  el primer sector, en vez de dividir por cero (Infinity / NaN). */
  private calcularKmAdicional(km: number, kmDistancia: KmDistancia | null, valores: AdicionalKmValores | undefined): number {
    if (!kmDistancia || !valores || kmDistancia.primerSector <= 0) return 0;
    if (km < kmDistancia.primerSector) return 0;
    let monto = valores.primerSector;
    if (kmDistancia.sectoresSiguientes <= 0) return monto;
    const kmRestantes = km - kmDistancia.primerSector;
    const sectoresAdicionales = Math.floor(kmRestantes / kmDistancia.sectoresSiguientes);
    monto += sectoresAdicionales * valores.sectoresSiguientes;
    return monto;
  }
```
REEMPLAZAR:
```
  /** Adicional por km. Con kmDistancia.primerSector = P y
   *  kmDistancia.sectoresSiguientes = S (ej. P = 50, S = 10):
   *   - hasta P inclusive (0-50): sin adicional, lo cubre la tarifa base;
   *   - primer tramo después de P, (P, P+S] (51-60): valores.primerSector;
   *   - cada tramo de S km empezado después de ese (61-70, 71-80, ...): suma
   *     valores.sectoresSiguientes. Cada límite (60, 70, ...) cierra su tramo.
   *  Guard: S <= 0 (dato inválido — el form lo bloquea desde TC1, pero puede
   *  haber tarifas ya guardadas así) cobra solo el primer tramo, en vez de
   *  dividir por cero (Infinity / NaN). */
  private calcularKmAdicional(km: number, kmDistancia: KmDistancia | null, valores: AdicionalKmValores | undefined): number {
    if (!kmDistancia || !valores || kmDistancia.primerSector <= 0) return 0;
    if (km <= kmDistancia.primerSector) return 0;
    let monto = valores.primerSector;
    if (kmDistancia.sectoresSiguientes <= 0) return monto;
    const tramosSiguientes = Math.ceil((km - kmDistancia.primerSector) / kmDistancia.sectoresSiguientes) - 1;
    monto += tramosSiguientes * valores.sectoresSiguientes;
    return monto;
  }
```

## Verificación

1. `grep -c "if (km <= kmDistancia.primerSector) return 0;" src/app/servicios/tarifario/valores-tarifa.service.ts` → 1
2. `grep -c "Math.ceil((km - kmDistancia.primerSector)" src/app/servicios/tarifario/valores-tarifa.service.ts` → 1
3. `grep -c "Math.floor(kmRestantes" src/app/servicios/tarifario/valores-tarifa.service.ts` → 0
4. `npm run build:demo` sin errores nuevos.
5. Mostrá el diff.

## Pruebas manuales (demo)

Con una tarifa con adicional por km (1er sector 50, intervalo 10), cerrar o
editar operaciones con km 50, 51, 60, 61 y 70, y comparar el "Km adicional"
contra la tabla del contexto:
  - 50 → 0
  - 51 y 60 → valor 1er sector
  - 61 y 70 → 1er sector + 1 intervalo

## Mensaje de commit

fix(tarifas): límites de tramo inclusivos en el adicional por km (TC1b)

- ValoresTarifaService.calcularKmAdicional: km <= primerSector sin
  adicional; tramos siguientes con ceil(...) - 1, el límite cierra su tramo
  (50 → 0, 60 → solo 1er sector, 61 → +1 intervalo).

FIN DE LA INSTRUCCIÓN TC1b
````
