import { Injectable } from "@angular/core";
import { ConId } from "src/app/interfaces/conId";
import { InformeLiq } from "src/app/interfaces/informe-liq";
import { InformeOp } from "src/app/interfaces/informe-op";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentReference,
  Firestore,
  getDoc,
  getDocs,
  query,
  QueryDocumentSnapshot,
  setDoc,
  where,
  WriteBatch,
  writeBatch,
  deleteField,
} from "@angular/fire/firestore";
import { FinanzasResumenService } from "../finanzas/finanzas-resumen.service";
import { EstadoOp, Operacion } from "src/app/interfaces/operacion";
import { chunk } from "lodash";
import {
  CrearLiquidacionParams,
  LiquidacionBuilderService,
} from "./liquidacion-builder.service";

export interface ProcesarParams {
  informesOp: ConId<InformeOp>[];
  tipo: "cliente" | "chofer" | "proveedor";
  componenteAlta: string;
  componenteBaja: string;
  componenteInfLiq: string;
  informeLiq: InformeLiq;
  modo: "factura" | "proforma";
}

export interface AnularParams {
  informesOp: ConId<InformeOp>[],
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
    let operaciones: Map<number, OperacionRef> | null = null;
    console.log("usuarioId: ", usuarioId);

    try {
      /* BLOQUEO DE LAS OPERACIONES*/
      operaciones = await this.obtenerOperaciones(params.informesOp);
      console.log("operaciones", operaciones);
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
        componenteBaja: this.getColNoLiq(informeLiq.tipo),
        componenteAlta: this.getColLiq(informeLiq.tipo),
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

  async procesarInformeLiq(
    params: ProcesarParams,
    batch: WriteBatch,
    operaciones: Map<number, OperacionRef>,
  ): Promise<{ exito: boolean; mensaje: string }> {
    await this.verificarInformesOpOrigen(
      params.informesOp,
      params.componenteBaja,
    );

    await this.verificarInformeOpDestino(
      params.informesOp,
      params.componenteAlta,
    );

    await this.verificarInformeLiqDestino(
      params.informeLiq,
      params.componenteInfLiq,
    );

    let contrapartes: Map<number, DocumentReference> | null = null;
    if (params.tipo !== "cliente") {
      const ids = params.informesOp.map((i) => i.idOperacion);
      contrapartes = await this.obtenerContrapartes(ids);
    }

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

      const informeOrigenRef = doc(
        this.firestore,
        `${this.basePath}/${params.componenteBaja}`,
        informeOp.id,
      );

      const informeDestinoRef = doc(
        this.firestore,
        `${this.basePath}/${params.componenteAlta}`,
        informeOp.id,
      );

      const inf = this.actualizarInformeOp(informeOp);

      batch.set(informeDestinoRef, inf);

      batch.delete(informeOrigenRef);

      if (contrapartes) {
        await this.actualizarContraParte(
          batch,
          informeOp,
          params.modo,
          contrapartes,
        );
      }
    }

    const informeLiqRef = doc(
      collection(this.firestore, `${this.basePath}/${params.componenteInfLiq}`),
    );

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
    operaciones: Map<number, OperacionRef>,    
  ): Promise<{ exito: boolean; mensaje: string }> {
    await this.verificarInformesOpOrigen(
      params.informesOp,
      params.componenteBaja,
    );

    await this.verificarInformeLiqDestino(
      params.informeLiq,
      params.componenteInfLiq,
    );

    let contrapartes: Map<number, DocumentReference> | null = null;
    if (params.tipo !== "cliente") {
      const ids = params.informesOp.map((i) => i.idOperacion);
      contrapartes = await this.obtenerContrapartes(ids);
    }

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

      const informeOrigenRef = doc(
        this.firestore,
        `${this.basePath}/${params.componenteBaja}`,
        informeOp.id,
      );

      const infActualizado = this.actualizarInformeProforma(informeOp, true);

      batch.update(informeOrigenRef, infActualizado);

      //Si modo !== 'clientes', buscar contra parte y marcarla
      if (contrapartes) {
        await this.actualizarContraParte(
          batch,
          informeOp,
          params.modo,
          contrapartes,
        );
      }
    }

