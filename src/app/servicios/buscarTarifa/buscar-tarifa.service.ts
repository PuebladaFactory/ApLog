import { Injectable } from '@angular/core';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { StorageService } from '../storage/storage.service';
import { TarifaChofer } from 'src/app/interfaces/tarifa-chofer';
import { TarifaProveedor } from 'src/app/interfaces/tarifa-proveedor';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { TarifaCliente } from 'src/app/interfaces/tarifa-cliente';

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
}
