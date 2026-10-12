````
INSTRUCCIÓN TC6 — Tarifas (cierre): fuera `datosTarifaPersonalizada` de Operacion
================================================================================

Si no ves la línea "FIN DE LA INSTRUCCIÓN TC6" al final, el texto llegó
cortado: leé el archivo completo antes de empezar.

## Contexto y razonamiento

`Operacion.datosTarifaPersonalizada` ({seccion, categoria, nombre, aCobrar,
aPagar}) es del sistema viejo. Hoy:
- Lo ESCRIBE solo OperacionFactoryService (crearOperacionBase,
  aplicarTarifaTipo, aplicarTarifaEventual), siempre con un objeto en cero o
  null.
- No lo LEE nadie: su único lector era EditarInfOpComponent (borrado en
  TC-R4). El motor nuevo identifica la Personalizada por
  tarifaAplicadaCliente/Chofer.nivel === 'personalizada' y toma los valores
  de la tarifa por id.

Cambios:
1. interfaces/operacion.ts: fuera el campo y la interfaz
   DatosTarifaPersonalizada.
2. operacion-factory.service.ts: fuera las 4 escrituras del campo y los
   docblocks al día. `tarifaTipo` y `datosTarifaEventual` NO cambian (TC8).

Datos existentes: las operaciones ya guardadas en demo conservan el campo en
Firestore (opToFirestore hace spread del objeto, así que una edición lo
re-escribe tal cual). No molesta a nadie; lo borra la herramienta de demo
TC-L, junto con los demás campos muertos. Vantruck no se toca.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto a BUSCAR no está, o aparece más de una vez: detenete y reportá.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.
- Se toca la interfaz Operacion: revisá todos los usos del campo y de
  DatosTarifaPersonalizada en src/ (incluidos .spec.ts y .html) — ver 0.1.

## PASO 0 — Verificación (sin modificar nada)

0.1 `grep -rn "datosTarifaPersonalizada\|DatosTarifaPersonalizada" src/`
    → SOLO interfaces/operacion.ts (campo + interfaz) y
    operacion-factory.service.ts (8 líneas: las escrituras en
    crearOperacionBase, aplicarTarifaTipo y aplicarTarifaEventual —dos en
    esta—, más 2 menciones en docblocks).
    Cualquier otro archivo (incluidos .spec.ts, .html y servicios de
    migración): DETENETE y reportá.
Si algo no coincide, DETENETE y reportá.

## PASO 1 — src/app/servicios/operaciones/operacion-factory.service.ts

1.1 BUSCAR:
```
      // Nacen con objeto en cero SOLO si la tarifa correspondiente aplica; sino null.
      datosTarifaEventual: tarifaTipo.eventual
        ? { chofer: { concepto: '', valor: 0 }, cliente: { concepto: '', valor: 0 } }
        : null,
      datosTarifaPersonalizada: tarifaTipo.personalizada
        ? { seccion: 0, categoria: 0, nombre: '', aCobrar: 0, aPagar: 0 }
        : null,
```
REEMPLAZAR:
```
      // Nace con objeto en cero SOLO si la op es eventual; sino null.
      datosTarifaEventual: tarifaTipo.eventual
        ? { chofer: { concepto: '', valor: 0 }, cliente: { concepto: '', valor: 0 } }
        : null,
```

1.2 BUSCAR:
```
   *  - activar=true: pasa la op a eventual. Crea datosTarifaEventual en cero si
   *    no existía y anula datosTarifaPersonalizada. (El tipo original lo guarda el
   *    componente en su Map para poder volver atrás.)
   *  - activar=false: restaura tarifaOriginal y reconstruye datosTarifaX según
   *    corresponda (eventual→null, personalizada→objeto en cero, resto→ambos null).
```
REEMPLAZAR:
```
   *  - activar=true: pasa la op a eventual. Crea datosTarifaEventual en cero si
   *    no existía. (El tipo original lo guarda el componente en su Map para
   *    poder volver atrás.)
   *  - activar=false: restaura tarifaOriginal y reconstruye datosTarifaEventual
   *    (en cero si la original era eventual; null si no).
```

