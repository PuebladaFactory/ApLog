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
    //si el rol es "admin", llama al initializer;
    //esto se hace para q no llame al servico cuando se inicia la app y hubiera otro rol
    if(this.usuario.roles.admin){
      this.storageService.initializerAdmin();
    }    
    //this.storageService.initializer();
  }

  // muestra y oculta la barra lateral
  toogleSidebar(){
    this.activo = !this.activo;
    console.log(this.activo);
  }

}
