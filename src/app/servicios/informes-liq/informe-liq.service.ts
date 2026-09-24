import { Injectable, inject } from '@angular/core';
import { Transaction } from '@angular/fire/firestore';
import { ConId } from 'src/app/interfaces/conId';
import { Resultado } from 'src/app/interfaces/resultado';
import { InformeOpNuevo } from 'src/app/interfaces/informe-op-nuevo';
import { EstadoOp, Operacion } from 'src/app/interfaces/operacion';
import { DescuentoLiq, InformeLiqNuevo, PeriodoLiq } from 'src/app/interfaces/informe-liq-nuevo';
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';
import { NumeradorService } from 'src/app/servicios/numerador/numerador.service';
import { InformeOpService } from 'src/app/servicios/informes-op/informe-op.service';
import { OperacionFactoryService } from 'src/app/servicios/operaciones/operacion-factory.service';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';
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
}

export interface ResultadoLiquidacion {
  idInfLiq: string;
  numeroInterno: string | null;     // null si se creó un borrador
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

  private readonly COLECCION = 'informesLiq';
  private readonly COL_INFORMES_OP = 'informesOp';
  private readonly COL_OPERACIONES = 'operaciones';

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
   *  (puede haber cambiado por edición del borrador). */
  async emitirBorrador(idInfLiq: string): Promise<Resultado<ResultadoLiquidacion>> {
    const fecha = toISODateString(new Date());
    try {
      const numeroInterno = await this.db.commitEnTransaccion<string>(async (tx) => {
        const escrituras: EscrituraBatch[] = [];

        const liq = await this.leerBorrador(tx, idInfLiq);
        const informes = await this.leerInformesOp(tx, liq.informesOp);
        this.validarInformesDelBorrador(informes, idInfLiq);
        const operaciones = await this.leerOperaciones(tx, informes);
        const { numeroInterno, escritura } = await this.numerador.leerProximoNumeroInterno(tx, liq.tipo);
        // — fin de lecturas —

        escrituras.push(escritura);
        this.agregarEscrituraInformeLiqParcial(escrituras, idInfLiq, {
          estado: 'emitido',
          numeroInterno,
          fechaEmision: fecha,
          valoresFinancieros: this.factory.recalcularValoresFinancieros(liq.valoresFinancieros, liq.valores.total),
          estadoFinanciero: 'pendiente',
        });

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
          `Emisión de borrador — ${numeroInterno} — ${liq.tipo} ${nombreEntidadRef(liq.entidad)} — ${informes.length} InformeOp — ${this.factory.textoPeriodo(liq.periodo)}`,
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
        // — fin de lecturas —

        const informeLiq = this.factory.crear(idInfLiq, {
          tipo: d.tipo,
          entidad: informes[0].entidad,
          periodo: d.periodo,
          informesOp: informes,
          descuentos: d.descuentos,
          columnas: d.columnas,
          observaciones: d.observaciones,
          modo,
          numeroInterno: numero,
          fecha,
        });
        this.agregarEscrituraInformeLiqCompleto(escrituras, informeLiq, 'crear');

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
          `${accion} de liquidación${numero ? ` ${numero}` : ''} — ${d.tipo} ${nombreEntidadRef(informeLiq.entidad)} — ${informes.length} InformeOp — ${this.factory.textoPeriodo(d.periodo)}`,
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
}
