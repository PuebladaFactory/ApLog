````
# Instrucción F7a — Finanzas: ajustes sobre comprobantes (incobrable, bonificación, redondeo, otro)

## Contexto

Frente Finanzas. Diseño: `claude/diseno-finanzas.md` §20 (F48–F52).
F7 se parte en F7a (ajustes sobre comprobantes) y F7b (saldos sin
imputar: cierre por ajuste y devolución). Este bloque es F7a.

**Qué ya existe (F1–F4)**, sin cambios:

- `MovimientoFin.tipo 'ajuste'`, con serie AJ: `leerProximoNumeroMovimientoFin`
  ya acepta `'ajuste'`;
- `motivoAjuste`, `valoresFinancieros.totalAjustado`,
  `estadoFinanciero 'incobrable'` y `AccionLog 'AJUSTAR'`;
- `anular()` ya revierte un ajuste: resta `totalAjustado` y recalcula el
  estado (un incobrable anulado vuelve a 'parcial' o 'pendiente');
- el detalle del movimiento, el listado, el Mayor y el Resumen ya muestran
  ajustes.

**Qué agrega este bloque:**

1. **Gesto `MovimientoFinService.registrarAjuste(datos)`.** Es una
   transacción igual a la de `registrar`:
   - lee el numerador AJ y cada InformeLiq: tiene que estar facturado, ser
     de la entidad y tener saldo suficiente;
   - a cada informe le suma el importe a `totalAjustado` y recalcula saldo
     y `estadoFinanciero`. Con motivo incobrable queda en 'incobrable';
   - escribe el ajuste (sin medios; total = Σ imputaciones; nada queda sin
     imputar), el numerador y el log AJUSTAR.
   Reglas:
   - **incobrable:** solo clientes, y SIEMPRE por el saldo completo del
     comprobante (F49). Se revalida contra el saldo releído en la
     transacción;
   - **bonificación:** sin reglas extra;
   - **redondeo:** hasta $ 1.000 por comprobante (F50);
   - **otro:** la observación es obligatoria;
   - 'apertura' no se elige: queda para la migración.
   Solo baja saldo. Uno que suba deuda sería una nota de débito, fuera del
   frente.
2. **Util puro** en `movimiento-fin.util.ts`:
   - `DatosAjusteFin` y `MotivoAjusteElegible`;
   - `UMBRAL_CERRAR_DIFERENCIA` (1000);
   - `motivosAjustePara`, `AYUDA_MOTIVO_AJUSTE`;
   - `normalizarDatosAjuste`, `validarDatosAjuste`, `validarImporteAjuste`;
   - `armarAjuste`.
3. **Modal `RegistrarAjusteComponent`.**
   - Campos: motivo (con ayuda), fecha (≤ hoy) y los comprobantes
     facturados con saldo de la cuenta (check + importe `appMonto`). Con
     incobrable, el importe es el saldo completo y no se edita; con
     redondeo, se recorta a $ 1.000.
   - Observaciones y total.
   - Valida en vivo con el mismo util que el servicio, y confirma con Swal.
4. **Cuenta de la entidad (F48):**
   - botón "Registrar ajuste" junto a "Registrar cobro / pago";
   - en Comprobantes, acciones por fila (permiso `finanzas.agregar`):
     - "Ajustar": en facturados con saldo, abre el modal con la fila
       elegida;
     - "Cerrar diferencia": en facturados con saldo ≤ $ 1.000, registra
       sin modal (con confirmación) un ajuste por redondeo del saldo
       completo;
   - la columna Estado muestra "Facturado · incobrable" en rojo.
