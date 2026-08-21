import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { Chofer, Vehiculo, TarifaTipo } from 'src/app/interfaces/chofer';
import { Legajo } from 'src/app/interfaces/legajo';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { RefTarifaHabilitada, tarifaTipoDesdeHabilitadas } from 'src/app/interfaces/tarifa-habilitada';
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';
import { PapeleraService } from 'src/app/servicios/papelera/papelera.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { LegajoService } from 'src/app/servicios/legajos/legajo.service';
import { ProveedorFactoryService, ProveedorFormData } from 'src/app/servicios/proveedores/proveedor-factory.service';

@Injectable({ providedIn: 'root' })
export class ProveedorService implements OnDestroy {

  private _proveedores$ = new BehaviorSubject<ConIdType<Proveedor>[]>([]);
  public proveedores$ = this._proveedores$.asObservable();

  private destroy$ = new Subject<void>();

  constructor(
    private db: DbFirestoreService,
    private logRegistro: LogRegistroService,
    private papeleraService: PapeleraService,
    private choferService: ChoferService,
    private legajoService: LegajoService,
    private proveedorFactoryService: ProveedorFactoryService,
  ) {}

  // ---- Escrituras simples con log en el mismo batch (reemplaza StorageService
  // para el CRUD directo de este módulo: proveedores y vehículos) ----

  private async crearConLog(coleccion: string, data: any, msj: string): Promise<string> {
    const id = this.db.generarId(coleccion);
    const escrituras: EscrituraBatch[] = [{ coleccion, id, data, modo: 'crear' }];
    await this.logRegistro.agregarAlBatch(escrituras, 'ALTA', coleccion, id, msj);
    try {
      await this.db.commitBatch(escrituras);
      return id;
    } catch (e: any) {
      await this.logRegistro.registrarError('ALTA', coleccion, id, `Error: ${e?.message ?? e}`);
      throw e;
    }
  }

  private async editarConLog(coleccion: string, id: string, data: any, msj: string): Promise<void> {
    const escrituras: EscrituraBatch[] = [{ coleccion, id, data, modo: 'reemplazar' }];
    await this.logRegistro.agregarAlBatch(escrituras, 'EDITAR', coleccion, id, msj);
    try {
      await this.db.commitBatch(escrituras);
    } catch (e: any) {
      await this.logRegistro.registrarError('EDITAR', coleccion, id, `Error: ${e?.message ?? e}`);
      throw e;
    }
  }

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

  /** Devuelve el tarifaTipo del proveedor por id, o undefined si no está.
   *  Fuente de verdad de la tarifa heredada por los choferes de proveedor.
   *  TODO: refactor Tarifas — eliminar el campo tarifasHabilitadas de la interfaz Chofer
   *  (hoy duplicado al crear el chofer); los choferes de proveedor deben resolver
   *  su tarifa SIEMPRE por acá, no por tarifaTipoDesdeHabilitadas(chofer.tarifasHabilitadas). */
  getTarifaTipo(idProveedor: string): TarifaTipo | undefined {
    const proveedor = this.getProveedorPorId(idProveedor);
    return proveedor ? tarifaTipoDesdeHabilitadas(proveedor.tarifasHabilitadas) : undefined;
  }

