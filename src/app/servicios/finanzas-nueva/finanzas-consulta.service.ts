import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, firstValueFrom, map } from 'rxjs';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { MovimientoFin, TipoEntidadFin } from 'src/app/interfaces/movimiento-fin';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { InformeLiqConsultaService } from 'src/app/servicios/informes-liq/informe-liq-consulta.service';
import { CompensableFin, armarCompensables } from 'src/app/shared/utils/compensacion.util';
import { SeccionCuentaEntidad } from 'src/app/shared/utils/cuenta-entidad.util';
import { CuentaEntidadFin, EstadoAntiguedad, LadoCuenta, armarCuentas } from 'src/app/shared/utils/cuentas-finanzas.util';
import { FiltrosMovimientosFin, rangoInicialMovimientos } from 'src/app/shared/utils/movimiento-fin.util';
import { mesDe } from 'src/app/shared/utils/resumen-finanzas.util';

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

  /** Resumen (F6b): mes del flujo y de la evolución ('YYYY-MM'), recordado
   *  durante la sesión. Arranca en el mes actual. */
  filtrosResumen: { mes: string } = { mes: mesDe(toISODateString(new Date())) };

  /** Filtros de la pestaña Antigüedad (F6a), recordados durante la sesión. */
  filtrosAntiguedad: { lado: LadoCuenta; texto: string; estado: EstadoAntiguedad | 'todos' } = {
    lado: 'cobrar',
    texto: '',
    estado: 'todos',
  };

  /** Cuenta de la entidad (F5): sección visible y filtro de comprobantes,
   *  recordados durante la sesión. */
  filtrosCuentaEntidad: {
    seccion: SeccionCuentaEntidad;
    soloAbiertos: boolean;
    mayorDesde: string;
    mayorHasta: string;
    mayorOrden: 'desc' | 'asc';
  } = {
    seccion: 'comprobantes',
    soloAbiertos: true,
    mayorDesde: '',               // '' = sin límite (Mayor, F5b)
    mayorHasta: '',
    mayorOrden: 'desc',           // más reciente arriba (F5c)
  };

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

  /** En vivo (F5): TODOS los InformeLiq y movimientos de una entidad
   *  (`entidad.id == id`: una igualdad sobre un campo anidado → índice simple
   *  automático; el tipo se filtra en memoria). Incluye borradores,
   *  revertidos y anulados: la pantalla decide qué mostrar. */
  observarCuentaEntidad(
    tipo: TipoEntidadFin,
    idEntidad: string,
  ): Observable<{ informes: ConId<InformeLiqNuevo>[]; movimientos: ConId<MovimientoFin>[] }> {
    const informes$ = this.db.observarPorCampo<InformeLiqNuevo>(this.COL_LIQ, 'entidad.id', idEntidad).pipe(
      map(items => items.filter(i => i.tipo === tipo).map(i => ({ ...i, idInfLiq: i.id }))),
    );
    const movimientos$ = this.db.observarPorCampo<MovimientoFin>(this.COL_MOV, 'entidad.id', idEntidad).pipe(
      map(items => items.filter(m => m.entidad.tipo === tipo).map(m => ({ ...m, idMovimiento: m.id }))),
    );
    return combineLatest([informes$, movimientos$]).pipe(
      map(([informes, movimientos]) => ({ informes, movimientos })),
    );
  }

  /** One-shot (F5b): nombre y CUIT desde el documento de la entidad
   *  (clientes / choferes / proveedores) — para una cuenta que todavía no
   *  tiene informes ni movimientos. null si el documento no existe. */
  async obtenerEntidad(
    tipo: TipoEntidadFin,
    id: string,
  ): Promise<{ nombre: string; cuit: number | null; activo: boolean } | null> {
    if (tipo === 'chofer') {
      const c = await this.db.getById<Chofer>('choferes', id);
      if (!c) return null;
      return {
        nombre: `${c.datosPersonales?.apellido ?? ''} ${c.datosPersonales?.nombre ?? ''}`.trim(),
        cuit: c.datosPersonales?.cuit ?? null,
        activo: c.activo !== false,
      };
    }
    const e = tipo === 'cliente'
      ? await this.db.getById<Cliente>('clientes', id)
      : await this.db.getById<Proveedor>('proveedores', id);
    if (!e) return null;
    return { nombre: e.razonSocial ?? '', cuit: e.cuit ?? null, activo: e.activo !== false };
  }

  /** En vivo (F6b): la base de las cuentas sin armar — informes abiertos +
   *  movimientos vigentes con saldo. El Resumen la usa para las cuentas y
   *  las alertas con los mismos dos listeners. */
  observarBaseCuentas(): Observable<{ informes: ConId<InformeLiqNuevo>[]; movimientos: ConId<MovimientoFin>[] }> {
    return combineLatest([this.observarInformesAbiertos(), this.observarMovimientosConSaldo()]).pipe(
      map(([informes, movimientos]) => ({ informes, movimientos })),
    );
  }

  /** En vivo (F6b): InformeLiq con `factura.fecha` en [desde, hasta]
   *  ('YYYY-MM-DD'). Rango sobre un solo campo (anidado) → índice simple
   *  automático. Trae todos los estados que tengan factura; el que llama
   *  filtra 'facturado'. Para la evolución del Resumen (6 meses). */
  observarFacturadosPorFechaFactura(desde: string, hasta: string): Observable<ConId<InformeLiqNuevo>[]> {
    return this.db.observarPorRango<InformeLiqNuevo>(this.COL_LIQ, 'factura.fecha', desde, hasta).pipe(
      map(items => items.map(i => ({ ...i, idInfLiq: i.id }))),
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
