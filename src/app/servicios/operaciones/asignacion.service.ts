import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, firstValueFrom, merge, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Asignacion, AsignacionItem, EstadoAsignacion } from 'src/app/interfaces/asignacion';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { LogService } from 'src/app/servicios/log/log.service';

interface BorradorEnCurso {
  fecha: string;
  items: AsignacionItem[];
}

@Injectable({ providedIn: 'root' })
export class AsignacionService implements OnDestroy {

  private readonly COLECCION = 'asignaciones';

  private _asignacion$ = new BehaviorSubject<Asignacion | null>(null);
  public  asignacion$  = this._asignacion$.asObservable();

  private destroy$       = new Subject<void>();
  private cancelarFecha$ = new Subject<void>();

  private _borradorEnCurso: BorradorEnCurso | null = null;

  constructor(
    private db:         DbFirestoreService,
    private logService: LogService,
  ) {}

  // ---- Lectura / estado ----

  getAsignacionActual(): Asignacion | null {
    return this._asignacion$.getValue();
  }

  /** Abre listener vivo sobre el documento de la fecha. Cancela el listener anterior. */
  cargarFecha(fecha: string): void {
    this.cancelarFecha$.next();
    this.db.getDocObservable<Asignacion>(this.COLECCION, fecha)
      .pipe(takeUntil(merge(this.destroy$, this.cancelarFecha$)))
      .subscribe(data => {
        this._asignacion$.next(data ? { ...data, idAsignacion: fecha } : null);
      });
  }

  /** Lectura puntual one-shot (para callers externos vía fachada). */
  async getTableroPorFecha(fecha: string): Promise<Asignacion | null> {
    const data = await firstValueFrom(
      this.db.getDocObservable<Asignacion>(this.COLECCION, fecha)
    );
    return data ? { ...data, idAsignacion: fecha } : null;
  }

  /** Indica si existe un tablero para la fecha que aún no fue confirmado (asignado:false). */
  async existeBorradorSinConfirmar(fecha: string): Promise<boolean> {
    const actual = await this.getTableroPorFecha(fecha);
    return actual !== null && actual.asignado === false;
  }

  // ---- Confirmación (NO persiste; arma para el batch del coordinador) ----

  /** Construye la Asignacion lista para persistir con asignado:true. NO escribe. */
  confirmarTablero(fecha: string, items: AsignacionItem[]): Asignacion {
    return {
      idAsignacion: fecha,
      fecha,
      asignado:  true,
      timestamp: Date.now(),
      items,
    };
  }

  // ---- Escrituras directas (informan al log) ----

  /** Guarda/actualiza un borrador (asignado:false). Acción de log: ALTA. */
  async guardarBorrador(fecha: string, items: AsignacionItem[]): Promise<void> {
    const asignacion: Asignacion = {
      idAsignacion: fecha, fecha, asignado: false, timestamp: Date.now(), items,
    };
    try {
      await this.db.setDocSinId(this.COLECCION, fecha, this.toFirestore(asignacion));
      this.registrarLog('ALTA', `Borrador de tablero ${fecha} guardado`, fecha, true);
    } catch (e) {
      this.registrarLog('ALTA', `Error al guardar borrador ${fecha}`, fecha, false);
      throw e;
    }
  }

  /** Agrega un item a un tablero existente; si no existe, lo crea. Log: EDITAR. */
  async agregarItem(fecha: string, item: AsignacionItem): Promise<void> {
    const actual = await this.getTableroPorFecha(fecha);
    const asignacion: Asignacion = actual
      ? { ...actual, items: [...actual.items, item], timestamp: Date.now() }
      : { idAsignacion: fecha, fecha, asignado: true, timestamp: Date.now(), items: [item] };
    try {
      await this.db.setDocSinId(this.COLECCION, fecha, this.toFirestore(asignacion));
      this.registrarLog('EDITAR', `Item agregado al tablero ${fecha}`, fecha, true);
    } catch (e) {
      this.registrarLog('EDITAR', `Error al agregar item al tablero ${fecha}`, fecha, false);
      throw e;
    }
  }

  /** Marca un item como anulado por idOperacion. NUNCA filtra ni borra. Log: EDITAR. */
  async marcarItemAnulado(fecha: string, idOperacion: string, motivo: string): Promise<void> {
    // TODO: refactor Log — si esta anulación es parte de una baja de op atómica
    // (batch que también elimina informes y mueve la op a papelera), el log debería
    // emitirse UNA sola vez en el coordinador de la baja, no acá. Por ahora loguea
    // su propio EDITAR. Revisar al refactorizar el log.
    const actual = await this.getTableroPorFecha(fecha);
    if (!actual) throw new Error(`No existe tablero para la fecha ${fecha}`);

    const items = actual.items.map(it =>
      it.idOperacion === idOperacion
        ? { ...it, estado: { estado: 'anulada', motivo, timestamp: Date.now() } as EstadoAsignacion }
        : it
    );
    const asignacion: Asignacion = { ...actual, items, timestamp: Date.now() };
    try {
      await this.db.setDocSinId(this.COLECCION, fecha, this.toFirestore(asignacion));
      this.registrarLog('EDITAR', `Item anulado (op ${idOperacion}) en tablero ${fecha}`, fecha, true);
    } catch (e) {
      this.registrarLog('EDITAR', `Error al anular item en tablero ${fecha}`, fecha, false);
      throw e;
    }
  }

