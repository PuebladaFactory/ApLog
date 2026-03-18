import { Component, OnInit } from "@angular/core";
import { FormArray, FormBuilder, Validators } from "@angular/forms";

import { Cliente } from "src/app/interfaces/cliente";
import {
  CategoriaTarifa,
  Seccion,
  TarifaPersonalizadaCliente,
} from "src/app/interfaces/tarifa-personalizada-cliente";
import { StorageService } from "src/app/servicios/storage/storage.service";
import Swal from "sweetalert2";
import { ModalTarifaPersonalizadaComponent } from "../modal-tarifa-personalizada/modal-tarifa-personalizada.component";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { HistorialTarifasGralComponent } from "src/app/shared/modales/historial-tarifas-gral/historial-tarifas-gral.component";
import { FormatoNumericoService } from "src/app/servicios/formato-numerico/formato-numerico.service";
import { Subject, takeUntil } from "rxjs";
import {
  DbFirestoreService,
  ResultadoConObjeto,
} from "src/app/servicios/database/db-firestore.service";
import { ConId, ConIdType } from "src/app/interfaces/conId";
import { Router } from "@angular/router";
import { TarifasService } from "src/app/servicios/tarifas/tarifas.service";
import { ResumenTarifa, TarifaAumentoPayload } from "../cliente-tarifa-aumento/cliente-tarifa-aumento.component";

export interface TarifaForm {
  secciones: Seccion[];
  adKmboolean: boolean;
  adicionales: any;
}

type EstadoPantalla =
  | "viewer"
  | "editor"
  | "selector-cliente"
  | "historial"
  | "duplicar";

