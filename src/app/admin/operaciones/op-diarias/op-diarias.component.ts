import { Component, OnInit, } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from 'src/app/servicios/storage/storage.service';

import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-op-diarias',
  templateUrl: './op-diarias.component.html',
  styleUrls: ['./op-diarias.component.scss'],
  //providers: [NgbActiveModal]
})
export class OpDiariasComponent implements OnInit {
  
  private modalRef!: NgbModalRef;

  componente:string = "operacionesActivas"  
  public buttonName: any = 'Consultar Operaciones';  
  public buttonNameAlta: any = 'Alta de Operación';  
  public buttonNameManual: any = 'Carga Manual';  
  titulo: string = "operacionesActivas"
  btnConsulta:boolean = false;  
  tarifaEventual: boolean = false;
  tarifaPersonalizada: boolean = false;
  vehiculosChofer:boolean = false;
  fechasConsulta: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };

  constructor(private storageService: StorageService) {}

  ngOnInit(): void {
    this.storageService.opTarEve$.subscribe(data=>{
      let datos = data
      this.tarifaEventual = datos[0];
      console.log("tarifa eventual: ", this.tarifaEventual);
      
    });
    this.storageService.opTarPers$.subscribe(data=>{
      let datos = data
      this.tarifaPersonalizada = datos[0];
      console.log("tarifa personalizada: ", this.tarifaPersonalizada);
    });
    this.storageService.vehiculosChofer$.subscribe(data=>{
      let datos = data
      this.vehiculosChofer = datos[0];
      console.log("vehiculos chofer: ", this.vehiculosChofer);
    })
  }

  getMsg(msg: any) {
    this.btnConsulta = true;
    console.log(msg);
    this.fechasConsulta = {
      fechaDesde: msg.fechaDesde,
      fechaHasta: msg.fechaHasta,
    }

  }

  
}
