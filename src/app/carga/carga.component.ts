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
    
    this.usuario = this.storageService.loadInfo("usuario");
    /* if(this.usuario.roles.admin){
      //this.storageService.clearAllLocalStorage()
      console.log("llamada al storage desde carga, initializerAdmin");      
      this.storageService.initializerAdmin()
      //this.router.navigate(['admin']);
      setTimeout(() => {
        this.router.navigate(['admin']);
      }, 3000); // 5000 milisegundos = 5 segundos 
    }     */
      this.storageService.initializerAdmin()
      //this.router.navigate(['admin']);
      setTimeout(() => {
        this.router.navigate(['admin']);
      }, 3000); // 5000 milisegundos = 5 segundos 
  }  
 

}
