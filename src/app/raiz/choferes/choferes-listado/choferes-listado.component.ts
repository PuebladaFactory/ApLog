import { Component, OnDestroy, OnInit } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { Subject, takeUntil } from "rxjs";
import { Chofer, Vehiculo } from "src/app/interfaces/chofer";
import { ConIdType } from "src/app/interfaces/conId";
import { Proveedor } from "src/app/interfaces/proveedor";
import { ColumnaTablaGenerica, AccionTablaGenerica } from "src/app/interfaces/tabla-generica";
import Swal from "sweetalert2";
import { ChoferesAltaComponent } from "../choferes-alta/choferes-alta.component";
import { BajaObjetoComponent } from "src/app/shared/modales/baja-objeto/baja-objeto.component";
import { EntidadesExportService } from "src/app/servicios/entidades/entidades-export.service";
import { VisibilidadListadosComponent } from "src/app/shared/modales/visibilidad-listados/visibilidad-listados.component";
import { ChoferService } from "src/app/servicios/choferes/chofer.service";
import { ProveedorService } from "src/app/servicios/proveedores/proveedor.service";
import { UsuarioSesionService } from "src/app/servicios/usuario-sesion/usuario-sesion.service";
import { FichaEntidadService } from "src/app/servicios/ficha-entidad/ficha-entidad.service";

@Component({
  selector: "app-choferes-listado",
  standalone: false,
  templateUrl: "./choferes-listado.component.html",
  styleUrl: "./choferes-listado.component.scss",
})
export class ChoferesListadoComponent implements OnInit, OnDestroy {
  componente: string = "choferes";
  $choferes!: ConIdType<Chofer>[];
  $proveedores!: ConIdType<Proveedor>[];
  private destroy$ = new Subject<void>();

  choferesFiltrados: ConIdType<Chofer>[] = [];
  filtroEstado: "visibles" | "todos" = "visibles";

  isLoading: boolean = false;
  $vehiculos!: ConIdType<Vehiculo>[];

  columnas: ColumnaTablaGenerica[] = [];
  filas: any[] = [];
  accionesTabla: AccionTablaGenerica[] = [];

  constructor(
    private modalService: NgbModal,
    private entidadesExport: EntidadesExportService,
    private choferService: ChoferService,
    private proveedorService: ProveedorService,
    public usuarioSesion: UsuarioSesionService,
    private fichaEntidad: FichaEntidadService,
  ) {}

