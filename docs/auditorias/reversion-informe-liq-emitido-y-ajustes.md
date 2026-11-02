# Auditoría — Reversión de un InformeLiq emitido y los ajustes imputados

Fecha: 2026-11-02 · Rama: `refactor`

## Alcance

Relevado:

- Qué es `valoresFinancieros.totalAjustado`, quién lo escribe y con qué valor.
- Qué es un ajuste, cómo se imputa a un InformeLiq y si existe un camino para quitarlo.
- Compensaciones, sólo en lo que se parecen o se diferencian de un ajuste respecto de la
  reversión.
- La guarda de `desvincularFactura`, transcripta, y los demás chequeos financieros del
  circuito de estados del InformeLiq.
- Datos de **demo** (`demoapplog`), en solo lectura: `informesLiq` y `movimientosFin`
  completas.
- La máquina de estados de `InformeLiqNuevo` (§5), redactada para leerse sola.

Fuera de alcance, a propósito:

- El circuito de cobros y pagos (`registrar`, `imputarSaldo`, `registrarDevolucion`), salvo
  donde tocan `totalAjustado` o la guarda de estado 'facturado'.
- `cerrarSaldo`: se relevó sólo lo necesario para descartar que toque un InformeLiq (no
  lo toca, §2.5).
- Las pantallas de Finanzas, salvo los botones que disparan ajuste o anulación.
- El modelo viejo `interfaces/informe-liq.ts` (otro tipo, no relevado).
- Producción (`pf-logistics`): no se leyó nada. En §4.2 está qué habría que mirar ahí.
- Los lectores indirectos de `totalAjustado` a través de `normalizarValoresFinancieros`
  (`resumen-finanzas.util.ts`, `historia-comprobante.component.ts`,
  `generador-cobros.service.ts`): se identificaron, pero no se revisó qué hacen con el valor.

Rutas relativas a `src/app/` salvo que se indique otra cosa.

## Inventario de archivos

| Archivo | Tipo | Rol |
|---|---|---|
| `interfaces/informe-liq-nuevo.ts` | Interfaz | `estado`, `valoresFinancieros`, `estadoFinanciero`, `compensaciones`, `reversion`, `anulacion` |
| `interfaces/movimiento-fin.ts` | Interfaz | `MovimientoFin` (el ajuste es un movimiento con `tipo: 'ajuste'`), `ImputacionFin` |
| `servicios/informes-liq/informe-liq.service.ts` | Servicio | Todas las transiciones de `estado` del InformeLiq |
| `servicios/informes-liq/informe-liq-factory.service.ts` | Factory | Valores financieros iniciales y su recálculo |
| `servicios/finanzas-nueva/movimiento-fin.service.ts` | Servicio | `registrarAjuste` y `anular` (sube y baja `totalAjustado`) |
| `shared/utils/finanzas.util.ts` | Util | `saldoDe`, `normalizarValoresFinancieros`, `aplicarImporte`, `estadoFinancieroDe` |
| `shared/utils/movimiento-fin.util.ts` | Util | `acumuladoDeMovimiento`, `validarAnulable`, `armarAjuste`, validaciones de ajuste |
| `shared/utils/compensacion.util.ts` | Util | `armarCompensaciones`, `quitarCompensacion` |
| `raiz/nueva-facturacion/emitidos/facturacion-emitidos.component.ts` | Componente | Botón Revertir |
| `raiz/nueva-facturacion/facturados/facturacion-facturados.component.ts` | Componente | Botón Desvincular |
| `raiz/finanzas-nueva/cuenta-entidad/cuenta-entidad.component.ts` | Componente | Ajustar / Cerrar diferencia / Anular, columna "Ajustado" |
| `raiz/finanzas-nueva/acciones-movimiento.service.ts` | Servicio de UI | Swal de anulación → `MovimientoFinService.anular` |
| `raiz/finanzas-nueva/listado-movimientos.ts` | Config de UI | Acción de fila 'anular' |

## Interfaces y tipos

`interfaces/informe-liq-nuevo.ts:21-28`:

```ts
  // Liquidación produce 'borrador' y 'emitido'. Facturación produce
  // 'facturado' (vincular factura), vuelve a 'emitido' (desvincular) y
  // 'revertido' (revertir un emitido: InformeOp → 'activo', re-liquidables;
  // el informe queda como registro histórico con su número).
  // 'anulado': RESERVADO — ningún flujo lo escribe (ver diseño Facturación
  // §9.1: ningún escenario relevado lo necesita). Se conserva en el tipo
  // para poder agregarlo sin migrar datos.
  estado: 'borrador' | 'emitido' | 'facturado' | 'revertido' | 'anulado';
```

`interfaces/informe-liq-nuevo.ts:62-69`:

