import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Transaction } from '@angular/fire/firestore';
import { EntidadTipo, Tarifa } from 'src/app/interfaces/tarifa';
import { TarifaEspecial } from 'src/app/interfaces/tarifa-especial';
import { RegistroOpEventual, AnulacionRegistroOpEventual } from 'src/app/interfaces/registro-op-eventual';
import { ConIdType } from 'src/app/interfaces/conId';
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';

@Injectable({ providedIn: 'root' })
export class TarifarioService implements OnDestroy {

  private _tarifas$ = new BehaviorSubject<ConIdType<Tarifa>[]>([]);
  public tarifas$ = this._tarifas$.asObservable();

  private _tarifasEspeciales$ = new BehaviorSubject<ConIdType<TarifaEspecial>[]>([]);
  public tarifasEspeciales$ = this._tarifasEspeciales$.asObservable();

  private _registrosEventuales$ = new BehaviorSubject<ConIdType<RegistroOpEventual>[]>([]);
  public registrosEventuales$ = this._registrosEventuales$.asObservable();

  private destroy$ = new Subject<void>();

  constructor(
    private db: DbFirestoreService,
    private logRegistro: LogRegistroService,
  ) {}

  init(): void {
    this.db.getAllStateChanges<Tarifa>('tarifas')
      .pipe(takeUntil(this.destroy$))
      .subscribe(changes => {
        let current = this._tarifas$.getValue();
        changes.forEach(change => {
          const { type, ...dato } = change;
          const tarifa = { ...dato, idTarifa: dato.id } as ConIdType<Tarifa>;
          if (type === 'added' && !current.some(t => t.idTarifa === tarifa.idTarifa)) {
            current = [...current, tarifa];
          } else if (type === 'modified') {
            current = current.map(t => t.idTarifa === tarifa.idTarifa ? tarifa : t);
          } else if (type === 'removed') {
            current = current.filter(t => t.idTarifa !== tarifa.idTarifa);
          }
        });
        this._tarifas$.next(current);
      });

    this.db.getAllStateChanges<TarifaEspecial>('tarifasEspeciales')
      .pipe(takeUntil(this.destroy$))
      .subscribe(changes => {
        let current = this._tarifasEspeciales$.getValue();
        changes.forEach(change => {
          const { type, ...dato } = change;
          const tarifa = { ...dato, idTarifa: dato.id } as ConIdType<TarifaEspecial>;
          if (type === 'added' && !current.some(t => t.idTarifa === tarifa.idTarifa)) {
            current = [...current, tarifa];
          } else if (type === 'modified') {
            current = current.map(t => t.idTarifa === tarifa.idTarifa ? tarifa : t);
          } else if (type === 'removed') {
            current = current.filter(t => t.idTarifa !== tarifa.idTarifa);
          }
        });
        this._tarifasEspeciales$.next(current);
      });

    this.db.getAllStateChanges<RegistroOpEventual>('registrosOpEventuales')
      .pipe(takeUntil(this.destroy$))
      .subscribe(changes => {
        let current = this._registrosEventuales$.getValue();
        changes.forEach(change => {
          const { type, ...dato } = change;
          const registro = { ...dato, idTarifa: dato.id } as ConIdType<RegistroOpEventual>;
          if (type === 'added' && !current.some(r => r.idTarifa === registro.idTarifa)) {
            current = [...current, registro];
          } else if (type === 'modified') {
            current = current.map(r => r.idTarifa === registro.idTarifa ? registro : r);
          } else if (type === 'removed') {
            current = current.filter(r => r.idTarifa !== registro.idTarifa);
          }
        });
        this._registrosEventuales$.next(current);
      });
  }

  // ── Lectura ──────────────────────────────────────────────────────

  getTarifasActuales(): ConIdType<Tarifa>[] {
    return this._tarifas$.getValue();
  }

  getTarifaPorId(id: string): ConIdType<Tarifa> | undefined {
    return this.getTarifasActuales().find(t => t.idTarifa === id);
  }

