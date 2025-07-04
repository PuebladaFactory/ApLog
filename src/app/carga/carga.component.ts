import { Component, OnInit } from '@angular/core';
import { StorageService } from '../servicios/storage/storage.service';
import { Router } from '@angular/router';
import { take } from 'rxjs';
import { Operacion } from '../interfaces/operacion';
import { ConId } from '../interfaces/conId';
import { DbFirestoreService } from '../servicios/database/db-firestore.service';

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
  constructor(private storageService: StorageService, private router: Router, private dbFirebase: DbFirestoreService){

  }
  ngOnInit(): void {    
      //console.log("pasa por aca?");      
      this.storageService.initializerAdmin()
      setTimeout(() => {
        this.storageService.setInfo("ruta", ["op"])
        this.router.navigate(['raiz']);
      }, 3000); // 5000 milisegundos = 5 segundos 
      
      
  }   


}
