````
# Instrucción G4b — Finanzas: modo "Anticipos" en el Generador de cobros

## Contexto

Frente Finanzas, bloque G4b. G4a (ya commiteado) hizo que el Generador de
circuito (G1) emita con fechas realistas y que compense solo saldos con fecha
≤ emisión. Falta que existan anticipos ANTERIORES a cada emisión: hoy G2 los
crea solo en el mes en curso y después del circuito, así que nunca se
compensan con fechas coherentes.

Decisión F66 (diseno-finanzas.md §23): el Generador de cobros (G2) pasa a
tener dos modos, cada uno una corrida.

- **1 · Anticipos** (ANTES del circuito):
  - por chofer/proveedor y mes del rango con InformeOp (cualquier estado
    salvo anulado), con probabilidad `pctAnticipos` (0,25), un anticipo SIN
    imputar;
  - fecha entre el día 5 y el 25 del mes; en el mes en curso, hasta hoy;
    meses futuros no;
  - importe: 10–25 % del total de ese mes, redondeado a $ 1.000.
  - Rango de meses desde/hasta (≤ 12). Por defecto, los últimos 6 meses
    incluido el actual.
- **2 · Cobros y pagos** (DESPUÉS del circuito): igual que hoy, pero SIN
  anticipos.

Aceptado: los OPG de anticipos tienen numeración más baja que los pagos de
los mismos meses (se registran en otra corrida).

Orden de regeneración de demo (después de este bloque): Limpieza →
Operaciones → G2 Anticipos → G1 Circuito → G2 Cobros y pagos.

Archivos (solo BUSCAR/REEMPLAZAR, ningún reemplazo completo):

- `src/app/servicios/desarrollo/generador-cobros.service.ts` (15 cambios)
- `src/app/componentes/generador-cobros/generador-cobros.component.ts`
  (3 cambios)
- `src/app/componentes/generador-cobros/generador-cobros.component.html`
  (2 cambios)

Sin reglas ni índices: NO hay deploy. Lee `informesOp` por rango de `fecha`
con `consultarPorRango`, igual que el Generador de circuito: sin índice
nuevo.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto BUSCAR no aparece, o aparece más de una vez: pará y reportá,
  sin improvisar.
- Aplicá los cambios de cada archivo EN ORDEN (algunos BUSCAR dependen de
  que el anterior ya esté aplicado).
- Editá el archivo en el lugar: leer, reemplazar, escribir. Nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Archivos con finales de línea LF.
- Build: `npm run build:demo`.
- No toques CLAUDE.md ni CHANGELOG.
- Si tocás un tipo, revisá todos sus usos, incluidos .spec.ts y .html.
- Esta instrucción termina con la línea `FIN DE LA INSTRUCCIÓN G4b`. Si no la
  ves, leé el archivo completo antes de empezar.

## PASO 0 — Verificación (sin cambios)

Corré y reportá la salida:

```bash
grep -rln "ParametrosCobros\|ResumenCobros\|PARAMETROS_COBROS_POR_DEFECTO\|PlanCobros" src/
grep -n "ConId" src/app/servicios/desarrollo/generador-cobros.service.ts
grep -n "consultarPorRango" src/app/servicios/database/db-firestore.service.ts
grep -n "Anticipos del mes en curso" src/app/servicios/desarrollo/generador-cobros.service.ts
wc -l src/app/servicios/desarrollo/generador-cobros.service.ts src/app/componentes/generador-cobros/generador-cobros.component.ts src/app/componentes/generador-cobros/generador-cobros.component.html
```

Esperado:

- **Grep 1:** solo `generador-cobros.service.ts` y
  `generador-cobros.component.ts`.
- **Grep 2:** 3 líneas: el import, el `Map<string, ConId<…>>` de anticipos
  y la firma de `entidadDe`. Las 3 desaparecen con este bloque.
- **Greps 3 y 4:** al menos 1 línea cada uno.
- **wc:** 427, 118 y 114 líneas.

Si algo no coincide, pará y reportá.

## PASO 1 — `src/app/servicios/desarrollo/generador-cobros.service.ts`

### 1a — imports (sale ConId, entra InformeOpNuevo)

