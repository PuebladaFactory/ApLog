import { Injectable } from '@angular/core';
import { FacturaChofer } from 'src/app/interfaces/factura-chofer';
import { Operacion } from 'src/app/interfaces/operacion';
import { TarifaChofer } from 'src/app/interfaces/tarifa-chofer';
import { StorageService } from '../../storage/storage.service';

@Injectable({
  providedIn: 'root'
})
export class LiquidacionChoferService {

  $tarifaChofer:any;
  liquidacionChofer!:FacturaChofer;
  total!:number;

  constructor(private storageService: StorageService) { }

  liquidacionOperacion(op: Operacion){
    console.log("liquidacionOperacion");
    
    this.buscarTarifa(op.chofer.idChofer, op);
    //this.calcularLiquidacion(op);
    this.crearFactura(op)
    return this.liquidacionChofer

  }

  buscarTarifa(idChofer: number, op: Operacion){
    let todasLasTarifas:any
    this.storageService.getByFieldValue("tarifasChofer", "idChofer", idChofer);
    this.storageService.historialTarifas$.subscribe(data =>{
      todasLasTarifas = data;
      todasLasTarifas.sort((x:TarifaChofer, y:TarifaChofer) => y.idTarifa - x.idTarifa);
      this.$tarifaChofer = todasLasTarifas[0]
      console.log("esta es liquidacionChoferService. tarifa del chofer: ", this.$tarifaChofer);      
      this.calcularLiquidacion(op);
    })
  }

  calcularLiquidacion(op:Operacion){
    let valor:number = this.$tarifaChofer.valorJornada;
    let adicional:number = this.calcularAdicional(op);
    console.log("tarifa base: ", valor, " adicional: ", adicional ); ;
    
    this.total = valor + adicional;

    console.log("esta es liquidacionChoferService. liquidacion del chofer: ", this.total);
    
  }

  calcularAdicional(op:Operacion){
    let adicional: number;
    switch(true){
      case (op.km !== null && op.km <= 100):{
        adicional = 0;
        return adicional;
      }
      case (op.km !== null && op.km <= 150):{
        adicional = this.$tarifaChofer.km.adicionalKm1;
        return adicional;
      }
      case (op.km !== null && op.km <= 200):{
        adicional = this.$tarifaChofer.km.adicionalKm1 + this.$tarifaChofer.km.adicionalKm2;
        return adicional;
      }
      case (op.km !== null && op.km <= 250):{
        adicional = this.$tarifaChofer.km.adicionalKm1 + this.$tarifaChofer.km.adicionalKm2 + this.$tarifaChofer.km.adicionalKm3;
        return adicional;
      }
      case (op.km !== null && op.km <= 300):{
        adicional = this.$tarifaChofer.km.adicionalKm1 + this.$tarifaChofer.km.adicionalKm2 + this.$tarifaChofer.km.adicionalKm3 + this.$tarifaChofer.km.adicionalKm4;
        return adicional;
      }
      case (op.km !== null && op.km <= 350):{
        adicional = this.$tarifaChofer.km.adicionalKm1 + this.$tarifaChofer.km.adicionalKm2 + this.$tarifaChofer.km.adicionalKm3 + this.$tarifaChofer.km.adicionalKm4 + this.$tarifaChofer.km.adicionalKm5;
        return adicional;
      }
      default:{ 
        return adicional=0;
      }
    }
  }

  crearFactura(op:Operacion){

    this.liquidacionChofer = {
      id: null,
      idFacturaChofer: new Date().getTime(),
      idOperacion: op.idOperacion,        
      idchofer: op.chofer.idChofer,
      importeTotal: this.total,
    }
    
    this.altaFacturaChofer()
  }

  altaFacturaChofer(){
    console.log("liquidacion-chofer. facturaChofer: ", this.liquidacionChofer);
    
    this.storageService.addItem("facturaChofer", this.liquidacionChofer);    
    
    //this.router.navigate(['/op/op-diarias'])
  }
}