5. **Contrato con Facturación.** `desvincularFactura` hoy solo se frena con
   `totalCobrado ≠ 0`. Un facturado con un ajuste también queda atado a
   Finanzas: si se desvinculara, anular el ajuste fallaría, porque exige
   'facturado'. Por eso suma la guarda `totalAjustado ≠ 0` ("anulá los
   ajustes antes de desvincular").
   - `revertirEmitido` no cambia: un emitido no puede tener ajustes.
   - La UI de Facturación no se toca: el servicio frena con el mensaje.

Sin índices ni reglas: NO hay deploy.

Ya verificado:

- tsc estricto (también sin locales sin uso), con stubs;
- prueba rápida del util:
  - validaciones (incobrable de chofer, apertura, fecha futura, sin
    comprobantes, importe ~0, duplicados, redondeo en el tope y por encima,
    otro sin observación);
  - incobrable exacto e inexacto contra el saldo;
  - `armarAjuste`;
  - circuito de valores: cobro parcial 300/1000 → incobrable 700 (saldo 0,
    'incobrable') → anular (saldo 700, 'parcial'); un ajuste mayor al
    saldo se rechaza.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto BUSCAR no aparece, o aparece más de una vez: pará y reportá,
  sin improvisar.
- Archivos con finales de línea LF.
- Build: `npm run build:demo`.
- No toques CLAUDE.md ni CHANGELOG.
- Los tipos nuevos son todos nuevos (no se modifica ninguno existente), así
  que no hay usos previos que revisar.
- La instrucción termina con la línea `FIN DE LA INSTRUCCIÓN F7a`. Si no la
  ves, llegó cortada: leela completa (por partes si hace falta) antes de
  empezar.

## PASO 0 — Verificación (sin cambios)

Corré y reportá la salida:

```bash
grep -rn "registrarAjuste\|DatosAjusteFin\|RegistrarAjusteComponent\|UMBRAL_CERRAR_DIFERENCIA\|motivosAjustePara" src/app
grep -c "totalAjustado" src/app/servicios/informes-liq/informe-liq.service.ts
grep -n "'AJUSTAR'" src/app/interfaces/registro-log.ts src/app/servicios/log-registro/log-registro.service.ts
grep -n "PREFIJO_MOVIMIENTO_FIN\[tipo\]\|tipo: TipoMovimientoFin" src/app/servicios/numerador/numerador.service.ts
grep -n "motivoAjuste" src/app/raiz/finanzas-nueva/modales/detalle-movimiento/detalle-movimiento.component.html
grep -rn "totalCobrado ?? 0) !== 0" src/app --include=*.ts --include=*.html
ls src/app/raiz/finanzas-nueva/modales/registrar-ajuste
```

Esperado:

- El grep 1: nada.
- El grep 2: `0`.
- El grep 3: una línea en cada archivo.
- El grep 4: 2 líneas (el numerador acepta cualquier tipo, también
  'ajuste').
- El grep 5: 1 línea.
- El grep 6:
  - 2 en `informe-liq.service.ts` (revertir y desvincular);
  - 1 en `facturacion-emitidos.component.ts` (revertir; no se toca).
  Si aparece en otro componente, reportalo y seguí, sin tocarlo.
- El `ls`: no existe.

Si algo no coincide (salvo lo indicado), pará y reportá.

## PASO 1 — `src/app/shared/utils/movimiento-fin.util.ts`

#### 1a

BUSCAR:
```ts
import {
  AcumuladoFinanciero, diasEntre, esCero, redondear2, totalMedios, TOLERANCIA_IMPORTE,
} from 'src/app/shared/utils/finanzas.util';
```

REEMPLAZAR:
```ts
import {
  AcumuladoFinanciero, diasEntre, esCero, importesIguales, redondear2, totalMedios, TOLERANCIA_IMPORTE,
} from 'src/app/shared/utils/finanzas.util';
```

#### 1b

BUSCAR:
```ts
    sinImputar: esCero(sinImputar) ? 0 : sinImputar,
  };
}
```

REEMPLAZAR:
```ts
    sinImputar: esCero(sinImputar) ? 0 : sinImputar,
  };
}

// ---------------------------------------------------------------------------
// Ajustes sobre comprobantes (F7a)
// ---------------------------------------------------------------------------

/** Motivos que se eligen en la UI ('apertura' queda para la migración). */
export type MotivoAjusteElegible = Exclude<MotivoAjusteFin, 'apertura'>;

/** Saldo máximo para "Cerrar diferencia" y tope por comprobante de un
 *  ajuste por redondeo (F50). */
export const UMBRAL_CERRAR_DIFERENCIA = 1000;

/** Datos de un ajuste a registrar: baja el saldo de comprobantes facturados
 *  de la entidad sin mover dinero. */
export interface DatosAjusteFin {
  entidad: EntidadMovimientoFin;
  fecha: string;                         // 'YYYY-MM-DD', ≤ hoy
  motivo: MotivoAjusteElegible;
  imputaciones: ImputacionSolicitada[];  // ≥ 1
  observaciones: string;
}

/** Motivos permitidos por tipo de entidad: incobrable solo para clientes
 *  (lo que nos deben); bonificación, redondeo y otro para todos. */
export function motivosAjustePara(tipoEntidad: TipoEntidadFin): MotivoAjusteElegible[] {
  return tipoEntidad === 'cliente'
    ? ['incobrable', 'bonificacion', 'redondeo', 'otro']
    : ['bonificacion', 'redondeo', 'otro'];
}

/** Ayuda de cada motivo para la UI. */
export const AYUDA_MOTIVO_AJUSTE: Readonly<Record<MotivoAjusteElegible, string>> = {
  incobrable: 'La deuda no se va a cobrar. Cancela el saldo COMPLETO del comprobante y lo marca incobrable.',
  bonificacion: 'Descuento acordado después de facturar (normalmente lleva nota de crédito: la app registra la gestión).',
  redondeo: `Diferencias chicas: hasta $ ${UMBRAL_CERRAR_DIFERENCIA} por comprobante.`,
  otro: 'Cualquier otra baja de saldo. La observación es obligatoria.',
};

export function normalizarDatosAjuste(d: DatosAjusteFin): DatosAjusteFin {
  return {
    ...d,
    imputaciones: normalizarSolicitudes(d.imputaciones),
    observaciones: (d.observaciones ?? '').trim(),
  };
}

/** Validación previa, sin lecturas (el saldo de cada comprobante y la regla
 *  de incobrable por el saldo completo se validan en la transacción). Recibe
 *  datos YA normalizados. Devuelve el mensaje de error o null. */
export function validarDatosAjuste(d: DatosAjusteFin, hoy: string): string | null {
  if (!d.entidad?.id) return 'Falta la entidad.';
  if (!motivosAjustePara(d.entidad.tipo).includes(d.motivo)) {
    return d.motivo === 'incobrable'
      ? 'Incobrable es solo para clientes (lo que nos deben).'
      : 'Motivo de ajuste inválido.';
  }
  if (!FORMATO_FECHA.test(d.fecha)) return 'Fecha inválida.';
  if (d.fecha > hoy) return 'La fecha no puede ser futura.';
  if (d.imputaciones.length === 0) return 'Elegí al menos un comprobante a ajustar.';
  const ids = d.imputaciones.map(i => i.idInfLiq);
  if (new Set(ids).size !== ids.length) return 'Un comprobante aparece más de una vez.';
  if (d.imputaciones.some(i => !(i.importe > 0))) return 'Hay un importe a ajustar inválido.';
  if (d.motivo === 'redondeo' && d.imputaciones.some(i => i.importe - UMBRAL_CERRAR_DIFERENCIA > TOLERANCIA_IMPORTE)) {
    return `Un ajuste por redondeo no puede superar $ ${UMBRAL_CERRAR_DIFERENCIA} por comprobante.`;
  }
  if (d.motivo === 'otro' && !d.observaciones) return 'Con motivo "Otro" la observación es obligatoria.';
  return null;
}

/** Regla de incobrable sobre el saldo RELEÍDO en la transacción (F49): el
 *  importe tiene que ser el saldo completo. Devuelve el mensaje o null. */
export function validarImporteAjuste(
  motivo: MotivoAjusteElegible,
  saldo: number,
  importe: number,
  numeroDocumento: string,
): string | null {
  if (motivo === 'incobrable' && !importesIguales(importe, saldo)) {
    return `Incobrable va por el saldo completo: el comprobante ${numeroDocumento} tiene saldo ` +
      `$ ${saldo.toFixed(2)} y se pidió $ ${importe.toFixed(2)}.`;
  }
  return null;
}

/** Cuerpo del ajuste a persistir (sin idMovimiento: patrón ConId). Sin
 *  medios; total = Σ imputaciones; nada queda sin imputar. */
export function armarAjuste(p: {
  datos: DatosAjusteFin;
  numero: string;
  fechaRegistro: string;
  usuario: string;
  imputaciones: ImputacionFin[];
}): Omit<MovimientoFin, 'idMovimiento'> {
  const total = redondear2(p.imputaciones.reduce((acc, i) => acc + i.importe, 0));
  return {
    tipo: 'ajuste',
    numero: p.numero,
    fecha: p.datos.fecha,
    fechaRegistro: p.fechaRegistro,
    entidad: { ...p.datos.entidad },
    concepto: 'normal',
    motivoAjuste: p.datos.motivo,
    medios: [],
    total,
    imputaciones: p.imputaciones,
    idsDocumentos: [...new Set(p.imputaciones.map(i => i.documento.id))],
    totalImputado: total,
    sinImputar: 0,
    observaciones: p.datos.observaciones,
    estado: 'vigente',
    anulacion: null,
    usuario: p.usuario,
  };
}
```

## PASO 2 — `src/app/servicios/finanzas-nueva/movimiento-fin.service.ts`

#### 2a

BUSCAR:
```ts
import {
  DatosMovimientoFin, ETIQUETA_TIPO_MOVIMIENTO, ImputacionSolicitada, acumularImputaciones, acumuladoDeMovimiento,
  armarImputacion, armarMovimiento, normalizarDatosMovimiento, normalizarSolicitudes, reversionesDe, validarAnulable,
  validarDatosMovimiento, validarDocumentoImputable, validarImputacionSaldo,
} from 'src/app/shared/utils/movimiento-fin.util';
```

REEMPLAZAR:
```ts
import {
  DatosAjusteFin, DatosMovimientoFin, ETIQUETA_MOTIVO_AJUSTE, ETIQUETA_TIPO_MOVIMIENTO, ImputacionSolicitada,
  acumularImputaciones, acumuladoDeMovimiento, armarAjuste, armarImputacion, armarMovimiento, normalizarDatosAjuste,
  normalizarDatosMovimiento, normalizarSolicitudes, reversionesDe, validarAnulable, validarDatosAjuste,
  validarDatosMovimiento, validarDocumentoImputable, validarImporteAjuste, validarImputacionSaldo,
} from 'src/app/shared/utils/movimiento-fin.util';
```

#### 2b

BUSCAR:
```ts
/** Dueño de los movimientos de Finanzas (colección `movimientosFin`):
 *  cobros (RC), pagos (OPG) y, en bloques siguientes, ajustes (AJ),
 *  anulación e imputación de saldos.
```

REEMPLAZAR:
```ts
/** Dueño de los movimientos de Finanzas (colección `movimientosFin`):
 *  cobros (RC), pagos (OPG), ajustes (AJ, F7a), anulación e imputación de
 *  saldos.
```

#### 2c

BUSCAR:
```ts
  /** Anula un movimiento ENTERO (F10: no se edita; motivo obligatorio).
```

REEMPLAZAR:
```ts
  /** Registra un AJUSTE (F7a): baja el saldo de comprobantes facturados de
   *  la entidad sin mover dinero (incobrable, bonificación, redondeo, otro).
   *  Transacción: lee el numerador AJ y cada InformeLiq (facturado, de la
   *  entidad, con saldo suficiente; incobrable = saldo completo); a cada
   *  informe le suma el importe a totalAjustado y recalcula saldo y
   *  estadoFinanciero ('incobrable' si el motivo lo es); escribe el ajuste
   *  (sin medios, nada sin imputar), el numerador y un log AJUSTAR. Se
   *  revierte con anular(), como cualquier movimiento. */
  async registrarAjuste(d: DatosAjusteFin): Promise<Resultado<ResultadoMovimientoFin>> {
    const datos = normalizarDatosAjuste(d);
    const error = validarDatosAjuste(datos, toISODateString(new Date()));
    if (error) return { exito: false, mensaje: error };

    // Afuera del callback: puede reintentarse y tiene que ser puro.
    const idMovimiento = this.db.generarId(this.COLECCION);
    const fechaRegistro = new Date().toISOString();
    const usuario = this.usuarioSesion.getUsuarioActual()?.email ?? 'Desconocido';
    const motivo = ETIQUETA_MOTIVO_AJUSTE[datos.motivo];

    try {
      const r = await this.db.commitEnTransaccion<{ numero: string; total: number }>(async (tx) => {
        const escrituras: EscrituraBatch[] = [];

        const n = await this.numerador.leerProximoNumeroMovimientoFin(tx, 'ajuste');
        const leidos = await Promise.all(datos.imputaciones.map(async imp => ({
          imp,
          liq: await this.db.leerEnTransaccion<InformeLiqNuevo>(tx, this.COL_LIQ, imp.idInfLiq),
        })));
        // — fin de lecturas —

        escrituras.push(n.escritura);
        const imputaciones: ImputacionFin[] = [];
        for (const { imp, liq } of leidos) {
          if (!liq) throw new Error(`No existe el informe de liquidación ${imp.idInfLiq}.`);
          validarDocumentoImputable(liq, imp.idInfLiq, datos.entidad);
          const vfAntes = normalizarValoresFinancieros(liq.valoresFinancieros, liq.valores.total);
          const errorImporte = validarImporteAjuste(datos.motivo, vfAntes.saldo, imp.importe, liq.numeroInterno ?? imp.idInfLiq);
          if (errorImporte) throw new Error(errorImporte);
          const vf = aplicarImporte(vfAntes, 'totalAjustado', imp.importe);   // tira Error si supera el saldo
          imputaciones.push(armarImputacion(liq, imp.idInfLiq, vfAntes, imp.importe, datos.fecha, 'directa'));
          this.informeLiqServ.agregarEscrituraInformeLiqParcial(escrituras, imp.idInfLiq, {
            valoresFinancieros: vf,
            estadoFinanciero: datos.motivo === 'incobrable' ? 'incobrable' : estadoFinancieroDe(vf, liq.estadoFinanciero),
          });
        }

        const ajuste = armarAjuste({ datos, numero: n.numero, fechaRegistro, usuario, imputaciones });
        escrituras.push({ coleccion: this.COLECCION, id: idMovimiento, modo: 'crear', data: ajuste });

        await this.logRegistro.agregarAlBatch(
          escrituras, 'AJUSTAR', this.COLECCION, idMovimiento,
          `Ajuste (${motivo.toLowerCase()}) ${n.numero} — ${datos.entidad.tipo} ${datos.entidad.razonSocial} — ` +
          `$ ${ajuste.total.toFixed(2)} — ${imputaciones.map(i => i.numeroDocumento).join(', ')}` +
          (datos.observaciones ? ` — ${datos.observaciones}` : ''),
          null,
        );

        return { escrituras, resultado: { numero: n.numero, total: ajuste.total } };
      });

      return {
        exito: true,
        mensaje: `Ajuste ${r.numero} (${motivo.toLowerCase()}) registrado por $ ${r.total.toFixed(2)}.`,
        objeto: { idMovimiento, numero: r.numero },
      };
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'AJUSTAR', this.COLECCION, idMovimiento, `Error al registrar el ajuste: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `No se pudo registrar el ajuste: ${e?.message ?? e}` };
    }
  }

  /** Anula un movimiento ENTERO (F10: no se edita; motivo obligatorio).
```

## PASO 3 — `src/app/servicios/informes-liq/informe-liq.service.ts`

#### 3a

BUSCAR:
```ts
        const liq = await this.leerFacturado(tx, idInfLiq);
        if ((liq.valoresFinancieros?.totalCobrado ?? 0) !== 0) {
          throw new Error(
            `La liquidación ${liq.numeroInterno} tiene importes cobrados/pagados imputados: no se puede desvincular la factura.`,
          );
        }
```

REEMPLAZAR:
```ts
        const liq = await this.leerFacturado(tx, idInfLiq);
        if ((liq.valoresFinancieros?.totalCobrado ?? 0) !== 0) {
          throw new Error(
            `La liquidación ${liq.numeroInterno} tiene importes cobrados/pagados imputados: no se puede desvincular la factura.`,
          );
        }
        // F7a: un ajuste (incobrable, bonificación…) también ata el informe a
        // Finanzas: primero se anula el ajuste.
        if ((liq.valoresFinancieros?.totalAjustado ?? 0) !== 0) {
          throw new Error(
            `La liquidación ${liq.numeroInterno} tiene ajustes de Finanzas imputados: anulalos antes de desvincular la factura.`,
          );
        }
```

## PASO 4 — NUEVO `src/app/raiz/finanzas-nueva/modales/registrar-ajuste/`

### 4a — `registrar-ajuste.component.ts`

```ts
import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { EntidadMovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { MovimientoFinService } from 'src/app/servicios/finanzas-nueva/movimiento-fin.service';
import { InformeLiqFactoryService } from 'src/app/servicios/informes-liq/informe-liq-factory.service';
import { fechaBaseAntiguedad } from 'src/app/shared/utils/cuentas-finanzas.util';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import {
  TOLERANCIA_IMPORTE, diasEntre, normalizarValoresFinancieros, redondear2,
} from 'src/app/shared/utils/finanzas.util';
import {
  AYUDA_MOTIVO_AJUSTE, DatosAjusteFin, ETIQUETA_MOTIVO_AJUSTE, MotivoAjusteElegible, UMBRAL_CERRAR_DIFERENCIA,
  motivosAjustePara, normalizarDatosAjuste, validarDatosAjuste,
} from 'src/app/shared/utils/movimiento-fin.util';

/** Comprobante abierto de la entidad (InformeLiq facturado con saldo). */
interface FilaAjuste {
  liq: ConId<InformeLiqNuevo>;
  periodo: string;
  fechaFactura: string;     // legible
  dias: number | null;
  total: number;
  saldo: number;
  importe: number | null;   // a ajustar (appMonto: null si el input queda vacío)
}

