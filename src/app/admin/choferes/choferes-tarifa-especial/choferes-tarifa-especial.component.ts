import { Component, OnInit } from '@angular/core';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-choferes-tarifa-especial',
  templateUrl: './choferes-tarifa-especial.component.html',
  styleUrls: ['./choferes-tarifa-especial.component.scss']
})
export class ChoferesTarifaEspecialComponent implements OnInit {

  $choferes!: Chofer[];
  $choferesEsp! : Chofer [];
  choferSeleccionado!: Chofer[];
  tEspecial: boolean = false;
  idChoferEsp!: number;
  $clientes!: Cliente[];
  clienteSeleccionado!: Cliente[];
  idClienteEsp!: any;
  consultaChofer: any [] = [];
  consultaCliente: any [] = [];
  constructor(private storageService: StorageService){

  }

  ngOnInit() {
    this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;
      this.$choferesEsp = this.$choferes.filter((chofer:Chofer)=>{
        return chofer.tarifaTipo.especial === true 
      })
      console.log("1)choferes especiales: ", this.$choferesEsp);      
      this.tEspecial = false;
    })             
    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;      
      console.log("2)clientes: ", this.$clientes);      
      
    })             

  }

  changeChofer(e: any) {    
    console.log(e.target.value);    
    let id = Number(e.target.value);
    ////console.log()("1)",id);    
    this.choferSeleccionado = this.$choferesEsp.filter((chofer:Chofer)=>{
      ////console.log()("2", cliente.idCliente, id);
      return chofer.idChofer === id;
    })
    //this.tEspecial = true;
    this.idChoferEsp = id 
    this.consultaChofer.push(this.idChoferEsp);    
    this.storageService.setInfo("choferSeleccionado", this.consultaChofer);   
    this.consultaChofer = [];
  }

  changeCliente(e: any) {    
    console.log(e.target.value);    
    let id: number;  
    ////console.log()("1)",id);
    if(e.target.value === "todos"){
      this.idClienteEsp = null;
    } else{
      id = Number(e.target.value);
      this.clienteSeleccionado = this.$clientes.filter((cliente:Cliente)=>{
        ////console.log()("2", cliente.idCliente, id);
        return cliente.idCliente === id;
      })      
      this.idClienteEsp = id; 
      //console.log("id cliente eso: ", this.idClienteEsp);
      
    }
    this.tEspecial = true;
    this.consultaCliente.push(this.idClienteEsp)
    this.storageService.setInfo("clienteSeleccionado", this.consultaCliente);
    this.consultaCliente = [];   
  }

}
