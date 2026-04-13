import { Injectable } from "@angular/core";
import { ResumenOpBase } from "src/app/interfaces/resumen-op-base";

export type TipoVistaResumen = "cliente" | "chofer" | "proveedor" | "general";
export type ModoVista = "totales" | "promedios" | "porcentajes";

export interface ColumnaResumen {
  key: string;
  label: string;
  tipo: "number" | "currency";
  visible: boolean;
  valueFn: (r: ResumenOpBase, modo: ModoVista) => number | null;
  tooltip?: (modo: ModoVista) => string;
}

@Injectable({ providedIn: "root" })
export class TablaResumenConfigService {
  // =========================
  // 🔹 PUBLIC API
  // =========================
  getColumnas(tipo: TipoVistaResumen): ColumnaResumen[] {
    switch (tipo) {
      case "cliente":
        return this.columnasCliente();
      case "chofer":
      case "proveedor":
        return this.columnasChofer();
      case "general":
        return this.columnasGeneral();
    }
  }

  formatValue(valor: number | null, tipo: string, modo: ModoVista): string {
    if (valor === null) return "-";

    if (modo === "porcentajes") {
      return (valor * 100).toFixed(1) + "%";
    }

    if (tipo === "currency") {
      return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(valor);
    }

    return valor.toFixed(1);
  }

  // =========================
  // 🔹 HELPERS
  // =========================
  private promedio(valor: number, divisor: number): number {
    return divisor ? valor / divisor : 0;
  }

  private porcentaje(valor: number, total: number): number {
    return total ? valor / total : 0;
  }

  // =========================
  // 🔹 BASE
  // =========================
  private columnasBase(): ColumnaResumen[] {
    return [
      // Ops
      {
        key: "ops",
        label: "Ops",
        tipo: "number",
        visible: true,
        valueFn: (r, modo) => {
          switch (modo) {
            case "totales":
              return r.cantidadOps;
            case "promedios":
              return this.promedio(r.cantidadOps, 30);
            case "porcentajes":
              return null;
          }
        },
        tooltip: (modo) => {
          switch (modo) {
            case "totales":
              return "Cantidad total de operaciones en el mes";

            case "promedios":
              return "Promedio de operaciones por día (30 días)";

            case "porcentajes":
              return "No aplica";
          }
        },
      },

      // Km
      {
        key: "km",
        label: "Km",
        tipo: "number",
        visible: true,
        valueFn: (r, modo) => {
          switch (modo) {
            case "totales":
              return r.kmRecorridos;
            case "promedios":
              return this.promedio(r.kmRecorridos, r.cantidadOps);
            case "porcentajes":
              return null;
          }
        },
        tooltip: (modo) => {
          switch (modo) {
            case "totales":
              return "Cantidad total de km";

            case "promedios":
              return "Promedio de km por op";

            case "porcentajes":
              return "No aplica";
          }
        },
      },

      // Ops con acompañante
      {
        key: "acompOps",
        label: "Acomp Ops",
        tipo: "number",
        visible: true,
        valueFn: (r, modo) => {
          switch (modo) {
            case "totales":
              return r.acompanianteOps;
            case "promedios":
              return null;
            case "porcentajes":
              return this.porcentaje(r.acompanianteOps, r.cantidadOps);
          }
        },
        tooltip: (modo) => {
          switch (modo) {
            case "totales":
              return "Cantidad total de op con acompañante";

            case "promedios":
              return "Promedio de op con acompañante";

            case "porcentajes":
              return "No aplica";
          }
        },
      },

      // Cantidad de acompañantes
      {
        key: "acompCant",
        label: "Cant Acomp",
        tipo: "number",
        visible: true,
        valueFn: (r, modo) => {
          switch (modo) {
            case "totales":
              return r.acompanianteCantidadTotal;
            case "promedios":
              return this.promedio(
                r.acompanianteCantidadTotal,
                r.acompanianteOps,
              );
            case "porcentajes":
              return null;
          }
        },
        tooltip: (modo) => {
          switch (modo) {
            case "totales":
              return "Cantidad total de acompañantes en las op";

            case "promedios":
              return "Promedio de acompañantes por op con acompañante";

            case "porcentajes":
              return "No aplica";
          }
        },
      },
    ];
  }