/** Finanzas — registrar un AJUSTE (F7a) sobre comprobantes facturados de
 *  la entidad: incobrable (solo clientes, por el saldo completo),
 *  bonificación, redondeo (hasta UMBRAL_CERRAR_DIFERENCIA por comprobante) u
 *  otro (observación obligatoria). Recibe los informes de la cuenta (ya
 *  leídos en vivo por la página) y, opcionalmente, un comprobante y un
 *  motivo iniciales ("Ajustar" desde una fila). Valida en vivo con el mismo
 *  util que el servicio y llama a MovimientoFinService.registrarAjuste,
 *  que revalida todo en su transacción. Cierra con true si registró. */
@Component({
  selector: 'app-registrar-ajuste',
  standalone: false,
  templateUrl: './registrar-ajuste.component.html',
  styleUrl: './registrar-ajuste.component.scss',
})
export class RegistrarAjusteComponent implements OnInit {

  @Input() entidad!: EntidadMovimientoFin;
  @Input() informes: ConId<InformeLiqNuevo>[] = [];
  @Input() idInicial: string | null = null;
  @Input() motivoInicial: MotivoAjusteElegible | null = null;

  readonly hoy = toISODateString(new Date());
  readonly etiquetaMotivo = ETIQUETA_MOTIVO_AJUSTE;
  readonly ayudaMotivo = AYUDA_MOTIVO_AJUSTE;
  readonly umbralRedondeo = UMBRAL_CERRAR_DIFERENCIA;

