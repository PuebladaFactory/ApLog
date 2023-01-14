import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Chofer } from 'src/app/interfaces/chofer';
import { StorageService } from 'src/app/servicios/storage/storage.service';


@Component({
  selector: 'app-choferes-baja',
  templateUrl: './choferes-baja.component.html',
  styleUrls: ['./choferes-baja.component.scss']
})
export class ChoferesBajaComponent implements OnInit {
  
  choferes$!: any;
  searchText: string = "";
  componente: string = "choferes";

  constructor(private storageService: StorageService, private router: Router){

  }
  
  ngOnInit(): void { 
    this.choferes$ = this.storageService.choferes$; 
  }

  eliminarChofer(chofer:Chofer){
    this.storageService.deleteItem(this.componente, chofer);
    this.ngOnInit();
    this.router.navigate(['/choferes/listado']);
  }

}
