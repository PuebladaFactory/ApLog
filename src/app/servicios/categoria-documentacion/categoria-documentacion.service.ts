import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CategoriaDocumentacion } from 'src/app/interfaces/legajo';
import { ConIdType } from 'src/app/interfaces/conId';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Injectable({ providedIn: 'root' })
export class CategoriaDocumentacionService implements OnDestroy {

  private _categorias$ = new BehaviorSubject<ConIdType<CategoriaDocumentacion>[]>([]);
  public categorias$ = this._categorias$.asObservable();

  private destroy$ = new Subject<void>();

  constructor(
    private db: DbFirestoreService,
    private storageService: StorageService,
  ) {}

  init(): void {
    this.db.getAllStateChanges<CategoriaDocumentacion>('categoriasDocumentacion')
      .pipe(takeUntil(this.destroy$))
      .subscribe(changes => {
        let current = this._categorias$.getValue();
        changes.forEach(change => {
          const { type, ...dato } = change;
          const categoria = { ...dato, idCategoria: dato.id } as ConIdType<CategoriaDocumentacion>;
          if (type === 'added' && !current.some(c => c.idCategoria === categoria.idCategoria)) {
            current = [...current, categoria];
          } else if (type === 'modified') {
            current = current.map(c => c.idCategoria === categoria.idCategoria ? categoria : c);
          } else if (type === 'removed') {
            current = current.filter(c => c.idCategoria !== categoria.idCategoria);
          }
        });
        this._categorias$.next(current);
      });
  }

  getCategoriasActuales(): ConIdType<CategoriaDocumentacion>[] {
    return this._categorias$.getValue();
  }

  getCategoriasActivas(): ConIdType<CategoriaDocumentacion>[] {
    return this.getCategoriasActuales()
      .filter(c => c.activa)
      .sort((a, b) => a.orden - b.orden);
  }

  getCategoriaPorId(id: string): ConIdType<CategoriaDocumentacion> | undefined {
    return this.getCategoriasActuales().find(c => c.idCategoria === id);
  }

  /** Excluye idCategoria, id y type (metadata de ConIdType) antes de escribir en Firestore. */
  private toFirestore(categoria: ConIdType<CategoriaDocumentacion>): Omit<CategoriaDocumentacion, 'idCategoria'> {
    const { idCategoria, id, type, ...resto } = categoria as any;
    return resto;
  }

  async crearCategoria(nombre: string): Promise<string> {
    const ordenMax = this.getCategoriasActuales().reduce((max, c) => Math.max(max, c.orden), -1);
    const categoriaNueva: CategoriaDocumentacion = {
      idCategoria: '',
      nombre,
      activa: true,
      orden: ordenMax + 1,
    };
    const { idCategoria, ...paraGuardar } = categoriaNueva;
    return this.storageService.addItemAndGetId(
      'categoriasDocumentacion',
      paraGuardar,
      'ALTA',
      `Alta de categoría de documentación ${nombre}`,
    );
  }

  async editarNombreCategoria(idCategoria: string, nuevoNombre: string): Promise<void> {
    const categoria = this.getCategoriaPorId(idCategoria);
    if (!categoria) {
      throw new Error(`No se encontró la categoría de documentación ${idCategoria}`);
    }
    const paraGuardar = this.toFirestore({ ...categoria, nombre: nuevoNombre });
    await this.storageService.updateItemAsync(
      'categoriasDocumentacion',
      paraGuardar,
      categoria.id,
      'EDITAR',
      `Categoría de documentación renombrada a "${nuevoNombre}"`,
    );
  }

  async toggleActiva(idCategoria: string): Promise<void> {
    const categoria = this.getCategoriaPorId(idCategoria);
    if (!categoria) {
      throw new Error(`No se encontró la categoría de documentación ${idCategoria}`);
    }
    const paraGuardar = this.toFirestore({ ...categoria, activa: !categoria.activa });
    await this.storageService.updateItemAsync(
      'categoriasDocumentacion',
      paraGuardar,
      categoria.id,
      'EDITAR',
      `Categoría de documentación ${categoria.activa ? 'desactivada' : 'activada'}: ${categoria.nombre}`,
    );
  }

  async actualizarOrden(idCategoria: string, nuevoOrden: number): Promise<void> {
    const categoria = this.getCategoriaPorId(idCategoria);
    if (!categoria) {
      throw new Error(`No se encontró la categoría de documentación ${idCategoria}`);
    }
    const paraGuardar = this.toFirestore({ ...categoria, orden: nuevoOrden });
    await this.storageService.updateItemAsync(
      'categoriasDocumentacion',
      paraGuardar,
      categoria.id,
      'EDITAR',
      `Orden de categoría de documentación actualizado: ${categoria.nombre}`,
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
