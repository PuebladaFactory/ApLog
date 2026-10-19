Si no ves la línea FIN DE LA INSTRUCCIÓN IE1 al final, el texto llegó cortado: leé el archivo completo.

# IE1 — Informe de operaciones por el camino nuevo (al lado del viejo, sin switch)

## Contexto y razonamiento

Segundo bloque del frente "Informes Excel/PDF". Construye el camino NUEVO del informe de
operaciones (el del botón "Descargar Op" del tablero) **al lado del viejo, sin tocarlo**:
`ExcelService.generarInformeOperaciones` sigue existiendo y sigue siendo el que corre. El
switch del botón es el bloque siguiente (IE1b), chico y reversible.

Qué se agrega, siguiendo la encapsulación del frente (QUÉ ≠ CÓMO ≠ QUIÉN):

- **QUÉ** — `shared/utils/documento-operaciones.util.ts`: función PURA
  `armarLibroOperaciones(datos)` que recibe las operaciones ya resueltas y devuelve un
  `LibroTabular` de una hoja. Decide título, subtítulos, las 20 columnas tipadas, las
  filas con valores CRUDOS, la fila de totales y las notas. No sabe de Excel ni de PDF.
- **CÓMO** — ya existe: `ExcelTabularService.generarLibro`, que carga `exceljs` con
  `import()`.
- **QUIÉN** — `servicios/operaciones/operaciones-export.service.ts`:
  `OperacionesExportService.descargar(datos)`, única puerta para el componente. Igual que
  `ResumenOpExportService` / `ComisionesExportService` / `FinanzasExportService`.

Más dos utils compartidos que el informe necesita y que hoy están duplicados o privados:

- `shared/utils/estado-op.util.ts` → `etiquetaEstadoOp(estado)`. La etiqueta de estado
  ("Abierta", "Cerrada", "Liquidada", "Liq CL", "Liq CH", "Proforma CL", "Proforma CH",
  "Sin datos") vive hoy en el método privado `getEstadoLabel` de `tablero-op`. El informe
  la necesita, y dos copias divergen: se extrae tal cual y `getEstadoLabel` pasa a
  delegar. Sin cambio de comportamiento: es el MISMO árbol de `if`, en el mismo orden.
- `shared/utils/nombre-archivo.util.ts` → `sanearNombreArchivo(texto)`, copia exacta de la
  que hoy es privada en `documento-liq.util.ts`. **En este bloque `documento-liq.util.ts`
  NO se toca** (sigue con su copia privada): la consolidación va en IE2 como REEMPLAZO
  COMPLETO del archivo, porque el regex viejo usa un rango de caracteres combinantes
  literales (invisibles) y un BUSCAR sobre esa línea es frágil al copiar y pegar.
  `exportacion-finanzas.util.ts` también exporta una `sanearNombreArchivo`, con reglas
  distintas (conserva espacios, recorta a 120, cae en 'finanzas'): no se unifica para no
  cambiar los nombres de archivo de Finanzas. Queda anotado como deuda menor.

Decisiones ya tomadas que este bloque implementa (D5, D7 del diseño):

- Las **20 columnas** del informe viejo, en el mismo orden, con los mismos nombres, más
  **'Extra Cl' y 'Extra Ch'** (22 en total): el adicional extra de cada lado, que el
  informe viejo no mostraba aunque entraba en los totales. Van DENTRO del desglose de cada
  lado (tarifa base → adicional km → acompañante → extra → total), así las columnas suman
  el total.
- **Fecha como fecha real** (hoy sale como texto: el `numFmt dd/mm/yyyy` del informe viejo
  no se aplica porque el valor es el string 'YYYY-MM-DD').
- **Fila de totales** nueva: Km y las 8 columnas de monto.
- **Solo Excel** (20 columnas no entran legibles en un PDF).
- **Sin log** (es una consulta, mismo criterio que Reportes, Vendedores y Finanzas).
- El informe exporta **lo que se ve**: las operaciones llegan ya filtradas y ordenadas por
  la pantalla, y el orden del array es el orden del archivo. Eso lo cablea IE1b; acá la
  función pura solo deja claro el contrato. Ojo: "lo que se ve" aplica a las FILAS, no a
  las columnas — el informe lleva siempre las 20, no las que estén visibles en el tablero.

