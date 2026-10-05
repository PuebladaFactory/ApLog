import { Injectable, inject } from '@angular/core';
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { ImputacionFin } from 'src/app/interfaces/movimiento-fin';
import { Resultado } from 'src/app/interfaces/resultado';
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { InformeLiqService } from 'src/app/servicios/informes-liq/informe-liq.service';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';
import { NumeradorService } from 'src/app/servicios/numerador/numerador.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import {
  aplicarImporte, estadoFinancieroDe, normalizarValoresFinancieros, totalMedios,
} from 'src/app/shared/utils/finanzas.util';
import {
  DatosMovimientoFin, armarImputacion, armarMovimiento, normalizarDatosMovimiento,
  validarDatosMovimiento, validarDocumentoImputable,
} from 'src/app/shared/utils/movimiento-fin.util';

export interface ResultadoMovimientoFin {
  idMovimiento: string;
  numero: string;
}

/** Dueño de los movimientos de Finanzas (colección `movimientosFin`):
 *  cobros (RC), pagos (OPG) y, en bloques siguientes, ajustes (AJ),
 *  anulación e imputación de saldos. Cada gesto es UNA transacción
 *  (commitEnTransaccion) con su log: movimiento + InformeLiq imputados
 *  (valoresFinancieros / estadoFinanciero, escritos con la pieza de
 *  InformeLiqService) + numerador + registroLog.
 *  Por contrato con Facturación, solo se imputa a InformeLiq 'facturado'.
 *  Diseño: claude/diseno-finanzas.md §4.2, §4.3, §9. */
@Injectable({ providedIn: 'root' })
export class MovimientoFinService {

  private db = inject(DbFirestoreService);
  private numerador = inject(NumeradorService);
  private logRegistro = inject(LogRegistroService);
  private informeLiqServ = inject(InformeLiqService);
  private usuarioSesion = inject(UsuarioSesionService);

  private readonly COLECCION = 'movimientosFin';
  private readonly COL_LIQ = 'informesLiq';

  /** Registra un cobro (cliente) o un pago (chofer/proveedor). Transacción:
   *  lee el numerador y cada InformeLiq imputado (facturado, de la entidad,
   *  con saldo suficiente); escribe el movimiento, los valores financieros
   *  de cada informe (totalCobrado, saldo, estadoFinanciero), el numerador
   *  y un log COBRAR / PAGAR. Lo no imputado queda en `sinImputar` (saldo a
   *  favor / anticipo). */
  async registrar(d: DatosMovimientoFin): Promise<Resultado<ResultadoMovimientoFin>> {
    const datos = normalizarDatosMovimiento(d);
    const error = validarDatosMovimiento(datos, toISODateString(new Date()));
    if (error) return { exito: false, mensaje: error };

    // Afuera del callback: puede reintentarse y tiene que ser puro.
    const idMovimiento = this.db.generarId(this.COLECCION);
    const fechaRegistro = new Date().toISOString();
    const usuario = this.usuarioSesion.getUsuarioActual()?.email ?? 'Desconocido';
    const accion = datos.tipo === 'cobro' ? 'COBRAR' : 'PAGAR';
    const etiqueta = datos.tipo === 'cobro' ? 'Cobro' : 'Pago';
    const concepto = datos.concepto === 'anticipo' ? ' (anticipo)' : datos.concepto === 'prestamo' ? ' (préstamo)' : '';

    try {
      const numero = await this.db.commitEnTransaccion<string>(async (tx) => {
        const escrituras: EscrituraBatch[] = [];

        const n = await this.numerador.leerProximoNumeroMovimientoFin(tx, datos.tipo);
        const leidos = await Promise.all(datos.imputaciones.map(async imp => ({
          imp,
          liq: await this.db.leerEnTransaccion<InformeLiqNuevo>(tx, this.COL_LIQ, imp.idInfLiq),
        })));
        // — fin de lecturas —

        escrituras.push(n.escritura);
        const imputaciones: ImputacionFin[] = [];
        for (const { imp, liq } of leidos) {
          if (!liq) throw new Error(`No existe el informe de liquidación ${imp.idInfLiq}.`);
          validarDocumentoImputable(liq, imp.idInfLiq, datos.entidad);
          const vfAntes = normalizarValoresFinancieros(liq.valoresFinancieros, liq.valores.total);
          const vf = aplicarImporte(vfAntes, 'totalCobrado', imp.importe);   // tira Error si supera el saldo
          imputaciones.push(armarImputacion(liq, imp.idInfLiq, vfAntes, imp.importe, datos.fecha, 'directa'));
          this.informeLiqServ.agregarEscrituraInformeLiqParcial(escrituras, imp.idInfLiq, {
            valoresFinancieros: vf,
            estadoFinanciero: estadoFinancieroDe(vf, liq.estadoFinanciero),
          });
        }

        const movimiento = armarMovimiento({ datos, numero: n.numero, fechaRegistro, usuario, imputaciones });
        escrituras.push({ coleccion: this.COLECCION, id: idMovimiento, modo: 'crear', data: movimiento });

        await this.logRegistro.agregarAlBatch(
          escrituras, accion, this.COLECCION, idMovimiento,
          `${etiqueta}${concepto} ${n.numero} — ${datos.entidad.tipo} ${datos.entidad.razonSocial} — ` +
          `$ ${movimiento.total.toFixed(2)} — ${imputaciones.length} comprobante(s)` +
          (movimiento.sinImputar > 0 ? ` — sin imputar $ ${movimiento.sinImputar.toFixed(2)}` : ''),
          null,
        );

        return { escrituras, resultado: n.numero };
      });

      return {
        exito: true,
        mensaje: `${etiqueta} ${numero} registrado por $ ${totalMedios(datos.medios).toFixed(2)}.`,
        objeto: { idMovimiento, numero },
      };
    } catch (e: any) {
      await this.logRegistro.registrarError(
        accion, this.COLECCION, idMovimiento, `Error al registrar ${etiqueta.toLowerCase()}: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `No se pudo registrar el ${etiqueta.toLowerCase()}: ${e?.message ?? e}` };
    }
  }
}
