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
      ////console.log("data: ", data);                
      this.tarifaGralCliente = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
      this.tarifaGralCliente.cargasGenerales = this.tarifaGralCliente.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
      ////console.log("1) ult tarifa GRAL: ",this.ultTarifa);              
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
      factura: FacturaOp
    }
    console.log("$facturarOpCliente) op: ", op, " tarifa: ", tarifa);
    let vehiculo = op.chofer.vehiculo.filter(vehiculo => vehiculo.dominio === op.patenteChofer)
    //console.log("1c) vehiculo: ", vehiculo);    

    if(op.multiplicadorCliente === 0){
      this.tarifaBase = 0;  
      op.valores.cliente.tarifaBase = 0;  
      //console.log("tarifa base: " ,this.tarifaBase);
      this.acompaniante = 0 ;
      op.valores.cliente.acompValor = 0
      //console.log("acompañante valor: ", this.acompaniante);
      this.kmValor = 0;
      op.valores.cliente.kmAdicional = 0;
      op.valores.cliente.aCobrar = 0;
    } else {
      this.tarifaBase = this.$calcularCG(tarifa, vehiculo[0])*op.multiplicadorCliente;  
      op.valores.cliente.tarifaBase = this.tarifaBase;  
      //console.log("tarifa base: " ,this.tarifaBase);
      this.acompaniante = op.acompaniante ? tarifa.adicionales.acompaniante : 0 ;
      op.valores.cliente.acompValor = this.acompaniante
      //console.log("acompañante valor: ", this.acompaniante);
      this.kmValor = this.$calcularKm(op, tarifa, vehiculo[0]);
      op.valores.cliente.kmAdicional = this.kmValor;
      op.valores.cliente.aCobrar = this.tarifaBase + this.acompaniante + this.kmValor;    
    }

    
    //console.log("km valor: ", this.kmValor);
    this.$crearFacturaOpCliente(op, tarifa.idTarifa);
    respuesta = {
      op: op,
      factura: this.facturaOpCliente,
    }
    //console.log("Factura OP cliente ", this.facturaOpCliente)
    return respuesta
  }

  $facturarOpPersCliente(op: Operacion, tarifa: TarifaPersonalizadaCliente, tGeneral: TarifaGralCliente){
    console.log("!!!!!!!!!!!)op: ", op, " y tarifa: ",tarifa);
    let respuesta : {
      op: Operacion,
      factura: FacturaOp
    }
    
    this.tarifaBase = this.$calcularCGPersonalizada(tarifa, op)*op.multiplicadorCliente;
    op.valores.cliente.tarifaBase = this.tarifaBase;  
    this.acompaniante = op.acompaniante ? tGeneral.adicionales.acompaniante : 0 ;
    op.valores.cliente.acompValor = this.acompaniante
    this.kmValor = 0 ; 
    console.log("tarifa base: " ,this.tarifaBase);
    this.$crearFacturaOpCliente(op, tarifa.idTarifa);
    //console.log("Factura OP cliente ", this.facturaOpCliente)
    respuesta = {
      op: op,
      factura: this.facturaOpCliente,
    }
    //console.log("Factura OP cliente ", this.facturaOpCliente)
    return respuesta
    //return this.facturaOpCliente
  }

  $facturarOpEveCliente(op: Operacion, tGeneral: TarifaGralCliente){
    let respuesta : {
      op: Operacion,
      factura: FacturaOp
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
  console.log("tarifa: ", tarifa);
  
  let seccionPers: Seccion [] = tarifa.secciones.filter((seccion: Seccion)=>{
    return seccion.orden === Number(op.tarifaPersonalizada.seccion);
  });
  console.log("seccionPers", seccionPers);
  
  let categoria: any [] = seccionPers[0].categorias.filter((cat:any) => {
    return cat.orden === Number(op.tarifaPersonalizada.categoria)
  })
  console.log("categoria", categoria);
  return categoria[0].aCobrar
}

$calcularKm(op: Operacion, tarifa: TarifaGralCliente, vehiculo:Vehiculo){
  let catCg = tarifa.cargasGenerales.filter((cat: CategoriaTarifa) => {
    return cat.orden === vehiculo.categoria.catOrden;
  });
  //console.log("catCg: ", catCg);
  
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
  }  
}

  /* facturarOpCliente(op:Operacion, tarifa:TarifaCliente): FacturaOpCliente{
    console.log("cliente service. op recibida: ", op);
    console.log("cliente service. tarifa recibida: ", tarifa);
   //console.log("esto tarifa recibe: ",this.ultimaTarifa);    
   this.ultimaTarifa = tarifa;
   this.buscarCliente(op);    
   this.calcularLiquidacion(op);
   //this.buscarTarifaChofer(op);   
   this.crearFacturaCliente(op);     


    return this.facturaCliente
    

  } */

  buscarCliente(op: Operacion){
    /* let opCliente: any;
    opCliente = this.$clientes.filter(function (cliente:any){
      return cliente.idCliente === op.cliente.idCliente;
    })
    //////console.log()("choferSeleccionado: ", choferSeleccionado);
    this.clienteOp = opCliente[0];
    ////console.log()("clienteOp: ", this.clienteOp); */
    this.clienteOp = op.cliente
    //this.buscarTarifa(op);
  }

  /* buscarTarifa(op: Operacion){    
    this.storageService.historialTarifasClientes$.subscribe(data => {
      //this.$tarifas = data.filter((tarifa: { idCliente: number; }) => tarifa.idCliente === this.clienteOp.idCliente);
      this.$tarifas = data
      console.log("1) data Todas CLIENTES: ",this.$tarifas);

      // Encontrar la tarifa con el idTarifa más elevado
    
      this.ultimaTarifa = this.$tarifas[0];
      // Ahora, tarifaMasElevada contiene la tarifa con el idTarifa más elevado
      console.log("2) ultima CLIENTE: ", this.ultimaTarifa);
      //this.calcularLiquidacion(op);
      this.calcularLiquidacion(op);
    });  
  } */

  

 /*  calcularLiquidacion(op:Operacion){    
    this.$tarifaCliente = this.ultimaTarifa
    ////console.log()("esta es la tarifa a facturar: ", this.$tarifaCliente);
    
    if(op.tarifaEventual){
      //console.log("3) tarifa especial");
      
      this.facturarTarifaEspecial(op);

    } else{

      this.facturarCG(op);

      this.calcularAdicional(op, this.ultimaTarifa);

      //this.$adicional = this.calcularAdicional(op, this.ultimaTarifa);
      //////console.log()("tarifa base: ", this.$tarifaChofer.valorJornada, " adicional: ", this.$adicional ); ;
      
      //this.total = this.$tarifaCliente.valorJornada + this.$adicional;
      this.total = this.categoriaMonto + (this.acompanianteMonto + this.adicionalKmMonto)
  
      ////console.log()("esta es facturaClienteService. liquidacion del chofer: ", this.total);
    }

    //this.crearFacturaChofer(op);    
  } */

  facturarCG(op: Operacion){
    ////console.log()("cargas generales");
    
   /*  switch (op.chofer.vehiculo.categoria) {
      case "mini":
        this.categoriaMonto = this.ultimaTarifa.cargasGenerales.utilitario
        break;

      case "maxi":
        this.categoriaMonto = this.ultimaTarifa.cargasGenerales.furgon
      break;

      case "furgon grande":
        this.categoriaMonto = this.ultimaTarifa.cargasGenerales.furgonGrande
      break;

      case "camión liviano":
        this.categoriaMonto = this.ultimaTarifa.cargasGenerales.chasisLiviano
      break;

      case "chasis":
        this.categoriaMonto = this.ultimaTarifa.cargasGenerales.chasis
      break;

      case "balancin":
        this.categoriaMonto = this.ultimaTarifa.cargasGenerales.balancin
      break;

      case "semi remolque local":
        this.categoriaMonto = this.ultimaTarifa.cargasGenerales.semiRemolqueLocal
      break;

      case "portacontenedores":
        this.categoriaMonto = this.ultimaTarifa.cargasGenerales.portacontenedores
      break;
    
      default:
        alert("error categoria CG")
        break;
    }  */
  }

 

