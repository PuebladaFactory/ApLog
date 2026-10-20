Si no ves la línea FIN DE LA INSTRUCCIÓN AS1 al final, el texto llegó cortado: leé el archivo completo.

# AS1 — el informe del tablero de asignaciones

## Contexto y razonamiento

Repone el informe del tablero de asignaciones, que IE4 retiró porque el botón estaba
inerte desde el switch al modelo nuevo (D6). No es el informe viejo: ese era un LAYOUT
—matriz de clientes con celdas pintadas por categoría, notas de celda, bloques laterales y
una hoja oculta para un ida y vuelta por Excel que nunca se cableó— y `LibroTabular` no
tiene relleno por celda, ni notas, ni celdas combinadas. Se escribe de cero como dos
tablas, que es lo que el modelo nuevo da mejor que el viejo.

**Dos hojas, las dos Tabla de Excel** (informes de TRABAJO: se filtran y se ordenan), sin
fila de totales porque no hay nada numérico que sumar:

1. **Asignaciones** — una fila por asignación: Cliente · Categoría · Dominio · Chofer ·
   Proveedor · Observación · Hoja de ruta · Estado · Motivo anulación.
2. **No disponibles** — una fila por chofer no disponible Y VEHÍCULO: Chofer · Dominio ·
   Categoría · Desde · Hasta · Motivo.

Con eso el archivo responde las tres preguntas del día: con qué clientes se trabajó, qué
se mandó, y con qué choferes no se contaba.

### Decisiones que vale la pena justificar

- **Chofer y Proveedor en columnas separadas**, en vez de "Asignado a" + "Tipo": así se
  filtra por proveedor, y "qué choferes mandé" se lee en una sola columna. Son
  excluyentes: en un item de chofer directo, Proveedor queda vacía; en uno de proveedor,
  Chofer queda vacía hasta que se elige el chofer al dar de alta.
- **Estado y Motivo anulación también separadas**, por la lección de IE2b: un
  "Anulada: el cliente canceló" sería un valor distinto de "Anulada" para el filtro de la
  Tabla, y la columna dejaría de servir.
- **NO hay columna de operación.** `AsignacionItem.idOperacion` guarda el document id de
  Firestore (`altaDesdeAsignacion` le asigna `db.generarId('operaciones')`), no el número
  visible, que es `Operacion.numeroOperacion`. Esa columna habría impreso un id de 20
  caracteres, y resolver el número pediría leer cada operación.
- **Una fila por chofer Y vehículo en la hoja 2.** Un chofer con dos camiones aparece dos
  veces; uno sin vehículos propios aparece igual, con Dominio y Categoría vacías. Es lo
  que permite filtrar por categoría: con los vehículos en renglones dentro de una celda no
  se podría.
- **`Hasta` sin valor queda VACÍA en el Excel** (y "—" en el PDF): un guión en una columna
  de fecha la vuelve de texto y rompe el filtro y el orden. Es la regla de `valorParaTabla`
  de IE2.
- **Excel y PDF.** A diferencia del informe de operaciones (22 columnas, decisión D5), acá
  son 9 y 6: entra legible en PDF y el tablero del día se imprime. Sin log, mismo criterio
  que el resto de los informes del frente (D7).

### El permiso es nuevo, y no es `descargarTablero`

`operaciones.descargarTablero` ya NO es de este tablero: hasta IE1b gobernaba el botón
inerte de acá, pero desde IE1b gobierna la descarga real del tablero de OPERACIONES, y en
IE2c la dejamos en dev/admin. Si este botón reusara esa clave, `user` no podría usarlo — y
el tablero de asignaciones es la pantalla principal del único empleado activo.

Por eso va `descargarAsignaciones` propia, con override `{ demo: false }`. Ojo al detalle:
**no hace falta `user: true`**, porque `descargarAsignaciones` mapea a `leer` y `leer` en
`operaciones` ya da `user = true`; lo único que hay que apartarse de la matriz es bajar a
`demo`. Resultado: dev/admin/user sí, demo y manager no.

### La regla de no-disponibilidad queda en un solo lugar

Estaba escrita **cuatro veces**: el par `calcularChoferesNoOperativosPorFecha` +
`getMotivoNoDisponibilidad`, duplicado en `TableroAsignacionesComponent` y en
`CargaAsignacionComponent`, y en cada par con dos implementaciones distintas (la primera
comparaba con `new Date(f + 'T00:00:00')`, la segunda los strings). Las cuatro daban bien,
pero el informe habría sido la quinta.

Va a `no-disponibilidad.util.ts` comparando strings, que es la convención del proyecto, y
**los dos** componentes delegan. `getMotivoNoDisponibilidad` conserva su `|| 'No disponible'`
en cada caller —y en `carga-asignacion`, también su guard de fecha vacía—, así que el
comportamiento de las dos pantallas no cambia en ningún caso.

`carga-asignacion` no tiene nada que ver con el informe: entra porque dejar ahí la cuarta
copia, después de escribir "única definición" en el JSDoc del util, sería dejar un
comentario que miente — que es justo lo que IEDOC vino a corregir en otro lado.

**Alcance del modelo, que el informe deja dicho en una nota:** la no-disponibilidad es solo
de choferes. No se puede marcar un proveedor ni un vehículo suelto — es el rediseño
pendiente anotado en "Deuda — no-disponibilidad y tablero". Sin esa nota, la hoja 2 se lee
como "nadie más faltó".

### Medición del bundle (la hice antes de entregarte esto)

La fachada inyecta los DOS renderers, así que el riesgo real era volver a meter `exceljs` o
`jspdf` en el chunk de `/op` y deshacer lo que logró IE1b. No pasa: los renderers cargan
sus librerías con `import()`. Medido sobre el build, los chunks `887` (exceljs), `107`
(jspdf) y `747` (autotable) **no los pide ninguna de las cinco rutas**. El único costo es
el código nuevo: el chunk de `operaciones` pasa de 200,00 a 214,17 kB. El inicial no se
mueve (1,53 MB).

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Los tres archivos del PASO 1 al 3 son NUEVOS: creálos completos, tal cual, en LF. Si
  alguno ya existe, detenete y avisá.
- Validá TODOS los BUSCAR de los PASOS 4 a 9 antes de escribir el primero. Si alguno no
  está o está repetido, detenete y avisá.
