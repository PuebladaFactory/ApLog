import { Injectable } from "@angular/core";
import {
  Descuento,
  EntidadLiq,
  InformeLiq,
  Valores,
  ValoresFinancieros,
} from "src/app/interfaces/informe-liq";
import { InformeOp } from "src/app/interfaces/informe-op";
import { NumeradorService } from "../numerador/numerador.service";
import { ConId } from "src/app/interfaces/conId";
import { toISODateString } from "../fechas/date-range.service";

export interface CrearLiquidacionParams {
  tipo: "cliente" | "chofer" | "proveedor";

  informesOp: ConId<InformeOp>[];

  entidad: EntidadLiq;

  descuentos?: Descuento[];

  columnas: string[];

  mes?:
    | "Enero"
    | "Febrero"
    | "Marzo"
    | "Abril"
    | "Mayo"
    | "Junio"
    | "Julio"
    | "Agosto"
    | "Septiembre"
    | "Noviembre"
    | "Diciembre";

  periodo?: "mes" | "1° quincena" | "2° quincena";

  modo: "factura" | "proforma";

  obsInterna:string;
}

@Injectable({
  providedIn: "root",
})
export class LiquidacionBuilderService {
  constructor
  (private numeradorService: NumeradorService,    
  ) {}

  async construirInforme(params: CrearLiquidacionParams): Promise<InformeLiq> {
    const operaciones = params.informesOp.map((i) => i.idOperacion);

    const valores = this.calcularValores(
      params.informesOp,
      params.descuentos ?? [],
    );

    const valoresFinancieros: ValoresFinancieros = {
      total: valores.total,
      totalCobrado: 0,
      saldo: valores.total,
    };

    let fecha = new Date;
    let fechaStr = toISODateString(fecha)

    const numero = await this.generarNumeroInterno(params.tipo, params.modo);

    const informe: InformeLiq = {
      idInfLiq: new Date().getTime() + Math.floor(Math.random() * 1000),

      numeroInterno: numero,

      tipo: params.tipo,

      fecha: fechaStr,

      entidad: params.entidad,

      operaciones,

      valores,

      valoresFinancieros,

      descuentos: params.descuentos ?? [],

      columnas: params.columnas,

      estado: params.modo === 'proforma' ? 'borrador' : 'emitido',

      estadoFinanciero: "pendiente",

      cobrado: false,

      mes: params.mes,

      periodo: params.periodo,

      observaciones: params.obsInterna
    };

    return informe;
  }

  private calcularValores(
    informes: InformeOp[],
    descuentos: Descuento[],
  ): Valores {
    let totalTarifaBase = 0;
    let totalAcompaniante = 0;
    let totalkmMonto = 0;
    let totalAdExtra = 0;
    let descuentoTotal = 0;
    let totalContraParte = 0;

    for (const inf of informes) {
      const v = inf.valores;

      totalTarifaBase += v.tarifaBase ?? 0;

      totalAcompaniante += v.acompaniante ?? 0;

      totalkmMonto += v.kmMonto ?? 0;

      totalAdExtra += v.adExtra ?? 0;

      totalContraParte += inf.contraParteMonto ?? 0;
    }

    for (const desc of descuentos) {
      descuentoTotal += desc.valor;
    }

    const total =
      totalTarifaBase +
      totalAcompaniante +
      totalkmMonto +
      totalAdExtra -
      descuentoTotal;

    return {
      totalTarifaBase,

      totalAcompaniante,

      totalkmMonto,

      totalAdExtra,

      descuentoTotal,

      total,

      totalContraParte,
    };
  }

  public async generarNumeroInterno(
    tipo: "cliente" | "chofer" | "proveedor",
    modo: "factura" | "proforma",
  ): Promise<string> {
    if (modo === "proforma") {
      return "";
    }

    return await this.numeradorService.generarNumeroInterno(tipo);
  }
}
