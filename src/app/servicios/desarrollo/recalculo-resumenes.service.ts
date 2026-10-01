import { Injectable, inject } from '@angular/core';
import { environment } from 'src/environments/environment';
import { ConId } from 'src/app/interfaces/conId';
import { Operacion } from 'src/app/interfaces/operacion';
import { ResumenOpNuevo } from 'src/app/interfaces/resumen-op-nuevo';
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import {
  ErrorAgregado,
  ResumenOpFactoryService,
} from 'src/app/servicios/reportes/resumenes-op/resumen-op-factory.service';
import { periodoDeFecha } from 'src/app/shared/utils/periodo.util';

export type EstadoDiferencia = 'nuevo' | 'distinto' | 'sobra';

export interface DiferenciaResumen {
  id: string;
  estado: EstadoDiferencia;
  /** Solo en 'distinto': "campo: guardado → recalculado". */
  campos: string[];
}

export interface ResumenMesRecalculo {
  periodo: number;
  cantidadOps: number;
  facturado: number;
  costo: number;
  ganancia: number;
}

export interface SimulacionRecalculo {
  desde: string;          // 'YYYY-MM'
  hasta: string;          // 'YYYY-MM'
  proyecto: string;
  opsLeidas: number;
  opsAbiertas: number;    // excluidas
  opsSumadas: number;
  opsLegacy: number;      // sumadas desde op.valores / op.tarifaTipo
  errores: ErrorAgregado[];
  meses: ResumenMesRecalculo[];   // desde los docs general_ recalculados
  docsRecalculados: number;
  docsGuardados: number;
  iguales: number;
  diferencias: DiferenciaResumen[];
}

export interface ResultadoRecalculo {
  escritos: number;
  borrados: number;
}

/** Herramienta de desarrollo: recalcula `resumenesOp` de un rango de meses
 *  DESDE LAS OPERACIONES (cerradas y liquidadas) con la misma función de
 *  aporte que el camino en vivo (ResumenOpFactoryService.agregados) y
 *  compara contra lo guardado. Ejecutar reemplaza los docs del rango
 *  (set, sin merge) y borra los que sobran. No atómico entre lotes de 500:
 *  idempotente, si se corta se vuelve a ejecutar.
 *
 *  Seguridad: rol dev en cualquier proyecto (se usa en la migración de
 *  Vantruck) + confirmación escrita del id de proyecto para ejecutar.
 *  Diseño: claude/diseno-reportes.md §4.6 / R7. */
@Injectable({ providedIn: 'root' })
export class RecalculoResumenesService {

  private db = inject(DbFirestoreService);
  private factory = inject(ResumenOpFactoryService);
  private usuarioSesion = inject(UsuarioSesionService);

  static readonly PROYECTO_DEMO = 'demoapplog';
  private static readonly TOLERANCIA = 0.005;

  get proyecto(): string {
    return environment.firebase.projectId;
  }

  esEntornoDemo(): boolean {
    return this.proyecto === RecalculoResumenesService.PROYECTO_DEMO;
  }

  /** Simular y verificar: no escribe nada. */
  async simular(desde: string, hasta: string, alAvanzar?: (msg: string) => void): Promise<SimulacionRecalculo> {
    this.verificarAcceso();
    return (await this.preparar(desde, hasta, alAvanzar)).simulacion;
  }

  /** Ejecutar: recalcula de nuevo (foto fresca) y reemplaza los docs del rango. */
  async ejecutar(
    desde: string,
    hasta: string,
    confirmacion: string,
    alAvanzar?: (msg: string) => void,
  ): Promise<ResultadoRecalculo> {
    this.verificarAcceso();
    if ((confirmacion ?? '').trim() !== this.proyecto) {
      throw new Error(`Confirmación incorrecta: escribí el id del proyecto (${this.proyecto}).`);
    }

    const { simulacion, resumenes, idsGuardados } = await this.preparar(desde, hasta, alAvanzar);
    if (simulacion.errores.length > 0) {
      throw new Error(
        `Hay ${simulacion.errores.length} operaciones con error: recalcular sin ellas perdería su aporte. ` +
        `Corregí esas operaciones y volvé a simular.`,
      );
    }

    const escrituras: EscrituraBatch[] = [];
    let borrados = 0;
    for (const id of idsGuardados) {
      if (!resumenes.has(id)) {
        escrituras.push({ coleccion: ResumenOpFactoryService.COLECCION, id, data: null, modo: 'eliminar' });
        borrados++;
      }
    }
    for (const [id, resumen] of resumenes) {
      escrituras.push({ coleccion: ResumenOpFactoryService.COLECCION, id, data: resumen, modo: 'reemplazar' });
    }

    alAvanzar?.(`Escribiendo ${escrituras.length} cambios…`);
    await this.db.commitBatch(escrituras);

    return { escritos: resumenes.size, borrados };
  }

  // ── Privados ────────────────────────────────────────────────────

