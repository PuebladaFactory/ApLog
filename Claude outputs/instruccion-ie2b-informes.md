Si no ves la línea FIN DE LA INSTRUCCIÓN IE2b al final, el texto llegó cortado: leé el archivo completo.

# IE2b — El informe de operaciones como Tabla de Excel, con Nivel y Tarifa

## Contexto y razonamiento

IE2 le enseñó al renderer a dibujar una Tabla de Excel real, sin que nadie la usara
todavía. Este bloque la usa en el único informe que la pidió: el del tablero de
operaciones. Es el pedido tal cual: filtrar por cliente, por chofer, por tarifa, ordenar
por columna, ocultar filas y columnas, y que el total sea la suma de la columna y no un
valor fijo.

**La Tabla.** `armarLibroOperaciones` agrega `excel: { nombre: 'Operaciones' }` a su
`TablaDoc` y con eso la hoja sale como ListObject: botón de filtro en las 24 columnas,
bandas del tema, y la fila de totales como `SUBTOTAL(109, Operaciones[Columna])` en las 11
columnas numéricas (Km + los 10 montos), con el valor ya calculado adentro. Se cumplen los
dos requisitos que IE2 dejó escritos: el nombre es único (el libro tiene una sola tabla) y
ninguna etiqueta de columna lleva `[`, `]`, `#` ni `'`. Las 24 etiquetas son además
distintas entre sí, que es un requisito de Excel para una tabla.

**Una sola columna de nivel, no una por lado.** Los dos lados de una operación solo pueden
diferir en un caso real: uno con General y el otro con Especial, en cualquier combinación
(Personalizada se espeja al lado chofer y Eventual es de la operación completa). En ese
caso se muestra el de mayor jerarquía, Especial. No inventé un orden para eso: el proyecto
ya tenía `ORDEN_NIVELES` en `interfaces/tarifa-habilitada.ts`, declarado como "del más
específico al más genérico" (`personalizada`, `especial`, `general`, `eventual`) — es
exactamente la jerarquía. Lo único que cambia ahí es que pasa a exportarse (y a `readonly`,
porque ahora sale del módulo).

- Un lado sin resolver (`null`, posible en operaciones viejas de Vantruck) PIERDE contra
  cualquier nivel: se muestra el nivel del otro lado.
- Los dos sin resolver → `Sin resolver`, el mismo default que ya usan los pipes en pantalla.
- Empate (mismo nivel en los dos lados, el caso normal) → gana el lado cliente, para que el
  nombre de la tarifa salga siempre del mismo lado y no dependa del orden de comparación.

**La columna Tarifa** es el `nombreTarifa` de la referencia congelada del lado que ganó la
jerarquía. Queda VACÍA en dos casos, los dos a propósito: en una eventual no hay documento
de tarifa (los valores se cargan por operación, no hay nombre que mostrar — la columna
Nivel ya dice "Eventual"), y en una operación sin resolver no hay referencia.

**Dónde van las dos columnas.** Cierran el bloque de la operación (después de Km, antes de
Cliente) y no al final: son datos de la OPERACIÓN, no de un lado. Así cada lado conserva su
bloque de montos contiguo (base → km → acompañante → extra → total) y el desglose sigue
sumando el total, que es el invariante que verifico en cada informe.

**`INDICES_TOTAL` pasa a derivarse de `COLUMNAS`.** Era una lista de índices fijos
(`[3, 5, 6, …]`). Insertar dos columnas en el medio los corre a todos: la fila de totales
habría sumado las columnas equivocadas sin que `tsc` ni el build dijeran nada. Ahora se
derivan de la etiqueta y el tipo (Km + las de tipo `moneda`), así que una columna nueva no
puede desalinear los totales en silencio.

**El util nuevo, `shared/utils/nivel-tarifa-op.util.ts`.** La regla del nivel de un lado
vivía privada en `TableroOpComponent.nivelLado`, y un documento no puede usar un método
privado de un componente ni un pipe. Se movió tal cual a `nivelLadoOp` y el tablero ahora
delega (mismo movimiento que `etiquetaEstadoOp` en IE1). Con ella van `nivelTarifaOp` y
`refTarifaOp` (la jerarquía) y `etiquetaNivelTarifa`, que el pipe del mismo nombre ahora
llama en vez de tener el `switch` — el tablero ya hacía `new EtiquetaNivelTarifaPipe()`
para reusarlo desde TypeScript, que es la señal de que esa lógica no era de un pipe.

