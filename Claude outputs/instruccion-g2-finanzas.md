````
# Instrucción G2 — Finanzas: Generador de cobros y pagos (demo)

## Contexto

Frente Finanzas. G1 dejó demo con abril–septiembre 2026 liquidado y
facturado. Para probar las pantallas que vienen (F5 Cuenta de la entidad,
F6 Antigüedad y Resumen) hace falta historia financiera realista. Esta
herramienta va en /migracion, es solo demo y rol dev, como G1.

**Qué hace.** Sobre los InformeLiq FACTURADOS con saldo registra
movimientos con la función REAL `MovimientoFinService.registrar`. Así
valida, numera, imputa y escribe en transacción como un usuario.

Criterios acordados con Nico:

- **Clientes:** cobran a 30–60 días de la factura.
  - Una parte se atrasa: 61–120 días. Otra no se cobra: morosos.
  - Algunos cobran en dos partes: 40–80 % primero y el resto 20–40 días
    después.
  - Algunos tienen retención de IIBB (2,5 %).
  - Algunos pagan de más (1–5 %) y queda saldo a favor.
  - Medio: transferencia (85 %) o e-cheq con fecha de cobro.
- **Choferes y proveedores:** se les paga a 2–10 días de su factura, por
  transferencia (90 %) o en efectivo. Unos pocos quedan pendientes.
- **Anticipos:** a una parte de los choferes y proveedores, un anticipo en
  el mes en curso (10–25 % de su última liquidación, redondeado a $ 1.000).
  Queda SIN imputar: lo va a compensar la próxima liquidación cuando exista
  FC1.
- Toda fecha que caería después de hoy NO se registra: esa factura queda
  abierta. Así la antigüedad sale real.
- Un movimiento por factura (dos si el cobro es parcial). Se registran en
  orden de fecha, así la numeración RC/OPG queda cronológica.

**Patrón** (igual que G1):

- "Simular" arma el plan sin escribir. "Generar" ejecuta ese plan.
- Reproducible: misma semilla + mismos datos = mismo plan.
- Los errores se registran y se sigue con el próximo movimiento.
- Lote en `generacionesPrueba` (`tipo: 'cobros'`) con los ids de los
  movimientos. Limpieza de demo ya borra `movimientosFin` y
  `generacionesPrueba`.
- NO es idempotente: una segunda corrida cobra lo que quedó abierto. Para
  rehacer: Limpieza + regenerar (operaciones → circuito → cobros).
- Como corre con rol dev, no se escribe log (exclusión de dev).

Archivos:

- NUEVO `src/app/servicios/desarrollo/generador-cobros.service.ts`
- NUEVO `src/app/componentes/generador-cobros/generador-cobros.component.ts`
- NUEVO `src/app/componentes/generador-cobros/generador-cobros.component.html`
- `src/app/raiz/raiz.module.ts` (import + declaración)
- `src/app/componentes/migracion/migracion.component.html` (sección nueva)

Sin índices ni reglas nuevas: NO hay deploy.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto BUSCAR no aparece, o aparece más de una vez: pará y reportá,
  sin improvisar.
- Archivos con finales de línea LF.
- Build: `npm run build:demo`.
- No toques CLAUDE.md ni CHANGELOG.

## PASO 0 — Verificación (sin cambios)

Corré y reportá la salida:

```bash
grep -n "static readonly PROYECTO_DEMO" src/app/servicios/desarrollo/limpieza-demo.service.ts
grep -n "'movimientosFin'\|'generacionesPrueba'" src/app/servicios/desarrollo/limpieza-demo.service.ts
grep -n "observarInformesAbiertos()" src/app/servicios/finanzas-nueva/finanzas-consulta.service.ts
grep -n "async registrar(d: DatosMovimientoFin)" src/app/servicios/finanzas-nueva/movimiento-fin.service.ts
grep -n "export function fechaBaseAntiguedad" src/app/shared/utils/cuentas-finanzas.util.ts
grep -n "export function igualesPorContenido" src/app/shared/utils/igualdad.util.ts
grep -n "import { GeneradorCircuitoComponent }" src/app/raiz/raiz.module.ts
grep -n "^        GeneradorCircuitoComponent,$" src/app/raiz/raiz.module.ts
grep -n "<app-generador-circuito></app-generador-circuito>" src/app/componentes/migracion/migracion.component.html
grep -rn "GeneradorCobros\|generador-cobros" src/
```

