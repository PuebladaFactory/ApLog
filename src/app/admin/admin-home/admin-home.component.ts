import { Component, OnInit } from '@angular/core';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';

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

  constructor(private dbFirebase: DbFirestoreService,) { }

  ngOnInit(): void {
    this.getTodo();
  }

  toogleSidebar(){
    this.activo = !this.activo;
    console.log(this.activo);
  }

  getTodo(){
    this.getClientes();
    this.getChoferes();
    this.getOperaciones();
  }

  getClientes(){
    this.dbFirebase.getAll('clientes').subscribe(data => {
      this.clientes = data;
      localStorage.setItem(`clientes`, JSON.stringify(data))
      console.log(this.clientes);
    })
  }

  getChoferes(){
    this.dbFirebase.getAll('choferes').subscribe(data => {
      this.choferes = data;
      localStorage.setItem(`choferes`, JSON.stringify(data))
      console.log(this.choferes);
    })
  }

  getOperaciones(){
    this.dbFirebase.getAll('operaciones').subscribe(data => {
      this.choferes = data;
      localStorage.setItem(`operaciones`, JSON.stringify(data))
      console.log(this.choferes);
    })
  }



}
