import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { FilaComprobanteCuenta, informeLiqAportaATotales } from './cuenta-entidad.util';
import { armarLibroCuenta, DatosExportCuenta } from './exportacion-finanzas.util';

/** Fila de Comprobantes de prueba: total 1000, compensado 200, saldo 800. */
function fila(estado: InformeLiqNuevo['estado'], numero: string): FilaComprobanteCuenta {
  const liq = { numeroInterno: numero, periodo: { anio: 2026, mes: 10, tramo: 'mes' }, fechaCreacion: '2026-10-31' } as InformeLiqNuevo;
  return {
    liq, estado, fechaEmision: '2026-10-31', fechaFactura: null,
    total: 1000, compensado: 200, cobrado: 0, ajustado: 0, saldo: estado === 'revertido' ? 0 : 800,
    dias: null, abierto: estado !== 'revertido', estadoFinanciero: 'pendiente',
  };
}

function datos(comprobantes: FilaComprobanteCuenta[]): DatosExportCuenta {
  return {
    tipo: 'cliente', nombre: 'Cliente', cuit: null,
    resumen: {
      saldoFacturado: 0, cantidadFacturados: 0, sinFacturar: 0, cantidadSinFacturar: 0, saldoAFavor: 0, saldoTotal: 0,
      tramos: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }, diasMasAntiguo: null,
    },
    comprobantes, soloAbiertos: false,
    mayor: { saldoAnterior: 0, lineas: [], totalDebe: 0, totalHaber: 0, saldoFinal: 0 },
    lineasMayor: [], mayorDesde: '', mayorHasta: '', movimientos: [], hoy: '2026-11-02',
  };
}

function hojaComprobantes(comprobantes: FilaComprobanteCuenta[]) {
  return armarLibroCuenta(datos(comprobantes)).hojas.find(h => h.nombre === 'Comprobantes')!;
}

describe('exportacion-finanzas.util — Comprobantes de la cuenta', () => {

  it('solo emitido y facturado aportan a los totales', () => {
    expect(informeLiqAportaATotales('emitido')).toBeTrue();
    expect(informeLiqAportaATotales('facturado')).toBeTrue();
    expect(informeLiqAportaATotales('borrador')).toBeFalse();
    expect(informeLiqAportaATotales('revertido')).toBeFalse();
    expect(informeLiqAportaATotales('anulado')).toBeFalse();
  });

  it('el revertido se lista pero no suma, con fila "Total vigentes" y nota', () => {
    const hoja = hojaComprobantes([fila('facturado', 'LQCL-1'), fila('revertido', 'LQCL-2'), fila('emitido', 'LQCL-3')]);
    const t = hoja.tablas[0];
    expect(t.filas.length).toBe(3);
    // Total, Compensado, Cobrado, Ajustado, Saldo: solo facturado + emitido.
    expect(t.filaTotal!.slice(5, 10)).toEqual([2000, 400, 0, 0, 1600]);
    expect(t.filaTotal![0]).toBe('Total vigentes');
    expect(hoja.notas.length).toBe(1);
    expect(hoja.notas[0]).toContain("'Revertido'");
  });

  it('sin comprobantes que no suman, el total es el de siempre y sin nota', () => {
    const hoja = hojaComprobantes([fila('facturado', 'LQCL-1'), fila('emitido', 'LQCL-3')]);
    expect(hoja.tablas[0].filaTotal![0]).toBe('Total');
    expect(hoja.tablas[0].filaTotal!.slice(5, 10)).toEqual([2000, 400, 0, 0, 1600]);
    expect(hoja.notas).toEqual([]);
  });
});
