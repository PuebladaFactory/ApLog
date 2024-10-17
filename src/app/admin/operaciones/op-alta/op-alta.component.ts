import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Operacion, TarifaPersonalizada } from 'src/app/interfaces/operacion';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { TarifaChofer } from 'src/app/interfaces/tarifa-chofer';
import { TarifaCliente } from 'src/app/interfaces/tarifa-cliente';
import { TarifaGralChofer } from 'src/app/interfaces/tarifa-gral-chofer';
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { TarifaGralProveedor } from 'src/app/interfaces/tarifa-gral-proveedor';
import { Seccion, TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { TarifaProveedor } from 'src/app/interfaces/tarifa-proveedor';
import { BuscarTarifaService } from 'src/app/servicios/buscarTarifa/buscar-tarifa.service';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2'


@Component({
  selector: 'app-op-alta',
  templateUrl: './op-alta.component.html',
  styleUrls: ['./op-alta.component.scss'],
  
})
export class OpAltaComponent implements OnInit {
  @Output() newItemEvent = new EventEmitter<any>();
  componente:string = "operaciones"
  form:any;
  op!: Operacion;
  clientes$!: any;
  choferes$!: any;
  $choferes!: Chofer[];
  $clientes!: Cliente[];
  clienteSeleccionado!: Cliente ;
  choferSeleccionado!: Chofer ;  
  acompaniante: boolean |  any = false ;
  tarifaEventual: boolean = false ;
  $tarifasChoferes!:TarifaChofer [];
  $tarifasProveedores!: TarifaProveedor [];
  $tarifasClientes!: TarifaCliente [];
  $proveedores!:any;
  arrayRespuesta!: any[];
  tarifaPersonalizada: boolean = false;
  tarifaClienteSel!: TarifaPersonalizadaCliente;
  formTarifaPersonalizada!: any;
  formTarifaEventual!: any;
  formVehiculosChofer!:any
  mostrarCategoria: boolean = false;
  seccionElegida!: Seccion;
  categoriaElegida: number = 0;
  tPersonalizada!: TarifaPersonalizada;
  vehiculosChofer: boolean = false;
  patenteChofer: string = "";
  ultTarifaGralCliente!: TarifaGralCliente;
  ultTarifaGralChofer!: TarifaGralCliente;
  ultTarifaGralProveedor!: TarifaGralCliente;
  ultTarifaEspCliente!: TarifaGralCliente;
  ultTarifaEspChofer!: TarifaGralCliente;
  ultTarifaEspProveedor!: TarifaGralCliente;
  proveedorSeleccionado!: Proveedor[];

  constructor(private fb: FormBuilder, private storageService: StorageService, private buscarTarifaServ: BuscarTarifaService, private dbFirebase: DbFirestoreService ) {
    this.form = this.fb.group({
      fecha: ['', Validators.required],
      cliente: ['', Validators.required],
      chofer: ['', Validators.required],
      tarifaEventual: ['', Validators.required],
      acompaniante: ['', Validators.required],
      observaciones: ['',],    
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
    this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;
    });
    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;
    }); 
    this.storageService.proveedores$.subscribe(data => {
      this.$proveedores = data;
    })  
    this.storageService.erroresTarifas$.subscribe(data => {
      this.arrayRespuesta = data  
    })
    this.storageService.ultTarifaPersCliente$.subscribe(data => {
      this.tarifaClienteSel = data || {}
    })
    this.storageService.opTarEve$.subscribe(data=>{
      let datos = data
      this.tarifaEventual = datos[0];
    })
    this.storageService.opTarPers$.subscribe(data=>{
      let datos = data
      this.tarifaPersonalizada = datos[0];
    });
    /////////TARIFA GENERAL CLIENTE /////////////////////////
    this.storageService.ultTarifaGralCliente$.subscribe(data =>{
      //////console.log("data: ", data);                
      this.ultTarifaGralCliente = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
      this.ultTarifaGralCliente.cargasGenerales = this.ultTarifaGralCliente.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
      //console.log("1) ult tarifa GRAL CLIENTE: ",this.ultTarifaGralCliente);              
    });
    /////////TARIFA GENERAL CHOFER /////////////////////////
    this.storageService.ultTarifaGralChofer$.subscribe(data =>{
      //////console.log("data: ", data);                
      this.ultTarifaGralChofer = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
      this.ultTarifaGralChofer.cargasGenerales = this.ultTarifaGralChofer.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
      //console.log("2) ult tarifa GRAL CHOFER: ",this.ultTarifaGralChofer);              
    });
   
    /////////TARIFA ESPECIAL CHOFER /////////////////////////
    this.storageService.ultTarifaEspChofer$
      //.pipe(take(2)) // Asegúrate de que la suscripción se complete después de la primera emisión
      .subscribe(data =>{
      //////console.log("2c) data: ", data);                
      this.ultTarifaEspChofer = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
      this.ultTarifaEspChofer.cargasGenerales = this.ultTarifaEspChofer.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
      //console.log("4) ult tarifa ESP CHOFER: ",this.ultTarifaEspChofer);           
    })
    //////////////// TARIFA GENERAL PROVEEDORES ///////////////////
    this.storageService.ultTarifaGralProveedor$.subscribe(data =>{
      //console.log("data", data);        
      this.ultTarifaGralProveedor = data || {};
      this.ultTarifaGralProveedor.cargasGenerales = this.ultTarifaGralProveedor.cargasGenerales || [];
      //console.log("5) ult tarifa GRAL PROVEEDOR: ", this.ultTarifaGralProveedor);      
    })
    ////////////////TARIFA ESPECIAL PROVEEDORES//////////////////
    this.storageService.ultTarifaEspProveedor$
    //.pipe(take(2)) // Asegúrate de que la suscripción se complete después de la primera emisión
    .subscribe(data =>{
    //////console.log("2c) data: ", data);                
    this.ultTarifaEspProveedor = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
    this.ultTarifaEspProveedor.cargasGenerales = this.ultTarifaEspProveedor.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
    //console.log("6) ult tarifa ESP PROVEEDOR: ",this.ultTarifaEspProveedor);           
    });
  }

  changeCliente(e: any) {
    ////////console.log()(e.target.value)
    
    let clienteForm = this.$clientes.filter(function (cliente: Cliente) { 
        return cliente.idCliente === Number(e.target.value)
    });
    ////////console.log()(clienteForm);
    
    this.clienteSeleccionado = clienteForm[0];               
    ////////console.log()(this.clienteSeleccionado);
    this.form.patchValue({ cliente: e.target.value });

    if(this.clienteSeleccionado.tarifaTipo.personalizada){
      ////console.log("El cliente tiene tarifa personalizada");
      this.buscarTarifaPersonalizada();
    } else {
      this.tarifaPersonalizada = false;
      let array = [];
      array.push(this.tarifaPersonalizada)
      this.storageService.setInfo("opTarifaPersonalizada", array);
      array = []
    }
  }

  changeSecion(e:any){
    ////console.log("seccion: ", e.target.value);
    this.mostrarCategoria = true;
    this.seccionElegida = this.tarifaClienteSel.secciones[e.target.value - 1];
    this.tPersonalizada = {
      seccion : e.target.value,
      categoria: 0,
      nombre: "",
      aCobrar: 0,
      aPagar: 0
    }
   
  }

  changeCategoria(e:any){
    ////console.log("categoria: ", e.target.value);
    this.tPersonalizada = {
      seccion : this.tPersonalizada.seccion,
      categoria: this.tarifaClienteSel.secciones[this.tPersonalizada.seccion - 1].categorias[e.target.value-1].orden,
      nombre: this.tarifaClienteSel.secciones[this.tPersonalizada.seccion - 1].categorias[e.target.value-1].nombre,
      aCobrar: this.tarifaClienteSel.secciones[this.tPersonalizada.seccion - 1].categorias[e.target.value-1].aCobrar,
      aPagar: this.tarifaClienteSel.secciones[this.tPersonalizada.seccion - 1].categorias[e.target.value-1].aPagar,
    }
    ////console.log("tarifa personalizada: ", this.tPersonalizada);
  }

  buscarTarifaPersonalizada(){
    this.storageService.getElemntByIdLimit("tarifasPersCliente", "idCliente", "idTarifa", this.clienteSeleccionado?.idCliente, "ultTarifaPersCliente" )
    this.tarifaPersonalizada = true;      
    let array = [];
    array.push(this.tarifaPersonalizada)
    this.storageService.setInfo("opTarifaPersonalizada", array);
    array = []
  }


   changeChofer(e: any) {
    ////////console.log()(e.target.value)    
    let chofer = this.$choferes.filter(function (chofer: Chofer) { 
       return chofer.idChofer === Number(e.target.value)
    });
    ////////console.log()(chofer);    
    this.choferSeleccionado = chofer[0];     
    //console.log("Vehiculos: ", this.choferSeleccionado.vehiculo);
                  
    ////////console.log()(this.choferSeleccionado); 
    //this.form.patchValue({ chofer: e.target.value });
    if(this.choferSeleccionado.vehiculo.length > 1){
      let array:any = [];
      this.vehiculosChofer = true;
      array.push(this.vehiculosChofer);
      this.storageService.setInfo("vehiculosChofer", array);
      array = [];
    } else {
      this.patenteChofer = this.choferSeleccionado.vehiculo[0].dominio;
      //console.log("1)patente chofer: ", this.patenteChofer);   
      let array:any = [];
      this.vehiculosChofer = false;
      array.push(this.vehiculosChofer);
      this.storageService.setInfo("vehiculosChofer", array);
      array = [];
    }
  } 

  changeVehiculo(e: any) {
    ////console.log(e.target.value)    
    this.patenteChofer = e.target.value;
    //console.log("2)patente chofer: ", this.patenteChofer);    
  } 


  selectTarifaEventual(event: any) {
      let value = event.target.value;
      this.tarifaEventual = value === 'si';
      this.formTarifaEventual.patchValue({ tarifaEspecial: value });

      if (this.tarifaEventual) {
        this.form.get('acompaniante').clearValidators();

        // Añadir validadores requeridos para los campos adicionales
        this.formTarifaEventual.get('choferConcepto').setValidators(Validators.required);
        this.formTarifaEventual.get('choferValor').setValidators(Validators.required);
        this.formTarifaEventual.get('clienteConcepto').setValidators(Validators.required);
        this.formTarifaEventual.get('clienteValor').setValidators(Validators.required);
        this.tarifaEventual = true;      
        let array = [];
        array.push(this.tarifaEventual)
        this.storageService.setInfo("opTarifaEventual", array);
        array = [];
        this.tarifaPersonalizada = false;
        array.push(this.tarifaPersonalizada)
        this.storageService.setInfo("opTarifaPersonalizada", array);
        array = [];
      } else {
        this.form.get('acompaniante').setValidators(Validators.required);

        // Eliminar validadores requeridos para los campos adicionales
        this.formTarifaEventual.get('choferConcepto').clearValidators();
        this.formTarifaEventual.get('choferValor').clearValidators();
        this.formTarifaEventual.get('clienteConcepto').clearValidators();
        this.formTarifaEventual.get('clienteValor').clearValidators();
        this.tarifaEventual = false;              
        let array = [];
        array.push(this.tarifaEventual)
        this.storageService.setInfo("opTarifaEventual", array);
        array = [];
      }

      // Actualizar la validación de todos los campos
      this.form.get('acompaniante').updateValueAndValidity();
      this.formTarifaEventual.get('choferConcepto').updateValueAndValidity();
      this.formTarifaEventual.get('choferValor').updateValueAndValidity();
      this.formTarifaEventual.get('clienteConcepto').updateValueAndValidity();
      this.formTarifaEventual.get('clienteValor').updateValueAndValidity();


  }
  
    selectAcompaniante(event: any) {
      this.form.patchValue({ acompaniante: event.target.value });
    }


  onSubmit(){
  
    //console.log("personalizada: ",this.tarifaPersonalizada, "eventual: ", this.tarifaEventual, "vehiculos: ", this.vehiculosChofer );
    
    if (this.form.valid) {    
        if (!this.tarifaPersonalizada && !this.tarifaEventual && !this.vehiculosChofer){
          //console.log("operacin basica");
          this.armarOp();
        } else if(this.tarifaPersonalizada && !this.tarifaEventual && !this.vehiculosChofer){
            //console.log("solo personalizada");
            if(this.formTarifaPersonalizada.valid){
                this.armarOp();
            } else {
              this.mensajesError("error en el formulario de la tarifa personalizada")
            }         
        } else if (!this.tarifaPersonalizada && this.tarifaEventual && !this.vehiculosChofer){
            //console.log("solo eventual");
            if(this.formTarifaEventual.valid){
              this.armarOp();
            } else {
            this.mensajesError("error en el formulario de la tarifa eventual")
            }                   
        } else if (!this.tarifaPersonalizada && !this.tarifaEventual && this.vehiculosChofer) {
            //console.log("solo vehiculos chofer");
            if(this.formVehiculosChofer.valid){
              this.armarOp()
            } else{
              this.mensajesError("error en el formulario del vehiculo del chofer")
            }          
        } else if(this.tarifaPersonalizada && !this.tarifaEventual && this.vehiculosChofer){
            //console.log("tarifa personalizada y vehiculos chofer ");
            if(this.formTarifaPersonalizada.valid && this.formVehiculosChofer.valid){
              this.armarOp()    
            } else {
              this.mensajesError("error en los formularios de tarifa personalizada y vehiculos del chofer")
            }            
        } else if (!this.tarifaPersonalizada && this.tarifaEventual && this.vehiculosChofer){
            //console.log("tarifa eventual y vehiculos chofer ");
            if (this.formTarifaEventual.valid && this.formVehiculosChofer.valid){
              this.armarOp()
            } else {
              this.mensajesError("error en los formularios de tarifa eventual y vehiculos del chofer")
            }
        }
     
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
    if(this.clienteSeleccionado.tarifaTipo.especial){
      this.storageService.getElemntByIdLimit("tarifasEspCliente","idCliente","idTarifa",this.clienteSeleccionado.idCliente,"ultTarifaEspCliente");  
      }
    if(this.choferSeleccionado.tarifaTipo?.especial){
      this.storageService.getElemntByIdLimit("tarifasEspChofer","idChofer","idTarifa",this.choferSeleccionado.idChofer,"ultTarifaEspChofer");
    }  
    if(this.choferSeleccionado.tarifaTipo === null){      
      this.proveedorSeleccionado = this.$proveedores.filter((proveedor:Proveedor) =>{
        return proveedor.razonSocial = this.choferSeleccionado.proveedor
       })
       if(this.proveedorSeleccionado[0].tarifaTipo.especial){
        this.storageService.getElemntByIdLimit("tarifasEspProveedor","idProveedor","idTarifa",this.proveedorSeleccionado[0].idProveedor,"ultTarifaEspProveedor");
       } 
    }
    
    // Extraer valores del formulario y otros datos
    const formValues = this.form.value;

    // Construir la operación básica
    this.op = {
        id:null,
        idOperacion: new Date().getTime(),
        fecha: formValues.fecha,
        km: null,
        //documentacion: null,
        cliente: this.clienteSeleccionado,
        chofer: this.choferSeleccionado,
        observaciones: formValues.observaciones,
        //unidadesConFrio: false,
        acompaniante: this.acompaniante,
        //facturada: false,
        facturaCliente: null,
        facturaChofer: null,
        tarifaEventual: this.tarifaEventual,
        tEventual: this.tarifaEventual ? { 
          chofer: {
            concepto: this.formTarifaEventual.value.choferConcepto,
            valor: this.formTarifaEventual.value.choferValor
          },
          cliente: {
              concepto: this.formTarifaEventual.value.clienteConcepto,
              valor: this.formTarifaEventual.value.clienteValor
          }} : {
        chofer:{
          concepto: "",
          valor: 0,    
        },
        cliente:{
          concepto: "",
          valor: 0,    
        }
        },
        tarifaPersonalizada: this.tarifaPersonalizada,
        tPersonalizada: this.tarifaPersonalizada ? this.tPersonalizada : {
          seccion: 0,
          categoria: 0,
          nombre: '',
          aCobrar: 0,
          aPagar: 0
        },        
        patenteChofer: this.patenteChofer,
        estado:{
          abierta: true,
          cerrada: false,
          facturada: false,
        },
        aCobrar: this.tarifaEventual ? this.formTarifaEventual.value.clienteValor : this.tarifaPersonalizada ? this.tPersonalizada.aCobrar : 0,
        aPagar: this.tarifaEventual ? this.formTarifaEventual.value.choferValor : this.tarifaPersonalizada ? this.tPersonalizada.aPagar : 0,
        tarifaTipo: this.tarifaEventual ? {
          general: false,
          especial: false,
          eventual: true,   
          personalizada: false, 
        } : this.tarifaPersonalizada ? {
          general: false,
          especial: false,
          eventual: false,   
          personalizada: true, 
        } : (this.clienteSeleccionado.tarifaTipo.especial || this.choferSeleccionado.tarifaTipo?.especial) ?{
          general: false,
          especial: true,
          eventual: false,   
          personalizada: false, 
        } : {
          general: true,
          especial: false,
          eventual: false,   
          personalizada: false, 
        } ,
        documentacion: null,
    };   
    
    if(!this.tarifaEventual && !this.tarifaPersonalizada){
        if(this.clienteSeleccionado.tarifaTipo.especial){ ///si el cliente tiene una tarifa especial la buscar y llama al servicio
            /////////TARIFA ESPECIAL CLIENTE /////////////////////////
            this.storageService.ultTarifaEspCliente$
            //.pipe(take(3)) // Asegúrate de que la suscripción se complete después de la primera emisión
            .subscribe(data =>{            
            this.ultTarifaEspCliente = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
            //this.ultTarifaEspCliente.cargasGenerales = this.ultTarifaEspCliente.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
            console.log("3) ult tarifa ESP CLIENTE: ",this.ultTarifaEspCliente);              
            this.op.aCobrar = this.aCobrarOp()
            })
        } else {
          this.op.aCobrar = this.aCobrarOp() ///sino quiere decir q el cliente tiene una tarifa general
        }
        if(this.choferSeleccionado.tarifaTipo?.especial){ ///si el chofer tiene una tarifa especial la buscar y llama al servicio
          this.storageService.ultTarifaEspChofer$          
          .subscribe(data =>{          
          this.ultTarifaEspChofer = data || {};           
          this.op.aPagar = this.aPagarOp();
        })
        } else if (this.choferSeleccionado.tarifaTipo === null){ ///si es null quiere decir q tiene un proveedor
          this.storageService.ultTarifaEspProveedor$          
          .subscribe(data =>{          
          this.ultTarifaEspProveedor = data || {};           
          this.op.aPagar = this.aPagarOp();
          });
        } else {
          console.log("pasa por aca?");
          
          this.op.aPagar = this.aPagarOp();
        }
        
      
    }
      
      //this.op.aCobrar = this.buscarTarifaServ.getACobrar(this.op, this.ultTarifaGralCliente, this.ultTarifaEspCliente)
      //this.op.aPagar = this.buscarTarifaServ.getAPagar(this.op, this.ultTarifaGralChofer, this.ultTarifaEspChofer, this.ultTarifaGralProveedor, proveedor )
    //console.log("esta es la operacion: ", this.op);  
    Swal.fire({
      title: "¿Desea agregar la operación?",
      //text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Agregar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        //////console.log("op: ", this.op);  
        this.addItem();
        Swal.fire({
          title: "Confirmado",
          text: "La operación ha sido agregada.",
          icon: "success"
        }).then((result)=>{
          if (result.isConfirmed) {
            //this.activeModal.close();
          }
        });   
        
      }
    });   
   
   }

   addItem(): void {
    //////console.log("llamada al storage desde op-alta, addItem");
    this.storageService.addItem(this.componente, this.op);    
    this.form.reset();     
    this.mostrarCategoria = false;
    //this.seccionElegida = 0;
    this.categoriaElegida = 0;
    let array:any = [];
    this.vehiculosChofer = false;
    array.push(this.vehiculosChofer);
    this.storageService.setInfo("vehiculosChofer", array);
    array = [];
    this.tarifaEventual = false;
    array.push(this.tarifaEventual)
    this.storageService.setInfo("opTarifaEventual", array);
    array = [];
    this.tarifaPersonalizada = false;
    array.push(this.tarifaPersonalizada)
    this.storageService.setInfo("opTarifaPersonalizada", array);
    array = [];
  }  

 get Fecha() {
  return this.form.get('fecha');
} 




