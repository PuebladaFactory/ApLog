import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { AdicionalKm, TarifaChofer, TarifaEspecial } from 'src/app/interfaces/tarifa-chofer';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ModalAltaTarifaComponent } from '../modal-alta-tarifa/modal-alta-tarifa.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-choferes-tarifa',
  templateUrl: './choferes-tarifa.component.html',
  styleUrls: ['./choferes-tarifa.component.scss']
})
export class ChoferesTarifaComponent implements OnInit {
  
  componente:string = "tarifasChofer";
  $choferes:any;
  choferSeleccionado!: any;
  tarifaForm: any;
  adicionalForm: any;
  tarifa!:TarifaChofer;
  vehiculo!:Vehiculo;
  adicionalKm!:AdicionalKm;  
  chofer!: Chofer;
  historialTarifas$!: any;
  $historialTarifas!: TarifaChofer [];
  $ultimaTarifaAplicada!:any;
  $tarifasChofer:any;
  tarifaProveedor!:boolean
  tarifaEspecialForm!:any;
  
  tarifaEspecial!: TarifaEspecial;
  tarifaEditForm!:any;
  adicionalEditForm!:any;
  tarifaEspecialEditForm!:any;
  tarifaEditar!:TarifaChofer;
  asignarTarifa: boolean = false;

  constructor(private fb: FormBuilder, private storageService: StorageService, private modalService: NgbModal){
   
  this.tarifaEditForm = this.fb.group({                    //formulario para la jornada
    valorJornada: [""],            
    publicidad: [""], 
    acompaniante: [""] 
});

  this.adicionalEditForm = this.fb.group({                  //formulario para los adicionales de la jornada
    distanciaPrimerSector: [""],
    valorPrimerSector:[""],
    distanciaIntervalo:[""],
    valorIntervalo:[""],
});

this.tarifaEspecialEditForm = this.fb.group({                    //formulario para los extras de la carga general
  concepto:[""],
  valor:[""],
});
  }
  
