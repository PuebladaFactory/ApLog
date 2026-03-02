import { Injectable } from '@angular/core';


export interface InformeFinanciero {
  id: string;

  estado: 'borrador' | 'emitido' | 'facturado' | 'anulado';

  valoresFinancieros: {
    total: number;
    totalCobrado: number;
    saldo: number;
  };
}

export interface ImputacionInput {
  informeId: string;
  montoImputado: number;
}

export interface MovimientoImpactInput {
  informes: InformeFinanciero[];
  imputaciones: ImputacionInput[];
}

export interface InformeActualizado {
  id: string;

  valoresFinancieros: {
    total: number;
    totalCobrado: number;
    saldo: number;
  };

  estadoFinanciero: 'pendiente' | 'parcial' | 'cobrado';
}

export interface MovimientoImpactResult {
  informesActualizados: InformeActualizado[];
  totalMovimiento: number;
}

@Injectable({
  providedIn: 'root'
})
export class SaldoEngine {

  // ================================
  // CREAR MOVIMIENTO
  // ================================

  static calcularImpactoMovimiento(
    input: MovimientoImpactInput
  ): MovimientoImpactResult {

    const { informes, imputaciones } = input;

    if (!informes.length) {
      throw new Error('No hay informes para procesar');
    }

    if (!imputaciones.length) {
      throw new Error('No hay imputaciones');
    }

    let totalMovimiento = 0;

    const informesActualizados: InformeActualizado[] = [];

    for (const imp of imputaciones) {

      if (imp.montoImputado <= 0) {
        throw new Error('Monto imputado inválido');
      }

      const informe = informes.find(i => i.id === imp.informeId);

      if (!informe) {
        throw new Error(`Informe ${imp.informeId} no encontrado`);
      }

      if (informe.estado === 'anulado' || informe.estado === 'borrador') {
        throw new Error(`Informe ${imp.informeId} no permite imputaciones`);
      }

      const vf = informe.valoresFinancieros;

      if (imp.montoImputado > vf.saldo) {
        throw new Error(`Monto supera saldo disponible en informe ${imp.informeId}`);
      }

      const nuevoTotalCobrado = vf.totalCobrado + imp.montoImputado;
      const nuevoSaldo = vf.total - nuevoTotalCobrado;

      let nuevoEstado: 'pendiente' | 'parcial' | 'cobrado';

      if (nuevoSaldo <= 0) {
        nuevoEstado = 'cobrado';
      } else if (nuevoTotalCobrado > 0) {
        nuevoEstado = 'parcial';
      } else {
        nuevoEstado = 'pendiente';
      }

      informesActualizados.push({
        id: informe.id,
        valoresFinancieros: {
          total: vf.total,
          totalCobrado: nuevoTotalCobrado,
          saldo: nuevoSaldo
        },
        estadoFinanciero: nuevoEstado
      });

      totalMovimiento += imp.montoImputado;
    }

    const sumaImputaciones = imputaciones.reduce(
      (acc, i) => acc + i.montoImputado,
      0
    );

    if (totalMovimiento !== sumaImputaciones) {
      throw new Error('Inconsistencia en total del movimiento');
    }

    return {
      informesActualizados,
      totalMovimiento
    };
  }

  // ================================
  // ANULAR MOVIMIENTO
  // ================================

  static revertirImpactoMovimiento(
    input: MovimientoImpactInput
  ): MovimientoImpactResult {

    const { informes, imputaciones } = input;

    let totalMovimiento = 0;

    const informesActualizados: InformeActualizado[] = [];

    for (const imp of imputaciones) {

      const informe = informes.find(i => i.id === imp.informeId);

      if (!informe) {
        throw new Error(`Informe ${imp.informeId} no encontrado`);
      }

      const vf = informe.valoresFinancieros;

      const nuevoTotalCobrado = vf.totalCobrado - imp.montoImputado;

      if (nuevoTotalCobrado < 0) {
        throw new Error(`Reversión inválida en informe ${imp.informeId}`);
      }

      const nuevoSaldo = vf.total - nuevoTotalCobrado;

      let nuevoEstado: 'pendiente' | 'parcial' | 'cobrado';

      if (nuevoSaldo === vf.total) {
        nuevoEstado = 'pendiente';
      } else if (nuevoSaldo > 0) {
        nuevoEstado = 'parcial';
      } else {
        nuevoEstado = 'cobrado';
      }

      informesActualizados.push({
        id: informe.id,
        valoresFinancieros: {
          total: vf.total,
          totalCobrado: nuevoTotalCobrado,
          saldo: nuevoSaldo
        },
        estadoFinanciero: nuevoEstado
      });

      totalMovimiento += imp.montoImputado;
    }

    return {
      informesActualizados,
      totalMovimiento
    };
  }
}
