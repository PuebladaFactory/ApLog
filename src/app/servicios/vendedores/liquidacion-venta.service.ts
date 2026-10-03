import { Injectable, inject } from '@angular/core';
import { arrayRemove, arrayUnion } from '@angular/fire/firestore';
import { firstValueFrom, Observable } from 'rxjs';
import { ConId } from 'src/app/interfaces/conId';
import { Resultado } from 'src/app/interfaces/resultado';
import { ComisionVenta } from 'src/app/interfaces/comision-venta';
import { EstadoLiquidacionVenta, LineaLiquidacionVenta, LiquidacionVenta } from 'src/app/interfaces/liquidacion-venta';
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';
import { NumeradorService } from 'src/app/servicios/numerador/numerador.service';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { ComisionVentaFactoryService } from 'src/app/servicios/vendedores/comision-venta-factory.service';
import { ComisionVentaConsultaService } from 'src/app/servicios/vendedores/comision-venta-consulta.service';
import { VendedorService } from 'src/app/servicios/vendedores/vendedor.service';
import { esCero, redondear2 } from 'src/app/shared/utils/tablero-comisiones.util';

/** Filtros del Historial de liquidaciones, recordados durante la sesión.
 *  desde/hasta: mes de corte 'YYYY-MM'; idVendedor: id o 'todos'. */
export interface FiltrosHistorialLiquidacion {
  desde: string;
  hasta: string;
  idVendedor: string;
  estado: EstadoLiquidacionVenta | 'todos';
}

/** Dueño de las liquidaciones de comisiones de venta (Frente Vendedores) —
 *  colección `liquidacionesVenta`. Cuatro gestos, cada uno en
 *  commitEnTransaccion con un único log:
 *    emitir        → toma todo el saldo pendiente del vendedor hasta el mes
 *                    de corte; marca las comisiones liquidadas (EMITIR).
 *    pagar         → emitida → pagada, con fecha y observación (PAGAR).
 *    revertirPago  → pagada → emitida (REVERTIR).
 *    anular        → solo emitida; devuelve lo liquidado al saldo de cada
 *                    comisión (ANULAR).
 *  Modelo saldo (interfaces/comision-venta.ts): saldo = monto − montoLiquidado.
 *  Diseño: claude/diseno-vendedores.md §8.6. */
@Injectable({ providedIn: 'root' })
export class LiquidacionVentaService {

  static readonly COLECCION = 'liquidacionesVenta';

  private db = inject(DbFirestoreService);
  private logRegistro = inject(LogRegistroService);
  private numerador = inject(NumeradorService);
  private consulta = inject(ComisionVentaConsultaService);
  private vendedorService = inject(VendedorService);

  /** Filtros del Historial (al salir y volver a la pestaña). null = por defecto. */
  filtrosHistorial: FiltrosHistorialLiquidacion | null = null;

  // ── Consulta ────────────────────────────────────────────────────

  /** Liquidaciones con mes de corte entre `desde` y `hasta` (anio*100+mes,
   *  inclusive), en vivo. Rango sobre un solo campo → índice simple. */
  observarPorPeriodos(desde: number, hasta: number): Observable<ConId<LiquidacionVenta>[]> {
    return this.db.observarPorRango<LiquidacionVenta>(LiquidacionVentaService.COLECCION, 'periodo', desde, hasta);
  }

  // ── Consulta previa ─────────────────────────────────────────────

  /** Comisiones pendientes (saldo ≠ 0) del vendedor con período ≤ periodo.
   *  One-shot (query): las relee por id la transacción de emitir. */
  async pendientesHasta(idVendedor: string, periodo: number): Promise<ConId<ComisionVenta>[]> {
    const pendientes = await firstValueFrom(this.consulta.observarPendientes());
    return pendientes.filter(c => c.idVendedor === idVendedor && c.periodo <= periodo);
  }

  // ── Emitir ──────────────────────────────────────────────────────

