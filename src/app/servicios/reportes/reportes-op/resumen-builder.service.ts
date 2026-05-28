import { Injectable } from "@angular/core";
import { KeyResumen } from "./reportes-op.service";
import { ResumenOpBase, ResumenOpEntidadMensual } from "src/app/interfaces/resumen-op-base";

@Injectable({
  providedIn: "root",
})
export class ResumenBuilderService {
  // =========================
  // 🔹 CREAR BASE
  // =========================
  public crearResumenBase(k: KeyResumen): ResumenOpBase | ResumenOpEntidadMensual {
    let base: ResumenOpBase = {
      anio: k.anio,
      mes: k.mes,
      periodo: k.anio * 100 + k.mes,
      tipo: k.tipo,
      cantidadOps: 0,
      kmRecorridos: 0,

      acompanianteOps: 0,
      acompanianteCantidadTotal: 0,

      tarifaTipo: {
        general: 0,
        especial: 0,
        personalizada: 0,
        eventual: 0,
      },

      cliente: {
        acompValor: 0,
        kmAdicional: 0,
        tarifaBase: 0,
        adExtraValor: 0,
        total: 0,
      },

      chofer: {
        acompValor: 0,
        kmAdicional: 0,
        tarifaBase: 0,
        adExtraValor: 0,
        total: 0,
      },

      ganancia: 0,
    };
    // 🔥 CLAVE
    if (k.tipo === "entidad") {
      return {
        ...base,
        entidadId: k.entidadId!,
        tipoEntidad: k.tipoEntidad!,
      };
    }

    return base;
  }

  public buildBase(r: any): ResumenOpBase {
  return {
    periodo: r.periodo ?? 0,
    anio: r.anio ?? 0,
    mes: r.mes ?? 0,
    tipo: r.tipo ?? 'general',

    cantidadOps: r.cantidadOps ?? 0,
    kmRecorridos: r.kmRecorridos ?? 0,
    acompanianteOps: r.acompanianteOps ?? 0,
    acompanianteCantidadTotal: r.acompanianteCantidadTotal ?? 0,
    ganancia: r.ganancia ?? 0,

    cliente: {
      acompValor: r.cliente?.acompValor ?? 0,
      kmAdicional: r.cliente?.kmAdicional ?? 0,
      tarifaBase: r.cliente?.tarifaBase ?? 0,
      adExtraValor: r.cliente?.adExtraValor ?? 0,
      total: r.cliente?.total ?? 0,
    },

    chofer: {
      acompValor: r.chofer?.acompValor ?? 0,
      kmAdicional: r.chofer?.kmAdicional ?? 0,
      tarifaBase: r.chofer?.tarifaBase ?? 0,
      adExtraValor: r.chofer?.adExtraValor ?? 0,
      total: r.chofer?.total ?? 0,
    },

    tarifaTipo: {
      general: r.tarifaTipo?.general ?? 0,
      especial: r.tarifaTipo?.especial ?? 0,
      eventual: r.tarifaTipo?.eventual ?? 0,
      personalizada: r.tarifaTipo?.personalizada ?? 0,
    },

    updatedAt: r.updatedAt ?? Date.now()
  };
}
}