- Aplicá los pasos EN ORDEN. Editá en el lugar; LF; ninguna línea nueva lleva espacios al
  final.
- **No toques el `.scss` del tablero**: `.boton-descargar` ya existe ahí (IE4 borró el
  botón pero no su estilo), así que el botón vuelve con su formato original sin tocar una
  línea de estilos.
- No toques CLAUDE.md ni CHANGELOG.md: van en el bloque DOC de cierre.
- NO corras `npm run build`, `deploy:*` ni `node set-version.js`. Para compilar:
  `npm run build:demo` (línea base: 9 advertencias, inicial 1,53 MB).
- npm con `--legacy-peer-deps` (en este bloque no hace falta instalar nada).

## PASO 0 — verificación, sin modificar nada

Los hashes están en el Anexo del archivo de la instrucción
(`instruccion-as1-asignaciones.md`), generados con `git`. Usá esa lista.

1. `git rev-parse --abbrev-ref HEAD` → `refactor`; `git log --oneline -1` → el commit del
   fix de Municipio Operativo (`8aa4712e`).
2. `git status --short` → vacío.
3. Los seis archivos a modificar, con su hash de partida (lista del Anexo).
4. Los tres archivos nuevos NO existen todavía:
   `ls src/app/shared/utils/no-disponibilidad.util.ts src/app/shared/utils/documento-asignaciones.util.ts src/app/servicios/operaciones/asignaciones-export.service.ts`
   → los tres dan "No such file or directory".
5. El estilo del botón sigue ahí, de antes de IE4:
   `grep -c "boton-descargar" src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.scss`
   → `2` (la regla y su `:hover`).
6. La regla que este bloque unifica todavía está repetida en los DOS componentes:
   - `grep -c "T00:00:00" src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.ts` → `3`
   - `grep -c "T00:00:00" src/app/raiz/operaciones/carga-asignacion/carga-asignacion.component.ts` → `3`
   - `grep -rn "fecha >= nd.desde\|fecha >= n.desde" src/app/ --include=*.ts | wc -l` → `2`

## PASO 1 — ARCHIVO NUEVO: src/app/shared/utils/no-disponibilidad.util.ts

```
import { NoDisponibilidadChofer } from 'src/app/interfaces/no-disponibilidad-chofer';
import { FechaNegocio } from './fecha.util';

/** Reglas de no-disponibilidad de choferes. Única definición: la usan el
 *  tablero de asignaciones (para atenuar los vehículos del pool y mostrar el
 *  motivo) y el informe del tablero.
 *
 *  Antes la misma regla estaba escrita CUATRO veces: el par
 *  `calcularChoferesNoOperativosPorFecha` + `getMotivoNoDisponibilidad`,
 *  duplicado en TableroAsignacionesComponent y en CargaAsignacionComponent, y
 *  en cada par con dos implementaciones distintas (el primero comparaba con
 *  `new Date(fecha + 'T00:00:00')`, el segundo los strings). Las cuatro daban
 *  bien, pero el informe habría sido la quinta.
 *
 *  Se compara como STRING, que es la convención del proyecto para las fechas de
 *  negocio: 'YYYY-MM-DD' ordena lexicográficamente igual que cronológicamente,
 *  sin construir ningún Date ni depender del huso.
 *
 *  OJO — alcance del modelo actual: la no-disponibilidad es SOLO de choferes
 *  (`idChofer`). No existe para un proveedor ni para un vehículo suelto; eso es
 *  el rediseño pendiente anotado en CLAUDE.md ("Deuda — no-disponibilidad y
 *  tablero"). `activa` no se chequea acá: quien provee la lista ya la filtra
 *  (el tablero lo hace al suscribirse). */

/** ¿Esta no-disponibilidad cubre la fecha dada? `hasta` null = sin fin. */
export function cubreFecha(nd: NoDisponibilidadChofer, fecha: FechaNegocio): boolean {
  return fecha >= nd.desde && (!nd.hasta || fecha <= nd.hasta);
}

/** Las no-disponibilidades que cubren la fecha, en el orden recibido. */
export function noDisponibilidadesEnFecha(
  lista: NoDisponibilidadChofer[],
  fecha: FechaNegocio,
): NoDisponibilidadChofer[] {
  return lista.filter(nd => cubreFecha(nd, fecha));
}

/** Ids de los choferes no operativos en la fecha. */
export function choferesNoOperativos(
  lista: NoDisponibilidadChofer[],
  fecha: FechaNegocio,
): Set<string> {
  return new Set(noDisponibilidadesEnFecha(lista, fecha).map(nd => nd.idChofer));
}

/** Texto del motivo. `motivo` es opcional en el modelo: cuando falta, el texto
 *  por defecto es el que ya mostraba el tablero. */
export function motivoNoDisponibilidad(nd: NoDisponibilidadChofer): string {
  return nd.motivo || 'No disponible';
}

/** Motivo del chofer en la fecha; '' si ese día estaba disponible. */
export function motivoNoDisponibilidadDe(
  lista: NoDisponibilidadChofer[],
  idChofer: string,
  fecha: FechaNegocio,
): string {
  const nd = lista.find(n => n.idChofer === idChofer && cubreFecha(n, fecha));
  return nd ? motivoNoDisponibilidad(nd) : '';
}
```

(60 líneas, LF)

## PASO 2 — ARCHIVO NUEVO: src/app/shared/utils/documento-asignaciones.util.ts

