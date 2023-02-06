import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { AdicionalKm, TarifaChofer } from 'src/app/interfaces/tarifa-chofer';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-choferes-alta',
  templateUrl: './choferes-alta.component.html',
  styleUrls: ['./choferes-alta.component.scss']
})

export class ChoferesAltaComponent implements OnInit {

  @Input() data:any

  componente!:string; 
  form:any;
  jornadaForm:any;
  vehiculoForm: any;
  seguimientoForm: any;
  adicionalForm:any;
  chofer!: Chofer;  
  categorias = [
  { id: 0, categoria: 'maxi', },
  { id: 1, categoria: 'mini', },
  { id: 2, categoria: 'liviano', },
  { id: 3, categoria: 'otro', },
  ];
  seguimiento: boolean = false;
  categoriaSeleccionada!:string;
  tipoCombustible!:string;
  tarjetaCombustible!:string;
  jornada!:TarifaChofer;
  vehiculo!:Vehiculo;
   adicionalKm!:AdicionalKm;  

  constructor(private fb: FormBuilder, private storageService: StorageService, private router:Router) {
    this.form = this.fb.group({                             //formulario para el perfil 
      nombre: [""], 
      apellido: [""], 
      cuit: [""],            
      fechaNac: [""],
      email: [""],
      celularContacto: [""],
      celularEmergencia: [""],
      domicilio: [""],     

  });

    this.vehiculoForm = this.fb.group({
      dominio: [""], 
      marca:[""], 
      modelo: [""],         
    })

    this.seguimientoForm = this.fb.group({
      proveedor: [""],
      marcaGps: [""],
    })

   /*  this.jornadaForm = this.fb.group({                    //formulario para la jornada
      base: [""],      
      carga: [""],
      publicidad: [""],  
  });

    this.adicionalForm = this.fb.group({                  //formulario para los adicionales de la jornada
      adicionalKm1: [""], 
      adicionalKm2: [""],
      adicionalKm3: [""],
      adicionalKm4: [""],
      adicionalKm5: [""],
  }); */
   }

   ngOnInit(): void {}



   // es el mismo metodo para guardar el chofer y la jornada
   // primero arma cada uno de los objetos
   // y desp guarda el objeto en la coleccion que le corresponde
   onSubmit(){    
    this.armarChofer();
    this.armarVehiculo();    
    this.addItem(this.chofer)
    this.router.navigate(['/choferes/listado']);    
   }

   armarChofer(){
    this.componente = "choferes"
    this.chofer = this.form.value;
   /*  this.chofer.categoria = this.categoriaSeleccionada; */
    this.chofer.idChofer = new Date().getTime(); 
    console.log("este es el chofer: ",this.chofer);     
    
   }

   addItem(item:any): void {   
    this.storageService.addItem(this.componente, item);   
  }  

  armarVehiculo(){   
    this.vehiculo = this.vehiculoForm.value;
    this.vehiculo.categoria = this.categoriaSeleccionada;
    this.vehiculo.tipoCombustible = this.tipoCombustible;
    this.vehiculo.tarjetaCombustible = this.tarjetaCombustible;
    if(this.seguimiento){
      this.vehiculo.satelital = this.seguimientoForm.value;
    }else{
      this.vehiculo.satelital = "no";
    }
    //console.log(this.vehiculo);
    this.chofer.vehiculo = this.vehiculo;
  }

  /* armarJornada(){     
    this.componente = "jornadas"
    this.adicionalKm = this.adicionalForm.value
    //console.log("esto es adicionalKm: ", this.adicionalKm);
    this.jornada = this.jornadaForm.value;
    this.jornada.km = this.adicionalKm;
    this.jornada.idChofer = this.chofer.idChofer;    
    //console.log("esta es la jornada: ", this.jornada);
    this.addItem(this.jornada)
  } */

  
  changeCategoria(e: any) {    
    this.categoriaSeleccionada = e.target.value   
  }

  changeTipoCombustible(e: any) {    
    this.tipoCombustible = e.target.value   
  }

  changeTarjetaombustible(e: any) {    
    this.tarjetaCombustible = e.target.value   
  }

  seguimientoSatelital(e:any){    
    switch (e.target.value) {
      case "si":{
        this.seguimiento = true;
        break;
      }
      case "no":{
        this.seguimiento = false;
        break;
      }
      default:{
        break;
      }
    }
    
  }

}
