import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer } from 'src/app/interfaces/chofer';
import { TarifaChofer } from 'src/app/interfaces/tarifa-chofer';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-modal-alta-tarifa',
  templateUrl: './modal-alta-tarifa.component.html',
  styleUrls: ['./modal-alta-tarifa.component.scss']
})
export class ModalAltaTarifaComponent implements OnInit {
  @Input() fromParent: any;
  
  form:any; 
  tarifa!: TarifaChofer;
  data:any;
  choferSeleccionado!: Chofer;
  componente:string = "tarifasChofer";

  constructor(private fb: FormBuilder, public activeModal: NgbActiveModal, private storageService: StorageService){
    this.form = this.fb.group({                    //formulario para la jornada
      valorJornada: [""],            
      publicidad: [""], 
      acompaniante: [""], 
                                  //formulario para los adicionales de la jornada
      distanciaPrimerSector: [""],
      valorPrimerSector:[""],
      distanciaIntervalo:[""],
      valorIntervalo:[""],
                                //formulario para los extras de la carga general
      concepto:[""],
      valor:[""],
  });
  }
  
  ngOnInit(): void {
    this.data = this.fromParent
    this.choferSeleccionado = this.fromParent
    //console.log("modal: chofer seleccionado: ", this.choferSeleccionado);
    
  }

  onSubmit() {
    this.armarTarifa();
  }

  armarTarifa(){
    this.tarifa = {
        id:null,
        idTarifa:new Date().getTime(),        
        valorJornada: this.form.value.valorJornada,
        km:{
          primerSector: {
            distancia: this.form.value.distanciaPrimerSector,
            valor: this.form.value.valorPrimerSector,
        },
        sectoresSiguientes:{
            intervalo: this.form.value.distanciaIntervalo,
            valor: this.form.value.valorIntervalo,
        },
        },    
        publicidad: this.form.value.publicidad,
        idChofer: this.choferSeleccionado.idChofer,
        fecha: new Date().toISOString().split('T')[0],    
        acompaniante: this.form.value.acompaniante,
        //tEspecial: boolean;
        tarifaEspecial: {    
          concepto: this.form.value.concepto,
          valor: this.form.value.valor,          
      } 

    }
    //console.log("tarifa: ", this.tarifa);
    this.addItem(this.tarifa) 
  }

  addItem(item:any): void {   
    this.storageService.addItem(this.componente, item); 
    this.closeModal();
  }  

  closeModal() {
    this.activeModal.close();    
  }



}
