````
Si no ves la línea FIN DE LA INSTRUCCIÓN LR1b al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN LR1b — Frente Lazy loading + fechas (ApLog, rama refactor)
======================================================================
Lo que quedó sin uso al retirar la Liquidación vieja

## Contexto y razonamiento

LR1 borró los componentes y servicios del camino viejo. Este bloque saca
lo que quedó huérfano por ese borrado y corrige los comentarios que
afirman cosas que ya no son ciertas.

Cómo se fijó el alcance:
- Análisis de referencias con el compilador de TypeScript
  (`findReferences` sobre todo src/app), comparando antes y después de LR1.
- Se aplicó en cascada: se sacan los miembros sin uso y se vuelve a medir,
  hasta que no aparece nada nuevo.
- Además, un chequeo de componentes, pipes y directivas por selector y por
  nombre de pipe en todos los templates. Lo hice porque el análisis de
  LR1 cubría solo servicios y exports, y así se me escaparon dos piezas
  (punto A).

Solo entra lo que quedó sin uso POR LR1. El código que ya estaba muerto
antes (~115 miembros, sobre todo en StorageService, DbFirestoreService y
ValidarService) NO se toca acá: queda anotado como deuda.

### A. Componente y pipe de Shared huérfanos (se me escaparon en LR1)

- `DescuentosComponent` (shared/modales/descuentos): solo lo abría
  InformeLiqDetalleComponent, que se borró en LR1. El modal vivo de ajustes
  es AjustesLiqComponent (no se toca).
- `CalcularPorcentajeV2Pipe` (pipe `calcularPorcentajeV2`): su único uso
  era el template de informe-liq-detalle. El pipe `calcularPorcentaje` (v1)
  se queda: está en uso.

### B. Métodos de servicios vivos sin uso (11, en cascada)

| Servicio | Métodos | Por qué |
|---|---|---|
| ChoferService | getContratacionChofer | solo lo usaba liquidaciones-op |
| InformeOpService | obtenerPorIdsOperacion | solo lo usaba proforma |
| DbFirestoreService | obtenerDocsPorIdsOperacion, dividirEnGrupos | solo los usaba obtenerPorIdsOperacion |
| DbFirestoreService | eliminarMultiple, guardarMultipleOtraColeccion | solo los usaba migrar-datos |
| DbFirestoreService | guardarMultiple | solo lo usaba StorageService.guardadoMultiple |
| StorageService | listenForChanges | solo lo usaba proforma |
| StorageService | logMultiplesOp, logSimple | solo los usaban proforma, liquidaciones-op e informe-liq-detalle (log VIEJO a la colección `logs`) |
| StorageService | guardadoMultiple | solo lo usaban logMultiplesOp y logSimple |

Además salen 2 imports de tipos que quedan sin uso: `ContratacionChofer` en
chofer.service.ts y `LogEntry` en storage.service.ts.

`eliminarMultiple` borraba documentos en lote sin ninguna guarda: es mejor
que no quede disponible.

### C. Comentarios

**Se corrigen** los que afirman algo falso sobre el código vivo:
- en informe-op.service, quién usa `observarPorPeriodo` y `obtenerPorId`;
- en permisos.service, la referencia a `LiquidacionService`;
- en ajustes-liq, la lista de quién usa el modal y la mención a
  `DescuentosComponent`;
- en entidad-informe.util, el "pendiente" de unificar dos copias que ya no
  existen;
- en liq-gral, las 6 líneas de pestañas comentadas del camino viejo.

**Se dejan** los que solo cuentan historia ("camino paralelo a X (modelo
viejo)", "mismo criterio que X"): son el registro de dónde salió cada
pieza. El cierre del frente documenta en CLAUDE.md que el modelo viejo se
retiró en LR1.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto a BUSCAR no está o aparece más de una vez: detenete y
  reportá.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.
- Si se toca un tipo, interfaz, módulo o export, revisá TODOS sus usos en
  src/ (incluidos .spec.ts y .html).
- **Borrado por rango** (pasos marcados RANGO). Se borra desde la línea
  INICIO (inclusive) hasta la línea anterior a ANCLA (ANCLA se queda).
  Antes de borrar, verificá:
  - INICIO y ANCLA aparecen exactamente una vez cada una, comparando la
    línea completa;
  - ANCLA está después de INICIO;
  - el rango tiene exactamente la cantidad de líneas indicada.
  Si algo no coincide, detenete y reportá sin borrar. Se usa rango porque
  varios de estos bloques tienen líneas con espacios al final, que no
  pueden ir en un BUSCAR.

## PASO 0 — Verificación (sin modificar nada)

Corré y reportá la salida:

