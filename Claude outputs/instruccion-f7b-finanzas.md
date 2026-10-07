````
# Instrucción F7b — Finanzas: saldos sin imputar (cierre por ajuste y devolución)

## Contexto

Frente Finanzas. Diseño: `claude/diseno-finanzas.md` §20.2 (F51). F7a dejó
los ajustes sobre comprobantes. F7b resuelve el saldo sin imputar de un
cobro o pago que nunca se va a aplicar a comprobantes. Por ejemplo:
- un anticipo a un chofer que se fue sin facturar;
- un préstamo que no se devuelve;
- un cliente que pagó de más y no vuelve.

Hay dos salidas:

1. **Cerrar por ajuste:** un AJ da por terminado (todo o parte de) el
   saldo, sin que se mueva plata. Motivos:
   - **incobrable:** solo en pagos (anticipo, préstamo o pago de más a un
     chofer o proveedor) y siempre por el saldo completo;
   - **redondeo:** hasta $ 1.000;
   - **otro:** la observación es obligatoria.
   Un cobro de un cliente solo se cierra por redondeo u otro.
2. **Devolver:** plata real en sentido contrario.
   - Al cliente que pagó de más se le registra un **PAGO** (OPG).
   - El chofer o proveedor que devuelve un adelanto genera un **COBRO**
     (RC).
   Lleva un medio, sin retenciones, con importe parcial permitido.

**Modelo (sin migración):**
- `TipoDocumentoImputable` suma `'movimientoFin'`. Estaba previsto desde
  §9.3.
- El AJ o la devolución tienen UNA imputación (origen 'directa') al
  movimiento original.
- El original recibe una imputación **espejo** (origen nuevo `'cierre'` o
  `'devolucion'`) que apunta al AJ o a la devolución. Así su
  `totalImputado` / `sinImputar` lo reflejan y todo lo que ya lee
  `sinImputar` sigue funcionando sin cambios: Cuentas, Antigüedad,
  Resumen, saldo de la cuenta y compensables.
- **Anular el AJ o la devolución** quita el espejo del original, que
  recupera su saldo. Para eso `reversionesDe` ahora lleva el `tipo` del
  documento.
- **Anular el original** queda bloqueado mientras tenga espejos
  (`validarAnulable`): "primero anulá AJ-…". Es igual que con las
  compensaciones.
- **Para identificar estos movimientos** se usan `esSobreSaldo(m)` y
  `esDevolucion(m)`: un movimiento con una imputación propia a otro
  movimiento. Las espejo no cuentan. El concepto se mantiene en 'normal'
  (no se agrega un concepto nuevo).

**Quién lo lee distinto:**
- **Mayor:** el cierre y la devolución van al DEBE. Suben el saldo, porque
  la entidad deja de tener saldo a favor o anticipo. Así el saldo final
  sigue igual al saldo de la cuenta (verificado). Etiqueta "Devolución"
  azul y detalle "contra el saldo de …" / "cierra el saldo de …".
- **Resumen:**
  - el flujo del mes separa las devoluciones (a clientes / de choferes y
    proveedores) y las suma al neto de caja;
  - en la evolución, la devolución resta de lo cobrado o lo pagado.
- **Listados y detalle:** el concepto sale de
  `etiquetaConceptoMovimiento`: "Devolución" o "Otro · cierre de saldo".
  El detalle explica por qué no se puede anular (compensado, cerrado o
  devuelto).
- **Pendiente menor (no se toca):** las tarjetas de la pestaña Movimientos
  suman una devolución dentro de "Cobros" o "Pagos" según su tipo.

**UI:**
- **Acción "Cerrar / devolver":** en los listados de movimientos (pestaña y
  cuenta) y como botón en el detalle. Aparece en los cobros o pagos
  vigentes con saldo sin imputar (permiso `finanzas.agregar`).
- **Modal `SaldoSinImputarComponent`:**
  - dos modos: cerrar por ajuste (motivo, importe, fecha) y devolver
    (medio, importe, fecha, referencia, banco, fecha de cobro del cheque);
  - observaciones y "queda sin imputar" en vivo;
  - la fecha va desde la del movimiento hasta hoy.

**Facturados:** la regla que deshabilita "Desvincular" también mira
`totalAjustado`. Es la línea que reportaste en F7a; el servicio ya
frenaba.

Sin índices ni reglas: NO hay deploy.

Ya verificado:

- tsc estricto (también sin locales sin uso), con stubs;
- prueba rápida del circuito:
  - **chofer:** liquidación $ 1.000, anticipo $ 300, cierre "otro" $ 100 y
    devolución $ 50. El anticipo queda con $ 150 sin imputar. Mayor 1000 −
    300 + 100 + 50 = 850 = saldo de la cuenta;
  - anular el original queda bloqueado; anular el AJ devuelve el saldo
    ($ 250);
  - **cliente:** cobro $ 1.200 sobre una liquidación de $ 1.000 +
    devolución $ 200. Mayor 0 = saldo de la cuenta 0;
  - flujo: neto de caja 720 (con retenciones, anticipo y las dos
    devoluciones) y evolución;
  - validaciones: incobrable parcial, fecha anterior al movimiento,
    incobrable en un cobro, importe mayor al saldo y retención en una
    devolución.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto BUSCAR no aparece, o aparece más de una vez: pará y reportá,
  sin improvisar.
- Archivos con finales de línea LF.
- Build: `npm run build:demo`.
- No toques CLAUDE.md ni CHANGELOG.
- Se amplían dos uniones (`TipoDocumentoImputable`, `OrigenImputacionFin`)
  y la interfaz `ReversionDocumento`. Con el PASO 0 revisá sus usos,
  incluidos `.spec.ts` y `.html`. Si aparece un `switch` o un
  `Record<OrigenImputacionFin…>` / `Record<TipoDocumentoImputable…>` fuera
  de `movimiento-fin.util.ts`, pará y reportá.
- La instrucción termina con la línea `FIN DE LA INSTRUCCIÓN F7b`. Si no la
  ves, llegó cortada: leela completa (por partes si hace falta) antes de
  empezar.

## PASO 0 — Verificación (sin cambios)

Corré y reportá la salida:

```bash
grep -rn "OrigenImputacionFin\|TipoDocumentoImputable\|ReversionDocumento\|reversionesDe" src/
grep -rn "Record<OrigenImputacionFin\|Record<TipoDocumentoImputable\|switch (i.origen\|switch (.*documento.tipo" src/
grep -rn "cerrarSaldo\|registrarDevolucion\|SaldoSinImputarComponent\|esSobreSaldo\|quitarImputacionesDe\|etiquetaConceptoMovimiento" src/app
ls src/app/raiz/finanzas-nueva/modales/saldo-sin-imputar
grep -rn "totalCobrado ?? 0) !== 0" src/app/raiz
grep -n "Imputar saldo\|compensado && m.estado" src/app/raiz/finanzas-nueva/modales/detalle-movimiento/detalle-movimiento.component.html
```

Esperado:

- El grep 1:
  - `interfaces/movimiento-fin.ts` (las definiciones);
  - `shared/utils/movimiento-fin.util.ts` (import, `ETIQUETA_ORIGEN_IMPUTACION`,
    `armarImputacion`, `ReversionDocumento`, `reversionesDe`);
  - `servicios/finanzas-nueva/movimiento-fin.service.ts` (`reversionesDe`).
  Reportá cualquier otro archivo.
- El grep 2: solo `ETIQUETA_ORIGEN_IMPUTACION` en `movimiento-fin.util.ts`.
- El grep 3: nada.
- El `ls`: no existe.
- El grep 5: 1 línea en `facturacion-emitidos.component.ts` (Revertir, no se
  toca) y 1 en `facturacion-facturados.component.ts` (Desvincular, PASO 13).
- El grep 6: 2 líneas (botón "Imputar saldo" de F4b y el aviso de
  compensado).

Si algo no coincide, pará y reportá.

## PASO 1 — `src/app/interfaces/movimiento-fin.ts`

#### 1a

BUSCAR:
```ts
export type TipoDocumentoImputable = 'informeLiq';
```

REEMPLAZAR:
```ts
export type TipoDocumentoImputable = 'informeLiq' | 'movimientoFin';   // movimientoFin: cierre / devolución de un saldo sin imputar (F7b)
```

#### 1b

BUSCAR:
```ts
 *  - 'compensacion': anticipo/préstamo compensado en una liquidación al
 *    emitirla (FC1). Se libera si la liquidación se revierte. */
export type OrigenImputacionFin = 'directa' | 'saldo' | 'compensacion';
```

REEMPLAZAR:
```ts
 *  - 'compensacion': anticipo/préstamo compensado en una liquidación al
 *    emitirla (FC1). Se libera si la liquidación se revierte.
 *  - 'cierre' / 'devolucion' (F7b): imputación ESPEJO en un movimiento
 *    cuyo saldo sin imputar se cerró con un ajuste o se devolvió; apunta al
 *    ajuste / devolución (documento 'movimientoFin'). Se quita al anular
 *    ese movimiento. */
export type OrigenImputacionFin = 'directa' | 'saldo' | 'compensacion' | 'cierre' | 'devolucion';
```

## PASO 2 — `src/app/shared/utils/movimiento-fin.util.ts`

#### 2a

BUSCAR:
```ts
import {
  ConceptoMovimientoFin, EntidadMovimientoFin, EstadoMovimientoFin, ImpuestoRetencionFin, ImputacionFin,
  MedioMovimientoFin, MotivoAjusteFin, MovimientoFin, OrigenImputacionFin, TipoEntidadFin, TipoMedioFin,
  TipoMovimientoFin,
} from 'src/app/interfaces/movimiento-fin';
```

