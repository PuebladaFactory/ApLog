import { Component, OnInit } from '@angular/core';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Operacion } from 'src/app/interfaces/operacion';

@Component({
  selector: 'app-op-historial',
  templateUrl: './op-historial.component.html',
  styleUrls: ['./op-historial.component.scss']
})
export class OpHistorialComponent implements OnInit {
  
  operaciones!: Operacion[];  
  clientes!: Cliente[];
  choferes!: Chofer[];
  detalleOp!: Operacion;

  constructor() {    
   }
  
  ngOnInit(): void { 
    this.getOperacionesCerradas();
  }

  getOperacionesCerradas(){
    this.operaciones = JSON.parse(localStorage.getItem("operaciones")||`{}`)
    this.operaciones = this.operaciones.filter(function(op:Operacion){
      return op.estado === 0
    })
    console.log("estas son las operaciones cerradas: ", this.operaciones);
    
  }

  seleccionarOp(op:Operacion){
    this.detalleOp = op;
  }

}
