````
INSTRUCCIÓN TC4 — Tarifas (cierre): ciclo de vida del RegistroOpEventual
========================================================================

Si no ves la línea "FIN DE LA INSTRUCCIÓN TC4" al final, el texto llegó
cortado: leé el archivo completo antes de empezar.

## Contexto y razonamiento

RegistroOpEventual (colección registrosOpEventuales) es el historial de
operaciones con tarifa eventual que muestra la pestaña Tarifas → Eventual.
Hoy tiene 3 problemas:

1. Se escribe DESPUÉS del commit del cierre, best-effort
   (ValoresTarifaService.registrarEventualSiCorresponde): si falla, la
   operación queda cerrada sin registro y solo queda un log de error.
2. Por las reglas, 'registrosOpEventuales' está en el módulo 'tarifas', donde
   'user' solo lee. 'user' cierra operaciones → hoy sus cierres eventuales
   fallan en silencio al registrar. Si el alta pasa al batch del cierre sin
   arreglar la regla, el cierre ENTERO fallaría para 'user'.
3. La baja de una operación cerrada (bajaOperacionCerrada) anula los dos
   InformeOp pero deja el registro como si la operación existiera.

Cambios:
1. Modelo: RegistroOpEventual gana `estado?: 'activo' | 'anulado'` y
   `anulacion?: AnulacionRegistroOpEventual | null` (Anulacion +
   idEventoPapelera, igual que AnulacionInformeOp). Opcionales: los registros
   migrados no los tienen; sin `estado` = 'activo'.
2. Cierre: ValoresTarifaService.armarRegistroEventual(op) (puro, reemplaza a
   registrarEventualSiCorresponde) arma el registro; cerrarOperacion lo suma a
   `escriturasNegocio` con TarifarioService.agregarEscrituraRegistroEventual
   (id aleatorio, generado FUERA de `armar`). Mismo commit que el resto del
   cierre: si falla, no se cierra nada. El log CERRAR menciona el id del
   registro.
3. Baja de cerrada: FUERA de la transacción (el SDK web no permite queries
   adentro) se lee el InformeOp para saber la operación y se buscan sus
   registros no anulados (query por idOperacion). ADENTRO: se valida que el
   InformeOp siga apuntando a la misma operación, se relee cada registro y
   se anula con la MISMA `anulacion` de los InformeOp. El log BAJA lo
   menciona.
   Restaurar y volver a cerrar la operación crea un registro NUEVO (el viejo
   queda 'anulado' como historia) — por eso el id no es determinista.
4. TarifarioService (dueño de la colección) gana los helpers
   agregarEscrituraRegistroEventual, buscarIdsRegistrosEventualesActivos,
   leerRegistroEventualEnTransaccion y agregarAnulacionRegistroEventual.
   crearRegistroEventual queda solo para la migración del historial viejo
   (reusa el helper de alta).
5. Reglas: 'registrosOpEventuales' pasa al módulo 'informesOp' (mismo perfil
   que lo que escribe el cierre: dev/admin todo, user leer+crear, demo leer).
   La anulación la hace la baja de cerrada, que ya requiere editar
   informesOp (dev/admin).
6. Se retira la herramienta "Limpieza de registrosOpEventuales de prueba" de
   /migracion: marcaba como "huérfano" todo registro no migrado, o sea, desde
   ahora TODOS los registros reales de cierre.
7. Pestaña Eventual: los anulados se muestran atenuados, con badge
   "Anulado" (motivo en el tooltip) y sin botón "Ver operación" (la
   operación está en papelera).
8. ValoresTarifaService ya no usa LogRegistroService → se saca del
   constructor (sin .spec.ts que lo construya).

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto a BUSCAR no está, o aparece más de una vez: detenete y reportá.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.
- Se toca la interfaz RegistroOpEventual: revisá todos sus usos en src/
  (incluidos .spec.ts y .html) — ver 0.2.

## PASO 0 — Verificación (sin modificar nada)

0.1 `grep -rn "registrarEventualSiCorresponde" src/` → 4 resultados:
    definición en valores-tarifa.service.ts, docblock + 1 llamada en
    operacion.service.ts (cerrarOperacion), docblock en tarifario.service.ts.
