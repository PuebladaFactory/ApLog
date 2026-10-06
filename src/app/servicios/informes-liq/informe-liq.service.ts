import { Injectable, inject } from '@angular/core';
import { Transaction } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { ConId } from 'src/app/interfaces/conId';
import { Resultado } from 'src/app/interfaces/resultado';
import { InformeOpNuevo } from 'src/app/interfaces/informe-op-nuevo';
import { EstadoOp, Operacion } from 'src/app/interfaces/operacion';
import {
  CompensacionLiq, DescuentoLiq, FacturaVinculada, InformeLiqNuevo, InformeLiqSnapshot, PeriodoLiq, ReversionLiq,
} from 'src/app/interfaces/informe-liq-nuevo';
import { MovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { StorageArchivosService } from 'src/app/servicios/storage-archivos/storage-archivos.service';
import {
  DatosQrAfip, claveComprobante, claveComprobanteQr, decodificarQrAfip, descripcionTipoComprobante,
  facturaDesdeQr, numeroComprobante, validarFacturaContraInforme,
} from 'src/app/shared/utils/factura-electronica.util';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';
import { NumeradorService } from 'src/app/servicios/numerador/numerador.service';
import { InformeOpService } from 'src/app/servicios/informes-op/informe-op.service';
import { OperacionFactoryService } from 'src/app/servicios/operaciones/operacion-factory.service';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';
import {
  COLECCION_MOVIMIENTOS_FIN, CompensacionSolicitada, DocumentoCompensado, armarCompensaciones, compensacionesDe,
  errorNeto, escrituraMovimientoParcial, fijarCompensacion, normalizarCompensaciones, quitarCompensacion,
  solicitudesDe, totalCompensacionesDe,
} from 'src/app/shared/utils/compensacion.util';
import { estadoFinancieroDe, redondear2 } from 'src/app/shared/utils/finanzas.util';
import { ResultadoEdicionInformeOp } from 'src/app/shared/modales/informe-op-editor/informe-op-editor.component';
import { InformeLiqFactoryService } from './informe-liq-factory.service';

/** Lo que manda la UI para crear un InformeLiqNuevo (borrador o emitido).
 *  Solo ids de InformeOp: los datos se releen frescos dentro de la
 *  transacción — la copia en memoria de la pantalla no es fuente de verdad. */
export interface DatosLiquidacion {
  tipo: 'cliente' | 'chofer' | 'proveedor';
  idsInformesOp: string[];
  periodo: PeriodoLiq;
  descuentos: DescuentoLiq[];
  columnas: string[];
  observaciones: string;
  // FC1: movimientos a compensar (se revalidan y snapshotean en la
  // transacción). Opcional: sin compensaciones = [] (generadores, etc.).
  compensaciones?: CompensacionSolicitada[];
}

export interface ResultadoLiquidacion {
  idInfLiq: string;
  numeroInterno: string | null;     // null si se creó un borrador
}

/** Campos editables de un InformeLiqNuevo (borrador o emitido). Período y
 *  composición NO son editables. Solo se aplican los que vienen definidos. */
export interface CambiosDatosLiq {
  descuentos?: DescuentoLiq[];
  // FC1: la lista COMPLETA de compensaciones que debe quedar (no un delta).
  compensaciones?: CompensacionSolicitada[];
  observaciones?: string;
  columnas?: string[];
}

/** Lado de la operación que representa un InformeLiq — el proveedor usa el
 *  flag 'chofer' de EstadoOp (mismo criterio que el camino viejo). */
type Lado = 'cliente' | 'chofer';

/** Dueño de InformeLiqNuevo (colección `informesLiq`). Orquesta el ciclo de
 *  vida del informe de liquidación y las transiciones que arrastra sobre los
 *  InformeOp que lo componen, sus contrapartes y las Operaciones.
 *  Camino paralelo a LiquidacionService (modelo viejo, sin tocar).
 *
 *  TODO Finanzas: ningún orquestador actualiza resumenFinanzas / cuenta
 *  corriente — la cascada de Finanzas es un frente propio. */
@Injectable({ providedIn: 'root' })
export class InformeLiqService {

  private db = inject(DbFirestoreService);
  private factory = inject(InformeLiqFactoryService);
  private informeOpServ = inject(InformeOpService);
  private operacionFactory = inject(OperacionFactoryService);
  private numerador = inject(NumeradorService);
  private logRegistro = inject(LogRegistroService);
  private usuarioSesion = inject(UsuarioSesionService);
  private storageArchivos = inject(StorageArchivosService);

  private readonly COLECCION = 'informesLiq';
  private readonly COL_INFORMES_OP = 'informesOp';
  private readonly COL_OPERACIONES = 'operaciones';
  private readonly COL_SNAPSHOTS = 'informesLiqSnapshots';
  private readonly COL_FACTURAS = 'facturasVinculadas';

  /** Tope de InformeOp por liquidación: hasta 3 escrituras por InformeOp
   *  (InformeOp + Operación + contraparte) + InformeLiq + numerador + log
   *  deben entrar en el límite de 500 escrituras de una transacción. */
  static readonly MAX_INFORMES_OP = 150;

  // =====================================================================
  // LECTURAS
  // =====================================================================

  async obtenerPorId(idInfLiq: string): Promise<ConId<InformeLiqNuevo> | null> {
    const data = await this.db.getById<InformeLiqNuevo>(this.COLECCION, idInfLiq);
    return data ? { ...data, id: idInfLiq, idInfLiq } : null;
  }

  /** InformeOp vigentes del informe (link inverso idInfLiq). */
  obtenerInformesOp(idInfLiq: string): Promise<ConId<InformeOpNuevo>[]> {
    return this.informeOpServ.obtenerPorInformeLiq(idInfLiq);
  }

  /** InformeOp de un informe REVERTIDO, desde su copia congelada
   *  (informesLiqSnapshots/{idInfLiq}). null si no hay copia. Agrega `id`
   *  (= idInfOp) para que la UI los trate igual que los vivos. */
  async obtenerSnapshotInformesOp(idInfLiq: string): Promise<ConId<InformeOpNuevo>[] | null> {
    const snap = await this.db.getById<InformeLiqSnapshot>(this.COL_SNAPSHOTS, idInfLiq);
    if (!snap) return null;
    return snap.informesOp
      .map(inf => ({ ...inf, id: inf.idInfOp }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  /** URL de descarga del PDF de la factura a partir del path guardado en
   *  facturaUrl (se resuelve al abrir: respeta la sesión y las reglas). */
  obtenerUrlFactura(path: string): Promise<string> {
    return this.storageArchivos.urlDescarga(path);
  }

  /** Borradores en vivo (todas las entidades y tipos), más recientes
   *  primero. Una sola igualdad (estado) → sin índice compuesto. */
  observarBorradores(): Observable<ConId<InformeLiqNuevo>[]> {
    return this.db.observarPorCampo<InformeLiqNuevo>(this.COLECCION, 'estado', 'borrador').pipe(
      map(items => items
        .map(i => ({ ...i, idInfLiq: i.id }))
        .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion))),
    );
  }

  // =====================================================================
  // HELPERS DE ESCRITURA (síncronos, divididos por mecanismo)
  // =====================================================================

  /** Documento completo — alta (modo 'crear') o reemplazo. Strippea
   *  idInfLiq/id (factory.toFirestore). No commitea. */
  agregarEscrituraInformeLiqCompleto(
    escrituras: EscrituraBatch[],
    informe: InformeLiqNuevo,
    modo: 'crear' | 'reemplazar' = 'reemplazar',
  ): void {
    escrituras.push({ coleccion: this.COLECCION, id: informe.idInfLiq, data: this.factory.toFirestore(informe), modo });
  }

  /** Campos sueltos — notación de punto para anidados. No commitea. */
  agregarEscrituraInformeLiqParcial(escrituras: EscrituraBatch[], idInfLiq: string, campos: Record<string, any>): void {
    escrituras.push({ coleccion: this.COLECCION, id: idInfLiq, data: campos, modo: 'actualizar' });
  }

  /** Borrado físico — solo para borradores (eliminarBorrador). No commitea. */
  agregarEliminacionInformeLiq(escrituras: EscrituraBatch[], idInfLiq: string): void {
    escrituras.push({ coleccion: this.COLECCION, id: idInfLiq, data: null, modo: 'eliminar' });
  }

  /** Copia congelada de los InformeOp al revertir (doc id = idInfLiq).
   *  No commitea. */
  agregarEscrituraSnapshot(escrituras: EscrituraBatch[], idInfLiq: string, snapshot: InformeLiqSnapshot): void {
    escrituras.push({ coleccion: this.COL_SNAPSHOTS, id: idInfLiq, data: snapshot, modo: 'crear' });
  }

  // =====================================================================
  // ORQUESTADORES
  // =====================================================================

  /** Crea un InformeLiqNuevo en 'borrador' (ex proforma). InformeOp
   *  activo → proforma; contraparte bloqueada si el lado no es cliente;
   *  Operación estado.proforma.<lado> = true. Sin número interno. */
  crearBorrador(d: DatosLiquidacion): Promise<Resultado<ResultadoLiquidacion>> {
    return this.crearNuevo(d, 'borrador');
  }

  /** Crea un InformeLiqNuevo directamente 'emitido'. InformeOp activo →
   *  liquidado; Operación estado.liquidacion.<lado> = true (ciclo
   *  'liquidada' si el otro lado ya estaba liquidado). Reserva número
   *  interno dentro de la misma transacción. */
  emitir(d: DatosLiquidacion): Promise<Resultado<ResultadoLiquidacion>> {
    return this.crearNuevo(d, 'emitido');
  }

  /** Borrador → emitido sobre el MISMO documento. InformeOp proforma →
   *  liquidado (idInfLiq no cambia); contraparte desbloqueada; Operación
   *  proforma.<lado> = false, liquidacion.<lado> = true (+ ciclo). Reserva
   *  número interno. valoresFinancieros se recalcula desde valores.total
   *  (puede haber cambiado por edición del borrador).
   *  FC1: las compensaciones del borrador se revalidan contra los
   *  movimientos frescos (otro informe pudo haber usado el saldo: gana el
   *  primero que se emite) y se APLICAN: totalCompensado en el informe y una
   *  imputación 'compensacion' en cada movimiento, en la misma transacción. */
  async emitirBorrador(idInfLiq: string): Promise<Resultado<ResultadoLiquidacion>> {
    const fecha = toISODateString(new Date());
    try {
      const numeroInterno = await this.db.commitEnTransaccion<string>(async (tx) => {
        const escrituras: EscrituraBatch[] = [];

        const liq = await this.leerBorrador(tx, idInfLiq);
        const informes = await this.leerInformesOp(tx, liq.informesOp);
        this.validarInformesDelBorrador(informes, idInfLiq);
        const operaciones = await this.leerOperaciones(tx, informes);
        const movimientos = await this.leerMovimientosFin(tx, compensacionesDe(liq).map(c => c.idMovimiento));
        const { numeroInterno, escritura } = await this.numerador.leerProximoNumeroInterno(tx, liq.tipo);
        // — fin de lecturas —

        const compensaciones = armarCompensaciones(
          solicitudesDe(compensacionesDe(liq)), movimientos, { tipo: liq.tipo, id: liq.entidad.id }, idInfLiq,
        );
        const valores = this.factory.aplicarCompensaciones(liq.valores, compensaciones);
        const errNeto = errorNeto(valores.total, valores.totalCompensaciones ?? 0);
        if (errNeto) throw new Error(errNeto);
        const vf = this.factory.valoresFinancierosConCompensado(
          liq.valoresFinancieros, valores.total, valores.totalCompensaciones ?? 0,
        );

        escrituras.push(escritura);
        this.agregarEscrituraInformeLiqParcial(escrituras, idInfLiq, {
          estado: 'emitido',
          numeroInterno,
          fechaEmision: fecha,
          compensaciones,
          'valores.totalCompensaciones': valores.totalCompensaciones,
          'valores.neto': valores.neto,
          valoresFinancieros: vf,
          estadoFinanciero: estadoFinancieroDe(vf),
        });
        this.agregarEscriturasCompensacion(
          escrituras,
          { idInfLiq, numeroInterno, periodoClave: liq.periodoClave, totalDocumento: valores.total },
          compensaciones, movimientos, fecha,
        );

        const lado = this.lado(liq.tipo);
        for (const inf of informes) {
          this.informeOpServ.agregarEscrituraInformeOpParcial(escrituras, inf.idInfOp, { estado: 'liquidado' });
          if (liq.tipo !== 'cliente' && inf.contraParte?.idInfOp) {
            this.informeOpServ.agregarEscrituraInformeOpParcial(escrituras, inf.contraParte.idInfOp, {
              bloqueadoPorContraparte: false,
            });
          }
          const op = operaciones.get(inf.idOperacion)!;
          this.operacionFactory.agregarEscrituraOperacionParcial(escrituras, inf.idOperacion, this.camposLiquidacion(op.estado, lado));
        }

        await this.logRegistro.agregarAlBatch(
          escrituras, 'EMITIR', this.COLECCION, idInfLiq,
          `Emisión de borrador — ${numeroInterno} — ${liq.tipo} ${nombreEntidadRef(liq.entidad)} — ${informes.length} InformeOp — ${this.factory.textoPeriodo(liq.periodo)}` +
          this.textoCompensaciones(compensaciones),
          liq,
        );

        return { escrituras, resultado: numeroInterno };
      });

      return {
        exito: true,
        mensaje: `Liquidación ${numeroInterno} emitida correctamente.`,
        objeto: { idInfLiq, numeroInterno },
      };
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'EMITIR', this.COLECCION, idInfLiq, `Error al emitir borrador ${idInfLiq}: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `Error al emitir el borrador: ${e?.message ?? e}` };
    }
  }

  /** Elimina un borrador (delete físico — nunca tuvo número ni efecto
   *  financiero; la traza queda en registroLog). InformeOp proforma → activo
   *  con idInfLiq = null; contraparte desbloqueada; Operación
   *  proforma.<lado> = false. */
  async eliminarBorrador(idInfLiq: string): Promise<Resultado<void>> {
    try {
      await this.db.commitEnTransaccion<void>(async (tx) => {
        const escrituras: EscrituraBatch[] = [];

        const liq = await this.leerBorrador(tx, idInfLiq);
        const informes = await this.leerInformesOp(tx, liq.informesOp);
        this.validarInformesDelBorrador(informes, idInfLiq);
        const operaciones = await this.leerOperaciones(tx, informes);
        // — fin de lecturas —

        const lado = this.lado(liq.tipo);
        for (const inf of informes) {
          this.informeOpServ.agregarEscrituraInformeOpParcial(escrituras, inf.idInfOp, {
            estado: 'activo',
            idInfLiq: null,
          });
          if (liq.tipo !== 'cliente' && inf.contraParte?.idInfOp) {
            this.informeOpServ.agregarEscrituraInformeOpParcial(escrituras, inf.contraParte.idInfOp, {
              bloqueadoPorContraparte: false,
            });
          }
          if (!operaciones.has(inf.idOperacion)) {
            throw new Error(`Operación ${inf.idOperacion} no encontrada.`);
          }
          this.operacionFactory.agregarEscrituraOperacionParcial(escrituras, inf.idOperacion, {
            [`estado.proforma.${lado}`]: false,
          });
        }

        this.agregarEliminacionInformeLiq(escrituras, idInfLiq);
        await this.logRegistro.agregarAlBatch(
          escrituras, 'BAJA', this.COLECCION, idInfLiq,
          `Eliminación de borrador — ${liq.tipo} ${nombreEntidadRef(liq.entidad)} — ${informes.length} InformeOp — ${this.factory.textoPeriodo(liq.periodo)}`,
        );

        return { escrituras, resultado: undefined };
      });

      return { exito: true, mensaje: 'Borrador eliminado correctamente.' };
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'BAJA', this.COLECCION, idInfLiq, `Error al eliminar borrador ${idInfLiq}: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `Error al eliminar el borrador: ${e?.message ?? e}` };
    }
  }

  /** Edita descuentos / compensaciones / observaciones / columnas de un
   *  InformeLiq en 'borrador' o 'emitido'. Una transacción (FC1): relee el
   *  informe y, si vienen compensaciones, los movimientos de antes y de ahora.
   *   - descuentos → valores (descuentoTotal, total, neto) y
   *     valoresFinancieros (sin pisar lo imputado).
   *   - compensaciones (lista completa) → se revalidan contra los movimientos
   *     frescos (armarCompensaciones). En un borrador solo se guardan
   *     (propuesta, F34); en un EMITIDO ya están aplicadas (F29): cada
   *     movimiento afectado queda con la compensación nueva (o sin ella) y
   *     totalCompensado se recalcula.
   *   - F30: el neto no puede quedar negativo (también si solo cambian los
   *     descuentos).
   *  Log EDITAR con diff. */
  async editarDatos(idInfLiq: string, cambios: CambiosDatosLiq): Promise<Resultado<void>> {
    let solicitudes: CompensacionSolicitada[] | undefined;
    try {
      solicitudes = cambios.compensaciones === undefined ? undefined : normalizarCompensaciones(cambios.compensaciones);
    } catch (e: any) {
      return { exito: false, mensaje: e?.message ?? String(e) };
    }
    // Afuera del callback (puede reintentarse y tiene que ser puro).
    const hoy = toISODateString(new Date());

    try {
      const huboCambios = await this.db.commitEnTransaccion<boolean>(async (tx) => {
        const escrituras: EscrituraBatch[] = [];

        const data = await this.db.leerEnTransaccion<InformeLiqNuevo>(tx, this.COLECCION, idInfLiq);
        if (!data) throw new Error(`No existe el informe de liquidación ${idInfLiq}.`);
        if (data.estado !== 'borrador' && data.estado !== 'emitido') {
          throw new Error(`El informe está en estado '${data.estado}' y no se puede editar.`);
        }
        const liq: ConId<InformeLiqNuevo> = { ...data, id: idInfLiq, idInfLiq };
        const anteriores = compensacionesDe(liq);
        const movimientos = solicitudes === undefined
          ? new Map<string, MovimientoFin | null>()
          : await this.leerMovimientosFin(tx, [
            ...anteriores.map(c => c.idMovimiento),
            ...solicitudes.map(s => s.idMovimiento),
          ]);
        // — fin de lecturas —

        const campos: Record<string, any> = {};
        const emitido = liq.estado === 'emitido';
        let compensaciones = anteriores;

        if (cambios.descuentos !== undefined || solicitudes !== undefined) {
          const descuentos = cambios.descuentos ?? liq.descuentos;
          if (solicitudes !== undefined) {
            compensaciones = armarCompensaciones(solicitudes, movimientos, { tipo: liq.tipo, id: liq.entidad.id }, idInfLiq);
          }
          const valores = this.factory.aplicarCompensaciones(this.factory.recalcularTotal(liq.valores, descuentos), compensaciones);
          const errNeto = errorNeto(valores.total, valores.totalCompensaciones ?? 0);
          if (errNeto) throw new Error(errNeto);
          const vf = emitido
            ? this.factory.valoresFinancierosConCompensado(liq.valoresFinancieros, valores.total, valores.totalCompensaciones ?? 0)
            : this.factory.recalcularValoresFinancieros(liq.valoresFinancieros, valores.total);

          if (cambios.descuentos !== undefined) {
            campos['descuentos'] = descuentos.map(d => ({ concepto: d.concepto, valor: d.valor }));
            campos['valores.descuentoTotal'] = valores.descuentoTotal;
            campos['valores.total'] = valores.total;
          }
          if (solicitudes !== undefined) campos['compensaciones'] = compensaciones;
          campos['valores.totalCompensaciones'] = valores.totalCompensaciones;
          campos['valores.neto'] = valores.neto;
          campos['valoresFinancieros'] = vf;
          if (emitido) campos['estadoFinanciero'] = estadoFinancieroDe(vf, liq.estadoFinanciero);

          // Emitido: las compensaciones ya están aplicadas → cada movimiento
          // afectado (antes o ahora) queda con la nueva o sin ninguna.
          if (emitido && solicitudes !== undefined) {
            const doc: DocumentoCompensado = {
              idInfLiq, numeroInterno: liq.numeroInterno, periodoClave: liq.periodoClave, totalDocumento: valores.total,
            };
            this.agregarEscriturasCompensacion(escrituras, doc, compensaciones, movimientos, liq.fechaEmision ?? hoy);
            const vigentes = new Set(compensaciones.map(c => c.idMovimiento));
            for (const a of anteriores) {
              if (vigentes.has(a.idMovimiento)) continue;
              const mov = movimientos.get(a.idMovimiento);
              if (!mov) throw new Error(`Inconsistencia: no existe el movimiento ${a.numero} compensado en esta liquidación.`);
              escrituras.push(escrituraMovimientoParcial(a.idMovimiento, quitarCompensacion(mov, idInfLiq)));
            }
          }
        }
        if (cambios.observaciones !== undefined) campos['observaciones'] = cambios.observaciones;
        if (cambios.columnas !== undefined) campos['columnas'] = [...cambios.columnas];

        if (Object.keys(campos).length === 0) return { escrituras: [], resultado: false };

        this.agregarEscrituraInformeLiqParcial(escrituras, idInfLiq, campos);
        const { id, idInfLiq: _omit, ...anterior } = liq as any;
        await this.logRegistro.agregarAlBatch(
          escrituras, 'EDITAR', this.COLECCION, idInfLiq,
          `Edición de datos del informe de liquidación — ${liq.tipo} ${nombreEntidadRef(liq.entidad)}` +
          (solicitudes !== undefined ? this.textoCompensaciones(compensaciones) : ''),
          anterior,
        );
        return { escrituras, resultado: true };
      });
      return { exito: true, mensaje: huboCambios ? 'Informe actualizado correctamente.' : 'Sin cambios.' };
    } catch (e: any) {
      await this.logRegistro.registrarError('EDITAR', this.COLECCION, idInfLiq, `Error al editar datos: ${e?.message ?? e}`);
      return { exito: false, mensaje: `Error al guardar: ${e?.message ?? e}` };
    }
  }

  /** Edita un InformeOp que está DENTRO de un InformeLiq ('proforma' o
   *  'liquidado'). Reutiliza InformeOpService.armarEscriturasEdicion (misma
   *  lógica que editar: Operación, InformeOp, contraparte, logs, resúmenes)
   *  y suma, en el MISMO commitBatch:
   *   1. InformeLiq propio: delta de los 4 totales base (valores viejos del
   *      InformeOp releídos vs. valores editados) + delta de totalContraParte
   *      (si cambió el contraParte.monto propio, caso contraparte 'activo'),
   *      total recalculado con sus descuentos, valoresFinancieros.
   *   2. InformeLiq de la contraparte: si la contraparte está en
   *      'proforma'/'liquidado' (sync 'soloMonto'), cambia su
   *      contraParte.monto → delta de SU valores.totalContraParte.
   *  Lecturas previas no transaccionales (mismo criterio que editar: la
   *  ventana de carrera es la del editor abierto).
   *  TODO Finanzas: sobre un 'emitido', el cambio de total impacta en
   *  resumenFinanzas cuando se conecte la cascada. */
  async editarInformeOp(
    resultado: ResultadoEdicionInformeOp,
    msj: string = 'Edición de InformeOp en liquidación',
  ): Promise<Resultado<void>> {
    const editado = resultado.informeEditado;
    const idInfOp = editado.idInfOp;

    try {
      // — Lecturas (estado previo a la edición) —
      const previo = await this.informeOpServ.obtenerPorId(idInfOp);
      if (!previo) return { exito: false, mensaje: `No existe el informe ${idInfOp}.` };
      if ((previo.estado !== 'proforma' && previo.estado !== 'liquidado') || !previo.idInfLiq) {
        return {
          exito: false,
          mensaje: `El informe ${idInfOp} no está dentro de una liquidación (estado '${previo.estado}'). Editalo desde el listado de informes.`,
        };
      }
      const liq = await this.obtenerPorId(previo.idInfLiq);
      if (!liq) return { exito: false, mensaje: `No existe el informe de liquidación ${previo.idInfLiq}.` };
      if (liq.estado !== 'borrador' && liq.estado !== 'emitido') {
        return { exito: false, mensaje: `El informe de liquidación está en estado '${liq.estado}' y no se puede editar.` };
      }

      let liqContra: ConId<InformeLiqNuevo> | null = null;
      let deltaContraDeLaContraparte = 0;
      if (resultado.contraparte?.sync === 'soloMonto') {
        const contraPrevia = await this.informeOpServ.obtenerPorId(resultado.contraparte.idInfOp);
        if (contraPrevia?.idInfLiq) {
          liqContra = await this.obtenerPorId(contraPrevia.idInfLiq);
          const nuevoMonto = (resultado.contraparte.informe as { contraParte: { monto: number } }).contraParte.monto;
          deltaContraDeLaContraparte = nuevoMonto - (contraPrevia.contraParte?.monto ?? 0);
        }
      }

      // — Escrituras de la edición del InformeOp (misma lógica que editar) —
      const escrituras = await this.informeOpServ.armarEscriturasEdicion(resultado, msj);

      // — 1. InformeLiq propio —
      const d = {
        tarifaBase: (editado.valores.tarifaBase ?? 0) - (previo.valores.tarifaBase ?? 0),
        acompaniante: (editado.valores.acompaniante ?? 0) - (previo.valores.acompaniante ?? 0),
        kmMonto: (editado.valores.kmMonto ?? 0) - (previo.valores.kmMonto ?? 0),
        adExtra: (editado.valores.adExtra ?? 0) - (previo.valores.adExtra ?? 0),
        contraParte: (editado.contraParte?.monto ?? 0) - (previo.contraParte?.monto ?? 0),
      };
      const valores = this.factory.recalcularTotal({
        ...liq.valores,
        totalTarifaBase: liq.valores.totalTarifaBase + d.tarifaBase,
        totalAcompaniante: liq.valores.totalAcompaniante + d.acompaniante,
        totalKmMonto: liq.valores.totalKmMonto + d.kmMonto,
        totalAdExtra: liq.valores.totalAdExtra + d.adExtra,
        totalContraParte: liq.valores.totalContraParte + d.contraParte,
      }, liq.descuentos);
      // F30: el total no puede quedar por debajo de las compensaciones.
      const errNeto = errorNeto(valores.total, valores.totalCompensaciones ?? 0);
      if (errNeto) return { exito: false, mensaje: errNeto };
      const vf = this.factory.recalcularValoresFinancieros(liq.valoresFinancieros, valores.total);

      this.agregarEscrituraInformeLiqParcial(escrituras, liq.idInfLiq, {
        'valores.totalTarifaBase': valores.totalTarifaBase,
        'valores.totalAcompaniante': valores.totalAcompaniante,
        'valores.totalKmMonto': valores.totalKmMonto,
        'valores.totalAdExtra': valores.totalAdExtra,
        'valores.total': valores.total,
        'valores.totalContraParte': valores.totalContraParte,
        'valores.totalCompensaciones': valores.totalCompensaciones,
        'valores.neto': valores.neto,
        'valoresFinancieros.total': vf.total,
        'valoresFinancieros.saldo': vf.saldo,
      });
      const { id: _i1, idInfLiq: _l1, ...anteriorLiq } = liq as any;
      await this.logRegistro.agregarAlBatch(
        escrituras, 'EDITAR', this.COLECCION, liq.idInfLiq,
        `Recálculo por edición del informe ${idInfOp} — ${liq.tipo} ${nombreEntidadRef(liq.entidad)}`,
        anteriorLiq,
      );

      // — 2. InformeLiq de la contraparte (solo totalContraParte) —
      if (liqContra && deltaContraDeLaContraparte !== 0) {
        this.agregarEscrituraInformeLiqParcial(escrituras, liqContra.idInfLiq, {
          'valores.totalContraParte': liqContra.valores.totalContraParte + deltaContraDeLaContraparte,
        });
        const { id: _i2, idInfLiq: _l2, ...anteriorContra } = liqContra as any;
        await this.logRegistro.agregarAlBatch(
          escrituras, 'EDITAR', this.COLECCION, liqContra.idInfLiq,
          `Actualización de total contraparte por edición del informe ${idInfOp}`,
          anteriorContra,
        );
      }

      await this.db.commitBatch(escrituras);
      return { exito: true, mensaje: 'Informe editado y liquidación recalculada correctamente.' };
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'EDITAR', 'informesOp', idInfOp, `Error al editar InformeOp en liquidación: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `Error al guardar la edición: ${e?.message ?? e}` };
    }
  }

  /** Revierte un InformeLiq EMITIDO (gesto de Facturación). Transacción:
   *  relee el informe (debe seguir 'emitido' y sin nada cobrado), sus
   *  InformeOp (deben estar 'liquidado' y apuntar a este informe) y las
   *  Operaciones. Escribe:
   *   - InformeLiq: estado 'revertido' + reversion {motivo, usuario, fecha}.
   *     Conserva número, valores y composición (registro histórico).
   *   - Copia congelada de los InformeOp (informesLiqSnapshots/{idInfLiq}).
   *   - InformeOp (este lado): liquidado → activo, idInfLiq = null.
   *   - Operación: liquidacion.<lado> = false; ciclo 'liquidada' → 'cerrada'.
   *  La contraparte no cambia. Un log REVERTIR con diff.
   *  FC1: las compensaciones aplicadas se LIBERAN (cada movimiento pierde su
   *  imputación 'compensacion' a este informe y recupera el saldo sin
   *  imputar). Quedan en el informe revertido como historia.
   *  Presupuesto: 2 por InformeOp + informe + copia + log (≤ 303) + 1 por
   *  compensación (≤ MAX_COMPENSACIONES).
   *  TODO Finanzas: cuando exista la cascada, revertir tiene que descontar
   *  el informe de resumenFinanzas / cuenta corriente. */
  async revertirEmitido(idInfLiq: string, motivo: string): Promise<Resultado<void>> {
    const motivoLimpio = (motivo ?? '').trim();
    if (!motivoLimpio) return { exito: false, mensaje: 'El motivo de la reversión es obligatorio.' };

    // Afuera del callback (puede reintentarse y tiene que ser puro).
    const reversion: ReversionLiq = {
      motivo: motivoLimpio,
      usuario: this.usuarioSesion.getUsuarioActual()?.email ?? 'Desconocido',
      fecha: new Date().toISOString(),
    };

    try {
      const numero = await this.db.commitEnTransaccion<string | null>(async (tx) => {
        const escrituras: EscrituraBatch[] = [];

        const liq = await this.leerEmitido(tx, idInfLiq);
        if ((liq.valoresFinancieros?.totalCobrado ?? 0) !== 0) {
          throw new Error(
            `La liquidación ${liq.numeroInterno} tiene importes cobrados/pagados imputados: no se puede revertir.`,
          );
        }
        const informes = await this.leerInformesOp(tx, liq.informesOp);
        this.validarInformesDelEmitido(informes, idInfLiq);
        const operaciones = await this.leerOperaciones(tx, informes);
        const compensaciones = compensacionesDe(liq);
        const movimientos = await this.leerMovimientosFin(tx, compensaciones.map(c => c.idMovimiento));
        // — fin de lecturas —

        this.agregarEscrituraInformeLiqParcial(escrituras, idInfLiq, { estado: 'revertido', reversion });
        for (const [idMov, mov] of movimientos) {
          if (!mov) throw new Error(`Inconsistencia: no existe el movimiento ${idMov} compensado en esta liquidación.`);
          escrituras.push(escrituraMovimientoParcial(idMov, quitarCompensacion(mov, idInfLiq)));
        }
        this.agregarEscrituraSnapshot(escrituras, idInfLiq, {
          fecha: reversion.fecha,
          informesOp: informes.map(({ id, ...inf }) => inf as InformeOpNuevo),
        });

        const lado = this.lado(liq.tipo);
        for (const inf of informes) {
          this.informeOpServ.agregarEscrituraInformeOpParcial(escrituras, inf.idInfOp, {
            estado: 'activo',
            idInfLiq: null,
          });
          const op = operaciones.get(inf.idOperacion)!;
          this.operacionFactory.agregarEscrituraOperacionParcial(
            escrituras, inf.idOperacion, this.camposReversion(op.estado, lado),
          );
        }

        const { id: _i, idInfLiq: _l, ...anterior } = liq as any;
        await this.logRegistro.agregarAlBatch(
          escrituras, 'REVERTIR', this.COLECCION, idInfLiq,
          `Reversión de liquidación ${liq.numeroInterno} — ${liq.tipo} ${nombreEntidadRef(liq.entidad)} — ` +
          `${informes.length} InformeOp vuelven a 'activo' — ${this.factory.textoPeriodo(liq.periodo)} — motivo: ${motivoLimpio}` +
          (compensaciones.length > 0 ? ` — ${compensaciones.length} compensación(es) liberada(s)` : ''),
          anterior,
        );

        return { escrituras, resultado: liq.numeroInterno };
      });

      return {
        exito: true,
        mensaje: `Liquidación ${numero} revertida. Sus informes vuelven a estar disponibles para liquidar.`,
      };
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'REVERTIR', this.COLECCION, idInfLiq, `Error al revertir ${idInfLiq}: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `Error al revertir la liquidación: ${e?.message ?? e}` };
    }
  }

  /** Vincula la factura electrónica (PDF con QR de AFIP) a un InformeLiq
   *  EMITIDO → 'facturado' (gesto de Facturación).
   *  1. Decodifica el QR (puro).
   *  2. Pre-chequeos con lecturas sueltas (informe 'emitido', comprobante no
   *     vinculado): solo para no subir un PDF que se va a rechazar.
   *  3. Sube el PDF a Storage (facturas/{idInfLiq}/…) — reversible primero.
   *  4. Transacción: relee el informe (sigue 'emitido') y
   *     facturasVinculadas/{clave} (unicidad atómica); escribe informe
   *     (estado, factura, facturaUrl = PATH), crea el doc de unicidad y un
   *     log FACTURAR con diff. La validación (importe, CUIT) se recalcula
   *     con el informe fresco y queda en factura.validacion; confirmar
   *     discrepancias es responsabilidad de la UI, antes de llamar (D8).
   *  5. Si la transacción falla, borra el PDF subido (best-effort).
   *  TODO Finanzas: 'facturado' es el estado que habilita cobros/pagos. */
  async vincularFactura(idInfLiq: string, archivo: File, textoQr: string): Promise<Resultado<void>> {
    // 1. QR
    let qr: DatosQrAfip;
    try {
      qr = decodificarQrAfip(textoQr);
    } catch (e: any) {
      return { exito: false, mensaje: e?.message ?? String(e) };
    }
    const clave = claveComprobanteQr(qr);
    const comprobante = `${descripcionTipoComprobante(qr.tipoCmp)} ${numeroComprobante({ puntoVenta: qr.ptoVta, numero: qr.nroCmp })}`;

    // 2. Pre-chequeos (no protegidos: la regla real es la de la transacción)
    const previo = await this.obtenerPorId(idInfLiq);
    if (!previo) return { exito: false, mensaje: `No existe el informe de liquidación ${idInfLiq}.` };
    if (previo.estado !== 'emitido') {
      return { exito: false, mensaje: `El informe está en estado '${previo.estado}': solo se factura un informe emitido.` };
    }
    const yaVinculada = await this.db.getById<FacturaVinculada>(this.COL_FACTURAS, clave);
    if (yaVinculada) {
      return {
        exito: false,
        mensaje: `El comprobante ${comprobante} ya está vinculado a la liquidación ${yaVinculada.numeroInterno ?? yaVinculada.idInfLiq}.`,
      };
    }

    // Fuera del callback de la transacción (puede reintentarse y tiene que ser puro).
    const vinculadaPor = this.usuarioSesion.getUsuarioActual()?.email ?? 'Desconocido';
    const fechaVinculacion = new Date().toISOString();

    // 3. PDF a Storage
    let path: string;
    try {
      path = await this.storageArchivos.subirYObtenerPath(archivo, `facturas/${idInfLiq}`);
    } catch (e: any) {
      return { exito: false, mensaje: `No se pudo subir el PDF de la factura: ${e?.message ?? e}` };
    }

    // 4. Transacción
    try {
      const numero = await this.db.commitEnTransaccion<string | null>(async (tx) => {
        const escrituras: EscrituraBatch[] = [];

        const liq = await this.leerEmitido(tx, idInfLiq);
        const vinculada = await this.db.leerEnTransaccion<FacturaVinculada>(tx, this.COL_FACTURAS, clave);
        if (vinculada) {
          throw new Error(
            `El comprobante ${comprobante} ya está vinculado a la liquidación ${vinculada.numeroInterno ?? vinculada.idInfLiq}.`,
          );
        }
        // — fin de lecturas —

        const validacion = validarFacturaContraInforme(qr, liq);
        const factura = facturaDesdeQr(qr, textoQr, validacion, vinculadaPor, fechaVinculacion);

        this.agregarEscrituraInformeLiqParcial(escrituras, idInfLiq, {
          estado: 'facturado',
          factura,
          facturaUrl: path,
        });
        const indice: FacturaVinculada = { idInfLiq, numeroInterno: liq.numeroInterno, fechaVinculacion };
        escrituras.push({ coleccion: this.COL_FACTURAS, id: clave, data: indice, modo: 'crear' });

        const discrepancias = [
          validacion.importeOk ? null : 'importe',
          validacion.cuitOk ? null : 'CUIT',
        ].filter(Boolean);
        const { id: _i, idInfLiq: _l, ...anterior } = liq as any;
        await this.logRegistro.agregarAlBatch(
          escrituras, 'FACTURAR', this.COLECCION, idInfLiq,
          `Factura ${comprobante} vinculada a la liquidación ${liq.numeroInterno} — ${liq.tipo} ${nombreEntidadRef(liq.entidad)}` +
          (validacion.base === 'neto' ? ' — importe = neto (con compensaciones)' : '') +
          (discrepancias.length > 0 ? ` — vinculada con discrepancias (${discrepancias.join(', ')})` : ''),
          anterior,
        );

        return { escrituras, resultado: liq.numeroInterno };
      });

      return { exito: true, mensaje: `Factura ${comprobante} vinculada. La liquidación ${numero} pasó a facturada.` };
    } catch (e: any) {
      // 5. Compensación: el PDF subido queda huérfano si la transacción falla.
      try {
        await this.storageArchivos.eliminarPorUrl(path);
      } catch {
        // best-effort
      }
      await this.logRegistro.registrarError(
        'FACTURAR', this.COLECCION, idInfLiq, `Error al vincular factura ${comprobante}: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `Error al vincular la factura: ${e?.message ?? e}` };
    }
  }

  /** Desvincula la factura de un InformeLiq FACTURADO → vuelve a 'emitido'
   *  (gesto de Facturación). Transacción: relee el informe (sigue
   *  'facturado', sin nada cobrado — D3); limpia factura y facturaUrl y
   *  borra el doc de unicidad (el comprobante queda libre para vincularse
   *  bien). El PDF se CONSERVA en Storage (D18): su path queda en el diff
   *  del log DESVINCULAR. Motivo obligatorio (va en el detalle del log). */
  async desvincularFactura(idInfLiq: string, motivo: string): Promise<Resultado<void>> {
    const motivoLimpio = (motivo ?? '').trim();
    if (!motivoLimpio) return { exito: false, mensaje: 'El motivo de la desvinculación es obligatorio.' };

    try {
      const numero = await this.db.commitEnTransaccion<string | null>(async (tx) => {
        const escrituras: EscrituraBatch[] = [];

        const liq = await this.leerFacturado(tx, idInfLiq);
        if ((liq.valoresFinancieros?.totalCobrado ?? 0) !== 0) {
          throw new Error(
            `La liquidación ${liq.numeroInterno} tiene importes cobrados/pagados imputados: no se puede desvincular la factura.`,
          );
        }
        if (!liq.factura) {
          throw new Error(`Inconsistencia: la liquidación ${liq.numeroInterno} está facturada pero no tiene factura.`);
        }
        // — fin de lecturas —

        const clave = claveComprobante(liq.factura);
        const comprobante = `${descripcionTipoComprobante(liq.factura.tipoComprobante)} ${numeroComprobante(liq.factura)}`;

        this.agregarEscrituraInformeLiqParcial(escrituras, idInfLiq, {
          estado: 'emitido',
          factura: null,
          facturaUrl: null,
        });
        // Borrar un doc que no existe no falla: no hace falta leerlo antes.
        escrituras.push({ coleccion: this.COL_FACTURAS, id: clave, data: null, modo: 'eliminar' });

        const { id: _i, idInfLiq: _l, ...anterior } = liq as any;
        await this.logRegistro.agregarAlBatch(
          escrituras, 'DESVINCULAR', this.COLECCION, idInfLiq,
          `Factura ${comprobante} desvinculada de la liquidación ${liq.numeroInterno} — vuelve a 'emitido' — ` +
          `el PDF se conserva en Storage (${liq.facturaUrl ?? 'sin path'}) — motivo: ${motivoLimpio}`,
          anterior,
        );

        return { escrituras, resultado: liq.numeroInterno };
      });

      return { exito: true, mensaje: `Factura desvinculada. La liquidación ${numero} volvió a emitida.` };
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'DESVINCULAR', this.COLECCION, idInfLiq, `Error al desvincular factura de ${idInfLiq}: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `Error al desvincular la factura: ${e?.message ?? e}` };
    }
  }

  // =====================================================================
  // INTERNOS
  // =====================================================================

  /** Alta común de crearBorrador / emitir. */
  private async crearNuevo(
    d: DatosLiquidacion,
    modo: 'borrador' | 'emitido',
  ): Promise<Resultado<ResultadoLiquidacion>> {
    const error = this.validarDatos(d);
    if (error) return { exito: false, mensaje: error };
    let solicitudes: CompensacionSolicitada[];
    try {
      solicitudes = normalizarCompensaciones(d.compensaciones);
    } catch (e: any) {
      return { exito: false, mensaje: e?.message ?? String(e) };
    }

    // Afuera del callback: el callback puede reintentarse y tiene que ser puro.
    const idInfLiq = this.db.generarId(this.COLECCION);
    const fecha = toISODateString(new Date());
    const accion = modo === 'borrador' ? 'Borrador' : 'Emisión';

    try {
      const numeroInterno = await this.db.commitEnTransaccion<string | null>(async (tx) => {
        const escrituras: EscrituraBatch[] = [];

        const informes = await this.leerInformesOp(tx, d.idsInformesOp);
        this.validarInformesParaLiquidar(informes, d);
        const operaciones = await this.leerOperaciones(tx, informes);
        let numero: string | null = null;
        if (modo === 'emitido') {
          const n = await this.numerador.leerProximoNumeroInterno(tx, d.tipo);
          numero = n.numeroInterno;
          escrituras.push(n.escritura);
        }
        const movimientos = await this.leerMovimientosFin(tx, solicitudes.map(s => s.idMovimiento));
        // — fin de lecturas —

        // FC1: snapshot + validación de las compensaciones (borrador: solo se
        // guardan; emitido: se aplican en los movimientos).
        const compensaciones = armarCompensaciones(
          solicitudes, movimientos, { tipo: d.tipo, id: informes[0].entidad.id }, null,
        );
        const informeLiq = this.factory.crear(idInfLiq, {
          tipo: d.tipo,
          entidad: informes[0].entidad,
          periodo: d.periodo,
          informesOp: informes,
          descuentos: d.descuentos,
          columnas: d.columnas,
          observaciones: d.observaciones,
          compensaciones,
          modo,
          numeroInterno: numero,
          fecha,
        });
        const errNeto = errorNeto(informeLiq.valores.total, informeLiq.valores.totalCompensaciones ?? 0);
        if (errNeto) throw new Error(errNeto);
        this.agregarEscrituraInformeLiqCompleto(escrituras, informeLiq, 'crear');
        if (modo === 'emitido') {
          this.agregarEscriturasCompensacion(
            escrituras,
            { idInfLiq, numeroInterno: numero, periodoClave: informeLiq.periodoClave, totalDocumento: informeLiq.valores.total },
            compensaciones, movimientos, fecha,
          );
        }

        const lado = this.lado(d.tipo);
        for (const inf of informes) {
          this.informeOpServ.agregarEscrituraInformeOpParcial(escrituras, inf.idInfOp, {
            estado: modo === 'borrador' ? 'proforma' : 'liquidado',
            idInfLiq,
          });
          // Solo el borrador bloquea a la contraparte (mismo criterio asimétrico
          // que el camino viejo: solo el lado chofer/proveedor anota al cliente).
          if (modo === 'borrador' && d.tipo !== 'cliente' && inf.contraParte?.idInfOp) {
            this.informeOpServ.agregarEscrituraInformeOpParcial(escrituras, inf.contraParte.idInfOp, {
              bloqueadoPorContraparte: true,
            });
          }
          const op = operaciones.get(inf.idOperacion)!;
          this.operacionFactory.agregarEscrituraOperacionParcial(
            escrituras, inf.idOperacion,
            modo === 'borrador' ? { [`estado.proforma.${lado}`]: true } : this.camposLiquidacion(op.estado, lado),
          );
        }

        // Borrador → 'ALTA'. Emisión directa → 'EMITIR' (misma acción que
        // emitirBorrador: para el usuario, "emitir" es asignar número). Con
        // `anterior = null`: documento nuevo, no hay estado previo que diffear
        // (y así no se hace una lectura fuera de la transacción).
        await this.logRegistro.agregarAlBatch(
          escrituras, modo === 'borrador' ? 'ALTA' : 'EMITIR', this.COLECCION, idInfLiq,
          `${accion} de liquidación${numero ? ` ${numero}` : ''} — ${d.tipo} ${nombreEntidadRef(informeLiq.entidad)} — ${informes.length} InformeOp — ${this.factory.textoPeriodo(d.periodo)}` +
          this.textoCompensaciones(compensaciones),
          null,
        );

        return { escrituras, resultado: numero };
      });

      return {
        exito: true,
        mensaje: modo === 'borrador'
          ? 'Borrador creado correctamente.'
          : `Liquidación ${numeroInterno} emitida correctamente.`,
        objeto: { idInfLiq, numeroInterno },
      };
    } catch (e: any) {
      await this.logRegistro.registrarError(
        modo === 'borrador' ? 'ALTA' : 'EMITIR', this.COLECCION, idInfLiq, `Error en ${accion.toLowerCase()} de liquidación: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `Error al procesar la liquidación: ${e?.message ?? e}` };
    }
  }

  /** Validación previa, sin lecturas. Devuelve el mensaje de error o null. */
  private validarDatos(d: DatosLiquidacion): string | null {
    const n = d.idsInformesOp.length;
    if (n === 0) return 'No hay informes seleccionados para liquidar.';
    if (n > InformeLiqService.MAX_INFORMES_OP) {
      return `Una liquidación admite hasta ${InformeLiqService.MAX_INFORMES_OP} informes (seleccionados: ${n}).`;
    }
    if (new Set(d.idsInformesOp).size !== n) return 'La selección contiene informes repetidos.';
    if (!Number.isInteger(d.periodo.mes) || d.periodo.mes < 1 || d.periodo.mes > 12) return 'Período inválido (mes).';
    if (!Number.isInteger(d.periodo.anio)) return 'Período inválido (año).';
    return null;
  }

  /** Reglas de negocio sobre los InformeOp RELEÍDOS en la transacción, para
   *  crear un informe nuevo: todos 'activo', sin bloqueo por contraparte, del
   *  tipo pedido, de UNA sola entidad, dentro de la ventana del período y con
   *  operaciones distintas. Tira Error (aborta la transacción). */
  private validarInformesParaLiquidar(informes: ConId<InformeOpNuevo>[], d: DatosLiquidacion): void {
    const { desde, hasta } = this.factory.ventanaPeriodo(d.periodo);
    const idEntidad = informes[0].entidad.id;
    const ops = new Set<string>();

    for (const inf of informes) {
      if (inf.estado !== 'activo') {
        throw new Error(`El informe ${inf.idInfOp} está en estado '${inf.estado}' (se esperaba 'activo'). Actualizá la pantalla.`);
      }
      if (inf.bloqueadoPorContraparte) {
        throw new Error(`El informe ${inf.idInfOp} está bloqueado por una proforma de la contraparte.`);
      }
      if (inf.tipo !== d.tipo) {
        throw new Error(`El informe ${inf.idInfOp} es de tipo '${inf.tipo}' (se esperaba '${d.tipo}').`);
      }
      if (inf.entidad.id !== idEntidad) {
        throw new Error('La selección mezcla informes de distintas entidades.');
      }
      if (inf.fecha < desde || inf.fecha > hasta) {
        throw new Error(`El informe del ${inf.fecha} está fuera del período ${this.factory.textoPeriodo(d.periodo)}.`);
      }
      if (ops.has(inf.idOperacion)) {
        throw new Error(`La operación ${inf.idOperacion} aparece más de una vez en la selección.`);
      }
      ops.add(inf.idOperacion);
    }
  }

  /** Reglas sobre los InformeOp de un borrador existente: siguen en
   *  'proforma' y apuntando a este informe. */
  private validarInformesDelBorrador(informes: ConId<InformeOpNuevo>[], idInfLiq: string): void {
    for (const inf of informes) {
      if (inf.estado !== 'proforma' || inf.idInfLiq !== idInfLiq) {
        throw new Error(
          `Inconsistencia: el informe ${inf.idInfOp} está en '${inf.estado}' con idInfLiq '${inf.idInfLiq}' (se esperaba 'proforma' en ${idInfLiq}).`,
        );
      }
    }
  }

  /** Lee el InformeLiq dentro de la transacción y exige estado 'borrador'. */
  private async leerBorrador(tx: Transaction, idInfLiq: string): Promise<ConId<InformeLiqNuevo>> {
    const data = await this.db.leerEnTransaccion<InformeLiqNuevo>(tx, this.COLECCION, idInfLiq);
    if (!data) throw new Error(`No existe el informe de liquidación ${idInfLiq}.`);
    if (data.estado !== 'borrador') {
      throw new Error(`El informe ${idInfLiq} está en estado '${data.estado}' (se esperaba 'borrador').`);
    }
    return { ...data, id: idInfLiq, idInfLiq };
  }

  /** Lee el InformeLiq dentro de la transacción y exige estado 'emitido'. */
  private async leerEmitido(tx: Transaction, idInfLiq: string): Promise<ConId<InformeLiqNuevo>> {
    const data = await this.db.leerEnTransaccion<InformeLiqNuevo>(tx, this.COLECCION, idInfLiq);
    if (!data) throw new Error(`No existe el informe de liquidación ${idInfLiq}.`);
    if (data.estado !== 'emitido') {
      throw new Error(`El informe ${data.numeroInterno ?? idInfLiq} está en estado '${data.estado}' (se esperaba 'emitido').`);
    }
    return { ...data, id: idInfLiq, idInfLiq };
  }

  /** Lee el InformeLiq dentro de la transacción y exige estado 'facturado'. */
  private async leerFacturado(tx: Transaction, idInfLiq: string): Promise<ConId<InformeLiqNuevo>> {
    const data = await this.db.leerEnTransaccion<InformeLiqNuevo>(tx, this.COLECCION, idInfLiq);
    if (!data) throw new Error(`No existe el informe de liquidación ${idInfLiq}.`);
    if (data.estado !== 'facturado') {
      throw new Error(`El informe ${data.numeroInterno ?? idInfLiq} está en estado '${data.estado}' (se esperaba 'facturado').`);
    }
    return { ...data, id: idInfLiq, idInfLiq };
  }

  /** Reglas sobre los InformeOp de un emitido: siguen en 'liquidado' y
   *  apuntando a este informe. */
  private validarInformesDelEmitido(informes: ConId<InformeOpNuevo>[], idInfLiq: string): void {
    for (const inf of informes) {
      if (inf.estado !== 'liquidado' || inf.idInfLiq !== idInfLiq) {
        throw new Error(
          `Inconsistencia: el informe ${inf.idInfOp} está en '${inf.estado}' con idInfLiq '${inf.idInfLiq}' (se esperaba 'liquidado' en ${idInfLiq}).`,
        );
      }
    }
  }

  /** Relee cada InformeOp por id dentro de la transacción (agrega idInfOp —
   *  patrón ConId). Aborta si falta alguno. */
  private async leerInformesOp(tx: Transaction, ids: string[]): Promise<ConId<InformeOpNuevo>[]> {
    return Promise.all(ids.map(async (id) => {
      const data = await this.db.leerEnTransaccion<InformeOpNuevo>(tx, this.COL_INFORMES_OP, id);
      if (!data) throw new Error(`No existe el informe ${id}.`);
      return { ...data, id, idInfOp: id };
    }));
  }

  /** Relee las Operaciones de los InformeOp POR ID DE DOCUMENTO (idOperacion
   *  no se persiste en el body — por eso no se busca por campo). */
  private async leerOperaciones(tx: Transaction, informes: ConId<InformeOpNuevo>[]): Promise<Map<string, Operacion>> {
    const ids = [...new Set(informes.map(i => i.idOperacion))];
    const mapa = new Map<string, Operacion>();
    await Promise.all(ids.map(async (id) => {
      const data = await this.db.leerEnTransaccion<Operacion>(tx, this.COL_OPERACIONES, id);
      if (!data) throw new Error(`Operación ${id} no encontrada.`);
      mapa.set(id, { ...data, idOperacion: id });
    }));
    return mapa;
  }

  /** FC1: relee los movimientos de Finanzas (ids sin repetir) dentro de la
   *  transacción. null si alguno no existe (lo resuelve quien lo usa). */
  private async leerMovimientosFin(tx: Transaction, ids: string[]): Promise<Map<string, MovimientoFin | null>> {
    const mapa = new Map<string, MovimientoFin | null>();
    await Promise.all([...new Set(ids)].map(async (id) => {
      mapa.set(id, await this.db.leerEnTransaccion<MovimientoFin>(tx, COLECCION_MOVIMIENTOS_FIN, id));
    }));
    return mapa;
  }

  /** FC1: aplica las compensaciones de un informe EMITIDO en sus
   *  movimientos (una imputación 'compensacion' por movimiento, que
   *  reemplaza la anterior a este informe si la había). `saldoAntes` baja en
   *  el orden de la lista. Los movimientos ya están validados por
   *  armarCompensaciones. */
  private agregarEscriturasCompensacion(
    escrituras: EscrituraBatch[],
    doc: DocumentoCompensado,
    compensaciones: CompensacionLiq[],
    movimientos: Map<string, MovimientoFin | null>,
    fecha: string,
  ): void {
    let saldo = doc.totalDocumento;
    for (const c of compensaciones) {
      const mov = movimientos.get(c.idMovimiento);
      if (!mov) throw new Error(`No existe el movimiento ${c.numero} elegido para compensar.`);
      escrituras.push(escrituraMovimientoParcial(c.idMovimiento, fijarCompensacion(mov, doc, c.importe, saldo, fecha)));
      saldo = redondear2(saldo - c.importe);
    }
  }

  /** ' — compensaciones $ X (N)' para los logs ('' si no hay). */
  private textoCompensaciones(compensaciones: CompensacionLiq[]): string {
    if (compensaciones.length === 0) return '';
    return ` — compensaciones $ ${totalCompensacionesDe(compensaciones).toFixed(2)} (${compensaciones.length})`;
  }

  private lado(tipo: 'cliente' | 'chofer' | 'proveedor'): Lado {
    return tipo === 'cliente' ? 'cliente' : 'chofer';
  }

  /** Campos de Operación al quedar liquidado un lado (directo o desde
   *  borrador): proforma.<lado> = false, liquidacion.<lado> = true, y
   *  ciclo 'liquidada' si el otro lado ya estaba liquidado. */
  private camposLiquidacion(estado: EstadoOp, lado: Lado): Record<string, any> {
    const otro: Lado = lado === 'cliente' ? 'chofer' : 'cliente';
    const campos: Record<string, any> = {
      [`estado.proforma.${lado}`]: false,
      [`estado.liquidacion.${lado}`]: true,
    };
    if (estado.liquidacion[otro]) campos['estado.ciclo'] = 'liquidada';
    return campos;
  }

  /** Campos de Operación al revertir la liquidación de un lado:
   *  liquidacion.<lado> = false, y ciclo 'liquidada' → 'cerrada'. */
  private camposReversion(estado: EstadoOp, lado: Lado): Record<string, any> {
    const campos: Record<string, any> = { [`estado.liquidacion.${lado}`]: false };
    if (estado.ciclo === 'liquidada') campos['estado.ciclo'] = 'cerrada';
    return campos;
  }
}
