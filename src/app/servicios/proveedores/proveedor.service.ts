import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { Vehiculo } from 'src/app/interfaces/chofer';
import { ConIdType } from 'src/app/interfaces/conId';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { LegajosService } from 'src/app/servicios/legajos/legajos.service';

@Injectable({ providedIn: 'root' })
export class ProveedorService implements OnDestroy {

  private _proveedores$ = new BehaviorSubject<ConIdType<Proveedor>[]>([]);
  public proveedores$ = this._proveedores$.asObservable();

  private destroy$ = new Subject<void>();

  constructor(
    private db: DbFirestoreService,
    private storageService: StorageService,
    private choferService: ChoferService,
    private legajosService: LegajosService,
  ) {}

  init(): void {
    this.db.getAllStateChanges<Proveedor>('proveedores')
      .pipe(takeUntil(this.destroy$))
      .subscribe(changes => {
        let current = this._proveedores$.getValue();
        changes.forEach(change => {
          const { type, ...dato } = change;
          const proveedor = { ...dato, idProveedor: dato.id } as ConIdType<Proveedor>;
          if (type === 'added' && !current.some(p => p.idProveedor === proveedor.idProveedor)) {
            current = [...current, proveedor];
          } else if (type === 'modified') {
            current = current.map(p => p.idProveedor === proveedor.idProveedor ? proveedor : p);
          } else if (type === 'removed') {
            current = current.filter(p => p.idProveedor !== proveedor.idProveedor);
          }
        });
        this._proveedores$.next(current);
      });
  }

  getActivos(): Observable<ConIdType<Proveedor>[]> {
    return this.proveedores$.pipe(
      map(proveedores => proveedores.filter(p => p.activo))
    );
  }

  verificarCuitDuplicado(cuit: number): ConIdType<Proveedor> | null {
    const proveedores = this._proveedores$.getValue();
    return proveedores.find(p => p.cuit === cuit) ?? null;
  }

  /** Devuelve el array actual de proveedores sin suscribirse. */
  getProveedoresActuales(): ConIdType<Proveedor>[] {
    return this._proveedores$.getValue();
  }

  /** Devuelve el proveedor con ese id desde memoria, o undefined si no está
   *  (p. ej. en papelera). */
  getProveedorPorId(id: string): ConIdType<Proveedor> | undefined {
    return this.getProveedoresActuales().find(p => p.idProveedor === id);
  }

  toFirestore(proveedor: ConIdType<Proveedor>): Omit<Proveedor, 'idProveedor'> {
    // Excluimos id y type (metadata de ConIdType) e idProveedor
    // (se almacena solo como ID del documento, no como campo)
    const { idProveedor, id, type, ...resto } = proveedor as any;
    return resto;
  }

  async guardarProveedor(
    proveedor: ConIdType<Proveedor>,
    modo: 'alta' | 'edicion',
  ): Promise<void> {
    const proveedorParaGuardar = this.toFirestore(proveedor);
    const nombre = proveedor.razonSocial;

    if (modo === 'alta') {
      await this.storageService.addItemAndGetId(
        'proveedores',
        proveedorParaGuardar,
        'ALTA',
        `Alta de Proveedor ${nombre}`,
      );
    } else {
      await this.storageService.updateItemAsync(
        'proveedores',
        proveedorParaGuardar,
        proveedor.idProveedor,
        'EDITAR',
        `Edición de Proveedor ${nombre}`,
      );
    }
  }

  getVehiculosPorProveedor(idProveedor: string): Observable<ConIdType<Vehiculo>[]> {
    return this.choferService.vehiculos$.pipe(
      map(vs => vs.filter(v =>
        v.asignadoA.tipo === 'proveedor' &&
        v.asignadoA.idProveedor === idProveedor
      ))
    );
  }