  // =========================
  // 🔹 CLIENTE
  // =========================
  private columnasCliente(): ColumnaResumen[] {
    return [
      ...this.columnasBase(),

      // FACTURADO
      {
        key: "facturado",
        label: "Facturado",
        tipo: "currency",
        visible: true,
        valueFn: (r, modo) => {
          switch (modo) {
            case "totales":
              return r.cliente.total;
            case "promedios":
              return this.promedio(r.cliente.total, r.cantidadOps);
            case "porcentajes":
              return 1; // base 100%
          }
        },
        tooltip: (modo) => {
          switch (modo) {
            case "totales":
              return "Facturación total de las op en el mes";

            case "promedios":
              return "Promedio de facturación por op";

            case "porcentajes":
              return "Representa el 100% del total";
          }
        },
      },

      // DESGLOSE
      ...this.columnasValores("cliente", (r) => r.cliente.total),
    ];
  }

  // =========================
  // 🔹 CHOFER / PROVEEDOR
  // =========================
  private columnasChofer(): ColumnaResumen[] {
    return [
      ...this.columnasBase(),

      {
        key: "costo",
        label: "Costo",
        tipo: "currency",
        visible: true,
        valueFn: (r, modo) => {
          switch (modo) {
            case "totales":
              return r.chofer.total;
            case "promedios":
              return this.promedio(r.chofer.total, r.cantidadOps);
            case "porcentajes":
              return 1;
          }
        },
        tooltip: (modo) => {
          switch (modo) {
            case "totales":
              return "Costo total de las op en el mes";

            case "promedios":
              return "Promedio del costo por op";

            case "porcentajes":
              return "Representa el 100% del total";
          }
        },
      },

      ...this.columnasValores("chofer", (r) => r.chofer.total),
    ];
  }

  // =========================
  // 🔹 GENERAL
  // =========================
  private columnasGeneral(): ColumnaResumen[] {
    return [
      ...this.columnasBase(),

      {
        key: "facturado",
        label: "Facturado",
        tipo: "currency",
        visible: true,
        valueFn: (r, modo) => {
          switch (modo) {
            case "totales":
              return r.cliente.total;
            case "promedios":
              return this.promedio(r.cliente.total, r.cantidadOps);
            case "porcentajes":
              return 1;
          }
        },
        tooltip: (modo) => {
          switch (modo) {
            case "totales":
              return "Facturación total de las op en el mes";

            case "promedios":
              return "Promedio de facturación por op";

            case "porcentajes":
              return "Representa el 100% del total";
          }
        },
      },

      {
        key: "costo",
        label: "Costo",
        tipo: "currency",
        visible: true,
        valueFn: (r, modo) => {
          switch (modo) {
            case "totales":
              return r.chofer.total;
            case "promedios":
              return this.promedio(r.chofer.total, r.cantidadOps);
            case "porcentajes":
              return this.porcentaje(r.chofer.total, r.cliente.total);
          }
        },
        tooltip: (modo) => {
          switch (modo) {
            case "totales":
              return "Costo total de las op en el mes";

            case "promedios":
              return "Promedio del costo por op";

            case "porcentajes":
              return "Promedio del costo en relación a la facturación total";
          }
        },
      },

      {
        key: "ganancia",
        label: "Ganancia",
        tipo: "currency",
        visible: true,
        valueFn: (r, modo) => {
          switch (modo) {
            case "totales":
              return r.ganancia;
            case "promedios":
              return this.promedio(r.ganancia, r.cantidadOps);
            case "porcentajes":
              return this.porcentaje(r.ganancia, r.cliente.total);
          }
        },
        tooltip: (modo) => {
          switch (modo) {
            case "totales":
              return "Ganancia total de las op en el mes";

            case "promedios":
              return "Promedio de ganancia por op";

            case "porcentajes":
              return "Procentaje de ganancia";
          }
        },
      },

      // desglose cliente (ingresos)
      ...this.columnasValores("cliente", (r) => r.cliente.total),
      ...this.columnasValores("chofer", (r) => r.chofer.total), // 👈 ojo acá
    ];
  }

