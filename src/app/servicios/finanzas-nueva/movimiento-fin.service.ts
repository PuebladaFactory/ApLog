import { Injectable, inject } from '@angular/core';
import { Anulacion } from 'src/app/interfaces/anulacion';
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { ImputacionFin, MovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { Resultado } from 'src/app/interfaces/resultado';
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { InformeLiqService } from 'src/app/servicios/informes-liq/informe-liq.service';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';
import { NumeradorService } from 'src/app/servicios/numerador/numerador.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import {
  aplicarImporte, estadoFinancieroDe, normalizarValoresFinancieros, redondear2, totalMedios,
} from 'src/app/shared/utils/finanzas.util';
import {
  DatosAjusteFin, DatosCierreSaldo, DatosDevolucion, DatosMovimientoFin, ETIQUETA_MOTIVO_AJUSTE, ETIQUETA_TIPO_MOVIMIENTO,
  ImputacionSolicitada, acumularImputaciones, acumuladoDeMovimiento, armarAjuste, armarCierreSaldo, armarDevolucion,
  armarImputacion, armarMovimiento, imputacionSobreMovimiento, normalizarCierreSaldo, normalizarDatosAjuste,
  normalizarDatosMovimiento, normalizarDevolucion, normalizarSolicitudes, quitarImputacionesDe, reversionesDe,
  tipoDevolucionDe, validarAnulable, validarCierreSaldo, validarDatosAjuste, validarDatosMovimiento,
  validarDevolucion, validarDocumentoImputable, validarImporteAjuste, validarImputacionSaldo,
} from 'src/app/shared/utils/movimiento-fin.util';

export interface ResultadoMovimientoFin {
  idMovimiento: string;
  numero: string;
}

