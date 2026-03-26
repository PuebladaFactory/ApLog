import { Injectable, inject } from "@angular/core";
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  runTransaction,
  DocumentReference,
} from "@angular/fire/firestore";

import {
  MovimientoFinanciero,
  ImputacionMovimiento,
} from "src/app/interfaces/movimiento-financiero";
import { MovimientoFormVM } from "src/app/interfaces/movimiento-form-v-m";
import { InformeLiq } from "src/app/interfaces/informe-liq";
import { ConId } from "src/app/interfaces/conId";

import { NumeradorService } from "../numerador/numerador.service";
import { SaldoEngine } from "./saldo-engine.service";
import { MovimientoImpresionVM } from "src/app/interfaces/movimiento-impresion-v-m";
import { ResumenFinancieroEntidad } from "src/app/interfaces/resumen-financiero-entidad";
import { FinanzasResumenService } from "./finanzas-resumen.service";

@Injectable({
  providedIn: "root",
})
export class MovimientoFinancieroService {
  private firestore = inject(Firestore);
  basePath: string = "/Vantruck/datos";

  constructor(
    private numeradorService: NumeradorService,
    private finanzasResumenService: FinanzasResumenService,
  ) {}

  // =====================================================
  // 🔹 CONSULTAS
  // =====================================================