0.2 `grep -rln "RegistroOpEventual\b" src/` → registro-op-eventual.ts,
    tarifario.service.ts, valores-tarifa.service.ts,
    tarifa-migration.service.ts, tarifas-eventual.component.ts y
    migracion.component.html (solo texto). Ningún .spec.ts. Los campos
    nuevos son opcionales: ningún literal existente deja de compilar.
0.3 `grep -rni "huerfano" src/` → solo tarifa-migration.service.ts,
    componentes/migracion/migracion.component.ts y .html.
0.4 `grep -n "registrosOpEventuales" firestore.rules` → 1 resultado:
    `'registrosOpEventuales': 'tarifas',`.
0.5 InformeOpService tiene `obtenerPorId(idInfOp)`; DbFirestoreService tiene
    `getByField<T>(componente, campo, valor)`, `leerEnTransaccion<T>(tx,
    coleccion, id)` y `generarId(coleccion)`.
0.6 El constructor de TarifarioService solo inyecta DbFirestoreService y
    LogRegistroService (inyectarlo en OperacionService no arma un ciclo).
0.7 `grep -n "logRegistro" src/app/servicios/tarifario/valores-tarifa.service.ts`
    → 2 resultados: constructor y registrarEventualSiCorresponde.
0.8 En tarifa-migration.service.ts, `this.db` solo se usa en
    borrarRegistrosOpEventualesHuerfanos y `EscrituraBatch` solo ahí.
Si algo no coincide, DETENETE y reportá.

## PASO 1 — src/app/interfaces/registro-op-eventual.ts

1.1 BUSCAR:
```
export interface RegistroOpEventual {
  idTarifa: string;                     // id del documento, poblado al leer (mismo patrón que TarifaBase.idTarifa)
```
REEMPLAZAR:
```
import { Anulacion } from './anulacion';

export interface RegistroOpEventual {
  idTarifa: string;                     // id del documento, poblado al leer (mismo patrón que TarifaBase.idTarifa)
```

1.2 BUSCAR:
```
  proveedor: DatosEventualParte | null; // presente si fue con proveedor
}
```
REEMPLAZAR:
```
  proveedor: DatosEventualParte | null; // presente si fue con proveedor
  // Ciclo de vida (TC4). Opcionales: los registros migrados del modelo viejo
  // no los tienen — sin `estado` = 'activo'.
  estado?: 'activo' | 'anulado';        // 'anulado' = su operación cerrada se dio de baja
  anulacion?: AnulacionRegistroOpEventual | null; // solo en 'anulado'
}

/** Anulación de un RegistroOpEventual: baja de su operación cerrada
 *  (OperacionService.bajaOperacionCerrada) — mismo objeto que anula el par
 *  de InformeOp. idEventoPapelera: evento de papelera de la operación. */
export interface AnulacionRegistroOpEventual extends Anulacion {
  idEventoPapelera: string;
}
```

## PASO 2 — src/app/servicios/tarifario/valores-tarifa.service.ts

2.1 BUSCAR:
```
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';
```
REEMPLAZAR:
```
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
```

2.2 BUSCAR:
```
    private choferServ: ChoferService,
    private logRegistro: LogRegistroService,
  ) {}
```
REEMPLAZAR:
```
    private choferServ: ChoferService,
  ) {}
```

