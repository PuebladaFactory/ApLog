import { ConId } from 'src/app/interfaces/conId';
import { InformeOpNuevo } from 'src/app/interfaces/informe-op-nuevo';
import { TipoCeldaDoc } from 'src/app/interfaces/documento-tabular';
import { nombreEntidadRef } from './entidad-informe.util';

/** Columnas del informe de liquidación — mismos nombres que el camino viejo
 *  (ResumenOpLiquidadasComponent); se persisten como string[] en
 *  InformeLiqNuevo.columnas. Compartido por LiquidacionNuevaComponent (armado),
 *  InformeLiqNuevoDetalleComponent (detalle/edición) y armarDocumentoLiq
 *  (Excel/PDF). */
export interface ColumnaLiq {
  nombre: string;
  seleccionada: boolean;
}

/** Tipo de dato de una columna: decide el formato en pantalla y en Excel/PDF. */
export type TipoColumnaLiq = TipoCeldaDoc;

const COLUMNAS_LIQ: ReadonlyArray<ColumnaLiq> = [
  { nombre: 'Fecha', seleccionada: true },
  { nombre: 'Quincena', seleccionada: true },
  { nombre: 'Chofer', seleccionada: true },
  { nombre: 'Cliente', seleccionada: true },
  { nombre: 'Patente', seleccionada: false },
  { nombre: 'Concepto', seleccionada: true },
  { nombre: 'Observaciones', seleccionada: false },
  { nombre: 'Hoja de Ruta', seleccionada: false },
  { nombre: 'Km', seleccionada: true },
  { nombre: 'Jornada', seleccionada: true },
  { nombre: 'Ad Km', seleccionada: true },
  { nombre: 'Ad Acomp', seleccionada: true },
  { nombre: 'Extra', seleccionada: true },
  { nombre: 'A Cobrar', seleccionada: true },
];

/** Columnas que no son texto. Las que no figuran acá son 'texto'. */
const TIPO_COLUMNA: Readonly<Record<string, TipoColumnaLiq>> = {
  'Fecha': 'fecha',
  'Km': 'numero',
  'Jornada': 'moneda',
  'Ad Km': 'moneda',
  'Ad Acomp': 'moneda',
  'Extra': 'moneda',
  'A Cobrar': 'moneda',
};

/** Columnas disponibles para un tipo (sin la columna de la propia entidad),
 *  copias nuevas. Si se pasa `seleccionadas`, marca exactamente esas (caso
 *  edición: columnas guardadas en el informe); si no, usa los defaults. */
export function columnasPorTipo(
  tipo: 'cliente' | 'chofer' | 'proveedor',
  seleccionadas?: string[],
): ColumnaLiq[] {
  return COLUMNAS_LIQ
    .filter(c => !(tipo === 'cliente' && c.nombre === 'Cliente'))
    .filter(c => !(tipo === 'chofer' && c.nombre === 'Chofer'))
    .map(c => ({
      nombre: c.nombre,
      seleccionada: seleccionadas ? seleccionadas.includes(c.nombre) : c.seleccionada,
    }));
}

export function tipoColumna(columna: string): TipoColumnaLiq {
  return TIPO_COLUMNA[columna] ?? 'texto';
}

export function esColumnaMonto(columna: string): boolean {
  return tipoColumna(columna) === 'moneda';
}

/** Valor CRUDO de una columna sobre un InformeOpNuevo: number para
 *  'numero'/'moneda', 'YYYY-MM-DD' para 'fecha' (sin pasar por Date), string
 *  para 'texto'. Única definición de lo que muestra cada columna: la usan la
 *  pantalla (valorColumnaInformeOp) y la exportación (armarDocumentoLiq).
 *  Acepta elementos de snapshot (InformeOpNuevo sin `id`). En 'Cliente' (tipo
 *  chofer/proveedor) la contraparte ES el cliente. */
export function valorCrudoColumna(
  inf: ConId<InformeOpNuevo> | InformeOpNuevo,
  columna: string,
): string | number {
  switch (columna) {
    case 'Fecha': return inf.fecha;
    case 'Quincena': return Number(inf.fecha.split('-')[2]) <= 15 ? '1°' : '2°';
    case 'Chofer': return `${inf.datosOperacion.chofer.apellido} ${inf.datosOperacion.chofer.nombre}`;
    case 'Cliente': return nombreEntidadRef(inf.contraParte.entidad);
    case 'Patente': return inf.datosOperacion.vehiculo.dominio;
    case 'Concepto': return inf.datosOperacion.vehiculo.categoria.nombre;
    case 'Observaciones': return inf.datosOperacion.observaciones ?? '';
    case 'Hoja de Ruta': return inf.datosOperacion.hojaRuta ?? '';
    case 'Km': return inf.datosOperacion.km ?? 0;
    case 'Jornada': return inf.valores.tarifaBase ?? 0;
    case 'Ad Km': return inf.valores.kmMonto ?? 0;
    case 'Ad Acomp': return inf.valores.acompaniante ?? 0;
    case 'Extra': return inf.valores.adExtra ?? 0;
    case 'A Cobrar': return inf.valores.total ?? 0;
    default: return '';
  }
}

/** Valor de celda para PANTALLA: el valor crudo formateado (montos como
 *  "$ 1.234,56"; el resto como texto; la fecha queda 'YYYY-MM-DD', igual que
 *  antes de X0). */
export function valorColumnaInformeOp(inf: ConId<InformeOpNuevo>, columna: string): string {
  const valor = valorCrudoColumna(inf, columna);
  return tipoColumna(columna) === 'moneda' ? moneda(valor as number) : String(valor);
}

/** Etiqueta de presentación de una columna según el tipo del informe. El
 *  nombre persistido no cambia ('A Cobrar' en InformeLiqNuevo.columnas); para
 *  chofer/proveedor el monto propio (valores.total) es lo que se les PAGA. */
export function etiquetaColumna(
  columna: string,
  tipo: 'cliente' | 'chofer' | 'proveedor',
): string {
  if (columna === 'A Cobrar' && tipo !== 'cliente') return 'A Pagar';
  return columna;
}

function moneda(valor: number): string {
  return `$ ${(valor ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
