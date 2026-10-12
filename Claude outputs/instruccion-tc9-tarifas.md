````
INSTRUCCIÓN TC9 — Tarifas (cierre): adicional extra como `op.adExtra` {concepto, valorCliente, valorChofer}
=========================================================================================================

Si no ves la línea "FIN DE LA INSTRUCCIÓN TC9" al final, el texto llegó
cortado: leé el archivo completo antes de empezar.

## Contexto y razonamiento

Hoy el adicional extra de una operación (lo que se carga a mano al
editar/cerrar) está repartido en tres lugares del modelo viejo:
`op.adExtraConcepto` y `op.valores.cliente.adExtraValor` /
`op.valores.chofer.adExtraValor`. `op.valores` es el espejo legacy que se
retira en TC10, pero estos dos valores son ENTRADA real: el motor
(ValoresTarifaService) los lee de ahí para calcular
`valoresNuevos.<lado>.adExtraValor` y el total.

Decisión T2.1: un solo campo de entrada anidado,
`op.adExtra: { concepto, valorCliente, valorChofer } | null`.
`valoresNuevos.<lado>.adExtraValor` se queda como SALIDA del motor (aplica la
regla "multiplicador 0 anula el lado").

Cambios:
1. interfaces/operacion.ts: `adExtra: AdicionalExtraOp | null` reemplaza a
   `adExtraConcepto?`; nueva interfaz AdicionalExtraOp y helper puro
   `armarAdExtra(concepto, valorCliente, valorChofer)` (recorta el concepto,
   null/undefined → 0, todo vacío → null). `Valores.adExtraValor` NO cambia
   (es el tipo de valoresNuevos).
2. Factory: las ops nacen con `adExtra: null`.
3. Motor (armarValoresNuevos y valoresEventual): lee `op.adExtra?.valorX`.
4. ValoresOpCliente/ChoferService (arman los Valores del InformeOp): el
   adExtra sale de `valoresNuevos.<lado>.adExtraValor` (lo que calculó el
   motor) en vez de la entrada cruda. Corrige una inconsistencia: con
   multiplicador 0 el motor anula el lado (aCobrar/aPagar = 0) pero el
   InformeOp sumaba igual el adicional crudo a su total.
5. modal-detalle-op (editar/cerrar): el form se inicializa desde op.adExtra
   y se escribe con armarAdExtra. Los nombres de los controles del form
   (adExtraConcepto, valorCliente.adExtraValor, valorChofer.adExtraValor)
   NO cambian, así que operacion-detalle-general y operacion-valor-lado no
   se tocan.
6. informe-op-editor (edita UN lado): inicializa desde op.adExtra y al
   armar la op editada conserva el valor del OTRO lado.
7. Restaurar (OperacionService.restaurarOperacion): `op.adExtra = null` en vez
   de `delete op.adExtraConcepto`.
8. Generador: el cierre carga `op.adExtra`; además se quita la inyección de
   OperacionFactoryService que quedó sin uso desde TC8 (señalado por vos).

Datos de demo: las ops ya guardadas con adicional usan los campos viejos,
que desde este bloque NO se leen. La herramienta TC-L (próximo bloque) los
traduce a `adExtra` y borra los campos muertos. Hasta correrla: no cierres
ni edites el InformeOp de ops que ya tenían adicional cargado (perderían el
adicional). Las pruebas de abajo usan ops nuevas.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto a BUSCAR no está, o aparece más de una vez: detenete y reportá.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Ningún BUSCAR de esta instrucción tiene espacios al final de línea.
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.
- Se toca la interfaz Operacion (campo requerido nuevo `adExtra`, fuera
  `adExtraConcepto`): revisá todos los usos en src/ (incluidos .spec.ts y
  .html) — ver PASO 0.

## PASO 0 — Verificación (sin modificar nada)

0.1 `grep -rn "op\.adExtraConcepto\|operacion\.adExtraConcepto\|operacionEditada\.adExtraConcepto\|valores\.cliente\.adExtraValor\|valores\.chofer\.adExtraValor" src/`
    → solo en: valores-tarifa.service.ts (8: 4 en armarValoresNuevos, 4 en
    valoresEventual), valores-op-cliente.service.ts (1),
    valores-op-chofer.service.ts (1), modal-detalle-op.component.ts,
    informe-op-editor.component.ts, operacion.service.ts (restaurar) y
    generador-operaciones.service.ts. Ningún .spec.ts ni .html.
0.2 `grep -rn "datosTarifaEventual:" src/ --include=*.ts` → fuera de
    interfaces/, solo operacion-factory.service.ts (es el único lugar que
    arma un objeto Operacion completo; ahí se agrega `adExtra: null`).
0.3 `grep -rn "operacionFactory\|OperacionFactoryService" src/app/servicios/desarrollo/generador-operaciones.service.ts`
    → solo el import y la inyección (sin usos).
