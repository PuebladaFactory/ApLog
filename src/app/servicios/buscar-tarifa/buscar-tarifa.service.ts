import { Injectable } from '@angular/core';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { StorageService } from '../storage/storage.service';
import { TarifaChofer } from 'src/app/interfaces/tarifa-chofer';
import { TarifaProveedor } from 'src/app/interfaces/tarifa-proveedor';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { TarifaCliente } from 'src/app/interfaces/tarifa-cliente';
import { Operacion } from 'src/app/interfaces/operacion';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { FacturaOpProveedor } from 'src/app/interfaces/factura-op-proveedor';

@Injectable({
  providedIn: 'root'
})
export class BuscarTarifaService {

  $tarifasChoferes: TarifaChofer [] = [];
  $tarifasClientes: TarifaCliente [] = []; 
  $tarifasProveedores: TarifaProveedor [] = [];
  $proveedor!: any  ;
  $choferes!: any;
  $clientes!: any;

  ngOnInit(): void {   
    this.storageService.historialTarifas$.subscribe(data => {
      this.$tarifasChoferes = data;
    });
    this.storageService.historialTarifasProveedores$.subscribe(data => {
      this.$tarifasProveedores = data;
    });
    this.storageService.historialTarifasClientes$.subscribe(data => {
      this.$tarifasClientes = data;
    });    
    
  }

  constructor(private storageService:StorageService) { }

  buscarTarifa(chofer:Chofer, cliente: Cliente): string{
    
    this.storageService.historialTarifasClientes$.subscribe(data =>{
      this.$tarifasClientes = data;
      //console.log("tarifas choferes: ",this.$tarifasChoferes);
      let tarifasCliFiltradas = this.$tarifasClientes.filter((tarifa:TarifaCliente) =>{
        return tarifa.idCliente === cliente.idCliente;
      })
      this.$tarifasClientes = tarifasCliFiltradas;
    })
    //console.log("array de tarifas cliente filtrado: ", this.$tarifasClientes);     
    if(this.$tarifasClientes.length === 0 ){
      return "cliente"
    }
    if(chofer.proveedor !== "monotributista"){      
      this.storageService.proveedores$.subscribe(data =>{
        this.$proveedor = data;
        //console.log("razonSocial chofer: ",chofer.proveedor);        
        //console.log("proveedores todos: ",this.$proveedor);        
        
        let proveedorFiltrado = this.$proveedor.filter((proveedor:Proveedor)=>{
          return proveedor.razonSocial === chofer.proveedor
        })
        //console.log("proveedor filtrado: ", proveedorFiltrado);
              
        this.storageService.historialTarifasProveedores$.subscribe(data =>{
        this.$tarifasProveedores = data;
        //console.log("tarifas: ",this.$tarifasProveedores);
        let tarifasFiltradas = this.$tarifasProveedores.filter((tarifa:TarifaProveedor) =>{
          return tarifa.idProveedor === proveedorFiltrado[0].idProveedor;
        })
        //console.log("array de tarifas filtrado: ", tarifasFiltradas);
        this.$tarifasProveedores = tarifasFiltradas
      })
      })
      //console.log("array de tarifas filtrado2: ", this.$tarifasProveedores);
      if(this.$tarifasProveedores.length === 0 ){
        return "proveedor"
      }
      //console.log("array de tarifas filtrado2: ", this.$tarifasProveedores);
      if(this.$tarifasProveedores.length === 0 ){
        return "proveedor"
      }
    }
    if(chofer.proveedor ==="monotributista"){
      this.storageService.historialTarifas$.subscribe(data =>{
        this.$tarifasChoferes = data;
        //console.log("tarifas choferes: ",this.$tarifasChoferes);
        let tarifasChoFiltradas = this.$tarifasChoferes.filter((tarifa:TarifaChofer) =>{
          return tarifa.idChofer === chofer.idChofer;
        })
        this.$tarifasChoferes = tarifasChoFiltradas 
    })
        //console.log("array de tarifas filtrado: ", this.$tarifasChoferes);
       
        if(this.$tarifasChoferes.length === 0 ){
          return "chofer"
        }
    
    }    
    return "nada"
  }

  buscarTarifaChofer(operacion:Operacion) :TarifaChofer{
    let facuraChofer: FacturaOpChofer [] = []
    let tarifaAplicada : TarifaChofer [] = [];
    let facOpChoferes : FacturaOpChofer [] = [];
    
    
    this.storageService.consultasFacOpLiqChofer$.subscribe(data =>{
      console.log("1) data op choferes: ",data);
      facOpChoferes = data;
      //console.log("facuras op choferes: ",facOpChoferes);
      
      facuraChofer = facOpChoferes.filter((factura : FacturaOpChofer)=>{
        console.log("2)", factura.operacion.idOperacion, operacion.idOperacion);        
        return factura.operacion.idOperacion === operacion.idOperacion
      });
      console.log("3) ", facuraChofer);      
      
      this.storageService.historialTarifas$.subscribe(data =>{
        this.$tarifasChoferes = data;
        console.log("4) tarifas choferes: ",this.$tarifasChoferes);
        tarifaAplicada = this.$tarifasChoferes.filter((tarifa:TarifaChofer) =>{
          return tarifa.idTarifa === facuraChofer[0].idTarifa;
        })
        
    })
      
     
    })
    
    console.log("5) tarifas chofer: ",tarifaAplicada[0]);    
    return tarifaAplicada[0];
  }

  buscarTarifaProveedor(operacion:Operacion) :TarifaProveedor{
    let facuraProveedor: FacturaOpProveedor [] = []
    let tarifaAplicada : TarifaProveedor [] = [];
    let facOpProveedores : FacturaOpProveedor [] = [];
    
    
    this.storageService.consultasFacOpLiqProveedor$.subscribe(data =>{
      console.log("1) data op proveedores: ",data);
      facOpProveedores = data;
      //console.log("facuras op choferes: ",facOpChoferes);
      
      facuraProveedor = facOpProveedores.filter((factura : FacturaOpProveedor)=>{
        console.log(factura.operacion.idOperacion, operacion.idOperacion);        
        return factura.operacion.idOperacion === operacion.idOperacion
      });
      console.log("2) factura proveedor: ", facuraProveedor);      
      
      this.storageService.historialTarifasProveedores$.subscribe(data =>{
        this.$tarifasProveedores = data;
        console.log("3) tarifas proveedores: ",this.$tarifasChoferes);
        tarifaAplicada = this.$tarifasProveedores.filter((tarifa:TarifaProveedor) =>{
          return tarifa.idTarifaProveedor === facuraProveedor[0].idTarifa;
        })        
    })          
    })    
    console.log("4) tarifas proveedor: ",tarifaAplicada[0]);    
    return tarifaAplicada[0];
  }

  buscarTarifaCliente(idTarifa:number):TarifaCliente{
    let tarifaAplicada : TarifaCliente [] = [];
    this.storageService.historialTarifasClientes$.subscribe(data =>{
      this.$tarifasClientes = data;
      //console.log("tarifas choferes: ",this.$tarifasChoferes);
      tarifaAplicada = this.$tarifasClientes.filter((tarifa:TarifaCliente)=>{
        //console.log(tarifa.idTarifaCliente, idTarifa);        
        return tarifa.idTarifaCliente === idTarifa  
      })      
      //console.log("tarifas clientes: ",tarifaAplicada);    
    })
    
    
    return tarifaAplicada[0];
  }

  /* buscarTarifaProveedor(proveedor: Proveedor):TarifaProveedor{
    
  } */
}
