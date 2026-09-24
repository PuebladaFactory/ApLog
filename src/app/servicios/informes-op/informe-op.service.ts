import { Injectable, inject } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';
import { ConId } from 'src/app/interfaces/conId';
import { Resultado } from 'src/app/interfaces/resultado';
import { Operacion } from 'src/app/interfaces/operacion';
import { InformeOpNuevo, Valores } from 'src/app/interfaces/informe-op-nuevo';
import { DbFirestoreService, EscrituraBatch, PaginaResultado } from 'src/app/servicios/database/db-firestore.service';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';
import { InformeOpFactoryService } from 'src/app/servicios/informes-op/informe-op-factory.service';
import { OperacionFactoryService } from 'src/app/servicios/operaciones/operacion-factory.service';
import { ResumenOpCalculatorService, UpdateResumen } from 'src/app/servicios/reportes/reportes-op/resumen-op-calculator.service';
import { ReportesOpService } from 'src/app/servicios/reportes/reportes-op/reportes-op.service';
import { ResultadoEdicionInformeOp } from 'src/app/shared/modales/informe-op-editor/informe-op-editor.component';

/** Coordinador de InformeOpNuevo — construcción del PAR cliente/contraparte
 *  al cierre, consulta, edición y baja. La construcción de UN InformeOpNuevo
 *  vive en InformeOpFactoryService; este servicio arma el par con ids
 *  cruzados (generarId, sin escribir), consulta y da de baja (anular).
 *  crearPar() NO persiste — devuelve los dos objetos listos para que el
 *  caller (OperacionService.cerrarOperacion) los agregue a su propio batch
 *  atómico junto con la actualización de la Operación y los resúmenes.
 *
 *  editar() se agrega en un chunk posterior de este mismo frente (integra
 *  con actualizarOperacionInformeOpYFactura, cuya forma nueva todavía no
 *  está diseñada) — no está acá a propósito. */
@Injectable({ providedIn: 'root' })
export class InformeOpService {

  private db = inject(DbFirestoreService);
  private logRegistro = inject(LogRegistroService);
  private factory = inject(InformeOpFactoryService);
  private operacionFactory = inject(OperacionFactoryService);
  private resumenOpCalculator = inject(ResumenOpCalculatorService);
  private reportesOp = inject(ReportesOpService);

  private readonly COLECCION = 'informesOp';

  /** Construye el par de InformeOpNuevo del cierre — cliente + contraparte
   *  (chofer o proveedor) — con ids reales pre-generados (sin escribir) y
   *  contraParte cruzada entre ambos. Pura construcción: lo único que toca
   *  Firestore es pedir los dos ids nuevos (generarId, síncrono, no
   *  escribe). */
  crearPar(
    op: ConId<Operacion>,
    valoresCliente: Valores,
    valoresOtro: Valores,
    tipoOtro: 'chofer' | 'proveedor',
  ): { informeCliente: InformeOpNuevo; informeOtro: InformeOpNuevo } {
    const idCliente = this.db.generarId(this.COLECCION);
    const idOtro = this.db.generarId(this.COLECCION);

    // entidad de la contraparte para cada lado — permite mostrar "Cliente"/
    // "Chofer" en los listados sin resolver on-demand (ver LiquidacionesOp/
    // ResumenOpLiquidadas, Chunk 2b-4).
    const entidadOtro = this.factory.resolverEntidad(op, tipoOtro);

    const informeCliente = this.factory.crear(
      idCliente, op, 'cliente', valoresCliente,
      { idInfOp: idOtro, monto: valoresOtro.total, entidad: entidadOtro },
    );
    const informeOtro = this.factory.crear(
      idOtro, op, tipoOtro, valoresOtro,
      { idInfOp: idCliente, monto: valoresCliente.total, entidad: op.cliente },
    );

    return { informeCliente, informeOtro };
  }

  /** Listener en vivo por periodo/tipo — usado por LiquidacionesOpComponent.
   *  Trae 'activo' y 'proforma' (lo liquidado/anulado desaparece del
   *  listado). Requiere el índice compuesto tipo+estado+fecha en
   *  firestore.indexes.json. */
  observarPorPeriodo(
    desde: string,
    hasta: string,
    tipo: 'cliente' | 'chofer' | 'proveedor',
  ): Observable<ConId<InformeOpNuevo>[]> {
    return this.db.observarInformesOpPorPeriodo(
      this.COLECCION, desde, hasta, tipo, ['activo', 'proforma'],
    );
  }

  /** Guarda anti-duplicado del cierre — ¿ya existe algún InformeOp para esta
   *  operación? El caller (OperacionService.cerrarOperacion) no necesita
   *  conocer el nombre de la colección para esto. */
  async existeParaOperacion(idOperacion: string): Promise<boolean> {
    const informes = await this.obtenerPorOperacion(idOperacion);
    return informes.length > 0;
  }

