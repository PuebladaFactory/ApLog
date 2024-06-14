import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Cliente } from 'src/app/interfaces/cliente';

import { AdicionalKm, AdicionalTarifa, CargasGenerales, TarifaCliente, TarifaEspecial } from 'src/app/interfaces/tarifa-cliente';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ModalAltaTarifaComponent } from '../modal-alta-tarifa/modal-alta-tarifa.component';

@Component({
  selector: 'app-cliente-tarifa',
  templateUrl: './cliente-tarifa.component.html',
  styleUrls: ['./cliente-tarifa.component.scss']
})
export class ClienteTarifaComponent implements OnInit {

  componente:string = "tarifasCliente";  
  $clientes!: any;
  clienteSeleccionado!: Cliente[];
  cargasGeneralesForm: any;
  cargasGeneralesEditForm: any; 
  adicionalKmForm: any;
  adicionalKmEditForm: any;
  tarifa!:TarifaCliente;  
  cargasGenerales!: CargasGenerales;  
  adicionales!: AdicionalTarifa;
  historialTarifas$!: any;
  $ultimaTarifaAplicada!:any;
  $tarifasCliente:any;
  tarifaEspecialForm:any;
  tarifaEspecialEditForm:any;  
  acompanianteForm:any;
  acompanianteEditForm:any;  
  adicionalKm: AdicionalKm [] = [];
  tarifasEspeciales!: TarifaEspecial;  
  tarifaEditar!: TarifaCliente;
  asignarTarifa: boolean = false


  constructor(private fb: FormBuilder, private storageService: StorageService, private dbFirebase: DbFirestoreService, private modalService: NgbModal){
    
   this.cargasGeneralesEditForm = this.fb.group({                    //formulario para la carga general      
    utilitario:[""],
    furgon:[""],
    furgonGrande:[""],
    chasisLiviano:[""],
    chasis:[""],
    balancin:[""],
    semiRemolqueLocal:[""],    
    portacontenedores:[""],    
});

this.tarifaEspecialEditForm = this.fb.group({                    //formulario para los extras de la carga general
    concepto:[""],
    valor:[""],
});

this.acompanianteEditForm = this.fb.group({
  acompaniante: [""],
})

 this.adicionalKmEditForm = this.fb.group({                  //formulario para los adicionales de la jornada
  distanciaPrimerSector: [""],
  valorPrimerSector:[""],
  distanciaIntervalo:[""],
  valorIntervalo:[""],
});
   }
   
   ngOnInit(): void {        
     this.historialTarifas$ = this.storageService.historialTarifasClientes$;   
     this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;
    })          
   }

   changeCliente(e: any) {    
    //console.log(e.target.value);
    let id = Number(e.target.value);
    //console.log("1)",id);
    
    this.clienteSeleccionado = this.$clientes.filter((cliente:Cliente)=>{
      //console.log("2", cliente.idCliente, id);
      return cliente.idCliente === id
    })
   
    this.asignarTarifa = true
    //console.log("este es el cliente seleccionado: ", this.clienteSeleccionado);
    this.buscarTarifas();
  }
  
  buscarTarifas(){
    //console.log(this.choferSeleccionado[0].idChofer);    
    this.storageService.getByFieldValue(this.componente, "idCliente", this.clienteSeleccionado[0].idCliente);
    this.storageService.historialTarifasClientes$.subscribe(data =>{
      console.log(data);
      this.$tarifasCliente = data;
      console.log(this.$tarifasCliente);
      this.$tarifasCliente.sort((x:TarifaCliente, y:TarifaCliente) => y.idTarifaCliente - x.idTarifaCliente);
      console.log(this.$tarifasCliente);
    })   
  }

  
  addItem(item:any): void {   
    this.storageService.addItem(this.componente, item); 
    //this.adicionalKmForm.reset();
    //this.tarifaForm.reset();
    this.cargasGeneralesForm.reset();
    this.tarifaEspecialForm.reset();
    this.acompanianteForm.reset();
    this.adicionalKmForm.reset();
    //this.tarifasEspeciales = null;
    //this.adicionalesUnidadesConFrio = [];
    this.adicionalKm = [];
    this.ngOnInit();
  }  

  editarTarifa(tarifa:TarifaCliente){
    this.tarifaEditar = tarifa;  
    console.log(this.tarifaEditar);
    this.armarTarifaEditar();
  }

  eliminarTarifa(tarifa:TarifaCliente){    
    this.storageService.deleteItem(this.componente, tarifa);
  }

  armarTarifaEditar(){
    this.cargasGeneralesEditForm.patchValue({
      utilitario:this.tarifaEditar.cargasGenerales.utilitario,
      furgon:this.tarifaEditar.cargasGenerales.furgon,
      furgonGrande:this.tarifaEditar.cargasGenerales.furgonGrande,
      chasisLiviano:this.tarifaEditar.cargasGenerales.chasisLiviano,
      chasis:this.tarifaEditar.cargasGenerales.chasis,
      balancin:this.tarifaEditar.cargasGenerales.balancin,
      semiRemolqueLocal:this.tarifaEditar.cargasGenerales.semiRemolqueLocal,    
      portacontenedores:this.tarifaEditar.cargasGenerales.portacontenedores,    
    });
    this.adicionalKmEditForm.patchValue({
      distanciaPrimerSector: this.tarifaEditar.adicionales.adicionalKm.primerSector.distancia,
      valorPrimerSector:this.tarifaEditar.adicionales.adicionalKm.primerSector.valor,
      distanciaIntervalo:this.tarifaEditar.adicionales.adicionalKm.sectoresSiguientes.intervalo,
      valorIntervalo:this.tarifaEditar.adicionales.adicionalKm.sectoresSiguientes.valor,
    });
    this.tarifaEspecialEditForm.patchValue({
      concepto:this.tarifaEditar.tarifaEspecial?.concepto,
      valor:this.tarifaEditar.tarifaEspecial?.valor,
    });
    this.acompanianteEditForm.patchValue({
      acompaniante: this.tarifaEditar.adicionales.acompaniante,
    });
  }

  onSubmitEdit(){
    this.armarTarifaModificada();
  }

  armarTarifaModificada(){
    this.tarifaEditar.adicionales.acompaniante = this.acompanianteEditForm.value.acompaniante;
    this.tarifaEditar.adicionales.adicionalKm = {
      primerSector: {
        distancia: this.adicionalKmEditForm.value.distanciaPrimerSector,
        valor: this.adicionalKmEditForm.value.valorPrimerSector,
    },
    sectoresSiguientes:{
        intervalo: this.adicionalKmEditForm.value.distanciaIntervalo,
        valor: this.adicionalKmEditForm.value.valorIntervalo,
    }
    }; 
    this.tarifaEditar.cargasGenerales = this.cargasGeneralesEditForm.value;
    this.tarifaEditar.tarifaEspecial ={
      concepto: this.tarifaEspecialEditForm.value.concepto,
      valor: this.tarifaEspecialEditForm.value.valor
    }
    
    console.log(this.tarifaEditar);
    this.updateTarifa();
  }

  updateTarifa(){
    this.storageService.updateItem(this.componente,this.tarifaEditar);
  }

  openModal(): void {   
    if(this.clienteSeleccionado.length > 0){
      {
        const modalRef = this.modalService.open(ModalAltaTarifaComponent, {
          windowClass: 'myCustomModalClass',
          centered: true,
          size: 'lg', 
          //backdrop:"static" 
        });
        
        modalRef.componentInstance.fromParent = this.clienteSeleccionado[0];
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
