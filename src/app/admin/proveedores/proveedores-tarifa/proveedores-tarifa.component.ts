import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Cliente } from 'src/app/interfaces/cliente';


import { AdicionalKm, AdicionalTarifa, Adicionales, CargasGenerales, TarifaProveedor, UnidadesConFrio } from 'src/app/interfaces/tarifa-proveedor';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-proveedores-tarifa',
  templateUrl: './proveedores-tarifa.component.html',
  styleUrls: ['./proveedores-tarifa.component.scss']
})
export class ProveedoresTarifaComponent implements OnInit {

  componente:string = "tarifasProveedor";
  $proveedores:any;
  proveedorSeleccionado!: Cliente[];
  cargasGeneralesForm: any;
  unidadesConFrioForm: any;
  adicionalKmForm: any;

  tarifa!:TarifaProveedor;  
  cargasGenerales!: CargasGenerales;
  unidadesConFrio!: UnidadesConFrio;
  adicionales!: AdicionalTarifa;

  historialTarifas$!: any;
  $ultimaTarifaAplicada!:any;
  $tarifasProveedor:any;
  adicionalCGForm:any;
  adicionalUCFForm: any;
  acompanianteForm:any;
  adicionalCG: boolean = false;
  adicionalesCargasGenerales: Adicionales[] = [];
  adicionalesUnidadesConFrio: Adicionales[] = [];
  adicionalKm: AdicionalKm [] = [];



  constructor(private fb: FormBuilder, private storageService: StorageService, private dbFirebase: DbFirestoreService){
    this.cargasGeneralesForm = this.fb.group({                    //formulario para la carga general
      
        utilitarioJornada:[""],
        furgonJornada:[""],
        camionLivianoJornada:[""],
        chasisJornada:[""],
        balancinJornada:[""],
        semiRemolqueLocalJornada:[""],
        //adicionalCargasGenerales: Adicionales[]|null;
    
   });
 
   this.adicionalCGForm = this.fb.group({                    //formulario para los extras de la carga general
    concepto:[""],
    valor:[""],
  });

  this.unidadesConFrioForm = this.fb.group({                    //formulario para la carga general
      
    utilitarioJornada:[""],
    furgonJornada:[""],
    camionLivianoJornada:[""],
    chasisJornada:[""],
    balancinJornada:[""],
    semiRemolqueLocalJornada:[""],
    //adicionalCargasGenerales: Adicionales[]|null;

});

    this.adicionalUCFForm = this.fb.group({                    //formulario para los extras de la carga general
      concepto:[""],
      valor:[""],
    });

    this.acompanianteForm = this.fb.group({
      acompaniante: [""],
    })

    //esto solo permite un modelos de adicionales de km. Cambiar mas adelante
     this.adicionalKmForm = this.fb.group({                  //formulario para los adicionales de la jornada
      primerSector: [""],
      sectorSiguiente:[""],
   });
   }
   
   ngOnInit(): void {   
      this.storageService.proveedores$.subscribe(data => {
        this.$proveedores = data;
      });
     /* this.$proveedores = this.storageService.proveedores$;   */
     this.historialTarifas$ = this.storageService.historialTarifasClientes$;   
          
   }

   changeCliente(e: any) {    
    console.log(e.target.value);
    //let razonSocial = e.target.value.split(" ")[0];
    //console.log(apellido);
    
    
    this.proveedorSeleccionado = e.target.value;
    this.proveedorSeleccionado = this.$proveedores.source._value.filter(function (cliente:any){
      return cliente.razonSocial === e.target.value
    })
   console.log("este es el cliente seleccionado: ", this.proveedorSeleccionado);
    this.buscarTarifas();
  }

  buscarTarifas(){
    //console.log(this.choferSeleccionado[0].idChofer);    
    this.storageService.getByFieldValue(this.componente, "idCliente", this.proveedorSeleccionado[0].idCliente);
    this.storageService.historialTarifasClientes$.subscribe(data =>{
      console.log(data);
      this.$tarifasProveedor = data;
      console.log(this.$tarifasProveedor);
      this.$tarifasProveedor.sort((x:TarifaProveedor, y:TarifaProveedor) => y.idTarifa - x.idTarifa);
      console.log(this.$tarifasProveedor);
    })
    //this.storageService.getByDoubleValue(this.componente, "idChofer", "fecha", this.choferSeleccionado[0].idChofer, "desc" )
    //console.log("este es el historial de tarifas: ",this.historialTarifas$);    
    //this.storageService.getByDoubleValue( this.componente, "idChofer", "idTarifa", this.choferSeleccionado[0].idChofer, "desc")
    //this.storageService.getAllSorted(this.componente, "fecha", "desc")
    //this.ultimaTarifa()  
   
    //porque esto???
    //this.ngOnInit();  
  }