```ts
  // Frente Finanzas. Los escriben: Liquidación (total al crear/editar;
  // compensaciones al emitir — FC1) y Finanzas (cobros/pagos/ajustes, en la
  // transacción del movimiento). 'facturado' es la puerta de los cobros y
  // pagos. Leer siempre con normalizarValoresFinancieros
  // (shared/utils/finanzas.util.ts): los docs anteriores al frente no tienen
  // totalCompensado / totalAjustado.
  valoresFinancieros: ValoresFinancierosLiq;
  estadoFinanciero: EstadoFinancieroLiq;
```

`interfaces/informe-liq-nuevo.ts:127-149`:

```ts
/** Acumulados financieros de un InformeLiq (Frente Finanzas).
 *  Invariante: saldo = total − totalCompensado − totalCobrado − totalAjustado
 *  (saldoDe en shared/utils/finanzas.util.ts).
 *  - totalCompensado: anticipos/préstamos compensados en la liquidación
 *    (se aplican al emitir — FC1). No es plata nueva.
 *  - totalCobrado: plata nueva — cobros a clientes, pagos a choferes y
 *    proveedores. El nombre se conserva por el contrato con Facturación:
 *    revertir y desvincular exigen totalCobrado === 0.
 *  - totalAjustado: ajustes (incobrable, bonificación posterior, redondeo,
 *    apertura). */
export interface ValoresFinancierosLiq {
  total: number;
  totalCompensado: number;
  totalCobrado: number;
  totalAjustado: number;
  saldo: number;
}

/** ... 'incobrable' solo lo pone un ajuste con ese motivo. */
export type EstadoFinancieroLiq = 'pendiente' | 'parcial' | 'cobrado' | 'incobrable';
```

Tipos de `interfaces/movimiento-fin.ts` que intervienen:

- `TipoMovimientoFin = 'cobro' | 'pago' | 'ajuste'` (:53).
- `MotivoAjusteFin = 'incobrable' | 'bonificacion' | 'redondeo' | 'apertura' | 'otro'` (:56).
- `EstadoMovimientoFin = 'vigente' | 'anulado'` (:59).
- `OrigenImputacionFin = 'directa' | 'saldo' | 'compensacion' | 'cierre' | 'devolucion'` (:114).
- `ImputacionFin` (:116-126) lleva `documento: { tipo: 'informeLiq' | 'movimientoFin', id }`,
  `numeroDocumento`, `importe`, `saldoAntes` y `origen`.
- El comentario de :14-15 dice: "Un movimiento solo se ANULA entero (no se edita)".

## 1. Qué es `totalAjustado`

**Es un acumulado vivo:** la suma de los importes de los ajustes **vigentes** imputados al
informe. No es un valor derivado.

Escritores, todos los que existen en `src/`:

| Dónde | Qué escribe |
|---|---|
| `informe-liq-factory.service.ts:186-188` (`valoresFinancierosIniciales`, que usa `crear`) | `0` al crear el informe, sea borrador o emitido |
| `movimiento-fin.service.ts:158` (`registrarAjuste`) | `aplicarImporte(vfAntes, 'totalAjustado', imp.importe)`: suma el importe de cada imputación |
| `movimiento-fin.service.ts:353, 362` (`anular`) | `aplicarImporte(vfAntes, acumuladoDeMovimiento(mov.tipo), -rev.importe)`: resta lo que el ajuste había sumado |
| `informe-liq-factory.service.ts:127-134` (`valoresFinancierosConCompensado`) y `:139-142` (`recalcularValoresFinancieros`) | Lo **conservan**: normalizan sobre el valor actual "sin pisar cobrado/ajustado" |

`valoresFinancierosConCompensado` y `recalcularValoresFinancieros` se usan en
`emitirBorrador`, `editarDatos` y `editarInformeOp`, todos de `InformeLiqService`.

`acumuladoDeMovimiento` (`shared/utils/movimiento-fin.util.ts:346-351`):

```ts
export function acumuladoDeMovimiento(tipo: TipoMovimientoFin): AcumuladoFinanciero {
  return tipo === 'ajuste' ? 'totalAjustado' : 'totalCobrado';
}
```

`shared/utils/finanzas.util.ts`, con la invariante y la aritmética:

```ts
/** Invariante: saldo = total − totalCompensado − totalCobrado − totalAjustado. */
export function saldoDe(vf) { ... vf.total - vf.totalCompensado - vf.totalCobrado - vf.totalAjustado ... }

export function aplicarImporte(vf, acumulado, importe) {
  const actual = normalizarValoresFinancieros(vf, vf.total);
  const nuevoAcumulado = redondear2(actual[acumulado] + importe);
  if (nuevoAcumulado < -TOLERANCIA_IMPORTE) {
    throw new Error(`La reversión deja ${acumulado} negativo (${nuevoAcumulado}).`);
  }
  ...
  if (saldo < -TOLERANCIA_IMPORTE) {
    throw new Error(`El importe ${redondear2(importe)} supera el saldo del documento (${actual.saldo}).`);
  }
  ...
}

export function estadoFinancieroDe(vf, actual?) {
  if (esCero(vf.saldo)) return actual === 'incobrable' ? 'incobrable' : 'cobrado';
  return esCero(vf.totalCobrado + vf.totalAjustado) ? 'pendiente' : 'parcial';
}
```

