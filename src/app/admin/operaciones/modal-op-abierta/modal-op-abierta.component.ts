import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer } from 'src/app/interfaces/chofer';
import { Operacion, TarifaPersonalizada } from 'src/app/interfaces/operacion';
import { TarifaTipo } from 'src/app/interfaces/tarifa-gral-cliente';
import { Seccion, TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-modal-op-abierta',
  templateUrl: './modal-op-abierta.component.html',
  styleUrls: ['./modal-op-abierta.component.scss']
})
export class ModalOpAbiertaComponent implements OnInit {

  @Input() fromParent:any
  componente:string = "operaciones"
  soloVista: boolean = true;
  opEditar!: Operacion;
  form!: any;
  formTarifaPersonalizada!: any;
  formTarifaEventual!: any;
  formVehiculosChofer!: any;
  choferSeleccionado!: Chofer;
  $choferes!: Chofer[];
  acompaniante: boolean = false;
  tarifaPersonalizada: boolean = false;
  tarifaEventual: boolean = false;
  vehiculosChofer: boolean = false;
  tarifaClienteSel!: TarifaPersonalizadaCliente;
  mostrarCategoria: boolean = false;
  seccionElegida!: Seccion;
  categoriaElegida: number = 0;
  tPersonalizada!: TarifaPersonalizada;
  tarifaTipo!: TarifaTipo;

  constructor(public activeModal: NgbActiveModal, private fb: FormBuilder, private storageService: StorageService){
    this.form = this.fb.group({
      fecha: ['', Validators.required],
      cliente: ['', Validators.required],
      chofer: ['', Validators.required],
      tarifaEventual: ['', Validators.required],
      acompaniante: ['', Validators.required],
      observaciones: ['',]
    });

    this.formTarifaPersonalizada = this.fb.group({
      seccion:["", Validators.required],
      categoria:["", Validators.required]
    });
    this.formTarifaEventual = this.fb.group({
      choferConcepto: ['', Validators.required],
      choferValor: ['', Validators.required],
      clienteConcepto: ['', Validators.required],
      clienteValor: ['', Validators.required],
    });
    this.formVehiculosChofer = this.fb.group({
      patente: ["", Validators.required],
    });
  }
  