0.4 `grep -rn "AdicionalExtraOp\|armarAdExtra" src/` → sin resultados.
Si algo no coincide, DETENETE y reportá.

## PASO 1 — src/app/interfaces/operacion.ts

1.1 BUSCAR:
```
  multiplicadorChofer: number;
  adExtraConcepto?: string;
```
REEMPLAZAR:
```
  multiplicadorChofer: number;
  // Adicional extra cargado a mano al editar/cerrar (ENTRADA, TC9): un
  // concepto y un valor por lado. El resultado por lado lo calcula el motor
  // en valoresNuevos.<lado>.adExtraValor (0 si el multiplicador del lado es
  // 0). null = sin adicional. Normalizar con armarAdExtra().
  adExtra: AdicionalExtraOp | null;
```

1.2 BUSCAR:
```
export interface DatosTarifaEventual {
```
REEMPLAZAR:
```
/** Adicional extra de una operación (entrada): concepto y valor por lado. */
export interface AdicionalExtraOp {
  concepto: string;
  valorCliente: number;
  valorChofer: number;
}

/** Normaliza lo cargado en un form: concepto recortado; valores null/undefined
 *  → 0. Sin concepto y con ambos valores en 0 → null (sin adicional). */
export function armarAdExtra(
  concepto: string | null | undefined,
  valorCliente: number | null | undefined,
  valorChofer: number | null | undefined,
): AdicionalExtraOp | null {
  const c = (concepto ?? '').trim();
  const vc = valorCliente ?? 0;
  const vch = valorChofer ?? 0;
  if (!c && vc === 0 && vch === 0) return null;
  return { concepto: c, valorCliente: vc, valorChofer: vch };
}

export interface DatosTarifaEventual {
```

## PASO 2 — src/app/servicios/operaciones/operacion-factory.service.ts

2.1 BUSCAR:
```
      multiplicadorCliente: 1,
      multiplicadorChofer:  1,
```
REEMPLAZAR:
```
      multiplicadorCliente: 1,
      multiplicadorChofer:  1,
      adExtra:              null,
```

## PASO 3 — src/app/servicios/tarifario/valores-tarifa.service.ts

3.1 BUSCAR:
```
          aCobrar: tarifaBaseCliente * op.multiplicadorCliente + cliente.kmAdicional + cliente.acompValor + (op.valores.cliente.adExtraValor ?? 0),
          adExtraValor: op.valores.cliente.adExtraValor ?? 0,
```
REEMPLAZAR:
```
          aCobrar: tarifaBaseCliente * op.multiplicadorCliente + cliente.kmAdicional + cliente.acompValor + (op.adExtra?.valorCliente ?? 0),
          adExtraValor: op.adExtra?.valorCliente ?? 0,
```

3.2 BUSCAR:
```
          aPagar: tarifaBaseChofer * op.multiplicadorChofer + chofer.kmAdicional + chofer.acompValor + (op.valores.chofer.adExtraValor ?? 0),
          adExtraValor: op.valores.chofer.adExtraValor ?? 0,
```
REEMPLAZAR:
```
          aPagar: tarifaBaseChofer * op.multiplicadorChofer + chofer.kmAdicional + chofer.acompValor + (op.adExtra?.valorChofer ?? 0),
          adExtraValor: op.adExtra?.valorChofer ?? 0,
```

3.3 BUSCAR:
```
          aCobrar: tarifaBaseCliente * op.multiplicadorCliente + acompValorCliente + (op.valores.cliente.adExtraValor ?? 0),
          adExtraValor: op.valores.cliente.adExtraValor ?? 0,
```
REEMPLAZAR:
```
          aCobrar: tarifaBaseCliente * op.multiplicadorCliente + acompValorCliente + (op.adExtra?.valorCliente ?? 0),
          adExtraValor: op.adExtra?.valorCliente ?? 0,
```

3.4 BUSCAR:
```
          aPagar: tarifaBaseChofer * op.multiplicadorChofer + acompValorChofer + (op.valores.chofer.adExtraValor ?? 0),
          adExtraValor: op.valores.chofer.adExtraValor ?? 0,
```
REEMPLAZAR:
```
          aPagar: tarifaBaseChofer * op.multiplicadorChofer + acompValorChofer + (op.adExtra?.valorChofer ?? 0),
          adExtraValor: op.adExtra?.valorChofer ?? 0,
```

## PASO 4 — src/app/servicios/valores-op/valores-op-cliente/valores-op-cliente.service.ts

4.1 BUSCAR:
```
    const adExtra = op.valores.cliente.adExtraValor ?? 0;
```
REEMPLAZAR:
```
    // Del motor (no de la entrada): respeta "multiplicador 0 anula el lado".
    const adExtra = v.adExtraValor ?? 0;
```

