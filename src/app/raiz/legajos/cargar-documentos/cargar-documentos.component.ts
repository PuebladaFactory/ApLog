import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { ConIdType } from 'src/app/interfaces/conId';
import { Chofer } from 'src/app/interfaces/chofer';
import { CategoriaDocumentacion, Documentacion, Legajo } from 'src/app/interfaces/legajo';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { LegajoService } from 'src/app/servicios/legajos/legajo.service';
import { LegajoFactoryService } from 'src/app/servicios/legajos/legajo-factory.service';
import { CategoriaDocumentacionService } from 'src/app/servicios/categoria-documentacion/categoria-documentacion.service';
import { StorageArchivosService } from 'src/app/servicios/storage-archivos/storage-archivos.service';
import { CarruselComponent } from 'src/app/shared/carrusel/carrusel.component';

@Component({
    selector: 'app-cargar-documentos',
    templateUrl: './cargar-documentos.component.html',
    styleUrls: ['./cargar-documentos.component.scss'],
    standalone: false
})
export class CargarDocumentosComponent implements OnInit, OnDestroy {

  choferes: ConIdType<Chofer>[] = [];
  categoriasActivas: ConIdType<CategoriaDocumentacion>[] = [];
  idChoferSeleccionado: string = '';
  choferSeleccionado: ConIdType<Chofer> | null = null;
  legajoSeleccionado: ConIdType<Legajo> | null = null;

  // Trámite en armado (antes de agregarlo al buffer)
  idCategoriaSeleccionada: string | null = null;
  tieneVto: boolean | null = null;
  fechaDeVto: string | null = null; // ISO yyyy-MM-dd, directo del input
  archivosSeleccionadosActuales: File[] = []; // para el trámite en armado, antes de confirmar

  // Buffer de documentos confirmados, pendientes de guardar
  documentosEnCurso: Documentacion[] = [];
  archivosPorCategoria: Map<string, File[]> = new Map(); // idCategoria -> archivos crudos

