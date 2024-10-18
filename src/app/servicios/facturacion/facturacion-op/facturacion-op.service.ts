import { Injectable } from '@angular/core';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';
import { Operacion } from 'src/app/interfaces/operacion';

import { FacturacionClienteService } from '../facturacion-cliente/facturacion-cliente.service';
import { StorageService } from '../../storage/storage.service';
import { TarifaChofer } from 'src/app/interfaces/tarifa-chofer';
import { DbFirestoreService } from '../../database/db-firestore.service';
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { FacturaOp } from 'src/app/interfaces/factura-op';

@Injectable({
  providedIn: 'root'
})
export class FacturacionOpService {  

  
  //facturaChofer!:FacturaOpChofer;
      
  $ultTarifaGralCliente!: TarifaGralCliente;
  $ultTarifaEspCliente!: TarifaGralCliente;
  $ultTarifaPersCliente!: TarifaGralCliente;
  $ultTarifaGralChofer!: TarifaGralCliente;
  $ultTarifaEspChofer!: TarifaGralCliente;
  $ultTarifaGralProveedor!: TarifaGralCliente;
  $ultTarifaEspProveedor!: TarifaGralCliente;
  tarifaOpCliente!: TarifaGralCliente;
  facturaOpCliente!: FacturaOp;
  facturaOpChofer!: FacturaOp;
  facturaOpProveedor!: FacturaOp;

  constructor( private facturacionCliente: FacturacionClienteService, private storageService: StorageService, private dbFirebase: DbFirestoreService) { }

/*   facturacionOp(op:Operacion){
    ////console.log()("facturacionOp");    
    this.facturaChofer.liquidacionOperacion(op);
    //console.log()("ya hizo la liquidacion del Chofer");
    
   // this.facturacionCliente.liquidacionOperacion(op);
   // //console.log()("ya hizo la liquidacion del Cliente");   
    
  } */

  facturarOperacion(op: Operacion){        
    console.log("op: ", op);
    /////////TARIFA GENERAL CLIENTE /////////////////////////
    this.storageService.ultTarifaGralCliente$.subscribe(data =>{
      //////console.log("data: ", data);                
      this.$ultTarifaGralCliente = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
      this.$ultTarifaGralCliente.cargasGenerales = this.$ultTarifaGralCliente.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
      //console.log("1) ult tarifa GRAL CLIENTE: ",this.ultTarifaGralCliente);              
    });

     /////////TARIFA ESPECIAL CLIENTE /////////////////////////
    this.storageService.ultTarifaEspCliente$   
      .subscribe(data =>{            
      this.$ultTarifaEspCliente = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
      this.$ultTarifaEspCliente.cargasGenerales = this.$ultTarifaEspCliente.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío     
    });

    /////////TARIFA PERSONALIZADA CLIENTE /////////////////////////
    this.storageService.ultTarifaPersCliente$.subscribe(data => {
      this.$ultTarifaPersCliente = data;
      this.$ultTarifaPersCliente.cargasGenerales = this.$ultTarifaPersCliente.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
      //console.log("1)",this.$ultTarifaCliente);        
    });

    /////////TARIFA GENERAL CHOFER /////////////////////////
    this.storageService.ultTarifaGralChofer$.subscribe(data =>{
      //////console.log("data: ", data);                
      this.$ultTarifaGralChofer = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
      this.$ultTarifaGralChofer.cargasGenerales = this.$ultTarifaGralChofer.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
      //console.log("2) ult tarifa GRAL CHOFER: ",this.ultTarifaGralChofer);              
    });
   
    /////////TARIFA ESPECIAL CHOFER /////////////////////////
    this.storageService.ultTarifaEspChofer$
      //.pipe(take(2)) // Asegúrate de que la suscripción se complete después de la primera emisión
      .subscribe(data =>{
      //////console.log("2c) data: ", data);                
      this.$ultTarifaEspChofer = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
      this.$ultTarifaEspChofer.cargasGenerales = this.$ultTarifaEspChofer.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
      //console.log("4) ult tarifa ESP CHOFER: ",this.ultTarifaEspChofer);           
    })
    //////////////// TARIFA GENERAL PROVEEDORES ///////////////////
    this.storageService.ultTarifaGralProveedor$.subscribe(data =>{
      //console.log("data", data);        
      this.$ultTarifaGralProveedor = data || {};
      this.$ultTarifaGralProveedor.cargasGenerales = this.$ultTarifaGralProveedor.cargasGenerales || [];
      //console.log("5) ult tarifa GRAL PROVEEDOR: ", this.ultTarifaGralProveedor);      
    })
    ////////////////TARIFA ESPECIAL PROVEEDORES//////////////////
    this.storageService.ultTarifaEspProveedor$
    //.pipe(take(2)) // Asegúrate de que la suscripción se complete después de la primera emisión
    .subscribe(data =>{
    //////console.log("2c) data: ", data);                
    this.$ultTarifaEspProveedor = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
    this.$ultTarifaEspProveedor.cargasGenerales = this.$ultTarifaEspProveedor.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
    //console.log("6) ult tarifa ESP PROVEEDOR: ",this.ultTarifaEspProveedor);           
    });
    this.facturarCliente(op)
    
    
    
    
    //this.storageService.addItem("facturaOpChofer", op);    
  }

