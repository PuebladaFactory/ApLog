import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Vehiculo } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { AdicionalKm, TarifaChofer } from 'src/app/interfaces/tarifa-chofer';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-proveedores-tarifa',
  templateUrl: './proveedores-tarifa.component.html',
  styleUrls: ['./proveedores-tarifa.component.scss']
})
export class ProveedoresTarifaComponent implements OnInit {

  componente:string = "tarifasProveedor";
  proveedores$:any;
  proveedorSeleccionado!: Proveedor[];
  tarifaForm: any;
  adicionalForm: any;
  tarifa!:TarifaChofer;
  vehiculo!:Vehiculo;
  adicionalKm!:AdicionalKm;  
  proveedor!: Proveedor;
  historialTarifas$!: any;
  $ultimaTarifaAplicada!:any;
  $tarifasProveedor:any;
  

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
    this.proveedores$ = this.storageService.proveedores$;  
    this.historialTarifas$ = this.storageService.historialTarifasProveedores$;   
         
  }

  changeProveedor(e: any) {    
    //console.log(e.target.value);
    let razonSocial = e.target.value;
    console.log(razonSocial);
    
    
    this.proveedorSeleccionado = e.target.value;
    this.proveedorSeleccionado = this.proveedores$.source._value.filter(function (proveedor:any){
      return proveedor.razonSocial === razonSocial
    })
   console.log("este es el proveedor seleccionado: ", this.proveedorSeleccionado);
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
    this.tarifa.idChofer = this.proveedorSeleccionado[0].idProveedor;    
    this.tarifa.fecha = new Date().toISOString().split('T')[0];
    this.tarifa.idTarifa = new Date().getTime(); 
    //console.log("esta es la tarifa: ", this.tarifa);
    this.addItem(this.tarifa)
  } 

  addItem(item:any): void {   
    this.storageService.addItem(this.componente, item); 
    this.adicionalForm.reset();
    this.tarifaForm.reset();
    this.ngOnInit();
  }  

  buscarTarifas(){
    console.log(this.proveedorSeleccionado[0].idProveedor);    
    this.storageService.getByFieldValue(this.componente, "idChofer", this.proveedorSeleccionado[0].idProveedor);  
    this.storageService.historialTarifasProveedores$.subscribe(data =>{
      this.$tarifasProveedor = data;
      this.$tarifasProveedor.sort((x:TarifaChofer, y:TarifaChofer) => y.idTarifa - x.idTarifa);
      console.log(this.$tarifasProveedor);
    })
    //this.storageService.getByDoubleValue(this.componente, "idChofer", "fecha", this.choferSeleccionado[0].idChofer, "desc" )
    //console.log("este es el historial de tarifas: ",this.historialTarifas$);    
    //this.storageService.getByDoubleValue( this.componente, "idChofer", "idTarifa", this.choferSeleccionado[0].idChofer, "desc")
    //this.storageService.getAllSorted(this.componente, "fecha", "desc")
    //this.ultimaTarifa()  
    this.ngOnInit();  
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
