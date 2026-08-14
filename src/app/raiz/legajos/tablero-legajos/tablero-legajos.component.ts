import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { ConIdType } from 'src/app/interfaces/conId';
import { Chofer } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { CategoriaDocumentacion, Documentacion, Legajo, estadoGeneralDeLegajo } from 'src/app/interfaces/legajo';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { LegajoService } from 'src/app/servicios/legajos/legajo.service';
import { CategoriaDocumentacionService } from 'src/app/servicios/categoria-documentacion/categoria-documentacion.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import { VisibilidadListadosComponent } from 'src/app/shared/modales/visibilidad-listados/visibilidad-listados.component';
import { GestionCategoriasDocumentacionComponent } from 'src/app/raiz/legajos/gestion-categorias-documentacion/gestion-categorias-documentacion.component';

@Component({
    selector: 'app-tablero-legajos',
    templateUrl: './tablero-legajos.component.html',
    styleUrls: ['./tablero-legajos.component.scss'],
    standalone: false
})
export class TableroLegajosComponent implements OnInit, OnDestroy {

  choferes: ConIdType<Chofer>[] = [];
  legajos: ConIdType<Legajo>[] = [];
  proveedores: ConIdType<Proveedor>[] = [];
  categoriasActivas: ConIdType<CategoriaDocumentacion>[] = [];

  choferesFiltrados: ConIdType<Chofer>[] = [];
  legajosFiltrados: ConIdType<Legajo>[] = [];
  filtrosProveedores = '';
  searchText: string = '';

  /** Expuesta al template — deriva el estado general a partir de la documentación, nunca se persiste. */
  readonly estadoGeneralDeLegajo = estadoGeneralDeLegajo;

  private destroy$ = new Subject<void>();

  constructor(
    private choferService: ChoferService,
    private proveedorService: ProveedorService,
    private legajoService: LegajoService,
    private categoriaDocumentacionService: CategoriaDocumentacionService,
    private modalService: NgbModal,
    public usuarioSesion: UsuarioSesionService,
  ) {}

  ngOnInit(): void {
    this.choferService.choferes$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.choferes = [...data].sort((a, b) =>
          a.datosPersonales.apellido.localeCompare(b.datosPersonales.apellido)
        );
        this.choferesFiltrados = this.choferes;
        this.filtrarLegajosConChoferes();
      });

    this.proveedorService.proveedores$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.proveedores = data;
      });

    this.legajoService.legajos$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.legajos = data;
        this.filtrarLegajosConChoferes();
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

  getChofer(id: string): string {
    const chofer = this.choferService.getChoferPorId(id);
    return chofer ? `${chofer.datosPersonales.apellido} ${chofer.datosPersonales.nombre}` : '—';
  }

  getProveedor(idProveedor: string): string {
    if (!idProveedor) return '';
    const proveedor = this.proveedorService.getProveedorPorId(idProveedor);
    return proveedor ? proveedor.razonSocial : '—';
  }

  getDocumento(documentacion: Documentacion[], idCategoria: string): Documentacion | undefined {
    return documentacion.find(doc => doc.idCategoria === idCategoria);
  }

  filtrarChoferes(idProveedor: string, razonSocial: string): void {
    this.choferesFiltrados = this.choferes;

    if (idProveedor !== '') {
      this.filtrosProveedores = razonSocial;
      this.choferesFiltrados = this.choferesFiltrados.filter(c =>
        c.contratacion.tipo === 'proveedor' && c.contratacion.idProveedor === idProveedor
      );
    } else {
      this.filtrosProveedores = '';
    }

    this.filtrarLegajosConChoferes();
  }

  openModalChoferes(): void {
    const modalRef = this.modalService.open(VisibilidadListadosComponent, {
      windowClass: 'myCustomModalClass',
      centered: true,
      size: 'md',
    });

    const info = {
      tipo: 'legajos',
      // Clon superficial: evita que el toggle optimista del modal
      // (obj.visible = !obj.visible, ver VisibilidadListadosComponent.actualizarObjeto)
      // mute el objeto real que LegajoService.toggleVisibilidad() vuelve a leer de
      // memoria — sin el clon, ambos pisos se pisarían entre sí (doble flip: se
      // terminaría persistiendo el valor original en vez del nuevo).
      objetos: this.legajos.map(l => ({ ...l })),
    };

    modalRef.componentInstance.info = info;
    modalRef.result.then(() => {
      // modal cancelado → no hacemos nada
    });
  }

  abrirGestionCategorias(): void {
    const modalRef = this.modalService.open(GestionCategoriasDocumentacionComponent, {
      windowClass: 'myCustomModalClass',
      centered: true,
      size: 'lg',
    });
    modalRef.result.then(() => {}, () => {});
  }

  private filtrarLegajosConChoferes(): void {
    const idsChoferes = this.choferesFiltrados.map(c => c.idChofer);

    this.legajosFiltrados = this.legajos
      .filter(l => idsChoferes.includes(l.idChofer))
      .sort((a, b) => {
        const choferA = this.choferes.find(c => c.idChofer === a.idChofer);
        const choferB = this.choferes.find(c => c.idChofer === b.idChofer);

        if (!choferA || !choferB) return 0;

        const nombreCompletoA = `${choferA.datosPersonales.apellido} ${choferA.datosPersonales.nombre}`.toLowerCase();
        const nombreCompletoB = `${choferB.datosPersonales.apellido} ${choferB.datosPersonales.nombre}`.toLowerCase();

        return nombreCompletoA.localeCompare(nombreCompletoB);
      });
  }
}
