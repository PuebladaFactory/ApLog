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
  constructor(private fb: FormBuilder, private storageService: StorageService, private dbFirebase: DbFirestoreService){

  }

  ngOnInit() {
    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;
      this.$clientesEsp = this.$clientes.filter((cliente:Cliente)=>{
        return cliente.tarifaTipo.especial === true 
      })
      console.log(this.$clientesEsp);      
    })             

  }

  changeCliente(e: any) {    
    console.log(e.target.value);    
    let id = Number(e.target.value);
    ////console.log()("1)",id);
    
    this.clienteSeleccionado = this.$clientesEsp.filter((cliente:Cliente)=>{
      ////console.log()("2", cliente.idCliente, id);
      return cliente.idCliente === id
    })
    this.tEspecial = true;
    this.idClienteEsp = id
    //this.asignarTarifa = true
    ////console.log()("este es el cliente seleccionado: ", this.clienteSeleccionado);
    //this.buscarTarifas();
  }


}
