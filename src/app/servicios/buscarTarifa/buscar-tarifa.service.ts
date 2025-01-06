import { Injectable } from '@angular/core';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { StorageService } from '../storage/storage.service';


import { Proveedor } from 'src/app/interfaces/proveedor';

import { Operacion } from 'src/app/interfaces/operacion';

import { DbFirestoreService } from '../database/db-firestore.service';
import { CategoriaTarifa, TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';



@Injectable({
  providedIn: 'root'
})
export class BuscarTarifaService {
//Este es el que va
  
  $proveedores!: Proveedor[]  ;
  $choferes!: any;
  $clientes!: any;
  choferBoolean!: boolean;
  clienteBoolean!: boolean;
  ultTarifaEspProveedor!: TarifaGralCliente;
  

  ngOnInit(): void {   
    /* this.storageService.historialTarifas$.subscribe(data => {
      this.$tarifasChoferes = data;
    });
    this.storageService.historialTarifasProveedores$.subscribe(data => {
      this.$tarifasProveedores = data;
    });
    this.storageService.historialTarifasClientes$.subscribe(data => {
      this.$tarifasClientes = data;
    });   
    */
    
  }

  constructor(private storageService:StorageService, private dbFirebase: DbFirestoreService) { }


    buscarTarifaChoferCliente(chofer:Chofer, cliente: Cliente) {
    this.choferBoolean = false;
    this.clienteBoolean = false;
  
    this.verificarChofer(chofer, cliente);
  }

  verificarChofer(chofer:Chofer, cliente: Cliente){
    this.dbFirebase.existeTarifa("tarifasChofer", chofer.idChofer, "idChofer").subscribe(existe => {
      if (existe) {
        this.choferBoolean = true; 
        console.log('El chofer tiene tarifas guardadas.');  
        this.verificarCliente(cliente);     
      } else {
        this.choferBoolean = false;
        console.log('El chofer no tiene tarifas guardadas.');
        this.verificarCliente(cliente);
      }
    });
  }

  verificarCliente(cliente: Cliente){
    this.dbFirebase.existeTarifa("tarifasCliente", cliente.idCliente, "idCliente").subscribe(existe => {
      if (existe) {
        this.clienteBoolean = true;     
        console.log('El cliente tiene tarifas guardadas.');   
        this.guardarObservable()
      } else {
        this.clienteBoolean = false;
        console.log('El chofer no tiene tarifas guardadas.');
        this.guardarObservable()
      }
    });
  }

  buscarTarifaProveedorCliente(proveedor:Proveedor, cliente: Cliente) {
    this.choferBoolean = false;
    this.clienteBoolean = false;
    this.verificarProveedor(proveedor, cliente);
  }

  verificarProveedor(proveedor:Proveedor, cliente: Cliente){
    this.dbFirebase.existeTarifa("tarifasProveedor", proveedor.idProveedor, "idProveedor").subscribe(existe => {
      if (existe) {
        this.choferBoolean = true; 
        console.log('El proveedor tiene tarifas guardadas.');  
        this.verificarCliente(cliente);     
      } else {
        this.choferBoolean = false;
        console.log('El proveedor no tiene tarifas guardadas.');
        this.verificarCliente(cliente);
      }
    });
  }
  


  guardarObservable(){
    //console.log("4)", this.choferBoolean,this.clienteBoolean,);
    let array: any[] = [];	
    let respuesta = {
      chofer: this.choferBoolean,
      cliente: this.clienteBoolean,
    }
    array.push(respuesta);
    //console.log("5)", array);  
    this.storageService.setInfo("erroresTarifas", array);  
    
  }

  buscarIdTarifa(){
    let facOpChoferes: any
    facOpChoferes = this.storageService.loadInfo("facOpLiqChofer")
    //console.log("1)factura Op chofer", facOpChoferes);
    return facOpChoferes[0].idTarifa;
  }
  
  /* buscarTarifaChofer() :TarifaChofer{
    //let facuraChofer: FacturaOpChofer [] = []
    //let tarifaAplicada : TarifaChofer [] = [];
    //let facOpChoferes : FacturaOpChofer [] = []; 
    
     
      let tarifaAplicada: any;
      
      //console.log("5) tarifas chofer: ",tarifaAplicada);    
      setTimeout(() => {
      tarifaAplicada = this.storageService.loadInfo("tarifasChofer"); 
        
      }, 1000); // 5000 milisegundos = 5 segundos 
      

    
    return tarifaAplicada[0];
    
  } */

 /*  buscarTarifaProveedor(operacion:Operacion) :TarifaProveedor{
    let facuraProveedor: FacturaOpProveedor [] = []
    let tarifaAplicada : TarifaProveedor [] = [];
    let facOpProveedores : FacturaOpProveedor [] = [];
    
    
    this.storageService.consultasFacOpLiqProveedor$.subscribe(data =>{
      ////console.log("1) data op proveedores: ",data);
      facOpProveedores = data;
      ////console.log("facuras op choferes: ",facOpChoferes);
      
      facuraProveedor = facOpProveedores.filter((factura : FacturaOpProveedor)=>{
        ////console.log(factura.operacion.idOperacion, operacion.idOperacion);        
        return factura.operacion.idOperacion === operacion.idOperacion
      });
      ////console.log("2) factura proveedor: ", facuraProveedor);      
      
      this.storageService.historialTarifasProveedores$.subscribe(data =>{
        this.$tarifasProveedores = data;
        ////console.log("3) tarifas proveedores: ",this.$tarifasChoferes);
        tarifaAplicada = this.$tarifasProveedores.filter((tarifa:TarifaProveedor) =>{
          return tarifa.idTarifa === facuraProveedor[0].idTarifa;
        })        
    })          
    })    
    ////console.log("4) tarifas proveedor: ",tarifaAplicada[0]);    
    return tarifaAplicada[0];
  } */

 /*  buscarCategoriaProveedor(tarifa: TarifaProveedor, categoria: string):number{
    switch (categoria) {
      case "mini":
        return tarifa.cargasGenerales.utilitario;        

      case "maxi":
        return tarifa.cargasGenerales.furgon;
      
      case "furgon grande":
        return tarifa.cargasGenerales.furgonGrande;

      case "camión liviano":
        return tarifa.cargasGenerales.chasisLiviano;

      case "chasis":
        return tarifa.cargasGenerales.chasis;

      case "balancin":
        return tarifa.cargasGenerales.balancin;
        
      case "semi remolque local":
        return tarifa.cargasGenerales.semiRemolqueLocal;

      case "portacontenedores":
        return tarifa.cargasGenerales.portacontenedores;
    
      default:
        return 0;
  }
} */


/* buscarCategoriaCliente(tarifa: TarifaCliente, categoria: string):number{
  switch (categoria) {
    case "mini":
      return tarifa.cargasGenerales.utilitario;        

    case "maxi":
      return tarifa.cargasGenerales.furgon;
    
    case "furgon grande":
      return tarifa.cargasGenerales.furgonGrande;

    case "camión liviano":
      return tarifa.cargasGenerales.chasisLiviano;

    case "chasis":
      return tarifa.cargasGenerales.chasis;

    case "balancin":
      return tarifa.cargasGenerales.balancin;
      
    case "semi remolque local":
      return tarifa.cargasGenerales.semiRemolqueLocal;

    case "portacontenedores":
      return tarifa.cargasGenerales.portacontenedores;
  
    default:
      return 0;
}
} */

  /* buscarTarifaClienteId():TarifaCliente{
    //let tarifaAplicada : TarifaCliente [] = [];
    ////console.log("1S) tarifas clientes: ",this.$tarifasClientes[0]);
    let tarifaAplicada: any;
    this.storageService.historialTarifasClientes$.subscribe(data => {
      this.$tarifasClientes = data;
      tarifaAplicada = this.$tarifasClientes[0];  
    }); 
    
      console.log("1) tarifa aplicada", tarifaAplicada);
      return tarifaAplicada[0];
 
  
//    return tarifaAplicada[0];
  } */

/*   buscarTarifaChoferId(idTarifa:number):TarifaChofer{
    let tarifaAplicada : TarifaChofer [] = [];
    this.storageService.historialTarifas$.subscribe(data =>{
      this.$tarifasChoferes = data;
      ////console.log("1) tarifas choferes: ",this.$tarifasChoferes);
      tarifaAplicada = this.$tarifasChoferes.filter((tarifa:TarifaChofer)=>{
        ////console.log("2)", tarifa.idTarifa, idTarifa);        
        return tarifa.idTarifa === idTarifa  
      })      
      ////console.log("tarifas clientes: ",tarifaAplicada);    
    })
    
    ////console.log("3) tarifa chofere: ",tarifaAplicada[0]);    
    return tarifaAplicada[0];
  } */

 /*  buscarTarifaCliente(operacion:Operacion) :TarifaCliente{
    let facuraCliente: FacturaOpCliente [] = []
    let tarifaAplicada : TarifaCliente [] = [];
    let facOpClientes : FacturaOpCliente [] = [];
    ////console.log("0)", operacion);
    
    
    this.storageService.consultasFacOpLiqCliente$.subscribe(data =>{
      ////console.log("1) data op clientes: ",data);
      facOpClientes = data;
      ////console.log("facuras op clientes: ",facOpClientes);
      
      facuraCliente = facOpClientes.filter((factura : FacturaOpCliente)=>{
        ////console.log("2)", factura.operacion.idOperacion, operacion.idOperacion);        
        return factura.operacion.idOperacion === operacion.idOperacion
      });
      ////console.log("3) ", facuraCliente);      
      
      this.storageService.historialTarifasClientes$.subscribe(data =>{
        this.$tarifasClientes = data;
        ////console.log("4) tarifas clientes: ",this.$tarifasClientes);
        tarifaAplicada = this.$tarifasClientes.filter((tarifa:TarifaCliente) =>{
          ////console.log("5): ",tarifa.idTarifaCliente, facuraCliente[0].idTarifa);  
          return tarifa.idTarifa === facuraCliente[0].idTarifa;
        })
        
    })
      
     
    })
    
    ////console.log("6) tarifa cliente: ",tarifaAplicada[0]);    
    return tarifaAplicada[0];
  } */

/*   buscarTarifaProveedorId(idTarifa:number):TarifaProveedor{
    let tarifaAplicada : TarifaProveedor [] = [];
    this.storageService.historialTarifasProveedores$.subscribe(data =>{
      this.$tarifasProveedores = data;
      ////console.log("1) tarifas proveedores: ",this.$tarifasProveedores);
      tarifaAplicada = this.$tarifasProveedores.filter((tarifa:TarifaProveedor)=>{
        ////console.log("2)", tarifa.idTarifaProveedor, idTarifa);        
        return tarifa.idTarifa === idTarifa  
      })      
      ////console.log("3) tarifas proveedores: ",tarifaAplicada[0]);      
    })
    
    ////console.log("4) tarifas proveedores: ",tarifaAplicada[0]);    
    return tarifaAplicada[0];
  } */

//// METODOS PARA OBTENER ELPRIMER VALOR A COBRAR Y A PAGAR CUANDO SE DA DE ALTA LA OP ////

  $getACobrar(tarifa: TarifaGralCliente, chofer: Chofer, patente: string){
    let vehiculo
    vehiculo  = chofer.vehiculo.filter((vehiculo:Vehiculo)=>{
        return vehiculo.dominio === patente;
    });
    let categoria = vehiculo[0].categoria.catOrden
    let catCG = tarifa?.cargasGenerales?.filter((cat: CategoriaTarifa)=>{
      return cat.orden === categoria
    });
    return catCG[0].valor      
  } 

  $getAPagar(tarifa:TarifaGralCliente, chofer: Chofer, patente:string){
    let vehiculo
    vehiculo  = chofer.vehiculo.filter((vehiculo:Vehiculo)=>{
        return vehiculo.dominio === patente;
    });
    let categoria = vehiculo[0].categoria.catOrden
    let catCG = tarifa.cargasGenerales.filter((cat: CategoriaTarifa)=>{
      return cat.orden === categoria
    });
    return catCG[0].valor;      
  }   
}