  async obtenerPorOperacion(idOperacion: string): Promise<ConId<InformeOpNuevo>[]> {
    const informes = await firstValueFrom(
      this.db.getByFieldValue<InformeOpNuevo>(this.COLECCION, 'idOperacion', idOperacion),
    );
    // idInfOp = id del documento (patrón ConId) — no viene en el body.
    return informes.map(inf => ({ ...inf, idInfOp: inf.id }));
  }

  async obtenerPorPeriodo(
    desde: string,
    hasta: string,
    tipo: 'cliente' | 'chofer' | 'proveedor',
    estado: 'activo' | 'proforma' | 'liquidado' | 'anulado' | undefined,
    pageSize: number,
    cursor: QueryDocumentSnapshot<DocumentData> | null,
  ): Promise<PaginaResultado<InformeOpNuevo>> {
    return this.db.getInformesOpPorPeriodo(this.COLECCION, desde, hasta, tipo, estado, pageSize, cursor);
  }

  /** Consulta por lista de idsOperacion — usado por las pantallas de lectura
   *  (Proforma, FacturacionListado, FacturacionHistorico, LiquidacionesOp)
   *  para traer los InformeOp de una liquidación/proforma ya armada. Wrapper
   *  tipado sobre el método genérico de DbFirestoreService, hardcodea la
   *  colección única. */
  async obtenerPorIdsOperacion(
    idsOperacion: string[],
  ): Promise<{ encontrados: ConId<InformeOpNuevo>[]; idsFaltantes: string[] }> {
    const r = await this.db.obtenerDocsPorIdsOperacion(this.COLECCION, idsOperacion);
    // idInfOp = id del documento (patrón ConId) — obtenerDocsPorIdsOperacion
    // es genérico y solo agrega `id`.
    return {
      encontrados: r.encontrados.map((d: any) => ({ ...d, idInfOp: d.id })),
      idsFaltantes: r.idsFaltantes,
    };
  }