  /** La tarifa general es singleton — esta es LA forma de resolverla, nunca por id
   *  cacheado en una entidad (RefTarifaHabilitada.general no lleva idTarifa). */
  getTarifaGeneralVigente(): ConIdType<Tarifa> | undefined {
    return this.getTarifasActuales().find(t => t.nivel === 'general' && t.activo);
  }

  getTarifasEspecialesActuales(): ConIdType<TarifaEspecial>[] {
    return this._tarifasEspeciales$.getValue();
  }

  getTarifaEspecialPorId(id: string): ConIdType<TarifaEspecial> | undefined {
    return this.getTarifasEspecialesActuales().find(t => t.idTarifa === id);
  }

  /** Tarifas personalizadas vigentes de una entidad — puede haber más de una
   *  simultánea (ej. una por categoría y otra por km). Reemplaza el patrón de
   *  idTarifa cacheado en RefTarifaHabilitada, que no podía representar esa
   *  multiplicidad. */
  getTarifasPersonalizadasVigentes(idEntidadDueño: string): ConIdType<Tarifa>[] {
    return this.getTarifasActuales().filter(
      t => t.nivel === 'personalizada' && t.idEntidadDueño === idEntidadDueño && t.activo,
    );
  }

  /** Tarifas especiales vigentes de una entidad — misma razón que arriba, con
   *  más motivo: el alcance ('entidad' vs 'entidadCliente') ya habilita
   *  múltiples activas por diseño. */
  getTarifasEspecialesVigentes(idEntidadDueño: string): ConIdType<TarifaEspecial>[] {
    return this.getTarifasEspecialesActuales().filter(
      t => t.idEntidadDueño === idEntidadDueño && t.activo,
    );
  }

  getRegistrosEventualesActuales(): ConIdType<RegistroOpEventual>[] {
    return this._registrosEventuales$.getValue();
  }

