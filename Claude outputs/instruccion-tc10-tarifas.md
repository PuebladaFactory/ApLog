````
INSTRUCCIÓN TC10 — Tarifas (cierre): fuera `op.valores` (espejo legacy); la única fuente es `valoresNuevos`
=========================================================================================================

Si no ves la línea "FIN DE LA INSTRUCCIÓN TC10" al final, el texto llegó
cortado: leé el archivo completo antes de empezar.

## Contexto y razonamiento

`Operacion.valores` es la estructura de valores del sistema viejo. Desde el
motor nuevo, la fuente de verdad es `valoresNuevos` (calculado en alta,
cierre, edición de InformeOp y restaurar), y `op.valores` quedó como ESPEJO
que distintas piezas copian a mano:
- OperacionService.calcularValoresIniciales (alta y restaurar) y el
  reseteo de `op.valores` en restaurar.
- ValoresOpCliente/ChoferService (cierre / edición de InformeOp): mutan
  op.valores.<lado> además de devolver los Valores del InformeOp.
- modal-detalle-op.recalcular y el cierre del generador: copian
  aCobrar/aPagar (el comentario dice "lo lee tablero-op": ya no es cierto).
Desde TC8 Reportes ya no lo lee y desde TC9 el adicional extra no vive ahí.
Lectores que quedan, ambos de exhibición:
- ExcelService.generarInformeOperaciones (export del tablero-op): además
  leía campos que no existen (estado.abierta…, chofer.idProveedor,
  patenteChofer).
- objeto-papelera (detalle de una op dada de baja).

Cambios:
1. interfaces/operacion.ts: fuera `valores: Valores` de Operacion (la
   interfaz `Valores` SE QUEDA: es el tipo de valoresNuevos).
2. Factory: las ops ya no nacen con `valores`.
3. OperacionService: fuera calcularValoresIniciales (y sus 2 llamadas) y el
   reseteo en restaurar; docblocks al día.
4. ValoresOpCliente/ChoferService: funciones puras (no mutan la op).
   La tarifaBase del InformeOp sigue yendo × multiplicador (sin cambios).
5. modal-detalle-op y generador: fuera el espejo.
6. Excel de operaciones: valores desde valoresNuevos (tarifa base ×
   multiplicador, como el InformeOp; adicionales y totales tal cual), y
   estado / N° / proveedor / patente / categoría desde los campos reales.
   Mismas columnas y en el mismo orden.
7. migrar-datos (herramienta vieja SIN RUTA — la ruta está comentada en
   liquidacion-routing — pero declarada en LiquidacionModule, así que
   compila): `operaciones` y `opErrores` pasan de `Operacion[]` a `any[]`.
   Lee documentos crudos con el espejo viejo y lo compara contra el
   InformeOp viejo; no tiene sentido migrarla a valoresNuevos. Se retira con
   la Liquidación vieja (fuera de este frente, T5). (Agregado tras el
   freno de Claude Code en el PASO 0.)
8. Papelera: el bloque de valores de una op lee
   `objeto.valoresNuevos?.<lado>?.<campo>` (tarifa base cruda, la que
   calculó el motor). El bloque de facturas/liquidaciones (otros
   `objeto.valores.*`) NO se toca: es otro tipo de objeto.
9. Herramienta TC-L: agrega `valores` a los campos muertos, así una
   segunda pasada borra el espejo de las ops de demo. Como `valores` y sus
   subrutas (`valores.cliente.adExtraValor`) no pueden ir juntas en un
   update, se filtran las subrutas cuando se borra el mapa entero.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit. NO ejecutes la herramienta.
- Si un texto a BUSCAR no está, o aparece más de una vez: detenete y reportá.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Ningún BUSCAR de esta instrucción tiene espacios al final de línea.
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.
- Se toca la interfaz Operacion (fuera `valores`): revisá todos los usos en
  src/ (incluidos .spec.ts y .html; ojo con objetos tipados `any`, que el
  build no detecta) — ver PASO 0.

