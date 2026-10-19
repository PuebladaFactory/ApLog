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
