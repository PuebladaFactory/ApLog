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
   
  detalleOp!: Operacion;
  opCerradas$!:any;
  componente: string = "operacionesCerradas"

  constructor(private storageService: StorageService) {    
   }
  
  ngOnInit(): void { 
    this.opCerradas$ = this.storageService.opCerradas$    
  }
  

  seleccionarOp(op:Operacion){
    this.detalleOp = op;
  }

}