De ahí se sigue que:

- `totalAjustado !== 0` equivale a "hay al menos un ajuste vigente imputado a este
  informe". Anular el último ajuste lo devuelve a 0, y `aplicarImporte` lo normaliza a 0
  exacto con `esCero`.
- El valor no queda distinto de cero "porque alguna vez hubo un ajuste".
- No hay otro escritor que lo ponga en un valor arbitrario. Los generadores de demo y las
  herramientas de `/migracion` no lo escriben: el literal `totalAjustado` no aparece en
  `servicios/desarrollo/`.

## 2. Ajustes: imputación, desimputación y compensaciones

### 2.1 Qué documento es un ajuste

- Es un `MovimientoFin` con `tipo: 'ajuste'` y numeración `AJ-000001`, en la colección
  `movimientosFin`.
- Lo arma `armarAjuste` (`movimiento-fin.util.ts:544-571`) con `medios: []`,
  `total = Σ imputaciones.importe`, `sinImputar: 0`, `estado: 'vigente'`, `anulacion: null`
  e imputaciones de `origen: 'directa'`.

**El vínculo con el InformeLiq va en un solo sentido.** El ajuste guarda `imputaciones[]`,
cada una con `documento.id = idInfLiq` e `importe`, y además `idsDocumentos[]` para
`array-contains`. El InformeLiq **no** guarda referencia a sus ajustes: sólo el acumulado
`totalAjustado` y `estadoFinanciero`. Para saber qué ajustes tiene un informe hay que
consultar `movimientosFin` por `idsDocumentos`.

### 2.2 Imputar: `MovimientoFinService.registrarAjuste`

Corre en transacción (`commitEnTransaccion`). Sus guardas:

- **Antes de las lecturas** (`validarDatosAjuste`, `movimiento-fin.util.ts:507-525`):
  - la entidad es obligatoria;
  - el motivo tiene que estar en `motivosAjustePara`: 'incobrable' sólo para clientes y
    'apertura' no se puede elegir (`MotivoAjusteElegible`, `movimiento-fin.util.ts:463-464`:
    "'apertura' queda para la migración");
  - la fecha no puede ser futura;
  - al menos una imputación, sin ids repetidos, con importes mayores que 0;
  - redondeo hasta `UMBRAL_CERRAR_DIFERENCIA` = 1000 por comprobante;
  - con 'otro' la observación es obligatoria.
- **Dentro de la transacción, por cada informe:**
  - `validarDocumentoImputable` exige **`liq.estado === 'facturado'`** y la misma entidad.
    El comentario de cabecera de la clase (`movimiento-fin.service.ts:35`) lo dice: "Por
    contrato con Facturación, solo se imputa a InformeLiq 'facturado'.";
  - `validarImporteAjuste`: un incobrable tiene que ir por el saldo completo;
  - `aplicarImporte`: el saldo no puede quedar negativo.
- **Escrituras:**
  - el numerador AJ;
  - `valoresFinancieros` y `estadoFinanciero` de cada informe, con
    `agregarEscrituraInformeLiqParcial`. Un incobrable fija `'incobrable'`;
  - el movimiento;
  - un log `AJUSTAR`.

Desde la UI se llega al ajuste por dos caminos, los dos en `cuenta-entidad.component.ts`:

- El modal `registrar-ajuste`, abierto desde la cabecera o desde la acción de fila
  'ajustar', que tiene `permiso: 'finanzas.agregar'` y
  `visible: f => f.estado === 'facturado' && f.saldo > 0`.
- "Cerrar diferencia", que llama a `registrarAjuste` con motivo `'redondeo'` por el saldo,
  hasta 1000.

### 2.3 Quitar: `MovimientoFinService.anular(idMovimiento, motivo)`

**Es el único camino que existe para quitar un ajuste imputado.** No hay desimputación
parcial ni edición de un ajuste, y `imputarSaldo` rechaza los ajustes
(`movimiento-fin.util.ts:424`).

Anular un ajuste:

- Anula el movimiento entero.
- Resta su importe de `totalAjustado` en cada informe que tenía imputado.
- Deja el AJ con `estado: 'anulado'` y `anulacion`, conservando las imputaciones como
  registro.
- Escribe un log `ANULAR`.

Todo en una transacción.

Guardas, transcriptas:

- `validarAnulable` (`movimiento-fin.util.ts:356-368`):
  ```ts
  if (mov.estado !== 'vigente') return `El movimiento ${mov.numero} ya está anulado.`;
  if (mov.imputaciones.some(i => i.origen === 'compensacion')) { return `... primero quitá la compensación o revertí la liquidación.`; }
  const espejo = mov.imputaciones.find(i => i.origen === 'cierre' || i.origen === 'devolucion');
  if (espejo) { return `... primero anulá ese movimiento.`; }
  ```
  Un ajuste nunca tiene imputaciones 'compensacion' ni espejos: `armarCompensaciones`
  rechaza los ajustes (`compensacion.util.ts`, "es un ajuste: no se compensa."). Para un
  AJ sólo pesa la primera condición.
