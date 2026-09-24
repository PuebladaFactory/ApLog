import { Injectable } from '@angular/core';
import { ConId } from 'src/app/interfaces/conId';
import { InformeOpNuevo } from 'src/app/interfaces/informe-op-nuevo';
import { RefCliente, RefChofer, RefProveedor } from 'src/app/interfaces/operacion';
import {
  DescuentoLiq,
  InformeLiqNuevo,
  PeriodoLiq,
  ValoresFinancierosLiq,
  ValoresLiq,
} from 'src/app/interfaces/informe-liq-nuevo';

export interface DatosCrearInformeLiq {
  tipo: 'cliente' | 'chofer' | 'proveedor';
  entidad: RefCliente | RefChofer | RefProveedor;
  periodo: PeriodoLiq;
  informesOp: ConId<InformeOpNuevo>[];
  descuentos: DescuentoLiq[];
  columnas: string[];
  observaciones: string;
  modo: 'borrador' | 'emitido';
  numeroInterno: string | null;     // obligatorio si modo === 'emitido', ignorado si 'borrador'
  fecha: string;                    // ISO YYYY-MM-DD — la resuelve el caller
}

/** Construcción pura de InformeLiqNuevo — sin Firestore, sin decidir ids ni
 *  números (el caller los obtiene antes). Mismo rol que
 *  InformeOpFactoryService para InformeOpNuevo. Las validaciones de negocio
 *  (misma entidad, estados, tope, ventana de período) son del orquestador
 *  (InformeLiqService, B1), no de acá. */
@Injectable({ providedIn: 'root' })
export class InformeLiqFactoryService {

  crear(idInfLiq: string, d: DatosCrearInformeLiq): InformeLiqNuevo {
    if (d.modo === 'emitido' && !d.numeroInterno) {
      throw new Error('InformeLiqFactory.crear: un informe emitido requiere numeroInterno.');
    }
    const valores = this.calcularValores(d.informesOp, d.descuentos);
    const emitido = d.modo === 'emitido';

    return {
      idInfLiq,
      tipo: d.tipo,
      entidad: d.entidad,
      estado: d.modo,
      numeroInterno: emitido ? d.numeroInterno : null,
      fechaCreacion: d.fecha,
      fechaEmision: emitido ? d.fecha : null,
      periodo: { ...d.periodo },
      informesOp: d.informesOp.map(i => i.idInfOp),
      cantidadOperaciones: d.informesOp.length,
      valores,
      descuentos: d.descuentos.map(x => ({ ...x })),
      columnas: [...d.columnas],
      observaciones: d.observaciones,
      valoresFinancieros: this.valoresFinancierosIniciales(valores.total),
      estadoFinanciero: 'pendiente',
      facturaUrl: null,
      factura: null,
      anulacion: null,
    };
  }

  /** Suma de los InformeOp + descuentos. Mismo criterio que
   *  LiquidacionBuilderService.calcularValores (camino viejo). */
  calcularValores(informesOp: ConId<InformeOpNuevo>[], descuentos: DescuentoLiq[]): ValoresLiq {
    let totalTarifaBase = 0;
    let totalAcompaniante = 0;
    let totalKmMonto = 0;
    let totalAdExtra = 0;
    let totalContraParte = 0;

    for (const inf of informesOp) {
      totalTarifaBase += inf.valores.tarifaBase ?? 0;
      totalAcompaniante += inf.valores.acompaniante ?? 0;
      totalKmMonto += inf.valores.kmMonto ?? 0;
      totalAdExtra += inf.valores.adExtra ?? 0;
      totalContraParte += inf.contraParte?.monto ?? 0;
    }

    return this.recalcularTotal(
      { totalTarifaBase, totalAcompaniante, totalKmMonto, totalAdExtra, descuentoTotal: 0, total: 0, totalContraParte },
      descuentos,
    );
  }

  /** Recalcula descuentoTotal y total a partir de los 4 totales base — lo
   *  usan crear() y la edición de descuentos (B3). No toca los totales base
   *  ni totalContraParte. */
  recalcularTotal(valores: ValoresLiq, descuentos: DescuentoLiq[]): ValoresLiq {
    const descuentoTotal = descuentos.reduce((acc, x) => acc + (x.valor ?? 0), 0);
    const total =
      valores.totalTarifaBase + valores.totalAcompaniante + valores.totalKmMonto +
      valores.totalAdExtra + descuentoTotal;
    return { ...valores, descuentoTotal, total };
  }

  /** Recalcula total/saldo SIN pisar lo cobrado — para cuando cambia el total
   *  de un informe existente (edición, B3). */
  recalcularValoresFinancieros(actual: ValoresFinancierosLiq, nuevoTotal: number): ValoresFinancierosLiq {
    return { total: nuevoTotal, totalCobrado: actual.totalCobrado, saldo: nuevoTotal - actual.totalCobrado };
  }

  /** Body a persistir: excluye idInfLiq (id del documento) y `id` (metadata
   *  ConId), mismo criterio que OperacionFactoryService.opToFirestore. */
  toFirestore(informe: InformeLiqNuevo | ConId<InformeLiqNuevo>): Omit<InformeLiqNuevo, 'idInfLiq'> {
    const { idInfLiq, id, ...resto } = informe as any;
    return resto;
  }

  private valoresFinancierosIniciales(total: number): ValoresFinancierosLiq {
    return { total, totalCobrado: 0, saldo: total };
  }
}