```
import { ColumnaDoc, HojaDoc, LibroTabular, TablaDoc, ValorCeldaDoc } from 'src/app/interfaces/documento-tabular';
import { AsignacionItem } from 'src/app/interfaces/asignacion';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { ConIdType } from 'src/app/interfaces/conId';
import { NoDisponibilidadChofer } from 'src/app/interfaces/no-disponibilidad-chofer';
import { fechaLegible } from './fecha.util';
import { motivoNoDisponibilidad, noDisponibilidadesEnFecha } from './no-disponibilidad.util';
import { sanearNombreArchivo } from './nombre-archivo.util';

/** Lo que necesita el informe del tablero de asignaciones. `items` viene
 *  EXACTAMENTE como está en pantalla (el borrador en modo edición, el tablero
 *  confirmado en modo visor): el orden del array es el orden del archivo.
 *
 *  `clientes` resuelve la razón social de `item.idCliente` sin que el util
 *  conozca ningún servicio. `choferes` resuelve el nombre del chofer de un
 *  item de proveedor (`sujeto.idChofer`, que se elige después de asignar) y el
 *  de cada no-disponibilidad. `vehiculosPorChofer` sale de
 *  `agruparVehiculosPorDuenio` (la misma función pura que usan los listados). */
export interface DatosLibroAsignaciones {
  fecha: string;                    // 'YYYY-MM-DD' del tablero
  estado: 'borrador' | 'confirmado';
  items: AsignacionItem[];
  clientes: { id: string; razonSocial: string }[];
  /** Activas; el tablero las filtra al suscribirse. */
  noDisponibilidades: NoDisponibilidadChofer[];
  choferes: ConIdType<Chofer>[];
  vehiculosPorChofer: Readonly<Record<string, Vehiculo[]>>;
}

/** Hoja 1 — una fila por asignación.
 *
 *  `Chofer` y `Proveedor` en columnas SEPARADAS en vez de un "Asignado a" +
 *  "Tipo": así se filtra por proveedor, y la pregunta que el informe tiene que
 *  responder ("qué choferes mandé") se lee en una sola columna. En un item de
 *  chofer directo, Proveedor queda vacía; en uno de proveedor, Chofer queda
 *  vacía hasta que se resuelve en operaciones-editor.
 *
 *  `Estado` y `Motivo anulación` también separadas, por la lección de IE2b: un
 *  "Anulada: el cliente canceló" sería un valor distinto de "Anulada" para el
 *  filtro de la Tabla, y la columna dejaría de servir para filtrar.
 *
 *  NO hay columna de operación: `AsignacionItem.idOperacion` guarda el
 *  document id de Firestore, no el número de operación (ese es
 *  `Operacion.numeroOperacion`), y resolverlo pediría leer cada operación. */
const COLUMNAS_ASIGNACIONES: ColumnaDoc[] = [
  col('Cliente', 'texto', 28),
  col('Categoría', 'texto', 14),
  col('Dominio', 'texto', 11),
  col('Chofer', 'texto', 24),
  col('Proveedor', 'texto', 24),
  col('Observación', 'texto', 30),
  col('Hoja de ruta', 'texto', 24),
  col('Estado', 'texto', 10),
  col('Motivo anulación', 'texto', 26),
];

/** Hoja 2 — una fila por chofer no disponible Y VEHÍCULO. Un chofer con dos
 *  camiones aparece dos veces; uno sin vehículos aparece igual, con Dominio y
 *  Categoría vacías. Es lo que permite filtrar por categoría: con los
 *  vehículos en renglones dentro de una celda no se podría. */
const COLUMNAS_NO_DISPONIBLES: ColumnaDoc[] = [
  col('Chofer', 'texto', 24),
  col('Dominio', 'texto', 11),
  col('Categoría', 'texto', 14),
  col('Desde', 'fecha', 12),
  col('Hasta', 'fecha', 12),
  col('Motivo', 'texto', 28),
];

/** QUÉ dice el informe del tablero de asignaciones de UNA fecha: las
 *  asignaciones del día y los choferes que ese día no estaban disponibles. Las
 *  dos hojas son Tabla de Excel (informes de TRABAJO: se filtran y se ordenan)
 *  y ninguna lleva fila de totales — no hay columnas numéricas que sumar. */
export function armarLibroAsignaciones(d: DatosLibroAsignaciones): LibroTabular {
  const razonSocial = new Map(d.clientes.map(c => [c.id, c.razonSocial]));
  const nombresChofer = new Map(d.choferes.map(c => [c.id, nombreChofer(c)]));

  const filasAsignaciones = d.items.map(it => filaAsignacion(it, razonSocial, nombresChofer));
  const filasNoDisponibles = armarFilasNoDisponibles(d, nombresChofer);

  const etiquetaEstado = d.estado === 'borrador' ? 'Borrador (sin dar de alta)' : 'Confirmado';
  const activas = d.items.filter(it => it.estado.estado === 'activa').length;

  const hojaAsignaciones: HojaDoc = {
    nombre: 'Asignaciones',
    titulo: `Tablero de asignaciones — ${fechaLegible(d.fecha)}`,
    subtitulos: [
      `${etiquetaEstado} · ${plural(d.items.length, 'asignación', 'asignaciones')}` +
        (activas === d.items.length ? '' : ` (${activas} activas)`),
    ],
    tablas: [tabla('Asignaciones', COLUMNAS_ASIGNACIONES, filasAsignaciones)],
    notas: [
      'Las asignaciones salen del tablero tal como está en pantalla: el borrador en modo edición, el tablero confirmado en modo visor.',
      'Chofer y Proveedor son excluyentes: un vehículo de proveedor deja Chofer vacía hasta que se elige el chofer al dar de alta las operaciones.',
      'Un tablero confirmado conserva las asignaciones anuladas, para no perder el registro de lo que se asignó ese día.',
    ],
  };

  const hojaNoDisponibles: HojaDoc = {
    nombre: 'No disponibles',
    titulo: `Choferes no disponibles — ${fechaLegible(d.fecha)}`,
    subtitulos: [
      plural(filasNoDisponibles.length, 'registro', 'registros'),
    ],
    tablas: [tabla('NoDisponibles', COLUMNAS_NO_DISPONIBLES, filasNoDisponibles)],
    notas: [
      'Solo las no-disponibilidades vigentes en la fecha del tablero, no todas las cargadas.',
      'Una fila por chofer y vehículo: un chofer con dos vehículos aparece dos veces, y uno sin vehículos propios aparece con Dominio y Categoría vacías.',
      'Hasta sin valor (celda vacía en el Excel, "—" en el PDF) significa sin fecha de fin definida.',
      'La no-disponibilidad del sistema es solo de choferes: no se puede marcar como no disponible a un proveedor ni a un vehículo suelto.',
    ],
  };

  return {
    nombreArchivo: sanearNombreArchivo(`Asignaciones_${d.fecha}`),
    hojas: [hojaAsignaciones, hojaNoDisponibles],
  };
}

// ── internos ────────────────────────────────────────────────────────

/** Una hoja, una tabla, sin fila de totales y como Tabla de Excel real.
 *  `nombre` es el nombre del ListObject: único en el LIBRO y sin espacios. */
function tabla(nombre: string, columnas: ColumnaDoc[], filas: ValorCeldaDoc[][]): TablaDoc {
  return { titulo: null, grupos: [], columnas, filas, filaTotal: null, excel: { nombre } };
}

function filaAsignacion(
  it: AsignacionItem,
  razonSocial: Map<string, string>,
  nombresChofer: Map<string, string>,
): ValorCeldaDoc[] {
  const duenio = it.ref.asignadoA;
  // Chofer directo: el nombre congelado en el snapshot (verdad histórica del
  // tablero). De proveedor: el chofer que se eligió al dar de alta, resuelto
  // contra los choferes vivos; vacío mientras no se eligió.
  const chofer = duenio.tipo === 'chofer'
    ? `${duenio.apellido}, ${duenio.nombre}`
    : nombreChoferDeSujeto(it, nombresChofer);
  const proveedor = duenio.tipo === 'proveedor' ? duenio.razonSocial : '';
  // El estado se lee del discriminante, NO de si el motivo está vacío: una
  // anulación puede haberse guardado sin motivo, y ahí "Activa" sería falso.
  const anulada = it.estado.estado === 'anulada';
  const motivoAnulacion = it.estado.estado === 'anulada' ? it.estado.motivo : '';
  return [
    razonSocial.get(it.idCliente) ?? 'Sin resolver',
    it.ref.categoria.nombre ?? '',
    it.ref.dominio ?? '',
    chofer,
    proveedor,
    it.observacion ?? '',
    it.hojaDeRuta ?? '',
    anulada ? 'Anulada' : 'Activa',
    motivoAnulacion,
  ];
}

/** El chofer elegido para un item de proveedor. '' si todavía no se eligió;
 *  'Sin resolver' si se eligió uno que ya no está (dado de baja). */
function nombreChoferDeSujeto(it: AsignacionItem, nombresChofer: Map<string, string>): string {
  if (it.sujeto.tipo !== 'proveedor') return '';
  const id = it.sujeto.idChofer;
  if (!id) return '';
  return nombresChofer.get(id) ?? 'Sin resolver';
}

function armarFilasNoDisponibles(
  d: DatosLibroAsignaciones,
  nombresChofer: Map<string, string>,
): ValorCeldaDoc[][] {
  const filas: ValorCeldaDoc[][] = [];
  for (const nd of noDisponibilidadesEnFecha(d.noDisponibilidades, d.fecha)) {
    const nombre = nombresChofer.get(nd.idChofer) ?? 'Sin resolver';
    const motivo = motivoNoDisponibilidad(nd);
    const vehiculos = d.vehiculosPorChofer[nd.idChofer] ?? [];
    if (vehiculos.length === 0) {
      filas.push([nombre, '', '', nd.desde, nd.hasta, motivo]);
      continue;
    }
    for (const v of vehiculos) {
      filas.push([nombre, v.dominio ?? '', v.categoria?.nombre ?? '', nd.desde, nd.hasta, motivo]);
    }
  }
  return filas;
}

/** 'Apellido, Nombre' — el mismo formato que usa la celda del tablero. */
function nombreChofer(c: Chofer): string {
  return `${c.datosPersonales.apellido}, ${c.datosPersonales.nombre}`;
}

function plural(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

function col(
  etiqueta: string,
  tipo: ColumnaDoc['tipo'],
  ancho: number,
  alineacion?: ColumnaDoc['alineacion'],
): ColumnaDoc {
  return alineacion ? { etiqueta, tipo, ancho, alineacion } : { etiqueta, tipo, ancho };
}
```