`claseNivelTarifa` NO se mueve, a propósito: una clase de Bootstrap es presentación y no
tiene nada que hacer en un util de documentos. Ese pipe queda intacto.

**Lo que NO cambia:** la pantalla. `getTarifaBadges` sigue mostrando uno o dos badges como
hasta ahora (dos cuando los lados difieren). Si querés que el badge del tablero también
colapse a uno solo con esta misma regla, lo hago en un bloque aparte: ahí hay una decisión
de UI (perder la información de qué lado tiene cuál) que no corresponde meter de prestado
en un bloque de informes.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Validá TODOS los BUSCAR antes de escribir el primero. Si uno no está o está repetido,
  detenete y avisá.
- Aplicá los pasos EN ORDEN. Editá en el lugar (leé el archivo antes de escribir). LF.
- `clase-nivel-tarifa.pipe.ts` no se toca.
- `excel-tabular.service.ts`, `documento-tabular.ts` y `PdfTabularService` no se tocan:
  IE2 ya dejó la rama de Tabla, este bloque solo la usa.
- El pipe `etiquetaNivelTarifa` lo consumen 7 plantillas más (ficha de entidad, detalle y
  editor de InformeOp, listado de InformeOp, editor de operaciones, cabecera y valor por
  lado). Ninguna cambia: el pipe conserva nombre, firma y resultado.
- No toques CLAUDE.md ni CHANGELOG.md: van en el bloque DOC de cierre del frente.
- NO corras `npm run build`, `deploy:*` ni `node set-version.js`. Para compilar:
  `npm run build:demo` (línea base: 9 advertencias, inicial 1,53 MB).
- npm con `--legacy-peer-deps` (en este bloque no hace falta instalar nada).

## PASO 0 — verificación, sin modificar nada

Corré esto y mostrame la salida. Si algo no coincide, detenete y avisá:

1. `git rev-parse --abbrev-ref HEAD` → `refactor`; `git log --oneline -1` → el commit de IE2.
2. Los cuatro archivos a editar:
   - `git hash-object src/app/interfaces/tarifa-habilitada.ts` → `f38a9af5b190e35df23665b11810bddb27767090`
   - `git hash-object src/app/shared/pipes/etiqueta-nivel-tarifa.pipe.ts` → `bb2cecf9e511740ecc98870dc93969948fc272c8`
   - `git hash-object src/app/shared/utils/documento-operaciones.util.ts` → `72be7c103cb0771bb5bbd6ccf592e116c658d42c`
   - `git hash-object src/app/raiz/operaciones/tablero-op/tablero-op.component.ts` → `3ad7419dcc02823261360098ef771068c0c71731`
3. El archivo nuevo no existe todavía: `ls src/app/shared/utils/nivel-tarifa-op.util.ts` → error de "no such file".
4. `grep -c "export const ORDEN_NIVELES" src/app/interfaces/tarifa-habilitada.ts` → `0` (hoy es `const`, privada).
5. `grep -c "private nivelLado" src/app/raiz/operaciones/tablero-op/tablero-op.component.ts` → `1` (la copia que se va al util).
6. `grep -c "col('Nivel'" src/app/shared/utils/documento-operaciones.util.ts` → `0`.
7. `grep -c "const INDICES_TOTAL = \[" src/app/shared/utils/documento-operaciones.util.ts` → `1` (los índices fijos, todavía ahí).
8. La rama de Tabla de IE2 está en su lugar:
   `grep -c "private dibujarTablaExcel" src/app/servicios/exportacion/excel-tabular.service.ts` → `1`.

## PASO 1 — src/app/interfaces/tarifa-habilitada.ts

BUSCAR (7 líneas):

```
export type NivelHabilitado = RefTarifaHabilitada['nivel'];

/** Orden de exhibición de los niveles (del más específico al más genérico). */
const ORDEN_NIVELES: NivelHabilitado[] = ['personalizada', 'especial', 'general', 'eventual'];

/** Niveles habilitados de una entidad, sin repetidos y en orden fijo
 *  (personalizada, especial, general, eventual). Lista vacía o ausente → [].
```

REEMPLAZAR por (11 líneas):

