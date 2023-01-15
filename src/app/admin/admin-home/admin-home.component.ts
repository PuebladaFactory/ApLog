import { Component, OnInit } from '@angular/core';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Operacion } from 'src/app/interfaces/operacion';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-admin-home',
  templateUrl: './admin-home.component.html',
  styleUrls: ['./admin-home.component.css']
})
export class AdminHomeComponent implements OnInit {

  data:any;
  activo:boolean = false;
  clientes!: Cliente[];
  choferes!: Chofer[];
  operaciones!: Operacion[];
  usuario!: any;

  constructor(private dbFirebase: DbFirestoreService, private storageService: StorageService,) { }

  ngOnInit(): void {
    this.usuario = this.storageService.loadInfo("usuario");
    console.log("esto es admin-home. usuario: ", this.usuario);
    if(this.usuario.roles.admin){
      this.storageService.initializerAdmin();
    }
    
    //this.storageService.initializer();
  }

  toogleSidebar(){
    this.activo = !this.activo;
    console.log(this.activo);
  }

}
