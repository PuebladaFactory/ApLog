import { Injectable } from '@angular/core';
import { increment } from '@angular/fire/firestore';
import { Operacion } from 'src/app/interfaces/operacion';
import {
  ClaveResumen,
  LadoResumen,
  MetricasResumen,
  NivelResumen,
  ResumenOpNuevo,
  TipoEntidadResumen,
} from 'src/app/interfaces/resumen-op-nuevo';
import { EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { PeriodoMensual, periodoDeFecha, sufijoMes } from 'src/app/shared/utils/periodo.util';

export interface ErrorAgregado {
  idOperacion: string;
  numeroOperacion: number | null;
  mensaje: string;
}

/** Construcción pura de los resúmenes de operaciones (modelo nuevo,
 *  colección `resumenesOp`) — sin lecturas ni commits: arma lo que aporta
 *  una operación, sus claves y las EscrituraBatch que el orquestador dueño
 *  del gesto suma a su propio batch/transacción (cierre, edición, baja).
 *  Única fuente de "qué suma una operación": la usan el camino en vivo y el
 *  recálculo (agregados), así no pueden divergir.
 *
 *  Fuente: op.valoresNuevos (tarifaBase cruda × multiplicador del lado;
 *  el resto ya viene final) + nivel desde tarifaAplicadaCliente/Chofer o
 *  datosTarifaEventual. NO lee op.valores ni op.tarifaTipo (legacy). */
@Injectable({ providedIn: 'root' })
export class ResumenOpFactoryService {

  static readonly COLECCION = 'resumenesOp';

  // ── Aporte y claves ─────────────────────────────────────────────

  /** Lo que suma UNA operación a cada uno de sus resúmenes. Lanza si la op
   *  no tiene valoresNuevos o le falta la tarifa aplicada de un lado (el
   *  cierre ya exige ambas cosas). */
  aporteDeOperacion(op: Operacion): MetricasResumen {
    if (!op.valoresNuevos) {
      throw new Error(`ResumenOpFactory: la operación ${this.etiqueta(op)} no tiene valoresNuevos.`);
    }
    const esEventual = op.datosTarifaEventual != null;
    const vc = op.valoresNuevos.cliente;
    const vch = op.valoresNuevos.chofer;

    const cliente = this.lado(
      vc.tarifaBase * (op.multiplicadorCliente ?? 0),
      vc.kmAdicional, vc.acompValor, vc.adExtraValor ?? 0, vc.aCobrar,
      this.nivelDeLado(op, 'cliente', esEventual),
    );
    const chofer = this.lado(
      vch.tarifaBase * (op.multiplicadorChofer ?? 0),
      vch.kmAdicional, vch.acompValor, vch.adExtraValor ?? 0, vch.aPagar,
      this.nivelDeLado(op, 'chofer', esEventual),
    );

    return {
      cantidadOps: 1,
      kmRecorridos: op.km ?? 0,
      acompanianteOps: op.acompaniante ? 1 : 0,
      acompanianteCantidadTotal: op.acompaniante ? (op.acompanianteCant ?? 1) : 0,
      cliente,
      chofer,
      ganancia: cliente.total - chofer.total,
    };
  }

  /** Las 3 claves que toca una operación: general + cliente + proveedor (si
   *  la op es de proveedor) o chofer (directo). Período desde el string. */
  clavesDeOperacion(op: Operacion): ClaveResumen[] {
    const p = periodoDeFecha(op.fecha);
    const claves: ClaveResumen[] = [
      this.claveGeneral(p),
      this.claveEntidad('cliente', op.cliente?.id, p),
    ];
    if (op.proveedor) {
      claves.push(this.claveEntidad('proveedor', op.proveedor.id, p));
    } else {
      claves.push(this.claveEntidad('chofer', op.chofer?.id, p));
    }
    return claves;
  }

  claveGeneral(p: PeriodoMensual): ClaveResumen {
    return {
      id: `general_${sufijoMes(p)}`,
      tipo: 'general', tipoEntidad: null, entidadId: null,
      anio: p.anio, mes: p.mes, periodo: p.periodo,
    };
  }

  claveEntidad(tipoEntidad: TipoEntidadResumen, entidadId: string | undefined, p: PeriodoMensual): ClaveResumen {
    if (!entidadId || entidadId.includes('/')) {
      throw new Error(`ResumenOpFactory: id de ${tipoEntidad} inválido ("${entidadId}").`);
    }
    return {
      id: `${tipoEntidad}_${entidadId}_${sufijoMes(p)}`,
      tipo: 'entidad', tipoEntidad, entidadId,
      anio: p.anio, mes: p.mes, periodo: p.periodo,
    };
  }

  // ── EscrituraBatch para el camino en vivo ───────────────────────

  /** Cierre (signo 1) o baja de operación cerrada (signo −1): una escritura
   *  'fusionar' por clave. */
  escriturasSuma(op: Operacion, signo: 1 | -1): EscrituraBatch[] {
    const aporte = this.escalar(this.aporteDeOperacion(op), signo);
    return this.clavesDeOperacion(op).map(c => this.escrituraIncremento(c, aporte));
  }

  /** Edición de una operación cerrada: resta el aporte de opVieja en SUS
   *  claves y suma el de opNueva en las suyas, neteado por clave (si la
   *  clave es la misma queda una sola escritura con la diferencia; las
   *  claves sin diferencia se omiten). Cubre también un cambio de fecha o
   *  de entidad. */
  escriturasEdicion(opVieja: Operacion, opNueva: Operacion): EscrituraBatch[] {
    const netos = new Map<string, { clave: ClaveResumen; metricas: MetricasResumen }>();
    const acumular = (claves: ClaveResumen[], m: MetricasResumen) => {
      for (const clave of claves) {
        const actual = netos.get(clave.id);
        netos.set(clave.id, {
          clave,
          metricas: actual ? this.sumar(actual.metricas, m) : m,
        });
      }
    };
    acumular(this.clavesDeOperacion(opVieja), this.escalar(this.aporteDeOperacion(opVieja), -1));
    acumular(this.clavesDeOperacion(opNueva), this.aporteDeOperacion(opNueva));

    return [...netos.values()]
      .filter(n => !this.esCero(n.metricas))
      .map(n => this.escrituraIncremento(n.clave, n.metricas));
  }

  // ── Agregado en memoria (recálculo) ─────────────────────────────

  /** Suma en memoria el aporte de un conjunto de operaciones, por clave.
   *  Una op que falla (sin valoresNuevos, fecha inválida, etc.) se reporta
   *  en `errores` y no se suma. */
  agregados(ops: Operacion[], ahora: number): { resumenes: Map<string, ResumenOpNuevo>; errores: ErrorAgregado[] } {
    const resumenes = new Map<string, ResumenOpNuevo>();
    const errores: ErrorAgregado[] = [];

    for (const op of ops) {
      let aporte: MetricasResumen;
      let claves: ClaveResumen[];
      try {
        aporte = this.aporteDeOperacion(op);
        claves = this.clavesDeOperacion(op);
      } catch (e: any) {
        errores.push({
          idOperacion: op.idOperacion,
          numeroOperacion: op.numeroOperacion ?? null,
          mensaje: e?.message ?? String(e),
        });
        continue;
      }
      for (const clave of claves) {
        const { id, ...identidad } = clave;
        const previo = resumenes.get(id);
        const base: MetricasResumen = previo ?? this.metricasVacias();
        resumenes.set(id, { ...identidad, ...this.sumar(base, aporte), actualizado: ahora });
      }
    }
    return { resumenes, errores };
  }

  metricasVacias(): MetricasResumen {
    return {
      cantidadOps: 0, kmRecorridos: 0, acompanianteOps: 0, acompanianteCantidadTotal: 0,
      cliente: this.ladoVacio(), chofer: this.ladoVacio(), ganancia: 0,
    };
  }

  // ── Privados ────────────────────────────────────────────────────

  private escrituraIncremento(clave: ClaveResumen, m: MetricasResumen): EscrituraBatch {
    const { id, ...identidad } = clave;
    return {
      coleccion: ResumenOpFactoryService.COLECCION,
      id,
      modo: 'fusionar',
      // Identidad como valores fijos (idempotentes) + incrementos como OBJETO
      // anidado (con set+merge, NUNCA claves con punto).
      data: { ...identidad, ...this.aIncrementos(m), actualizado: Date.now() },
    };
  }

  private aIncrementos(m: MetricasResumen): Record<string, any> {
    return {
      cantidadOps: increment(m.cantidadOps),
      kmRecorridos: increment(m.kmRecorridos),
      acompanianteOps: increment(m.acompanianteOps),
      acompanianteCantidadTotal: increment(m.acompanianteCantidadTotal),
      ganancia: increment(m.ganancia),
      cliente: this.ladoIncrementos(m.cliente),
      chofer: this.ladoIncrementos(m.chofer),
    };
  }

  private ladoIncrementos(l: LadoResumen): Record<string, any> {
    return {
      tarifaBase: increment(l.tarifaBase),
      kmAdicional: increment(l.kmAdicional),
      acompValor: increment(l.acompValor),
      adExtraValor: increment(l.adExtraValor),
      total: increment(l.total),
      niveles: {
        general: increment(l.niveles.general),
        especial: increment(l.niveles.especial),
        personalizada: increment(l.niveles.personalizada),
        eventual: increment(l.niveles.eventual),
      },
    };
  }

  private nivelDeLado(op: Operacion, lado: 'cliente' | 'chofer', esEventual: boolean): NivelResumen {
    if (esEventual) return 'eventual';
    const ref = lado === 'cliente' ? op.tarifaAplicadaCliente : op.tarifaAplicadaChofer;
    if (!ref) {
      throw new Error(`ResumenOpFactory: la operación ${this.etiqueta(op)} no tiene tarifa aplicada del lado ${lado}.`);
    }
    return ref.nivel;
  }

  private lado(
    tarifaBase: number, kmAdicional: number, acompValor: number,
    adExtraValor: number, total: number, nivel: NivelResumen,
  ): LadoResumen {
    const l = this.ladoVacio();
    l.tarifaBase = tarifaBase;
    l.kmAdicional = kmAdicional;
    l.acompValor = acompValor;
    l.adExtraValor = adExtraValor;
    l.total = total;
    l.niveles[nivel] = 1;
    return l;
  }

  private ladoVacio(): LadoResumen {
    return {
      tarifaBase: 0, kmAdicional: 0, acompValor: 0, adExtraValor: 0, total: 0,
      niveles: { general: 0, especial: 0, personalizada: 0, eventual: 0 },
    };
  }

  private sumar(a: MetricasResumen, b: MetricasResumen): MetricasResumen {
    return {
      cantidadOps: a.cantidadOps + b.cantidadOps,
      kmRecorridos: a.kmRecorridos + b.kmRecorridos,
      acompanianteOps: a.acompanianteOps + b.acompanianteOps,
      acompanianteCantidadTotal: a.acompanianteCantidadTotal + b.acompanianteCantidadTotal,
      cliente: this.sumarLado(a.cliente, b.cliente),
      chofer: this.sumarLado(a.chofer, b.chofer),
      ganancia: a.ganancia + b.ganancia,
    };
  }

  private sumarLado(a: LadoResumen, b: LadoResumen): LadoResumen {
    return {
      tarifaBase: a.tarifaBase + b.tarifaBase,
      kmAdicional: a.kmAdicional + b.kmAdicional,
      acompValor: a.acompValor + b.acompValor,
      adExtraValor: a.adExtraValor + b.adExtraValor,
      total: a.total + b.total,
      niveles: {
        general: a.niveles.general + b.niveles.general,
        especial: a.niveles.especial + b.niveles.especial,
        personalizada: a.niveles.personalizada + b.niveles.personalizada,
        eventual: a.niveles.eventual + b.niveles.eventual,
      },
    };
  }

  private escalar(m: MetricasResumen, s: 1 | -1): MetricasResumen {
    return s === 1 ? m : this.negar(m);
  }

  private negar(m: MetricasResumen): MetricasResumen {
    const negLado = (l: LadoResumen): LadoResumen => ({
      tarifaBase: -l.tarifaBase, kmAdicional: -l.kmAdicional, acompValor: -l.acompValor,
      adExtraValor: -l.adExtraValor, total: -l.total,
      niveles: {
        general: -l.niveles.general, especial: -l.niveles.especial,
        personalizada: -l.niveles.personalizada, eventual: -l.niveles.eventual,
      },
    });
    return {
      cantidadOps: -m.cantidadOps, kmRecorridos: -m.kmRecorridos,
      acompanianteOps: -m.acompanianteOps, acompanianteCantidadTotal: -m.acompanianteCantidadTotal,
      cliente: negLado(m.cliente), chofer: negLado(m.chofer), ganancia: -m.ganancia,
    };
  }

  /** Tolerancia de redondeo para decidir si un neto de edición es cero. */
  private esCero(m: MetricasResumen): boolean {
    const cero = (n: number) => Math.abs(n) < 1e-9;
    const ladoCero = (l: LadoResumen) =>
      cero(l.tarifaBase) && cero(l.kmAdicional) && cero(l.acompValor) &&
      cero(l.adExtraValor) && cero(l.total) &&
      cero(l.niveles.general) && cero(l.niveles.especial) &&
      cero(l.niveles.personalizada) && cero(l.niveles.eventual);
    return cero(m.cantidadOps) && cero(m.kmRecorridos) && cero(m.acompanianteOps) &&
      cero(m.acompanianteCantidadTotal) && cero(m.ganancia) &&
      ladoCero(m.cliente) && ladoCero(m.chofer);
  }

  private etiqueta(op: Operacion): string {
    return op.numeroOperacion ? String(op.numeroOperacion) : op.idOperacion;
  }
}
