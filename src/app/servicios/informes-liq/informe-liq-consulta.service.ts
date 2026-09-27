import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConId } from 'src/app/interfaces/conId';
import { EstadoInformeLiqNuevo, FacturaVinculada, InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';

/** Lecturas de InformeLiqNuevo para los listados de Facturación. SOLO
 *  lectura: el dueño de la entidad y de todas sus escrituras es
 *  InformeLiqService. Mismo patrón que RegistroLogConsultaService /
 *  PapeleraConsultaService. Aplica el patrón ConId (idInfLiq = doc id). */
@Injectable({ providedIn: 'root' })
export class InformeLiqConsultaService {

  private db = inject(DbFirestoreService);

  private readonly COLECCION = 'informesLiq';
  private readonly COL_FACTURAS = 'facturasVinculadas';
  private readonly FORMATO_PERIODO = /^\d{4}-(0[1-9]|1[0-2])$/;

  /** En vivo: todos los informes en `estado`. Una sola igualdad → sin
   *  índice compuesto. Pensado para bandejas que se vacían solas (Emitidos:
   *  un informe sale al facturarse o revertirse). Orden: más recientes
   *  primero (fecha de emisión, o de creación si no tiene), luego número. */
  observarPorEstado(estado: EstadoInformeLiqNuevo): Observable<ConId<InformeLiqNuevo>[]> {
    return this.db.observarPorCampo<InformeLiqNuevo>(this.COLECCION, 'estado', estado).pipe(
      map(items => items
        .map(i => this.conId(i))
        .sort((a, b) => this.compararRecientes(a, b))),
    );
  }

  /** One-shot: informes en alguno de `estados` cuyo período esté entre
   *  `desde` y `hasta` ('YYYY-MM', inclusivos) — históricos (Facturados,
   *  Revertidos). Usa el índice informesLiq (estado ASC, periodoClave DESC).
   *  Tipo, entidad, texto y fecha de emisión se filtran en memoria en la
   *  pantalla. Orden: período desc, luego más recientes. */
  async consultarPorPeriodo(
    estados: EstadoInformeLiqNuevo[],
    desde: string,
    hasta: string,
  ): Promise<ConId<InformeLiqNuevo>[]> {
    if (!this.FORMATO_PERIODO.test(desde) || !this.FORMATO_PERIODO.test(hasta)) {
      throw new Error(`Período inválido (se espera 'YYYY-MM'): '${desde}' / '${hasta}'.`);
    }
    if (desde > hasta) {
      throw new Error(`Rango de períodos inválido: ${desde} es posterior a ${hasta}.`);
    }
    const items = await this.db.consultarPorInYRango<InformeLiqNuevo>(
      this.COLECCION, 'estado', estados, 'periodoClave', desde, hasta, 'desc',
    );
    return items
      .map(i => this.conId(i))
      .sort((a, b) => b.periodoClave.localeCompare(a.periodoClave) || this.compararRecientes(a, b));
  }

  /** Índice de unicidad de facturas: a qué InformeLiq está vinculado el
   *  comprobante `clave` (claveComprobante / claveComprobanteQr del util
   *  factura-electronica), o null. Lectura previa para avisar en la UI; la
   *  regla real la aplica InformeLiqService.vincularFactura en su
   *  transacción. */
  async obtenerFacturaVinculada(clave: string): Promise<FacturaVinculada | null> {
    return this.db.getById<FacturaVinculada>(this.COL_FACTURAS, clave);
  }

  private conId(i: ConId<InformeLiqNuevo>): ConId<InformeLiqNuevo> {
    return { ...i, idInfLiq: i.id };
  }

  private compararRecientes(a: InformeLiqNuevo, b: InformeLiqNuevo): number {
    const fa = a.fechaEmision ?? a.fechaCreacion;
    const fb = b.fechaEmision ?? b.fechaCreacion;
    return fb.localeCompare(fa) || (b.numeroInterno ?? '').localeCompare(a.numeroInterno ?? '');
  }
}