aCobrarOp(){ 
  
  console.log("2) cliente especial: ", this.ultTarifaEspCliente);   
  let tarifa
  if(this.clienteSeleccionado.tarifaTipo.especial){
    tarifa = this.ultTarifaEspCliente;
    console.log("1A) tarifa esp a cobrar: ", tarifa);    
  } else {
    tarifa = this.ultTarifaGralCliente;
    console.log("1B) tarifa gral cobrar: ", tarifa);     
  }
  return this.buscarTarifaServ.getACobrar(tarifa, this.choferSeleccionado, this.patenteChofer);  
}

aPagarOp(){
  let tarifa;  
  if(this.choferSeleccionado.proveedor === "monotributista"){
    if(this.choferSeleccionado.tarifaTipo?.especial){
      tarifa = this.ultTarifaEspChofer;
      console.log("2A) tarifa esp a pagar: ", tarifa);    
    } else {
      tarifa = this.ultTarifaGralChofer;
      console.log("2B) tarifa gral a pagar: ", tarifa);    
    }
    return this.buscarTarifaServ.getAPagar(tarifa, this.choferSeleccionado, this.patenteChofer);  
  } else {     
     if(this.proveedorSeleccionado[0].tarifaTipo.especial){
      tarifa = this.ultTarifaEspProveedor;
      console.log("2C) tarifa PRO esp a pagar: ", tarifa);    
     } else {
      tarifa = this.ultTarifaGralProveedor;
      console.log("2D) tarifa PRO gral a pagar: ", tarifa);    
     }
     return this.buscarTarifaServ.getAPagarProveedor(tarifa, this.choferSeleccionado, this.patenteChofer);
     
  }
} 
}