- **Estado del informe**, dentro de la transacción (`movimiento-fin.service.ts:356-360`):
  ```ts
  if (liq.estado !== 'facturado') {
    throw new Error(
      `El informe ${rev.numeroDocumento} está en estado '${liq.estado}' (se esperaba 'facturado'). Anulación abortada.`,
    );
  }
  ```
  **Un ajuste sólo se puede anular mientras su informe sigue en 'facturado'.** Si el
  informe estuviera en 'emitido' o 'revertido', la anulación de ese ajuste aborta.
- `aplicarImporte` con importe negativo falla si `totalAjustado` quedaría negativo.

Desde la UI:

- La acción de fila 'anular' (`listado-movimientos.ts:29-33`) tiene
  `permiso: 'finanzas.anular'`, `visible: m => m.estado === 'vigente'` y
  `deshabilitada: m => validarAnulable(m) !== null`.
- Está también el botón del detalle del movimiento.
- Las dos entradas pasan por `acciones-movimiento.service.ts`, que pide el motivo en un
  Swal y llama a `anular`.
- `finanzas.anular` se mapea a `editar` (`permisos.service.ts`). En el módulo `finanzas`,
  `editar` lo tienen solo `dev` y `admin`.
- La UI **no** chequea antes el estado del informe: esa guarda existe sólo en la
  transacción.

### 2.4 Ajuste frente a compensación

| | Compensación | Ajuste |
|---|---|---|
| Qué es | Un anticipo o saldo a favor (cobro/pago con `sinImputar`) que se descuenta en la liquidación | Un movimiento propio (AJ) que da por resuelta parte del saldo |
| Dónde vive | En el InformeLiq (`compensaciones[]`, cada una con `idMovimiento`) y como imputación `origen: 'compensacion'` en el movimiento | Sólo en `movimientosFin`; el informe no lo referencia |
| ¿Crea un MovimientoFin? | No: modifica `imputaciones` y `sinImputar` de un movimiento existente | Sí (AJ-xxxxxx) |
| Quién la aplica | Liquidación (`InformeLiqService`): se aplica al emitir y se edita en un emitido | Finanzas (`MovimientoFinService`), sólo sobre 'facturado' |
| Acumulado | `totalCompensado` | `totalAjustado` |
| En qué estado del informe nace | 'emitido' (en borrador es sólo una propuesta) | 'facturado' |
| Cómo se deshace | `editarDatos` sobre un emitido, o `revertirEmitido`, con `quitarCompensacion` en los dos casos | `MovimientoFinService.anular`, con el informe en 'facturado' |
| Efecto en `estadoFinanciero` | No cuenta para pasar de 'pendiente' a 'parcial' | Cuenta |

`quitarCompensacion` (`shared/utils/compensacion.util.ts:175-184`):

```ts
/** Campos del movimiento sin las compensaciones aplicadas al informe
 *  `idInfLiq` (liberar al revertir o al quitarla de un emitido). */
export function quitarCompensacion(
  mov: Pick<MovimientoFin, 'numero' | 'total' | 'imputaciones'>,
  idInfLiq: string,
): CamposImputacionMovimiento {
  const restantes = (mov.imputaciones ?? [])
    .filter(i => !(i.origen === 'compensacion' && i.documento.id === idInfLiq));
  return acumularImputaciones({ numero: mov.numero, total: mov.total, imputaciones: restantes }, []);
}
```

Opera sobre el **movimiento**: le quita la imputación hacia el informe y recalcula
`sinImputar`. No toca el InformeLiq.

La diferencia estructural es esta. La compensación vive en el mismo estado en que se puede
revertir ('emitido'), así que `revertirEmitido` puede liberarla dentro de su propia
transacción. El ajuste vive sólo en 'facturado', y su deshacer (`anular`) está atado a ese
mismo estado.

### 2.5 `cerrarSaldo` no toca InformeLiq

`cerrarSaldo` (`movimiento-fin.service.ts`, con `armarCierreSaldo` en
`movimiento-fin.util.ts`) también crea un AJ. Pero lo imputa a **otro MovimientoFin**
(`documento.tipo: 'movimientoFin'`), no a un InformeLiq, así que no escribe
`totalAjustado`.

## 3. El chequeo de `desvincularFactura`

`InformeLiqService.desvincularFactura`, en transacción, después de
`leerFacturado` (`informe-liq.service.ts:761-773`):

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

- Compara el acumulado contra `0` con `!==` exacto, sin tolerancia. `aplicarImporte`
  normaliza a 0 los valores dentro de la tolerancia, así que un acumulado "casi cero" no
  queda persistido.
- El mensaje remite a anular los ajustes. Como el informe está en 'facturado', esa
  anulación es posible (§2.3).
