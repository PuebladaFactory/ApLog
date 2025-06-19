import { Injectable } from '@angular/core';

import { StorageService } from '../../storage/storage.service';
import { DbFirestoreService } from '../../database/db-firestore.service';
import { Operacion } from 'src/app/interfaces/operacion';

import { Cliente } from 'src/app/interfaces/cliente';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { parseActionCodeURL } from 'firebase/auth';
import { FacturaCliente } from 'src/app/interfaces/factura-cliente';
import { TarifaGralCliente, CategoriaTarifa } from 'src/app/interfaces/tarifa-gral-cliente';
import { Vehiculo } from 'src/app/interfaces/chofer';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { Seccion, TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';

@Injectable({
  providedIn: 'root'
})
export class FacturacionClienteService {

  $clientes!: Cliente[];
  
  clienteOp!: Cliente;
  
  categoriaMonto!: number;
  acompanianteMonto!: number;
  adicionalKmMonto!: number;
  
  total!:number;
  tarifaGralCliente! : TarifaGralCliente;
  facturaOpCliente!: FacturaOp;
  tarifaBase!: number;
  acompaniante!: number;
  kmValor!: number;

  constructor(private storageService: StorageService ) { }

  clientes(){
    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;
    });
  }

  tarifaGral(){
    this.storageService.ultTarifaGralCliente$.subscribe(data =>{
      //////console.log("data: ", data);                
      this.tarifaGralCliente = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
      this.tarifaGralCliente.cargasGenerales = this.tarifaGralCliente.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
      //////console.log("1) ult tarifa GRAL: ",this.ultTarifa);              
    })      
  }

 /*  facturarOperacion(op: Operacion)  :FacturaOpCliente{        
    //this.clientes();    
    this.facturarOpCliente(op);
    return this.facturaCliente
  } */

  $facturarOpCliente(op: Operacion, tarifa: TarifaGralCliente){
    let respuesta : {
      op: Operacion,
      factura: FacturaOp,
      resultado: boolean,
      msj: string,
    }

    //console.log("$facturarOpCliente) op: ", op, " tarifa: ", tarifa);
    let vehiculo = op.chofer.vehiculo.filter(vehiculo => vehiculo.dominio === op.patenteChofer)
    ////console.log("1c) vehiculo: ", vehiculo);    

    if(op.multiplicadorCliente === 0){
      this.tarifaBase = 0;  
      op.valores.cliente.tarifaBase = 0;  
      ////console.log("tarifa base: " ,this.tarifaBase);
      this.acompaniante = 0 ;
      op.valores.cliente.acompValor = 0
      ////console.log("acompañante valor: ", this.acompaniante);
      this.kmValor = 0;
      op.valores.cliente.kmAdicional = 0;
      op.valores.cliente.aCobrar = 0;
    } else {
      this.tarifaBase = this.$calcularCG(tarifa, vehiculo[0])*op.multiplicadorCliente;  
      op.valores.cliente.tarifaBase = this.tarifaBase;  
      ////console.log("tarifa base: " ,this.tarifaBase);
      this.acompaniante = op.acompaniante ? tarifa.adicionales.acompaniante : 0 ;
      op.valores.cliente.acompValor = this.acompaniante
      ////console.log("acompañante valor: ", this.acompaniante);
      this.kmValor = this.$calcularKm(op, tarifa, vehiculo[0]);
      op.valores.cliente.kmAdicional = this.kmValor;
      op.valores.cliente.aCobrar = this.tarifaBase + this.acompaniante + this.kmValor;    
    }

    
    ////console.log("km valor: ", this.kmValor);
    this.$crearFacturaOpCliente(op, tarifa.idTarifa);
    respuesta = {
      op: op,
      factura: this.facturaOpCliente,
      resultado: true,
      msj:"",
    }
    ////console.log("Factura OP cliente ", this.facturaOpCliente)
    return respuesta
  }

  $facturarOpPersCliente(op: Operacion, tarifa: TarifaPersonalizadaCliente, tGeneral: TarifaGralCliente){
    //console.log("!!!!!!!!!!!)op: ", op, " y tarifa: ",tarifa);
    let respuesta : {
      op: Operacion,
      factura: FacturaOp,
      resultado: boolean,
      msj: string,
    }

    
    this.tarifaBase = this.$calcularCGPersonalizada(tarifa, op)*op.multiplicadorCliente;
    op.valores.cliente.tarifaBase = this.tarifaBase;  
    this.acompaniante = op.acompaniante ? tGeneral.adicionales.acompaniante : 0 ;
    op.valores.cliente.acompValor = this.acompaniante
    this.kmValor = 0 ; 
    //console.log("tarifa base: " ,this.tarifaBase);
    this.$crearFacturaOpCliente(op, tarifa.idTarifa);
    ////console.log("Factura OP cliente ", this.facturaOpCliente)
    respuesta = {
      op: op,
      factura: this.facturaOpCliente,
      resultado:true,
      msj:"",
    }
    ////console.log("Factura OP cliente ", this.facturaOpCliente)
    return respuesta
    //return this.facturaOpCliente
  }

  $facturarOpEveCliente(op: Operacion, tGeneral: TarifaGralCliente){
    let respuesta : {
      op: Operacion,
      factura: FacturaOp,
      resultado: boolean,
      msj: string,
    }

    this.tarifaBase = op.tarifaEventual.cliente.valor*op.multiplicadorCliente;
    op.valores.cliente.tarifaBase = this.tarifaBase;
    this.acompaniante = op.acompaniante ? tGeneral.adicionales.acompaniante : 0 ;
    op.valores.cliente.acompValor = this.acompaniante;
    this.kmValor = 0;
    this.$crearFacturaOpCliente(op, 0);
    respuesta = {
      op: op,
      factura: this.facturaOpCliente,
      resultado:true,
      msj:"",
    }
    return respuesta
    //return this.facturaOpCliente

  }

  $calcularCG(tarifa: TarifaGralCliente, vehiculo: Vehiculo){

    let catCg = tarifa.cargasGenerales.filter((cat:CategoriaTarifa) =>{
      return cat.orden === vehiculo.categoria.catOrden;
    });
    return catCg[0].valor
}