  onSubmit() {
    //this.armarTarifa();
    //console.log("tarifa cliente");
    //console.log(this.cargasGeneralesForm.value, this.unidadesConFrioForm.value, this.acompanianteForm.value);
    this.armarTarifa();
    this.addItem(this.tarifa);
   

    
  }

  armarTarifa(){     
   
    this.armarCargasGenerales();
    this.armarUnidadesConFrio();
    this.armarAdicionales();   

    this.tarifa = {
      id:null,
      idTarifa:new Date().getTime(),
      idProveedor: this.proveedorSeleccionado[0].idCliente,
      fecha: new Date().toISOString().split('T')[0],
      cargasGenerales: this.cargasGenerales,
      unidadesConFrio: this.unidadesConFrio,
      adicionales: this.adicionales,
     
     
      publicidad: 0,
    };  
    
   
    
    console.log("tarifa: ", this.tarifa);
    
    
    /* 
    this.adicionalKm = this.adicionalForm.value
    //console.log("esto es adicionalKm: ", this.adicionalKm);
    this.tarifa = this.tarifaForm.value;
    this.tarifa.km = this.adicionalKm;
    this.tarifa.idChofer = this.choferSeleccionado[0].idChofer;    
    this.tarifa.fecha = new Date().toISOString().split('T')[0];
    this.tarifa.idTarifa = new Date().getTime(); 
    //console.log("esta es la tarifa: ", this.tarifa);
    this.addItem(this.tarifa) */
  } 

  armarCargasGenerales(){
    this.cargasGenerales = this.cargasGeneralesForm.value;
    this.cargasGenerales.adicionalCargasGenerales = this.adicionalesCargasGenerales;
    console.log("cargas generales: ", this.cargasGenerales);
  }

  armarUnidadesConFrio(){
    this.unidadesConFrio = this.unidadesConFrioForm.value;
    this.unidadesConFrio.adicionalUnidadesConFrio = this.adicionalesUnidadesConFrio;
    console.log("unidades con frio: ", this.unidadesConFrio);
  }

  armarAdicionales(){
    this.adicionales = this.acompanianteForm.value;
    this.adicionales.adicionalKm = this.adicionalKmForm.value;  
    console.log("adicionales: ", this.adicionales);
  }

  guardarAdicionalCG(){
   console.log(this.adicionalCGForm.value);
   
    
    this.adicionalesCargasGenerales.push(this.adicionalCGForm.value);
    this.adicionalCGForm.reset();
    //this.adicionalCG = false;
  }

  eliminarAdicionalCG(indice:number){
    this.adicionalesCargasGenerales.splice(indice, 1);    
  }

  guardarAdicionalUCF(){
    console.log(this.adicionalCGForm.value);
    
     
     this.adicionalesUnidadesConFrio.push(this.adicionalUCFForm.value);
     this.adicionalUCFForm.reset();
     //this.adicionalCG = false;
   }
 
   eliminarAdicionalUCF(indice:number){
     this.adicionalesUnidadesConFrio.splice(indice, 1);    
   }

  /*  guardarAdicionalKm(){
    console.log(this.adicionalKmForm.value);
    this.adicionalKm.push(this.adicionalKmForm.value);
    this.adicionalKmForm.reset();
    //this.adicionalCG = false;
   } */

  /*  eliminarAdicionalKm(indice:number){
    this.adicionalKm.splice(indice, 1);    
  }  
 */
  
  addItem(item:any): void {   
    this.storageService.addItem(this.componente, item); 
    //this.adicionalKmForm.reset();
    //this.tarifaForm.reset();
    this.cargasGeneralesForm.reset();
    this.unidadesConFrioForm.reset();
    this.acompanianteForm.reset();
    this.adicionalesCargasGenerales = [];
    this.adicionalesUnidadesConFrio = [];
    this.adicionalKm = [];
    this.ngOnInit();
  }  

}
