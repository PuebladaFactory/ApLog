import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Operacion } from 'src/app/interfaces/operacion';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-modal-baja',
  templateUrl: './modal-baja.component.html',
  styleUrls: ['./modal-baja.component.scss']
})
export class ModalBajaComponent implements OnInit {
  
  @Input() fromParent:any
  titulo: string = "";
  op!: Operacion;
  cliente!: Cliente;
  chofer!: Chofer;
  proveedor!: Proveedor;
  fecha = new Date().toISOString().split('T')[0];;
  motivoBaja: string = ""
  

  constructor(private storageService: StorageService, private modalService: NgbModal, public activeModal: NgbActiveModal){}
  
  
  ngOnInit(): void { 
    switch(this.fromParent.modo){
      case "operaciones":{
          this.titulo = "Operación"
          this.op = this.fromParent.item
        }
        break;
      case "liquidaciones":{
          this.titulo = "Operación"
          this.op = this.fromParent.item
        }  
        break;
      default:
        break;  
    }
  }   
  

  onSubmit(){
    this.activeModal.close(this.motivoBaja)
  }

}