  /** Emite la liquidación del vendedor con todo su saldo pendiente hasta el
   *  mes `periodo` (anio*100+mes). `totalEsperado` es el saldo que el usuario
   *  confirmó en pantalla: si el saldo releído en la transacción difiere, se
   *  aborta sin escribir. */
  async emitir(idVendedor: string, periodo: number, totalEsperado: number): Promise<Resultado<{ id: string; numero: string }>> {
    const COLECCION = LiquidacionVentaService.COLECCION;
    try {
      const vendedor = this.vendedorService.getVendedorPorId(idVendedor);
      if (!vendedor) throw new Error(`No se encontró el vendedor ${idVendedor}.`);

      const candidatas = await this.pendientesHasta(idVendedor, periodo);
      if (candidatas.length === 0) throw new Error('El vendedor no tiene saldo pendiente hasta ese mes.');

      const idLiquidacion = this.db.generarId(COLECCION);
      const anio = Math.floor(periodo / 100);
      const mes = periodo % 100;
      const nombre = `${vendedor.datosPersonales.apellido} ${vendedor.datosPersonales.nombre}`;

      const numero = await this.db.commitEnTransaccion<string>(async (tx) => {
        // — Lecturas —
        const frescas: { id: string; c: ComisionVenta }[] = [];
        for (const cand of candidatas) {
          const c = await this.db.leerEnTransaccion<ComisionVenta>(tx, ComisionVentaFactoryService.COLECCION, cand.id);
          if (c && c.idVendedor === idVendedor && c.periodo <= periodo && !esCero(c.saldo)) {
            frescas.push({ id: cand.id, c });
          }
        }
        const { numero: numeroNuevo, escritura: escrituraNumerador } =
          await this.numerador.leerProximoNumeroLiquidacionVenta(tx);
        // — fin de lecturas —

        if (frescas.length === 0) throw new Error('Las comisiones ya no tienen saldo pendiente.');
        const total = redondear2(frescas.reduce((acc, f) => acc + (f.c.saldo ?? 0), 0));
        if (Math.abs(total - redondear2(totalEsperado)) >= 0.01) {
          throw new Error(
            `El saldo a liquidar cambió (pantalla ${redondear2(totalEsperado)}, actual ${total}). ` +
            'Revisá el tablero y volvé a liquidar.',
          );
        }

        const lineas: LineaLiquidacionVenta[] = frescas
          .map(({ id, c }) => {
            const previo = redondear2(c.montoLiquidado ?? 0);
            const monto = redondear2(c.monto ?? 0);
            return {
              idComision: id,
              idOperacion: c.idOperacion,
              numeroOperacion: c.numeroOperacion,
              fecha: c.fecha,
              idCliente: c.idCliente,
              razonSocial: c.razonSocial,
              base: c.base ?? 0,
              porcentaje: c.porcentaje ?? 0,
              monto,
              previo,
              importe: redondear2(monto - previo),
              ajuste: !esCero(previo) || !!c.anulada,
            };
          })
          .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.numeroOperacion - b.numeroOperacion);

        const liquidacion: LiquidacionVenta = {
          numero: numeroNuevo,
          idVendedor,
          vendedor: {
            apellido: vendedor.datosPersonales.apellido,
            nombre: vendedor.datosPersonales.nombre,
            cuit: vendedor.datosPersonales.cuit,
          },
          anio,
          mes,
          periodo,
          fechaEmision: toISODateString(new Date()),
          lineas,
          total,
          estado: 'emitida',
          pago: null,
          anulacion: null,
        };

        const ahora = Date.now();
        const escrituras: EscrituraBatch[] = frescas.map(({ id, c }) => ({
          coleccion: ComisionVentaFactoryService.COLECCION,
          id,
          modo: 'actualizar',
          data: {
            montoLiquidado: c.monto ?? 0,
            saldo: 0,
            idsLiquidacion: arrayUnion(idLiquidacion),
            actualizado: ahora,
          },
        }));
        escrituras.push(
          { coleccion: COLECCION, id: idLiquidacion, modo: 'crear', data: liquidacion },
          escrituraNumerador,
        );
        await this.logRegistro.agregarAlBatch(
          escrituras, 'EMITIR', COLECCION, idLiquidacion,
          `Liquidación de comisiones ${numeroNuevo} — ${nombre} — hasta ${String(mes).padStart(2, '0')}/${anio} — ` +
          `${lineas.length} comisiones — total ${total}`,
          null,
        );
        return { escrituras, resultado: numeroNuevo };
      });

      return { exito: true, mensaje: `Liquidación ${numero} emitida.`, objeto: { id: idLiquidacion, numero } };
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'EMITIR', COLECCION, idVendedor, `Error al emitir liquidación de comisiones: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: e?.message ?? String(e) };
    }
  }

  // ── Pagar / revertir pago ───────────────────────────────────────

  async pagar(idLiquidacion: string, fecha: string, observacion: string | null): Promise<Resultado<void>> {
    const COLECCION = LiquidacionVentaService.COLECCION;
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha ?? '')) throw new Error('Fecha de pago inválida.');
      const numero = await this.db.commitEnTransaccion<string>(async (tx) => {
        const liq = await this.db.leerEnTransaccion<LiquidacionVenta>(tx, COLECCION, idLiquidacion);
        if (!liq) throw new Error(`No existe la liquidación ${idLiquidacion}.`);
        if (liq.estado !== 'emitida') throw new Error(`La liquidación ${liq.numero} está ${liq.estado}: solo se paga una emitida.`);

        const escrituras: EscrituraBatch[] = [{
          coleccion: COLECCION, id: idLiquidacion, modo: 'actualizar',
          data: { estado: 'pagada', pago: { fecha, observacion: observacion?.trim() || null } },
        }];
        await this.logRegistro.agregarAlBatch(
          escrituras, 'PAGAR', COLECCION, idLiquidacion,
          `Pago de la liquidación de comisiones ${liq.numero} — fecha ${fecha}`,
        );
        return { escrituras, resultado: liq.numero };
      });
      return { exito: true, mensaje: `Liquidación ${numero} pagada.` };
    } catch (e: any) {
      await this.logRegistro.registrarError('PAGAR', COLECCION, idLiquidacion, `Error al pagar: ${e?.message ?? e}`);
      return { exito: false, mensaje: e?.message ?? String(e) };
    }
  }

  async revertirPago(idLiquidacion: string, motivo: string): Promise<Resultado<void>> {
    const COLECCION = LiquidacionVentaService.COLECCION;
    try {
      const numero = await this.db.commitEnTransaccion<string>(async (tx) => {
        const liq = await this.db.leerEnTransaccion<LiquidacionVenta>(tx, COLECCION, idLiquidacion);
        if (!liq) throw new Error(`No existe la liquidación ${idLiquidacion}.`);
        if (liq.estado !== 'pagada') throw new Error(`La liquidación ${liq.numero} no está pagada.`);

        const escrituras: EscrituraBatch[] = [{
          coleccion: COLECCION, id: idLiquidacion, modo: 'actualizar',
          data: { estado: 'emitida', pago: null },
        }];
        await this.logRegistro.agregarAlBatch(
          escrituras, 'REVERTIR', COLECCION, idLiquidacion,
          `Reversión del pago de la liquidación de comisiones ${liq.numero} — motivo: ${motivo}`,
          liq,
        );
        return { escrituras, resultado: liq.numero };
      });
      return { exito: true, mensaje: `Pago de la liquidación ${numero} revertido.` };
    } catch (e: any) {
      await this.logRegistro.registrarError('REVERTIR', COLECCION, idLiquidacion, `Error al revertir pago: ${e?.message ?? e}`);
      return { exito: false, mensaje: e?.message ?? String(e) };
    }
  }

  // ── Anular ──────────────────────────────────────────────────────

  /** Solo una liquidación emitida (si está pagada, primero se revierte el
   *  pago). Devuelve a cada comisión lo que liquidó esta liquidación. */
  async anular(idLiquidacion: string, motivo: string): Promise<Resultado<void>> {
    const COLECCION = LiquidacionVentaService.COLECCION;
    try {
      if (!motivo?.trim()) throw new Error('Falta el motivo de la anulación.');
      const numero = await this.db.commitEnTransaccion<string>(async (tx) => {
        // — Lecturas —
        const liq = await this.db.leerEnTransaccion<LiquidacionVenta>(tx, COLECCION, idLiquidacion);
        if (!liq) throw new Error(`No existe la liquidación ${idLiquidacion}.`);
        if (liq.estado === 'pagada') throw new Error(`La liquidación ${liq.numero} está pagada: primero revertí el pago.`);
        if (liq.estado !== 'emitida') throw new Error(`La liquidación ${liq.numero} ya está ${liq.estado}.`);

        const comisiones: { linea: LineaLiquidacionVenta; c: ComisionVenta | null }[] = [];
        for (const linea of liq.lineas) {
          const c = await this.db.leerEnTransaccion<ComisionVenta>(tx, ComisionVentaFactoryService.COLECCION, linea.idComision);
          comisiones.push({ linea, c });
        }
        // — fin de lecturas —

        const faltantes = comisiones.filter(x => !x.c).map(x => x.linea.idComision);
        if (faltantes.length > 0) {
          throw new Error(`Inconsistencia: no existen las comisiones ${faltantes.join(', ')}. Anulación abortada.`);
        }

        const ahora = Date.now();
        const escrituras: EscrituraBatch[] = comisiones.map(({ linea, c }) => {
          const montoLiquidado = redondear2((c!.montoLiquidado ?? 0) - linea.importe);
          return {
            coleccion: ComisionVentaFactoryService.COLECCION,
            id: linea.idComision,
            modo: 'actualizar',
            data: {
              montoLiquidado,
              saldo: redondear2((c!.monto ?? 0) - montoLiquidado),
              idsLiquidacion: arrayRemove(idLiquidacion),
              actualizado: ahora,
            },
          };
        });
        escrituras.push({
          coleccion: COLECCION, id: idLiquidacion, modo: 'actualizar',
          data: { estado: 'anulada', anulacion: { fecha: toISODateString(new Date()), motivo: motivo.trim() } },
        });
        await this.logRegistro.agregarAlBatch(
          escrituras, 'ANULAR', COLECCION, idLiquidacion,
          `Anulación de la liquidación de comisiones ${liq.numero} — motivo: ${motivo.trim()} — ` +
          `${liq.lineas.length} comisiones vuelven a quedar pendientes`,
          liq,
        );
        return { escrituras, resultado: liq.numero };
      });
      return { exito: true, mensaje: `Liquidación ${numero} anulada: sus comisiones vuelven a estar pendientes.` };
    } catch (e: any) {
      await this.logRegistro.registrarError('ANULAR', COLECCION, idLiquidacion, `Error al anular: ${e?.message ?? e}`);
      return { exito: false, mensaje: e?.message ?? String(e) };
    }
  }
}