(203 líneas, LF)

## PASO 3 — ARCHIVO NUEVO: src/app/servicios/operaciones/asignaciones-export.service.ts

```
import { Injectable, inject } from '@angular/core';
import * as FileSaver from 'file-saver';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ExcelTabularService } from 'src/app/servicios/exportacion/excel-tabular.service';
import { PdfTabularService } from 'src/app/servicios/exportacion/pdf-tabular.service';
import { DatosLibroAsignaciones, armarLibroAsignaciones } from 'src/app/shared/utils/documento-asignaciones.util';
import { agruparVehiculosPorDuenio } from 'src/app/shared/utils/documento-entidades.util';

/** Lo que el tablero sabe y la fachada no puede adivinar: la fecha, si está en
 *  borrador o confirmado, los items de pantalla y los clientes de las columnas.
 *  Los choferes y sus vehículos los resuelve la fachada desde memoria. */
export type DatosTableroAsignaciones =
  Omit<DatosLibroAsignaciones, 'choferes' | 'vehiculosPorChofer'>;

/** Excel y PDF del informe del tablero de asignaciones — la ÚNICA puerta que
 *  usa el tablero. QUÉ dice el documento: armarLibroAsignaciones (puro). CÓMO
 *  se ve: los renderers genéricos, que cargan exceljs / jsPDF con import() (se
 *  descargan recién al exportar).
 *
 *  Las dos hojas tienen 9 y 6 columnas, así que a diferencia del informe de
 *  operaciones (22 columnas, decisión D5 del frente Informes) también entra
 *  legible en PDF: el tablero del día se imprime.
 *
 *  Sin log: es una consulta, mismo criterio que Reportes, Vendedores, Finanzas
 *  y los otros informes del frente (decisión D7). */
@Injectable({ providedIn: 'root' })
export class AsignacionesExportService {

  private excel = inject(ExcelTabularService);
  private pdf = inject(PdfTabularService);
  private choferService = inject(ChoferService);

  async descargar(datos: DatosTableroAsignaciones, formato: 'excel' | 'pdf'): Promise<void> {
    const libro = armarLibroAsignaciones({
      ...datos,
      choferes: this.choferService.getChoferesActuales(),
      // La misma función pura que los listados de entidades (IE3).
      vehiculosPorChofer: agruparVehiculosPorDuenio(this.choferService.getVehiculosActuales(), 'chofer'),
    });
    const blob = formato === 'excel'
      ? await this.excel.generarLibro(libro)
      : await this.pdf.generarLibro(libro);
    FileSaver.saveAs(blob, `${libro.nombreArchivo}.${formato === 'excel' ? 'xlsx' : 'pdf'}`);
  }
}
```

(45 líneas, LF)