BUSCAR:
```ts
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
```

REEMPLAZAR:
```ts
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { InformeOpNuevo } from 'src/app/interfaces/informe-op-nuevo';
```

### 1b — modo y meses en ParametrosCobros

BUSCAR:
```ts
export interface ParametrosCobros {
  semilla: number;
```

REEMPLAZAR:
```ts
/** G4b: qué genera una corrida. 'anticipos' va ANTES del Generador de
 *  circuito (así la liquidación los compensa con fechas coherentes);
 *  'cobros' va DESPUÉS (cobros y pagos sobre lo facturado). */
export type ModoCobros = 'anticipos' | 'cobros';

export interface ParametrosCobros {
  modo: ModoCobros;
  desde: string;               // 'YYYY-MM' — solo modo 'anticipos' (primer mes, inclusive)
  hasta: string;               // 'YYYY-MM' — solo modo 'anticipos' (último mes, inclusive)
  semilla: number;
```

### 1c — ClavePctCobros

BUSCAR:
```ts
  pctAnticipos: number;        // choferes/proveedores con un anticipo en el mes en curso (0..1)
}
```

REEMPLAZAR:
```ts
  pctAnticipos: number;        // modo 'anticipos': por chofer/proveedor y mes con operaciones, prob. de un anticipo (0..1)
}

/** Porcentajes de cada modo (los demás se ignoran en esa corrida). */
export type ClavePctCobros = Exclude<keyof ParametrosCobros, 'modo' | 'desde' | 'hasta' | 'semilla'>;
```

### 1d — defaults sin modo/meses

BUSCAR:
```ts
export const PARAMETROS_COBROS_POR_DEFECTO: Omit<ParametrosCobros, 'semilla'> = {
```

REEMPLAZAR:
```ts
export const PARAMETROS_COBROS_POR_DEFECTO: Omit<ParametrosCobros, 'modo' | 'desde' | 'hasta' | 'semilla'> = {
```

### 1e — resumen: gruposAnticipo

BUSCAR:
```ts
  anticipos: number;
  totalAnticipos: number;
```

REEMPLAZAR:
```ts
  anticipos: number;
  totalAnticipos: number;
  gruposAnticipo: number;         // modo 'anticipos': chofer/proveedor × mes con operaciones evaluados
```

### 1f — comentario de la clase (modos)

BUSCAR:
```ts
 *  Generador de circuito) registra movimientos con la función REAL
 *  (MovimientoFinService.registrar), con fechas realistas respecto de la
 *  fecha de la factura y nunca futuras:
```

REEMPLAZAR:
```ts
 *  Generador de circuito) registra movimientos con la función REAL
 *  (MovimientoFinService.registrar), con fechas realistas respecto de la
 *  fecha de la factura y nunca futuras. Dos modos (G4b):
 *   - 'anticipos' (ANTES del Generador de circuito): por chofer/proveedor y
 *     mes del rango con InformeOp, con probabilidad pctAnticipos, un
 *     anticipo entre el día 5 y el 25 del mes (nunca futuro) por el 10–25 %
 *     del total de ese mes (redondeo $ 1.000), sin imputar. El circuito los
 *     compensa al emitir (solo saldos con fecha ≤ emisión).
 *   - 'cobros' (DESPUÉS del circuito):
```

### 1g — comentario de la clase (quita anticipos del mes en curso)

BUSCAR:
```ts
 *   - Anticipos: a una parte de los choferes/proveedores, un anticipo en el
 *     mes en curso (10–25 % de su última liquidación), sin imputar: quedan
 *     pendientes para compensar en la próxima liquidación (FC1).
 *  Un movimiento por factura (o dos si es parcial). Se registran en orden de
```

REEMPLAZAR:
```ts
 *  Un movimiento por factura (o dos si es parcial). Se registran en orden de
```

### 1h — comentario de la clase (tipo del lote)

BUSCAR:
```ts
 *  regenerar. Lote en `generacionesPrueba` (tipo 'cobros').
```

REEMPLAZAR:
```ts
 *  regenerar. Lote en `generacionesPrueba` (tipo 'anticipos' o 'cobros').
```

### 1i — MAX_MESES

