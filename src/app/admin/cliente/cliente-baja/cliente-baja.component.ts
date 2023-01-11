import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Cliente } from 'src/app/interfaces/cliente';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';


@Component({
  selector: 'app-cliente-baja',
  templateUrl: './cliente-baja.component.html',
  styleUrls: ['./cliente-baja.component.scss']
})
export class ClienteBajaComponent implements OnInit {
  
  clientes!: Cliente[];
  searchText: string = "";
  componente: string = "clientes";

  constructor(private dbFirebase: DbFirestoreService, private router:Router){

  }
  
  ngOnInit(): void { 
    this.leerClientes()  
  }

  leerClientes(){
    this.clientes = JSON.parse(localStorage.getItem("clientes")||`{}`)
  }

  eliminarCliente(id:any){
    this.dbFirebase.delete(this.componente, id)
      .then((data) => console.log(data))
      .then(() => this.ngOnInit())
      .then(() => this.router.navigate(['/clientes/listado']))
      .catch((e) => console.log(e.message));
  }

}
