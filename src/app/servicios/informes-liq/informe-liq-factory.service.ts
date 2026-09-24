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

  /** Ventana de fechas (ISO YYYY-MM-DD, inclusiva) que define un período:
   *  mes → 1 al último día; 1q → 1 al 15; 2q → 16 al último día. La usan
   *  InformeLiqService (validación) y la UI de liquidación (preselección, B2). */
  ventanaPeriodo(periodo: PeriodoLiq): { desde: string; hasta: string } {
    const mm = String(periodo.mes).padStart(2, '0');
    const ultimoDia = new Date(periodo.anio, periodo.mes, 0).getDate();
    const diaDesde = periodo.tramo === '2q' ? 16 : 1;
    const diaHasta = periodo.tramo === '1q' ? 15 : ultimoDia;
    return {
      desde: `${periodo.anio}-${mm}-${String(diaDesde).padStart(2, '0')}`,
      hasta: `${periodo.anio}-${mm}-${String(diaHasta).padStart(2, '0')}`,
    };
  }

  /** Texto legible del período para logs y títulos: "09/2026 · 1° quincena". */
  textoPeriodo(periodo: PeriodoLiq): string {
    const tramo = periodo.tramo === 'mes' ? 'mes completo'
      : periodo.tramo === '1q' ? '1° quincena' : '2° quincena';
    return `${String(periodo.mes).padStart(2, '0')}/${periodo.anio} · ${tramo}`;
  }

  private valoresFinancierosIniciales(total: number): ValoresFinancierosLiq {
    return { total, totalCobrado: 0, saldo: total };
  }
}