REEMPLAZAR:
```ts
import {
  ConceptoMovimientoFin, EntidadMovimientoFin, EstadoMovimientoFin, ImpuestoRetencionFin, ImputacionFin,
  MedioMovimientoFin, MotivoAjusteFin, MovimientoFin, OrigenImputacionFin, TipoDocumentoImputable, TipoEntidadFin,
  TipoMedioFin, TipoMovimientoFin,
} from 'src/app/interfaces/movimiento-fin';
```

#### 2b

BUSCAR:
```ts
  compensacion: 'Compensación en liquidación',
};
```

REEMPLAZAR:
```ts
  compensacion: 'Compensación en liquidación',
  cierre: 'Cierre de saldo (ajuste)',
  devolucion: 'Devolución',
};
```

#### 2c

BUSCAR:
```ts
  if (mov.imputaciones.some(i => i.origen === 'compensacion')) {
    return `El movimiento ${mov.numero} está compensado en una liquidación: primero quitá la compensación o revertí la liquidación.`;
  }
  return null;
}
```

REEMPLAZAR:
```ts
  if (mov.imputaciones.some(i => i.origen === 'compensacion')) {
    return `El movimiento ${mov.numero} está compensado en una liquidación: primero quitá la compensación o revertí la liquidación.`;
  }
  // F7b: su saldo se cerró o se devolvió con otro movimiento.
  const espejo = mov.imputaciones.find(i => i.origen === 'cierre' || i.origen === 'devolucion');
  if (espejo) {
    return `El saldo de ${mov.numero} se ${espejo.origen === 'cierre' ? 'cerró' : 'devolvió'} con ${espejo.numeroDocumento}: ` +
      'primero anulá ese movimiento.';
  }
  return null;
}
```

#### 2d

BUSCAR:
```ts
export interface ReversionDocumento {
  idDocumento: string;
```

REEMPLAZAR:
```ts
export interface ReversionDocumento {
  tipo: TipoDocumentoImputable;           // informeLiq: devuelve saldo al informe; movimientoFin: quita el espejo (F7b)
  idDocumento: string;
```

#### 2e

BUSCAR:
```ts
      porDocumento.set(i.documento.id, {
        idDocumento: i.documento.id,
```

REEMPLAZAR:
```ts
      porDocumento.set(i.documento.id, {
        tipo: i.documento.tipo,
        idDocumento: i.documento.id,
```

#### 2f

BUSCAR:
```ts
 *  posteriores). Orden de aparición. Hoy todo documento es un InformeLiq
 *  (TipoDocumentoImputable); al sumar tipos, el servicio decide por tipo. */
```

REEMPLAZAR:
```ts
 *  posteriores). Orden de aparición. El servicio decide por `tipo`: a un
 *  InformeLiq le devuelve el saldo; a un movimiento (F7b) le quita la
 *  imputación espejo. */
```

#### 2g

BUSCAR:
```ts
    totalImputado: total,
    sinImputar: 0,
    observaciones: p.datos.observaciones,
    estado: 'vigente',
    anulacion: null,
    usuario: p.usuario,
  };
}
```

REEMPLAZAR:
```ts
    totalImputado: total,
    sinImputar: 0,
    observaciones: p.datos.observaciones,
    estado: 'vigente',
    anulacion: null,
    usuario: p.usuario,
  };
}

// ---------------------------------------------------------------------------
// Saldos sin imputar (F7b): cierre por ajuste y devolución
// ---------------------------------------------------------------------------

/** Motivos para cerrar un saldo sin imputar con un ajuste. */
export type MotivoCierreSaldo = 'incobrable' | 'redondeo' | 'otro';

/** Datos para cerrar (todo o parte) el saldo sin imputar de un movimiento
 *  con un ajuste: un anticipo / préstamo que no se va a recuperar, un saldo
 *  a favor de un cliente que no se va a usar. */
export interface DatosCierreSaldo {
  fecha: string;                 // 'YYYY-MM-DD', ≤ hoy y ≥ fecha del movimiento
  motivo: MotivoCierreSaldo;
  importe: number;
  observaciones: string;
}

/** Datos de una devolución: plata en sentido contrario contra el saldo sin
 *  imputar (pago a un cliente que pagó de más; cobro a un chofer o
 *  proveedor que devuelve un adelanto). Un solo medio, sin retenciones. */
export interface DatosDevolucion {
  fecha: string;                 // 'YYYY-MM-DD', ≤ hoy y ≥ fecha del movimiento
  medio: MedioMovimientoFin;     // importe = lo devuelto
  observaciones: string;
}

type MovimientoConSaldo = Pick<MovimientoFin, 'estado' | 'numero' | 'tipo' | 'fecha' | 'sinImputar' | 'imputaciones'>;

/** Imputación propia de un cierre / devolución hacia el movimiento
 *  original (las espejo del original, origen 'cierre' | 'devolucion',
 *  también apuntan a un movimiento pero NO cuentan). */
function esImputacionSobreSaldo(i: ImputacionFin): boolean {
  return i.documento.tipo === 'movimientoFin' && i.origen !== 'cierre' && i.origen !== 'devolucion';
}

/** Movimiento creado CONTRA el saldo de otro (cierre o devolución): su
 *  imputación apunta a un movimiento, no a un comprobante. */
export function esSobreSaldo(m: Pick<MovimientoFin, 'imputaciones'>): boolean {
  return (m.imputaciones ?? []).some(esImputacionSobreSaldo);
}

/** Devolución = cobro o pago creado contra el saldo de otro movimiento. */
export function esDevolucion(m: Pick<MovimientoFin, 'tipo' | 'imputaciones'>): boolean {
  return m.tipo !== 'ajuste' && esSobreSaldo(m);
}

/** Número del movimiento cuyo saldo se cerró o devolvió (o null). */
export function movimientoOrigenDe(m: Pick<MovimientoFin, 'imputaciones'>): string | null {
  return (m.imputaciones ?? []).find(esImputacionSobreSaldo)?.numeroDocumento ?? null;
}

/** Concepto legible de un movimiento para listados y detalle: el motivo en
 *  un ajuste (con "cierre de saldo" si cierra el de otro movimiento),
 *  "Devolución" en una devolución, el concepto en el resto. */
export function etiquetaConceptoMovimiento(m: Pick<MovimientoFin, 'tipo' | 'concepto' | 'motivoAjuste' | 'imputaciones'>): string {
  if (m.tipo === 'ajuste') {
    const motivo = m.motivoAjuste ? ETIQUETA_MOTIVO_AJUSTE[m.motivoAjuste] : '—';
    return esSobreSaldo(m) ? `${motivo} · cierre de saldo` : motivo;
  }
  return esDevolucion(m) ? 'Devolución' : ETIQUETA_CONCEPTO[m.concepto];
}

/** Motivos de cierre según el movimiento: lo que entregamos (pago: anticipo,
 *  préstamo, pago de más) puede ser incobrable; lo que nos dejó un cliente
 *  (cobro) solo se cierra por redondeo u otro. */
export function motivosCierrePara(tipo: TipoMovimientoFin): MotivoCierreSaldo[] {
  return tipo === 'pago' ? ['incobrable', 'redondeo', 'otro'] : ['redondeo', 'otro'];
}

/** Reglas comunes a cierre y devolución sobre el movimiento original. */
function validarSaldoDisponible(mov: MovimientoConSaldo, importe: number, fecha: string, hoy: string): string | null {
  if (mov.estado !== 'vigente') return `El movimiento ${mov.numero} está anulado.`;
  if (mov.tipo === 'ajuste') return 'Un ajuste no tiene saldo sin imputar.';
  if (esDevolucion(mov)) return `${mov.numero} es una devolución: no tiene saldo propio.`;
  if (!(mov.sinImputar > 0)) return `El movimiento ${mov.numero} no tiene saldo sin imputar.`;
  if (!FORMATO_FECHA.test(fecha)) return 'Fecha inválida.';
  if (fecha > hoy) return 'La fecha no puede ser futura.';
  if (fecha < mov.fecha) return `La fecha no puede ser anterior a la del movimiento ${mov.numero}.`;
  if (!(importe > 0)) return 'El importe tiene que ser mayor a cero.';
  if (importe - mov.sinImputar > TOLERANCIA_IMPORTE) {
    return `El importe (${importe.toFixed(2)}) supera el saldo sin imputar de ${mov.numero} (${mov.sinImputar.toFixed(2)}).`;
  }
  return null;
}

export function normalizarCierreSaldo(d: DatosCierreSaldo): DatosCierreSaldo {
  return { ...d, importe: redondear2(Number(d.importe) || 0), observaciones: (d.observaciones ?? '').trim() };
}

/** Sobre el movimiento (de la fila en la UI, releído en la transacción) y
 *  datos YA normalizados. Devuelve el mensaje de error o null. */
export function validarCierreSaldo(mov: MovimientoConSaldo, d: DatosCierreSaldo, hoy: string): string | null {
  const error = validarSaldoDisponible(mov, d.importe, d.fecha, hoy);
  if (error) return error;
  if (!motivosCierrePara(mov.tipo).includes(d.motivo)) return 'Motivo inválido para este movimiento.';
  if (d.motivo === 'incobrable' && !importesIguales(d.importe, mov.sinImputar)) {
    return `Incobrable va por el saldo completo: $ ${mov.sinImputar.toFixed(2)}.`;
  }
  if (d.motivo === 'redondeo' && d.importe - UMBRAL_CERRAR_DIFERENCIA > TOLERANCIA_IMPORTE) {
    return `Un cierre por redondeo no puede superar $ ${UMBRAL_CERRAR_DIFERENCIA}.`;
  }
  if (d.motivo === 'otro' && !d.observaciones) return 'Con motivo "Otro" la observación es obligatoria.';
  return null;
}

export function normalizarDevolucion(d: DatosDevolucion): DatosDevolucion {
  return { ...d, medio: normalizarMedio(d.medio), observaciones: (d.observaciones ?? '').trim() };
}

export function validarDevolucion(mov: MovimientoConSaldo, d: DatosDevolucion, hoy: string): string | null {
  const error = validarSaldoDisponible(mov, d.medio.importe, d.fecha, hoy);
  if (error) return error;
  if (d.medio.tipo === 'retencion') return 'Una devolución no lleva retenciones.';
  if (d.medio.fechaCobro !== null && !FORMATO_FECHA.test(d.medio.fechaCobro)) return 'Fecha de cobro del cheque inválida.';
  return null;
}

/** Imputación de un movimiento sobre OTRO movimiento (documento
 *  'movimientoFin'). Se usa en los dos sentidos: en el ajuste / devolución
 *  (apunta al original, origen 'directa') y, como espejo, en el original
 *  (apunta al ajuste / devolución, origen 'cierre' | 'devolucion'), para que
 *  su totalImputado / sinImputar lo reflejen. */
export function imputacionSobreMovimiento(
  doc: { id: string; numero: string; total: number },
  saldoAntes: number,
  importe: number,
  fecha: string,
  origen: OrigenImputacionFin,
): ImputacionFin {
  return {
    documento: { tipo: 'movimientoFin', id: doc.id },
    numeroDocumento: doc.numero,
    periodoClave: null,
    fechaFactura: null,
    totalDocumento: doc.total,
    saldoAntes: redondear2(saldoAntes),
    importe: redondear2(importe),
    fecha,
    origen,
  };
}

/** Cuerpo del ajuste que cierra el saldo de `mov` (sin idMovimiento). */
export function armarCierreSaldo(p: {
  mov: Pick<MovimientoFin, 'numero' | 'total' | 'sinImputar' | 'entidad'>;
  idMovimientoOrigen: string;
  datos: DatosCierreSaldo;
  numero: string;
  fechaRegistro: string;
  usuario: string;
}): Omit<MovimientoFin, 'idMovimiento'> {
  const imputacion = imputacionSobreMovimiento(
    { id: p.idMovimientoOrigen, numero: p.mov.numero, total: p.mov.total },
    p.mov.sinImputar, p.datos.importe, p.datos.fecha, 'directa',
  );
  return {
    tipo: 'ajuste',
    numero: p.numero,
    fecha: p.datos.fecha,
    fechaRegistro: p.fechaRegistro,
    entidad: { ...p.mov.entidad },
    concepto: 'normal',
    motivoAjuste: p.datos.motivo,
    medios: [],
    total: imputacion.importe,
    imputaciones: [imputacion],
    idsDocumentos: [p.idMovimientoOrigen],
    totalImputado: imputacion.importe,
    sinImputar: 0,
    observaciones: p.datos.observaciones,
    estado: 'vigente',
    anulacion: null,
    usuario: p.usuario,
  };
}

/** Cuerpo de la devolución contra el saldo de `mov` (sin idMovimiento):
 *  tipo inverso (cobro → pago, pago → cobro), un medio, todo imputado al
 *  original. */
export function armarDevolucion(p: {
  mov: Pick<MovimientoFin, 'tipo' | 'numero' | 'total' | 'sinImputar' | 'entidad'>;
  idMovimientoOrigen: string;
  datos: DatosDevolucion;
  numero: string;
  fechaRegistro: string;
  usuario: string;
}): Omit<MovimientoFin, 'idMovimiento'> {
  const imputacion = imputacionSobreMovimiento(
    { id: p.idMovimientoOrigen, numero: p.mov.numero, total: p.mov.total },
    p.mov.sinImputar, p.datos.medio.importe, p.datos.fecha, 'directa',
  );
  return {
    tipo: tipoDevolucionDe(p.mov.tipo),
    numero: p.numero,
    fecha: p.datos.fecha,
    fechaRegistro: p.fechaRegistro,
    entidad: { ...p.mov.entidad },
    concepto: 'normal',
    motivoAjuste: null,
    medios: [{ ...p.datos.medio }],
    total: imputacion.importe,
    imputaciones: [imputacion],
    idsDocumentos: [p.idMovimientoOrigen],
    totalImputado: imputacion.importe,
    sinImputar: 0,
    observaciones: p.datos.observaciones,
    estado: 'vigente',
    anulacion: null,
    usuario: p.usuario,
  };
}

/** Tipo de la devolución: al cliente se le PAGA lo que dejó de más; lo que
 *  devuelve un chofer o proveedor entra como un COBRO. */
export function tipoDevolucionDe(tipoOriginal: TipoMovimientoFin): 'cobro' | 'pago' {
  return tipoOriginal === 'cobro' ? 'pago' : 'cobro';
}

/** Campos del movimiento original sin las imputaciones espejo de
 *  `idDocumento` (al anular el ajuste o la devolución): devuelve el saldo
 *  sin imputar. */
export function quitarImputacionesDe(
  mov: Pick<MovimientoFin, 'numero' | 'total' | 'imputaciones'>,
  idDocumento: string,
): Pick<MovimientoFin, 'imputaciones' | 'idsDocumentos' | 'totalImputado' | 'sinImputar'> {
  const restantes = (mov.imputaciones ?? []).filter(i => i.documento.id !== idDocumento);
  return acumularImputaciones({ numero: mov.numero, total: mov.total, imputaciones: restantes }, []);
}
```