/** Dueño de los movimientos de Finanzas (colección `movimientosFin`):
 *  cobros (RC), pagos (OPG), ajustes (AJ, F7a), anulación e imputación de
 *  saldos. Cada gesto es UNA transacción
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

  /** Registra un AJUSTE (F7a): baja el saldo de comprobantes facturados de
   *  la entidad sin mover dinero (incobrable, bonificación, redondeo, otro).
   *  Transacción: lee el numerador AJ y cada InformeLiq (facturado, de la
   *  entidad, con saldo suficiente; incobrable = saldo completo); a cada
   *  informe le suma el importe a totalAjustado y recalcula saldo y
   *  estadoFinanciero ('incobrable' si el motivo lo es); escribe el ajuste
   *  (sin medios, nada sin imputar), el numerador y un log AJUSTAR. Se
   *  revierte con anular(), como cualquier movimiento. */
  async registrarAjuste(d: DatosAjusteFin): Promise<Resultado<ResultadoMovimientoFin>> {
    const datos = normalizarDatosAjuste(d);
    const error = validarDatosAjuste(datos, toISODateString(new Date()));
    if (error) return { exito: false, mensaje: error };

    // Afuera del callback: puede reintentarse y tiene que ser puro.
    const idMovimiento = this.db.generarId(this.COLECCION);
    const fechaRegistro = new Date().toISOString();
    const usuario = this.usuarioSesion.getUsuarioActual()?.email ?? 'Desconocido';
    const motivo = ETIQUETA_MOTIVO_AJUSTE[datos.motivo];

    try {
      const r = await this.db.commitEnTransaccion<{ numero: string; total: number }>(async (tx) => {
        const escrituras: EscrituraBatch[] = [];

        const n = await this.numerador.leerProximoNumeroMovimientoFin(tx, 'ajuste');
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
          const errorImporte = validarImporteAjuste(datos.motivo, vfAntes.saldo, imp.importe, liq.numeroInterno ?? imp.idInfLiq);
          if (errorImporte) throw new Error(errorImporte);
          const vf = aplicarImporte(vfAntes, 'totalAjustado', imp.importe);   // tira Error si supera el saldo
          imputaciones.push(armarImputacion(liq, imp.idInfLiq, vfAntes, imp.importe, datos.fecha, 'directa'));
          this.informeLiqServ.agregarEscrituraInformeLiqParcial(escrituras, imp.idInfLiq, {
            valoresFinancieros: vf,
            estadoFinanciero: datos.motivo === 'incobrable' ? 'incobrable' : estadoFinancieroDe(vf, liq.estadoFinanciero),
          });
        }

        const ajuste = armarAjuste({ datos, numero: n.numero, fechaRegistro, usuario, imputaciones });
        escrituras.push({ coleccion: this.COLECCION, id: idMovimiento, modo: 'crear', data: ajuste });

        await this.logRegistro.agregarAlBatch(
          escrituras, 'AJUSTAR', this.COLECCION, idMovimiento,
          `Ajuste (${motivo.toLowerCase()}) ${n.numero} — ${datos.entidad.tipo} ${datos.entidad.razonSocial} — ` +
          `$ ${ajuste.total.toFixed(2)} — ${imputaciones.map(i => i.numeroDocumento).join(', ')}` +
          (datos.observaciones ? ` — ${datos.observaciones}` : ''),
          null,
        );

        return { escrituras, resultado: { numero: n.numero, total: ajuste.total } };
      });

      return {
        exito: true,
        mensaje: `Ajuste ${r.numero} (${motivo.toLowerCase()}) registrado por $ ${r.total.toFixed(2)}.`,
        objeto: { idMovimiento, numero: r.numero },
      };
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'AJUSTAR', this.COLECCION, idMovimiento, `Error al registrar el ajuste: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `No se pudo registrar el ajuste: ${e?.message ?? e}` };
    }
  }

  /** Cierra (todo o parte de) el saldo sin imputar de un cobro o pago con
   *  un AJUSTE (F7b): anticipo o préstamo que no se recupera (incobrable,
   *  por el saldo completo), saldo a favor de un cliente que no se usa
   *  (redondeo / otro). Transacción: numerador AJ + movimiento original
   *  (vigente, con saldo); escribe el AJ (imputado al original), suma al
   *  original la imputación espejo (origen 'cierre') que le baja el
   *  sinImputar, y un log AJUSTAR. Se revierte anulando el AJ. */
  async cerrarSaldo(idMovimiento: string, d: DatosCierreSaldo): Promise<Resultado<ResultadoMovimientoFin>> {
    const datos = normalizarCierreSaldo(d);
    const hoy = toISODateString(new Date());

    // Afuera del callback: puede reintentarse y tiene que ser puro.
    const idAjuste = this.db.generarId(this.COLECCION);
    const fechaRegistro = new Date().toISOString();
    const usuario = this.usuarioSesion.getUsuarioActual()?.email ?? 'Desconocido';

    try {
      const r = await this.db.commitEnTransaccion<{ numero: string; origen: string }>(async (tx) => {
        const n = await this.numerador.leerProximoNumeroMovimientoFin(tx, 'ajuste');
        const mov = await this.db.leerEnTransaccion<MovimientoFin>(tx, this.COLECCION, idMovimiento);
        // — fin de lecturas —
        if (!mov) throw new Error(`No existe el movimiento ${idMovimiento}.`);
        const error = validarCierreSaldo(mov, datos, hoy);
        if (error) throw new Error(error);

        const ajuste = armarCierreSaldo({
          mov, idMovimientoOrigen: idMovimiento, datos, numero: n.numero, fechaRegistro, usuario,
        });
        const espejo = imputacionSobreMovimiento(
          { id: idAjuste, numero: n.numero, total: ajuste.total }, mov.sinImputar, ajuste.total, datos.fecha, 'cierre',
        );
        const escrituras: EscrituraBatch[] = [
          n.escritura,
          { coleccion: this.COLECCION, id: idAjuste, modo: 'crear', data: ajuste },
          { coleccion: this.COLECCION, id: idMovimiento, modo: 'actualizar', data: acumularImputaciones(mov, [espejo]) },
        ];

        await this.logRegistro.agregarAlBatch(
          escrituras, 'AJUSTAR', this.COLECCION, idAjuste,
          `Cierre de saldo (${ETIQUETA_MOTIVO_AJUSTE[datos.motivo].toLowerCase()}) ${n.numero} — ` +
          `${mov.entidad.tipo} ${mov.entidad.razonSocial} — $ ${ajuste.total.toFixed(2)} del saldo sin imputar de ${mov.numero}` +
          (datos.observaciones ? ` — ${datos.observaciones}` : ''),
          null,
        );

        return { escrituras, resultado: { numero: n.numero, origen: mov.numero } };
      });

      return {
        exito: true,
        mensaje: `Ajuste ${r.numero} registrado: se cerraron $ ${datos.importe.toFixed(2)} del saldo de ${r.origen}.`,
        objeto: { idMovimiento: idAjuste, numero: r.numero },
      };
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'AJUSTAR', this.COLECCION, idAjuste, `Error al cerrar el saldo de ${idMovimiento}: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `No se pudo cerrar el saldo: ${e?.message ?? e}` };
    }
  }

  /** Devolución (F7b) contra el saldo sin imputar de un cobro o pago: al
   *  cliente que pagó de más se le PAGA (OPG); el chofer / proveedor que
   *  devuelve un adelanto genera un COBRO (RC). Transacción: numerador del
   *  tipo inverso + movimiento original (vigente, con saldo); escribe la
   *  devolución (un medio, imputada al original), la imputación espejo en el
   *  original (origen 'devolucion') y un log PAGAR / COBRAR. Se revierte
   *  anulando la devolución. */
  async registrarDevolucion(idMovimiento: string, d: DatosDevolucion): Promise<Resultado<ResultadoMovimientoFin>> {
    const datos = normalizarDevolucion(d);
    const hoy = toISODateString(new Date());

    // Afuera del callback: puede reintentarse y tiene que ser puro.
    const idDevolucion = this.db.generarId(this.COLECCION);
    const fechaRegistro = new Date().toISOString();
    const usuario = this.usuarioSesion.getUsuarioActual()?.email ?? 'Desconocido';

    try {
      const r = await this.db.commitEnTransaccion<{ numero: string; origen: string; accion: 'COBRAR' | 'PAGAR' }>(async (tx) => {
        const mov = await this.db.leerEnTransaccion<MovimientoFin>(tx, this.COLECCION, idMovimiento);
        if (!mov) throw new Error(`No existe el movimiento ${idMovimiento}.`);
        const tipo = tipoDevolucionDe(mov.tipo);
        const n = await this.numerador.leerProximoNumeroMovimientoFin(tx, tipo);
        // — fin de lecturas —
        const error = validarDevolucion(mov, datos, hoy);
        if (error) throw new Error(error);

        const devolucion = armarDevolucion({
          mov, idMovimientoOrigen: idMovimiento, datos, numero: n.numero, fechaRegistro, usuario,
        });
        const espejo = imputacionSobreMovimiento(
          { id: idDevolucion, numero: n.numero, total: devolucion.total }, mov.sinImputar, devolucion.total, datos.fecha, 'devolucion',
        );
        const escrituras: EscrituraBatch[] = [
          n.escritura,
          { coleccion: this.COLECCION, id: idDevolucion, modo: 'crear', data: devolucion },
          { coleccion: this.COLECCION, id: idMovimiento, modo: 'actualizar', data: acumularImputaciones(mov, [espejo]) },
        ];

        const accion = tipo === 'cobro' ? 'COBRAR' : 'PAGAR';
        await this.logRegistro.agregarAlBatch(
          escrituras, accion, this.COLECCION, idDevolucion,
          `Devolución ${n.numero} — ${mov.entidad.tipo} ${mov.entidad.razonSocial} — $ ${devolucion.total.toFixed(2)} ` +
          `contra el saldo sin imputar de ${mov.numero}` + (datos.observaciones ? ` — ${datos.observaciones}` : ''),
          null,
        );

        return { escrituras, resultado: { numero: n.numero, origen: mov.numero, accion } };
      });

      return {
        exito: true,
        mensaje: `Devolución ${r.numero} registrada por $ ${datos.medio.importe.toFixed(2)} contra el saldo de ${r.origen}.`,
        objeto: { idMovimiento: idDevolucion, numero: r.numero },
      };
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'PAGAR', this.COLECCION, idDevolucion, `Error al registrar la devolución contra ${idMovimiento}: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `No se pudo registrar la devolución: ${e?.message ?? e}` };
    }
  }

  /** Anula un movimiento ENTERO (F10: no se edita; motivo obligatorio).
   *  Transacción: relee el movimiento (vigente, sin compensaciones) y cada
   *  InformeLiq imputado; a cada informe le devuelve lo que este movimiento
   *  le imputó (lo resta del acumulado — totalCobrado; totalAjustado en un
   *  ajuste — y recalcula saldo y estadoFinanciero); marca el movimiento
   *  'anulado' con quién, cuándo y por qué (conserva número, medios e
   *  imputaciones como registro) y agrega un log ANULAR con diff.
   *  El saldo sin imputar de un movimiento anulado deja de contar: las
   *  consultas filtran por estado 'vigente'. */
  async anular(idMovimiento: string, motivo: string): Promise<Resultado<void>> {
    const motivoLimpio = (motivo ?? '').trim();
    if (!motivoLimpio) return { exito: false, mensaje: 'Falta el motivo de la anulación.' };

    // Afuera del callback: puede reintentarse y tiene que ser puro.
    const usuario = this.usuarioSesion.getUsuarioActual()?.email ?? 'Desconocido';
    const fecha = new Date().toISOString();

    try {
      const r = await this.db.commitEnTransaccion<{ numero: string; comprobantes: number }>(async (tx) => {
        const mov = await this.db.leerEnTransaccion<MovimientoFin>(tx, this.COLECCION, idMovimiento);
        if (!mov) throw new Error(`No existe el movimiento ${idMovimiento}.`);
        const error = validarAnulable(mov);
        if (error) throw new Error(error);

        const reversiones = reversionesDe(mov.imputaciones ?? []);
        const leidos = await Promise.all(reversiones.filter(rev => rev.tipo === 'informeLiq').map(async rev => ({
          rev,
          liq: await this.db.leerEnTransaccion<InformeLiqNuevo>(tx, this.COL_LIQ, rev.idDocumento),
        })));
        // F7b: un cierre de saldo o una devolución apuntan a OTRO movimiento.
        const originales = await Promise.all(reversiones.filter(rev => rev.tipo === 'movimientoFin').map(async rev => ({
          rev,
          orig: await this.db.leerEnTransaccion<MovimientoFin>(tx, this.COLECCION, rev.idDocumento),
        })));
        // — fin de lecturas —

        const escrituras: EscrituraBatch[] = [];
        const acumulado = acumuladoDeMovimiento(mov.tipo);
        for (const { rev, liq } of leidos) {
          if (!liq) throw new Error(`No existe el informe de liquidación ${rev.numeroDocumento}. Anulación abortada.`);
          if (liq.estado !== 'facturado') {
            throw new Error(
              `El informe ${rev.numeroDocumento} está en estado '${liq.estado}' (se esperaba 'facturado'). Anulación abortada.`,
            );
          }
          const vfAntes = normalizarValoresFinancieros(liq.valoresFinancieros, liq.valores.total);
          const vf = aplicarImporte(vfAntes, acumulado, -rev.importe);   // tira Error si el acumulado quedaría negativo
          this.informeLiqServ.agregarEscrituraInformeLiqParcial(escrituras, rev.idDocumento, {
            valoresFinancieros: vf,
            estadoFinanciero: estadoFinancieroDe(vf, liq.estadoFinanciero),
          });
        }

        // F7b: el movimiento original recupera su saldo sin imputar.
        for (const { rev, orig } of originales) {
          if (!orig) throw new Error(`No existe el movimiento ${rev.numeroDocumento}. Anulación abortada.`);
          escrituras.push({
            coleccion: this.COLECCION, id: rev.idDocumento, modo: 'actualizar', data: quitarImputacionesDe(orig, idMovimiento),
          });
        }

        const anulacion: Anulacion = { motivo: motivoLimpio, usuario, fecha };
        escrituras.push({
          coleccion: this.COLECCION, id: idMovimiento, modo: 'actualizar',
          data: { estado: 'anulado', anulacion },
        });

        await this.logRegistro.agregarAlBatch(
          escrituras, 'ANULAR', this.COLECCION, idMovimiento,
          `Anulación del ${ETIQUETA_TIPO_MOVIMIENTO[mov.tipo].toLowerCase()} ${mov.numero} — ` +
          `${mov.entidad.tipo} ${mov.entidad.razonSocial} — $ ${mov.total.toFixed(2)} — motivo: ${motivoLimpio} — ` +
          `${reversiones.length} comprobante(s) recuperan saldo`,
          mov,
        );

        return { escrituras, resultado: { numero: mov.numero, comprobantes: reversiones.length } };
      });

      return {
        exito: true,
        mensaje: `Movimiento ${r.numero} anulado.` +
          (r.comprobantes > 0 ? ` ${r.comprobantes} comprobante(s) recuperaron su saldo.` : ''),
      };
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'ANULAR', this.COLECCION, idMovimiento, `Error al anular el movimiento: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `No se pudo anular: ${e?.message ?? e}` };
    }
  }

  /** Aplica el saldo sin imputar de un cobro o pago (saldo a favor del
   *  cliente, anticipo o préstamo) a comprobantes facturados de la MISMA
   *  entidad. Transacción: relee el movimiento (vigente, con saldo) y cada
   *  InformeLiq (facturado, de la entidad, con saldo); a cada informe le
   *  suma el importe a totalCobrado y recalcula saldo y estadoFinanciero;
   *  agrega al movimiento las imputaciones (origen 'saldo', fecha = hoy) y
   *  recalcula totalImputado / sinImputar; log IMPUTAR. Si después se anula
   *  el movimiento, anular() revierte también estas imputaciones. */
  async imputarSaldo(idMovimiento: string, solicitudes: ImputacionSolicitada[]): Promise<Resultado<void>> {
    const pedidas = normalizarSolicitudes(solicitudes);
    if (pedidas.length === 0) return { exito: false, mensaje: 'Elegí al menos un comprobante.' };

    // Afuera del callback: puede reintentarse y tiene que ser puro.
    const fecha = toISODateString(new Date());

    try {
      const r = await this.db.commitEnTransaccion<{ numero: string; importe: number; comprobantes: number; sinImputar: number }>(
        async (tx) => {
          const mov = await this.db.leerEnTransaccion<MovimientoFin>(tx, this.COLECCION, idMovimiento);
          if (!mov) throw new Error(`No existe el movimiento ${idMovimiento}.`);
          const error = validarImputacionSaldo(mov, pedidas);
          if (error) throw new Error(error);

          const leidos = await Promise.all(pedidas.map(async imp => ({
            imp,
            liq: await this.db.leerEnTransaccion<InformeLiqNuevo>(tx, this.COL_LIQ, imp.idInfLiq),
          })));
          // — fin de lecturas —

          const escrituras: EscrituraBatch[] = [];
          const nuevas: ImputacionFin[] = [];
          for (const { imp, liq } of leidos) {
            if (!liq) throw new Error(`No existe el informe de liquidación ${imp.idInfLiq}.`);
            validarDocumentoImputable(liq, imp.idInfLiq, mov.entidad);
            const vfAntes = normalizarValoresFinancieros(liq.valoresFinancieros, liq.valores.total);
            const vf = aplicarImporte(vfAntes, 'totalCobrado', imp.importe);   // tira Error si supera el saldo
            nuevas.push(armarImputacion(liq, imp.idInfLiq, vfAntes, imp.importe, fecha, 'saldo'));
            this.informeLiqServ.agregarEscrituraInformeLiqParcial(escrituras, imp.idInfLiq, {
              valoresFinancieros: vf,
              estadoFinanciero: estadoFinancieroDe(vf, liq.estadoFinanciero),
            });
          }

          const campos = acumularImputaciones(mov, nuevas);
          escrituras.push({ coleccion: this.COLECCION, id: idMovimiento, modo: 'actualizar', data: campos });

          const importe = redondear2(nuevas.reduce((acc, i) => acc + i.importe, 0));
          await this.logRegistro.agregarAlBatch(
            escrituras, 'IMPUTAR', this.COLECCION, idMovimiento,
            `Imputación de saldo del ${ETIQUETA_TIPO_MOVIMIENTO[mov.tipo].toLowerCase()} ${mov.numero} — ` +
            `${mov.entidad.tipo} ${mov.entidad.razonSocial} — $ ${importe.toFixed(2)} a ${nuevas.length} comprobante(s) — ` +
            `queda sin imputar $ ${campos.sinImputar.toFixed(2)}`,
          );

          return {
            escrituras,
            resultado: { numero: mov.numero, importe, comprobantes: nuevas.length, sinImputar: campos.sinImputar },
          };
        },
      );

      return {
        exito: true,
        mensaje: `Se imputaron $ ${r.importe.toFixed(2)} de ${r.numero} a ${r.comprobantes} comprobante(s).` +
          (r.sinImputar > 0 ? ` Quedan $ ${r.sinImputar.toFixed(2)} sin imputar.` : ''),
      };
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'IMPUTAR', this.COLECCION, idMovimiento, `Error al imputar saldo: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `No se pudo imputar: ${e?.message ?? e}` };
    }
  }
}
