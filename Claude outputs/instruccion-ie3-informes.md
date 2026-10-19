Si no ves la línea FIN DE LA INSTRUCCIÓN IE3 al final, el texto llegó cortado: leé el archivo completo.

# IE3 — Los tres listados de entidades por el camino nuevo, al lado del viejo

## Contexto y razonamiento

El grueso del QUÉ de este frente: los Excel de **Clientes, Choferes y Proveedores**. Igual
que IE1, este bloque construye el camino nuevo **al lado** del viejo y no conecta nada: los
tres botones siguen llamando a `ExcelService` hasta IE3b. Si algo sale mal, lo único que
hay es código nuevo sin consumidores.

**Qué sale en cada archivo** (decisión D3: se mantienen las columnas de hoy y se agregan
solo las que pediste):

| Listado | Columnas |
|---|---|
| Clientes | las 12 de hoy + **Vendedores asignados** |
| Choferes | las 14 de hoy, con **Vehículos ARREGLADA** |
| Proveedores | las 12 de Clientes + **Choferes** + **Vehículos** |

Cliente y Proveedor comparten las 12 columnas de empresa (razón social, CUIT, las dos
direcciones desagregadas, condición fiscal y contactos) porque comparten exactamente esos
campos — verificado en las interfaces, igual que lo hacía el informe viejo, que usaba una
sola función para los dos. Acá eso es un `COLUMNAS_EMPRESA` compartido, no una copia.

**La columna Vehículos de Choferes estaba rota desde la migración** (hallazgo 6 del
relevamiento): `ExcelService` lee `(chofer as any).vehiculo`, un campo del modelo viejo que
`Chofer` ya no tiene, así que la columna salía vacía SIEMPRE. Ahora los vehículos se
resuelven por `Vehiculo.asignadoA`, la unión discriminada real del modelo
(`{ tipo: 'chofer', idChofer }` | `{ tipo: 'proveedor', idProveedor }`). Un vehículo es del
chofer o del proveedor, nunca de los dos: por eso un **chofer de proveedor queda sin
vehículos propios** y sus unidades figuran en el listado de Proveedores, que es la verdad
del modelo (su contratación es del proveedor). Eso está dicho en una nota del archivo para
que nadie lo lea como un dato faltante.

**Vendedores asignados** sale de `Cliente.comisionesVenta` (`{ idVendedor, porcentaje }`),
que ya está en cada cliente. Lo único que falta ahí es el NOMBRE, y por eso este bloque
agrega `VendedorService.obtenerTodosUnaVez()` (hallazgo 7): `init()` se llama desde el
shell del módulo Vendedores, no al arrancar la app, así que desde el listado de Clientes el
BehaviorSubject está vacío salvo que esa sesión haya entrado a Vendedores. La fachada usa lo
que haya en memoria y, si no hay nada, hace una lectura puntual — sin abrir un listener:
una descarga no justifica dejar vivo un stream de una colección de otro módulo. Formato:
`Apellido, Nombre (35%)`, un vendedor por renglón; un id que no resuelve (vendedor dado de
baja) sale como `Sin resolver (10%)`, para no perder el porcentaje, que es dato del cliente.
Esto funciona porque **IE2c** dejó la descarga en dev/admin, los dos roles que pueden leer
`vendedores`.

**Arquitectura, igual que en IE1:** QUÉ (tres funciones puras en
`shared/utils/documento-entidades.util.ts`) ≠ CÓMO (el renderer genérico) ≠ QUIÉN
(`EntidadesExportService`, la única puerta de las tres pantallas). La fachada resuelve lo
que una función pura no puede ir a buscar (los vehículos en memoria, los choferes de un
proveedor, los nombres de vendedor) y compone. El **agrupado** de vehículos por dueño, en
cambio, es una transformación pura y vive en el util (`agruparVehiculosPorDuenio`): así se
prueba con el código real, sin Angular.

**Son Tablas de Excel** (el campo de IE2): filtro por columna, bandas del tema y encabezado
inmovilizado, sin fila de totales — no hay nada numérico que sumar en un listado de
entidades. El informe viejo ya usaba `addTable`, así que esto es recuperar lo que había, con
el mecanismo genérico. Las 13/14 etiquetas de cada libro son únicas y sin `[`, `]`, `#` ni
`'`, los dos requisitos de una Tabla.