  motivos: MotivoAjusteElegible[] = [];
  motivo: MotivoAjusteElegible = 'bonificacion';
  fecha = this.hoy;
  observaciones = '';
  filas: FilaAjuste[] = [];
  guardando = false;
  error = '';

  constructor(
    public activeModal: NgbActiveModal,
    private movimientos: MovimientoFinService,
    private factory: InformeLiqFactoryService,
  ) {}

  ngOnInit(): void {
    this.motivos = motivosAjustePara(this.entidad.tipo);
    // Por defecto bonificación: incobrable se elige a propósito.
    this.motivo = this.motivoInicial && this.motivos.includes(this.motivoInicial) ? this.motivoInicial : 'bonificacion';
    this.filas = this.informes
      .filter(l => l.estado === 'facturado' && l.tipo === this.entidad.tipo && l.entidad.id === this.entidad.id)
      .map(l => this.armarFila(l))
      .filter(f => f.saldo > 0)
      .sort((a, b) => fechaBaseAntiguedad(a.liq).localeCompare(fechaBaseAntiguedad(b.liq)));
    const inicial = this.filas.find(f => f.liq.idInfLiq === this.idInicial);
    if (inicial) this.alternarFila(inicial, true);
  }

  // ---------------------------------------------------------------------------
  // Derivados
  // ---------------------------------------------------------------------------

