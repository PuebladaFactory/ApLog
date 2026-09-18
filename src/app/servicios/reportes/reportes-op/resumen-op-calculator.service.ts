import { Injectable } from "@angular/core";
import { increment } from "@angular/fire/firestore";
import { ConId } from "src/app/interfaces/conId";
import { Operacion, Valores } from "src/app/interfaces/operacion";
import { TarifaTipo } from "src/app/interfaces/tarifa-gral-cliente";
import { KeyResumen } from "./reportes-op.service";

import { FieldValue } from "firebase/firestore";

type UpdateData = {
  [key: string]: number | FieldValue;
};

export interface UpdateResumen {
  key: KeyResumen;
  path: string;
  data: Record<string, any>; // increment(...) acá
}

@Injectable({
  providedIn: "root",
})
export class ResumenOpCalculatorService {
  basePath: string = "Vantruck/datos/resumenOpMensual";

  /** Motor en vivo — se dispara siempre DESPUÉS de que
   *  ValoresOpService.facturarOperacion() ya validó que op.valoresNuevos
   *  existe (tira error antes si falta), así que acá se puede asumir
   *  no-null con seguridad. Nivel 2 (17-18/09/2026): fuente migrada de
   *  op.valores a op.valoresNuevos — ver resolverValores() más abajo.
   *  generarUpdatesEliminacion NO reutiliza este método a propósito: sigue
   *  leyendo op.valores directo, ver su comentario. */
  generarUpdates(op: Operacion): UpdateResumen[] {
    const data = this.calcularIncrementos(op, this.resolverValores(op));

    return this.armarUpdatesPorEntidad(op, data);
  }

  /** Arma las 3 entradas de resumen (general / cliente / chofer-proveedor)
   *  para una op a partir de un set de incrementos ya calculado. Extraído
   *  de generarUpdates para que generarUpdatesEliminacion pueda reusar el
   *  mismo armado de claves con una fuente de datos distinta (op.valores,
   *  no valoresNuevos) sin duplicar esta lógica. */
  private armarUpdatesPorEntidad(
    op: Operacion,
    data: Record<string, any>,
  ): UpdateResumen[] {
    const { anio, mes } = this.getPeriodo(op.fecha);

    const updates: UpdateResumen[] = [];

    // =========================
    // GENERAL
    // =========================
    const keyGeneral: KeyResumen = {
      tipo: "general",
      anio,
      mes,
    };

    updates.push({
      key: keyGeneral,
      path: this.buildPath(keyGeneral),
      data,
    });

    // =========================
    // CLIENTE
    // =========================
    const keyCliente: KeyResumen = {
      tipo: "entidad",
      tipoEntidad: "cliente",
      entidadId: Number(op.cliente.id), // TODO: migrar a string cuando se refactorice este módulo
      anio,
      mes,
    };

    updates.push({
      key: keyCliente,
      path: this.buildPath(keyCliente),
      data,
    });

    // =========================
    // CHOFER / PROVEEDOR
    // =========================
    if (op.proveedor !== null) {
      const keyProveedor: KeyResumen = {
        tipo: "entidad",
        tipoEntidad: "proveedor",
        entidadId: Number(op.proveedor.id), // TODO: migrar a string cuando se refactorice este módulo
        anio,
        mes,
      };

      updates.push({
        key: keyProveedor,
        path: this.buildPath(keyProveedor),
        data,
      });
    } else {
      const keyChofer: KeyResumen = {
        tipo: "entidad",
        tipoEntidad: "chofer",
        entidadId: Number(op.chofer.id), // TODO: migrar a string cuando se refactorice este módulo
        anio,
        mes,
      };

      updates.push({
        key: keyChofer,
        path: this.buildPath(keyChofer),
        data,
      });
    }

    return updates;
  }

  private calcularIncrementos(
    op: Operacion,
    valores: Valores,
  ): Record<string, any> {
    const c = valores.cliente;
    const ch = valores.chofer;

    return {
      cantidadOps: increment(1),
      kmRecorridos: increment(op.km),

      acompanianteOps: increment(op.acompaniante ? 1 : 0),
      acompanianteCantidadTotal: increment(op.acompanianteCant ?? 0),

      // cliente
      "cliente.acompValor": increment(c.acompValor),
      "cliente.kmAdicional": increment(c.kmAdicional),
      "cliente.tarifaBase": increment(c.tarifaBase),
      "cliente.adExtraValor": increment(c.adExtraValor ?? 0),
      "cliente.total": increment(c.aCobrar),

      // chofer
      "chofer.acompValor": increment(ch.acompValor),
      "chofer.kmAdicional": increment(ch.kmAdicional),
      "chofer.tarifaBase": increment(ch.tarifaBase),
      "chofer.adExtraValor": increment(ch.adExtraValor ?? 0),
      "chofer.total": increment(ch.aPagar),

      // ganancia
      ganancia: increment(c.aCobrar - ch.aPagar),

      // tarifa tipo
      [`tarifaTipo.${this.getTipoTarifa(op)}`]: increment(1),
    };
  }