2.3 BUSCAR:
```
  // ── Registro histórico de operaciones eventuales (alimenta Historial, Bloque 5b) ──

  /** Best-effort, nunca tira — mismo criterio que LogRegistroService. Hasta
   *  este bloque registrosOpEventuales quedaba siempre vacía: nadie escribía
   *  ahí. Se llama al cerrar, nunca al alta — recién en el cierre existen
   *  los valores finales de la operación eventual. */
  async registrarEventualSiCorresponde(op: ConId<Operacion>): Promise<void> {
    if (op.datosTarifaEventual === null) return;

    const chofer = this.choferServ.getChoferPorId(op.chofer.id);
    const esProveedor = chofer ? chofer.contratacion.tipo === 'proveedor' : op.proveedor !== null;

    const registro: Omit<RegistroOpEventual, 'idTarifa'> = {
      idOperacion: op.idOperacion,
      fecha: toISODateString(new Date()),
      idCliente: op.cliente.id,
      idChofer: op.chofer.id,
      idProveedor: op.proveedor?.id ?? null,
      cliente: { concepto: op.datosTarifaEventual.cliente.concepto, valor: op.datosTarifaEventual.cliente.valor },
      chofer: esProveedor ? null : { concepto: op.datosTarifaEventual.chofer.concepto, valor: op.datosTarifaEventual.chofer.valor },
      proveedor: esProveedor ? { concepto: op.datosTarifaEventual.chofer.concepto, valor: op.datosTarifaEventual.chofer.valor } : null,
    };

    try {
      await this.tarifario.crearRegistroEventual(registro);
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'EDITAR', 'registrosOpEventuales', op.idOperacion,
        `No se pudo registrar la operación eventual ${op.idOperacion}: ${e?.message ?? e}`,
      );
    }
  }
```
REEMPLAZAR:
```
  // ── Registro histórico de operaciones eventuales (pestaña Eventual) ──

  /** Arma el RegistroOpEventual de una operación eventual al CERRARLA (nunca
   *  al alta: recién en el cierre existen los valores finales). null si la
   *  operación no es eventual. No escribe: OperacionService.cerrarOperacion
   *  lo suma a la transacción del cierre
   *  (TarifarioService.agregarEscrituraRegistroEventual). Chofer de
   *  proveedor → el lado chofer de datosTarifaEventual va a `proveedor`. */
  armarRegistroEventual(op: ConId<Operacion>): Omit<RegistroOpEventual, 'idTarifa'> | null {
    if (op.datosTarifaEventual === null) return null;

    const chofer = this.choferServ.getChoferPorId(op.chofer.id);
    const esProveedor = chofer ? chofer.contratacion.tipo === 'proveedor' : op.proveedor !== null;
    const ladoChofer = { concepto: op.datosTarifaEventual.chofer.concepto, valor: op.datosTarifaEventual.chofer.valor };

    return {
      idOperacion: op.idOperacion,
      fecha: toISODateString(new Date()),
      idCliente: op.cliente.id,
      idChofer: op.chofer.id,
      idProveedor: op.proveedor?.id ?? null,
      cliente: { concepto: op.datosTarifaEventual.cliente.concepto, valor: op.datosTarifaEventual.cliente.valor },
      chofer: esProveedor ? null : ladoChofer,
      proveedor: esProveedor ? ladoChofer : null,
      estado: 'activo',
    };
  }
```

## PASO 3 — src/app/servicios/tarifario/tarifario.service.ts

3.1 BUSCAR:
```
import { takeUntil } from 'rxjs/operators';
import { EntidadTipo, Tarifa } from 'src/app/interfaces/tarifa';
```
REEMPLAZAR:
```
import { takeUntil } from 'rxjs/operators';
import { Transaction } from '@angular/fire/firestore';
import { EntidadTipo, Tarifa } from 'src/app/interfaces/tarifa';
```

3.2 BUSCAR:
```
import { RegistroOpEventual } from 'src/app/interfaces/registro-op-eventual';
```
REEMPLAZAR:
```
import { RegistroOpEventual, AnulacionRegistroOpEventual } from 'src/app/interfaces/registro-op-eventual';
```

3.3 BUSCAR:
```
   *  operación eventual (y la migración del historial viejo). */
  getRegistrosEventualesDe(
```
REEMPLAZAR:
```
   *  operación eventual (y la migración del historial viejo). Incluye los
   *  anulados (estado 'anulado'): la pestaña Eventual los muestra marcados. */
  getRegistrosEventualesDe(
```

