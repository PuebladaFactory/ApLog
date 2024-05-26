import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NgbCalendar, NgbDateAdapter } from '@ng-bootstrap/ng-bootstrap';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-facturacion-consulta',
  templateUrl: './facturacion-consulta.component.html',
  styleUrls: ['./facturacion-consulta.component.scss']
})
export class FacturacionConsultaComponent implements OnInit {

  @Output() newItemEvent = new EventEmitter<any>();
  @Input() titulo!: string;
  
  
  model1!: any;
  model2!: any;
  fechasConsulta: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };
  facturacion!: any;
  //consultaFacturacion!:consultaFacturacion
  consultaFacturacion!: any;
  respuesta: boolean = true;

  constructor(private ngbCalendar: NgbCalendar, private dateAdapter: NgbDateAdapter<string>, private storageService: StorageService){

  }
  ngOnInit(): void {
    
  }

  get today() {
    return this.dateAdapter.toModel(this.ngbCalendar.getToday())!;
  }

  buscarOperaciones() {
    //console.log(this.model1); 
    //console.log(this.model2);
    this.fechasConsulta.fechaDesde = new Date(
      this.model1.year,
      this.model1.month - 1,
      this.model1.day,      
    ).toISOString().split('T')[0];
    console.log(this.fechasConsulta.fechaDesde);

    this.fechasConsulta.fechaHasta = new Date(
      this.model2.year,
      this.model2.month - 1,
      this.model2.day,      
    ).toISOString().split('T')[0];
    console.log(this.fechasConsulta.fechaHasta);

    this.consultaOperaciones(this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta);

    this.msgBack();

  }

  msgBack() {
    this.newItemEvent.emit(this.fechasConsulta);    
  }

  consultaOperaciones(fechaDesde:any, fechaHasta:any){
    if(this.titulo = "liquidacion"){
      console.log("?????????");
      
      this.storageService.getByDateValue("facturaOpChofer", "fecha", fechaDesde, fechaHasta, "consultasFacOpChofer");
    } else if(this.titulo === "facturaOpCliente") {
      this.storageService.getByDateValue("facturaOpCliente", "fecha", fechaDesde, fechaHasta, "consultasFacOpCliente");
    } else if (this.titulo === "facturaOpProveedor") {
      this.storageService.getByDateValue("facturaOpProveedor", "fecha", fechaDesde, fechaHasta, "consultasFacOpProveedor");
    } else{
      //aca deberia ir las demas consultas
      alert("error en las consultas")
    }
    
  }

}