**Diferencias con el archivo viejo, todas por decisión D8:**
- Arriba de la tabla aparecen logo, título y subtítulo (consistencia con el resto de la
  app). El subtítulo dice la cantidad de registros y el filtro de la pantalla
  (`visibles` / `todos`), decisión D4, para que el archivo se explique solo.
- **Fecha de Nacimiento pasa a ser una fecha real** en vez del texto `DD/MM/AAAA`: así
  ordena y filtra como fecha dentro del Excel. Se normaliza con
  `normalizarFechaNacimiento` (el mismo util de FI1c), que convierte los Timestamp legacy y
  deja la celda VACÍA si el valor no es una fecha de negocio.
- CUIT sigue siendo TEXTO (no pierde ceros a la izquierda ni se vuelve notación
  científica).
- Contactos, vehículos y choferes van como texto multilínea: se pierde la negrita del
  `richText` del informe viejo (el renderer genérico no estiliza partes de una celda).
- Las etiquetas quedan TAL CUAL, incluidas "Municipio Operativa" y "Provincia Operativa",
  que están mal escritas en el informe de hoy. Cambiarlas no es de este frente; decime si
  las querés corregir y va en IE3b.

**Lo que NO hace este bloque:** no toca ningún componente, ni `ExcelService`, ni el permiso
nuevo de los listados. Nada cambia en pantalla. En IE3b van el switch de los tres botones,
el `*appPermiso` con la acción `descargarListado` y el aviso de "no hay nada para exportar"
cuando el listado filtrado queda vacío (una Tabla sin filas se genera, pero un archivo con
el encabezado solo no le sirve a nadie — mismo guard que `descargarOp` en IE1b).

**Verificado con el código real** antes de entregar (detalle en el reporte): armé los tres
libros con las funciones puras y los dibujé con el renderer real, con datos que cubren los
casos límite — cliente con dos vendedores, sin vendedores y con un vendedor dado de baja;
chofer directo con dos vehículos, chofer de proveedor, `fechaNac` en formato no-fecha y
`fechaNac` como Timestamp legacy; proveedor con choferes y vehículos y proveedor sin nada.
Los tres .xlsx se releyeron del archivo: Tabla con su nombre, botón de filtro en las 13/14
columnas, sin fila de totales ni SUBTOTAL, encabezado inmovilizado, CUIT como texto, fecha
de nacimiento como fecha real con formato `dd/mm/yyyy` y los saltos de línea de las celdas
multilínea conservados.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Validá el BUSCAR del PASO 3 antes de escribir. Si no está o está repetido, detenete y
  avisá.
- Los PASOS 1 y 2 son archivos NUEVOS: creálos con exactamente el contenido del bloque, LF,
  sin agregar ni quitar líneas. Ninguno de los dos existe hoy.
- `src/app/servicios/entidades/` es una carpeta nueva.
- No toques `ExcelService` ni `PdfService`: el camino viejo sigue sirviendo a los tres
  listados hasta IE3b.
- No toques los componentes de los listados ni `PermisosService`: van en IE3b.
- No toques `ChoferService` ni `ClienteService`: la fachada usa sus getters existentes.
- No toques CLAUDE.md ni CHANGELOG.md: van en el bloque DOC de cierre del frente.
- NO corras `npm run build`, `deploy:*` ni `node set-version.js`. Para compilar:
  `npm run build:demo` (línea base: 9 advertencias, inicial 1,53 MB).
- npm con `--legacy-peer-deps` (en este bloque no hace falta instalar nada).

## PASO 0 — verificación, sin modificar nada

1. `git rev-parse --abbrev-ref HEAD` → `refactor`; `git log --oneline -1` → el commit de IE2c.
2. El archivo a editar: `git hash-object src/app/servicios/vendedores/vendedor.service.ts` → `b1237591cf10229afcd8c97af07f0f9edf282c47`
3. Los dos archivos nuevos no existen todavía:
   - `ls src/app/shared/utils/documento-entidades.util.ts` → error de "no such file"
   - `ls src/app/servicios/entidades/` → error de "no such file or directory"
