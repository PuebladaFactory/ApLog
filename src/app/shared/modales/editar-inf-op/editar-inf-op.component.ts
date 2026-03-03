import { Component, Input, OnInit } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { NgbActiveModal, NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { lowerFirst } from "lodash";
import { Subject } from "rxjs";
import { Chofer, Vehiculo } from "src/app/interfaces/chofer";
import { Cliente } from "src/app/interfaces/cliente";
import { ConId, ConIdType } from "src/app/interfaces/conId";
import { InformeOp } from "src/app/interfaces/informe-op";
import { Operacion, TarifaPersonalizada } from "src/app/interfaces/operacion";
import { Proveedor } from "src/app/interfaces/proveedor";
import {
  CategoriaTarifa,
  TarifaGralCliente,
  TarifaTipo,
} from "src/app/interfaces/tarifa-gral-cliente";
import {
  Seccion,
  TarifaPersonalizadaCliente,
} from "src/app/interfaces/tarifa-personalizada-cliente";
import { BuscarTarifaService } from "src/app/servicios/buscarTarifa/buscar-tarifa.service";
import { DbFirestoreService } from "src/app/servicios/database/db-firestore.service";
import { FormatoNumericoService } from "src/app/servicios/formato-numerico/formato-numerico.service";
import { StorageService } from "src/app/servicios/storage/storage.service";
import { ValoresOpClienteService } from "src/app/servicios/valores-op/valores-op-cliente/valores-op-cliente.service";
import Swal from "sweetalert2";

@Component({
  selector: "app-editar-inf-op",
  standalone: false,
  templateUrl: "./editar-inf-op.component.html",
  styleUrl: "./editar-inf-op.component.scss",
})
export class EditarInfOpComponent implements OnInit {
  @Input() fromParent: any;
  infOpDetallada!: ConId<InformeOp>;
  edicion: boolean = false;
  tarifaEditForm: any;
  swichForm: any;
  facturaEditada!: ConId<InformeOp>;
  swich!: boolean;
  choferes!: ConIdType<Chofer>[];
  clientes!: ConIdType<Cliente>[];
  proveedores!: ConIdType<Proveedor>[];
  choferOp!: ConIdType<Chofer>[];
  vehiculoOp!: Vehiculo;
  operacion!: ConId<Operacion>;
  tarifaPersonalizada!: ConIdType<TarifaPersonalizadaCliente>;
  coleccionInformeOp: string = "";
  coleccionContraParte: string = "";
  infOpOriginal!: ConId<InformeOp>;
  opOriginal!: ConId<Operacion>;
  facContraParte!: ConId<InformeOp>;
  formAcomp!: any;
  private destroy$ = new Subject<void>();
  gastoExtraCliente: number = 0;
  gastoExtraChofer: number = 0;
  tarifaAplicada!: ConId<TarifaGralCliente>;
  tarifaGralCliente!: TarifaGralCliente;
  tarifaGralChofer!: TarifaGralCliente;
  tarifaGralProveedor!: TarifaGralCliente;
  tarifaDefaultAcomp!: TarifaGralCliente;
  tarifaDefaultContraParte!: TarifaGralCliente;
  informeContraParte!: ConId<InformeOp>;
  contraparteColeccion: string = "";
  modoContraParte: string = "";
  informeCliente!: ConId<InformeOp>;
  informeChofer!: ConId<InformeOp>;
  isLoading: boolean = false;
  tarifaContraParte!: TarifaGralCliente;
  multiplicadorOriginal: number = 1;
  multiplicadorContraParte: number = 1;
  formTarifaPersonalizada!: any;
  tarifaClienteSel!: ConIdType<TarifaPersonalizadaCliente> | undefined;
  mostrarCategoria: boolean = false;
  seccionElegida!: Seccion;
  categoriaElegida: number = 0;
  tarifaPersonalizadaOp!: TarifaPersonalizada;
  tarifaTipo!: TarifaTipo;
  editarContraParte: boolean = false;
  editarChofer: boolean = true;
  editarCliente: boolean = true;

  constructor(
    private storageService: StorageService,
    public activeModal: NgbActiveModal,
    private formNumServ: FormatoNumericoService,
    private dbFirebase: DbFirestoreService,
    private fb: FormBuilder,
    private valoresOpCliente: ValoresOpClienteService,
    private buscarTarifaServ: BuscarTarifaService,
  ) {
    this.formAcomp = this.fb.group({
      acompaniante: [false, Validators.required],
    });
    this.formTarifaPersonalizada = this.fb.group({
      seccion: ["", Validators.required],
      categoria: ["", Validators.required],
    });
  }

  async ngOnInit() {
    console.log("0) fromParent: ", this.fromParent);
    this.isLoading = true;
    this.operacion = structuredClone(this.fromParent.op);
    this.infOpDetallada = structuredClone(this.fromParent.infOp);
    this.choferes = this.storageService.loadInfo("choferes");
    this.clientes = this.storageService.loadInfo("choferes");
    this.proveedores = this.storageService.loadInfo("choferes");
    this.getColeccion();
    await this.getContraParte();
    this.emparejarVista();
    this.emparejarMultiplicadores();
    this.getDatos();
    this.getChofer();
    this.getTarifas();

    this.isLoading = false;
  }

  getColeccion() {
    switch (this.fromParent.origen) {
      case "cliente":
        if (this.fromParent.componente !== "facturacion") {
          this.coleccionInformeOp = "informesOpClientes";
        } else {
          this.coleccionInformeOp = "infOpLiqClientes";
        }
        break;
      case "chofer":
        if (this.fromParent.componente !== "facturacion") {
          this.coleccionInformeOp = "informesOpChoferes";
        } else {
          this.coleccionInformeOp = "infOpLiqChoferes";
        }
        break;
      case "proveedor":
        if (this.fromParent.componente !== "facturacion") {
          this.coleccionInformeOp = "informesOpProveedores";
        } else {
          this.coleccionInformeOp = "infOpLiqProveedores";
        }
        break;
      default:
        this.mensajesError("Error al determinar la colección de del informe");
        break;
    }
  }

  async getContraParte() {
    const contraparteRes = await this.dbFirebase.buscarContraParteInformeOp(
      this.infOpDetallada,
      this.coleccionInformeOp,
    );
    if (contraparteRes) {
      let contraparteInf: ConId<InformeOp> = contraparteRes.data;
      this.informeContraParte = structuredClone(contraparteInf);
      this.contraparteColeccion = contraparteRes.coleccion;
      //console.log("0)this.informeContraParte: ", this.informeContraParte);
      //console.log("0)this.contraparteColeccion: ", this.contraparteColeccion);
      if (this.informeContraParte.liquidacion || this.contraparteColeccion === 'infOpLiqClientes' || this.contraparteColeccion === 'infOpLiqChoferes' || this.contraparteColeccion === 'infOpLiqProveedores' ) {
        const liquidado = await Swal.fire({
          title:
            "La contra parte del informe ya fue liquidada y no puede ser modificada desde esta pantalla. ¿Desea continuar con la edición?",
          //text: "You won't be able to revert this!",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Continuar",
          cancelButtonText: "Cancelar",
        });
        if (!liquidado.isConfirmed) {
          this.activeModal.close();
        }
      } else {
        this.editarContraParte = true;
      }
    } else {
      return this.mensajesError("Error al obtener la contraparte del informe");
    }
    this.modoContraParte =
      this.fromParent.origen === "chofer" ||
      this.fromParent.origen === "proveedor"
        ? "cliente"
        : this.operacion.chofer.idProveedor === 0
          ? "chofer"
          : "proveedor";
    let tarifa = await this.buscarTarifaServ.buscarTarifa(
      this.informeContraParte,
      this.modoContraParte,
    );
    if (tarifa) {
      this.tarifaContraParte = tarifa;
    } else {
      return this.mensajesError(
        "Error al obtener la tarifa de la contraparte del informe",
      );
    }
    //console.log("this.editarContraParte: ", this.editarContraParte);
  }

  getDatos() {
    this.formAcomp.patchValue({
      acompaniante: this.operacion.acompaniante,
    });
    this.informeCliente.valores.adExtra =
      this.operacion.valores.cliente.adExtraValor ?? 0;
    this.informeChofer.valores.adExtra =
      this.operacion.valores.chofer.adExtraValor ?? 0;
    this.operacion.acompanienteCant = this.operacion.acompanienteCant ?? 0;
  }

  getChofer() {
    let vehiculoOp;
    let choferOp = this.choferes.find((chofer: Chofer) => {
      return chofer.idChofer === this.infOpDetallada.idChofer;
    });
    ////////console.log("4.25)this.choferOp: ", this.choferOp);
    if (choferOp) {
      vehiculoOp = choferOp.vehiculo.find((vehiculo: Vehiculo) => {
        return vehiculo.dominio === this.operacion.patenteChofer.toUpperCase();
      });
      if (vehiculoOp) {
        this.vehiculoOp = structuredClone(vehiculoOp);
      }
    }
    ////////console.log("4.5)vehiculoOp: ", this.vehiculoOp);
  }

  getCategoriaNombre(): string {
    let catCg = this.tarifaAplicada.cargasGenerales.filter(
      (cat: CategoriaTarifa) => {
        return cat.orden === this.vehiculoOp.categoria.catOrden;
      },
    );
    ////////console.log("getCategoriaValor: catCg: ", catCg);
    return catCg[0].nombre;
  }

  getCategoriaValor(): number {
    let catCg = this.tarifaAplicada.cargasGenerales.filter(
      (cat: CategoriaTarifa) => {
        return cat.orden === this.vehiculoOp.categoria.catOrden;
      },
    );
    ////////console.log("getCategoriaValor: catCg: ", catCg);
    return catCg[0].valor;
  }

  getKmPrimerSectorValor(): number {
    let catCg = this.tarifaAplicada.cargasGenerales.filter(
      (cat: CategoriaTarifa) => {
        return cat.orden === this.vehiculoOp.categoria.catOrden;
      },
    );
    ////////console.log("getCategoriaValor: catCg: ", catCg);
    return catCg[0].adicionalKm.primerSector;
  }

  getKmIntervalosSectorValor(): number {
    let catCg = this.tarifaAplicada.cargasGenerales.filter(
      (cat: CategoriaTarifa) => {
        return cat.orden === this.vehiculoOp.categoria.catOrden;
      },
    );
    ////////console.log("getCategoriaValor: catCg: ", catCg);
    return catCg[0].adicionalKm.sectoresSiguientes;
  }

  getTarifas() {
    if (!this.infOpDetallada.tarifaTipo.personalizada) {
      this.tarifaAplicada = this.fromParent.tarifaAplicada;
    } else {
      this.tarifaPersonalizada = this.fromParent.tarifaAplicada;
      ////console.log("this.tarifaPersonalizada: ", this.tarifaPersonalizada);
      this.tarifaPersonalizadaOp = structuredClone(
        this.operacion.tarifaPersonalizada,
      );
    }
    let tarifasGralCliente = this.storageService.loadInfo("tarifasGralCliente");
    let tarifasGralChofer = this.storageService.loadInfo("tarifasGralChofer");
    let tarifasGralProveedor = this.storageService.loadInfo(
      "tarifasGralProveedor",
    );

    this.tarifaGralCliente = tarifasGralCliente[0];
    this.tarifaGralChofer = tarifasGralChofer[0];
    this.tarifaGralProveedor = tarifasGralProveedor[0];

    ////console.log("tarifaGralCliente: ", this.tarifaGralCliente);
    ////console.log("tarifaGralChofer: ", this.tarifaGralChofer);
    ////console.log("tarifaGralProveedor: ", this.tarifaGralProveedor);
    this.getTarifasAcomp();
  }

  getTarifasAcomp() {
    if (this.operacion.tarifaTipo.especial) {
      this.tarifaDefaultAcomp = this.tarifaAplicada;
    } else {
      switch (this.fromParent.origen) {
        case "cliente":
          this.tarifaDefaultAcomp = this.tarifaGralCliente;
          break;
        case "chofer":
          this.tarifaDefaultAcomp = this.tarifaGralChofer;
          break;
        case "proveedor":
          this.tarifaDefaultAcomp = this.tarifaGralProveedor;
          break;
        default:
          this.mensajesError(
            "Error al seleccionar la tarifa para calcular los valores de los acompañantes",
          );
          break;
      }
    }
    //onsole.log("this.tarifaDefaultAcomp: ", this.tarifaDefaultAcomp);

    this.getTarifasAcompContraParte();
  }

  getTarifasAcompContraParte() {
    if (this.operacion.tarifaTipo.especial) {
      this.tarifaDefaultContraParte = this.tarifaContraParte;
    } else {
      switch (this.modoContraParte) {
        case "cliente":
          this.tarifaDefaultContraParte = this.tarifaGralCliente;
          break;
        case "chofer":
          this.tarifaDefaultContraParte = this.tarifaGralChofer;
          break;
        case "proveedor":
          this.tarifaDefaultContraParte = this.tarifaGralProveedor;
          break;
        default:
          this.mensajesError(
            "Error al seleccionar la tarifa de la contraparte para calcular los valores de los acompañantes",
          );
          break;
      }
    }
    ////console.log("this.tarifaDefaultContraParte: ", this.tarifaDefaultContraParte);
  }

  getClaseTarifa(inf: ConId<InformeOp>): string {
    if (inf.tarifaTipo.eventual) {
      return "bg-warning";
    }
    if (inf.tarifaTipo.personalizada) {
      return "bg-success";
    }
    if (inf.tarifaTipo.especial) {
      return "bg-info";
    }
    if (inf.tarifaTipo.general) {
      return "bg-primary";
    }
    return "bg-secondary";
  }

  async onSubmit() {
    //////console.log("onSubmit");
    if (
      this.operacion.tarifaTipo.personalizada &&
      this.tarifaPersonalizadaOp.categoria === 0
    )
      return this.mensajesError(
        "Debe seleccionar una categoria de la tarifa personalizada",
      );
    let cambios: boolean = false;
    const confirmacion = await Swal.fire({
      title: "¿Desea guardar los cambios?",
      //text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
    });

    if (confirmacion.isConfirmed) {
      ////console.log("this.infOpDetallada: ", this.infOpDetallada, "this.componente: ", this.coleccionInformeOp);

      //////////////////console.log("op: ", this.op);

      let consulta = await this.formatearDatos();
      cambios = true;
      //this.infOpOriginal = this.infOpDetallada;
      //this.opOriginal = this.operacion;
      let respuesta = {
        infOp: consulta.infOriginal,
        infOpColeccion: this.coleccionInformeOp,
        contraParte: consulta.contraparte,
        contraParteColeccion: this.contraparteColeccion,
        op: this.operacion,
        resultado: cambios,
      };
      console.log("respuesta", respuesta);

      this.activeModal.close(respuesta);
    } else {
      this.activeModal.close();
    }
    //////////console.log("factura EDITADA: ", this.infOpDetallada);
  }

  async formatearDatos() {
    //////console.log("formatearDatos");
    this.infOpDetallada = this.formatearInformeOp(
      this.infOpDetallada,
      "original",
    );
    if (this.editarContraParte) {
      this.informeContraParte = this.formatearInformeOp(
        this.informeContraParte,
        "contraparte",
      );
    } else {
      this.informeContraParte.contraParteMonto =
        this.infOpDetallada.valores.total;
    }

    this.emparejarVista();

    this.formatearOp();

    let respuesta = {
      infOriginal: this.infOpDetallada,
      contraparte: this.informeContraParte,
    };
    
    return respuesta;
  }

  formatearInformeOp(informeOp: ConId<InformeOp>, modo: string) {
    informeOp = {
      ...informeOp,
      valores: {
        tarifaBase: this.formNumServ.convertirAValorNumerico(
          informeOp.valores.tarifaBase,
        ),
        acompaniante: this.formNumServ.convertirAValorNumerico(
          informeOp.valores.acompaniante,
        ),
        kmMonto: this.formNumServ.convertirAValorNumerico(
          informeOp.valores.kmMonto,
        ),
        total: this.formNumServ.convertirAValorNumerico(
          informeOp.valores.total,
        ),
        adExtra: this.formNumServ.convertirAValorNumerico(
          informeOp.valores.adExtra ?? 0,
        ),
      },
      km: this.formNumServ.convertirAValorNumerico(informeOp.km),
      observaciones: this.operacion.observaciones,
      hojaRuta: this.operacion.hojaRuta,
      contraParteMonto:
        modo === "original"
          ? this.informeContraParte.valores.total
          : this.infOpDetallada.valores.total,
    };
    return informeOp;
  }

  formatearOp() {
    this.operacion = {
      ...this.operacion,
      valores: {
        cliente: {
          acompValor: this.informeCliente.valores.acompaniante,
          kmAdicional: this.informeCliente.valores.kmMonto,
          tarifaBase: this.informeCliente.valores.tarifaBase,
          aCobrar: this.informeCliente.valores.total,
          adExtraValor: this.informeCliente.valores.adExtra ?? 0,
        },
        chofer: {
          acompValor: this.informeChofer.valores.acompaniante,
          kmAdicional: this.informeChofer.valores.kmMonto,
          tarifaBase: this.informeChofer.valores.tarifaBase,
          aPagar: this.informeChofer.valores.total,
          adExtraValor: this.informeChofer.valores.adExtra ?? 0,
        },
      },
      km: this.formNumServ.convertirAValorNumerico(this.operacion.km),
      acompanienteCant: this.formNumServ.convertirAValorNumerico(
        this.operacion.acompanienteCant,
      ),
      observaciones: this.operacion.observaciones,
      hojaRuta: this.operacion.hojaRuta,
    };
    if (this.operacion.tarifaTipo.personalizada) {
      this.operacion.tarifaPersonalizada.aCobrar =
        this.operacion.valores.cliente.tarifaBase;
      this.operacion.tarifaPersonalizada.aPagar =
        this.operacion.valores.chofer.tarifaBase;
    }
    return this.operacion;
  }

  /* ACOMPAÑANTES */

  changeAcompaniante(event: any) {
    ////////////console.log(event.target.value);
    this.operacion.acompaniante = event.target.value.toLowerCase() == "true";
    //////////console.log(this.acompaniante);
    if (this.operacion.acompaniante) {
      this.operacion.acompanienteCant = 1;
    } else {
      this.operacion.acompanienteCant = 0;
    }

    this.valoresAcompaniantes();
  }

  changeCantAcompaniantes(event: any) {
    ////console.log(event.target.value);
    this.operacion.acompanienteCant = Number(event.target.value);
    ////console.log(this.operacion.acompanienteCant);
    if (this.operacion.acompanienteCant === 0) {
      this.operacion.acompaniante = false;
    }
    if (this.operacion.acompanienteCant > 0) {
      this.operacion.acompaniante = true;
    }
    this.formAcomp.patchValue({
      acompaniante: this.operacion.acompaniante,
    });
    this.valoresAcompaniantes();
  }

  valoresAcompaniantes() {
    if (this.operacion.acompaniante) {
      this.infOpDetallada.valores.acompaniante = this.tarifaDefaultAcomp
        ? this.tarifaDefaultAcomp?.adicionales.acompaniante *
          (this.operacion.acompanienteCant ?? 1)
        : 0;

      if (this.editarContraParte) {
        this.informeContraParte.valores.acompaniante = this
          .tarifaDefaultContraParte
          ? this.tarifaDefaultContraParte?.adicionales.acompaniante *
            (this.operacion.acompanienteCant ?? 1)
          : 0;
      }
    } else {
      this.infOpDetallada.valores.acompaniante = 0;
      if (this.editarContraParte) {
        this.informeContraParte.valores.acompaniante = 0;
      }
    }

    this.recalcularValores();
  }

  changeKm() {
    //console.log(this.operacion.tarifaTipo);

    this.operacion.km = Number(this.operacion.km);
    this.infOpDetallada.km = this.operacion.km;
    this.informeContraParte.km = this.operacion.km;
    if (
      this.operacion.tarifaTipo.especial ||
      this.operacion.tarifaTipo.general
    ) {
      this.calcularKmValores();
    } else {
      this.emparejarVista();
    }
  }

  calcularKmValores() {
    let vehiculo = this.operacion.chofer.vehiculo.find(
      (v) => v.dominio === this.operacion.patenteChofer,
    );

    if (vehiculo) {
      this.infOpDetallada.valores.kmMonto = this.valoresOpCliente.$calcularKm(
        this.operacion,
        this.tarifaAplicada,
        vehiculo,
      );
      if (this.editarContraParte) {
        this.informeContraParte.valores.kmMonto =
          this.valoresOpCliente.$calcularKm(
            this.operacion,
            this.tarifaContraParte,
            vehiculo,
          );
      }

      //console.log("km monto: ", this.infOpDetallada.valores.kmMonto);
    } else {
      return this.mensajesError("Error calculando el valor de los km");
    }
    //this.emparejarVista();
    this.recalcularValores();
  }

  valoresGastosExtras() {
    ////console.log("gastos extras: ",this.gastoExtraValor);
    this.informeCliente.valores.adExtra =
      this.formNumServ.convertirAValorNumerico(
        this.informeCliente.valores.adExtra,
      );
    this.informeChofer.valores.adExtra =
      this.formNumServ.convertirAValorNumerico(
        this.informeChofer.valores.adExtra,
      );
    this.emparejarDatos();

    this.recalcularValores();
  }

  tarifaBaseValor() {    
    this.informeCliente.valores.tarifaBase =
      this.formNumServ.convertirAValorNumerico(
        this.informeCliente.valores.tarifaBase,
      );
    this.informeChofer.valores.tarifaBase =
      this.formNumServ.convertirAValorNumerico(
        this.informeChofer.valores.tarifaBase,
      );
    
    this.emparejarDatos();

    this.recalcularValores();
  }

  changeMultiCliente(event: any) {
    let valor = Number(event.target.value);

    // Validar rango (0–2)
    if (isNaN(valor) || valor < 0 || valor > 2) {
      alert("El multiplicador debe estar entre 0 y 2");

      // Reasignar valor válido
      valor = 1;
      this.operacion.multiplicadorCliente = valor;

      // Forzar actualización visual del input
      event.target.value = valor.toString();

      return;
    }

    // Calcular normalmente
    this.operacion.multiplicadorCliente = valor;
    //console.log("multiplicador-cliente: ", this.operacion.multiplicadorCliente);
    this.emparejarMultiplicadores();
    this.recalcularValores();
  }

  changeMultiChofer(event: any) {
    let valor = Number(event.target.value);

    // Validar rango (0–2)
    if (isNaN(valor) || valor < 0 || valor > 2) {
      alert("El multiplicador debe estar entre 0 y 2");

      // Reasignar valor válido
      valor = 1;
      this.operacion.multiplicadorChofer = valor;

      // Forzar actualización visual del input
      event.target.value = valor.toString();

      return;
    }

    // Calcular normalmente
    this.operacion.multiplicadorChofer = valor;
    //console.log("multiplicador-chofer: ", this.operacion.multiplicadorChofer);
    this.emparejarMultiplicadores();
    this.recalcularValores();
  }

  recalcularValores() {
    //console.log("recalcularValores: ", this.editarContraParte);

    this.infOpDetallada.valores.total =
      this.formNumServ.convertirAValorNumerico(
        this.infOpDetallada.valores.tarifaBase * this.multiplicadorOriginal,
      ) +
      this.infOpDetallada.valores.kmMonto +
      this.infOpDetallada.valores.acompaniante +
      (this.infOpDetallada.valores.adExtra ?? 0);
    if (this.editarContraParte) {
      this.informeContraParte.valores.total =
        this.formNumServ.convertirAValorNumerico(
          this.informeContraParte.valores.tarifaBase *
            this.multiplicadorContraParte,
        ) +
        this.informeContraParte.valores.kmMonto +
        this.informeContraParte.valores.acompaniante +
        (this.informeContraParte.valores.adExtra ?? 0);
    }

    this.emparejarVista();
  }

  mensajesError(msj: string) {
    Swal.fire({
      icon: "error",
      //title: "Oops...",
      text: `${msj}`,
      //footer: `${msj}`
    });
  }

  /* METODOS AUXILIARES */
  emparejarDatos() {
    if (this.fromParent.origen === "cliente") {
      this.infOpDetallada = structuredClone(this.informeCliente);
      this.informeContraParte = structuredClone(this.informeChofer);
    } else {
      this.infOpDetallada = structuredClone(this.informeChofer);
      this.informeContraParte = structuredClone(this.informeCliente);
    }
  }

  emparejarVista() {
    if (this.fromParent.origen === "cliente") {
      this.informeCliente = structuredClone(this.infOpDetallada);
      this.informeChofer = structuredClone(this.informeContraParte);
      this.editarChofer = this.editarContraParte;
    } else {
      this.informeChofer = structuredClone(this.infOpDetallada);
      this.informeCliente = structuredClone(this.informeContraParte);
      this.editarCliente = this.editarContraParte;
    }
  }

  emparejarMultiplicadores() {
    if (this.fromParent.origen === "cliente") {
      this.multiplicadorOriginal = this.operacion.multiplicadorCliente;
      this.multiplicadorContraParte = this.operacion.multiplicadorChofer;
    } else {
      this.multiplicadorOriginal = this.operacion.multiplicadorChofer;
      this.multiplicadorContraParte = this.operacion.multiplicadorCliente;
    }
  }

  ///////// TARIFA PERSONALIZADA /////////////
  changeSecion(e: any) {
    //console.log("seccion: ", e.target.value);
    this.tarifaPersonalizadaOp = {
      seccion: Number(e.target.value),
      categoria: 0,
      nombre: "",
      aCobrar: 0,
      aPagar: 0,
    };
  }

  changeCategoria(e: any) {
    //console.log("categoria: ", e.target.value);
    let valor = Number(e.target.value);
    let categoria = this.tarifaPersonalizada.secciones[
      this.tarifaPersonalizadaOp.seccion - 1
    ].categorias.find((c) => {
      return c.orden === valor;
    });
    ////console.log("categoria: ",categoria);

    if (categoria) {
      this.tarifaPersonalizadaOp = {
        seccion: this.tarifaPersonalizadaOp.seccion,
        categoria: categoria.orden,
        nombre: categoria.nombre,
        aCobrar: categoria.aCobrar,
        aPagar: categoria.aPagar,
      };
      ////////console.log("tarifa personalizada: ", this.tPersonalizada);
      this.operacion.tarifaPersonalizada = this.tarifaPersonalizadaOp;
      this.operacion.valores.cliente.tarifaBase =
        this.formNumServ.convertirAValorNumerico(
          this.tarifaPersonalizadaOp.aCobrar,
        );
      this.operacion.valores.chofer.tarifaBase =
        this.formNumServ.convertirAValorNumerico(
          this.tarifaPersonalizadaOp.aPagar,
        );
      ////console.log("tarifaPersonalizadaOp: ",this.tarifaPersonalizadaOp);
      if (this.fromParent.origen === "cliente") {
        this.informeCliente.valores.tarifaBase =
          this.operacion.valores.cliente.tarifaBase;
        if (this.editarContraParte) {
          this.informeChofer.valores.tarifaBase =
            this.operacion.valores.chofer.tarifaBase;
        }
      } else {
        if (this.editarContraParte) {
          this.informeCliente.valores.tarifaBase =
            this.operacion.valores.cliente.tarifaBase;
        }
        this.informeChofer.valores.tarifaBase =
          this.operacion.valores.chofer.tarifaBase;
      }

      this.emparejarDatos();
      this.recalcularValores();
    } else {
      this.mensajesError(
        "Error al encontrar la categoria de la tarifa personalizada",
      );
    }
  }

   ///////// TARIFA EVENTUAL /////////////
   changeTarifaEVentual(){
      this.operacion.tarifaEventual.cliente.valor = this.formNumServ.convertirAValorNumerico(this.operacion.tarifaEventual.cliente.valor);
      this.operacion.tarifaEventual.chofer.valor = this.formNumServ.convertirAValorNumerico(this.operacion.tarifaEventual.chofer.valor);
      this.operacion.valores.cliente.tarifaBase = this.operacion.tarifaEventual.cliente.valor;
      this.operacion.valores.chofer.tarifaBase = this.operacion.tarifaEventual.chofer.valor;
      if (this.fromParent.origen === "cliente") {
        this.informeCliente.valores.tarifaBase =
          this.operacion.valores.cliente.tarifaBase;
        if (this.editarContraParte) {
          this.informeChofer.valores.tarifaBase =
            this.operacion.valores.chofer.tarifaBase;
        }
      } else {
        if (this.editarContraParte) {
          this.informeCliente.valores.tarifaBase =
            this.operacion.valores.cliente.tarifaBase;
        }
        this.informeChofer.valores.tarifaBase =
          this.operacion.valores.chofer.tarifaBase;
      }
      this.emparejarDatos();
      this.recalcularValores();
   }
}