  ngOnInit(): void {
    this.opEditar = this.fromParent.item
    console.log("Op: ", this.opEditar);    
    this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;
    });
    if(this.opEditar.tarifaPersonalizada){
      this.storageService.getElemntByIdLimit("tarifasPersCliente", "idCliente", "idTarifa", this.opEditar.cliente.idCliente, "ultTarifaPersCliente" )
      this.storageService.ultTarifaPersCliente$.subscribe(data=>{        
        this.tarifaClienteSel = data;
        //console.log("tarifa personalizada del cliente: ", this.tarifaClienteSel);        
      })
    };    
    //console.log(this.fromParent);
    if(this.fromParent.modo === "vista"){
      this.soloVista = true;      
      this.armarForm()
    }else if(this.fromParent.modo === "edicion"){
      this.soloVista = false;      
      this.armarForm()
    }
  }

  armarForm(){
    this.choferSeleccionado = this.opEditar.chofer;
    this.acompaniante = this.opEditar.acompaniante;
    this.tarifaEventual = this.opEditar.tarifaEventual;
    this.tarifaPersonalizada = this.opEditar.tarifaPersonalizada;
    this.tarifaTipo = this.opEditar.tarifaTipo,
    console.log("1)", this.tarifaPersonalizada);
    if(this.opEditar.tarifaPersonalizada){
      this.seccionElegida = this.tarifaClienteSel.secciones[this.opEditar.tPersonalizada.seccion - 1];
      this.tPersonalizada = this.opEditar.tPersonalizada;
    }
    this.form.patchValue({
      fecha: this.opEditar.fecha,
      cliente: this.opEditar.cliente.razonSocial,
      chofer: this.opEditar.chofer.apellido + " " + this.opEditar.chofer.nombre,
      observaciones: this.opEditar.observaciones,      
      tarifaEventual: this.opEditar.tarifaEventual? "Si": "No",
    })    
    this.formTarifaPersonalizada.patchValue({
      //seccion: this.tarifaPersonalizada ? this.opEditar.tPersonalizada.seccion : "Sin datos",
      //categoria: this.tarifaPersonalizada ? this.opEditar.tPersonalizada.categoria : "Sin datos",
    });
    this.formTarifaEventual.patchValue({
      choferConcepto: this.tarifaEventual ? this.opEditar.tEventual.chofer.concepto  : "Sin datos",
      choferValor: this.tarifaEventual ? this.opEditar.tEventual.chofer.valor : 0,
      clienteConcepto: this.tarifaEventual ? this.opEditar.tEventual.cliente.concepto : "Sin datos",
      clienteValor: this.tarifaEventual ? this.opEditar.tEventual.cliente.valor : 0,
    });
    this.formVehiculosChofer = this.fb.group({
      patente: this.opEditar.patenteChofer,
    });    
  }

  changeVehiculo(e: any) {
    //console.log(e.target.value)    
    this.opEditar.patenteChofer = e.target.value;
    //console.log("patente chofer: ", this.opEditar.patenteChofer);    
  } 

  changeChofer(e: any) {
    //////console.log()(e.target.value)    
    let chofer = this.$choferes.filter(function (chofer: Chofer) { 
       return chofer.idChofer === Number(e.target.value)
    });
    this.choferSeleccionado = chofer[0];
    this.opEditar.patenteChofer = "";    
  } 

  changeAcompaniante(event: any) {
    //console.log(event.target.value);    
    this.acompaniante = event.target.value.toLowerCase() == 'true';
    console.log(this.acompaniante);
    
  }

  selectTarifaEventual(event: any) {
    //console.log(event.target.value);    
    this.tarifaEventual = event.target.value.toLowerCase() == 'true';
    //console.log(this.tarifaEventual);

    this.formTarifaEventual.patchValue({
      choferConcepto: this.tarifaEventual ? this.opEditar.tEventual.chofer.concepto  : "Sin datos",
      choferValor: this.tarifaEventual ? this.opEditar.tEventual.chofer.valor : 0,
      clienteConcepto: this.tarifaEventual ? this.opEditar.tEventual.cliente.concepto : "Sin datos",
      clienteValor: this.tarifaEventual ? this.opEditar.tEventual.cliente.valor : 0,
    });
    
    if(this.tarifaEventual){
      this.tarifaPersonalizada = false;
      this.tarifaTipo = {
          general: false,
          especial: false,
          eventual: true,   
          personalizada: false, 
      }
    }
    
}

changeSecion(e:any){
  //console.log("seccion: ", e.target.value);
  this.mostrarCategoria = true;
  this.seccionElegida = this.tarifaClienteSel.secciones[e.target.value - 1];
  this.tPersonalizada = {
    seccion : e.target.value,
    categoria: this.tPersonalizada.categoria,
    nombre: this.tPersonalizada.nombre,
    aCobrar: this.tPersonalizada.aCobrar,
    aPagar: this.tPersonalizada.aPagar
  }

  this.tarifaTipo = {
    general: false,
    especial: false,
    eventual: false,   
    personalizada: true, 
}
  ////console.log(this.seccionElegida);
  ////console.log(this.tPersonalizada);
  
  
}