```
export type NivelHabilitado = RefTarifaHabilitada['nivel'];

/** Orden de exhibición de los niveles (del más específico al más genérico).
 *  Al ser un orden por especificidad, es también la JERARQUÍA para resolver un
 *  empate entre los dos lados de una operación (nivelTarifaOp, en
 *  shared/utils/nivel-tarifa-op.util.ts): gana el de menor índice. `readonly`
 *  porque ahora sale del módulo. */
export const ORDEN_NIVELES: readonly NivelHabilitado[] = ['personalizada', 'especial', 'general', 'eventual'];

/** Niveles habilitados de una entidad, sin repetidos y en orden fijo
 *  (personalizada, especial, general, eventual). Lista vacía o ausente → [].
```

## PASO 2 — ARCHIVO NUEVO: src/app/shared/utils/nivel-tarifa-op.util.ts

```
import { Operacion } from 'src/app/interfaces/operacion';
import { NivelTarifa } from 'src/app/interfaces/tarifa';
import { RefTarifaAplicada } from 'src/app/interfaces/ref-tarifa-aplicada';
import { ORDEN_NIVELES } from 'src/app/interfaces/tarifa-habilitada';

/** Nivel de tarifa aplicado a UN lado de la operación. Eventual es a nivel de
 *  operación completa, así que se chequea ANTES que tarifaAplicada*. Si la
 *  resolución no pudo determinar un ganador (operación previa al tarifario
 *  nuevo — caso real en Vantruck — u otro caso sin resolver), da null.
 *  Extraído de TableroOpComponent.nivelLado, que ahora delega acá. */
export function nivelLadoOp(op: Operacion, lado: 'cliente' | 'chofer'): NivelTarifa | null {
  if (op.datosTarifaEventual !== null) return 'eventual';
  const ref = lado === 'cliente' ? op.tarifaAplicadaCliente : op.tarifaAplicadaChofer;
  return ref?.nivel ?? null;
}

/** Nivel de tarifa de la OPERACIÓN, uno solo: el de mayor jerarquía entre los
 *  dos lados. Los dos lados coinciden salvo en un caso real — uno con General y
 *  el otro con Especial (en cualquier combinación) — y ahí gana el más
 *  específico, igual que el orden de ORDEN_NIVELES ('personalizada',
 *  'especial', 'general', 'eventual'). Un lado sin resolver (null) pierde
 *  contra cualquier nivel; los dos sin resolver dan null. */
export function nivelTarifaOp(op: Operacion): NivelTarifa | null {
  return ganador(op) === 'chofer'
    ? nivelLadoOp(op, 'chofer')
    : nivelLadoOp(op, 'cliente');
}

/** Referencia congelada de la tarifa del lado que gana la jerarquía (ver
 *  nivelTarifaOp), para mostrar el NOMBRE de la tarifa efectivamente aplicada.
 *  null en eventual (no hay documento de tarifa: los valores se cargan por
 *  operación) y cuando ningún lado resolvió. */
export function refTarifaOp(op: Operacion): RefTarifaAplicada | null {
  if (op.datosTarifaEventual !== null) return null;
  return ganador(op) === 'chofer' ? op.tarifaAplicadaChofer : op.tarifaAplicadaCliente;
}

/** Etiqueta del nivel para exhibición. Única definición: la usan el pipe
 *  `etiquetaNivelTarifa` (pantallas) y el Excel del informe de operaciones. */
export function etiquetaNivelTarifa(nivel: NivelTarifa | null | undefined): string {
  switch (nivel) {
    case 'eventual': return 'Eventual';
    case 'personalizada': return 'Personalizada';
    case 'especial': return 'Especial';
    case 'general': return 'General';
    default: return 'Sin resolver';
  }
}

/** Qué lado gana la jerarquía. Empate (mismo nivel, o los dos sin resolver) →
 *  'cliente', para que el nombre de la tarifa salga siempre del mismo lado. */
function ganador(op: Operacion): 'cliente' | 'chofer' {
  return peso(nivelLadoOp(op, 'chofer')) < peso(nivelLadoOp(op, 'cliente')) ? 'chofer' : 'cliente';
}

/** Posición en ORDEN_NIVELES: menor = más específico = gana. null no está en la
 *  lista y queda último. */
function peso(nivel: NivelTarifa | null): number {
  if (nivel === null) return ORDEN_NIVELES.length;
  const i = ORDEN_NIVELES.indexOf(nivel);
  return i < 0 ? ORDEN_NIVELES.length : i;
}
```