## PASO 4 — src/app/interfaces/permiso.ts (1 bloque)

### Bloque 1 de 1

BUSCAR (6 líneas):

```
  | 'cerrar'
  | 'liquidar'
  | 'descargarTablero'
  | 'descargarListado'
  | 'limpiarTablero'
  | 'revertir'
```

REEMPLAZAR por (7 líneas):

```
  | 'cerrar'
  | 'liquidar'
  | 'descargarTablero'
  | 'descargarAsignaciones'
  | 'descargarListado'
  | 'limpiarTablero'
  | 'revertir'
```

## PASO 5 — src/app/servicios/permisos/permisos.service.ts (2 bloques)

### Bloque 1 de 2

BUSCAR (8 líneas):

```
    // distinta de 'vincularFactura' (adjunta un archivo a un informe ya
    // existente en Facturación) y de 'anular'.
    liquidar: 'crear',
    // Exporta el tablero de asignaciones (excel), no escribe.
    descargarTablero: 'leer',
    // Exporta el listado de una entidad (Clientes/Choferes/Proveedores) a
    // Excel: lee lo que ya está en pantalla, no escribe.
    descargarListado: 'leer',
```

REEMPLAZAR por (16 líneas):

```
    // distinta de 'vincularFactura' (adjunta un archivo a un informe ya
    // existente en Facturación) y de 'anular'.
    liquidar: 'crear',
    // Exporta el informe del tablero de OPERACIONES (Excel), no escribe. El
    // comentario original decía "tablero de asignaciones": era correcto cuando
    // esta acción gobernaba el botón inerte de ese tablero, pero desde IE1b
    // gobierna la descarga real del tablero de operaciones.
    descargarTablero: 'leer',
    // Exporta el informe del tablero de ASIGNACIONES (Excel o PDF), no escribe.
    // Acción propia y no 'descargarTablero': son dos informes distintos, de dos
    // pantallas distintas, y el negocio los habilita a roles distintos (ver los
    // overrides).
    descargarAsignaciones: 'leer',
    // Exporta el listado de una entidad (Clientes/Choferes/Proveedores) a
    // Excel: lee lo que ya está en pantalla, no escribe.
    descargarListado: 'leer',
```

### Bloque 2 de 2

BUSCAR (6 líneas):

```
    // exige que conserve esta acción en su pantalla principal pese a no
    // tener 'eliminar' general en el módulo.
    'operaciones.limpiarTablero': { user: true },
    // Los tres listados de entidades (frente Informes, IE3b): 'descargarListado'
    // mapea a 'leer', y 'leer' en 'entidades' da user=true y demo=true — pero
    // bajar el listado completo de clientes, choferes o proveedores es una
```

REEMPLAZAR por (14 líneas):

```
    // exige que conserve esta acción en su pantalla principal pese a no
    // tener 'eliminar' general en el módulo.
    'operaciones.limpiarTablero': { user: true },
    // 'descargarAsignaciones' mapea a 'leer', que en 'operaciones' da
    // user=true y demo=true. Se baja demo (mismo criterio que el resto de las
    // descargas del frente Informes) y se CONSERVA user, a diferencia de
    // 'descargarTablero': el tablero de asignaciones es la pantalla principal
    // del único empleado activo y el informe es de su propio trabajo del día,
    // no el informe de administración del mes. Mismo razonamiento que
    // 'limpiarTablero', que también se aparta de la matriz por esta pantalla.
    'operaciones.descargarAsignaciones': { demo: false },
    // Los tres listados de entidades (frente Informes, IE3b): 'descargarListado'
    // mapea a 'leer', y 'leer' en 'entidades' da user=true y demo=true — pero
    // bajar el listado completo de clientes, choferes o proveedores es una
```

## PASO 6 — src/app/shared/utils/preguntar-descarga.util.ts (1 bloque)

### Bloque 1 de 1

BUSCAR (14 líneas):

```
/** Pregunta si descargar el informe recién creado y en qué formato: Excel /
 *  PDF / No descargar (mismo gesto que el camino viejo después de liquidar).
 *  `titulo`: el mensaje de éxito de la operación. null = no descargar. */
export async function preguntarFormatoDescarga(
  titulo: string,
  texto = '¿Querés descargar el informe?',
): Promise<'excel' | 'pdf' | null> {
  const r = await Swal.fire({
    title: titulo,
    text: texto,
    icon: 'success',
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonText: 'Excel',
```

REEMPLAZAR por (20 líneas):

```
/** Pregunta si descargar el informe recién creado y en qué formato: Excel /
 *  PDF / No descargar (mismo gesto que el camino viejo después de liquidar).
 *  `titulo`: el mensaje de éxito de la operación. null = no descargar.
 *
 *  `icon` es 'success' por defecto porque el gesto original es "la operación
 *  salió bien, ¿lo descargás?". Cuando el botón ES la descarga y no hay nada
 *  que festejar (el informe del tablero de asignaciones), el caller pasa
 *  'question'. */
export async function preguntarFormatoDescarga(
  titulo: string,
  texto = '¿Querés descargar el informe?',
  icon: 'success' | 'question' = 'success',
): Promise<'excel' | 'pdf' | null> {
  const r = await Swal.fire({
    title: titulo,
    text: texto,
    icon,
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonText: 'Excel',
```

## PASO 7 — src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.ts (6 bloques)

### Bloque 1 de 6

BUSCAR (5 líneas):

```
import { ModalObjetosActivosComponent } from 'src/app/raiz/operaciones/modal-objetos-activos/modal-objetos-activos.component';
import { sumarDias } from 'src/app/shared/utils/fecha.util';

import { Asignacion, AsignacionItem, AsignacionRef, SujetoAsignacion } from 'src/app/interfaces/asignacion';
import { Categoria, Vehiculo, Chofer } from 'src/app/interfaces/chofer';
```

REEMPLAZAR por (7 líneas):

```
import { ModalObjetosActivosComponent } from 'src/app/raiz/operaciones/modal-objetos-activos/modal-objetos-activos.component';
import { sumarDias } from 'src/app/shared/utils/fecha.util';
import { choferesNoOperativos, motivoNoDisponibilidadDe } from 'src/app/shared/utils/no-disponibilidad.util';
import { preguntarFormatoDescarga } from 'src/app/shared/utils/preguntar-descarga.util';

import { Asignacion, AsignacionItem, AsignacionRef, SujetoAsignacion } from 'src/app/interfaces/asignacion';
import { Categoria, Vehiculo, Chofer } from 'src/app/interfaces/chofer';
```

