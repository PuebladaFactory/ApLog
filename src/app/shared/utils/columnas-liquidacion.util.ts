import { ConId } from 'src/app/interfaces/conId';
import { InformeOpNuevo } from 'src/app/interfaces/informe-op-nuevo';
import { nombreEntidadRef } from './entidad-informe.util';

/** Columnas del informe de liquidación — mismos nombres que el camino viejo
 *  (ResumenOpLiquidadasComponent); se persisten como string[] en
 *  InformeLiqNuevo.columnas. Compartido por LiquidacionNuevaComponent (armado)
 *  e InformeLiqNuevoDetalleComponent (detalle/edición). */
export interface ColumnaLiq {
  nombre: string;
  seleccionada: boolean;
}

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

const COLUMNAS_MONTO = ['Jornada', 'Ad Km', 'Ad Acomp', 'Extra', 'A Cobrar'];

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

export function esColumnaMonto(columna: string): boolean {
  return COLUMNAS_MONTO.includes(columna);
}

/** Valor de celda por columna, sobre InformeOpNuevo. En 'Cliente' (tipo
 *  chofer/proveedor) la contraparte ES el cliente. */
export function valorColumnaInformeOp(inf: ConId<InformeOpNuevo>, columna: string): string {
  switch (columna) {
    case 'Fecha': return inf.fecha;
    case 'Quincena': return Number(inf.fecha.split('-')[2]) <= 15 ? '1°' : '2°';
    case 'Chofer': return `${inf.datosOperacion.chofer.apellido} ${inf.datosOperacion.chofer.nombre}`;
    case 'Cliente': return nombreEntidadRef(inf.contraParte.entidad);
    case 'Patente': return inf.datosOperacion.vehiculo.dominio;
    case 'Concepto': return inf.datosOperacion.vehiculo.categoria.nombre;
    case 'Observaciones': return inf.datosOperacion.observaciones ?? '';
    case 'Hoja de Ruta': return inf.datosOperacion.hojaRuta ?? '';
    case 'Km': return String(inf.datosOperacion.km ?? 0);
    case 'Jornada': return moneda(inf.valores.tarifaBase);
    case 'Ad Km': return moneda(inf.valores.kmMonto);
    case 'Ad Acomp': return moneda(inf.valores.acompaniante);
    case 'Extra': return moneda(inf.valores.adExtra ?? 0);
    case 'A Cobrar': return moneda(inf.valores.total);
    default: return '';
  }
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
