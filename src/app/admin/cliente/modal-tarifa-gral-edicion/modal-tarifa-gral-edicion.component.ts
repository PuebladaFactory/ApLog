import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-modal-tarifa-gral-edicion',
  templateUrl: './modal-tarifa-gral-edicion.component.html',
  styleUrls: ['./modal-tarifa-gral-edicion.component.scss']
})
export class ModalTarifaGralEdicionComponent implements OnInit {
  
  @Input() fromParent:any;
  tarifa!:TarifaGralCliente;
  componente:string = ''

  constructor(public activeModal: NgbActiveModal, private fb: FormBuilder, private storageService: StorageService){
  }
  
  ngOnInit(): void {
    //console.log(this.fromParent);
    this.tarifa = this.fromParent.item;
    console.log("tarifa: ", this.tarifa);
    if(this.fromParent.modo === "general"){
      this.componente = "tarifasGralCliente"
    } else{
      this.componente = "tarifasEspCliente"
    }
  }

  alerta(){    
      Swal.fire({
        position: "top-end",
        //icon: "success",
        //title: "Your work has been saved",
        text:"Los valores modificados de las tarifas solo aplicarán para las futuras operaciones y para las operaciones que aun no hayan sido cerradas.",
        showConfirmButton: false,
        timer: 10000
      });    
  }

    guardarCambios(){
      console.log(this.tarifa);
      this.updateItem();
    }

    ////// ACTUALIZAR OBJETO /////////
 updateItem(): void {
 
  Swal.fire({
    title: "¿Desea guardar los cambios en la tarifa?",
    //text: "You won't be able to revert this!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Guardar",
    cancelButtonText: "Cancelar"
  }).then((result) => {
    if (result.isConfirmed) {
      //////console.log("op: ", this.op);
      this.storageService.updateItem(this.componente, this.tarifa);    
      Swal.fire({
        title: "Confirmado",
        text: "La tarifa ha sido modificada.",
        icon: "success"
      }).then((result)=>{
        if (result.isConfirmed) {
          this.activeModal.close();
        }
      });   
      
    }
  });   
 
 
} 

eliminarCategoria(orden:number){  
    Swal.fire({
      title: "¿Desea borrar la categoria?",
      text: "No se podrá revertir esta acción",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        //////console.log("llamada al storage desde op-abiertas, deleteItem");
        this.tarifa.cargasGenerales.splice(orden-1,1)
        console.log("tarifa: ", this.tarifa);
        
        this.storageService.updateItem(this.componente, this.tarifa);    
        //////console.log("consultas Op: " , this.$consultasOp);
        Swal.fire({
          title: "Confirmado",
          text: "La ha sido eliminada",
          icon: "success"
        }).then((result)=>{
          if (result.isConfirmed) {
            this.activeModal.close();
          }
        });   
      }
    });       
    
  }

}
