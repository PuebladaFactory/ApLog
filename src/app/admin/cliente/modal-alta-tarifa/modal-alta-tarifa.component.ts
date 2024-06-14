import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Cliente } from 'src/app/interfaces/cliente';
import { TarifaCliente } from 'src/app/interfaces/tarifa-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-modal-alta-tarifa',
  templateUrl: './modal-alta-tarifa.component.html',
  styleUrls: ['./modal-alta-tarifa.component.scss']
})
export class ModalAltaTarifaComponent implements OnInit {
  @Input() fromParent: any;
  data!:any;
  form:any;
  cargasGeneralesForm: any;
  tarifaEspecialForm: any;
  acompanianteForm: any;
  adicionalKmForm: any;
  clienteSeleccionado!: Cliente;
  tarifa!:TarifaCliente;  
  componente: string = "tarifasCliente";

  constructor(private fb: FormBuilder, public activeModal: NgbActiveModal,  private storageService: StorageService){
    this.form = this.fb.group({                    //formulario para la carga general      
      utilitario:[""],
      furgon:[""],
      furgonGrande:[""],
      chasisLiviano:[""],
      chasis:[""],
      balancin:[""],
      semiRemolqueLocal:[""],
      portacontenedores:[""],        
                               //formulario para los extras de la carga general
      concepto:[""],
      valor:[""],
                                //acompañante
      acompaniante: [""],
                              //formulario para los adicionales de la jornada
      distanciaPrimerSector: [""],
      valorPrimerSector:[""],
      distanciaIntervalo:[""],
      valorIntervalo:[""],
 });


  }
  
  ngOnInit(): void {
    this.data = this.fromParent
    this.clienteSeleccionado = this.fromParent
    console.log(this.data);
    
  }

  onSubmit() {
    this.armarTarifa();
    //console.log("tarifa cliente");
    //console.log(this.cargasGeneralesForm.value, this.unidadesConFrioForm.value, this.acompanianteForm.value);
    //this.armarTarifa();
    //this.addItem(this.tarifa);
  }

  armarTarifa(){
    this.tarifa = {
      id : null,
      idTarifaCliente:new Date().getTime(),
      idCliente: this.clienteSeleccionado.idCliente,
      fecha: new Date().toISOString().split('T')[0],    
      cargasGenerales:  {
        utilitario: this.form.value.acompaniante,   //mini
        furgon:this.form.value.furgon,       //maxi
        furgonGrande:this.form.value.furgonGrande,
        chasisLiviano:this.form.value.chasisLiviano,   //camion
        chasis:this.form.value.chasis,
        balancin:this.form.value.balancin,
        semiRemolqueLocal:this.form.value.semiRemolqueLocal,
        portacontenedores: this.form.value.portacontenedores,
    },      
      adicionales: {    
        acompaniante: this.form.value.acompaniante,
        adicionalKm: {    
          primerSector: {                     
              distancia: this.form.value.distanciaPrimerSector,
              valor: this.form.value.valorPrimerSector,
          },
          sectoresSiguientes:{
              intervalo: this.form.value.distanciaIntervalo,
              valor: this.form.value.valorIntervalo,
          }
      },
    },
      //tEspecial: boolean;
      tarifaEspecial: {    
        concepto: this.form.value.concepto,
        valor: this.form.value.valor,
        
    }
  }  
   //console.log(this.tarifa);    
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
