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
  $choferes:any;
  choferSeleccionado!: Chofer[];
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
  

  constructor(private fb: FormBuilder, private storageService: StorageService){
   this.tarifaForm = this.fb.group({                    //formulario para la jornada
      valorJornada: [""],            
      publicidad: [""], 
      acompaniante: [""] 
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
    //console.log(e.target.value);
    let apellido = e.target.value.split(" ")[0];
    //console.log(apellido);
    
    
    this.choferSeleccionado = e.target.value;
    this.choferSeleccionado = this.$choferes.filter(function (chofer:any){
      return chofer.apellido === apellido
    })
   console.log("este es el chofer seleccionado: ", this.choferSeleccionado);
   if(this.choferSeleccionado[0].proveedor !== "monotributista" ){
    this.tarifaProveedor = true;
   } else{
    this.buscarTarifas();
   }
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
    //console.log("esta es la tarifa: ", this.tarifa);
    this.addItem(this.tarifa)
  } 

  addItem(item:any): void {   
    this.storageService.addItem(this.componente, item); 
    this.adicionalForm.reset();
    this.tarifaForm.reset();
    //this.$tarifasChofer = null;
    this.ngOnInit();
  }  

  buscarTarifas(){
    //console.log(this.choferSeleccionado[0].idChofer);    
    this.storageService.getByFieldValue(this.componente, "idChofer", this.choferSeleccionado[0].idChofer);
    this.storageService.historialTarifas$.subscribe(data =>{
      this.$tarifasChofer = data;
      console.log(this.$tarifasChofer);
      this.$tarifasChofer.sort((x:TarifaChofer, y:TarifaChofer) => y.idTarifa - x.idTarifa);
      console.log(this.$tarifasChofer);
    })
    //this.storageService.getByDoubleValue(this.componente, "idChofer", "fecha", this.choferSeleccionado[0].idChofer, "desc" )
    //console.log("este es el historial de tarifas: ",this.historialTarifas$);    
    //this.storageService.getByDoubleValue( this.componente, "idChofer", "idTarifa", this.choferSeleccionado[0].idChofer, "desc")
    //this.storageService.getAllSorted(this.componente, "fecha", "desc")
    //this.ultimaTarifa()  
    //this.ngOnInit();  
  }

//CONSULTO DIRECTAMENTE A LA DB PQ NO ME TOMA LAS CONSULTAS MULTIPLES A FIRESTORE.
//CORREJIR!!!!!!!!!!!!!
// EN LUGAR DE LLAMAR A LA DB CONSULTA EN EL LOCALSTORAGE
  ultimaTarifa(){   
    //this.storageService.getByDoubleValue(this.componente, "idChofer", "fecha", this.choferSeleccionado[0].idChofer, "desc" )
   /*  this.dbFirebase.getByFieldValue(this.componente, "idChofer", this.choferSeleccionado[0].idChofer)
    .subscribe(data =>{
    let tarifas:any = data;
     
        let ultTarifa = Math.max(...tarifas.map((o: { idTarifa: any; }) => o.idTarifa))
        //console.log("esta es la ultima tarifa: ",  ultTarifa);   
        this.buscarUltimaTarifa(ultTarifa);     
    }); */
    /* let tarifas: any;
    tarifas = this.storageService.loadInfo(this.componente);
    let ultTarifa =  Math.max(...tarifas.map((o: { idTarifa: any; }) => o.idTarifa))
    console.log("esta es el id de la ultima tarifa: ",  ultTarifa);
    this.ultimaTarifaAplicada = tarifas.filter((tarifa: { idTarifa: number; }) => tarifa.idTarifa === ultTarifa); 
    console.log("esta es la ultima tarifa: ",  tarifas); */
    /* if(this.historialTarifas$.source._value.hasOwnProperty("idTarifa")){
        console.log("tiene datos: ",  this.historialTarifas$.source._value);        
    } else {
      console.log("SIN datos: ",  this.historialTarifas$.source._value);
    } */
  
   
     
    }

   /*  buscarUltimaTarifa(idTarifa:number){
      this.dbFirebase.getByFieldValue(this.componente, "idTarifa", idTarifa)
      .subscribe(data =>{
        this.ultimaTarifaAplicada = data;      
        console.log("esta es la ultima tarifa: ",  this.ultimaTarifaAplicada);   
        
    });
    } */
   
   
  
}
