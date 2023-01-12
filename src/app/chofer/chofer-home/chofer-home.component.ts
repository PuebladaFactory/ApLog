import { Component, OnInit } from '@angular/core';
import { Chofer } from 'src/app/interfaces/chofer';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';

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

  constructor(private dbFirebase: DbFirestoreService) { }

  ngOnInit(): void {
    this.getUser();
  }

  getUser(): void {
    this.user = JSON.parse(localStorage.getItem("usuario")||`{}`)
    this.getPerfilChofer();
    this.getOpChofer();
  }

  toogleSidebar(){
    this.activo = !this.activo;
    console.log(this.activo);
  }

  getPerfilChofer(): void {
    this.dbFirebase.getByFieldValue("choferes", "idChofer", this.user.idChofer).subscribe(data => {
      this.perfil = data;
      localStorage.setItem(`perfil`, JSON.stringify(data))
      console.log("este es el perfil del chofer: ",this.perfil);
    })
  }

  getOpChofer(): void {
    this.dbFirebase.getByFieldValue("operaciones", "chofer.idChofer", this.user.idChofer).subscribe(data => {
      this.opChofer = data;
      localStorage.setItem(`opChofer`, JSON.stringify(data))
      console.log("este es la operacion del chofer: ",this.opChofer);
    })
  }

  

}