```
grep -rn "DescuentosComponent\|CalcularPorcentajeV2Pipe\|calcularPorcentajeV2\|app-descuentos" src --include=*.ts --include=*.html
grep -rn "getContratacionChofer\|obtenerPorIdsOperacion\|obtenerDocsPorIdsOperacion\|dividirEnGrupos\|eliminarMultiple\|guardarMultipleOtraColeccion\|listenForChanges\b\|logMultiplesOp\|logSimple\|guardadoMultiple\|guardarMultiple\b" src --include=*.ts --include=*.html
grep -n "ContratacionChofer" src/app/servicios/choferes/chofer.service.ts
grep -n "LogEntry" src/app/servicios/storage/storage.service.ts
```

Esperado:

1. **Descuentos / V2:**
   - shared.module.ts: import de archivo + declarations + exports de
     cada uno;
   - los propios archivos de cada pieza (`export class`, `selector:` o
     `name:`);
   - ajustes-liq.component.ts:17-18, en un comentario.
   Ningún template usa `app-descuentos` ni `calcularPorcentajeV2`.
2. **Métodos:** solo sus propias definiciones, más estas llamadas internas
   entre ellos:
   - obtenerPorIdsOperacion → obtenerDocsPorIdsOperacion;
   - obtenerDocsPorIdsOperacion → dividirEnGrupos;
   - logMultiplesOp y logSimple → guardadoMultiple;
   - guardadoMultiple → guardarMultiple.
   También los comentarios dentro de esos mismos bloques. Ninguna llamada
   desde otro archivo.
3. **ContratacionChofer:** el import (línea 4) y la firma de
   getContratacionChofer.
4. **LogEntry:** el import (línea 10) y usos SOLO dentro de logMultiplesOp
   y logSimple.

Si aparece un uso fuera de lo listado, detenete y reportá.

## PASO 1 — src/app/shared/shared.module.ts

1.1 Borrá la línea COMPLETA que contiene:
```
import { DescuentosComponent } from './modales/descuentos/descuentos.component';
```
por:
```
(borrar la línea)
```

1.2 Borrá la línea COMPLETA que contiene:
```
import { CalcularPorcentajeV2Pipe } from './pipes/calcular-porcentaje-v2.pipe';
```
por:
```
(borrar la línea)
```

1.3 Borrá las DOS líneas cuyo contenido completo es exactamente
`    DescuentosComponent,` (una en `declarations` y otra en `exports`).
Verificá antes que sean exactamente 2.

1.4 Borrá las DOS líneas cuyo contenido completo es exactamente
`    CalcularPorcentajeV2Pipe,` (una en `declarations` y otra en
`exports`). Verificá antes que sean exactamente 2.

## PASO 2 — src/app/servicios/choferes/chofer.service.ts

2.1 BUSCAR:
```
import { Chofer, ContratacionChofer, Vehiculo } from 'src/app/interfaces/chofer';
```
REEMPLAZAR:
```
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
```

2.2 BUSCAR:
```
    return this.getChoferPorId(idChofer)?.contratacion.tipo;
  }

  /** Devuelve la contratación viva del chofer por id, o undefined si no está (p. ej. en papelera). */
  getContratacionChofer(idChofer: string): ContratacionChofer | undefined {
    return this.getChoferPorId(idChofer)?.contratacion;
  }
```
REEMPLAZAR:
```
    return this.getChoferPorId(idChofer)?.contratacion.tipo;
  }
```

## PASO 3 — src/app/servicios/informes-op/informe-op.service.ts

3.1 BUSCAR:
```
  /** Listener en vivo por periodo/tipo — usado por LiquidacionesOpComponent.
```
REEMPLAZAR:
```
  /** Listener en vivo por periodo/tipo — usado por InformeOpListadoComponent
   *  y LiquidacionNuevaComponent.
```

3.2 BUSCAR:
```
    return this.db.getInformesOpPorPeriodo(this.COLECCION, desde, hasta, tipo, estado, pageSize, cursor);
  }

  /** Consulta por lista de idsOperacion — usado por las pantallas de lectura
   *  (Proforma, FacturacionListado, FacturacionHistorico, LiquidacionesOp)
   *  para traer los InformeOp de una liquidación/proforma ya armada. Wrapper
   *  tipado sobre el método genérico de DbFirestoreService, hardcodea la
   *  colección única. */
  async obtenerPorIdsOperacion(
    idsOperacion: string[],
  ): Promise<{ encontrados: ConId<InformeOpNuevo>[]; idsFaltantes: string[] }> {
    const r = await this.db.obtenerDocsPorIdsOperacion(this.COLECCION, idsOperacion);
    // idInfOp = id del documento (patrón ConId) — obtenerDocsPorIdsOperacion
    // es genérico y solo agrega `id`.
    return {
      encontrados: r.encontrados.map((d: any) => ({ ...d, idInfOp: d.id })),
      idsFaltantes: r.idsFaltantes,
    };
  }
```
REEMPLAZAR:
```
    return this.db.getInformesOpPorPeriodo(this.COLECCION, desde, hasta, tipo, estado, pageSize, cursor);
  }
```