  async guardarProveedorConVehiculos(
    proveedor: ConIdType<Proveedor>,
    vehiculos: ConIdType<Vehiculo>[],
    modo: 'alta' | 'edicion',
  ): Promise<void> {
    const proveedorParaGuardar = this.toFirestore(proveedor);
    const nombre = proveedor.razonSocial;

    if (modo === 'alta') {
      const idProveedor = await this.storageService.addItemAndGetId(
        'proveedores',
        proveedorParaGuardar,
        'ALTA',
        `Alta de Proveedor ${nombre}`,
      );
      for (const vehiculo of vehiculos) {
        const vehiculoParaGuardar = {
          ...this.choferService.vehiculoToFirestore(vehiculo),
          asignadoA: { tipo: 'proveedor', idProveedor },
        };
        await this.storageService.addItemAndGetId(
          'vehiculos',
          vehiculoParaGuardar,
          'ALTA',
          `Alta de Vehículo ${vehiculo.dominio} - Proveedor ${nombre}`,
        );
      }
    } else {
      await this.storageService.updateItemAsync(
        'proveedores',
        proveedorParaGuardar,
        proveedor.idProveedor,
        'EDITAR',
        `Edición de Proveedor ${nombre}`,
      );
      const vehiculosEnFirestore = await this.db.getByField<Vehiculo>(
        'vehiculos', 'asignadoA.idProveedor', proveedor.idProveedor
      );
      for (const v of vehiculosEnFirestore) {
        await this.storageService.deleteItemAsync(
          'vehiculos', v.id, v.id, 'BAJA',
          `Vehículo eliminado - Proveedor ${nombre}`,
        );
      }
      for (const vehiculo of vehiculos) {
        const vehiculoParaGuardar = this.choferService.vehiculoToFirestore(vehiculo);
        await this.storageService.addItemAndGetId(
          'vehiculos',
          vehiculoParaGuardar,
          'ALTA',
          `Alta de Vehículo ${vehiculo.dominio} - Proveedor ${nombre}`,
        );
      }
    }
  }

  async eliminarProveedorConVehiculos(
    proveedor: ConIdType<Proveedor>,
    motivo: string,
  ): Promise<void> {
    const nombre = proveedor.razonSocial;

    // 1. Obtener vehículos del proveedor desde memoria
    const vehiculos = await this.db.getByField<Vehiculo>(
      'vehiculos', 'asignadoA.idProveedor', proveedor.idProveedor
    );

    // 2. Obtener choferes del proveedor desde memoria
    const choferes = this.choferService.getChoferesActuales().filter(c =>
      c.contratacion.tipo === 'proveedor' &&
      c.contratacion.idProveedor === proveedor.idProveedor
    );

    // 3. Obtener legajos de cada chofer
    const legajos: any[] = [];
    for (const chofer of choferes) {
      const resultado = await this.db.getByField('legajos', 'idChofer', chofer.idChofer);
      if (resultado.length > 0) legajos.push(resultado[0].data);
    }

    // 4. Construir objeto compuesto para papelera
    const objetoPapelera = {
      proveedor,
      vehiculos: vehiculos.map(v => v.data),
      choferes,
      legajos,
    };

    // 5. Eliminar proveedor y guardar en papelera
    await this.storageService.deleteItemPapeleraCompuestoAsync(
      'proveedores',
      proveedor.idProveedor,
      objetoPapelera,
      'BAJA',
      `Baja de Proveedor ${nombre}`,
      motivo,
    );

    // 6. Eliminar vehículos
    for (const v of vehiculos) {
      await this.storageService.deleteItemAsync(
        'vehiculos', v.id, v.id, 'BAJA',
        `Vehículo eliminado por baja de Proveedor ${nombre}`,
      );
    }

    // 7. Eliminar choferes y sus legajos
    for (const chofer of choferes) {
      await this.legajosService.eliminarLegajo(chofer.idChofer, motivo);
      await this.storageService.deleteItemPapeleraCompuestoAsync(
        'choferes',
        chofer.idChofer,
        chofer,
        'BAJA',
        `Baja de Chofer ${chofer.datosPersonales.apellido} ${chofer.datosPersonales.nombre} por baja de Proveedor ${nombre}`,
        motivo,
      );
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