4. `grep -c "obtenerTodosUnaVez" src/app/servicios/vendedores/vendedor.service.ts` → `0`.
5. El camino viejo, intacto y todavía conectado:
   `grep -rn "ExcelService\|excelServ" src/app/raiz/clientes src/app/raiz/choferes src/app/raiz/proveedores | wc -l`
   → `9` (import, inyección y llamada en cada uno de los tres listados).
6. La rama de Tabla de IE2 y los utils que reusa el archivo nuevo están en su lugar:
   - `grep -c "private dibujarTablaExcel" src/app/servicios/exportacion/excel-tabular.service.ts` → `1`
   - `ls src/app/shared/utils/nombre-archivo.util.ts src/app/shared/utils/fecha-nacimiento.util.ts`
     → los dos existen.

## PASO 1 — ARCHIVO NUEVO: src/app/shared/utils/documento-entidades.util.ts

```
import { ColumnaDoc, HojaDoc, LibroTabular, TablaDoc, ValorCeldaDoc } from 'src/app/interfaces/documento-tabular';
import { ConIdType } from 'src/app/interfaces/conId';
import { Chofer, Direccion, Vehiculo } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { AsignacionVenta } from 'src/app/interfaces/vendedor-nuevo';
import { normalizarFechaNacimiento } from './fecha-nacimiento.util';
import { hoyNegocio } from './fecha.util';
import { sanearNombreArchivo } from './nombre-archivo.util';

/** Lo que hace falta de un contacto. Estructural: cliente.ts y proveedor.ts
 *  declaran cada una su propia `Contacto`, con los mismos campos. */
interface ContactoListado {
  puesto: string;
  apellido: string;
  nombre: string;
  telefono: number;
  email: string;
}

/** Filtro de visibilidad del listado, el mismo que muestra la pantalla. Va en
 *  el subtítulo del archivo para que se explique solo (decisión D4). */
export type FiltroListado = 'visibles' | 'todos';

export interface DatosLibroClientes {
  clientes: ConIdType<Cliente>[];
  filtro: FiltroListado;
  /** idVendedor → nombre ya formateado ('Apellido, Nombre', lo que devuelve
   *  VendedorService.nombre). Lo resuelve la fachada: esta función es pura y no
   *  lee Firestore ni cachés. Un id que no esté acá sale como "Sin resolver"
   *  (vendedor dado de baja, o lista no disponible). */
  nombresVendedor: Readonly<Record<string, string>>;
}

export interface DatosLibroChoferes {
  choferes: ConIdType<Chofer>[];
  filtro: FiltroListado;
  /** idChofer → sus vehículos. La fachada los resuelve por `asignadoA`
   *  (ver ChoferService.getVehiculosActuales). */
  vehiculosPorChofer: Readonly<Record<string, Vehiculo[]>>;
}

export interface DatosLibroProveedores {
  proveedores: ConIdType<Proveedor>[];
  filtro: FiltroListado;
  /** idProveedor → sus choferes (los de contratación 'proveedor'). */
  choferesPorProveedor: Readonly<Record<string, Chofer[]>>;
  /** idProveedor → los vehículos asignados al proveedor (no a un chofer). */
  vehiculosPorProveedor: Readonly<Record<string, Vehiculo[]>>;
}

/** Las 12 columnas que Cliente y Proveedor comparten, en el orden del informe
 *  viejo (ExcelService.exportarClientesTablaExcel, que servía a los dos).
 *  Las etiquetas se mantienen TAL CUAL las de hoy, incluidas "Municipio
 *  Operativa" y "Provincia Operativa": son las que el usuario ya conoce y
 *  cambiarlas no es parte de este frente. */
const COLUMNAS_EMPRESA: ColumnaDoc[] = [
  col('Razón Social', 'texto', 28),
  col('CUIT', 'texto', 14),
  col('Dirección Fiscal', 'texto', 26),
  col('Localidad Fiscal', 'texto', 18),
  col('Municipio Fiscal', 'texto', 18),
  col('Provincia Fiscal', 'texto', 16),
  col('Dirección Operativa', 'texto', 26),
  col('Localidad Operativa', 'texto', 18),
  col('Municipio Operativa', 'texto', 18),
  col('Provincia Operativa', 'texto', 16),
  col('Condición Fiscal', 'texto', 18),
  col('Contactos', 'texto', 38),
];

const COLUMNAS_CLIENTES: ColumnaDoc[] = [
  ...COLUMNAS_EMPRESA,
  col('Vendedores asignados', 'texto', 26),
];

const COLUMNAS_PROVEEDORES: ColumnaDoc[] = [
  ...COLUMNAS_EMPRESA,
  col('Choferes', 'texto', 26),
  col('Vehículos', 'texto', 34),
];

/** Las 14 del informe viejo (ExcelService.exportarChoferesTablaExcel), en el
 *  mismo orden. 'Fecha de Nacimiento' pasa de texto 'DD/MM/AAAA' a FECHA real
 *  (decisión D8): así ordena y filtra como fecha dentro del Excel. */
const COLUMNAS_CHOFERES: ColumnaDoc[] = [
  col('Apellido', 'texto', 20),
  col('Nombre', 'texto', 18),
  col('CUIT', 'texto', 14),
  col('Celular', 'texto', 16),
  col('Celular Emergencia', 'texto', 18),
  col('Contacto Emergencia', 'texto', 22),
  col('Dirección', 'texto', 26),
  col('Localidad', 'texto', 18),
  col('Municipio', 'texto', 18),
  col('Provincia', 'texto', 16),
  col('Email', 'texto', 26),
  col('Fecha de Nacimiento', 'fecha', 13),
  col('Condición Fiscal', 'texto', 18),
  col('Vehículos', 'texto', 34),
];

/** QUÉ dice el Excel del listado de Clientes (puro: todo sale de los
 *  argumentos). Las 12 columnas de empresa + los vendedores asignados con su
 *  porcentaje, un vendedor por renglón. */
export function armarLibroClientes(d: DatosLibroClientes): LibroTabular {
  const filas = d.clientes.map(c => [
    ...filaEmpresa(c),
    vendedoresTexto(c.comisionesVenta, d.nombresVendedor),
  ]);
  return libro('Clientes', COLUMNAS_CLIENTES, filas, d.filtro, d.clientes.length, [
    'Vendedores asignados: un renglón por vendedor, con su porcentaje de comisión sobre la operación.',
  ]);
}

/** QUÉ dice el Excel del listado de Choferes. La columna Vehículos sale de los
 *  vehículos resueltos por la fachada: el informe viejo leía un campo legacy
 *  del chofer (`chofer.vehiculo`) que el modelo nuevo no tiene, así que la
 *  columna salía vacía SIEMPRE. */
export function armarLibroChoferes(d: DatosLibroChoferes): LibroTabular {
  const filas = d.choferes.map(ch => {
    const p = ch.datosPersonales;
    return [
      p.apellido,
      p.nombre,
      String(p.cuit ?? ''),
      String(p.celularContacto ?? ''),
      String(p.celularEmergencia ?? ''),
      p.contactoEmergencia ?? '',
      ...direccionCeldas(p.direccion),
      p.email ?? '',
      normalizarFechaNacimiento(p.fechaNac).fecha,
      ch.condFiscal ?? '',
      vehiculosTexto(d.vehiculosPorChofer[ch.id]),
    ] as ValorCeldaDoc[];
  });
  return libro('Choferes', COLUMNAS_CHOFERES, filas, d.filtro, d.choferes.length, [
    'Vehículos: los asignados al chofer (dominio, marca, modelo y categoría), uno por renglón.',
    'Un chofer de proveedor maneja los vehículos del proveedor: su columna Vehículos queda vacía y los vehículos figuran en el listado de Proveedores.',
  ]);
}

/** QUÉ dice el Excel del listado de Proveedores. Mismas 12 columnas que
 *  Clientes (Cliente y Proveedor tienen los mismos campos) + sus choferes y
 *  sus vehículos, como en la ficha de la entidad. */
export function armarLibroProveedores(d: DatosLibroProveedores): LibroTabular {
  const filas = d.proveedores.map(p => [
    ...filaEmpresa(p),
    choferesTexto(d.choferesPorProveedor[p.id]),
    vehiculosTexto(d.vehiculosPorProveedor[p.id]),
  ]);
  return libro('Proveedores', COLUMNAS_PROVEEDORES, filas, d.filtro, d.proveedores.length, [
    'Choferes: los choferes contratados a través del proveedor, uno por renglón.',
    'Vehículos: los asignados al proveedor (no a un chofer en particular), uno por renglón.',
  ]);
}

// ── internos ────────────────────────────────────────────────────────

/** Una hoja, una tabla, sin fila de totales (no hay columnas numéricas que
 *  sumar) y como Tabla de Excel real: estos listados son informes de TRABAJO
 *  (se filtran y se ordenan), que es para lo que existe TablaDoc.excel.
 *  `nombre` sirve de nombre de hoja, de nombre de la Tabla (único en el libro)
 *  y de base del nombre de archivo. */
function libro(
  nombre: 'Clientes' | 'Choferes' | 'Proveedores',
  columnas: ColumnaDoc[],
  filas: ValorCeldaDoc[][],
  filtro: FiltroListado,
  cantidad: number,
  notas: string[],
): LibroTabular {
  const tabla: TablaDoc = {
    titulo: null,
    grupos: [],
    columnas,
    filas,
    filaTotal: null,
    excel: { nombre },
  };
  const hoja: HojaDoc = {
    nombre,
    titulo: `Listado de ${nombre}`,
    subtitulos: [
      `${cantidad} ${cantidad === 1 ? 'registro' : 'registros'} · Filtro: ${filtro === 'visibles' ? 'visibles en el listado' : 'todos'}`,
    ],
    tablas: [tabla],
    notas,
  };
  return { nombreArchivo: sanearNombreArchivo(`${nombre}_${hoyNegocio()}`), hojas: [hoja] };
}

/** Las 12 celdas que comparten Cliente y Proveedor. CUIT como TEXTO (D8): no
 *  es un número con el que se calcule, y como texto no pierde los ceros a la
 *  izquierda ni se convierte en notación científica. */
function filaEmpresa(e: Cliente | Proveedor): ValorCeldaDoc[] {
  return [
    e.razonSocial ?? '',
    String(e.cuit ?? ''),
    ...direccionCeldas(e.direccionFiscal),
    ...direccionCeldas(e.direccionOperativa),
    e.condFiscal ?? '',
    contactosTexto(e.contactos),
  ];
}

/** Domicilio, localidad, municipio, provincia — en ese orden, que es el de las
 *  columnas (la interfaz Direccion las declara al revés). */
function direccionCeldas(d: Direccion | undefined): string[] {
  return [d?.domicilio ?? '', d?.localidad ?? '', d?.municipio ?? '', d?.provincia ?? ''];
}

/** Un contacto por renglón. El informe viejo usaba richText con el puesto en
 *  negrita; acá va texto multilínea (D8: se acepta perder la negrita dentro de
 *  la celda, el renderer genérico no la soporta por celda).
 *  El tipo es estructural a propósito: `Contacto` está declarada por separado
 *  (y con los mismos campos) en cliente.ts y en proveedor.ts. */
function contactosTexto(contactos: ContactoListado[] | undefined): string {
  return (contactos ?? [])
    .map(c => `${c.puesto}: ${c.apellido} ${c.nombre} · ${c.telefono} · ${c.email}`)
    .join('\n');
}

function vehiculosTexto(vehiculos: Vehiculo[] | undefined): string {
  return (vehiculos ?? [])
    .map(v => `${v.dominio} (${v.marca} ${v.modelo} - ${v.categoria?.nombre ?? 'sin categoría'})`)
    .join('\n');
}

function choferesTexto(choferes: Chofer[] | undefined): string {
  return (choferes ?? [])
    .map(c => `${c.datosPersonales.apellido} ${c.datosPersonales.nombre}`)
    .join('\n');
}

/** "Apellido, Nombre (35%)" por renglón. Un id que no resuelve queda como
 *  "Sin resolver (35%)": el porcentaje es el dato del cliente y no se pierde
 *  aunque el vendedor ya no esté. */
function vendedoresTexto(
  asignaciones: AsignacionVenta[] | undefined,
  nombres: Readonly<Record<string, string>>,
): string {
  return (asignaciones ?? [])
    .map(a => `${nombres[a.idVendedor] ?? 'Sin resolver'} (${a.porcentaje}%)`)
    .join('\n');
}

/** Agrupa vehículos por su dueño, leyendo la unión discriminada
 *  `Vehiculo.asignadoA`. Puro: la fachada le pasa los vehículos que ya están
 *  en memoria (`ChoferService.getVehiculosActuales()`), porque los getters por
 *  dueño del servicio devuelven Observables y acá hace falta el mapa completo
 *  de una vez, sin suscribirse.
 *
 *  Un vehículo pertenece al chofer o al proveedor, nunca a los dos: por eso un
 *  chofer de proveedor no tiene vehículos propios y sus unidades figuran en el
 *  listado de Proveedores. */
export function agruparVehiculosPorDuenio(
  vehiculos: Vehiculo[],
  tipo: 'chofer' | 'proveedor',
): Record<string, Vehiculo[]> {
  const mapa: Record<string, Vehiculo[]> = {};
  for (const v of vehiculos) {
    if (v.asignadoA.tipo !== tipo) continue;
    const id = v.asignadoA.tipo === 'chofer' ? v.asignadoA.idChofer : v.asignadoA.idProveedor;
    if (!mapa[id]) mapa[id] = [];
    mapa[id].push(v);
  }
  return mapa;
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

(278 líneas, LF)

## PASO 2 — ARCHIVO NUEVO: src/app/servicios/entidades/entidades-export.service.ts

```
import { Injectable, inject } from '@angular/core';
import * as FileSaver from 'file-saver';
import { ConIdType } from 'src/app/interfaces/conId';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { LibroTabular } from 'src/app/interfaces/documento-tabular';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ExcelTabularService } from 'src/app/servicios/exportacion/excel-tabular.service';
import { VendedorService } from 'src/app/servicios/vendedores/vendedor.service';
import {
  FiltroListado, agruparVehiculosPorDuenio, armarLibroChoferes, armarLibroClientes,
  armarLibroProveedores,
} from 'src/app/shared/utils/documento-entidades.util';