  get esIncobrable(): boolean {
    return this.motivo === 'incobrable';
  }

  get totalAjuste(): number {
    return redondear2(this.filas.reduce((acc, f) => acc + (Number(f.importe) || 0), 0));
  }

  get cantidadElegidos(): number {
    return this.filas.filter(f => (Number(f.importe) || 0) > 0).length;
  }

  /** Error de validación en vivo (saldo por fila + mismo util que el servicio). */
  get errorValidacion(): string | null {
    const excedida = this.filas.find(f => (Number(f.importe) || 0) - f.saldo > TOLERANCIA_IMPORTE);
    if (excedida) return `El importe del comprobante ${excedida.liq.numeroInterno} supera su saldo.`;
    return validarDatosAjuste(normalizarDatosAjuste(this.datos()), this.hoy);
  }

  get puedeConfirmar(): boolean {
    return !this.guardando && this.errorValidacion === null;
  }

  // ---------------------------------------------------------------------------
  // Gestos
  // ---------------------------------------------------------------------------

  /** Al cambiar el motivo: incobrable fija cada fila elegida en su saldo
   *  completo; redondeo recorta al umbral. */
  onMotivo(motivo: MotivoAjusteElegible): void {
    this.motivo = motivo;
    for (const f of this.filas) {
      if ((Number(f.importe) || 0) > 0) f.importe = this.importeAlMarcar(f);
    }
  }

  /** Check de la fila: marcado = el saldo (recortado al umbral en
   *  redondeo); desmarcado = 0. */
  alternarFila(fila: FilaAjuste, marcada: boolean): void {
    fila.importe = marcada ? this.importeAlMarcar(fila) : 0;
  }