## PASO 5 — src/app/servicios/valores-op/valores-op-chofer/valores-op-chofer.service.ts

5.1 BUSCAR:
```
    const adExtra = op.valores.chofer.adExtraValor ?? 0;
```
REEMPLAZAR:
```
    // Del motor (no de la entrada): respeta "multiplicador 0 anula el lado".
    const adExtra = v.adExtraValor ?? 0;
```

## PASO 6 — src/app/raiz/operaciones/modal-detalle-op/modal-detalle-op.component.ts

6.1 BUSCAR:
```
import { DocumentoOperacion, Operacion } from 'src/app/interfaces/operacion';
```
REEMPLAZAR:
```
import { DocumentoOperacion, Operacion, armarAdExtra } from 'src/app/interfaces/operacion';
```

6.2 BUSCAR:
```
    this.op.acompanianteCant = this.op.acompanianteCant ?? 0;
    this.op.adExtraConcepto = this.op.adExtraConcepto ?? '';
    this.op.valores.cliente.adExtraValor = this.op.valores.cliente.adExtraValor ?? 0;
    this.op.valores.chofer.adExtraValor = this.op.valores.chofer.adExtraValor ?? 0;
```
REEMPLAZAR:
```
    this.op.acompanianteCant = this.op.acompanianteCant ?? 0;
```

6.3 BUSCAR:
```
      adExtraConcepto: [this.op.adExtraConcepto],
      valorCliente: this.fb.group({ adExtraValor: [this.op.valores.cliente.adExtraValor] }),
      valorChofer: this.fb.group({ adExtraValor: [this.op.valores.chofer.adExtraValor] }),
```
REEMPLAZAR:
```
      adExtraConcepto: [this.op.adExtra?.concepto ?? ''],
      valorCliente: this.fb.group({ adExtraValor: [this.op.adExtra?.valorCliente ?? 0] }),
      valorChofer: this.fb.group({ adExtraValor: [this.op.adExtra?.valorChofer ?? 0] }),
```

6.4 BUSCAR:
```
    this.op.adExtraConcepto = v.adExtraConcepto;
    this.op.valores.cliente.adExtraValor = v.valorCliente.adExtraValor;
    this.op.valores.chofer.adExtraValor = v.valorChofer.adExtraValor;
```
REEMPLAZAR:
```
    this.op.adExtra = armarAdExtra(v.adExtraConcepto, v.valorCliente.adExtraValor, v.valorChofer.adExtraValor);
```

## PASO 7 — src/app/shared/modales/informe-op-editor/informe-op-editor.component.ts

7.1 BUSCAR:
```
import { Operacion } from 'src/app/interfaces/operacion';
```
REEMPLAZAR:
```
import { Operacion, armarAdExtra } from 'src/app/interfaces/operacion';
```

7.2 BUSCAR:
```
    this.adExtraConcepto = operacion.adExtraConcepto ?? '';
```
REEMPLAZAR:
```
    this.adExtraConcepto = operacion.adExtra?.concepto ?? '';
```

7.3 BUSCAR:
```
      this.adExtraValor = operacion.valores.cliente.adExtraValor ?? 0;
```
REEMPLAZAR:
```
      this.adExtraValor = operacion.adExtra?.valorCliente ?? 0;
```

7.4 BUSCAR:
```
      this.adExtraValor = operacion.valores.chofer.adExtraValor ?? 0;
```
REEMPLAZAR:
```
      this.adExtraValor = operacion.adExtra?.valorChofer ?? 0;
```

7.5 BUSCAR:
```
    operacionEditada.adExtraConcepto = this.adExtraConcepto;

    if (this.esLadoCliente) {
      operacionEditada.multiplicadorCliente = this.multiplicador;
      operacionEditada.tarifaBaseManualCliente = this.usarTarifaManual ? this.tarifaBaseManualValor : null;
      operacionEditada.valores.cliente.adExtraValor = this.adExtraValor;
    } else {
      operacionEditada.multiplicadorChofer = this.multiplicador;
      operacionEditada.tarifaBaseManualChofer = this.usarTarifaManual ? this.tarifaBaseManualValor : null;
      operacionEditada.valores.chofer.adExtraValor = this.adExtraValor;
    }
```
REEMPLAZAR:
```
    // Este modal edita UN lado: el valor del otro lado se conserva tal cual.
    const previo = operacionEditada.adExtra;
    operacionEditada.adExtra = armarAdExtra(
      this.adExtraConcepto,
      this.esLadoCliente ? this.adExtraValor : (previo?.valorCliente ?? 0),
      this.esLadoCliente ? (previo?.valorChofer ?? 0) : this.adExtraValor,
    );

    if (this.esLadoCliente) {
      operacionEditada.multiplicadorCliente = this.multiplicador;
      operacionEditada.tarifaBaseManualCliente = this.usarTarifaManual ? this.tarifaBaseManualValor : null;
    } else {
      operacionEditada.multiplicadorChofer = this.multiplicador;
      operacionEditada.tarifaBaseManualChofer = this.usarTarifaManual ? this.tarifaBaseManualValor : null;
    }
```