BUSCAR:
```ts
  private readonly COL_LOTES = 'generacionesPrueba';
```

REEMPLAZAR:
```ts
  private readonly COL_LOTES = 'generacionesPrueba';
  private readonly MAX_MESES = 12;
```

### 1j — planificar: desvío al modo anticipos

BUSCAR:
```ts
    const azar = new Azar(p.semilla);
    const hoy = toISODateString(new Date());
    const abiertos
```

REEMPLAZAR:
```ts
    const azar = new Azar(p.semilla);
    const hoy = toISODateString(new Date());
    if (p.modo === 'anticipos') return this.planificarAnticipos(p, azar, hoy);
    const abiertos
```

### 1k — planificar: resumen con gruposAnticipo

BUSCAR:
```ts
      conSaldoAFavor: 0, pagos: 0, totalPagado: 0, anticipos: 0, totalAnticipos: 0,
      quedanAbiertosCliente: 0, quedanAbiertosPago: 0,
    };

    for (const liq
```

REEMPLAZAR:
```ts
      conSaldoAFavor: 0, pagos: 0, totalPagado: 0, anticipos: 0, totalAnticipos: 0, gruposAnticipo: 0,
      quedanAbiertosCliente: 0, quedanAbiertosPago: 0,
    };

    for (const liq
```

### 1l — planificar: sale el bloque de anticipos; nuevos planificarAnticipos / armarPlan / resumenVacio

BUSCAR:
```ts
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
```

REEMPLAZAR:
```ts
    return this.armarPlan(p, hoy, movimientos, r);
  }

  /** G4b — modo 'anticipos': por chofer/proveedor × mes del rango con
   *  InformeOp (cualquier estado salvo anulado), con probabilidad
   *  pctAnticipos, un anticipo sin imputar entre el día 5 y el 25 del mes
   *  (en el mes en curso, hasta hoy; meses futuros no) por el 10–25 % del
   *  total del mes, redondeado a $ 1.000. Orden determinista (tipo, nombre,
   *  id, mes). */
  private async planificarAnticipos(p: ParametrosCobros, azar: Azar, hoy: string): Promise<PlanCobros> {
    const desde = `${p.desde}-01`;
    const hasta = `${p.hasta}-${String(this.ultimoDia(p.hasta)).padStart(2, '0')}`;
    const informes = (await this.db.consultarPorRango<InformeOpNuevo>('informesOp', 'fecha', desde, hasta))
      .filter(i => i.tipo !== 'cliente' && i.estado !== 'anulado');

    const grupos = new Map<string, InformeOpNuevo[]>();
    for (const inf of informes) {
      const clave = `${inf.tipo}|${inf.entidad.id}|${inf.fecha.slice(0, 7)}`;
      const lista = grupos.get(clave);
      if (lista) lista.push(inf); else grupos.set(clave, [inf]);
    }
    const ordenados = [...grupos.values()].sort((a, b) =>
      this.ORDEN_TIPOS.indexOf(a[0].tipo) - this.ORDEN_TIPOS.indexOf(b[0].tipo) ||
      nombreEntidadRef(a[0].entidad).localeCompare(nombreEntidadRef(b[0].entidad)) ||
      a[0].entidad.id.localeCompare(b[0].entidad.id) ||
      a[0].fecha.slice(0, 7).localeCompare(b[0].fecha.slice(0, 7)));

    const movimientos: MovimientoPlaneado[] = [];
    const r = this.resumenVacio();
    const mesHoy = hoy.slice(0, 7);
    const diaHoy = Number(hoy.slice(8, 10));
    for (const lista of ordenados) {
      const mes = lista[0].fecha.slice(0, 7);
      if (mes > mesHoy) continue;
      r.gruposAnticipo++;
      if (!azar.chance(p.pctAnticipos)) continue;
      const diaMax = mes === mesHoy ? Math.min(25, diaHoy) : 25;
      const dia = azar.entero(Math.min(5, diaMax), diaMax);
      const fecha = `${mes}-${String(dia).padStart(2, '0')}`;
      const totalMes = lista.reduce((acc, i) => acc + (i.valores?.total ?? 0), 0);
      const importe = Math.max(1000, Math.round(totalMes * azar.entero(10, 25) / 100 / 1000) * 1000);
      const entidad = this.entidadDe(lista[0]);
      movimientos.push({
        etiqueta: `Anticipo ${mes} — ${entidad.razonSocial}`,
        total: importe,
        datos: this.datos('pago', entidad, fecha, 'anticipo', this.mediosPago(importe, azar), []),
      });
      r.anticipos++;
      r.totalAnticipos += importe;
    }
    return this.armarPlan(p, hoy, movimientos, r);
  }

  /** Orden de registro por fecha (numeración cronológica; estable) y
   *  totales redondeados. */
  private armarPlan(p: ParametrosCobros, hoy: string, movimientos: MovimientoPlaneado[], r: ResumenCobros): PlanCobros {
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

  private resumenVacio(): ResumenCobros {
    return {
      facturadosCliente: 0, facturadosPago: 0, cobros: 0, totalCobrado: 0, conRetencion: 0, parciales: 0,
      conSaldoAFavor: 0, pagos: 0, totalPagado: 0, anticipos: 0, totalAnticipos: 0, gruposAnticipo: 0,
      quedanAbiertosCliente: 0, quedanAbiertosPago: 0,
    };
  }
```

