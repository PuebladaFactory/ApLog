import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Operacion } from 'src/app/interfaces/operacion';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-modal-baja',
    templateUrl: './baja-objeto.component.html',
    styleUrls: ['./baja-objeto.component.scss'],
    standalone: false
})
export class BajaObjetoComponent implements OnInit {
  
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
  objeto!:any;
  

  constructor(public activeModal: NgbActiveModal){}
  
  
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
          this.titulo = "Resumen de Liquidación";
          this.factura = this.fromParent.item;
          this.id = this.fromParent.item.numeroInterno;
          this.item = this.fromParent.item.tipo === "cliente" ? "Cliente" : this.fromParent.item.tipo === "chofer" ? "Chofer" : "Proveedor";
        }  
        break;
      case "Cliente": case "Chofer": case "Proveedor": case "Vendedor":{          
        this.item = this.fromParent.modo;
        this.titulo = this.fromParent.modo;
        this.objeto = this.fromParent.item;
        }
        break;
      default:
        break;  
    }
  }   
  

  async onSubmit(){
    if(this.motivoBaja !== ""){
      const respuesta = await Swal.fire({
        title: `¿Confirmar la baja?`,
        //text: "Esta acción no se podra revertir",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Confirmar",
        cancelButtonText: "Cancelar"
      })
      if(respuesta.isConfirmed){
        this.activeModal.close(this.motivoBaja)
      }
      
    } else {
      return this.mensajesError("Debe especificar un motivo para la baja")
    }
    
  }

   mensajesError(msj:string){
        Swal.fire({
          icon: "error",
          //title: "Oops...",
          text: `${msj}`
          //footer: `${msj}`
        });
      }

}