3.4 BUSCAR:
```
  // ── Escritura — RegistroOpEventual (historial de eventuales, Bloque 6) ──

  /** Crea el registro histórico de una operación eventual — alimenta la
   *  pantalla de Historial de Eventuales (Bloque 5b). Se llama al cerrar la
   *  operación (ValoresTarifaService.registrarEventualSiCorresponde), nunca
   *  al alta: recién en el cierre existen los valores finales. */
  async crearRegistroEventual(registro: Omit<RegistroOpEventual, 'idTarifa'>): Promise<string> {
    const id = this.db.generarId('registrosOpEventuales');
    const escrituras: EscrituraBatch[] = [
      { coleccion: 'registrosOpEventuales', id, data: registro, modo: 'crear' },
    ];
```
REEMPLAZAR:
```
  // ── Escritura — RegistroOpEventual (historial de eventuales) ──

  /** Suma el alta de un RegistroOpEventual a `escrituras` y devuelve su id
   *  (aleatorio: restaurar y volver a cerrar la operación genera un registro
   *  nuevo; el anterior queda 'anulado'). No commitea ni loguea: el caller lo
   *  suma a su batch/transacción con su propio log (cierre:
   *  OperacionService.cerrarOperacion, log CERRAR). Llamar FUERA de un
   *  `armar` de commitEnTransaccion (armar se reejecuta). */
  agregarEscrituraRegistroEventual(escrituras: EscrituraBatch[], registro: Omit<RegistroOpEventual, 'idTarifa'>): string {
    const id = this.db.generarId('registrosOpEventuales');
    escrituras.push({ coleccion: 'registrosOpEventuales', id, data: registro, modo: 'crear' });
    return id;
  }

  /** Ids de los registros NO anulados de una operación (normalmente 0 o 1).
   *  Es una query: llamar FUERA de la transacción (el SDK web no permite
   *  queries adentro) y releer cada uno adentro con
   *  leerRegistroEventualEnTransaccion. */
  async buscarIdsRegistrosEventualesActivos(idOperacion: string): Promise<string[]> {
    const docs = await this.db.getByField<RegistroOpEventual>('registrosOpEventuales', 'idOperacion', idOperacion);
    return docs.filter(d => d.data.estado !== 'anulado').map(d => d.id);
  }

  /** Relectura de un registro dentro de una transacción. Body tal cual está
   *  en Firestore (sin idTarifa). null si no existe. */
  async leerRegistroEventualEnTransaccion(tx: Transaction, id: string): Promise<Omit<RegistroOpEventual, 'idTarifa'> | null> {
    return this.db.leerEnTransaccion<Omit<RegistroOpEventual, 'idTarifa'>>(tx, 'registrosOpEventuales', id);
  }

  /** Suma la anulación de un registro a `escrituras` ('actualizar' solo de
   *  estado + anulacion). No commitea ni loguea (caller:
   *  OperacionService.bajaOperacionCerrada). */
  agregarAnulacionRegistroEventual(escrituras: EscrituraBatch[], id: string, anulacion: AnulacionRegistroOpEventual): void {
    escrituras.push({ coleccion: 'registrosOpEventuales', id, data: { estado: 'anulado', anulacion }, modo: 'actualizar' });
  }

  /** Alta suelta de un registro, con su log ALTA en el mismo batch. Solo la
   *  usa la migración del historial viejo de eventuales
   *  (TarifaMigrationService.confirmarMigracionEventual); el cierre de una
   *  operación escribe el suyo dentro de su propia transacción
   *  (agregarEscrituraRegistroEventual). */
  async crearRegistroEventual(registro: Omit<RegistroOpEventual, 'idTarifa'>): Promise<string> {
    const escrituras: EscrituraBatch[] = [];
    const id = this.agregarEscrituraRegistroEventual(escrituras, registro);
```

## PASO 4 — src/app/servicios/operaciones/operacion.service.ts

4.1 BUSCAR:
```
import { ValoresTarifaService } from 'src/app/servicios/tarifario/valores-tarifa.service';
```
REEMPLAZAR:
```
import { ValoresTarifaService } from 'src/app/servicios/tarifario/valores-tarifa.service';
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
```

4.2 BUSCAR:
```
    private comisionVentaFactory: ComisionVentaFactoryService,
  ) {}
```
REEMPLAZAR:
```
    private comisionVentaFactory: ComisionVentaFactoryService,
    private tarifario:        TarifarioService,
  ) {}
```

4.3 BUSCAR:
```
   *  queda negativo = ajuste en la próxima liquidación). */
  async bajaOperacionCerrada(idInfOp: string, motivo: string): Promise<Resultado<void>> {
    try {
      const numero = await this.db.commitEnTransaccion<number>(async (tx) => {
```
REEMPLAZAR:
```
   *  queda negativo = ajuste en la próxima liquidación).
   *  Operación eventual: sus RegistroOpEventual no anulados quedan 'anulado'
   *  con la misma anulación que los InformeOp (TC4). Se buscan por query
   *  FUERA de la transacción (el SDK web no permite queries adentro): antes
   *  se lee el InformeOp para saber la operación; adentro se valida que siga
   *  siendo la misma y se relee cada registro. */
  async bajaOperacionCerrada(idInfOp: string, motivo: string): Promise<Resultado<void>> {
    try {
      // — Pre-lecturas (query, fuera de la transacción) —
      const informePrevio = await this.informeOpServ.obtenerPorId(idInfOp);
      const idsRegistrosEventuales = informePrevio
        ? await this.tarifario.buscarIdsRegistrosEventualesActivos(informePrevio.idOperacion)
        : [];

      const numero = await this.db.commitEnTransaccion<number>(async (tx) => {
```

