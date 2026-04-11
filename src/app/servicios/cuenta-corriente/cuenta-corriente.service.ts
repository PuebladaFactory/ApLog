import {
  CuentaCorrienteResumen,
  DetalleVistaCuentaCorriente,
} from "src/app/interfaces/cuenta-corriente-resumen";
import { StorageService } from "../storage/storage.service";
import { map, Observable } from "rxjs";
import { ResumenFinancieroEntidad } from "src/app/interfaces/resumen-financiero-entidad";
import { ConId } from "src/app/interfaces/conId";
import { Injectable } from "@angular/core";
import { InformeLiq } from "src/app/interfaces/informe-liq";
import {
  Firestore,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from "@angular/fire/firestore";
import { athena } from "@cloudinary/url-gen/qualifiers/artisticFilter";
import { Ledger } from "src/app/interfaces/ledger";
import { AgingGlobal, AgingResumen } from "src/app/interfaces/aging-resumen";
import { RankingMoroso } from "src/app/interfaces/ranking-moroso";

@Injectable({
  providedIn: "root",
})
export class CuentaCorrienteService {
  constructor(
    private storageService: StorageService,
    private firestore: Firestore,
  ) {}
  basePath: string = `/Vantruck/datos`;

  getCuentaCorriente$(filtros: {
    tipoEntidad?: "cliente" | "chofer" | "proveedor";
    soloConDeuda?: boolean;
    search?: string;
  }): Observable<CuentaCorrienteResumen[]> {
    return this.storageService
      .getObservable<ConId<ResumenFinancieroEntidad>>("resumenFinanzas")
      .pipe(map((data) => this.transformar(data, filtros)));
  }

  private transformar(
    data: ConId<ResumenFinancieroEntidad>[],
    filtros: any,
  ): CuentaCorrienteResumen[] {
    let resultado = data.map((d) => this.mapToResumen(d));

    // filtros
    if (filtros?.tipoEntidad) {
      resultado = resultado.filter(
        (r) => r.tipoEntidad === filtros.tipoEntidad,
      );
    }

    if (filtros?.soloConDeuda) {
      resultado = resultado.filter((r) => r.saldoPendiente > 0);
    }

    if (filtros?.search) {
      const search = filtros.search.toLowerCase();

      resultado = resultado.filter(
        (r) =>
          r.razonSocial.toLowerCase().includes(search) ||
          (r.cuit && r.cuit.includes(search)),
      );
    }

    // orden
    resultado.sort((a, b) => b.saldoPendiente - a.saldoPendiente);

    return resultado;
  }

  private mapToResumen(data: ResumenFinancieroEntidad): CuentaCorrienteResumen {
    let estado: CuentaCorrienteResumen["estado"];

    if (data.saldoPendiente === 0) estado = "sin_deuda";
    else if (data.saldoPendiente > 0) estado = "con_deuda";
    else estado = "al_dia";

    return {
      entidadId: data.entidadId,
      tipoEntidad: data.tipoEntidad,
      razonSocial: data.razonSocial,
      cuit: data.cuit,
      totalFacturado: data.totalFacturado,
      totalCobrado: data.totalCobrado,
      saldoPendiente: data.saldoPendiente,
      cantidadInformes: data.cantidadInformes,
      cantidadPendientes: data.cantidadPendientes,
      updatedAt: data.updatedAt,
      estado,
    };
  }

  getOrdenPeriodo(periodo: string): number {
    if (!periodo) return 0;

    const meses: any = {
      enero: 1,
      febrero: 2,
      marzo: 3,
      abril: 4,
      mayo: 5,
      junio: 6,
      julio: 7,
      agosto: 8,
      septiembre: 9,
      octubre: 10,
      noviembre: 11,
      diciembre: 12,
    };

    const [parteFecha, partePeriodo] = periodo.split(" - ");
    const [mesStr, anioStr] = parteFecha.split(" ");

    const mes = meses[mesStr.toLowerCase()] || 0;
    const anio = parseInt(anioStr, 10) || 0;

    let ordenPeriodo = 0;

    if (partePeriodo?.includes("1")) ordenPeriodo = 1;
    else if (partePeriodo?.includes("2")) ordenPeriodo = 2;
    else ordenPeriodo = 3;

    return anio * 10000 + mes * 100 + ordenPeriodo;
  }

  async obtenerImputacionesPorInforme(informeId: string) {
    const ref = collection(this.firestore, `${this.basePath}/movimientos`);

    const q = query(
      ref,
      where("informeLiqIds", "array-contains", informeId),
      where("estado", "==", "activo"), // 👈 importante si manejás anulaciones
    );

    const snap = await getDocs(q);

    const resultados: any[] = [];

    snap.docs.forEach((doc) => {
      const data = doc.data() as any;

      console.log("data", data);

      // 🔍 buscar imputación específica
      const imputacion = data.imputaciones?.find(
        (i: any) => i.numeroInterno === informeId,
      );

      //console.log("imputacion", imputacion);

      if (!imputacion) return;

      resultados.push({
        numeroComprobante: data.numeroComprobante,
        fecha: data.fechaOperacion,
        tipo: data.tipo, // 'cobro' | 'pago'
        medioPago: data.medioPago ?? "",
        referencia: data.referencia ?? "",
        totalInforme: imputacion.totalInforme,
        montoImputado: imputacion.montoImputado,
        saldoInicial: imputacion.saldoInforme,
        ruta: data.id,
      });
    });

    return resultados;
  }

  /////////////////////////////////
  /* METODO DE UN SOLO USO */
  /////////////////////////////
  async migrarInformeLiqIdsEnMovimientos() {
    const ref = collection(this.firestore, `${this.basePath}/movimientos`);

    const snap = await getDocs(ref);

    //console.log(`Movimientos encontrados: ${snap.size}`);

    const docs = snap.docs;

    const chunkSize = 500;

    for (let i = 0; i < docs.length; i += chunkSize) {
      const batch = writeBatch(this.firestore);

      const chunk = docs.slice(i, i + chunkSize);

      chunk.forEach((d) => {
        const data = d.data() as any;

        // 🔥 construir ids desde imputaciones
        const informeLiqIds = (data.imputaciones || [])
          .map((i: any) => i.numeroInterno)
          .filter((numeroInterno: string) => !!numeroInterno);

        // opcional: eliminar duplicados
        const idsUnicos = [...new Set(informeLiqIds)];

        batch.update(d.ref, {
          informeLiqIds: idsUnicos,
        });
      });

      await batch.commit();

      //console.log(`Batch ${i / chunkSize + 1} ejecutado`);
    }

    //console.log("Migración completada");
  }

  async obtenerInformePorNumero(
    numeroInterno: string,
  ): Promise<{ id: string; data: InformeLiq } | null> {
    const ref = collection(this.firestore, `${this.basePath}/resumenLiq`);

    const q = query(ref, where("numeroInterno", "==", numeroInterno));

    const snap = await getDocs(q);

    if (snap.empty) return null;

    const docSnap = snap.docs[0];

    return {
      id: docSnap.id,
      data: docSnap.data() as InformeLiq,
    };
  }

  ///////////////////
  /* LEDGER */
  ///////////////////
  async obtenerLedgerEntidad(entidadId: number) {
    const eventos: Ledger[] = [];

    // 🔹 1. INFORMES (generan deuda)
    const refInf = collection(this.firestore, `${this.basePath}/resumenLiq`);

    const qInf = query(
      refInf,
      where("entidad.id", "==", entidadId),
      where("estado", "!=", "anulado"),
    );

    const snapInf = await getDocs(qInf);

    snapInf.docs.forEach((docSnap) => {
      const data = docSnap.data() as any;

      eventos.push({
        fecha: data.fecha,
        tipo: "Informe de Liquidación",
        accion: "alta",
        id: data.numeroInterno,
        impacto: data.valores.total, // 🔥 SIEMPRE positivo
        referenciaId: docSnap.id,
        informeLiqId: "",
        saldo: 0,
      });
    });

    // 🔹 2. MOVIMIENTOS (reducen deuda)
    const refMov = collection(this.firestore, `${this.basePath}/movimientos`);

    const qMov = query(
      refMov,
      where("entidad.id", "==", entidadId),
      where("estado", "==", "activo"),
    );

    const snapMov = await getDocs(qMov);

    snapMov.docs.forEach((docSnap) => {
      const data = docSnap.data() as any;

      data.imputaciones?.forEach((imp: any) => {
        eventos.push({
          fecha: data.fechaOperacion,
          tipo: "Movimiento Financiero",
          accion: data.tipo,
          id: data.numeroComprobante,
          impacto: -imp.montoImputado, // 🔥 SIEMPRE negativo
          referenciaId: docSnap.id,
          informeLiqId: imp.informeLiqId,
          saldo: 0,
        });
      });
    });

    // 🔥 3. ORDEN CRONOLÓGICO
    eventos.sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
    );

    // 🔥 4. SALDO ACUMULADO
    let saldo = 0;

    eventos.forEach((e) => {
      saldo += e.impacto;
      e.saldo = saldo;
    });

    return eventos;
  }

  async obtenerInformeLiq(
    id: string,
  ): Promise<{ id: string; data: InformeLiq } | null> {
    const ref = collection(this.firestore, `${this.basePath}/resumenLiq`);

    const q = query(ref, where("numeroInterno", "==", id));

    const snap = await getDocs(q);

    if (snap.empty) return null;

    const docSnap = snap.docs[0];

    return {
      id: docSnap.id,
      data: docSnap.data() as InformeLiq,
    };
  }

  ///////////////////
  /* AGING */
  ///////////////////

  async obtenerAgingGlobal(): Promise<AgingResumen[]> {
    const ref = collection(this.firestore, `${this.basePath}/resumenLiq`);

    const q = query(ref, where("estado", "!=", "anulado"));

    const snap = await getDocs(q);

    const hoy = new Date();

    const map = new Map<number, AgingResumen>();

    snap.docs.forEach((docSnap) => {
      const data = docSnap.data() as InformeLiq;

      if (data.estadoFinanciero === "cobrado") return;

      const saldo = data.valoresFinancieros?.saldo || 0;
      if (saldo <= 0) return;

      const entidadId = data.entidad.id;

      if (!map.has(entidadId)) {
        map.set(entidadId, {
          entidadId: entidadId,
          tipo: data.tipo,
          razonSocial: data.entidad.razonSocial,

          total: 0,
          bucket0_30: 0,
          bucket31_60: 0,
          bucket61_90: 0,
          bucket90mas: 0,
        });
      }

      const aging = map.get(entidadId)!;

      const fecha = new Date(data.fecha);
      const dias = Math.floor((hoy.getTime() - fecha.getTime()) / 86400000);

      aging.total += saldo;

      if (dias <= 30) {
        aging.bucket0_30 += saldo;
      } else if (dias <= 60) {
        aging.bucket31_60 += saldo;
      } else if (dias <= 90) {
        aging.bucket61_90 += saldo;
      } else {
        aging.bucket90mas += saldo;
      }
    });

    return Array.from(map.values());
  }

  async obtenerDetalleEntidad(entidadId: number): Promise<{
    detalle: DetalleVistaCuentaCorriente[];
    aging: AgingResumen;
  }> {
    const informes = await this.obtenerInformesEntidad(entidadId);

    return {
      detalle: this.mapToDetalle(informes),
      aging: this.calcularAging(informes),
    };
  }

  async obtenerInformesEntidad(entidadId: number): Promise<InformeLiq[]> {
    const ref = collection(this.firestore, `${this.basePath}/resumenLiq`);

    const q = query(
      ref,
      where("entidad.id", "==", entidadId),
      where("estado", "!=", "anulado"),
    );

    const snap = await getDocs(q);

    return snap.docs.map((doc) => doc.data() as InformeLiq);
  }

  mapToDetalle(informes: InformeLiq[]): DetalleVistaCuentaCorriente[] {
    return informes.map((data) => {
      let periodoLiq = "";
      let periodoOrden = 0;

      if (data.mes && data.periodo && data.anio) {
        periodoLiq = `${data.mes} ${data.anio} - ${data.periodo}`;
        periodoOrden = this.getOrdenPeriodo(periodoLiq);
      }

      return {
        numero: data.numeroInterno,
        fechaEmision:
          typeof data.fecha === "string"
            ? data.fecha
            : data.fecha.toISOString().substring(0, 10),

        entidad: data.entidad,
        total: data.valoresFinancieros.total,
        cancelado: data.valoresFinancieros.totalCobrado,
        saldo: data.valoresFinancieros.saldo,
        periodoLiq,
        periodoOrden,
        estadoFinanciero: data.estadoFinanciero,
      };
    });
  }

  calcularAging(informes: InformeLiq[]): AgingResumen {
    const hoy = new Date();

    const resultado: AgingResumen = {
      entidadId: informes[0]?.entidad.id,
      razonSocial: informes[0]?.entidad.razonSocial,
      tipo: informes[0].tipo,
      total: 0,
      bucket0_30: 0,
      bucket31_60: 0,
      bucket61_90: 0,
      bucket90mas: 0,
    };

    for (const data of informes) {
      if (data.estadoFinanciero === "cobrado") continue;

      const saldo = data.valoresFinancieros?.saldo || 0;
      if (saldo <= 0) continue;

      const fecha = new Date(data.fecha);
      const dias = Math.floor((hoy.getTime() - fecha.getTime()) / 86400000);

      resultado.total += saldo;

      if (dias <= 30) resultado.bucket0_30 += saldo;
      else if (dias <= 60) resultado.bucket31_60 += saldo;
      else if (dias <= 90) resultado.bucket61_90 += saldo;
      else resultado.bucket90mas += saldo;
    }

    return resultado;
  }

  async obtenerRankingMorosos(): Promise<RankingMoroso[]> {
    const resumenRef = collection(
      this.firestore,
      `${this.basePath}/resumenFinanzas`,
    );

    const snap = await getDocs(resumenRef);

    const resumenMap = new Map<number, ResumenFinancieroEntidad>();
    let resumenesFinancieros: ResumenFinancieroEntidad[] = [];

    snap.docs.forEach((doc) => {
      const data = doc.data() as ResumenFinancieroEntidad;
      resumenesFinancieros.push(data);
    });

    //const resúmenes = await this.obtenerResumenCuentaCorriente();
    const agingGlobal = await this.obtenerAgingGlobal();

    return resumenesFinancieros
      .map((r) => {
        const aging = agingGlobal.find((a) => a.entidadId === r.entidadId);

        if (!aging || aging.total === 0) return null;

        const score = this.calcularScore(aging);

        const deudaVencida =
          (aging.bucket61_90 + aging.bucket90mas) / aging.total;

        return {
          entidadId: r.entidadId,
          razonSocial: r.razonSocial,
          tipoEntidad: r.tipoEntidad,

          deudaTotal: aging.total,
          score,

          deudaVencidaPorc: deudaVencida,

          bucket0_30: aging.bucket0_30,
          bucket31_60: aging.bucket31_60,
          bucket61_90: aging.bucket61_90,
          bucket90mas: aging.bucket90mas,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.score - a!.score) as RankingMoroso[];
  }

  calcularScore(aging: AgingResumen): number {
    const total = aging.total || 1;

    const p0_30 = aging.bucket0_30 / total;
    const p31_60 = aging.bucket31_60 / total;
    const p61_90 = aging.bucket61_90 / total;
    const p90 = aging.bucket90mas / total;

    const scoreRiesgo = p0_30 * 10 + p31_60 * 30 + p61_90 * 60 + p90 * 100;

    // impacto económico moderado (no dominante)
    /*     const impacto = Math.log10(total + 1);

    const scoreFinal = scoreRiesgo * impacto;

    return Math.round(scoreFinal); */
    return Math.round(scoreRiesgo);
  }

  async obtenerAgingResumenGlobal(): Promise<AgingGlobal> {
    const agingPorEntidad = await this.obtenerAgingGlobal();

    const acumulado: AgingGlobal = {
      bucket0_30: 0,
      bucket31_60: 0,
      bucket61_90: 0,
      bucket90mas: 0,
      total: 0,
    };

    for (const aging of agingPorEntidad) {
      acumulado.bucket0_30 += aging.bucket0_30;
      acumulado.bucket31_60 += aging.bucket31_60;
      acumulado.bucket61_90 += aging.bucket61_90;
      acumulado.bucket90mas += aging.bucket90mas;
    }

    acumulado.total =
      acumulado.bucket0_30 +
      acumulado.bucket31_60 +
      acumulado.bucket61_90 +
      acumulado.bucket90mas;

    return acumulado;
  }
}
