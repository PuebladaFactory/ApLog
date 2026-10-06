import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { EntidadMovimientoFin, MedioMovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { LimpiezaDemoService } from 'src/app/servicios/desarrollo/limpieza-demo.service';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { FinanzasConsultaService } from 'src/app/servicios/finanzas-nueva/finanzas-consulta.service';
import { MovimientoFinService } from 'src/app/servicios/finanzas-nueva/movimiento-fin.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import { Azar } from 'src/app/shared/utils/azar.util';
import { fechaBaseAntiguedad } from 'src/app/shared/utils/cuentas-finanzas.util';
import { nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';
import { normalizarValoresFinancieros, redondear2 } from 'src/app/shared/utils/finanzas.util';
import { DatosMovimientoFin } from 'src/app/shared/utils/movimiento-fin.util';

export interface ParametrosCobros {
  semilla: number;
  pctMorosos: number;          // clientes: facturas que no se cobran nunca (0..1)
  pctAtrasados: number;        // clientes: se cobran a 61–120 días en vez de 30–60 (0..1)
  pctParciales: number;        // clientes, de lo que se cobra: primero 40–80 %, el resto 20–40 días después (0..1)
  pctRetencion: number;        // cobros con retención de IIBB del 2,5 % (0..1)
  pctSaldoAFavor: number;      // cobros completos que pagan de más (1–5 %): queda saldo a favor (0..1)
  pctPagosPendientes: number;  // choferes/proveedores: facturas que todavía no se pagan (0..1)
  pctAnticipos: number;        // choferes/proveedores con un anticipo en el mes en curso (0..1)
}

export const PARAMETROS_COBROS_POR_DEFECTO: Omit<ParametrosCobros, 'semilla'> = {
  pctMorosos: 0.05,
  pctAtrasados: 0.15,
  pctParciales: 0.10,
  pctRetencion: 0.30,
  pctSaldoAFavor: 0.05,
  pctPagosPendientes: 0.03,
  pctAnticipos: 0.25,
};

/** Un movimiento que el plan va a registrar. */
export interface MovimientoPlaneado {
  etiqueta: string;
  total: number;                  // Σ medios
  datos: DatosMovimientoFin;
}

export interface ResumenCobros {
  facturadosCliente: number;      // InformeLiq de clientes facturados con saldo (entrada)
  facturadosPago: number;         // ídem choferes/proveedores
  cobros: number;
  totalCobrado: number;
  conRetencion: number;
  parciales: number;              // facturas cobradas en dos partes (o con la segunda todavía pendiente)
  conSaldoAFavor: number;
  pagos: number;
  totalPagado: number;
  anticipos: number;
  totalAnticipos: number;
  quedanAbiertosCliente: number;  // facturas de clientes que quedan con saldo (morosas, no vencidas o parciales)
  quedanAbiertosPago: number;     // ídem choferes/proveedores
}

export interface PlanCobros {
  parametros: ParametrosCobros;
  hoy: string;
  movimientos: MovimientoPlaneado[];
  resumen: ResumenCobros;
}

export interface ErrorCobros {
  movimiento: string;
  mensaje: string;
}

export interface ResultadoCobros {
  idLote: string;
  registrados: number;
  errores: ErrorCobros[];
}

/** Generador de COBROS Y PAGOS de prueba (solo DEMO, rol dev) — Frente
 *  Finanzas G2. Sobre los InformeLiq FACTURADOS con saldo (lo que dejó el
 *  Generador de circuito) registra movimientos con la función REAL
 *  (MovimientoFinService.registrar), con fechas realistas respecto de la
 *  fecha de la factura y nunca futuras:
 *   - Clientes: cobro a 30–60 días; una parte se atrasa (61–120) y otra no
 *     se cobra (morosos). Algunos en dos partes, algunos con retención de
 *     IIBB, algunos pagan de más (saldo a favor). Medio: transferencia o
 *     e-cheq. Lo que caería después de hoy queda abierto (antigüedad real).
 *   - Choferes/proveedores: pago a 2–10 días de su factura (transferencia o
 *     efectivo); unos pocos quedan pendientes.
 *   - Anticipos: a una parte de los choferes/proveedores, un anticipo en el
 *     mes en curso (10–25 % de su última liquidación), sin imputar: quedan
 *     pendientes para compensar en la próxima liquidación (FC1).
 *  Un movimiento por factura (o dos si es parcial). Se registran en orden de
 *  fecha (la numeración RC/OPG queda cronológica). Reproducible: misma
 *  semilla + mismos datos = mismo plan. NO es idempotente: correrlo dos
 *  veces cobra lo que quedó abierto; para rehacer, Limpieza de demo y
 *  regenerar. Lote en `generacionesPrueba` (tipo 'cobros').
 *  Diseño: claude/diseno-finanzas.md (G2). */
@Injectable({ providedIn: 'root' })
export class GeneradorCobrosService {

  private db = inject(DbFirestoreService);
  private consulta = inject(FinanzasConsultaService);
  private movimientos = inject(MovimientoFinService);
  private usuarioSesion = inject(UsuarioSesionService);

  private readonly COL_LOTES = 'generacionesPrueba';
  private readonly ORDEN_TIPOS = ['cliente', 'chofer', 'proveedor'];
  private readonly BANCOS = ['Banco Nación', 'Banco Provincia', 'Banco Galicia', 'Banco Santander', 'BBVA', 'Banco Macro'];
  private readonly OBSERVACION = 'Generado por el Generador de cobros y pagos (demo).';

  esEntornoDemo(): boolean {
    return environment.firebase.projectId === LimpiezaDemoService.PROYECTO_DEMO;
  }

  /** Arma el plan en memoria. Solo lee; no escribe nada. */
  async planificar(p: ParametrosCobros): Promise<PlanCobros> {
    this.verificarEntorno();
    this.validarParametros(p);

    const azar = new Azar(p.semilla);
    const hoy = toISODateString(new Date());
    const abiertos = (await firstValueFrom(this.consulta.observarInformesAbiertos()))
      .sort((a, b) =>
        this.ORDEN_TIPOS.indexOf(a.tipo) - this.ORDEN_TIPOS.indexOf(b.tipo) ||
        nombreEntidadRef(a.entidad).localeCompare(nombreEntidadRef(b.entidad)) ||
        (a.numeroInterno ?? '').localeCompare(b.numeroInterno ?? '') ||
        a.idInfLiq.localeCompare(b.idInfLiq));
    const facturados = abiertos.filter(l => l.estado === 'facturado');

    const movimientos: MovimientoPlaneado[] = [];
    const r: ResumenCobros = {
      facturadosCliente: 0, facturadosPago: 0, cobros: 0, totalCobrado: 0, conRetencion: 0, parciales: 0,
      conSaldoAFavor: 0, pagos: 0, totalPagado: 0, anticipos: 0, totalAnticipos: 0,
      quedanAbiertosCliente: 0, quedanAbiertosPago: 0,
    };

    for (const liq of facturados) {
      const saldo = normalizarValoresFinancieros(liq.valoresFinancieros, liq.valores.total).saldo;
      if (!(saldo > 0)) continue;
      const fechaFactura = liq.factura?.fecha ?? fechaBaseAntiguedad(liq);
      const entidad = this.entidadDe(liq);
      const nro = liq.numeroInterno ?? liq.idInfLiq;

      if (liq.tipo === 'cliente') {
        r.facturadosCliente++;
        const sorteo = azar.siguiente();
        if (sorteo < p.pctMorosos) {
          r.quedanAbiertosCliente++;
          continue;
        }
        const dias = sorteo < p.pctMorosos + p.pctAtrasados ? azar.entero(61, 120) : azar.entero(30, 60);
        const fecha = this.sumarDias(fechaFactura, dias);
        if (fecha > hoy) {
          r.quedanAbiertosCliente++;
          continue;
        }

        if (azar.chance(p.pctParciales)) {
          r.parciales++;
          const primera = redondear2(saldo * azar.entero(40, 80) / 100);
          movimientos.push(this.cobro(entidad, fecha, primera, [{ idInfLiq: liq.idInfLiq, importe: primera }], azar, p, r,
            `Cobro parcial ${nro}`));
          const fecha2 = this.sumarDias(fecha, azar.entero(20, 40));
          if (fecha2 > hoy) {
            r.quedanAbiertosCliente++;
            continue;
          }
          const resto = redondear2(saldo - primera);
          movimientos.push(this.cobro(entidad, fecha2, resto, [{ idInfLiq: liq.idInfLiq, importe: resto }], azar, p, r,
            `Cobro del resto ${nro}`));
          continue;
        }

        let total = saldo;
        if (azar.chance(p.pctSaldoAFavor)) {
          total = redondear2(saldo * (1 + azar.entero(1, 5) / 100));
          r.conSaldoAFavor++;
        }
        movimientos.push(this.cobro(entidad, fecha, total, [{ idInfLiq: liq.idInfLiq, importe: saldo }], azar, p, r,
          `Cobro ${nro}`));
      } else {
        r.facturadosPago++;
        if (azar.chance(p.pctPagosPendientes)) {
          r.quedanAbiertosPago++;
          continue;
        }
        const fecha = this.sumarDias(fechaFactura, azar.entero(2, 10));
        if (fecha > hoy) {
          r.quedanAbiertosPago++;
          continue;
        }
        movimientos.push({
          etiqueta: `Pago ${nro} — ${entidad.razonSocial}`,
          total: saldo,
          datos: this.datos('pago', entidad, fecha, 'normal', this.mediosPago(saldo, azar),
            [{ idInfLiq: liq.idInfLiq, importe: saldo }]),
        });
        r.pagos++;
        r.totalPagado += saldo;
      }
    }

    // Anticipos del mes en curso: base = total de la última liquidación
    // (emitida o facturada) de cada chofer/proveedor.
    const ultimas = new Map<string, ConId<InformeLiqNuevo>>();
    for (const liq of abiertos) {
      if (liq.tipo === 'cliente') continue;
      const clave = `${liq.tipo}_${liq.entidad.id}`;
      const actual = ultimas.get(clave);
      if (!actual || (liq.periodoClave ?? '') > (actual.periodoClave ?? '')) ultimas.set(clave, liq);
    }
    const diaHoy = Number(hoy.slice(8, 10));
    for (const liq of ultimas.values()) {
      if (!azar.chance(p.pctAnticipos)) continue;
      const importe = Math.max(1000, Math.round(liq.valores.total * azar.entero(10, 25) / 100 / 1000) * 1000);
      const fecha = `${hoy.slice(0, 8)}${String(azar.entero(1, diaHoy)).padStart(2, '0')}`;
      const entidad = this.entidadDe(liq);
      movimientos.push({
        etiqueta: `Anticipo — ${entidad.razonSocial}`,
        total: importe,
        datos: this.datos('pago', entidad, fecha, 'anticipo', this.mediosPago(importe, azar), []),
      });
      r.anticipos++;
      r.totalAnticipos += importe;
    }

    // Orden de registro: por fecha (numeración cronológica); estable.
    const ordenados = movimientos
      .map((m, i) => ({ m, i }))
      .sort((a, b) => a.m.datos.fecha.localeCompare(b.m.datos.fecha) || a.i - b.i)
      .map(x => x.m);

    return {
      parametros: { ...p },
      hoy,
      movimientos: ordenados,
      resumen: {
        ...r,
        totalCobrado: redondear2(r.totalCobrado),
        totalPagado: redondear2(r.totalPagado),
        totalAnticipos: redondear2(r.totalAnticipos),
      },
    };
  }

  /** Ejecuta el plan (lo vuelve a armar con los mismos parámetros) con
   *  MovimientoFinService.registrar, uno por uno. Los errores se registran y
   *  se sigue con el próximo. */
  async ejecutar(p: ParametrosCobros, alAvanzar: (mensaje: string) => void): Promise<ResultadoCobros> {
    this.verificarEntorno();
    alAvanzar('Armando el plan…');
    const plan = await this.planificar(p);

    const idLote = this.db.generarId(this.COL_LOTES);
    const errores: ErrorCobros[] = [];
    const idsMovimientos: string[] = [];

    await this.db.commitBatch([{
      coleccion: this.COL_LOTES,
      id: idLote,
      modo: 'crear',
      data: {
        tipo: 'cobros',
        estado: 'en curso',
        usuario: this.usuarioSesion.getUsuarioActual()?.email ?? 'Desconocido',
        inicio: new Date().toISOString(),
        fin: null,
        parametros: plan.parametros,
        resumenPlan: plan.resumen,
        registrados: 0,
        errores: [],
        idsMovimientos: [],
      },
    }]);

    let estado: 'completo' | 'con errores' | 'interrumpido' = 'completo';
    try {
      const n = plan.movimientos.length;
      for (let k = 0; k < n; k++) {
        const m = plan.movimientos[k];
        alAvanzar(`${k + 1}/${n}: ${m.datos.fecha} — ${m.etiqueta}`);
        const res = await this.movimientos.registrar(m.datos);
        if (res.exito && res.objeto) idsMovimientos.push(res.objeto.idMovimiento);
        else errores.push({ movimiento: `${m.datos.fecha} ${m.etiqueta}`, mensaje: res.mensaje });
      }
      if (errores.length > 0) estado = 'con errores';
    } catch (e: any) {
      estado = 'interrumpido';
      errores.push({ movimiento: '', mensaje: `Generación interrumpida: ${e?.message ?? e}` });
    }

    // Registro final del lote (best-effort: lo importante ya se escribió).
    try {
      await this.db.commitBatch([{
        coleccion: this.COL_LOTES,
        id: idLote,
        modo: 'actualizar',
        data: {
          estado,
          fin: new Date().toISOString(),
          registrados: idsMovimientos.length,
          errores: errores.slice(0, 200),
          idsMovimientos,
        },
      }]);
    } catch (e) {
      console.error('No se pudo actualizar el lote del generador de cobros', idLote, e);
    }

    return { idLote, registrados: idsMovimientos.length, errores };
  }

  // ---------------------------------------------------------------------------
  // Armado de movimientos
  // ---------------------------------------------------------------------------

  private cobro(
    entidad: EntidadMovimientoFin,
    fecha: string,
    total: number,
    imputaciones: DatosMovimientoFin['imputaciones'],
    azar: Azar,
    p: ParametrosCobros,
    r: ResumenCobros,
    etiqueta: string,
  ): MovimientoPlaneado {
    const conRetencion = azar.chance(p.pctRetencion);
    if (conRetencion) r.conRetencion++;
    r.cobros++;
    r.totalCobrado += total;
    return {
      etiqueta: `${etiqueta} — ${entidad.razonSocial}`,
      total,
      datos: this.datos('cobro', entidad, fecha, 'normal', this.mediosCobro(total, fecha, conRetencion, azar), imputaciones),
    };
  }

  private datos(
    tipo: 'cobro' | 'pago',
    entidad: EntidadMovimientoFin,
    fecha: string,
    concepto: DatosMovimientoFin['concepto'],
    medios: MedioMovimientoFin[],
    imputaciones: DatosMovimientoFin['imputaciones'],
  ): DatosMovimientoFin {
    return { tipo, entidad, fecha, concepto, medios, imputaciones, observaciones: this.OBSERVACION };
  }

  /** Transferencia (85 %) o e-cheq a 15–45 días; con retención de IIBB del
   *  2,5 % si corresponde. Σ medios = total. */
  private mediosCobro(total: number, fecha: string, conRetencion: boolean, azar: Azar): MedioMovimientoFin[] {
    const medios: MedioMovimientoFin[] = [];
    const retencion = conRetencion ? redondear2(total * 0.025) : 0;
    const principal = redondear2(total - retencion);
    const banco = azar.elegir(this.BANCOS);
    if (azar.chance(0.85)) {
      medios.push({
        tipo: 'transferencia', importe: principal, referencia: String(azar.entero(10000000, 99999999)),
        banco, fechaCobro: null, retencion: null,
      });
    } else {
      medios.push({
        tipo: 'echeq', importe: principal, referencia: String(azar.entero(10000000, 99999999)),
        banco, fechaCobro: this.sumarDias(fecha, azar.entero(15, 45)), retencion: null,
      });
    }
    if (conRetencion) {
      medios.push({
        tipo: 'retencion', importe: retencion, referencia: '', banco: null, fechaCobro: null,
        retencion: { impuesto: 'iibb', jurisdiccion: 'Buenos Aires', certificado: String(azar.entero(100000, 999999)) },
      });
    }
    return medios;
  }

  /** Transferencia (90 %) o efectivo. */
  private mediosPago(total: number, azar: Azar): MedioMovimientoFin[] {
    if (azar.chance(0.9)) {
      return [{
        tipo: 'transferencia', importe: total, referencia: String(azar.entero(10000000, 99999999)),
        banco: azar.elegir(this.BANCOS), fechaCobro: null, retencion: null,
      }];
    }
    return [{ tipo: 'efectivo', importe: total, referencia: '', banco: null, fechaCobro: null, retencion: null }];
  }

  // ---------------------------------------------------------------------------
  // Auxiliares
  // ---------------------------------------------------------------------------

  private entidadDe(liq: ConId<InformeLiqNuevo>): EntidadMovimientoFin {
    return {
      tipo: liq.tipo,
      id: liq.entidad.id,
      razonSocial: nombreEntidadRef(liq.entidad),
      cuit: Number(liq.entidad.cuit) || 0,
    };
  }

  /** 'YYYY-MM-DD' + n días, en UTC sobre las partes del string. */
  private sumarDias(fecha: string, dias: number): string {
    const [a, m, d] = fecha.split('-').map(Number);
    return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
  }

  private validarParametros(p: ParametrosCobros): void {
    const pcts = [
      p.pctMorosos, p.pctAtrasados, p.pctParciales, p.pctRetencion, p.pctSaldoAFavor,
      p.pctPagosPendientes, p.pctAnticipos,
    ];
    if (pcts.some(x => !(x >= 0 && x <= 1))) throw new Error('Los porcentajes tienen que estar entre 0 y 1.');
    if (p.pctMorosos + p.pctAtrasados > 1) throw new Error('Morosos + atrasados no pueden superar 1.');
    if (!Number.isInteger(p.semilla)) throw new Error('La semilla tiene que ser un número entero.');
  }

  private verificarEntorno(): void {
    if (!this.esEntornoDemo()) {
      throw new Error(`Generador de cobros bloqueado: el proyecto es '${environment.firebase.projectId}', no demo.`);
    }
    if (this.usuarioSesion.getRol() !== 'dev') {
      throw new Error('Generador de cobros bloqueado: requiere rol dev.');
    }
  }
}
