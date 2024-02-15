import { Injectable } from '@angular/core';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { StorageService } from '../../storage/storage.service';
import { DbFirestoreService } from '../../database/db-firestore.service';
import { Operacion } from 'src/app/interfaces/operacion';
import { TarifaCliente } from 'src/app/interfaces/tarifa-cliente';
import { Cliente } from 'src/app/interfaces/cliente';
import { Proveedor } from 'src/app/interfaces/proveedor';

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

  constructor(private storageService: StorageService ) { }

  clientes(){
    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;
    });
  }

  facturarOperacion(op: Operacion)  :FacturaOpCliente{        
    this.clientes();    
    this.facturarOpCliente(op);
    return this.facturaCliente
  }

  facturarOpCliente(op:Operacion){
    this.buscarCliente(op);   
    if(!op.unidadesConFrio){
      this.facturarCG(op);
    } else {
      this.facturarUcF(op);
    }
    if(op.acompaniante){
      this.facturarAcompaniante(op);
    }else{
      this.acompanianteMonto = 0
    }    
    this.facturarAdicionalKm(op);
    



    this.crearFacturaCliente(op);

  }

  buscarCliente(op: Operacion){
    let opCliente: any;
    opCliente = this.$clientes.filter(function (cliente:any){
      return cliente.idCliente === op.cliente.idCliente;
    })
    //console.log("choferSeleccionado: ", choferSeleccionado);
    this.clienteOp = opCliente[0];
    console.log("clienteOp: ", this.clienteOp);
    this.buscarTarifa(op);
  }

  buscarTarifa(op: Operacion){    
    this.storageService.historialTarifasClientes$.subscribe(data => {
      this.$tarifas = data.filter((tarifa: { idCliente: number; }) => tarifa.idCliente === this.clienteOp.idCliente);

      console.log("data Todas: ",this.$tarifas);

      // Encontrar la tarifa con el idTarifa más elevado
      this.ultimaTarifa = this.$tarifas.reduce((tarifaMaxima: TarifaCliente, tarifaActual: TarifaCliente) => {
        return tarifaActual.idTarifaCliente > tarifaMaxima.idTarifaCliente ? tarifaActual : tarifaMaxima;
      }); 

      // Ahora, tarifaMasElevada contiene la tarifa con el idTarifa más elevado
      console.log("ultima: ", this.ultimaTarifa);
      //this.calcularLiquidacion(op);
    });  
  }

  facturarCG(op: Operacion){
    console.log("cargas generales");
    
    switch (op.chofer.vehiculo.categoria) {
      case "mini":
        this.categoriaMonto = this.ultimaTarifa.cargasGenerales.utilitario
        break;

      case "maxi":
        this.categoriaMonto = this.ultimaTarifa.cargasGenerales.furgon
      break;

      case "camion":
        this.categoriaMonto = this.ultimaTarifa.cargasGenerales.camionLiviano
      break;

      case "chasis":
        this.categoriaMonto = this.ultimaTarifa.cargasGenerales.chasis
      break;

      case "balancin":
        this.categoriaMonto = this.ultimaTarifa.cargasGenerales.balancin
      break;

      case "semiRemolqueLocal":
        this.categoriaMonto = this.ultimaTarifa.cargasGenerales.semiRemolqueLocal
      break;
    
      default:
        alert("error categoria CG")
        break;
    }
  }

  facturarUcF(op: Operacion){
    console.log("Unidades con frio");
    switch (op.chofer.vehiculo.categoria) {
      case "mini":
        this.categoriaMonto = this.ultimaTarifa.unidadesConFrio.utilitario
        break;

      case "maxi":
        this.categoriaMonto = this.ultimaTarifa.unidadesConFrio.furgon
      break;

      case "camion":
        this.categoriaMonto = this.ultimaTarifa.unidadesConFrio.camionLiviano
      break;

      case "chasis":
        this.categoriaMonto = this.ultimaTarifa.unidadesConFrio.chasis
      break;

      case "balancin":
        this.categoriaMonto = this.ultimaTarifa.unidadesConFrio.balancin
      break;

      case "semiRemolqueLocal":
        this.categoriaMonto = this.ultimaTarifa.unidadesConFrio.semiRemolqueLocal
      break;
    
      default:
        alert("error categoria UcF")
        break;
    } 
  }

  facturarAcompaniante(op: Operacion){
    this.acompanianteMonto = this.ultimaTarifa.adicionales.acompaniante
    console.log("acompañante: ", this.acompanianteMonto);
  }

  facturarAdicionalKm(op: Operacion){
    if(op.km !== null){
      if(op.km < 80){
        this.adicionalKmMonto = 0;
      } else if (op.km < 151) {
        this.adicionalKmMonto = this.ultimaTarifa.adicionales.adicionalKm.primerSector
      } else{
        let resto:number;
        let secciones:number;
        
        resto = op.km - 150;
        secciones = resto / 50;
        //console.log("secciones: ", secciones);
        secciones = Math.floor(secciones);

        if(((op.km - 150) % 50) === 0){
          //alert("cuenta redonda");
          this.adicionalKmMonto = this.ultimaTarifa.adicionales.adicionalKm.primerSector + this.ultimaTarifa.adicionales.adicionalKm.sectorSiguiente*secciones;
          console.log("adicional KM: ", this.adicionalKmMonto);           

        } else{
          //alert("con resto");
          this.adicionalKmMonto = this.ultimaTarifa.adicionales.adicionalKm.primerSector + ((this.ultimaTarifa.adicionales.adicionalKm.sectorSiguiente)*(secciones+1));
          console.log("adicional KM: ", this.adicionalKmMonto);
        }         
      }  
    }
    
  }

  crearFacturaCliente(op:Operacion){

    this.facturaCliente = {
      id: null,
      idFacturaCliente: new Date().getTime(),
      operacion: op,
      idCliente: op.cliente.idCliente,
      fecha: new Date().toISOString().split('T')[0],      
      valorJornada: this.categoriaMonto,
      adicional: this.acompanianteMonto + this.adicionalKmMonto,    
      total: this.categoriaMonto + (this.acompanianteMonto + this.adicionalKmMonto),
      liquidacion: false,
    }
    //console.log(this.facturaChofer);
    
    //this.altaFacturaChofer()
  }

}
