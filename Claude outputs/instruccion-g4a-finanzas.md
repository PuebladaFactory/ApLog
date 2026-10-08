````
# Instrucción G4a — Finanzas: fechas realistas en el Generador de circuito

## Contexto

Frente Finanzas, bloque G4a. En demo, el Mayor de una entidad muestra
liquidaciones de abril emitidas en octubre. G1 (Generador de circuito) emite
todo con la fecha del día en que se corre, porque `InformeLiqService`
siempre usa "hoy". G4 arregla eso en dos bloques:

- **G4a (este):** fecha de emisión opcional en `InformeLiqService` y G1 con
  fechas realistas.
- **G4b:** modo "Anticipos" en el Generador de cobros (G2).

Después de G4b, Nico regenera demo.

Decisiones (diseno-finanzas.md §23, F63–F69):

- **F63.** `DatosLiquidacion` suma `fechaEmision?: string` ('YYYY-MM-DD').
  - La usa solo `crearNuevo` (emitir / crearBorrador).
  - Sin ella todo sigue igual (hoy). La pantalla de liquidación NO la manda.
  - Con ella:
    - formato válido;
    - fin del período ≤ fecha ≤ hoy;
    - un movimiento compensado no puede tener fecha posterior a la emisión.
  - Va a fechaEmision / fechaCreacion del informe y a la fecha de la
    imputación de compensación (eso ya lo hace `factory.crear` con `fecha`).
  - Sirve también para la migración de históricos (§16).
- **F64.** Emisión = fin del período + 1..15 días. Si cae después de hoy, esa
  liquidación NO se genera: sus InformeOp quedan activos.
- **F65.** Factura = emisión + 0..10 días. Si cae después de hoy, queda
  emitida sin factura.
- **F67.** Compensaciones solo con movimientos de fecha ≤ emisión.
  - Orden del plan y de la ejecución: primero las emitidas por fecha de
    emisión, así la numeración LQ queda cronológica.
  - Después los borradores, clientes primero.
  - Motivo: solo el BORRADOR de chofer/proveedor bloquea los InformeOp del
    cliente de la contraparte; una emisión no.
- **F68.** CUIT de la empresa en las facturas de prueba: el de Datos de la
  empresa (F8b) si es válido; si no, el ficticio `30711111111`. El anterior,
  30711111118, no pasaba el dígito verificador.

G1 cambia bastante (planificar se arma en 3 pasos), así que el servicio y el
HTML del componente se reemplazan completos. `informe-liq.service.ts` y el
.ts del componente van con BUSCAR/REEMPLAZAR.

Archivos:

- `src/app/servicios/informes-liq/informe-liq.service.ts` (4 cambios)
- `src/app/servicios/desarrollo/generador-circuito.service.ts` (contenido
  completo)
- `src/app/componentes/generador-circuito/generador-circuito.component.ts`
  (2 cambios)
- `src/app/componentes/generador-circuito/generador-circuito.component.html`
  (contenido completo)

Sin reglas ni índices: NO hay deploy.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto BUSCAR no aparece, o aparece más de una vez: pará y reportá,
  sin improvisar.
- Editá el archivo en el lugar: leer, reemplazar, escribir. Nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Archivos con finales de línea LF.
- Build: `npm run build:demo`.
- No toques CLAUDE.md ni CHANGELOG.
- Si tocás un tipo, revisá todos sus usos, incluidos .spec.ts y .html.
- Esta instrucción termina con la línea `FIN DE LA INSTRUCCIÓN G4a`. Si no la
  ves, leé el archivo completo antes de empezar.

## PASO 0 — Verificación (sin cambios)

Corré y reportá la salida:

```bash
grep -n "compensaciones?: CompensacionSolicitada\[\];" src/app/servicios/informes-liq/informe-liq.service.ts
grep -n "const fecha = toISODateString(new Date());" src/app/servicios/informes-liq/informe-liq.service.ts
grep -n "private validarDatos(d: DatosLiquidacion)" src/app/servicios/informes-liq/informe-liq.service.ts
grep -n "ventanaPeriodo(periodo: PeriodoLiq)" src/app/servicios/informes-liq/informe-liq-factory.service.ts
grep -n "async obtener(forzar = false)" src/app/servicios/configuracion/configuracion-empresa.service.ts
grep -n "export function cuitValido\|export function formatearCuit" src/app/shared/utils/datos-empresa.util.ts
grep -n "CUIT_EMPRESA_DEMO = 30711111118" src/app/servicios/desarrollo/generador-circuito.service.ts
grep -rln "LiquidacionPlaneada\|ResumenCircuito\|PlanCircuito" src/
wc -l src/app/servicios/desarrollo/generador-circuito.service.ts src/app/componentes/generador-circuito/generador-circuito.component.html
```

Esperado:

- **Grep 1:** 2 líneas (`DatosLiquidacion` y `CambiosDatosLiq`).
- **Grep 2:** 2 líneas (`emitirBorrador` y `crearNuevo`).
- **Greps 3 a 5:** 1 línea cada uno.
- **Grep 6:** 2 líneas.
- **Grep 7:** 1 línea.
- **Grep 8:** solo aparecen `generador-circuito.service.ts` y
  `generador-circuito.component.ts`.
