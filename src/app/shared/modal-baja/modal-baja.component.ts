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
  motivoBaja: string = "";
  factura!: any;
  id:number = 0;
  item:string = "";
  

  constructor(private storageService: StorageService, private modalService: NgbModal, public activeModal: NgbActiveModal){}
  
  
  ngOnInit(): void { 
    console.log("this.fromParent", this.fromParent);
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
      case "facturacion":{
          this.titulo = "Factura"
          this.factura = this.fromParent.item
          this.id = this.fromParent.tipo === "clientes" ? this.factura.idFacturaCliente : this.fromParent.tipo === "choferes" ? this.factura.idFacturaChofer : this.factura.idFacturaProveedor
          this.item = this.fromParent.tipo === "clientes" ? "Cliente" : this.fromParent.tipo === "choferes" ? "Chofer" : "Proveedor"
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
