import { Injectable } from '@angular/core';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';
import { Operacion } from 'src/app/interfaces/operacion';

import { FacturacionClienteService } from '../facturacion-cliente/facturacion-cliente.service';
import { StorageService } from '../../storage/storage.service';
import { TarifaChofer } from 'src/app/interfaces/tarifa-chofer';
import { DbFirestoreService } from '../../database/db-firestore.service';

@Injectable({
  providedIn: 'root'
})
export class FacturacionOpService {  

  $tarifaChofer!:TarifaChofer;
  facturaChofer!:FacturaOpChofer;
  total!:number;
  $adicional!:number;
  $tarifas!: any;
  ultimaTarifa!: TarifaChofer;

  constructor( private facturacionCliente: FacturacionClienteService, private storageService: StorageService, private dbFirebase: DbFirestoreService) { }

/*   facturacionOp(op:Operacion){
    //console.log("facturacionOp");    
    this.facturaChofer.liquidacionOperacion(op);
    console.log("ya hizo la liquidacion del Chofer");
    
   // this.facturacionCliente.liquidacionOperacion(op);
   // console.log("ya hizo la liquidacion del Cliente");   
    
  } */

  facturarOperacion(op: Operacion)  :FacturaOpChofer{        
    this.facturarOpChofer(op);
    return this.facturaChofer
    
    
    //this.storageService.addItem("facturaOpChofer", op);    
  }

  facturarOpChofer(op:Operacion){
    this.buscarTarifa(op.chofer.idChofer, op);   
  }

  buscarTarifa(idChofer: number, op: Operacion){    
    this.storageService.historialTarifas$.subscribe(data => {
      this.$tarifas = data.filter((tarifa: { idChofer: number; }) => tarifa.idChofer === idChofer);

      console.log("Todas: ",this.$tarifas);

      // Encontrar la tarifa con el idTarifa más elevado
      this.ultimaTarifa = this.$tarifas.reduce((tarifaMaxima: { idTarifa: number; }, tarifaActual: { idTarifa: number; }) => {
        return tarifaActual.idTarifa > tarifaMaxima.idTarifa ? tarifaActual : tarifaMaxima;
      });

      // Ahora, tarifaMasElevada contiene la tarifa con el idTarifa más elevado
      console.log("ultima: ", this.ultimaTarifa);
      this.calcularLiquidacion(op);
    });  
  }

    
    
    
    /* this.storageService.getByFieldValue("tarifasChofer", "idChofer", idChofer);
    this.storageService.historialTarifas$.subscribe(data =>{
      todasLasTarifas = data;
      //todasLasTarifas.sort((x:TarifaChofer, y:TarifaChofer) => y.idTarifa - x.idTarifa);
      this.$tarifaChofer = todasLasTarifas[0]
      console.log("esta es facturaChoferService. tarifa del chofer: ", this.$tarifaChofer);      
      this.calcularLiquidacion(op);
    }) */
  //}

  calcularLiquidacion(op:Operacion){    
    this.$tarifaChofer = this.ultimaTarifa
    console.log("esta es la tarifa a facturar: ", this.$tarifaChofer);
    
    this.$adicional = this.calcularAdicional(op);
    //console.log("tarifa base: ", this.$tarifaChofer.valorJornada, " adicional: ", this.$adicional ); ;
    
    this.total = this.$tarifaChofer.valorJornada + this.$adicional;

    //console.log("esta es facturaChoferService. liquidacion del chofer: ", this.total);

    this.crearFactura(op);    
  }

  calcularAdicional(op:Operacion){
    let adicional: number;
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
    }
  }

  crearFactura(op:Operacion){

    this.facturaChofer = {
      id: null,
      idFacturaChofer: new Date().getTime(),
      idOperacion: op.idOperacion,   
      fecha: new Date().toLocaleDateString(),     
      idChofer: op.chofer.idChofer,
      valorJornada: this.$tarifaChofer.valorJornada,
      adicional: this.$adicional,      
      total: this.total,
    }
    //console.log(this.facturaChofer);
    
    //this.altaFacturaChofer()
  }

  altaFacturaChofer() {
    console.log("liquidacion-chofer. facturaChofer: ", this.facturaChofer);    
     //this.storageService.addItem("facturaOpChofer", this.facturaChofer);     
    //this.addItem("facturaOpChofer", this.facturaChofer)
    //this.traerFacturas();
   
  }

  //METODO CREADO PARA COMPROBAR COMO TRAE LAS FACTURAS
  /*  traerFacturas(){
    this.dbFirebase.getAll("facturaOpChofer").subscribe(data =>{
      console.log("estas son las facturas: ", data);
      
    })
  }  */
  addItem(componente: string, item: any): void {

    //item.fechaOp = new Date()
    console.log(" storage add item ", componente, item,)


    this.dbFirebase.create(componente, item)
      // .then((data) => console.log(data))
      // .then(() => this.ngOnInit())
      .catch((e) => console.log(e.message));
  }
}