### 1m — ejecutar: tipo del lote

BUSCAR:
```ts
      data: {
        tipo: 'cobros',
```

REEMPLAZAR:
```ts
      data: {
        tipo: plan.parametros.modo === 'anticipos' ? 'anticipos' : 'cobros',
```

### 1n — entidadDe generalizada + ultimoDia

BUSCAR:
```ts
  private entidadDe(liq: ConId<InformeLiqNuevo>): EntidadMovimientoFin {
    return {
      tipo: liq.tipo,
      id: liq.entidad.id,
      razonSocial: nombreEntidadRef(liq.entidad),
      cuit: Number(liq.entidad.cuit) || 0,
    };
  }
```

REEMPLAZAR:
```ts
  /** Entidad del movimiento desde un InformeLiq o un InformeOp (mismo
   *  `tipo` y `entidad`). */
  private entidadDe(doc: Pick<InformeLiqNuevo, 'tipo' | 'entidad'> | Pick<InformeOpNuevo, 'tipo' | 'entidad'>): EntidadMovimientoFin {
    return {
      tipo: doc.tipo,
      id: doc.entidad.id,
      razonSocial: nombreEntidadRef(doc.entidad),
      cuit: Number(doc.entidad.cuit) || 0,
    };
  }

  /** Último día del mes 'YYYY-MM' (sin depender del huso horario). */
  private ultimoDia(mesClave: string): number {
    const [a, m] = mesClave.split('-').map(Number);
    return new Date(Date.UTC(a, m, 0)).getUTCDate();
  }
```

### 1o — validarParametros: modo y meses

BUSCAR:
```ts
    if (p.pctMorosos + p.pctAtrasados > 1) throw new Error('Morosos + atrasados no pueden superar 1.');
    if (!Number.isInteger(p.semilla)) throw new Error('La semilla tiene que ser un número entero.');
```

REEMPLAZAR:
```ts
    if (p.pctMorosos + p.pctAtrasados > 1) throw new Error('Morosos + atrasados no pueden superar 1.');
    if (!Number.isInteger(p.semilla)) throw new Error('La semilla tiene que ser un número entero.');
    if (p.modo !== 'anticipos' && p.modo !== 'cobros') throw new Error(`Modo inválido: '${p.modo}'.`);
    if (p.modo === 'anticipos') {
      const formato = /^\d{4}-(0[1-9]|1[0-2])$/;
      if (!formato.test(p.desde) || !formato.test(p.hasta)) throw new Error('Meses inválidos (YYYY-MM).');
      if (p.desde > p.hasta) throw new Error('"Desde" no puede ser posterior a "hasta".');
      const [a1, m1] = p.desde.split('-').map(Number);
      const [a2, m2] = p.hasta.split('-').map(Number);
      if ((a2 - a1) * 12 + (m2 - m1) + 1 > this.MAX_MESES) throw new Error(`El rango no puede superar ${this.MAX_MESES} meses.`);
    }
```

