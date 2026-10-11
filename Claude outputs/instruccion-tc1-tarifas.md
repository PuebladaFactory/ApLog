````
INSTRUCCIÓN TC1 — Tarifas (cierre): adicional por km sin división por cero
==========================================================================

Si no ves la línea "FIN DE LA INSTRUCCIÓN TC1" al final, el texto llegó
cortado: leé el archivo completo antes de empezar.

## Contexto y razonamiento

ValoresTarifaService.calcularKmAdicional() divide los km restantes por
kmDistancia.sectoresSiguientes. Los forms de tarifa (General/Personalizada y
Especial) aceptan sectoresSiguientes = 0 con primerSector > 0
(Validators.min(0)), así que una tarifa mal cargada da:
  - Infinity cuando los km superan el primer sector;
  - NaN cuando los km caen justo en el límite (0/0).
Ese valor viaja a valoresNuevos y de ahí a InformeOp, Reportes y comisiones.

Dos cambios:
1. Motor (defensa): si sectoresSiguientes <= 0 se cobra solo el primer sector.
   Cubre tarifas ya guardadas con ese dato.
2. Forms (prevención): kmSectoresSiguientes pasa a Validators.min(1). El
   control solo existe/está habilitado cuando el adicional por km está activo,
   así que no afecta tarifas sin km. Se mantiene [minimo]="0" en appMonto
   (AutoNumeric con mínimo > 0 traba la escritura); el error lo da el
   validador, con mensaje "Debe ser mayor a 0.".

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto a BUSCAR no está, o aparece más de una vez: detenete y reportá.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.

## PASO 0 — Verificación (sin modificar nada)

0.1 src/app/servicios/tarifario/valores-tarifa.service.ts tiene el método
    privado `calcularKmAdicional(km: number, kmDistancia: KmDistancia | null,
    valores: AdicionalKmValores | undefined): number`.
0.2 `grep -rn "calcularKmAdicional" src/app` → solo aparece en
    valores-tarifa.service.ts (definición + 1 llamada en calcularLado).
0.3 `grep -rn "kmSectoresSiguientes" src/app --include=*.ts` → controles en
    raiz/tarifas/tarifa-form/tarifa-form.component.ts y
    raiz/tarifas/tarifa-especial-form/tarifa-especial-form.component.ts
    (definición con Validators.min(0) + lectura en onSubmit).
Si algo no coincide, DETENETE y reportá.

## PASO 1 — src/app/servicios/tarifario/valores-tarifa.service.ts

BUSCAR:
```
  private calcularKmAdicional(km: number, kmDistancia: KmDistancia | null, valores: AdicionalKmValores | undefined): number {
    if (!kmDistancia || !valores || kmDistancia.primerSector <= 0) return 0;
    if (km < kmDistancia.primerSector) return 0;
    let monto = valores.primerSector;
    const kmRestantes = km - kmDistancia.primerSector;
```
REEMPLAZAR:
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
```

## PASO 2 — src/app/raiz/tarifas/tarifa-form/tarifa-form.component.ts

BUSCAR:
```
        kmSectoresSiguientes: [{ value: base?.kmDistancia?.sectoresSiguientes ?? 0, disabled: !kmActivoInicial }, [Validators.required, Validators.min(0)]],
```
REEMPLAZAR:
```
        kmSectoresSiguientes: [{ value: base?.kmDistancia?.sectoresSiguientes ?? 0, disabled: !kmActivoInicial }, [Validators.required, Validators.min(1)]],
```

## PASO 3 — src/app/raiz/tarifas/tarifa-form/tarifa-form.component.html

BUSCAR:
```
                @if (form.get('kmSectoresSiguientes')?.errors?.['min']) {
                  <span>No puede ser negativo.</span>
```
REEMPLAZAR:
```
                @if (form.get('kmSectoresSiguientes')?.errors?.['min']) {
                  <span>Debe ser mayor a 0.</span>
```

## PASO 4 — src/app/raiz/tarifas/tarifa-especial-form/tarifa-especial-form.component.ts

BUSCAR:
```
        kmSectoresSiguientes: [fuente?.kmDistancia?.sectoresSiguientes ?? this.general?.kmDistancia?.sectoresSiguientes ?? 0, [Validators.required, Validators.min(0)]],
```
REEMPLAZAR:
```
        kmSectoresSiguientes: [fuente?.kmDistancia?.sectoresSiguientes ?? this.general?.kmDistancia?.sectoresSiguientes ?? 0, [Validators.required, Validators.min(1)]],
```

## PASO 5 — src/app/raiz/tarifas/tarifa-especial-form/tarifa-especial-form.component.html

BUSCAR:
```
                @if (form.get('kmSectoresSiguientes')?.errors?.['min']) {
                  <span>No puede ser negativo.</span>
```
REEMPLAZAR:
```
                @if (form.get('kmSectoresSiguientes')?.errors?.['min']) {
                  <span>Debe ser mayor a 0.</span>
```

## Verificación

1. `grep -n "sectoresSiguientes <= 0" src/app/servicios/tarifario/valores-tarifa.service.ts`
   → 1 resultado.
2. `grep -rn "kmSectoresSiguientes.*Validators.min(1)" src/app/raiz/tarifas`
   → 2 resultados (tarifa-form y tarifa-especial-form).
3. `grep -rn "Debe ser mayor a 0." src/app/raiz/tarifas` → 2 resultados.
4. `npm run build:demo` sin errores nuevos.
5. Mostrá el diff completo de los 5 archivos.

## Pruebas manuales (demo)

1. Tarifas → General → Editar: con adicional por km, poner "Sectores
   siguientes" en 0 → el campo se marca con "Debe ser mayor a 0." y no deja
   guardar. Con 1 o más, guarda normal.
2. Lo mismo en Personalizada (variante por categoría con adicional de km) y en
   Especial.
3. Personalizada por km y General sin km: el form no cambia de comportamiento.
4. Cerrar una operación con km por encima del primer sector: el adicional por
   km sale igual que antes (tarifas con sectoresSiguientes > 0 no cambian).

## Mensaje de commit

fix(tarifas): adicional por km sin división por cero (TC1)

- ValoresTarifaService.calcularKmAdicional: sectoresSiguientes <= 0 cobra
  solo el primer sector (antes Infinity/NaN).
- tarifa-form / tarifa-especial-form: kmSectoresSiguientes con
  Validators.min(1) y mensaje "Debe ser mayor a 0.".

FIN DE LA INSTRUCCIÓN TC1
````