Detalles de criterio, para que no se relean como bugs:

- Los montos salen SIEMPRE de `valoresNuevos` (única fuente desde TC10), con la tarifa
  base multiplicada por el multiplicador de ese lado — igual que el informe viejo y que el
  InformeOp.
- Una operación sin `valoresNuevos` deja los 8 montos en `null`: el renderer dibuja "—" y
  la fila Total no la suma, en vez de mentir con ceros (el informe viejo escribía `null`
  en la celda, que en Excel queda vacía).
- `Total Cl` / `Total Ch` son `aCobrar` / `aPagar`. Con las columnas Extra, el desglose de
  cada lado SUMA el total: verificado sobre el .xlsx generado, incluidas una operación con
  multiplicador 2 y otra con multiplicador de chofer en 0.
- El extra que se exporta es `valoresNuevos.<lado>.adExtraValor` — la SALIDA que calculó el
  motor —, no la entrada `op.adExtra`. Importa: con multiplicador 0 el motor deja el lado
  entero en 0, y leer la entrada mostraría un extra que no se cobra. El CONCEPTO del extra
  (`op.adExtra.concepto`, uno por operación, compartido por los dos lados) no se exporta,
  solo los importes; si lo querés, es una columna de texto más.
- La columna Estado pasa a mostrar la etiqueta COMPLETA del tablero (incluye "Liq CL",
  "Proforma CH", etc.). El informe viejo solo distinguía Abierta / Cerrada / Liquidada.
  Es a propósito: el informe tiene que decir lo mismo que la pantalla.

Este bloque no cambia los chunks del build: nada importa todavía la fachada nueva, así que
el árbol compila igual. El efecto en el bundle (sacar `exceljs` de `/op`) se mide en IE1b.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Validá TODOS los BUSCAR antes de escribir el primero. Si uno no está o está repetido,
  detenete y avisá.
- Aplicá los pasos EN ORDEN. Editá en el lugar (leé el archivo antes de escribir).
- Archivos nuevos: con el contenido completo tal como está acá, en LF, sin agregar ni
  quitar líneas.
- No toques CLAUDE.md ni CHANGELOG.md: van en el bloque DOC de cierre del frente.
- No toques `ExcelService`, `PdfService`, `documento-liq.util.ts` ni
  `exportacion-finanzas.util.ts`.
- NO corras `npm run build`, `deploy:*` ni `node set-version.js`. Para compilar:
  `npm run build:demo` (línea base: 9 advertencias, inicial 1,53 MB).
- npm con `--legacy-peer-deps` (en este bloque no hace falta instalar nada).

## PASO 0 — verificación, sin modificar nada

Corré esto y mostrame la salida. Si algo no coincide, detenete y avisá:

1. `git rev-parse --abbrev-ref HEAD` → `refactor`.
2. `git hash-object src/app/raiz/operaciones/tablero-op/tablero-op.component.ts` →
   `6a35c5777d2ae767e5ad6b7d520b7aef814b3f5a`.
3. Los 4 archivos nuevos NO tienen que existir todavía:
   `ls src/app/shared/utils/nombre-archivo.util.ts src/app/shared/utils/estado-op.util.ts src/app/shared/utils/documento-operaciones.util.ts src/app/servicios/operaciones/operaciones-export.service.ts`
   → los 4 tienen que dar "No such file or directory".
4. `grep -rn "etiquetaEstadoOp\|armarLibroOperaciones\|OperacionesExportService" src/ | wc -l`
   → `0`.
5. Dependencias de solo lectura, tienen que estar como se espera:
   - `git hash-object src/app/interfaces/documento-tabular.ts` → `8e4ac83821624067d2b6b36da8ef26e4eb658ba5`
   - `git hash-object src/app/servicios/exportacion/excel-tabular.service.ts` → `c9dbbc7de7d25b9044ba855d0930e7de465caf21`
   - `git hash-object src/app/interfaces/operacion.ts` → `4dadd80d912bdf6481dd466056dac348deb43341`