  /** Nivel 2 (17-18/09/2026) — fuente de datos para el cierre en vivo.
   *  op.valoresNuevos.cliente/chofer.tarifaBase viene CRUDA (sin
   *  multiplicar) — a diferencia de acompValor/kmAdicional/aCobrar/aPagar,
   *  que ya vienen finales. Se aplica el mismo multiplicadorCliente/Chofer
   *  que usa el motor de facturación al armar el espejo legacy (ver
   *  $facturarOpClienteNuevo/$facturarOpChoferNuevo en
   *  valores-op-cliente/chofer.service.ts) para que el resumen no arrastre
   *  el bug de "tarifaBase mal en operaciones con multiplicador ≠ 1".
   *  En este punto (justo después del cierre) el resultado es
   *  matemáticamente idéntico a op.valores — no cambia ningún número hoy,
   *  solo desacopla el motor en vivo del campo legacy de cara a Nivel 3. */
  private resolverValores(op: Operacion): Valores {
    if (!op.valoresNuevos) {
      throw new Error(
        "op.valoresNuevos inexistente al generar el resumen en vivo",
      );
    }

    const multCliente = op.multiplicadorCliente ?? 1;
    const multChofer = op.multiplicadorChofer ?? 1;

    return {
      cliente: {
        ...op.valoresNuevos.cliente,
        tarifaBase: op.valoresNuevos.cliente.tarifaBase * multCliente,
      },
      chofer: {
        ...op.valoresNuevos.chofer,
        tarifaBase: op.valoresNuevos.chofer.tarifaBase * multChofer,
      },
    };
  }

  private buildPath(k: KeyResumen): string {
    return `${this.basePath}/${this.buildKey(k)}`;
  }

  private getPeriodo(fecha: string | Date): { anio: number; mes: number } {
    const f = new Date(fecha);

    return {
      anio: f.getFullYear(),
      mes: f.getMonth() + 1,
    };
  }

  private getTipoTarifa(op: Operacion): keyof TarifaTipo {
    if (op.tarifaTipo.general) return "general";
    if (op.tarifaTipo.especial) return "especial";
    if (op.tarifaTipo.eventual) return "eventual";
    if (op.tarifaTipo.personalizada) return "personalizada";

    throw new Error("Tipo tarifa inválido");
  }

  private buildKey(k: KeyResumen): string {
    if (k.tipo === "general") {
      return `general_${k.anio}_${k.mes}`;
    }

    return `${k.tipoEntidad}_${k.entidadId}_${k.anio}_${k.mes}`;
  }

  // ------------------------------------------
  // AUX: calcular resumenes de op
  // ------------------------------------------

  generarDeltaUpdates(opVieja: Operacion, opNueva: Operacion): UpdateResumen[] {
    const viejaPlano = this.generarValoresPlano(opVieja);
    const nuevaPlano = this.generarValoresPlano(opNueva);

    const delta = this.calcularDelta(nuevaPlano, viejaPlano);

    return this.buildUpdatesFromDelta(opNueva, delta);
  }

  private buildUpdatesFromDelta(
    op: Operacion,
    delta: Record<string, number>,
  ): UpdateResumen[] {
    const { anio, mes } = this.getPeriodo(op.fecha);

    const updates: UpdateResumen[] = [];

    const baseData = this.toNestedIncrement(delta);

    // =========================
    // CLIENTE
    // =========================
    updates.push({
      key: {
        tipo: "entidad",
        tipoEntidad: "cliente",
        entidadId: Number(op.cliente.id), // TODO: migrar a string cuando se refactorice este módulo
        anio,
        mes,
      },
      path: this.buildPath({
        tipo: "entidad",
        tipoEntidad: "cliente",
        entidadId: Number(op.cliente.id), // TODO: migrar a string cuando se refactorice este módulo
        anio,
        mes,
      }),
      data: baseData,
    });

    // =========================
    // CHOFER / PROVEEDOR
    // =========================
    if (op.proveedor !== null) {
      const provId = Number(op.proveedor.id); // TODO: migrar a string cuando se refactorice este módulo
      updates.push({
        key: {
          tipo: "entidad",
          tipoEntidad: "proveedor",
          entidadId: provId,
          anio,
          mes,
        },
        path: this.buildPath({
          tipo: "entidad",
          tipoEntidad: "proveedor",
          entidadId: provId,
          anio,
          mes,
        }),
        data: baseData,
      });
    } else {
      const choId = Number(op.chofer.id); // TODO: migrar a string cuando se refactorice este módulo
      updates.push({
        key: {
          tipo: "entidad",
          tipoEntidad: "chofer",
          entidadId: choId,
          anio,
          mes,
        },
        path: this.buildPath({
          tipo: "entidad",
          tipoEntidad: "chofer",
          entidadId: choId,
          anio,
          mes,
        }),
        data: baseData,
      });
    }

    // =========================
    // GENERAL
    // =========================
    updates.push({
      key: {
        tipo: "general",
        anio,
        mes,
      },
      path: this.buildPath({
        tipo: "general",
        anio,
        mes,
      }),
      data: baseData,
    });

    return updates;
  }