/*   calcularAdicional(op: Operacion, tarifa: TarifaCliente){
    let acompaniante: any;
    let adicional: any;
    
    if(op.acompaniante){
      this.acompanianteMonto = this.ultimaTarifa.adicionales.acompaniante
    }else{
      this.acompanianteMonto = 0;
    }

    if(op.km !== null){
      if(op.km < this.ultimaTarifa.adicionales.adicionalKm.primerSector.distancia){
        this.adicionalKmMonto = 0;
      } else if (op.km < (this.ultimaTarifa.adicionales.adicionalKm.primerSector.distancia + this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.intervalo)) {
        this.adicionalKmMonto = this.ultimaTarifa.adicionales.adicionalKm.primerSector.valor;
      } else{
        let resto:number;
        let secciones:number;
        
        resto = op.km - (this.ultimaTarifa.adicionales.adicionalKm.primerSector.distancia + this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.intervalo);
        secciones = resto / this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.intervalo;
        //////console.log()("secciones: ", secciones);
        secciones = Math.floor(secciones);

        if(((op.km - (this.ultimaTarifa.adicionales.adicionalKm.primerSector.distancia + this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.intervalo)) % this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.intervalo) === 0){
          //alert("cuenta redonda");
          this.adicionalKmMonto = this.ultimaTarifa.adicionales.adicionalKm.primerSector.valor + this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.valor*secciones;
          ////console.log()("adicional KM: ", this.adicionalKmMonto);           

        } else{
          //alert("con resto");
          this.adicionalKmMonto = this.ultimaTarifa.adicionales.adicionalKm.primerSector.valor + ((this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.valor)*(secciones+1));
          ////console.log()("adicional KM: ", this.adicionalKmMonto);
        }         
      }  
    }
    
  } */

  /* facturarAdicionalKm(op: Operacion){
    if(op.km !== null){
      if(op.km < this.ultimaTarifa.adicionales.adicionalKm.primerSector.distancia){
        this.adicionalKmMonto = 0;
      } else if (op.km < (this.ultimaTarifa.adicionales.adicionalKm.primerSector.distancia + this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.intervalo)) {
        this.adicionalKmMonto = this.ultimaTarifa.adicionales.adicionalKm.primerSector.valor;
      } else{
        let resto:number;
        let secciones:number;
        
        resto = op.km - (this.ultimaTarifa.adicionales.adicionalKm.primerSector.distancia + this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.intervalo);
        secciones = resto / this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.intervalo;
        //////console.log()("secciones: ", secciones);
        secciones = Math.floor(secciones);

        if(((op.km - (this.ultimaTarifa.adicionales.adicionalKm.primerSector.distancia + this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.intervalo)) % this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.intervalo) === 0){
          //alert("cuenta redonda");
          this.adicionalKmMonto = this.ultimaTarifa.adicionales.adicionalKm.primerSector.valor + this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.valor*secciones;
          ////console.log()("adicional KM: ", this.adicionalKmMonto);           

        } else{
          //alert("con resto");
          this.adicionalKmMonto = this.ultimaTarifa.adicionales.adicionalKm.primerSector.valor + ((this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.valor)*(secciones+1));
          ////console.log()("adicional KM: ", this.adicionalKmMonto);
        }         
      }  
    }
    
  } */

 /*  crearFacturaCliente(op:Operacion){

    this.facturaCliente = {
      id: null,
      idFacturaOpCliente: new Date().getTime(),
      operacion: op,
      idCliente: op.cliente.idCliente,
      idTarifa: this.ultimaTarifa.idTarifa,
      fecha: op.fecha,      
      valorJornada: this.categoriaMonto,
      adicional: this.acompanianteMonto + this.adicionalKmMonto,    
      total: this.total,
      liquidacion: false,
      montoFacturaChofer: 0,
    }
    ////console.log()(this.facturaCliente);
    
    //this.altaFacturaChofer()
  } */

  

