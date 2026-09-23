import { Injectable } from "@angular/core";
import { ConId } from "src/app/interfaces/conId";
import { InformeLiq } from "src/app/interfaces/informe-liq";
import { InformeOpNuevo } from "src/app/interfaces/informe-op-nuevo";
import {
  collection,
  doc,
  DocumentReference,
  Firestore,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  WriteBatch,
  writeBatch,
} from "@angular/fire/firestore";
import { FinanzasResumenService } from "../finanzas/finanzas-resumen.service";
import { EstadoOp, Operacion } from "src/app/interfaces/operacion";
import { chunk } from "lodash";
import {
  CrearLiquidacionParams,
  LiquidacionBuilderService,
} from "./liquidacion-builder.service";

export interface ProcesarParams {
  informesOp: ConId<InformeOpNuevo>[];
  tipo: "cliente" | "chofer" | "proveedor";
  componenteInfLiq: string;
  informeLiq: InformeLiq;
  modo: "factura" | "proforma";
}

export interface AnularParams {
  informesOp: ConId<InformeOpNuevo>[],
  tipo: "cliente" | "chofer" | "proveedor",
  informeLiq: ConId<InformeLiq>,
  modo: "factura" | "proforma",
  anuladoMotivo: string;                 //motivo de anulacion
  anuladoPor: string;                 //usuario que realizó la anulación
  fechaAnulacion: string;
}

type OperacionRef = {
  ref: DocumentReference;
  data: Operacion;
};

@Injectable({
  providedIn: "root",
})
export class LiquidacionService {
  basePath: string = `/Vantruck/datos`;
  private LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutos

  constructor(
    private firestore: Firestore,
    private finanzasResumenService: FinanzasResumenService,
    private builder: LiquidacionBuilderService,
  ) {}

  // =====================================================
  // PUNTO DE ENTRADA PARA CREAR iNFORMES
  // =====================================================

  async crearLiquidacion(
    params: CrearLiquidacionParams,
    usuarioId: string,
    proforma?: ConId<InformeLiq>,
    liqProforma?: boolean,
  ): Promise<{ exito: boolean; mensaje: string; informe: any }> {
    let operaciones: Map<string, OperacionRef> | null = null;

    try {
      /* BLOQUEO DE LAS OPERACIONES*/
      operaciones = await this.obtenerOperaciones(params.informesOp);
      await this.bloquearOperaciones(operaciones, usuarioId);

      /* CREAR INFORME LIQUIDACION*/
      let informeLiq: InformeLiq;
      if (liqProforma && proforma) {
        /// SI ES UNA PROFORMA QUE SE QUIERE LIQUIDAR
        const { id, ...rest } = proforma;
        informeLiq = rest as InformeLiq;
        const numeroInterno = await this.builder.generarNumeroInterno(
          proforma.tipo,
          params.modo,
        );

        informeLiq.numeroInterno = numeroInterno;
        informeLiq.estado = 'emitido';
      } else {
        informeLiq = await this.builder.construirInforme(params);
      }

      const parametros: ProcesarParams = {
        informesOp: params.informesOp,
        tipo: params.tipo,
        componenteInfLiq: params.modo === "factura" ? "resumenLiq" : "proforma",
        informeLiq: informeLiq,
        modo: params.modo,
      };
      let resultado: { exito: boolean; mensaje: string } = {
        exito: true,
        mensaje: "",
      };

      /* BLOQUES PARA EL BATCH */
      const bloques = chunk(parametros.informesOp, 100);

      for (const bloque of bloques) {
        const batch = writeBatch(this.firestore);

        const parametrosBloque: ProcesarParams = {
          ...parametros,
          informesOp: bloque,
        };

        if (params.modo === "factura") {
          resultado = await this.procesarInformeLiq(
            parametrosBloque,
            batch,
            operaciones,
          );
        } else {
          resultado = await this.procesarProforma(
            parametrosBloque,
            batch,
            operaciones,
          );
        }

        if (!resultado.exito) {
          throw new Error(resultado.mensaje);
        }

        /* ELIMINAR LA PROFORMA DE SU COLECCIÓN SI ES NECESARIO */
        if (liqProforma && proforma) await this.bajaProforma(batch, proforma);

        await batch.commit();
      }

      // actualizar resumen financiero
      if (params.modo === "factura") {
        try {
          await this.finanzasResumenService.aplicarNuevaLiquidacion(informeLiq);
        } catch (error) {
          console.error("Error actualizando resumen financiero", error);
        }
      }
      let respuesta = {
        exito: resultado.exito,
        mensaje: resultado.mensaje,
        informe: informeLiq,
      };
      return respuesta;
    } catch (error: any) {
      return {
        exito: false,
        mensaje: error.message ?? "Error al crear la liquidación",
        informe: null,
      };
    } finally {
      if (operaciones) {
        await this.desbloquearOperaciones(operaciones);
      }
    }
  }

