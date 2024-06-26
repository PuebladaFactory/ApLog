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

  
  activo!:boolean
  

  constructor() { }

  ngOnInit(): void {
    this.setInitialSidebarState();
  }

  setInitialSidebarState(): void {
    const screenWidth = window.innerWidth;
    this.activo = screenWidth >= 1200; // Por ejemplo, 768px como breakpoint para resoluciones altas
  }

  toogleSidebar(): void {
    this.activo = !this.activo;   
  }

}
