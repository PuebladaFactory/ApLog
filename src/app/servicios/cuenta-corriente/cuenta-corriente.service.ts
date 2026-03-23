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
  getDocs,
  query,
  where,
} from "@angular/fire/firestore";
import { athena } from "@cloudinary/url-gen/qualifiers/artisticFilter";

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

  async obtenerDetalleEntidad(
    entidadId: number,
  ): Promise<DetalleVistaCuentaCorriente[]> {
    console.log("entidadId: ", entidadId);

    const ref = collection(this.firestore, `${this.basePath}/resumenLiq`);

    const q = query(
      ref,
      where("entidad.id", "==", entidadId),
      where("estado", "!=", "anulado"),
    );

    const snap = await getDocs(q);

    const resultados: DetalleVistaCuentaCorriente[] = snap.docs.map((doc) => {
      const data = doc.data() as InformeLiq;
      console.log("data: ", data);
      let periodoLiq = "";
      let periodoOrden = 0;
      if (data.mes && data.periodo && data.anio) {
        periodoLiq = `${data.mes} ${data.anio} - ${data.periodo}`
        periodoOrden = this.getOrdenPeriodo(periodoLiq);
      }

      return {
        numero: data.numeroInterno,
        fechaEmision:
          typeof data.fecha === "string"
            ? data.fecha
            : data.fecha.toISOString().substring(0, 10),

        //fechaVencimiento: data.fechaVencimiento,
        entidad: data.entidad,
        total: data.valoresFinancieros.total,
        cancelado: data.valoresFinancieros.totalCobrado,
        saldo: data.valoresFinancieros.saldo,
        //formaPago: data.formaPago ?? "",               // Efectivo, transferencia, etc. (opcional)
        //fechaCobro: data.fechaCobro ?? "",       // Fecha en que se registró el cobro
        periodoLiq: periodoLiq,
        periodoOrden : periodoOrden,
        estadoFinanciero: data.estadoFinanciero,
      };
    });

    return resultados;
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
    diciembre: 12
  };

  const [parteFecha, partePeriodo] = periodo.split(' - ');
  const [mesStr, anioStr] = parteFecha.split(' ');

  const mes = meses[mesStr.toLowerCase()] || 0;
  const anio = parseInt(anioStr, 10) || 0;

  let ordenPeriodo = 0;

  if (partePeriodo?.includes('1')) ordenPeriodo = 1;
  else if (partePeriodo?.includes('2')) ordenPeriodo = 2;
  else ordenPeriodo = 3;

  return anio * 10000 + mes * 100 + ordenPeriodo;
}
}