  async confirmar(): Promise<void> {
    if (!this.puedeConfirmar) return;
    this.error = '';
    const r = await Swal.fire({
      title: `¿Registrar ajuste (${this.etiquetaMotivo[this.motivo].toLowerCase()})?`,
      html:
        `<p>${this.entidad.razonSocial} — <b>$ ${this.totalAjuste.toFixed(2)}</b> en ${this.cantidadElegidos} comprobante(s).</p>` +
        (this.esIncobrable ? '<p>Los comprobantes quedan saldados y marcados <b>incobrables</b>.</p>' : '') +
        '<p class="small">Se revierte anulando el ajuste.</p>',
      icon: this.esIncobrable ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: 'Registrar ajuste',
      cancelButtonText: 'Volver',
    });
    if (!r.isConfirmed) return;

    this.guardando = true;
    try {
      const res = await this.movimientos.registrarAjuste(this.datos());
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

  private importeAlMarcar(f: FilaAjuste): number {
    if (this.motivo === 'redondeo') return redondear2(Math.min(f.saldo, UMBRAL_CERRAR_DIFERENCIA));
    return f.saldo;
  }

  private datos(): DatosAjusteFin {
    return {
      entidad: this.entidad,
      fecha: this.fecha,
      motivo: this.motivo,
      imputaciones: this.filas
        .filter(f => (Number(f.importe) || 0) > 0)
        .map(f => ({ idInfLiq: f.liq.idInfLiq, importe: Number(f.importe) })),
      observaciones: this.observaciones,
    };
  }

  private armarFila(liq: ConId<InformeLiqNuevo>): FilaAjuste {
    const vf = normalizarValoresFinancieros(liq.valoresFinancieros, liq.valores.total);
    const base = fechaBaseAntiguedad(liq);
    let dias: number | null = null;
    try { dias = diasEntre(base, this.hoy); } catch { dias = null; }
    return {
      liq,
      periodo: this.factory.textoPeriodo(liq.periodo),
      fechaFactura: fechaComprobanteLegible(base),
      dias,
      total: vf.total,
      saldo: vf.saldo,
      importe: 0,
    };
  }
}
```

### 4b — `registrar-ajuste.component.html`

```html
<div class="modal-header">
  <div>
    <h4 class="modal-title">Registrar ajuste</h4>
    <div class="text-muted">
      <span class="text-capitalize">{{ entidad.tipo }}</span> {{ entidad.razonSocial }} — CUIT {{ entidad.cuit }}
    </div>
  </div>
  <button type="button" class="btn-close" [disabled]="guardando" (click)="cancelar()"></button>
</div>

<div class="modal-body">
  <div class="row g-3 mb-3">
    <div class="col-md-4">
      <label class="dato-label" for="motivoAjuste">Motivo</label>
      <select id="motivoAjuste" class="form-select" [ngModel]="motivo" (ngModelChange)="onMotivo($event)" [disabled]="guardando">
        @for (m of motivos; track m) {
          <option [ngValue]="m">{{ etiquetaMotivo[m] }}</option>
        }
      </select>
    </div>
    <div class="col-md-3">
      <label class="dato-label" for="fechaAjuste">Fecha</label>
      <input id="fechaAjuste" type="date" class="form-control" [(ngModel)]="fecha" [max]="hoy" [disabled]="guardando" />
    </div>
    <div class="col-md-5 d-flex align-items-end">
      <div class="alert py-2 mb-0 w-100" [ngClass]="esIncobrable ? 'alert-warning' : 'alert-light border'">
        {{ ayudaMotivo[motivo] }}
      </div>
    </div>
  </div>

  <h6 class="mb-1">Comprobantes facturados con saldo</h6>
  @if (filas.length === 0) {
    <div class="alert alert-info py-2">
      {{ entidad.razonSocial }} no tiene informes facturados con saldo: no hay nada para ajustar.
    </div>
  } @else {
    <table class="table table-sm table-striped align-middle">
      <thead>
        <tr>
          <th style="width: 2rem;"></th>
          <th>Informe</th>
          <th>Período</th>
          <th>Factura</th>
          <th class="text-center">Días</th>
          <th class="text-end">Total</th>
          <th class="text-end">Saldo</th>
          <th class="text-end" style="width: 11rem;">A ajustar</th>
        </tr>
      </thead>
      <tbody>
        @for (f of filas; track f.liq.idInfLiq) {
          <tr>
            <td>
              <input type="checkbox" class="form-check-input" [checked]="(f.importe ?? 0) > 0"
                (change)="alternarFila(f, $any($event.target).checked)" [disabled]="guardando" />
            </td>
            <td>{{ f.liq.numeroInterno }}</td>
            <td>{{ f.periodo }}</td>
            <td>{{ f.fechaFactura }}</td>
            <td class="text-center col-importe">{{ f.dias ?? '—' }}</td>
            <td class="text-end col-importe">{{ f.total | formatearValor: '$' }}</td>
            <td class="text-end col-importe">{{ f.saldo | formatearValor: '$' }}</td>
            <td>
              <input inputmode="decimal" class="form-control form-control-sm text-end" appMonto
                [class.is-invalid]="(f.importe ?? 0) - f.saldo > 0.005"
                [(ngModel)]="f.importe" [disabled]="guardando || esIncobrable" />
            </td>
          </tr>
        }
      </tbody>
      <tfoot>
        <tr>
          <td colspan="7" class="text-end fw-bold">Total del ajuste ({{ cantidadElegidos }})</td>
          <td class="text-end fw-bold col-importe">{{ totalAjuste | formatearValor: '$' }}</td>
        </tr>
      </tfoot>
    </table>
    @if (esIncobrable) {
      <div class="text-muted small mb-2">Incobrable: el importe es el saldo completo de cada comprobante (marcá o desmarcá la fila).</div>
    }
  }

  <label class="dato-label" for="obsAjuste">Observaciones {{ motivo === 'otro' ? '(obligatoria)' : '' }}</label>
  <textarea id="obsAjuste" class="form-control" rows="2" [(ngModel)]="observaciones" [disabled]="guardando"
    placeholder="Por qué se ajusta (acuerdo, gestión de cobro, nota de crédito, etc.)"></textarea>

  @if (errorValidacion && filas.length > 0) {
    <div class="text-danger small mt-2">{{ errorValidacion }}</div>
  }
  @if (error) {
    <div class="alert alert-danger mt-2 mb-0">{{ error }}</div>
  }
</div>

<div class="modal-footer">
  <button type="button" class="btn btn-primary" [disabled]="!puedeConfirmar" (click)="confirmar()">Registrar ajuste</button>
  <button type="button" class="btn btn-outline-secondary" [disabled]="guardando" (click)="cancelar()">Cancelar</button>
</div>

@if (guardando) {
  <app-spinner></app-spinner>
}
```

### 4c — `registrar-ajuste.component.scss`

```scss
.dato-label {
  font-size: 0.85rem;
  color: #6c757d;
}

.col-importe {
  font-variant-numeric: tabular-nums;
}

th,
td,
input,
select,
textarea {
  font-size: 1.2rem;
}
```

## PASO 5 — `src/app/raiz/finanzas-nueva/finanzas-nueva.module.ts`

#### 5a

BUSCAR:
```ts
import { FinanzasResumenComponent } from './resumen/finanzas-resumen.component';
```

REEMPLAZAR:
```ts
import { FinanzasResumenComponent } from './resumen/finanzas-resumen.component';
import { RegistrarAjusteComponent } from './modales/registrar-ajuste/registrar-ajuste.component';
```

#### 5b

BUSCAR:
```ts
    FinanzasResumenComponent,
  ],
```

REEMPLAZAR:
```ts
    FinanzasResumenComponent,
    RegistrarAjusteComponent,
  ],
```

## PASO 6 — `src/app/raiz/finanzas-nueva/cuenta-entidad/cuenta-entidad.component.ts`

#### 6a

BUSCAR:
```ts
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, switchMap, takeUntil } from 'rxjs';
```

REEMPLAZAR:
```ts
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, switchMap, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
```

#### 6b

BUSCAR:
```ts
import { TipoEntidadFin } from 'src/app/interfaces/movimiento-fin';
```

REEMPLAZAR:
```ts
import { EntidadMovimientoFin, TipoEntidadFin } from 'src/app/interfaces/movimiento-fin';
```

#### 6c

BUSCAR:
```ts
import { FinanzasConsultaService } from 'src/app/servicios/finanzas-nueva/finanzas-consulta.service';
```

REEMPLAZAR:
```ts
import { FinanzasConsultaService } from 'src/app/servicios/finanzas-nueva/finanzas-consulta.service';
import { MovimientoFinService } from 'src/app/servicios/finanzas-nueva/movimiento-fin.service';
```

#### 6d

BUSCAR:
```ts
import { TRAMOS_ANTIGUEDAD } from 'src/app/shared/utils/finanzas.util';
```

REEMPLAZAR:
```ts
import { TRAMOS_ANTIGUEDAD } from 'src/app/shared/utils/finanzas.util';
import { MotivoAjusteElegible, UMBRAL_CERRAR_DIFERENCIA } from 'src/app/shared/utils/movimiento-fin.util';
```

#### 6e

BUSCAR:
```ts
import { HistoriaComprobanteComponent } from '../modales/historia-comprobante/historia-comprobante.component';
```

REEMPLAZAR:
```ts
import { HistoriaComprobanteComponent } from '../modales/historia-comprobante/historia-comprobante.component';
import { RegistrarAjusteComponent } from '../modales/registrar-ajuste/registrar-ajuste.component';
```

#### 6f

BUSCAR:
```ts
    { id: 'historia', label: 'Historia', clase: 'btn-outline-secondary' },
  ];