  // =====================================================
  // PROCESAR FACTURA
  // =====================================================

  /** Transiciona cada InformeOp seleccionado a 'liquidado' (acepta origen
   *  'activo' o 'proforma' — liquidar una proforma existente pasa por acá
   *  también) y crea el InformeLiq. Ya no mueve el documento entre
   *  colecciones — colección única, solo cambia estado + idInfLiq. */
  async procesarInformeLiq(
    params: ProcesarParams,
    batch: WriteBatch,
    operaciones: Map<string, OperacionRef>,
  ): Promise<{ exito: boolean; mensaje: string }> {
    await this.verificarEstadoInformes(params.informesOp, ['activo', 'proforma']);
    await this.verificarInformeLiqDestino(params.informeLiq, params.componenteInfLiq);

    const informeLiqRef = doc(
      collection(this.firestore, `${this.basePath}/${params.componenteInfLiq}`),
    );

    for (const informeOp of params.informesOp) {
      const op = operaciones.get(informeOp.idOperacion);

      if (!op) {
        throw new Error(`Operacion ${informeOp.idOperacion} no encontrada`);
      }

      const nuevoEstado = this.actualizarOperacionInfOp(
        op.data.estado,
        params.tipo,
      );

      batch.update(op.ref, {
        estado: nuevoEstado,
      });

      const informeRef = doc(
        this.firestore,
        `${this.basePath}/informesOp/${informeOp.idInfOp}`,
      );

      batch.update(informeRef, {
        estado: 'liquidado',
        idInfLiq: informeLiqRef.id,
      });

      // Mismo criterio asimétrico que el modelo viejo: solo el lado
      // chofer/proveedor anota a su contraparte (siempre cliente) — ver
      // razonamiento en el mensaje.
      if (params.tipo !== "cliente" && informeOp.contraParte.idInfOp) {
        const contraRef = doc(
          this.firestore,
          `${this.basePath}/informesOp/${informeOp.contraParte.idInfOp}`,
        );
        batch.update(contraRef, { bloqueadoPorContraparte: false });
      }
    }

    batch.set(informeLiqRef, {
      ...params.informeLiq,
      id: informeLiqRef.id,
    });

    return {
      exito: true,
      mensaje: "El informe de Liquidación se procesó con éxito.",
    };
  }

  // =====================================================
  // PROCESAR PROFORMA
  // =====================================================

