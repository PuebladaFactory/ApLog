import { Injectable } from "@angular/core";
import { increment } from "@angular/fire/firestore";
import { ConId } from "src/app/interfaces/conId";
import { Operacion } from "src/app/interfaces/operacion";
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

  generarUpdates(op: Operacion): UpdateResumen[] {
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

    updates.push(this.buildUpdate(keyGeneral, op));

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

    updates.push(this.buildUpdate(keyCliente, op));

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

      updates.push(this.buildUpdate(keyProveedor, op));
    } else {
      const keyChofer: KeyResumen = {
        tipo: "entidad",
        tipoEntidad: "chofer",
        entidadId: Number(op.chofer.id), // TODO: migrar a string cuando se refactorice este módulo
        anio,
        mes,
      };

      updates.push(this.buildUpdate(keyChofer, op));
    }

    return updates;
  }

  private buildUpdate(key: KeyResumen, op: Operacion): UpdateResumen {
    const data = this.calcularIncrementos(op);

    return {
      key,
      path: this.buildPath(key),
      data,
    };
  }

  private calcularIncrementos(op: Operacion): Record<string, any> {
    return {
      cantidadOps: increment(1),
      kmRecorridos: increment(op.km),

      acompanianteOps: increment(op.acompaniante ? 1 : 0),
      acompanianteCantidadTotal: increment(op.acompanianteCant ?? 0),

      // cliente
      "cliente.acompValor": increment(op.valores.cliente.acompValor),
      "cliente.kmAdicional": increment(op.valores.cliente.kmAdicional),
      "cliente.tarifaBase": increment(op.valores.cliente.tarifaBase),
      "cliente.adExtraValor": increment(op.valores.cliente.adExtraValor ?? 0),
      "cliente.total": increment(op.valores.cliente.aCobrar),

      // chofer
      "chofer.acompValor": increment(op.valores.chofer.acompValor),
      "chofer.kmAdicional": increment(op.valores.chofer.kmAdicional),
      "chofer.tarifaBase": increment(op.valores.chofer.tarifaBase),
      "chofer.adExtraValor": increment(op.valores.chofer.adExtraValor ?? 0),
      "chofer.total": increment(op.valores.chofer.aPagar),

      // ganancia
      ganancia: increment(
        op.valores.cliente.aCobrar - op.valores.chofer.aPagar,
      ),

      // tarifa tipo
      [`tarifaTipo.${this.getTipoTarifa(op)}`]: increment(1),
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

  generarUpdatesEliminacion(op: Operacion): UpdateResumen[] {
  const updatesPositivos = this.generarUpdates(op);

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
