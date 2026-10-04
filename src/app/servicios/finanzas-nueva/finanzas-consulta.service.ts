import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { MovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { InformeLiqConsultaService } from 'src/app/servicios/informes-liq/informe-liq-consulta.service';
import { CuentaEntidadFin, LadoCuenta, armarCuentas } from 'src/app/shared/utils/cuentas-finanzas.util';

/** Lecturas del Frente Finanzas (camino nuevo). SOLO lectura: los dueños de
 *  las escrituras son InformeLiqService (informesLiq) y, desde F3, el
 *  servicio de movimientos (movimientosFin). Mismo patrón que
 *  InformeLiqConsultaService / ComisionVentaConsultaService. Aplica ConId
 *  (idInfLiq, idMovimiento = doc id). Diseño: claude/diseno-finanzas.md. */
@Injectable({ providedIn: 'root' })
export class FinanzasConsultaService {

  private db = inject(DbFirestoreService);
  private consultaLiq = inject(InformeLiqConsultaService);

  private readonly COL_LIQ = 'informesLiq';
  private readonly COL_MOV = 'movimientosFin';

  /** Filtros de la pestaña Cuentas, recordados durante la sesión. */
  filtrosCuentas: { lado: LadoCuenta; texto: string } = { lado: 'cobrar', texto: '' };

  /** En vivo: InformeLiq abiertos = emitidos (todos; todavía sin factura) +
   *  facturados con saldo (estadoFinanciero pendiente o parcial; índice
   *  informesLiq (estado, estadoFinanciero)). */
  observarInformesAbiertos(): Observable<ConId<InformeLiqNuevo>[]> {
    const emitidos$ = this.consultaLiq.observarPorEstado('emitido');
    const facturados$ = this.db
      .observarPorCampoEIn<InformeLiqNuevo>(this.COL_LIQ, 'estado', 'facturado', 'estadoFinanciero', ['pendiente', 'parcial'])
      .pipe(map(items => items.map(i => ({ ...i, idInfLiq: i.id }))));
    return combineLatest([emitidos$, facturados$]).pipe(
      map(([emitidos, facturados]) => [...emitidos, ...facturados]),
    );
  }

  /** En vivo: movimientos VIGENTES con saldo sin imputar (anticipos / saldo
   *  a favor). La consulta es solo `sinImputar > 0` (índice simple); los
   *  anulados se descartan en memoria. */
  observarMovimientosConSaldo(): Observable<ConId<MovimientoFin>[]> {
    return this.db.observarMayorQue<MovimientoFin>(this.COL_MOV, 'sinImputar', 0).pipe(
      map(items => items
        .filter(m => m.estado === 'vigente')
        .map(m => ({ ...m, idMovimiento: m.id }))),
    );
  }

  /** En vivo: una cuenta por entidad (ver armarCuentas). `hoy` en
   *  'YYYY-MM-DD' (toISODateString). */
  observarCuentas(hoy: string): Observable<CuentaEntidadFin[]> {
    return combineLatest([this.observarInformesAbiertos(), this.observarMovimientosConSaldo()]).pipe(
      map(([informes, movimientos]) => armarCuentas(informes, movimientos, hoy)),
    );
  }
}
