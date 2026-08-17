import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { Chofer, ContratacionChofer, Vehiculo } from 'src/app/interfaces/chofer';
import { ConIdType } from 'src/app/interfaces/conId';
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';
import { LegajoService } from 'src/app/servicios/legajos/legajo.service';
import { ChoferFactoryService, ChoferFormData } from 'src/app/servicios/choferes/chofer-factory.service';

@Injectable({ providedIn: 'root' })
export class ChoferService implements OnDestroy {

  private _choferes$ = new BehaviorSubject<ConIdType<Chofer>[]>([]);
  public choferes$ = this._choferes$.asObservable();

  private _vehiculos$ = new BehaviorSubject<ConIdType<Vehiculo>[]>([]);
  public vehiculos$ = this._vehiculos$.asObservable();

  private destroy$ = new Subject<void>();

  constructor(
    private db: DbFirestoreService,
    private storageService: StorageService,
    private logRegistro: LogRegistroService,
    private legajoService: LegajoService,
    private choferFactoryService: ChoferFactoryService,
  ) {}

  /** Compara dos vehículos ya normalizados a forma Firestore campo por campo (sin
   *  recursión en objetos anidados) — evita la sensibilidad al orden de claves de
   *  comparar los objetos completos con JSON.stringify. Mismo criterio que
   *  LogRegistroService.diffCampos. */
  private vehiculosIguales(a: any, b: any): boolean {
    const campos = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const campo of campos) {
      if (JSON.stringify(a[campo]) !== JSON.stringify(b[campo])) return false;
    }
    return true;
  }

  /** Reconcilia vehículos existentes en Firestore vs. la lista nueva del formulario,
   *  por `dominio` — única clave de negocio estable que tiene Vehiculo hoy (no hay
   *  persistencia por id estable: cada guardado reconstruye la lista completa). Los
   *  idénticos (mismo dominio, mismos datos) se excluyen sin escritura ni log. El
   *  resto (agregados, sacados, o mismo dominio con datos distintos) se resuelve como
   *  baja del doc viejo + alta de uno nuevo — mismo comportamiento que ya tenía el
   *  módulo antes de esta consolidación, ahora aplicado selectivamente. Pública:
   *  reusada por ProveedorService (dueño de `vehiculoToFirestore`, ver ese método). */
  reconciliarVehiculos(
    existentes: { id: string; data: Vehiculo }[],
    nuevos: ConIdType<Vehiculo>[],
  ): { aEliminar: { id: string }[]; aCrear: ConIdType<Vehiculo>[] } {
    const aEliminar: { id: string }[] = [];
    const aCrear: ConIdType<Vehiculo>[] = [];

    for (const ex of existentes) {
      const match = nuevos.find(n => n.dominio === ex.data.dominio);
      const identico = !!match && this.vehiculosIguales(this.vehiculoToFirestore(match), ex.data);
      if (!identico) aEliminar.push({ id: ex.id });
    }
    for (const nuevo of nuevos) {
      const match = existentes.find(ex => ex.data.dominio === nuevo.dominio);
      const identico = !!match && this.vehiculosIguales(this.vehiculoToFirestore(nuevo), match.data);
      if (!identico) aCrear.push(nuevo);
    }
    return { aEliminar, aCrear };
  }

  init(): void {
    this.db.getAllStateChanges<Chofer>('choferes')
      .pipe(takeUntil(this.destroy$))
      .subscribe(changes => {
        let current = this._choferes$.getValue();
        changes.forEach(change => {
          const { type, ...dato } = change;
          const chofer = { ...dato, idChofer: dato.id } as ConIdType<Chofer>;
          if (type === 'added' && !current.some(c => c.idChofer === chofer.idChofer)) {
            current = [...current, chofer];
          } else if (type === 'modified') {
            current = current.map(c => c.idChofer === chofer.idChofer ? chofer : c);
          } else if (type === 'removed') {
            current = current.filter(c => c.idChofer !== chofer.idChofer);
          }
        });
        this._choferes$.next(current);
      });

    this.db.getAllStateChanges<Vehiculo>('vehiculos')
      .pipe(takeUntil(this.destroy$))
      .subscribe(changes => {
        let current = this._vehiculos$.getValue();
        changes.forEach(change => {
          const { type, ...dato } = change;
          const vehiculo = { ...dato, idVehiculo: dato.id } as ConIdType<Vehiculo>;
          if (type === 'added' && !current.some(v => v.idVehiculo === vehiculo.idVehiculo)) {
            current = [...current, vehiculo];
          } else if (type === 'modified') {
            current = current.map(v => v.idVehiculo === vehiculo.idVehiculo ? vehiculo : v);
          } else if (type === 'removed') {
            current = current.filter(v => v.idVehiculo !== vehiculo.idVehiculo);
          }
        });
        this._vehiculos$.next(current);
      });
  }

  getActivos(): Observable<ConIdType<Chofer>[]> {
    return this.choferes$.pipe(
      map(choferes => choferes.filter(c => c.activo))
    );
  }

  getVehiculosPorChofer(idChofer: string): Observable<ConIdType<Vehiculo>[]> {
    return this.vehiculos$.pipe(
      map(vs => vs.filter(v =>
        v.asignadoA.tipo === 'chofer' && v.asignadoA.idChofer === idChofer
      ))
    );
  }

  getVehiculosPorProveedor(idProveedor: string): Observable<ConIdType<Vehiculo>[]> {
    return this.vehiculos$.pipe(
      map(vs => vs.filter(v =>
        v.asignadoA.tipo === 'proveedor' && v.asignadoA.idProveedor === idProveedor
      ))
    );
  }

  esOperable(chofer: ConIdType<Chofer>, vehiculos: ConIdType<Vehiculo>[]): boolean {
    if (chofer.contratacion.tipo === 'proveedor') return true;
    return vehiculos.some(v =>
      v.asignadoA.tipo === 'chofer' && v.asignadoA.idChofer === chofer.id
    );
  }

  vehiculoToFirestore(vehiculo: ConIdType<Vehiculo>): Omit<Vehiculo, 'idVehiculo'> {
    // Excluimos id y type (metadata de ConIdType) e idVehiculo
    // (se almacena solo como ID del documento, no como campo)
    const { idVehiculo, id, type, ...resto } = vehiculo as any;
    return resto;
  }

  toFirestore(chofer: ConIdType<Chofer>): Omit<Chofer, 'idChofer'> {
    // Excluimos id y type (metadata de ConIdType) e idChofer 
    // (se almacena solo como ID del documento, no como campo)
    const { idChofer, id, type, ...resto } = chofer as any;
    return resto;
  }

  async guardarChoferConVehiculos(
    chofer: ConIdType<Chofer>,
    vehiculos: ConIdType<Vehiculo>[],
    modo: 'alta' | 'edicion',
  ): Promise<void> {
    const apellido = chofer.datosPersonales.apellido;
    const nombre = chofer.datosPersonales.nombre;
    const choferParaGuardar = this.toFirestore(chofer);

    if (modo === 'alta') {
      // Batch único: chofer + vehículos + legajo, con un log por cada escritura real
      // (granularidad de auditoría preservada, ver "Frente Log" en CLAUDE.md).
      const escrituras: EscrituraBatch[] = [];

      const idChofer = this.db.generarId('choferes');
      escrituras.push({ coleccion: 'choferes', id: idChofer, data: choferParaGuardar, modo: 'crear' });
      await this.logRegistro.agregarAlBatch(
        escrituras, 'ALTA', 'choferes', idChofer, `Alta de Chofer ${apellido} ${nombre}`,
      );

      for (const vehiculo of vehiculos) {
        const idVehiculo = this.db.generarId('vehiculos');
        const vehiculoParaGuardar = {
          ...this.vehiculoToFirestore(vehiculo),
          asignadoA: { tipo: 'chofer', idChofer },
        };
        escrituras.push({ coleccion: 'vehiculos', id: idVehiculo, data: vehiculoParaGuardar, modo: 'crear' });
        await this.logRegistro.agregarAlBatch(
          escrituras, 'ALTA', 'vehiculos', idVehiculo,
          `Alta de Vehículo ${vehiculo.dominio} - Chofer ${apellido} ${nombre}`,
        );
      }

      const escrituraLegajo = this.legajoService.prepararLegajoVacio(idChofer);
      escrituras.push(escrituraLegajo);
      await this.logRegistro.agregarAlBatch(
        escrituras, 'ALTA', 'legajos', escrituraLegajo.id, `Alta de Legajo (chofer ${idChofer})`,
      );

      try {
        await this.db.commitBatch(escrituras);
      } catch (e: any) {
        await this.logRegistro.registrarError(
          'ALTA', 'choferes', idChofer,
          `Error en alta de Chofer ${apellido} ${nombre} (chofer + vehículos + legajo): ${e?.message ?? e}`,
        );
        throw e;
      }

    } else {
      // Batch único: chofer + reconciliación de vehículos, con un log por cada
      // escritura real. Los vehículos idénticos (mismo dominio, mismos datos) se
      // excluyen del batch — sin escritura, sin log.
      const escrituras: EscrituraBatch[] = [
        { coleccion: 'choferes', id: chofer.idChofer, data: choferParaGuardar, modo: 'reemplazar' },
      ];
      await this.logRegistro.agregarAlBatch(
        escrituras, 'EDITAR', 'choferes', chofer.idChofer, `Chofer Editado ${apellido} ${nombre}`,
      );

      const vehiculosEnFirestore = await this.db.getByField<Vehiculo>(
        'vehiculos',
        'asignadoA.idChofer',
        chofer.idChofer,
      );
      const { aEliminar, aCrear } = this.reconciliarVehiculos(vehiculosEnFirestore, vehiculos);

      for (const v of aEliminar) {
        escrituras.push({ coleccion: 'vehiculos', id: v.id, data: null, modo: 'eliminar' });
        await this.logRegistro.agregarAlBatch(
          escrituras, 'BAJA', 'vehiculos', v.id, `Vehículo eliminado - Chofer ${apellido} ${nombre}`,
        );
      }
      for (const vehiculo of aCrear) {
        const idVehiculo = this.db.generarId('vehiculos');
        const vehiculoParaGuardar = this.vehiculoToFirestore(vehiculo);
        escrituras.push({ coleccion: 'vehiculos', id: idVehiculo, data: vehiculoParaGuardar, modo: 'crear' });
        await this.logRegistro.agregarAlBatch(
          escrituras, 'ALTA', 'vehiculos', idVehiculo,
          `Alta de Vehículo ${vehiculo.dominio} - Chofer ${apellido} ${nombre}`,
        );
      }

      try {
        await this.db.commitBatch(escrituras);
      } catch (e: any) {
        await this.logRegistro.registrarError(
          'EDITAR', 'choferes', chofer.idChofer,
          `Error al editar Chofer ${apellido} ${nombre} (chofer + vehículos): ${e?.message ?? e}`,
        );
        throw e;
      }
    }
  }

  async altaChofer(data: ChoferFormData, vehiculos: ConIdType<Vehiculo>[]): Promise<void> {
    const chofer = this.choferFactoryService.crearChofer(data) as ConIdType<Chofer>;
    await this.guardarChoferConVehiculos(chofer, vehiculos, 'alta');
  }

  async editarChofer(
    original: ConIdType<Chofer>,
    data: ChoferFormData,
    vehiculos: ConIdType<Vehiculo>[],
  ): Promise<void> {
    const choferEditado = {
      ...this.choferFactoryService.editarChofer(original, data),
      id: original.id,
      type: original.type,
    } as ConIdType<Chofer>;
    await this.guardarChoferConVehiculos(choferEditado, vehiculos, 'edicion');
  }

  async eliminarChoferConVehiculos(
    chofer: ConIdType<Chofer>,
    motivo: string,
  ): Promise<void> {
    const apellido = chofer.datosPersonales.apellido;
    const nombre = chofer.datosPersonales.nombre;

    // 1. Obtener vehículos del chofer desde memoria
    const vehiculos = this._vehiculos$.getValue().filter(v =>
      v.asignadoA.tipo === 'chofer' && v.asignadoA.idChofer === chofer.idChofer
    );

    // 2. Leer y preparar (sin escribir) la baja del legajo — baja simple, sin
    // papelera propia; se incluye en el objeto compuesto de abajo, mismo criterio
    // que Vehiculo en esta misma cascada.
    const bajaLegajo = await this.legajoService.prepararBajaLegajoDeChofer(chofer.idChofer);

    // 3. Construir objeto compuesto para la papelera
    const objetoPapelera = {
      chofer,
      vehiculos,
      legajo: bajaLegajo?.legajo ?? null,
    };

    // 4. Eliminar chofer de Firestore y guardar objeto compuesto en papelera
    // (baja compuesta con papelera: fuera del frente de Log, ver eliminarCliente)
    await this.storageService.deleteItemPapeleraCompuestoAsync(
      'choferes',
      chofer.idChofer,
      objetoPapelera,
      'BAJA',
      `Baja de Chofer ${apellido} ${nombre}`,
      motivo,
    );

    // 5. Batch único: baja de vehículos + baja de legajo (sin papelera propia
    // ninguno de los dos — la baja compuesta con papelera es solo la del chofer,
    // arriba). Un log por cada escritura real.
    const escrituras: EscrituraBatch[] = [];
    for (const vehiculo of vehiculos) {
      escrituras.push({ coleccion: 'vehiculos', id: vehiculo.idVehiculo, data: null, modo: 'eliminar' });
      await this.logRegistro.agregarAlBatch(
        escrituras, 'BAJA', 'vehiculos', vehiculo.idVehiculo,
        `Vehículo eliminado por baja de Chofer ${apellido} ${nombre}`,
      );
    }
    if (bajaLegajo) {
      escrituras.push(bajaLegajo.escritura);
      await this.logRegistro.agregarAlBatch(
        escrituras, 'BAJA', 'legajos', bajaLegajo.legajo.id,
        `Legajo eliminado por baja de Chofer ${apellido} ${nombre}`,
      );
    }
    if (escrituras.length > 0) {
      try {
        await this.db.commitBatch(escrituras);
      } catch (e: any) {
        await this.logRegistro.registrarError(
          'BAJA', 'vehiculos', chofer.idChofer,
          `Error al eliminar vehículos/legajo por baja de Chofer ${apellido} ${nombre}: ${e?.message ?? e}`,
        );
        throw e;
      }
    }
  }

  verificarCuitDuplicado(cuit: number): ConIdType<Chofer> | null {
    const choferes = this._choferes$.getValue();
    return choferes.find(c => c.datosPersonales.cuit === cuit) ?? null;
  }

  /** Devuelve el array actual de choferes sin suscribirse. */
  getChoferesActuales(): ConIdType<Chofer>[] {
    return this._choferes$.getValue();
  }

  /** Devuelve el chofer con ese id desde memoria, o undefined si no está (p. ej. en papelera). */
  getChoferPorId(id: string): ConIdType<Chofer> | undefined {
    return this.getChoferesActuales().find(c => c.id === id);
  }

  /** Devuelve el array actual de vehículos sin suscribirse. */
  getVehiculosActuales(): ConIdType<Vehiculo>[] {
    return this._vehiculos$.getValue();
  }

  /** Devuelve el vehículo con ese id desde memoria, o undefined si no está. */
  getVehiculoPorId(id: string): ConIdType<Vehiculo> | undefined {
    return this._vehiculos$.getValue().find(v => v.id === id);
  }

  /** Resuelve la contratación del chofer por id. undefined si el chofer no está en memoria. */
  getTipoContratacion(idChofer: string): 'directo' | 'proveedor' | undefined {
    return this.getChoferPorId(idChofer)?.contratacion.tipo;
  }

  /** Devuelve la contratación viva del chofer por id, o undefined si no está (p. ej. en papelera). */
  getContratacionChofer(idChofer: string): ContratacionChofer | undefined {
    return this.getChoferPorId(idChofer)?.contratacion;
  }

  /** Devuelve los choferes de un proveedor desde memoria (síncrono).
   *  Para poblar el selector de chofer pendiente en operaciones-editor. */
  getChoferesPorProveedor(idProveedor: string): ConIdType<Chofer>[] {
    return this.getChoferesActuales().filter(c =>
      c.contratacion.tipo === 'proveedor' &&
      c.contratacion.idProveedor === idProveedor
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