  private async preparar(
    desde: string,
    hasta: string,
    alAvanzar?: (msg: string) => void,
  ): Promise<{ simulacion: SimulacionRecalculo; resumenes: Map<string, ResumenOpNuevo>; idsGuardados: string[] }> {
    const rango = this.validarRango(desde, hasta);

    alAvanzar?.('Leyendo operaciones…');
    const leidas = await this.db.consultarPorRango<Operacion>(
      'operaciones', 'fecha', `${desde}-01`, `${hasta}-31`,
    );
    const ops = leidas.map(o => ({ ...o, idOperacion: o.id })) as ConId<Operacion>[];
    const cerradas = ops.filter(op => op.estado?.ciclo !== 'abierta');

    alAvanzar?.(`Recalculando ${cerradas.length} operaciones…`);
    const { resumenes, errores, legacy } = this.factory.agregados(cerradas, Date.now());

    alAvanzar?.('Leyendo resúmenes guardados…');
    const guardados = await this.db.consultarPorRango<ResumenOpNuevo>(
      ResumenOpFactoryService.COLECCION, 'periodo', rango.periodoDesde, rango.periodoHasta,
    );
    const guardadosPorId = new Map<string, ConId<ResumenOpNuevo>>();
    for (const g of guardados) guardadosPorId.set(g.id, g);

    const diferencias: DiferenciaResumen[] = [];
    let iguales = 0;
    for (const [id, recalculado] of resumenes) {
      const guardado = guardadosPorId.get(id);
      if (!guardado) {
        diferencias.push({ id, estado: 'nuevo', campos: [] });
        continue;
      }
      const campos = this.compararMetricas(guardado, recalculado);
      if (campos.length === 0) iguales++;
      else diferencias.push({ id, estado: 'distinto', campos });
    }
    for (const g of guardados) {
      if (!resumenes.has(g.id)) diferencias.push({ id: g.id, estado: 'sobra', campos: [] });
    }

    const meses: ResumenMesRecalculo[] = [...resumenes.values()]
      .filter(r => r.tipo === 'general')
      .sort((a, b) => a.periodo - b.periodo)
      .map(r => ({
        periodo: r.periodo,
        cantidadOps: r.cantidadOps,
        facturado: r.cliente.total,
        costo: r.chofer.total,
        ganancia: r.ganancia,
      }));

    const simulacion: SimulacionRecalculo = {
      desde,
      hasta,
      proyecto: this.proyecto,
      opsLeidas: ops.length,
      opsAbiertas: ops.length - cerradas.length,
      opsSumadas: cerradas.length - errores.length,
      opsLegacy: legacy,
      errores,
      meses,
      docsRecalculados: resumenes.size,
      docsGuardados: guardados.length,
      iguales,
      diferencias,
    };

    return { simulacion, resumenes, idsGuardados: guardados.map(g => g.id) };
  }

  private validarRango(desde: string, hasta: string): { periodoDesde: number; periodoHasta: number } {
    const formato = /^\d{4}-\d{2}$/;
    if (!formato.test(desde ?? '') || !formato.test(hasta ?? '')) {
      throw new Error('Rango inválido: elegí mes desde y mes hasta (YYYY-MM).');
    }
    const periodoDesde = periodoDeFecha(`${desde}-01`).periodo;
    const periodoHasta = periodoDeFecha(`${hasta}-01`).periodo;
    if (periodoDesde > periodoHasta) {
      throw new Error('Rango inválido: "desde" es posterior a "hasta".');
    }
    return { periodoDesde, periodoHasta };
  }

  /** Campos métricos con diferencia mayor a la tolerancia (redondeo). */
  private compararMetricas(guardado: any, recalculado: any): string[] {
    const a = this.metricasPlanas(guardado);
    const b = this.metricasPlanas(recalculado);
    const campos: string[] = [];
    for (const k of Object.keys(b)) {
      if (Math.abs(a[k] - b[k]) > RecalculoResumenesService.TOLERANCIA) {
        campos.push(`${k}: ${a[k]} → ${b[k]}`);
      }
    }
    return campos;
  }

  private metricasPlanas(r: any): Record<string, number> {
    const out: Record<string, number> = {};
    for (const k of ['cantidadOps', 'kmRecorridos', 'acompanianteOps', 'acompanianteCantidadTotal', 'ganancia']) {
      out[k] = Number(r?.[k] ?? 0);
    }
    for (const lado of ['cliente', 'chofer']) {
      for (const k of ['tarifaBase', 'kmAdicional', 'acompValor', 'adExtraValor', 'total']) {
        out[`${lado}.${k}`] = Number(r?.[lado]?.[k] ?? 0);
      }
      for (const n of ['general', 'especial', 'personalizada', 'eventual']) {
        out[`${lado}.niveles.${n}`] = Number(r?.[lado]?.niveles?.[n] ?? 0);
      }
    }
    return out;
  }

  private verificarAcceso(): void {
    if (this.usuarioSesion.getRol() !== 'dev') {
      throw new Error('Recálculo bloqueado: requiere rol dev.');
    }
  }
}