4.4 BUSCAR:
```
            `de la operación ${op.numeroOperacion}. Baja abortada.`,
          );
        }
        // — fin de lecturas —
```
REEMPLAZAR:
```
            `de la operación ${op.numeroOperacion}. Baja abortada.`,
          );
        }
        if (informePrevio && informePrevio.idOperacion !== op.idOperacion) {
          throw new Error(`El InformeOp ${idInfOp} cambió de operación mientras se procesaba la baja. Reintentá.`);
        }
        const idsRegistrosAAnular: string[] = [];
        for (const idRegistro of idsRegistrosEventuales) {
          const registro = await this.tarifario.leerRegistroEventualEnTransaccion(tx, idRegistro);
          if (registro && registro.estado !== 'anulado' && registro.idOperacion === op.idOperacion) {
            idsRegistrosAAnular.push(idRegistro);
          }
        }
        // — fin de lecturas —
```

4.5 BUSCAR:
```
        this.informeOpServ.agregarAnulacionInformeOp(escrituras, contraparte.idInfOp, anulacion);
```
REEMPLAZAR:
```
        this.informeOpServ.agregarAnulacionInformeOp(escrituras, contraparte.idInfOp, anulacion);
        for (const idRegistro of idsRegistrosAAnular) {
          this.tarifario.agregarAnulacionRegistroEventual(escrituras, idRegistro, anulacion);
        }
```

4.6 BUSCAR:
```
          detalle += ` — comisiones de venta anuladas: ${escriturasComision.length}`;
        }
```
REEMPLAZAR:
```
          detalle += ` — comisiones de venta anuladas: ${escriturasComision.length}`;
        }
        if (idsRegistrosAAnular.length > 0) {
          detalle += ` — registros de operación eventual anulados: ${idsRegistrosAAnular.join(', ')}`;
        }
```

4.7 BUSCAR:
```
   *  Registrar la tarifa eventual (si corresponde) queda FUERA, después del
   *  commit — best-effort de ValoresTarifaService (registrarEventualSiCorresponde). */
```
REEMPLAZAR:
```
   *  Operación eventual: su RegistroOpEventual
   *  (ValoresTarifaService.armarRegistroEventual) se crea en la MISMA
   *  transacción (TarifarioService.agregarEscrituraRegistroEventual) — si
   *  falla, no se cierra nada. */
```

4.8 BUSCAR:
```
      escriturasNegocio.push(...this.resumenOpFactory.escriturasSuma(op, 1));
```
REEMPLAZAR:
```
      escriturasNegocio.push(...this.resumenOpFactory.escriturasSuma(op, 1));
      const registroEventual = this.valoresTarifaServ.armarRegistroEventual(op);
      const idRegistroEventual = registroEventual
        ? this.tarifario.agregarEscrituraRegistroEventual(escriturasNegocio, registroEventual)
        : null;
      const detalleLog = idRegistroEventual
        ? `${msj} — registro de operación eventual ${idRegistroEventual}`
        : msj;
```

4.9 BUSCAR:
```
        await this.logRegistro.agregarAlBatch(escrituras, 'CERRAR', 'operaciones', op.idOperacion, msj);
```
REEMPLAZAR:
```
        await this.logRegistro.agregarAlBatch(escrituras, 'CERRAR', 'operaciones', op.idOperacion, detalleLog);
```

4.10 BUSCAR:
```
      });

      if (op.datosTarifaEventual !== null) {
        await this.valoresTarifaServ.registrarEventualSiCorresponde(op);
      }

      return { exito: true, mensaje: `Operación ${op.idOperacion} cerrada correctamente.` };
```
REEMPLAZAR:
```
      });

      return { exito: true, mensaje: `Operación ${op.idOperacion} cerrada correctamente.` };
```

## PASO 5 — firestore.rules