```

REEMPLAZAR:
```ts
    { id: 'historia', label: 'Historia', clase: 'btn-outline-secondary' },
    // F7a: ajustes sobre facturados con saldo.
    {
      id: 'ajustar', label: 'Ajustar', clase: 'btn-outline-info', permiso: 'finanzas.agregar',
      visible: f => f.estado === 'facturado' && f.saldo > 0,
    },
    {
      id: 'cerrar', label: 'Cerrar diferencia', clase: 'btn-outline-secondary', permiso: 'finanzas.agregar',
      visible: f => f.estado === 'facturado' && f.saldo > 0 && f.saldo <= UMBRAL_CERRAR_DIFERENCIA,
    },
  ];
```

#### 6g

BUSCAR:
```ts
    private accionesMov: AccionesMovimientoService,
  ) {}
```

REEMPLAZAR:
```ts
    private accionesMov: AccionesMovimientoService,
    private movimientoFin: MovimientoFinService,
  ) {}
```

#### 6h

BUSCAR:
```ts
  onAccionComprobante(ev: EventoAccionListado<FilaComprobante>): void {
    if (ev.id === 'historia') {
      this.abrirHistoria(ev.item.liq);
      return;
    }
```

REEMPLAZAR:
```ts
  /** Registrar ajuste (F7a): modal con los comprobantes facturados con
   *  saldo de la cuenta. Desde una fila ("Ajustar") llega preseleccionado. */
  registrarAjuste(idInicial: string | null = null, motivoInicial: MotivoAjusteElegible | null = null): void {
    const entidad = this.entidadMovimiento();
    if (!entidad) return;
    const modalRef = this.modalService.open(RegistrarAjusteComponent, {
      size: 'xl', centered: true, scrollable: true, backdrop: 'static', keyboard: false,
    });
    modalRef.componentInstance.entidad = entidad;
    modalRef.componentInstance.informes = this.informes;
    modalRef.componentInstance.idInicial = idInicial;
    modalRef.componentInstance.motivoInicial = motivoInicial;
    modalRef.result.catch(() => {});
  }

  /** "Cerrar diferencia" (F50): ajuste por redondeo del saldo completo de un
   *  comprobante con saldo ≤ UMBRAL_CERRAR_DIFERENCIA, sin abrir el modal. */
  async cerrarDiferencia(fila: FilaComprobante): Promise<void> {
    const entidad = this.entidadMovimiento();
    if (!entidad) return;
    const nro = fila.liq.numeroInterno ?? fila.liq.idInfLiq;
    const r = await Swal.fire({
      title: `¿Cerrar la diferencia de ${nro}?`,
      html: `<p>Se registra un ajuste por <b>redondeo</b> de <b>$ ${fila.saldo.toFixed(2)}</b> y el comprobante queda saldado.</p>` +
        '<p class="small">Se revierte anulando el ajuste.</p>',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Cerrar diferencia',
      cancelButtonText: 'Volver',
    });
    if (!r.isConfirmed) return;
    this.procesando = true;
    try {
      const res = await this.movimientoFin.registrarAjuste({
        entidad,
        fecha: this.hoy,
        motivo: 'redondeo',
        imputaciones: [{ idInfLiq: fila.liq.idInfLiq, importe: fila.saldo }],
        observaciones: `Cierre de diferencia de ${nro}`,
      });
      await Swal.fire({ icon: res.exito ? 'success' : 'error', text: res.mensaje, timer: res.exito ? 2500 : undefined });
    } finally {
      this.procesando = false;
    }
  }

  onAccionComprobante(ev: EventoAccionListado<FilaComprobante>): void {
    if (ev.id === 'historia') {
      this.abrirHistoria(ev.item.liq);
      return;
    }
    if (ev.id === 'ajustar') {
      this.registrarAjuste(ev.item.liq.idInfLiq);
      return;
    }
    if (ev.id === 'cerrar') {
      void this.cerrarDiferencia(ev.item);
      return;
    }
```

#### 6i

BUSCAR:
```ts
  private aplicarFiltroComprobantes(): void {
```

REEMPLAZAR:
```ts
  /** La entidad como la guarda un movimiento (snapshot). null si la cuenta
   *  no está lista o la entidad no existe. */
  private entidadMovimiento(): EntidadMovimientoFin | null {
    if (!this.nombre || this.noExiste || this.cargando) return null;
    return { tipo: this.tipo, id: this.idEntidad, razonSocial: this.nombre, cuit: this.cuit ?? 0 };
  }

  private aplicarFiltroComprobantes(): void {
```

#### 6j

BUSCAR:
```ts
      { key: 'estado', label: 'Estado', valor: f => ETIQUETA_ESTADO[f.estado], orden: f => f.estado, clase: apagado },
```

REEMPLAZAR:
```ts
      {
        key: 'estado', label: 'Estado',
        valor: f => (f.estadoFinanciero === 'incobrable' ? `${ETIQUETA_ESTADO[f.estado]} · incobrable` : ETIQUETA_ESTADO[f.estado]),
        orden: f => f.estado,
        clase: f => (f.estadoFinanciero === 'incobrable' ? 'text-danger fw-semibold' : apagado(f)),
      },
```

## PASO 7 — `src/app/raiz/finanzas-nueva/cuenta-entidad/cuenta-entidad.component.html`

#### 7a

BUSCAR:
```html
    (click)="registrar()"
  >{{ esCliente ? 'Registrar cobro' : 'Registrar pago' }}</button>
```

REEMPLAZAR:
```html
    (click)="registrar()"
  >{{ esCliente ? 'Registrar cobro' : 'Registrar pago' }}</button>
  <button
    *appPermiso="'finanzas.agregar'"
    type="button"
    class="btn btn-outline-info"
    [disabled]="!nombre || cargando || noExiste || !resumen?.cantidadFacturados"
    (click)="registrarAjuste()"
  >Registrar ajuste</button>
```

## PASO 8 — Verificación

```bash
npm run build:demo
grep -c "export function motivosAjustePara\|export function normalizarDatosAjuste\|export function validarDatosAjuste\|export function validarImporteAjuste\|export function armarAjuste" src/app/shared/utils/movimiento-fin.util.ts   # 5
grep -c "async registrarAjuste(" src/app/servicios/finanzas-nueva/movimiento-fin.service.ts   # 1
grep -c "totalAjustado" src/app/servicios/informes-liq/informe-liq.service.ts   # 1
grep -c "RegistrarAjusteComponent" src/app/raiz/finanzas-nueva/finanzas-nueva.module.ts src/app/raiz/finanzas-nueva/cuenta-entidad/cuenta-entidad.component.ts   # 2 y 2
grep -n "'ajustar'\|'cerrar'" src/app/raiz/finanzas-nueva/cuenta-entidad/cuenta-entidad.component.ts   # 4 líneas
git status --short
```

Esperado:

- El build termina sin errores. Los warnings de presupuesto previos no
  cuentan.
- Los conteos coinciden.
- `git status` muestra:
  - 6 archivos modificados: util, servicio de movimientos,
    `informe-liq.service.ts`, módulo y `cuenta-entidad` (ts y html);
  - la carpeta nueva `modales/registrar-ajuste/`;
  - lo tuyo sin trackear, si lo hay.

Reportá la salida.

## Pruebas manuales (demo)

1. **Botón y acciones:**
   - en la cuenta de un cliente con facturas abiertas aparece "Registrar
     ajuste";
   - en Comprobantes, "Ajustar" aparece solo en facturados con saldo;
   - "Cerrar diferencia" aparece solo si el saldo es ≤ $ 1.000;
   - con el rol demo no aparecen.
2. **Bonificación parcial:**
   - "Ajustar" en un comprobante abre el modal con esa fila marcada por su
     saldo y motivo Bonificación. Bajá el importe a una parte y registrá.
   - Resultado: AJ-000001; la columna Ajustado del comprobante suma el
     importe, el saldo baja y el estado financiero queda 'parcial'.
   - En Movimientos aparece AJ-000001 (Ajuste, celeste; concepto
     Bonificación).
   - En el Mayor aparece en la columna Cobrado, con etiqueta Ajuste
     celeste.
   - El log tiene un AJUSTAR.
3. **Redondeo / Cerrar diferencia:**
   - Con otra bonificación, dejá un comprobante con saldo ≤ $ 1.000.
     Aparece "Cerrar diferencia"; al confirmar, AJ por redondeo del saldo
     y el comprobante queda saldado ('cobrado').
   - En el modal, con motivo Redondeo, un importe > 1.000 muestra el error.
4. **Incobrable (cliente):**
   - el importe queda fijo en el saldo y deshabilitado; aviso amarillo;
   - al registrar, el comprobante queda saldo 0 y la columna Estado dice
     "Facturado · incobrable" en rojo;
   - Antigüedad y Resumen ya no lo cuentan.
5. **Incobrable en chofer/proveedor:** en la cuenta de un chofer el motivo
   Incobrable no aparece.
6. **Otro:** sin observación, el error lo pide y no deja confirmar.
7. **Varios comprobantes:** un ajuste con 2 comprobantes genera un solo AJ
   con 2 imputaciones (verlo en el detalle del movimiento).
8. **Anular el incobrable** (Movimientos o cuenta → Anular, con motivo): el
   comprobante recupera el saldo y vuelve a 'parcial' o 'pendiente'. La
   columna Estado ya no dice incobrable.
9. **Guarda de Facturación:** en Facturación → Facturados, desvincular la
   factura de un comprobante con un ajuste vigente (sin cobros) da el
   error "tiene ajustes de Finanzas imputados: anulalos antes de
   desvincular la factura". Anulando el ajuste, desvincular funciona como
   antes.
10. **Fecha:** un ajuste con fecha pasada aparece en el Mayor en esa fecha;
    una fecha futura no se deja elegir (máximo hoy) y el servicio la
    rechaza.

## Commit (lo hace Nico)

```
feat(finanzas): ajustes sobre comprobantes — incobrable, bonificación, redondeo, otro (F7a)

- MovimientoFinService.registrarAjuste: AJ en una transacción (numerador,
  InformeLiq facturados → totalAjustado/saldo/estadoFinanciero, log
  AJUSTAR); incobrable solo clientes y por el saldo completo; redondeo
  hasta $ 1.000 por comprobante; otro con observación obligatoria.
- movimiento-fin.util: DatosAjusteFin, motivosAjustePara,
  validarDatosAjuste, validarImporteAjuste, armarAjuste,
  UMBRAL_CERRAR_DIFERENCIA.
- RegistrarAjusteComponent; cuenta de la entidad: "Registrar ajuste",
  acciones "Ajustar" y "Cerrar diferencia", estado incobrable visible.
- InformeLiqService.desvincularFactura: también exige totalAjustado = 0.
```

FIN DE LA INSTRUCCIÓN F7a
````
