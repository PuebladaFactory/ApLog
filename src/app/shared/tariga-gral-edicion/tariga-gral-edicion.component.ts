import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Vehiculo } from 'src/app/interfaces/chofer';
import { ConId } from 'src/app/interfaces/conId';
import { CategoriaTarifa, TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { FormatoNumericoService } from 'src/app/servicios/formato-numerico/formato-numerico.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-tariga-gral-edicion',
  templateUrl: './tariga-gral-edicion.component.html',
  styleUrls: ['./tariga-gral-edicion.component.scss']
})
export class TarigaGralEdicionComponent implements OnInit {

    @Input() fromParent:any;
    tarifa!:ConId<TarifaGralCliente>;
    tarifaOriginal!:ConId<TarifaGralCliente>;
    componente:string = '';
  
    constructor(public activeModal: NgbActiveModal, private fb: FormBuilder, private storageService: StorageService, private formNumServ: FormatoNumericoService){
    }
    
    ngOnInit(): void {
      console.log("shared: ",this.fromParent);
      this.tarifaOriginal = this.fromParent.item;    
      this.tarifa = structuredClone(this.tarifaOriginal);
      console.log("tarifa: ", this.tarifa);
      switch(this.fromParent.origen){
        case 'clientes':{
          if(this.fromParent.modo === "general"){
            this.componente = "tarifasGralCliente"
          } else{
            this.componente = "tarifasEspCliente"
          }
          break;
        };
        case 'choferes':{
          if(this.fromParent.modo === "general"){
            this.componente = "tarifasGralChofer"
          } else{
            this.componente = "tarifasEspChofer"
          }
          break;
        };
        case 'proveedores':{
          if(this.fromParent.modo === "general"){
            this.componente = "tarifasGralProveedor"
          } else{
            this.componente = "tarifasEspProveedor"
          }
          break;
        };
        default: {
          this.mensajesError("Error en el origen de la tarifa")
          break;
        }
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
  
      ////// ACTUALIZAR OBJETO /////////
   updateItem(): void {
    console.log("tarifa editada: ", this.tarifa);
    
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
        this.formatearTarifa()
        console.log("tarifa editada: ", this.tarifa);
        this.storageService.updateItem(this.componente, this.tarifa, this.tarifa.idTarifa, "EDITAR", "Edición de la tarifa");    
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
          
          this.storageService.updateItem(this.componente, this.tarifa, this.tarifa.idTarifa, "EDICIÓN", "Eliminar categoria de la tarifa");    
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
  
    formatearTarifa(){
      this.tarifa.cargasGenerales.forEach((c:CategoriaTarifa)=>{
        c.valor = this.formNumServ.convertirAValorNumerico(c.valor);
        c.adicionalKm.primerSector = this.formNumServ.convertirAValorNumerico(c.adicionalKm.primerSector);
        c.adicionalKm.sectoresSiguientes = this.formNumServ.convertirAValorNumerico(c.adicionalKm.sectoresSiguientes);
      });
      this.tarifa.adicionales.acompaniante = this.formNumServ.convertirAValorNumerico(this.tarifa.adicionales.acompaniante)
      this.tarifa.adicionales.KmDistancia.primerSector = this.formNumServ.convertirAValorNumerico(this.tarifa.adicionales.KmDistancia.primerSector);
      this.tarifa.adicionales.KmDistancia.sectoresSiguientes = this.formNumServ.convertirAValorNumerico(this.tarifa.adicionales.KmDistancia.sectoresSiguientes);
    }
  
    
   closeModal(){
    this.formatearTarifa();
    this.activeModal.close();
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
