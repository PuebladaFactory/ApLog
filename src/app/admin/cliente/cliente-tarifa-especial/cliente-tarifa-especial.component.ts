import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Cliente } from 'src/app/interfaces/cliente';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-cliente-tarifa-especial',
  templateUrl: './cliente-tarifa-especial.component.html',
  styleUrls: ['./cliente-tarifa-especial.component.scss']
})
export class ClienteTarifaEspecialComponent implements OnInit {

  $clientes!: Cliente[];
  $clientesEsp! : Cliente [];
  clienteSeleccionado!: Cliente[];
  tEspecial: boolean = false;
  idClienteEsp!: number;
  consultaCliente: any [] = [];

  constructor(private storageService: StorageService){

  }

  ngOnInit() {
    this.storageService.clientes$    
    .subscribe(data => {
      this.$clientes = data;     
      this.$clientesEsp = this.$clientes
      .filter((c:Cliente)=>{return c.tarifaTipo.especial === true})
      .sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
      //console.log(this.$clientesEsp);      
      this.tEspecial = false;
    });   
  }

  changeCliente(e: any) {    
    //console.log(e.target.value);    
    let id = Number(e.target.value);
    //////console.log()("1)",id);
    
    this.clienteSeleccionado = this.$clientesEsp.filter((cliente:Cliente)=>{
      //////console.log()("2", cliente.idCliente, id);
      return cliente.idCliente === id
    })
    this.tEspecial = true;
    this.idClienteEsp = id;
    this.consultaCliente.push(this.idClienteEsp)
    this.storageService.setInfo("clienteSeleccionado", this.consultaCliente);
    this.consultaCliente = [];   
    let tarfEsp = [];
    tarfEsp.push(this.tEspecial);
    this.storageService.setInfo("tEspecialCliente", tarfEsp);    
    tarfEsp = [];   
  
  }


}