## PASO 3 — `src/app/servicios/finanzas-nueva/movimiento-fin.service.ts`

#### 3a

BUSCAR:
```ts
import {
  DatosAjusteFin, DatosMovimientoFin, ETIQUETA_MOTIVO_AJUSTE, ETIQUETA_TIPO_MOVIMIENTO, ImputacionSolicitada,
  acumularImputaciones, acumuladoDeMovimiento, armarAjuste, armarImputacion, armarMovimiento, normalizarDatosAjuste,
  normalizarDatosMovimiento, normalizarSolicitudes, reversionesDe, validarAnulable, validarDatosAjuste,
  validarDatosMovimiento, validarDocumentoImputable, validarImporteAjuste, validarImputacionSaldo,
} from 'src/app/shared/utils/movimiento-fin.util';
```

REEMPLAZAR:
```ts
import {
  DatosAjusteFin, DatosCierreSaldo, DatosDevolucion, DatosMovimientoFin, ETIQUETA_MOTIVO_AJUSTE, ETIQUETA_TIPO_MOVIMIENTO,
  ImputacionSolicitada, acumularImputaciones, acumuladoDeMovimiento, armarAjuste, armarCierreSaldo, armarDevolucion,
  armarImputacion, armarMovimiento, imputacionSobreMovimiento, normalizarCierreSaldo, normalizarDatosAjuste,
  normalizarDatosMovimiento, normalizarDevolucion, normalizarSolicitudes, quitarImputacionesDe, reversionesDe,
  tipoDevolucionDe, validarAnulable, validarCierreSaldo, validarDatosAjuste, validarDatosMovimiento,
  validarDevolucion, validarDocumentoImputable, validarImporteAjuste, validarImputacionSaldo,
} from 'src/app/shared/utils/movimiento-fin.util';
```

#### 3b

BUSCAR:
```ts
        const reversiones = reversionesDe(mov.imputaciones ?? []);
        const leidos = await Promise.all(reversiones.map(async rev => ({
          rev,
          liq: await this.db.leerEnTransaccion<InformeLiqNuevo>(tx, this.COL_LIQ, rev.idDocumento),
        })));
        // — fin de lecturas —
```

REEMPLAZAR:
```ts
        const reversiones = reversionesDe(mov.imputaciones ?? []);
        const leidos = await Promise.all(reversiones.filter(rev => rev.tipo === 'informeLiq').map(async rev => ({
          rev,
          liq: await this.db.leerEnTransaccion<InformeLiqNuevo>(tx, this.COL_LIQ, rev.idDocumento),
        })));
        // F7b: un cierre de saldo o una devolución apuntan a OTRO movimiento.
        const originales = await Promise.all(reversiones.filter(rev => rev.tipo === 'movimientoFin').map(async rev => ({
          rev,
          orig: await this.db.leerEnTransaccion<MovimientoFin>(tx, this.COLECCION, rev.idDocumento),
        })));
        // — fin de lecturas —
```

#### 3c

BUSCAR:
```ts
        const anulacion: Anulacion = { motivo: motivoLimpio, usuario, fecha };
```

REEMPLAZAR:
```ts
        // F7b: el movimiento original recupera su saldo sin imputar.
        for (const { rev, orig } of originales) {
          if (!orig) throw new Error(`No existe el movimiento ${rev.numeroDocumento}. Anulación abortada.`);
          escrituras.push({
            coleccion: this.COLECCION, id: rev.idDocumento, modo: 'actualizar', data: quitarImputacionesDe(orig, idMovimiento),
          });
        }

        const anulacion: Anulacion = { motivo: motivoLimpio, usuario, fecha };
```

#### 3d

BUSCAR:
```ts
  /** Anula un movimiento ENTERO (F10: no se edita; motivo obligatorio).
```