Notas:

- **Modo 'cobros':** el plan es el mismo de antes menos los anticipos. La
  secuencia del azar cambia solo al final, porque el bloque de anticipos era
  lo último.
- **`gruposAnticipo`:** cuenta los grupos chofer/proveedor × mes evaluados
  (hasta el mes en curso).
- **`entidadDe`:** acepta InformeLiq o InformeOp, porque los dos tienen el
  mismo `tipo` y `entidad`.

## PASO 2 — `src/app/componentes/generador-cobros/generador-cobros.component.ts`

### 2a — import

BUSCAR:
```ts
  GeneradorCobrosService, PARAMETROS_COBROS_POR_DEFECTO, ParametrosCobros, PlanCobros, ResultadoCobros,
} from 'src/app/servicios/desarrollo/generador-cobros.service';
```

REEMPLAZAR:
```ts
  ClavePctCobros, GeneradorCobrosService, ModoCobros, PARAMETROS_COBROS_POR_DEFECTO, ParametrosCobros, PlanCobros,
  ResultadoCobros,
} from 'src/app/servicios/desarrollo/generador-cobros.service';
```

### 2b — campos con modo, defaults (modo anticipos, últimos 6 meses), camposVisibles y esAnticipos

BUSCAR:
```ts
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
```

REEMPLAZAR:
```ts
  /** Inputs de porcentajes (clave, etiqueta, paso, modo en que se usa). */
  readonly campos: { clave: ClavePctCobros; etiqueta: string; paso: number; modo: ModoCobros }[] = [
    { clave: 'pctMorosos', etiqueta: 'Clientes: facturas que no se cobran', paso: 0.01, modo: 'cobros' },
    { clave: 'pctAtrasados', etiqueta: 'Clientes: cobro atrasado (61–120 días)', paso: 0.05, modo: 'cobros' },
    { clave: 'pctParciales', etiqueta: 'Clientes: cobro en dos partes', paso: 0.05, modo: 'cobros' },
    { clave: 'pctRetencion', etiqueta: 'Cobros con retención IIBB', paso: 0.05, modo: 'cobros' },
    { clave: 'pctSaldoAFavor', etiqueta: 'Cobros que pagan de más', paso: 0.01, modo: 'cobros' },
    { clave: 'pctPagosPendientes', etiqueta: 'Choferes/proveedores: pago pendiente', paso: 0.01, modo: 'cobros' },
    { clave: 'pctAnticipos', etiqueta: 'Chofer/proveedor × mes con anticipo', paso: 0.05, modo: 'anticipos' },
  ];

  constructor(private generador: GeneradorCobrosService) {
    this.esDemo = generador.esEntornoDemo();
    // Por defecto: modo anticipos (va antes del circuito), los últimos 6
    // meses incluido el actual.
    const hoy = new Date();
    const mes = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    this.parametros = {
      ...PARAMETROS_COBROS_POR_DEFECTO,
      modo: 'anticipos',
      desde: mes(new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1)),
      hasta: mes(hoy),
      semilla: this.semillaNueva(),
    };
  }

  get camposVisibles() {
    return this.campos.filter(c => c.modo === this.parametros.modo);
  }

  get esAnticipos(): boolean {
    return this.parametros.modo === 'anticipos';
  }
```

### 2c — confirmación según el modo

BUSCAR:
```ts
    const r0 = this.plan.resumen;

    const r = await Swal.fire({
      title: `¿Registrar ${this.plan.movimientos.length} movimientos?`,
      html:
        `<p>${r0.cobros} cobros, ${r0.pagos} pagos y ${r0.anticipos} anticipos, con la función real de Finanzas. ` +
        `Tarda varios minutos: <b>no cierres ni recargues esta pestaña</b>.</p>` +
        `<p>No es repetible: una segunda corrida cobra lo que quedó abierto. Para rehacer: Limpieza de demo y regenerar.</p>`,
```

