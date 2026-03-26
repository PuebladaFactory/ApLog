import { Injectable } from "@angular/core";
import {
  Firestore,
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  updateDoc,
  where,
} from "@angular/fire/firestore";
import { ConId } from "src/app/interfaces/conId";
import { InformeLiq } from "src/app/interfaces/informe-liq";
import { MovimientoFinanciero } from "src/app/interfaces/movimiento-financiero";
import { ResumenFinancieroEntidad } from "src/app/interfaces/resumen-financiero-entidad";

@Injectable({
  providedIn: "root",
})
export class FinanzasResumenService {
  basePath: string = `/Vantruck/datos`;

  constructor(private firestore: Firestore) {}

  async aplicarNuevaLiquidacion(informe: InformeLiq): Promise<void> {
    const entidadKey = `${informe.tipo}_${informe.entidad.id}`;

    const ref = doc(
      this.firestore,
      `${this.basePath}/resumenFinanzas/${entidadKey}`,
    );

    await runTransaction(this.firestore, async (tx) => {
      const snap = await tx.get(ref);

      const monto = informe.valores.total;

      if (!snap.exists()) {
        const nuevoResumen: ResumenFinancieroEntidad = {
          entidadId: informe.entidad.id.toString(),

          tipoEntidad: informe.tipo,

          razonSocial: informe.entidad.razonSocial,

          cuit: informe.entidad.cuit?.toString(),

          totalFacturado: monto,

          totalCobrado: 0,

          saldoPendiente: monto,

          cantidadInformes: 1,

          cantidadPendientes: 1,

          createdAt: Timestamp.now(),

          updatedAt: Timestamp.now(),
        };

        tx.set(ref, nuevoResumen);

        return;
      }

      const data = snap.data() as ResumenFinancieroEntidad;

      tx.update(ref, {
        totalFacturado: data.totalFacturado + monto,

        saldoPendiente: data.saldoPendiente + monto,

        cantidadInformes: data.cantidadInformes + 1,

        cantidadPendientes: data.cantidadPendientes + 1,

        updatedAt: Timestamp.now(),
      });
    });
  }

  async aplicarPago(
    tipoEntidad: "cliente" | "chofer" | "proveedor",
    entidadId: number,
    monto: number,
    informeCancelado: boolean,
  ): Promise<void> {
    const ref = doc(
      this.firestore,
      `${this.basePath}/resumenFinanzas/${tipoEntidad}_${entidadId}`,
    );

    await runTransaction(this.firestore, async (tx) => {
      const snap = await tx.get(ref);

      if (!snap.exists()) {
        throw new Error("No existe resumen financiero de la entidad");
      }

      const data = snap.data() as ResumenFinancieroEntidad;

      const updateData: any = {
        totalCobrado: data.totalCobrado + monto,

        saldoPendiente: data.saldoPendiente - monto,

        updatedAt: Timestamp.now(),
      };

      if (informeCancelado) {
        updateData.cantidadPendientes = data.cantidadPendientes - 1;
      }

      tx.update(ref, updateData);
    });
  }

  async revertirLiquidacion(informe: InformeLiq): Promise<void> {
    const ref = doc(
      this.firestore,
      `${this.basePath}/resumenFinanzas/${informe.tipo}_${informe.entidad.id}`,
    );

    await runTransaction(this.firestore, async (tx) => {
      const snap = await tx.get(ref);

      if (!snap.exists()) {
        throw new Error("Resumen financiero inexistente");
      }

      const data = snap.data() as ResumenFinancieroEntidad;

      const updateData: any = {
        totalFacturado: data.totalFacturado - informe.valores.total,

        saldoPendiente: data.saldoPendiente - informe.valoresFinancieros.saldo,

        cantidadInformes: data.cantidadInformes - 1,

        updatedAt: Timestamp.now(),
      };

      if (informe.estadoFinanciero !== "cobrado") {
        updateData.cantidadPendientes = data.cantidadPendientes - 1;
      }

      tx.update(ref, updateData);
    });
  }

  /*   async impactarMovimiento(
    movimiento: MovimientoFinanciero,
    tipo: "alta" | "anulacion",
  ) {
    const factor = tipo === "alta" ? 1 : -1;

    const totalImpacto = movimiento.imputaciones.reduce(
      (acc, imp) => acc + imp.montoImputado,
      0,
    );

    const resumenRef = doc(
      this.firestore,
      `resumenFinanciero/${movimiento.entidad.id}`,
    );

    await runTransaction(this.firestore, async (tx) => {
      const snap = await tx.get(resumenRef);

      if (!snap.exists()) {
        throw new Error("Resumen financiero no existe");
      }

      const data = snap.data() as ResumenFinancieroEntidad;

      const nuevoTotalCobrado = data.totalCobrado + totalImpacto * factor;

      const nuevoSaldo = data.totalFacturado - nuevoTotalCobrado;

      tx.update(resumenRef, {
        totalCobrado: nuevoTotalCobrado,
        saldoPendiente: nuevoSaldo,
        updatedAt: new Date(),
      });
    });
  } */

