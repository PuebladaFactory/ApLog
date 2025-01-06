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
      factura: FacturaOp
    }
    //console.log("1)Chofer Serv:  op: ", op, " tarifa: ", tarifa);
    let vehiculo = op.chofer.vehiculo.filter(vehiculo => vehiculo.dominio === op.patenteChofer);
    ////console.log("1c) vehiculo: ", vehiculo);    

    this.tarifaBase = this.$calcularCG(tarifa, vehiculo[0]);
    op.valores.chofer.tarifaBase = this.tarifaBase;  
    ////console.log("tarifa base: " ,this.tarifaBase);
    this.acompaniante = op.acompaniante ? tarifa.adicionales.acompaniante : 0 ;
    op.valores.chofer.acompValor = this.acompaniante;
    ////console.log("acompañante valor: ", this.acompaniante);
    this.kmValor = this.$calcularKm(op, tarifa, vehiculo[0]);
    op.valores.chofer.kmAdicional = this.kmValor;
    op.valores.chofer.aPagar = this.tarifaBase + this.acompaniante + this.kmValor;    
    ////console.log("km valor: ", this.kmValor);
    this.$crearFacturaOpChofer(op, tarifa.idTarifa,0);
    respuesta = {
      op: op,
      factura: this.facturaOpChofer,
    }
    ////console.log("Factura OP cliente ", this.facturaOpCliente)
    return respuesta;
  }

  $facturarOpPersChofer(op: Operacion, tarifa: TarifaPersonalizadaCliente, idProveedor: number){
    this.tarifaBase = this.$calcularCGPersonalizada(tarifa, op);
    this.acompaniante = 0,
    this.kmValor = 0 , 
    //console.log("tarifa base: " ,this.tarifaBase);
    this.$crearFacturaOpChofer(op, tarifa.idTarifa, idProveedor);
    ////console.log("Factura OP cliente ", this.facturaOpCliente)
    return this.facturaOpChofer
  }

  $facturarOpEveChofer(op: Operacion, idProveedor: number){
    this.tarifaBase = op.tarifaEventual.chofer.valor;
    this.acompaniante = 0;
    this.kmValor = 0;
    this.$crearFacturaOpChofer(op, 0,idProveedor);
    return this.facturaOpChofer

  }

  $calcularCG(tarifa: TarifaGralCliente, vehiculo: Vehiculo){

    let catCg = tarifa.cargasGenerales.filter((cat:CategoriaTarifa) =>{
      return cat.orden === vehiculo.categoria.catOrden;
    });
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
    factura: FacturaOp
  }
  //console.log("1)Chofer Serv:  op: ", op, " tarifa: ", tarifa);
  let vehiculo = op.chofer.vehiculo.filter(vehiculo => vehiculo.dominio === op.patenteChofer)
  ////console.log("1c) vehiculo: ", vehiculo);    

  this.tarifaBase = this.$calcularCG(tarifa, vehiculo[0]);
  op.valores.chofer.tarifaBase = this.tarifaBase;  
  ////console.log("tarifa base: " ,this.tarifaBase);
  this.acompaniante = op.acompaniante ? tarifa.adicionales.acompaniante : 0 ;
  op.valores.chofer.acompValor = this.acompaniante;  
  ////console.log("acompañante valor: ", this.acompaniante);
  this.kmValor = this.$calcularKm(op, tarifa, vehiculo[0]);
  op.valores.chofer.kmAdicional = this.kmValor;  
  op.valores.chofer.aPagar = this.tarifaBase + this.acompaniante + this.kmValor;    
  ////console.log("km valor: ", this.kmValor);
  this.$crearFacturaOpChofer(op, tarifa.idTarifa, idProveedor);
  respuesta = {
    op: op,
    factura: this.facturaOpChofer,
  }
  ////console.log("Factura OP cliente ", this.facturaOpCliente)
  return respuesta;
}

  /* facturarOpChofer(op: Operacion, tarifa: TarifaChofer)  :FacturaOpChofer{    
 
    ////console.log("esto tarifa recibe: ",this.ultimaTarifa);    
    this.ultimaTarifa = tarifa;
    this.buscarChofer(op);    
    this.calcularLiquidacion(op);
    //this.buscarTarifaChofer(op);   
    this.crearFacturaChofer(op);      
    
    
    //console.log("esto vuelve: ",this.facturaChofer);    
    return this.facturaChofer
  } */

  
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

  
  buscarChofer(op: Operacion){                  ///¿¿ESTO ES NECESARIO??
    /* let choferSeleccionado: any;
    choferSeleccionado = this.$choferes.filter(function (chofer:any){
      return chofer.idChofer === op.chofer.idChofer
    })
    //////console.log()("choferSeleccionado: ", choferSeleccionado);
    this.choferOp = choferSeleccionado[0]; */
    //////console.log()("choferSeleccionado: ", this.choferOp);
    //this.filtrarChofer(op);
    this.choferOp = op.chofer;
    //this.buscarTarifaChofer(op);   
  }

 /*  filtrarChofer(op: Operacion){
    if(this.choferOp.proveedor === "monotributista"){
      ////console.log()("monotributista");
      this.buscarTarifaChofer(op);   
    } else{
      ////console.log()("proveedor");
      this.buscarProveedor(op);
    }
  } */



 /*  buscarProveedor(op:Operacion){
    let proveedor: any;
    proveedor = this.$proveedores.filter(function (proveedor:any){
      return proveedor.razonSocial === op.chofer.proveedor
    })
    //////console.log()("choferSeleccionado: ", choferSeleccionado);
    this.proveedorOp = proveedor[0];
    ////console.log()("proveedorOp: ", this.proveedorOp);
    this.buscarTarifaProveedor(op);
  }

  buscarTarifaProveedor(op: Operacion){    
    this.storageService.historialTarifasProveedores$.subscribe(data => {
      ////console.log()("esto pasa por aca?");
      ////console.log()("data: ", data);
      
      this.$tarifas = data.filter((tarifa: { idChofer: number; }) => tarifa.idChofer === this.proveedorOp.idProveedor);

      ////console.log()("Todas: ",this.$tarifas);

      // Encontrar la tarifa con el idTarifa más elevado
      this.ultimaTarifa = this.$tarifas.reduce((tarifaMaxima: { idTarifa: number; }, tarifaActual: { idTarifa: number; }) => {
        return tarifaActual.idTarifa > tarifaMaxima.idTarifa ? tarifaActual : tarifaMaxima;
      });

      // Ahora, ultimaTarifa contiene la tarifa con el idTarifa más elevado
      ////console.log()("ultima: ", this.ultimaTarifa);
      this.calcularLiquidacion(op);
    });  
  } */

