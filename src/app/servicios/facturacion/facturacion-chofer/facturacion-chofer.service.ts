import { Injectable } from '@angular/core';
import { FacturacionClienteService } from '../facturacion-cliente/facturacion-cliente.service';
import { StorageService } from '../../storage/storage.service';
import { DbFirestoreService } from '../../database/db-firestore.service';
import { TarifaChofer } from 'src/app/interfaces/tarifa-chofer';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';
import { Operacion } from 'src/app/interfaces/operacion';
import { Chofer } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { FacturaOpProveedor } from 'src/app/interfaces/factura-op-proveedor';

@Injectable({
  providedIn: 'root'
})
export class FacturacionChoferService {

  $tarifaChofer!:TarifaChofer;
  facturaChofer!:FacturaOpChofer;
  facturaProveedor!:FacturaOpProveedor;
  total!:number;
  $adicional!:number;
  $tarifas!: any;
  ultimaTarifa!: TarifaChofer;
  choferOp!: Chofer;
  $choferes!: Chofer[];
  $proveedores!: Proveedor[];
  proveedorOp!: Proveedor;

  constructor(private storageService: StorageService) { }

  choferes(){
    this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;
    });
  }

 /*  proveedores(){
    this.storageService.proveedores$.subscribe(data => {
      this.$proveedores = data;
    });
  } */


  facturarOpChofer(op: Operacion)  :FacturaOpChofer{        
    this.choferes();
    //this.proveedores();
    //this.facturarOpChofer(op);
    this.buscarChofer(op);    
    return this.facturaChofer
  }
