import { Injectable } from '@angular/core';
import { increment } from '@angular/fire/firestore';
import { Operacion } from 'src/app/interfaces/operacion';
import { EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { periodoDeFecha } from 'src/app/shared/utils/periodo.util';

/** Comisión de un vendedor calculada para una operación (sin Firestore). */
export interface ComisionCalculada {
  idVendedor: string;
  porcentaje: number;
  base: number;
  monto: number;
}

/** Construcción pura de las comisiones de venta (colección `comisionesVenta`)
 *  — sin lecturas ni commits: arma las EscrituraBatch que el orquestador
 *  dueño del gesto suma a su propio batch/transacción:
 *    - cierre          → OperacionService.cerrarOperacion
 *    - edición         → InformeOpService.armarEscriturasEdicion (lo reusa
 *                        InformeLiqService.editarInformeOp)
 *    - baja de cerrada → OperacionService.bajaOperacionCerrada
 *  (los callers se conectan en V3).
 *
 *  Modelo "saldo" (ver interfaces/comision-venta.ts): todas las escrituras
 *  son 'fusionar' con increment() sobre monto y saldo — no hace falta leer
 *  la comisión. Base = op.valoresNuevos.cliente.aCobrar; porcentaje = el del
 *  snapshot op.cliente.comisiones (congelado al alta). Una op sin snapshot
 *  no genera escrituras. */
@Injectable({ providedIn: 'root' })
export class ComisionVentaFactoryService {

  static readonly COLECCION = 'comisionesVenta';

  /** Por debajo de esto (en pesos) un monto/saldo se considera cero. */
  static readonly TOLERANCIA = 0.005;

  // ── Cálculo ─────────────────────────────────────────────────────

  /** Id determinista del documento: `{idOperacion}_{idVendedor}`. */
  idComision(idOperacion: string, idVendedor: string): string {
    if (!idOperacion || !idVendedor || idOperacion.includes('/') || idVendedor.includes('/')) {
      throw new Error(
        `ComisionVentaFactory: ids inválidos (operación "${idOperacion}", vendedor "${idVendedor}").`,
      );
    }
    return `${idOperacion}_${idVendedor}`;
  }

  redondear(n: number): number {
    return Math.round(n * 100) / 100;
  }

  montoDe(base: number, porcentaje: number): number {
    return this.redondear((base * porcentaje) / 100);
  }

  /** Base de la comisión: total a cobrar vigente de la op. Lanza si la op no
   *  tiene valoresNuevos (el cierre ya los exige). */
  baseDeOperacion(op: Operacion): number {
    if (!op.valoresNuevos) {
      throw new Error(`ComisionVentaFactory: la operación ${this.etiqueta(op)} no tiene valoresNuevos.`);
    }
    return op.valoresNuevos.cliente.aCobrar ?? 0;
  }

  /** Una comisión por cada vendedor del snapshot de la op. Sin snapshot → []. */
  comisionesDeOperacion(op: Operacion): ComisionCalculada[] {
    const asignaciones = op.cliente?.comisiones ?? [];
    if (asignaciones.length === 0) return [];
    const base = this.baseDeOperacion(op);
    return asignaciones.map(a => ({
      idVendedor: a.idVendedor,
      porcentaje: a.porcentaje,
      base,
      monto: this.montoDe(base, a.porcentaje),
    }));
  }

  // ── EscrituraBatch para el camino en vivo ───────────────────────

  /** Cierre: crea (o reactiva, si venía de una baja) cada comisión. */
  escriturasCierre(op: Operacion): EscrituraBatch[] {
    return this.comisionesDeOperacion(op).map(c =>
      this.escritura(op, c, {
        base: c.base,
        monto: increment(c.monto),
        saldo: increment(c.monto),
        // increment(0): lo crea en 0 si no existe; si existe, lo conserva.
        montoLiquidado: increment(0),
        anulada: false,
      }),
    );
  }

  /** Edición de InformeOp: aplica la diferencia de monto por vendedor
   *  (monto nuevo − monto viejo). Sin diferencia de monto ni de base → sin
   *  escritura. Un vendedor que estuviera solo en opVieja (hoy el editor no
   *  cambia el snapshot) queda con su monto llevado a 0. */
  escriturasEdicion(opVieja: Operacion, opNueva: Operacion): EscrituraBatch[] {
    const viejas = new Map(this.comisionesDeOperacion(opVieja).map(c => [c.idVendedor, c]));
    const nuevas = new Map(this.comisionesDeOperacion(opNueva).map(c => [c.idVendedor, c]));
    const ids = new Set<string>([...viejas.keys(), ...nuevas.keys()]);

    const escrituras: EscrituraBatch[] = [];
    for (const idVendedor of ids) {
      const vieja = viejas.get(idVendedor);
      const nueva = nuevas.get(idVendedor);
      const delta = this.redondear((nueva?.monto ?? 0) - (vieja?.monto ?? 0));
      const base = nueva ? nueva.base : vieja!.base;
      const cambioBase = Math.abs(base - (vieja?.base ?? 0)) >= ComisionVentaFactoryService.TOLERANCIA;
      if (Math.abs(delta) < ComisionVentaFactoryService.TOLERANCIA && !cambioBase) continue;

      const ref = (nueva ?? vieja)!;
      escrituras.push(
        this.escritura(opNueva, ref, {
          base,
          monto: increment(delta),
          saldo: increment(delta),
        }),
      );
    }
    return escrituras;
  }

  /** Baja de operación cerrada: lleva el monto a 0 y marca anulada. Si ya
   *  estaba liquidada, el saldo queda negativo (ajuste a descontar). */
  escriturasBaja(op: Operacion): EscrituraBatch[] {
    return this.comisionesDeOperacion(op).map(c =>
      this.escritura(op, c, {
        base: c.base,
        monto: increment(-c.monto),
        saldo: increment(-c.monto),
        anulada: true,
      }),
    );
  }

  // ── Privados ────────────────────────────────────────────────────

  private escritura(op: Operacion, c: ComisionCalculada, valores: Record<string, any>): EscrituraBatch {
    return {
      coleccion: ComisionVentaFactoryService.COLECCION,
      id: this.idComision(op.idOperacion, c.idVendedor),
      modo: 'fusionar',
      // Identidad como valores fijos (idempotentes) + valores/incrementos.
      // Sin campos anidados (con set+merge, NUNCA claves con punto).
      data: { ...this.identidad(op, c), ...valores, actualizado: Date.now() },
    };
  }

  private identidad(op: Operacion, c: ComisionCalculada): Record<string, any> {
    const p = periodoDeFecha(op.fecha);
    return {
      idOperacion: op.idOperacion,
      numeroOperacion: op.numeroOperacion,
      fecha: op.fecha,
      anio: p.anio,
      mes: p.mes,
      periodo: p.periodo,
      idCliente: op.cliente.id,
      razonSocial: op.cliente.razonSocial,
      idVendedor: c.idVendedor,
      porcentaje: c.porcentaje,
    };
  }

  private etiqueta(op: Operacion): string {
    return op.numeroOperacion ? String(op.numeroOperacion) : op.idOperacion;
  }
}
