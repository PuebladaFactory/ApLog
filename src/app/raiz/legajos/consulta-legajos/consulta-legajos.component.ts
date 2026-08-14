import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ConIdType } from 'src/app/interfaces/conId';
import { Chofer } from 'src/app/interfaces/chofer';
import { Documentacion, DocumentacionHistorial, Legajo, estadoGeneralDeLegajo } from 'src/app/interfaces/legajo';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { LegajoService } from 'src/app/servicios/legajos/legajo.service';
import { CarruselComponent } from 'src/app/shared/carrusel/carrusel.component';

@Component({
    selector: 'app-consulta-legajos',
    templateUrl: './consulta-legajos.component.html',
    styleUrls: ['./consulta-legajos.component.scss'],
    standalone: false
})
export class ConsultaLegajosComponent implements OnInit, OnDestroy {

  choferes: ConIdType<Chofer>[] = [];
  legajos: ConIdType<Legajo>[] = [];
  choferSeleccionado: ConIdType<Chofer> | null = null;
  legajoSeleccionado: ConIdType<Legajo> | null = null;
  archivosPrevisualizados: { nombre: string; url: string }[] = [];

  historialAbierto: Set<string> = new Set(); // idCategoria de los documentos con historial expandido
  historialPorCategoria: Map<string, ConIdType<DocumentacionHistorial>[]> = new Map(); // cache, carga perezosa

  /** Expuesta al template — deriva el estado general a partir de la documentación, nunca se persiste. */
  readonly estadoGeneralDeLegajo = estadoGeneralDeLegajo;

  private destroy$ = new Subject<void>();

  constructor(
    private choferService: ChoferService,
    private legajoService: LegajoService,
    private modalService: NgbModal,
  ) {}

  ngOnInit(): void {
    this.choferService.choferes$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.choferes = [...data].sort((a, b) =>
          a.datosPersonales.apellido.localeCompare(b.datosPersonales.apellido)
        );
      });

    this.legajoService.legajos$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.legajos = data;
        // Mantiene el legajo mostrado actualizado si los datos cambian mientras
        // esta pantalla sigue abierta (ej. una carga hecha desde otra pestaña).
        if (this.choferSeleccionado) {
          this.legajoSeleccionado = this.legajos.find(l => l.idChofer === this.choferSeleccionado!.idChofer) ?? null;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  changeChofer(e: any): void {
    const idChofer = e.target.value;
    this.historialAbierto.clear();
    this.historialPorCategoria.clear();
    if (!idChofer) {
      this.choferSeleccionado = null;
      this.legajoSeleccionado = null;
      return;
    }
    this.choferSeleccionado = this.choferes.find(c => c.idChofer === idChofer) ?? null;
    this.legajoSeleccionado = this.choferSeleccionado
      ? this.legajoService.getLegajoPorChofer(this.choferSeleccionado.idChofer) ?? null
      : null;
  }

  async toggleHistorial(doc: Documentacion): Promise<void> {
    if (this.historialAbierto.has(doc.idCategoria)) {
      this.historialAbierto.delete(doc.idCategoria);
      return;
    }
    if (!this.historialPorCategoria.has(doc.idCategoria) && this.legajoSeleccionado) {
      const historial = await this.legajoService.getHistorialDocumento(
        this.legajoSeleccionado.idLegajo,
        doc.idCategoria,
      );
      this.historialPorCategoria.set(doc.idCategoria, historial);
    }
    this.historialAbierto.add(doc.idCategoria);
  }

  abrirModal(index: number): void {
    if (!this.legajoSeleccionado) return;
    this.abrirModalImagenes(this.legajoSeleccionado.documentacion[index].imagenes || []);
  }

  abrirModalImagenes(imagenes: { nombre: string; url: string }[]): void {
    this.archivosPrevisualizados = imagenes;
    const modalRef = this.modalService.open(CarruselComponent, {
      windowClass: 'myCustomModalClass',
      centered: true,
      size: 'lg',
    });
    modalRef.componentInstance.fromParent = { item: this.archivosPrevisualizados };
    modalRef.result.then(
      () => {},
      () => {},
    );
  }

  descargarLegajo(): void {
    if (!this.legajoSeleccionado || !this.choferSeleccionado) {
      console.error('No hay legajo seleccionado');
      return;
    }

    const zip = new JSZip();
    const carpeta = zip.folder(this.choferSeleccionado.datosPersonales.apellido + '_' + this.choferSeleccionado.datosPersonales.nombre);
    const promises: Promise<any>[] = [];

    this.legajoSeleccionado.documentacion.forEach((doc) => {
      doc.imagenes.forEach((archivo) => {
        const url = archivo.url;
        const nombreArchivo = archivo.nombre;

        const promesa = fetch(url)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Error al descargar ${nombreArchivo}: ${response.statusText}`);
            }
            const contentType = response.headers.get('content-type');
            if (!contentType || !(contentType.includes('application/pdf') || contentType.includes('image/'))) {
              throw new Error(`El archivo ${nombreArchivo} no es válido (${contentType})`);
            }
            return response.blob();
          })
          .then((blob) => {
            if (blob.size === 0) {
              throw new Error(`El archivo ${nombreArchivo} está vacío.`);
            }
            carpeta?.file(nombreArchivo, blob);
          })
          .catch((error) => {
            console.error('Error al procesar archivo:', error);
          });

        promises.push(promesa);
      });
    });

    Promise.all(promises)
      .then(() => {
        if (carpeta?.length === 0) {
          console.error('No se pudo agregar ningún archivo al ZIP');
          return;
        }
        zip.generateAsync({ type: 'blob' })
          .then((contenido: string | Blob) => {
            saveAs(contenido, `${this.choferSeleccionado!.datosPersonales.apellido}_${this.choferSeleccionado!.datosPersonales.nombre}_legajo.zip`);
          });
      })
      .catch((error) => {
        console.error('Error al generar el ZIP:', error);
      });
  }

  esImagen(url: string): boolean {
    const extensionesImagen = ['jpg', 'jpeg', 'png', 'gif'];
    const extension = url.split('.').pop()?.toLowerCase();
    return extensionesImagen.includes(extension || '');
  }

  esPDF(url: string): boolean {
    return /\.pdf$/i.test(url);
  }

}
