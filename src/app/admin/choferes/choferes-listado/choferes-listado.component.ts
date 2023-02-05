import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Chofer, SeguimientoSatelital, Vehiculo } from 'src/app/interfaces/chofer';
import { AdicionalKm, TarifaChofer } from 'src/app/interfaces/tarifa-chofer';
import { StorageService } from 'src/app/servicios/storage/storage.service';


@Component({
  selector: 'app-choferes-listado',
  templateUrl: './choferes-listado.component.html',
  styleUrls: ['./choferes-listado.component.scss']
})
export class ChoferesListadoComponent implements OnInit {
  
  choferes!: any;
  choferes$!: any;
  form:any;
  vehiculoForm:any;
  seguimientoForm:any;
  jornadaForm:any;
  adicionalForm:any;
  categorias = [
    { id: 0, categoria: 'maxi', },
    { id: 1, categoria: 'mini', },
    { id: 2, categoria: 'liviano', },
    { id: 3, categoria: 'otro', },
    ];
  categoriaSeleccionada!:string;
  choferEditar!: Chofer;
  componente!:string; 
  jornadas$:any;
  jornadaChofer!: TarifaChofer;
  jornadaEditar!: TarifaChofer;
  adicionalKm!: AdicionalKm;
  tipoCombustible!:string;
  tarjetaCombustible!:string;  
  vehiculo!:Vehiculo;
  seguimiento: boolean = false;
  satelital!: any;
  edicion:boolean = false;