- **wc:** 534 y 150 líneas.

Si algo no coincide, pará y reportá.

## PASO 1 — `src/app/servicios/informes-liq/informe-liq.service.ts`

### 1a — campo opcional en DatosLiquidacion

BUSCAR:
```ts
  // transacción). Opcional: sin compensaciones = [] (generadores, etc.).
  compensaciones?: CompensacionSolicitada[];
}
```

REEMPLAZAR:
```ts
  // transacción). Opcional: sin compensaciones = [] (generadores, etc.).
  compensaciones?: CompensacionSolicitada[];
  // G4: fecha de emisión ('YYYY-MM-DD') para cargar con fecha pasada
  // (generadores de demo; migración de históricos). La UI NO la manda:
  // sin ella = hoy. Con ella: fin del período ≤ fecha ≤ hoy, y los
  // movimientos compensados no pueden ser posteriores.
  fechaEmision?: string;
}
```

### 1b — crearNuevo: fecha

BUSCAR:
```ts
    const idInfLiq = this.db.generarId(this.COLECCION);
    const fecha = toISODateString(new Date());
```

REEMPLAZAR:
```ts
    const hoy = toISODateString(new Date());
    const errorFecha = this.validarFechaEmision(d, hoy);
    if (errorFecha) return { exito: false, mensaje: errorFecha };
    const fecha = d.fechaEmision ?? hoy;
    const idInfLiq = this.db.generarId(this.COLECCION);
```

### 1c — crearNuevo: compensaciones no posteriores a la emisión

BUSCAR:
```ts
          solicitudes, movimientos, { tipo: d.tipo, id: informes[0].entidad.id }, null,
        );
```

REEMPLAZAR:
```ts
          solicitudes, movimientos, { tipo: d.tipo, id: informes[0].entidad.id }, null,
        );
        const posterior = compensaciones.find(c => c.fecha > fecha);
        if (posterior) {
          throw new Error(
            `El movimiento ${posterior.numero} (${posterior.fecha}) es posterior a la fecha de emisión (${fecha}): no se puede compensar.`,
          );
        }
```

Con "hoy" esto no cambia nada para la UI: un movimiento vigente no tiene
fecha futura.

### 1d — validarFechaEmision (nuevo método, después de validarDatos)

BUSCAR:
```ts
    if (!Number.isInteger(d.periodo.anio)) return 'Período inválido (año).';
    return null;
  }
```

REEMPLAZAR:
```ts
    if (!Number.isInteger(d.periodo.anio)) return 'Período inválido (año).';
    return null;
  }

  /** G4: fecha de emisión explícita (opcional). Formato real 'YYYY-MM-DD',
   *  no anterior al fin del período ni posterior a hoy. Mensaje o null. */
  private validarFechaEmision(d: DatosLiquidacion, hoy: string): string | null {
    if (d.fechaEmision === undefined) return null;
    const f = d.fechaEmision;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f ?? '');
    const valida = !!m &&
      new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toISOString().slice(0, 10) === f;
    if (!valida) return `Fecha de emisión inválida: '${f}' (se espera YYYY-MM-DD).`;
    const fin = this.factory.ventanaPeriodo(d.periodo).hasta;
    if (f < fin) return `La fecha de emisión (${f}) no puede ser anterior al fin del período (${fin}).`;
    if (f > hoy) return `La fecha de emisión (${f}) no puede ser posterior a hoy (${hoy}).`;
    return null;
  }
```

`validarFechaEmision` corre después de `validarDatos`, que ya validó el
período. `new Date(Date.UTC(...))` solo comprueba que la fecha exista (por
ejemplo, rechaza 2026-02-30); no convierte el string.

`emitirBorrador` NO cambia: emitir un borrador desde la UI sigue siendo con
fecha de hoy.

## PASO 2 — `src/app/servicios/desarrollo/generador-circuito.service.ts` (contenido completo)

Reemplazá TODO el contenido del archivo por esto:

