import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Legajo, Documentacion } from 'src/app/interfaces/legajo';
import { Proveedor } from 'src/app/interfaces/proveedor';
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
  { id: 0, categoria: 'mini', },
  { id: 1, categoria: 'maxi', },
  { id: 2, categoria: 'furgon grande', },
  { id: 3, categoria: 'camión liviano', },
  { id: 4, categoria: 'chasis', },
  { id: 5, categoria: 'balancin', },
  { id: 6, categoria: 'semi remolque local', },
  { id: 7, categoria: 'portacontenedores', },
  ];
  seguimiento: boolean = false;
  categoriaSeleccionada!:string;
  tipoCombustible!:string;
  tarjetaCombustible!:boolean;
  jornada!:TarifaChofer;
  vehiculo!:Vehiculo;
  adicionalKm!:AdicionalKm;  
  legajo!: any;
  refrigeracion!:boolean;
  $proveedores!: any; 
  proveedorSeleccionado!: string;
  editForm: any;
  publicidad!: boolean;

  constructor(private fb: FormBuilder, private storageService: StorageService, private router:Router) {
    this.form = this.fb.group({                             //formulario para el perfil 
     nombre: ["", [Validators.required, Validators.maxLength(30)]], 
     apellido: ["",[Validators.required, Validators.maxLength(30)]], 
     cuit: ["",[Validators.required, Validators.minLength(11), Validators.maxLength(11)]],            
     fechaNac: ["",Validators.required],
     email: ["",[Validators.required, Validators.email]],
     celularContacto: ["",[Validators.required,Validators.minLength(10), Validators.maxLength(10)]],
     celularEmergencia: ["",[Validators.required,Validators.minLength(10), Validators.maxLength(10)]],
     domicilio: ["", [Validators.required, Validators.maxLength(50)]],     

  });

    this.vehiculoForm = this.fb.group({
      dominio: ["",[Validators.required,Validators.minLength(6), Validators.maxLength(8)]], 
      marca:["",[Validators.required, Validators.maxLength(50)]], 
      modelo: ["",[Validators.required, Validators.maxLength(30)]],         
    })

    this.seguimientoForm = this.fb.group({
      proveedor: ["",[Validators.required, Validators.maxLength(30)]],
      marcaGps: ["",[Validators.required, Validators.maxLength(30)]],
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

   ngOnInit(): void {
    //this.proveedores$ = this.storageService.proveedores$;
    this.storageService.proveedores$.subscribe(data => {
      this.$proveedores = data;
    });
   }



   // es el mismo metodo para guardar el chofer y la jornada
   // primero arma cada uno de los objetos
   // y desp guarda el objeto en la coleccion que le corresponde
   onSubmit(){    
    console.log("llega aca?");
    
    this.armarChofer();
    this.armarVehiculo();    
    this.addItem(this.chofer);
    this.armarLegajo() 
    this.router.navigate(['/choferes/listado']);    
   }

   armarChofer(){
    this.componente = "choferes"
    this.chofer = this.form.value;
   /*  this.chofer.categoria = this.categoriaSeleccionada; */
    this.chofer.idChofer = new Date().getTime(); 
    this.chofer.proveedor = this.proveedorSeleccionado;
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
    this.vehiculo.publicidad = this.publicidad;
    if(this.seguimiento){
      this.vehiculo.satelital = this.seguimientoForm.value;
    }else{
      this.vehiculo.satelital = "no";
    }
    this.vehiculo.refrigeracion = null;
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

  changeProveedor(e:any){
    console.log(e.target.value);
    //let razonSocial = e.target.value.split(" ")[0];
    //console.log(apellido);
    
    
    this.proveedorSeleccionado = e.target.value;
    /* this.clienteSeleccionado = this.clientes$.source._value.filter(function (cliente:any){
      return cliente.razonSocial === e.target.value
    }) */
   console.log("este es el proveedor seleccionado: ", this.proveedorSeleccionado);
    //this.buscarTarifas();
  }
  
  changeCategoria(e: any) {    
    console.log(e.target.value);
    
    this.categoriaSeleccionada = e.target.value   
  }

  changeTipoCombustible(e: any) {    
    this.tipoCombustible = e.target.value   
  }

  changeTarjetaombustible(e: any) {    
    if(e.target.value === "si"){
      this.tarjetaCombustible = true;  
    } else {
      this.tarjetaCombustible = false;
    }
    
  }

  changePublicidad(e: any) {    
    if(e.target.value === "si"){
      this.publicidad = true;  
    } else {
      this.publicidad = false;
    }
    
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

  /* selectRefrigeracion(e:any){ 
    switch (e.target.value) {
      case "si":{
        this.refrigeracion = true;
        break;
      }
      case "no":{
        this.refrigeracion = false;
        break;
      }
      default:{
        break;
      }
    }
  } */

  armarLegajo(){
    console.log("chofer: ", this.chofer);
    let legajo: any = {
      idChofer : this.chofer.idChofer,
      idLegajo : new Date().getTime(),
    }
    this.componente = "legajos";    
    //console.log("este es el legajo trucho: ", legajo);
    
    this.legajo = legajo
    this.addItem(this.legajo)

    console.log("este es el legajo del chofer: ", this.legajo);
    
  }
  validarPatente() {
    let patenteValida = this.vehiculoForm.validarPatente(
      this.editForm.value.patente
    );

    if (patenteValida) {
      // console.log('es una patente valida');
      //this.validarTarifa()
    } else {
      console.log('no es una patente valida');
      
    }

}
}
