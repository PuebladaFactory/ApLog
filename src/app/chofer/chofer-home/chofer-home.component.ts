import { Component, OnInit } from '@angular/core';
import { Chofer } from 'src/app/interfaces/chofer';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-chofer-home',
  templateUrl: './chofer-home.component.html',
  styleUrls: ['./chofer-home.component.css']
})
export class ChoferHomeComponent implements OnInit {

  activo:boolean = false;
  user:any;
  perfil!: any;
  opChofer:any;

  constructor(private dbFirebase: DbFirestoreService, private storageService: StorageService) { }

  ngOnInit(): void {
    this.getUser();
  }

  getUser(): void {
    this.user = this.storageService.loadInfo("usuario");
    //console.log("esto es chofer-home. usuario: ", this.user);

    //si el rol es "user", llama al initializer;
    //esto se hace para q no llame al servico cuando se inicia la app y hubiera otro rol
    if(this.user.roles.user){
      this.storageService.initializerUser(this.user.idChofer);
    }
  }

  // muestra y oculta la barra lateral
  toogleSidebar(){
    this.activo = !this.activo;
    //console.log(this.activo);
  }
}
