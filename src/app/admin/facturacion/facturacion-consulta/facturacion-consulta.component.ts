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
  @Input() consulta!: string;
  
  model1!: any;
  model2!: any;
  fechasConsulta: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };  
  //consultaFacturacion!:consultaFacturacion
  consultaFacturacion!: any;
  respuesta: boolean = true;
  liquidacion:boolean = false;
  historial:boolean = false;
  facturacion: boolean = false;

  constructor(private ngbCalendar: NgbCalendar, private dateAdapter: NgbDateAdapter<string>, private storageService: StorageService){

  }
  ngOnInit(): void {
    console.log("ngOnInit consulta, titulo", this.titulo);
    
  }

  get today() {
    return this.dateAdapter.toModel(this.ngbCalendar.getToday())!;
  }

  buscarOperaciones() {
    ////console.log()(this.model1); 
    ////console.log()(this.model2);
    this.fechasConsulta.fechaDesde = new Date(
      this.model1.year,
      this.model1.month - 1,
      this.model1.day,      
    ).toISOString().split('T')[0];
    //console.log()(this.fechasConsulta.fechaDesde);

    this.fechasConsulta.fechaHasta = new Date(
      this.model2.year,
      this.model2.month - 1,
      this.model2.day,      
    ).toISOString().split('T')[0];
    //console.log()(this.fechasConsulta.fechaHasta);

    this.consultaOperaciones(this.fechasConsulta.fechaDesde, this.fechasConsulta.fechaHasta);
    //console.log()("titulo: ", this.titulo, " desde: ", this.fechasConsulta.fechaDesde, " hasta: ",this.fechasConsulta.fechaHasta);
    
    this.msgBack();

  }

  msgBack() {
    let respuesta = {
    fecha: this.fechasConsulta,
    titulo: this.titulo,  
    }
    console.log("consulta: respuesta", respuesta);
    
    this.newItemEvent.emit(respuesta);    
  }

  consultaOperaciones(fechaDesde:any, fechaHasta:any){
    console.log("consultaOperaciones, titulo", this.titulo);
    
    if(this.titulo === "liquidacion" ){
      this.storageService.getByDateValue("facturaOpCliente", "fecha", fechaDesde, fechaHasta, "consultasFacOpCliente");
      this.storageService.getByDateValue("facturaOpChofer", "fecha", fechaDesde, fechaHasta, "consultasFacOpChofer");
      this.storageService.getByDateValue("facturaOpProveedor", "fecha", fechaDesde, fechaHasta, "consultasFacOpProveedor");
      /* switch(this.consulta){
        case "cliente":
          this.storageService.getByDateValue("facturaOpCliente", "fecha", fechaDesde, fechaHasta, "consultasFacOpCliente");
          break;
        
        case "chofer":
          this.storageService.getByDateValue("facturaOpChofer", "fecha", fechaDesde, fechaHasta, "consultasFacOpChofer");
          break;
        
        case "proveedor":
          this.storageService.getByDateValue("facturaOpProveedor", "fecha", fechaDesde, fechaHasta, "consultasFacOpProveedor");
          break;

        default:
          alert("error");
          break
      } */
    }

    if(this.titulo === "facturacion"){
      this.storageService.getByDateValue("facturaCliente", "fecha", fechaDesde, fechaHasta, "consultasFacCliente");
      this.storageService.getByDateValue("facturaChofer", "fecha", fechaDesde, fechaHasta, "consultasFacChofer");
      this.storageService.getByDateValue("facturaProveedor", "fecha", fechaDesde, fechaHasta, "consultasFacProveedor");
      /* switch(this.consulta){
        case "cliente":          
          this.storageService.getByDateValue("facturaCliente", "fecha", fechaDesde, fechaHasta, "consultasFacCliente");
          break;
        
        case "chofer":
          this.storageService.getByDateValue("facturaChofer", "fecha", fechaDesde, fechaHasta, "consultasFacChofer");
          break;
        
        case "proveedor":
          this.storageService.getByDateValue("facturaProveedor", "fecha", fechaDesde, fechaHasta, "consultasFacProveedor");
          break;

        default:
          alert("error");
          break
      } */
    }

    if(this.titulo === "historial"){
      
      switch(this.consulta){
        case "cliente":
          this.storageService.getByDateValue("facOpLiqCliente", "fecha", fechaDesde, fechaHasta, "consultasFacOpLiqCliente");
          break;
        
        case "chofer":
          this.storageService.getByDateValue("facOpLiqChofer", "fecha", fechaDesde, fechaHasta, "consultasFacOpLiqChofer");
          break;
        
        case "proveedor":
          this.storageService.getByDateValue("facOpLiqProveedor", "fecha", fechaDesde, fechaHasta, "consultasFacOpLiqProveedor");
          break;

        default:
          alert("error?????????");
          break
      }
    }
    
  }

}