  ngOnInit(): void {
    this.proveedorService.proveedores$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.$proveedores = data;
        console.log("aca proveedores: ", this.$proveedores);
      });
    this.choferService.choferes$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.$choferes = data;
        this.$choferes.sort((a, b) =>
          a.datosPersonales.apellido.localeCompare(b.datosPersonales.apellido),
        );
        this.aplicarFiltro(); // 👈 clave
        console.log("aca choferes: ", this.$choferes);
      });
    this.choferService.vehiculos$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.$vehiculos = data;
        console.log("aca vehiculos: ", this.$vehiculos);
      });
    this.columnas = [
      { field: 'idChofer', header: 'Id', visible: false, width: 100 },
      { field: 'apellido', header: 'Apellido', visible: true, width: 150 },
      { field: 'nombre', header: 'Nombre', visible: true, width: 150 },      
      { field: 'cuit', header: 'CUIT', visible: true, width: 90 },      
      { field: 'celular', header: 'Celular', visible: true, width: 90 },
      { field: 'email', header: 'Email', visible: true, width: 140 },
      //{ field: 'contratacion', header: 'Contratación', visible: true, width: 120 },
      { field: 'proveedor', header: 'Proveedor', visible: true, width: 120 },
      { field: 'tarifa', header: 'Tarifa', visible: true, width: 90 },
      { field: 'activo', header: 'Estado', visible: false, width: 90 },      
      
    ];

    this.accionesTabla = [
      { tipo: 'ver', handler: (fila) => this.abrirVista(fila._objeto) },
      { tipo: 'editar', handler: (fila) => this.abrirEdicion(fila._objeto) },
      { tipo: 'eliminar', handler: (fila) => this.eliminarChofer(fila._objeto) },
    ];
  }

  aplicarFiltro(): void {
    if (this.filtroEstado === "visibles") {
      this.choferesFiltrados = this.$choferes.filter((c) => c.visible === true);
    } else {
      this.choferesFiltrados = [...this.$choferes];
    }

    this.armarTabla();
  }

  private readonly ETIQUETAS_TARIFA: Record<string, string> = {
    general: 'General',
    especial: 'Especial',
    personalizada: 'Personalizada',
    eventual: 'Eventual',
  };

  private tarifaLabel(c: ConIdType<Chofer>): string {
    if (c.contratacion.tipo === 'proveedor') return 'Tarifa Proveedor';
    // c.contratacion.tipo === 'directo' acá: tarifasHabilitadas nunca es null (solo lo es
    // para choferes de proveedor), el ?? [] es solo para que TS no se queje del tipo nullable.
    return (c.tarifasHabilitadas ?? []).map(t => this.ETIQUETAS_TARIFA[t.nivel]).join(', ');
  }

  armarTabla(): void {
    this.filas = this.choferesFiltrados.map(c => ({
      idChofer: c.idChofer,
      apellido: c.datosPersonales.apellido,
      nombre: c.datosPersonales.nombre,
      cuit: this.formatCuit(c.datosPersonales.cuit),
      celular: c.datosPersonales.celularContacto,
      email: c.datosPersonales.email,
      //contratacion: c.contratacion.tipo === 'directo' ? 'Directo' : 'Proveedor',
      proveedor: c.contratacion.tipo === 'directo' ? 'No' : this.getProveedor(c.contratacion.idProveedor),
      tarifa: this.tarifaLabel(c),
      activo: c.activo ? 'Activo' : 'Inactivo',
      _objeto: c,
    }));
  }

  cambiarFiltro(valor: "visibles" | "todos"): void {
    this.filtroEstado = valor;
    this.aplicarFiltro();
  }

  limpiarFiltros(): void {
  }

  abrirVista(chofer: ConIdType<Chofer>): void {
    this.fichaEntidad.abrir('chofer', chofer.idChofer);
  }

  abrirEdicion(chofer: ConIdType<Chofer>): void {
    this.openModal('edicion', chofer);
  }

  eliminarChofer(row: any): void {    
    
    const chofer = row as ConIdType<Chofer>;
    console.log("chofer: ", chofer);
    Swal.fire({
      title: "¿Eliminar el Chofer?",
      text: "No se podrá revertir esta acción",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        this.openModalBaja(chofer);
      }
    });
  }

  openModal(modo: string, chofer?: ConIdType<Chofer>): void {
    const modalRef = this.modalService.open(ChoferesAltaComponent, {
      windowClass: "myCustomModalClass",
      centered: true,
      size: "lg",
    });
    modalRef.componentInstance.fromParent = {
      modo,
      item: chofer ?? null,
    };
  }

  openModalBaja(chofer: ConIdType<Chofer>): void {
    console.log("chofer: ", chofer);
    const modalRef = this.modalService.open(BajaObjetoComponent, {
      windowClass: "myCustomModalClass",
      centered: true,
      scrollable: true,
      size: "sm",
    });

    modalRef.componentInstance.fromParent = {
      modo: "Chofer",
      item: chofer,
    };

    modalRef.result.then((motivo) => {
      if (motivo !== undefined) {
        this.isLoading = true;
        this.choferService
          .eliminarChoferConVehiculos(chofer, motivo)
          .then(() => {
            this.isLoading = false;
            Swal.fire(
              "Confirmado",
              "El Chofer ha sido dado de baja",
              "success",
            );
          })
          .catch((e) => {
            this.isLoading = false;
            Swal.fire(
              "Error",
              `No se pudo dar de baja el chofer: ${e.message}`,
              "error",
            );
          });
      }
    });
  }

  formatCuit(cuitNumber: number | string): string {
    const cuitString = cuitNumber.toString();
    if (cuitString.length !== 11 || isNaN(Number(cuitString))) {
      return "Formato inválido";
    }
    return `${cuitString.slice(0, 2)}-${cuitString.slice(2, 10)}-${cuitString.slice(10)}`;
  }

  getProveedor(idProveedor: string) {
    let proveedor: ConIdType<Proveedor> | undefined;
    proveedor = this.$proveedores.find((p: Proveedor) => {
      return p.idProveedor === idProveedor;
    });
    if (proveedor) {
      return proveedor.razonSocial;
    } else {
      return "sin datos del proveedor";
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Excel del listado por la fachada del camino nuevo. Exporta LO QUE SE VE:
   *  choferesFiltrados es el listado con el filtro Visibles/Todos aplicado, y ese
   *  filtro queda escrito en el subtítulo del archivo. El spinner se apaga
   *  ANTES de cualquier Swal: el overlay lo tapa. */
  async descargarChoferes(): Promise<void> {
    if (this.choferesFiltrados.length === 0) {
      Swal.fire({
        icon: "info",
        title: "No hay choferes para exportar",
        text: "Con el filtro actual no queda ningún registro en el listado.",
      });
      return;
    }

    let error: unknown = null;
    this.isLoading = true;
    try {
      await this.entidadesExport.descargarChoferes(this.choferesFiltrados, this.filtroEstado);
    } catch (e) {
      error = e;
    } finally {
      this.isLoading = false;
    }

    if (error) {
      Swal.fire({
        icon: "error",
        title: "No se pudo generar el listado",
        text: (error as Error)?.message ?? String(error),
      });
    }
  }

  visibilidadChoferes() {
    {
      const modalRef = this.modalService.open(VisibilidadListadosComponent, {
        windowClass: "myCustomModalClass",
        centered: true,
        size: "md",
        //backdrop:"static"
      });

      let info = {
        tipo: "choferes",
        objetos: this.$choferes,
      };
      //console.log()(info); */

      modalRef.componentInstance.info = info;
      modalRef.result.then(() => {
        // modal cancelado → no hacemos nada
      });
    }
  }
}
