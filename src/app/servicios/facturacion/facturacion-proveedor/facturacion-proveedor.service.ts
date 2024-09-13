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

 /*  facturarOperacion(op: Operacion)  :FacturaOpProveedor{        
    this.proveedores();    
    this.facturarOpProveedor(op);    
    return this.facturaProveedor;
  } */

  facturarOpProveedor(op: Operacion, tarifa:TarifaProveedor, proveedor:Proveedor)  :FacturaOpProveedor{        
    //this.proveedores();   
    this.ultimaTarifa = tarifa;
    this.proveedorOp = proveedor;
    this.calcularLiquidacion(op);
    this.crearFacturaProveedor(op);  
    return this.facturaProveedor;
  }

 /*  facturarOpProveedor(op: Operacion){            
    
    if(op.tarifaEspecial){
      this.facturarTarifaEspecial(op);
      ////console.log()("pasa por aca 1°");
      
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
  } */

  buscarProveedor(op:Operacion){
    let proveedor: any;
    proveedor = this.$proveedores.filter(function (proveedor:any){
      return proveedor.razonSocial === op.chofer.proveedor
    })
    //////console.log()("choferSeleccionado: ", choferSeleccionado);
    this.proveedorOp = proveedor[0];
    this.storageService.getByFieldValueLimitBuscarTarifa("tarifasProveedor", "idProveedor", this.proveedorOp.idProveedor, 1);
    ////console.log()("proveedorOp: ", this.proveedorOp);
    this.buscarTarifaProveedor(op);
  }

  buscarTarifaProveedor(op: Operacion){    
    this.storageService.historialTarifasProveedores$.subscribe(data => {
      //////console.log()("esto pasa por aca?");
      //////console.log()("data: ", data);
      
      //this.$tarifas = data.filter((tarifa: { idProveedor: number; }) => tarifa.idProveedor === this.proveedorOp.idProveedor);
      this.$tarifas = data
      //////console.log()("Todas: ",this.$tarifas);

      // Encontrar la tarifa con el idTarifa más elevado
      /* this.ultimaTarifa = this.$tarifas.reduce((tarifaMaxima: { idTarifa: number; }, tarifaActual: { idTarifa: number; }) => {
        return tarifaActual.idTarifa > tarifaMaxima.idTarifa ? tarifaActual : tarifaMaxima;
      }); */
      this.ultimaTarifa = this.$tarifas[0];
      // Ahora, ultimaTarifa contiene la tarifa con el idTarifa más elevado
      ////console.log()("ultima: ", this.ultimaTarifa);
      this.calcularLiquidacion(op);
    });  
  }

  calcularLiquidacion(op:Operacion){    
    this.$tarifaProveedor = this.ultimaTarifa
    ////console.log()("esta es la tarifa a facturar: ", this.$tarifaProveedor);
    
    if(op.tarifaEventual){
      
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
    
    /* switch (op.chofer.vehiculo.categoria) {
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

  calcularAdicional(op: Operacion, tarifa: TarifaProveedor){
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

  

/*   facturarAcompaniante(op: Operacion){
    this.acompanianteMonto = this.ultimaTarifa.adicionales.acompaniante
    ////console.log()("acompañante: ", this.acompanianteMonto);
  } */

/*   facturarAdicionalKm(op: Operacion){
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

  crearFacturaProveedor(op:Operacion){

    this.facturaProveedor = {
      id: null,
      idFacturaOpProveedor: new Date().getTime(),
      operacion: op,        
      idProveedor: this.proveedorOp.idProveedor,
      idChofer: op.chofer.idChofer,
      idTarifa: this.ultimaTarifa.idTarifa,
      fecha: op.fecha,
      valorJornada: this.categoriaMonto,
      adicional: this.acompanianteMonto + this.adicionalKmMonto,    
      total: this.total,
      liquidacion: false,
      montoFacturaCliente: 0,
    }
    ////console.log()("FACTURA PROVEEDOR: ", this.facturaProveedor);
    
    //this.altaFacturaChofer()
  }

  facturarTarifaEspecial(op: Operacion){

  
      this.categoriaMonto = op.tEventual.chofer.valor;
      this.total = op.tEventual.chofer.valor;
      this.ultimaTarifa.tarifaEspecial.valor = op.tEventual.chofer.valor;
      this.ultimaTarifa.tarifaEspecial.concepto = op.tEventual.chofer.concepto;
      this.storageService.updateItem("tarifasProveedor", this.ultimaTarifa)
        
    this.acompanianteMonto = 0;
    this.adicionalKmMonto = 0;
    //////console.log()("pasa por aca 2°");
    
  }

  obtenerTarifaProveedor(factura:FacturaOpProveedor):TarifaProveedor|undefined{
    let ultimaTarifa
    ////console.log()("factura: ", factura);
    
    this.storageService.historialTarifasProveedores$.subscribe(data => {
      ////console.log()("DATA: ", data);
      
      this.$tarifas = data.filter((tarifa: { idTarifaProveedor: number; }) => tarifa.idTarifaProveedor === factura.idTarifa);

      ////console.log()("Todas: ",this.$tarifas);

      // Encontrar la tarifa con el idTarifa más elevado
      ultimaTarifa = this.$tarifas[0]
      /* ultimaTarifa = this.$tarifas.reduce((tarifaMaxima: { idTarifa: number; }, tarifaActual: { idTarifa: number; }) => {
        return tarifaActual.idTarifa > tarifaMaxima.idTarifa ? tarifaActual : tarifaMaxima;
      }); */

      // Ahora, ultimaTarifa contiene la tarifa con el idTarifa más elevado
      ////console.log()("ultima: ", ultimaTarifa);
      
    });  

    
    
    return ultimaTarifa;
    
  }

  actualizarFacOp(factura:FacturaOpProveedor, tarifa: TarifaProveedor){
    this.ultimaTarifa = tarifa;
    this.calcularLiquidacion(factura.operacion)
    this.editarFacOpProveedor(factura);
    return this.facturaProveedor;
  }

  editarFacOpProveedor(factura:FacturaOpProveedor){
    ////console.log()("FacOpProveedor antes de EDITAR: ", factura);
    
    this.facturaProveedor = {
      id: factura.id,
      idFacturaOpProveedor: factura.idFacturaOpProveedor,
      operacion: factura.operacion,        
      fecha: factura.operacion.fecha,      
      idProveedor: factura.idProveedor,
      idChofer: factura.operacion.chofer.idChofer,      
      idTarifa: this.ultimaTarifa.idTarifa,
      valorJornada: this.categoriaMonto,
      adicional: this.acompanianteMonto + this.adicionalKmMonto,
      total: this.total,
      liquidacion: factura.liquidacion,
      montoFacturaCliente: factura.montoFacturaCliente,
    }
    
    ////console.log()("factura EDITADA FINAL: ", this.facturaProveedor);
  }



}