## PASO 0 — Verificación (sin modificar nada)

0.1 `grep -rn "op\.valores\b\|operacion\.valores\b\|operacionEditada\.valores\b\|this\.op\.valores\b\|calcularValoresIniciales" src/ --include=*.ts --include=*.html`
    → solo en: operacion.service.ts, valores-op-cliente.service.ts,
    valores-op-chofer.service.ts, modal-detalle-op.component.ts,
    generador-operaciones.service.ts, informe-op-editor.component.ts
    (comentario), excel.service.ts (generarInformeOperaciones) y
    migrar-datos.component.ts (verificarConsistenciaValores, ~línea 617,
    sobre `operaciones`/`opErrores`, tipados `Operacion[]` en ~91-94; su
    .html también lee `item.valores?.…` en las dos tablas). Ningún .spec.ts.
    (operacion-migration.service.ts lee `o.valores?.…` con any para TC-L:
    no matchea y se queda.)
0.2 `grep -rn "objeto\.valores\.\(cliente\|chofer\)" src/` → solo
    objeto-papelera.component.html (8 líneas, bloque de operación).
0.3 `grep -rn "generarInformeOperaciones" src/` → definición en
    excel.service.ts y la llamada de tablero-op.component.ts (le pasa
    `ConId<Operacion>[]`).
0.4 Fuera de operacion-factory.service.ts, ningún archivo arma un objeto
    Operacion con `valores:` (`grep -rn "datosTarifaEventual:" src/ --include=*.ts`
    → solo interfaces/ y el factory).
Si algo no coincide, DETENETE y reportá.

## PASO 1 — src/app/interfaces/operacion.ts

1.1 BUSCAR:
```
  // tarifaAplicadaCliente/Chofer.nivel === 'personalizada'.)

  valores: Valores;

  // Sistema de Tarifas. tarifaAplicada*: referencia elegida ANTES del alta
```
REEMPLAZAR:
```
  // tarifaAplicadaCliente/Chofer.nivel === 'personalizada'.)
  // (TC10: retirado el espejo legacy de valores; la única fuente es
  // valoresNuevos.)

  // Sistema de Tarifas. tarifaAplicada*: referencia elegida ANTES del alta
```

## PASO 2 — src/app/servicios/operaciones/operacion-factory.service.ts

2.1 BUSCAR:
```
        : null,

      valores: {
        cliente: { acompValor: 0, kmAdicional: 0, tarifaBase: 0, aCobrar: 0 },
        chofer:  { acompValor: 0, kmAdicional: 0, tarifaBase: 0, aPagar:  0 },
      },

      tarifaAplicadaCliente: null,
```
REEMPLAZAR:
```
        : null,

      tarifaAplicadaCliente: null,
```

## PASO 3 — src/app/servicios/operaciones/operacion.service.ts

3.1 BUSCAR:
```
  /** Copia op.valoresNuevos (calculado por ValoresTarifaService.calcularAlta,
   *  que corre ANTES en el loop de altaDesdeAsignacion) a la estructura vieja
   *  op.valores. Desde TC2 el alta se aborta si valoresNuevos no se pudo
   *  calcular, así que acá siempre llega poblado; el if es defensivo (si
   *  faltara, op.valores queda en los ceros de crearOperacionBase). */
  calcularValoresIniciales(op: Operacion): Operacion {
    if (op.valoresNuevos) {
      op.valores = {
        cliente: { ...op.valoresNuevos.cliente },
        chofer: { ...op.valoresNuevos.chofer },
      };
    }
    return op;
  }

  /** Alta atómica de N operaciones + el tablero de la fecha, desde OperacionCreada[].
```
REEMPLAZAR:
```
  /** Alta atómica de N operaciones + el tablero de la fecha, desde OperacionCreada[].
```