  async getInformesPendientesPorEntidad(
    entidadId: number,
  ): Promise<ConId<InformeLiq>[]> {
    const colRef = collection(this.firestore, `${this.basePath}/resumenLiq`);

    const q = query(
      colRef,
      where("entidad.id", "==", entidadId),
      where("estado", "==", "facturado"),
      where("estadoFinanciero", "in", ["pendiente", "parcial"]),
    );

    const snap = await getDocs(q);

    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as InformeLiq),
    }));
  }

  async getMovimientoPorId(
    movimientoId: string,
  ): Promise<ConId<MovimientoFinanciero> | null> {
    const ref = collection(this.firestore, `${this.basePath}/movimientos`);

    const q = query(ref, where("numeroComprobante", "==", movimientoId));

    const snap = await getDocs(q);
    console.log("docSnap: ", snap);

    if (snap.empty) return null;

    const docSnap = snap.docs[0];

    console.log("docSnap: ", docSnap);

    return {
      id: docSnap.id,
      ...(docSnap.data() as MovimientoFinanciero),
    };
  }

  async getMovimientosFiltrados(params: {
    tipoEntidad: "cliente" | "chofer" | "proveedor";
    entidadId: number;
    tipoMovimiento?: "cobro" | "pago";
    fechaDesde?: string;
    fechaHasta?: string;
  }): Promise<(MovimientoFinanciero & { id: string })[]> {
    const colRef = collection(this.firestore, `${this.basePath}/movimientos`);

    const constraints: any[] = [
      where("entidad.tipo", "==", params.tipoEntidad),
      where("entidad.id", "==", params.entidadId),
    ];

    if (params.tipoMovimiento) {
      constraints.push(where("tipo", "==", params.tipoMovimiento));
    }

    // 🔥 IMPORTANTE: usamos fechaOperacion
    if (params.fechaDesde) {
      constraints.push(where("fechaOperacion", ">=", params.fechaDesde));
    }

    if (params.fechaHasta) {
      constraints.push(where("fechaOperacion", "<=", params.fechaHasta));
    }

    constraints.push(orderBy("fechaOperacion", "desc"));

    const q = query(colRef, ...constraints);

    const snap = await getDocs(q);

    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as MovimientoFinanciero),
    }));
  }

  // =====================================================
  // 🔹 REGISTRO DE MOVIMIENTO (transaccional)
  // =====================================================

  async registrarMovimientoFinanciero(
    form: MovimientoFormVM,
    usuarioUid: string,
  ): Promise<number> {
    const movimientosRef = collection(
      this.firestore,
      `${this.basePath}/movimientos`,
    );

    const movRef = doc(movimientosRef);

    const idObj = Date.now() + Math.floor(Math.random() * 1000);
    const creadoEn = new Date().toISOString();

    await runTransaction(this.firestore, async (tx) => {
      // 🔹 1. NUMERADOR (READ)
      const { prefijo, numero } =
        await this.numeradorService.leerProximoNumeroMovimiento(tx, form.tipo);

      const numeroComprobante = `${prefijo}-${numero.toString().padStart(6, "0")}`;

      // 🔹 2. LEER INFORMES
      const informesLeidos: {
        id: string;
        ref: DocumentReference;
        data: InformeLiq;
        monto: number;
      }[] = [];

      for (const inf of form.informesSeleccionados) {
        const infRef = doc(
          this.firestore,
          `${this.basePath}/resumenLiq/${inf.informeLiqId}`,
        );

        const snap = await tx.get(infRef);

        if (!snap.exists()) {
          throw new Error(`Informe ${inf.numeroInterno} no existe`);
        }

        informesLeidos.push({
          id: inf.informeLiqId,
          ref: infRef,
          data: snap.data() as InformeLiq,
          monto: inf.montoACobrar,
        });
      }

      // 🔹 3. LEER RESUMEN (ANTES DE ESCRIBIR)
      const resumenRef = doc(
        this.firestore,
        `${this.basePath}/resumenFinanzas/${form.entidad.tipo}_${form.entidad.id}`,
      );

      const snapResumen = await tx.get(resumenRef);

      if (!snapResumen.exists()) {
        throw new Error("Resumen financiero no existe");
      }

      const resumen = snapResumen.data() as ResumenFinancieroEntidad;

      // 🔹 4. MOTOR
      const resultadoMotor = SaldoEngine.calcularImpactoMovimiento({
        informes: informesLeidos.map((i) => ({
          id: i.id,
          estado: i.data.estado,
          valoresFinancieros: i.data.valoresFinancieros!,
        })),
        imputaciones: informesLeidos.map((i) => ({
          informeId: i.id,
          montoImputado: i.monto,
        })),
      });

      // 🔹 5. ARMAR IMPUTACIONES
      const imputaciones: ImputacionMovimiento[] = informesLeidos.map((i) => ({
        informeLiqId: i.id,
        numeroInterno: i.data.numeroInterno,
        fechaInforme:
          typeof i.data.fecha === "string"
            ? i.data.fecha
            : i.data.fecha.toISOString().substring(0, 10),
        mesLiquidado: i.data.mes,
        periodoLiquidado: i.data.periodo,
        totalInforme: i.data.valores.total,
        montoImputado: i.monto,
        saldoInforme: i.data.valoresFinancieros!.saldo,
      }));

      const informeLiqIds = informesLeidos.map((i) => i.id);

      // 🔹 6. ARMAR MOVIMIENTO
      const movimiento: MovimientoFinanciero = {
        fecha: creadoEn.substring(0, 10),
        fechaOperacion: form.fechaOperacion,
        idMovFinanciero: idObj,
        numeroComprobante,
        tipo: form.tipo,
        entidad: form.entidad,
        imputaciones,
        informeLiqIds,
        totalMovimiento: resultadoMotor.totalMovimiento,
        estado: "activo",
        creadoEn,
        creadoPor: usuarioUid,
        medioPago: form.medioPago,
        referencia: form.referencia,
        observaciones: form.observaciones,
      };

      // 🔹 7. CALCULAR PATCH RESUMEN
      const patch = this.finanzasResumenService.impactarMovimientoEnResumen(
        resumen,
        movimiento,
        "alta",
      );

      // =========================================
      // 🔥 AHORA SÍ: TODAS LAS ESCRITURAS
      // =========================================

      // 🔹 actualizar informes
      for (const actualizado of resultadoMotor.informesActualizados) {
        const original = informesLeidos.find((i) => i.id === actualizado.id)!;

        tx.update(original.ref, {
          valoresFinancieros: actualizado.valoresFinancieros,
          estadoFinanciero: actualizado.estadoFinanciero,
        });
      }

      // 🔹 guardar movimiento
      tx.set(movRef, movimiento);

      // 🔹 actualizar numerador
      const numeradorRef = doc(
        this.firestore,
        `${this.basePath}/numeradores/${prefijo}`,
      );

      tx.set(numeradorRef, { ultimoNumero: numero }, { merge: true });

      // 🔹 actualizar resumen
      tx.update(resumenRef, patch);
    });

    return idObj;
  }

  // =====================================================
  // 🔹 ANULAR MOVIMIENTO (transaccional)
  // =====================================================

  async anularMovimiento(
    movimientoId: string,
    usuarioUid: string,
    motivo: string,
  ): Promise<void> {
    const movRef = doc(
      this.firestore,
      `${this.basePath}/movimientos/${movimientoId}`,
    );

    await runTransaction(this.firestore, async (tx) => {
      const movSnap = await tx.get(movRef);

      if (!movSnap.exists()) {
        throw new Error("Movimiento no existe");
      }

      const movimiento = movSnap.data() as MovimientoFinanciero;

      if (movimiento.estado === "anulado") {
        throw new Error("El movimiento ya está anulado");
      }

      // ===============================
      // 🔹 LEER INFORMES AFECTADOS
      // ===============================

      const informesLeidos: {
        id: string;
        ref: DocumentReference;
        data: InformeLiq;
        monto: number;
      }[] = [];

      for (const imp of movimiento.imputaciones) {
        const infRef = doc(
          this.firestore,
          `${this.basePath}/resumenLiq/${imp.informeLiqId}`,
        );

        const snap = await tx.get(infRef);

        if (!snap.exists()) {
          throw new Error(`Informe ${imp.numeroInterno} no existe`);
        }

        informesLeidos.push({
          id: imp.informeLiqId,
          ref: infRef,
          data: snap.data() as InformeLiq,
          monto: imp.montoImputado,
        });
      }

      const resumenRef = doc(
        this.firestore,
        `${this.basePath}/resumenFinanzas/${movimiento.entidad.tipo}_${movimiento.entidad.id}`,
      );

      const snap = await tx.get(resumenRef);

      if (!snap.exists()) {
        throw new Error("Resumen financiero no existe");
      }

      const resumen = snap.data() as ResumenFinancieroEntidad;

      // ===============================
      // 🔹 REVERSIÓN CON SALDO ENGINE
      // ===============================

      const resultadoMotor = SaldoEngine.revertirImpactoMovimiento({
        informes: informesLeidos.map((i) => ({
          id: i.data.numeroInterno,
          estado: i.data.estado,
          valoresFinancieros: i.data.valoresFinancieros!,
        })),
        imputaciones: informesLeidos.map((i) => ({
          informeId: i.data.numeroInterno,
          montoImputado: i.monto,
        })),
      });

      for (const actualizado of resultadoMotor.informesActualizados) {
        const original = informesLeidos.find(
          (i) => i.data.numeroInterno === actualizado.id,
        )!;

        tx.update(original.ref, {
          valoresFinancieros: actualizado.valoresFinancieros,
          estadoFinanciero: actualizado.estadoFinanciero,
        });
      }

      // ===============================
      // 🔹 MARCAR MOVIMIENTO ANULADO
      // ===============================

      tx.update(movRef, {
        estado: "anulado",
        anuladoEn: new Date().toISOString(),
        anuladoPor: usuarioUid,
        motivoAnulacion: motivo,
      });

      // ===============================
      // 🔹 ACTUALIZAR RESUMEN (MISMA TX)
      // ===============================

      const patch = this.finanzasResumenService.impactarMovimientoEnResumen(
        resumen,
        movimiento,
        "anulacion",
      );

      tx.update(resumenRef, patch);
    });
  }

  armarModeloImpresion(
    mov: MovimientoFinanciero & { id: string },
  ): MovimientoImpresionVM {
    return {
      id: mov.id,

      tipo: mov.tipo,

      titulo: mov.tipo === "cobro" ? "RECIBO DE COBRO" : "ORDEN DE PAGO",

      numeroComprobante: mov.numeroComprobante,

      fechaOperacion: mov.fechaOperacion ?? "",

      estado: mov.estado,

      motivoAnulacion: mov.motivoAnulacion,

      entidad: {
        razonSocial: mov.entidad.razonSocial,
        tipo: mov.entidad.tipo,
      },

      medioPago: mov.medioPago ?? "",
      referencia: mov.referencia,
      observaciones: mov.observaciones,

      total: mov.totalMovimiento,

      creadoEn: mov.creadoEn,

      imputaciones: mov.imputaciones.map((imp) => ({
        informeId: imp.informeLiqId,
        numeroInterno: imp.numeroInterno,
        fechaInforme: imp.fechaInforme,
        mes: imp.mesLiquidado ?? "",
        periodo: imp.periodoLiquidado ?? "",
        totalInforme: imp.totalInforme,
        montoImputado: imp.montoImputado,
      })),
    };
  }
}