3.3 BUSCAR:
```
  /** Consulta puntual por id — usado para resolver la contraparte on-demand
   *  (InformeLiqDetalleComponent) vía contraParte.idInfOp. */
```
REEMPLAZAR:
```
  /** Consulta puntual por id (patrón ConId). Lo usan OperacionService,
   *  InformeLiqService e InformeOpEditorComponent (p. ej. para resolver la
   *  contraparte vía contraParte.idInfOp). */
```

## PASO 4 — src/app/servicios/database/db-firestore.service.ts

4.1 RANGO.
- INICIO: `  async guardarMultiple(`
- ANCLA: `  async guardarMultipleGeneral(`
- 53 líneas: el método completo y la línea en blanco que lo sigue.

4.2 RANGO.
- INICIO: `  async eliminarMultiple(`
- ANCLA: `  /** Ejecuta un batch atómico con escrituras de colecciones potencialmente`
- 89 líneas: eliminarMultiple, guardarMultipleOtraColeccion y las líneas
  en blanco entre ellos y después.

4.3 RANGO.
- INICIO: `  async obtenerDocsPorIdsOperacion(coleccion: string, idsOperacion: string[]) {`
- ANCLA: `  getInformesLiqPorTipoYFechas(`
- 39 líneas: obtenerDocsPorIdsOperacion, el comentario
  `// Función auxiliar`, dividirEnGrupos y las líneas en blanco.

## PASO 5 — src/app/servicios/storage/storage.service.ts

5.1 Borrá la línea COMPLETA que contiene:
```
import { LogEntry } from 'src/app/interfaces/log-entry';
```
por:
```
(borrar la línea)
```

5.2 RANGO.
- INICIO: `  listenForChanges<T>(componente: string): void {`
- ANCLA (4 espacios de sangría):
  `    listenForChangesField<T>(componente: string, campo:string, valor:any): void {`
- 35 líneas: el método completo y la línea en blanco que lo sigue.

5.3 RANGO.
- INICIO (6 espacios de sangría): `      guardadoMultiple(`
- ANCLA (6 espacios de sangría):
  `      private controlLog(componente: string, accion:string) {`
- 51 líneas: guardadoMultiple, logMultiplesOp y logSimple, con las líneas
  en blanco o con solo espacios entre ellos.

## PASO 6 — src/app/servicios/permisos/permisos.service.ts

6.1 BUSCAR:
```
    // un delete — ver LiquidacionService.anularLiquidacion / el flujo de
    // baja en facturacion-listado.
```
REEMPLAZAR:
```
    // un delete: el documento se conserva con otro estado.
```

## PASO 7 — src/app/shared/modales/ajustes-liq/ajustes-liq.component.ts

7.1 BUSCAR:
```
 *  usan LiquidacionNuevaComponent, InformeLiqNuevoDetalleComponent y
 *  ResumenOpLiquidadasComponent (camino viejo). Muta el array que recibe en
 *  fromParent.descuentos (los callers pasan una copia). Devuelve
 *  {descuentos, total}. No confundir con shared/modales/descuentos
 *  (DescuentosComponent), que usa el InformeLiqDetalleComponent viejo. */
```
REEMPLAZAR:
```
 *  usan LiquidacionNuevaComponent e InformeLiqNuevoDetalleComponent. Muta el
 *  array que recibe en fromParent.descuentos (los callers pasan una copia).
 *  Devuelve {descuentos, total}. */
```

## PASO 8 — src/app/shared/utils/entidad-informe.util.ts

8.1 BUSCAR:
```
/** Nombre para mostrar de la entidad de un InformeOp — mismo criterio que
 *  ya usan LiquidacionesOpComponent.nombreEntidad e
 *  InformeLiqDetalleComponent.nombreEntidad (duplicado ahí, no unificado
 *  todavía). Se centraliza acá para no sumar una tercera copia; unificar
 *  los otros dos call sites queda pendiente, fuera del alcance de este
 *  chunk. */
```
REEMPLAZAR:
```
/** Nombre para mostrar de la entidad de un InformeOp. Única implementación:
 *  las copias del camino viejo (LiquidacionesOp / InformeLiqDetalle) se
 *  retiraron en LR1 (frente lazy-fechas). */
```

## PASO 9 — src/app/raiz/liquidacion/liq-gral/liq-gral.component.ts

