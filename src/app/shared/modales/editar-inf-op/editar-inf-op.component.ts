import { Component, Input, OnInit } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { NgbActiveModal, NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { Subject } from "rxjs";
import { Chofer, Vehiculo } from "src/app/interfaces/chofer";
import { Cliente } from "src/app/interfaces/cliente";
import { ConId, ConIdType } from "src/app/interfaces/conId";
import { InformeOp } from "src/app/interfaces/informe-op";
import { Operacion } from "src/app/interfaces/operacion";
import { Proveedor } from "src/app/interfaces/proveedor";
import {
  CategoriaTarifa,
  TarifaGralCliente,
} from "src/app/interfaces/tarifa-gral-cliente";
import { TarifaPersonalizadaCliente } from "src/app/interfaces/tarifa-personalizada-cliente";
import { DbFirestoreService } from "src/app/servicios/database/db-firestore.service";
import { FormatoNumericoService } from "src/app/servicios/formato-numerico/formato-numerico.service";
import { StorageService } from "src/app/servicios/storage/storage.service";
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
  ultimaTarifa!: ConIdType<TarifaGralCliente>;
  edicion: boolean = false;
  tarifaEditForm: any;
  swichForm: any;
  facturaEditada!: ConId<InformeOp>;
  swich!: boolean;
  choferes!: ConIdType<Chofer>[];
  clientes!: ConIdType<Cliente>[];
  proveedores!: ConIdType<Proveedor>[];
  choferOp!: ConIdType<Chofer>[];
  vehiculoOp!: Vehiculo[];
  operacion!: ConId<Operacion>;
  tarifaPersonalizada!: ConIdType<TarifaPersonalizadaCliente>;
  componente: string = "";
  infOpOriginal!: ConId<InformeOp>;
  opOriginal!: ConId<Operacion>;
  facContraParte!: ConId<InformeOp>;
  formAcomp!: any;
  private destroy$ = new Subject<void>();
  gastoExtraValor:number = 0;

  constructor(
    private storageService: StorageService,
    private modalService: NgbModal,
    public activeModal: NgbActiveModal,
    private formNumServ: FormatoNumericoService,
    private dbFirebase: DbFirestoreService,
    private fb: FormBuilder,
  ) {
    this.formAcomp = this.fb.group({
      acompaniante: [false, Validators.required],
    });
  }

  ngOnInit(): void {
    console.log("0) fromParent: ", this.fromParent);
    this.infOpOriginal = this.fromParent.infOp;
    this.infOpDetallada = structuredClone(this.infOpOriginal);
    this.opOriginal = this.fromParent.op;
    this.operacion = structuredClone(this.opOriginal);
    this.choferes = this.storageService.loadInfo("choferes");
    this.clientes = this.storageService.loadInfo("choferes");
    this.proveedores = this.storageService.loadInfo("choferes");
    this.gastoExtraValor = this.fromParent.origen === 'cliente' ? (this.operacion.valores.cliente.adExtraValor ?? 0) : (this.operacion.valores.chofer.adExtraValor ?? 0)

    this.getChofer();
    ///remplazado un método general que haga todo en el servicio
    /* switch(this.fromParent.origen){
      case "cliente":{
          this.componente = "informesOpClientes";
          break;
      };
      case "chofer":{
        this.componente = "informesOpChoferes";
        break;
      }
      case "proveedor":{
        this.componente = "informesOpProveedores";
        break;
      }
      default:{
        //////console.log("error en fromParent.origen")
        break
      }
    }  */
    if (!this.infOpDetallada.tarifaTipo.personalizada) {
      this.ultimaTarifa = this.fromParent.tarifaAplicada;
      ////console.log("5) ultimaTarifa: ",this.ultimaTarifa);
    } else {
      this.tarifaPersonalizada = this.fromParent.tarifaAplicada;
    }
  }

  getChofer() {
    this.choferOp = this.choferes.filter((chofer: Chofer) => {
      return chofer.idChofer === this.infOpDetallada.idChofer;
    });
    ////console.log("4.25)this.choferOp: ", this.choferOp);

    this.vehiculoOp = this.choferOp[0].vehiculo.filter((vehiculo: Vehiculo) => {
      return vehiculo.dominio === this.operacion.patenteChofer.toUpperCase();
    });
    ////console.log("4.5)vehiculoOp: ", this.vehiculoOp);
  }

  getCategoriaNombre(): string {
    let catCg = this.ultimaTarifa.cargasGenerales.filter(
      (cat: CategoriaTarifa) => {
        return cat.orden === this.vehiculoOp[0].categoria.catOrden;
      },
    );
    ////console.log("getCategoriaValor: catCg: ", catCg);
    return catCg[0].nombre;
  }

  getCategoriaValor(): number {
    let catCg = this.ultimaTarifa.cargasGenerales.filter(
      (cat: CategoriaTarifa) => {
        return cat.orden === this.vehiculoOp[0].categoria.catOrden;
      },
    );
    ////console.log("getCategoriaValor: catCg: ", catCg);
    return catCg[0].valor;
  }

  getKmPrimerSectorValor(): number {
    let catCg = this.ultimaTarifa.cargasGenerales.filter(
      (cat: CategoriaTarifa) => {
        return cat.orden === this.vehiculoOp[0].categoria.catOrden;
      },
    );
    ////console.log("getCategoriaValor: catCg: ", catCg);
    return catCg[0].adicionalKm.primerSector;
  }

  getKmIntervalosSectorValor(): number {
    let catCg = this.ultimaTarifa.cargasGenerales.filter(
      (cat: CategoriaTarifa) => {
        return cat.orden === this.vehiculoOp[0].categoria.catOrden;
      },
    );
    ////console.log("getCategoriaValor: catCg: ", catCg);
    return catCg[0].adicionalKm.sectoresSiguientes;
  }

  /*   limpiarValorFormateado(valorFormateado: string): number {
  // Elimina el punto de miles y reemplaza la coma por punto para que sea un valor numérico válido
    return parseFloat(valorFormateado.replace(/\./g, '').replace(',', '.'));
  } */

  onSubmit() {
    //console.log("onSubmit");
    let cambios: boolean = false;
    Swal.fire({
      title: "¿Desea guardar los cambios?",
      //text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        //////////////console.log("op: ", this.op);
        this.formatearDatos();
        cambios = true;
        this.infOpOriginal = this.infOpDetallada;
        this.opOriginal = this.operacion;
        let respuesta = {
          infOp: this.infOpOriginal,
          op: this.opOriginal,
          resultado: cambios,
        };
        this.activeModal.close(respuesta);
      } else {
        this.activeModal.close();
      }
    });
    //////console.log("factura EDITADA: ", this.infOpDetallada);
  }

  formatearDatos() {
    //console.log("formatearDatos");

    this.infOpDetallada.km = this.formNumServ.convertirAValorNumerico(
      this.infOpDetallada.km,
    );

    this.infOpDetallada.valores.acompaniante =
      this.formNumServ.convertirAValorNumerico(
        this.infOpDetallada.valores.acompaniante,
      );
    this.infOpDetallada.valores.kmMonto =
      this.formNumServ.convertirAValorNumerico(
        this.infOpDetallada.valores.kmMonto,
      );
    this.infOpDetallada.valores.tarifaBase =
      this.formNumServ.convertirAValorNumerico(
        this.infOpDetallada.valores.tarifaBase,
      );
    this.infOpDetallada.valores.total =
      this.formNumServ.convertirAValorNumerico(
        this.infOpDetallada.valores.total,
      );

    /*       if(this.infOpDetallada.tarifaTipo.eventual || this.infOpDetallada.tarifaTipo.personalizada){
      this.infOpDetallada.valores.tarifaBase = this.infOpDetallada.valores.total;
    } */

    this.operacion.km = this.infOpDetallada.km;
    this.operacion.observaciones = this.infOpDetallada.observaciones;
    switch (this.fromParent.origen) {
      case "cliente": {
        this.operacion.valores.cliente.aCobrar =
          this.infOpDetallada.valores.total;
        this.operacion.valores.cliente.acompValor =
          this.infOpDetallada.valores.acompaniante;
        this.operacion.valores.cliente.kmAdicional =
          this.infOpDetallada.valores.kmMonto;
        this.operacion.valores.cliente.tarifaBase =
          this.infOpDetallada.valores.tarifaBase;
        //this.buscarContraParte();
        //this.updateItem();
        break;
      }
      case "chofer": {
        this.operacion.valores.chofer.aPagar =
          this.infOpDetallada.valores.total;
        this.operacion.valores.chofer.acompValor =
          this.infOpDetallada.valores.acompaniante;
        this.operacion.valores.chofer.kmAdicional =
          this.infOpDetallada.valores.kmMonto;
        this.operacion.valores.chofer.tarifaBase =
          this.infOpDetallada.valores.tarifaBase;
        //this.buscarContraParte();
        break;
      }
      case "proveedor": {
        this.operacion.valores.chofer.aPagar =
          this.infOpDetallada.valores.total;
        this.operacion.valores.chofer.acompValor =
          this.infOpDetallada.valores.acompaniante;
        this.operacion.valores.chofer.kmAdicional =
          this.infOpDetallada.valores.kmMonto;
        this.operacion.valores.chofer.tarifaBase =
          this.infOpDetallada.valores.tarifaBase;
        //this.buscarContraParte();
        break;
      }
      default: {
        //////console.log("error en fromParent.origen")
        break;
      }
    }
  }

  actualizarTotal() {
    this.infOpDetallada.valores.total =
      this.formNumServ.convertirAValorNumerico(
        this.infOpDetallada.valores.tarifaBase,
      ) +
      this.formNumServ.convertirAValorNumerico(
        this.infOpDetallada.valores.acompaniante,
      ) +
      this.formNumServ.convertirAValorNumerico(
        this.infOpDetallada.valores.kmMonto,
      );
    this.infOpDetallada.valores.total = this.formatearValor(
      this.infOpDetallada.valores.total,
    );
    ////console.log("facDetallada.valores.tarifaBase: ", this.infOpDetallada.valores.total);
  }

  formatearValor(valor: number): any {
    let nuevoValor = new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);
    //////////////////////console.log(nuevoValor);
    return nuevoValor;
  }

  /* ACOMPAÑANTES */

  changeAcompaniante(event: any) {
    ////////console.log(event.target.value);
    this.operacion.acompaniante = event.target.value.toLowerCase() == "true";
    //////console.log(this.acompaniante);
    if (this.operacion.acompaniante) {
      this.operacion.acompanienteCant = 1;
    } else {
      this.operacion.acompanienteCant = 0;
    }

    this.valoresAcompaniantes();
  }

  changeCantAcompaniantes(event: any) {
    console.log(event.target.value);
    this.operacion.acompanienteCant = Number(event.target.value);
    console.log(this.operacion.acompanienteCant);
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
    /*     if (this.operacion.acompaniante) {
      this.operacion.valores.cliente.acompValor = this.tarifaCliente
        ? this.tarifaCliente?.adicionales.acompaniante *
          (this.op.acompanienteCant ?? 1)
        : 0;
      this.operacion.valores.chofer.acompValor = this.tarifaChofer
        ? this.tarifaChofer?.adicionales.acompaniante *
          (this.op.acompanienteCant ?? 1)
        : 0;
    } else {
      this.operacion.valores.cliente.acompValor = 0;
      this.operacion.valores.chofer.acompValor = 0;
    } */
    this.recalcularValores();
  }

  valoresGastosExtras() {
    console.log(
      "gastos extras-cliente: ",
      this.operacion.valores.cliente.adExtraValor,
      "gastos extras-chofer: ",
      this.operacion.valores.chofer.adExtraValor,
    );
    this.operacion.valores.cliente.adExtraValor =
      this.formNumServ.convertirAValorNumerico(
        this.operacion.valores.cliente.adExtraValor,
      );
    this.operacion.valores.chofer.adExtraValor =
      this.formNumServ.convertirAValorNumerico(
        this.operacion.valores.chofer.adExtraValor,
      );

    this.recalcularValores();
  }

  recalcularValores() {
    this.operacion.valores.cliente.aCobrar =
      this.operacion.valores.cliente.tarifaBase *
        this.operacion.multiplicadorCliente +
      this.operacion.valores.cliente.kmAdicional +
      this.operacion.valores.cliente.acompValor +
      (this.operacion.valores.cliente.adExtraValor ?? 0);
    this.operacion.valores.chofer.aPagar =
      this.operacion.valores.chofer.tarifaBase *
        this.operacion.multiplicadorChofer +
      this.operacion.valores.chofer.kmAdicional +
      this.operacion.valores.chofer.acompValor +
      (this.operacion.valores.chofer.adExtraValor ?? 0);
  }
}
