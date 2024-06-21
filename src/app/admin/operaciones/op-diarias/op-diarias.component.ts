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
  tarifaEspecial: boolean = false;
  fechasConsulta: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };

  constructor() {}

  ngOnInit(): void {}

  getMsg(msg: any) {
    this.btnConsulta = true;
    console.log(msg);
    this.fechasConsulta = {
      fechaDesde: msg.fechaDesde,
      fechaHasta: msg.fechaHasta,
    }

  }

  getMsgAlta(msg: any) {

    this.tarifaEspecial = msg;
  }
  
}