9.1 BUSCAR:
```
    { id: 'tab8', name: 'Anulados', route: 'liquidacion/anulados' },
    // Camino viejo — rutas comentadas en liquidacion-routing.module.ts:
    // { id: 'tab1', name: 'Clientes', route: 'liquidacion/cliente'},
    // { id: 'tab2', name: 'Choferes', route: 'liquidacion/chofer' },
    // { id: 'tab3', name: 'Proveedores', route: 'liquidacion/proveedor' },
    // { id: 'tab4', name: 'Proformas', route: 'liquidacion/proformas' },
    /* { id: 'tab5', name: 'Migrar Datos', route: 'liquidacion/migrar' }, */
  ];
```
REEMPLAZAR:
```
    { id: 'tab8', name: 'Anulados', route: 'liquidacion/anulados' },
  ];
```

## PASO 10 — Borrar archivos

Borrá (con rm; NO uses git rm):
```
src/app/shared/modales/descuentos/
src/app/shared/pipes/calcular-porcentaje-v2.pipe.ts
src/app/shared/pipes/calcular-porcentaje-v2.pipe.spec.ts
```
La carpeta descuentos tiene 4 archivos (.ts, .html, .scss, .spec.ts).

## Verificación

1. Greps (reportá la salida):
```
grep -rn "DescuentosComponent\|CalcularPorcentajeV2\|calcularPorcentajeV2" src --include=*.ts --include=*.html
grep -rn "getContratacionChofer\|obtenerPorIdsOperacion\|obtenerDocsPorIdsOperacion\|dividirEnGrupos\|eliminarMultiple\|guardarMultipleOtraColeccion\|listenForChanges\b\|logMultiplesOp\|logSimple\|guardadoMultiple\|guardarMultiple\b" src --include=*.ts --include=*.html
grep -rn "LiquidacionService\|LiquidacionesOpComponent\|InformeLiqDetalleComponent" src/app/servicios/informes-op/informe-op.service.ts src/app/servicios/permisos/permisos.service.ts src/app/shared/modales/ajustes-liq/ajustes-liq.component.ts
grep -c "ContratacionChofer" src/app/servicios/choferes/chofer.service.ts
grep -c "LogEntry" src/app/servicios/storage/storage.service.ts
git diff --stat
git status --short
git diff -U0 -- src | grep -n "^+.* $"
```
Esperado:
- (a) nada;
- (b) nada;
- (c) nada;
- (d) `0`;
- (e) `0`.
- (f) `git diff --numstat` de referencia (agregadas / borradas):
  - liq-gral.component.ts 0/6;
  - chofer.service.ts 1/6;
  - db-firestore.service.ts 0/181;
  - informe-op.service.ts 5/20;
  - permisos.service.ts 1/2;
  - storage.service.ts 0/87;
  - ajustes-liq.component.ts 3/5;
  - shared.module.ts 0/6;
  - entidad-informe.util.ts 3/6.
  Además, los 6 archivos borrados. Reportá los números reales.
- (g) los 9 archivos M y 6 D: los 4 de descuentos y los 2 del pipe v2.
- (h) nada.

2. `npm run build:demo`. Reportá la tabla de tamaños y las advertencias.
   Referencia (medido sobre una copia del repo con LR1 + este cambio):
   - main.js: 1,13 MB → ≈ 1,12 MB (283,91 kB transfer).
     DbFirestoreService y StorageService están en el inicial.
   - Initial total: ≈ 1,55 MB (351,17 kB transfer).
   - Las mismas 9 advertencias.

## Pruebas manuales en demo (las hace Nico)

1. Liquidación:
   - liquidar (modal de liquidación nueva, con ajustes +/-);
   - ver y editar un borrador;
   - emitir.
2. Facturación: abrir el detalle de un informe emitido; editar ajustes.
3. Choferes:
   - alta y edición de un chofer directo y de uno de proveedor;
   - en Operaciones, cambiar el chofer de una operación (usa los métodos
     de contratación que se quedan).
4. Ajustes: Registro viejo y Papelera legado (StorageService/logs viejos
   que se quedan) siguen listando.
5. Login/logout y navegación general: sin errores en consola.

## Mensaje de commit

```
LR1b (lazy-fechas): lo que quedó sin uso al retirar la Liquidación vieja

- Shared: fuera DescuentosComponent y CalcularPorcentajeV2Pipe (solo los
  usaba InformeLiqDetalle, retirado en LR1).
- Servicios: fuera 11 métodos sin uso en cascada —
  ChoferService.getContratacionChofer; InformeOpService.obtenerPorIdsOperacion;
  DbFirestoreService.obtenerDocsPorIdsOperacion, dividirEnGrupos,
  eliminarMultiple, guardarMultipleOtraColeccion y guardarMultiple;
  StorageService.listenForChanges, logMultiplesOp, logSimple y
  guardadoMultiple — más los imports ContratacionChofer y LogEntry.
- Comentarios: corregidos los que describían usos del camino viejo
  (informe-op.service, permisos, ajustes-liq, entidad-informe) y fuera las
  pestañas comentadas de liq-gral.
```

FIN DE LA INSTRUCCIÓN LR1b
````