REEMPLAZAR:
```ts
    const r0 = this.plan.resumen;
    const anticipos = this.plan.parametros.modo === 'anticipos';

    const r = await Swal.fire({
      title: `¿Registrar ${this.plan.movimientos.length} movimientos?`,
      html:
        (anticipos
          ? `<p>${r0.anticipos} anticipos sin imputar, con la función real de Finanzas. `
          : `<p>${r0.cobros} cobros y ${r0.pagos} pagos, con la función real de Finanzas. `) +
        `Tarda varios minutos: <b>no cierres ni recargues esta pestaña</b>.</p>` +
        (anticipos
          ? `<p>No es repetible: una segunda corrida agrega otros anticipos. Para rehacer: Limpieza de demo y regenerar.</p>`
          : `<p>No es repetible: una segunda corrida cobra lo que quedó abierto. Para rehacer: Limpieza de demo y regenerar.</p>`),
```

## PASO 3 — `src/app/componentes/generador-cobros/generador-cobros.component.html`

### 3a — texto, selector de modo y meses

BUSCAR:
```html
    <p class="mb-3">
      Sobre los informes de liquidación <b>facturados con saldo</b> registra cobros, pagos y anticipos con la función
      real de Finanzas, con fechas realistas desde la factura y nunca futuras: clientes a 30–60 días (algunos
      atrasados o morosos, algunos en dos partes, con retención o pagando de más); choferes y proveedores a 2–10
      días; anticipos del mes en curso pendientes de compensar. <b>Simular</b> no escribe nada. Correr después del
      Generador de circuito, una sola vez.
    </p>

    <div class="row g-2 mb-3" style="max-width: 60rem;">
      @for (c of campos; track c.clave) {
```

REEMPLAZAR:
```html
    <p class="mb-2">
      Registra movimientos con la función real de Finanzas, con fechas realistas y nunca futuras. Dos corridas, una
      vez cada una: <b>Simular</b> no escribe nada.
    </p>
    <ul class="mb-3">
      <li>
        <b>Anticipos</b> — correr ANTES del Generador de circuito: por chofer/proveedor y mes con operaciones, un
        anticipo (día 5–25, 10–25 % del total del mes) sin imputar; el circuito lo compensa al liquidar ese mes.
      </li>
      <li>
        <b>Cobros y pagos</b> — correr DESPUÉS del circuito, sobre los informes <b>facturados con saldo</b>: clientes a
        30–60 días (algunos atrasados o morosos, en dos partes, con retención o pagando de más); choferes y
        proveedores a 2–10 días de su factura.
      </li>
    </ul>

    <div class="btn-group mb-3" role="group">
      <input type="radio" class="btn-check" name="modoCobros" id="modoAnticipos" value="anticipos"
        [(ngModel)]="parametros.modo" [disabled]="simulando || ejecutando" />
      <label class="btn btn-outline-success" for="modoAnticipos">1 · Anticipos</label>
      <input type="radio" class="btn-check" name="modoCobros" id="modoCobrosPagos" value="cobros"
        [(ngModel)]="parametros.modo" [disabled]="simulando || ejecutando" />
      <label class="btn btn-outline-success" for="modoCobrosPagos">2 · Cobros y pagos</label>
    </div>

    <div class="row g-2 mb-3" style="max-width: 60rem;">
      @if (esAnticipos) {
        <div class="col-md-3">
          <label class="form-label mb-0 small">Desde (mes)</label>
          <input type="month" class="form-control" [(ngModel)]="parametros.desde" [disabled]="simulando || ejecutando" />
        </div>
        <div class="col-md-3">
          <label class="form-label mb-0 small">Hasta (mes)</label>
          <input type="month" class="form-control" [(ngModel)]="parametros.hasta" [disabled]="simulando || ejecutando" />
        </div>
      }
      @for (c of camposVisibles; track c.clave) {
```

### 3b — resumen del plan según el modo

BUSCAR:
```html
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
```

REEMPLAZAR:
```html
        <ul class="mb-3">
          @if (plan.parametros.modo === 'anticipos') {
            <li>
              Entrada: {{ plan.resumen.gruposAnticipo }} choferes/proveedores × mes con operaciones
              ({{ plan.parametros.desde }} a {{ plan.parametros.hasta }}).
            </li>
            <li>
              <b>{{ plan.resumen.anticipos }}</b> anticipos por {{ plan.resumen.totalAnticipos | formatearValor: '$' }} (sin imputar).
            </li>
          } @else {
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
          }
        </ul>
```