  archivosPrevisualizados: any;
  isLoading: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private choferService: ChoferService,
    private legajoService: LegajoService,
    private legajoFactoryService: LegajoFactoryService,
    private categoriaDocumentacionService: CategoriaDocumentacionService,
    private storageArchivosService: StorageArchivosService,
    private sanitizer: DomSanitizer,
    private modalService: NgbModal,
  ) {}

  get categoriasDisponibles(): ConIdType<CategoriaDocumentacion>[] {
    const idsEnBuffer = new Set(this.documentosEnCurso.map(d => d.idCategoria));
    return this.categoriasActivas.filter(c => !idsEnBuffer.has(c.idCategoria));
  }

  ngOnInit(): void {
    this.choferService.choferes$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.choferes = [...data].sort((a, b) =>
          a.datosPersonales.apellido.localeCompare(b.datosPersonales.apellido)
        );
      });

    this.categoriaDocumentacionService.categorias$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.categoriasActivas = this.categoriaDocumentacionService.getCategoriasActivas();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  changeChofer(e: any): void {
    const idChofer = e.target.value;
    this.choferSeleccionado = this.choferes.find(c => c.idChofer === idChofer) ?? null;
    if (this.choferSeleccionado) {
      this.legajoSeleccionado = this.legajoService.getLegajoPorChofer(this.choferSeleccionado.idChofer) ?? null;
      if (!this.legajoSeleccionado) {
        console.error(`Inconsistencia de datos: el chofer ${this.choferSeleccionado.idChofer} no tiene legajo asociado. Esto no debería ocurrir — revisar alta de chofer.`);
        Swal.fire({
          icon: 'error',
          title: 'Inconsistencia de datos',
          text: 'No se encontró el legajo de este chofer. Contactar al administrador.',
        });
      }
    } else {
      this.legajoSeleccionado = null;
    }
    if (this.documentosEnCurso.length > 0) {
      this.reiniciarBuffer();
    }
  }

  seleccioneVto(e: any): void {
    this.tieneVto = e.target.value.toLowerCase() === 'true';
    if (!this.tieneVto) {
      this.fechaDeVto = null;
    }
  }

  onFechaVtoChange(e: any): void {
    this.fechaDeVto = e.target.value || null; // yyyy-MM-dd directo, SIN toLocaleString
  }

  onArchivosSeleccionados(event: any): void {
    this.archivosSeleccionadosActuales = Array.from(event.target.files);
  }

  eliminarArchivoSeleccionado(archivo: File): void {
    const index = this.archivosSeleccionadosActuales.indexOf(archivo);
    if (index !== -1) this.archivosSeleccionadosActuales.splice(index, 1);
  }

  agregarDocumentoABuffer(): void {
    if (!this.idCategoriaSeleccionada) {
      return this.mensajeError('Seleccioná una categoría');
    }
    if (this.tieneVto === null) {
      return this.mensajeError('Indicá si tiene vencimiento');
    }
    if (this.tieneVto && !this.fechaDeVto) {
      return this.mensajeError('No se ingresó una fecha de vencimiento');
    }
    if (this.archivosSeleccionadosActuales.length === 0) {
      return this.mensajeError('Debe seleccionar al menos un archivo');
    }

    const categoria = this.categoriasActivas.find(c => c.idCategoria === this.idCategoriaSeleccionada)!;
    const documento = this.legajoFactoryService.crearDocumentacion(
      categoria.idCategoria,
      categoria.nombre,
      this.fechaDeVto,
      !this.tieneVto,
      [], // imagenes se completan recién en guardar(), tras la subida real
    );

    this.documentosEnCurso.push(documento);
    this.archivosPorCategoria.set(categoria.idCategoria, [...this.archivosSeleccionadosActuales]);

    // Reiniciar el trámite en armado (no el buffer completo)
    this.idCategoriaSeleccionada = null;
    this.tieneVto = null;
    this.fechaDeVto = null;
    this.archivosSeleccionadosActuales = [];
    const inputArchivos = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (inputArchivos) inputArchivos.value = '';
  }

  eliminarDocumentoDeBuffer(doc: Documentacion): void {
    const index = this.documentosEnCurso.indexOf(doc);
    if (index !== -1) {
      this.documentosEnCurso.splice(index, 1);
      this.archivosPorCategoria.delete(doc.idCategoria);
    }
  }

  async guardar(): Promise<void> {
    if (!this.legajoSeleccionado) {
      return this.mensajeError('No se encontró el legajo de este chofer. Contactar al administrador.');
    }
    if (this.documentosEnCurso.length === 0) {
      return;
    }

    const confirmacion = await Swal.fire({
      title: '¿Desea guardar los datos del legajo?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Agregar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirmacion.isConfirmed) return;

    this.isLoading = true;
    try {
      // 1. Subir TODOS los archivos pendientes PRIMERO. Si cualquiera falla,
      // Promise.all rechaza y no se escribe nada en Firestore — buffer intacto.
      const documentosConImagenes: Documentacion[] = [];
      for (const doc of this.documentosEnCurso) {
        const archivos = this.archivosPorCategoria.get(doc.idCategoria) ?? [];
        const carpeta = `legajos/${this.choferSeleccionado!.idChofer}`;
        const subidos = await this.storageArchivosService.subirVarios(archivos, carpeta);
        documentosConImagenes.push({ ...doc, imagenes: subidos });
      }

      // 2. Escritura en Firestore (incluye archivado a historial internamente)
      await this.legajoService.guardarDocumentacion(this.legajoSeleccionado.idLegajo, documentosConImagenes);

      this.isLoading = false;
      await Swal.fire({ title: 'Confirmado', text: 'El legajo ha sido guardado.', icon: 'success' });
      this.reiniciarBuffer();
      this.idChoferSeleccionado = '';
      this.choferSeleccionado = null;
      this.legajoSeleccionado = null;
    } catch (error) {
      this.isLoading = false;
      console.error('Error al subir archivos o guardar el legajo:', error);
      this.mensajeError('Error al subir archivos o guardar el legajo. Verificá tu conexión e intentá nuevamente — no se perdió lo que ya armaste.');
      // NO limpiar el buffer — el usuario reintenta sin rehacer todo.
    }
  }

  abrirModal(doc: Documentacion): void {
    this.archivosPrevisualizados = doc.imagenes.map(imagen => ({
      url: imagen.url,
      vistaPreviaSanitizada: this.sanitizer.bypassSecurityTrustResourceUrl(imagen.url),
    }));

    const modalRef = this.modalService.open(CarruselComponent, {
      windowClass: 'myCustomModalClass',
      centered: true,
      size: 'lg',
    });

    const info = {
      item: this.archivosPrevisualizados,
    };

    modalRef.componentInstance.fromParent = info;
    modalRef.result.then(
      () => {},
      () => {},
    );
  }

  private reiniciarBuffer(): void {
    this.documentosEnCurso = [];
    this.archivosPorCategoria.clear();
    this.idCategoriaSeleccionada = null;
    this.tieneVto = null;
    this.fechaDeVto = null;
    this.archivosSeleccionadosActuales = [];
  }

  private mensajeError(msj: string): void {
    Swal.fire({
      icon: 'error',
      text: `${msj}`,
    });
  }
}