5.1 BUSCAR:
```
        'registrosOpEventuales': 'tarifas',
```
REEMPLAZAR:
```
        // Historial de operaciones eventuales: lo escribe el CIERRE de la
        // operación (que hace 'user') en la misma transacción, y lo anula la
        // baja de una operación cerrada → mismo perfil que 'informesOp'.
        'registrosOpEventuales': 'informesOp',
```

## PASO 6 — src/app/servicios/migracion/tarifa-migration.service.ts

6.1 BUSCAR:
```
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
```
REEMPLAZAR:
```
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
```

6.2 BUSCAR:
```
  private tarifario = inject(TarifarioService);
  private db = inject(DbFirestoreService);
```
REEMPLAZAR:
```
  private tarifario = inject(TarifarioService);
```

6.3 BUSCAR:
```
export interface ItemHuerfanoEventual {
  id: string;
  idOperacion: string;
  resumen: string;
}

export interface ResultadoAuditoriaHuerfanosEventual {
  total: number;
  huerfanos: ItemHuerfanoEventual[];
}

export interface ItemHistorialGeneral {
```
REEMPLAZAR:
```
export interface ItemHistorialGeneral {
```

6.4 BUSCAR:
```
  /** Auditoría de solo lectura de `registrosOpEventuales`. Separa los
   *  registros que vienen de `confirmarMigracionEventual()` (`idOperacion`
   *  numérico — id viejo de `tarifasEventuales`, ver previsualización de
   *  arriba) de cualquier otro que haya quedado de probar el cierre real de
   *  una operación tipo Eventual (`idOperacion` ahí es el id de Firestore
   *  de esa operación — nunca puramente numérico, porque `generarId()` usa
   *  el auto-id de Firestore, no un timestamp). No borra nada. */
  async auditarRegistrosOpEventualesHuerfanos(): Promise<ResultadoAuditoriaHuerfanosEventual> {
    const snap = await getDocs(collection(this.firestore, '/Vantruck/datos/registrosOpEventuales'));
    const huerfanos: ItemHuerfanoEventual[] = [];

    snap.docs.forEach(d => {
      const datos = d.data() as any;
      const idOperacion = String(datos.idOperacion ?? '');
      const esIdMigrado = /^\d+$/.test(idOperacion);
      if (!esIdMigrado) {
        huerfanos.push({
          id: d.id,
          idOperacion,
          resumen: `idOperacion "${idOperacion}" (no viene de la migración) — idCliente ${datos.idCliente ?? '?'} — fecha ${datos.fecha ?? '?'}`,
        });
      }
    });

    return { total: snap.size, huerfanos };
  }

  /** Borra los `registrosOpEventuales` ya identificados como huérfanos por
   *  `auditarRegistrosOpEventualesHuerfanos()`. Recibe la lista exacta de
   *  ids a borrar (nunca decide por su cuenta) para no arriesgar los
   *  registros migrados si algo cambió entre la auditoría y la
   *  confirmación. */
  async borrarRegistrosOpEventualesHuerfanos(ids: string[]): Promise<void> {
    const escrituras: EscrituraBatch[] = ids.map(id => ({
      coleccion: 'registrosOpEventuales',
      id,
      data: null,
      modo: 'eliminar' as const,
    }));
    await this.db.commitBatch(escrituras);
  }

  /** Volcado de solo lectura del historial viejo de Tarifa General — junta
```
REEMPLAZAR:
```
  /** Volcado de solo lectura del historial viejo de Tarifa General — junta
```

## PASO 7 — src/app/componentes/migracion/migracion.component.ts

7.1 BUSCAR:
```
import { TarifaMigrationService, ItemPreviewEventual, ItemHuerfanoEventual, ItemHistorialGeneral } from 'src/app/servicios/migracion/tarifa-migration.service';
```
REEMPLAZAR:
```
import { TarifaMigrationService, ItemPreviewEventual, ItemHistorialGeneral } from 'src/app/servicios/migracion/tarifa-migration.service';
```

7.2 BUSCAR:
```
  estadoAuditoriaHuerfanosEventual: string = '';
  huerfanosEventual: ItemHuerfanoEventual[] = [];
  private idsHuerfanosEventualParaBorrar: string[] = [];

  estadoVolcadoGeneral: string = '';
```
REEMPLAZAR:
```
  estadoVolcadoGeneral: string = '';
```