/*   facturarTarifaEspecial(op: Operacion){
    
      //this.categoriaMonto = typeof op.tEspecial.cliente.valor === 'number'? op.tEspecial.cliente.valor : 0;
      //this.total = typeof op.tEspecial.cliente.valor === 'number'? op.tEspecial.cliente.valor : 0;
      this.categoriaMonto = this.ultimaTarifa.tarifaEspecial.valor;
      this.total = this.ultimaTarifa.tarifaEspecial.valor;
      this.ultimaTarifa.tarifaEspecial.valor = op.tarifaEventual.cliente.valor;
      this.ultimaTarifa.tarifaEspecial.concepto = op.tarifaEventual.cliente.concepto;
      console.log("4) tarifa CLIENTE editada", this.ultimaTarifa);
      this.storageService.updateItem("tarifasCliente", this.ultimaTarifa) 
      
    
    this.acompanianteMonto = 0;
    this.adicionalKmMonto = 0;
    //////console.log()("pasa por aca 2°");
    
  } */

  /* obtenerTarifaCliente(factura:FacturaOpCliente){
    //console.log("FACTURAAA: ", factura);
    
    let ultimaTarifa;
    this.storageService.getByFieldValueTitle("tarifasCliente", "idTarifa", factura.idTarifa, "tarifasCliente");
   

      // Ahora, ultimaTarifa contiene la tarifa con el idTarifa más elevado
      //console.log("ultima: ", ultimaTarifa);
      
    //};  

    
    
    //return ultimaTarifa;
    
  } */

