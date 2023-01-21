import { Component, OnInit } from '@angular/core';
import { Operacion } from 'src/app/interfaces/operacion';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-chofer-historial',
  templateUrl: './chofer-historial.component.html',
  styleUrls: ['./chofer-historial.component.scss']
})
export class ChoferHistorialComponent  implements OnInit  {
   
  public show: boolean = false;
  public buttonName: any = 'Consultar Operaciones';
  consultasOp$!:any;  
  btnConsulta:boolean = false;
  detalleOp!: Operacion;
  opCerradas$!:any;
  componente: string = "operacionesCerradas";
  date:any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth(), 1).toISOString().split('T')[0];
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];
  searchText: string = "";
  titulo: string = "Operaciones";
  fechaConsultaDesde:any;
  fechaConsultaHasta:any;

  constructor(private storageService: StorageService){
  }
  
  ngOnInit(): void {
    this.opCerradas$ = this.storageService.opCerradas$  
    this.consultaMes() 
  }

  seleccionarOp(op:Operacion){
    this.detalleOp = op;
  }

  toggle() {
    this.show = !this.show;
    // Change the name of the button.
    if (this.show) this.buttonName = 'Cerrar';
    else this.buttonName = 'Consultar Operaciones';
  }

   consultaMes(){          
    this.storageService.getByDateValue("operacionesCerradas", "fecha", this.primerDia, this.ultimoDia, this.titulo);             
  }

  getMsg(msg: any) {
    
    this.fechaConsultaDesde = msg.fechaDesde;
    this.fechaConsultaHasta = msg.fechaHasta;
    this.btnConsulta = true;
  } 

  

  

}
