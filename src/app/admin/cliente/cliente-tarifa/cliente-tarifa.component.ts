import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Cliente } from 'src/app/interfaces/cliente';
import { Adicionales, TarifaCliente } from 'src/app/interfaces/tarifa-cliente';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-cliente-tarifa',
  templateUrl: './cliente-tarifa.component.html',
  styleUrls: ['./cliente-tarifa.component.scss']
})
export class ClienteTarifaComponent implements OnInit {

  componente:string = "tarifasCliente";
  clientes$:any;
  clienteSeleccionado!: Cliente[];
  cargasGeneralesForm: any;
  adicionalForm: any;
  tarifa!:TarifaCliente;  
  historialTarifas$!: any;
  $ultimaTarifaAplicada!:any;
  $tarifasCliente:any;
  adicionalCGForm:any;
  adicionalCG: boolean = false;
  adicionalesCargasGenerales: Adicionales[] = [];

  constructor(private fb: FormBuilder, private storageService: StorageService, private dbFirebase: DbFirestoreService){
    this.cargasGeneralesForm = this.fb.group({                    //formulario para la carga general
      
        utilitario:[""],
        furgon:[""],
        camionLiviano:[""],
        chasis:[""],
        balancin:[""],
        semiRemolqueLocal:[""],
        //adicionalCargasGenerales: Adicionales[]|null;
    
   });
 
   this.adicionalCGForm = this.fb.group({                    //formulario para los extras de la carga general
    concepto:[""],
    valor:[""],
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
     this.clientes$ = this.storageService.clientes$;  
     this.historialTarifas$ = this.storageService.historialTarifasClientes$;   
          
   }

   changeCliente(e: any) {    
    console.log(e.target.value);
    //let razonSocial = e.target.value.split(" ")[0];
    //console.log(apellido);
    
    
    this.clienteSeleccionado = e.target.value;
    this.clienteSeleccionado = this.clientes$.source._value.filter(function (cliente:any){
      return cliente.razonSocial === e.target.value
    })
   console.log("este es el cliente seleccionado: ", this.clienteSeleccionado);
    this.buscarTarifas();
  }

  buscarTarifas(){
    //console.log(this.choferSeleccionado[0].idChofer);    
    this.storageService.getByFieldValue(this.componente, "idCliente", this.clienteSeleccionado[0].idCliente);
    this.storageService.historialTarifas$.subscribe(data =>{
      this.$tarifasCliente = data;
      this.$tarifasCliente.sort((x:TarifaCliente, y:TarifaCliente) => y.idTarifaCliente - x.idTarifaCliente);
      console.log(this.$tarifasCliente);
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
    this.armarTarifa();
  }

  armarTarifa(){     
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

  addItem(item:any): void {   
    this.storageService.addItem(this.componente, item); 
    this.adicionalForm.reset();
    //this.tarifaForm.reset();
    this.ngOnInit();
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

  adicionalCGToogle(){
    console.log("hola");
    console.log(this.adicionalCG);
    
    this.adicionalCG = !this.adicionalCG;
    console.log(this.adicionalCG);
  }
}
