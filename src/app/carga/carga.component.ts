import { Component, OnInit } from '@angular/core';
import { StorageService } from '../servicios/storage/storage.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-carga',
  templateUrl: './carga.component.html',
  styleUrls: ['./carga.component.scss']
})
export class CargaComponent implements OnInit {
  
  usuario!: any;

  constructor(private storageService: StorageService, private router: Router){

  }
  ngOnInit(): void {    
      //console.log("pasa por aca?");      
      this.storageService.initializerAdmin()
      //this.router.navigate(['admin']);
      /* setTimeout(() => {
        this.storageService.getTarifasEsp()
      }, 2000); // 5000 milisegundos = 5 segundos  */
      setTimeout(() => {
        this.router.navigate(['admin']);
      }, 3000); // 5000 milisegundos = 5 segundos 
  }   

}