## PASO 8 — src/app/servicios/operaciones/operacion.service.ts

8.1 BUSCAR:
```
    delete op.adExtraConcepto;
```
REEMPLAZAR:
```
    op.adExtra = null;
```

## PASO 9 — src/app/servicios/desarrollo/generador-operaciones.service.ts

9.1 BUSCAR:
```
import { DatosTarifaEventual, Operacion } from 'src/app/interfaces/operacion';
```
REEMPLAZAR:
```
import { DatosTarifaEventual, Operacion, armarAdExtra } from 'src/app/interfaces/operacion';
```

9.2 BUSCAR:
```
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { OperacionFactoryService } from 'src/app/servicios/operaciones/operacion-factory.service';
```
REEMPLAZAR:
```
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
```

9.3 BUSCAR:
```
  private operacionService = inject(OperacionService);
  private operacionFactory = inject(OperacionFactoryService);
```
REEMPLAZAR:
```
  private operacionService = inject(OperacionService);
```

9.4 BUSCAR:
```
   *  km; adicional extra en op.valores.<lado>.adExtraValor + adExtraConcepto
   *  (el motor nuevo lo lee de ahí); multiplicadores en 1 (vienen así del
```
REEMPLAZAR:
```
   *  km; adicional extra en op.adExtra (entrada que lee el motor);
   *  multiplicadores en 1 (vienen así del
```

9.5 BUSCAR:
```
    if (decision.adicional) {
      op.adExtraConcepto = decision.adicional.concepto;
      op.valores.cliente.adExtraValor = decision.adicional.valorCliente;
      op.valores.chofer.adExtraValor = decision.adicional.valorChofer;
    }
```
REEMPLAZAR:
```
    op.adExtra = decision.adicional
      ? armarAdExtra(decision.adicional.concepto, decision.adicional.valorCliente, decision.adicional.valorChofer)
      : null;
```

## Verificación

1. El grep de 0.1 → sin resultados.
2. `grep -rn "armarAdExtra(" src/` → definición (+1 mención en comentario)
   en interfaces/operacion.ts y 1 uso en cada uno: modal-detalle-op,
   informe-op-editor, generador.
3. `grep -rn "operacionFactory\|OperacionFactoryService" src/app/servicios/desarrollo/generador-operaciones.service.ts` → sin resultados.
4. `npm run build:demo` sin errores nuevos.
5. Mostrá el diff completo de los archivos editados.

## Pruebas manuales (demo) — con operaciones NUEVAS

1. Editar una op abierta: cargar concepto "Peaje" y valores cliente 1.000 /
   chofer 800 → guardar → reabrir: se ven los mismos datos. En Firestore la
   op tiene `adExtra: {concepto:'Peaje', valorCliente:1000, valorChofer:800}`.
2. Cerrar esa op: valoresNuevos.cliente.adExtraValor = 1000 y
   chofer.adExtraValor = 800; aCobrar/aPagar y los totales de los dos
   InformeOp los incluyen.
3. Editar una op dejando concepto vacío y valores en 0 → `adExtra: null`.
4. Cerrar una op con adicional y multiplicador cliente 0: el lado cliente
   queda en 0 en valoresNuevos Y en el InformeOp cliente (antes el
   InformeOp sumaba el adicional igual).
5. Liquidación → editar el InformeOp cliente de una op cerrada con
   adicional: cambiar el valor cliente → guardar → el valor chofer del
   adicional NO cambia (abrir la op o el InformeOp chofer).
6. Op eventual con adicional: cerrar → adicional incluido en ambos lados.
7. Restaurar desde papelera una op cerrada con adicional → vuelve abierta
   sin adicional.
8. Generador: un plan chico con cierres y adicionales se ejecuta sin
   errores; las ops cerradas tienen `adExtra` cuando corresponde.

## Mensaje de commit

refactor(tarifas): adicional extra como op.adExtra {concepto, valorCliente, valorChofer} (TC9)

- Operacion: adExtra (entrada) reemplaza a adExtraConcepto +
  valores.<lado>.adExtraValor; helper armarAdExtra.
- Motor: lee op.adExtra; ValoresOpCliente/Chofer toman el adicional de
  valoresNuevos (respeta multiplicador 0 también en el InformeOp).
- modal-detalle-op, informe-op-editor, restaurar y generador sobre op.adExtra;
  fuera la inyección sin uso de OperacionFactoryService en el generador.

FIN DE LA INSTRUCCIÓN TC9
````