```ts
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiqNuevo, PeriodoLiq } from 'src/app/interfaces/informe-liq-nuevo';
import { InformeOpNuevo } from 'src/app/interfaces/informe-op-nuevo';
import { ConfiguracionEmpresaService } from 'src/app/servicios/configuracion/configuracion-empresa.service';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { LimpiezaDemoService } from 'src/app/servicios/desarrollo/limpieza-demo.service';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { InformeLiqFactoryService } from 'src/app/servicios/informes-liq/informe-liq-factory.service';
import { DatosLiquidacion, InformeLiqService } from 'src/app/servicios/informes-liq/informe-liq.service';
import { FinanzasConsultaService } from 'src/app/servicios/finanzas-nueva/finanzas-consulta.service';
import {
  CompensacionSolicitada, MAX_COMPENSACIONES, armarCompensables, netoDe,
} from 'src/app/shared/utils/compensacion.util';
import { redondear2 } from 'src/app/shared/utils/finanzas.util';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import { Azar } from 'src/app/shared/utils/azar.util';
import { columnasPorTipo } from 'src/app/shared/utils/columnas-liquidacion.util';
import { cuitValido } from 'src/app/shared/utils/datos-empresa.util';
import { nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';
import { DatosQrAfip } from 'src/app/shared/utils/factura-electronica.util';

export type TipoLiqCircuito = 'cliente' | 'chofer' | 'proveedor';

export interface ParametrosCircuito {
  desde: string;          // 'YYYY-MM' — primer mes (inclusive)
  hasta: string;          // 'YYYY-MM' — último mes (inclusive)
  pctLiquidar: number;    // por entidad y mes: se liquida (0..1)
  pctBorrador: number;    // de lo que se liquida: queda en borrador en vez de emitirse (0..1)
  pctFacturar: number;    // de lo emitido: se le vincula una factura de prueba (0..1)
  // G3 (Frente Finanzas): chofer/proveedor con saldo para compensar
  // (anticipos, préstamos, saldos a favor): se compensa en la liquidación.
  pctCompensar: number;   // (0..1)
  // De las facturadas con compensaciones: la factura es por el NETO (F28).
  pctFacturaNeto: number; // (0..1)
  semilla: number;
}

export const PARAMETROS_CIRCUITO_POR_DEFECTO: Omit<ParametrosCircuito, 'desde' | 'hasta' | 'semilla'> = {
  pctLiquidar: 0.9,
  pctBorrador: 0.05,
  pctFacturar: 0.85,
  pctCompensar: 0.8,
  pctFacturaNeto: 0.7,
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
  fechaEmision: string;           // G4: 'YYYY-MM-DD' — fin del período + 1..15 días (≤ hoy); en borrador, fecha de creación
  facturar: boolean;
  fechaFactura: string | null;    // 'YYYY-MM-DD' — emisión + 0..10 días (≤ hoy) — fecha del comprobante de prueba
  partida: boolean;               // la entidad/mes superó el tope de InformeOp y se partió
  compensaciones: CompensacionSolicitada[];   // G3: saldos de la entidad que se descuentan
  totalCompensado: number;
  facturarPorNeto: boolean;       // G3: la factura de prueba va por el neto (F28)
}

export interface ResumenTipoCircuito {
  tipo: TipoLiqCircuito;
  liquidaciones: number;
  emitidas: number;
  borradores: number;
  aFacturar: number;
  informesOp: number;
  total: number;
  compensadas: number;            // G3: liquidaciones con compensaciones
  totalCompensado: number;
  facturasPorNeto: number;
}

export interface ResumenCircuito {
  informesActivos: number;        // InformeOp 'activo' del rango (liquidables)
  informesBloqueados: number;     // 'activo' pero bloqueados por la proforma de la contraparte (se saltean)
  grupos: number;                 // entidad × mes con InformeOp liquidables
  gruposSinLiquidar: number;      // los que el azar deja sin liquidar (pctLiquidar)
  pendientesPorFecha: number;     // G4: liquidaciones que no se generan porque la emisión caería después de hoy
  sinFacturaPorFecha: number;     // G4: emitidas que quedan sin factura porque la factura caería después de hoy
  liquidaciones: number;
  partidas: number;               // liquidaciones que salen de partir un grupo por el tope
  porTipo: ResumenTipoCircuito[];
}

export interface PlanCircuito {
  parametros: ParametrosCircuito;
  hoy: string;
  cuitEmpresa: number;            // G4: CUIT de la empresa en las facturas de prueba
  cuitEmpresaDeConfiguracion: boolean; // true: Datos de la empresa; false: el ficticio de demo
  liquidaciones: LiquidacionPlaneada[];   // en ORDEN DE EJECUCIÓN (cronológico)
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
 *      entidad del lado que corresponde, fecha = emisión + 0..10 días).
 *      Sirve para que Finanzas tenga facturados con antigüedad realista (la
 *      antigüedad se cuenta desde la fecha de la factura).
 *  G4 (fechas realistas): cada liquidación se emite con fecha = fin del
 *  período + 1..15 días (InformeLiqService acepta `fechaEmision`); si cae
 *  después de hoy NO se genera (sus InformeOp quedan activos: "todavía no se
 *  liquidó"). Si la factura caería después de hoy, queda emitida sin
 *  factura. El plan se arma y ejecuta en orden cronológico (emitidas por
 *  fecha, borradores al final) → la numeración LQ queda en orden de fecha.
 *  Las compensaciones solo usan movimientos con fecha ≤ emisión.
 *  Reproducible: misma semilla + mismos datos (+ mismo día) = mismo plan.
 *  `ejecutar` vuelve a armar el plan con los mismos parámetros. No es
 *  atómico en conjunto: cada liquidación/factura es un gesto real
 *  (atómico); si algo falla se registra y sigue. Los borradores van al
 *  final y, entre ellos, clientes primero (un borrador de chofer/proveedor
 *  bloquea los InformeOp del cliente de la contraparte; una emisión no).
 *  G3 (Frente Finanzas): a las liquidaciones de choferes/proveedores con
 *  saldo para compensar (anticipos, préstamos, saldos a favor — por ejemplo
 *  los del Generador de cobros) les aplica compensaciones (pctCompensar) y
 *  una parte de esas facturas va por el NETO (pctFacturaNeto, F28).
 *  Registra el lote en `generacionesPrueba` (tipo 'circuito').
 *  Diseño: claude/diseno-finanzas.md §4.9 (F17, F18). */
@Injectable({ providedIn: 'root' })
export class GeneradorCircuitoService {

  private db = inject(DbFirestoreService);
  private informeLiqServ = inject(InformeLiqService);
  private factory = inject(InformeLiqFactoryService);
  private finanzasConsulta = inject(FinanzasConsultaService);
  private configEmpresa = inject(ConfiguracionEmpresaService);
  private usuarioSesion = inject(UsuarioSesionService);

  private readonly COL_LOTES = 'generacionesPrueba';
  private readonly MAX_MESES = 12;
  private readonly ORDEN_TIPOS: readonly TipoLiqCircuito[] = ['cliente', 'chofer', 'proveedor'];
  /** CUIT de la empresa en las facturas de prueba (emisor de las de
   *  clientes y receptor de las de choferes/proveedores; la validación solo
   *  mira el CUIT de la entidad): el de Datos de la empresa si está cargado
   *  y es válido; si no, este ficticio (válido, mod 11). */
  private readonly CUIT_EMPRESA_DEMO = 30711111111;
  /** G4: días entre el fin del período y la emisión. */
  private readonly DIAS_EMISION = { min: 1, max: 15 };
  /** G4: días entre la emisión y la factura. */
  private readonly DIAS_FACTURA = { min: 0, max: 10 };
  private readonly OBSERVACION = 'Generada por el Generador de circuito (demo).';

  esEntornoDemo(): boolean {
    return environment.firebase.projectId === LimpiezaDemoService.PROYECTO_DEMO;
  }

  /** Arma el plan en memoria. Solo lee (InformeOp, movimientos con saldo,
   *  Datos de la empresa); no escribe nada. */
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

    // 1) Partes a liquidar, cada una con su fecha de emisión (fin del
    //    período + 1..15 días). Si cae después de hoy, no se genera.
    type Parte = Omit<LiquidacionPlaneada, 'compensaciones' | 'totalCompensado' | 'facturarPorNeto'> & { orden: number };
    const partesPlan: Parte[] = [];
    let gruposSinLiquidar = 0;
    let pendientesPorFecha = 0;
    let sinFacturaPorFecha = 0;
    for (const lista of ordenados) {
      if (!azar.chance(p.pctLiquidar)) {
        gruposSinLiquidar++;
        continue;
      }
      const [anio, mes] = lista[0].fecha.slice(0, 7).split('-').map(Number);
      const partes = this.partir(lista, anio, mes);
      for (const parte of partes) {
        const fin = this.factory.ventanaPeriodo(parte.periodo).hasta;
        const fechaEmision = this.sumarDias(fin, azar.entero(this.DIAS_EMISION.min, this.DIAS_EMISION.max));
        if (fechaEmision > hoy) {
          pendientesPorFecha++;
          continue;
        }
        const modo: LiquidacionPlaneada['modo'] = azar.chance(p.pctBorrador) ? 'borrador' : 'emitido';
        let facturar = modo === 'emitido' && azar.chance(p.pctFacturar);
        let fechaFactura: string | null = null;
        if (facturar) {
          const candidata = this.sumarDias(fechaEmision, azar.entero(this.DIAS_FACTURA.min, this.DIAS_FACTURA.max));
          if (candidata > hoy) {
            facturar = false;
            sinFacturaPorFecha++;
          } else {
            fechaFactura = candidata;
          }
        }
        const totalEstimado = Math.round(parte.informes.reduce((acc, i) => acc + (i.valores?.total ?? 0), 0) * 100) / 100;
        partesPlan.push({
          tipo: lista[0].tipo,
          idEntidad: lista[0].entidad.id,
          nombre: nombreEntidadRef(lista[0].entidad),
          periodo: parte.periodo,
          idsInformesOp: parte.informes.map(i => i.idInfOp),
          totalEstimado,
          modo,
          fechaEmision,
          facturar,
          fechaFactura,
          partida: partes.length > 1,
          orden: partesPlan.length,
        });
      }
    }

    // 2) Orden de ejecución: emitidas por fecha de emisión (numeración LQ
    //    cronológica); después los borradores, clientes primero (un borrador
    //    de chofer/proveedor bloquea los InformeOp del cliente). Desempate:
    //    el orden original (tipo, nombre, id, mes). Estable.
    const tipoIdx = (t: TipoLiqCircuito) => this.ORDEN_TIPOS.indexOf(t);
    partesPlan.sort((a, b) => {
      const ba = a.modo === 'borrador' ? 1 : 0;
      const bb = b.modo === 'borrador' ? 1 : 0;
      if (ba !== bb) return ba - bb;
      if (ba === 1 && a.tipo !== b.tipo) return tipoIdx(a.tipo) - tipoIdx(b.tipo);
      return a.fechaEmision.localeCompare(b.fechaEmision) || a.orden - b.orden;
    });

    // 3) G3: compensaciones en ese orden, solo con saldos de fecha ≤ emisión
    //    (movimientos vigentes con sinImputar > 0), con el disponible que va
    //    quedando a medida que el plan los usa.
    const conSaldo = await firstValueFrom(this.finanzasConsulta.observarMovimientosConSaldo());
    const disponibleRestante = new Map<string, number>();
    const liquidaciones: LiquidacionPlaneada[] = partesPlan.map(({ orden: _o, ...l }) => {
      const compensaciones = l.tipo === 'cliente'
        ? []
        : this.elegirCompensaciones(conSaldo, disponibleRestante, l.tipo, l.idEntidad, l.totalEstimado, l.fechaEmision, azar, p);
      const totalCompensado = redondear2(compensaciones.reduce((acc, c) => acc + c.importe, 0));
      const facturarPorNeto = l.facturar && compensaciones.length > 0 && l.totalEstimado - totalCompensado > 0.005 &&
        azar.chance(p.pctFacturaNeto);
      return { ...l, compensaciones, totalCompensado, facturarPorNeto };
    });

    const { cuit, deConfiguracion } = await this.cuitEmpresa();
    return {
      parametros: { ...p },
      hoy,
      cuitEmpresa: cuit,
      cuitEmpresaDeConfiguracion: deConfiguracion,
      liquidaciones,
      resumen: this.resumir(
        activos.length, activos.length - liquidables.length, grupos.size, gruposSinLiquidar,
        pendientesPorFecha, sinFacturaPorFecha, liquidaciones,
      ),
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
          pendientesPorFecha: plan.resumen.pendientesPorFecha,
          sinFacturaPorFecha: plan.resumen.sinFacturaPorFecha,
          cuitEmpresa: plan.cuitEmpresa,
          compensadas: plan.resumen.porTipo.reduce((acc, t) => acc + t.compensadas, 0),
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
        alAvanzar(`${k + 1}/${n}: ${l.fechaEmision} ${l.modo === 'borrador' ? 'borrador' : 'emisión'} — ${etiqueta}`);

        const datos: DatosLiquidacion = {
          tipo: l.tipo,
          idsInformesOp: l.idsInformesOp,
          periodo: l.periodo,
          descuentos: [],
          columnas: columnasPorTipo(l.tipo).filter(c => c.seleccionada).map(c => c.nombre),
          observaciones: this.OBSERVACION,
          compensaciones: l.compensaciones,
          fechaEmision: l.fechaEmision,
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
          const r = await this.facturar(res.objeto.idInfLiq, l.fechaFactura, l.facturarPorNeto, plan.cuitEmpresa);
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
  private async facturar(idInfLiq: string, fecha: string, porNeto: boolean, cuitEmpresa: number): Promise<string | null> {
    const liq = await this.informeLiqServ.obtenerPorId(idInfLiq);
    if (!liq) return `No se encontró el informe ${idInfLiq} recién emitido.`;
    const datosQr = this.datosQr(liq, fecha, porNeto, cuitEmpresa);
    const textoQr = `https://www.afip.gob.ar/fe/qr/?p=${btoa(JSON.stringify(datosQr))}`;
    const archivo = await this.pdfFactura(liq, datosQr);
    const res = await this.informeLiqServ.vincularFactura(idInfLiq, archivo, textoQr);
    return res.exito ? null : res.mensaje;
  }

  /** Datos del QR AFIP sintético (RG 4291: `cuit` = emisor, `nroDocRec` =
   *  receptor). Número de comprobante = número del informe (LQCL/LQCH/LQPR
   *  son series propias) → la clave de unicidad no se repite. */
  private datosQr(liq: InformeLiqNuevo, fecha: string, porNeto: boolean, cuitEmpresa: number): DatosQrAfip {
    const nro = Number((liq.numeroInterno ?? '').split('-')[1]) || 1;
    const esCliente = liq.tipo === 'cliente';
    const cuitEntidad = Number(liq.entidad.cuit) || 0;
    return {
      ver: 1,
      fecha,
      cuit: esCliente ? cuitEmpresa : cuitEntidad,
      ptoVta: esCliente ? 1 : 2,
      tipoCmp: liq.tipo === 'chofer' ? 11 : 1,     // chofer: Factura C (monotributo); resto: Factura A
      nroCmp: nro,
      importe: porNeto ? netoDe(liq.valores) : liq.valores.total,
      moneda: 'PES',
      ctz: 1,
      tipoDocRec: 80,
      nroDocRec: esCliente ? cuitEntidad : cuitEmpresa,
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

  /** G4: CUIT de Datos de la empresa si está cargado y es válido; si no, el
   *  ficticio de demo. */
  private async cuitEmpresa(): Promise<{ cuit: number; deConfiguracion: boolean }> {
    const datos = await this.configEmpresa.obtener(true);
    const cuit = datos?.cuit ?? null;
    return cuit !== null && cuitValido(cuit)
      ? { cuit, deConfiguracion: true }
      : { cuit: this.CUIT_EMPRESA_DEMO, deConfiguracion: false };
  }

  /** G3: compensaciones para una liquidación de chofer/proveedor. Con
   *  probabilidad pctCompensar, toma los saldos de la entidad (más antiguos
   *  primero) hasta cubrir como mucho el total (neto ≥ 0) y descuenta lo
   *  usado de `disponibleRestante` (el plan no usa dos veces el mismo saldo).
   *  G4: solo saldos con fecha ≤ fecha de emisión. Sin saldo → [] sin
   *  consumir azar (el plan de quien no tiene anticipos no cambia). */
  private elegirCompensaciones(
    conSaldo: Parameters<typeof armarCompensables>[0],
    disponibleRestante: Map<string, number>,
    tipo: TipoLiqCircuito,
    idEntidad: string,
    total: number,
    fechaEmision: string,
    azar: Azar,
    p: ParametrosCircuito,
  ): CompensacionSolicitada[] {
    const candidatos = armarCompensables(conSaldo, { tipo, id: idEntidad }, null, [])
      .filter(c => c.fecha <= fechaEmision)
      .map(c => ({ c, disponible: disponibleRestante.get(c.idMovimiento) ?? c.disponible }))
      .filter(x => x.disponible > 0.005);
    if (candidatos.length === 0 || !(total > 0) || !azar.chance(p.pctCompensar)) return [];
    const elegidas: CompensacionSolicitada[] = [];
    let lugar = total;
    for (const { c, disponible } of candidatos) {
      if (lugar <= 0.005 || elegidas.length >= MAX_COMPENSACIONES) break;
      const importe = redondear2(Math.min(disponible, lugar));
      elegidas.push({ idMovimiento: c.idMovimiento, importe });
      disponibleRestante.set(c.idMovimiento, redondear2(disponible - importe));
      lugar = redondear2(lugar - importe);
    }
    return elegidas;
  }

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
    pendientesPorFecha: number,
    sinFacturaPorFecha: number,
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
        compensadas: ls.filter(l => l.compensaciones.length > 0).length,
        totalCompensado: redondear2(ls.reduce((acc, l) => acc + l.totalCompensado, 0)),
        facturasPorNeto: ls.filter(l => l.facturarPorNeto).length,
      };
    });
    return {
      informesActivos,
      informesBloqueados,
      grupos,
      gruposSinLiquidar,
      pendientesPorFecha,
      sinFacturaPorFecha,
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
    const pcts = [p.pctLiquidar, p.pctBorrador, p.pctFacturar, p.pctCompensar, p.pctFacturaNeto];
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
```

Qué cambia respecto del anterior:

- **`planificar`** ahora trabaja en 3 pasos:
  1. Arma las partes con su fecha de emisión y de factura, y saltea lo que
     caería después de hoy.
  2. Las ordena para ejecutar.
  3. Elige las compensaciones en ese orden, filtrando fecha ≤ emisión.
- **`elegirCompensaciones`** recibe `fechaEmision`.
- **`facturar` / `datosQr`** reciben el CUIT de la empresa resuelto una vez
  en el plan (`plan.cuitEmpresa`).
- **Plan y resumen.** `PlanCircuito` suma `hoy`, `cuitEmpresa` y
  `cuitEmpresaDeConfiguracion`. `ResumenCircuito` suma
  `pendientesPorFecha` y `sinFacturaPorFecha`. `LiquidacionPlaneada` suma
  `fechaEmision`.
- **`ejecutar`** pasa `fechaEmision` a emitir/crearBorrador y guarda los
  nuevos contadores y el CUIT en el lote.

## PASO 3 — `src/app/componentes/generador-circuito/generador-circuito.component.ts`

### 3a — import

BUSCAR:
```ts
import { igualesPorContenido } from 'src/app/shared/utils/igualdad.util';
```

REEMPLAZAR:
```ts
import { formatearCuit } from 'src/app/shared/utils/datos-empresa.util';
import { igualesPorContenido } from 'src/app/shared/utils/igualdad.util';
```

### 3b — constantes para el template

BUSCAR:
```ts
  readonly MAX_ERRORES_VISIBLES = 30;
```

REEMPLAZAR:
```ts
  readonly MAX_ERRORES_VISIBLES = 30;
  readonly MAX_LIQUIDACIONES_VISIBLES = 15;
  readonly formatearCuit = formatearCuit;
```

## PASO 4 — `src/app/componentes/generador-circuito/generador-circuito.component.html` (contenido completo)

Reemplazá TODO el contenido del archivo por esto:

```html
<div class="border border-success rounded-3 p-3 mb-4">
  <h4 class="text-success">Generador de circuito (liquidar y facturar)</h4>

  @if (!esDemo) {
    <div class="alert alert-danger mb-0">Herramienta deshabilitada: solo funciona en demo.</div>
  } @else {
    <p class="mb-3">
      Toma los informes de operación <b>activos</b> del rango de meses y sigue el circuito con las funciones reales:
      liquida por entidad y mes (emite o deja en borrador) y a una parte de lo emitido le vincula una
      <b>factura de prueba</b> (PDF y QR sintéticos). Fechas realistas: emisión 1–15 días después del fin del período
      y factura 0–10 días después de la emisión; lo que caería después de hoy no se liquida o queda sin facturar.
      Se ejecuta en orden de fecha (borradores al final). Compensa saldos con fecha anterior a la emisión.
      <b>Simular</b> no escribe nada. Correr después del Generador de operaciones y de los anticipos.
    </p>

    <div class="row g-2 mb-3" style="max-width: 60rem;">
      <div class="col-md-3">
        <label class="form-label mb-0">Desde (mes)</label>
        <input type="month" class="form-control" [(ngModel)]="parametros.desde" [disabled]="simulando || ejecutando" />
      </div>
      <div class="col-md-3">
        <label class="form-label mb-0">Hasta (mes)</label>
        <input type="month" class="form-control" [(ngModel)]="parametros.hasta" [disabled]="simulando || ejecutando" />
      </div>
      <div class="col-md-3">
        <label class="form-label mb-0">Semilla</label>
        <div class="input-group">
          <input type="number" class="form-control" step="1" [(ngModel)]="parametros.semilla" [disabled]="simulando || ejecutando" />
          <button type="button" class="btn btn-outline-secondary" [disabled]="simulando || ejecutando" (click)="nuevaSemilla()" title="Semilla nueva">↻</button>
        </div>
      </div>
      <div class="col-md-3"></div>

      <div class="col-md-3">
        <label class="form-label mb-0">Liquidar, por entidad y mes (0–1)</label>
        <input type="number" class="form-control" min="0" max="1" step="0.05" [(ngModel)]="parametros.pctLiquidar" [disabled]="simulando || ejecutando" />
      </div>
      <div class="col-md-3">
        <label class="form-label mb-0">Quedan en borrador (0–1)</label>
        <input type="number" class="form-control" min="0" max="1" step="0.01" [(ngModel)]="parametros.pctBorrador" [disabled]="simulando || ejecutando" />
      </div>
      <div class="col-md-3">
        <label class="form-label mb-0">Facturar lo emitido (0–1)</label>
        <input type="number" class="form-control" min="0" max="1" step="0.05" [(ngModel)]="parametros.pctFacturar" [disabled]="simulando || ejecutando" />
      </div>
      <div class="col-md-3"></div>

      <div class="col-md-3">
        <label class="form-label mb-0">Compensar saldos de choferes/proveedores (0–1)</label>
        <input type="number" class="form-control" min="0" max="1" step="0.05" [(ngModel)]="parametros.pctCompensar" [disabled]="simulando || ejecutando" />
      </div>
      <div class="col-md-3">
        <label class="form-label mb-0">De esas facturadas: factura por el neto (0–1)</label>
        <input type="number" class="form-control" min="0" max="1" step="0.05" [(ngModel)]="parametros.pctFacturaNeto" [disabled]="simulando || ejecutando" />
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
        <b>Circuito terminado</b> (lote {{ resultado.idLote }}):
        {{ resultado.emitidas }} emitidas, {{ resultado.borradores }} borradores,
        {{ resultado.facturadas }} facturadas, {{ resultado.errores.length }} error(es).
        @if (resultado.errores.length > 0) {
          <ul class="mb-0 mt-2">
            @for (x of resultado.errores.slice(0, MAX_ERRORES_VISIBLES); track $index) {
              <li>{{ x.liquidacion }}: {{ x.mensaje }}</li>
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
            {{ plan.resumen.informesActivos }} informes activos en el rango
            ({{ plan.resumen.informesBloqueados }} bloqueados por la proforma de la contraparte: se saltean).
          </li>
          <li>
            {{ plan.resumen.grupos }} grupos entidad × mes; {{ plan.resumen.gruposSinLiquidar }} quedan sin liquidar.
            {{ plan.resumen.pendientesPorFecha }} liquidaciones de períodos recientes no se generan (la emisión caería después de hoy).
          </li>
          <li>
            <b>{{ plan.resumen.liquidaciones }}</b> liquidaciones: {{ totalEmitidas }} emitidas
            ({{ totalAFacturar }} con factura de prueba) y {{ totalBorradores }} en borrador.
            @if (plan.resumen.partidas > 0) {
              {{ plan.resumen.partidas }} salen de partir entidades que superan el tope de informes por liquidación.
            }
          </li>
          <li>
            {{ plan.resumen.sinFacturaPorFecha }} emitidas quedan sin factura (la factura caería después de hoy).
          </li>
          <li>
            {{ totalCompensadas }} liquidaciones con compensaciones (anticipos / saldos a favor);
            {{ totalFacturasPorNeto }} se facturan por el neto.
          </li>
          <li>
            CUIT de la empresa en las facturas: {{ formatearCuit(plan.cuitEmpresa) }}
            ({{ plan.cuitEmpresaDeConfiguracion ? 'Datos de la empresa' : 'ficticio de demo: Datos de la empresa no tiene un CUIT válido' }}).
          </li>
        </ul>

        <table class="table table-sm" style="max-width: 60rem;">
          <thead>
            <tr>
              <th>Tipo</th>
              <th class="text-end">Liquidaciones</th>
              <th class="text-end">Emitidas</th>
              <th class="text-end">Borradores</th>
              <th class="text-end">A facturar</th>
              <th class="text-end">Informes</th>
              <th class="text-end">Total estimado</th>
              <th class="text-end">Compensadas</th>
              <th class="text-end">Compensado</th>
            </tr>
          </thead>
          <tbody>
            @for (t of plan.resumen.porTipo; track t.tipo) {
              <tr>
                <td class="text-capitalize">{{ t.tipo }}</td>
                <td class="text-end">{{ t.liquidaciones }}</td>
                <td class="text-end">{{ t.emitidas }}</td>
                <td class="text-end">{{ t.borradores }}</td>
                <td class="text-end">{{ t.aFacturar }}</td>
                <td class="text-end">{{ t.informesOp }}</td>
                <td class="text-end">{{ t.total | formatearValor: '$' }}</td>
                <td class="text-end">{{ t.compensadas }}</td>
                <td class="text-end">{{ t.totalCompensado | formatearValor: '$' }}</td>
              </tr>
            }
          </tbody>
        </table>

        <table class="table table-sm" style="max-width: 60rem;">
          <thead>
            <tr>
              <th>Emisión</th>
              <th>Tipo</th>
              <th>Entidad</th>
              <th>Período</th>
              <th>Modo</th>
              <th>Factura</th>
              <th class="text-end">Total estimado</th>
              <th class="text-end">Compensado</th>
            </tr>
          </thead>
          <tbody>
            @for (l of plan.liquidaciones.slice(0, MAX_LIQUIDACIONES_VISIBLES); track $index) {
              <tr>
                <td>{{ l.fechaEmision }}</td>
                <td class="text-capitalize">{{ l.tipo }}</td>
                <td>{{ l.nombre }}</td>
                <td>{{ l.periodo.mes }}/{{ l.periodo.anio }}{{ l.periodo.tramo === 'mes' ? '' : ' · ' + l.periodo.tramo }}</td>
                <td>{{ l.modo }}</td>
                <td>{{ l.fechaFactura ?? '—' }}</td>
                <td class="text-end">{{ l.totalEstimado | formatearValor: '$' }}</td>
                <td class="text-end">{{ l.totalCompensado | formatearValor: '$' }}</td>
              </tr>
            }
          </tbody>
        </table>
        @if (plan.liquidaciones.length > MAX_LIQUIDACIONES_VISIBLES) {
          <small class="text-muted">Primeras {{ MAX_LIQUIDACIONES_VISIBLES }} de {{ plan.liquidaciones.length }}, en orden de ejecución.</small>
        }
      </div>
    }
  }
</div>
```

Cambios en el HTML:

- Texto descriptivo nuevo.
- "hoy" en el título del plan.
- Líneas de pendientes por fecha, sin factura por fecha y CUIT usado.
- Tabla con las primeras 15 liquidaciones en orden de ejecución: emisión,
  tipo, entidad, período, modo, factura y compensado.

## PASO 5 — Verificación

```bash
npm run build:demo
grep -n "fechaEmision" src/app/servicios/informes-liq/informe-liq.service.ts
grep -c "fechaEmision" src/app/servicios/desarrollo/generador-circuito.service.ts
grep -n "30711111118" -r src/
git status --short
```

Esperado:

- El build termina sin errores. Los warnings de presupuesto previos no
  cuentan.
- `fechaEmision` en informe-liq.service:
  - 1 línea del campo nuevo;
  - las de `validarFechaEmision` y `d.fechaEmision ?? hoy`;
  - las que ya existían (`fechaEmision: fecha` en emitirBorrador y
    `liq.fechaEmision ?? hoy` en editar).
- El conteo en el generador es > 5.
- `30711111118` no aparece en ningún lado.
- `git status` muestra exactamente 4 archivos modificados (más lo tuyo sin
  trackear, si lo hay).

Reportá la salida.

## Pruebas manuales (demo, rol dev)

No hace falta limpiar demo para estas pruebas: Simular no escribe. La
regeneración completa se hace después de G4b.

1. **Simular en /migracion → Generador de circuito**, rango de 3–4 meses
   que incluya el mes en curso.
   - El título muestra "hoy". Aparecen las líneas "N liquidaciones de
     períodos recientes no se generan…" y "N emitidas quedan sin factura…".
   - La línea del CUIT dice "Datos de la empresa" con tu CUIT.
   - La tabla nueva:
     - fechas de emisión ascendentes (borradores al final);
     - cada emisión es 1–15 días después del fin del período y nunca
       posterior a hoy;
     - la factura es 0–10 días después de la emisión, o "—".
   - Ninguna liquidación del mes en curso.
   - Simular otra vez con la misma semilla da lo mismo.
2. **Fecha opcional sin efecto en la UI.** Liquidación → crear un borrador
   y emitir una liquidación normal: fecha de emisión = hoy, como antes.
3. **Generar** (opcional, si querés probarlo antes de G4b): en un rango
   chico con InformeOp activos.
   - En el listado de liquidaciones, las nuevas tienen fecha de emisión
     pasada y numeración en orden de fecha.
   - La factura vinculada tiene la fecha del plan.
   - En Finanzas → Cuenta de la entidad, el Mayor muestra esas fechas.

## Commit (lo hace Nico)

```
feat(demo): fechas realistas en el generador de circuito (G4a)

- InformeLiqService: DatosLiquidacion.fechaEmision opcional (crear/emitir);
  validada (fin del período ≤ fecha ≤ hoy) y sin compensar movimientos
  posteriores. La UI no la manda: sin cambios para el usuario.
- Generador de circuito: emisión = fin del período + 1..15 días y factura =
  emisión + 0..10 (lo que caería después de hoy no se liquida / no se
  factura); plan y ejecución en orden cronológico (borradores al final,
  clientes primero); compensa solo saldos con fecha ≤ emisión; CUIT de la
  empresa desde Datos de la empresa (ficticio válido si no hay).
```

FIN DE LA INSTRUCCIÓN G4a
````
