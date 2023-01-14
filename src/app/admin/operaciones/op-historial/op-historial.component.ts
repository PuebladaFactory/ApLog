import { Component, OnInit } from '@angular/core';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Operacion } from 'src/app/interfaces/operacion';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-op-historial',
  templateUrl: './op-historial.component.html',
  styleUrls: ['./op-historial.component.scss']
})
export class OpHistorialComponent implements OnInit {
  
  //operaciones$: any;  
  clientes$: any;
  choferes$: any;
  detalleOp!: Operacion;
  opCerradas$!:any;
  componente: string = "operaciones"

  constructor(private storageService: StorageService) {    
   }
  
  ngOnInit(): void { 
    this.choferes$ = this.storageService.choferes$; 
    this.clientes$ = this.storageService.clientes$; 
    //this.operaciones$ = this.storageService.operaciones$;    
    this.opCerradas$ = this.storageService.opCerradas$
    this.getOperacionesCerradas();
  }

  getOperacionesCerradas(){
    this.storageService.getByFieldValue(this.componente, "estado", 0)
    console.log("estas son las operaciones cerradas: ", this.opCerradas$.source._value);
    
  }

  seleccionarOp(op:Operacion){
    this.detalleOp = op;
  }

}
