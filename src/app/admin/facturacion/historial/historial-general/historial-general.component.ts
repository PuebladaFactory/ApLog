import { Component, OnInit } from '@angular/core';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { FacturaOpProveedor } from 'src/app/interfaces/factura-op-proveedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-historial-general',
  templateUrl: './historial-general.component.html',
  styleUrls: ['./historial-general.component.scss']
})
export class HistorialGeneralComponent implements OnInit {
  
  titulo: string = "historial"
  date:any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() , 1).toISOString().split('T')[0];
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];  
  primerDiaAnio: any = new Date(this.date.getFullYear(), 0 , 1).toISOString().split('T')[0];
  ultimoDiaAnio: any = new Date(this.date.getFullYear(), 11 , 31).toISOString().split('T')[0];
  fechasConsulta: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };
  $facturasOpLiqCliente!: FacturaOpCliente [];
  $facturasOpLiqChofer!: FacturaOpChofer [];
  $facturasOpLiqProveedor!: FacturaOpProveedor [];
  consulta: string = "";
  
  constructor(private storageService: StorageService){

  }
  
  
  ngOnInit(): void {
    this.storageService.getByDateValue("facOpLiqCliente", "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "consultasFacOpLiqCliente");
    this.storageService.consultasFacOpLiqCliente$.subscribe(data => {
      this.$facturasOpLiqCliente = data;       
      //console.log()(this.$facturasOpLiqCliente)
    });

    this.storageService.getByDateValue("facOpLiqChofer", "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "consultasFacOpLiqChofer");
    this.storageService.consultasFacOpLiqChofer$.subscribe(data => {
      this.$facturasOpLiqChofer = data;      
    });

    this.storageService.getByDateValue("facOpLiqProveedor", "fecha", this.primerDiaAnio, this.ultimoDiaAnio, "consultasFacOpLiqProveedor");
    this.storageService.consultasFacOpLiqProveedor$.subscribe(data => {
      this.$facturasOpLiqProveedor = data;
    });

    this.fechasConsulta = {
      fechaDesde: this.primerDiaAnio,
      fechaHasta: this.ultimoDiaAnio,
    };
  }

  getMsg(msg: any) {  
    this.fechasConsulta = {
      fechaDesde: msg.fechaDesde,
      fechaHasta: msg.fechaHasta,
    };
  }

  changeConsulta(e: any) {    
    //console.log()(e.target.value);    
    this.consulta = e.target.value;
  }
}