3.2 BUSCAR:
```
      // (operaciones-editor / generador). Corre ANTES de
      // calcularValoresIniciales. TC2: si falta una referencia o no se pueden
```
REEMPLAZAR:
```
      // (operaciones-editor / generador). TC2: si falta una referencia o no se pueden
```

3.3 BUSCAR:
```
      c.operacion = this.calcularValoresIniciales(c.operacion);

      const op   = c.operacion;
```
REEMPLAZAR:
```
      const op   = c.operacion;
```

3.4 BUSCAR:
```
   *  tarifa base manual) y se recalculan valoresNuevos / op.valores con la
```
REEMPLAZAR:
```
   *  tarifa base manual) y se recalcula valoresNuevos con la
```

3.5 BUSCAR:
```
    op.adExtra = null;
    op.valores = {
      cliente: { acompValor: 0, kmAdicional: 0, tarifaBase: 0, aCobrar: 0 },
      chofer:  { acompValor: 0, kmAdicional: 0, tarifaBase: 0, aPagar:  0 },
    };
    // Valores del alta con la tarifa congelada (sin volver a resolver la
    // jerarquía) + espejo en op.valores, igual que altaDesdeAsignacion.
    const recalculo = this.valoresTarifaServ.calcularCierre(op);
    this.calcularValoresIniciales(op);
```
REEMPLAZAR:
```
    op.adExtra = null;
    // Valores del alta con la tarifa congelada (sin volver a resolver la
    // jerarquía).
    const recalculo = this.valoresTarifaServ.calcularCierre(op);
```

3.6 BUSCAR:
```
   *  (ValoresOpService.calcularValoresCierre, que además espeja op.valores),
```
REEMPLAZAR:
```
   *  (ValoresOpService.calcularValoresCierre),
```

## PASO 4 — src/app/servicios/valores-op/valores-op-cliente/valores-op-cliente.service.ts

4.1 BUSCAR:
```
   *  tarifaBase se persiste YA MULTIPLICADA por op.multiplicadorCliente
   *  (convención heredada del cierre viejo, se mantiene para op.valores) —
   *  valoresNuevos siempre la trae cruda. Muta op.valores.cliente (mismo
   *  criterio que antes — es la fuente que lee el resto de la app para
   *  mostrar la op) y devuelve el InformeOpNuevo.Valores del lado cliente,
   *  para que el caller arme el InformeOp.
```
REEMPLAZAR:
```
   *  tarifaBase del InformeOp va YA MULTIPLICADA por op.multiplicadorCliente
   *  (convención del InformeOp) — valoresNuevos siempre la trae cruda. No
   *  muta la op (TC10: sin espejo legacy); devuelve el
   *  InformeOpNuevo.Valores del lado cliente, para que el caller arme el
   *  InformeOp.
```

4.2 BUSCAR:
```
    const adExtra = v.adExtraValor ?? 0;

    op.valores.cliente.tarifaBase = tarifaBase;
    op.valores.cliente.acompValor = acompaniante;
    op.valores.cliente.kmAdicional = kmMonto;
    op.valores.cliente.aCobrar = v.aCobrar;

    return {
```
REEMPLAZAR:
```
    const adExtra = v.adExtraValor ?? 0;

    return {
```

## PASO 5 — src/app/servicios/valores-op/valores-op-chofer/valores-op-chofer.service.ts

5.1 BUSCAR:
```
   *  una vez por cada caso con idProveedor distinto). Muta op.valores.chofer
   *  (mismo criterio que ValoresOpClienteService) y devuelve el
```
REEMPLAZAR:
```
   *  una vez por cada caso con idProveedor distinto). No muta la op (TC10,
   *  mismo criterio que ValoresOpClienteService); devuelve el
```