- La UI replica la condición en `facturacion-facturados.component.ts:82-86`:
  ```ts
  deshabilitada: b => (b.valoresFinancieros?.totalCobrado ?? 0) !== 0 || (b.valoresFinancieros?.totalAjustado ?? 0) !== 0,
  ```
- Historia: la guarda de `totalAjustado` y `registrarAjuste` entraron **en el mismo
  commit**, `ffc6105` (2026-10-07, F7a). Nunca existió en el código un `registrarAjuste` sin
  esta guarda.

**Otros chequeos equivalentes en el circuito:**

- `revertirEmitido` chequea sólo `totalCobrado` (`informe-liq.service.ts:582-586`), con el
  mensaje `La liquidación ${liq.numeroInterno} tiene importes cobrados/pagados imputados: no se puede revertir.`
  La UI de Emitidos replica sólo esa condición (`facturacion-emitidos.component.ts:57-61`):
  `deshabilitada: b => (b.valoresFinancieros?.totalCobrado ?? 0) !== 0`.
- Ningún otro método de `InformeLiqService` lee `totalCobrado` ni `totalAjustado`:
  `emitirBorrador`, `eliminarBorrador`, `editarDatos`, `editarInformeOp` y
  `vincularFactura` no tienen chequeos sobre esos acumulados.

### 3.1 Hallazgo: con el código actual, un 'emitido' no puede tener `totalAjustado ≠ 0`

Esto se deduce de las guardas relevadas. No se probó en ejecución.

1. Todo informe nace con `totalAjustado = 0` (`valoresFinancierosIniciales`).
2. El único escritor que lo sube, `registrarAjuste`, exige `estado === 'facturado'` dentro
   de su transacción.
3. La única transición que sale de 'facturado' es `desvincularFactura` (→ 'emitido'), y
   exige `totalAjustado === 0` dentro de su transacción.
4. Las dos transacciones leen el mismo documento con `tx.get`
   (`DbFirestoreService.leerEnTransaccion` → `runTransaction`), así que Firestore las
   serializa. No hay carrera que deje un ajuste imputado a un informe recién desvinculado.
5. `emitirBorrador`, `editarDatos` y `editarInformeOp` conservan el valor, sin sumarle nada.