/*   actualizarFacOp(factura:FacturaOpCliente, tarifa: TarifaCliente){
    console.log("cliente service. factura recibida: ", factura);
    console.log("cliente service. tarifa recibida: ", tarifa);
    this.ultimaTarifa = tarifa;
    this.calcularLiquidacion(factura.operacion)
    this.editarFacOpCliente(factura);
    return this.facturaCliente;
  } */

  /* editarFacOpCliente(factura:FacturaOpCliente){
    this.facturaCliente = {
      id: factura.id,
      idFacturaOpCliente: factura.idFacturaOpCliente,
      operacion: factura.operacion,        
      fecha: factura.operacion.fecha,      
      idCliente: factura.operacion.cliente.idCliente,
      idTarifa: this.ultimaTarifa.idTarifa,
      valorJornada: this.categoriaMonto,
      adicional: this.acompanianteMonto + this.adicionalKmMonto,
      total: this.total,
      liquidacion: factura.liquidacion,
      montoFacturaChofer: factura.montoFacturaChofer,
    }
    
    ////console.log()("factura EDITADA FINAL: ", this.facturaCliente);
  } */


  ////prueba.......
  generarOp(op:Operacion){
    this.tarifaGral()
    if(op.tarifaTipo.eventual){
        op.valores.cliente.aCobrar = op.tarifaEventual.cliente.valor;
        op.valores.chofer.aPagar = op.tarifaEventual.chofer.valor;
    } else if(op.tarifaTipo.personalizada){
        op.valores.cliente.aCobrar = op.tarifaPersonalizada.aCobrar
        op.valores.chofer.aPagar = op.tarifaPersonalizada.aPagar;
    } else {
      if(op.chofer.vehiculo.length > 1){

      } else {
        let categoriaValor
        categoriaValor = this.tarifaGralCliente.cargasGenerales.forEach((categoria:CategoriaTarifa)=>{
          categoria.orden === op.chofer.vehiculo[0].categoria.catOrden
          return categoria.valor
        })
      }
    }
  }

}
