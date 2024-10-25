import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Operacion, TarifaEventual, TarifaPersonalizada } from 'src/app/interfaces/operacion';
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
  acompaniante: boolean = false ;
  tarifaEventual!: TarifaEventual;
  tEventual: boolean = false ;
  $tarifasChoferes!:TarifaChofer [];
  $tarifasProveedores!: TarifaProveedor [];
  $tarifasClientes!: TarifaCliente [];
  $proveedores!:any;
  arrayRespuesta!: any[];
  tPersonalizada: boolean = false;
  tarifaClienteSel!: TarifaPersonalizadaCliente;
  formTarifaPersonalizada!: any;
  formTarifaEventual!: any;
  formVehiculosChofer!:any
  mostrarCategoria: boolean = false;
  seccionElegida!: Seccion;
  categoriaElegida: number = 0;
  tarifaPersonalizada!: TarifaPersonalizada;
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
      this.tPersonalizada = false;
      let array = [];
      array.push(this.tPersonalizada)
      this.storageService.setInfo("opTarifaPersonalizada", array);
      array = []
    }
  }

  changeSecion(e:any){
    ////console.log("seccion: ", e.target.value);
    this.mostrarCategoria = true;
    this.seccionElegida = this.tarifaClienteSel.secciones[e.target.value - 1];
    this.tarifaPersonalizada = {
      seccion : e.target.value,
      categoria: 0,
      nombre: "",
      aCobrar: 0,
      aPagar: 0
    }
   
  }

  changeCategoria(e:any){
    ////console.log("categoria: ", e.target.value);
    this.tarifaPersonalizada = {
      seccion : this.tarifaPersonalizada.seccion,
      categoria: this.tarifaClienteSel.secciones[this.tarifaPersonalizada.seccion - 1].categorias[e.target.value-1].orden,
      nombre: this.tarifaClienteSel.secciones[this.tarifaPersonalizada.seccion - 1].categorias[e.target.value-1].nombre,
      aCobrar: this.tarifaClienteSel.secciones[this.tarifaPersonalizada.seccion - 1].categorias[e.target.value-1].aCobrar,
      aPagar: this.tarifaClienteSel.secciones[this.tarifaPersonalizada.seccion - 1].categorias[e.target.value-1].aPagar,
    }
    ////console.log("tarifa personalizada: ", this.tPersonalizada);
  }

  buscarTarifaPersonalizada(){
    this.storageService.getElemntByIdLimit("tarifasPersCliente", "idCliente", "idTarifa", this.clienteSeleccionado?.idCliente, "ultTarifaPersCliente" )
    this.tPersonalizada = true;      
    let array = [];
    array.push(this.tPersonalizada)
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
      this.tEventual = value === 'si';
      this.formTarifaEventual.patchValue({ tarifaEspecial: value });

      if (this.tEventual) {
        this.form.get('acompaniante').clearValidators();

        // Añadir validadores requeridos para los campos adicionales
        this.formTarifaEventual.get('choferConcepto').setValidators(Validators.required);
        this.formTarifaEventual.get('choferValor').setValidators(Validators.required);
        this.formTarifaEventual.get('clienteConcepto').setValidators(Validators.required);
        this.formTarifaEventual.get('clienteValor').setValidators(Validators.required);
        //this.tarifaEventual = true;      
        let array = [];
        array.push(this.tEventual)
        this.storageService.setInfo("opTarifaEventual", array);
        array = [];
        this.tPersonalizada = false;
        array.push(this.tPersonalizada)
        this.storageService.setInfo("opTarifaPersonalizada", array);
        array = [];
      } else {
        this.form.get('acompaniante').setValidators(Validators.required);

        // Eliminar validadores requeridos para los campos adicionales
        this.formTarifaEventual.get('choferConcepto').clearValidators();
        this.formTarifaEventual.get('choferValor').clearValidators();
        this.formTarifaEventual.get('clienteConcepto').clearValidators();
        this.formTarifaEventual.get('clienteValor').clearValidators();
        this.tEventual = false;              
        let array = [];
        array.push(this.tEventual)
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
      //this.form.patchValue({ acompaniante: event.target.value });
      this.acompaniante = event.target.value.toLowerCase() == 'true';      
      
    }


  onSubmit(){
  
    //console.log("personalizada: ",this.tarifaPersonalizada, "eventual: ", this.tarifaEventual, "vehiculos: ", this.vehiculosChofer );
    
    if (this.form.valid) {    
        if (!this.tPersonalizada && !this.tEventual && !this.vehiculosChofer){
          //console.log("operacin basica");
          this.armarOp();
        } else if(this.tPersonalizada && !this.tEventual && !this.vehiculosChofer){
            //console.log("solo personalizada");
            if(this.formTarifaPersonalizada.valid){
                this.armarOp();
            } else {
              this.mensajesError("error en el formulario de la tarifa personalizada")
            }         
        } else if (!this.tPersonalizada && this.tEventual && !this.vehiculosChofer){
            //console.log("solo eventual");
            if(this.formTarifaEventual.valid){
              this.armarOp();
            } else {
            this.mensajesError("error en el formulario de la tarifa eventual")
            }                   
        } else if (!this.tPersonalizada && !this.tEventual && this.vehiculosChofer) {
            //console.log("solo vehiculos chofer");
            if(this.formVehiculosChofer.valid){
              this.armarOp()
            } else{
              this.mensajesError("error en el formulario del vehiculo del chofer")
            }          
        } else if(this.tPersonalizada && !this.tEventual && this.vehiculosChofer){
            //console.log("tarifa personalizada y vehiculos chofer ");
            if(this.formTarifaPersonalizada.valid && this.formVehiculosChofer.valid){
              this.armarOp()    
            } else {
              this.mensajesError("error en los formularios de tarifa personalizada y vehiculos del chofer")
            }            
        } else if (!this.tPersonalizada && this.tEventual && this.vehiculosChofer){
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
    
    // Extraer valores del formulario y otros datos
    const formValues = this.form.value;

    // Construir la operación básica
    this.op = {
        id:null,
        idOperacion: new Date().getTime(),
        fecha: formValues.fecha,
        km: 0,
        //documentacion: null,
        cliente: this.clienteSeleccionado,
        chofer: this.choferSeleccionado,
        observaciones: formValues.observaciones,
        //unidadesConFrio: false,
        acompaniante: this.acompaniante,
        //facturada: false,
        facturaCliente: 0,
        facturaChofer: 0,        
        tarifaEventual: this.tEventual ? { 
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
        
        tarifaPersonalizada: this.tPersonalizada ? this.tarifaPersonalizada : {
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
        tarifaTipo: this.tEventual ? {
          general: false,
          especial: false,
          eventual: true,   
          personalizada: false, 
        } : this.tPersonalizada ? {
          general: false,
          especial: false,
          eventual: false,   
          personalizada: true, 
        } : (this.clienteSeleccionado.tarifaTipo.especial || this.choferSeleccionado.tarifaTipo.especial) ?{
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
        valores:{          
          cliente:{
            acompValor: 0,
            kmAdicional: 0,
            tarifaBase: this.tEventual ? this.formTarifaEventual.value.clienteValor : this.tarifaPersonalizada ? this.tarifaPersonalizada.aCobrar : 0,
            aCobrar: this.tEventual ? this.formTarifaEventual.value.clienteValor : this.tarifaPersonalizada ? this.tarifaPersonalizada.aCobrar : 0,
          },
          chofer:{
            acompValor: 0,
            kmAdicional: 0,
            tarifaBase: this.tEventual ? this.formTarifaEventual.value.choferValor : this.tarifaPersonalizada ? this.tarifaPersonalizada.aPagar : 0,
            aPagar: this.tEventual ? this.formTarifaEventual.value.choferValor : this.tarifaPersonalizada ? this.tarifaPersonalizada.aPagar : 0,
          }
        },
        documentacion: null,
    };   

    if(this.op.tarifaTipo.especial){
        if(this.clienteSeleccionado.tarifaTipo.especial){
          this.storageService.getElemntByIdLimit("tarifasEspCliente","idCliente","idTarifa",this.clienteSeleccionado.idCliente,"ultTarifaEspCliente");  
          /////////TARIFA ESPECIAL CLIENTE /////////////////////////
          this.storageService.ultTarifaEspCliente$          
            .subscribe(data =>{            
            this.ultTarifaEspCliente = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
            this.ultTarifaEspCliente.cargasGenerales = this.ultTarifaEspCliente.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
            //console.log("3) ult tarifa ESP CLIENTE: ",this.ultTarifaEspCliente);              
            if(this.ultTarifaEspCliente.cargasGenerales.length > 0 ){
              this.op.valores.cliente.tarifaBase = this.aCobrarOp();
              this.op.valores.cliente.aCobrar = this.op.valores.cliente.tarifaBase;
            }            
          })
        } else {
          this.op.valores.cliente.tarifaBase = this.aCobrarOp();
          this.op.valores.cliente.aCobrar = this.op.valores.cliente.tarifaBase;
        }
        if(this.choferSeleccionado.tarifaTipo.especial){
            if(this.choferSeleccionado.proveedor === "monotributista"){
                this.storageService.getElemntByIdLimit("tarifasEspChofer","idChofer","idTarifa",this.choferSeleccionado.idChofer,"ultTarifaEspChofer");
                this.storageService.ultTarifaEspChofer$          
                  .subscribe(data =>{          
                  this.ultTarifaEspChofer = data || {};           
                  this.ultTarifaEspChofer.cargasGenerales = this.ultTarifaEspChofer.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
                  if(this.ultTarifaEspChofer.cargasGenerales.length > 0){
                    this.op.valores.chofer.tarifaBase = this.aPagarOp();  
                    this.op.valores.chofer.aPagar = this.op.valores.chofer.tarifaBase;
                  }                  
                })
            } else {
              this.proveedorSeleccionado = this.$proveedores.filter((proveedor:Proveedor) =>{
                return proveedor.razonSocial = this.choferSeleccionado.proveedor
              })
              this.storageService.getElemntByIdLimit("tarifasEspProveedor","idProveedor","idTarifa",this.proveedorSeleccionado[0].idProveedor,"ultTarifaEspProveedor");
              this.storageService.ultTarifaEspProveedor$          
                .subscribe(data =>{          
                this.ultTarifaEspProveedor = data || {};   
                this.ultTarifaEspProveedor.cargasGenerales = this.ultTarifaEspProveedor.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
                if(this.ultTarifaEspProveedor.cargasGenerales.length > 0){
                  this.op.valores.chofer.tarifaBase = this.aPagarOp();  
                  this.op.valores.chofer.aPagar = this.op.valores.chofer.tarifaBase;
                };                
              });
            }        
          } else {
            this.op.valores.chofer.tarifaBase = this.aPagarOp();  
            this.op.valores.chofer.aPagar = this.op.valores.chofer.tarifaBase;
          }

    } else if (this.op.tarifaTipo.general){
      this.op.valores.cliente.tarifaBase = this.aCobrarOp();
      this.op.valores.cliente.aCobrar = this.op.valores.cliente.tarifaBase;
      this.op.valores.chofer.tarifaBase = this.aPagarOp();  
      this.op.valores.chofer.aPagar = this.op.valores.chofer.tarifaBase;
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
    this.tEventual = false;
    array.push(this.tEventual)
    this.storageService.setInfo("opTarifaEventual", array);
    array = [];
    this.tPersonalizada = false;
    array.push(this.tPersonalizada)
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
  return this.buscarTarifaServ.$getACobrar(tarifa, this.choferSeleccionado, this.patenteChofer);  
}

aPagarOp(){
  let tarifa;  
  if(this.choferSeleccionado.tarifaTipo.especial){
    if(this.choferSeleccionado.proveedor === "monotributista"){
      tarifa = this.ultTarifaEspChofer; 
      console.log("2A) tarifa esp chofer a pagar: ", tarifa);        
    } else {
      tarifa = this.ultTarifaEspProveedor;
      console.log("2B) tarifa esp proveedor a pagar: ", tarifa);       
    }
  } else {
    if(this.choferSeleccionado.proveedor === "monotributista"){
      tarifa = this.ultTarifaGralChofer;
      console.log("2B) tarifa gral chofer a pagar: ", tarifa);   
    } else {
      tarifa = this.ultTarifaGralProveedor;
      console.log("2B) tarifa gral proveedor a pagar: ", tarifa);   
    }    
    
  }
  return this.buscarTarifaServ.$getAPagar(tarifa, this.choferSeleccionado, this.patenteChofer);
  
} 
}