## PASO 1 — ARCHIVO NUEVO: src/app/shared/utils/nombre-archivo.util.ts

```
/** Nombre de archivo de una descarga: sin acentos ni caracteres inválidos en
 *  Windows, espacios y separadores → '_', sin '_' repetidos ni en los bordes.
 *  Única definición para los documentos del camino nuevo (DocumentoTabular /
 *  LibroTabular); hasta este frente vivía privada en documento-liq.util.ts.
 *
 *  Ojo: `exportacion-finanzas.util.ts` exporta otra `sanearNombreArchivo` con
 *  reglas distintas (conserva los espacios como '_' pero no colapsa, recorta a
 *  120 caracteres y cae en 'finanzas' si queda vacío). No se unificó acá para
 *  no cambiar los nombres de archivo de Finanzas; queda como deuda menor. */
export function sanearNombreArchivo(texto: string): string {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}
```

## PASO 2 — ARCHIVO NUEVO: src/app/shared/utils/estado-op.util.ts

```
import { EstadoOp } from 'src/app/interfaces/operacion';

/** Etiqueta del estado de una operación. ÚNICA definición: la usan el tablero
 *  de operaciones (columna Estado y badge) y su informe Excel, para que no
 *  puedan divergir.
 *
 *  Orden de prioridad (no es el orden de los ejes de EstadoOp, es el de
 *  exhibición): proforma primero — la de CHOFER manda, porque bloquea los
 *  InformeOp del cliente (ver "Regla de bloqueo de proformas" en CLAUDE.md) —,
 *  después la liquidación (total o por lado) y por último el ciclo. */
export function etiquetaEstadoOp(e: EstadoOp): string {
  if (e.proforma.chofer) return 'Proforma CH';
  if (e.proforma.cliente) return 'Proforma CL';
  if (e.liquidacion.cliente && e.liquidacion.chofer) return 'Liquidada';
  if (e.liquidacion.cliente) return 'Liq CL';
  if (e.liquidacion.chofer) return 'Liq CH';
  if (e.ciclo === 'cerrada') return 'Cerrada';
  if (e.ciclo === 'abierta') return 'Abierta';
  return 'Sin datos';
}
```

## PASO 3 — ARCHIVO NUEVO: src/app/shared/utils/documento-operaciones.util.ts

