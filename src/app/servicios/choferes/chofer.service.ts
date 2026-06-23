import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { Chofer, ContratacionChofer, Vehiculo } from 'src/app/interfaces/chofer';
import { ConIdType } from 'src/app/interfaces/conId';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { LegajosService } from 'src/app/servicios/legajos/legajos.service';

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
    private legajosService: LegajosService,
  ) {}

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
      // 1. Guardar chofer y obtener ID
      const idChofer = await this.storageService.addItemAndGetId(
        'choferes',
        choferParaGuardar,
        'ALTA',
        `Alta de Chofer ${apellido} ${nombre}`,
      );

      // 2. Guardar cada vehículo con el idChofer real
      for (const vehiculo of vehiculos) {
        const vehiculoParaGuardar = {
          ...this.vehiculoToFirestore(vehiculo),
          asignadoA: { tipo: 'chofer', idChofer },
        };
        await this.storageService.addItemAndGetId(
          'vehiculos',
          vehiculoParaGuardar,
          'ALTA',
          `Alta de Vehículo ${vehiculo.dominio} - Chofer ${apellido} ${nombre}`,
        );
      }

      // 3. Crear legajo
      this.legajosService.crearLegajo(idChofer);

    } else {
      // 1. Actualizar chofer
      await this.storageService.updateItemAsync(
        'choferes',
        choferParaGuardar,
        chofer.idChofer,
        'EDITAR',
        `Chofer Editado ${apellido} ${nombre}`,
      );

      // 2. Borrar todos los vehículos actuales del chofer en Firestore
      const vehiculosEnFirestore = await this.db.getByField<Vehiculo>(
        'vehiculos',
        'asignadoA.idChofer',
        chofer.idChofer,
      );
      for (const v of vehiculosEnFirestore) {
        await this.storageService.deleteItemAsync(
          'vehiculos',
          v.id,
          v.id,
          'BAJA',
          `Vehículo eliminado - Chofer ${apellido} ${nombre}`,
        );
      }

      // 3. Reescribir vehículos actuales
      for (const vehiculo of vehiculos) {
        const vehiculoParaGuardar = this.vehiculoToFirestore(vehiculo);
        await this.storageService.addItemAndGetId(
          'vehiculos',
          vehiculoParaGuardar,
          'ALTA',
          `Alta de Vehículo ${vehiculo.dominio} - Chofer ${apellido} ${nombre}`,
        );
      }
    }
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

    // 2. Obtener legajo
    const legajo = await this.legajosService.eliminarLegajo(chofer.idChofer, motivo);

    // 3. Construir objeto compuesto para la papelera
    const objetoPapelera = {
      chofer,
      vehiculos,
      legajo: legajo ?? null,
    };

    // 4. Eliminar chofer de Firestore y guardar objeto compuesto en papelera
    await this.storageService.deleteItemPapeleraCompuestoAsync(
      'choferes',
      chofer.idChofer,
      objetoPapelera,
      'BAJA',
      `Baja de Chofer ${apellido} ${nombre}`,
      motivo,
    );

    // 5. Eliminar vehículos de Firestore
    for (const vehiculo of vehiculos) {
      await this.storageService.deleteItemAsync(
        'vehiculos',
        vehiculo.idVehiculo,
        vehiculo.idVehiculo,
        'BAJA',
        `Vehículo eliminado por baja de Chofer ${apellido} ${nombre}`,
      );
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
