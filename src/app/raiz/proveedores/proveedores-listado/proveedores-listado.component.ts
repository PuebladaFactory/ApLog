import { Component, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { Subject, take, takeUntil } from "rxjs";
import {
  AsignacionVehiculo,
  Chofer,
  ContratacionChofer,
  Vehiculo,
} from "src/app/interfaces/chofer";
import { ConId, ConIdType } from "src/app/interfaces/conId";
import { Proveedor } from "src/app/interfaces/proveedor";
import { ColumnaTabla, AccionTabla } from "src/app/interfaces/tabla";
import { StorageService } from "src/app/servicios/storage/storage.service";
import Swal from "sweetalert2";
import { ProveedoresAltaComponent } from "../proveedores-alta/proveedores-alta.component";
import { BajaObjetoComponent } from "src/app/shared/modales/baja-objeto/baja-objeto.component";
import { ExcelService } from "src/app/servicios/informes/excel/excel.service";
import { VisibilidadListadosComponent } from "src/app/shared/modales/visibilidad-listados/visibilidad-listados.component";
import { DbFirestoreService } from "src/app/servicios/database/db-firestore.service";
import { ProveedorService } from "src/app/servicios/proveedores/proveedor.service";
import { ChoferService } from "src/app/servicios/choferes/chofer.service";
import { ModalVehiculoComponent } from "../../choferes/modal-vehiculo/modal-vehiculo.component";
import { UsuarioSesionService } from "src/app/servicios/usuario-sesion/usuario-sesion.service";

@Component({
  selector: "app-proveedores-listado",
  standalone: false,
  templateUrl: "./proveedores-listado.component.html",
  styleUrl: "./proveedores-listado.component.scss",
})
export class ProveedoresListadoComponent implements OnInit, OnDestroy {
  @ViewChild("modalChoferes", { static: false }) modalChoferes: any;
  componente: string = "proveedores";
  $choferes!: ConId<Chofer>[];
  $proveedores!: ConIdType<Proveedor>[];
  proveedorEditar!: ConIdType<Proveedor>;
  choferesProveedor!: ConId<Chofer>[];
  private destroy$ = new Subject<void>();

  proveedoresFiltrados: ConIdType<Proveedor>[] = [];
  filtroEstado: "visibles" | "todos" = "visibles";
  proveedoresMockeados: ConIdType<Proveedor>[] = [];
  isLoading: boolean = false;

  columnas: ColumnaTabla[] = [];
  filas: any[] = [];
  accionesTabla: AccionTabla[] = [];
  vehiculosProveedor: ConIdType<Vehiculo>[] = [];
  contratacion!: AsignacionVehiculo;

  constructor(
    private storageService: StorageService,
    private modalService: NgbModal,
    private excelServ: ExcelService,
    private dbFirestore: DbFirestoreService,
    private proveedorService: ProveedorService,
    private choferService: ChoferService,
    public usuarioSesion: UsuarioSesionService,
  ) {}

  ngOnInit(): void {
    this.choferService.choferes$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.$choferes = data;
        this.$choferes.sort((a, b) =>
          a.datosPersonales?.apellido?.localeCompare(
            b.datosPersonales?.apellido,
          ),
        );
      });

    this.proveedorService.proveedores$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.$proveedores = data;
        this.$proveedores.sort((a, b) =>
          a.razonSocial.localeCompare(b.razonSocial),
        );
        this.aplicarFiltro();
      });
    this.columnas = [
      { field: "id", header: "Id", visible: false, width: 110 },
      {
        field: "razonSocial",
        header: "Razón Social",
        visible: true,
        width: 200,
      },
      { field: "cuit", header: "CUIT", visible: true, width: 90 },
      {
        field: "condFiscal",
        header: "Cond. Fiscal",
        visible: false,
        width: 180,
      },
      {
        field: "direccionFiscal",
        header: "Dirección Fiscal",
        visible: true,
        width: 220,
      },
      {
        field: "direccionOperativa",
        header: "Dirección Operativa",
        visible: true,
        width: 220,
      },
      { field: "tarifa", header: "Tarifa", visible: true, width: 80 },
      { field: "estado", header: "Estado", visible: false, width: 80 },
      /*         { field: 'contacto', header: 'Contacto', visible: false, width: 150 },
        { field: 'puesto', header: 'Puesto', visible: false, width: 120 },
        { field: 'telefono', header: 'Teléfono', visible: false, width: 120 },
        { field: 'correo', header: 'Correo', visible: true, width: 180 }, */
    ];

    this.accionesTabla = [
      {
        tipo: "vehiculos",
        handler: (fila) => this.mostrarVehiculos(fila._objeto),
      },
      { tipo: "ver", handler: (fila) => this.abrirVista(fila._objeto) },
      { tipo: "editar", handler: (fila) => this.abrirEdicion(fila._objeto) },
      {
        tipo: "eliminar",
        handler: (fila) => this.eliminarProveedor(fila._objeto),
      },
    ];
  }

  aplicarFiltro(): void {
    if (this.filtroEstado === "visibles") {
      this.proveedoresFiltrados = this.$proveedores.filter(
        (p) => p.visible === true,
      );
    } else {
      this.proveedoresFiltrados = [...this.$proveedores];
    }

    this.armarTabla();
  }

  armarTabla(): void {
    this.filas = this.proveedoresFiltrados.map((p) => ({
      id: p.idProveedor,
      razonSocial: p.razonSocial,
      cuit: this.formatCuit(p.cuit),
      condFiscal: p.condFiscal,
      direccionFiscal: `${p.direccionFiscal.domicilio}, ${p.direccionFiscal.municipio}, ${p.direccionFiscal.provincia}`,
      direccionOperativa: `${p.direccionOperativa.domicilio}, ${p.direccionOperativa.municipio}, ${p.direccionOperativa.provincia}`,
      tarifa: p.tarifaTipo.general
        ? "General"
        : p.tarifaTipo.especial
          ? "Especial"
          : p.tarifaTipo.personalizada
            ? "Personalizada"
            : "Eventual",
      estado: p.activo ? "Activo" : "Inactivo",
      /* contacto: p.contactos.length > 0 ? p.contactos[0].apellido : 'Sin Datos',
      puesto: p.contactos.length > 0 ? p.contactos[0].puesto : 'Sin Datos',
      telefono: p.contactos.length > 0 ? p.contactos[0].telefono : 'Sin Datos',
      correo: p.contactos.length > 0 ? p.contactos[0].email : 'Sin Datos', */
      _objeto: p,
    }));
  }

  cambiarFiltro(valor: "visibles" | "todos"): void {
    this.filtroEstado = valor;
    this.aplicarFiltro();
  }

  mostrarVehiculos(proveedor: ConIdType<Proveedor>): void {
    this.proveedorEditar = proveedor;
    this.choferesProveedor = this.$choferes.filter(
      (c) =>
        c.contratacion?.tipo === "proveedor" &&
        (c.contratacion as any).idProveedor === proveedor.idProveedor,
    );
    /*  this.choferService.vehiculos$.pipe(take(1)).subscribe(vehiculos => {
        this.vehiculosProveedor = vehiculos.filter(v =>
          v.asignadoA.tipo === 'proveedor' &&
          v.asignadoA.idProveedor === proveedor.idProveedor
        );
      }); */
    this.choferService
      .getVehiculosPorProveedor(this.proveedorEditar.idProveedor)
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe((data) => {
        this.vehiculosProveedor = data;
        console.log("vehiculosProveedor: ", this.vehiculosProveedor);
      });
    this.modalService.open(this.modalChoferes, {
      size: "lg",
      centered: true,
    });
  }

  abrirVista(proveedor: ConIdType<Proveedor>): void {
    this.openModal("vista", proveedor);
  }

  abrirEdicion(proveedor: ConIdType<Proveedor>): void {
    this.openModal("edicion", proveedor);
  }

  eliminarProveedor(proveedor: ConIdType<Proveedor>): void {
    Swal.fire({
      title: "¿Eliminar el Proveedor?",
      text: "Esta acción eliminará también sus vehículos y choferes asociados",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        this.openModalBaja(proveedor);
      }
    });
  }

  openModal(modo: string, proveedor?: ConIdType<Proveedor>): void {
    const modalRef = this.modalService.open(ProveedoresAltaComponent, {
      windowClass: "myCustomModalClass",
      centered: true,
      size: "lg",
    });
    modalRef.componentInstance.fromParent = {
      modo,
      item: proveedor ?? null,
    };
  }

  openModalBaja(proveedor: ConIdType<Proveedor>): void {
    const modalRef = this.modalService.open(BajaObjetoComponent, {
      windowClass: "myCustomModalClass",
      centered: true,
      scrollable: true,
      size: "sm",
    });
    modalRef.componentInstance.fromParent = {
      modo: "Proveedor",
      item: proveedor,
    };
    modalRef.result.then((motivo) => {
      if (motivo !== undefined) {
        this.isLoading = true;
        this.proveedorService
          .eliminarProveedorConVehiculos(proveedor, motivo)
          .then(() => {
            this.isLoading = false;
            Swal.fire(
              "Confirmado",
              "El Proveedor ha sido dado de baja",
              "success",
            );
          })
          .catch((e) => {
            this.isLoading = false;
            Swal.fire(
              "Error",
              `No se pudo dar de baja el proveedor: ${e.message}`,
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
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  descargarProveedores() {
    this.excelServ.exportarClientesTablaExcel(
      this.proveedoresFiltrados,
      "Proveedores",
    );
  }

  visibilidadProveedores() {
    {
      const modalRef = this.modalService.open(VisibilidadListadosComponent, {
        windowClass: "myCustomModalClass",
        centered: true,
        size: "md",
      });

      let info = {
        tipo: "proveedores",
        objetos: this.$proveedores,
      };

      modalRef.componentInstance.info = info;
      modalRef.result.then(() => {
        // modal cancelado → no hacemos nada
      });
    }
  }

  editarProveedores() {
    this.proveedoresMockeados = structuredClone(this.$proveedores);
    this.proveedoresMockeados = this.anonimizarProveedores(
      this.proveedoresMockeados,
    );

    console.log("this.clientesActivo", this.proveedoresMockeados);
  }

  public anonimizarProveedores(
    clientes: ConIdType<Proveedor>[],
  ): ConIdType<Proveedor>[] {
    return clientes.map((cliente) => ({
      ...cliente,

      cuit: this.randomNumber(11),

      direccionFiscal: {
        ...cliente.direccionFiscal,
        domicilio: this.randomString(10),
      },

      direccionOperativa: {
        ...cliente.direccionOperativa,
        domicilio: this.randomString(10),
      },

      contactos: cliente.contactos.map((contacto) => ({
        ...contacto,
        puesto: this.randomString(10),
        apellido: this.randomString(10),
        telefono: this.randomNumber(10),
        email: this.randomEmail(10),
      })),
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

  async actualizarActivos() {
    this.isLoading = true;
    const resp = await this.dbFirestore.actualizarMultiple(
      this.proveedoresMockeados,
      "proveedores",
    );
    if (resp) {
      this.isLoading = false;
      this.mensajesError(resp.mensaje);
    }
  }

  mensajesError(msj: string) {
    Swal.fire({
      icon: "error",
      text: `${msj}`,
    });
  }

  eliminarVehiculo(indice: number) {
    this.vehiculosProveedor.splice(indice, 1);
    this.confirmarOperatoria('la baja');
    console.log(this.vehiculosProveedor);
  }

  editarVehiculo(i: number) {
    let vehiculo = this.vehiculosProveedor[i];
    this.abrirModalEdicion(vehiculo, i);
  }

  abrirModalEdicion(vehiculo: Vehiculo, indice: number): void {
    const modalRef = this.modalService.open(ModalVehiculoComponent, {
      windowClass: "myCustomModalClass",
      centered: true,
      size: "sm",
    });
    modalRef.componentInstance.fromParent = vehiculo;
    modalRef.componentInstance.asignadoA = vehiculo.asignadoA;
    modalRef.result.then(
      (result) => {
        if (result !== undefined) {
          this.vehiculosProveedor[indice] = result;
          this.confirmarOperatoria('la edición');
        }
      },
      () => {},
    );
  }

  altaVehiculos(): void {
    const modalRef = this.modalService.open(ModalVehiculoComponent, {
      windowClass: "myCustomModalClass",
      centered: true,
      size: "sm",
    });
    const asignadoA: AsignacionVehiculo = {
      tipo: "proveedor",
      idProveedor: this.proveedorEditar.idProveedor,
    };
    modalRef.componentInstance.asignadoA = asignadoA;
    modalRef.result.then(
      (result) => {
        if (result !== undefined) {
          this.vehiculosProveedor.push(result);
          this.confirmarOperatoria('el alta')
          console.log(this.vehiculosProveedor);
        }
      },
      () => {},
    );
  }

  guardarVehiculos() {
    this.isLoading = true;
    this.proveedorService
      .guardarProveedorConVehiculos(
        this.proveedorEditar,
        this.vehiculosProveedor,
        "edicion",
      )
      .then(() => {
        this.isLoading = false;
        Swal.fire(
          "Confirmado",
          `Los vehículos del proveedor ${this.proveedorEditar.razonSocial} han sido editados`,
          "success",
        );
        this.modalService.dismissAll()
      })
      .catch((e) => {
        this.isLoading = false;
        Swal.fire(
          "Error",
          `No se pudo editar los vehículos del proveedor: ${e.message}`,
          "error",
        );
      });
  }

  confirmarOperatoria(modo: string){
      Swal.fire(
        "Confirmado",
        `Para efectuar ${modo} de los vehículos debe guardar los cambios.`,
        "success",
      );
  }
}