  async procesarProforma(
    params: ProcesarParams,
    batch: WriteBatch,
    operaciones: Map<string, OperacionRef>,
  ): Promise<{ exito: boolean; mensaje: string }> {
    await this.verificarEstadoInformes(params.informesOp, ['activo']);
    await this.verificarInformeLiqDestino(params.informeLiq, params.componenteInfLiq);

    const informeLiqRef = doc(
      collection(this.firestore, `${this.basePath}/${params.componenteInfLiq}`),
    );

    for (const informeOp of params.informesOp) {
      const op = operaciones.get(informeOp.idOperacion);

      if (!op) {
        throw new Error(`Operacion ${informeOp.idOperacion} no encontrada`);
      }

      const nuevoEstado = this.actualizarOperacionProforma(
        op.data.estado,
        params.tipo,
      );

      batch.update(op.ref, {
        estado: nuevoEstado,
      });

      const informeRef = doc(
        this.firestore,
        `${this.basePath}/informesOp/${informeOp.idInfOp}`,
      );

      batch.update(informeRef, {
        estado: 'proforma',
        idInfLiq: informeLiqRef.id,
      });

      if (params.tipo !== "cliente" && informeOp.contraParte.idInfOp) {
        const contraRef = doc(
          this.firestore,
          `${this.basePath}/informesOp/${informeOp.contraParte.idInfOp}`,
        );
        batch.update(contraRef, { bloqueadoPorContraparte: true });
      }
    }

    batch.set(informeLiqRef, {
      ...params.informeLiq,
      id: informeLiqRef.id,
    });

    return { exito: true, mensaje: "La Proforma se procesó con éxito." };
  }

  // =====================================================
  // OPERACIONES
  // =====================================================

  async obtenerOperacion(idOperacion: number) {
    const q = query(
      collection(this.firestore, `${this.basePath}/operaciones`),
      where("idOperacion", "==", idOperacion),
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error(`Operacion ${idOperacion} no encontrada`);
    }

    if (snap.size > 1) {
      throw new Error(
        `Hay múltiples operaciones con idOperacion ${idOperacion}`,
      );
    }

    const docSnap = snap.docs[0];

    return {
      ref: docSnap.ref,
      data: docSnap.data() as Operacion,
    };
  }

  async obtenerOperaciones(
    informesOp: ConId<InformeOpNuevo>[],
  ): Promise<Map<string, OperacionRef>> {
    const operacionesMap = new Map<string, OperacionRef>();

    const ids = [...new Set(informesOp.map((i) => i.idOperacion))];

    const bloques = chunk(ids, 10);

    for (const bloque of bloques) {
      const q = query(
        collection(this.firestore, `${this.basePath}/operaciones`),
        where("idOperacion", "in", bloque),
      );

      const snap = await getDocs(q);

      snap.docs.forEach((docSnap) => {
        const data = docSnap.data() as Operacion;

        operacionesMap.set(data.idOperacion, {
          ref: docSnap.ref,
          data,
        });
      });
    }

    for (const id of ids) {
      if (!operacionesMap.has(id)) {
        throw new Error(`Operacion ${id} no encontrada`);
      }
    }

    return operacionesMap;
  }

  // =====================================================
  // INFORMES
  // =====================================================

  /** Guarda de concurrencia — lee cada InformeOp FRESCO desde Firestore (no
   *  confía en el estado en memoria que trae el caller, que puede estar
   *  desactualizado si alguien más ya lo procesó) y verifica que su estado
   *  actual esté entre los esperados antes de transicionarlo. Reemplaza a
   *  verificarInformesOpOrigen + verificarInformeOpDestino del modelo viejo
   *  (que hacían el mismo pre-check pero vía query a la colección origen/
   *  destino — hoy innecesario: colección única, se lee por id directo,
   *  porque idInfOp === id del documento). */
  private async verificarEstadoInformes(
    informes: ConId<InformeOpNuevo>[],
    estadosEsperados: InformeOpNuevo['estado'][],
  ): Promise<void> {
    const checks = informes.map(async (inf) => {
      const ref = doc(this.firestore, `${this.basePath}/informesOp/${inf.idInfOp}`);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        throw new Error(`Pre-Check: no existe el InformeOp ${inf.idInfOp}`);
      }
      const estadoActual = (snap.data() as InformeOpNuevo).estado;
      if (!estadosEsperados.includes(estadoActual)) {
        throw new Error(
          `Pre-Check: el InformeOp ${inf.idInfOp} está en estado '${estadoActual}', se esperaba uno de [${estadosEsperados.join(', ')}].`,
        );
      }
    });