REEMPLAZAR:
```ts
  /** Cierra (todo o parte de) el saldo sin imputar de un cobro o pago con
   *  un AJUSTE (F7b): anticipo o préstamo que no se recupera (incobrable,
   *  por el saldo completo), saldo a favor de un cliente que no se usa
   *  (redondeo / otro). Transacción: numerador AJ + movimiento original
   *  (vigente, con saldo); escribe el AJ (imputado al original), suma al
   *  original la imputación espejo (origen 'cierre') que le baja el
   *  sinImputar, y un log AJUSTAR. Se revierte anulando el AJ. */
  async cerrarSaldo(idMovimiento: string, d: DatosCierreSaldo): Promise<Resultado<ResultadoMovimientoFin>> {
    const datos = normalizarCierreSaldo(d);
    const hoy = toISODateString(new Date());

    // Afuera del callback: puede reintentarse y tiene que ser puro.
    const idAjuste = this.db.generarId(this.COLECCION);
    const fechaRegistro = new Date().toISOString();
    const usuario = this.usuarioSesion.getUsuarioActual()?.email ?? 'Desconocido';

    try {
      const r = await this.db.commitEnTransaccion<{ numero: string; origen: string }>(async (tx) => {
        const n = await this.numerador.leerProximoNumeroMovimientoFin(tx, 'ajuste');
        const mov = await this.db.leerEnTransaccion<MovimientoFin>(tx, this.COLECCION, idMovimiento);
        // — fin de lecturas —
        if (!mov) throw new Error(`No existe el movimiento ${idMovimiento}.`);
        const error = validarCierreSaldo(mov, datos, hoy);
        if (error) throw new Error(error);

        const ajuste = armarCierreSaldo({
          mov, idMovimientoOrigen: idMovimiento, datos, numero: n.numero, fechaRegistro, usuario,
        });
        const espejo = imputacionSobreMovimiento(
          { id: idAjuste, numero: n.numero, total: ajuste.total }, mov.sinImputar, ajuste.total, datos.fecha, 'cierre',
        );
        const escrituras: EscrituraBatch[] = [
          n.escritura,
          { coleccion: this.COLECCION, id: idAjuste, modo: 'crear', data: ajuste },
          { coleccion: this.COLECCION, id: idMovimiento, modo: 'actualizar', data: acumularImputaciones(mov, [espejo]) },
        ];

        await this.logRegistro.agregarAlBatch(
          escrituras, 'AJUSTAR', this.COLECCION, idAjuste,
          `Cierre de saldo (${ETIQUETA_MOTIVO_AJUSTE[datos.motivo].toLowerCase()}) ${n.numero} — ` +
          `${mov.entidad.tipo} ${mov.entidad.razonSocial} — $ ${ajuste.total.toFixed(2)} del saldo sin imputar de ${mov.numero}` +
          (datos.observaciones ? ` — ${datos.observaciones}` : ''),
          null,
        );

        return { escrituras, resultado: { numero: n.numero, origen: mov.numero } };
      });

      return {
        exito: true,
        mensaje: `Ajuste ${r.numero} registrado: se cerraron $ ${datos.importe.toFixed(2)} del saldo de ${r.origen}.`,
        objeto: { idMovimiento: idAjuste, numero: r.numero },
      };
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'AJUSTAR', this.COLECCION, idAjuste, `Error al cerrar el saldo de ${idMovimiento}: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `No se pudo cerrar el saldo: ${e?.message ?? e}` };
    }
  }

  /** Devolución (F7b) contra el saldo sin imputar de un cobro o pago: al
   *  cliente que pagó de más se le PAGA (OPG); el chofer / proveedor que
   *  devuelve un adelanto genera un COBRO (RC). Transacción: numerador del
   *  tipo inverso + movimiento original (vigente, con saldo); escribe la
   *  devolución (un medio, imputada al original), la imputación espejo en el
   *  original (origen 'devolucion') y un log PAGAR / COBRAR. Se revierte
   *  anulando la devolución. */
  async registrarDevolucion(idMovimiento: string, d: DatosDevolucion): Promise<Resultado<ResultadoMovimientoFin>> {
    const datos = normalizarDevolucion(d);
    const hoy = toISODateString(new Date());

    // Afuera del callback: puede reintentarse y tiene que ser puro.
    const idDevolucion = this.db.generarId(this.COLECCION);
    const fechaRegistro = new Date().toISOString();
    const usuario = this.usuarioSesion.getUsuarioActual()?.email ?? 'Desconocido';

    try {
      const r = await this.db.commitEnTransaccion<{ numero: string; origen: string; accion: 'COBRAR' | 'PAGAR' }>(async (tx) => {
        const mov = await this.db.leerEnTransaccion<MovimientoFin>(tx, this.COLECCION, idMovimiento);
        if (!mov) throw new Error(`No existe el movimiento ${idMovimiento}.`);
        const tipo = tipoDevolucionDe(mov.tipo);
        const n = await this.numerador.leerProximoNumeroMovimientoFin(tx, tipo);
        // — fin de lecturas —
        const error = validarDevolucion(mov, datos, hoy);
        if (error) throw new Error(error);

        const devolucion = armarDevolucion({
          mov, idMovimientoOrigen: idMovimiento, datos, numero: n.numero, fechaRegistro, usuario,
        });
        const espejo = imputacionSobreMovimiento(
          { id: idDevolucion, numero: n.numero, total: devolucion.total }, mov.sinImputar, devolucion.total, datos.fecha, 'devolucion',
        );
        const escrituras: EscrituraBatch[] = [
          n.escritura,
          { coleccion: this.COLECCION, id: idDevolucion, modo: 'crear', data: devolucion },
          { coleccion: this.COLECCION, id: idMovimiento, modo: 'actualizar', data: acumularImputaciones(mov, [espejo]) },
        ];

        const accion = tipo === 'cobro' ? 'COBRAR' : 'PAGAR';
        await this.logRegistro.agregarAlBatch(
          escrituras, accion, this.COLECCION, idDevolucion,
          `Devolución ${n.numero} — ${mov.entidad.tipo} ${mov.entidad.razonSocial} — $ ${devolucion.total.toFixed(2)} ` +
          `contra el saldo sin imputar de ${mov.numero}` + (datos.observaciones ? ` — ${datos.observaciones}` : ''),
          null,
        );

        return { escrituras, resultado: { numero: n.numero, origen: mov.numero, accion } };
      });

      return {
        exito: true,
        mensaje: `Devolución ${r.numero} registrada por $ ${datos.medio.importe.toFixed(2)} contra el saldo de ${r.origen}.`,
        objeto: { idMovimiento: idDevolucion, numero: r.numero },
      };
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'PAGAR', this.COLECCION, idDevolucion, `Error al registrar la devolución contra ${idMovimiento}: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `No se pudo registrar la devolución: ${e?.message ?? e}` };
    }
  }

  /** Anula un movimiento ENTERO (F10: no se edita; motivo obligatorio).
```

## PASO 4 — `src/app/shared/utils/cuenta-entidad.util.ts`

#### 4a

BUSCAR:
```ts
import { fechaBaseAntiguedad } from 'src/app/shared/utils/cuentas-finanzas.util';
```

REEMPLAZAR:
```ts
import { fechaBaseAntiguedad } from 'src/app/shared/utils/cuentas-finanzas.util';
import { esDevolucion, esSobreSaldo, movimientoOrigenDe } from 'src/app/shared/utils/movimiento-fin.util';
```

#### 4b

BUSCAR:
```ts
  concepto: 'normal' | 'anticipo' | 'prestamo' | null;  // solo movimientos (F5c)
```

REEMPLAZAR:
```ts
  concepto: 'normal' | 'anticipo' | 'prestamo' | 'devolucion' | null;  // solo movimientos (F5c; devolución F7b)
```

#### 4c

BUSCAR:
```ts
  for (const m of movimientos) {
    if (m.estado !== 'vigente') continue;
    const detalle = m.tipo === 'ajuste'
      ? `Ajuste${m.motivoAjuste ? ` (${ETIQUETA_MOTIVO_MAYOR[m.motivoAjuste] ?? m.motivoAjuste})` : ''}`
      : `${ETIQUETA_MOV[m.tipo] ?? m.tipo}${ETIQUETA_CONCEPTO_MAYOR[m.concepto] ?? ''}` +
        (m.sinImputar > 0 ? ` — sin imputar $ ${m.sinImputar.toFixed(2)}` : '');
    base.push({
      fecha: m.fecha, orden: 2, tipo: m.tipo, concepto: m.concepto,
      referencia: m.numero, detalle,
      debe: 0, haber: redondear2(m.total), informativa: false, sinFacturar: false,
      idInfLiq: null, idMovimiento: m.idMovimiento,
    });
  }
```

REEMPLAZAR:
```ts
  for (const m of movimientos) {
    if (m.estado !== 'vigente') continue;
    // F7b: un cierre de saldo (ajuste) o una devolución SUBEN el saldo — la
    // entidad deja de tener saldo a favor / anticipo —: van al debe.
    const sobreSaldo = esSobreSaldo(m);
    const origen = movimientoOrigenDe(m);
    const detalle = m.tipo === 'ajuste'
      ? `Ajuste${m.motivoAjuste ? ` (${ETIQUETA_MOTIVO_MAYOR[m.motivoAjuste] ?? m.motivoAjuste})` : ''}` +
        (sobreSaldo ? ` — cierra el saldo de ${origen}` : '')
      : sobreSaldo
        ? `Devolución — contra el saldo de ${origen}`
        : `${ETIQUETA_MOV[m.tipo] ?? m.tipo}${ETIQUETA_CONCEPTO_MAYOR[m.concepto] ?? ''}` +
          (m.sinImputar > 0 ? ` — sin imputar $ ${m.sinImputar.toFixed(2)}` : '');
    base.push({
      fecha: m.fecha, orden: 2, tipo: m.tipo, concepto: esDevolucion(m) ? 'devolucion' : m.concepto,
      referencia: m.numero, detalle,
      debe: sobreSaldo ? redondear2(m.total) : 0, haber: sobreSaldo ? 0 : redondear2(m.total),
      informativa: false, sinFacturar: false,
      idInfLiq: null, idMovimiento: m.idMovimiento,
    });
  }
```

## PASO 5 — `src/app/shared/utils/resumen-finanzas.util.ts`

#### 5a

BUSCAR:
```ts
import { CuentaEntidadFin, ladoDe } from 'src/app/shared/utils/cuentas-finanzas.util';
```

REEMPLAZAR:
```ts
import { CuentaEntidadFin, ladoDe } from 'src/app/shared/utils/cuentas-finanzas.util';
import { esDevolucion } from 'src/app/shared/utils/movimiento-fin.util';
```

#### 5b

BUSCAR:
```ts
  ajustesCobrar: number;           // ajustes a clientes (bajan lo que nos deben)
  ajustesPagar: number;            // ajustes a choferes / proveedores
```

REEMPLAZAR:
```ts
  ajustesCobrar: number;           // ajustes a clientes (bajan lo que nos deben)
  ajustesPagar: number;            // ajustes a choferes / proveedores
  devolucionesEntregadas: number;  // pagos a clientes que pagaron de más (F7b)
  devolucionesRecibidas: number;   // cobros a choferes / proveedores que devuelven un adelanto (F7b)
```

#### 5c

BUSCAR:
```ts
    ajustesCobrar: 0, ajustesPagar: 0, netoCaja: 0,
  };
  for (const m of movimientos) {
    if (m.estado !== 'vigente' || mesDe(m.fecha) !== mes) continue;
    if (m.tipo === 'cobro') {
```

REEMPLAZAR:
```ts
    ajustesCobrar: 0, ajustesPagar: 0, devolucionesEntregadas: 0, devolucionesRecibidas: 0, netoCaja: 0,
  };
  for (const m of movimientos) {
    if (m.estado !== 'vigente' || mesDe(m.fecha) !== mes) continue;
    if (esDevolucion(m)) {
      if (m.tipo === 'pago') f.devolucionesEntregadas += m.total;
      else f.devolucionesRecibidas += m.total;
      continue;
    }
    if (m.tipo === 'cobro') {
```

#### 5d

BUSCAR:
```ts
  const entro = f.cobrado - f.retencionesSufridas;
  const salio = f.pagado + f.anticiposEntregados - f.retencionesPracticadas;
```

REEMPLAZAR:
```ts
  const entro = f.cobrado - f.retencionesSufridas + f.devolucionesRecibidas;
  const salio = f.pagado + f.anticiposEntregados - f.retencionesPracticadas + f.devolucionesEntregadas;
```

#### 5e

BUSCAR:
```ts
    ajustesPagar: redondear2(f.ajustesPagar),
    netoCaja: redondear2(entro - salio),
```

REEMPLAZAR:
```ts
    ajustesPagar: redondear2(f.ajustesPagar),
    devolucionesEntregadas: redondear2(f.devolucionesEntregadas),
    devolucionesRecibidas: redondear2(f.devolucionesRecibidas),
    netoCaja: redondear2(entro - salio),
```

#### 5f

BUSCAR:
```ts
  for (const m of movimientos) {
    if (m.estado !== 'vigente' || m.tipo === 'ajuste') continue;
    const fila = filas.get(mesDe(m.fecha));
    if (!fila) continue;
    if (m.tipo === 'cobro') fila.cobrado += m.total;
    else fila.pagado += m.total;
  }
```

REEMPLAZAR:
```ts
  for (const m of movimientos) {
    if (m.estado !== 'vigente' || m.tipo === 'ajuste') continue;
    const fila = filas.get(mesDe(m.fecha));
    if (!fila) continue;
    // F7b: una devolución resta de lo cobrado (al cliente) o de lo pagado
    // (lo que devuelve el chofer / proveedor).
    if (esDevolucion(m)) {
      if (m.tipo === 'pago') fila.cobrado -= m.total;
      else fila.pagado -= m.total;
      continue;
    }
    if (m.tipo === 'cobro') fila.cobrado += m.total;
    else fila.pagado += m.total;
  }
```

## PASO 6 — NUEVO `src/app/raiz/finanzas-nueva/modales/saldo-sin-imputar/`

### 6a — `saldo-sin-imputar.component.ts`

```ts
import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { MedioMovimientoFin, MovimientoFin, PREFIJO_MOVIMIENTO_FIN, TipoMedioFin } from 'src/app/interfaces/movimiento-fin';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { MovimientoFinService } from 'src/app/servicios/finanzas-nueva/movimiento-fin.service';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import {
  DatosCierreSaldo, DatosDevolucion, ETIQUETA_MEDIO, ETIQUETA_MOTIVO_AJUSTE, ETIQUETA_TIPO_MOVIMIENTO,
  MotivoCierreSaldo, UMBRAL_CERRAR_DIFERENCIA, etiquetaConceptoMovimiento, motivosCierrePara,
  normalizarCierreSaldo, normalizarDevolucion, tipoDevolucionDe, validarCierreSaldo, validarDevolucion,
} from 'src/app/shared/utils/movimiento-fin.util';

export type ModoSaldoSinImputar = 'cerrar' | 'devolver';

/** Finanzas — qué hacer con el saldo sin imputar de un cobro o pago que no
 *  se va a aplicar a comprobantes (F7b):
 *  - Cerrar por ajuste: AJ por incobrable (anticipo / préstamo perdido, por
 *    el saldo completo), redondeo (≤ $ 1.000) u otro (con observación).
 *  - Devolver: plata en sentido contrario — un PAGO al cliente que pagó de
 *    más, un COBRO al chofer / proveedor que devuelve un adelanto. Un medio,
 *    sin retenciones.
 *  Importe parcial permitido (salvo incobrable). Valida en vivo con el mismo
 *  util que el servicio; cierra con true si registró. */
@Component({
  selector: 'app-saldo-sin-imputar',
  standalone: false,
  templateUrl: './saldo-sin-imputar.component.html',
  styleUrl: './saldo-sin-imputar.component.scss',
})
export class SaldoSinImputarComponent implements OnInit {

  @Input() movimiento!: ConId<MovimientoFin>;
  @Input() modo: ModoSaldoSinImputar = 'cerrar';

  readonly hoy = toISODateString(new Date());
  readonly fechaLegible = fechaComprobanteLegible;
  readonly etiquetaTipo = ETIQUETA_TIPO_MOVIMIENTO;
  readonly etiquetaMotivo = ETIQUETA_MOTIVO_AJUSTE;
  readonly etiquetaMedio = ETIQUETA_MEDIO;
  readonly umbralRedondeo = UMBRAL_CERRAR_DIFERENCIA;
  readonly tiposMedio: TipoMedioFin[] = ['transferencia', 'efectivo', 'cheque', 'echeq', 'otro'];

  motivos: MotivoCierreSaldo[] = [];
  motivo: MotivoCierreSaldo = 'otro';
  fecha = this.hoy;
  importe: number | null = null;
  observaciones = '';
  // Devolución
  tipoMedio: TipoMedioFin = 'transferencia';
  referencia = '';
  banco = '';
  fechaCobro = '';

  guardando = false;
  error = '';

  constructor(
    public activeModal: NgbActiveModal,
    private movimientos: MovimientoFinService,
  ) {}

  ngOnInit(): void {
    this.motivos = motivosCierrePara(this.movimiento.tipo);
    this.motivo = this.motivos.includes('otro') ? 'otro' : this.motivos[0];
    this.importe = this.movimiento.sinImputar;
  }

  // ---------------------------------------------------------------------------
  // Derivados
  // ---------------------------------------------------------------------------

  get m(): ConId<MovimientoFin> {
    return this.movimiento;
  }

  get concepto(): string {
    return etiquetaConceptoMovimiento(this.movimiento);
  }

  get esCliente(): boolean {
    return this.movimiento.entidad.tipo === 'cliente';
  }

  /** "un PAGO (OPG) al cliente" / "un COBRO (RC) del chofer". */
  get textoDevolucion(): string {
    const tipo = tipoDevolucionDe(this.movimiento.tipo);
    return tipo === 'pago'
      ? `un PAGO (${PREFIJO_MOVIMIENTO_FIN.pago}) al cliente: le devolvemos lo que pagó de más`
      : `un COBRO (${PREFIJO_MOVIMIENTO_FIN.cobro}) del ${this.movimiento.entidad.tipo}: nos devuelve lo que le adelantamos`;
  }

  get conBanco(): boolean {
    return this.tipoMedio === 'transferencia' || this.tipoMedio === 'cheque' || this.tipoMedio === 'echeq';
  }

  get esCheque(): boolean {
    return this.tipoMedio === 'cheque' || this.tipoMedio === 'echeq';
  }

  get queda(): number {
    const v = Math.round((this.movimiento.sinImputar - (Number(this.importe) || 0)) * 100) / 100;
    return Math.abs(v) < 0.005 ? 0 : v;
  }

  get errorValidacion(): string | null {
    return this.modo === 'cerrar'
      ? validarCierreSaldo(this.movimiento, normalizarCierreSaldo(this.datosCierre()), this.hoy)
      : validarDevolucion(this.movimiento, normalizarDevolucion(this.datosDevolucion()), this.hoy);
  }

  get puedeConfirmar(): boolean {
    return !this.guardando && this.errorValidacion === null;
  }

  // ---------------------------------------------------------------------------
  // Gestos
  // ---------------------------------------------------------------------------

  cambiarModo(modo: ModoSaldoSinImputar): void {
    this.modo = modo;
    this.error = '';
  }

  /** Incobrable va por el saldo completo: fija el importe. */
  onMotivo(motivo: MotivoCierreSaldo): void {
    this.motivo = motivo;
    if (motivo === 'incobrable') this.importe = this.movimiento.sinImputar;
  }

  async confirmar(): Promise<void> {
    if (!this.puedeConfirmar) return;
    this.error = '';
    const importe = Number(this.importe) || 0;
    const r = await Swal.fire({
      title: this.modo === 'cerrar' ? `¿Cerrar saldo de ${this.m.numero}?` : `¿Registrar devolución contra ${this.m.numero}?`,
      html:
        `<p>${this.m.entidad.razonSocial} — <b>$ ${importe.toFixed(2)}</b>` +
        (this.modo === 'cerrar' ? ` por ajuste (${this.etiquetaMotivo[this.motivo].toLowerCase()}).</p>` : ` — ${this.textoDevolucion}.</p>`) +
        (this.queda > 0 ? `<p>Quedan $ ${this.queda.toFixed(2)} sin imputar.</p>` : '') +
        '<p class="small">Se revierte anulando el movimiento nuevo.</p>',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.modo === 'cerrar' ? 'Cerrar saldo' : 'Registrar devolución',
      cancelButtonText: 'Volver',
    });
    if (!r.isConfirmed) return;

    this.guardando = true;
    try {
      const res = this.modo === 'cerrar'
        ? await this.movimientos.cerrarSaldo(this.m.idMovimiento, this.datosCierre())
        : await this.movimientos.registrarDevolucion(this.m.idMovimiento, this.datosDevolucion());
      if (!res.exito) {
        this.error = res.mensaje;
        return;
      }
      await Swal.fire({ icon: 'success', text: res.mensaje, timer: 2500 });
      this.activeModal.close(true);
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.activeModal.dismiss();
  }

  // ---------------------------------------------------------------------------
  // Auxiliares
  // ---------------------------------------------------------------------------

  private datosCierre(): DatosCierreSaldo {
    return { fecha: this.fecha, motivo: this.motivo, importe: Number(this.importe) || 0, observaciones: this.observaciones };
  }

  private datosDevolucion(): DatosDevolucion {
    const medio: MedioMovimientoFin = {
      tipo: this.tipoMedio,
      importe: Number(this.importe) || 0,
      referencia: this.referencia,
      banco: this.conBanco ? this.banco : null,
      fechaCobro: this.esCheque && this.fechaCobro ? this.fechaCobro : null,
      retencion: null,
    };
    return { fecha: this.fecha, medio, observaciones: this.observaciones };
  }
}
```

### 6b — `saldo-sin-imputar.component.html`

```html
<div class="modal-header">
  <div>
    <h4 class="modal-title">Saldo sin imputar — {{ etiquetaTipo[m.tipo] }} {{ m.numero }}</h4>
    <div class="text-muted">
      <span class="text-capitalize">{{ m.entidad.tipo }}</span> {{ m.entidad.razonSocial }} — CUIT {{ m.entidad.cuit }}
    </div>
  </div>
  <button type="button" class="btn-close" [disabled]="guardando" (click)="cancelar()"></button>
</div>

<div class="modal-body">
  <div class="row g-2 mb-3">
    <div class="col-md-3">
      <div class="dato-label">Fecha</div>
      <div>{{ fechaLegible(m.fecha) }}</div>
    </div>
    <div class="col-md-3">
      <div class="dato-label">Concepto</div>
      <div>{{ concepto }}</div>
    </div>
    <div class="col-md-3">
      <div class="dato-label">Total</div>
      <div class="col-importe">{{ m.total | formatearValor: '$' }}</div>
    </div>
    <div class="col-md-3">
      <div class="dato-label">Sin imputar</div>
      <div class="col-importe fw-bold">{{ m.sinImputar | formatearValor: '$' }}</div>
    </div>
  </div>

  <div class="btn-group mb-3" role="group" aria-label="Qué hacer con el saldo">
    <button type="button" class="btn" [ngClass]="modo === 'cerrar' ? 'btn-info' : 'btn-outline-info'"
      [disabled]="guardando" (click)="cambiarModo('cerrar')">Cerrar por ajuste</button>
    <button type="button" class="btn" [ngClass]="modo === 'devolver' ? 'btn-primary' : 'btn-outline-primary'"
      [disabled]="guardando" (click)="cambiarModo('devolver')">Devolver</button>
  </div>

  @if (modo === 'cerrar') {
    <p class="text-muted small">
      Un ajuste (AJ) da por terminado el saldo sin que se mueva plata:
      {{ esCliente ? 'el cliente no va a usar su saldo a favor.' : 'el anticipo o préstamo no se va a recuperar.' }}
    </p>
    <div class="row g-3">
      <div class="col-md-4">
        <label class="dato-label" for="motivoCierre">Motivo</label>
        <select id="motivoCierre" class="form-select" [ngModel]="motivo" (ngModelChange)="onMotivo($event)" [disabled]="guardando">
          @for (mo of motivos; track mo) {
            <option [ngValue]="mo">{{ etiquetaMotivo[mo] }}</option>
          }
        </select>
        @if (motivo === 'redondeo') {
          <div class="text-muted small mt-1">Hasta $ {{ umbralRedondeo }}.</div>
        }
      </div>
      <div class="col-md-4">
        <label class="dato-label" for="importeCierre">Importe</label>
        <input id="importeCierre" inputmode="decimal" class="form-control text-end" appMonto
          [(ngModel)]="importe" [disabled]="guardando || motivo === 'incobrable'" />
      </div>
      <div class="col-md-4">
        <label class="dato-label" for="fechaCierre">Fecha</label>
        <input id="fechaCierre" type="date" class="form-control" [(ngModel)]="fecha" [min]="m.fecha" [max]="hoy" [disabled]="guardando" />
      </div>
    </div>
  } @else {
    <p class="text-muted small">Se registra {{ textoDevolucion }}.</p>
    <div class="row g-3">
      <div class="col-md-3">
        <label class="dato-label" for="medioDev">Medio</label>
        <select id="medioDev" class="form-select" [(ngModel)]="tipoMedio" [disabled]="guardando">
          @for (t of tiposMedio; track t) {
            <option [ngValue]="t">{{ etiquetaMedio[t] }}</option>
          }
        </select>
      </div>
      <div class="col-md-3">
        <label class="dato-label" for="importeDev">Importe</label>
        <input id="importeDev" inputmode="decimal" class="form-control text-end" appMonto [(ngModel)]="importe" [disabled]="guardando" />
      </div>
      <div class="col-md-3">
        <label class="dato-label" for="fechaDev">Fecha</label>
        <input id="fechaDev" type="date" class="form-control" [(ngModel)]="fecha" [min]="m.fecha" [max]="hoy" [disabled]="guardando" />
      </div>
      <div class="col-md-3">
        <label class="dato-label" for="refDev">Referencia</label>
        <input id="refDev" type="text" class="form-control" [(ngModel)]="referencia" [disabled]="guardando"
          placeholder="N° de operación / cheque" />
      </div>
      @if (conBanco) {
        <div class="col-md-4">
          <label class="dato-label" for="bancoDev">Banco</label>
          <input id="bancoDev" type="text" class="form-control" [(ngModel)]="banco" [disabled]="guardando" />
        </div>
      }
      @if (esCheque) {
        <div class="col-md-4">
          <label class="dato-label" for="fechaCobroDev">Fecha de cobro del cheque</label>
          <input id="fechaCobroDev" type="date" class="form-control" [(ngModel)]="fechaCobro" [disabled]="guardando" />
        </div>
      }
    </div>
  }

  <div class="mt-3">
    <label class="dato-label" for="obsSaldo">Observaciones {{ modo === 'cerrar' && motivo === 'otro' ? '(obligatoria)' : '' }}</label>
    <textarea id="obsSaldo" class="form-control" rows="2" [(ngModel)]="observaciones" [disabled]="guardando"></textarea>
  </div>

  <div class="d-flex justify-content-end mt-2">
    <div class="resumen p-2 rounded">
      Queda sin imputar: <b class="col-importe">{{ queda | formatearValor: '$' }}</b>
    </div>
  </div>

  @if (errorValidacion) {
    <div class="text-danger small mt-2">{{ errorValidacion }}</div>
  }
  @if (error) {
    <div class="alert alert-danger mt-2 mb-0">{{ error }}</div>
  }
</div>

<div class="modal-footer">
  <button type="button" class="btn" [ngClass]="modo === 'cerrar' ? 'btn-info' : 'btn-primary'"
    [disabled]="!puedeConfirmar" (click)="confirmar()">{{ modo === 'cerrar' ? 'Cerrar saldo' : 'Registrar devolución' }}</button>
  <button type="button" class="btn btn-outline-secondary" [disabled]="guardando" (click)="cancelar()">Cancelar</button>
</div>

@if (guardando) {
  <app-spinner></app-spinner>
}
```

### 6c — `saldo-sin-imputar.component.scss`

```scss
.dato-label {
  font-size: 0.85rem;
  color: #6c757d;
}

.col-importe {
  font-variant-numeric: tabular-nums;
}

.resumen {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
}

input,
select,
textarea {
  font-size: 1.2rem;
}
```

## PASO 7 — `src/app/raiz/finanzas-nueva/finanzas-nueva.module.ts`

#### 7a

BUSCAR:
```ts
import { RegistrarAjusteComponent } from './modales/registrar-ajuste/registrar-ajuste.component';
```

REEMPLAZAR:
```ts
import { RegistrarAjusteComponent } from './modales/registrar-ajuste/registrar-ajuste.component';
import { SaldoSinImputarComponent } from './modales/saldo-sin-imputar/saldo-sin-imputar.component';
```

#### 7b

BUSCAR:
```ts
    RegistrarAjusteComponent,
  ],
```

REEMPLAZAR:
```ts
    RegistrarAjusteComponent,
    SaldoSinImputarComponent,
  ],
```

## PASO 8 — `src/app/raiz/finanzas-nueva/listado-movimientos.ts`

#### 8a

BUSCAR:
```ts
import {
  ETIQUETA_CONCEPTO, ETIQUETA_MOTIVO_AJUSTE, ETIQUETA_TIPO_MOVIMIENTO, resumenMedios,
} from 'src/app/shared/utils/movimiento-fin.util';
```

REEMPLAZAR:
```ts
import {
  ETIQUETA_TIPO_MOVIMIENTO, esDevolucion, etiquetaConceptoMovimiento, resumenMedios, validarAnulable,
} from 'src/app/shared/utils/movimiento-fin.util';
```

#### 8b

BUSCAR:
```ts
 *  Los ids de acción ('ver', 'imputar', 'anular') los resuelve
 *  AccionesMovimientoService. */
```

REEMPLAZAR:
```ts
 *  Los ids de acción ('ver', 'imputar', 'saldo', 'anular') los resuelve
 *  AccionesMovimientoService. */
```

#### 8c

BUSCAR:
```ts
      visible: m => m.estado === 'vigente' && m.tipo !== 'ajuste' && m.sinImputar > 0,
    },
    {
      id: 'anular', label: 'Anular', clase: 'btn-outline-danger', permiso: 'finanzas.anular',
      visible: m => m.estado === 'vigente',
      deshabilitada: m => m.imputaciones.some(i => i.origen === 'compensacion'),
    },
```

REEMPLAZAR:
```ts
      visible: m => m.estado === 'vigente' && m.tipo !== 'ajuste' && m.sinImputar > 0,
    },
    {
      // F7b: cerrar por ajuste o devolver el saldo sin imputar.
      id: 'saldo', label: 'Cerrar / devolver', clase: 'btn-outline-info', permiso: 'finanzas.agregar',
      visible: m => m.estado === 'vigente' && m.tipo !== 'ajuste' && m.sinImputar > 0,
    },
    {
      id: 'anular', label: 'Anular', clase: 'btn-outline-danger', permiso: 'finanzas.anular',
      visible: m => m.estado === 'vigente',
      deshabilitada: m => validarAnulable(m) !== null,
    },
```

#### 8d

BUSCAR:
```ts
        valor: m => (m.tipo === 'ajuste'
          ? (m.motivoAjuste ? ETIQUETA_MOTIVO_AJUSTE[m.motivoAjuste] : '—')
          : ETIQUETA_CONCEPTO[m.concepto]),
        orden: m => m.concepto,
        clase: m => (m.concepto === 'anticipo' || m.concepto === 'prestamo' ? 'text-warning-emphasis fw-semibold' : ''),
```

REEMPLAZAR:
```ts
        valor: m => etiquetaConceptoMovimiento(m),
        orden: m => etiquetaConceptoMovimiento(m),
        clase: m => (m.concepto === 'anticipo' || m.concepto === 'prestamo'
          ? 'text-warning-emphasis fw-semibold'
          : esDevolucion(m) ? 'text-primary fw-semibold' : ''),
```

## PASO 9 — `src/app/raiz/finanzas-nueva/acciones-movimiento.service.ts`

#### 9a

BUSCAR:
```ts
import { ETIQUETA_TIPO_MOVIMIENTO } from 'src/app/shared/utils/movimiento-fin.util';
```

REEMPLAZAR:
```ts
import { ETIQUETA_TIPO_MOVIMIENTO, movimientoOrigenDe } from 'src/app/shared/utils/movimiento-fin.util';
```

#### 9b

BUSCAR:
```ts
import { ImputarSaldoComponent } from './modales/imputar-saldo/imputar-saldo.component';
```

REEMPLAZAR:
```ts
import { ImputarSaldoComponent } from './modales/imputar-saldo/imputar-saldo.component';
import { ModoSaldoSinImputar, SaldoSinImputarComponent } from './modales/saldo-sin-imputar/saldo-sin-imputar.component';
```

#### 9c

BUSCAR:
```ts
  /** Pide el motivo (obligatorio) y delega en MovimientoFinService.anular. */
```

REEMPLAZAR:
```ts
  /** Cerrar por ajuste o devolver el saldo sin imputar (F7b). */
  saldo(m: ConId<MovimientoFin>, modo: ModoSaldoSinImputar = 'cerrar'): void {
    const modalRef = this.modalService.open(SaldoSinImputarComponent, {
      size: 'lg', centered: true, scrollable: true, backdrop: 'static', keyboard: false,
    });
    modalRef.componentInstance.movimiento = m;
    modalRef.componentInstance.modo = modo;
    modalRef.result.catch(() => {});
  }

  /** Pide el motivo (obligatorio) y delega en MovimientoFinService.anular. */
```

#### 9d

BUSCAR:
```ts
    const comprobantes = new Set(m.imputaciones.map(i => i.documento.id)).size;
```

REEMPLAZAR:
```ts
    const comprobantes = new Set(m.imputaciones.filter(i => i.documento.tipo === 'informeLiq').map(i => i.documento.id)).size;
    const origen = movimientoOrigenDe(m);
```

#### 9e

BUSCAR:
```ts
        (m.sinImputar > 0
          ? `<p>Los $ ${this.importe(m.sinImputar)} sin imputar dejan de estar disponibles.</p>`
          : '') +
```

REEMPLAZAR:
```ts
        (origen ? `<p>${origen} recupera los $ ${this.importe(m.total)} de saldo sin imputar.</p>` : '') +
        (m.sinImputar > 0
          ? `<p>Los $ ${this.importe(m.sinImputar)} sin imputar dejan de estar disponibles.</p>`
          : '') +
```

#### 9f

BUSCAR:
```ts
        else if (resultado === 'imputar') this.imputar(m);
```

REEMPLAZAR:
```ts
        else if (resultado === 'imputar') this.imputar(m);
        else if (resultado === 'saldo') this.saldo(m);
```

## PASO 10 — `src/app/raiz/finanzas-nueva/movimientos/finanzas-movimientos.component.ts`

#### 10a

BUSCAR:
```ts
    else if (ev.id === 'imputar') this.accionesMov.imputar(ev.item);
    else if (ev.id === 'anular') this.accionesMov.anular(ev.item, alProcesar);
```

REEMPLAZAR:
```ts
    else if (ev.id === 'imputar') this.accionesMov.imputar(ev.item);
    else if (ev.id === 'saldo') this.accionesMov.saldo(ev.item);
    else if (ev.id === 'anular') this.accionesMov.anular(ev.item, alProcesar);
```

## PASO 11 — `src/app/raiz/finanzas-nueva/cuenta-entidad/` (ts y html)

### 11.1 — `cuenta-entidad.component.ts`

#### 11.1.a

BUSCAR:
```ts
    else if (ev.id === 'imputar') this.accionesMov.imputar(ev.item);
    else if (ev.id === 'anular') this.accionesMov.anular(ev.item, alProcesar);
```

REEMPLAZAR:
```ts
    else if (ev.id === 'imputar') this.accionesMov.imputar(ev.item);
    else if (ev.id === 'saldo') this.accionesMov.saldo(ev.item);
    else if (ev.id === 'anular') this.accionesMov.anular(ev.item, alProcesar);
```

#### 11.1.b

BUSCAR:
```ts
        if (l.concepto === 'prestamo') return { texto: 'Préstamo', clase: 'bg-warning text-dark' };
```

REEMPLAZAR:
```ts
        if (l.concepto === 'prestamo') return { texto: 'Préstamo', clase: 'bg-warning text-dark' };
        if (l.concepto === 'devolucion') return { texto: 'Devolución', clase: 'bg-primary' };
```

### 11.2 — `cuenta-entidad.component.html`

#### 11.2.a

BUSCAR:
```html
      Las compensaciones (en gris) no mueven el saldo: el anticipo ya se descontó al entregarse.
```

REEMPLAZAR:
```html
      Las compensaciones (en gris) no mueven el saldo: el anticipo ya se descontó al entregarse.
      Una devolución o un cierre de saldo (ajuste) van en Liquidado: suben el saldo porque la entidad deja de tener
      saldo a favor o anticipo.
```

## PASO 12 — `src/app/raiz/finanzas-nueva/modales/detalle-movimiento/` (ts y html)

### 12.1 — `detalle-movimiento.component.ts`

#### 12.1.a

BUSCAR:
```ts
import {
  ETIQUETA_CONCEPTO, ETIQUETA_IMPUESTO, ETIQUETA_MEDIO, ETIQUETA_MOTIVO_AJUSTE, ETIQUETA_ORIGEN_IMPUTACION,
  ETIQUETA_TIPO_MOVIMIENTO,
} from 'src/app/shared/utils/movimiento-fin.util';
```

REEMPLAZAR:
```ts
import {
  ETIQUETA_CONCEPTO, ETIQUETA_IMPUESTO, ETIQUETA_MEDIO, ETIQUETA_MOTIVO_AJUSTE, ETIQUETA_ORIGEN_IMPUTACION,
  ETIQUETA_TIPO_MOVIMIENTO, etiquetaConceptoMovimiento, validarAnulable,
} from 'src/app/shared/utils/movimiento-fin.util';
```

#### 12.1.b

BUSCAR:
```ts
  get puedeAnular(): boolean {
    return this.movimiento.estado === 'vigente' && !this.compensado;
  }
```

REEMPLAZAR:
```ts
  /** Concepto legible: motivo del ajuste (con "cierre de saldo"),
   *  "Devolución" o el concepto (F7b). */
  get conceptoTexto(): string {
    return etiquetaConceptoMovimiento(this.movimiento);
  }

  /** Por qué no se puede anular (compensado, saldo cerrado o devuelto), o
   *  null. Solo para vigentes. */
  get motivoNoAnulable(): string | null {
    return this.movimiento.estado === 'vigente' ? validarAnulable(this.movimiento) : null;
  }

  get puedeAnular(): boolean {
    return this.movimiento.estado === 'vigente' && this.motivoNoAnulable === null;
  }
```

#### 12.1.c

BUSCAR:
```ts
  imputar(): void {
    this.activeModal.close('imputar');
  }
```

REEMPLAZAR:
```ts
  imputar(): void {
    this.activeModal.close('imputar');
  }

  /** Cerrar por ajuste o devolver el saldo sin imputar (F7b). */
  saldo(): void {
    this.activeModal.close('saldo');
  }
```

### 12.2 — `detalle-movimiento.component.html`

#### 12.2.a

BUSCAR:
```html
      <div>{{ m.tipo === 'ajuste' ? (m.motivoAjuste ? etiquetaMotivoAjuste[m.motivoAjuste] : '—') : etiquetaConcepto[m.concepto] }}</div>
```

REEMPLAZAR:
```html
      <div>{{ conceptoTexto }}</div>
```

#### 12.2.b

BUSCAR:
```html
          <th>Comprobante</th>
          <th>Período</th>
```

REEMPLAZAR:
```html
          <th>Documento</th>
          <th>Período</th>
```

#### 12.2.c

BUSCAR:
```html
  @if (compensado && m.estado === 'vigente') {
    <div class="alert alert-info py-2 mt-3 mb-0">
      Este movimiento está compensado en una liquidación: para anularlo, primero quitá la compensación o revertí la liquidación.
    </div>
  }
```

REEMPLAZAR:
```html
  @if (motivoNoAnulable) {
    <div class="alert alert-info py-2 mt-3 mb-0">{{ motivoNoAnulable }}</div>
  }
```

#### 12.2.d

BUSCAR:
```html
    <button *appPermiso="'finanzas.editar'" type="button" class="btn btn-success" (click)="imputar()">Imputar saldo</button>
```

REEMPLAZAR:
```html
    <button *appPermiso="'finanzas.editar'" type="button" class="btn btn-success" (click)="imputar()">Imputar saldo</button>
    <button *appPermiso="'finanzas.agregar'" type="button" class="btn btn-outline-info" (click)="saldo()">Cerrar / devolver</button>
```

## PASO 13 — Facturados: deshabilitar "Desvincular" también con ajustes

En `facturacion-facturados.component.ts`, la línea que mostró el grep 5
tiene que tener exactamente esta forma, con una variable `X` (la que use el
archivo):

```ts
      deshabilitada: X => (X.valoresFinancieros?.totalCobrado ?? 0) !== 0,
```

Reemplazala por:

```ts
      deshabilitada: X => (X.valoresFinancieros?.totalCobrado ?? 0) !== 0 || (X.valoresFinancieros?.totalAjustado ?? 0) !== 0,
```

Usá la misma variable `X` en las cuatro apariciones. Si la línea no tiene
esa forma, no la toques y reportala.

## PASO 14 — `src/app/raiz/finanzas-nueva/resumen/finanzas-resumen.component.html`

#### 14a

BUSCAR:
```html
          <div class="tarjeta-label">Ajustes</div>
          <div class="tarjeta-detalle">a clientes {{ f.ajustesCobrar | formatearValor: '$' }}</div>
          <div class="tarjeta-detalle">a choferes / proveedores {{ f.ajustesPagar | formatearValor: '$' }}</div>
```

REEMPLAZAR:
```html
          <div class="tarjeta-label">Ajustes y devoluciones</div>
          <div class="tarjeta-detalle">ajustes a clientes {{ f.ajustesCobrar | formatearValor: '$' }}</div>
          <div class="tarjeta-detalle">ajustes a choferes / proveedores {{ f.ajustesPagar | formatearValor: '$' }}</div>
          <div class="tarjeta-detalle">devuelto a clientes {{ f.devolucionesEntregadas | formatearValor: '$' }}</div>
          <div class="tarjeta-detalle">devuelto por choferes / proveedores {{ f.devolucionesRecibidas | formatearValor: '$' }}</div>
```

## PASO 15 — Verificación

```bash
npm run build:demo
grep -c "export function esSobreSaldo\|export function esDevolucion\|export function movimientoOrigenDe\|export function etiquetaConceptoMovimiento\|export function motivosCierrePara\|export function validarCierreSaldo\|export function validarDevolucion\|export function imputacionSobreMovimiento\|export function armarCierreSaldo\|export function armarDevolucion\|export function tipoDevolucionDe\|export function quitarImputacionesDe\|export function normalizarCierreSaldo\|export function normalizarDevolucion" src/app/shared/utils/movimiento-fin.util.ts   # 14
grep -c "async cerrarSaldo(\|async registrarDevolucion(" src/app/servicios/finanzas-nueva/movimiento-fin.service.ts   # 2
grep -c "SaldoSinImputarComponent" src/app/raiz/finanzas-nueva/finanzas-nueva.module.ts src/app/raiz/finanzas-nueva/acciones-movimiento.service.ts   # 2 y 2
grep -c "esDevolucion" src/app/shared/utils/resumen-finanzas.util.ts src/app/shared/utils/cuenta-entidad.util.ts   # 3 y 2
grep -n "totalAjustado" src/app/raiz/nueva-facturacion -r   # la línea de Facturados
git status --short
```

Esperado:

- El build termina sin errores. Los warnings de presupuesto previos no
  cuentan.
- Los conteos coinciden.
- `git status` muestra:
  - 15 archivos modificados: interfaz, 3 utils (movimiento-fin,
    cuenta-entidad, resumen-finanzas), servicio, módulo, listado, acciones,
    movimientos, cuenta-entidad (ts y html), detalle (ts y html), resumen
    (html) y facturados;
  - la carpeta nueva `modales/saldo-sin-imputar/`;
  - lo tuyo sin trackear, si lo hay.

Reportá la salida.

## Pruebas manuales (demo)

Usá los anticipos de G2 (octubre) y los clientes con saldo a favor
(alerta del Resumen).

1. **Acción:** en Movimientos, "Cerrar / devolver" aparece solo en cobros
   o pagos vigentes con saldo sin imputar, y también como botón en el
   detalle. Con el rol demo no aparece.
2. **Cerrar un anticipo por ajuste (chofer):**
   - "Cerrar / devolver" → Cerrar por ajuste → motivo Otro, importe
     parcial, observación → registrar.
   - Aparece un AJ (concepto "Otro · cierre de saldo"), y el anticipo baja
     su "Sin imputar" en ese importe.
   - En el detalle del anticipo hay una imputación "Cierre de saldo
     (ajuste)" que apunta al AJ.
   - En la cuenta del chofer, la tarjeta de anticipos baja y el Mayor
     muestra el AJ en Liquidado. El saldo final sigue igual a la tarjeta
     "Saldo de la cuenta".
3. **Incobrable:** con motivo Incobrable el importe queda fijo en todo el
   saldo. En un cobro de cliente el motivo no aparece.
4. **Devolución de un chofer:**
   - Devolver → transferencia $ X → se genera un **RC** (cobro, concepto
     "Devolución", azul).
   - El anticipo baja su saldo, y en el Mayor aparece la línea "Devolución
     — contra el saldo de OPG-…", en Liquidado.
5. **Devolución a un cliente** (uno con saldo a favor): se genera un
   **OPG** (pago) al cliente. Su saldo a favor baja; la alerta del Resumen
   se actualiza.
6. **Resumen (octubre):** la tarjeta "Ajustes y devoluciones" muestra
   devuelto a clientes y devuelto por choferes. El neto de caja cambia en
   esos importes: la devolución a un cliente resta y la de un chofer suma.
7. **Bloqueos:**
   - anular el anticipo original da "El saldo de OPG-… se cerró con AJ-…:
     primero anulá ese movimiento". En la lista, Anular queda deshabilitado
     y el detalle lo explica;
   - anular el AJ (o la devolución) devuelve el saldo al anticipo, y
     después el anticipo se puede anular.
8. **Validaciones del modal:**
   - importe mayor al saldo;
   - fecha anterior a la del movimiento (el date picker no la deja; si se
     tipea, error);
   - "Otro" sin observación.
9. **Regresión:**
   - imputar saldo y compensar en una liquidación siguen funcionando sobre
     un anticipo con parte cerrada;
   - revertir una liquidación con compensaciones no toca los espejos.
10. **Facturados:** en un comprobante con un ajuste de F7a, el botón
    Desvincular aparece deshabilitado.

## Commit (lo hace Nico)

```
feat(finanzas): saldos sin imputar — cierre por ajuste y devolución (F7b)

- MovimientoFinService.cerrarSaldo (AJ incobrable/redondeo/otro contra el
  saldo de un cobro o pago) y registrarDevolucion (pago al cliente / cobro
  al chofer o proveedor, un medio): una transacción con imputación al
  original + imputación espejo (origen 'cierre' | 'devolucion').
- anular: devuelve el saldo al original (reversionesDe por tipo de
  documento); el original no se anula mientras tenga espejos.
- TipoDocumentoImputable + 'movimientoFin'; OrigenImputacionFin + 'cierre'
  | 'devolucion'; utils esSobreSaldo, esDevolucion,
  etiquetaConceptoMovimiento, validarCierreSaldo, validarDevolucion,
  armarCierreSaldo, armarDevolucion, quitarImputacionesDe.
- Mayor: cierre y devolución al debe; Resumen: devoluciones en el flujo y
  la evolución; listados y detalle con el concepto; modal
  SaldoSinImputarComponent y acción "Cerrar / devolver".
- Facturados: Desvincular deshabilitado también con ajustes.
```

FIN DE LA INSTRUCCIÓN F7b
````