  facturarCliente(op: Operacion){

    if(op.tarifaTipo.general){
      //console.log("1) tarifa GENERAL CLIENTE: ", this.$ultTarifaGralCliente);
      this.facturacionCliente.$facturarOpCliente(op, this.$ultTarifaGralCliente)
    }
    if(op.tarifaTipo.especial){
      if(op.cliente.tarifaTipo.especial){
        console.log("2) tarifa ESPECIAL CLIENTE: ", this.$ultTarifaEspCliente);
      } else {
        console.log("1) tarifa GENERAL CLIENTE: ", this.$ultTarifaGralCliente);
      }
    }
    if(op.tarifaTipo.personalizada){
      console.log("3) tarifa PERSONALIZADA CLIENTE: ", this.$ultTarifaPersCliente);
    }
    if(op.tarifaTipo.eventual){
      console.log("op eventual");
      
    }
    
      
      
      
      //console.log("4) tarifa GENERAL CHOFER: ", this.$ultTarifaGralChofer);
      //console.log("5) tarifa ESPECIAL CHOFER: ", this.$ultTarifaEspChofer);
      //console.log("6) tarifa GENERAL PROVEEDOR: ", this.$ultTarifaGralProveedor);
      //console.log("7) tarifa ESPECIAL PROVEEDOR: ", this.$ultTarifaEspProveedor);

      
    

  }

  facturarOpChofer(op:Operacion){
    /* this.buscarTarifa(op.chofer.idChofer, op);    */
  }

  buscarTarifa(idChofer: number, op: Operacion){    
    /* this.storageService.historialTarifas$.subscribe(data => {
      this.$tarifas = data.filter((tarifa: { idChofer: number; }) => tarifa.idChofer === idChofer);

      //console.log()("Todas: ",this.$tarifas);

      // Encontrar la tarifa con el idTarifa más elevado
      this.ultimaTarifa = this.$tarifas.reduce((tarifaMaxima: { idTarifa: number; }, tarifaActual: { idTarifa: number; }) => {
        return tarifaActual.idTarifa > tarifaMaxima.idTarifa ? tarifaActual : tarifaMaxima;
      });

      // Ahora, tarifaMasElevada contiene la tarifa con el idTarifa más elevado
      //console.log()("ultima: ", this.ultimaTarifa);
      this.calcularLiquidacion(op);
    });   */
  }

    
    
    
    /* this.storageService.getByFieldValue("tarifasChofer", "idChofer", idChofer);
    this.storageService.historialTarifas$.subscribe(data =>{
      todasLasTarifas = data;
      //todasLasTarifas.sort((x:TarifaChofer, y:TarifaChofer) => y.idTarifa - x.idTarifa);
      this.$tarifaChofer = todasLasTarifas[0]
      //console.log()("esta es facturaChoferService. tarifa del chofer: ", this.$tarifaChofer);      
      this.calcularLiquidacion(op);
    }) */
  //}

  calcularLiquidacion(op:Operacion){    
  /*   this.$tarifaChofer = this.ultimaTarifa
    //console.log()("esta es la tarifa a facturar: ", this.$tarifaChofer);
    
    this.$adicional = this.calcularAdicional(op);
    ////console.log()("tarifa base: ", this.$tarifaChofer.valorJornada, " adicional: ", this.$adicional ); ;
    
    this.total = this.$tarifaChofer.valorJornada + this.$adicional;

    ////console.log()("esta es facturaChoferService. liquidacion del chofer: ", this.total);

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
    ////console.log()(this.facturaChofer);
    
    //this.altaFacturaChofer()
  }

  altaFacturaChofer() {
    ////console.log()("liquidacion-chofer. facturaChofer: ", this.facturaChofer);    
     //this.storageService.addItem("facturaOpChofer", this.facturaChofer);     
    //this.addItem("facturaOpChofer", this.facturaChofer)
    //this.traerFacturas();
   
  }

  //METODO CREADO PARA COMPROBAR COMO TRAE LAS FACTURAS
  /*  traerFacturas(){
    this.dbFirebase.getAll("facturaOpChofer").subscribe(data =>{
      //console.log()("estas son las facturas: ", data);
      
    })
  }  */
  addItem(componente: string, item: any): void {

    /* //item.fechaOp = new Date()
    //console.log()(" storage add item ", componente, item,)


    this.dbFirebase.create(componente, item)
      // .then((data) => //console.log()(data))
      // .then(() => this.ngOnInit())
      .catch((e) => //console.log()(e.message)); */
  }
}
