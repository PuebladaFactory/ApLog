import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConIdType } from 'src/app/interfaces/conId';
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';
import { ClienteFactoryService, ClienteFormData } from 'src/app/servicios/clientes/cliente-factory.service';

@Injectable({ providedIn: 'root' })
export class ClienteService implements OnDestroy {

  private _clientes$ = new BehaviorSubject<ConIdType<Cliente>[]>([]);
  public clientes$ = this._clientes$.asObservable();

  private destroy$ = new Subject<void>();

  constructor(
    private db: DbFirestoreService,
    private storageService: StorageService,
    private logRegistro: LogRegistroService,
    private clienteFactoryService: ClienteFactoryService,
  ) {}

  init(): void {
    this.db.getAllStateChanges<Cliente>('clientes')
      .pipe(takeUntil(this.destroy$))
      .subscribe(changes => {
        let current = this._clientes$.getValue();
        changes.forEach(change => {
          const { type, ...dato } = change;
          const cliente = { ...dato, idCliente: dato.id } as ConIdType<Cliente>;
          if (type === 'added' && !current.some(c => c.idCliente === cliente.idCliente)) {
            current = [...current, cliente];
          } else if (type === 'modified') {
            current = current.map(c => c.idCliente === cliente.idCliente ? cliente : c);
          } else if (type === 'removed') {
            current = current.filter(c => c.idCliente !== cliente.idCliente);
          }
        });
        this._clientes$.next(current);
      });
  }

  getActivos(): Observable<ConIdType<Cliente>[]> {
    return this.clientes$.pipe(
      map(clientes => clientes.filter(c => c.activo))
    );
  }

  verificarCuitDuplicado(cuit: number): ConIdType<Cliente> | null {
    const clientes = this._clientes$.getValue();
    return clientes.find(c => c.cuit === cuit) ?? null;
  }

  /** Devuelve el array actual de clientes sin suscribirse. */
  getClientesActuales(): ConIdType<Cliente>[] {
    return this._clientes$.getValue();
  }

  /** Devuelve el cliente con ese id desde memoria, o undefined si no está
   *  (p. ej. en papelera). Gemelo de getChoferPorId / getProveedorPorId. */
  getClientePorId(id: string): ConIdType<Cliente> | undefined {
    return this.getClientesActuales().find(c => c.id === id);
  }

  toFirestore(cliente: ConIdType<Cliente>): Omit<Cliente, 'idCliente'> {
    // Excluimos id y type (metadata de ConIdType) e idCliente
    // (se almacena solo como ID del documento, no como campo)
    const { idCliente, id, type, ...resto } = cliente as any;
    return resto;
  }

  async guardarCliente(
    cliente: ConIdType<Cliente>,
    modo: 'alta' | 'edicion',
  ): Promise<void> {
    const clienteParaGuardar = this.toFirestore(cliente);
    const nombre = cliente.razonSocial;
    const accion = modo === 'alta' ? 'ALTA' : 'EDITAR';
    const id = modo === 'alta' ? this.db.generarId('clientes') : cliente.idCliente;
    const msj = modo === 'alta' ? `Alta de Cliente ${nombre}` : `Edición de Cliente ${nombre}`;

    const escrituras: EscrituraBatch[] = [
      { coleccion: 'clientes', id, data: clienteParaGuardar, modo: modo === 'alta' ? 'crear' : 'reemplazar' },
    ];
    await this.logRegistro.agregarAlBatch(escrituras, accion, 'clientes', id, msj);
    try {
      await this.db.commitBatch(escrituras);
    } catch (e: any) {
      await this.logRegistro.registrarError(accion, 'clientes', id, `Error: ${e?.message ?? e}`);
      throw e;
    }
  }

  async altaCliente(data: ClienteFormData): Promise<void> {
    const cliente = this.clienteFactoryService.crearCliente(data) as ConIdType<Cliente>;
    await this.guardarCliente(cliente, 'alta');
  }

  async editarCliente(original: ConIdType<Cliente>, data: ClienteFormData): Promise<void> {
    const clienteEditado = {
      ...this.clienteFactoryService.editarCliente(original, data),
      id: original.id,
      type: (original as any).type,
    } as ConIdType<Cliente>;
    await this.guardarCliente(clienteEditado, 'edicion');
  }

  // Baja compuesta con papelera: fuera del frente de Log (escribe a la colección
  // `papelera`/LogService viejo, mecanismo propio del frente de Papelera, aparte).
  async eliminarCliente(
    cliente: ConIdType<Cliente>,
    motivo: string,
  ): Promise<void> {
    const nombre = cliente.razonSocial;
    await this.storageService.deleteItemPapeleraCompuestoAsync(
      'clientes',
      cliente.idCliente,
      { cliente },
      'BAJA',
      `Baja de Cliente ${nombre}`,
      motivo,
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
