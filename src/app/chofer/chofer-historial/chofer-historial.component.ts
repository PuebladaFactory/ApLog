import { Component, OnInit } from '@angular/core';
import { Operacion } from 'src/app/interfaces/operacion';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-chofer-historial',
  templateUrl: './chofer-historial.component.html',
  styleUrls: ['./chofer-historial.component.scss']
})
export class ChoferHistorialComponent  implements OnInit  {
  
  detalleOp!: Operacion;
  opCerradas$!:any;
  componente: string = "operacionesCerradas"

  constructor(private storageService: StorageService){
  }
  
  ngOnInit(): void {
    this.opCerradas$ = this.storageService.opCerradas$   
  }

  seleccionarOp(op:Operacion){
    this.detalleOp = op;
  }

  

}
