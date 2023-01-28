import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Cliente } from 'src/app/interfaces/cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';


@Component({
  selector: 'app-cliente-baja',
  templateUrl: './cliente-baja.component.html',
  styleUrls: ['./cliente-baja.component.scss']
})
export class ClienteBajaComponent implements OnInit {
  
  clientes$!: any;
  searchText: string = "";
  componente: string = "clientes";

  constructor(private storageService: StorageService, private router:Router){}
  
  ngOnInit(): void { 
    this.clientes$ = this.storageService.clientes$; 
  }

  eliminarCliente(cliente: Cliente){
    this.storageService.deleteItem(this.componente, cliente);
    /* this.ngOnInit(); */
    this.router.navigate(['/clientes/listado']);
  }

}
