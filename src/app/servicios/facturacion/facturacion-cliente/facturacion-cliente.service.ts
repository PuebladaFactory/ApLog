import { Injectable } from '@angular/core';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { StorageService } from '../../storage/storage.service';
import { DbFirestoreService } from '../../database/db-firestore.service';
import { Operacion } from 'src/app/interfaces/operacion';
import { TarifaCliente } from 'src/app/interfaces/tarifa-cliente';
import { Cliente } from 'src/app/interfaces/cliente';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { parseActionCodeURL } from 'firebase/auth';
import { FacturaCliente } from 'src/app/interfaces/factura-cliente';
import { CategoriaTarifa, TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { Vehiculo } from 'src/app/interfaces/chofer';
import { FacturaOp } from 'src/app/interfaces/factura-op';

@Injectable({
  providedIn: 'root'
})
export class FacturacionClienteService {

  $clientes!: Cliente[];
  facturaCliente!: FacturaOpCliente;
  clienteOp!: Cliente;
  $tarifas!: TarifaCliente[];
  ultimaTarifa!: TarifaCliente;
  categoriaMonto!: number;
  acompanianteMonto!: number;
  adicionalKmMonto!: number;
  $tarifaCliente!: TarifaCliente;
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
    console.log("1b) op: ", op, " tarifa: ", tarifa);
    let vehiculo = op.chofer.vehiculo.filter(vehiculo => vehiculo.dominio === op.patenteChofer)
    console.log("1c) vehiculo: ", vehiculo);
    
    this.tarifaBase = this.$calcularCG(tarifa, vehiculo[0]);
    console.log("tarifa base: " ,this.tarifaBase);
    this.acompaniante = op.acompaniante ? tarifa.adicionales.acompaniante : 0 ;
    console.log("acompañante valor: ", this.acompaniante);
    this.kmValor = this.$calcularKm(op, tarifa, vehiculo[0]);
    console.log("km valor: ", this.kmValor);
    
    
  }

  facturarOpCliente(op:Operacion, tarifa:TarifaCliente): FacturaOpCliente{
    console.log("cliente service. op recibida: ", op);
    console.log("cliente service. tarifa recibida: ", tarifa);
   //console.log("esto tarifa recibe: ",this.ultimaTarifa);    
   this.ultimaTarifa = tarifa;
   this.buscarCliente(op);    
   this.calcularLiquidacion(op);
   //this.buscarTarifaChofer(op);   
   this.crearFacturaCliente(op);     

/*     this.storageService.getByFieldValueLimitBuscarTarifa("tarifasCliente", "idCliente", op.cliente.idCliente,1)
    this.buscarCliente(op);   
    this.crearFacturaCliente(op);     */
    return this.facturaCliente
    

  }

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

  buscarTarifa(op: Operacion){    
    this.storageService.historialTarifasClientes$.subscribe(data => {
      //this.$tarifas = data.filter((tarifa: { idCliente: number; }) => tarifa.idCliente === this.clienteOp.idCliente);
      this.$tarifas = data
      console.log("1) data Todas CLIENTES: ",this.$tarifas);

      // Encontrar la tarifa con el idTarifa más elevado
      /* this.ultimaTarifa = this.$tarifas.reduce((tarifaMaxima: TarifaCliente, tarifaActual: TarifaCliente) => {
        return tarifaActual.idTarifaCliente > tarifaMaxima.idTarifaCliente ? tarifaActual : tarifaMaxima;
      });  */
      this.ultimaTarifa = this.$tarifas[0];
      // Ahora, tarifaMasElevada contiene la tarifa con el idTarifa más elevado
      console.log("2) ultima CLIENTE: ", this.ultimaTarifa);
      //this.calcularLiquidacion(op);
      this.calcularLiquidacion(op);
    });  
  }

  $calcularCG(tarifa: TarifaGralCliente, vehiculo: Vehiculo){

      let catCg = tarifa.cargasGenerales.filter((cat:CategoriaTarifa) =>{
        return cat.orden === vehiculo.categoria.catOrden;
      });
      return catCg[0].valor
  }

  $calcularKm(op: Operacion, tarifa: TarifaGralCliente, vehiculo:Vehiculo){
    let catCg = tarifa.cargasGenerales.filter((cat:CategoriaTarifa) =>{
      return cat.orden === vehiculo.categoria.catOrden;
    });
    console.log("catCg: ", catCg);
    
    let montoTotal = 0;

    
    // Verifica si los kilómetros recorridos son menores o iguales al primer sector
    if (op.km < tarifa.adicionales.KmDistancia.primerSector) {
      return montoTotal; // No se cobra adicional
    }
  
    // Si supera el primer sector, se calcula el valor del primer sector
    montoTotal = catCg[0].adicionalKm.primerSector;
  
    // Calcula cuántos kilómetros adicionales quedan luego del primer sector
    let kmRestantes = op.km - tarifa.adicionales.KmDistancia.primerSector;
  
    // Calcula cuántos sectores adicionales se deben considerar
    let sectoresAdicionales = Math.ceil(kmRestantes / tarifa.adicionales.KmDistancia.sectoresSiguientes);
  
    // Suma el costo de los sectores adicionales
    montoTotal += sectoresAdicionales * catCg[0].adicionalKm.sectoresSiguientes;
  
    return montoTotal;
    
  }

  calcularLiquidacion(op:Operacion){    
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
  }

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

 

  calcularAdicional(op: Operacion, tarifa: TarifaCliente){
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
    
  }

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

  crearFacturaCliente(op:Operacion){

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
  }

  facturarTarifaEspecial(op: Operacion){
    
      //this.categoriaMonto = typeof op.tEspecial.cliente.valor === 'number'? op.tEspecial.cliente.valor : 0;
      //this.total = typeof op.tEspecial.cliente.valor === 'number'? op.tEspecial.cliente.valor : 0;
      this.categoriaMonto = this.ultimaTarifa.tarifaEspecial.valor;
      this.total = this.ultimaTarifa.tarifaEspecial.valor;
      this.ultimaTarifa.tarifaEspecial.valor = op.tEventual.cliente.valor;
      this.ultimaTarifa.tarifaEspecial.concepto = op.tEventual.cliente.concepto;
      console.log("4) tarifa CLIENTE editada", this.ultimaTarifa);
      this.storageService.updateItem("tarifasCliente", this.ultimaTarifa) 
      
    
    this.acompanianteMonto = 0;
    this.adicionalKmMonto = 0;
    //////console.log()("pasa por aca 2°");
    
  }

  obtenerTarifaCliente(factura:FacturaOpCliente){
    //console.log("FACTURAAA: ", factura);
    
    let ultimaTarifa;
    this.storageService.getByFieldValueTitle("tarifasCliente", "idTarifa", factura.idTarifa, "tarifasCliente");
    /* this.storageService.historialTarifasClientes$.subscribe(data => {
      ////console.log()(data);
      
      //this.$tarifas = data.filter((tarifa: { idTarifaCliente: number; }) => tarifa.idTarifaCliente === factura.idTarifa);
      this.$tarifas = data
      ////console.log()("Todas: ",this.$tarifas);

      // Encontrar la tarifa con el idTarifa más elevado
      //ultimaTarifa = this.$tarifas[0]
      //ultimaTarifa = this.$tarifas.reduce((tarifaMaxima: { idTarifa: number; }, tarifaActual: { idTarifa: number; }) => {
       // return tarifaActual.idTarifa > tarifaMaxima.idTarifa ? tarifaActual : tarifaMaxima;
      });  */

      // Ahora, ultimaTarifa contiene la tarifa con el idTarifa más elevado
      //console.log("ultima: ", ultimaTarifa);
      
    //};  

    
    
    //return ultimaTarifa;
    
  }

  actualizarFacOp(factura:FacturaOpCliente, tarifa: TarifaCliente){
    console.log("cliente service. factura recibida: ", factura);
    console.log("cliente service. tarifa recibida: ", tarifa);
    this.ultimaTarifa = tarifa;
    this.calcularLiquidacion(factura.operacion)
    this.editarFacOpCliente(factura);
    return this.facturaCliente;
  }

  editarFacOpCliente(factura:FacturaOpCliente){
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
  }


  ////prueba.......
  generarOp(op:Operacion){
    this.tarifaGral()
    if(op.tarifaEventual){
        op.aCobrar = op.tEventual.cliente.valor;
        op.aPagar = op.tEventual.chofer.valor;
    } else if(op.tarifaPersonalizada){
        op.aCobrar = op.tPersonalizada.aCobrar
        op.aPagar = op.tPersonalizada.aPagar;
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