Esperado:

- El grep de `'movimientosFin'\|'generacionesPrueba'` da 2 líneas.
- Los demás dan 1 línea cada uno.
- El último no devuelve nada.

Si algo no coincide, pará y reportá.

## PASO 1 — NUEVO `src/app/servicios/desarrollo/generador-cobros.service.ts`

```ts
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
```

## PASO 2 — NUEVO `src/app/componentes/generador-cobros/generador-cobros.component.ts`

```ts
import { Component, HostListener } from '@angular/core';
import Swal from 'sweetalert2';
import {
  GeneradorCobrosService, PARAMETROS_COBROS_POR_DEFECTO, ParametrosCobros, PlanCobros, ResultadoCobros,
} from 'src/app/servicios/desarrollo/generador-cobros.service';
import { igualesPorContenido } from 'src/app/shared/utils/igualdad.util';

/** Sección "Generador de cobros y pagos" de /migracion (solo demo, rol
 *  dev) — Frente Finanzas G2. Sobre los InformeLiq facturados con saldo:
 *  registra cobros, pagos y anticipos con MovimientoFinService.registrar.
 *  Mismo patrón que GeneradorCircuitoComponent: "Simular" arma el plan (no
 *  escribe); "Generar" ejecuta ESE plan y se habilita solo si los
 *  parámetros no cambiaron desde la simulación. */
@Component({
  selector: 'app-generador-cobros',
  standalone: false,
  templateUrl: './generador-cobros.component.html',
})
export class GeneradorCobrosComponent {

  readonly esDemo: boolean;

  parametros: ParametrosCobros;
  plan: PlanCobros | null = null;
  simulando = false;
  ejecutando = false;
  progreso = '';
  resultado: ResultadoCobros | null = null;
  error = '';

  readonly MAX_ERRORES_VISIBLES = 30;
  readonly MAX_MOVIMIENTOS_VISIBLES = 15;

  /** Inputs de porcentajes (clave, etiqueta, paso). */
  readonly campos: { clave: keyof Omit<ParametrosCobros, 'semilla'>; etiqueta: string; paso: number }[] = [
    { clave: 'pctMorosos', etiqueta: 'Clientes: facturas que no se cobran', paso: 0.01 },
    { clave: 'pctAtrasados', etiqueta: 'Clientes: cobro atrasado (61–120 días)', paso: 0.05 },
    { clave: 'pctParciales', etiqueta: 'Clientes: cobro en dos partes', paso: 0.05 },
    { clave: 'pctRetencion', etiqueta: 'Cobros con retención IIBB', paso: 0.05 },
    { clave: 'pctSaldoAFavor', etiqueta: 'Cobros que pagan de más', paso: 0.01 },
    { clave: 'pctPagosPendientes', etiqueta: 'Choferes/proveedores: pago pendiente', paso: 0.01 },
    { clave: 'pctAnticipos', etiqueta: 'Choferes/proveedores con anticipo (mes en curso)', paso: 0.05 },
  ];

  constructor(private generador: GeneradorCobrosService) {
    this.esDemo = generador.esEntornoDemo();
    this.parametros = { ...PARAMETROS_COBROS_POR_DEFECTO, semilla: this.semillaNueva() };
  }

  get parametrosCambiaron(): boolean {
    return !!this.plan && !igualesPorContenido(this.parametros, this.plan.parametros);
  }

  get puedeEjecutar(): boolean {
    return !!this.plan && this.plan.movimientos.length > 0 && !this.simulando && !this.ejecutando && !this.parametrosCambiaron;
  }

  @HostListener('window:beforeunload', ['$event'])
  avisarSiEjecutando(evento: BeforeUnloadEvent): void {
    if (this.ejecutando) {
      evento.preventDefault();
      evento.returnValue = '';
    }
  }

  nuevaSemilla(): void {
    this.parametros.semilla = this.semillaNueva();
  }

  async simular(): Promise<void> {
    this.error = '';
    this.plan = null;
    this.resultado = null;
    this.simulando = true;
    try {
      this.plan = await this.generador.planificar({ ...this.parametros });
    } catch (e: any) {
      this.error = e?.message ?? String(e);
    } finally {
      this.simulando = false;
    }
  }

  async ejecutar(): Promise<void> {
    if (!this.plan || !this.puedeEjecutar) return;
    this.error = '';
    const r0 = this.plan.resumen;

    const r = await Swal.fire({
      title: `¿Registrar ${this.plan.movimientos.length} movimientos?`,
      html:
        `<p>${r0.cobros} cobros, ${r0.pagos} pagos y ${r0.anticipos} anticipos, con la función real de Finanzas. ` +
        `Tarda varios minutos: <b>no cierres ni recargues esta pestaña</b>.</p>` +
        `<p>No es repetible: una segunda corrida cobra lo que quedó abierto. Para rehacer: Limpieza de demo y regenerar.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Generar',
      cancelButtonText: 'Cancelar',
    });
    if (!r.isConfirmed) return;

    this.ejecutando = true;
    this.resultado = null;
    try {
      this.resultado = await this.generador.ejecutar({ ...this.plan.parametros }, msg => (this.progreso = msg));
      this.plan = null;
    } catch (e: any) {
      this.error = e?.message ?? String(e);
    } finally {
      this.ejecutando = false;
      this.progreso = '';
    }
  }

  private semillaNueva(): number {
    return Math.floor(Math.random() * 1_000_000);
  }
}
```

## PASO 3 — NUEVO `src/app/componentes/generador-cobros/generador-cobros.component.html`

```html
<div class="border border-success rounded-3 p-3 mb-4">
  <h4 class="text-success">Generador de cobros y pagos</h4>

  @if (!esDemo) {
    <div class="alert alert-danger mb-0">Herramienta deshabilitada: solo funciona en demo.</div>
  } @else {
    <p class="mb-3">
      Sobre los informes de liquidación <b>facturados con saldo</b> registra cobros, pagos y anticipos con la función
      real de Finanzas, con fechas realistas desde la factura y nunca futuras: clientes a 30–60 días (algunos
      atrasados o morosos, algunos en dos partes, con retención o pagando de más); choferes y proveedores a 2–10
      días; anticipos del mes en curso pendientes de compensar. <b>Simular</b> no escribe nada. Correr después del
      Generador de circuito, una sola vez.
    </p>

    <div class="row g-2 mb-3" style="max-width: 60rem;">
      @for (c of campos; track c.clave) {
        <div class="col-md-3">
          <label class="form-label mb-0 small">{{ c.etiqueta }} (0–1)</label>
          <input type="number" class="form-control" min="0" max="1" [step]="c.paso"
            [(ngModel)]="parametros[c.clave]" [disabled]="simulando || ejecutando" />
        </div>
      }
      <div class="col-md-3">
        <label class="form-label mb-0 small">Semilla</label>
        <div class="input-group">
          <input type="number" class="form-control" step="1" [(ngModel)]="parametros.semilla" [disabled]="simulando || ejecutando" />
          <button type="button" class="btn btn-outline-secondary" [disabled]="simulando || ejecutando" (click)="nuevaSemilla()" title="Semilla nueva">↻</button>
        </div>
      </div>
    </div>

    <button type="button" class="btn btn-primary me-2" [disabled]="simulando || ejecutando" (click)="simular()">Simular</button>
    <button type="button" class="btn btn-success" [disabled]="!puedeEjecutar" (click)="ejecutar()">Generar</button>
    @if (simulando) {
      <span class="text-muted ms-2">Armando el plan…</span>
    }
    @if (parametrosCambiaron) {
      <span class="text-warning ms-2">Cambiaron los parámetros: volvé a simular antes de generar.</span>
    }
    @if (ejecutando) {
      <div class="alert alert-info mt-3 mb-0">
        <b>Generando…</b> {{ progreso }}<br />
        <small>No cierres ni recargues esta pestaña hasta que termine.</small>
      </div>
    }

    @if (resultado) {
      <div class="alert mt-3 mb-0" [class.alert-success]="resultado.errores.length === 0" [class.alert-warning]="resultado.errores.length > 0">
        <b>Generación terminada</b> (lote {{ resultado.idLote }}):
        {{ resultado.registrados }} movimientos registrados, {{ resultado.errores.length }} error(es).
        @if (resultado.errores.length > 0) {
          <ul class="mb-0 mt-2">
            @for (x of resultado.errores.slice(0, MAX_ERRORES_VISIBLES); track $index) {
              <li>{{ x.movimiento }}: {{ x.mensaje }}</li>
            }
          </ul>
          @if (resultado.errores.length > MAX_ERRORES_VISIBLES) {
            <small>… y {{ resultado.errores.length - MAX_ERRORES_VISIBLES }} más (ver el lote en generacionesPrueba).</small>
          }
        }
      </div>
    }

    @if (error) {
      <div class="alert alert-danger mt-3 mb-0">{{ error }}</div>
    }

    @if (plan) {
      <div class="mt-3">
        <h5>Plan (semilla {{ plan.parametros.semilla }}, hoy {{ plan.hoy }})</h5>
        <ul class="mb-3">
          <li>
            Entrada: {{ plan.resumen.facturadosCliente }} facturas de clientes y
            {{ plan.resumen.facturadosPago }} de choferes/proveedores con saldo.
          </li>
          <li>
            <b>{{ plan.resumen.cobros }}</b> cobros por {{ plan.resumen.totalCobrado | formatearValor: '$' }}
            ({{ plan.resumen.conRetencion }} con retención, {{ plan.resumen.parciales }} facturas en dos partes,
            {{ plan.resumen.conSaldoAFavor }} con saldo a favor). Quedan abiertas {{ plan.resumen.quedanAbiertosCliente }} facturas de clientes.
          </li>
          <li>
            <b>{{ plan.resumen.pagos }}</b> pagos por {{ plan.resumen.totalPagado | formatearValor: '$' }}.
            Quedan abiertas {{ plan.resumen.quedanAbiertosPago }} facturas de choferes/proveedores.
          </li>
          <li>
            <b>{{ plan.resumen.anticipos }}</b> anticipos por {{ plan.resumen.totalAnticipos | formatearValor: '$' }} (sin imputar).
          </li>
        </ul>

        <table class="table table-sm" style="max-width: 60rem;">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Movimiento</th>
              <th class="text-end">Total</th>
            </tr>
          </thead>
          <tbody>
            @for (m of plan.movimientos.slice(0, MAX_MOVIMIENTOS_VISIBLES); track $index) {
              <tr>
                <td>{{ m.datos.fecha }}</td>
                <td>{{ m.etiqueta }}</td>
                <td class="text-end">{{ m.total | formatearValor: '$' }}</td>
              </tr>
            }
          </tbody>
        </table>
        @if (plan.movimientos.length > MAX_MOVIMIENTOS_VISIBLES) {
          <small class="text-muted">Primeros {{ MAX_MOVIMIENTOS_VISIBLES }} de {{ plan.movimientos.length }}, en orden de registro.</small>
        }
      </div>
    }
  }