/* 
  facturarOpProveedor(op: Operacion)  :FacturaOpProveedor{        
    this.proveedores();
    //this.proveedores();
    //this.facturarOpChofer(op);
    this.buscarProveedor(op);    
    return this.facturaProveedor;
  } */

  /* facturarOpChofer(op:Operacion){
    this.buscarChofer(op);    
  } */
  
  buscarChofer(op: Operacion){
    let choferSeleccionado: any;
    choferSeleccionado = this.$choferes.filter(function (chofer:any){
      return chofer.idChofer === op.chofer.idChofer
    })
    //console.log("choferSeleccionado: ", choferSeleccionado);
    this.choferOp = choferSeleccionado[0];
    //console.log("choferSeleccionado: ", this.choferOp);
    //this.filtrarChofer(op);
    this.buscarTarifaChofer(op);   
  }

 /*  filtrarChofer(op: Operacion){
    if(this.choferOp.proveedor === "monotributista"){
      console.log("monotributista");
      this.buscarTarifaChofer(op);   
    } else{
      console.log("proveedor");
      this.buscarProveedor(op);
    }
  } */

  buscarTarifaChofer(op: Operacion){    
    this.storageService.historialTarifas$.subscribe(data => {
      this.$tarifas = data.filter((tarifa: { idChofer: number; }) => tarifa.idChofer === this.choferOp.idChofer);

      console.log("Todas: ",this.$tarifas);

      // Encontrar la tarifa con el idTarifa más elevado
      this.ultimaTarifa = this.$tarifas.reduce((tarifaMaxima: { idTarifa: number; }, tarifaActual: { idTarifa: number; }) => {
        return tarifaActual.idTarifa > tarifaMaxima.idTarifa ? tarifaActual : tarifaMaxima;
      });

      // Ahora, ultimaTarifa contiene la tarifa con el idTarifa más elevado
      console.log("ultima: ", this.ultimaTarifa);
      this.calcularLiquidacion(op);
    });  
  }

 /*  buscarProveedor(op:Operacion){
    let proveedor: any;
    proveedor = this.$proveedores.filter(function (proveedor:any){
      return proveedor.razonSocial === op.chofer.proveedor
    })
    //console.log("choferSeleccionado: ", choferSeleccionado);
    this.proveedorOp = proveedor[0];
    console.log("proveedorOp: ", this.proveedorOp);
    this.buscarTarifaProveedor(op);
  }

  buscarTarifaProveedor(op: Operacion){    
    this.storageService.historialTarifasProveedores$.subscribe(data => {
      console.log("esto pasa por aca?");
      console.log("data: ", data);
      
      this.$tarifas = data.filter((tarifa: { idChofer: number; }) => tarifa.idChofer === this.proveedorOp.idProveedor);

      console.log("Todas: ",this.$tarifas);

      // Encontrar la tarifa con el idTarifa más elevado
      this.ultimaTarifa = this.$tarifas.reduce((tarifaMaxima: { idTarifa: number; }, tarifaActual: { idTarifa: number; }) => {
        return tarifaActual.idTarifa > tarifaMaxima.idTarifa ? tarifaActual : tarifaMaxima;
      });

      // Ahora, ultimaTarifa contiene la tarifa con el idTarifa más elevado
      console.log("ultima: ", this.ultimaTarifa);
      this.calcularLiquidacion(op);
    });  
  } */

  calcularLiquidacion(op:Operacion){    
    this.$tarifaChofer = this.ultimaTarifa
    console.log("esta es la tarifa a facturar: ", this.$tarifaChofer);
    
    this.$adicional = this.calcularAdicional(op, this.ultimaTarifa);
    //console.log("tarifa base: ", this.$tarifaChofer.valorJornada, " adicional: ", this.$adicional ); ;
    
    this.total = this.$tarifaChofer.valorJornada + this.$adicional;

    //console.log("esta es facturaChoferService. liquidacion del chofer: ", this.total);

    this.crearFacturaChofer(op);    
  }

  calcularAdicional(op:Operacion, tarifa: TarifaChofer): number {
    let acompaniante: any;
    let adicional: any;
    
    if(op.acompaniante){
      acompaniante = tarifa.acompaniante;
    }else{
      acompaniante = 0;
    }
    
    switch(true){
      case (op.km !== null && op.km <= 100):{
        adicional = 0;
        return adicional + acompaniante;
      }
      case (op.km !== null && op.km > 100 && op.km <= 150):{        
        adicional = this.$tarifaChofer.km.adicionalKm1;
        console.log("adicional + acompañante: ", acompaniante+adicional);
        return adicional + acompaniante;
      }
      case (op.km !== null && op.km > 150 && op.km <= 200):{
        adicional = this.$tarifaChofer.km.adicionalKm1 + this.$tarifaChofer.km.adicionalKm2;
        return adicional + acompaniante;
      }
      case (op.km !== null && op.km > 200 && op.km <= 250):{
        adicional = this.$tarifaChofer.km.adicionalKm1 + this.$tarifaChofer.km.adicionalKm2 + this.$tarifaChofer.km.adicionalKm3;
        return adicional + acompaniante;
      }
      case (op.km !== null && op.km > 250 && op.km <= 300):{
        adicional = this.$tarifaChofer.km.adicionalKm1 + this.$tarifaChofer.km.adicionalKm2 + this.$tarifaChofer.km.adicionalKm3 + this.$tarifaChofer.km.adicionalKm4;
        return adicional + acompaniante;
      }
      case (op.km !== null && op.km > 300):{
        adicional = this.$tarifaChofer.km.adicionalKm1 + this.$tarifaChofer.km.adicionalKm2 + this.$tarifaChofer.km.adicionalKm3 + this.$tarifaChofer.km.adicionalKm4 + this.$tarifaChofer.km.adicionalKm5;
        return adicional + acompaniante;
      }
      default:{ 
        return adicional=0;
      }
    }
  }

  crearFacturaChofer(op:Operacion){

    this.facturaChofer = {
      id: null,
      idFacturaChofer: new Date().getTime(),
      operacion: op,        
      fecha: new Date().toISOString().split('T')[0],  
      idChofer: op.chofer.idChofer,
      valorJornada: this.$tarifaChofer.valorJornada,
      adicional: this.$adicional,      
      total: this.total,
    }
    
    console.log("factura chofer FINAL: ", this.facturaChofer);
    
    //this.altaFacturaChofer()
  }
  
}