### Bloque 2 de 6

BUSCAR (6 líneas):

```
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { AsignacionService } from 'src/app/servicios/operaciones/asignacion.service';
import { OperacionService, OperacionCreada, ResultadoCreacionOps, ErrorCreacionOp } from 'src/app/servicios/operaciones/operacion.service';
import { OperacionesEditorComponent } from 'src/app/raiz/operaciones/operaciones-editor/operaciones-editor.component';
import { StorageService } from 'src/app/servicios/storage/storage.service';
```

REEMPLAZAR por (7 líneas):

```
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { AsignacionService } from 'src/app/servicios/operaciones/asignacion.service';
import { AsignacionesExportService } from 'src/app/servicios/operaciones/asignaciones-export.service';
import { OperacionService, OperacionCreada, ResultadoCreacionOps, ErrorCreacionOp } from 'src/app/servicios/operaciones/operacion.service';
import { OperacionesEditorComponent } from 'src/app/raiz/operaciones/operaciones-editor/operaciones-editor.component';
import { StorageService } from 'src/app/servicios/storage/storage.service';
```

### Bloque 3 de 6

BUSCAR (6 líneas):

```
    private proveedorService: ProveedorService,
    private clienteService: ClienteService,
    private asignacionService: AsignacionService,
    private operacionService: OperacionService,
    private storageService: StorageService,
    private tarifarioService: TarifarioService,
```

REEMPLAZAR por (7 líneas):

```
    private proveedorService: ProveedorService,
    private clienteService: ClienteService,
    private asignacionService: AsignacionService,
    private asignacionesExport: AsignacionesExportService,
    private operacionService: OperacionService,
    private storageService: StorageService,
    private tarifarioService: TarifarioService,
```

### Bloque 4 de 6

BUSCAR (6 líneas):

```
    this.itemsBorrador = [];
    this.borradorSucio = false;
    this.asignacionService.limpiarBorradorEnCurso();
  }

  // ---------------------------------------------------------------------------
```

REEMPLAZAR por (68 líneas):

```
    this.itemsBorrador = [];
    this.borradorSucio = false;
    this.asignacionService.limpiarBorradorEnCurso();
  }

  // ---------------------------------------------------------------------------
  // Informe del tablero
  // ---------------------------------------------------------------------------

  /** Excel o PDF del tablero de la fecha: las asignaciones de pantalla (el
   *  borrador en edición, el tablero confirmado en visor) y los choferes que
   *  ese día no estaban disponibles. */
  async descargar(): Promise<void> {
    const items = this.itemsParaInforme();
    if (items.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No hay asignaciones para exportar',
        text: 'El tablero de esta fecha está vacío.',
      });
      return;
    }

    const formato = await preguntarFormatoDescarga(
      `Informe del tablero del ${this.fechaSeleccionada}`,
      '¿En qué formato lo querés?',
      'question',
    );
    if (!formato) return;

    let error: unknown = null;
    this.isLoading = true;
    try {
      await this.asignacionesExport.descargar({
        fecha: this.fechaSeleccionada,
        estado: this.modo === 'edicion' ? 'borrador' : 'confirmado',
        items,
        clientes: this.clientesVisibles.map(c => ({ id: c.idCliente, razonSocial: c.razonSocial })),
        noDisponibilidades: this.noDisponibilidades,
      }, formato);
    } catch (e) {
      error = e;
    } finally {
      this.isLoading = false;
    }

    if (error) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo generar el informe',
        text: (error as Error)?.message ?? String(error),
      });
    }
  }

  /** Los items en el orden de la grilla (clientes A→Z, y dentro de cada uno
   *  por categoría y nombre). Los items cuyo cliente no resuelve —dado de baja,
   *  ver el TODO de papelera en clientesVisibles— NO tienen columna en la
   *  grilla, pero un informe no puede perderlos: van al final, y el util los
   *  marca como "Sin resolver" en la columna Cliente. */
  private itemsParaInforme(): AsignacionItem[] {
    const ordenados = this.clientesVisibles.flatMap(c => this.itemsDeCliente(c.idCliente));
    const incluidos = new Set(ordenados.map(it => it.idItem));
    const huerfanos = this.itemsActuales().filter(it => !incluidos.has(it.idItem));
    return [...ordenados, ...huerfanos];
  }

  // ---------------------------------------------------------------------------
```

### Bloque 5 de 6

BUSCAR (16 líneas):

```
  // No-disponibilidad
  // ---------------------------------------------------------------------------

  private calcularChoferesNoOperativosPorFecha(fecha: string): void {
    this.noOperativosSet.clear();
    const fechaMs = new Date(fecha + 'T00:00:00').getTime();
    for (const nd of this.noDisponibilidades) {
      const desdeMs = new Date(nd.desde + 'T00:00:00').getTime();
      const hastaMs = nd.hasta ? new Date(nd.hasta + 'T00:00:00').getTime() : null;
      if (fechaMs >= desdeMs && (hastaMs === null || fechaMs <= hastaMs)) {
        this.noOperativosSet.add(nd.idChofer);
      }
    }
  }

  isChoferNoOperativo(idChofer: string): boolean {
```

REEMPLAZAR por (12 líneas):

```
  // No-disponibilidad
  // ---------------------------------------------------------------------------

  // La regla "¿está no operativo en esta fecha?" vive en
  // shared/utils/no-disponibilidad.util.ts: acá estaba escrita dos veces, con
  // dos implementaciones distintas (Date vs. comparación de strings), y el
  // informe del tablero la habría triplicado.
  private calcularChoferesNoOperativosPorFecha(fecha: string): void {
    this.noOperativosSet = choferesNoOperativos(this.noDisponibilidades, fecha);
  }

  isChoferNoOperativo(idChofer: string): boolean {
```

### Bloque 6 de 6

BUSCAR (12 líneas):

