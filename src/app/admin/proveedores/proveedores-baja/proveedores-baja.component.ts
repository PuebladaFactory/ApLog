import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-proveedores-baja',
  templateUrl: './proveedores-baja.component.html',
  styleUrls: ['./proveedores-baja.component.scss']
})
export class ProveedoresBajaComponent implements OnInit{
  
  proveedores$!: any;
  searchText: string = "";
  componente: string = "proveedores";

  constructor(private storageService: StorageService, private router:Router){}
  
  ngOnInit(): void { 
    this.proveedores$ = this.storageService.proveedores$; 
  }

  eliminarProveedor(proveedor: Proveedor){
    this.storageService.deleteItem(this.componente, proveedor);
    /* this.ngOnInit(); */
    this.router.navigate(['/proveedores/listado']);
  }

}