```
import { ColumnaDoc, HojaDoc, LibroTabular, TablaDoc, ValorCeldaDoc } from 'src/app/interfaces/documento-tabular';
import { ConId } from 'src/app/interfaces/conId';
import { Operacion } from 'src/app/interfaces/operacion';
import { etiquetaEstadoOp } from './estado-op.util';
import { fechaLegible } from './fecha.util';
import { sanearNombreArchivo } from './nombre-archivo.util';

/** Lo que necesita el Excel del informe de operaciones. `operaciones` viene
 *  EXACTAMENTE como se ve en el tablero: ya filtrada y ordenada por la
 *  pantalla (el orden del array es el orden del archivo). `filtros` son los
 *  filtros activos en texto, para que el archivo se explique solo. */
export interface DatosLibroOperaciones {
  desde: string;   // 'YYYY-MM-DD'
  hasta: string;   // 'YYYY-MM-DD'
  operaciones: ConId<Operacion>[];
  filtros: string[];
}

/** Columnas del informe: las 20 del informe viejo
 *  (ExcelService.generarInformeOperaciones), en el mismo orden, más 'Extra Cl'
 *  y 'Extra Ch' — el adicional extra de la operación, que el informe viejo no
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
  col('Adic Km Cl', 'moneda', 13),
  col('Acomp Cl', 'moneda', 13),
  col('Extra Cl', 'moneda', 13),
  col('Total Cl', 'moneda', 15),

  col('Chofer', 'texto', 24),
  col('Proveedor', 'texto', 20),
  col('Patente', 'texto', 10),
  col('Categoria', 'texto', 16),
  col('Tarifa Base Ch', 'moneda', 14),
  col('Adic Km Ch', 'moneda', 13),
  col('Acomp Ch', 'moneda', 13),
  col('Extra Ch', 'moneda', 13),
  col('Total Ch', 'moneda', 15),

  col('Acompañante', 'texto', 12, 'centro'),
  col('Hoja Ruta', 'texto', 14),
  col('Observaciones', 'texto', 30),
];

/** Índices que se suman en la fila Total: Km y las 10 columnas de monto. */
const INDICES_TOTAL = [3, 5, 6, 7, 8, 9, 14, 15, 16, 17, 18];

/** QUÉ dice el Excel del informe de operaciones (puro: no lee Firestore ni
 *  cachés, todo sale de la Operacion y sus snapshots).
 *
 *  Los montos salen SIEMPRE de `valoresNuevos` (única fuente desde TC10), con
 *  la tarifa base multiplicada por el multiplicador de ese lado — igual que el
 *  informe viejo y que el InformeOp. El extra es `adExtraValor` del lado (la
 *  SALIDA que calculó el motor, no la entrada `op.adExtra`): con multiplicador
 *  0 el motor lo deja en 0, y así la columna coincide con el total. Una
 *  operación sin `valoresNuevos` (nunca debería pasar en el modelo nuevo) deja
 *  los 10 montos en null: el renderer dibuja "—" y la fila Total no la suma,
 *  en vez de mentir con ceros. */
export function armarLibroOperaciones(d: DatosLibroOperaciones): LibroTabular {
  const filas: ValorCeldaDoc[][] = d.operaciones.map(op => {
    const vn = op.valoresNuevos;
    return [
      etiquetaEstadoOp(op.estado),
      op.fecha,
      op.numeroOperacion,
      op.km,

      op.cliente.razonSocial,
      vn ? vn.cliente.tarifaBase * (op.multiplicadorCliente ?? 0) : null,
      vn ? vn.cliente.kmAdicional : null,
      vn ? vn.cliente.acompValor : null,
      vn ? (vn.cliente.adExtraValor ?? 0) : null,
      vn ? vn.cliente.aCobrar : null,

      `${op.chofer.apellido} ${op.chofer.nombre}`,
      op.proveedor?.razonSocial ?? 'No',
      op.vehiculo.dominio,
      op.vehiculo.categoria?.nombre ?? 'Sin categoría',
      vn ? vn.chofer.tarifaBase * (op.multiplicadorChofer ?? 0) : null,
      vn ? vn.chofer.kmAdicional : null,
      vn ? vn.chofer.acompValor : null,
      vn ? (vn.chofer.adExtraValor ?? 0) : null,
      vn ? vn.chofer.aPagar : null,

      op.acompaniante ? 'Sí' : 'No',
      op.hojaRuta ?? '',
      op.observaciones ?? '',
    ];
  });

  const tabla: TablaDoc = {
    titulo: null,
    grupos: [],
    columnas: COLUMNAS,
    filas,
    filaTotal: filas.length > 0 ? filaTotal(filas) : null,
  };

  const hoja: HojaDoc = {
    nombre: 'Operaciones',
    titulo: 'Informe de Operaciones',
    subtitulos: [
      `Desde ${fechaLegible(d.desde, '—')} hasta ${fechaLegible(d.hasta, '—')} · ${d.operaciones.length} operación(es)`,
      ...(d.filtros.length > 0 ? [`Filtros: ${d.filtros.join(' · ')}`] : []),
    ],
    tablas: [tabla],
    notas: [
      'Montos por lado desde los valores de la operación: Total = tarifa base (por el multiplicador del lado) + adicional por km + acompañante + extra.',
      'Extra Cl / Extra Ch: adicional extra cargado al cerrar o al editar el InformeOp. El concepto no se exporta, solo el importe de cada lado.',
      'Totales: suma de las filas exportadas (las que se ven en el tablero con los filtros aplicados).',
    ],
  };

  return {
    nombreArchivo: sanearNombreArchivo(`Operaciones_${d.desde}_${d.hasta}`),
    hojas: [hoja],
  };
}

function col(
  etiqueta: string,
  tipo: ColumnaDoc['tipo'],
  ancho: number,
  alineacion?: ColumnaDoc['alineacion'],
): ColumnaDoc {
  return alineacion ? { etiqueta, tipo, ancho, alineacion } : { etiqueta, tipo, ancho };
}

/** Fila de totales: la etiqueta en la primera columna, la suma en Km y en las
 *  10 columnas de monto, null (→ "—") en el resto. */
function filaTotal(filas: ValorCeldaDoc[][]): ValorCeldaDoc[] {
  return COLUMNAS.map((_, i) => {
    if (i === 0) return `Total (${filas.length})`;
    if (!INDICES_TOTAL.includes(i)) return null;
    const suma = filas.reduce((acc, f) => acc + (typeof f[i] === 'number' ? (f[i] as number) : 0), 0);
    return Math.round(suma * 100) / 100;
  });
}
```