/** Excel de los listados de entidades (Clientes, Choferes, Proveedores) — la
 *  ÚNICA puerta que usan esas tres pantallas.
 *
 *  QUÉ dice cada documento: las funciones puras de documento-entidades.util.
 *  CÓMO se ve: el renderer genérico ExcelTabularService.generarLibro, que carga
 *  exceljs con import() (se descarga recién al exportar). QUIÉN resuelve los
 *  datos que las funciones puras no pueden ir a buscar (vehículos, choferes de
 *  un proveedor, nombres de vendedor): esta fachada.
 *
 *  Solo Excel, sin log: 12-14 columnas no entran legibles en un PDF y una
 *  descarga de consulta no se registra (decisiones D2 y D7 del frente). */
@Injectable({ providedIn: 'root' })
export class EntidadesExportService {

  private excel = inject(ExcelTabularService);
  private choferService = inject(ChoferService);
  private vendedorService = inject(VendedorService);

  async descargarClientes(clientes: ConIdType<Cliente>[], filtro: FiltroListado): Promise<void> {
    await this.descargar(armarLibroClientes({
      clientes, filtro, nombresVendedor: await this.nombresVendedor(),
    }));
  }

  async descargarChoferes(choferes: ConIdType<Chofer>[], filtro: FiltroListado): Promise<void> {
    await this.descargar(armarLibroChoferes({
      choferes, filtro, vehiculosPorChofer: this.vehiculos('chofer'),
    }));
  }

