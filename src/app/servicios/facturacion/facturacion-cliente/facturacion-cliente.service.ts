import { Injectable } from '@angular/core';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { StorageService } from '../../storage/storage.service';
import { DbFirestoreService } from '../../database/db-firestore.service';
import { Operacion } from 'src/app/interfaces/operacion';
import { TarifaCliente } from 'src/app/interfaces/tarifa-cliente';

@Injectable({
  providedIn: 'root'
})
export class FacturacionClienteService {

  $tarifaCliente:any;
  facturacionChofer!:FacturaOpCliente;
  total!:number;
  $adicional!:number;
  ayudante:boolean = false;
  jornada!:number;

  constructor(private storageService: StorageService, private dbFirebase: DbFirestoreService,) { }

  liquidacionOperacion(op: Operacion){        
    this.buscarTarifa(op.cliente.idCliente, op);   

  }

  buscarTarifa(idCliente: number, op: Operacion){
    let todasLasTarifas:any
    this.storageService.getByFieldValue("tarifasCliente", "idCliente", idCliente);
    this.storageService.historialTarifasClientes$.subscribe(data =>{
      todasLasTarifas = data;
      todasLasTarifas.sort((x:TarifaCliente, y:TarifaCliente) => y.idTarifaCliente - x.idTarifaCliente);
      this.$tarifaCliente = todasLasTarifas[0]
      console.log("esta es facturacionClienteService. tarifa del cliente: ", this.$tarifaCliente);      
      this.calcularFacturacion(op);
    })
  }

  calcularFacturacion(op:Operacion){    
    this.$adicional = this.calcularAdicional(op);
    //console.log("tarifa base: ", this.$tarifaChofer.valorJornada, " adicional: ", this.$adicional ); ;
    
    this.jornada = this.calcularJornada(op)

    this.total = this.$tarifaCliente.valorJornada + this.$adicional;

    //console.log("esta es liquidacionChoferService. liquidacion del chofer: ", this.total);

    //this.crearFactura(op);    
  }

  calcularAdicional(op:Operacion){
    let adicional: number = 0;
    ///falta determinar como se agrega el ayudante a la operacion
    if (this.ayudante){
      adicional = this.$tarifaCliente.adicionales.acompaniante
    }
    
    switch(true){
      case (op.km !== null && op.km <= 80):{
        adicional = 0;
        console.log("adicional: ", adicional);
        return adicional;
      }
      case (op.km !== null && op.km <= 150):{
        adicional = this.$tarifaCliente.adicionales.adicionalKm.primerSector;
        console.log("adicional: ", adicional);
        return adicional;
      }
      case (op.km !== null && op.km > 150):{
        let kmExtras
        if (op.km !== null){  //no se pq toma el op.km como null
          kmExtras = Math.trunc((op.km - 150)/50);          
          console.log("fracciones extras: ", kmExtras);
          adicional = this.$tarifaCliente.adicionales.adicionalKm.primerSector + (this.$tarifaCliente.adicionales.adicionalKm.sectorSiguiente*(kmExtras + 1) );
          console.log("adicional: ", adicional);
          
          return adicional;
        }
        
        return adicional = 0;  //esto esta mal
        
      }
     /*  case (op.km !== null && op.km <= 250):{
        adicional = this.$tarifaCliente.km.adicionalKm1 + this.$tarifaCliente.km.adicionalKm2 + this.$tarifaCliente.km.adicionalKm3;
        return adicional;
      }
      case (op.km !== null && op.km <= 300):{
        adicional = this.$tarifaCliente.km.adicionalKm1 + this.$tarifaCliente.km.adicionalKm2 + this.$tarifaCliente.km.adicionalKm3 + this.$tarifaCliente.km.adicionalKm4;
        return adicional;
      }
      case (op.km !== null && op.km <= 350):{
        adicional = this.$tarifaCliente.km.adicionalKm1 + this.$tarifaCliente.km.adicionalKm2 + this.$tarifaCliente.km.adicionalKm3 + this.$tarifaCliente.km.adicionalKm4 + this.$tarifaCliente.km.adicionalKm5;
        return adicional;
      } */
      default:{ 
        return adicional=0;
      }
    }
  }
 /*  { id: 0, categoria: 'maxi', },
  { id: 1, categoria: 'mini', },
  { id: 2, categoria: 'liviano', },
  { id: 3, categoria: 'otro', }, */

  calcularJornada(op:Operacion):number {
    let jornada:number = 0;
    switch(op.chofer.vehiculo.categoria){
      case ("mini"):{
        return jornada = this.$tarifaCliente.cargasGenerales.utilitario
      } 
      case ("maxi"):{
        return jornada = this.$tarifaCliente.cargasGenerales.furgon
      } 
      case ("liviano"):{
        return jornada = this.$tarifaCliente.cargasGenerales.camionLiviano
      } 
      case ("chasis"):{
        return jornada = this.$tarifaCliente.cargasGenerales.chasis
      } 
      case ("balancin"):{
        return jornada = this.$tarifaCliente.cargasGenerales.balancin
      } 
      case ("semiRemolqueLocal"):{
        return jornada = this.$tarifaCliente.cargasGenerales.semiRemolqueLocal
      } 
      default:{ 
        return 0;
      }
    }
  }
/* 
  crearFactura(op:Operacion){

    this.liquidacionChofer = {
      id: null,
      idFacturaChofer: new Date().getTime(),
      idOperacion: op.idOperacion,        
      idchofer: op.chofer.idChofer,
      valorJornada: this.$tarifaChofer.valorJornada,
      adicional: this.$adicional,      
      total: this.total,
    }
    
    this.altaFacturaChofer()
  }

  altaFacturaChofer(){
    //console.log("liquidacion-chofer. facturaChofer: ", this.liquidacionChofer);    
    this.storageService.addItem("facturaOpChofer", this.liquidacionChofer);    
    //this.traerFacturas();
  }  */

  //METODO CREADO PARA COMPROBAR COMO TRAE LAS FACTURAS
  /* traerFacturas(){
    this.dbFirebase.getAll("facturaOpChofer").subscribe(data =>{
      console.log("estas son las facturas: ", data);
      
    })
  } */
}