</div>
```

## PASO 4 — `src/app/raiz/raiz.module.ts`

### 4a — import

BUSCAR:
```ts
import { GeneradorCircuitoComponent } from '../componentes/generador-circuito/generador-circuito.component';
```

REEMPLAZAR:
```ts
import { GeneradorCircuitoComponent } from '../componentes/generador-circuito/generador-circuito.component';
import { GeneradorCobrosComponent } from '../componentes/generador-cobros/generador-cobros.component';
```

### 4b — declaración

BUSCAR:
```ts
        GeneradorCircuitoComponent,
```

REEMPLAZAR:
```ts
        GeneradorCircuitoComponent,
        GeneradorCobrosComponent,
```

## PASO 5 — `src/app/componentes/migracion/migracion.component.html`

BUSCAR:
```html
  <app-generador-circuito></app-generador-circuito>
```

REEMPLAZAR:
```html
  <app-generador-circuito></app-generador-circuito>

  <app-generador-cobros></app-generador-cobros>
```

## PASO 6 — Verificación

```bash
npm run build:demo
grep -rn "app-generador-cobros" src/          # selector + migracion.component.html
grep -c "GeneradorCobrosComponent" src/app/raiz/raiz.module.ts   # 2
git status --short
```

Esperado:

- El build termina sin errores. Los warnings de presupuesto previos no
  cuentan.
- `git status` muestra:
  - 2 archivos modificados: raiz.module y migracion html;
  - el servicio nuevo y la carpeta nueva `componentes/generador-cobros/`;
  - lo tuyo sin trackear, si lo hay.

Reportá la salida.

## Pruebas manuales (demo, rol dev)

1. **Sección visible.** /migracion muestra "Generador de cobros y pagos"
   debajo del Generador de circuito, con los 7 porcentajes y la semilla.
2. **Simular.**
   - Muestra la entrada: facturas de clientes y de choferes/proveedores con
     saldo.
   - Muestra cobros (con retención, en dos partes, con saldo a favor),
     pagos y anticipos, con totales y lo que queda abierto.
   - Muestra los primeros 15 movimientos en orden de fecha.
   - Simular otra vez con la misma semilla da exactamente lo mismo. Con
     otra semilla, cambia.
   - Cambiar un porcentaje sin volver a simular deshabilita "Generar".
3. **Generar.** Confirmá y esperá (varios minutos, con progreso). Termina
   con "N movimientos registrados, 0 error(es)".
4. **Finanzas → Movimientos** (rango: desde abril):
   - aparecen los RC/OPG con fechas de mayo en adelante, numerados en orden
     de fecha;
   - se ven retenciones (medios "Transferencia + Retención"), e-cheqs y
     algunos movimientos con "Sin imputar" (saldo a favor);
   - los anticipos aparecen con fecha del mes en curso.
5. **Finanzas → Cuentas:**
   - A cobrar: quedan clientes con saldo (morosos, atrasados, facturas
     recientes todavía no vencidas) y "+60 días" > 0 en algunos;
   - A pagar: pocos con saldo facturado, y aparecen anticipos.
6. **Coherencia:**
   - abrir el detalle de un cobro en dos partes: cada parte imputa al mismo
     informe y la suma da el total del informe;
   - un cliente con saldo a favor muestra "Saldo a favor" en Cuentas, y en
     Movimientos se puede imputar (F4b) si tiene otra factura abierta.
7. **Lote.** En Firestore, `generacionesPrueba/<idLote>` tiene
   `tipo: 'cobros'`, `estado: 'completo'`, `registrados` e
   `idsMovimientos`.

## Commit (lo hace Nico)

```
feat(demo): generador de cobros y pagos de prueba (G2)

- GeneradorCobrosService + sección en /migracion (solo demo, rol dev):
  sobre los InformeLiq facturados con saldo registra cobros (30–60 días,
  atrasados, morosos, parciales, retención IIBB, saldo a favor), pagos a
  choferes/proveedores (2–10 días) y anticipos del mes en curso, con
  MovimientoFinService.registrar. Fechas nunca futuras; orden cronológico;
  reproducible por semilla; lote en generacionesPrueba (tipo 'cobros').
```
````