  async descargarProveedores(proveedores: ConIdType<Proveedor>[], filtro: FiltroListado): Promise<void> {
    const choferesPorProveedor: Record<string, Chofer[]> = {};
    for (const p of proveedores) {
      choferesPorProveedor[p.id] = this.choferService.getChoferesPorProveedor(p.id);
    }
    await this.descargar(armarLibroProveedores({
      proveedores, filtro, choferesPorProveedor,
      vehiculosPorProveedor: this.vehiculos('proveedor'),
    }));
  }

  private async descargar(libro: LibroTabular): Promise<void> {
    const blob = await this.excel.generarLibro(libro);
    FileSaver.saveAs(blob, `${libro.nombreArchivo}.xlsx`);
  }

  /** Los vehículos que ya están en memoria, agrupados por dueño. El agrupado
   *  es puro y vive en el util (agruparVehiculosPorDuenio); acá solo se
   *  resuelve de dónde salen los datos. */
  private vehiculos(tipo: 'chofer' | 'proveedor'): Record<string, Vehiculo[]> {
    return agruparVehiculosPorDuenio(this.choferService.getVehiculosActuales(), tipo);
  }

  /** idVendedor → 'Apellido, Nombre' (el mismo formato que usa la app, de
   *  VendedorService.nombre). Si el módulo Vendedores no se abrió en esta
   *  sesión su listener está cerrado y el BehaviorSubject vacío, así que se
   *  hace una lectura puntual. Solo llegan acá roles con lectura de
   *  `vendedores` (ver el permiso de descarga: dev/admin). */
  private async nombresVendedor(): Promise<Record<string, string>> {
    const enMemoria = this.vendedorService.getVendedoresActuales();
    const lista = enMemoria.length > 0
      ? enMemoria
      : await this.vendedorService.obtenerTodosUnaVez();
    const mapa: Record<string, string> = {};
    for (const v of lista) {
      mapa[v.id] = this.vendedorService.nombre(v);
    }
    return mapa;
  }
}
```

(85 líneas, LF)

## PASO 3 — src/app/servicios/vendedores/vendedor.service.ts

BUSCAR (6 líneas):

```
    return this.getVendedoresActuales().find(v => v.id === id);
  }

  /** 'Apellido, Nombre'. */
  nombre(v: VendedorNuevo): string {
    return `${v.datosPersonales.apellido}, ${v.datosPersonales.nombre}`;
```

REEMPLAZAR por (26 líneas):

```
    return this.getVendedoresActuales().find(v => v.id === id);
  }

  /** Lectura puntual (one-shot, sin listener) de TODOS los vendedores,
   *  normalizados igual que los del listener.
   *
   *  Hace falta porque `init()` se llama desde el shell del módulo Vendedores,
   *  no al arrancar la app: desde cualquier otra pantalla el BehaviorSubject
   *  está vacío (`getVendedoresActuales()` da `[]`) salvo que esa sesión haya
   *  entrado a Vendedores. El primer consumidor es el Excel del listado de
   *  Clientes, que necesita el NOMBRE del vendedor para la columna de
   *  asignaciones (el porcentaje ya está en `Cliente.comisionesVenta`).
   *
   *  No abre el listener a propósito: una descarga no justifica dejar un
   *  stream vivo de una colección de otro módulo. Mismo criterio que
   *  `DbFirestoreService.obtenerTodosConId` en el resto de las consultas
   *  puntuales. Solo la llaman roles con lectura de `vendedores`
   *  (dev/admin/demo); con otro rol, las reglas rechazan la lectura. */
  async obtenerTodosUnaVez(): Promise<ConId<VendedorNuevo>[]> {
    const docs = await this.db.obtenerTodosConId<any>(VendedorService.COLECCION);
    return this.ordenar(docs.map(d => this.normalizar({ id: d.id, ...d.data })));
  }

  /** 'Apellido, Nombre'. */
  nombre(v: VendedorNuevo): string {
    return `${v.datosPersonales.apellido}, ${v.datosPersonales.nombre}`;
```

## Verificación

1. Hashes:
   - `git hash-object src/app/shared/utils/documento-entidades.util.ts` → `be9640140970ea34c10730577d98a40c519a5b96`
   - `git hash-object src/app/servicios/entidades/entidades-export.service.ts` → `bbe5b05bac5fbef03ed9be3289aa08ea30a5e086`
   - `git hash-object src/app/servicios/vendedores/vendedor.service.ts` → `d7adf87f6d2f09f6c2e29295dbb32e95ec526444`
2. `git status --short` → `M src/app/servicios/vendedores/vendedor.service.ts` y dos sin seguimiento:
   `?? src/app/servicios/entidades/` y `?? src/app/shared/utils/documento-entidades.util.ts`.
   `git diff --numstat` → una sola línea: `20	0	src/app/servicios/vendedores/vendedor.service.ts`
3. Las tres funciones puras y el agrupado:
   - `grep -c "^export function armarLibro" src/app/shared/utils/documento-entidades.util.ts` → `3`
   - `grep -rn "agruparVehiculosPorDuenio" src/ | cut -d: -f1 | sort | uniq -c` → `1` en el
     util (la definición) y `3` en la fachada (import, comentario y llamada)
4. La lectura puntual, definida una vez y con un solo consumidor:
   `grep -rn "obtenerTodosUnaVez" src/ | cut -d: -f1 | sort | uniq -c` → `1` en
   `vendedor.service.ts` y `1` en `entidades-export.service.ts`.
5. Nadie conecta todavía la fachada (eso es IE3b):
   `grep -rn "EntidadesExportService" src/app/raiz | wc -l` → `0`.
6. El camino viejo sigue igual: el grep del PASO 0 punto 5 tiene que seguir dando `9`.
7. `npx tsc -p tsconfig.app.json --noEmit` → sin errores.
8. `npx tsc -p tsconfig.app.json --noEmit --noUnusedLocals` → solo el error preexistente de
   `appVersion` en `app.component.ts`.
9. `npm run build:demo` → OK, 9 advertencias, inicial 1,53 MB. Los chunks no se mueven:
   nadie importa todavía los archivos nuevos.

## Pruebas manuales en demo (las hago yo)

Este bloque no cambia nada visible — lo que hay que probar es que no rompió nada:

1. **Los tres listados siguen funcionando igual:** Clientes, Choferes y Proveedores →
   "Descargar" baja el archivo de siempre (el del camino viejo, con la columna Vehículos
   todavía vacía en Choferes). El filtro Visibles/Todos sigue igual.
2. **Vendedores sigue entero:** Vendedores → Listado y Tablero cargan, el alta/edición de
   un vendedor con asignaciones guarda bien y el historial se ve. Es el único archivo
   existente que toca este bloque.
3. Nada más: la fachada nueva todavía no tiene consumidores.

## Mensaje de commit

```
IE3 (informes): los tres listados de entidades por el camino nuevo, al lado del viejo

- documento-entidades.util (nuevo, puro): armarLibroClientes /
  armarLibroChoferes / armarLibroProveedores. Cliente y Proveedor comparten
  COLUMNAS_EMPRESA (las 12 columnas que ya compartian en el informe viejo, que
  usaba una sola funcion para los dos). Las tres salen como Tabla de Excel
  (campo de IE2), sin fila de totales: no hay nada numerico que sumar.
- Arregla la columna Vehiculos del listado de Choferes: ExcelService lee
  (chofer as any).vehiculo, campo del modelo viejo que Chofer ya no tiene, asi
  que salia vacia SIEMPRE. Ahora se resuelven por Vehiculo.asignadoA
  (agruparVehiculosPorDuenio, puro). Un chofer de proveedor no tiene vehiculos
  propios: los de su proveedor figuran en el listado de Proveedores.
- Proveedores gana Choferes y Vehiculos; Clientes gana Vendedores asignados
  ("Apellido, Nombre (35%)" por renglon; "Sin resolver (10%)" si el vendedor
  ya no esta, para no perder el porcentaje).
- VendedorService.obtenerTodosUnaVez: lectura puntual sin listener. init() se
  llama desde el shell de Vendedores, no al arrancar la app, asi que desde el
  listado de Clientes el BehaviorSubject esta vacio. Funciona porque IE2c dejo
  la descarga en dev/admin, los roles que pueden leer 'vendedores'.
- EntidadesExportService (nuevo): la unica puerta de las tres pantallas.
  Resuelve datos (vehiculos en memoria, choferes de un proveedor, nombres de
  vendedor) y compone funcion pura + renderer + FileSaver. Solo Excel y sin
  log (D2 y D7).
- Fecha de Nacimiento pasa a fecha real (ordena y filtra como fecha), via
  normalizarFechaNacimiento: convierte los Timestamp legacy y deja la celda
  vacia si no es una fecha de negocio. CUIT sigue como texto.
- Nada conectado todavia: los tres botones siguen llamando a ExcelService
  hasta IE3b. Cero cambios visibles.
```

FIN DE LA INSTRUCCIÓN IE3
