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

  constructor(private storageService: StorageService ) { }

  clientes(){
    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;
    });
  }

 /*  facturarOperacion(op: Operacion)  :FacturaOpCliente{        
    //this.clientes();    
    this.facturarOpCliente(op);
    return this.facturaCliente
  } */

  facturarOpCliente(op:Operacion): FacturaOpCliente{
    this.buscarCliente(op);   
    this.crearFacturaCliente(op);    
    return this.facturaCliente
    

  }

  buscarCliente(op: Operacion){
    /* let opCliente: any;
    opCliente = this.$clientes.filter(function (cliente:any){
      return cliente.idCliente === op.cliente.idCliente;
    })
    ////console.log("choferSeleccionado: ", choferSeleccionado);
    this.clienteOp = opCliente[0];
    //console.log("clienteOp: ", this.clienteOp); */
    this.clienteOp = op.cliente
    this.buscarTarifa(op);
  }

  buscarTarifa(op: Operacion){    
    this.storageService.historialTarifasClientes$.subscribe(data => {
      this.$tarifas = data.filter((tarifa: { idCliente: number; }) => tarifa.idCliente === this.clienteOp.idCliente);

      //console.log("data Todas: ",this.$tarifas);

      // Encontrar la tarifa con el idTarifa más elevado
      this.ultimaTarifa = this.$tarifas.reduce((tarifaMaxima: TarifaCliente, tarifaActual: TarifaCliente) => {
        return tarifaActual.idTarifaCliente > tarifaMaxima.idTarifaCliente ? tarifaActual : tarifaMaxima;
      }); 

      // Ahora, tarifaMasElevada contiene la tarifa con el idTarifa más elevado
      //console.log("ultima: ", this.ultimaTarifa);
      //this.calcularLiquidacion(op);
      this.calcularLiquidacion(op);
    });  
  }

  calcularLiquidacion(op:Operacion){    
    this.$tarifaCliente = this.ultimaTarifa
    //console.log("esta es la tarifa a facturar: ", this.$tarifaCliente);
    
    if(op.tarifaEspecial){
      
      this.facturarTarifaEspecial(op);

    } else{

      this.facturarCG(op);

      this.calcularAdicional(op, this.ultimaTarifa);

      //this.$adicional = this.calcularAdicional(op, this.ultimaTarifa);
      ////console.log("tarifa base: ", this.$tarifaChofer.valorJornada, " adicional: ", this.$adicional ); ;
      
      //this.total = this.$tarifaCliente.valorJornada + this.$adicional;
      this.total = this.categoriaMonto + (this.acompanianteMonto + this.adicionalKmMonto)
  
      //console.log("esta es facturaClienteService. liquidacion del chofer: ", this.total);
    }

    //this.crearFacturaChofer(op);    
  }

  facturarCG(op: Operacion){
    //console.log("cargas generales");
    
    switch (op.chofer.vehiculo.categoria) {
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
    } 
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
        ////console.log("secciones: ", secciones);
        secciones = Math.floor(secciones);

        if(((op.km - (this.ultimaTarifa.adicionales.adicionalKm.primerSector.distancia + this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.intervalo)) % this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.intervalo) === 0){
          //alert("cuenta redonda");
          this.adicionalKmMonto = this.ultimaTarifa.adicionales.adicionalKm.primerSector.valor + this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.valor*secciones;
          //console.log("adicional KM: ", this.adicionalKmMonto);           

        } else{
          //alert("con resto");
          this.adicionalKmMonto = this.ultimaTarifa.adicionales.adicionalKm.primerSector.valor + ((this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.valor)*(secciones+1));
          //console.log("adicional KM: ", this.adicionalKmMonto);
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
        ////console.log("secciones: ", secciones);
        secciones = Math.floor(secciones);

        if(((op.km - (this.ultimaTarifa.adicionales.adicionalKm.primerSector.distancia + this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.intervalo)) % this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.intervalo) === 0){
          //alert("cuenta redonda");
          this.adicionalKmMonto = this.ultimaTarifa.adicionales.adicionalKm.primerSector.valor + this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.valor*secciones;
          //console.log("adicional KM: ", this.adicionalKmMonto);           

        } else{
          //alert("con resto");
          this.adicionalKmMonto = this.ultimaTarifa.adicionales.adicionalKm.primerSector.valor + ((this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.valor)*(secciones+1));
          //console.log("adicional KM: ", this.adicionalKmMonto);
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
      idTarifa: this.ultimaTarifa.idTarifaCliente,
      fecha: op.fecha,      
      valorJornada: this.categoriaMonto,
      adicional: this.acompanianteMonto + this.adicionalKmMonto,    
      total: this.total,
      liquidacion: false,
      montoFacturaChofer: 0,
    }
    //console.log(this.facturaCliente);
    
    //this.altaFacturaChofer()
  }

  facturarTarifaEspecial(op: Operacion){
    
    this.categoriaMonto = typeof this.ultimaTarifa.tarifaEspecial.valor === 'number'? this.ultimaTarifa.tarifaEspecial.valor : 0,
    this.total = typeof this.ultimaTarifa.tarifaEspecial.valor === 'number'? this.ultimaTarifa.tarifaEspecial.valor : 0,
    this.acompanianteMonto = 0;
    this.adicionalKmMonto = 0;
    ////console.log("pasa por aca 2°");
    
  }

  obtenerTarifaCliente(factura:FacturaOpCliente):TarifaCliente|undefined{
    let ultimaTarifa
    this.storageService.historialTarifasClientes$.subscribe(data => {
      //console.log(data);
      
      this.$tarifas = data.filter((tarifa: { idTarifaCliente: number; }) => tarifa.idTarifaCliente === factura.idTarifa);

      //console.log("Todas: ",this.$tarifas);

      // Encontrar la tarifa con el idTarifa más elevado
      ultimaTarifa = this.$tarifas[0]
      /* ultimaTarifa = this.$tarifas.reduce((tarifaMaxima: { idTarifa: number; }, tarifaActual: { idTarifa: number; }) => {
        return tarifaActual.idTarifa > tarifaMaxima.idTarifa ? tarifaActual : tarifaMaxima;
      }); */

      // Ahora, ultimaTarifa contiene la tarifa con el idTarifa más elevado
      //console.log("ultima: ", ultimaTarifa);
      
    });  

    
    
    return ultimaTarifa;
    
  }

  actualizarFacOp(factura:FacturaOpCliente, tarifa: TarifaCliente){
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
      idTarifa: this.ultimaTarifa.idTarifaCliente,
      valorJornada: this.categoriaMonto,
      adicional: this.acompanianteMonto + this.adicionalKmMonto,
      total: this.total,
      liquidacion: factura.liquidacion,
      montoFacturaChofer: factura.montoFacturaChofer,
    }
    
    //console.log("factura EDITADA FINAL: ", this.facturaCliente);
  }

}