1.3 BUSCAR:
```
   * datosTarifaX (eventual ⟺ datosTarifaEventual; personalizada ⟺ datosTarifaPersonalizada).
```
REEMPLAZAR:
```
   * datosTarifaX (eventual ⟺ datosTarifaEventual).
```

1.4 BUSCAR:
```
         ?? { chofer: { concepto: '', valor: 0 }, cliente: { concepto: '', valor: 0 } })
      : null;
    op.datosTarifaPersonalizada = tipo.personalizada
      ? (op.datosTarifaPersonalizada
         ?? { seccion: 0, categoria: 0, nombre: '', aCobrar: 0, aPagar: 0 })
      : null;
  }
```
REEMPLAZAR:
```
         ?? { chofer: { concepto: '', valor: 0 }, cliente: { concepto: '', valor: 0 } })
      : null;
  }
```

1.5 BUSCAR:
```
        ?? { chofer: { concepto: '', valor: 0 }, cliente: { concepto: '', valor: 0 } };
      op.datosTarifaPersonalizada = null;
    } else {
```
REEMPLAZAR:
```
        ?? { chofer: { concepto: '', valor: 0 }, cliente: { concepto: '', valor: 0 } };
    } else {
```

1.6 BUSCAR:
```
           ?? { chofer: { concepto: '', valor: 0 }, cliente: { concepto: '', valor: 0 } })
        : null;
      op.datosTarifaPersonalizada = tarifaOriginal.personalizada
        ? (op.datosTarifaPersonalizada
           ?? { seccion: 0, categoria: 0, nombre: '', aCobrar: 0, aPagar: 0 })
        : null;
    }
```
REEMPLAZAR:
```
           ?? { chofer: { concepto: '', valor: 0 }, cliente: { concepto: '', valor: 0 } })
        : null;
    }
```

## PASO 2 — src/app/interfaces/operacion.ts

2.1 BUSCAR:
```
  datosTarifaEventual: DatosTarifaEventual | null;
  datosTarifaPersonalizada: DatosTarifaPersonalizada | null;
```
REEMPLAZAR:
```
  datosTarifaEventual: DatosTarifaEventual | null;
  // (TC6: retirado el campo de datos de tarifa Personalizada — no tenía
  // lectores; la Personalizada se identifica por
  // tarifaAplicadaCliente/Chofer.nivel === 'personalizada'.)
```

2.2 BUSCAR:
```
export interface DatosTarifaPersonalizada {
  seccion: number;
  categoria: number;
  nombre: string;
  aCobrar: number;
  aPagar: number;
}

export interface EstadoOp {
```
REEMPLAZAR:
```
export interface EstadoOp {
```

## Verificación

1. `grep -rn "datosTarifaPersonalizada\|DatosTarifaPersonalizada" src/` → sin resultados.
2. `npm run build:demo` sin errores nuevos.
3. Mostrá el diff completo de los 2 archivos.

## Pruebas manuales (demo)

1. Alta de operaciones desde una asignación con cliente de tarifa
   Personalizada: candidatos, espejo al chofer y alta igual que antes.
2. Toggle Eventual en operaciones-editor (activar y volver atrás) sobre una
   op Personalizada y sobre una General: vuelve a su tarifa sin errores.
3. Chofer de proveedor pendiente → asignarlo en el editor: sin cambios.
4. Cierre de una op Personalizada: valores correctos.
5. Generador (/desarrollo): un plan chico se ejecuta sin errores.

## Mensaje de commit

refactor(tarifas): fuera datosTarifaPersonalizada de Operacion (TC6)

- Interfaz Operacion sin datosTarifaPersonalizada / DatosTarifaPersonalizada
  (sin lectores desde TC-R4).
- OperacionFactoryService deja de escribirlo (alta, aplicarTarifaTipo,
  aplicarTarifaEventual); docblocks al día.

FIN DE LA INSTRUCCIÓN TC6
````