  /** Resuelve las tarifas habilitadas de un chofer sin importar su contratación.
   *  Directo: lee del propio chofer. Proveedor: hereda del proveedor — nunca se
   *  copian al chofer, para no duplicar un estado que habría que sincronizar
   *  ante cada cambio del proveedor.
   *  TODO: refactor Papelera — si el proveedor está en papelera (chofer histórico
   *  de un proveedor eliminado), esto devuelve []. Fallback a
   *  PapeleraService.getObjetoEliminado evaluado y descartado acá: es async, y
   *  este método corre síncrono dentro de factories puras sin I/O por convención
   *  (OperacionFactoryService, operaciones-editor — ver "Servicios por entidad"
   *  en CLAUDE.md). No resuelto en este frente. */
  resolverTarifasHabilitadasChofer(chofer: ConId<Chofer>): RefTarifaHabilitada[] {
    if (chofer.contratacion.tipo === 'directo') {
      return chofer.tarifasHabilitadas ?? [];
    }
    return this.getProveedorPorId(chofer.contratacion.idProveedor)?.tarifasHabilitadas ?? [];
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
      await this.crearConLog(
        'proveedores',
        proveedorParaGuardar,
        `Alta de Proveedor ${nombre}`,
      );
    } else {
      await this.editarConLog(
        'proveedores',
        proveedor.idProveedor,
        proveedorParaGuardar,
        `Edición de Proveedor ${nombre}`,
      );
    }
  }

  async altaProveedor(data: ProveedorFormData): Promise<void> {
    const proveedor = this.proveedorFactoryService.crearProveedor(data) as ConIdType<Proveedor>;
    await this.guardarProveedor(proveedor, 'alta');
  }

  async editarProveedor(original: ConIdType<Proveedor>, data: ProveedorFormData): Promise<void> {
    const proveedorEditado = {
      ...this.proveedorFactoryService.editarProveedor(original, data),
      id: original.id,
      type: original.type,
    } as ConIdType<Proveedor>;
    await this.guardarProveedor(proveedorEditado, 'edicion');
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
      // Batch único: proveedor + vehículos, con un log por cada escritura real
      // (granularidad de auditoría preservada, ver "Frente Log" en CLAUDE.md).
      const escrituras: EscrituraBatch[] = [];

      const idProveedor = this.db.generarId('proveedores');
      escrituras.push({ coleccion: 'proveedores', id: idProveedor, data: proveedorParaGuardar, modo: 'crear' });
      await this.logRegistro.agregarAlBatch(
        escrituras, 'ALTA', 'proveedores', idProveedor, `Alta de Proveedor ${nombre}`,
      );

      for (const vehiculo of vehiculos) {
        const idVehiculo = this.db.generarId('vehiculos');
        const vehiculoParaGuardar = {
          ...this.choferService.vehiculoToFirestore(vehiculo),
          asignadoA: { tipo: 'proveedor', idProveedor },
        };
        escrituras.push({ coleccion: 'vehiculos', id: idVehiculo, data: vehiculoParaGuardar, modo: 'crear' });
        await this.logRegistro.agregarAlBatch(
          escrituras, 'ALTA', 'vehiculos', idVehiculo,
          `Alta de Vehículo ${vehiculo.dominio} - Proveedor ${nombre}`,
        );
      }

      try {
        await this.db.commitBatch(escrituras);
      } catch (e: any) {
        await this.logRegistro.registrarError(
          'ALTA', 'proveedores', idProveedor,
          `Error en alta de Proveedor ${nombre} (proveedor + vehículos): ${e?.message ?? e}`,
        );
        throw e;
      }

    } else {
      // Batch único: proveedor + reconciliación de vehículos, con un log por cada
      // escritura real. Los vehículos idénticos (mismo dominio, mismos datos) se
      // excluyen del batch — sin escritura, sin log.
      const escrituras: EscrituraBatch[] = [
        { coleccion: 'proveedores', id: proveedor.idProveedor, data: proveedorParaGuardar, modo: 'reemplazar' },
      ];
      await this.logRegistro.agregarAlBatch(
        escrituras, 'EDITAR', 'proveedores', proveedor.idProveedor, `Edición de Proveedor ${nombre}`,
      );

      const vehiculosEnFirestore = await this.db.getByField<Vehiculo>(
        'vehiculos', 'asignadoA.idProveedor', proveedor.idProveedor
      );
      const { aEliminar, aCrear } = this.choferService.reconciliarVehiculos(vehiculosEnFirestore, vehiculos);

      for (const v of aEliminar) {
        escrituras.push({ coleccion: 'vehiculos', id: v.id, data: null, modo: 'eliminar' });
        await this.logRegistro.agregarAlBatch(
          escrituras, 'BAJA', 'vehiculos', v.id, `Vehículo eliminado - Proveedor ${nombre}`,
        );
      }
      for (const vehiculo of aCrear) {
        const idVehiculo = this.db.generarId('vehiculos');
        const vehiculoParaGuardar = this.choferService.vehiculoToFirestore(vehiculo);
        escrituras.push({ coleccion: 'vehiculos', id: idVehiculo, data: vehiculoParaGuardar, modo: 'crear' });
        await this.logRegistro.agregarAlBatch(
          escrituras, 'ALTA', 'vehiculos', idVehiculo,
          `Alta de Vehículo ${vehiculo.dominio} - Proveedor ${nombre}`,
        );
      }

      try {
        await this.db.commitBatch(escrituras);
      } catch (e: any) {
        await this.logRegistro.registrarError(
          'EDITAR', 'proveedores', proveedor.idProveedor,
          `Error al editar Proveedor ${nombre} (proveedor + vehículos): ${e?.message ?? e}`,
        );
        throw e;
      }
    }
  }

  async eliminarProveedorConVehiculos(
    proveedor: ConIdType<Proveedor>,
    motivo: string,
  ): Promise<void> {
    const nombre = proveedor.razonSocial;

    // 1. Obtener vehículos del proveedor
    const vehiculos = await this.db.getByField<Vehiculo>(
      'vehiculos', 'asignadoA.idProveedor', proveedor.idProveedor
    );

    // 2. Obtener choferes del proveedor desde memoria
    const choferes = this.choferService.getChoferesActuales().filter(c =>
      c.contratacion.tipo === 'proveedor' &&
      c.contratacion.idProveedor === proveedor.idProveedor
    );

    // 3. Leer y preparar (sin escribir) la baja del legajo de cada chofer del proveedor
    const bajasLegajo: { legajo: ConIdType<Legajo>; escritura: EscrituraBatch }[] = [];
    for (const chofer of choferes) {
      const baja = await this.legajoService.prepararBajaLegajoDeChofer(chofer.idChofer);
      if (baja) bajasLegajo.push(baja);
    }

    // 4. Batch único: baja de proveedor + vehículos + choferes + legajos + evento
    // de papelera (referencia, ver PapeleraService), con un log por cada escritura
    // real (granularidad de auditoría preservada, ver "Frente Papelera" en CLAUDE.md).
    // Reemplaza el loop NO bacheado de N choferes + papelera que tenía este método.
    const escrituras: EscrituraBatch[] = [
      { coleccion: 'proveedores', id: proveedor.idProveedor, data: null, modo: 'eliminar' },
    ];
    for (const v of vehiculos) {
      escrituras.push({ coleccion: 'vehiculos', id: v.id, data: null, modo: 'eliminar' });
    }
    for (const chofer of choferes) {
      escrituras.push({ coleccion: 'choferes', id: chofer.idChofer, data: null, modo: 'eliminar' });
    }
    for (const baja of bajasLegajo) {
      escrituras.push(baja.escritura);
    }

    this.papeleraService.prepararBajaEnBatch(escrituras, motivo, [
      { coleccion: 'proveedores', id: proveedor.idProveedor, data: this.toFirestore(proveedor), principal: true },
      ...vehiculos.map(v => ({ coleccion: 'vehiculos', id: v.id, data: v.data, principal: false })),
      ...choferes.map(c => ({
        coleccion: 'choferes', id: c.idChofer, data: this.choferService.toFirestore(c), principal: false,
      })),
      ...bajasLegajo.map(b => ({
        coleccion: 'legajos', id: b.legajo.id, data: this.choferService.legajoToFirestore(b.legajo), principal: false,
      })),
    ]);

    await this.logRegistro.agregarAlBatch(
      escrituras, 'BAJA', 'proveedores', proveedor.idProveedor, `Baja de Proveedor ${nombre}`,
    );
    for (const v of vehiculos) {
      await this.logRegistro.agregarAlBatch(
        escrituras, 'BAJA', 'vehiculos', v.id, `Vehículo eliminado por baja de Proveedor ${nombre}`,
      );
    }
    for (const chofer of choferes) {
      await this.logRegistro.agregarAlBatch(
        escrituras, 'BAJA', 'choferes', chofer.idChofer,
        `Chofer ${chofer.datosPersonales.apellido} ${chofer.datosPersonales.nombre} eliminado por baja de Proveedor ${nombre}`,
      );
    }
    for (const baja of bajasLegajo) {
      await this.logRegistro.agregarAlBatch(
        escrituras, 'BAJA', 'legajos', baja.legajo.id,
        `Legajo eliminado por baja de Proveedor ${nombre} (chofer ${baja.legajo.idChofer})`,
      );
    }

    try {
      await this.db.commitBatch(escrituras);
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'BAJA', 'proveedores', proveedor.idProveedor,
        `Error en baja de Proveedor ${nombre} (proveedor + vehículos + choferes + legajos): ${e?.message ?? e}`,
      );
      throw e;
    }
  }

  async restaurarProveedor(idEvento: string): Promise<void> {
    const escrituras: EscrituraBatch[] = [];
    const { evento, objetos } = await this.papeleraService.prepararRestauracionEnBatch(escrituras, idEvento);
    if (evento.coleccionPrincipal !== 'proveedores') {
      throw new Error(
        `El evento de papelera ${idEvento} no corresponde a Proveedor (coleccionPrincipal: ${evento.coleccionPrincipal}).`,
      );
    }

    for (const objeto of objetos) {
      escrituras.push({ coleccion: objeto.coleccion, id: objeto.idOriginal, data: objeto.data, modo: 'crear' });
    }

    const principal = objetos.find(o => o.principal)!;
    await this.logRegistro.agregarAlBatch(
      escrituras, 'RESTAURAR', 'proveedores', principal.idOriginal,
      `Proveedor ${principal.idOriginal} restaurado desde papelera`,
    );
    for (const objeto of objetos.filter(o => !o.principal && o.coleccion === 'vehiculos')) {
      await this.logRegistro.agregarAlBatch(
        escrituras, 'RESTAURAR', 'vehiculos', objeto.idOriginal,
        `Vehículo ${objeto.idOriginal} restaurado por restauración de Proveedor ${principal.idOriginal}`,
      );
    }
    for (const objeto of objetos.filter(o => !o.principal && o.coleccion === 'choferes')) {
      await this.logRegistro.agregarAlBatch(
        escrituras, 'RESTAURAR', 'choferes', objeto.idOriginal,
        `Chofer ${objeto.idOriginal} restaurado por restauración de Proveedor ${principal.idOriginal}`,
      );
    }
    for (const objeto of objetos.filter(o => !o.principal && o.coleccion === 'legajos')) {
      await this.logRegistro.agregarAlBatch(
        escrituras, 'RESTAURAR', 'legajos', objeto.idOriginal,
        `Legajo ${objeto.idOriginal} restaurado por restauración de Proveedor ${principal.idOriginal}`,
      );
    }

    try {
      await this.db.commitBatch(escrituras);
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'RESTAURAR', 'proveedores', principal.idOriginal,
        `Error al restaurar Proveedor ${principal.idOriginal} (proveedor + vehículos + choferes + legajos): ${e?.message ?? e}`,
      );
      throw e;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