  /** Reactiva un item anulado (estado → 'activa') por idOperacion. Inverso de
   *  marcarItemAnulado. Usado al restaurar una op desde papelera: el item nunca se
   *  borró, solo se marcó anulado, así que restaurar lo vuelve a activo. Log: EDITAR.
   *  TODO: refactor Log — si la reactivación es parte de una restauración de op
   *  atómica (coordinada por OperacionService.restaurarOperacion en el futuro), el
   *  log debería emitirse una sola vez en el coordinador, no acá. */
  async reactivarItem(fecha: string, idOperacion: string): Promise<void> {
    const actual = await this.getTableroPorFecha(fecha);
    if (!actual) throw new Error(`No existe tablero para la fecha ${fecha}`);

    const items = actual.items.map(it =>
      it.idOperacion === idOperacion
        ? { ...it, estado: { estado: 'activa' } as EstadoAsignacion }
        : it
    );
    const asignacion: Asignacion = { ...actual, items, timestamp: Date.now() };
    try {
      await this.db.setDocSinId(this.COLECCION, fecha, this.toFirestore(asignacion));
      this.registrarLog('EDITAR', `Item reactivado (op ${idOperacion}) en tablero ${fecha}`, fecha, true);
    } catch (e) {
      this.registrarLog('EDITAR', `Error al reactivar item en tablero ${fecha}`, fecha, false);
      throw e;
    }
  }

  /** Actualiza observacion/hojaDeRuta de un item por idOperacion. Log: EDITAR. */
  async actualizarItem(fecha: string, idOperacion: string, observacion: string, hojaDeRuta: string): Promise<void> {
    const actual = await this.getTableroPorFecha(fecha);
    if (!actual) throw new Error(`No existe tablero para la fecha ${fecha}`);

    const items = actual.items.map(it =>
      it.idOperacion === idOperacion ? { ...it, observacion, hojaDeRuta } : it
    );
    const asignacion: Asignacion = { ...actual, items, timestamp: Date.now() };
    try {
      await this.db.setDocSinId(this.COLECCION, fecha, this.toFirestore(asignacion));
      this.registrarLog('EDITAR', `Item actualizado (op ${idOperacion}) en tablero ${fecha}`, fecha, true);
    } catch (e) {
      this.registrarLog('EDITAR', `Error al actualizar item en tablero ${fecha}`, fecha, false);
      throw e;
    }
  }

  /** Borra un borrador. SOLO si asignado===false. Log: BAJA. */
  async descartarBorrador(fecha: string): Promise<void> {
    const actual = await this.getTableroPorFecha(fecha);
    if (!actual) return;
    if (actual.asignado) {
      throw new Error(`El tablero ${fecha} ya fue confirmado (asignado); no se puede descartar como borrador.`);
    }
    try {
      await this.db.deleteItem(this.COLECCION, fecha);
      this.registrarLog('BAJA', `Borrador de tablero ${fecha} descartado`, fecha, true);
    } catch (e) {
      this.registrarLog('BAJA', `Error al descartar borrador ${fecha}`, fecha, false);
      throw e;
    }
  }

  // ---- Helpers privados ----

  private registrarLog(accion: string, detalle: string, idTablero: string, exito: boolean): void {
    // TODO: refactor Roles — la exclusión del rol 'god' del log vivía en StorageService
    // y se pierde al llamar directo a LogService. Redefinir (probablemente en LogService)
    // al refactorizar roles. Por ahora se loguea todo, incluido god.
    this.logService.logEvent(accion, this.COLECCION, detalle, idTablero, exito);
  }

  /** Excluye idAsignacion antes de escribir (el id es el doc id, no se persiste). */
  asignacionToFirestore(a: Asignacion): Omit<Asignacion, 'idAsignacion'> {
    return this.toFirestore(a);
  }

  private toFirestore(a: Asignacion): Omit<Asignacion, 'idAsignacion'> {
    const { idAsignacion, ...resto } = a;
    return resto;
  }

  // ---- Borrador en curso (buffer en memoria; no toca Firestore) ----

  /** Guarda en memoria el borrador que el usuario está editando (no toca Firestore).
   *  Lo llama el componente al destruirse, para sobrevivir a la navegación. */
  setBorradorEnCurso(fecha: string, items: AsignacionItem[]): void {
    this._borradorEnCurso = { fecha, items };
  }

  /** Devuelve el borrador en curso, o null si no hay. Lo lee el componente al
   *  montarse para rehidratar lo que estaba editando. */
  getBorradorEnCurso(): BorradorEnCurso | null {
    return this._borradorEnCurso;
  }

  /** Limpia el borrador en curso. Se llama cuando el trabajo se persistió
   *  (guardar/alta) o se descartó (limpiar) — ya no hay nada "en curso". */
  limpiarBorradorEnCurso(): void {
    this._borradorEnCurso = null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cancelarFecha$.complete();
  }
}