  /** InformeOp que componen un InformeLiqNuevo — link inverso
   *  InformeOpNuevo.idInfLiq. Trae solo el lado de ese informe (la
   *  contraparte tiene otro idInfLiq o null). Válido mientras el InformeLiq
   *  está vigente (borrador/emitido): al revertirse, los InformeOp vuelven a
   *  idInfLiq = null (la composición histórica queda en
   *  InformeLiqNuevo.informesOp). Ordenados por fecha ascendente, en memoria
   *  (sin índice compuesto). */
  async obtenerPorInformeLiq(idInfLiq: string): Promise<ConId<InformeOpNuevo>[]> {
    const informes = await firstValueFrom(
      this.db.getByFieldValue<InformeOpNuevo>(this.COLECCION, 'idInfLiq', idInfLiq),
    );
    return informes
      .map(inf => ({ ...inf, idInfOp: inf.id }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  /** Consulta puntual por id — usado para resolver la contraparte on-demand
   *  (InformeLiqDetalleComponent) vía contraParte.idInfOp. */
  async obtenerPorId(idInfOp: string): Promise<ConId<InformeOpNuevo> | null> {
    const informe = await this.db.getById<InformeOpNuevo>(this.COLECCION, idInfOp);
    if (!informe) return null;
    return { id: idInfOp, ...informe, idInfOp };
  }

  /** Transición a 'anulado' — no borra el documento (reemplaza el borrado
   *  físico que hacía eliminarOperacionEInformes; el cutover de ese flujo
   *  es un chunk posterior). Atómico con su propia entrada de log; no toca
   *  Operación ni la contraparte acá — eso lo decide el caller según el
   *  camino que dispare la anulación. */
  async anular(idInfOp: string, msj: string = 'Anulación de InformeOp'): Promise<Resultado<void>> {
    const informe = await this.db.getById<InformeOpNuevo>(this.COLECCION, idInfOp);
    if (!informe) {
      return { exito: false, mensaje: `No se encontró el InformeOp ${idInfOp}.` };
    }
    if (informe.estado === 'anulado') {
      return { exito: true, mensaje: `El InformeOp ${idInfOp} ya estaba anulado.` };
    }

    const escrituras: EscrituraBatch[] = [
      { coleccion: this.COLECCION, id: idInfOp, data: { ...informe, estado: 'anulado' }, modo: 'reemplazar' },
    ];
    await this.logRegistro.agregarAlBatch(escrituras, 'EDITAR', this.COLECCION, idInfOp, msj);

    try {
      await this.db.commitBatch(escrituras);
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'EDITAR', this.COLECCION, idInfOp, `Error al anular InformeOp ${idInfOp}: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `Error al anular: ${e?.message ?? e}.` };
    }

    return { exito: true, mensaje: `InformeOp ${idInfOp} anulado correctamente.` };
  }

  /** Reemplazo completo de un InformeOp — cuando el documento cambia de
   *  forma sustancial (valores/datosOperacion recalculados enteros).
   *  Strippea id/idInfOp antes de escribir (patrón ConId: no se guardan en
   *  el body, se agregan al leer). No commitea — el caller sigue con su
   *  propio db.commitBatch(escrituras). */
  agregarEscrituraInformeOpCompleto(escrituras: EscrituraBatch[], informe: ConId<InformeOpNuevo>): void {
    const { id, idInfOp, ...data } = informe as any;
    escrituras.push({ coleccion: this.COLECCION, id: informe.idInfOp, data, modo: 'reemplazar' });
  }

  /** Actualización parcial de un InformeOp — solo los campos pasados en
   *  `campos` se tocan en Firestore. Los campos anidados van en notación de
   *  punto (ej. 'contraParte.monto'), NUNCA como objeto anidado. No
   *  commitea — el caller sigue con su propio db.commitBatch(escrituras). */
  agregarEscrituraInformeOpParcial(escrituras: EscrituraBatch[], idInfOp: string, campos: Record<string, any>): void {
    escrituras.push({ coleccion: this.COLECCION, id: idInfOp, data: campos, modo: 'actualizar' });
  }

  /** Arma TODAS las escrituras de la edición de un InformeOp, sin commitear:
   *  Operación + InformeOp editado + contraparte (completo o solo
   *  contraParte.monto, según su estado — nada si está 'anulado') + logs +
   *  delta de resúmenes. Pública para que otros orquestadores (ej.
   *  InformeLiqService.editarInformeOp, que además recalcula el InformeLiq)
   *  reutilicen exactamente la misma lógica y sumen sus propias escrituras
   *  antes de un único commit. */
  async armarEscriturasEdicion(
    resultado: ResultadoEdicionInformeOp,
    msj: string = 'Edición de InformeOp',
  ): Promise<EscrituraBatch[]> {
    const { operacionVieja, operacion, informeEditado, contraparte } = resultado;

    const escrituras: EscrituraBatch[] = [];

    this.operacionFactory.agregarEscrituraOperacion(escrituras, operacion);
    this.agregarEscrituraInformeOpCompleto(escrituras, informeEditado);

    if (contraparte) {
      if (contraparte.sync === 'completo') {
        // ResultadoContraparteEdicion.informe no es un discriminated union a
        // nivel de tipos (sync y informe son campos independientes) — el
        // cast es seguro porque InformeOpEditorComponent garantiza en
        // tiempo de ejecución que sync==='completo' ⟺ informe es un
        // ConId<InformeOpNuevo> completo.
        this.agregarEscrituraInformeOpCompleto(escrituras, contraparte.informe as ConId<InformeOpNuevo>);
      } else {
        const { monto } = (contraparte.informe as { contraParte: { monto: number } }).contraParte;
        this.agregarEscrituraInformeOpParcial(escrituras, contraparte.idInfOp, {
          'contraParte.monto': monto,
        });
      }
    }
    // contraparte === null (estado 'anulado'): no se toca nada de ese lado.

    await this.logRegistro.agregarAlBatch(escrituras, 'EDITAR', 'operaciones', operacion.idOperacion, msj);
    await this.logRegistro.agregarAlBatch(escrituras, 'EDITAR', this.COLECCION, informeEditado.idInfOp, msj);
    if (contraparte) {
      await this.logRegistro.agregarAlBatch(escrituras, 'EDITAR', this.COLECCION, contraparte.idInfOp, msj);
    }

    const updates: UpdateResumen[] = this.resumenOpCalculator.generarDeltaUpdates(operacionVieja, operacion);
    await this.reportesOp.agregarEscriturasResumen(escrituras, updates);

    return escrituras;
  }

  /** Edita un InformeOp de forma atómica — armarEscriturasEdicion + un único
   *  commitBatch. Orquestador — vive acá porque el punto de entrada semántico
   *  es "editar un InformeOp" (InformeOpEditorComponent), aunque los campos
   *  realmente editados (km, tarifa, etc.) sean de Operación. Solo para
   *  InformeOp 'activo': uno que está dentro de un InformeLiq se edita por
   *  InformeLiqService.editarInformeOp (B3). */
  async editar(
    resultado: ResultadoEdicionInformeOp,
    msj: string = 'Edición de InformeOp',
  ): Promise<Resultado<void>> {
    const escrituras = await this.armarEscriturasEdicion(resultado, msj);
    const { informeEditado } = resultado;

    try {
      await this.db.commitBatch(escrituras);
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'EDITAR', this.COLECCION, informeEditado.idInfOp,
        `Error al editar InformeOp ${informeEditado.idInfOp}: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `Error al guardar la edición: ${e?.message ?? e}.` };
    }

    return { exito: true, mensaje: `InformeOp ${informeEditado.idInfOp} editado correctamente.` };
  }
}
