import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { AdicionalKm, TarifaChofer } from 'src/app/interfaces/tarifa-chofer';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-choferes-tarifa',
  templateUrl: './choferes-tarifa.component.html',
  styleUrls: ['./choferes-tarifa.component.scss']
})
export class ChoferesTarifaComponent implements OnInit {
  
  componente:string = "tarifasChofer";
  choferes$:any;
  choferSeleccionado!: Chofer[];
  tarifaForm: any;
  adicionalForm: any;
  tarifa!:TarifaChofer;
  vehiculo!:Vehiculo;
  adicionalKm!:AdicionalKm;  
  chofer!: Chofer;
  historialTarifas$!: any;

  constructor(private fb: FormBuilder, private storageService: StorageService){
   this.tarifaForm = this.fb.group({                    //formulario para la jornada
      valorJornada: [""],            
      publicidad: [""],  
  });

    this.adicionalForm = this.fb.group({                  //formulario para los adicionales de la jornada
      adicionalKm1: [""], 
      adicionalKm2: [""],
      adicionalKm3: [""],
      adicionalKm4: [""],
      adicionalKm5: [""],
  });
  }
  
  ngOnInit(): void {   
    this.choferes$ = this.storageService.choferes$;  
    this.historialTarifas$ = this.storageService.historialTarifas$;
  }

  changeChofer(e: any) {    
    console.log(e.target.value);
    let apellido = e.target.value.split(" ")[0];
    console.log(apellido);
    
    
    this.choferSeleccionado = e.target.value;
    this.choferSeleccionado = this.choferes$.source._value.filter(function (chofer:any){
      return chofer.apellido === apellido
    })
    console.log("este es el chofer seleccionado: ", this.choferSeleccionado);
    this.buscarTarifas();
  }

  onSubmit() {
    this.armarTarifa();
  }

  armarTarifa(){     
   
    this.adicionalKm = this.adicionalForm.value
    //console.log("esto es adicionalKm: ", this.adicionalKm);
    this.tarifa = this.tarifaForm.value;
    this.tarifa.km = this.adicionalKm;
    this.tarifa.idChofer = this.choferSeleccionado[0].idChofer;    
    this.tarifa.fecha = new Date().toISOString().split('T')[0];
    this.tarifa.idTarifa = new Date().getTime(); 
    console.log("esta es la tarifa: ", this.tarifa);
    this.addItem(this.tarifa)
  } 

  addItem(item:any): void {   
    this.storageService.addItem(this.componente, item);   
  }  

  buscarTarifas(){
    console.log(this.choferSeleccionado[0].idChofer);
    
    this.storageService.getByDoubleValue(this.componente, "idChofer", "fecha", this.choferSeleccionado[0].idChofer, "desc" )
    console.log(this.historialTarifas$);
    
    //this.ultimaTarifa()    
  }

  ultimaTarifa(){
    this.storageService.getByDoubleValue(this.componente, "idChofer", "fecha", this.choferSeleccionado[0].idChofer, "desc" )
    console.log(this.historialTarifas$.source._value[0]);
  }
}
