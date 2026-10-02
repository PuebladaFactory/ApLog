import { Injectable, inject } from '@angular/core';
import { environment } from 'src/environments/environment';
import { ConId } from 'src/app/interfaces/conId';
import { Operacion } from 'src/app/interfaces/operacion';
import { AsignacionVenta } from 'src/app/interfaces/vendedor-nuevo';
import { ComisionVenta } from 'src/app/interfaces/comision-venta';
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { ComisionCalculada, ComisionVentaFactoryService } from 'src/app/servicios/vendedores/comision-venta-factory.service';
import { periodoDeFecha } from 'src/app/shared/utils/periodo.util';

export type EstadoDiferenciaComision = 'nueva' | 'distinta' | 'anular';

export interface DiferenciaComision {
  id: string;
  estado: EstadoDiferenciaComision;
  numeroOperacion: number | null;
  /** Solo en 'distinta' / 'anular': "campo: guardado → recalculado". */
  campos: string[];
}

export interface ErrorComision {
  idOperacion: string;
  numeroOperacion: number | null;
  mensaje: string;
}

export interface TotalVendedorRecalculo {
  idVendedor: string;
  comisiones: number;   // no anuladas
  monto: number;
  saldo: number;
}

export interface SimulacionRecalculoComisiones {
  desde: string;          // 'YYYY-MM'
  hasta: string;          // 'YYYY-MM'
  proyecto: string;
  opsLeidas: number;
  opsAbiertas: number;    // excluidas
  opsCerradas: number;
  opsConVendedores: number;   // cerradas con al menos un vendedor (snapshot o completado)
  opsACompletar: number;      // sin snapshot: se completa con la asignación vigente del cliente
  errores: ErrorComision[];
  porVendedor: TotalVendedorRecalculo[];
  docsEsperados: number;
  docsGuardados: number;
  iguales: number;
  diferencias: DiferenciaComision[];
}

export interface ResultadoRecalculoComisiones {
  comisionesEscritas: number;
  opsCompletadas: number;
}

/** Herramienta de desarrollo: recalcula `comisionesVenta` de un rango de
 *  meses DESDE LAS OPERACIONES cerradas/liquidadas, con la misma factory que
 *  el camino en vivo (ComisionVentaFactoryService), y compara contra lo
 *  guardado. Completa el snapshot `cliente.comisiones` de las ops que no lo
 *  tienen (anteriores al frente Vendedores) con la asignación vigente del
 *  cliente. Conserva `montoLiquidado` / `idsLiquidacion`; nunca borra
 *  comisiones (las que sobran quedan anuladas con monto 0).
 *
 *  Seguridad: rol dev + confirmación escrita del id de proyecto para
 *  ejecutar. Diseño: claude/diseno-vendedores.md §8.9. */
@Injectable({ providedIn: 'root' })
export class RecalculoComisionesService {

  private db = inject(DbFirestoreService);
  private factory = inject(ComisionVentaFactoryService);
  private clienteService = inject(ClienteService);
  private usuarioSesion = inject(UsuarioSesionService);

  static readonly PROYECTO_DEMO = 'demoapplog';

  get proyecto(): string {
    return environment.firebase.projectId;
  }

  esEntornoDemo(): boolean {
    return this.proyecto === RecalculoComisionesService.PROYECTO_DEMO;
  }

  /** Simular y verificar: no escribe nada. */
  async simular(desde: string, hasta: string, alAvanzar?: (msg: string) => void): Promise<SimulacionRecalculoComisiones> {
    this.verificarAcceso();
    return (await this.preparar(desde, hasta, alAvanzar)).simulacion;
  }

