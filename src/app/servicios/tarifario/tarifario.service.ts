import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EntidadTipo, Tarifa } from 'src/app/interfaces/tarifa';
import { TarifaEspecial } from 'src/app/interfaces/tarifa-especial';
import { RegistroOpEventual } from 'src/app/interfaces/registro-op-eventual';
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
   *  múltiples activas por diseño. Sin consumidor todavía (Bloque 4). */
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
   *  configuración vigente). Sin escritura todavía — el registro se crea al
   *  cerrar la operación, Bloque 6/7; hasta entonces esto siempre devuelve
   *  vacío. */
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

  /** Nueva versión de una tarifa existente: crea documento nuevo, desactiva el
   *  anterior — transaccional (DbFirestoreService.reemplazarConVersionNueva),
   *  no un batch ciego: relee 'anterior' fresco del server al momento de
   *  escribir y aborta si ya no está activo, en vez de confiar en el estado
   *  local cacheado como antes — eso es lo que podía generar una bifurcación
   *  de versionAnteriorId si dos ediciones caían casi al mismo tiempo (ver
   *  comentario en reemplazarConVersionNueva). El documento anterior NUNCA se
   *  toca en sus campos de valor (operaciones en curso pueden seguir
   *  referenciándolo). Devuelve el id nuevo — el caller es responsable de
   *  actualizar cualquier referencia que deba apuntar a la versión vigente
   *  (personalizada/especial: la entidad dueña; general: no aplica, se
   *  resuelve siempre vía getTarifaGeneralVigente()). */
  async nuevaVersionTarifa(idAnterior: string, tarifaNueva: Omit<Tarifa, 'idTarifa'>): Promise<string> {
    const idNuevo = this.db.generarId('tarifas');
    try {
      await this.db.reemplazarConVersionNueva('tarifas', idAnterior, idNuevo, this.toFirestoreTarifa(tarifaNueva));
    } catch (e: any) {
      await this.logRegistro.registrarError('EDITAR', 'tarifas', idNuevo, `Error: ${e?.message ?? e}`);
      throw e;
    }
    // Log fuera de la transacción — mismo criterio best-effort que
    // registrarAccion/registrarMutacionSuelta: es auditoría, no debe poder
    // tumbar el guardado real si falla (y agregarAlBatch tampoco aplicaba acá:
    // diffeaba contra 'tarifas/idNuevo', que todavía no existía al armar el
    // batch, así que nunca calculó un diff real para este caso puntual).
    await this.logRegistro.registrarMutacionSuelta(
      'EDITAR', 'tarifas', idNuevo, `Nueva versión de tarifa ${tarifaNueva.nombre} (reemplaza ${idAnterior})`,
    );
    return idNuevo;
  }

  /** Baja definitiva sin reemplazo: pone activo=false directo, sin crear ninguna
   *  versión nueva — para cuando una tarifa deja de tener validez porque la
   *  entidad cambió de modoTarifacion (categoría↔km) y por eso se cargó con
   *  crearTarifa() en vez de versionarse (nuevaVersionTarifa() solo aplica
   *  dentro del mismo linaje). No hace falta transacción: a diferencia de
   *  nuevaVersionTarifa(), acá no se crea ningún documento nuevo que dependa
   *  de que 'anterior' siga vigente — el peor caso de una carrera con una
   *  nuevaVersionTarifa() concurrente sobre la misma tarifa es que esa
   *  transacción relea activo=false y aborte con su propio error (correcto:
   *  ya no correspondía versionarla). Irreversible por diseño — no hay
   *  reactivar: si hace falta volver al modo anterior, se carga una tarifa
   *  nueva. */
  async darDeBajaTarifa(idTarifa: string, actualizadoPor: string): Promise<void> {
    const data = { activo: false, fechaActualizacion: toISODateString(new Date()), actualizadoPor };
    try {
      await this.db.update('tarifas', data, idTarifa);
    } catch (e: any) {
      await this.logRegistro.registrarError('EDITAR', 'tarifas', idTarifa, `Error al dar de baja: ${e?.message ?? e}`);
      throw e;
    }
    await this.logRegistro.registrarMutacionSuelta('EDITAR', 'tarifas', idTarifa, 'Baja de tarifa sin reemplazo');
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
    const idNuevo = this.db.generarId('tarifasEspeciales');
    try {
      await this.db.reemplazarConVersionNueva('tarifasEspeciales', idAnterior, idNuevo, this.toFirestoreTarifaEspecial(tarifaNueva));
    } catch (e: any) {
      await this.logRegistro.registrarError('EDITAR', 'tarifasEspeciales', idNuevo, `Error: ${e?.message ?? e}`);
      throw e;
    }
    await this.logRegistro.registrarMutacionSuelta(
      'EDITAR', 'tarifasEspeciales', idNuevo, `Nueva versión de tarifa especial ${tarifaNueva.nombre} (reemplaza ${idAnterior})`,
    );
    return idNuevo;
  }

  async darDeBajaTarifaEspecial(idTarifa: string, actualizadoPor: string): Promise<void> {
    const data = { activo: false, fechaActualizacion: toISODateString(new Date()), actualizadoPor };
    try {
      await this.db.update('tarifasEspeciales', data, idTarifa);
    } catch (e: any) {
      await this.logRegistro.registrarError('EDITAR', 'tarifasEspeciales', idTarifa, `Error al dar de baja: ${e?.message ?? e}`);
      throw e;
    }
    await this.logRegistro.registrarMutacionSuelta('EDITAR', 'tarifasEspeciales', idTarifa, 'Baja de tarifa especial sin reemplazo');
  }

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