Por lo tanto el escenario que describe la deuda registrada ("un emitido con ajustes
imputados se puede revertir…", en CLAUDE.md y en la skill `modulo-facturacion`) **no es
alcanzable por ningún camino de código actual**. Sólo podría aparecer por:

- datos escritos por fuera de estos métodos (consola, scripts, una migración);
- un AJ de motivo `'apertura'` cargado en la migración (§4.2);
- un camino futuro que saque a un informe de 'facturado' sin esa guarda.

Hecho relacionado: si un informe 'emitido' o 'revertido' llegara a tener un ajuste vigente
imputado, **no hay camino en el código para quitarlo**. `anular` exige 'facturado' (§2.3),
y desde 'revertido' no sale ninguna transición.

## 4. Qué hay en los datos

### 4.1 Demo (`demoapplog`), leído el 2026-11-02, solo lectura

Lectura completa de `Vantruck/datos/informesLiq` y `Vantruck/datos/movimientosFin` con
`runQuery` sobre la API REST de Firestore, usando la sesión del CLI de Firebase. Script en
el scratchpad de la sesión, fuera del repo.

`informesLiq`: 354 documentos.

| `estado` / `estadoFinanciero` | Cantidad |
|---|---|
| facturado / cobrado | 274 |
| emitido / pendiente | 37 |
| facturado / pendiente | 36 |
| borrador / pendiente | 4 |
| facturado / parcial | 2 |
| revertido / pendiente | 1 |

- **InformeLiq 'emitido' con `totalAjustado ≠ 0`: 0.** Tampoco hay ninguno, en ningún
  estado, con `totalAjustado ≠ 0` ni con `totalCompensado ≠ 0`. Ningún informe tiene
  `compensaciones` cargadas.
- `movimientosFin`: 364 documentos, todos `vigente`: 304 `pago` y 60 `cobro`. **No hay
  ningún ajuste** en demo, ni vigente ni anulado.
- El único 'revertido' (`UmgqSi5e8Xo8VwUoqxG2`) tiene `reversion` cargado (motivo
  "prueba de anulación y restauración") y ningún acumulado financiero.

Forma de un 'emitido' de ejemplo, `1B1kAn47eMXDY9ATvP5h`, con los arrays recortados:

```json
{
  "tipo": "chofer",
  "entidad": { "id": "emuUVzem4DLh1VJPQF8Z", "nombre": "…", "apellido": "…", "cuit": 60122081682 },
  "estado": "emitido",
  "numeroInterno": "LQCH-0151",
  "fechaCreacion": "2026-09-03",
  "fechaEmision": "2026-09-03",
  "periodo": { "anio": 2026, "mes": 8, "tramo": "mes" },
  "periodoClave": "2026-08",
  "informesOp": ["3PqvffPoswnsWHw2kTQA", "ZMsfJ8IKFQzJMX1ylrKW", "…(7)"],
  "cantidadOperaciones": 7,
  "valores": { "totalTarifaBase": 540000, "totalAcompaniante": 50000, "totalKmMonto": 311600,
               "totalAdExtra": 11500, "descuentoTotal": 0, "total": 913100,
               "totalContraParte": 1329900, "totalCompensaciones": 0, "neto": 913100 },
  "descuentos": [],
  "compensaciones": [],
  "columnas": ["Fecha", "Quincena", "…(10)"],
  "observaciones": "Generada por el Generador de circuito (demo).",
  "valoresFinancieros": { "total": 913100, "totalCompensado": 0, "totalCobrado": 0,
                          "totalAjustado": 0, "saldo": 913100 },
  "estadoFinanciero": "pendiente",
  "facturaUrl": null,
  "factura": null,
  "reversion": null,
  "anulacion": null
}
```

Como en demo no hay ajustes, no se pudo observar en datos el ciclo imputar → anular.
§1 y §2 salen sólo del código.

### 4.2 Producción (`pf-logistics`): no se leyó nada

`main` no tiene ni `totalAjustado` ni la colección `informesLiq`: `git grep` sobre `main`
no devuelve nada para ninguno de los dos. Producción no usa todavía este circuito, que
llega con la migración.

Cuando se decida, habría que mirar:

- `Vantruck/datos/informesLiq` (si para entonces existe), filtrando
  `estado in ['emitido', 'revertido']` y `valoresFinancieros.totalAjustado != 0`. No hay
  índice para esa combinación: el índice declarado es `informesLiq (estado,
  estadoFinanciero)`, así que se puede leer por `estado` y filtrar en memoria.
- `Vantruck/datos/movimientosFin` con `tipo == 'ajuste'` y `estado == 'vigente'`, cruzando
  `imputaciones[].documento.id` contra el `estado` de cada InformeLiq. Hay que detectar los
  ajustes vigentes cuyo informe no está en 'facturado', que son los que no se pueden anular
  (§2.3).
- En particular, los AJ de motivo `'apertura'` que cree la migración. La skill
  `modulo-finanzas`, "Deuda abierta", punto 4 de la checklist, prevé "AJ con motivo
  'apertura' para lo resuelto antes del corte". Ese motivo no se puede elegir en la UI, así
  que lo escribiría una herramienta de `/migracion` que hoy no existe. Que sólo imputen a
  informes 'facturado' depende de que esa herramienta pase por `registrarAjuste` o
  reproduzca su guarda.

## 5. Máquina de estados del InformeLiq (`InformeLiqNuevo`, colección `informesLiq`)

Todas las transiciones viven en `InformeLiqService` (`servicios/informes-liq/`). Finanzas
(`MovimientoFinService`) escribe en el informe sólo `valoresFinancieros` y
`estadoFinanciero`, nunca `estado`. Todas las transiciones corren en
`commitEnTransaccion`: el informe se relee dentro de la transacción y la guarda de estado
se evalúa ahí. `vincularFactura` hace además pre-chequeos fuera de la transacción y los
repite adentro.

```
(nuevo) ──crearBorrador──► borrador ──eliminarBorrador──► (borrado físico)
   │                          │
   │                          └──emitirBorrador──┐
   └──────────emitir────────────────────────────►│
                                                 ▼
                         ┌──────────────────► emitido ──revertirEmitido──► revertido (final)
                         │                       │
                desvincularFactura        vincularFactura
                         │                       │
                         └────────────────── facturado (final: no hay reversión desde acá)

anulado: en el tipo, RESERVADO. Ningún flujo lo escribe (ni src/ ni functions/).
```

### Estados

| Estado | Qué significa | Qué se puede hacer |
|---|---|---|
| `borrador` | Liquidación armada, no emitida. Sus InformeOp quedan en 'proforma' con `idInfLiq` | Editar datos (`editarDatos`), editar un InformeOp (`editarInformeOp`), emitir, eliminar |
| `emitido` | Liquidación emitida. Sus InformeOp quedan en 'liquidado'. Las compensaciones están aplicadas | Editar datos y compensaciones (`editarDatos`), editar un InformeOp, vincular factura, revertir |
| `facturado` | Tiene factura electrónica vinculada. **Es la única puerta de Finanzas**: cobros, pagos y ajustes sólo se imputan y anulan acá | Desvincular la factura. Desde Finanzas: imputar o anular movimientos |
| `revertido` | Registro histórico. Sus InformeOp volvieron a 'activo' para liquidarse de nuevo | Nada: no hay transición de salida |
| `anulado` | Reservado. El campo `anulacion` también está reservado | — |

### Transiciones

| Transición | Método | La habilita | La impide |
|---|---|---|---|
| (nuevo) → `borrador` | `crearBorrador` (→ `crearNuevo(d, 'borrador')`) | Informes 'activo' seleccionados, de una sola entidad y período | Selección vacía, más de `MAX_INFORMES_OP`, repetidos, período inválido; un InformeOp que no está 'activo', o que está bloqueado por una proforma de la contraparte, o es de otro tipo, otra entidad, fuera del período, o repite operación |
| (nuevo) → `emitido` | `emitir` (→ `crearNuevo(d, 'emitido')`) | Lo mismo, más compensaciones válidas | Lo de arriba. Fecha de emisión inválida, anterior al fin del período o posterior a hoy. Un movimiento a compensar posterior a la fecha de emisión. Neto negativo (`errorNeto`). Una compensación inválida (`armarCompensaciones`: movimiento inexistente, anulado, ajuste, de otra entidad o sin disponible suficiente) |
| `borrador` → `emitido` | `emitirBorrador` | Informe en 'borrador' y sus InformeOp en 'proforma' apuntando a él | Estado distinto de 'borrador'; inconsistencia de InformeOp; compensaciones que ya no valen (se revalidan); neto negativo. **Sin chequeos de cobrado ni ajustado** (en un borrador son 0 por construcción) |
| `borrador` → (borrado) | `eliminarBorrador` | Informe en 'borrador' | Estado distinto; inconsistencia de InformeOp; operación inexistente. Sin chequeos financieros |
| `borrador`/`emitido` → igual | `editarDatos`, `editarInformeOp` | Estado 'borrador' o 'emitido' | Cualquier otro estado; neto negativo. Conservan `totalCobrado`/`totalAjustado` y recalculan `total`/`saldo`. `editarInformeOp` **no** es transaccional (`commitBatch` con lecturas previas) |
| `emitido` → `facturado` | `vincularFactura` | Informe en 'emitido'; comprobante no vinculado a otra liquidación | Estado distinto de 'emitido'; comprobante ya vinculado (doc de unicidad). Sin chequeos financieros |
| `facturado` → `emitido` | `desvincularFactura` | Informe en 'facturado', motivo no vacío | `totalCobrado !== 0`; **`totalAjustado !== 0`**; facturado sin `factura` (inconsistencia). Limpia `factura`/`facturaUrl` y borra el doc de unicidad. No toca valores financieros |
| `emitido` → `revertido` | `revertirEmitido` | Informe en 'emitido', motivo no vacío, InformeOp en 'liquidado' apuntando a él | `totalCobrado !== 0`; inconsistencia de InformeOp; un movimiento compensado que no existe. **No chequea `totalAjustado`, `totalCompensado`, `saldo` ni `estadoFinanciero`** |

Escrituras de `revertirEmitido`:

- InformeLiq: sólo `{ estado: 'revertido', reversion }`. No reescribe
  `valoresFinancieros`, `estadoFinanciero`, `compensaciones` ni
  `valores.totalCompensaciones`/`neto`.
- Libera cada compensación en su movimiento (`quitarCompensacion`).
- Guarda una copia congelada de los InformeOp en `informesLiqSnapshots/{idInfLiq}`.
- Devuelve los InformeOp de su lado a `'activo'` con `idInfLiq: null`.
- Operación: `liquidacion.<lado> = false`, y `ciclo` 'liquidada' → 'cerrada'.
- Un log `REVERTIR`.

Gestos de UI, gateados por `PermisosService` vía la tabla genérica (sin permiso el botón
no aparece):

- **Revertir** (bandeja Emitidos): `facturacion.revertir`, deshabilitado si
  `totalCobrado !== 0`.
- **Desvincular** (bandeja Facturados): `facturacion.desvincular`, deshabilitado si
  `totalCobrado !== 0 || totalAjustado !== 0`.

Los dos piden el motivo en un Swal. El modal de detalle del informe no dispara
transiciones.

### Contrato con Finanzas

| Gesto de Finanzas | Estado del informe exigido | Acumulado que mueve |
|---|---|---|
| Cobro o pago imputado (`registrar`, `imputarSaldo`) | 'facturado' | `totalCobrado` (+) |
| Ajuste (`registrarAjuste`, incluido "Cerrar diferencia") | 'facturado' | `totalAjustado` (+) |
| Anulación de un movimiento (`anular`) | 'facturado' | el acumulado del tipo (−) |
| Compensación (la aplica Liquidación, no Finanzas) | 'emitido' (al emitir o editar); se libera al revertir | `totalCompensado` |

## Componentes y puntos de consumo

| Componente | Cómo lo usa | Archivo |
|---|---|---|
| `FacturacionEmitidosComponent` | Lista 'emitido'; acción Revertir → `revertirEmitido` | `raiz/nueva-facturacion/emitidos/facturacion-emitidos.component.ts` |
| `FacturacionFacturadosComponent` | Lista 'facturado'; acción Desvincular → `desvincularFactura` | `raiz/nueva-facturacion/facturados/facturacion-facturados.component.ts` |
| `CuentaEntidadComponent` | Ajustar, Cerrar diferencia, Anular; columna "Ajustado" | `raiz/finanzas-nueva/cuenta-entidad/cuenta-entidad.component.ts` |
| `RegistrarAjusteComponent` | Modal → `registrarAjuste` | `raiz/finanzas-nueva/modales/registrar-ajuste/` |
| `AccionesMovimientoService` | Swal de motivo → `anular` | `raiz/finanzas-nueva/acciones-movimiento.service.ts` |
| Exportación de la cuenta | Columna `ajustado` | `shared/utils/exportacion-finanzas.util.ts` |

## Colecciones de Firestore involucradas

| Colección | Forma relevante | Escribe | Lee |
|---|---|---|---|
| `informesLiq` | `estado`, `valoresFinancieros {total, totalCompensado, totalCobrado, totalAjustado, saldo}`, `estadoFinanciero`, `compensaciones[]`, `reversion`, `anulacion` | `InformeLiqService` (estado y valores), `MovimientoFinService` (sólo `valoresFinancieros`/`estadoFinanciero`) | Facturación, Finanzas, Liquidación |
| `movimientosFin` | `tipo`, `motivoAjuste`, `imputaciones[] {documento, importe, origen}`, `idsDocumentos[]`, `estado`, `anulacion` | `MovimientoFinService`; `InformeLiqService` sólo las imputaciones 'compensacion' | Finanzas; `InformeLiqService` al compensar o revertir |
| `informesLiqSnapshots` | Copia de los InformeOp al revertir | `revertirEmitido` | — (no relevado) |

## Dependencias con otros módulos

- Facturación → Finanzas: Facturación lee los acumulados (`totalCobrado`,
  `totalAjustado`) para bloquear sus transiciones. No hay llamada a servicios de Finanzas.
- Finanzas → Facturación: Finanzas exige `estado === 'facturado'` leyendo el informe.
  Escribe a través de `InformeLiqService.agregarEscrituraInformeLiqParcial`.
- Liquidación ↔ Finanzas: las compensaciones (`armarCompensaciones`,
  `quitarCompensacion`) escriben en `movimientosFin` desde `InformeLiqService`.
- Ninguna pieza de este circuito está en el modelo viejo (`StorageService`/`LogService`).

## Inconsistencias y deuda detectada

1. **`revertirEmitido` no chequea `totalAjustado`; `desvincularFactura` sí**
   (`informe-liq.service.ts:582-586` contra `:769-773`). La UI replica la misma asimetría.
   Por §3.1, con el código actual un 'emitido' no puede llegar con `totalAjustado ≠ 0`.
   La asimetría es real, pero el caso que describe la deuda registrada no es alcanzable
   hoy desde la app.
2. **La deuda registrada describe un escenario que el código no permite.** La entrada de
   CLAUDE.md ("un emitido con ajustes imputados se puede revertir…") y la de la skill
   `modulo-facturacion` lo afirman sin el análisis de §3.1. Salen del hallazgo 11 de
   `docs/auditorias/baja-y-restauracion-de-operacion.md`, que la skill marca como "sin
   investigar más".
3. **Un ajuste vigente sobre un informe que no está en 'facturado' no tiene salida.**
   `anular` exige 'facturado' y desde 'revertido' no hay transición. Hoy no se puede
   producir desde la app (§3.1).
4. **`revertirEmitido` no reescribe los valores financieros del informe.** Libera las
   compensaciones en los movimientos, pero el informe revertido conserva
   `totalCompensado`, `saldo`, `estadoFinanciero`, `compensaciones` y
   `valores.totalCompensaciones`/`neto`. El comentario del tipo dice que quedan "como
   historia", pero no hay un campo que distinga "compensación vigente" de "compensación
   liberada" en el informe.
5. La UI de Finanzas no anticipa la guarda de estado de `anular`: el botón Anular no mira
   el estado de los informes imputados.

## Preguntas abiertas

1. **¿Hay datos en producción o en migración que puedan violar §3.1?** En demo no hay
   ajustes. En producción el circuito no existe todavía. Queda por definir cómo crea sus AJ
   la migración (motivo `'apertura'`) y contra qué estado de informe.
2. **¿`revertirEmitido` debería poder liberar un ajuste?** No se puede contestar leyendo.
   Hoy el ajuste nace y muere sólo en 'facturado', y su anulación es un gesto de Finanzas
   con permiso `finanzas.anular` (dev/admin). La compensación, en cambio, la libera la
   propia reversión.
3. **¿Se anticipa algún camino nuevo que saque a un informe de 'facturado'?** Por ejemplo,
   revertir un facturado o el estado `'anulado'` reservado. Es el único escenario en que
   la guarda faltante dejaría de ser inalcanzable.
4. **`totalCompensado` en un revertido:** ¿lo leen así a propósito los consumidores de
   Finanzas (cuentas, antigüedad, Mayor) o lo filtran por estado? No se verificó si las
   cuentas excluyen los 'revertido'.
5. **`informesLiqSnapshots`:** no se relevó quién la lee ni si su mapeo en
   `firestore.rules` existe.