(62 líneas, LF, sin línea vacía al final más allá del salto de la última)

## PASO 3 — src/app/shared/pipes/etiqueta-nivel-tarifa.pipe.ts

BUSCAR (18 líneas):

```
import { Pipe, PipeTransform } from '@angular/core';
import { NivelTarifa } from 'src/app/interfaces/tarifa';

@Pipe({
    name: 'etiquetaNivelTarifa',
    standalone: false
})
export class EtiquetaNivelTarifaPipe implements PipeTransform {
  transform(nivel: NivelTarifa | null | undefined): string {
    switch (nivel) {
      case 'eventual': return 'Eventual';
      case 'personalizada': return 'Personalizada';
      case 'especial': return 'Especial';
      case 'general': return 'General';
      default: return 'Sin resolver';
    }
  }
}
```

REEMPLAZAR por (15 líneas):

```
import { Pipe, PipeTransform } from '@angular/core';
import { NivelTarifa } from 'src/app/interfaces/tarifa';
import { etiquetaNivelTarifa } from 'src/app/shared/utils/nivel-tarifa-op.util';

@Pipe({
    name: 'etiquetaNivelTarifa',
    standalone: false
})
export class EtiquetaNivelTarifaPipe implements PipeTransform {
  /** Delega en el util: la etiqueta la necesitan también los documentos
   *  (el Excel del informe de operaciones), que no pueden usar un pipe. */
  transform(nivel: NivelTarifa | null | undefined): string {
    return etiquetaNivelTarifa(nivel);
  }
}
```

## PASO 4 — src/app/shared/utils/documento-operaciones.util.ts

BUSCAR (5 líneas):

```
import { ConId } from 'src/app/interfaces/conId';
import { Operacion } from 'src/app/interfaces/operacion';
import { etiquetaEstadoOp } from './estado-op.util';
import { fechaLegible } from './fecha.util';
import { sanearNombreArchivo } from './nombre-archivo.util';
```

REEMPLAZAR por (6 líneas):

```
import { ConId } from 'src/app/interfaces/conId';
import { Operacion } from 'src/app/interfaces/operacion';
import { etiquetaEstadoOp } from './estado-op.util';
import { etiquetaNivelTarifa, nivelTarifaOp, refTarifaOp } from './nivel-tarifa-op.util';
import { fechaLegible } from './fecha.util';
import { sanearNombreArchivo } from './nombre-archivo.util';
```

## PASO 5 — src/app/shared/utils/documento-operaciones.util.ts

BUSCAR (12 líneas):

```
 *  mostraba aunque entraba en los totales. Van dentro del desglose de cada
 *  lado (base → km → acompañante → extra → total), así las columnas suman el
 *  total. No dependen de las columnas visibles del tablero: el informe es
 *  siempre completo. */
const COLUMNAS: ColumnaDoc[] = [
  col('Estado', 'texto', 12),
  col('Fecha', 'fecha', 11),
  col('Operacion', 'numero', 10),
  col('Km', 'numero', 7),

  col('Cliente', 'texto', 26),
  col('Tarifa Base Cl', 'moneda', 14),
```

REEMPLAZAR por (21 líneas):

```
 *  mostraba aunque entraba en los totales. Van dentro del desglose de cada
 *  lado (base → km → acompañante → extra → total), así las columnas suman el
 *  total. No dependen de las columnas visibles del tablero: el informe es
 *  siempre completo.
 *
 *  'Nivel' y 'Tarifa' cierran el bloque de la operación (antes del lado
 *  cliente): son UNA por operación, no una por lado — ver nivelTarifaOp.
 *
 *  Las etiquetas son los nombres de columna de la Tabla de Excel: tienen que
 *  ser únicas y sin `[`, `]`, `#` ni `'` (referencias estructuradas de la
 *  fórmula del total). */
const COLUMNAS: ColumnaDoc[] = [
  col('Estado', 'texto', 12),
  col('Fecha', 'fecha', 11),
  col('Operacion', 'numero', 10),
  col('Km', 'numero', 7),
  col('Nivel', 'texto', 13),
  col('Tarifa', 'texto', 22),

  col('Cliente', 'texto', 26),
  col('Tarifa Base Cl', 'moneda', 14),
```

## PASO 6 — src/app/shared/utils/documento-operaciones.util.ts

BUSCAR (8 líneas):

```
  col('Observaciones', 'texto', 30),
];