5.2 BUSCAR:
```
    const adExtra = v.adExtraValor ?? 0;

    op.valores.chofer.tarifaBase = tarifaBase;
    op.valores.chofer.acompValor = acompaniante;
    op.valores.chofer.kmAdicional = kmMonto;
    op.valores.chofer.aPagar = v.aPagar;

    return {
```
REEMPLAZAR:
```
    const adExtra = v.adExtraValor ?? 0;

    return {
```

## PASO 6 — src/app/raiz/operaciones/modal-detalle-op/modal-detalle-op.component.ts

6.1 BUSCAR:
```
    this.valoresTarifaServ.calcularCierre(this.op);
    // Espejo legacy — op.valores todavía lo lee tablero-op (ver Deuda anotada
    // en el diseño). Solo copia lo que calcularCierre ya resolvió, sin lógica nueva.
    if (this.op.valoresNuevos) {
      this.op.valores.cliente.aCobrar = this.op.valoresNuevos.cliente.aCobrar;
      this.op.valores.chofer.aPagar = this.op.valoresNuevos.chofer.aPagar;
    }
  }
```
REEMPLAZAR:
```
    this.valoresTarifaServ.calcularCierre(this.op);
  }
```

## PASO 7 — src/app/servicios/desarrollo/generador-operaciones.service.ts

7.1 BUSCAR:
```
   *  multiplicadores en 1 (vienen así del
   *  alta) → ValoresTarifaService.calcularCierre → espejo a op.valores
   *  (aCobrar/aPagar, igual que el modal) → OperacionService.cerrarOperacion. */
```
REEMPLAZAR:
```
   *  multiplicadores en 1 (vienen así del alta) →
   *  ValoresTarifaService.calcularCierre → OperacionService.cerrarOperacion. */
```

7.2 BUSCAR:
```
    this.valoresTarifa.calcularCierre(op);
    if (op.valoresNuevos) {
      op.valores.cliente.aCobrar = op.valoresNuevos.cliente.aCobrar;
      op.valores.chofer.aPagar = op.valoresNuevos.chofer.aPagar;
    }

    return this.operacionService.cerrarOperacion({ ...op, id: op.idOperacion });
```
REEMPLAZAR:
```
    this.valoresTarifa.calcularCierre(op);

    return this.operacionService.cerrarOperacion({ ...op, id: op.idOperacion });
```

## PASO 8 — src/app/shared/modales/informe-op-editor/informe-op-editor.component.ts

8.1 BUSCAR:
```
    // suma de componentes). Además espejan valoresNuevos → op.valores de cada
    // lado (operacionRecalculada es un clon: this.operacion no se toca).
```
REEMPLAZAR:
```
    // suma de componentes). No mutan la op (operacionRecalculada es un clon:
    // this.operacion no se toca).
```

## PASO 9 — src/app/servicios/informes/excel/excel.service.ts

