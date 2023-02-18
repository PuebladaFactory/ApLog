import { Injectable } from '@angular/core';
import { Operacion } from 'src/app/interfaces/operacion';
import { TarifaChofer } from 'src/app/interfaces/tarifa-chofer';
import { StorageService } from '../../storage/storage.service';

@Injectable({
  providedIn: 'root'
})
export class LiquidacionChoferService {

  $tarifaChofer:any;
  liquidacionChofer:any;

  constructor(private storageService: StorageService) { }

  liquidacionOperacion(op: Operacion){
    this.buscarTarifa(op.chofer.idChofer);
    this.calcularLiquidacion(op);
    return this.liquidacionChofer

  }

  buscarTarifa(idChofer: number){
    let todasLasTarifas:any
    this.storageService.getByFieldValue("tarifasChofer", "idChofer", idChofer);
    this.storageService.historialTarifas$.subscribe(data =>{
      todasLasTarifas = data;
      todasLasTarifas.sort((x:TarifaChofer, y:TarifaChofer) => y.idTarifa - x.idTarifa);
      this.$tarifaChofer = todasLasTarifas[0]
      //console.log(this.$tarifaChofer);      
    })
  }

  calcularLiquidacion(op:Operacion){
    let valor:number = this.$tarifaChofer.valorJornada;
    let adicional:number = this.calcularAdicional(op);
    console.log("tarifa base: ", valor, " adicional: ", adicional ); ;
    
    this.liquidacionChofer = valor + adicional;
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
        adicional = this.$tarifaChofer.km.adicionalKm2;
        return adicional;
      }
      case (op.km !== null && op.km <= 250):{
        adicional = this.$tarifaChofer.km.adicionalKm3;
        return adicional;
      }
      case (op.km !== null && op.km <= 300):{
        adicional = this.$tarifaChofer.km.adicionalKm4;
        return adicional;
      }
      case (op.km !== null && op.km <= 350):{
        adicional = this.$tarifaChofer.km.adicionalKm5;
        return adicional;
      }
      default:{ 
        return adicional=0;
      }
    }
  }
}
