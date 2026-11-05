import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-carga',
    templateUrl: './carga.component.html',
    styleUrls: ['./carga.component.scss'],
    standalone: false
})
export class CargaComponent implements OnInit {
  
  constructor(private router: Router){

  }
  ngOnInit(): void {    
      //console.log("pasa por aca?");      
      setTimeout(() => {
        this.router.navigate(['op']);
      }, 3000); // 3000 milisegundos = 3 segundos
      
      
  }   
  


}