```
  }

  getMotivoNoDisponibilidad(idChofer: string): string {
    const fecha = this.fechaSeleccionada;
    const nd = this.noDisponibilidades.find(n => {
      if (n.idChofer !== idChofer) return false;
      return fecha >= n.desde && (!n.hasta || fecha <= n.hasta);
    });
    return nd?.motivo || 'No disponible';
  }

  // La no-disponibilidad solo aplica a vehículos de chofer DIRECTO.
```

REEMPLAZAR por (8 líneas):

```
  }

  getMotivoNoDisponibilidad(idChofer: string): string {
    return motivoNoDisponibilidadDe(this.noDisponibilidades, idChofer, this.fechaSeleccionada)
      || 'No disponible';
  }

  // La no-disponibilidad solo aplica a vehículos de chofer DIRECTO.
```

## PASO 8 — src/app/raiz/operaciones/carga-asignacion/carga-asignacion.component.ts (2 bloques)

### Bloque 1 de 2

BUSCAR (6 líneas):

```
import { takeUntil } from 'rxjs/operators';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { AsignacionItem } from 'src/app/interfaces/asignacion';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
```

REEMPLAZAR por (8 líneas):

```
import { takeUntil } from 'rxjs/operators';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { choferesNoOperativos, motivoNoDisponibilidadDe } from 'src/app/shared/utils/no-disponibilidad.util';

import { AsignacionItem } from 'src/app/interfaces/asignacion';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
```

### Bloque 2 de 2

BUSCAR (26 líneas):

```
    }
  }

  private calcularChoferesNoOperativosPorFecha(fecha: string): void {
    this.noOperativosSet.clear();
    const fechaMs = new Date(fecha + 'T00:00:00').getTime();
    for (const nd of this.noDisponibilidades) {
      const desdeMs = new Date(nd.desde + 'T00:00:00').getTime();
      const hastaMs = nd.hasta ? new Date(nd.hasta + 'T00:00:00').getTime() : null;
      if (fechaMs >= desdeMs && (hastaMs === null || fechaMs <= hastaMs)) {
        this.noOperativosSet.add(nd.idChofer);
      }
    }
  }

  getMotivoNoDisponibilidad(idChofer: string): string {
    if (!this.fechaSeleccionada) return 'No disponible';
    const fecha = this.fechaSeleccionada;
    const nd = this.noDisponibilidades.find(n => {
      if (n.idChofer !== idChofer) return false;
      return fecha >= n.desde && (!n.hasta || fecha <= n.hasta);
    });
    return nd?.motivo || 'No disponible';
  }

  // ---------------------------------------------------------------------------
```

REEMPLAZAR por (18 líneas):

```
    }
  }

  // La regla "¿está no operativo en esta fecha?" vive en
  // shared/utils/no-disponibilidad.util.ts: estaba escrita acá y otras dos
  // veces en TableroAsignacionesComponent, con dos implementaciones distintas
  // (Date vs. comparación de strings).
  private calcularChoferesNoOperativosPorFecha(fecha: string): void {
    this.noOperativosSet = choferesNoOperativos(this.noDisponibilidades, fecha);
  }

  getMotivoNoDisponibilidad(idChofer: string): string {
    if (!this.fechaSeleccionada) return 'No disponible';
    return motivoNoDisponibilidadDe(this.noDisponibilidades, idChofer, this.fechaSeleccionada)
      || 'No disponible';
  }

  // ---------------------------------------------------------------------------
```

## PASO 9 — src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.html (1 bloque)

### Bloque 1 de 1

BUSCAR (6 líneas):

```
                    </button>
                </ng-container>
            }

            @if (modo === "edicion") {
                <ng-container *appPermiso="'operaciones.limpiarTablero'">
```

REEMPLAZAR por (17 líneas):

```
                    </button>
                </ng-container>
            }

            <ng-container *appPermiso="'operaciones.descargarAsignaciones'">
                <button
                    class="btn botonera boton-descargar"
                    (click)="descargar()"
                    [disabled]="isLoading"
                    title="Descargar el informe del tablero (Excel o PDF)"
                >
                    ⬇ Descargar
                </button>
            </ng-container>

            @if (modo === "edicion") {
                <ng-container *appPermiso="'operaciones.limpiarTablero'">
```

## Verificación

1. `git status --short` → los seis modificados (`M`) y los tres nuevos (`??`). Ningún
   otro archivo.
2. `git diff --numstat` → `1 0 src/app/interfaces/permiso.ts` · `11 0 src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.html` · `17 1 src/app/servicios/permisos/permisos.service.ts` · `73 15 src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.ts` · `8 2 src/app/shared/utils/preguntar-descarga.util.ts` · `9 15 src/app/raiz/operaciones/carga-asignacion/carga-asignacion.component.ts`.
3. Los hashes de resultado del Anexo, para los nueve archivos
   (`git hash-object <ruta>` sirve igual para los nuevos).
4. El permiso quedó cableado:
   - `grep -c "descargarAsignaciones" src/app/interfaces/permiso.ts` → `1`
   - `grep -c "descargarAsignaciones" src/app/servicios/permisos/permisos.service.ts` → `3`
     (el mapa, el override y su comentario)
   - `grep -c "operaciones.descargarAsignaciones" src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.html` → `1`
5. La regla de no-disponibilidad quedó en UN solo lugar, para los dos componentes:
   - `grep -c "T00:00:00" src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.ts` → `0`
   - `grep -c "T00:00:00" src/app/raiz/operaciones/carga-asignacion/carga-asignacion.component.ts` → `0`
   - `grep -rn "fecha >= nd.desde\|fecha >= n.desde" src/app/ --include=*.ts | wc -l` → `1`,
     y es la línea del util nuevo.
   (Otros archivos siguen usando `T00:00:00` por su cuenta —Registro, Registro Log,
   Papelera— y no tienen nada que ver con esto: no los toques.)
6. `npx tsc -p tsconfig.app.json --noEmit` → sin errores.
7. `npx tsc -p tsconfig.app.json --noEmit --noUnusedLocals` → solo el error preexistente de
   `appVersion` en `app.component.ts`.
8. `npm run build:demo` → OK, 9 advertencias, inicial 1,53 MB.
9. **La medición que importa.** Ninguna ruta puede pedir exceljs ni jspdf. En el log del
   build, identificá los ids de los chunks `exceljs`, `jspdf` y `jspdf-autotable`, y
   después, en `dist/ap-log`:
   ```
   for r in op clientes choferes proveedores ajustes; do
     echo "$r: $(grep -ohE "path:\"$r\",loadChildren:\(\)=>[^]]*\]" *.js | head -1)"
   done
   ```
   Ninguna de las cinco listas puede traer esos tres ids. Pegame la salida en el reporte.