  constructor(private fb: FormBuilder, private storageService: StorageService,){
    this.form = this.fb.group({                          //formulario para el perfil 
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

    /* this.jornadaForm = this.fb.group({                     //formulario para la jornada
      base: [""],      
      carga: [""],
      publicidad: [""],  
     });

    this.adicionalForm = this.fb.group({                   //formulario para los adicionales de la jornada
      adicionalKm1: [""], 
      adicionalKm2: [""],
      adicionalKm3: [""],
      adicionalKm4: [""],
      adicionalKm5: [""],
  }); */
  }
  
  ngOnInit(): void { 
    this.choferes$ = this.storageService.choferes$;     
    this.jornadas$ = this.storageService.jornadas$
  }

  changeCategoria(e: any) {
    //console.log(e.target.value)  ;     
    this.categoriaSeleccionada = e.target.value
    //console.log(this.categoriaSeleccionada);    
  }


  //este es el metodo que arma el objeto (chofer) que muestra el modal para editar
  abrirEdicion(chofer:Chofer):void {
    this.choferEditar = chofer;    
    //console.log("este es el chofer a editar: ", this.choferEditar);
    this.armarForm();    
  }

  armarForm(){
    this.form.patchValue({
      nombre: this.choferEditar.nombre, 
      apellido: this.choferEditar.apellido, 
      cuit: this.choferEditar.cuit,            
      fechaNac: this.choferEditar.fechaNac,
      email: this.choferEditar.email,
      celularContacto: this.choferEditar.celularContacto,
      celularEmergencia: this.choferEditar.celularEmergencia,
      domicilio: this.choferEditar.domicilio,           
    });
    this.armarVehiculo();   
  }

  armarVehiculo(){
    this.vehiculoForm.patchValue({
      dominio: this.choferEditar.vehiculo.dominio,
      marca:this.choferEditar.vehiculo.marca,
      modelo: this.choferEditar.vehiculo.modelo,
    });
    this.categoriaSeleccionada = this.choferEditar.vehiculo.categoria;
    this.tipoCombustible = this.choferEditar.vehiculo.tipoCombustible;
    this.tarjetaCombustible = this.choferEditar.vehiculo.tarjetaCombustible;
    
    this.armarSeguimientoSatelital();
  }

  armarSeguimientoSatelital(){
    if(this.choferEditar.vehiculo.satelital === "no"){      
      this.seguimiento = false;
      this.satelital = "no";
    }else{
      this.seguimiento = true;
      this.satelital = this.choferEditar.vehiculo.satelital;
      console.log(this.satelital);
      this.seguimientoForm.patchValue({
        proveedor: this.satelital.proveedor,
        marcaGps: this.satelital.marcaGps
      })
  
    }
  }

  editarPerfil(){
    this.edicion = !this.edicion;
  }

  onSubmit(){ 
    this.datosPersonales();
    this.datosVehiculo();
    /* this.choferEditar.celular = this.form.value.celular;
    this.choferEditar.dominio = this.form.value.dominio
    this.choferEditar.categoria = this.categoriaSeleccionada; */
    console.log("este es el chofer editado: ", this.choferEditar);
    this.update(this.choferEditar);    
   }

   update(item:any): void {
      this.storageService.updateItem(this.componente, item);
      this.form.reset();
      this.vehiculoForm.reset();
      this.seguimientoForm.reset();
      this.ngOnInit();
  }

  datosPersonales(){
    this.componente = "choferes"  
    this.choferEditar.nombre = this.form.value.nombre;
    this.choferEditar.apellido = this.form.value.apellido;
    this.choferEditar.cuit = this.form.value.cuit;    
    this.choferEditar.fechaNac = this.form.value.fechaNac;
    this.choferEditar.email = this.form.value.email;
    this.choferEditar.celularContacto = this.form.value.celularContacto;
    this.choferEditar.celularEmergencia = this.form.value.celularEmergencia;
    this.choferEditar.domicilio = this.form.value.domicilio;
  }

  datosVehiculo() {
    this.vehiculo = this.vehiculoForm.value;
    this.vehiculo.categoria = this.categoriaSeleccionada;
    this.vehiculo.tipoCombustible = this.tipoCombustible;
    this.vehiculo.tarjetaCombustible = this.tarjetaCombustible;
    if(this.seguimiento){
      this.vehiculo.satelital = this.seguimientoForm.value;
    }else{
      this.vehiculo.satelital = this.satelital;
    }
    this.choferEditar.vehiculo = this.vehiculo;    
  }

  //este es el metodo que arma el objeto (jornada) que muestra el modal para editar
/*   jornada(idChofer: number){    
    let jornadaFormulario
    jornadaFormulario = this.jornadas$.source._value.filter(function (jornada: Jornada) { 
      return jornada.idChofer === idChofer
    });
    this.jornadaEditar = jornadaFormulario[0];
    //console.log("jornadaEditar: ",this.jornadaEditar);       
    this.armarJornada();   
  }

  armarJornada(){
    this.jornadaForm.patchValue({
      base: this.jornadaEditar.base,      
      carga: this.jornadaEditar.carga,
      publicidad: this.jornadaEditar.carga 
    });

    this.adicionalForm.patchValue({
      adicionalKm1: this.jornadaEditar.km.adicionalKm1, 
      adicionalKm2: this.jornadaEditar.km.adicionalKm2,
      adicionalKm3: this.jornadaEditar.km.adicionalKm3,
      adicionalKm4: this.jornadaEditar.km.adicionalKm4,
      adicionalKm5: this.jornadaEditar.km.adicionalKm5,
    })
  }

  onSubmitJornada(){
    this.componente = "jornadas"
    this.adicionalKm = this.adicionalForm.value
    //console.log("esto es adicionalKm: ", this.adicionalKm);
    this.jornadaChofer = this.jornadaForm.value;
    this.jornadaChofer.id = this.jornadaEditar.id
    this.jornadaChofer.km = this.adicionalKm;  
    this.jornadaChofer.idChofer = this.jornadaEditar.idChofer;
    //console.log("esta es la jornada: ", this.jornadaChofer);
    this.update(this.jornadaChofer)
  }
 */
  changeTipoCombustible(e: any) {    
    this.tipoCombustible = e.target.value   
  }

  changeTarjetaombustible(e: any) {    
    this.tarjetaCombustible = e.target.value   
  }

  seguimientoSatelital(e:any){    
    switch (e.target.value) {
      case "si" :{
        this.seguimiento = true;
        break;
      }
      case "no":{
        this.seguimiento = false;
        this.satelital = e.target.value;
        break;
      }
      default:{
        break;
      }
    }
    
  }

}
