import { Component, HostListener, OnInit } from '@angular/core';
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
    window.addEventListener('resize', this.onResize);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
  }

  setInitialSidebarState(): void {
    this.activo = window.innerWidth >= 1600;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event:any): void {
    this.setInitialSidebarState();
  }

  toogleSidebar(): void {
    this.activo = !this.activo;   
  }

}
