import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { ConIdType } from 'src/app/interfaces/conId';
import { CategoriaDocumentacion } from 'src/app/interfaces/legajo';
import { CategoriaDocumentacionService } from 'src/app/servicios/categoria-documentacion/categoria-documentacion.service';
import { PermisosService } from 'src/app/servicios/permisos/permisos.service';

@Component({
  selector: 'app-gestion-categorias-documentacion',
  templateUrl: './gestion-categorias-documentacion.component.html',
  styleUrls: ['./gestion-categorias-documentacion.component.scss'],
  standalone: false,
})
export class GestionCategoriasDocumentacionComponent implements OnInit, OnDestroy {
  categorias: ConIdType<CategoriaDocumentacion>[] = [];
  nombreNuevaCategoria: string = '';
  private destroy$ = new Subject<void>();

  constructor(
    public activeModal: NgbActiveModal,
    private categoriaDocumentacionService: CategoriaDocumentacionService,
    private permisosService: PermisosService,
  ) {}

  /**
   * Determina si se muestra el input editable de nombre o el texto plano.
   * NO se gatea con *appPermiso acá (a diferencia de alta/toggle/reordenar):
   * ocultar el elemento entero dejaría la columna Nombre sin ningún valor
   * visible para roles sin permiso — necesita la rama de solo-lectura, no
   * solo esconder la de escritura.
   */
  get puedeEditar(): boolean {
    return this.permisosService.puede('legajos', 'editar');
  }

  ngOnInit(): void {
    // Suscribirse a categorias$ (TODAS, activas e inactivas — a diferencia de
    // getCategoriasActivas() que usa el resto de la app), ordenadas por orden.
    this.categoriaDocumentacionService.categorias$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.categorias = [...data].sort((a, b) => a.orden - b.orden);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async agregarCategoria(): Promise<void> {
    const nombre = this.nombreNuevaCategoria.trim();
    if (!nombre) {
      return this.mensajeError('El nombre no puede estar vacío');
    }
    const existeDuplicado = this.categorias.some(
      c => c.activa && c.nombre.trim().toLowerCase() === nombre.toLowerCase()
    );
    if (existeDuplicado) {
      return this.mensajeError('Ya existe una categoría activa con ese nombre');
    }
    await this.categoriaDocumentacionService.crearCategoria(nombre);
    this.nombreNuevaCategoria = '';
  }

  /**
   * Disparado en (blur) del input de nombre. Solo escribe si el valor
   * realmente cambió — evita updates/logs vacíos en cada blur sin edición real.
   */
  async onBlurNombre(categoria: ConIdType<CategoriaDocumentacion>, valorInput: string): Promise<void> {
    const nombre = valorInput.trim();
    if (nombre === categoria.nombre) {
      return;
    }
    await this.editarNombre(categoria, nombre);
  }

  async editarNombre(categoria: ConIdType<CategoriaDocumentacion>, nuevoNombre: string): Promise<void> {
    const nombre = nuevoNombre.trim();
    if (!nombre) {
      return this.mensajeError('El nombre no puede estar vacío');
    }
    await this.categoriaDocumentacionService.editarNombreCategoria(categoria.idCategoria, nombre);
  }

  async toggleActiva(categoria: ConIdType<CategoriaDocumentacion>): Promise<void> {
    await this.categoriaDocumentacionService.toggleActiva(categoria.idCategoria);
  }

  async moverArriba(categoria: ConIdType<CategoriaDocumentacion>): Promise<void> {
    const index = this.categorias.findIndex(c => c.idCategoria === categoria.idCategoria);
    if (index <= 0) return;
    const anterior = this.categorias[index - 1];
    // Intercambiar orden entre categoria y anterior
    await this.categoriaDocumentacionService.actualizarOrden(categoria.idCategoria, anterior.orden);
    await this.categoriaDocumentacionService.actualizarOrden(anterior.idCategoria, categoria.orden);
  }

  async moverAbajo(categoria: ConIdType<CategoriaDocumentacion>): Promise<void> {
    const index = this.categorias.findIndex(c => c.idCategoria === categoria.idCategoria);
    if (index === -1 || index >= this.categorias.length - 1) return;
    const siguiente = this.categorias[index + 1];
    await this.categoriaDocumentacionService.actualizarOrden(categoria.idCategoria, siguiente.orden);
    await this.categoriaDocumentacionService.actualizarOrden(siguiente.idCategoria, categoria.orden);
  }

  private mensajeError(msj: string): void {
    Swal.fire({ icon: 'error', text: msj });
  }
}
