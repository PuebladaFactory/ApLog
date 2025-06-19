import { Injectable } from '@angular/core';
import { FacturacionClienteService } from '../facturacion-cliente/facturacion-cliente.service';
import { StorageService } from '../../storage/storage.service';
import { DbFirestoreService } from '../../database/db-firestore.service';

import { Operacion } from 'src/app/interfaces/operacion';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';

import { CategoriaTarifa, TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { Seccion, TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';

@Injectable({
  providedIn: 'root'
})
export class FacturacionChoferService {
  
  total:number = 0;
  $adicional!:number;
  $tarifas!: any;
  
  choferOp!: Chofer;
  $choferes!: Chofer[];
  $proveedores!: Proveedor[];
  proveedorOp!: Proveedor;
  montoValorJornada!: number;
  facturaOpChofer!: FacturaOp;
  tarifaBase!: number;
  acompaniante!: number;
  kmValor!: number;


  constructor(private storageService: StorageService, private dbFirebase: DbFirestoreService) { }

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

  $facturarOpChofer(op:Operacion, tarifa: TarifaGralCliente){
    let respuesta : {
      op: Operacion,
      factura: FacturaOp,
      resultado: boolean,
      msj: string,
    }
    ////console.log("1)Chofer Serv:  op: ", op, " tarifa: ", tarifa);
    let vehiculo = op.chofer.vehiculo.filter(vehiculo => vehiculo.dominio === op.patenteChofer);
    ////console.log("1c) vehiculo: ", vehiculo);    

    if(op.multiplicadorCliente === 0){
      this.tarifaBase = 0;  
      op.valores.chofer.tarifaBase = 0;  
      //////console.log("tarifa base: " ,this.tarifaBase);
      this.acompaniante = 0 ;
      op.valores.chofer.acompValor = 0
      //////console.log("acompañante valor: ", this.acompaniante);
      this.kmValor = 0;
      op.valores.chofer.kmAdicional = 0;
      op.valores.chofer.aPagar = 0;
    } else {
      this.tarifaBase = this.$calcularCG(tarifa, vehiculo[0])*op.multiplicadorChofer;
      op.valores.chofer.tarifaBase = this.tarifaBase;  
      ////////console.log("tarifa base: " ,this.tarifaBase);
      this.acompaniante = op.acompaniante ? tarifa.adicionales.acompaniante : 0 ;
      op.valores.chofer.acompValor = this.acompaniante;
      ////////console.log("acompañante valor: ", this.acompaniante);
      this.kmValor = this.$calcularKm(op, tarifa, vehiculo[0]);
      op.valores.chofer.kmAdicional = this.kmValor;
      op.valores.chofer.aPagar = this.tarifaBase + this.acompaniante + this.kmValor;    
    }

    
    ////////console.log("km valor: ", this.kmValor);
    this.$crearFacturaOpChofer(op, tarifa.idTarifa,0);
    respuesta = {
      op: op,
      factura: this.facturaOpChofer,
      resultado:true,
      msj:"",
    }
    ////////console.log("Factura OP cliente ", this.facturaOpCliente)
    return respuesta;
  }

  $facturarOpPersChofer(op: Operacion, tarifa: TarifaPersonalizadaCliente, idProveedor: number, tGeneral:TarifaGralCliente){
    let respuesta : {
      op: Operacion,
      factura: FacturaOp,
      resultado: boolean,
      msj: string,
    }
    this.tarifaBase = this.$calcularCGPersonalizada(tarifa, op)*op.multiplicadorChofer;
    op.valores.chofer.tarifaBase = this.tarifaBase;
    this.acompaniante = op.acompaniante ? tGeneral.adicionales.acompaniante : 0 ;
    op.valores.chofer.acompValor = this.acompaniante;
    this.kmValor = 0 ; 
    //////console.log("tarifa base: " ,this.tarifaBase);
    this.$crearFacturaOpChofer(op, tarifa.idTarifa, idProveedor);
    respuesta = {
      op: op,
      factura: this.facturaOpChofer,
      resultado:true,
      msj:""
    }
    ////////console.log("Factura OP cliente ", this.facturaOpCliente)
    return respuesta;
    ////////console.log("Factura OP cliente ", this.facturaOpCliente)
    //return this.facturaOpChofer
  }

  $facturarOpEveChofer(op: Operacion, idProveedor: number, tGeneral:TarifaGralCliente){
    let respuesta : {
      op: Operacion,
      factura: FacturaOp,
      resultado: boolean,
      msj: string,
    }
    this.tarifaBase = op.tarifaEventual.chofer.valor*op.multiplicadorChofer;
    op.valores.chofer.tarifaBase = this.tarifaBase;
    this.acompaniante = op.acompaniante ? tGeneral.adicionales.acompaniante : 0 ;
    op.valores.chofer.acompValor = this.acompaniante;
    this.kmValor = 0;
    this.$crearFacturaOpChofer(op, 0,idProveedor);
    respuesta = {
      op: op,
      factura: this.facturaOpChofer,
      resultado:true,
      msj:"",
    }
    ////////console.log("Factura OP cliente ", this.facturaOpCliente)
    return respuesta;
    //return this.facturaOpChofer

  }

  $calcularCG(tarifa: TarifaGralCliente, vehiculo: Vehiculo){

    let catCg = tarifa.cargasGenerales.filter((cat:CategoriaTarifa) =>{
      return cat.orden === vehiculo.categoria.catOrden;
    });
    ////console.log("Chofer Service: catCg: ", catCg);
    
    return catCg[0].valor
}

$calcularCGPersonalizada(tarifa: TarifaPersonalizadaCliente, op: Operacion){
  
  let seccionPers: Seccion [] = tarifa.secciones.filter((seccion: Seccion)=>{
    return seccion.orden === Number(op.tarifaPersonalizada.seccion);
  });
  let categoria: any [] = seccionPers[0].categorias.filter((cat:any) => {
    return cat.orden === Number(op.tarifaPersonalizada.categoria);
  })
  return categoria[0].aPagar;
}

$calcularKm(op: Operacion, tarifa: TarifaGralCliente, vehiculo:Vehiculo){
  let catCg = tarifa.cargasGenerales.filter((cat: CategoriaTarifa) => {
    return cat.orden === vehiculo.categoria.catOrden;
  });
  ////////console.log("catCg: ", catCg);
  
  let montoTotal = 0;
  
  // Verifica si los kilómetros recorridos son menores o iguales al primer sector
  if (op.km < tarifa.adicionales.KmDistancia.primerSector) {
    return montoTotal; // No se cobra adicional
  }
  
  // Si supera el primer sector, se cobra el valor del primer sector
  montoTotal = catCg[0].adicionalKm.primerSector;
  
  // Calcula cuántos kilómetros adicionales quedan luego del primer sector
  let kmRestantes = op.km - tarifa.adicionales.KmDistancia.primerSector;
  
  // Calcula cuántos sectores adicionales completos se recorren
  let sectoresAdicionales = Math.floor(kmRestantes / tarifa.adicionales.KmDistancia.sectoresSiguientes);
  
  // Suma el costo de los sectores adicionales
  montoTotal += sectoresAdicionales * catCg[0].adicionalKm.sectoresSiguientes;
  
  return montoTotal;
}


$crearFacturaOpChofer(op:Operacion, idTarifa: number, idProveedor: number){

  this.facturaOpChofer = {
    
    idFacturaOp: new Date().getTime(),
    idOperacion: op.idOperacion,
    idCliente: op.cliente.idCliente,
    idChofer: op.chofer.idChofer,
    idProveedor: idProveedor,
    idTarifa: idTarifa,
    fecha: op.fecha,      
    valores:{
      tarifaBase: this.tarifaBase,
      acompaniante: this.acompaniante,
      kmMonto: this.kmValor,
      total: this.tarifaBase + this.acompaniante + this.kmValor,
    },
    km:op.km,
    liquidacion: false,
    contraParteMonto:0,
    contraParteId:0,
    tarifaTipo: {
      general: op.tarifaTipo.eventual? false : op.tarifaTipo.personalizada ? false : op.tarifaTipo.especial ? op.chofer.tarifaTipo.general : op.chofer.tarifaTipo.general,
      especial: op.tarifaTipo.eventual? false : op.tarifaTipo.personalizada ? false : op.chofer.tarifaTipo.especial,
      eventual: op.tarifaTipo.eventual,
      personalizada: op.tarifaTipo.personalizada
    },
    observaciones: op.observaciones,
    hojaRuta: op.hojaRuta,
    patente: op.patenteChofer,
    proforma: false,
    contraParteProforma: false,
  }  
}

$getTarifaTipoChofer(op:Operacion){
  if (op.chofer.tarifaTipo?.especial){
    return true
  } else{
    return false
  }
}

$facturarOpProveedor(op:Operacion, tarifa: TarifaGralCliente, idProveedor: number){
    let respuesta : {
      op: Operacion,
      factura: FacturaOp,
      resultado: boolean,
      msj: string,
    }
  ////console.log("1)Proveedor Serv:  op: ", op, " tarifa: ", tarifa);
  let vehiculo = op.chofer.vehiculo.filter(vehiculo => vehiculo.dominio === op.patenteChofer)
  ////////console.log("1c) vehiculo: ", vehiculo); 
  
  if(op.multiplicadorCliente === 0){
    this.tarifaBase = 0;  
    op.valores.chofer.tarifaBase = 0;  
    //////console.log("tarifa base: " ,this.tarifaBase);
    this.acompaniante = 0 ;
    op.valores.chofer.acompValor = 0
    //////console.log("acompañante valor: ", this.acompaniante);
    this.kmValor = 0;
    op.valores.chofer.kmAdicional = 0;
    op.valores.chofer.aPagar = 0;
  } else {
    this.tarifaBase = this.$calcularCG(tarifa, vehiculo[0])*op.multiplicadorChofer;
    op.valores.chofer.tarifaBase = this.tarifaBase;  
    ////////console.log("tarifa base: " ,this.tarifaBase);
    this.acompaniante = op.acompaniante ? tarifa.adicionales.acompaniante : 0 ;
    op.valores.chofer.acompValor = this.acompaniante;  
    ////////console.log("acompañante valor: ", this.acompaniante);
    this.kmValor = this.$calcularKm(op, tarifa, vehiculo[0]);
    op.valores.chofer.kmAdicional = this.kmValor;  
    op.valores.chofer.aPagar = this.tarifaBase + this.acompaniante + this.kmValor;    
    ////////console.log("km valor: ", this.kmValor);
  }

  
  this.$crearFacturaOpChofer(op, tarifa.idTarifa, idProveedor);
  respuesta = {
    op: op,
    factura: this.facturaOpChofer,
    resultado: true,
    msj:"",
  }
  ////////console.log("Factura OP cliente ", this.facturaOpCliente)
  return respuesta;
}

  
  
}