  impactarMovimientoEnResumen(
    resumen: ResumenFinancieroEntidad,
    movimiento: MovimientoFinanciero,
    tipo: "alta" | "anulacion",
  ) {
    const factor = tipo === "alta" ? 1 : -1;

    const totalImpacto = movimiento.imputaciones.reduce(
      (acc, imp) => acc + imp.montoImputado,
      0,
    );

    const nuevoTotalCobrado = resumen.totalCobrado + totalImpacto * factor;

    const nuevoSaldo = resumen.totalFacturado - nuevoTotalCobrado;

    return {
      totalCobrado: nuevoTotalCobrado,
      saldoPendiente: nuevoSaldo,
      updatedAt: Timestamp.now(),
    };
  }

  async repararResumenEntidad(tipo: string, entidadId: number) {
    const result = await this.validarConsistenciaEntidad(
      tipo as any,
      entidadId,
    );

    if (result.ok) return;

    const resumenRef = doc(
      this.firestore,
      `${this.basePath}/resumenFinanzas/${tipo}_${entidadId}`,
    );

    await updateDoc(resumenRef, {
      totalFacturado: result.calculado.totalFacturado,
      totalCobrado: result.calculado.totalCobrado,
      saldoPendiente: result.calculado.saldoPendiente,
      cantidadInformes: result.calculado.cantidadInformes,
      cantidadPendientes: result.calculado.cantidadPendientes,
      updatedAt: Timestamp.now(),
    });

    return result
  }

  async validarConsistenciaEntidad(
    tipo: "cliente" | "chofer" | "proveedor",
    entidadId: number,
  ) {
    // 1. traer resumen
    const resumenRef = doc(
      this.firestore,
      `${this.basePath}/resumenFinanzas/${tipo}_${entidadId}`,
    );

    const resumenSnap = await getDoc(resumenRef);

    if (!resumenSnap.exists()) {      
      throw new Error("Resumen no existe");
    }

    const resumen = resumenSnap.data() as ResumenFinancieroEntidad;

    // 2. traer informes reales
    const q = query(
      collection(this.firestore, `${this.basePath}/resumenLiq`),
      where("tipo", "==", tipo),
      where("entidad.id", "==", entidadId),
      where("estado", "!=", "anulado"),
    );

    const snap = await getDocs(q);

    let totalFacturado = 0;
    let totalCobrado = 0;
    let cantidadInformes = 0;
    let cantidadPendientes = 0;

    snap.docs.forEach((doc) => {
      const inf = doc.data() as InformeLiq;

      totalFacturado += inf.valoresFinancieros.total;
      totalCobrado += inf.valoresFinancieros.totalCobrado;

      cantidadInformes++;

      if (inf.estadoFinanciero !== "cobrado") {
        cantidadPendientes++;
      }
    });

    console.log("totalFacturado: ", totalFacturado + " /totalCobrado: ", totalCobrado);
    console.log("cantidadInformes: ", cantidadInformes + " /cantidadPendientes: ", cantidadPendientes);
    

    const saldoPendiente = totalFacturado - totalCobrado;
    console.log("saldoPendiente: ", saldoPendiente);
    

    // 3. comparar

    const diferencias = {
      totalFacturado: resumen.totalFacturado - totalFacturado,
      totalCobrado: resumen.totalCobrado - totalCobrado,
      saldoPendiente: resumen.saldoPendiente - saldoPendiente,
      cantidadInformes: resumen.cantidadInformes - cantidadInformes,
      cantidadPendientes: resumen.cantidadPendientes - cantidadPendientes,
    };

    const hayErrores = Object.values(diferencias).some((v) => v !== 0);

    return {
      ok: !hayErrores,
      resumen,
      calculado: {
        totalFacturado,
        totalCobrado,
        saldoPendiente,
        cantidadInformes,
        cantidadPendientes,
      },
      diferencias,
    };
  }

  async construirInformeEntidadPendientes(informeLiq: ConId<InformeLiq>){
    // 1. traer resumen
    const resumenRef = doc(
      this.firestore,
      `${this.basePath}/resumenFinanzas/${informeLiq.tipo}_${informeLiq.entidad.id}`,
    );

    const resumenSnap = await getDoc(resumenRef);

    if (!resumenSnap.exists()) {      
      //throw new Error("Resumen no existe");
      await this.aplicarNuevaLiquidacion(informeLiq);      
    }
    const result = await this.repararResumenEntidad(informeLiq.tipo, informeLiq.entidad.id)
    return result

  }
  
}
