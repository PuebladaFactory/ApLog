import { CuentaCorrienteResumen } from "src/app/interfaces/cuenta-corriente-resumen";
import { StorageService } from "../storage/storage.service";
import { map, Observable } from "rxjs";
import { ResumenFinancieroEntidad } from "src/app/interfaces/resumen-financiero-entidad";
import { ConId } from "src/app/interfaces/conId";
import { Injectable } from "@angular/core";

@Injectable({
  providedIn: 'root'
})
export class CuentaCorrienteService {

  constructor(private storageService: StorageService) {}

  getCuentaCorriente$(
    filtros: {
      tipoEntidad?: 'cliente' | 'chofer' | 'proveedor';
      soloConDeuda?: boolean;
      search?: string;
    }
  ): Observable<CuentaCorrienteResumen[]> {

    return this.storageService
      .getObservable<ConId<ResumenFinancieroEntidad>>('resumenFinanzas')
      .pipe(
        map(data => this.transformar(data, filtros))
      );
  }

  private transformar(
    data: ConId<ResumenFinancieroEntidad>[],
    filtros: any
  ): CuentaCorrienteResumen[] {

    let resultado = data.map(d => this.mapToResumen(d));

    // filtros
    if (filtros?.tipoEntidad) {
      resultado = resultado.filter(r => r.tipoEntidad === filtros.tipoEntidad);
    }

    if (filtros?.soloConDeuda) {
      resultado = resultado.filter(r => r.saldoPendiente > 0);
    }

    if (filtros?.search) {
      const search = filtros.search.toLowerCase();

      resultado = resultado.filter(r =>
        r.razonSocial.toLowerCase().includes(search) ||
        (r.cuit && r.cuit.includes(search))
      );
    }

    // orden
    resultado.sort((a, b) => b.saldoPendiente - a.saldoPendiente);

    return resultado;
  }

  private mapToResumen(
    data: ResumenFinancieroEntidad
  ): CuentaCorrienteResumen {

    let estado: CuentaCorrienteResumen['estado'];

    if (data.saldoPendiente === 0) estado = 'sin_deuda';
    else if (data.saldoPendiente > 0) estado = 'con_deuda';
    else estado = 'al_dia';

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
      estado
    };
  }
}