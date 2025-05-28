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
      //this.router.navigate(['admin']);
      /* setTimeout(() => {
        this.storageService.getTarifasEsp()
      }, 2000); // 5000 milisegundos = 5 segundos  */
      setTimeout(() => {
        this.storageService.setInfo("ruta", ["op"])
        this.router.navigate(['admin']);
      }, 3000); // 5000 milisegundos = 5 segundos 
      
      
  }   

  buscarOp(){
    this.dbFirebase.getAll<ConId<Operacion>>("operaciones")
      .pipe(take(1))
      .subscribe(data=>{
        if(data){
          console.log("data", data);          
          this.operaciones = data;
          this.filtrarOp()
        }
      })
  }

  filtrarOp(){
    this.opFacturadas = this.operaciones.filter((op:ConId<Operacion>)=>{return op.estado.facturada})
    console.log("1)this.opFacturadas", this.opFacturadas);
    
  }

  actualizarOp(){
    this.opFacturadas.forEach((op:ConId<Operacion>)=>{
      op.estado.facChofer = false;
      op.estado.facCliente = false;
      let {id, ...opEditada} = op;
      this.dbFirebase.update("operaciones", opEditada, op.id)
    })

    console.log("2)this.opFacturadas: ", this.opFacturadas);
    
  }

}