## PASO 4 — ARCHIVO NUEVO: src/app/servicios/operaciones/operaciones-export.service.ts

```
import { Injectable, inject } from '@angular/core';
import * as FileSaver from 'file-saver';
import { ExcelTabularService } from 'src/app/servicios/exportacion/excel-tabular.service';
import { DatosLibroOperaciones, armarLibroOperaciones } from 'src/app/shared/utils/documento-operaciones.util';

/** Excel del informe de operaciones — la ÚNICA puerta que usa el tablero.
 *  QUÉ dice el documento: armarLibroOperaciones (puro). CÓMO se ve: el
 *  renderer genérico ExcelTabularService.generarLibro, que carga exceljs con
 *  import() (se descarga recién al exportar).
 *
 *  Solo Excel: son 20 columnas, no entran legibles en un PDF (decisión D5 del
 *  frente). Sin log: es una consulta, mismo criterio que Reportes, Vendedores
 *  y Finanzas (decisión D7). */
@Injectable({ providedIn: 'root' })
export class OperacionesExportService {

  private excel = inject(ExcelTabularService);

  async descargar(datos: DatosLibroOperaciones): Promise<void> {
    const libro = armarLibroOperaciones(datos);
    const blob = await this.excel.generarLibro(libro);
    FileSaver.saveAs(blob, `${libro.nombreArchivo}.xlsx`);
  }
}
```

## PASO 5 — src/app/raiz/operaciones/tablero-op/tablero-op.component.ts

BUSCAR (2 líneas):

```
import { EtiquetaNivelTarifaPipe } from 'src/app/shared/pipes/etiqueta-nivel-tarifa.pipe';
import { ClaseNivelTarifaPipe } from 'src/app/shared/pipes/clase-nivel-tarifa.pipe';
```

REEMPLAZAR por (3 líneas):

```
import { EtiquetaNivelTarifaPipe } from 'src/app/shared/pipes/etiqueta-nivel-tarifa.pipe';
import { ClaseNivelTarifaPipe } from 'src/app/shared/pipes/clase-nivel-tarifa.pipe';
import { etiquetaEstadoOp } from 'src/app/shared/utils/estado-op.util';
```

## PASO 6 — src/app/raiz/operaciones/tablero-op/tablero-op.component.ts

BUSCAR (10 líneas):

```
  private getEstadoLabel(e: EstadoOp): string {
    if (e.proforma.chofer)  return 'Proforma CH';
    if (e.proforma.cliente) return 'Proforma CL';
    if (e.liquidacion.cliente && e.liquidacion.chofer) return 'Liquidada';
    if (e.liquidacion.cliente) return 'Liq CL';
    if (e.liquidacion.chofer)  return 'Liq CH';
    if (e.ciclo === 'cerrada') return 'Cerrada';
    if (e.ciclo === 'abierta') return 'Abierta';
    return 'Sin datos';
  }
```

REEMPLAZAR por (4 líneas):

```
  private getEstadoLabel(e: EstadoOp): string {
    // Única definición, compartida con el informe Excel (estado-op.util).
    return etiquetaEstadoOp(e);
  }
```