  /** Ejecutar: recalcula de nuevo (foto fresca) y escribe solo lo distinto. */
  async ejecutar(
    desde: string,
    hasta: string,
    confirmacion: string,
    alAvanzar?: (msg: string) => void,
  ): Promise<ResultadoRecalculoComisiones> {
    this.verificarAcceso();
    if ((confirmacion ?? '').trim() !== this.proyecto) {
      throw new Error(`Confirmación incorrecta: escribí el id del proyecto (${this.proyecto}).`);
    }

    const { simulacion, escriturasOps, escriturasComisiones } = await this.preparar(desde, hasta, alAvanzar);
    if (simulacion.errores.length > 0) {
      throw new Error(
        `Hay ${simulacion.errores.length} operaciones con error: corregilas y volvé a simular.`,
      );
    }

    const escrituras = [...escriturasOps, ...escriturasComisiones];
    if (escrituras.length > 0) {
      alAvanzar?.(`Escribiendo ${escrituras.length} cambios…`);
      await this.db.commitBatch(escrituras);
    }
    return { comisionesEscritas: escriturasComisiones.length, opsCompletadas: escriturasOps.length };
  }

  // ── Privados ────────────────────────────────────────────────────

  private async preparar(
    desde: string,
    hasta: string,
    alAvanzar?: (msg: string) => void,
  ): Promise<{
    simulacion: SimulacionRecalculoComisiones;
    escriturasOps: EscrituraBatch[];
    escriturasComisiones: EscrituraBatch[];
  }> {
    const rango = this.validarRango(desde, hasta);
    const COLECCION = ComisionVentaFactoryService.COLECCION;

    alAvanzar?.('Leyendo operaciones…');
    const leidas = await this.db.consultarPorRango<Operacion>(
      'operaciones', 'fecha', `${desde}-01`, `${hasta}-31`,
    );
    const ops = leidas.map(o => ({ ...o, idOperacion: o.id })) as ConId<Operacion>[];
    const cerradas = ops.filter(op => op.estado?.ciclo !== 'abierta');

    alAvanzar?.('Leyendo comisiones guardadas…');
    const guardadas = await this.db.consultarPorRango<ComisionVenta>(
      COLECCION, 'periodo', rango.periodoDesde, rango.periodoHasta,
    );
    const guardadasPorId = new Map<string, ConId<ComisionVenta>>();
    for (const g of guardadas) guardadasPorId.set(g.id, g);

    alAvanzar?.(`Recalculando ${cerradas.length} operaciones…`);
    const ahora = Date.now();
    const esperadas = new Map<string, ComisionVenta>();
    const soloGuardadas = new Set<string>();
    const errores: ErrorComision[] = [];
    const escriturasOps: EscrituraBatch[] = [];
    let opsConVendedores = 0;

    for (const op of cerradas) {
      try {
        let snapshot: AsignacionVenta[] | undefined = op.cliente?.comisiones;
        let completar = false;
        if (snapshot === undefined) {
          const vigentes = this.clienteService.getClientePorId(op.cliente?.id ?? '')?.comisionesVenta ?? [];
          snapshot = vigentes.map(a => ({ idVendedor: a.idVendedor, porcentaje: a.porcentaje }));
          completar = snapshot.length > 0;
        }
        if (snapshot.length === 0) continue;

        const opConSnapshot: Operacion = { ...op, cliente: { ...op.cliente, comisiones: snapshot } };
        const calculadas: ComisionCalculada[] = this.factory.comisionesDeOperacion(opConSnapshot);

        const nuevasDeOp: [string, ComisionVenta][] = [];
        for (const c of calculadas) {
          const id = this.factory.idComision(op.idOperacion, c.idVendedor);
          const previa = guardadasPorId.get(id);
          const montoLiquidado = previa?.montoLiquidado ?? 0;
          nuevasDeOp.push([id, {
            ...this.factory.identidad(opConSnapshot, c),
            base: c.base,
            monto: c.monto,
            montoLiquidado,
            saldo: this.factory.redondear(c.monto - montoLiquidado),
            anulada: false,
            idsLiquidacion: previa?.idsLiquidacion ?? [],
            actualizado: ahora,
          } as ComisionVenta]);
        }

        // Solo si toda la op se pudo calcular: se registra y se completa.
        for (const [id, comision] of nuevasDeOp) esperadas.set(id, comision);
        opsConVendedores++;
        if (completar) {
          escriturasOps.push({
            coleccion: 'operaciones',
            id: op.idOperacion,
            modo: 'actualizar',
            data: { 'cliente.comisiones': snapshot },
          });
        }
      } catch (e: any) {
        errores.push({
          idOperacion: op.idOperacion,
          numeroOperacion: op.numeroOperacion ?? null,
          mensaje: e?.message ?? String(e),
        });
      }
    }

    // Guardadas que ya no corresponden: monto 0 + anulada (nunca se borran).
    for (const g of guardadas) {
      if (esperadas.has(g.id)) continue;
      const resto: any = { ...g };
      delete resto.id;
      const montoLiquidado = g.montoLiquidado ?? 0;
      esperadas.set(g.id, {
        ...resto,
        monto: 0,
        montoLiquidado,
        saldo: this.factory.redondear(-montoLiquidado),
        anulada: true,
        actualizado: ahora,
      } as ComisionVenta);
      soloGuardadas.add(g.id);
    }

    // Comparación doc por doc.
    const diferencias: DiferenciaComision[] = [];
    const escriturasComisiones: EscrituraBatch[] = [];
    let iguales = 0;
    for (const [id, esperada] of esperadas) {
      const guardada = guardadasPorId.get(id);
      if (!guardada) {
        diferencias.push({ id, estado: 'nueva', numeroOperacion: esperada.numeroOperacion ?? null, campos: [] });
        escriturasComisiones.push({ coleccion: COLECCION, id, modo: 'reemplazar', data: esperada });
        continue;
      }
      const campos = this.comparar(guardada, esperada);
      if (campos.length === 0) {
        iguales++;
        continue;
      }
      diferencias.push({
        id,
        estado: soloGuardadas.has(id) ? 'anular' : 'distinta',
        numeroOperacion: esperada.numeroOperacion ?? null,
        campos,
      });
      escriturasComisiones.push({ coleccion: COLECCION, id, modo: 'reemplazar', data: esperada });
    }

    // Totales por vendedor (sobre lo esperado).
    const totales = new Map<string, TotalVendedorRecalculo>();
    for (const c of esperadas.values()) {
      const t = totales.get(c.idVendedor) ?? { idVendedor: c.idVendedor, comisiones: 0, monto: 0, saldo: 0 };
      if (!c.anulada) t.comisiones++;
      t.monto = this.factory.redondear(t.monto + (c.monto ?? 0));
      t.saldo = this.factory.redondear(t.saldo + (c.saldo ?? 0));
      totales.set(c.idVendedor, t);
    }

    const simulacion: SimulacionRecalculoComisiones = {
      desde,
      hasta,
      proyecto: this.proyecto,
      opsLeidas: ops.length,
      opsAbiertas: ops.length - cerradas.length,
      opsCerradas: cerradas.length,
      opsConVendedores,
      opsACompletar: escriturasOps.length,
      errores,
      porVendedor: [...totales.values()],
      docsEsperados: esperadas.size,
      docsGuardados: guardadas.length,
      iguales,
      diferencias,
    };

    return { simulacion, escriturasOps, escriturasComisiones };
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

  /** Campos con diferencia (numéricos con tolerancia de redondeo). */
  private comparar(guardada: any, esperada: any): string[] {
    const campos: string[] = [];
    for (const k of ['base', 'monto', 'montoLiquidado', 'saldo', 'porcentaje', 'numeroOperacion', 'periodo']) {
      const a = Number(guardada?.[k] ?? 0);
      const b = Number(esperada?.[k] ?? 0);
      if (Math.abs(a - b) > ComisionVentaFactoryService.TOLERANCIA) campos.push(`${k}: ${a} → ${b}`);
    }
    for (const k of ['anulada', 'fecha', 'idOperacion', 'idCliente', 'razonSocial', 'idVendedor']) {
      const a = guardada?.[k] ?? null;
      const b = esperada?.[k] ?? null;
      if (a !== b) campos.push(`${k}: ${a} → ${b}`);
    }
    return campos;
  }

  private verificarAcceso(): void {
    if (this.usuarioSesion.getRol() !== 'dev') {
      throw new Error('Recálculo bloqueado: requiere rol dev.');
    }
  }
}