/** Índices que se suman en la fila Total: Km y las 10 columnas de monto. */
const INDICES_TOTAL = [3, 5, 6, 7, 8, 9, 14, 15, 16, 17, 18];

/** QUÉ dice el Excel del informe de operaciones (puro: no lee Firestore ni
 *  cachés, todo sale de la Operacion y sus snapshots).
```

REEMPLAZAR por (13 líneas):

```
  col('Observaciones', 'texto', 30),
];

/** Índices que se suman en la fila Total: Km y las 10 columnas de monto. Se
 *  derivan de COLUMNAS y NO se escriben a mano: con índices fijos, insertar una
 *  columna en el medio desalinea los totales en silencio (pasó al agregar
 *  'Nivel' y 'Tarifa'). */
const INDICES_TOTAL = COLUMNAS
  .map((c, i) => (c.tipo === 'moneda' || c.etiqueta === 'Km' ? i : -1))
  .filter(i => i >= 0);

/** QUÉ dice el Excel del informe de operaciones (puro: no lee Firestore ni
 *  cachés, todo sale de la Operacion y sus snapshots).
```

## PASO 7 — src/app/shared/utils/documento-operaciones.util.ts

BUSCAR (8 líneas):

```
 *  SALIDA que calculó el motor, no la entrada `op.adExtra`): con multiplicador
 *  0 el motor lo deja en 0, y así la columna coincide con el total. Una
 *  operación sin `valoresNuevos` (nunca debería pasar en el modelo nuevo) deja
 *  los 10 montos en null: el renderer dibuja "—" y la fila Total no la suma,
 *  en vez de mentir con ceros. */
