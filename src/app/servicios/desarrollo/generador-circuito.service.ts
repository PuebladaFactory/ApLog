import { Injectable, inject } from '@angular/core';
import { environment } from 'src/environments/environment';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiqNuevo, PeriodoLiq } from 'src/app/interfaces/informe-liq-nuevo';
import { InformeOpNuevo } from 'src/app/interfaces/informe-op-nuevo';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { LimpiezaDemoService } from 'src/app/servicios/desarrollo/limpieza-demo.service';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { InformeLiqFactoryService } from 'src/app/servicios/informes-liq/informe-liq-factory.service';
import { DatosLiquidacion, InformeLiqService } from 'src/app/servicios/informes-liq/informe-liq.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import { Azar } from 'src/app/shared/utils/azar.util';
import { columnasPorTipo } from 'src/app/shared/utils/columnas-liquidacion.util';
import { nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';
import { DatosQrAfip } from 'src/app/shared/utils/factura-electronica.util';

export type TipoLiqCircuito = 'cliente' | 'chofer' | 'proveedor';

export interface ParametrosCircuito {
  desde: string;          // 'YYYY-MM' — primer mes (inclusive)
  hasta: string;          // 'YYYY-MM' — último mes (inclusive)
  pctLiquidar: number;    // por entidad y mes: se liquida (0..1)
  pctBorrador: number;    // de lo que se liquida: queda en borrador en vez de emitirse (0..1)
  pctFacturar: number;    // de lo emitido: se le vincula una factura de prueba (0..1)
  semilla: number;
}

export const PARAMETROS_CIRCUITO_POR_DEFECTO: Omit<ParametrosCircuito, 'desde' | 'hasta' | 'semilla'> = {
  pctLiquidar: 0.9,
  pctBorrador: 0.05,
  pctFacturar: 0.85,
};

/** Una liquidación que el plan va a crear. */
export interface LiquidacionPlaneada {
  tipo: TipoLiqCircuito;
  idEntidad: string;
  nombre: string;
  periodo: PeriodoLiq;
  idsInformesOp: string[];
  totalEstimado: number;          // Σ valores.total de los InformeOp (sin ajustes)
  modo: 'emitido' | 'borrador';
  facturar: boolean;
  fechaFactura: string | null;    // 'YYYY-MM-DD' (≤ hoy) — fecha del comprobante de prueba
  partida: boolean;               // la entidad/mes superó el tope de InformeOp y se partió
}

export interface ResumenTipoCircuito {
  tipo: TipoLiqCircuito;
  liquidaciones: number;
  emitidas: number;
  borradores: number;
  aFacturar: number;
  informesOp: number;
  total: number;
}

export interface ResumenCircuito {
  informesActivos: number;        // InformeOp 'activo' del rango (liquidables)
  informesBloqueados: number;     // 'activo' pero bloqueados por la proforma de la contraparte (se saltean)
  grupos: number;                 // entidad × mes con InformeOp liquidables
  gruposSinLiquidar: number;      // los que el azar deja sin liquidar (pctLiquidar)
  liquidaciones: number;
  partidas: number;               // liquidaciones que salen de partir un grupo por el tope
  porTipo: ResumenTipoCircuito[];
}

export interface PlanCircuito {
  parametros: ParametrosCircuito;
  liquidaciones: LiquidacionPlaneada[];
  resumen: ResumenCircuito;
}

export interface ErrorCircuito {
  liquidacion: string;
  mensaje: string;
}

export interface ResultadoCircuito {
  idLote: string;
  emitidas: number;
  borradores: number;
  facturadas: number;
  errores: ErrorCircuito[];
}

/** Generador de CIRCUITO de prueba (solo DEMO, rol dev) — Frente Finanzas G1.
 *  Toma los InformeOp 'activo' de un rango de meses (los que dejaron el
 *  Generador de operaciones o la operatoria manual) y recorre lo que sigue
 *  al cierre con las FUNCIONES REALES:
 *   1. Liquidar: por entidad y mes, InformeLiqService.emitir (o crearBorrador)
 *      con todos sus InformeOp del mes; si superan el tope
 *      (InformeLiqService.MAX_INFORMES_OP), se parte por quincena y, si
 *      hace falta, en bloques del tope.
 *   2. Facturar: a una parte de lo emitido le vincula una factura de PRUEBA
 *      con InformeLiqService.vincularFactura: PDF mínimo generado acá +
 *      texto de QR AFIP sintético (importe = total del informe, CUIT de la
 *      entidad del lado que corresponde, fecha = fin del período + 1..10
 *      días, nunca futura). Sirve para que Finanzas tenga facturados con
 *      antigüedad realista (la antigüedad se cuenta desde la fecha de la
 *      factura).
 *  Reproducible: misma semilla + mismos datos = mismo plan. `ejecutar`
 *  vuelve a armar el plan con los mismos parámetros. No es atómico en
 *  conjunto: cada liquidación/factura es un gesto real (atómico); si algo
 *  falla se registra y sigue. Orden: clientes primero (una proforma de
 *  chofer/proveedor bloquea los InformeOp del cliente de la contraparte).
 *  Registra el lote en `generacionesPrueba` (tipo 'circuito').
 *  Diseño: claude/diseno-finanzas.md §4.9 (F17, F18). */
@Injectable({ providedIn: 'root' })
export class GeneradorCircuitoService {

  private db = inject(DbFirestoreService);
  private informeLiqServ = inject(InformeLiqService);
  private factory = inject(InformeLiqFactoryService);
  private usuarioSesion = inject(UsuarioSesionService);

  private readonly COL_LOTES = 'generacionesPrueba';
  private readonly MAX_MESES = 12;
  private readonly ORDEN_TIPOS: readonly TipoLiqCircuito[] = ['cliente', 'chofer', 'proveedor'];
  /** CUIT ficticio de la empresa en las facturas de prueba: emisor de las de
   *  clientes y receptor de las de choferes/proveedores (la validación solo
   *  mira el CUIT de la entidad). */
  private readonly CUIT_EMPRESA_DEMO = 30711111118;
  private readonly OBSERVACION = 'Generada por el Generador de circuito (demo).';

  esEntornoDemo(): boolean {
    return environment.firebase.projectId === LimpiezaDemoService.PROYECTO_DEMO;
  }

  /** Arma el plan en memoria. Solo lee InformeOp; no escribe nada. */
  async planificar(p: ParametrosCircuito): Promise<PlanCircuito> {
    this.verificarEntorno();
    this.validarParametros(p);

    const azar = new Azar(p.semilla);
    const hoy = toISODateString(new Date());
    const desde = `${p.desde}-01`;
    const hasta = `${p.hasta}-${String(this.ultimoDia(p.hasta)).padStart(2, '0')}`;

    const todos = (await this.db.consultarPorRango<InformeOpNuevo>('informesOp', 'fecha', desde, hasta))
      .map(i => ({ ...i, idInfOp: i.id }));
    const activos = todos.filter(i => i.estado === 'activo');
    const liquidables = activos.filter(i => !i.bloqueadoPorContraparte);

    // Grupos entidad × mes, en orden determinista (tipo, nombre, id, mes).
    const grupos = new Map<string, ConId<InformeOpNuevo>[]>();
    for (const inf of liquidables) {
      const clave = `${inf.tipo}|${inf.entidad.id}|${inf.fecha.slice(0, 7)}`;
      const lista = grupos.get(clave);
      if (lista) lista.push(inf); else grupos.set(clave, [inf]);
    }
    const ordenados = [...grupos.values()]
      .map(lista => lista.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.idInfOp.localeCompare(b.idInfOp)))
      .sort((a, b) =>
        this.ORDEN_TIPOS.indexOf(a[0].tipo) - this.ORDEN_TIPOS.indexOf(b[0].tipo) ||
        nombreEntidadRef(a[0].entidad).localeCompare(nombreEntidadRef(b[0].entidad)) ||
        a[0].entidad.id.localeCompare(b[0].entidad.id) ||
        a[0].fecha.localeCompare(b[0].fecha));

    const liquidaciones: LiquidacionPlaneada[] = [];
    let gruposSinLiquidar = 0;
    for (const lista of ordenados) {
      if (!azar.chance(p.pctLiquidar)) {
        gruposSinLiquidar++;
        continue;
      }
      const [anio, mes] = lista[0].fecha.slice(0, 7).split('-').map(Number);
      const partes = this.partir(lista, anio, mes);
      for (const parte of partes) {
        const modo: LiquidacionPlaneada['modo'] = azar.chance(p.pctBorrador) ? 'borrador' : 'emitido';
        const facturar = modo === 'emitido' && azar.chance(p.pctFacturar);
        let fechaFactura: string | null = null;
        if (facturar) {
          const fin = this.factory.ventanaPeriodo(parte.periodo).hasta;
          const candidata = this.sumarDias(fin, azar.entero(1, 10));
          fechaFactura = candidata > hoy ? hoy : candidata;
        }
        liquidaciones.push({
          tipo: lista[0].tipo,
          idEntidad: lista[0].entidad.id,
          nombre: nombreEntidadRef(lista[0].entidad),
          periodo: parte.periodo,
          idsInformesOp: parte.informes.map(i => i.idInfOp),
          totalEstimado: Math.round(parte.informes.reduce((acc, i) => acc + (i.valores?.total ?? 0), 0) * 100) / 100,
          modo,
          facturar,
          fechaFactura,
          partida: partes.length > 1,
        });
      }
    }

    return {
      parametros: { ...p },
      liquidaciones,
      resumen: this.resumir(activos.length, activos.length - liquidables.length, grupos.size, gruposSinLiquidar, liquidaciones),
    };
  }

  /** Ejecuta el plan (lo vuelve a armar con los mismos parámetros). Por
   *  liquidación: emitir / crearBorrador y, si corresponde, vincular la
   *  factura de prueba. Los errores se registran y se sigue con la próxima. */
  async ejecutar(p: ParametrosCircuito, alAvanzar: (mensaje: string) => void): Promise<ResultadoCircuito> {
    this.verificarEntorno();
    alAvanzar('Armando el plan…');
    const plan = await this.planificar(p);

    const idLote = this.db.generarId(this.COL_LOTES);
    const errores: ErrorCircuito[] = [];
    const idsInformesLiq: string[] = [];
    let emitidas = 0;
    let borradores = 0;
    let facturadas = 0;

    await this.db.commitBatch([{
      coleccion: this.COL_LOTES,
      id: idLote,
      modo: 'crear',
      data: {
        tipo: 'circuito',
        estado: 'en curso',
        usuario: this.usuarioSesion.getUsuarioActual()?.email ?? 'Desconocido',
        inicio: new Date().toISOString(),
        fin: null,
        parametros: plan.parametros,
        resumenPlan: {
          liquidaciones: plan.resumen.liquidaciones,
          partidas: plan.resumen.partidas,
          gruposSinLiquidar: plan.resumen.gruposSinLiquidar,
        },
        emitidas: 0,
        borradores: 0,
        facturadas: 0,
        errores: [],
        idsInformesLiq: [],
      },
    }]);

    let estado: 'completo' | 'con errores' | 'interrumpido' = 'completo';
    try {
      const n = plan.liquidaciones.length;
      for (let k = 0; k < n; k++) {
        const l = plan.liquidaciones[k];
        const etiqueta = `${l.tipo} ${l.nombre} · ${this.factory.textoPeriodo(l.periodo)}`;
        alAvanzar(`${k + 1}/${n}: ${l.modo === 'borrador' ? 'borrador' : 'emisión'} — ${etiqueta}`);

        const datos: DatosLiquidacion = {
          tipo: l.tipo,
          idsInformesOp: l.idsInformesOp,
          periodo: l.periodo,
          descuentos: [],
          columnas: columnasPorTipo(l.tipo).filter(c => c.seleccionada).map(c => c.nombre),
          observaciones: this.OBSERVACION,
        };
        const res = l.modo === 'borrador'
          ? await this.informeLiqServ.crearBorrador(datos)
          : await this.informeLiqServ.emitir(datos);
        if (!res.exito || !res.objeto) {
          errores.push({ liquidacion: etiqueta, mensaje: res.mensaje });
          continue;
        }
        idsInformesLiq.push(res.objeto.idInfLiq);
        if (l.modo === 'borrador') {
          borradores++;
          continue;
        }
        emitidas++;

        if (l.facturar && l.fechaFactura) {
          alAvanzar(`${k + 1}/${n}: factura — ${etiqueta}`);
          const r = await this.facturar(res.objeto.idInfLiq, l.fechaFactura);
          if (r) errores.push({ liquidacion: `${etiqueta} (factura)`, mensaje: r });
          else facturadas++;
        }
      }
      if (errores.length > 0) estado = 'con errores';
    } catch (e: any) {
      estado = 'interrumpido';
      errores.push({ liquidacion: '', mensaje: `Generación interrumpida: ${e?.message ?? e}` });
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
          emitidas,
          borradores,
          facturadas,
          errores: errores.slice(0, 200),
          idsInformesLiq,
        },
      }]);
    } catch (e) {
      console.error('No se pudo actualizar el lote del generador de circuito', idLote, e);
    }

    return { idLote, emitidas, borradores, facturadas, errores };
  }

  // ---------------------------------------------------------------------------
  // Factura de prueba
  // ---------------------------------------------------------------------------

  /** Vincula una factura de prueba al emitido con la función real
   *  (vincularFactura: sube el PDF, transacción, índice de unicidad, log).
   *  Devuelve el mensaje de error o null. */
  private async facturar(idInfLiq: string, fecha: string): Promise<string | null> {
    const liq = await this.informeLiqServ.obtenerPorId(idInfLiq);
    if (!liq) return `No se encontró el informe ${idInfLiq} recién emitido.`;
    const datosQr = this.datosQr(liq, fecha);
    const textoQr = `https://www.afip.gob.ar/fe/qr/?p=${btoa(JSON.stringify(datosQr))}`;
    const archivo = await this.pdfFactura(liq, datosQr);
    const res = await this.informeLiqServ.vincularFactura(idInfLiq, archivo, textoQr);
    return res.exito ? null : res.mensaje;
  }

  /** Datos del QR AFIP sintético (RG 4291: `cuit` = emisor, `nroDocRec` =
   *  receptor). Número de comprobante = número del informe (LQCL/LQCH/LQPR
   *  son series propias) → la clave de unicidad no se repite. */
  private datosQr(liq: InformeLiqNuevo, fecha: string): DatosQrAfip {
    const nro = Number((liq.numeroInterno ?? '').split('-')[1]) || 1;
    const esCliente = liq.tipo === 'cliente';
    const cuitEntidad = Number(liq.entidad.cuit) || 0;
    return {
      ver: 1,
      fecha,
      cuit: esCliente ? this.CUIT_EMPRESA_DEMO : cuitEntidad,
      ptoVta: esCliente ? 1 : 2,
      tipoCmp: liq.tipo === 'chofer' ? 11 : 1,     // chofer: Factura C (monotributo); resto: Factura A
      nroCmp: nro,
      importe: liq.valores.total,
      moneda: 'PES',
      ctz: 1,
      tipoDocRec: 80,
      nroDocRec: esCliente ? cuitEntidad : this.CUIT_EMPRESA_DEMO,
      tipoCodAut: 'E',
      codAut: 70000000000000 + nro,
    };
  }

  /** PDF mínimo de una página que dice que es una factura de PRUEBA.
   *  Solo caracteres WinAnsi (jsPDF con Helvetica estándar). */
  private async pdfFactura(liq: InformeLiqNuevo, d: DatosQrAfip): Promise<File> {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF();
    const lineas = [
      `Tipo ${d.tipoCmp} - Punto de venta ${String(d.ptoVta).padStart(4, '0')} - Numero ${String(d.nroCmp).padStart(8, '0')}`,
      `Fecha: ${d.fecha}`,
      `CUIT emisor: ${d.cuit}`,
      `CUIT receptor: ${d.nroDocRec ?? ''}`,
      `Importe: $ ${d.importe.toFixed(2)}`,
      `CAE: ${d.codAut}`,
      `Liquidacion: ${liq.numeroInterno ?? ''} - ${nombreEntidadRef(liq.entidad)}`,
    ];
    pdf.setFontSize(16);
    pdf.text('FACTURA DE PRUEBA - DEMO', 15, 20);
    pdf.setFontSize(10);
    pdf.text('Documento generado automaticamente para pruebas. Sin validez fiscal.', 15, 28);
    pdf.setFontSize(12);
    lineas.forEach((l, i) => pdf.text(l, 15, 42 + i * 8));
    const blob = pdf.output('blob');
    return new File([blob], `factura-demo-${liq.numeroInterno ?? liq.idInfLiq}.pdf`, { type: 'application/pdf' });
  }

  // ---------------------------------------------------------------------------
  // Auxiliares
  // ---------------------------------------------------------------------------

  /** Parte un grupo entidad × mes que supera el tope: por quincena y, si una
   *  quincena también lo supera, en bloques del tope (mismo período). */
  private partir(
    informes: ConId<InformeOpNuevo>[],
    anio: number,
    mes: number,
  ): { periodo: PeriodoLiq; informes: ConId<InformeOpNuevo>[] }[] {
    const max = InformeLiqService.MAX_INFORMES_OP;
    if (informes.length <= max) return [{ periodo: { anio, mes, tramo: 'mes' }, informes }];
    const partes: { periodo: PeriodoLiq; informes: ConId<InformeOpNuevo>[] }[] = [];
    for (const tramo of ['1q', '2q'] as const) {
      const quincena = informes.filter(i => {
        const dia = Number(i.fecha.slice(8, 10));
        return tramo === '1q' ? dia <= 15 : dia > 15;
      });
      for (let k = 0; k < quincena.length; k += max) {
        partes.push({ periodo: { anio, mes, tramo }, informes: quincena.slice(k, k + max) });
      }
    }
    return partes;
  }

  private resumir(
    informesActivos: number,
    informesBloqueados: number,
    grupos: number,
    gruposSinLiquidar: number,
    liquidaciones: LiquidacionPlaneada[],
  ): ResumenCircuito {
    const porTipo = this.ORDEN_TIPOS.map(tipo => {
      const ls = liquidaciones.filter(l => l.tipo === tipo);
      return {
        tipo,
        liquidaciones: ls.length,
        emitidas: ls.filter(l => l.modo === 'emitido').length,
        borradores: ls.filter(l => l.modo === 'borrador').length,
        aFacturar: ls.filter(l => l.facturar).length,
        informesOp: ls.reduce((acc, l) => acc + l.idsInformesOp.length, 0),
        total: Math.round(ls.reduce((acc, l) => acc + l.totalEstimado, 0) * 100) / 100,
      };
    });
    return {
      informesActivos,
      informesBloqueados,
      grupos,
      gruposSinLiquidar,
      liquidaciones: liquidaciones.length,
      partidas: liquidaciones.filter(l => l.partida).length,
      porTipo,
    };
  }

  /** Último día del mes 'YYYY-MM' (sin depender del huso horario). */
  private ultimoDia(mesClave: string): number {
    const [a, m] = mesClave.split('-').map(Number);
    return new Date(Date.UTC(a, m, 0)).getUTCDate();
  }

  /** 'YYYY-MM-DD' + n días, en UTC sobre las partes del string. */
  private sumarDias(fecha: string, dias: number): string {
    const [a, m, d] = fecha.split('-').map(Number);
    return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
  }

  private validarParametros(p: ParametrosCircuito): void {
    const formato = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!formato.test(p.desde) || !formato.test(p.hasta)) throw new Error('Meses inválidos (YYYY-MM).');
    if (p.desde > p.hasta) throw new Error('"Desde" no puede ser posterior a "hasta".');
    const [a1, m1] = p.desde.split('-').map(Number);
    const [a2, m2] = p.hasta.split('-').map(Number);
    const meses = (a2 - a1) * 12 + (m2 - m1) + 1;
    if (meses > this.MAX_MESES) throw new Error(`El rango no puede superar ${this.MAX_MESES} meses.`);
    const pcts = [p.pctLiquidar, p.pctBorrador, p.pctFacturar];
    if (pcts.some(x => !(x >= 0 && x <= 1))) throw new Error('Los porcentajes tienen que estar entre 0 y 1.');
    if (!Number.isInteger(p.semilla)) throw new Error('La semilla tiene que ser un número entero.');
  }

  private verificarEntorno(): void {
    if (!this.esEntornoDemo()) {
      throw new Error(`Generador de circuito bloqueado: el proyecto es '${environment.firebase.projectId}', no demo.`);
    }
    if (this.usuarioSesion.getRol() !== 'dev') {
      throw new Error('Generador de circuito bloqueado: requiere rol dev.');
    }
  }
}
