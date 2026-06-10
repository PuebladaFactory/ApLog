import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConIdType } from 'src/app/interfaces/conId';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Injectable({ providedIn: 'root' })
export class ClienteService implements OnDestroy {

  private _clientes$ = new BehaviorSubject<ConIdType<Cliente>[]>([]);
  public clientes$ = this._clientes$.asObservable();

  private destroy$ = new Subject<void>();

  constructor(
    private db: DbFirestoreService,
    private storageService: StorageService,
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

    if (modo === 'alta') {
      await this.storageService.addItemAndGetId(
        'clientes',
        clienteParaGuardar,
        'ALTA',
        `Alta de Cliente ${nombre}`,
      );
    } else {
      await this.storageService.updateItemAsync(
        'clientes',
        clienteParaGuardar,
        cliente.idCliente,
        'EDITAR',
        `Edición de Cliente ${nombre}`,
      );
    }
  }

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
