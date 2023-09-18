import { Component, OnInit } from '@angular/core';
import { Operacion } from 'src/app/interfaces/operacion';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-op-cerradas',
  templateUrl: './op-cerradas.component.html',
  styleUrls: ['./op-cerradas.component.scss']
})
export class OpCerradasComponent implements OnInit {
  
  detalleOp!: Operacion;  
  componente: string = "operacionesCerradas";
  public show: boolean = false;
  public buttonName: any = 'Consultar Operaciones';
  consultasOp$!:any;
  titulo: string = "consultasOpCerradas";
  btnConsulta:boolean = false;
  date:any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() , 1).toISOString().split('T')[0];
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];
  searchText: string = "";
  $opCerradas!: Operacion [];  
  opCerrada!: Operacion;

  constructor(private storageService: StorageService) {}
  
  ngOnInit(): void { 
    this.storageService.consultasOpCerradas$.subscribe(data=>{
      this.$opCerradas = data;
    })  
    this.consultaMes();   
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
    if(!this.btnConsulta){   
      console.log(this.primerDia, this.ultimoDia)         
      this.storageService.getByDateValue("operacionesActivas", "fecha", this.primerDia, this.ultimoDia, this.titulo);    
    }     
  }

  getMsg(msg: any) {
    this.btnConsulta = true;
  }

  mostrarRemito(documentacion:string){ 
    //aca leeria de la db para buscar el remito
    alert("aca iria la imagen")
  }

  
}