  /** Registros eventuales de una entidad — cualquier entidad puede tener
   *  operaciones eventuales en su historial sin importar su
   *  tarifasHabilitadas actual (es historial de operación, no depende de la
   *  configuración vigente). Los registros los crea el cierre de una
   *  operación eventual (y la migración del historial viejo). Incluye los
   *  anulados (estado 'anulado'): la pestaña Eventual los muestra marcados. */
  getRegistrosEventualesDe(entidadTipo: EntidadTipo, idEntidad: string): ConIdType<RegistroOpEventual>[] {
    return this.getRegistrosEventualesActuales()
      .filter(r => {
        if (entidadTipo === 'cliente') return r.idCliente === idEntidad;
        if (entidadTipo === 'chofer') return r.idChofer === idEntidad;
        return r.idProveedor === idEntidad;
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  // ── Escritura — Tarifa (general/personalizada) ──────────────────

  private toFirestoreTarifa(tarifa: Omit<Tarifa, 'idTarifa'>): any {
    return tarifa;
  }

  /** Primera versión. Para 'general', valida que no haya ya una activa — para
   *  reemplazarla usar nuevaVersionTarifa(), nunca crear una segunda. */
  async crearTarifa(tarifa: Omit<Tarifa, 'idTarifa'>): Promise<string> {
    if (tarifa.nivel === 'general' && this.getTarifaGeneralVigente()) {
      throw new Error('Ya existe una tarifa general activa — usar nuevaVersionTarifa() para reemplazarla.');
    }
    const id = this.db.generarId('tarifas');
    const escrituras: EscrituraBatch[] = [
      { coleccion: 'tarifas', id, data: this.toFirestoreTarifa(tarifa), modo: 'crear' },
    ];
    await this.logRegistro.agregarAlBatch(escrituras, 'ALTA', 'tarifas', id, `Alta de tarifa ${tarifa.nombre}`);
    try {
      await this.db.commitBatch(escrituras);
      return id;
    } catch (e: any) {
      await this.logRegistro.registrarError('ALTA', 'tarifas', id, `Error: ${e?.message ?? e}`);
      throw e;
    }
  }

  /** Nueva versión de una tarifa existente (append-only): crea el documento
   *  nuevo y desactiva el anterior en UNA transacción (commitEnTransaccion),
   *  con el log adentro. Relee 'anterior' fresco del server y aborta si ya no
   *  está activo — protege contra la bifurcación de versionAnteriorId cuando
   *  dos ediciones de la misma tarifa caen casi al mismo tiempo (el SDK
   *  reintenta la transacción si hay escritura concurrente sobre el mismo
   *  documento). El documento anterior NUNCA se toca en sus campos de valor
   *  (operaciones en curso pueden seguir referenciándolo): solo activo=false
   *  y fechaActualizacion = vigenciaDesde de la nueva (el instante en que una
   *  deja de aplicar es el mismo en que empieza la otra). El log diffea la
   *  versión nueva contra la anterior. Devuelve el id nuevo. */
  async nuevaVersionTarifa(idAnterior: string, tarifaNueva: Omit<Tarifa, 'idTarifa'>): Promise<string> {
    return this.versionarEnTransaccion(
      'tarifas', idAnterior, this.toFirestoreTarifa(tarifaNueva),
      `Nueva versión de tarifa ${tarifaNueva.nombre} (reemplaza ${idAnterior})`,
    );
  }

  /** Baja definitiva sin reemplazo (activo=false, sin versión nueva) — para
   *  cuando una tarifa deja de tener validez porque la entidad cambió de
   *  modoTarifacion (categoría↔km) y la nueva se cargó con crearTarifa().
   *  Transacción con log adentro: relee la tarifa y aborta si ya no está
   *  activa (dada de baja o reemplazada por otra persona). Irreversible por
   *  diseño — no hay reactivar: si hace falta volver, se carga una tarifa
   *  nueva. */
  async darDeBajaTarifa(idTarifa: string, actualizadoPor: string): Promise<void> {
    await this.darDeBajaEnTransaccion('tarifas', idTarifa, actualizadoPor, 'Baja de tarifa sin reemplazo');
  }

  // ── Escritura — piezas comunes de versionado/baja (Tarifa y TarifaEspecial) ──

  /** Versionado transaccional compartido por nuevaVersionTarifa y
   *  nuevaVersionTarifaEspecial (TC3 — reemplaza a
   *  DbFirestoreService.reemplazarConVersionNueva, que dejaba el log afuera,
   *  best-effort). `armar` es puro y re-ejecutable: solo lee 'anterior' y
   *  arma las escrituras; idNuevo se genera una sola vez afuera. */
  private async versionarEnTransaccion(
    coleccion: 'tarifas' | 'tarifasEspeciales',
    idAnterior: string,
    dataNueva: any,
    detalleLog: string,
  ): Promise<string> {
    const idNuevo = this.db.generarId(coleccion);
    try {
      await this.db.commitEnTransaccion<void>(async (tx) => {
        const anterior = await this.db.leerEnTransaccion<any>(tx, coleccion, idAnterior);
        if (!anterior) {
          throw new Error(`No se encontró la tarifa ${idAnterior} para versionar.`);
        }
        if (anterior.activo === false) {
          throw new Error('Esta tarifa ya fue actualizada por otra persona mientras la estabas editando. Recargá la página para ver la versión vigente antes de volver a guardar.');
        }
        // — fin de lecturas —

        const escrituras: EscrituraBatch[] = [
          { coleccion, id: idNuevo, data: dataNueva, modo: 'crear' },
          {
            coleccion, id: idAnterior, modo: 'actualizar',
            data: { activo: false, fechaActualizacion: dataNueva.vigenciaDesde },
          },
        ];
        // `anterior` explícito: diff de la versión nueva contra la anterior,
        // sin lectura extra fuera de la transacción.
        await this.logRegistro.agregarAlBatch(escrituras, 'EDITAR', coleccion, idNuevo, detalleLog, anterior);
        return { escrituras, resultado: undefined };
      });
      return idNuevo;
    } catch (e: any) {
      await this.logRegistro.registrarError('EDITAR', coleccion, idNuevo, `Error: ${e?.message ?? e}`);
      throw e;
    }
  }

  /** Baja sin reemplazo compartida por darDeBajaTarifa y
   *  darDeBajaTarifaEspecial (TC3). Log BAJA en la misma transacción. */
  private async darDeBajaEnTransaccion(
    coleccion: 'tarifas' | 'tarifasEspeciales',
    idTarifa: string,
    actualizadoPor: string,
    detalleLog: string,
  ): Promise<void> {
    try {
      await this.db.commitEnTransaccion<void>(async (tx) => {
        const actual = await this.db.leerEnTransaccion<any>(tx, coleccion, idTarifa);
        if (!actual) {
          throw new Error(`No se encontró la tarifa ${idTarifa}.`);
        }
        if (actual.activo === false) {
          throw new Error('Esta tarifa ya no está vigente (fue dada de baja o reemplazada por otra persona). Recargá la página.');
        }
        // — fin de lecturas —

        const escrituras: EscrituraBatch[] = [
          {
            coleccion, id: idTarifa, modo: 'actualizar',
            data: { activo: false, fechaActualizacion: toISODateString(new Date()), actualizadoPor },
          },
        ];
        await this.logRegistro.agregarAlBatch(escrituras, 'BAJA', coleccion, idTarifa, detalleLog);
        return { escrituras, resultado: undefined };
      });
    } catch (e: any) {
      await this.logRegistro.registrarError('BAJA', coleccion, idTarifa, `Error al dar de baja: ${e?.message ?? e}`);
      throw e;
    }
  }

  // ── Escritura — TarifaEspecial (mismo patrón, colección 'tarifasEspeciales') ────

  private toFirestoreTarifaEspecial(tarifa: Omit<TarifaEspecial, 'idTarifa'>): any {
    return tarifa;
  }

  async crearTarifaEspecial(tarifa: Omit<TarifaEspecial, 'idTarifa'>): Promise<string> {
    const id = this.db.generarId('tarifasEspeciales');
    const escrituras: EscrituraBatch[] = [
      { coleccion: 'tarifasEspeciales', id, data: this.toFirestoreTarifaEspecial(tarifa), modo: 'crear' },
    ];
    await this.logRegistro.agregarAlBatch(escrituras, 'ALTA', 'tarifasEspeciales', id, `Alta de tarifa especial ${tarifa.nombre}`);
    try {
      await this.db.commitBatch(escrituras);
      return id;
    } catch (e: any) {
      await this.logRegistro.registrarError('ALTA', 'tarifasEspeciales', id, `Error: ${e?.message ?? e}`);
      throw e;
    }
  }

  async nuevaVersionTarifaEspecial(idAnterior: string, tarifaNueva: Omit<TarifaEspecial, 'idTarifa'>): Promise<string> {
    return this.versionarEnTransaccion(
      'tarifasEspeciales', idAnterior, this.toFirestoreTarifaEspecial(tarifaNueva),
      `Nueva versión de tarifa especial ${tarifaNueva.nombre} (reemplaza ${idAnterior})`,
    );
  }

  async darDeBajaTarifaEspecial(idTarifa: string, actualizadoPor: string): Promise<void> {
    await this.darDeBajaEnTransaccion('tarifasEspeciales', idTarifa, actualizadoPor, 'Baja de tarifa especial sin reemplazo');
  }

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
    await this.logRegistro.agregarAlBatch(
      escrituras, 'ALTA', 'registrosOpEventuales', id,
      `Registro de operación eventual ${registro.idOperacion} — cliente ${registro.idCliente}, chofer ${registro.idChofer}`,
    );
    try {
      await this.db.commitBatch(escrituras);
      return id;
    } catch (e: any) {
      await this.logRegistro.registrarError('ALTA', 'registrosOpEventuales', id, `Error: ${e?.message ?? e}`);
      throw e;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