changeCategoria(e:any){
  //console.log("categoria: ", e.target.value);
  this.tPersonalizada = {
    seccion : this.tPersonalizada.seccion,
    categoria: this.tarifaClienteSel.secciones[this.tPersonalizada.seccion - 1].categorias[e.target.value-1].orden,
    nombre: this.tarifaClienteSel.secciones[this.tPersonalizada.seccion - 1].categorias[e.target.value-1].nombre,
    aCobrar: this.tarifaClienteSel.secciones[this.tPersonalizada.seccion - 1].categorias[e.target.value-1].aCobrar,
    aPagar: this.tarifaClienteSel.secciones[this.tPersonalizada.seccion - 1].categorias[e.target.value-1].aPagar,
  }
  //console.log("tarifa personalizada: ", this.tPersonalizada);
}

  onSubmit(){
   
    if(this.tarifaEventual){
      if(this.formTarifaEventual.valid){
        this.armarOp()
      } else {
        this.mensajesError("error en el formulario de la tarifa eventual")
      }
    } else if (this.tarifaPersonalizada){
      if(this.formTarifaPersonalizada.valid){
        this.armarOp()
      } else {
        this.mensajesError("error en el formulario de la tarifa personalizada")
      }
    } else {
      this.armarOp()
    }
 
   }

   mensajesError(msj:string){
    Swal.fire({
      icon: "error",
      //title: "Oops...",
      text: `${msj}`
      //footer: `${msj}`
    });
  }

  armarOp(){
    //////console.log()("armarOp. chofer: ", this.choferSeleccionado);
    console.log("2)", this.tarifaPersonalizada);
    // Extraer valores del formulario y otros datos
    const formValues = this.form.value;

    // editar la operación básica
    this.opEditar = {
        id: this.opEditar.id,
        idOperacion: this.opEditar.idOperacion,
        fecha: this.opEditar.fecha,
        km: null,
        //documentacion: null,
        cliente: this.opEditar.cliente,
        chofer: this.choferSeleccionado,
        observaciones: formValues.observaciones,
        //unidadesConFrio: false,
        acompaniante: this.acompaniante,
        //facturada: false,
        facturaCliente: null,
        facturaChofer: null,
        tarifaEventual: this.tarifaEventual,
        tEventual:{ 
        chofer:{
          concepto: "",
          valor: 0,    
        },
        cliente:{
          concepto: "",
          valor: 0,    
        }
        },
        tarifaPersonalizada: false,
        tPersonalizada:{
          seccion: 0,
          categoria: 0,
          nombre: "",
          aCobrar: 0,
          aPagar: 0,
        },
        patenteChofer: this.opEditar.patenteChofer,
        estado:{
          abierta: true,
          cerrada: false,
          facturada: false,
        },
        aCobrar:this.opEditar.aCobrar,
        aPagar:this.opEditar.aPagar,
        tarifaTipo: this.tarifaTipo,
    }; 

        // Si tarifaEspecial es true, agregar los detalles de tarifa especial
        if (this.tarifaEventual) {
          this.opEditar.tEventual = {
              chofer: {
                  concepto: this.formTarifaEventual.value.choferConcepto,
                  valor: this.formTarifaEventual.value.choferValor
              },
              cliente: {
                  concepto: this.formTarifaEventual.value.clienteConcepto,
                  valor: this.formTarifaEventual.value.clienteValor
              }
          };
      }
        // Si tarifaPersonalizada es true, agregar los detalles de tarifa especial
        if (this.tarifaPersonalizada) {
          this.opEditar.tPersonalizada = this.tPersonalizada
      }
    
    //////console.log()("esta es la operacion: ", this.op);  
    Swal.fire({
      title: "¿Desea guardar los cambios en la operación?",
      //text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        ////console.log("op: ", this.op);
        this.addItem();
        Swal.fire({
          title: "Confirmado",
          text: "La operación ha sido editada.",
          icon: "success"
        }).then((result)=>{
          if (result.isConfirmed) {
            this.activeModal.close();
          }
        });   
        
      }
    });   
   
   }

   addItem(): void {
    ////console.log("llamada al storage desde op-alta, addItem");
    console.log("op editada: ", this.opEditar);
    
    this.storageService.updateItem(this.componente, this.opEditar);    
    this.form.reset();     
    //this.mostrarCategoria = false;
    //this.seccionElegida = 0;
    //this.categoriaElegida = 0;
    let array:any = [];    
  } 


}
