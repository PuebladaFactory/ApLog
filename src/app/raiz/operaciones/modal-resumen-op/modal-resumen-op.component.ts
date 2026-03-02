import {
  Component,
  ViewChild,
  ElementRef,
  AfterViewInit,
  Input,
  OnInit,
} from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { Subject, takeUntil } from "rxjs";
import { Chofer } from "src/app/interfaces/chofer";
import { ConId, ConIdType } from "src/app/interfaces/conId";
import {
  Operacion,
  TarifaEventual,
  TarifaPersonalizada,
} from "src/app/interfaces/operacion";
import {
  TarifaGralCliente,
  TarifaTipo,
} from "src/app/interfaces/tarifa-gral-cliente";
import {
  Seccion,
  TarifaPersonalizadaCliente,
} from "src/app/interfaces/tarifa-personalizada-cliente";
import { DbFirestoreService } from "src/app/servicios/database/db-firestore.service";
import { ValoresOpService } from "src/app/servicios/valores-op/valores-op/valores-op.service";
import { FormatoNumericoService } from "src/app/servicios/formato-numerico/formato-numerico.service";
import { StorageService } from "src/app/servicios/storage/storage.service";
import Swal from "sweetalert2";
import { TableroService } from "src/app/servicios/tablero/tablero.service";
import { AgComponentContainer } from "ag-grid-angular";
import { LogService } from "src/app/servicios/log/log.service";

@Component({
  selector: "app-modal-resumen-op",
  templateUrl: "./modal-resumen-op.component.html",
  styleUrls: ["./modal-resumen-op.component.scss"],
  standalone: false,
})
export class ModalResumenOpComponent implements OnInit, AfterViewInit {
  @Input() fromParent: any;
  componente: string = "operaciones";
  op!: ConId<Operacion>;
  opOriginal!: ConId<Operacion>;
  form!: any;
  formTarifaPersonalizada!: any;
  formTarifaEventual!: any;
  formAcomp!: any;
  $choferes!: Chofer[];
  cantAcompaniantes: number = 0;
  vehiculosChofer: boolean = false;
  tarifaClienteSel!: ConIdType<TarifaPersonalizadaCliente> | undefined;
  mostrarCategoria: boolean = false;
  seccionElegida!: Seccion;
  categoriaElegida: number = 0;
  tarifaPersonalizadaOp!: TarifaPersonalizada;
  tarifaPersonalizada!: ConIdType<TarifaPersonalizadaCliente>
  tarifaTipo!: TarifaTipo;
  vista: boolean = false;
  editar: boolean = false;
  cerrar: boolean = false;
  aCobrar: any;
  aPagar: any;
  tarifaEventual!: TarifaEventual;
  tarifaCliente!: TarifaGralCliente | null;
  tarifaChofer!: TarifaGralCliente | null;