10. Ninguna línea nueva con espacios al final, y nada con CRLF:
    - `git diff -U0 | grep "^+" | grep -c " $"` → `0`
    - `git diff | grep -c $'\\r'` → `0`

## Pruebas manuales en demo (las hago yo)

1. **Operaciones → Tablero de asignaciones**, una fecha con asignaciones **en modo
   edición** (borrador): el botón "⬇ Descargar" está; pide Excel o PDF; el Excel abre con
   las dos hojas y el subtítulo dice "Borrador (sin dar de alta)".
2. La misma fecha **ya confirmada** (modo visor): el subtítulo dice "Confirmado". Si hay
   alguna asignación anulada, aparece con Estado "Anulada" y su motivo en la columna de al
   lado, y el subtítulo aclara cuántas están activas.
3. **El filtro y el orden** de la Tabla, en las dos hojas: filtrar por Categoría y por
   Cliente, ordenar por Chofer. Es lo que distingue este informe de una impresión.
4. **El PDF**: dos páginas apaisadas, con el logo, la fecha en el título y las notas al
   pie de cada hoja.
5. **Una fecha sin asignaciones**: el botón avisa "No hay asignaciones para exportar" y no
   genera nada.
6. **Hoja 2 con datos reales**: cargá (o aprovechá) una no-disponibilidad **sin fecha de
   fin** y confirmá que `Hasta` queda vacía en el Excel y "—" en el PDF; y una de un chofer
   **sin vehículos propios**, que tiene que aparecer igual con Dominio y Categoría vacías.
7. **Permisos**: con `user` el botón se ve y funciona; con `demo` no se ve. (Con `manager`
   tampoco, pero ese rol no tiene acceso real a nada.)

## Mensaje de commit

```
AS1 (asignaciones): informe del tablero, Excel y PDF

- documento-asignaciones.util.ts (puro, el QUE): dos hojas sobre LibroTabular,
  las dos como Tabla de Excel y sin fila de totales. Hoja "Asignaciones": una
  fila por asignacion (Cliente, Categoria, Dominio, Chofer, Proveedor,
  Observacion, Hoja de ruta, Estado, Motivo anulacion). Hoja "No disponibles":
  una fila por chofer no disponible Y VEHICULO (Chofer, Dominio, Categoria,
  Desde, Hasta, Motivo), solo las vigentes en la fecha del tablero.
- asignaciones-export.service.ts: la fachada, unica puerta del tablero. Excel o
  PDF desde el mismo libro; resuelve choferes y vehiculos desde memoria con
  agruparVehiculosPorDuenio, la misma funcion pura de los listados (IE3). Sin
  log (D7).
- no-disponibilidad.util.ts: la regla "esta no operativo en esta fecha" estaba
  escrita CUATRO veces: el par calcular + motivo, duplicado en
  tablero-asignaciones y en carga-asignacion, y en cada par con dos
  implementaciones distintas (Date vs. comparacion de strings). Queda una
  sola, por string, y los DOS componentes delegan;
  getMotivoNoDisponibilidad conserva su fallback en cada caller, y en
  carga-asignacion tambien su guard de fecha vacia. carga-asignacion entra al
  bloque solo por esto: dejar ahi la cuarta copia habria dejado el JSDoc del
  util afirmando "unica definicion" en falso.
- Permiso propio descargarAsignaciones -> 'leer', con override { demo: false }.
  No reusa descargarTablero: esa gobierna el tablero de OPERACIONES desde IE1b
  y quedo en dev/admin (IE2c), y esta pantalla es la principal del unico
  empleado activo. No hace falta user: true, 'leer' en operaciones ya lo da.
- El boton vuelve al tablero con su estilo original: .boton-descargar seguia en
  el scss desde IE4.
- No hay columna de operacion: AsignacionItem.idOperacion guarda el document id
  de Firestore, no el numero visible (Operacion.numeroOperacion).
- Bundle: ninguna ruta pide exceljs ni jspdf (los renderers los cargan con
  import()). El chunk de operaciones pasa de 200,00 a 214,17 kB por el codigo
  nuevo; el inicial sigue en 1,53 MB.
```

## Anexo — hashes

| Archivo nuevo | Líneas | Hash del resultado |
|---|---|---|
| `src/app/shared/utils/no-disponibilidad.util.ts` | 60 | `bd658004eb64e6d4247e0fd971bd6b899140090f` |
| `src/app/shared/utils/documento-asignaciones.util.ts` | 203 | `d144f2e38a429caa3fa6b868fa8497ef5593a8c0` |
| `src/app/servicios/operaciones/asignaciones-export.service.ts` | 45 | `e631be38a852c6fd0667d2cb793317044188e083` |

| Archivo | Hash de partida (HEAD) | Hash de resultado |
|---|---|---|
| `src/app/interfaces/permiso.ts` | `7db2a8b4a4bb37c927bcbc1ab5b725a4813ec42d` | `b7bea4416c0230ea40fda0b301c9e143cb920106` |
| `src/app/servicios/permisos/permisos.service.ts` | `0d457cd6af3e30682d20a5c6c7a297829c29af78` | `af5a0604461e2e61976eaf29a4378eb9b8a3055f` |
| `src/app/shared/utils/preguntar-descarga.util.ts` | `48375e58c39dcc01eb84919cec4fe89e9ebc5762` | `bc4ec2d02467cc373abf43604e5f8bfab1558713` |
| `src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.ts` | `91d48f8a68b94120f576bbb64359fbf9ef9434ad` | `e991eda3bb9c962b5e141aa87f7c694b4829fdcf` |
| `src/app/raiz/operaciones/carga-asignacion/carga-asignacion.component.ts` | `91b5921998bd8f781bcfb7e9e121b12bf31ed2f9` | `99257b389ed711dd15f1cc5ca646385603f83fb9` |
| `src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.html` | `d0579e673ea421f3113c690d6dcd5be466e9f5a5` | `a2470ec1bce7ea1cce5c048310fb721cd10b1a05` |

FIN DE LA INSTRUCCIÓN AS1
