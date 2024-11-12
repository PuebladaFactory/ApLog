import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Vehiculo } from 'src/app/interfaces/chofer';
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
    console.log(this.fromParent);
    this.tarifa = this.fromParent.item;
    if(this.fromParent.modo === "general"){
      this.componente = "tarifasGralChofer"
    } else{
      this.componente = "tarifasEspChofer"
    }
  }

  alerta(){    
      Swal.fire({
        position: "top-end",
        //icon: "success",
        //title: "Your work has been saved",
        text:"Los valores modificados de las tarifas solo aplicarán para las operaciones que aun no hayan sido cerradas y para las futuras operaciones.",
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
  //////console.log("llamada al storage desde op-alta, addItem");
  ////////console.log()("esta es la operacion: ", this.op);  
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
  //console.log("op editada: ", this.op);  
 
} 

comprobarCategoria(categoria: number): boolean {
  // Extraer el número de la categoría de la cadena de texto (asumiendo el formato "Categoria X")
  //console.log("1)",categoria);
  

  //const catNumero = parseInt(categoria.split(" ")[1], 10);

  // Lista de campos adicionales que siempre deben habilitarse/resaltarse
  

  // Verificar si la categoría extraída corresponde a alguno de los vehículos del chofer
  const esCategoriaVehiculo = this.fromParent.vehiculos?.some((vehiculo: Vehiculo) => vehiculo.categoria.catOrden === categoria);
  //console.log("2)",esCategoriaVehiculo);
  // Verificar si la categoría actual es una de las adicionales
  let esCategoriaAdicional 
  switch(categoria){
    case (this.tarifa?.cargasGenerales.length + 1):{
      esCategoriaAdicional = true;
      break;
    }
    case (this.tarifa?.cargasGenerales.length + 2):{
      esCategoriaAdicional = true;
      break;
    }
    case (this.tarifa?.cargasGenerales.length + 3):{
      esCategoriaAdicional = true;
      break;
    }
    default:{
      esCategoriaAdicional = false;
      break
    }
    
  }

  // Devolver true si es una categoría de vehículo o una categoría adicional
  return esCategoriaVehiculo || esCategoriaAdicional  ;
}

}
