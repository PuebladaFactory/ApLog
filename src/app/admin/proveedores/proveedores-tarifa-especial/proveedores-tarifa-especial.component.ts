import { Component, OnInit } from '@angular/core';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-proveedores-tarifa-especial',
  templateUrl: './proveedores-tarifa-especial.component.html',
  styleUrls: ['./proveedores-tarifa-especial.component.scss']
})
export class ProveedoresTarifaEspecialComponent implements OnInit {

  $choferes!: Chofer[];
  $choferesEsp! : Chofer [];
  choferSeleccionado!: Chofer[];
  proveedorSeleccionado!: Proveedor[];
  tEspecial: boolean = false;
  idChoferEsp!: number;
  $clientes!: Cliente[];
  clienteSeleccionado!: Cliente[];
  $proveedores!: Proveedor[];
  $proveedoresEsp!: Proveedor[];
  idProveedorEsp!: any;
  idClienteEsp!: any;
  consultaProveedor: any [] = [];
  consultaCliente: any [] = [];
  constructor(private storageService: StorageService){

  }

  ngOnInit() {
    //choferes todos
   /*  this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;
      console.log("1)choferes especiales: ", this.$choferesEsp);      
      this.tEspecial = false;
    })   */
    //clientes todos
    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;     
      this.$clientes = this.$clientes.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
      console.log("2)clientes: ", this.$clientes);      
      
    })          
    //proveedores todos y especiales
    this.storageService.proveedores$.subscribe(data => {
      this.$proveedores = data;      
      console.log("2)proveedores: ", this.$proveedores);      
      this.$proveedoresEsp = this.$proveedores
      .filter((p:Proveedor)=>{return p.tarifaTipo.especial === true})
      .sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
    })   

  }

  changeProveedor(e: any) {    
    console.log(e.target.value);    
    let id = Number(e.target.value);
    ////console.log()("1)",id);    
    this.proveedorSeleccionado = this.$proveedoresEsp.filter((proveedor:Proveedor)=>{
      ////console.log()("2", cliente.idCliente, id);
      return proveedor.idProveedor === id;
    })
    //this.tEspecial = true;
    this.idProveedorEsp = id 
    this.consultaProveedor.push(this.idProveedorEsp);    
    this.storageService.setInfo("proveedorSeleccionado", this.consultaProveedor);   
    this.consultaProveedor = [];
  }

  changeCliente(e: any) {    
    console.log(e.target.value);    
    let id: number;  
    ////console.log()("1)",id);
    if(e.target.value === "todos"){
      this.idClienteEsp = 0;
    } else{
      id = Number(e.target.value);
      this.clienteSeleccionado = this.$clientes.filter((cliente:Cliente)=>{
        ////console.log()("2", cliente.idCliente, id);
        return cliente.idCliente === id;
      })      
      this.idClienteEsp = id; 
      console.log("id cliente eso: ", this.idClienteEsp);
      
    }
    this.tEspecial = true;
    this.consultaCliente.push(this.idClienteEsp)
    this.storageService.setInfo("clienteSeleccionado", this.consultaCliente);
    this.consultaCliente = [];   
  }

  mostrarInfo(){
    Swal.fire({
      position: "top-end",
      //icon: "success",
      //title: "Your work has been saved",
      text:"Seleccione los clientes para los cuales quiere que la tarifa sea aplicada",
      showConfirmButton: false,
      timer: 10000
    });
  }

}