El selector usa radios `btn-check` con `[(ngModel)]` y `value` estático:
`name` está presente, como pide `ngModel` fuera de un `<form>`. Cambiar el
modo después de Simular deshabilita "Generar", porque cambian los
parámetros.

## PASO 4 — Verificación

```bash
npm run build:demo
grep -c "ConId" src/app/servicios/desarrollo/generador-cobros.service.ts
grep -n "planificarAnticipos\|armarPlan\|resumenVacio" src/app/servicios/desarrollo/generador-cobros.service.ts
grep -n "Anticipos del mes en curso" src/app/servicios/desarrollo/generador-cobros.service.ts
git status --short
```

Esperado:

- El build termina sin errores. Los warnings de presupuesto previos no
  cuentan.
- `ConId`: 0.
- `planificarAnticipos` / `armarPlan` / `resumenVacio`: definición y usos
  (6 líneas).
- "Anticipos del mes en curso" no aparece.
- `git status` muestra exactamente 3 archivos modificados (más lo tuyo sin
  trackear, si lo hay).

Reportá la salida.

## Pruebas manuales (demo, rol dev)

Simular no escribe nada: las pruebas 1–3 se hacen con los datos actuales.

1. **Sección.** /migracion → "Generador de cobros y pagos" muestra:
   - el texto con los dos modos;
   - el selector "1 · Anticipos" (marcado) / "2 · Cobros y pagos";
   - en Anticipos: Desde/Hasta (últimos 6 meses), solo el porcentaje
     "Chofer/proveedor × mes con anticipo" y la semilla;
   - en Cobros y pagos: los 6 porcentajes de antes (sin anticipos) y la
     semilla, sin meses.
2. **Simular Anticipos.**
   - Entrada: N choferes/proveedores × mes.
   - Anticipos: alrededor del 25 % de N, con total.
   - Tabla en orden de fecha, con etiquetas "Anticipo AAAA-MM — Nombre":
     - cada fecha es del día 5 al 25 de su mes;
     - las del mes en curso no pasan de hoy;
     - ningún mes futuro.
   - Misma semilla → mismo plan. Cambiar el modo → "Cambiaron los
     parámetros" y Generar deshabilitado.
   - Validaciones: desde > hasta, o un rango de más de 12 meses → mensaje
     de error.
3. **Simular Cobros y pagos.** Igual que antes, sin la línea de anticipos.
4. **Regeneración completa** (cuando quieras dejar demo con fechas
   realistas):
   1. Limpieza de demo.
   2. Generador de operaciones, por mes.
   3. G2 en modo **Anticipos** con el rango de las operaciones.
   4. Generador de circuito con el mismo rango.
   5. G2 en modo **Cobros y pagos**.
5. **Comprobaciones después de regenerar:**
   - **Liquidaciones:** fecha de emisión 1–15 días después del período,
     numeración en orden de fecha y sin liquidaciones del mes en curso.
   - **Mayor de un chofer con anticipos:**
     - el anticipo (día 5–25 del mes) está ANTES de la liquidación de ese
       mes;
     - la compensación tiene la fecha de la emisión;
     - el pago es 2–10 días después de la factura;
     - el saldo final coincide con la cuenta.
   - **Mayor de un cliente:** emisión → factura → cobro, en ese orden.
   - **Antigüedad / Resumen:** tramos y evolución con fechas coherentes.
   - **Anticipos del mes en curso:** quedan pendientes (sin compensar).

## Commit (lo hace Nico)

```
feat(demo): generador de cobros con modo Anticipos (G4b)

- Generador de cobros y pagos con dos modos: 'anticipos' (antes del
  circuito: por chofer/proveedor y mes con operaciones, anticipo sin
  imputar del día 5–25 por el 10–25 % del total del mes; rango de meses
  ≤ 12) y 'cobros' (después del circuito, como antes, sin anticipos).
  Lote en generacionesPrueba con tipo 'anticipos' o 'cobros'.
```

FIN DE LA INSTRUCCIÓN G4b
````