  @ViewChild("kmInput") kmInputElement!: ElementRef;
  private destroy$ = new Subject<void>(); // Subject para manejar la destrucción
  isLoading: boolean = false;

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private storageService: StorageService,
    private valoresOpServ: ValoresOpService,
    private formNumServ: FormatoNumericoService,
    private dbFirebase: DbFirestoreService,
    private tableroServ: TableroService,
  ) {
    this.form = this.fb.group({
       km: [
    '',
    [
      Validators.required,
      Validators.pattern(/^[0-9]+$/)
    ]
  ]
    });

    this.formAcomp = this.fb.group({
      acompaniante: [false, Validators.required],
    });

    this.formTarifaPersonalizada = this.fb.group({
      seccion: ["", Validators.required],
      categoria: ["", Validators.required],
    });
  }

  ngOnInit(): void {
    console.log(this.fromParent);
    //console.log('ModalFacturacionComponent - ngOnInit');
    //////console.log("vista: ",this.vista);
    //////console.log("editar: ",this.editar);
    //////console.log("cerrar: ",this.cerrar);
    this.opOriginal = this.fromParent.item;
    this.op = structuredClone(this.opOriginal);
    this.op.acompanienteCant = this.op.acompanienteCant ?? 0;
    this.op.adExtraConcepto = this.op.adExtraConcepto ?? "";
    this.op.valores.cliente.adExtraValor =
      this.op.valores.cliente.adExtraValor ?? 0;
    this.op.valores.chofer.adExtraValor =
      this.op.valores.chofer.adExtraValor ?? 0;

    //this.op = this.fromParent.item;
    switch (this.fromParent.modo) {
      case "vista":
        this.vista = true;
        break;
      case "editar":
        this.editar = true;
        break;
      case "cerrar":
        this.cerrar = true;
        break;
    }
    if (this.op.tarifaTipo.personalizada) {
      let tarifas =
        this.storageService.loadInfo("tarifasPersCliente");
      //console.log("tarifas pers clientes", tarifas);
      if (tarifas) {
        this.tarifaPersonalizada = tarifas.find(
          (tarifa: ConIdType<TarifaPersonalizadaCliente>) =>
            tarifa.idCliente === this.op.cliente.idCliente,
        );
        console.log("tarifa personalizada del cliente: ", this.tarifaPersonalizada);
        this.tarifaPersonalizadaOp = this.op.tarifaPersonalizada;
      } else {
        this.mensajesError("no hay tarifas personalizadas");
      }
      this.obtenerTarifas();
      this.armarForm();
    } else {
      this.tarifaPersonalizadaOp = {
        seccion: 0,
        categoria:0,
        nombre: "",
        aCobrar: 0,
        aPagar: 0,
      }
      this.obtenerTarifas();
      this.armarForm();
    }
  }

  ngOnDestroy(): void {
    // Completa el Subject para cancelar todas las suscripciones
    this.destroy$.next();
    this.destroy$.complete();
    this.storageService.clearInfo("tPersCliente");
    //console.log('ModalFacturacionComponent - ngOnDestroy');
  }

  ngAfterViewInit(): void {    
    // Establece el foco en el input de Km Recorridos al inicializar el componente
    if (this.cerrar) {
      setTimeout(() => {
        this.kmInputElement.nativeElement.focus();
      }, 0);
    }
  }

  ///// ARMAR LA VISTA ///////////////
  armarForm() {
    this.formAcomp.patchValue({
      acompaniante: this.op.acompaniante,
    });

    

    /* this.tEventual = this.op.tEventual; */

    //////////console.log("1)", this.tarifaPersonalizadaOp);
/*     if (this.op.tarifaTipo.personalizada && this.tarifaClienteSel) {
      this.seccionElegida =
        this.tarifaClienteSel.secciones[
          this.op.tarifaPersonalizada.seccion - 1
        ];
      //this.tPersonalizada = this.op.tPersonalizada;
    } */
  }

  /*   formatearValor(valor: number) : any{
    let nuevoValor =  new Intl.NumberFormat('es-ES', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(valor);
   ////////////console.log(nuevoValor);    
    //   `$${nuevoValor}`   
    return nuevoValor
 }

 limpiarValorFormateado(valorFormateado: string): number {
  // Elimina el punto de miles y reemplaza la coma por punto para que sea un valor numérico válido
    return parseFloat(valorFormateado.replace(/\./g, '').replace(',', '.'));
  } */

  ///////ACOMPANIANTE///////
  changeAcompaniante(event: any) {
    ////////console.log(event.target.value);
    this.op.acompaniante = event.target.value.toLowerCase() == "true";
    //////console.log(this.acompaniante);
    if (this.op.acompaniante) {
      this.op.acompanienteCant = 1;
    } else {
      this.op.acompanienteCant = 0;
    }

    this.valoresAcompaniantes();
  }

  changeCantAcompaniantes(event: any) {
    console.log(event.target.value);
    this.op.acompanienteCant = Number(event.target.value);
    console.log(this.op.acompanienteCant);
    if (this.op.acompanienteCant === 0) {
      this.op.acompaniante = false;
    }
    if (this.op.acompanienteCant > 0) {
      this.op.acompaniante = true;
    }
    this.formAcomp.patchValue({
      acompaniante: this.op.acompaniante,
    });
    this.valoresAcompaniantes();
  }

  ///////// TARIFA PERSONALIZADA /////////////