export function armarLibroOperaciones(d: DatosLibroOperaciones): LibroTabular {
  const filas: ValorCeldaDoc[][] = d.operaciones.map(op => {
    const vn = op.valoresNuevos;
```

REEMPLAZAR por (9 líneas):

```
 *  SALIDA que calculó el motor, no la entrada `op.adExtra`): con multiplicador
 *  0 el motor lo deja en 0, y así la columna coincide con el total. Una
 *  operación sin `valoresNuevos` (nunca debería pasar en el modelo nuevo) deja
 *  los 10 montos en null: dentro de una Tabla de Excel el renderer deja la
 *  celda VACÍA (no "—": arruinaría el filtro numérico y el SUBTOTAL) y la fila
 *  Total no la suma, en vez de mentir con ceros. */
export function armarLibroOperaciones(d: DatosLibroOperaciones): LibroTabular {
  const filas: ValorCeldaDoc[][] = d.operaciones.map(op => {
    const vn = op.valoresNuevos;
```

## PASO 8 — src/app/shared/utils/documento-operaciones.util.ts

BUSCAR (6 líneas):

```
      op.fecha,
      op.numeroOperacion,
      op.km,

      op.cliente.razonSocial,
      vn ? vn.cliente.tarifaBase * (op.multiplicadorCliente ?? 0) : null,
```

REEMPLAZAR por (8 líneas):

```
      op.fecha,
      op.numeroOperacion,
      op.km,
      etiquetaNivelTarifa(nivelTarifaOp(op)),
      refTarifaOp(op)?.nombreTarifa ?? '',

      op.cliente.razonSocial,
      vn ? vn.cliente.tarifaBase * (op.multiplicadorCliente ?? 0) : null,
```

## PASO 9 — src/app/shared/utils/documento-operaciones.util.ts

BUSCAR (6 líneas):

```
    columnas: COLUMNAS,
    filas,
    filaTotal: filas.length > 0 ? filaTotal(filas) : null,
  };

  const hoja: HojaDoc = {
```

REEMPLAZAR por (10 líneas):

```
    columnas: COLUMNAS,
    filas,
    filaTotal: filas.length > 0 ? filaTotal(filas) : null,
    // Informe de TRABAJO: filtro por columna, ordenamiento, ocultar filas y
    // columnas, y el total como SUBTOTAL que sigue al filtro (IE2). El nombre
    // es único: el libro tiene una sola tabla.
    excel: { nombre: 'Operaciones' },
  };

  const hoja: HojaDoc = {
```

## PASO 10 — src/app/shared/utils/documento-operaciones.util.ts

BUSCAR (6 líneas):

```
    notas: [
      'Montos por lado desde los valores de la operación: Total = tarifa base (por el multiplicador del lado) + adicional por km + acompañante + extra.',
      'Extra Cl / Extra Ch: adicional extra cargado al cerrar o al editar el InformeOp. El concepto no se exporta, solo el importe de cada lado.',
      'Totales: suma de las filas exportadas (las que se ven en el tablero con los filtros aplicados).',
    ],
  };
```

REEMPLAZAR por (7 líneas):

```
    notas: [
      'Montos por lado desde los valores de la operación: Total = tarifa base (por el multiplicador del lado) + adicional por km + acompañante + extra.',
      'Extra Cl / Extra Ch: adicional extra cargado al cerrar o al editar el InformeOp. El concepto no se exporta, solo el importe de cada lado.',
      'Nivel y Tarifa: nivel de tarifa aplicado a la operación y nombre de la tarifa. Cuando los dos lados difieren (uno con General y el otro con Especial), se muestra el de mayor jerarquía (Especial). En las eventuales no hay documento de tarifa, así que Tarifa queda vacía.',
      'Totales: suma de las filas exportadas (las que se ven en el tablero con los filtros aplicados). Es un SUBTOTAL de la Tabla: si filtrás u ocultás filas dentro del Excel, se recalcula.',
    ],
  };
```

## PASO 11 — src/app/raiz/operaciones/tablero-op/tablero-op.component.ts

BUSCAR (6 líneas):

```
import { EtiquetaNivelTarifaPipe } from 'src/app/shared/pipes/etiqueta-nivel-tarifa.pipe';
import { ClaseNivelTarifaPipe } from 'src/app/shared/pipes/clase-nivel-tarifa.pipe';
import { etiquetaEstadoOp } from 'src/app/shared/utils/estado-op.util';

// =====================
// MODELOS
```

REEMPLAZAR por (7 líneas):

```
import { EtiquetaNivelTarifaPipe } from 'src/app/shared/pipes/etiqueta-nivel-tarifa.pipe';
import { ClaseNivelTarifaPipe } from 'src/app/shared/pipes/clase-nivel-tarifa.pipe';
import { etiquetaEstadoOp } from 'src/app/shared/utils/estado-op.util';
import { nivelLadoOp } from 'src/app/shared/utils/nivel-tarifa-op.util';

// =====================
// MODELOS
```

## PASO 12 — src/app/raiz/operaciones/tablero-op/tablero-op.component.ts

BUSCAR (21 líneas):

```
    return op.vehiculo.categoria.nombre ?? 'Sin categoría';
  }

  /** Nivel real aplicado a un lado de la operación — mismo criterio que
   *  OperacionValorLadoComponent.nivel: Eventual es a nivel de operación
   *  completa (se chequea antes que tarifaAplicada*), y en ese caso cliente
   *  y chofer siempre coinciden por diseño (igual que Personalizada, que se
   *  espeja al chofer/proveedor — ver sincronizarLadoChofer). Si la
   *  resolución automática no pudo determinar un ganador (operación previa
   *  a Bloque 7 Paso 1 — caso real en Vantruck — u otro caso no bloqueante
   *  sin resolver), da null y el badge cae en "Sin resolver" (mismo default
   *  que ya usan EtiquetaNivelTarifaPipe/ClaseNivelTarifaPipe). */
  private nivelLado(op: Operacion, lado: 'cliente' | 'chofer'): NivelTarifa | null {
    if (op.datosTarifaEventual !== null) return 'eventual';
    const ref = lado === 'cliente' ? op.tarifaAplicadaCliente : op.tarifaAplicadaChofer;
    return ref?.nivel ?? null;
  }

  private badgeDeNivel(nivel: NivelTarifa | null): { clase: string; etiqueta: string } {
    return {
      clase: this.claseNivelTarifaPipe.transform(nivel),
```

REEMPLAZAR por (6 líneas):

```
    return op.vehiculo.categoria.nombre ?? 'Sin categoría';
  }

  private badgeDeNivel(nivel: NivelTarifa | null): { clase: string; etiqueta: string } {
    return {
      clase: this.claseNivelTarifaPipe.transform(nivel),
```

## PASO 13 — src/app/raiz/operaciones/tablero-op/tablero-op.component.ts

BUSCAR (8 líneas):

```
   *  dos badges — cliente primero, chofer después — cuando difieren (caso
   *  real posible en General/Especial). */
  getTarifaBadges(op: Operacion): { clase: string; etiqueta: string }[] {
    const nivelCliente = this.nivelLado(op, 'cliente');
    const nivelChofer = this.nivelLado(op, 'chofer');

    if (nivelCliente === nivelChofer) {
      return [this.badgeDeNivel(nivelCliente)];
```

REEMPLAZAR por (8 líneas):

```
   *  dos badges — cliente primero, chofer después — cuando difieren (caso
   *  real posible en General/Especial). */
  getTarifaBadges(op: Operacion): { clase: string; etiqueta: string }[] {
    const nivelCliente = nivelLadoOp(op, 'cliente');
    const nivelChofer = nivelLadoOp(op, 'chofer');

    if (nivelCliente === nivelChofer) {
      return [this.badgeDeNivel(nivelCliente)];
```

## Verificación

1. Hashes resultantes:
   - `git hash-object src/app/interfaces/tarifa-habilitada.ts` → `b330fdc941756e76eb4e1ddbc998bb73b42dfea3`
   - `git hash-object src/app/shared/utils/nivel-tarifa-op.util.ts` → `18ba914a01ab8e465460361ee6472b3f067498a9`
   - `git hash-object src/app/shared/pipes/etiqueta-nivel-tarifa.pipe.ts` → `4b084a8c2b7bc72c66ddf8eb083500bd584d01ca`
   - `git hash-object src/app/shared/utils/documento-operaciones.util.ts` → `a972853bf1e529a0820efaea76567ffdb00ce70b`
   - `git hash-object src/app/raiz/operaciones/tablero-op/tablero-op.component.ts` → `ed6326ed668d07e273678c5138ccc374534b43e8`
2. `git status --short` → los cuatro editados con `M` y `?? src/app/shared/utils/nivel-tarifa-op.util.ts`.
   `git diff --numstat` → exactamente estas cuatro líneas (en cualquier orden):
   ```
   6	2	src/app/interfaces/tarifa-habilitada.ts
   3	17	src/app/raiz/operaciones/tablero-op/tablero-op.component.ts
   4	7	src/app/shared/pipes/etiqueta-nivel-tarifa.pipe.ts
   29	6	src/app/shared/utils/documento-operaciones.util.ts
   ```
3. La regla del nivel queda en UN solo lugar:
   - `grep -rn "if (op.datosTarifaEventual !== null) return 'eventual';" src/ | wc -l` → `1`
     (solo el util nuevo; antes estaba también en el tablero)
   - `grep -c "private nivelLado" src/app/raiz/operaciones/tablero-op/tablero-op.component.ts` → `0` (el método privado se fue)
   - `grep -rn "nivelLadoOp(" src/ | cut -d: -f1 | sort | uniq -c` → `2` en
     `tablero-op.component.ts` (los dos lados de `getTarifaBadges`) y `4` en
     `nivel-tarifa-op.util.ts` (la definición y los tres usos internos)
4. El pipe delega y nadie más define la etiqueta:
   - `grep -c "etiquetaNivelTarifa(nivel)" src/app/shared/pipes/etiqueta-nivel-tarifa.pipe.ts` → `1`
   - `grep -c "case 'personalizada': return 'Personalizada';" src/app/shared/pipes/etiqueta-nivel-tarifa.pipe.ts` → `0`
   - `grep -rln "return 'Sin resolver';" src/` → solo `src/app/shared/utils/nivel-tarifa-op.util.ts`
5. El informe:
   - `grep -c "col('Nivel', 'texto', 13)" src/app/shared/utils/documento-operaciones.util.ts` → `1`
   - `grep -c "col('Tarifa', 'texto', 22)" src/app/shared/utils/documento-operaciones.util.ts` → `1`
   - `grep -c "excel: { nombre: 'Operaciones' }" src/app/shared/utils/documento-operaciones.util.ts` → `1`
   - `grep -c "const INDICES_TOTAL = \[" src/app/shared/utils/documento-operaciones.util.ts` → `0` (ya no son índices a mano)
6. `ORDEN_NIVELES` sale del módulo y lo usa solo el util nuevo:
   `grep -rln "ORDEN_NIVELES" src/` → exactamente DOS archivos,
   `interfaces/tarifa-habilitada.ts` (declaración y uso en `nivelesHabilitados`) y
   `shared/utils/nivel-tarifa-op.util.ts`.
7. `npx tsc -p tsconfig.app.json --noEmit` → sin errores.
8. `npx tsc -p tsconfig.app.json --noEmit --noUnusedLocals` → solo el error preexistente de
   `appVersion` en `app.component.ts`.
9. `npm run build:demo` → OK, 9 advertencias, inicial 1,53 MB (347,56 kB transferidos).

## Pruebas manuales en demo (las hago yo)

Acá sí hay algo que mirar, y el lugar para mirarlo es Excel, no la pantalla. Con rol dev,
admin o user, en Operaciones → Tablero de operaciones → "Descargar Op":

1. **Que sea una Tabla:** al hacer clic en cualquier celda, Excel muestra la pestaña
   "Diseño de tabla" y el nombre `Operaciones`. El encabezado queda fijo al bajar.
2. **Filtro por columna:** cada encabezado tiene su flecha. Filtrar por Cliente, por Chofer
   y por **Tarifa** (el pedido original) y por Nivel.
3. **El total sigue al filtro:** con un filtro puesto, la fila de totales tiene que
   RECALCULAR (es un SUBTOTAL, no una suma fija). Lo mismo al ocultar filas a mano. Sin
   filtro, el total tiene que coincidir con el del tablero.
4. **Ordenar por columna** desde la misma flecha, y ocultar columnas que no te interesen.
5. **Nivel y Tarifa, contra la realidad:** elegí una operación con tarifa Especial de un
   lado y General del otro y confirmá que la fila dice `Especial` y el nombre de la
   especial. Una eventual tiene que decir `Eventual` con Tarifa vacía. Una operación vieja
   sin tarifa resuelta, `Sin resolver`.
6. **Operación sin valores:** si aparece alguna sin `valoresNuevos`, sus 10 montos tienen
   que quedar en celdas VACÍAS (no "—"), y la columna de monto tiene que seguir filtrando y
   sumando como número.
7. **La pantalla no cambió:** los badges de tarifa del tablero siguen mostrándose igual
   (uno, o dos cuando los lados difieren).
8. **El pipe no se rompió en ninguna otra pantalla:** mirá el badge de nivel en el detalle
   de un InformeOp, en el listado de InformeOp (Liquidación) y en la ficha de una entidad →
   pestaña Tarifas. Tienen que decir lo mismo que antes.

## Mensaje de commit

```
IE2b (informes): el informe de operaciones como Tabla de Excel, con Nivel y Tarifa

- documento-operaciones: la tabla declara excel.nombre 'Operaciones', asi que
  la hoja sale como Tabla de Excel real (filtro por columna, ordenamiento,
  ocultar filas/columnas y fila de totales por SUBTOTAL que sigue al filtro).
- Dos columnas nuevas, UNA por operacion y no una por lado: Nivel (el nivel de
  tarifa aplicado) y Tarifa (el nombre de la tarifa). Cuando los dos lados
  difieren --unico caso real: General en uno y Especial en el otro-- gana el de
  mayor jerarquia, con el orden que el proyecto ya tenia en ORDEN_NIVELES. Un
  lado sin resolver pierde; los dos sin resolver dan "Sin resolver". En las
  eventuales no hay documento de tarifa, asi que Tarifa queda vacia.
- INDICES_TOTAL se deriva de COLUMNAS (Km + las de tipo moneda) en vez de ser
  indices fijos: insertar columnas en el medio corria los indices y la fila de
  totales habria sumado las columnas equivocadas sin que tsc avisara.
- nivel-tarifa-op.util.ts (nuevo): nivelLadoOp (movido tal cual desde
  TableroOpComponent.nivelLado, que ahora delega), nivelTarifaOp y refTarifaOp
  (la jerarquia) y etiquetaNivelTarifa, que el pipe del mismo nombre ahora
  llama en vez de tener el switch. claseNivelTarifa no se movio: una clase de
  Bootstrap es presentacion, no contenido de un documento.
- ORDEN_NIVELES pasa a exportarse (readonly) desde interfaces/tarifa-habilitada:
  al ser un orden por especificidad, es tambien la jerarquia para resolver el
  empate entre lados.
- La pantalla no cambia: getTarifaBadges sigue mostrando uno o dos badges.
```

FIN DE LA INSTRUCCIÓN IE2b
