import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { LoginComponent } from 'src/app/appLogin/login/login.component';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { Operacion, TarifaPersonalizada } from 'src/app/interfaces/operacion';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { TarifaEventual } from 'src/app/interfaces/tarifa-eventual';
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { Seccion, TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { BuscarTarifaService } from 'src/app/servicios/buscarTarifa/buscar-tarifa.service';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { FormatoNumericoService } from 'src/app/servicios/formato-numerico/formato-numerico.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { TableroService } from 'src/app/servicios/tablero/tablero.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-modal-op-alta',
    templateUrl: './modal-op-alta.component.html',
    styleUrls: ['./modal-op-alta.component.scss'],
    standalone: false
})
export class ModalOpAltaComponent implements OnInit {

@Output() newItemEvent = new EventEmitter<any>();
  componente:string = "operaciones"
  form:any;
  op!: Operacion;
  clientes$!: any;
  choferes$!: any;
  $choferes!: ConIdType<Chofer>[];
  $clientes!: ConIdType<Cliente>[];
  clienteSeleccionado!: ConIdType<Cliente> ;
  choferSeleccionado!: ConIdType<Chofer> ;  
  acompaniante: boolean = false ;
  tarifaEventual!: TarifaEventual;
  tEventual: boolean = false ;
  $proveedores!:any;  
  tPersonalizada: boolean = false;
  tarifaClienteSel!: ConIdType<TarifaPersonalizadaCliente> | undefined;
  formTarifaPersonalizada!: any;
  formTarifaEventual!: any;
  formVehiculosChofer!:any
  mostrarCategoria: boolean = false;
  seccionElegida!: Seccion;
  categoriaElegida: number = 0;
  tarifaPersonalizada!: TarifaPersonalizada;
  vehiculosChofer: boolean = false;
  patenteChofer: string = "";
  ultTarifaGralCliente!: ConIdType<TarifaGralCliente>;
  ultTarifaGralChofer!: ConIdType<TarifaGralCliente>;
  ultTarifaGralProveedor!: ConIdType<TarifaGralCliente>;
  ultTarifaEspCliente!: ConIdType<TarifaGralCliente>;
  ultTarifaEspChofer!: ConIdType<TarifaGralCliente>;
  ultTarifaEspProveedor!: ConIdType<TarifaGralCliente>;
  proveedorSeleccionado!: ConIdType<Proveedor>[];
  ocultarSelecEventual: boolean = false;
  clienteEventual: boolean = false;
  choferEventual: boolean = false;
  today = new Date().toISOString().split('T')[0];
  private destroy$ = new Subject<void>(); // Subject para manejar la destrucción
  isLoading:boolean = false;

