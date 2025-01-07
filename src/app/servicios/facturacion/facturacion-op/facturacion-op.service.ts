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
import { take } from 'rxjs';
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
  facturaOpCliente!: FacturaOp;
  facturaOpChofer!: FacturaOp;
  facturaOpProveedor!: FacturaOp;
  $proveedores!: Proveedor[];
  clienteFacOp!: FacturaOp [];
  choferFacOp!: FacturaOp [];
  ProveedorFacOp!: FacturaOp [];
  operacion!: Operacion;
  proveedorSeleccionado!: Proveedor;
  tarifaEventual! : TarifaEventual;  


  constructor( private facturacionCliente: FacturacionClienteService, private facturacionChofer: FacturacionChoferService, private storageService: StorageService, private dbFirebase: DbFirestoreService) { }

/*   facturacionOp(op:Operacion){
    ////////console.log()("facturacionOp");    
    this.facturaChofer.liquidacionOperacion(op);
    //////console.log()("ya hizo la liquidacion del Chofer");
    
   // this.facturacionCliente.liquidacionOperacion(op);
   // //////console.log()("ya hizo la liquidacion del Cliente");   
    
  } */

  facturarOperacion(op: Operacion){        
    ////console.log("op: ", op);
    
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
          console.log("0) Proveedor SELECCIONADO: ",this.proveedorSeleccionado);    
        }
      }      
    })
    /////////TARIFA GENERAL CLIENTE /////////////////////////
    this.storageService.tarifasGralCliente$.subscribe(data =>{
      //////////console.log("data: ", data);                
      if(data){
        this.$ultTarifaGralCliente = data; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
        //this.$ultTarifaGralCliente.cargasGenerales = this.$ultTarifaGralCliente.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
        console.log("1) ult tarifa GRAL CLIENTE: ",this.$ultTarifaGralCliente);              
      }
      
      
    });

  /*    /////////TARIFA ESPECIAL CLIENTE /////////////////////////
    this.storageService.ultTarifaEspCliente$   
      .subscribe(data =>{            
      this.$ultTarifaEspCliente = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
      this.$ultTarifaEspCliente.cargasGenerales = this.$ultTarifaEspCliente.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío     
    }); */

  /*   /////////TARIFA PERSONALIZADA CLIENTE /////////////////////////
    this.storageService.ultTarifaPersCliente$.subscribe(data => {
      this.$ultTarifaPersCliente = data;
      this.$ultTarifaPersCliente.secciones = this.$ultTarifaPersCliente.secciones || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
      //////console.log("1)",this.$ultTarifaCliente);        
    }); */

    /////////TARIFA GENERAL CHOFER /////////////////////////
    this.storageService.tarifasGralChofer$.subscribe(data =>{
      //////////console.log("data: ", data);                
      if(data){
        this.$ultTarifaGralChofer = data; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
        //this.$ultTarifaGralChofer.cargasGenerales = this.$ultTarifaGralChofer.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
        console.log("2) ult tarifa GRAL CHOFER: ",this.$ultTarifaGralChofer);              
      }      
    });
   
   /*  /////////TARIFA ESPECIAL CHOFER /////////////////////////
    this.storageService.ultTarifaEspChofer$
      //.pipe(take(2)) // Asegúrate de que la suscripción se complete después de la primera emisión
      .subscribe(data =>{
      //////////console.log("2c) data: ", data);                
      this.$ultTarifaEspChofer = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
      this.$ultTarifaEspChofer.cargasGenerales = this.$ultTarifaEspChofer.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
      //////console.log("4) ult tarifa ESP CHOFER: ",this.ultTarifaEspChofer);           
    }) */
    //////////////// TARIFA GENERAL PROVEEDORES ///////////////////
    this.storageService.tarifasGralProveedor$.subscribe(data =>{
      if(data){
        //////console.log("data", data);        
        this.$ultTarifaGralProveedor = data;
        //this.$ultTarifaGralProveedor.cargasGenerales = this.$ultTarifaGralProveedor.cargasGenerales || [];
        console.log("5) ult tarifa GRAL PROVEEDOR: ", this.$ultTarifaGralProveedor);      
      }
      
    })

    /////////FACTURA OP CLIENTE /////////////////////////
    this.storageService.facturaOpCliente$
    .pipe(take(1))
    .subscribe(data =>{
        if(data){
            //console.log("data: ", data);                
            this.facturaOpCliente = data; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos            
            //console.log("facturaOpCliente: ", this.facturaOpCliente);                            
        }      
    });

     /////////FACTURA OP PROVEEDOR /////////////////////////
     this.storageService.facturaOpChofer$
     .pipe(take(1))
     .subscribe(data =>{
       if(data){
         //////////console.log("data: ", data);                
         this.facturaOpProveedor = data;
         //console.log("facturaOpProveedor: ", this.facturaOpProveedor);          
       }
     });
     /////////FACTURA OP CHOFER /////////////////////////
     this.storageService.facturaOpChofer$
     .pipe(take(1))
     .subscribe(data =>{
       if(data){
         //////////console.log("data: ", data);                
         this.facturaOpChofer = data;
         //console.log("facturaOpChofer: ", this.facturaOpChofer); 
       }
     });         

     
   /*  ////////////////TARIFA ESPECIAL PROVEEDORES//////////////////
    this.storageService.ultTarifaEspProveedor$
    //.pipe(take(2)) // Asegúrate de que la suscripción se complete después de la primera emisión
    .subscribe(data =>{
    //////////console.log("2c) data: ", data);                
    this.$ultTarifaEspProveedor = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
    this.$ultTarifaEspProveedor.cargasGenerales = this.$ultTarifaEspProveedor.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
    //////console.log("6) ult tarifa ESP PROVEEDOR: ",this.ultTarifaEspProveedor);           
    }); */
    this.operacion = op;

    this.$facturarOpCliente(op);
    
    //this.storageService.addItem("facturaOpChofer", op);    
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

      //this.facturaOpCliente = this.facturacionCliente.$facturarOpCliente(op, this.$ultTarifaGralCliente);
      console.log("1)A.2)Factura OP cliente ", this.facturaOpCliente);      
      this.storageService.setInfoOne("facturaOpCliente", this.facturaOpCliente);
      if(op.chofer.idProveedor === 0){
        this.$facturarOpChofer(op);   
      } else {      
        this.$facturarOpProveedor(op);        
      }
    }
    if(op.tarifaTipo.especial){  //tarifa especial cliente
      if(op.cliente.tarifaTipo.especial){
        this.storageService.getMostRecentItemId("tarifasEspCliente","idTarifa","idCliente",op.cliente.idCliente)
        //this.storageService.getElemntByIdLimit("tarifasEspCliente","idCliente","idTarifa",op.cliente.idCliente,"ultTarifaEspCliente");  
            /////////TARIFA ESPECIAL CLIENTE /////////////////////////
        this.storageService.tarifasEspCliente$   
          .subscribe(data =>{ 
            if(data){
                this.$ultTarifaEspCliente = data; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
                //this.$ultTarifaEspCliente.cargasGenerales = this.$ultTarifaEspCliente.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío     
                ////console.log("2) tarifa ESPECIAL CLIENTE: ", this.$ultTarifaEspCliente);
                if(this.$ultTarifaEspCliente?.cargasGenerales?.length > 0){
                  console.log("1)B.1) tarifa ESPECIAL CLIENTE: ", this.$ultTarifaEspCliente);
                  respuesta = this.facturacionCliente.$facturarOpCliente(op, this.$ultTarifaEspCliente);
                  this.operacion.valores.cliente = respuesta.op.valores.cliente;
                  this.facturaOpCliente = respuesta.factura;
                  console.log("1)B.2) Factura OP cliente ", this.facturaOpCliente);
                  this.storageService.setInfoOne("facturaOpCliente", this.facturaOpCliente);
                  if(op.chofer.idProveedor === 0){
                    this.$facturarOpChofer(op);   
                  } else {      
                    this.$facturarOpProveedor(op);        
                  }
                }
            }
        });
            
      } else {
        console.log("1)A.1) tarifa GENERAL CLIENTE: ", this.$ultTarifaGralCliente);     
        //this.facturaOpCliente = this.facturacionCliente.$facturarOpCliente(op, this.$ultTarifaGralCliente);
        respuesta = this.facturacionCliente.$facturarOpCliente(op, this.$ultTarifaGralCliente);
        this.operacion.valores.cliente = respuesta.op.valores.cliente;
        this.facturaOpCliente = respuesta.factura;
        console.log("1)A.2) Factura OP cliente ", this.facturaOpCliente);       
        this.storageService.setInfoOne("facturaOpCliente", this.facturaOpCliente);
        if(op.chofer.idProveedor === 0){
          this.$facturarOpChofer(op);   
        } else {      
          this.$facturarOpProveedor(op);        
        }
      }
    }
    if(op.tarifaTipo.personalizada){ //tarifa personalizada
      this.storageService.getMostRecentItemId("tarifasPersCliente", "idTarifa","idCliente", op.cliente.idCliente)
      //this.storageService.getElemntByIdLimit("tarifasPersCliente", "idCliente", "idTarifa", op.cliente.idCliente, "ultTarifaPersCliente" )
        /////////TARIFA PERSONALIZADA CLIENTE /////////////////////////
        this.storageService.tarifasPersCliente$.subscribe(data => {
          if(data){
              this.$ultTarifaPersCliente = data;
              //this.$ultTarifaPersCliente.secciones = this.$ultTarifaPersCliente.secciones || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
              //console.log("1)C.1) tarifa PERSONALIZADA CLIENTE",this.$ultTarifaPersCliente);     
              if(this.$ultTarifaPersCliente?.secciones?.length > 0){
                console.log("1)C.1) tarifa PERSONALIZADA CLIENTE",this.$ultTarifaPersCliente);     
                this.facturaOpCliente = this.facturacionCliente.$facturarOpPersCliente(op, this.$ultTarifaPersCliente);
                this.operacion.valores.cliente.aCobrar = this.facturaOpCliente.valores.total;
                console.log("1)C.2) Factura OP cliente ", this.facturaOpCliente);
                this.storageService.setInfoOne("facturaOpCliente", this.facturaOpCliente);
                if(op.chofer.idProveedor === 0){
                  this.$facturarOpChofer(op);   
                } else {      
                  this.$facturarOpProveedor(op);        
                }
              }   
          }          
        });
      ////console.log("3) tarifa PERSONALIZADA CLIENTE: ", this.$ultTarifaPersCliente);
    }
    if(op.tarifaTipo.eventual){ //tarifa personalizada
      console.log("1)D.1)op eventual", op.tarifaEventual);
      this.facturaOpCliente = this.facturacionCliente.$facturarOpEveCliente(op);
      this.operacion.valores.cliente.aCobrar = this.facturaOpCliente.valores.total
      console.log("1)D.2) Factura OP cliente ", this.facturaOpCliente);
      this.storageService.setInfoOne("facturaOpCliente", this.facturaOpCliente);
      if(op.chofer.idProveedor === 0){
        this.$facturarOpChofer(op);   
      } else {      
        this.$facturarOpProveedor(op);        
      }
    }
   
  
  }

  $facturarOpChofer(op: Operacion){
    ////console.log("hola");
    let respuesta : {
      op: Operacion,
      factura: FacturaOp
    }
    
    if(op.tarifaTipo.general){ //tarifa general
      console.log("2)A.1) tarifa GENERAL CHOFER: ", this.$ultTarifaGralChofer);
      respuesta = this.facturacionChofer.$facturarOpChofer(op, this.$ultTarifaGralChofer);
      //console.log("respuesta: ", respuesta);      
      this.operacion.valores.chofer.aPagar = respuesta.factura.valores.total;
      this.facturaOpChofer = respuesta.factura;
      //this.facturaOpChofer = this.facturacionChofer.$facturarOpChofer(op, this.$ultTarifaGralChofer);
      console.log("2)A.2)Factura OP chofer ", this.facturaOpChofer)
      this.storageService.setInfoOne("facturaOpChofer", this.facturaOpChofer);
      this.$armarFacturasOp(op);
    }
    if(op.tarifaTipo.especial){  //tarifa especial chofer
      if(op.chofer.tarifaTipo.especial){
        //this.storageService.getElemntByIdLimit("tarifasEspChofer","idChofer","idTarifa",op.chofer.idChofer,"ultTarifaEspChofer");
        this.storageService.getMostRecentItemId("tarifasEspChofer","idTarifa","idChofer",op.chofer.idChofer);  
            /////////TARIFA ESPECIAL CHOFER /////////////////////////
        this.storageService.tarifasEspChofer$   
          .subscribe(data =>{    
            if(data){
              this.$ultTarifaEspChofer = data; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
              //this.$ultTarifaEspChofer.cargasGenerales = this.$ultTarifaEspChofer.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío     
              ////console.log("2) tarifa ESPECIAL CHOFER: ", this.$ultTarifaEspChofer);
              if(this.$ultTarifaEspChofer?.cargasGenerales?.length > 0){
                console.log("2)B.1) tarifa ESPECIAL CHOFER: ", this.$ultTarifaEspChofer);
                //this.facturaOpChofer = this.facturacionChofer.$facturarOpChofer(op, this.$ultTarifaEspChofer);
                //si la tarifa especial del chofer es            
                if(this.$ultTarifaEspChofer?.idCliente === 0 || this.$ultTarifaEspChofer?.idCliente === op.cliente.idCliente){
                    respuesta = this.facturacionChofer.$facturarOpChofer(op, this.$ultTarifaEspChofer);
                    this.operacion.valores.chofer.aPagar = respuesta.factura.valores.total;
                    this.facturaOpChofer = respuesta.factura;
                    console.log("2)B.2)Factura OP chofer ", this.facturaOpChofer);
                    this.storageService.setInfoOne("facturaOpChofer", this.facturaOpChofer);
                    this.$armarFacturasOp(op);
                } else {
                  ////este caso es donde la tarifa especial no aplica                  
                  console.log("2)A.1) tarifa GENERAL CHOFER: ", this.$ultTarifaGralCliente);
                  respuesta = this.facturacionChofer.$facturarOpChofer(op, this.$ultTarifaGralChofer);
                  //console.log("respuesta: ", respuesta);      
                  this.operacion.valores.chofer.aPagar = respuesta.factura.valores.total;
                  //aca le cambio el tipo de tarifa pq usa una tarifa especial no aplica
                  respuesta.factura.tarifaTipo = {general: true, especial: false, eventual:false, personalizada: false}
                  this.facturaOpChofer = respuesta.factura;
                  //this.facturaOpChofer = this.facturacionChofer.$facturarOpChofer(op, this.$ultTarifaGralChofer);
                  console.log("2)A.2)Factura OP chofer ", this.facturaOpChofer)
                  this.storageService.setInfoOne("facturaOpChofer", this.facturaOpChofer);
                  this.$armarFacturasOp(op);
                }
              } 
            }
        });
            
      } else {
        console.log("2)A.1) tarifa GENERAL CLIENTE: ", this.$ultTarifaGralCliente);
        //this.facturaOpChofer = this.facturacionChofer.$facturarOpChofer(op, this.$ultTarifaGralChofer);
        respuesta = this.facturacionChofer.$facturarOpChofer(op, this.$ultTarifaGralChofer);
        this.operacion.valores.chofer.aPagar = respuesta.factura.valores.total;
        this.facturaOpChofer = respuesta.factura;
        console.log("2)A.2)Factura OP chofer ", this.facturaOpChofer)
        this.storageService.setInfoOne("facturaOpChofer", this.facturaOpChofer);
        this.$armarFacturasOp(op);
      }
    };
    if(op.tarifaTipo.personalizada){ //tarifa personalizada
      //this.storageService.getElemntByIdLimit("tarifasPersCliente", "idCliente", "idTarifa", op.cliente.idCliente, "ultTarifaPersCliente" )
        /////////TARIFA PERSONALIZADA CLIENTE /////////////////////////
        this.storageService.tarifasPersCliente$.subscribe(data => {
          if(data){
              this.$ultTarifaPersCliente = data;
              //this.$ultTarifaPersCliente.secciones = this.$ultTarifaPersCliente.secciones || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
              //////console.log("1)",this.$ultTarifaCliente);     
              if(this.$ultTarifaPersCliente?.secciones.length > 0){
                console.log("2)C.1) tarifa PERSONALIZADA CLIENTE",this.$ultTarifaPersCliente);     //se utiliza la tarifa del cliente pq ahi estan todos los valores
                this.facturaOpChofer = this.facturacionChofer.$facturarOpPersChofer(op, this.$ultTarifaPersCliente, 0);            
                this.operacion.valores.chofer.aPagar = this.facturaOpChofer.valores.total
                console.log("2)C.2) Factura OP chofer ", this.facturaOpChofer);
                this.storageService.setInfoOne("facturaOpChofer", this.facturaOpChofer);
                this.$armarFacturasOp(op);
              }   
          }
          
        });
      ////console.log("3) tarifa PERSONALIZADA CLIENTE: ", this.$ultTarifaPersCliente);
    }    
    if(op.tarifaTipo.eventual){ //tarifa eventual
      console.log("2)D.1) op eventual", op.tarifaEventual);
      this.facturaOpChofer = this.facturacionChofer.$facturarOpEveChofer(op, 0);      
      this.operacion.valores.chofer.aPagar = this.facturaOpChofer.valores.total
      console.log("2)D.2) Factura OP chofer ", this.facturaOpChofer);
      this.storageService.setInfoOne("facturaOpChofer", this.facturaOpChofer);
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
      console.log("3)A.1.1) PROVEEDOR SELECCIONADO: ", this.proveedorSeleccionado);
      
      respuesta = this.facturacionChofer.$facturarOpProveedor(op, this.$ultTarifaGralProveedor, this.proveedorSeleccionado.idProveedor);
      this.operacion.valores.chofer = respuesta.op.valores.chofer;
      this.facturaOpProveedor = respuesta.factura;
      //this.facturaOpProveedor = this.facturacionChofer.$facturarOpProveedor(op, this.$ultTarifaGralProveedor);
      console.log("3)A.2) Factura OP proveedor ", this.facturaOpProveedor);
      this.storageService.setInfoOne("facturaOpProveedor", this.facturaOpProveedor);
      this.$armarFacturasOp(op);
    }
    if(op.tarifaTipo.especial){  //tarifa especial proveedor       

          if (this.proveedorSeleccionado.tarifaTipo.especial){
            this.storageService.getMostRecentItemId("tarifasEspProveedor","idTarifa","idProveedor",this.proveedorSeleccionado.idProveedor);
            //this.storageService.getElemntByIdLimit("tarifasEspProveedor","idProveedor","idTarifa",this.proveedorSeleccionado.idProveedor,"ultTarifaEspProveedor");
            this.storageService.tarifasEspProveedor$
              //.pipe(take(2)) // Asegúrate de que la suscripción se complete después de la primera emisión
              .subscribe(data =>{
                if(data){
                  //////////console.log("2c) data: ", data);                
                  this.$ultTarifaEspProveedor = data; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
                  //this.$ultTarifaEspProveedor.cargasGenerales = this.$ultTarifaEspProveedor.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
                  //////console.log("6) ult tarifa ESP PROVEEDOR: ",this.ultTarifaEspProveedor);           
                  if(this.$ultTarifaEspProveedor?.cargasGenerales?.length > 0) {
                    
                    console.log("3)B.1) tarifa ESPECIAL PROVEEDOR: ", this.$ultTarifaEspProveedor);
                    if(this.$ultTarifaEspProveedor?.idCliente === 0 || this.$ultTarifaEspProveedor?.idCliente === op.cliente.idCliente){
                        //his.facturaOpProveedor = this.facturacionChofer.$facturarOpProveedor(op, this.$ultTarifaEspProveedor);
                        respuesta = this.facturacionChofer.$facturarOpProveedor(op, this.$ultTarifaEspProveedor, this.proveedorSeleccionado.idProveedor);
                        this.operacion.valores.chofer = respuesta.op.valores.chofer;
                        this.facturaOpProveedor = respuesta.factura;
                        console.log("3)B.2) Factura OP proveedor ", this.facturaOpProveedor);
                        this.storageService.setInfoOne("facturaOpProveedor", this.facturaOpProveedor);
                        this.$armarFacturasOp(op);
                    }else{
                        ////este caso es donde la tarifa especial no aplica
                        //this.facturaOpProveedor = this.facturacionChofer.$facturarOpProveedor(op, this.$ultTarifaGralProveedor);
                        console.log("3)A.1) tarifa GENERAL Proveedor: ", this.$ultTarifaGralProveedor);
                        respuesta = this.facturacionChofer.$facturarOpProveedor(op, this.$ultTarifaGralProveedor, this.proveedorSeleccionado.idProveedor);                  
                        //aca le cambio el tipo de tarifa pq usa una tarifa especial no aplica
                        respuesta.factura.tarifaTipo = {general: true, especial: false, eventual:false, personalizada: false}
                        this.operacion.valores.chofer = respuesta.op.valores.chofer;
                        this.facturaOpProveedor = respuesta.factura;
                        console.log("3)A.2) Factura OP proveedor ", this.facturaOpProveedor);
                        this.storageService.setInfoOne("facturaOpProveedor", this.facturaOpProveedor);
                        this.$armarFacturasOp(op);
                    }                
                  }
                }              
              });  
              } else {            
                //this.facturaOpProveedor = this.facturacionChofer.$facturarOpProveedor(op, this.$ultTarifaGralProveedor);
                console.log("3)A.1) tarifa GENERAL Proveedor: ", this.$ultTarifaGralProveedor);
                respuesta = this.facturacionChofer.$facturarOpProveedor(op, this.$ultTarifaGralProveedor, this.proveedorSeleccionado.idProveedor);
                this.operacion.valores.chofer = respuesta.op.valores.chofer;
                this.facturaOpProveedor = respuesta.factura;
                console.log("3)A.2) Factura OP proveedor ", this.facturaOpProveedor);
                this.storageService.setInfoOne("facturaOpProveedor", this.facturaOpProveedor);
                this.$armarFacturasOp(op);
              }          
    };
    if(op.tarifaTipo.personalizada){ //tarifa personalizada
      //this.storageService.getElemntByIdLimit("tarifasPersCliente", "idCliente", "idTarifa", op.cliente.idCliente, "ultTarifaPersCliente" )
        /////////TARIFA PERSONALIZADA CLIENTE /////////////////////////
        this.storageService.tarifasPersCliente$.subscribe(data => {
          if(data){
              this.$ultTarifaPersCliente = data;
              //this.$ultTarifaPersCliente.secciones = this.$ultTarifaPersCliente.secciones || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
              //////console.log("1)",this.$ultTarifaCliente);     
              if(this.$ultTarifaPersCliente?.secciones?.length > 0){
                console.log("3)C.1) tarifa PERSONALIZADA Cliente: ", this.$ultTarifaPersCliente);
                this.facturaOpProveedor = this.facturacionChofer.$facturarOpPersChofer(op, this.$ultTarifaPersCliente, this.proveedorSeleccionado.idProveedor);
                this.operacion.valores.chofer.aPagar = this.facturaOpProveedor.valores.total;
                console.log("3)C.2) Factura OP proveedor ", this.facturaOpProveedor);
                this.storageService.setInfoOne("facturaOpProveedor", this.facturaOpProveedor);
                this.$armarFacturasOp(op);
              }   
          }          
        });
      ////console.log("3) tarifa PERSONALIZADA CLIENTE: ", this.$ultTarifaPersCliente);
    }    
    if(op.tarifaTipo.eventual){ //tarifa eventual
      console.log("3)D.1) op eventual: ",op.tarifaEventual );
      this.facturaOpProveedor = this.facturacionChofer.$facturarOpEveChofer(op, this.proveedorSeleccionado.idProveedor);
      this.operacion.valores.chofer.aPagar = this.facturaOpProveedor.valores.total;
      console.log("3)D.2) Factura OP proveedor ", this.facturaOpProveedor);
      this.storageService.setInfoOne("facturaOpProveedor", this.facturaOpProveedor);
      this.$armarFacturasOp(op);
    }
  
  }

  $armarFacturasOp(op:Operacion){
    console.log("FINAL 1) Op: ", op);      
    console.log("FIVAL 2) this.facturaOpCliente: ", this.facturaOpCliente, " this.facturaOpChofer: ", this.facturaOpChofer, " this.facturaOpProveedor: ", this.facturaOpProveedor);      
    if(op.chofer.idProveedor === 0){
      
          op.valores.cliente.aCobrar = this.facturaOpCliente.valores.total;
          op.valores.chofer.aPagar = this.facturaOpChofer.valores.total;
          op.estado = {
            abierta : false,
            cerrada : true,
            facturada : false,
          };
          op.facturaCliente = this.facturaOpCliente.idFacturaOp;
          op.facturaChofer = this.facturaOpChofer.idFacturaOp;
          this.facturaOpCliente.contraParteMonto = this.facturaOpChofer.valores.total;
          this.facturaOpChofer.contraParteMonto = this.facturaOpCliente.valores.total;
          this.facturaOpCliente.contraParteId = this.facturaOpChofer.idFacturaOp;
          this.facturaOpChofer.contraParteId = this.facturaOpCliente.idFacturaOp;
          this.$guardarFacturas(op);
     
    } else {
      
          op.valores.cliente.aCobrar = this.facturaOpCliente.valores.total;
          op.valores.chofer.aPagar = this.facturaOpProveedor.valores.total;
          op.estado = {
            abierta : false,
            cerrada : true,
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

  $guardarFacturas(op: Operacion){
    //console.log("1) Op: ", op);
    //console.log("2) CLIENTE: ", this.facturaOpCliente);
    //console.log("3) CHOFER: ", this.facturaOpChofer);    //
    //console.log("4) PROVEEDOR: ", this.facturaOpProveedor);
    //console.log("proveedores FINAL: ", this.$proveedores)
    
     if(op.chofer.idProveedor === 0){
      this.addItem("facturaOpCliente", this.facturaOpCliente);
      this.addItem("facturaOpChofer", this.facturaOpChofer);
    } else {
      this.addItem("facturaOpCliente", this.facturaOpCliente);
      this.addItem("facturaOpProveedor", this.facturaOpProveedor);
    }
    this.updateItem("operaciones", op);
    this.storageService.clearInfo("facturaOpCliente");
    this.storageService.clearInfo("facturaOpChofer");
    this.storageService.clearInfo("facturaOpProveedor");
    if(op.tarifaTipo.eventual){
      this.guardarTarifasEventuales(op);
    }

  }

  addItem(componente: string, item:any){
    this.storageService.addItem(componente, item)
  }

  updateItem(componente: string, item: any){
    this.storageService.updateItem(componente, item);
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

    this.addItem("tarifasEventuales", this.tarifaEventual);


  }

  facturarOpChofer(op:Operacion){
    /* this.buscarTarifa(op.chofer.idChofer, op);    */
  }

  buscarTarifa(idChofer: number, op: Operacion){    
    /* this.storageService.historialTarifas$.subscribe(data => {
      this.$tarifas = data.filter((tarifa: { idChofer: number; }) => tarifa.idChofer === idChofer);

      //////console.log()("Todas: ",this.$tarifas);

      // Encontrar la tarifa con el idTarifa más elevado
      this.ultimaTarifa = this.$tarifas.reduce((tarifaMaxima: { idTarifa: number; }, tarifaActual: { idTarifa: number; }) => {
        return tarifaActual.idTarifa > tarifaMaxima.idTarifa ? tarifaActual : tarifaMaxima;
      });

      // Ahora, tarifaMasElevada contiene la tarifa con el idTarifa más elevado
      //////console.log()("ultima: ", this.ultimaTarifa);
      this.calcularLiquidacion(op);
    });   */
  }

    
    
    
    /* this.storageService.getByFieldValue("tarifasChofer", "idChofer", idChofer);
    this.storageService.historialTarifas$.subscribe(data =>{
      todasLasTarifas = data;
      //todasLasTarifas.sort((x:TarifaChofer, y:TarifaChofer) => y.idTarifa - x.idTarifa);
      this.$tarifaChofer = todasLasTarifas[0]
      //////console.log()("esta es facturaChoferService. tarifa del chofer: ", this.$tarifaChofer);      
      this.calcularLiquidacion(op);
    }) */
  //}

  calcularLiquidacion(op:Operacion){    
  /*   this.$tarifaChofer = this.ultimaTarifa
    //////console.log()("esta es la tarifa a facturar: ", this.$tarifaChofer);
    
    this.$adicional = this.calcularAdicional(op);
    ////////console.log()("tarifa base: ", this.$tarifaChofer.valorJornada, " adicional: ", this.$adicional ); ;
    
    this.total = this.$tarifaChofer.valorJornada + this.$adicional;

    ////////console.log()("esta es facturaChoferService. liquidacion del chofer: ", this.total);

    this.crearFactura(op);     */
  }

  calcularAdicional(op:Operacion){
   /*  let adicional: number;
    switch(true){
      case (op.km !== null && op.km <= 100):{
        adicional = 0;
        return adicional;
      }
      case (op.km !== null && op.km > 100 && op.km <= 150):{
        adicional = this.$tarifaChofer.km.adicionalKm1;
        return adicional;
      }
      case (op.km !== null && op.km > 150 && op.km <= 200):{
        adicional = this.$tarifaChofer.km.adicionalKm1 + this.$tarifaChofer.km.adicionalKm2;
        return adicional;
      }
      case (op.km !== null && op.km > 200 && op.km <= 250):{
        adicional = this.$tarifaChofer.km.adicionalKm1 + this.$tarifaChofer.km.adicionalKm2 + this.$tarifaChofer.km.adicionalKm3;
        return adicional;
      }
      case (op.km !== null && op.km > 250 && op.km <= 300):{
        adicional = this.$tarifaChofer.km.adicionalKm1 + this.$tarifaChofer.km.adicionalKm2 + this.$tarifaChofer.km.adicionalKm3 + this.$tarifaChofer.km.adicionalKm4;
        return adicional;
      }
      case (op.km !== null && op.km > 300):{
        adicional = this.$tarifaChofer.km.adicionalKm1 + this.$tarifaChofer.km.adicionalKm2 + this.$tarifaChofer.km.adicionalKm3 + this.$tarifaChofer.km.adicionalKm4 + this.$tarifaChofer.km.adicionalKm5;
        return adicional;
      }
      default:{ 
        return adicional=0;
      }
    } */
  }

  crearFactura(op:Operacion){

   /*  this.facturaChofer = {
      id: null,
      idFacturaChofer: new Date().getTime(),
      idOperacion: op.idOperacion,   
      fecha: new Date().toLocaleDateString(),     
      idChofer: op.chofer.idChofer,
      valorJornada: this.$tarifaChofer.valorJornada,
      adicional: this.$adicional,      
      total: this.total,
    } */
    ////////console.log()(this.facturaChofer);
    
    //this.altaFacturaChofer()
  }

  altaFacturaChofer() {
    ////////console.log()("liquidacion-chofer. facturaChofer: ", this.facturaChofer);    
     //this.storageService.addItem("facturaOpChofer", this.facturaChofer);     
    //this.addItem("facturaOpChofer", this.facturaChofer)
    //this.traerFacturas();
   
  }

  //METODO CREADO PARA COMPROBAR COMO TRAE LAS FACTURAS
  /*  traerFacturas(){
    this.dbFirebase.getAll("facturaOpChofer").subscribe(data =>{
      //////console.log()("estas son las facturas: ", data);
      
    })
  }  */
  /* addItem(componente: string, item: any): void {

    //item.fechaOp = new Date()
    //////console.log()(" storage add item ", componente, item,)


    this.dbFirebase.create(componente, item)
      // .then((data) => //////console.log()(data))
      // .then(() => this.ngOnInit())
      .catch((e) => //////console.log()(e.message));
  } */
}
