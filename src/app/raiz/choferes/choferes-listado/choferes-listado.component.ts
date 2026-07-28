import { Component, OnDestroy, OnInit } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { Subject, takeUntil } from "rxjs";
import { Chofer, Vehiculo } from "src/app/interfaces/chofer";
import { Cliente } from "src/app/interfaces/cliente";
import { ConId, ConIdType } from "src/app/interfaces/conId";
import { Proveedor } from "src/app/interfaces/proveedor";
import { StorageService } from "src/app/servicios/storage/storage.service";
import { ColumnaTabla, AccionTabla } from "src/app/interfaces/tabla";
import Swal from "sweetalert2";
import { ChoferesAltaComponent } from "../choferes-alta/choferes-alta.component";
import { BajaObjetoComponent } from "src/app/shared/modales/baja-objeto/baja-objeto.component";
import { DbFirestoreService } from "src/app/servicios/database/db-firestore.service";
import { ExcelService } from "src/app/servicios/informes/excel/excel.service";
import { VisibilidadListadosComponent } from "src/app/shared/modales/visibilidad-listados/visibilidad-listados.component";
import { ChoferService } from "src/app/servicios/choferes/chofer.service";
import { ProveedorService } from "src/app/servicios/proveedores/proveedor.service";
import { UsuarioSesionService } from "src/app/servicios/usuario-sesion/usuario-sesion.service";

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
  choferesActualizados: any[] = [];
  private destroy$ = new Subject<void>();

  choferesFiltrados: ConIdType<Chofer>[] = [];
  filtroEstado: "visibles" | "todos" = "visibles";

  choferesMock: ConIdType<Chofer>[] = [];
  isLoading: boolean = false;
  $vehiculos!: ConIdType<Vehiculo>[];

  columnas: ColumnaTabla[] = [];
  filas: any[] = [];
  accionesTabla: AccionTabla[] = [];

  constructor(
    private storageService: StorageService,
    private modalService: NgbModal,
    private dbFirebase: DbFirestoreService,
    private excelServ: ExcelService,
    private choferService: ChoferService,
    private proveedorService: ProveedorService,
    public usuarioSesion: UsuarioSesionService,
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
      tarifa: c.contratacion.tipo === 'proveedor' ? 'Tarifa Proveedor' : c.tarifaTipo.general ? 'General' : c.tarifaTipo.especial ? 'Especial' : c.tarifaTipo.eventual ? 'Eventual' : 'Error',
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
    this.openModal('vista', chofer);
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

  editarChoferes() {
    this.choferesActualizados = this.agregarCampoActivo(this.$choferes);
    console.log("choferesActualizados", this.choferesActualizados);
  }

  agregarCampoActivo(choferes: any): ConIdType<Chofer>[] {
    return choferes.map((chofer: any) => {
      return {
        ...chofer,
        activo: true,
      };
    });
  }

  actualizarChoferes() {
    this.dbFirebase.actualizarMultiple(this.choferesActualizados, "choferes");
  }

  descargarChoferes() {
    this.excelServ.exportarChoferesTablaExcel(this.choferesFiltrados);
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

  editarChoferesMock() {
    this.choferesMock = structuredClone(this.$choferes);
    this.choferesMock = this.anonimizarChoferes(this.choferesMock);

    console.log("this.clientesActivo", this.choferesMock);
  }

  public anonimizarChoferes(
    choferes: ConIdType<Chofer>[],
  ): ConIdType<Chofer>[] {
    return choferes.map((chofer) => ({
      ...chofer,

      nombre: this.randomString(10),
      apellido: this.randomString(10),
      cuit: this.randomNumber(11),
      celularContacto: this.randomNumber(10),
      celularEmergencia: this.randomNumber(10),
      contactoEmergencia: this.randomString(10),

      direccion: {
        ...chofer.datosPersonales.direccion,
        domicilio: this.randomString(10),
      },

      email: this.randomEmail(10),

      fechaNac: this.randomDate(),

      /*     vehiculo: chofer.vehiculo.map(v => ({
      ...v,
      dominio: this.randomDominio(),
    })) */
    }));
  }

  private randomString(length: number): string {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private randomNumber(length: number): number {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomEmail(length: number): string {
    return `${this.randomString(length)}@mail.com`;
  }

  private randomDate(): Date {
    const start = new Date(1960, 0, 1).getTime();
    const end = new Date(2005, 11, 31).getTime();
    return new Date(start + Math.random() * (end - start));
  }

  private randomDominio(): string {
    const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numeros = "0123456789";

    const l = () => letras.charAt(Math.floor(Math.random() * letras.length));
    const n = () => numeros.charAt(Math.floor(Math.random() * numeros.length));

    return `${l()}${l()}${l()}${n()}${n()}${n()}`;
  }

  async actualizarActivos() {
    this.isLoading = true;
    const resp = await this.dbFirebase.actualizarMultiple(
      this.choferesMock,
      "choferes",
    );
    if (resp) {
      this.isLoading = false;
      this.mensajesError(resp.mensaje);
    }
  }

  mensajesError(msj: string) {
    Swal.fire({
      icon: "error",
      //title: "Oops...",
      text: `${msj}`,
      //footer: `${msj}`
    });
  }
}
