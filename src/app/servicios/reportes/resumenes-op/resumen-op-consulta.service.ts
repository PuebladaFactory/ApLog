import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map, of } from 'rxjs';
import { PeriodoFiltro } from 'src/app/interfaces/periodo-filtro';
import {
  ClaveResumen,
  LadoResumen,
  MetricasResumen,
  ResumenOpNuevo,
  TipoEntidadResumen,
} from 'src/app/interfaces/resumen-op-nuevo';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { FilaResumen } from 'src/app/servicios/reportes/reportes-op/tabla-resumen-config.service';
import { diasOperativos, mesesDelRango } from 'src/app/shared/utils/periodo.util';
import { ResumenOpFactoryService } from './resumen-op-factory.service';

export interface DatosTablaResumen {
  filas: FilaResumen[];
  total: FilaResumen;
}

/** Consulta de solo lectura de los resúmenes de Reportes (resumenesOp).
 *  Los ids son deterministas (ResumenOpFactoryService.claveGeneral /
 *  claveEntidad), así que no hace falta ninguna query ni índice: un
 *  listener por mes (getDocObservable) combinados; un mes sin documento es
 *  un resumen en cero. Tope: MAX_MESES por consulta. */
@Injectable({ providedIn: 'root' })
export class ResumenOpConsultaService {

  static readonly MAX_MESES = 36;

  private db = inject(DbFirestoreService);
  private factory = inject(ResumenOpFactoryService);

  observarGeneral(periodo: PeriodoFiltro): Observable<ResumenOpNuevo[]> {
    return this.observar(
      mesesDelRango(periodo.desde, periodo.hasta).map(p => this.factory.claveGeneral(p)),
    );
  }

  observarEntidad(
    periodo: PeriodoFiltro,
    tipoEntidad: TipoEntidadResumen,
    entidadId: string,
  ): Observable<ResumenOpNuevo[]> {
    return this.observar(
      mesesDelRango(periodo.desde, periodo.hasta).map(p => this.factory.claveEntidad(tipoEntidad, entidadId, p)),
    );
  }

  /** Filas de la tabla (mismo orden que `resumenes`) + fila de totales del
   *  período. Pura. */
  armarTabla(resumenes: ResumenOpNuevo[], hoy: Date = new Date()): DatosTablaResumen {
    const filas: FilaResumen[] = resumenes.map(r => ({
      ...this.metricas(r),
      etiqueta: `${String(r.mes).padStart(2, '0')}-${r.anio}`,
      anio: r.anio,
      mes: r.mes,
      periodo: r.periodo,
      diasOperativos: diasOperativos(r.anio, r.mes, hoy),
    }));

    let metricasTotal = this.factory.metricasVacias();
    let diasTotal = 0;
    for (const f of filas) {
      metricasTotal = this.factory.sumar(metricasTotal, f);
      diasTotal += f.diasOperativos;
    }
    const total: FilaResumen = {
      ...metricasTotal,
      etiqueta: 'Total',
      anio: 0,
      mes: 0,
      periodo: 0,
      diasOperativos: diasTotal,
    };

    return { filas, total };
  }

  // ── Privados ────────────────────────────────────────────────────

  private observar(claves: ClaveResumen[]): Observable<ResumenOpNuevo[]> {
    if (claves.length === 0) return of([]);
    if (claves.length > ResumenOpConsultaService.MAX_MESES) {
      throw new Error(`ResumenOpConsulta: el período supera ${ResumenOpConsultaService.MAX_MESES} meses.`);
    }
    return combineLatest(
      claves.map(c =>
        this.db.getDocObservable<ResumenOpNuevo>(ResumenOpFactoryService.COLECCION, c.id).pipe(
          map(doc => this.normalizar(doc, c)),
        ),
      ),
    ).pipe(map(resumenes => [...resumenes].sort((a, b) => b.periodo - a.periodo)));
  }

  /** Documento (o null) → ResumenOpNuevo completo: identidad desde la
   *  clave, métricas con 0 en lo que falte. */
  private normalizar(doc: any | null, clave: ClaveResumen): ResumenOpNuevo {
    const { id, ...identidad } = clave;
    return { ...identidad, ...this.metricas(doc), actualizado: doc?.actualizado ?? 0 };
  }

  private metricas(d: any): MetricasResumen {
    const lado = (l: any): LadoResumen => ({
      tarifaBase: l?.tarifaBase ?? 0,
      kmAdicional: l?.kmAdicional ?? 0,
      acompValor: l?.acompValor ?? 0,
      adExtraValor: l?.adExtraValor ?? 0,
      total: l?.total ?? 0,
      niveles: {
        general: l?.niveles?.general ?? 0,
        especial: l?.niveles?.especial ?? 0,
        personalizada: l?.niveles?.personalizada ?? 0,
        eventual: l?.niveles?.eventual ?? 0,
      },
    });
    return {
      cantidadOps: d?.cantidadOps ?? 0,
      kmRecorridos: d?.kmRecorridos ?? 0,
      acompanianteOps: d?.acompanianteOps ?? 0,
      acompanianteCantidadTotal: d?.acompanianteCantidadTotal ?? 0,
      cliente: lado(d?.cliente),
      chofer: lado(d?.chofer),
      ganancia: d?.ganancia ?? 0,
    };
  }
}