$calcularCGPersonalizada(tarifa: TarifaPersonalizadaCliente, op: Operacion){
  //console.log("tarifa: ", tarifa);
  
  let seccionPers: Seccion [] = tarifa.secciones.filter((seccion: Seccion)=>{
    return seccion.orden === Number(op.tarifaPersonalizada.seccion);
  });
  //console.log("seccionPers", seccionPers);
  
  let categoria: any [] = seccionPers[0].categorias.filter((cat:any) => {
    return cat.orden === Number(op.tarifaPersonalizada.categoria)
  })
  //console.log("categoria", categoria);
  return categoria[0].aCobrar
}

$calcularKm(op: Operacion, tarifa: TarifaGralCliente, vehiculo:Vehiculo){
  let catCg = tarifa.cargasGenerales.filter((cat: CategoriaTarifa) => {
    return cat.orden === vehiculo.categoria.catOrden;
  });
  ////console.log("catCg: ", catCg);
  
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

$crearFacturaOpCliente(op:Operacion, idTarifa: number){

  this.facturaOpCliente = {
    
    idFacturaOp: new Date().getTime(),
    idOperacion: op.idOperacion,
    idCliente: op.cliente.idCliente,
    idChofer: op.chofer.idChofer,
    idProveedor:0,
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
      general: op.tarifaTipo.eventual? !op.tarifaTipo.eventual : op.tarifaTipo.personalizada ? !op.tarifaTipo.personalizada : op.tarifaTipo.especial ? op.cliente.tarifaTipo.general : op.cliente.tarifaTipo.general,
      especial: op.tarifaTipo.eventual? !op.tarifaTipo.eventual : op.tarifaTipo.personalizada ? !op.tarifaTipo.personalizada : op.cliente.tarifaTipo.especial,
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



}
