import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, firstValueFrom, map } from 'rxjs';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { MovimientoFin, TipoEntidadFin } from 'src/app/interfaces/movimiento-fin';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { InformeLiqConsultaService } from 'src/app/servicios/informes-liq/informe-liq-consulta.service';
import { CompensableFin, armarCompensables } from 'src/app/shared/utils/compensacion.util';
import { CuentaEntidadFin, LadoCuenta, armarCuentas } from 'src/app/shared/utils/cuentas-finanzas.util';
import { FiltrosMovimientosFin, rangoInicialMovimientos } from 'src/app/shared/utils/movimiento-fin.util';

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

  /** Filtros de la pestaña Movimientos, recordados durante la sesión. Rango
   *  inicial: desde el día 1 de dos meses atrás hasta hoy. */
  filtrosMovimientos: FiltrosMovimientosFin = {
    ...rangoInicialMovimientos(toISODateString(new Date())),
    tipo: 'todos',
    estado: 'todos',
    texto: '',
  };

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

  /** En vivo: movimientos con `fecha` en [desde, hasta] ('YYYY-MM-DD'),
   *  vigentes y anulados. Rango sobre un solo campo → índice simple
   *  automático; orden y demás filtros en memoria (pestaña Movimientos). */
  observarMovimientosPorFecha(desde: string, hasta: string): Observable<ConId<MovimientoFin>[]> {
    return this.db.observarPorRango<MovimientoFin>(this.COL_MOV, 'fecha', desde, hasta).pipe(
      map(items => items.map(m => ({ ...m, idMovimiento: m.id }))),
    );
  }

  /** One-shot (FC1b): movimientos que la entidad puede compensar en el
   *  informe `idInfLiq` (null = informe nuevo): los vigentes con saldo sin
   *  imputar + los ya compensados en este informe (`idsActuales`, aunque
   *  hayan quedado en 0) + el aviso de otros borradores que los eligieron
   *  (F35). Ver armarCompensables. */
  async obtenerCompensables(
    entidad: { tipo: TipoEntidadFin; id: string },
    idInfLiq: string | null,
    idsActuales: string[],
  ): Promise<CompensableFin[]> {
    const conSaldo = await firstValueFrom(this.observarMovimientosConSaldo());
    const faltan = [...new Set(idsActuales)].filter(id => !conSaldo.some(m => m.idMovimiento === id));
    const extra = (await Promise.all(faltan.map(async id => {
      const m = await this.db.getById<MovimientoFin>(this.COL_MOV, id);
      return m ? { ...m, id, idMovimiento: id } : null;
    }))).filter((m): m is ConId<MovimientoFin> => m !== null);
    const borradores = await firstValueFrom(this.consultaLiq.observarPorEstado('borrador'));
    return armarCompensables([...conSaldo, ...extra], entidad, idInfLiq, borradores);
  }

  /** En vivo: una cuenta por entidad (ver armarCuentas). `hoy` en
   *  'YYYY-MM-DD' (toISODateString). */
  observarCuentas(hoy: string): Observable<CuentaEntidadFin[]> {
    return combineLatest([this.observarInformesAbiertos(), this.observarMovimientosConSaldo()]).pipe(
      map(([informes, movimientos]) => armarCuentas(informes, movimientos, hoy)),
    );
  }
}