  // =========================
  // 🔥 GENERADOR DE COLUMNAS VALORES
  // =========================
  private columnasValores(
    origen: "cliente" | "chofer",
    totalFn: (r: ResumenOpBase) => number,
  ): ColumnaResumen[] {
    return [
      {
        key: `tarifaBase_${origen}`,
        label: "Tarifa Base",
        tipo: "currency",
        visible: true,
        valueFn: (r, modo) => {
          const src = origen === "cliente" ? r.cliente : r.chofer;

          switch (modo) {
            case "totales":
              return src.tarifaBase;
            case "promedios":
              return this.promedio(src.tarifaBase, r.cantidadOps);
            case "porcentajes":
              return this.porcentaje(src.tarifaBase, totalFn(r));
          }
        },
        tooltip: (modo) => {
          switch (modo) {
            case "totales":
              return "Facturación de la tarifa base de las op en el mes";

            case "promedios":
              return "Promedio de facturación de la tarifa base por op";

            case "porcentajes":
              return "Porcentaje de la tarfia base en relación a la facturación total";
          }
        },
      },

      {
        key: `kmAdic_${origen}`,
        label: "Km Adic.",
        tipo: "currency",
        visible: true,
        valueFn: (r, modo) => {
          const src = origen === "cliente" ? r.cliente : r.chofer;

          switch (modo) {
            case "totales":
              return src.kmAdicional;
            case "promedios":
              return this.promedio(src.kmAdicional, r.cantidadOps);
            case "porcentajes":
              return this.porcentaje(src.kmAdicional, totalFn(r));
          }
        },
        tooltip: (modo) => {
          switch (modo) {
            case "totales":
              return "Facturación del adicional por km de las op en el mes";

            case "promedios":
              return "Promedio de facturación del adicional por km por op";

            case "porcentajes":
              return "Porcentaje del adicional por km en relación a la facturación total";
          }
        },
      },

      {
        key: `acompValor_${origen}`,
        label: "Acomp $",
        tipo: "currency",
        visible: true,
        valueFn: (r, modo) => {
          const src = origen === "cliente" ? r.cliente : r.chofer;

          switch (modo) {
            case "totales":
              return src.acompValor;
            case "promedios":
              return this.promedio(src.acompValor, r.acompanianteOps);
            case "porcentajes":
              return this.porcentaje(src.acompValor, totalFn(r));
          }
        },
        tooltip: (modo) => {
          switch (modo) {
            case "totales":
              return "Facturación del adicional por acompañante de las op en el mes";

            case "promedios":
              return "Promedio de facturación del adicional por acompañante por op con acompñante";

            case "porcentajes":
              return "Porcentaje del adicional por acompañante en relación a la facturación total";
          }
        },
      },

      {
        key: `extras_${origen}`,
        label: "Extras",
        tipo: "currency",
        visible: true,
        valueFn: (r, modo) => {
          const src = origen === "cliente" ? r.cliente : r.chofer;

          switch (modo) {
            case "totales":
              return src.adExtraValor;
            case "promedios":
              return this.promedio(src.adExtraValor, r.cantidadOps);
            case "porcentajes":
              return this.porcentaje(src.adExtraValor, totalFn(r));
          }
        },
        tooltip: (modo) => {
          switch (modo) {
            case "totales":
              return "Facturación del adicional extra de las op en el mes";

            case "promedios":
              return "Promedio de facturación del adicional extra por op";

            case "porcentajes":
              return "Porcentaje del adicional por extra en relación a la facturación total";
          }
        },
      },
    ];
  }
}