7.3 BUSCAR:
```
  async auditarRegistrosOpEventualesHuerfanos(): Promise<void> {
    this.ejecutando = true;
    this.estadoAuditoriaHuerfanosEventual = 'Auditando registrosOpEventuales...';
    this.huerfanosEventual = [];
    this.idsHuerfanosEventualParaBorrar = [];
    try {
      const resultado = await this.tarifaMigration.auditarRegistrosOpEventualesHuerfanos();
      this.huerfanosEventual = resultado.huerfanos;
      this.idsHuerfanosEventualParaBorrar = resultado.huerfanos.map(h => h.id);
      this.estadoAuditoriaHuerfanosEventual = `Total registrosOpEventuales: ${resultado.total} — huérfanos (de pruebas): ${resultado.huerfanos.length}.`;
      console.log('Auditoría de registrosOpEventuales huérfanos', resultado);
    } catch (e: any) {
      this.estadoAuditoriaHuerfanosEventual = `Error: ${e.message}`;
      console.error('Error en auditoría de registrosOpEventuales huérfanos:', e);
    } finally {
      this.ejecutando = false;
    }
  }

  async borrarRegistrosOpEventualesHuerfanos(): Promise<void> {
    if (this.idsHuerfanosEventualParaBorrar.length === 0) {
      this.estadoAuditoriaHuerfanosEventual = 'No hay huérfanos para borrar — corré primero la auditoría.';
      return;
    }

    const confirmacion = await Swal.fire({
      icon: 'warning',
      title: '¿Borrar registrosOpEventuales huérfanos?',
      text: `Se van a borrar ${this.idsHuerfanosEventualParaBorrar.length} documento(s). Esta acción no se puede deshacer.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, borrar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirmacion.isConfirmed) return;

    this.ejecutando = true;
    this.estadoAuditoriaHuerfanosEventual = 'Borrando...';
    try {
      await this.tarifaMigration.borrarRegistrosOpEventualesHuerfanos(this.idsHuerfanosEventualParaBorrar);
      this.estadoAuditoriaHuerfanosEventual = `✅ ${this.idsHuerfanosEventualParaBorrar.length} documento(s) borrado(s) correctamente.`;
      this.huerfanosEventual = [];
      this.idsHuerfanosEventualParaBorrar = [];
    } catch (e: any) {
      this.estadoAuditoriaHuerfanosEventual = `Error: ${e.message}`;
      console.error('Error al borrar registrosOpEventuales huérfanos:', e);
    } finally {
      this.ejecutando = false;
    }
  }

  async volcarHistorialGeneral(): Promise<void> {
```
REEMPLAZAR:
```
  async volcarHistorialGeneral(): Promise<void> {
```

## PASO 8 — src/app/componentes/migracion/migracion.component.html

8.1 BUSCAR:
```
  <div style="margin-bottom: 2rem; border-top: 1px solid #ccc; padding-top: 1rem;">
    <h4>Limpieza de registrosOpEventuales de prueba (demo)</h4>
    <div style="margin-bottom: 1rem;">
      <button
        (click)="auditarRegistrosOpEventualesHuerfanos()"
        [disabled]="ejecutando"
        class="btn btn-info me-2">
        Auditar registrosOpEventuales huérfanos
      </button>
      <button
        (click)="borrarRegistrosOpEventualesHuerfanos()"
        [disabled]="ejecutando || huerfanosEventual.length === 0"
        class="btn btn-danger me-2">
        Borrar huérfanos
      </button>
      <p *ngIf="estadoAuditoriaHuerfanosEventual" style="margin-top: 0.5rem;">{{ estadoAuditoriaHuerfanosEventual }}</p>
      <div *ngIf="huerfanosEventual.length > 0" style="margin-top: 0.5rem;">
        <ul>
          <li *ngFor="let h of huerfanosEventual">{{ h.resumen }}</li>
        </ul>
      </div>
    </div>
  </div>

  <div style="margin-bottom: 2rem; border-top: 1px solid #ccc; padding-top: 1rem;">
    <h4>Volcado histórico de Tarifa General (para migración manual)</h4>
```
REEMPLAZAR:
```
  <div style="margin-bottom: 2rem; border-top: 1px solid #ccc; padding-top: 1rem;">
    <h4>Volcado histórico de Tarifa General (para migración manual)</h4>
```

## PASO 9 — src/app/raiz/tarifas/tarifas-eventual/tarifas-eventual.component.html

9.1 BUSCAR:
```
            @for (r of registros; track r) {
              <tr>
                <td>{{ r.fecha | date:'dd/MM/yyyy' }}</td>
```
REEMPLAZAR:
```
            @for (r of registros; track r) {
              <tr [class.opacity-50]="r.estado === 'anulado'">
                <td>
                  {{ r.fecha | date:'dd/MM/yyyy' }}
                  @if (r.estado === 'anulado') {
                    <span class="badge bg-secondary ms-1" [title]="'Operación dada de baja — motivo: ' + (r.anulacion?.motivo ?? '-')">Anulado</span>
                  }
                </td>
```

9.2 BUSCAR:
```
                <td>
                  <button class="btn btn-sm btn-outline-primary" (click)="verDetalle(r)">Ver operación</button>
                </td>
```
REEMPLAZAR:
```
                <td>
                  @if (r.estado !== 'anulado') {
                    <button class="btn btn-sm btn-outline-primary" (click)="verDetalle(r)">Ver operación</button>
                  }
                </td>
```

## Verificación

1. `grep -rn "registrarEventualSiCorresponde" src/` → sin resultados.
2. `grep -rni "huerfano" src/` → sin resultados.
3. `grep -c "'registrosOpEventuales': 'informesOp'," firestore.rules` → 1.
4. `grep -c "this.tarifario.agregarEscrituraRegistroEventual(" src/app/servicios/operaciones/operacion.service.ts` → 1.
5. `grep -c "this.tarifario.agregarAnulacionRegistroEventual(" src/app/servicios/operaciones/operacion.service.ts` → 1.
6. `grep -c "logRegistro" src/app/servicios/tarifario/valores-tarifa.service.ts` → 0.
7. `grep -c "DbFirestoreService" src/app/servicios/migracion/tarifa-migration.service.ts` → 0.
8. `npm run build:demo` sin errores nuevos.
9. Mostrá el diff completo de los 9 archivos.

## Pruebas manuales (demo)

ANTES: nico deploya las reglas a demo (`firebase deploy --only
firestore:rules --project demo`). Sin eso, la prueba 2 falla con 'user'.

1. Cerrar (admin) una operación con tarifa eventual → Tarifas → Eventual,
   elegir el cliente: aparece el registro nuevo, sin badge. Ajustes →
   Registro: el log CERRAR dice "— registro de operación eventual <id>" y
   NO hay un log ALTA aparte de registrosOpEventuales.
2. Lo mismo con un usuario 'user': el cierre funciona y crea el registro
   (antes quedaba sin registro).
3. Cerrar una operación NO eventual: log CERRAR sin la mención; no se crea
   registro.
4. Liquidación → dar de baja la operación cerrada del punto 1 → en la
   pestaña Eventual el registro queda atenuado, con badge "Anulado" (tooltip
   con el motivo) y sin botón "Ver operación". Log BAJA: "— registros de
   operación eventual anulados: <id>".
5. Restaurar esa operación desde papelera y volver a cerrarla → aparece un
   registro NUEVO activo; el anterior sigue anulado.
6. Baja de cerrada de una operación NO eventual: igual que antes, sin
   mención de registros en el log.
7. /migracion: la sección "Limpieza de registrosOpEventuales de prueba" ya no
   está; la migración de Eventual y el volcado de General siguen igual.

## Mensaje de commit

refactor(tarifas): RegistroOpEventual en la transacción del cierre y anulado en la baja (TC4)

- RegistroOpEventual: estado ('activo' | 'anulado') + anulacion
  (AnulacionRegistroOpEventual), opcionales.
- Cierre: ValoresTarifaService.armarRegistroEventual (puro) +
  TarifarioService.agregarEscrituraRegistroEventual dentro de la
  transacción de cerrarOperacion; se retira registrarEventualSiCorresponde
  (best-effort post-commit).
- bajaOperacionCerrada: busca los registros por idOperacion fuera de la
  transacción, los relee adentro y los anula con la misma anulación que los
  InformeOp.
- firestore.rules: registrosOpEventuales → módulo informesOp ('user' cierra).
- /migracion: retirada la auditoría/borrado de registros "huérfanos".
- Pestaña Eventual: anulados atenuados con badge y sin "Ver operación".

FIN DE LA INSTRUCCIÓN TC4
````
