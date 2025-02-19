import { Injectable } from '@angular/core';

import { Operacion } from 'src/app/interfaces/operacion';

import { FacturacionClienteService } from '../facturacion-cliente/facturacion-cliente.service';
import { StorageService } from '../../storage/storage.service';

import { DbFirestoreService } from '../../database/db-firestore.service';
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { FacturacionChoferService } from '../facturacion-chofer/facturacion-chofer.service';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { Subject, take, takeUntil } from 'rxjs';
import { TarifaEventual } from 'src/app/interfaces/tarifa-eventual';

@Injectable({
  providedIn: 'root'
})
export class FacturacionOpService {  

  
  //facturaChofer!:FacturaOpChofer;
      
  $ultTarifaGralCliente!: TarifaGralCliente;
  $ultTarifaEspCliente!: TarifaGralCliente;
  $ultTarifaPersCliente!: TarifaPersonalizadaCliente;
  $ultTarifaGralChofer!: TarifaGralCliente;
  $ultTarifaEspChofer!: TarifaGralCliente;
  $ultTarifaGralProveedor!: TarifaGralCliente;
  $ultTarifaEspProveedor!: TarifaGralCliente;
  tarifaOpCliente!: TarifaGralCliente;
  facturaOpCliente!: FacturaOp | null;
  facturaOpChofer!: FacturaOp | null;
  facturaOpProveedor!: FacturaOp | null;
  $proveedores!: Proveedor[];
  clienteFacOp!: FacturaOp [];
  choferFacOp!: FacturaOp [];
  ProveedorFacOp!: FacturaOp [];
  operacion!: Operacion;
  proveedorSeleccionado!: Proveedor;
  tarifaEventual! : TarifaEventual;  
  i:number=0
  a:number=0
  private destroy$ = new Subject<void>(); // Control de destrucción de suscripciones

  constructor( private facturacionCliente: FacturacionClienteService, private facturacionChofer: FacturacionChoferService, private storageService: StorageService, private dbFirebase: DbFirestoreService) { }

  facturarOperacion(op: Operacion){      
    this.storageService.syncChangesByOneElem<TarifaGralCliente>('tarifasGralChofer', 'idTarifa');        
    this.storageService.syncChangesByOneElem<TarifaGralCliente>('tarifasGralProveedor', 'idTarifa');    
    this.storageService.syncChangesByOneElem<TarifaGralCliente>('tarifasGralCliente', 'idTarifa');
     
    /////////PROVEEDORES /////////////////////////
     this.storageService.getObservable<Proveedor>('proveedores').subscribe(data => {
      if(data){
        this.$proveedores = data;        
        if(op.chofer.idProveedor !== 0){
          let proveedores
          proveedores = this.$proveedores.filter((prov: Proveedor) =>{
            return prov.idProveedor === op.chofer.idProveedor;
          });          
          this.proveedorSeleccionado = proveedores[0];
          //console.log("0) Proveedor SELECCIONADO: ",this.proveedorSeleccionado);    
        }
      }      
    })
    /////////TARIFA GENERAL CLIENTE /////////////////////////    
    this.storageService.tarifasGralCliente$
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data =>{      
      if(data){
        if (!Array.isArray(data) && typeof data === 'object' && data !== null) {
          this.$ultTarifaGralCliente = data;
          console.log("1) ult tarifa GRAL CLIENTE: ", this.$ultTarifaGralCliente);              
        } else {
          console.error("El valor obtenido no es un objeto, es un array, null o no es un objeto válido.");
          this.$ultTarifaGralCliente = data[0];
        }      
      }
    });
 