9.1 BUSCAR:
```
    const rows = operaciones.map((op) => {
      const estado = op.estado?.abierta
        ? "Abierta"
        : op.estado?.cerrada
          ? "Cerrada"
          : op.estado?.facturada
            ? "Facturada"
            : op.estado?.facCliente
              ? "Cliente Fac"
              : op.estado?.facChofer
                ? "Chofer Fac"
                : "Sin Datos";

      const proveedor =
        op.chofer?.idProveedor === 0
          ? "No"
          : this.getProveedor(op.chofer?.idProveedor);

      const categoria = this.getCategoria(
        op.patenteChofer,
        op.chofer?.idChofer,
      );

      return [
        estado,
        op.fecha,
        op.idOperacion,
        op.km,

        op.cliente?.razonSocial,
        op.valores?.cliente?.tarifaBase,
        op.valores?.cliente?.kmAdicional,
        op.valores?.cliente?.acompValor,
        op.valores?.cliente?.aCobrar,

        op.chofer?.apellido + " " + op.chofer?.nombre,
        proveedor,
        op.patenteChofer,
        categoria,
        op.valores?.chofer?.tarifaBase,
        op.valores?.chofer?.kmAdicional,
        op.valores?.chofer?.acompValor,
        op.valores?.chofer?.aPagar,

        op.acompaniante ? "Sí" : "No",
        op.hojaRuta,
        op.observaciones,
      ];
    });

    // -----------------------------
    // TABLA EXCEL REAL
```
REEMPLAZAR:
```
    // TC10: valores desde op.valoresNuevos (tarifa base × multiplicador, como
    // en el InformeOp); estado, proveedor, patente y categoría desde los
    // campos reales de Operacion (antes leía campos que ya no existen:
    // estado.abierta, chofer.idProveedor, patenteChofer).
    const etiquetaCiclo: Record<string, string> = {
      abierta: "Abierta", cerrada: "Cerrada", liquidada: "Liquidada",
    };
    const rows = operaciones.map((op) => {
      const vn = op.valoresNuevos;
      return [
        etiquetaCiclo[op.estado?.ciclo] ?? "Sin Datos",
        op.fecha,
        op.numeroOperacion,
        op.km,

        op.cliente?.razonSocial,
        vn ? vn.cliente.tarifaBase * (op.multiplicadorCliente ?? 0) : null,
        vn?.cliente?.kmAdicional,
        vn?.cliente?.acompValor,
        vn?.cliente?.aCobrar,

        op.chofer?.apellido + " " + op.chofer?.nombre,
        op.proveedor?.razonSocial ?? "No",
        op.vehiculo?.dominio,
        op.vehiculo?.categoria?.nombre,
        vn ? vn.chofer.tarifaBase * (op.multiplicadorChofer ?? 0) : null,
        vn?.chofer?.kmAdicional,
        vn?.chofer?.acompValor,
        vn?.chofer?.aPagar,

        op.acompaniante ? "Sí" : "No",
        op.hojaRuta,
        op.observaciones,
      ];
    });

    // -----------------------------
    // TABLA EXCEL REAL
```

## PASO 10 — src/app/shared/modales/objeto-papelera/objeto-papelera.component.html

10.1 BUSCAR:
```
[value]="objeto.valores.cliente.tarifaBase | formatearValor" >
```
REEMPLAZAR:
```
[value]="objeto.valoresNuevos?.cliente?.tarifaBase | formatearValor" >
```

10.2 BUSCAR:
```
[value]="objeto.valores.cliente.acompValor | formatearValor" >
```
REEMPLAZAR:
```
[value]="objeto.valoresNuevos?.cliente?.acompValor | formatearValor" >
```

10.3 BUSCAR:
```
[value]="objeto.valores.cliente.kmAdicional | formatearValor" >
```
REEMPLAZAR:
```
[value]="objeto.valoresNuevos?.cliente?.kmAdicional | formatearValor" >
```

10.4 BUSCAR:
```
[value]="objeto.valores.cliente.aCobrar | formatearValor" >
```
REEMPLAZAR:
```
[value]="objeto.valoresNuevos?.cliente?.aCobrar | formatearValor" >
```

10.5 BUSCAR:
```
[value]="objeto.valores.chofer.tarifaBase | formatearValor" >
```
REEMPLAZAR:
```
[value]="objeto.valoresNuevos?.chofer?.tarifaBase | formatearValor" >
```

10.6 BUSCAR:
```
[value]="objeto.valores.chofer.acompValor | formatearValor" >
```
REEMPLAZAR:
```
[value]="objeto.valoresNuevos?.chofer?.acompValor | formatearValor" >
```

10.7 BUSCAR:
```
[value]="objeto.valores.chofer.kmAdicional | formatearValor" >
```
REEMPLAZAR:
```
[value]="objeto.valoresNuevos?.chofer?.kmAdicional | formatearValor" >
```

10.8 BUSCAR:
```
[value]="objeto.valores.chofer.aPagar | formatearValor" >
```
REEMPLAZAR:
```
[value]="objeto.valoresNuevos?.chofer?.aPagar | formatearValor" >
```