@Component({
  selector: "app-cliente-tarifa-personalizada",
  templateUrl: "./cliente-tarifa-personalizada.component.html",
  styleUrls: ["./cliente-tarifa-personalizada.component.scss"],
  standalone: false,
})
export class ClienteTarifaPersonalizadaComponent implements OnInit {
  componente: string = "tarifasPersCliente";
  secciones: Seccion[] = [];
  seccion!: Seccion;
  categorias: CategoriaTarifa[] = [];
  categoria!: CategoriaTarifa;
  seccionesForm!: FormArray;
  inputSecciones!: any;
  categoriaForm: any;
  descripcionForm: any;
  tarifasPersCliente!: ConId<TarifaPersonalizadaCliente>[];
  clientes!: ConId<Cliente>[];
  clienteSeleccionado!: ConId<Cliente>;
  clientesPers!: ConId<Cliente>[];
  ultTarifaCliente!: ConId<TarifaPersonalizadaCliente> | null;
  nuevaTarifa!: TarifaPersonalizadaCliente;
  private destroy$ = new Subject<void>();
  adKmSelect: boolean = false;
  cargando: boolean = false;
  usuario!: any;
  clienteDestinoId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private storageService: StorageService,
    private modalService: NgbModal,
    private formNumService: FormatoNumericoService,
    private dbFirebase: DbFirestoreService,
    private router: Router,
    private tarifasService: TarifasService,
  ) {
    this.inputSecciones = this.fb.group({
      cantSecciones: [""],
    });
    this.categoriaForm = this.fb.group({
      categoriaNum: [""],
      nombre: ["", [Validators.required]],
      aCobrar: ["", [Validators.required]],
      aPagar: ["", [Validators.required]],
    });
    this.seccionesForm = this.fb.array([]);
    this.descripcionForm = this.fb.group({
      descripcion: [""],
    });
    this.secciones = [];
  }
  idCliente: number | null = null;
  modo: "ver" | "crear" | "editar" | "aumentar" | "duplicar" | "historial" =
    "ver";
  estado: EstadoPantalla = "viewer"; /*  POR AHORA NO ESTA APLICADO */
  modoEditor: "crear" | "editar" | "aumentar" | "duplicar" | ''=
    ""; /*  POR AHORA NO ESTA APLICADO */

  ngOnInit(): void {
    this.clientes = this.storageService.loadInfo("clientes");
    this.clientesPers = this.clientes.filter((c) => c.tarifaTipo.personalizada);
    this.clientesPers = this.clientesPers.sort((a, b) =>
      a.razonSocial.localeCompare(b.razonSocial),
    );
    let usuario = this.storageService.loadInfo("usuario");
    this.usuario = usuario[0];

    this.storageService
      .getObservable<ConId<TarifaPersonalizadaCliente>>("tarifasPersCliente")
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        //////console.log("data-liquidaciones", data);

        this.buscarTarifas();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  buscarTarifas() {
    this.tarifasPersCliente =
      this.storageService.loadInfo("tarifasPersCliente");

    if (!this.idCliente) return;

    let tPersonalizada = this.tarifasPersCliente.find(
      (t: TarifaPersonalizadaCliente) => {
        return t.idCliente === this.idCliente;
      },
    );
    if (tPersonalizada) {
      this.ultTarifaCliente = tPersonalizada;
    } else {
      this.ultTarifaCliente = null;
    }
  }

  changeCliente(e: any) {
    this.estado = "viewer";
    this.idCliente = null;
    this.clienteDestinoId = null;

    if (!e.target.value) return (this.ultTarifaCliente = null);
    this.idCliente = Number(e.target.value);

    ////console.log("this.idCliente: ", this.idCliente);

    let cliente = this.clientesPers.find((c) => c.idCliente === this.idCliente);
    if (cliente) {
      this.clienteSeleccionado = cliente;
    } else {
      return this.mensajesError("No se encontró el cliente seleccionado");
    }

    this.buscarTarifas();
  }

  //////////////////////////////
  /* METODOS NUEVOS */
  //////////////////////////////

  async guardarTarifa(data: TarifaForm | TarifaAumentoPayload) {
    //console.log("0)data", data);
    let form: TarifaForm;
    let resumen = null;
    let metadata = null;

    if ("tarifa" in data) {
      // viene del aumento
      form = data.tarifa;
      resumen = data.resumen;
      metadata = data.metadata;
    } else {
      // flujo viejo
      form = data;
    }
    //console.log("a)form", form);     
    //console.log("b)resumen: ", resumen);
    //console.log("c)metadata: ", metadata);
    

    this.cargando = true;

    switch (this.modoEditor) {
      case "crear":
      case "duplicar":      
        this.crearTarifa(form);
        break;
      
        case 'aumentar':
        this.crearTarifa(form, resumen, metadata);
        break;
      
      case "editar":
        this.editarTarifaSeleccionada(form);
        break;
     

      default:
        break;
    }
  }

  async crearTarifa(
     form: TarifaForm,
      resumen?: ResumenTarifa | null,
      metadata?: any
  ) {

   
    
    const operatoria: ResultadoConObjeto =
      await this.tarifasService.altaTarifaPersonalizada(
        this.clienteSeleccionado,
        form,
        resumen,
        metadata
      );

    if (operatoria.exito) {
      this.cargando = false;
      this.storageService.logSimple(
        operatoria.objeto.idTarifa,
        "ALTA",
        "tarifasPersCliente",
        `Alta de la Tarifa Personaliza N° ${operatoria.objeto.idTarifa} del Cliente ${this.clienteSeleccionado.razonSocial}`,
        operatoria.exito,
      );
      Swal.fire("OK", "Tarifa dada de alta correctamente", "success");
    } else {
      this.cargando = false;
      this.storageService.logSimple(
        operatoria.objeto.idTarifa,
        "ALTA",
        "tarifasPersCliente",
        `Error en el alta de la Tarifa Personaliza N° ${operatoria.objeto.idTarifa} del Cliente ${this.clienteSeleccionado.razonSocial}`,
        operatoria.exito,
      );
      Swal.fire(
        "Error",
        `Error en el alta de la tarifa. Motivo: ${operatoria.mensaje} `,
        "error",
      );
    }

    this.estado = "viewer";
    this.modoEditor = "";
  }

  async editarTarifaSeleccionada(form: TarifaForm) {
    if (!this.ultTarifaCliente) return;

    const operatoria = await this.tarifasService.editarTarifaCliente(
      this.ultTarifaCliente.idTarifa,
      this.clienteSeleccionado.idCliente,
      form,
      this.usuario.email,
    );

    if (operatoria.exito) {
      this.cargando = false;
      this.storageService.logSimple(
        operatoria.objeto.idTarifa,
        "EDICION",
        "tarifasPersCliente",
        `Edición de la Tarifa Personaliza N° ${operatoria.objeto.idTarifa} del Cliente ${this.clienteSeleccionado.razonSocial}`,
        operatoria.exito,
      );
      Swal.fire("OK", "Tarifa editada correctamente", "success");
      this.estado = "viewer";
      this.modoEditor = "";
    } else {
      this.cargando = false;
      this.storageService.logSimple(
        this.ultTarifaCliente.idTarifa,
        "EDICION",
        "tarifasPersCliente",
        `Error en la edición de la Tarifa Personaliza N° ${this.ultTarifaCliente.idTarifa} del Cliente ${this.clienteSeleccionado.razonSocial}`,
        operatoria.exito,
      );
      Swal.fire(
        "Error",
        `Error la edición de la tarifa. Motivo: ${operatoria.mensaje} `,
        "error",
      );
      this.estado = "viewer";
      this.modoEditor = "";
    }
  }

  crear() {
    this.modoEditor = "crear";
    this.estado = "editor";
  }

  verTarifa() {
    this.estado = "viewer";
    this.modoEditor = "";
  }

  editarTarifa() {
    this.modoEditor = "editar";
    this.estado = "editor";
  }

  aumentarTarifa() {
    this.modoEditor = "aumentar";
    this.estado = "editor";
  }

  duplicarTarifa() {
    this.estado = "selector-cliente";
  }

  historial() {
    this.estado = "historial";
  }

  async seleccionarClienteDestino() {
    this.clienteDestinoId = Number(this.clienteDestinoId);

    const existe = await this.tarifasService.clienteTieneTarifa(
      this.clienteDestinoId,
    );

    if (existe) {
      const continuar = await Swal.fire({
        title: "El cliente ya tiene una tarifa personalizada",
        text: "Si procede, la nueva tarfia reemplazara a la tarifa vigente. ¿Desea continuar con la duplicación?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        //confirmButtonText: "Yes, delete it!",
      });
      if (continuar.isConfirmed) {
        if (this.clienteDestinoId) this.idCliente = this.clienteDestinoId;

        let cliente = this.clientesPers.find(
          (c) => c.idCliente === this.clienteDestinoId,
        );

        if (cliente) this.clienteSeleccionado = cliente;
        this.modoEditor = "duplicar";
        this.estado = "editor";
      }
      if (continuar.isDismissed) {
        this.clienteDestinoId = null;
        this.estado = "viewer";
        return;
      }
    }
  }

  get clientesParaDuplicar(): ConId<Cliente>[] {
    return this.clientesPers.filter((c) => c.idCliente !== this.idCliente);
  }

  mensajesError(msj: string) {
    Swal.fire({
      icon: "error",
      //title: "Oops...",
      text: `${msj}`,
      //footer: `${msj}`
    });
  }

  mostrarInfo() {
    Swal.fire({
      position: "top-end",
      //icon: "success",
      //title: "Your work has been saved",
      text: "Las tarifas personalizas estan compuestas por secciones, las cuales a su vez estan compuestas por categorias. Se pueden crear cuantas secciones se deseen. Y dentro de cada sección,cuantas categorias se deseen.",
      showConfirmButton: false,
      timer: 10000,
    });
  }

  abrirHistorialTarifas() {
    {
      const modalRef = this.modalService.open(HistorialTarifasGralComponent, {
        windowClass: "myCustomModalClass",
        centered: true,
        size: "xl",
        //backdrop:"static"
      });

      let info = {
        modo: "personalizada",
        tEspecial: false,
        id: this.clienteSeleccionado.idCliente,
      };
      //////////////console.log()(info); */

      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {},
        (reason) => {},
      );
    }
  }
}