    /////////TARIFA GENERAL CHOFER /////////////////////////   
    this.storageService.tarifasGralChofer$
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data =>{    
      if(data){
        if (!Array.isArray(data) && typeof data === 'object' && data !== null) {
          this.$ultTarifaGralChofer = data;        
          console.log("2) ult tarifa GRAL CHOFER: ",this.$ultTarifaGralChofer);              
        } else {
          console.error("El valor obtenido no es un objeto, es un array, null o no es un objeto válido.");
          this.$ultTarifaGralChofer = data[0];        
          console.log("2) ult tarifa GRAL CHOFER: ",this.$ultTarifaGralChofer);              
        }      
        
      }      
    });
  
    //////////////// TARIFA GENERAL PROVEEDORES ///////////////////
  
    this.storageService.tarifasGralProveedor$
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data =>{
      if(data){
        if (!Array.isArray(data) && typeof data === 'object' && data !== null) {
          this.$ultTarifaGralProveedor = data;        
          console.log("3) ult tarifa GRAL PROVEEDOR: ", this.$ultTarifaGralProveedor);              
        } else {
          console.error("El valor obtenido no es un objeto, es un array, null o no es un objeto válido.");
          this.$ultTarifaGralProveedor = data[0];        
          console.log("3) ult tarifa GRAL PROVEEDOR: ", this.$ultTarifaGralProveedor);              
        }    
              
      }
    });
    this.operacion = op;
    this.$facturarOpCliente(op);        
  }

  $facturarOpCliente(op: Operacion){
    let respuesta : {
      op: Operacion,
      factura: FacturaOp
    }

    if(op.tarifaTipo.general){ //tarifa general
      console.log("1)A.1) tarifa GENERAL CLIENTE: ", this.$ultTarifaGralCliente);     
      respuesta = this.facturacionCliente.$facturarOpCliente(op, this.$ultTarifaGralCliente);
      this.operacion.valores.cliente = respuesta.op.valores.cliente;
      this.facturaOpCliente = respuesta.factura;
      //console.log("1)A.2)Factura OP cliente ", this.facturaOpCliente);      
      //this.storageService.setInfoOne("facturaOpCliente", this.facturaOpCliente);
      if(op.chofer.idProveedor === 0){
        this.$facturarOpChofer(op);   
      } else {      
        this.$facturarOpProveedor(op);        
      }
    }
    if(op.tarifaTipo.especial){  //tarifa especial cliente
      if(op.cliente.tarifaTipo.especial){
        /////////TARIFA ESPECIAL CLIENTE /////////////////////////                   
          this.dbFirebase.getMostRecentId<TarifaGralCliente>("tarifasEspCliente","idTarifa","idCliente",op.cliente.idCliente) //buscamos la tarifa especial
          .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario   
          .subscribe(data =>{ 
            if(data){
                this.$ultTarifaEspCliente = data[0]; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
                //this.$ultTarifaEspCliente.cargasGenerales = this.$ultTarifaEspCliente.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío     
                //////console.log("2) tarifa ESPECIAL CLIENTE: ", this.$ultTarifaEspCliente);
                if(this.$ultTarifaEspCliente?.cargasGenerales?.length > 0){
                  //console.log("1)B.1) tarifa ESPECIAL CLIENTE: ", this.$ultTarifaEspCliente);
                  respuesta = this.facturacionCliente.$facturarOpCliente(op, this.$ultTarifaEspCliente);
                  this.operacion.valores.cliente = respuesta.op.valores.cliente;
                  this.facturaOpCliente = respuesta.factura;
                  //console.log("1)B.2) Factura OP cliente ", this.facturaOpCliente);
                  //this.storageService.setInfoOne("facturaOpCliente", this.facturaOpCliente);
                  if(op.chofer.idProveedor === 0){
                    this.$facturarOpChofer(op);   
                  } else {      
                    this.$facturarOpProveedor(op);        
                  }
                }
            }
        });
            
      } else {
        //console.log("1)A.1) tarifa GENERAL CLIENTE: ", this.$ultTarifaGralCliente);     
        //this.facturaOpCliente = this.facturacionCliente.$facturarOpCliente(op, this.$ultTarifaGralCliente);
        respuesta = this.facturacionCliente.$facturarOpCliente(op, this.$ultTarifaGralCliente);
        this.operacion.valores.cliente = respuesta.op.valores.cliente;
        this.facturaOpCliente = respuesta.factura;
        //console.log("1)A.2) Factura OP cliente ", this.facturaOpCliente);       
        //this.storageService.setInfoOne("facturaOpCliente", this.facturaOpCliente);
        if(op.chofer.idProveedor === 0){
          this.$facturarOpChofer(op);   
        } else {      
          this.$facturarOpProveedor(op);        
        }
      }
    }
    if(op.tarifaTipo.personalizada){ //tarifa personalizada
      /////////TARIFA PERSONALIZADA CLIENTE /////////////////////////
      /* this.dbFirebase.getMostRecentId<TarifaPersonalizadaCliente>("tarifasPersCliente","idTarifa","idCliente",op.cliente.idCliente) //buscamos la tarifa especial      
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe(data => {
          if(data){
              this.$ultTarifaPersCliente = data[0];
              //this.$ultTarifaPersCliente.secciones = this.$ultTarifaPersCliente.secciones || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
              ////console.log("1)C.1) tarifa PERSONALIZADA CLIENTE",this.$ultTarifaPersCliente);     
              if(this.$ultTarifaPersCliente?.secciones?.length > 0){
                //console.log("1)C.1) tarifa PERSONALIZADA CLIENTE",this.$ultTarifaPersCliente);     
                this.facturaOpCliente = this.facturacionCliente.$facturarOpPersCliente(op, this.$ultTarifaPersCliente);
                this.operacion.valores.cliente.aCobrar = this.facturaOpCliente.valores.total;
                //console.log("1)C.2) Factura OP cliente ", this.facturaOpCliente);
                //this.storageService.setInfoOne("facturaOpCliente", this.facturaOpCliente);
                if(op.chofer.idProveedor === 0){
                  this.$facturarOpChofer(op);   
                } else {      
                  this.$facturarOpProveedor(op);        
                }
              }   
          }          
        }); */
        let tPers = this.storageService.loadInfo("tPersCliente");
        this.$ultTarifaPersCliente = tPers[0];
        if(this.$ultTarifaPersCliente?.secciones?.length > 0){
            //console.log("1)C.1) tarifa PERSONALIZADA CLIENTE",this.$ultTarifaPersCliente);     
            respuesta = this.facturacionCliente.$facturarOpPersCliente(op, this.$ultTarifaPersCliente, this.$ultTarifaGralCliente);
            this.operacion.valores.cliente = respuesta.op.valores.cliente;
            this.facturaOpCliente = respuesta.factura;
            //console.log("1)C.2) Factura OP cliente ", this.facturaOpCliente);
            //this.storageService.setInfoOne("facturaOpCliente", this.facturaOpCliente);
            console.log("this.facturaOpCliente: ", this.facturaOpCliente);
            
            if(op.chofer.idProveedor === 0){
              this.$facturarOpChofer(op);   
            } else {      
              this.$facturarOpProveedor(op);        
            }
        }   
        
      //////console.log("3) tarifa PERSONALIZADA CLIENTE: ", this.$ultTarifaPersCliente);
    }
    if(op.tarifaTipo.eventual){ //tarifa personalizada
      //console.log("1)D.1)op eventual", op.tarifaEventual);
      respuesta = this.facturacionCliente.$facturarOpEveCliente(op, this.$ultTarifaGralCliente);
      this.operacion.valores.cliente = respuesta.op.valores.cliente;
      this.facturaOpCliente = respuesta.factura;
      //console.log("1)D.2) Factura OP cliente ", this.facturaOpCliente);
      //this.storageService.setInfoOne("facturaOpCliente", this.facturaOpCliente);
      if(op.chofer.idProveedor === 0){
        this.$facturarOpChofer(op);   
      } else {      
        this.$facturarOpProveedor(op);        
      }
    }
   
  
  }

  $facturarOpChofer(op: Operacion){
    //////console.log("hola");
    let respuesta : {
      op: Operacion,
      factura: FacturaOp
    }
    
    if(op.tarifaTipo.general){ //tarifa general
      console.log("2)A.1) tarifa GENERAL CHOFER: ", this.$ultTarifaGralChofer);
      respuesta = this.facturacionChofer.$facturarOpChofer(op, this.$ultTarifaGralChofer);
      ////console.log("respuesta: ", respuesta);      
      this.operacion.valores.chofer.aPagar = respuesta.factura.valores.total;
      this.facturaOpChofer = respuesta.factura;
      //this.facturaOpChofer = this.facturacionChofer.$facturarOpChofer(op, this.$ultTarifaGralChofer);
      //console.log("2)A.2)Factura OP chofer ", this.facturaOpChofer)
      //this.storageService.setInfoOne("facturaOpChofer", this.facturaOpChofer);
      this.$armarFacturasOp(op);
    }
    if(op.tarifaTipo.especial){  //tarifa especial chofer
      if(op.chofer.tarifaTipo.especial){
        /////////TARIFA ESPECIAL CHOFER /////////////////////////
        this.dbFirebase.getMostRecentId<TarifaGralCliente>("tarifasEspChofer","idTarifa","idChofer",op.chofer.idChofer) //buscamos la tarifa especial
        .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario   
        .subscribe(item => { 
          console.log(item);
          if (item) {            
            this.$ultTarifaEspChofer = item[0];   
            if(this.$ultTarifaEspChofer?.cargasGenerales?.length > 0){
                //console.log("2)B.1) tarifa ESPECIAL CHOFER: ", this.$ultTarifaEspChofer);                
                //si la tarifa especial del chofer es para el cliente de la op o para todos los clientes           
                if(this.$ultTarifaEspChofer?.idCliente === 0 || this.$ultTarifaEspChofer?.idCliente === op.cliente.idCliente){
                    console.log("pasa por aca?", "pasada n°: ", this.a);  
                    respuesta = this.facturacionChofer.$facturarOpChofer(op, this.$ultTarifaEspChofer);
                    console.log("respuesta", respuesta, "pasada n°: ", this.a);  
                    this.operacion.valores.chofer.aPagar = respuesta.factura.valores.total;
                    this.facturaOpChofer = respuesta.factura;
                    //console.log("2)B.2)Factura OP chofer ", this.facturaOpChofer);
                    //this.storageService.setInfoOne("facturaOpChofer", this.facturaOpChofer);
                    this.$armarFacturasOp(op);
                } else { ////este caso es donde la tarifa especial no aplica                  

                  //console.log("2)A.1) tarifa GENERAL CHOFER: ", this.$ultTarifaGralCliente);
                  respuesta = this.facturacionChofer.$facturarOpChofer(op, this.$ultTarifaGralChofer);
                  ////console.log("respuesta: ", respuesta);      
                  this.operacion.valores.chofer.aPagar = respuesta.factura.valores.total;
                  //aca le cambio el tipo de tarifa pq usa una tarifa especial no aplica
                  respuesta.factura.tarifaTipo = {general: true, especial: false, eventual:false, personalizada: false}
                  this.facturaOpChofer = respuesta.factura;
                  //this.facturaOpChofer = this.facturacionChofer.$facturarOpChofer(op, this.$ultTarifaGralChofer);
                  //console.log("2)A.2)Factura OP chofer ", this.facturaOpChofer)
                  //this.storageService.setInfoOne("facturaOpChofer", this.facturaOpChofer);
                  this.$armarFacturasOp(op);
                }
              }          
          }
        });    
            
      } else {
        //console.log("2)A.1) tarifa GENERAL CHOFER: ", this.$ultTarifaGralChofer);
        //this.facturaOpChofer = this.facturacionChofer.$facturarOpChofer(op, this.$ultTarifaGralChofer);
        respuesta = this.facturacionChofer.$facturarOpChofer(op, this.$ultTarifaGralChofer);
        this.operacion.valores.chofer.aPagar = respuesta.factura.valores.total;
        this.facturaOpChofer = respuesta.factura;
        //console.log("2)A.2)Factura OP chofer ", this.facturaOpChofer)
        //this.storageService.setInfoOne("facturaOpChofer", this.facturaOpChofer);
        this.$armarFacturasOp(op);
      }
    };
    if(op.tarifaTipo.personalizada){ //tarifa personalizada      
        /////////TARIFA PERSONALIZADA CLIENTE /////////////////////////
        /* this.dbFirebase.getMostRecentId<TarifaPersonalizadaCliente>("tarifasPersCliente","idTarifa","idCliente",op.cliente.idCliente) //buscamos la tarifa especial      
        .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
        .subscribe(data => {          
          if(data){
              this.$ultTarifaPersCliente = data[0];
              //this.$ultTarifaPersCliente.secciones = this.$ultTarifaPersCliente.secciones || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
              ////////console.log("1)",this.$ultTarifaCliente);     
              if(this.$ultTarifaPersCliente?.secciones.length > 0){
                //console.log("2)C.1) tarifa PERSONALIZADA CLIENTE",this.$ultTarifaPersCliente);     //se utiliza la tarifa del cliente pq ahi estan todos los valores
                this.facturaOpChofer = this.facturacionChofer.$facturarOpPersChofer(op, this.$ultTarifaPersCliente, 0);            
                this.operacion.valores.chofer.aPagar = this.facturaOpChofer.valores.total
                //console.log("2)C.2) Factura OP chofer ", this.facturaOpChofer);
                //this.storageService.setInfoOne("facturaOpChofer", this.facturaOpChofer);
                this.$armarFacturasOp(op);
              }   
          }
          
        }); */
      //////console.log("3) tarifa PERSONALIZADA CLIENTE: ", this.$ultTarifaPersCliente);
        let tPers = this.storageService.loadInfo("tPersCliente");
        this.$ultTarifaPersCliente = tPers[0];
        if(this.$ultTarifaPersCliente?.secciones?.length > 0){
            //console.log("1)C.1) tarifa PERSONALIZADA CLIENTE",this.$ultTarifaPersCliente);     
            respuesta = this.facturacionChofer.$facturarOpPersChofer(op, this.$ultTarifaPersCliente, 0, this.$ultTarifaGralChofer);            
            this.operacion.valores.chofer = respuesta.op.valores.chofer;
            this.facturaOpChofer = respuesta.factura;            
            //console.log("1)C.2) Factura OP cliente ", this.facturaOpCliente);
            //this.storageService.setInfoOne("facturaOpCliente", this.facturaOpCliente);
            console.log("this.facturaOpCliente: ", this.facturaOpCliente);
            this.$armarFacturasOp(op);
        }   
    }    
    if(op.tarifaTipo.eventual){ //tarifa eventual
      //console.log("2)D.1) op eventual", op.tarifaEventual);
      respuesta = this.facturacionChofer.$facturarOpEveChofer(op, 0, this.$ultTarifaGralChofer);      
      this.operacion.valores.chofer = respuesta.op.valores.chofer;
      this.facturaOpChofer = respuesta.factura;  
      //console.log("2)D.2) Factura OP chofer ", this.facturaOpChofer);
      //this.storageService.setInfoOne("facturaOpChofer", this.facturaOpChofer);
      this.$armarFacturasOp(op);
    }
    
  }

  $facturarOpProveedor(op: Operacion){    
    let respuesta : {
      op: Operacion,
      factura: FacturaOp
    }

    if(op.tarifaTipo.general){ //tarifa general
      console.log("3)A.1) tarifa GENERAL Proveedor: ", this.$ultTarifaGralProveedor);
      //console.log("3)A.1.1) PROVEEDOR SELECCIONADO: ", this.proveedorSeleccionado);
      
      respuesta = this.facturacionChofer.$facturarOpProveedor(op, this.$ultTarifaGralProveedor, this.proveedorSeleccionado.idProveedor);
      this.operacion.valores.chofer = respuesta.op.valores.chofer;
      this.facturaOpProveedor = respuesta.factura;
      //this.facturaOpProveedor = this.facturacionChofer.$facturarOpProveedor(op, this.$ultTarifaGralProveedor);
      //console.log("3)A.2) Factura OP proveedor ", this.facturaOpProveedor);
      //this.storageService.setInfoOne("facturaOpProveedor", this.facturaOpProveedor);
      this.$armarFacturasOp(op);
    }
    if(op.tarifaTipo.especial){  //tarifa especial proveedor
          if (this.proveedorSeleccionado.tarifaTipo.especial){
             /////////TARIFA ESPECIAL PROVEEDOR /////////////////////////                   
            this.dbFirebase.getMostRecentId<TarifaGralCliente>("tarifasEspProveedor","idTarifa","idProveedor", this.proveedorSeleccionado.idProveedor) //buscamos la tarifa especial
            .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario  
            .subscribe(data =>{
              if(data){
                ////////////console.log("2c) data: ", data);                
                this.$ultTarifaEspProveedor = data[0]; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
                //this.$ultTarifaEspProveedor.cargasGenerales = this.$ultTarifaEspProveedor.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
                ////////console.log("6) ult tarifa ESP PROVEEDOR: ",this.ultTarifaEspProveedor);           
                if(this.$ultTarifaEspProveedor?.cargasGenerales?.length > 0) {                  
                  //console.log("3)B.1) tarifa ESPECIAL PROVEEDOR: ", this.$ultTarifaEspProveedor);
                  if(this.$ultTarifaEspProveedor?.idCliente === 0 || this.$ultTarifaEspProveedor?.idCliente === op.cliente.idCliente){
                      //his.facturaOpProveedor = this.facturacionChofer.$facturarOpProveedor(op, this.$ultTarifaEspProveedor);
                      respuesta = this.facturacionChofer.$facturarOpProveedor(op, this.$ultTarifaEspProveedor, this.proveedorSeleccionado.idProveedor);
                      this.operacion.valores.chofer = respuesta.op.valores.chofer;
                      this.facturaOpProveedor = respuesta.factura;
                      //console.log("3)B.2) Factura OP proveedor ", this.facturaOpProveedor);
                      //this.storageService.setInfoOne("facturaOpProveedor", this.facturaOpProveedor);
                      this.$armarFacturasOp(op);
                  }else{
                      ////este caso es donde la tarifa especial no aplica
                      //this.facturaOpProveedor = this.facturacionChofer.$facturarOpProveedor(op, this.$ultTarifaGralProveedor);
                      //console.log("3)A.1) tarifa GENERAL Proveedor: ", this.$ultTarifaGralProveedor);
                      respuesta = this.facturacionChofer.$facturarOpProveedor(op, this.$ultTarifaGralProveedor, this.proveedorSeleccionado.idProveedor);                  
                      //aca le cambio el tipo de tarifa pq usa una tarifa especial no aplica
                      respuesta.factura.tarifaTipo = {general: true, especial: false, eventual:false, personalizada: false}
                      this.operacion.valores.chofer = respuesta.op.valores.chofer;
                      this.facturaOpProveedor = respuesta.factura;
                      //console.log("3)A.2) Factura OP proveedor ", this.facturaOpProveedor);
                      //this.storageService.setInfoOne("facturaOpProveedor", this.facturaOpProveedor);
                      this.$armarFacturasOp(op);
                  }                
                }
              }              
              });  
              } else {            
                //this.facturaOpProveedor = this.facturacionChofer.$facturarOpProveedor(op, this.$ultTarifaGralProveedor);
                //console.log("3)A.1) tarifa GENERAL Proveedor: ", this.$ultTarifaGralProveedor);
                respuesta = this.facturacionChofer.$facturarOpProveedor(op, this.$ultTarifaGralProveedor, this.proveedorSeleccionado.idProveedor);
                this.operacion.valores.chofer = respuesta.op.valores.chofer;
                this.facturaOpProveedor = respuesta.factura;
                //console.log("3)A.2) Factura OP proveedor ", this.facturaOpProveedor);
                //this.storageService.setInfoOne("facturaOpProveedor", this.facturaOpProveedor);
                this.$armarFacturasOp(op);
              }          
    };
    if(op.tarifaTipo.personalizada){ //tarifa personalizada
      /////////TARIFA PERSONALIZADA PROVEEDOR /////////////////////////
      /* this.dbFirebase.getMostRecentId<TarifaPersonalizadaCliente>("tarifasPersCliente","idTarifa","idCliente",op.cliente.idCliente) //buscamos la tarifa especial      
        .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
        .subscribe(data => {
          if(data){
              this.$ultTarifaPersCliente = data[0];
              //this.$ultTarifaPersCliente.secciones = this.$ultTarifaPersCliente.secciones || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
              ////////console.log("1)",this.$ultTarifaCliente);     
              if(this.$ultTarifaPersCliente?.secciones?.length > 0){
                //console.log("3)C.1) tarifa PERSONALIZADA Cliente: ", this.$ultTarifaPersCliente);
                this.facturaOpProveedor = this.facturacionChofer.$facturarOpPersChofer(op, this.$ultTarifaPersCliente, this.proveedorSeleccionado.idProveedor);
                this.operacion.valores.chofer.aPagar = this.facturaOpProveedor.valores.total;
                //console.log("3)C.2) Factura OP proveedor ", this.facturaOpProveedor);
                //this.storageService.setInfoOne("facturaOpProveedor", this.facturaOpProveedor);
                this.$armarFacturasOp(op);
              }   
          }          
        }); */
      //////console.log("3) tarifa PERSONALIZADA CLIENTE: ", this.$ultTarifaPersCliente);
        let tPers = this.storageService.loadInfo("tPersCliente");
        this.$ultTarifaPersCliente = tPers[0];
        if(this.$ultTarifaPersCliente?.secciones?.length > 0){
            //console.log("1)C.1) tarifa PERSONALIZADA CLIENTE",this.$ultTarifaPersCliente);  
            respuesta = this.facturacionChofer.$facturarOpPersChofer(op, this.$ultTarifaPersCliente, this.proveedorSeleccionado.idProveedor, this.$ultTarifaGralProveedor);
            this.operacion.valores.chofer = respuesta.op.valores.chofer;
            this.facturaOpProveedor = respuesta.factura;                        
            //console.log("1)C.2) Factura OP cliente ", this.facturaOpCliente);
            //this.storageService.setInfoOne("facturaOpCliente", this.facturaOpCliente);
            console.log("this.facturaOpProveedor: ", this.facturaOpProveedor);
            
            this.$armarFacturasOp(op);
        }   
        
    }    
    if(op.tarifaTipo.eventual){ //tarifa eventual
      //console.log("3)D.1) op eventual: ",op.tarifaEventual );
      respuesta = this.facturacionChofer.$facturarOpEveChofer(op, this.proveedorSeleccionado.idProveedor, this.$ultTarifaGralProveedor);
      this.operacion.valores.chofer = respuesta.op.valores.chofer;
      this.facturaOpProveedor = respuesta.factura;
      //console.log("3)D.2) Factura OP proveedor ", this.facturaOpProveedor);
      //this.storageService.setInfoOne("facturaOpProveedor", this.facturaOpProveedor);
      this.$armarFacturasOp(op);
    }
  
  }

  $armarFacturasOp(op:Operacion){
    //console.log("FINAL 1) Op: ", op);      
    //console.log("FIVAL 2) this.facturaOpCliente: ", this.facturaOpCliente, " this.facturaOpChofer: ", this.facturaOpChofer, " this.facturaOpProveedor: ", this.facturaOpProveedor);      
    this.i ++
    console.log("esta es la pasada n°: ", this.i);
  

    if(op.chofer.idProveedor === 0){
          if(this.facturaOpCliente !== null && this.facturaOpChofer !== null){
            op.valores.cliente.aCobrar = this.facturaOpCliente.valores.total;
            op.valores.chofer.aPagar = this.facturaOpChofer.valores.total;
            op.estado = {
              abierta : false,
              cerrada : true,
              facCliente: false,
              facChofer: false,
              facturada : false,
            };
            op.facturaCliente = this.facturaOpCliente.idFacturaOp;
            op.facturaChofer = this.facturaOpChofer.idFacturaOp;
            this.facturaOpCliente.contraParteMonto = this.facturaOpChofer.valores.total;
            this.facturaOpChofer.contraParteMonto = this.facturaOpCliente.valores.total;
            this.facturaOpCliente.contraParteId = this.facturaOpChofer.idFacturaOp;
            this.facturaOpChofer.contraParteId = this.facturaOpCliente.idFacturaOp;
            this.$guardarFacturas(op);
          }
    } else {
      if(this.facturaOpCliente !== null && this.facturaOpProveedor !== null){
        op.valores.cliente.aCobrar = this.facturaOpCliente.valores.total;
        op.valores.chofer.aPagar = this.facturaOpProveedor.valores.total;
        op.estado = {
          abierta : false,
          cerrada : true,
          facCliente: false,
          facChofer: false,
          facturada : false,
        };
        op.facturaCliente = this.facturaOpCliente.idFacturaOp;
        op.facturaChofer = this.facturaOpProveedor.idFacturaOp;
        this.facturaOpCliente.contraParteMonto = this.facturaOpProveedor.valores.total;
        this.facturaOpProveedor.contraParteMonto = this.facturaOpCliente.valores.total;
        this.facturaOpCliente.contraParteId = this.facturaOpProveedor.idFacturaOp;
        this.facturaOpProveedor.contraParteId = this.facturaOpCliente.idFacturaOp;
        this.$guardarFacturas(op);
      }
    }
  }

  $guardarFacturas(op: Operacion){
    console.log("1) Op: ", op);
    console.log("2) CLIENTE: ", this.facturaOpCliente);
    console.log("3) CHOFER: ", this.facturaOpChofer);    //
    console.log("4) PROVEEDOR: ", this.facturaOpProveedor);
    ////console.log("proveedores FINAL: ", this.$proveedores)
    
      if(op.chofer.idProveedor === 0){
      this.addItem("facturaOpCliente", this.facturaOpCliente);
      this.addItem("facturaOpChofer", this.facturaOpChofer);
    } else {
      this.addItem("facturaOpCliente", this.facturaOpCliente);
      this.addItem("facturaOpProveedor", this.facturaOpProveedor);
    }
    this.updateItem("operaciones", op); 
    //this.storageService.clearInfo("facturaOpCliente");
    //this.storageService.clearInfo("facturaOpChofer");
    //this.storageService.clearInfo("facturaOpProveedor");
    if(op.tarifaTipo.eventual){
      this.guardarTarifasEventuales(op);
    }
    this.facturaOpCliente = null;
    this.facturaOpProveedor = null;
    this.facturaOpChofer = null;
    this.finalizarFacturacion();
  }


  addItem(componente: string, item:any){
    //this.storageService.addItem(componente, item)
    this.dbFirebase.guardarFacturaOp(componente, item)
  }

  updateItem(componente: string, item: any){
    this.storageService.updateItem(componente, item, item.idOperacion, "CERRAR", "Cierre de Operación");   

  }

  guardarTarifasEventuales(op:Operacion){
    this.tarifaEventual = {
      
      idTarifa: new Date().getTime(),
      fecha: op.fecha,
      cliente: {
        concepto: op.tarifaEventual.cliente.concepto,
        valor:op.tarifaEventual.cliente.valor,
      },
      chofer: {
        concepto: op.tarifaEventual.chofer.concepto,
        valor:op.tarifaEventual.chofer.valor,
      },      
      tipo: {
        general: false,
        especial: false,
        eventual: true,
        personalizada: false,
      },
      idCliente: op.cliente.idCliente,
      idChofer: op.chofer.idChofer,
      idProveedor: op.chofer.idProveedor,
      idOperacion: op.idOperacion,
      km: op.km,
    }
    this.storageService.addItem("tarifasEventuales", this.tarifaEventual, this.tarifaEventual.idTarifa, "ALTA", `Alta de Tarifa Eventual ${this.tarifaEventual.idTarifa}, Cliente ${op.cliente.razonSocial}, Chofer ${op.chofer.apellido} ${op.chofer.nombre} `);
    


  }

  finalizarFacturacion(): void {
    // Completa el Subject para detener las suscripciones    
    this.destroy$.next();
    this.destroy$.complete();
    console.log("FIN DEL CICLO")
  }

}