    const informeLiqRef = doc(
      collection(this.firestore, `${this.basePath}/${params.componenteInfLiq}`),
    );

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
    informesOp: InformeOp[],
  ): Promise<Map<number, OperacionRef>> {
    const operacionesMap = new Map<number, OperacionRef>();

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

  async verificarInformesOpOrigen(
    informes: ConId<InformeOp>[],
    componenteOrigen: string,
  ) {
    const informesOpRef = collection(
      this.firestore,
      `${this.basePath}/${componenteOrigen}`,
    );

    const checks = informes.map(async (inf) => {
      const informesOpQuery = query(
        informesOpRef,
        where("idInfOp", "==", inf.idInfOp),
      );
      const facturaSnap = await getDocs(informesOpQuery);
      if (facturaSnap.empty) {
        throw new Error(
          `Pre-Check: No existe un informe con id ${inf.idInfOp} en ${componenteOrigen}`,
        );
      }
    });

    await Promise.all(checks);
  }

  async verificarInformeOpDestino(
    informes: ConId<InformeOp>[],
    componenteDestino: string,
  ) {
    const informesOpRef = collection(
      this.firestore,
      `${this.basePath}/${componenteDestino}`,
    );

    const checks = informes.map(async (inf) => {
      const informesOpQuery = query(
        informesOpRef,
        where("idInfOp", "==", inf.idInfOp),
      );
      const facturaSnap = await getDocs(informesOpQuery);
      if (!facturaSnap.empty) {
        throw new Error(
          `Pre-Check: Ya existe un informe con id ${inf.idInfOp} en ${componenteDestino}`,
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
  // CONTRAPARTE
  // =====================================================

  async obtenerContrapartes(idsOperacion: number[]) {
    const bloques = chunk(idsOperacion, 10);
    const map = new Map<number, DocumentReference>();

    for (const bloque of bloques) {
      const q = query(
        collection(this.firestore, `${this.basePath}/informesOpClientes`),
        where("idOperacion", "in", bloque),
      );

      const snap = await getDocs(q);

      snap.docs.forEach((docSnap) => {
        const data = docSnap.data() as InformeOp;

        map.set(data.idOperacion, docSnap.ref);
      });
    }

    return map;
  }

  actualizarContraParte(
    batch: WriteBatch,
    informe: ConId<InformeOp>,
    modo: "factura" | "proforma",
    contrapartes: Map<number, DocumentReference>,
  ) {
    const contraRef = contrapartes.get(informe.idOperacion);

    if (!contraRef) return;

    if (modo === "proforma") {
      batch.update(contraRef, { contraParteProforma: true });
    } else {
      batch.update(contraRef, { contraParteProforma: false });
    }
  }

  // =====================================================
  // OPERACION ESTADO
  // =====================================================

  actualizarOperacionProforma(
    estado: any,
    modo: "cliente" | "chofer" | "proveedor",
  ) {
    const nuevoEstado = { ...estado };

    if (modo === "cliente") {
      nuevoEstado.cerrada = false;
      nuevoEstado.proformaCl = true;
      nuevoEstado.proformaCh = false;
    } else {
      nuevoEstado.cerrada = false;
      nuevoEstado.proformaCl = false;
      nuevoEstado.proformaCh = true;
    }

    return nuevoEstado;
  }

  actualizarOperacionInfOp(
    estado: EstadoOp,
    modo: "cliente" | "chofer" | "proveedor",
  ) {
    const nuevoEstado = { ...estado };

    if (modo === "cliente") {
      nuevoEstado.cerrada = false;
      nuevoEstado.facCliente = true;
    } else {
      nuevoEstado.cerrada = false;
      nuevoEstado.facChofer = true;
    }

    nuevoEstado.proformaCh = false;
    nuevoEstado.proformaCl = false;

    nuevoEstado.facturada = nuevoEstado.facCliente && nuevoEstado.facChofer;

    if (nuevoEstado.facturada) {
      nuevoEstado.facCliente = false;
      nuevoEstado.facChofer = false;
    }

    return nuevoEstado;
  }

  // =====================================================
  // INFORMES UPDATE
  // =====================================================

  actualizarInformeProforma(informe: ConId<InformeOp>, valor: boolean) {
    return {
      ...informe,
      proforma: valor,
    };
  }

  actualizarInformeOp(informeOp: ConId<InformeOp>) {
    return {
      ...informeOp,
      proforma: false,
      liquidacion: true,
    };
  }

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
  async revertirProforma(
    parametros: ProcesarParams,
    batch: WriteBatch,
    operaciones: Map<number, OperacionRef>,
    proforma: ConId<InformeLiq>
  ) : Promise<{ exito: boolean; mensaje: string }>  {    

    const ids = [...new Set(parametros.informesOp.map((i) => i.idOperacion))];

    let contrapartes: Map<number, DocumentReference> | null = null;
    if (parametros.tipo !== "cliente") {
      contrapartes = await this.obtenerContrapartes(ids);
    }    

     for (const informeOp of parametros.informesOp) {
      const op = operaciones.get(informeOp.idOperacion);

      if (!op) {
        throw new Error(`Operacion ${informeOp.idOperacion} no encontrada`);
      }

      const nuevoEstado = { ...op.data.estado };

        nuevoEstado.cerrada = nuevoEstado.facCliente
          ? false
          : nuevoEstado.facChofer
            ? false
            : true;
        nuevoEstado.proformaCl = false;
        nuevoEstado.proformaCh = false;

        batch.update(op.ref, {
          estado: nuevoEstado,
        });

      const origenRef = doc(
        this.firestore,
        `${this.basePath}/${parametros.componenteBaja}`,
        informeOp.id,
      );

      const infActualizado = this.actualizarInformeProforma(informeOp, false);

      batch.update(origenRef, infActualizado);

      //Si modo !== 'clientes', buscar contra parte y marcarla
      if (contrapartes) {
        await this.actualizarContraParte(
          batch,
          informeOp,
          'factura',  //se usa factura para que asigne falso a la propiedad contraParteProforma
          contrapartes,
        );
      }

    }

     /* ELIMINAR LA PROFORMA DE SU COLECCIÓN */
      await this.bajaProforma(batch, proforma );

      return {
      exito: true,
      mensaje: "El informe de Liquidación se procesó con éxito.",
    };
  }

  async revertirInformeLiq(
    parametros: ProcesarParams,
    batch: WriteBatch,
    operaciones: Map<number, OperacionRef>,
    informeLiq: ConId<InformeLiq>,
    anuladorPor: string,
    anuladoMotivo:string,
    anuladoFecha: string, 
  ): Promise<{ exito: boolean; mensaje: string }> {
    const ids = [...new Set(parametros.informesOp.map((i) => i.idOperacion))];

    let contrapartes: Map<number, DocumentReference> | null = null;
    if (parametros.tipo !== "cliente") {
      contrapartes = await this.obtenerContrapartes(ids);
    }
    for (const informeOp of parametros.informesOp) {
      const op = operaciones.get(informeOp.idOperacion);

      if (!op) {
        throw new Error(`Operacion ${informeOp.idOperacion} no encontrada`);
      }

      const nuevoEstado = { ...op.data.estado };
      // 🔸 Reaplicar lógica de actualización de estados
      if (nuevoEstado.facturada) {
        nuevoEstado.facturada = false;
        if (informeLiq.tipo === 'cliente') nuevoEstado.facChofer = true;
        else nuevoEstado.facCliente = true;
      } else {
        if (informeLiq.tipo === 'cliente') nuevoEstado.facCliente = false;
        else nuevoEstado.facChofer = false;

        if (!nuevoEstado.proformaCl && !nuevoEstado.proformaCh) nuevoEstado.cerrada = true;
      }

      batch.update(op.ref, {
        estado: nuevoEstado,
      });

      const origenRef = doc(
        this.firestore,
        `${this.basePath}/${parametros.componenteBaja}`,
        informeOp.id,
      );

      const destinoRef = doc(
        this.firestore,
        `${this.basePath}/${parametros.componenteAlta}`,
        informeOp.id,
      );

      batch.set(destinoRef, {
        ...informeOp,
        liquidacion: false,
      });

      batch.delete(origenRef);
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
    operaciones: Map<number, OperacionRef>,
    usuario: string,
  ) {
    const now = Date.now();
    const updates = [];

    for (const op of operaciones.values()) {
      const lock = op.data.lockLiquidacion;
      console.log("op: ", op);
      console.log("usuario: ", usuario);
      console.log("lock", lock);
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

  async desbloquearOperaciones(operaciones: Map<number, OperacionRef>) {
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

  private getColLiq(tipo: "cliente" | "chofer" | "proveedor"): string {
    switch (tipo) {
      case "cliente":
        return "infOpLiqClientes";
      case "chofer":
        return "infOpLiqChoferes";
      case "proveedor":
        return "infOpLiqProveedores";
      default:
        throw new Error(`Tipo de informe inválido: ${tipo}`);
    }
  }

  private getColNoLiq(tipo: "cliente" | "chofer" | "proveedor"): string {
    switch (tipo) {
      case "cliente":
        return "informesOpClientes";
      case "chofer":
        return "informesOpChoferes";
      case "proveedor":
        return "informesOpProveedores";
      default:
        throw new Error(`Tipo de informe inválido: ${tipo}`);
    }
  }
  // =====================================================
  // PUNTO DE ENTRADA PARA ANULAR iNFORMES
  // =====================================================
  async anularLiquidacion(    
    params: AnularParams
  ): Promise<{ exito: boolean; mensaje: string; informe: any }> {
    let operaciones: Map<number, OperacionRef> | null = null;    

    try {
      /* BLOQUEO DE LAS OPERACIONES*/
      operaciones = await this.obtenerOperaciones(params.informesOp);      
      await this.bloquearOperaciones(operaciones, params.anuladoPor);

      let {id, ...infLiqSinId} = params.informeLiq;

      const parametros: ProcesarParams = {
        informesOp: params.informesOp,
        tipo: params.tipo,
        componenteBaja:
          params.modo === "proforma"
            ? this.getColNoLiq(params.informeLiq.tipo)
            : this.getColLiq(params.informeLiq.tipo), ///depende del tipo de accion
        componenteAlta: this.getColNoLiq(params.informeLiq.tipo),
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

        /* ELIMINAR LA PROFORMA DE SU COLECCIÓN SI ES NECESARIO */
        //if (liqProforma && proforma) await this.bajaProforma(batch, proforma);

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