/*   changeSecion(e: any) {
    //////////console.log("seccion: ", e.target.value);
    this.mostrarCategoria = true;
    if (this.tarifaEventual) {
      this.formTarifaPersonalizada.patchValue({
        seccion: "Sin datos",
        categoria: "Sin datos",
      });
    }
    if (this.tarifaClienteSel) {
      this.seccionElegida = this.tarifaClienteSel.secciones[e.target.value - 1];
      this.tarifaPersonalizadaOp = {
        seccion: Number(e.target.value),
        categoria: this.tarifaPersonalizadaOp.categoria,
        nombre: this.tarifaPersonalizadaOp.nombre,
        aCobrar: this.tarifaPersonalizadaOp.aCobrar,
        aPagar: this.tarifaPersonalizadaOp.aPagar,
      };
    } else {
      this.mensajesError("no hay tarifa personalizada seleccionada");
    }
  }

  changeCategoria(e: any) {
    //////////console.log("categoria: ", e.target.value);
    if (this.tarifaClienteSel) {
      this.tarifaPersonalizadaOp = {
        seccion: this.tarifaPersonalizadaOp.seccion,
        categoria: Number(
          this.tarifaClienteSel.secciones[this.tarifaPersonalizadaOp.seccion - 1]
            .categorias[Number(e.target.value) - 1].orden,
        ),
        nombre:
          this.tarifaClienteSel.secciones[this.tarifaPersonalizadaOp.seccion - 1]
            .categorias[e.target.value - 1].nombre,
        aCobrar:
          this.tarifaClienteSel.secciones[this.tarifaPersonalizadaOp.seccion - 1]
            .categorias[e.target.value - 1].aCobrar,
        aPagar:
          this.tarifaClienteSel.secciones[this.tarifaPersonalizadaOp.seccion - 1]
            .categorias[e.target.value - 1].aPagar,
      };
      //////console.log("tarifa personalizada: ", this.tPersonalizada);
      this.op.tarifaPersonalizada = this.tarifaPersonalizadaOp;
      this.op.valores.cliente.tarifaBase = this.tarifaPersonalizadaOp.aCobrar;
      this.op.valores.chofer.tarifaBase = this.tarifaPersonalizadaOp.aPagar;
      this.recalcularValores();
    } else {
      this.mensajesError("no hay tarifa personalizada seleccionada");
    }
  } */

  
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
      this.op.tarifaPersonalizada = this.tarifaPersonalizadaOp;
      this.op.valores.cliente.tarifaBase =
        this.formNumServ.convertirAValorNumerico(
          this.tarifaPersonalizadaOp.aCobrar,
        );
      this.op.valores.chofer.tarifaBase =
        this.formNumServ.convertirAValorNumerico(
          this.tarifaPersonalizadaOp.aPagar,
        );
      ////console.log("tarifaPersonalizadaOp: ",this.tarifaPersonalizadaOp);
      
      this.recalcularValores();
    } else {
      this.mensajesError(
        "Error al encontrar la categoria de la tarifa personalizada",
      );
    }
  }
  
    onSubmit() {
    console.log(this.form.value.km);
    
    if (this.cerrar) {
      if (this.form.valid) {
        this.cerrarOp();
      } else {
        this.mensajesError("El campo de Km recorridos no puede quedar vacio");
      }
    } else {
      if((this.op.valores.cliente.adExtraValor && this.op.valores.chofer.adExtraValor) && (this.op.valores.cliente.adExtraValor > 0 || this.op.valores.chofer.adExtraValor > 0) && this.op.adExtraConcepto === "" ) return this.mensajesError("Debe asignar una descripción al gasto extra");
      this.armarOp();
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

  cerrarOp() {
  this.op.km = this.formNumServ.convertirAValorNumerico(this.form.value.km);
    /*this.op.valores.chofer.aPagar = this.formNumServ.convertirAValorNumerico(
      this.op.valores.chofer.aPagar,
    );
    this.op.valores.chofer.tarifaBase =
      this.formNumServ.convertirAValorNumerico(
        this.op.valores.chofer.tarifaBase,
      );
    this.op.valores.cliente.aCobrar = this.formNumServ.convertirAValorNumerico(
      this.op.valores.cliente.aCobrar,
    );
    this.op.valores.cliente.tarifaBase =
      this.formNumServ.convertirAValorNumerico(
        this.op.valores.cliente.tarifaBase,
      );
    this.op.tarifaEventual.chofer.valor =
      this.formNumServ.convertirAValorNumerico(
        this.op.tarifaEventual.chofer.valor,
      );
    this.op.tarifaEventual.cliente.valor =
      this.formNumServ.convertirAValorNumerico(
        this.op.tarifaEventual.cliente.valor,
      );
    this.op.acompanienteCant = !this.op.acompaniante
      ? 0
      : this.op.acompanienteCant
        ? this.op.acompanienteCant
        : 1;

    console.log("this.op.acompanienteCant :", this.op.acompanienteCant); */
    


    console.log("operacion: para cerrar", this.op);
    this.calcularValoresfinales()


  }

  calcularValoresfinales(){
        Swal.fire({
      title: "¿Desea cerrar la operación?",
      //text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading = true;
        ////console.log("op: ", this.op);
        this.valoresOpServ.facturarOperacion(this.op).then((result: any) => {
          //this.isLoading = false;
          //console.log("modal facturacion: respuesta: ", result);
          let idOp: number[] = [];
          idOp.push(this.op.idOperacion);
          if (result.exito) {
            this.storageService.logMultiplesOp(
              idOp,
              "CERRAR",
              this.componente,
              "Cierre de Operación",
              result.exito,
            );
            Swal.fire({
              title: "Confirmado",
              text: "La operación ha sido cerrada.",
              icon: "success",
            }).then((result) => {
              if (result.isConfirmed) {
                this.activeModal.close();
              }
            });
          } else {
            this.storageService.logMultiplesOp(
              idOp,
              "CERRAR",
              this.componente,
              "Cierre de Operación",
              result.exito,
            );
            Swal.fire({
              title: "Error",
              text: `Ha ocurrido un error: ${result.mensaje}`,
              icon: "error",
            }).then((result) => {
              if (result.isConfirmed) {
                this.activeModal.close();
              }
            });
          }
        });
      }
    });
  }


  armarOp() {
    this.op.tarifaPersonalizada = this.tarifaPersonalizadaOp;

    if (this.op.tarifaTipo.personalizada) {
      this.op.valores.cliente.aCobrar = this.tarifaPersonalizadaOp.aCobrar;
      this.op.valores.cliente.tarifaBase = this.tarifaPersonalizadaOp.aCobrar;
      this.op.valores.chofer.aPagar = this.tarifaPersonalizadaOp.aPagar;
      this.op.valores.chofer.tarifaBase = this.tarifaPersonalizadaOp.aPagar;
    }
    ////console.log("op: ", this.op);

    //this.op.acompanienteCant = !this.op.acompaniante ? 0 : this.op.acompanienteCant? this.op.acompanienteCant : 1;

    console.log("editar op :", this.op);    
    this.updateItem();
  }

  ////// ACTUALIZAR OBJETO /////////
  updateItem(): void {
    ////////////console.log("llamada al storage desde op-alta, addItem");
    //////////////console.log()("esta es la operacion: ", this.op);
    Swal.fire({
      title: "¿Desea guardar los cambios en la operación?",
      //text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        ////////////console.log("op: ", this.op);
        this.isLoading = true;
        let { id, ...op } = this.op;
        this.storageService.updateItem(
          this.componente,
          op,
          this.op.idOperacion,
          "EDITAR",
          "Edición de Operación",
          this.op.id,
        );
        this.tableroServ.actualizarAsignacionDesdeOperacion(this.op);
        Swal.fire({
          title: "Confirmado",
          text: "La operación ha sido editada.",
          icon: "success",
        }).then((result) => {
          if (result.isConfirmed) {
            this.activeModal.close();
          }
        });
      }
    });
    ////console.log("op editada: ", this.op);

    this.form.reset();
  }

  changeMultiCliente(event: any) {
    let valor = Number(event.target.value);

    // Validar rango (0–2)
    if (isNaN(valor) || valor < 0 || valor > 2) {
      alert("El multiplicador debe estar entre 0 y 2");

      // Reasignar valor válido
      valor = 1;
      this.op.multiplicadorCliente = valor;

      // Forzar actualización visual del input
      event.target.value = valor.toString();

      return;
    }

    // Calcular normalmente
    this.op.multiplicadorCliente = valor;
    console.log("multiplicador-cliente: ", this.op.multiplicadorCliente);

    /* this.aCobrar =
      this.op.valores.cliente.tarifaBase * valor +
      this.op.valores.cliente.kmAdicional +
      this.op.valores.cliente.acompValor +
      (this.op.valores.cliente.adExtraValor ?? 0); */
    this.recalcularValores();
  }

  changeMultiChofer(event: any) {
    let valor = Number(event.target.value);

    // Validar rango (0–2)
    if (isNaN(valor) || valor < 0 || valor > 2) {
      alert("El multiplicador debe estar entre 0 y 2");

      // Reasignar valor válido
      valor = 1;
      this.op.multiplicadorChofer = valor;

      // Forzar actualización visual del input
      event.target.value = valor.toString();

      return;
    }

    // Calcular normalmente
    this.op.multiplicadorChofer = valor;
    console.log("multiplicador-chofer: ", this.op.multiplicadorChofer);
    /* 

    this.aPagar =
      this.op.valores.chofer.tarifaBase * valor +
      this.op.valores.chofer.kmAdicional +
      this.op.valores.chofer.acompValor +
      (this.op.valores.chofer.adExtraValor ?? 0); */
    this.recalcularValores();
  }

  getClaseTarifa(op: Operacion): string {
    if (op.tarifaTipo.eventual) {
      return "bg-warning";
    }
    if (op.tarifaTipo.personalizada) {
      return "bg-success";
    }
    if (op.tarifaTipo.especial) {
      return "bg-info";
    }
    if (op.tarifaTipo.general) {
      return "bg-primary";
    }
    return "bg-secondary";
  }

  obtenerTarifas() {
    if (this.op.tarifaTipo.general || this.op.tarifaTipo.especial) {
      this.tarifaCliente = this.obtenerTCliente();
      console.log("tarifa cliente aplicada: ", this.tarifaCliente);
      this.tarifaChofer = this.obtenerTChofer();
      console.log("tarifa chofer aplicada: ", this.tarifaChofer);
    } else {
      let tarifasGralClientes =
        this.storageService.loadInfo("tarifasGralCliente");
      this.tarifaCliente = tarifasGralClientes[0];
      let tarifasGralChoferes =
        this.storageService.loadInfo("tarifasGralChofer");
      this.tarifaChofer = tarifasGralChoferes[0];
    }
  }

  obtenerTCliente() {
    let tarifas;
    let tarfiaAplicada;
    if (this.op.cliente.tarifaTipo.especial) {
      tarifas = this.storageService.loadInfo("tarifasEspCliente");
      tarfiaAplicada = tarifas.find(
        (t) => t.idCliente === this.op.cliente.idCliente,
      );
    } else {
      tarifas = this.storageService.loadInfo("tarifasGralCliente");
      tarfiaAplicada = tarifas[0];
    }
    if (tarfiaAplicada) {
      return tarfiaAplicada;
    } else {
      return null;
    }
  }

  obtenerTChofer() {
    let tarifas;
    let tarfiaAplicada;
    let tarifaGralChofer = this.storageService.loadInfo("tarifasGralChofer");
    let tarifaGralProveedor = this.storageService.loadInfo(
      "tarifasGralProveedor",
    );

    if (this.op.chofer.tarifaTipo.especial) {
      if (this.op.chofer.idProveedor === 0) {
        tarifas = this.storageService.loadInfo("tarifasEspChofer");
        let tEspecial = tarifas.find(
          (t) => t.idChofer === this.op.chofer.idChofer,
        );
        if (tEspecial) {
          if (
            tEspecial.idCliente === 0 ||
            tEspecial.idCliente === this.op.cliente.idCliente
          ) {
            tarfiaAplicada = tEspecial;
            ////console.log("2A) tarifa esp chofer a pagar: ", tarifa);
          } else {
            tarfiaAplicada = tarifaGralChofer[0];
            ////console.log("2B) tarifa gral chofer a pagar: ", tarifa);
          }
        } else {
          tarfiaAplicada = null;
        }
      } else {
        tarifas = this.storageService.loadInfo("tarifasEspProveedor");
        let tEspecial = tarifas.find(
          (t) => t.idProveedor === this.op.chofer.idProveedor,
        );
        if (tEspecial) {
          if (
            tEspecial.idCliente === 0 ||
            tEspecial.idCliente === this.op.cliente.idCliente
          ) {
            tarfiaAplicada = tEspecial;
            ////console.log("2A) tarifa esp chofer a pagar: ", tarifa);
          } else {
            tarfiaAplicada = tarifaGralProveedor[0];
            ////console.log("2B) tarifa gral chofer a pagar: ", tarifa);
          }
        } else {
          tarfiaAplicada = null;
        }
      }
    } else {
      tarfiaAplicada =
        this.op.chofer.idProveedor === 0
          ? tarifaGralChofer[0]
          : tarifaGralProveedor[0];
    }
    return tarfiaAplicada;
  }

  valoresAcompaniantes() {
    if (this.op.acompaniante) {
      this.op.valores.cliente.acompValor = this.tarifaCliente
        ? this.tarifaCliente?.adicionales.acompaniante *
          (this.op.acompanienteCant ?? 1)
        : 0;
      this.op.valores.chofer.acompValor = this.tarifaChofer
        ? this.tarifaChofer?.adicionales.acompaniante *
          (this.op.acompanienteCant ?? 1)
        : 0;
    } else {
      this.op.valores.cliente.acompValor = 0;
      this.op.valores.chofer.acompValor = 0;
    }
    this.recalcularValores();
  }

  valoresEventuales() {
    console.log(
      "eventual-cliente: ",
      this.op.tarifaEventual.cliente.valor,
      "eventual-chofer: ",
      this.op.tarifaEventual.chofer.valor,
    );
    this.op.tarifaEventual.cliente.valor =
      this.formNumServ.convertirAValorNumerico(
        this.op.tarifaEventual.cliente.valor,
      );
    this.op.tarifaEventual.chofer.valor =
      this.formNumServ.convertirAValorNumerico(
        this.op.tarifaEventual.chofer.valor,
      );
    this.op.valores.cliente.tarifaBase = this.op.tarifaEventual.cliente.valor;
    this.op.valores.chofer.tarifaBase = this.op.tarifaEventual.chofer.valor;
    this.recalcularValores();
  }

  valoresGastosExtras() {
    console.log(
      "gastos extras-cliente: ",
      this.op.valores.cliente.adExtraValor,
      "gastos extras-chofer: ",
      this.op.valores.chofer.adExtraValor,
    );
    this.op.valores.cliente.adExtraValor =
      this.formNumServ.convertirAValorNumerico(
        this.op.valores.cliente.adExtraValor,
      );
    this.op.valores.chofer.adExtraValor =
      this.formNumServ.convertirAValorNumerico(
        this.op.valores.chofer.adExtraValor,
      );

    this.recalcularValores();
  }

  recalcularValores() {
    this.op.valores.cliente.aCobrar =
      (this.op.valores.cliente.tarifaBase * this.op.multiplicadorCliente) +
      this.op.valores.cliente.kmAdicional +
      this.op.valores.cliente.acompValor +
      (this.op.valores.cliente.adExtraValor ?? 0);
    this.op.valores.chofer.aPagar =
      (this.op.valores.chofer.tarifaBase * this.op.multiplicadorChofer) +
      this.op.valores.chofer.kmAdicional +
      this.op.valores.chofer.acompValor +
      (this.op.valores.chofer.adExtraValor ?? 0);
  }
}
