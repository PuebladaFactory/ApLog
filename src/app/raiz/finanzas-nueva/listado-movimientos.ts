import { ConId } from 'src/app/interfaces/conId';
import { MovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { AccionListado, ColumnaListado } from 'src/app/interfaces/tabla-listado';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import {
  ETIQUETA_CONCEPTO, ETIQUETA_MOTIVO_AJUSTE, ETIQUETA_TIPO_MOVIMIENTO, resumenMedios,
} from 'src/app/shared/utils/movimiento-fin.util';

/** Columnas y acciones de fila de un listado de movimientos de Finanzas —
 *  compartidas por la pestaña Movimientos y la Cuenta de la entidad (F5).
 *  Los ids de acción ('ver', 'imputar', 'anular') los resuelve
 *  AccionesMovimientoService. */

export type FilaMovimiento = ConId<MovimientoFin>;

export function accionesMovimientos(): AccionListado<FilaMovimiento>[] {
  return [
    { id: 'ver', label: 'Ver', clase: 'btn-outline-primary' },
    {
      id: 'imputar', label: 'Imputar', clase: 'btn-outline-success', permiso: 'finanzas.editar',
      visible: m => m.estado === 'vigente' && m.tipo !== 'ajuste' && m.sinImputar > 0,
    },
    {
      id: 'anular', label: 'Anular', clase: 'btn-outline-danger', permiso: 'finanzas.anular',
      visible: m => m.estado === 'vigente',
      deshabilitada: m => m.imputaciones.some(i => i.origen === 'compensacion'),
    },
  ];
}

/** `conEntidad`: false en la Cuenta de la entidad (la entidad ya es el
 *  encabezado). */
export function columnasMovimientos(opciones: { conEntidad: boolean }): ColumnaListado<FilaMovimiento>[] {
  type Fila = FilaMovimiento;
    const tachado = (m: Fila) => (m.estado === 'anulado' ? 'text-decoration-line-through text-muted' : '');
    const columnas: ColumnaListado<Fila>[] = [
      {
        key: 'fecha', label: 'Fecha', valor: m => fechaComprobanteLegible(m.fecha),
        orden: m => `${m.fecha}|${m.fechaRegistro}`, align: 'center',
      },
      { key: 'numero', label: 'Número', valor: m => m.numero, orden: m => m.numero, clase: tachado },
      {
        key: 'tipo', label: 'Tipo', valor: m => ETIQUETA_TIPO_MOVIMIENTO[m.tipo], orden: m => m.tipo,
        clase: m => (m.tipo === 'ajuste' ? 'text-info-emphasis fw-semibold' : 'text-success fw-semibold'),
      },
      {
        key: 'concepto', label: 'Concepto',
        valor: m => (m.tipo === 'ajuste'
          ? (m.motivoAjuste ? ETIQUETA_MOTIVO_AJUSTE[m.motivoAjuste] : '—')
          : ETIQUETA_CONCEPTO[m.concepto]),
        orden: m => m.concepto,
        clase: m => (m.concepto === 'anticipo' || m.concepto === 'prestamo' ? 'text-warning-emphasis fw-semibold' : ''),
      },
      { key: 'entidad', label: 'Entidad', valor: m => m.entidad.razonSocial, orden: m => m.entidad.razonSocial },
      {
        key: 'tipoEntidad', label: 'Tipo entidad', valor: m => m.entidad.tipo, orden: m => m.entidad.tipo,
        clase: 'text-capitalize',
      },
      { key: 'medios', label: 'Medios', valor: m => resumenMedios(m.medios) },
      {
        key: 'total', label: 'Total', valor: m => m.total, orden: m => m.total, tipo: 'moneda',
        clase: tachado,
      },
      { key: 'imputado', label: 'Imputado', valor: m => m.totalImputado, orden: m => m.totalImputado, tipo: 'moneda' },
      {
        key: 'sinImputar', label: 'Sin imputar', valor: m => m.sinImputar, orden: m => m.sinImputar, tipo: 'moneda',
        clase: m => (m.estado === 'vigente' && m.sinImputar > 0 ? 'text-warning fw-bold' : ''),
      },
      {
        key: 'estado', label: 'Estado', valor: m => (m.estado === 'anulado' ? 'Anulado' : 'Vigente'),
        orden: m => m.estado, align: 'center',
        clase: m => (m.estado === 'anulado' ? 'text-danger fw-bold' : ''),
      },
    ];
  return opciones.conEntidad ? columnas : columnas.filter(c => c.key !== 'entidad' && c.key !== 'tipoEntidad');
}