## Verificación

1. Los 4 archivos nuevos existen con estos hashes exactos:
   - `git hash-object src/app/shared/utils/nombre-archivo.util.ts` → `eb8c9ff4653073eeea173ae5aa67475b15e1df69`
   - `git hash-object src/app/shared/utils/estado-op.util.ts` → `cb41078b54547f7b56d9088b6359cf21d73bb68e`
   - `git hash-object src/app/shared/utils/documento-operaciones.util.ts` → `72be7c103cb0771bb5bbd6ccf592e116c658d42c`
   - `git hash-object src/app/servicios/operaciones/operaciones-export.service.ts` → `ea4321308ebb007c49c4990a13ae397815bfcb04`
   Si alguno no coincide, lo más probable es un final de línea CRLF o un espacio final:
   revisá con `file <archivo>` (tiene que decir solo "UTF-8 text", sin "CRLF").
2. `git hash-object src/app/raiz/operaciones/tablero-op/tablero-op.component.ts` →
   `f477ddcc448f7e7cb424d86c93adb4a66aefcba7`.
3. `git diff --numstat` → exactamente una línea:
   `3	8	src/app/raiz/operaciones/tablero-op/tablero-op.component.ts`
   (los 4 archivos nuevos aparecen aparte en `git status --short` como `??`).
4. `grep -rn "generarInformeOperaciones" src/ | wc -l` → `2` (el método viejo y su único
   caller en `tablero-op`, los dos intactos: este bloque no hace el switch).
5. `npx tsc -p tsconfig.app.json --noEmit` → sin errores.
6. `npx tsc -p tsconfig.app.json --noEmit --noUnusedLocals` → el único error esperado sigue
   siendo el preexistente de `appVersion` en `app.component.ts`. Nada en los archivos
   nuevos ni en `tablero-op`.
7. `npm run build:demo` → OK, las mismas 9 advertencias e inicial 1,53 MB. Los chunks NO
   cambian respecto de IE0: todavía nada importa la fachada nueva (el efecto en el bundle
   llega con el switch, en IE1b).

## Pruebas manuales en demo (las hago yo)

- Operaciones → Tablero de operaciones: la columna **Estado** y sus badges tienen que
  verse EXACTAMENTE igual que antes, en los 7 valores posibles (Abierta, Cerrada,
  Liquidada, Liq CL, Liq CH, Proforma CL, Proforma CH). Es el único cambio visible del
  bloque, y tiene que ser invisible.
- El botón "Descargar Op" sigue bajando el Excel VIEJO, igual que siempre (el switch es el
  bloque que viene).

## Mensaje de commit

```
IE1 (informes): informe de operaciones por el camino nuevo, al lado del viejo

- documento-operaciones.util.ts (NUEVO, puro): armarLibroOperaciones ->
  LibroTabular de una hoja con las 20 columnas del informe viejo mas Extra Cl y
  Extra Ch (22), fecha como fecha real, montos crudos desde valoresNuevos
  (tarifa base x multiplicador, extra desde adExtraValor) y fila de totales
  (Km + las 10 columnas de monto). Con las columnas Extra el desglose de cada
  lado suma el total. Sin valoresNuevos: montos en null ("—") y fuera de los
  totales.
- operaciones-export.service.ts (NUEVO): OperacionesExportService.descargar,
  unica puerta del componente; dibuja con ExcelTabularService.generarLibro
  (exceljs con import() dinamico). Solo Excel, sin log (D5/D7 del frente).
- estado-op.util.ts (NUEVO): etiquetaEstadoOp extraida de tablero-op
  (getEstadoLabel ahora delega) — una sola definicion para la pantalla y el
  informe.
- nombre-archivo.util.ts (NUEVO): sanearNombreArchivo compartida. documento-liq
  conserva su copia privada hasta IE2 (consolidacion con reemplazo completo).
- Sin switch: ExcelService.generarInformeOperaciones y su caller en tablero-op
  quedan intactos. Chunks del build sin cambios.
```

FIN DE LA INSTRUCCIÓN IE1