    await Promise.all(checks);
  }

  async verificarInformeLiqDestino(
    informe: InformeLiq,
    componenteDestino: string,
  ) {
    const informesLiqRef = collection(
      this.firestore,
      `${this.basePath}/${componenteDestino}`,
    );

    const InformeLiqQuery = query(
      informesLiqRef,
      where("idInfLiq", "==", informe.idInfLiq),
    );
    const InformeLiqSnap = await getDocs(InformeLiqQuery);
    if (!InformeLiqSnap.empty) {
      throw new Error(
        `Pre-Check: Ya existe una informe con idInfLiq ${informe.idInfLiq} en ${componenteDestino}`,
      );
    }
  }

  // =====================================================
  // OPERACION ESTADO
  // =====================================================

  actualizarOperacionProforma(
    estado: EstadoOp,
    modo: "cliente" | "chofer" | "proveedor",
  ) {
    const nuevoEstado: EstadoOp = {
      ...estado,
      proforma: { ...estado.proforma },
      liquidacion: { ...estado.liquidacion },
    };

    if (modo === "cliente") {
      nuevoEstado.proforma.cliente = true;
    } else {
      nuevoEstado.proforma.chofer = true;
    }

    return nuevoEstado;
  }

  actualizarOperacionInfOp(
    estado: EstadoOp,
    modo: "cliente" | "chofer" | "proveedor",
  ) {
    const nuevoEstado: EstadoOp = {
      ...estado,
      proforma: { ...estado.proforma },
      liquidacion: { ...estado.liquidacion },
    };

    if (modo === "cliente") {
      nuevoEstado.liquidacion.cliente = true;
      nuevoEstado.proforma.cliente = false;
    } else {
      nuevoEstado.liquidacion.chofer = true;
      nuevoEstado.proforma.chofer = false;
    }

    if (nuevoEstado.liquidacion.cliente && nuevoEstado.liquidacion.chofer) {
      nuevoEstado.ciclo = "liquidada";
    }

    return nuevoEstado;
  }

  // =====================================================
  // INFORMES UPDATE
  // =====================================================

  actualizarInformeLiq(
    informeLiq: InformeLiq,
    anuladorPor: string,
    anuladoMotivo:string,
    anuladoFecha: string,
  ) {
    return {
      ...informeLiq,
      estado: 'anulado',
      anuladoMotivo: anuladoMotivo,
      anuladoPor: anuladorPor,
      fechaAnulacion: anuladoFecha
    };
  }

  // =====================================================
  // REVERTIR INFORMES
  // =====================================================

  /** Revierte una proforma a 'activo'. Agregué el guard de
   *  verificarEstadoInformes acá (el original no lo tenía en este método
   *  puntual, sí en procesarInformeLiq/procesarProforma — parece un
   *  descuido). Avisame si preferís que lo saque para fidelidad estricta
   *  con el comportamiento anterior. */
  async revertirProforma(
    parametros: ProcesarParams,
    batch: WriteBatch,
    operaciones: Map<string, OperacionRef>,
    proforma: ConId<InformeLiq>
  ) : Promise<{ exito: boolean; mensaje: string }>  {
    await this.verificarEstadoInformes(parametros.informesOp, ['proforma']);

    for (const informeOp of parametros.informesOp) {
      const op = operaciones.get(informeOp.idOperacion);

      if (!op) {
        throw new Error(`Operacion ${informeOp.idOperacion} no encontrada`);
      }

      const nuevoEstado: EstadoOp = {
        ...op.data.estado,
        proforma: { ...op.data.estado.proforma },
        liquidacion: { ...op.data.estado.liquidacion },
      };

      if (parametros.tipo === "cliente") {
        nuevoEstado.proforma.cliente = false;
      } else {
        nuevoEstado.proforma.chofer = false;
      }

      batch.update(op.ref, {
        estado: nuevoEstado,
      });

      const informeRef = doc(
        this.firestore,
        `${this.basePath}/informesOp/${informeOp.idInfOp}`,
      );

      batch.update(informeRef, {
        estado: 'activo',
        idInfLiq: null,
      });

      if (parametros.tipo !== "cliente" && informeOp.contraParte.idInfOp) {
        const contraRef = doc(
          this.firestore,
          `${this.basePath}/informesOp/${informeOp.contraParte.idInfOp}`,
        );
        batch.update(contraRef, { bloqueadoPorContraparte: false });
      }
    }

    /* ELIMINAR LA PROFORMA DE SU COLECCIÓN */
    await this.bajaProforma(batch, proforma);

    return {
      exito: true,
      mensaje: "El informe de Liquidación se procesó con éxito.",
    };
  }

  /** Revierte una factura a 'activo'. NOTA: igual que el modelo viejo, NO
   *  toca bloqueadoPorContraparte acá — el original tampoco lo hacía en
   *  este método (calculaba `contrapartes` y nunca lo usaba). Gap
   *  preexistente, lo preservo tal cual — no es parte de este cutover. */
  async revertirInformeLiq(
    parametros: ProcesarParams,
    batch: WriteBatch,
    operaciones: Map<string, OperacionRef>,
    informeLiq: ConId<InformeLiq>,
    anuladorPor: string,
    anuladoMotivo:string,
    anuladoFecha: string,
  ): Promise<{ exito: boolean; mensaje: string }> {
    await this.verificarEstadoInformes(parametros.informesOp, ['liquidado']);

    for (const informeOp of parametros.informesOp) {
      const op = operaciones.get(informeOp.idOperacion);

      if (!op) {
        throw new Error(`Operacion ${informeOp.idOperacion} no encontrada`);
      }

      const nuevoEstado: EstadoOp = {
        ...op.data.estado,
        proforma: { ...op.data.estado.proforma },
        liquidacion: { ...op.data.estado.liquidacion },
      };

      if (informeLiq.tipo === "cliente") {
        nuevoEstado.liquidacion.cliente = false;
      } else {
        nuevoEstado.liquidacion.chofer = false;
      }

      nuevoEstado.ciclo = "cerrada";

      batch.update(op.ref, {
        estado: nuevoEstado,
      });

      const informeRef = doc(
        this.firestore,
        `${this.basePath}/informesOp/${informeOp.idInfOp}`,
      );

      batch.update(informeRef, {
        estado: 'activo',
        idInfLiq: null,
      });
    }

    const infLiqRef = doc(
      this.firestore,
      `${this.basePath}/${parametros.componenteInfLiq}`,
      informeLiq.id,
    );

    const infActualizado = this.actualizarInformeLiq(parametros.informeLiq, anuladorPor, anuladoMotivo, anuladoFecha);

    batch.update(infLiqRef, infActualizado );

    return {
      exito: true,
      mensaje: "El informe de Liquidación se procesó con éxito.",
    };
  }

  // =====================================================
  // BLOQUEO DE OPERACIONES
  // =====================================================

  async bloquearOperaciones(
    operaciones: Map<string, OperacionRef>,
    usuario: string,
  ) {
    const now = Date.now();
    const updates = [];

    for (const op of operaciones.values()) {
      const lock = op.data.lockLiquidacion;

      if (lock) {
        const expirado = now - lock.timestamp > this.LOCK_TIMEOUT;

        if (!expirado) {
          throw new Error(
            `Operacion ${op.data.idOperacion} está siendo liquidada por ${lock.usuario}`,
          );
        }
      }

      updates.push(
        setDoc(
          op.ref,
          {
            lockLiquidacion: {
              usuario,
              timestamp: now,
            },
          },
          { merge: true },
        ),
      );

      op.data.lockLiquidacion = {
        usuario,
        timestamp: now,
      };
    }

    await Promise.all(updates);
  }

  async desbloquearOperaciones(operaciones: Map<string, OperacionRef>) {
    const updates = [];

    for (const op of operaciones.values()) {
      updates.push(setDoc(op.ref, { lockLiquidacion: null }, { merge: true }));

      delete op.data.lockLiquidacion;
    }

    await Promise.all(updates);
  }

  // =====================================================
  // HELPER
  // =====================================================

  private async procesarEnBloques<T>(
    items: T[],
    size: number,
    handler: (bloque: T[], batch: WriteBatch) => Promise<void>,
  ) {
    const bloques = chunk(items, size);

    for (const bloque of bloques) {
      const batch = writeBatch(this.firestore);

      await handler(bloque, batch);

      await batch.commit();
    }
  }

  // =====================================================
  // PUNTO DE ENTRADA PARA ANULAR iNFORMES
  // =====================================================
  async anularLiquidacion(
    params: AnularParams
  ): Promise<{ exito: boolean; mensaje: string; informe: any }> {
    let operaciones: Map<string, OperacionRef> | null = null;

    try {
      /* BLOQUEO DE LAS OPERACIONES*/
      operaciones = await this.obtenerOperaciones(params.informesOp);
      await this.bloquearOperaciones(operaciones, params.anuladoPor);

      let {id, ...infLiqSinId} = params.informeLiq;

      const parametros: ProcesarParams = {
        informesOp: params.informesOp,
        tipo: params.tipo,
        componenteInfLiq: params.modo === "factura" ? "resumenLiq" : "proforma",
        informeLiq: infLiqSinId,
        modo: params.modo,
      };
      let resultado: { exito: boolean; mensaje: string } = {
        exito: true,
        mensaje: "",
      };

      /* BLOQUES PARA EL BATCH */
      const bloques = chunk(parametros.informesOp, 100);

      for (const bloque of bloques) {
        const batch = writeBatch(this.firestore);

        const parametrosBloque: ProcesarParams = {
          ...parametros,
          informesOp: bloque,
        };

        if (params.modo === "factura") {
          resultado = await this.revertirInformeLiq(
            parametrosBloque,
            batch,
            operaciones,
            params.informeLiq,
            params.anuladoPor,
            params.anuladoMotivo,
            params.fechaAnulacion
          );
        } else {
          resultado = await this.revertirProforma(
            parametrosBloque,
            batch,
            operaciones,
            params.informeLiq,
          );
        }

        if (!resultado.exito) {
          throw new Error(resultado.mensaje);
        }

        await batch.commit();
      }

      // actualizar resumen financiero
      if (params.modo === "factura") {
        try {
          await this.finanzasResumenService.revertirLiquidacion(params.informeLiq);
        } catch (error) {
          console.error("Error actualizando resumen financiero", error);
        }
      }
      let respuesta = {
        exito: resultado.exito,
        mensaje: resultado.mensaje,
        informe: params.informeLiq,
      };
      return respuesta;
    } catch (error: any) {
      return {
        exito: false,
        mensaje: error.message ?? "Error al crear la liquidación",
        informe: null,
      };
    } finally {
      if (operaciones) {
        await this.desbloquearOperaciones(operaciones);
      }
    }
  }

  // =====================================================
  // BAJA PROFORMA
  // =====================================================

  async bajaProforma(batch: WriteBatch, informe: ConId<InformeLiq>) {
    const informeProfRef = collection(
      this.firestore,
      `${this.basePath}/proforma`,
    );

    const InformeLiqQuery = query(
      informeProfRef,
      where("idInfLiq", "==", informe.idInfLiq),
    );
    const InformeLiqSnap = await getDocs(InformeLiqQuery);
    if (InformeLiqSnap.empty) {
      throw new Error(
        `Pre-Check: No existe una proforma con idInfLiq ${informe.idInfLiq} en la colección proforma`,
      );
    }

    const informeProformaRef = doc(
      this.firestore,
      `${this.basePath}/proforma`,
      informe.id,
    );

    batch.delete(informeProformaRef);
  }
}