## PASO 11 — src/app/servicios/migracion/operacion-migration.service.ts

11.1 BUSCAR:
```
    'valores.cliente.adExtraValor',
    'valores.chofer.adExtraValor',
  ];
```
REEMPLAZAR:
```
    'valores.cliente.adExtraValor',
    'valores.chofer.adExtraValor',
    'valores',   // TC10: el espejo legacy completo
  ];
```

11.2 BUSCAR:
```
        for (const ruta of p.borrar) cambios[ruta] = deleteField();
```
REEMPLAZAR:
```
        // Si se borra un mapa entero ('valores'), sus subrutas sobran (un
        // update con rutas solapadas falla).
        const rutas = p.borrar.filter(r => !p.borrar.some(padre => padre !== r && r.startsWith(padre + '.')));
        for (const ruta of rutas) cambios[ruta] = deleteField();
```

## PASO 12 — src/app/raiz/liquidacion/migrar-datos/migrar-datos.component.ts

12.1 BUSCAR:
```
  operaciones: Operacion[] = [];
  idsOp: string[] = [];
  infOpLiq: InformeOp[] = [];
  opErrores: Operacion[] = [];
```
REEMPLAZAR:
```
  // TC10: `any` a propósito. Herramienta vieja SIN RUTA que compara el espejo
  // legacy `valores` de documentos crudos de operaciones (ya fuera de la
  // interfaz Operacion) contra el InformeOp viejo. Se retira con el resto de
  // la Liquidación vieja.
  operaciones: any[] = [];
  idsOp: string[] = [];
  infOpLiq: InformeOp[] = [];
  opErrores: any[] = [];
```

## Verificación

1. El grep de 0.1 → solo migrar-datos.component.ts (sobre los arrays `any`).
   Además `grep -n "Operacion\[\]" src/app/raiz/liquidacion/migrar-datos/migrar-datos.component.ts`
   → sin resultados.
2. El grep de 0.2 → sin resultados.
3. `grep -n "'valores'" src/app/servicios/migracion/operacion-migration.service.ts` → 1.
4. `npm run build:demo` sin errores nuevos.
5. Mostrá el diff completo de los archivos editados.

## Pruebas manuales (demo)

1. Alta desde asignación: las ops se crean (en Firestore, sin `valores`;
   con valoresNuevos).
2. Editar y cerrar una op (con km, acompañante y adicional): totales en el
   modal, valoresNuevos e InformeOp correctos (tarifaBase del InformeOp ×
   multiplicador, como antes).
3. Editar un InformeOp en Liquidación: recalcula y guarda igual que antes.
4. Restaurar una op dada de baja: vuelve abierta con valoresNuevos del alta.
5. Tablero de operaciones → exportar Excel: estado, N°, proveedor, patente y
   categoría con datos; columnas de valores con números.
6. Papelera → detalle de una op dada de baja: valores de cliente y chofer
   visibles.
7. /migracion → Limpieza de campos (TC-L) → Auditar: ahora lista las ops
   con `valores`; Aplicar; Auditar otra vez → 0. Recálculo de resúmenes →
   Simular: 0 errores, 0 diferencias.
8. Generador: un plan chico con cierres se ejecuta sin errores.

## Mensaje de commit

refactor(tarifas): fuera op.valores; valoresNuevos como única fuente (TC10)

- Operacion sin valores; factory sin inicializarlo.
- Fuera los espejos: calcularValoresIniciales, reseteo en restaurar,
  ValoresOpCliente/Chofer (ahora puros), modal-detalle-op y generador.
- Excel de operaciones desde valoresNuevos y campos reales de Operacion.
- Papelera: valores de la op desde valoresNuevos.
- TC-L: `valores` entre los campos muertos (sin rutas solapadas).
- migrar-datos (sin ruta): operaciones/opErrores como any[].

FIN DE LA INSTRUCCIÓN TC10
````