  ngOnInit(): void {   
    this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;
    });

    this.storageService.historialTarifas$.subscribe(data => {
      this.$historialTarifas = data;
    });
    
    //this.historialTarifas$ = this.storageService.historialTarifas$;   
    this.tarifaProveedor = false;     
  }

  changeChofer(e: any) {    
    this.tarifaProveedor = false;
    let id = Number(e.target.value);
    //console.log("1)",id);
    
    this.choferSeleccionado = this.$choferes.filter((chofer:Chofer)=>{
      //console.log("2", chofer.idChofer, id);
      return chofer.idChofer === id
    })
        
   //console.log("3) este es el chofer seleccionado: ", this.choferSeleccionado);
   if(this.choferSeleccionado[0].proveedor !== "monotributista" ){
    this.tarifaProveedor = true;
   } else{
    this.asignarTarifa = true
    this.buscarTarifas();
   }
  }
 

  buscarTarifas(){
    //console.log(this.choferSeleccionado[0].idChofer);    
    this.storageService.getByFieldValue(this.componente, "idChofer", this.choferSeleccionado[0].idChofer);
    this.storageService.historialTarifas$.subscribe(data =>{
      this.$tarifasChofer = data;
      //console.log(this.$tarifasChofer);
      this.$tarifasChofer.sort((x:TarifaChofer, y:TarifaChofer) => y.idTarifa - x.idTarifa);
      //console.log(this.$tarifasChofer);
    })
 
  }
    armarAdicionalKm(){
      this.adicionalKm = {
        primerSector:{
          distancia: this.adicionalForm.value.distanciaPrimerSector,
          valor:this.adicionalForm.value.valorPrimerSector,
        },
        sectoresSiguientes:{
          intervalo:this.adicionalForm.value.distanciaIntervalo,
          valor: this.adicionalForm.value.valorIntervalo,
        },
      };     
    }

    armarTarifaespecial(){
      this.tarifaEspecial = {
        concepto: this.tarifaEspecialForm.value.concepto,
        valor: this.tarifaEspecialForm.value.valor,
      };        
    }

    editarTarifa(tarifa:TarifaChofer){
      //console.log(tarifa);
      
      this.tarifaEditar = tarifa;
      
      //console.log(this.tarifaEditar);
      this.armarTarifaEditar();      
      
    }
  
    eliminarTarifa(tarifa:TarifaChofer){
      Swal.fire({
        title: "¿Eliminar la tarifa?",
        text: "No se podrá revertir esta acción",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Confirmar",
        cancelButtonText: "Cancelar"
      }).then((result) => {
        if (result.isConfirmed) {
          this.storageService.deleteItem(this.componente, tarifa);
          Swal.fire({
            title: "Confirmado",
            text: "La tarifa ha sido borrada",
            icon: "success"
          });
        }
      });   
      
    }

    armarTarifaEditar(){
      this.tarifaEditForm.patchValue({
        valorJornada: this.tarifaEditar.valorJornada,            
        publicidad: this.tarifaEditar.publicidad,            
        acompaniante: this.tarifaEditar.acompaniante,            
      });
      this.adicionalEditForm.patchValue({
        distanciaPrimerSector: this.tarifaEditar.km.primerSector.distancia,
        valorPrimerSector:this.tarifaEditar.km.primerSector.valor,
        distanciaIntervalo:this.tarifaEditar.km.sectoresSiguientes.intervalo,
        valorIntervalo:this.tarifaEditar.km.sectoresSiguientes.valor,
      });
      this.tarifaEspecialEditForm.patchValue({
        concepto:this.tarifaEditar.tarifaEspecial?.concepto,
        valor: this.tarifaEditar.tarifaEspecial?.valor,
      });
    }

    onSubmitEdit(){
      Swal.fire({
        title: "¿Guardar los cambios?",
        text: "No se podrá revertir esta acción",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Confirmar",
        cancelButtonText: "Cancelar"
      }).then((result) => {
        if (result.isConfirmed) {
          this.armarTarifaModificada();
          Swal.fire({
            title: "Confirmado",
            text: "Los cambios se han guardado",
            icon: "success"
          });
        }
      });       
    }

    armarTarifaModificada(){
      this.tarifaEditar ={
        id:this.tarifaEditar.id,
        idTarifa:this.tarifaEditar.idTarifa,
        valorJornada: this.tarifaEditForm.value.valorJornada,
        km:{
          primerSector: {
            distancia: this.adicionalEditForm.value.distanciaPrimerSector,
            valor: this.adicionalEditForm.value.valorPrimerSector,
        },
        sectoresSiguientes:{
            intervalo: this.adicionalEditForm.value.distanciaIntervalo,
            valor: this.adicionalEditForm.value.valorIntervalo,
        }
        },
        publicidad: this.tarifaEditForm.value.publicidad,
        idChofer: this.tarifaEditar.idChofer,
        fecha: this.tarifaEditar.fecha,
        acompaniante: this.tarifaEditForm.value.acompaniante,        
        tarifaEspecial: {
          concepto: this.tarifaEspecialEditForm.value.concepto,
          valor: this.tarifaEspecialEditForm.value.valor,
        }
        
      } 
      
      this.updateTarifa();
      
    }

    updateTarifa(){
      this.storageService.updateItem(this.componente,this.tarifaEditar);
    }

    openModal(): void {   
      if(this.choferSeleccionado.length > 0){
        {
          const modalRef = this.modalService.open(ModalAltaTarifaComponent, {
            windowClass: 'myCustomModalClass',
            centered: true,
            size: 'sm', 
            //backdrop:"static" 
          });
          //console.log("choferSeleccionado: ",this.choferSeleccionado[0]);
          
          
          modalRef.componentInstance.fromParent = this.choferSeleccionado[0];
          modalRef.result.then(
            (result) => {
              //console.log("ROOWW:" ,row);
              
    //        this.selectCrudOp(result.op, result.item);
            //this.mostrarMasDatos(row);
            },
            (reason) => {}
          );
        }
      }
      
    }
  
}
