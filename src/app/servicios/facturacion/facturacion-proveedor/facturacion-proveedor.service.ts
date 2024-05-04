import { Injectable } from '@angular/core';
import { FacturaOpProveedor } from 'src/app/interfaces/factura-op-proveedor';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { CargasGenerales, TarifaProveedor } from 'src/app/interfaces/tarifa-proveedor';
import { StorageService } from '../../storage/storage.service';
import { Operacion } from 'src/app/interfaces/operacion';
import { Vehiculo } from 'src/app/interfaces/chofer';

@Injectable({
  providedIn: 'root'
})
export class FacturacionProveedorService {
  
  facturaProveedor!:FacturaOpProveedor;
  total!:number;
  $adicional!:number ;
  $tarifas!: any;
  ultimaTarifa!: TarifaProveedor;  
  $proveedores!: Proveedor[];
  proveedorOp!: Proveedor;
  $tarifaProveedor!:TarifaProveedor;
  categoriaMonto!: number;
  acompanianteMonto!: number;
  adicionalKmMonto!: number;


  constructor(private storageService: StorageService) { }

  proveedores(){
    this.storageService.proveedores$.subscribe(data => {
      this.$proveedores = data;
    });
  }

  facturarOperacion(op: Operacion)  :FacturaOpProveedor{        
    this.proveedores();    
    this.facturarOpProveedor(op);    
    return this.facturaProveedor;
  }

  facturarOpProveedor(op: Operacion){            
    this.buscarProveedor(op);    
    if(op.tarifaEspecial){
      this.facturarTarifaEspecial(op);
      console.log("pasa por aca 1°");
      
    } else{
      this.facturarCG(op);

      if(op.acompaniante){
        this.facturarAcompaniante(op);
      }else{
        this.acompanianteMonto = 0
      }    
      this.facturarAdicionalKm(op);
    }

    this.crearFacturaProveedor(op);
  }

  buscarProveedor(op:Operacion){
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
      //console.log("esto pasa por aca?");
      //console.log("data: ", data);
      
      this.$tarifas = data.filter((tarifa: { idProveedor: number; }) => tarifa.idProveedor === this.proveedorOp.idProveedor);

      //console.log("Todas: ",this.$tarifas);

      // Encontrar la tarifa con el idTarifa más elevado
      this.ultimaTarifa = this.$tarifas.reduce((tarifaMaxima: { idTarifa: number; }, tarifaActual: { idTarifa: number; }) => {
        return tarifaActual.idTarifa > tarifaMaxima.idTarifa ? tarifaActual : tarifaMaxima;
      });

      // Ahora, ultimaTarifa contiene la tarifa con el idTarifa más elevado
      console.log("ultima: ", this.ultimaTarifa);
     
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

 

  facturarAcompaniante(op: Operacion){
    this.acompanianteMonto = this.ultimaTarifa.adicionales.acompaniante
    console.log("acompañante: ", this.acompanianteMonto);
  }

  facturarAdicionalKm(op: Operacion){
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
        //console.log("secciones: ", secciones);
        secciones = Math.floor(secciones);

        if(((op.km - (this.ultimaTarifa.adicionales.adicionalKm.primerSector.distancia + this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.intervalo)) % this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.intervalo) === 0){
          //alert("cuenta redonda");
          this.adicionalKmMonto = this.ultimaTarifa.adicionales.adicionalKm.primerSector.valor + this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.valor*secciones;
          console.log("adicional KM: ", this.adicionalKmMonto);           

        } else{
          //alert("con resto");
          this.adicionalKmMonto = this.ultimaTarifa.adicionales.adicionalKm.primerSector.valor + ((this.ultimaTarifa.adicionales.adicionalKm.sectoresSiguientes.valor)*(secciones+1));
          console.log("adicional KM: ", this.adicionalKmMonto);
        }         
      }  
    }
    
  }

  crearFacturaProveedor(op:Operacion){

    this.facturaProveedor = {
      id: null,
      idFacturaOpProveedor: new Date().getTime(),
      operacion: op,        
      idProveedor: this.proveedorOp.idProveedor,
      idChofer: op.chofer.idChofer,
      fecha: op.fecha,
      valorJornada: this.categoriaMonto,
      adicional: this.acompanianteMonto + this.adicionalKmMonto,    
      total: this.categoriaMonto + (this.acompanianteMonto + this.adicionalKmMonto),
      liquidacion: false,
      montoFacturaCliente: 0,
    }
    console.log("FACTURA PROVEEDOR: ", this.facturaProveedor);
    
    //this.altaFacturaChofer()
  }

  facturarTarifaEspecial(op: Operacion){
    
    this.categoriaMonto = this.ultimaTarifa.tarifaEspecial.valor;
    this.acompanianteMonto = 0;
    this.adicionalKmMonto = 0;
    console.log("pasa por aca 2°");
    
  }



}