/*   calcularLiquidacion(op:Operacion){    
    this.$tarifaChofer = this.ultimaTarifa
    //console.log("1) esta es la tarifa a facturar: ", this.$tarifaChofer);
    
    if(op.tarifaEventual){
      ////console.log("3)tarfia especial");
      this.facturarTarifaEspecial(op);
      
      
    } else{

      this.$adicional = this.calcularAdicional(op, this.ultimaTarifa);
      //////console.log()("tarifa base: ", this.$tarifaChofer.valorJornada, " adicional: ", this.$adicional ); ;
      
      this.total = this.$tarifaChofer.valorJornada + this.$adicional;
      this.montoValorJornada = this.$tarifaChofer.valorJornada;
      ////console.log()("esta es facturaChoferService. liquidacion del chofer: ", this.total);
    }

    //this.crearFacturaChofer(op);    
  } */

/*   calcularAdicional(op:Operacion, tarifa: TarifaChofer) {
    let acompaniante: any;
    let adicional: any;
    
    if(op.acompaniante){
      acompaniante = tarifa.acompaniante;
    }else{
      acompaniante = 0;
    }
    
    

    if(op.km !== null){
      if(op.km < this.ultimaTarifa.km.primerSector.distancia){
        adicional = 0;
        return adicional + acompaniante;
      } else if (op.km < (this.ultimaTarifa.km.primerSector.distancia + this.ultimaTarifa.km.sectoresSiguientes.intervalo)) {
        adicional = this.ultimaTarifa.km.primerSector.valor;
        return adicional + acompaniante;
      } else{
        let resto:number;
        let secciones:number;
        
        resto = op.km - (this.ultimaTarifa.km.primerSector.distancia + this.ultimaTarifa.km.sectoresSiguientes.intervalo);
        secciones = resto / this.ultimaTarifa.km.sectoresSiguientes.intervalo;
        //////console.log()("secciones: ", secciones);
        secciones = Math.floor(secciones);

        if(((op.km - (this.ultimaTarifa.km.primerSector.distancia + this.ultimaTarifa.km.sectoresSiguientes.intervalo)) % this.ultimaTarifa.km.sectoresSiguientes.intervalo) === 0){
          //alert("cuenta redonda");
          adicional = this.ultimaTarifa.km.primerSector.valor + this.ultimaTarifa.km.sectoresSiguientes.valor*secciones;
          ////console.log()("adicional KM: ", adicional);           
          return adicional + acompaniante;
        } else{
          //alert("con resto");
          adicional = this.ultimaTarifa.km.primerSector.valor + ((this.ultimaTarifa.km.sectoresSiguientes.valor)*(secciones+1));
          ////console.log()("adicional KM: ", adicional);
          return adicional + acompaniante;
        }         
      }  
    }
  } */

  /* crearFacturaChofer(op:Operacion){

    this.facturaChofer = {
      
      idFacturaOpChofer: new Date().getTime(),
      operacion: op,        
      fecha: op.fecha,      
      idChofer: op.chofer.idChofer,
      idTarifa: this.ultimaTarifa.idTarifa,
      valorJornada: this.montoValorJornada,
      adicional: this.$adicional,      
      total: this.total,
      liquidacion: false,
      montoFacturaCliente: 0,
    }
    
      //console.log("factura chofer FINAL: ", this.facturaChofer);
    
    //this.altaFacturaChofer()
  } */

  /* facturarTarifaEspecial(op:Operacion){
    //console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!: ", this.ultimaTarifa.tarifaEspecial.valor);
    
    //if(op.tarifaEspecial){
      //this.montoValorJornada = typeof op.tEspecial.chofer.valor === 'number'? op.tEspecial.chofer.valor : 0;
      //this.total = typeof op.tEspecial.chofer.valor === 'number'? op.tEspecial.chofer.valor : 0;
    this.montoValorJornada = this.ultimaTarifa.tarifaEspecial.valor;
    this.total = this.ultimaTarifa.tarifaEspecial.valor;
      this.ultimaTarifa.tarifaEspecial.valor = op.tarifaEventual.chofer.valor;
      this.ultimaTarifa.tarifaEspecial.concepto = op.tarifaEventual.chofer.concepto;
      ////console.log("4) tarifa editada", this.ultimaTarifa);      
      this.storageService.updateItem("tarifasChofer", this.ultimaTarifa)
      //} else{
        //this.montoValorJornada = this.ultimaTarifa.tarifaEspecial.valor;
        //this.total = this.ultimaTarifa.tarifaEspecial.valor;
      //}
    //this.total = this.$tarifaChofer.tarifaEspecial.valor;
    this.$adicional = 0;
    //this.$tarifaChofer.valorJornada = this.$tarifaChofer.tarifaEspecial.valor;
  } */

  /* obtenerTarifaChofer(factura:FacturaOpChofer){
    //let ultimaTarifa;
    this.storageService.getByFieldValueTitle("tarifasChofer", "idTarifa", factura.idTarifa, "tarifasChofer");
   
    
    //return ultimaTarifa;
    
  } */

  /* actualizarFacOp(factura:FacturaOpChofer, tarifa: TarifaChofer){
    //console.log("chofer service. factura recibida: ", factura);
    //console.log("chofer service. tarifa recibida: ", tarifa);
    this.ultimaTarifa = tarifa;
    this.calcularLiquidacion(factura.operacion)
    this.editarFacOpChofer(factura);
    return this.facturaChofer;
  } */

  /* editarFacOpChofer(factura:FacturaOpChofer){
    this.facturaChofer = {
      id: factura.id,
      idFacturaOpChofer: factura.idFacturaOpChofer,
      operacion: factura.operacion,        
      fecha: factura.operacion.fecha,      
      idChofer: factura.operacion.chofer.idChofer,
      idTarifa: this.ultimaTarifa.idTarifa,
      valorJornada: this.montoValorJornada,
      adicional: this.$adicional,      
      total: this.total,
      liquidacion: factura.liquidacion,
      montoFacturaCliente: factura.montoFacturaCliente,
    }
    
    ////console.log()("factura EDITADA FINAL: ", this.facturaChofer);
  } */
  
}