  private calcularDelta(
    nueva: Record<string, number>,
    vieja: Record<string, number>,
  ): Record<string, number> {
    const result: Record<string, number> = {};

    const keys = new Set([...Object.keys(nueva), ...Object.keys(vieja)]);

    for (const key of keys) {
      const delta = (nueva[key] ?? 0) - (vieja[key] ?? 0);

      if (delta !== 0) {
        result[key] = delta;
      }
    }

    return result;
  }


  private toNestedIncrement(data: Record<string, number>): any {

  const result: any = {};

  for (const key in data) {

    const parts = key.split('.');
    let current = result;

    for (let i = 0; i < parts.length; i++) {

      const part = parts[i];

      if (i === parts.length - 1) {
        current[part] = increment(data[key]);
      } else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }
  }

  return result;
}

  private generarValoresPlano(op: Operacion): Record<string, number> {
    const tipoTarifa = this.getTipoTarifa(op);

    return {
      cantidadOps: 1,
      kmRecorridos: op.km,

      acompanianteOps: op.acompaniante ? 1 : 0,
      acompanianteCantidadTotal: op.acompaniante
        ? (op.acompanianteCant ?? 1)
        : 0,

      // cliente
      "cliente.acompValor": op.valores.cliente.acompValor,
      "cliente.kmAdicional": op.valores.cliente.kmAdicional,
      "cliente.tarifaBase": op.valores.cliente.tarifaBase,
      "cliente.adExtraValor": op.valores.cliente.adExtraValor ?? 0,
      "cliente.total": op.valores.cliente.aCobrar,

      // chofer
      "chofer.acompValor": op.valores.chofer.acompValor,
      "chofer.kmAdicional": op.valores.chofer.kmAdicional,
      "chofer.tarifaBase": op.valores.chofer.tarifaBase,
      "chofer.adExtraValor": op.valores.chofer.adExtraValor ?? 0,
      "chofer.total": op.valores.chofer.aPagar,

      // totales
      ganancia: op.valores.cliente.aCobrar - op.valores.chofer.aPagar,

      [`tarifaTipo.${tipoTarifa}`]: 1,
    };
  }

  /** Borrado de una operación cerrada (eliminarOperacionEInformes en
   *  db-firestore.service.ts, disparado desde Liquidación). A propósito NO
   *  reutiliza generarUpdates/resolverValores: tiene que invertir
   *  exactamente lo que hoy está sumado en el resumen, y op.valoresNuevos
   *  queda CONGELADO en el valor del cierre original — si la operación se
   *  editó después desde Liquidación (editar-tarifa-op/editar-inf-op, que
   *  solo tocan op.valores, nunca valoresNuevos), valoresNuevos ya no
   *  coincide con lo que realmente está reflejado en el resumen. op.valores
   *  sí queda siempre al día (la edición lo actualiza directo), así que es
   *  la única fuente correcta acá — igual que generarDeltaUpdates. */
  generarUpdatesEliminacion(op: Operacion): UpdateResumen[] {
    const data = this.calcularIncrementos(op, op.valores);
    const updatesPositivos = this.armarUpdatesPorEntidad(op, data);

    // invertir todos los incrementos
    return updatesPositivos.map((upd) => ({
      ...upd,
      data: this.invertirIncrementos(upd.data),
    }));
  }

private invertirIncrementos(
  data: Record<string, any>,
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key of Object.keys(data)) {
    const inc = this.getIncrementValue(data[key]);

    if (inc !== 0) {
      result[key] = increment(-inc);
    }
  }

  return result;
}

private getIncrementValue(value: any): number {
  if (!value) return 0;

  // Firestore increment internals
  return value?.Cc ?? 0;
}
}