  constructor(
    private fb: FormBuilder, 
    private storageService: StorageService, 
    private buscarTarifaServ: BuscarTarifaService, 
    private formNumServ: FormatoNumericoService, 
    public activeModal: NgbActiveModal,  
    private tableroServ: TableroService
  ){
    this.form = this.fb.group({
      fecha: [this.today, Validators.required],
      cliente: ['', Validators.required],
      chofer: ['', Validators.required],
      tarifaEventual: ['', Validators.required],
      acompaniante: ['', Validators.required],
      observaciones: [''],    
      hojaRuta:[''],
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
        
    this.storageService.getObservable<ConIdType<Chofer>>("choferes")
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      this.$choferes = data;
      this.$choferes = this.$choferes        
        .sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer
    });
    this.storageService.getObservable<ConIdType<Cliente>>("clientes")
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      this.$clientes = data;
      this.$clientes = this.$clientes.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
    }); 
    this.storageService.getObservable<ConIdType<Proveedor>>("proveedores")
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      this.$proveedores = data;            
    })   
    
    this.storageService.opTarEve$
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data=>{
      let datos = data
      this.tarifaEventual = datos[0];
    })
    this.storageService.opTarPers$
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data=>{
      let datos = data
      this.tarifaPersonalizada = datos[0];
    });
    /////////TARIFA GENERAL CLIENTE /////////////////////////    
    this.storageService.getObservable<ConIdType<TarifaGralCliente>>("tarifasGralCliente")
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data =>{    
      if (!Array.isArray(data) && typeof data === 'object' && data !== null) {
        //console.log("data", data);
        this.ultTarifaGralCliente = data || {};          
        //console.log("this.tarifaGeneral", this.tarifaGeneral);
      } else {
        //console.error("El valor obtenido no es un objeto, es un array, null o no es un objeto válido.");
        //console.log("data", data);
        this.ultTarifaGralCliente = data[0] || {};          
        //console.log("this.tarifaGeneral", this.tarifaGeneral);
      }  
           
    });
    /////////TARIFA GENERAL CHOFER /////////////////////////    
    this.storageService.getObservable<ConIdType<TarifaGralCliente>>("tarifasGralChofer")
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data =>{    
      if (!Array.isArray(data) && typeof data === 'object' && data !== null) {
        //console.log("data", data);
        this.ultTarifaGralChofer = data || {};          
        //console.log("this.tarifaGeneral", this.tarifaGeneral);
      } else {
        //console.error("El valor obtenido no es un objeto, es un array, null o no es un objeto válido.");
        //console.log("data", data);
        this.ultTarifaGralChofer = data[0] || {};          
        //console.log("this.tarifaGeneral", this.tarifaGeneral);
      }  
    });
    //////////////// TARIFA GENERAL PROVEEDORES ///////////////////    
    this.storageService.getObservable<ConIdType<TarifaGralCliente>>("tarifasGralProveedor")
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data =>{
      if (!Array.isArray(data) && typeof data === 'object' && data !== null) {
        //console.log("data", data);
        this.ultTarifaGralProveedor = data || {};          
        //console.log("this.tarifaGeneral", this.tarifaGeneral);
      } else {
        //console.error("El valor obtenido no es un objeto, es un array, null o no es un objeto válido.");
        //console.log("data", data);
        this.ultTarifaGralProveedor = data[0] || {};          
        //console.log("this.tarifaGeneral", this.tarifaGeneral);
      }     
      
    });     
  }

  ngOnDestroy(): void {
    // Completa el Subject para cancelar todas las suscripciones
    this.destroy$.next();
    this.destroy$.complete();
  }

  changeCliente(e: any) {
    //////////console.log()(e.target.value)
    
    let clienteForm = this.$clientes.filter(function (cliente: Cliente) { 
        return cliente.idCliente === Number(e.target.value)
    });   
    
    this.clienteSeleccionado = clienteForm[0];           

    if(this.clienteSeleccionado.tarifaTipo.eventual){
      this.tEventual = true;
      this.clienteEventual = true;
      this.ocultarSelecEventual = true;      
      //this.medidasModal(this.tEventual, "opTarifaEventual");    
      this.tPersonalizada = false;
      //this.medidasModal(this.tPersonalizada, "opTarifaPersonalizada");     
      this.form.patchValue({
        tarifaEventual:"si",
        acompaniante: "false"
      });
    } else {      
      this.clienteEventual = false;      
      if(!this.choferEventual){        
        this.tEventual = false;
        this.ocultarSelecEventual = false;
        this.form.patchValue({
          tarifaEventual:"no",
        });
        //this.medidasModal(this.tEventual, "opTarifaEventual");        
      };      
      
    }

    if(this.clienteSeleccionado.tarifaTipo.personalizada){
      //////console.log("El cliente tiene tarifa personalizada");
      this.buscarTarifaPersonalizada();     
    } else {
      this.tPersonalizada = false;
      //this.medidasModal(this.tPersonalizada, "opTarifaPersonalizada");      
    }
    //console.log("CHANGE CLIENTE) proveedores: ", this.$proveedores);
  }

  changeChofer(e: any) {
    //////////console.log()(e.target.value)    
    let chofer = this.$choferes.filter(function (chofer: Chofer) { 
       return chofer.idChofer === Number(e.target.value)
    });
    //////////console.log()(chofer);    
    this.choferSeleccionado = chofer[0];     
    ////console.log("Vehiculos: ", this.choferSeleccionado.vehiculo);
    if(this.choferSeleccionado.tarifaTipo.eventual){
      this.tEventual = true;
      this.ocultarSelecEventual = true;
      this.choferEventual = true;
      this.form.patchValue({
        tarifaEventual:"si",
        acompaniante: "false"
      });
      //this.medidasModal(this.tEventual, "opTarifaEventual");      
      this.tPersonalizada = false;
      //this.medidasModal(this.tPersonalizada, "opTarifaPersonalizada");      
    } else {      
      this.choferEventual = false;
      if(!this.clienteEventual){ 
        this.form.patchValue({
          tarifaEventual:"no",
        });       
        this.tEventual = false;
        this.ocultarSelecEventual = false;
        //this.medidasModal(this.tEventual, "opTarifaEventual");        
      };            
    }  
    //////////console.log()(this.choferSeleccionado); 
    //this.form.patchValue({ chofer: e.target.value });
    if(this.choferSeleccionado.vehiculo.length > 1){
      this.vehiculosChofer = true;
      //this.medidasModal(this.vehiculosChofer, "vehiculosChofer");      
    } else {
      this.patenteChofer = this.choferSeleccionado.vehiculo[0].dominio;
      ////console.log("1)patente chofer: ", this.patenteChofer);   
      this.vehiculosChofer = false;
      //this.medidasModal(this.vehiculosChofer, "vehiculosChofer");      
    }
    //console.log("CHANGE CHOFER) proveedores: ", this.$proveedores);
  } 

  changeVehiculo(e: any) {
    //////console.log(e.target.value)    
    this.patenteChofer = e.target.value;
    ////console.log("2)patente chofer: ", this.patenteChofer);    
    //console.log("CHANGE VEHICULO) proveedores: ", this.$proveedores);
  } 



  changeSecion(e:any){
    //////console.log("seccion: ", e.target.value);
    if(this.tarifaClienteSel){
      this.mostrarCategoria = true;
      this.seccionElegida = this.tarifaClienteSel.secciones[e.target.value - 1];
      this.tarifaPersonalizada = {
        seccion : Number(e.target.value),
        categoria: 0,
        nombre: "",
        aCobrar: 0,
        aPagar: 0
      }
    } else {
      this.mensajesError("error en tarifaClienteSel")
    }
    
    //console.log("CHANGE SECCION) proveedores: ", this.$proveedores);
  }

  changeCategoria(e:any){
    //////console.log("categoria: ", e.target.value);
    if(this.tarifaClienteSel){
      this.tarifaPersonalizada = {
        seccion : this.tarifaPersonalizada.seccion,
        categoria: this.tarifaClienteSel.secciones[this.tarifaPersonalizada.seccion - 1].categorias[e.target.value-1].orden,
        nombre: this.tarifaClienteSel.secciones[this.tarifaPersonalizada.seccion - 1].categorias[e.target.value-1].nombre,
        aCobrar: this.tarifaClienteSel.secciones[this.tarifaPersonalizada.seccion - 1].categorias[e.target.value-1].aCobrar,
        aPagar: this.tarifaClienteSel.secciones[this.tarifaPersonalizada.seccion - 1].categorias[e.target.value-1].aPagar,
      }
    } else {
      this.mensajesError("error en tarifaClienteSel")
    }
    
    //////console.log("tarifa personalizada: ", this.tPersonalizada);
    //console.log("CHANGE CATEGORIA) proveedores: ", this.$proveedores);
  }

  buscarTarifaPersonalizada(){
    //this.storageService.getMostRecentItemId("tarifasPersCliente", "idTarifa", "idCliente", this.clienteSeleccionado?.idCliente);   
    this.storageService.getObservable<ConIdType<TarifaPersonalizadaCliente>>("tarifasPersCliente")
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      if (data) {
        console.log("data: ", data);            
        let tarfPers: ConIdType<TarifaPersonalizadaCliente>[]  = data;
        if(this.clienteSeleccionado){
          console.log("aca????????");              
          this.tarifaClienteSel = tarfPers.find((t:ConIdType<TarifaPersonalizadaCliente>) => {return t.idCliente === this.clienteSeleccionado.idCliente})
          console.log("ultTarifaCliente", this.tarifaClienteSel);    
          if(this.choferEventual){
            this.tPersonalizada = false;         
          } else{
            this.tPersonalizada = true;      
            this.tEventual = false
            
          }           
          
        }
    }
    })
  }

  selectTarifaEventual(event: any) {
    let value = event.target.value;
    console.log(event.target.value);      
    this.tEventual = value === 'si';
    //this.formTarifaEventual.patchValue({ tarifaEspecial: value });
    this.actualizarValidaciones()
  
    //console.log("SELECCIONAR TARIFA EVENTUAL) proveedores: ", this.$proveedores);
  }

  actualizarValidaciones(){
    console.log("actualizarValidaciones) tEventual: ",this.tEventual);
    
    if (this.tEventual) {
      this.form.get('acompaniante').clearValidators();

      // Añadir validadores requeridos para los campos adicionales
      this.formTarifaEventual.get('choferConcepto').setValidators(Validators.required);
      this.formTarifaEventual.get('choferValor').setValidators(Validators.required);
      this.formTarifaEventual.get('clienteConcepto').setValidators(Validators.required);
      this.formTarifaEventual.get('clienteValor').setValidators(Validators.required);
      //this.tarifaEventual = true;      
      //this.medidasModal(this.tEventual, "opTarifaEventual");     
      this.tPersonalizada = false;
      //this.medidasModal(this.tPersonalizada, "opTarifaPersonalizada");      
    } else {
      this.form.get('acompaniante').setValidators(Validators.required);

      // Eliminar validadores requeridos para los campos adicionales
      this.formTarifaEventual.get('choferConcepto').clearValidators();
      this.formTarifaEventual.get('choferValor').clearValidators();
      this.formTarifaEventual.get('clienteConcepto').clearValidators();
      this.formTarifaEventual.get('clienteValor').clearValidators();
      
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
    //console.log("SELECCIONAR ACOMPAÑANTE) proveedores: ", this.$proveedores);
  }


  onSubmit(){
    console.log("onSubmit) form:", this.form);
    this.actualizarValidaciones()
    ////console.log("personalizada: ",this.tarifaPersonalizada, "eventual: ", this.tarifaEventual, "vehiculos: ", this.vehiculosChofer );
    //console.log("ON SUBMIT) proveedores: ", this.$proveedores);
    
    let proveedores : Proveedor[] = this.storageService.loadInfo("proveedores");
    
    if (this.choferSeleccionado.vehiculo.length > 0) {   
      
      if(this.vehiculosChofer && !this.formVehiculosChofer.valid){            
        return this.mensajesError("El chofer seleccionado tiene asignado varios vehiculos. Debe seleccionar uno");
      }

      if (!this.tPersonalizada && !this.tEventual){ // Op con TARIFAS GENERALES Y ESPECIALES
        if(!this.clienteSeleccionado.tarifaAsignada){            
            return this.mensajesError(`El cliente ${this.clienteSeleccionado.razonSocial} aún no tiene una tarifa asignada`);            
        } 
        if(!this.choferSeleccionado.tarifaAsignada && this.choferSeleccionado.idProveedor === 0){
          return this.mensajesError(`El chofer ${this.choferSeleccionado.apellido} ${this.choferSeleccionado.nombre}  aún no tiene una tarifa asignada`); 
        }
        if(this.choferSeleccionado.idProveedor !== 0){
          console.log("aca?");
          let prov = proveedores.filter((p:Proveedor)=>{return p.idProveedor === this.choferSeleccionado.idProveedor})
          if (!prov[0].tarifaAsignada){
            return this.mensajesError(`El proveedor ${prov[0].razonSocial} aún no tiene una tarifa asignada`);            
          }            
        }
        this.armarOp();
        
        ////console.log("operacin basica");
        
      } else if(this.tPersonalizada && !this.tEventual){ //OP TARIFA PERSONALIZADA
          if(!this.clienteSeleccionado.tarifaAsignada){            
              return this.mensajesError(`El cliente ${this.clienteSeleccionado.razonSocial} aún no tiene una tarifa asignada`);            
          } 
          if(this.formTarifaPersonalizada.valid){
              this.armarOp();
          } else {
            this.mensajesError("El cliente tiene asignada una tarifa personalizada. Debe seleccionar una sección y una categoria.")
          }         
      } else if (!this.tPersonalizada && this.tEventual){ //op TARIFA EVENTUAL
        ////console.log("solo eventual");
        if(this.formTarifaEventual.valid){
          this.armarOp();
        } else {
        this.mensajesError("error en el formulario de la tarifa eventual")
        }                   
      }
     
    }  else {
      this.mensajesError("El chofer no tiene asignado ningun vehículo")
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

  async armarOp(){  
  // Extraer valores del formulario y otros datos
  const formValues = this.form.value;

  // Construir la operación básica
  this.op = {
      
    idOperacion: new Date().getTime(),
    fecha: formValues.fecha,
    km: 0,
    //documentacion: null,
    cliente: this.clienteSeleccionado,
    chofer: this.choferSeleccionado,
    observaciones: formValues.observaciones,
    hojaRuta:formValues.hojaRuta,
    //unidadesConFrio: false,
    acompaniante: this.acompaniante,
    //facturada: false,
    facturaCliente: 0,
    facturaChofer: 0,        
    tarifaEventual: this.tEventual ? { 
      chofer: {
        concepto: this.formTarifaEventual.value.choferConcepto,
        valor: this.formNumServ.convertirAValorNumerico(this.formTarifaEventual.value.choferValor)
      },
      cliente: {
          concepto: this.formTarifaEventual.value.clienteConcepto,
          valor: this.formNumServ.convertirAValorNumerico(this.formTarifaEventual.value.clienteValor)
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
      facCliente: false,
      facChofer: false,
      facturada: false,
      proformaCl: false,
      proformaCh: false,
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
    } : (this.clienteSeleccionado.tarifaTipo.especial || this.choferSeleccionado.tarifaTipo.especial) ? {
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
        tarifaBase: this.tEventual ? this.formNumServ.convertirAValorNumerico(this.formTarifaEventual.value.clienteValor) : this.tarifaPersonalizada ? this.tarifaPersonalizada.aCobrar : 0,
        aCobrar: this.tEventual ? this.formNumServ.convertirAValorNumerico(this.formTarifaEventual.value.clienteValor) : this.tarifaPersonalizada ? this.tarifaPersonalizada.aCobrar : 0,
      },
      chofer:{
        acompValor: 0,
        kmAdicional: 0,
        tarifaBase: this.tEventual ? this.formNumServ.convertirAValorNumerico(this.formTarifaEventual.value.choferValor) : this.tarifaPersonalizada ? this.tarifaPersonalizada.aPagar : 0,
        aPagar: this.tEventual ? this.formNumServ.convertirAValorNumerico(this.formTarifaEventual.value.choferValor) : this.tarifaPersonalizada ? this.tarifaPersonalizada.aPagar : 0,
      }
    },
    documentacion: null,
    multiplicadorCliente: 1,
    multiplicadorChofer: 1,
  };   

  //console.log("APENAS SE CREA: ", this.op);
  

  if(this.op.tarifaTipo.especial){
    if(this.clienteSeleccionado.tarifaTipo.especial){        
      /////////TARIFA ESPECIAL CLIENTE /////////////////////////
      //this.dbFirebase.getMostRecentId<TarifaGralCliente>("tarifasEspCliente","idTarifa","idCliente",this.clienteSeleccionado.idCliente) //buscamos la tarifa especial
      this.storageService.getObservable<ConIdType<TarifaGralCliente>>("tarifasEspCliente")
        .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario   
        .subscribe(data =>{                 
          if(data){
            let tarifas : any[] = data 
            console.log("tarifas esp clientes", tarifas);
            this.ultTarifaEspCliente = tarifas.find((tarifa: TarifaGralCliente)  => tarifa.idCliente === this.clienteSeleccionado.idCliente);  
            console.log("ultTarifaEspCliente", this.ultTarifaEspCliente);
              
              //console.log("4) ult tarifa ESP CLIENTE: ",this.ultTarifaEspCliente);              
            if(this.ultTarifaEspCliente?.cargasGenerales?.length > 0 ){
              this.op.valores.cliente.tarifaBase = this.aCobrarOp();
              this.op.valores.cliente.aCobrar = this.op.valores.cliente.tarifaBase;
            }else{
              this.mensajesError("ultTarifaEspCliente")
            }            
          }          
      })
    } else {
      this.op.valores.cliente.tarifaBase = this.aCobrarOp();
      this.op.valores.cliente.aCobrar = this.op.valores.cliente.tarifaBase;
    }
    if(this.choferSeleccionado.tarifaTipo.especial){
        if(this.choferSeleccionado.idProveedor === 0){
            /////////TARIFA ESPECIAL CHOFER /////////////////////////
            this.storageService.getObservable<ConIdType<TarifaGralCliente>>("tarifasEspChofer")
            .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario   
            .subscribe(data =>{                 
              if(data){
                let tarifas : any[] = data 
                console.log("tarifas esp clientes", tarifas);
                this.ultTarifaEspChofer = tarifas.find((tarifa: TarifaGralCliente)  => tarifa.idChofer === this.choferSeleccionado.idChofer);  
                console.log("ultTarifaEspChofer", this.ultTarifaEspChofer);
                  
                  //console.log("4) ult tarifa ESP CLIENTE: ",this.ultTarifaEspCliente);              
                if(this.ultTarifaEspChofer?.cargasGenerales?.length > 0 ){
                  this.op.valores.chofer.tarifaBase = this.aPagarOp();  
                  this.op.valores.chofer.aPagar = this.op.valores.chofer.tarifaBase;
                }else{
                  this.mensajesError("ultTarifaEspChofer")
                }            
              }          
          });

        } else {
          /////////TARIFA ESPECIAL PROVEEDOR /////////////////////////
          this.proveedorSeleccionado = this.$proveedores.filter((proveedor:Proveedor) =>{
            return proveedor.idProveedor === this.choferSeleccionado.idProveedor;
          })            
          //this.dbFirebase.getMostRecentId<TarifaGralCliente>("tarifasEspProveedor","idTarifa","idProveedor", this.proveedorSeleccionado[0].idProveedor) //buscamos la tarifa especial
          this.storageService.getObservable<ConIdType<TarifaGralCliente>>("tarifasEspProveedor")
          .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario 
            .subscribe(data =>{ 
              if (data) {
                //console.log("data tEspecial", data);
                let tarifas : any[] = data 
                console.log("tarifas esp clientes", tarifas);
                this.ultTarifaEspProveedor = tarifas.find((tarifa: TarifaGralCliente)  => tarifa.idProveedor === this.proveedorSeleccionado[0].idProveedor);  
                console.log("ultTarifaEspProveedor", this.ultTarifaEspProveedor);
                if(this.ultTarifaEspProveedor?.cargasGenerales?.length > 0){
                  this.op.valores.chofer.tarifaBase = this.aPagarOp();  
                  this.op.valores.chofer.aPagar = this.op.valores.chofer.tarifaBase;
                };    

              }
                        
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

  const confirmacion = await Swal.fire({
    title: `¿Desea agregar la operación con fecha ${this.op.fecha} para el Cliente ${this.op.cliente.razonSocial}?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Agregar",
    cancelButtonText: "Cancelar"
  });

  if (confirmacion.isConfirmed) {
    this.isLoading = true;

    try {
      await this.addItem(); // ahora espera el resultado

      this.isLoading = false;
      const confirm = await Swal.fire({
        title: "Confirmado",
        text: "La operación ha sido agregada.",
        icon: "success"
      });

      if (confirm.isConfirmed) {
        this.activeModal.close();
      }

    } catch (error) {
      console.error("Error al agregar la operación:", error);
      this.isLoading = false;

      Swal.fire({
        title: "Error",
        text: "Ocurrió un error al guardar la operación.",
        icon: "error"
      });
    }

  } else if (confirmacion.dismiss === Swal.DismissReason.cancel) {
    Swal.fire({
      title: "Cancelado",
      text: "La operación no ha sido agregada.",
      icon: "info",
      confirmButtonText: "Entendido"
    });

    this.limpiarCampos();
    this.ngOnInit();
  }
  
}

async addItem() {
  await this.tableroServ.altaOperacionYActualizarTablero(this.op);
  this.limpiarCampos();
}

get Fecha() {
  return this.form.get('fecha');
} 

limpiarCampos() {
  this.form.reset();     
  this.formTarifaEventual.reset();
  this.formTarifaPersonalizada.reset();
  this.formVehiculosChofer.reset()
  this.mostrarCategoria = false;
  this.acompaniante = false ;
  this.ocultarSelecEventual = false;    
  this.categoriaElegida = 0;
  this.clienteEventual = false;
  this.choferEventual = false;   
  this.vehiculosChofer = false;
  //this.medidasModal(this.vehiculosChofer, "vehiculosChofer");    
  this.tEventual = false;
  //this.medidasModal(this.tEventual, "opTarifaEventual");          
  this.tPersonalizada = false;
  //this.medidasModal(this.tPersonalizada, "opTarifaPersonalizada");
}




  aCobrarOp(){ 

  //console.log("2) cliente especial: ", this.ultTarifaEspCliente);   
  let tarifa
  if(this.clienteSeleccionado.tarifaTipo.especial){
    tarifa = this.ultTarifaEspCliente;
    //console.log("1A) tarifa esp a cobrar: ", tarifa);    
  } else {
    tarifa = this.ultTarifaGralCliente;
    console.log("1B) tarifa gral cobrar: ", tarifa);     
  }
  return this.buscarTarifaServ.$getACobrar(tarifa, this.choferSeleccionado, this.patenteChofer);  
  }

  aPagarOp(){
    let tarifa;  
    if(this.choferSeleccionado.tarifaTipo.especial){
      if(this.choferSeleccionado.idProveedor === 0){
        if(this.ultTarifaEspChofer.idCliente === 0 || this.ultTarifaEspChofer.idCliente === this.op.cliente.idCliente){
          tarifa = this.ultTarifaEspChofer; 
          console.log("2A) tarifa esp chofer a pagar: ", tarifa);  
        } else {
          tarifa = this.ultTarifaGralChofer;
          console.log("2B) tarifa gral chofer a pagar: ", tarifa);   
        }
              
      } else {
        if(this.ultTarifaEspProveedor.idCliente === 0 || this.ultTarifaEspProveedor.idCliente === this.op.cliente.idCliente){
          tarifa = this.ultTarifaEspProveedor;
          console.log("2B) tarifa esp proveedor a pagar: ", tarifa);       
        } else {
          tarifa = this.ultTarifaGralProveedor;
          console.log("2B) tarifa gral proveedor a pagar: ", tarifa);   
        }      
      }
    } else {
      if(this.choferSeleccionado.idProveedor === 0){
        tarifa = this.ultTarifaGralChofer;
        console.log("2B) tarifa gral chofer a pagar: ", tarifa);   
      } else {
        tarifa = this.ultTarifaGralProveedor;
        console.log("2B) tarifa gral proveedor a pagar: ", tarifa);   
      }    
      
    }
    return this.buscarTarifaServ.$getAPagar(tarifa, this.choferSeleccionado, this.patenteChofer);
    
  } 

  hasError(controlName: string, errorName: string): boolean {
    const control = this.form.get(controlName);    
    return control?.hasError(errorName) && control.touched;
  }
  hasErrorTeventual(controlName: string, errorName: string): boolean {
    const control = this.formTarifaEventual.get(controlName);
    return control?.hasError(errorName) && control.touched;
  }

}
