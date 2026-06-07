import { Component, Input, OnInit } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { NgbActiveModal, NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { Categoria, Chofer, Vehiculo } from "src/app/interfaces/chofer";
import { Proveedor } from "src/app/interfaces/proveedor";
import {
  CategoriaTarifa,
  TarifaGralCliente,
  TarifaTipo,
} from "src/app/interfaces/tarifa-gral-cliente";
import { StorageService } from "src/app/servicios/storage/storage.service";
import Swal from "sweetalert2";
import { ModalVehiculoComponent } from "../modal-vehiculo/modal-vehiculo.component";
import { ValidarService } from "src/app/servicios/validar/validar.service";
import { ConId, ConIdType } from "src/app/interfaces/conId";
import { Subject, takeUntil } from "rxjs";
import { DomicilioService } from "src/app/servicios/domicilio/domicilio.service";
import {
  ChoferFactoryService,
  ChoferFormData,
} from "src/app/servicios/choferes/chofer-factory.service";
import { ChoferService } from "src/app/servicios/choferes/chofer.service";
import {
  ContratacionChofer,
  AsignacionVehiculo,
} from "src/app/interfaces/chofer";
import { ProveedorService } from "src/app/servicios/proveedores/proveedor.service";

@Component({
  selector: "app-choferes-alta",
  templateUrl: "./choferes-alta.component.html",
  styleUrls: ["./choferes-alta.component.scss"],
  standalone: false,
})
export class ChoferesAltaComponent implements OnInit {
  @Input() fromParent: any;

  componente!: string;
  form: any;
  jornadaForm: any;
  vehiculoForm: any;
  seguimientoForm: any;
  adicionalForm: any;
  categoriasForm: any;
  chofer!: ConIdType<Chofer>;
  soloVista: boolean = false;
  edicion: boolean = false;
  seguimiento: boolean = false;
  tipoCombustible!: string;
  tarjetaCombustible!: boolean;
  vehiculo!: Vehiculo;

  legajo!: any;
  refrigeracion!: boolean;
  $proveedores!: Proveedor[];
  proveedorSeleccionado!: Proveedor[];
  contratacion!: ContratacionChofer;
  editForm: any;
  publicidad!: boolean;
  categorias: Categoria[] = [];
  tarifaGralCliente!: TarifaGralCliente;
  categoriaSeleccionada: CategoriaTarifa | null = null;
  vehiculos: ConIdType<Vehiculo>[] = [];
  //satelital!: SeguimientoSatelital | boolean;
  formTipoTarifa!: any;
  private destroy$ = new Subject<void>();
  $provincias: any;
  $provinciaSeleccionada: string = "";
  $municipios!: any;
  $municipioSeleccionado: string = "";
  $localidades!: any;
  $localidadSeleccionada: string = "";
  direccionCompleta = {
    provincia: "",
    municipio: "",
    localidad: "",
    domicilio: "",
  };
  condFiscal: string = "";
  tarifaAsignada: boolean = false;
  cargando: boolean = false;

  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal,
    private modalService: NgbModal,
    private domicilioServ: DomicilioService,
    private choferFactoryService: ChoferFactoryService,
    private choferService: ChoferService,
    private proveedorService: ProveedorService,
  ) {
    this.form = this.fb.group({
      //formulario para el perfil
      nombre: ["", [Validators.required, Validators.maxLength(30)]],
      apellido: ["", [Validators.required, Validators.maxLength(30)]],
      cuit: [
        "",
        [
          Validators.required,
          Validators.minLength(13),
          Validators.maxLength(13), // Ajustado para incluir los guiones
          ValidarService.cuitValido,
        ],
      ],
      fechaNac: ["", Validators.required],
      email: ["", [Validators.email]],
      celularContacto: [
        "",
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(10),
        ],
      ],
      celularEmergencia: [
        "",
        [Validators.minLength(10), Validators.maxLength(10)],
      ],
      contactoEmergencia: ["", [Validators.maxLength(60)]],
      direccion: ["", [Validators.required, Validators.maxLength(50)]],
    });

    this.vehiculoForm = this.fb.group({
      dominio: [
        "",
        [Validators.required, Validators.minLength(6), Validators.maxLength(8)],
      ],
      marca: ["", [Validators.required, Validators.maxLength(50)]],
      modelo: ["", [Validators.required, Validators.maxLength(30)]],
    });

    this.seguimientoForm = this.fb.group({
      proveedor: ["", [Validators.required, Validators.maxLength(30)]],
      marcaGps: ["", [Validators.required, Validators.maxLength(30)]],
    });

    this.categoriasForm = this.fb.group({
      categorias: this.fb.array([]),
    });
    this.formTipoTarifa = this.fb.group({
      general: [true], // Seleccionado por defecto
      especial: [false],
      eventual: [false],
      personalizada: [false],
    });
  }

  ngOnInit(): void {
    console.log("1)", this.fromParent);
    let choferOriginal = this.fromParent?.item;
    this.chofer = structuredClone(choferOriginal);
    if (this.fromParent.modo !== "alta") this.getVehiculos();
    this.proveedorService.proveedores$
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe((data) => {
        this.$proveedores = data;
        this.$proveedores = this.$proveedores.sort((a, b) =>
          a.razonSocial.localeCompare(b.razonSocial),
        ); // Ordena por el nombre del chofer
        console.log("aca proveedores: ", this.$proveedores);
      });

    if (this.fromParent.modo === "vista") {
      this.tarifaAsignada = this.chofer.tarifaAsignada;
      this.soloVista = true;
      this.armarForm();
      this.form.disable();
      this.formTipoTarifa.disable();
    } else if (this.fromParent.modo === "edicion") {
      this.tarifaAsignada = this.chofer.tarifaAsignada;
      this.soloVista = false;
      this.armarForm();
    } else {
      this.soloVista = false;
    }

    this.domicilioServ.getProvincias().subscribe({
      next: (data) => {
        this.$provincias = data.provincias; // Asume que la respuesta tiene un atributo `provincias`.
        //console.log(this.$provincias);
      },
      error: (error) => {
        //console.error('Error al obtener provincias:', error);
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getVehiculos() {
    console.log("chofer: ", this.chofer);

    this.choferService
      .getVehiculosPorChofer(this.chofer.id)
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe((data) => {
        this.vehiculos = data;
      });
  }

  onTarifaTipoChange(tipoSeleccionado: string) {
    // Resetea los demás switches a false, excepto el seleccionado
    this.formTipoTarifa.patchValue({
      general: tipoSeleccionado === "general",
      especial: tipoSeleccionado === "especial",
      eventual: tipoSeleccionado === "eventual",
      personalizada: tipoSeleccionado === "personalizada",
    });
  }

  armarForm() {
    this.contratacion = this.chofer.contratacion;
    this.form.patchValue({
      nombre: this.chofer.datosPersonales.nombre,
      apellido: this.chofer.datosPersonales.apellido,
      cuit: this.formatCuit(this.chofer.datosPersonales.cuit),
      fechaNac: this.chofer.datosPersonales.fechaNac,
      email: this.chofer.datosPersonales.email,
      celularContacto: this.chofer.datosPersonales.celularContacto,
      celularEmergencia: this.chofer.datosPersonales.celularEmergencia,
      contactoEmergencia: this.chofer.datosPersonales.contactoEmergencia,
      direccion: this.chofer.datosPersonales.direccion.domicilio,
    });
    this.formTipoTarifa.patchValue({
      general: this.chofer.tarifaTipo.general,
      especial: this.chofer.tarifaTipo.especial,
      eventual: this.chofer.tarifaTipo.eventual,
      personalizada: this.chofer.tarifaTipo.personalizada,
    });
    this.$provinciaSeleccionada =
      this.chofer.datosPersonales.direccion.provincia;
    this.$municipioSeleccionado =
      this.chofer.datosPersonales.direccion.municipio;
    this.$localidadSeleccionada =
      this.chofer.datosPersonales.direccion.localidad;
    this.condFiscal = this.chofer.condFiscal;
    this.armarVehiculoForm();
  }

  armarVehiculoForm(): void {
    if (this.chofer.contratacion.tipo === "directo") {
      this.choferService
        .getVehiculosPorChofer(this.chofer.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe((vehiculos) => {
          this.vehiculos = vehiculos;
        });
    }
  }

  onSubmit() {
    if (this.contratacion === undefined) {
      return this.mensajesError("Debe seleccionar el tipo de contratación");
    }
    if (this.contratacion.tipo === "directo" && this.vehiculos.length === 0) {
      return this.mensajesError(
        "Debe asignarle al menos un vehículo al chofer directo",
      );
    }
    if (
      this.$provinciaSeleccionada === "" ||
      this.$municipioSeleccionado === "" ||
      this.$localidadSeleccionada === ""
    ) {
      return this.mensajesError("Debe completar el domicilio");
    }
    if (this.condFiscal === "") {
      return this.mensajesError("Debe seleccionar una condición fiscal");
    }
    if (this.form.valid) {
      if (this.fromParent.modo !== "edicion") {
        const cuitIngresado = Number(this.form.value.cuit.replace(/-/g, ""));
        const choferExistente =
          this.choferService.verificarCuitDuplicado(cuitIngresado);
        if (choferExistente) {
          Swal.fire({
            icon: "warning",
            title: "CUIT duplicado",
            text: `El CUIT ingresado ya está asignado a ${choferExistente.datosPersonales.apellido} ${choferExistente.datosPersonales.nombre}.`,
          });
          return;
        }
      }
      this.cargando = true;
      this.armarChofer();
      this.addItem();
    } else {
      this.mensajesError("Error en el formulario");
    }
  }

  armarChofer(): void {
    this.componente = "choferes";
    const tarifaSeleccionada = this.getTarifaTipo();
    const data: ChoferFormData = {
      nombre: this.form.value.nombre,
      apellido: this.form.value.apellido,
      cuit: this.form.value.cuit,
      fechaNac: this.form.value.fechaNac,
      email: this.form.value.email,
      celularContacto: this.form.value.celularContacto,
      celularEmergencia: this.form.value.celularEmergencia,
      contactoEmergencia: this.form.value.contactoEmergencia,
      provincia: this.$provinciaSeleccionada,
      municipio: this.$municipioSeleccionado,
      localidad: this.$localidadSeleccionada,
      domicilio: this.form.value.direccion,
      condFiscal: this.condFiscal,
      contratacion: this.contratacion,
      tarifaTipo: tarifaSeleccionada,
    };
    if (this.fromParent.modo === "edicion") {
      this.chofer = {
        ...this.choferFactoryService.editarChofer(this.chofer, data),
        id: this.chofer.id,
        type: this.chofer.type,
      } as ConIdType<Chofer>;
    } else {
      this.chofer = this.choferFactoryService.crearChofer(
        data,
      ) as ConIdType<Chofer>;
    }
  }

  // Método para obtener la selección actual del formulario
  getTarifaTipo(): TarifaTipo {
    const formValue = this.formTipoTarifa.value;
    const tarifaTipo: TarifaTipo = {
      general: formValue.general,
      especial: formValue.especial,
      eventual: formValue.eventual,
      personalizada: formValue.personalizada,
    };
    return tarifaTipo;
  }

  addItem(): void {
    const apellido = this.chofer.datosPersonales.apellido;
    const nombre = this.chofer.datosPersonales.nombre;

    if (this.fromParent.modo === "edicion") {
      Swal.fire({
        title: "¿Confirmar los cambios del Chofer?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Confirmar",
        cancelButtonText: "Cancelar",
      }).then((result) => {
        if (result.isConfirmed) {          
          this.choferService
            .guardarChoferConVehiculos(this.chofer, this.vehiculos, "edicion")
            .then(() => {
              this.cargando = false;
              Swal.fire("Confirmado", "Cambios guardados", "success").then(
                () => {
                  this.activeModal.close();
                },
              );
            })
            .catch((e) => {
              this.cargando = false;
              Swal.fire(
                "Error",
                `No se pudieron guardar los cambios: ${e.message}`,
                "error",
              );
            });
        }
      });
    } else {
      Swal.fire({
        title: "¿Confirmar el alta del Chofer?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Confirmar",
        cancelButtonText: "Cancelar",
      }).then((result) => {
        if (result.isConfirmed) {
          this.choferService
            .guardarChoferConVehiculos(this.chofer, this.vehiculos, "alta")
            .then(() => {
              this.cargando = true;
              Swal.fire("Confirmado", "Alta exitosa", "success").then(() => {
                this.cargando = false;
                this.activeModal.close();
              });
            })
            .catch((e) => {
              this.cargando = false;
              Swal.fire(
                "Error",
                `No se pudo completar el alta: ${e.message}`,
                "error",
              );
            });
        }
      });
    }
  }

  changeProveedor(e: any): void {
    const valor = e.target.value;
    if (valor === "directo") {
      this.contratacion = { tipo: "directo" };
    } else {
      this.contratacion = { tipo: "proveedor", idProveedor: valor };
      this.vehiculos = [];
    }
  }

  changeCondFiscal(e: any) {
    this.condFiscal = e.target.value;
    console.log("this.condFiscal: ", this.condFiscal);
  }

  getProveedor(idProveedor: string): string {
    const proveedor = this.$proveedores.find(
      (p) => String(p.idProveedor) === idProveedor,
    );
    return proveedor ? proveedor.razonSocial : "";
  }

  changeTipoCombustible(e: any) {
    this.tipoCombustible = e.target.value;
  }

  changeTarjetaombustible(e: any) {
    if (e.target.value === "si") {
      this.tarjetaCombustible = true;
    } else {
      this.tarjetaCombustible = false;
    }
  }

  changePublicidad(e: any) {
    if (e.target.value === "si") {
      this.publicidad = true;
    } else {
      this.publicidad = false;
    }
  }

  seguimientoSatelital(e: any) {
    switch (e.target.value) {
      case "si": {
        this.seguimiento = true;
        break;
      }
      case "no": {
        this.seguimiento = false;
        break;
      }
      default: {
        break;
      }
    }
  }

  validarPatente() {
    let patenteValida = this.vehiculoForm.validarPatente(
      this.editForm.value.patente,
    );

    if (patenteValida) {
      // //console.log()('es una patente valida');
      //this.validarTarifa()
    } else {
      //console.log()('no es una patente valida');
    }
  }

  openModal(): void {
    const modalRef = this.modalService.open(ModalVehiculoComponent, {
      windowClass: "myCustomModalClass",
      centered: true,
      size: "sm",
    });
    const asignadoA: AsignacionVehiculo =
      this.contratacion?.tipo === "directo"
        ? { tipo: "chofer", idChofer: this.chofer?.id ?? "" }
        : {
            tipo: "proveedor",
            idProveedor: (
              this.contratacion as { tipo: "proveedor"; idProveedor: string }
            ).idProveedor,
          };
    modalRef.componentInstance.asignadoA = asignadoA;
    modalRef.result.then(
      (result) => {
        if (result !== undefined) {
          this.vehiculos.push(result);
        }
      },
      () => {},
    );
  }

  eliminarVehiculo(indice: number) {
    this.vehiculos.splice(indice, 1);
    console.log(this.vehiculos);
  }

  editarVehiculo(i: number) {
    let vehiculo = this.vehiculos[i];
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
          this.vehiculos[indice] = result;
        }
      },
      () => {},
    );
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.form.get(controlName);
    return control?.hasError(errorName) && control.touched;
  }

  mensajesError(msj: string) {
    Swal.fire({
      icon: "error",
      //title: "Oops...",
      text: `${msj}`,
      //footer: `${msj}`
    });
  }

  formatCuit(cuitNumber: number | string): string {
    // Convertir el número a string, si no lo es
    const cuitString = cuitNumber.toString();

    // Validar que tiene exactamente 11 dígitos
    if (cuitString.length !== 11 || isNaN(Number(cuitString))) {
      throw new Error("El CUIT debe ser un número de 11 dígitos");
    }

    // Insertar los guiones en las posiciones correctas
    return `${cuitString.slice(0, 2)}-${cuitString.slice(2, 10)}-${cuitString.slice(10)}`;
  }

  selectProvincia(e: any) {
    console.log(e.target.value);
    this.$municipioSeleccionado = "";
    this.$localidadSeleccionada = "";
    this.$provinciaSeleccionada = e.target.value;
    this.cargarMunicipios();
  }

  cargarMunicipios(): void {
    if (this.$provinciaSeleccionada) {
      this.domicilioServ.getMunicipios(this.$provinciaSeleccionada).subscribe({
        next: (data) => {
          this.$municipios = data.municipios;
          console.log(this.$municipios);
        },
        error: (error) => {
          console.error("Error al obtener municipios:", error);
        },
      });
    }
  }

  selectMunicipio(e: any) {
    console.log(e.target.value);
    this.$localidadSeleccionada = "";
    this.$municipioSeleccionado = e.target.value;
    this.cargarLocalidades();
  }

  cargarLocalidades(): void {
    if (this.$municipioSeleccionado) {
      this.domicilioServ
        .getLocalidades(
          this.$municipioSeleccionado,
          this.$provinciaSeleccionada,
        )
        .subscribe({
          next: (data) => {
            this.$localidades = data.localidades;
            console.log(this.$localidades);
          },
          error: (error) => {
            console.error("Error al obtener localidades:", error);
          },
        });
    }
  }

  selectLocalidad(e: any) {
    console.log(e.target.value);
    this.$localidadSeleccionada = e.target.value;
  }
}
