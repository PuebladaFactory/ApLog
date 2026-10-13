import { Component, OnInit } from '@angular/core';
import { StorageService } from '../servicios/storage/storage.service';
import { Router } from '@angular/router';
import { Operacion } from '../interfaces/operacion';
import { ConId } from '../interfaces/conId';

@Component({
    selector: 'app-carga',
    templateUrl: './carga.component.html',
    styleUrls: ['./carga.component.scss'],
    standalone: false
})
export class CargaComponent implements OnInit {
  
  usuario!: any;
  operaciones!: ConId<Operacion>[];
  opFacturadas!: ConId<Operacion>[];
  constructor(private storageService: StorageService, private router: Router){

  }
  ngOnInit(): void {    
      //console.log("pasa por aca?");      
      this.storageService.initializerAdmin()
      setTimeout(() => {
        this.storageService.setInfo("ruta", ["op"])
        this.router.navigate(['op']);
      }, 3000); // 5000 milisegundos = 5 segundos 
      
      
  }   
  


}
