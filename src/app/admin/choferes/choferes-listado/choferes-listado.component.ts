import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Chofer, SeguimientoSatelital, Vehiculo } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { AdicionalKm, TarifaChofer } from 'src/app/interfaces/tarifa-chofer';
import { StorageService } from 'src/app/servicios/storage/storage.service';


@Component({
  selector: 'app-choferes-listado',
  templateUrl: './choferes-listado.component.html',
  styleUrls: ['./choferes-listado.component.scss']
})
export class ChoferesListadoComponent implements OnInit {
  
  choferes!: any;
  $choferes!: any;
  $proveedores!: any;
  form:any;
  vehiculoForm:any;
  seguimientoForm:any;
  jornadaForm:any;
  adicionalForm:any;
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
  categoriaSeleccionada!:string;
  choferEditar!: Chofer;
  componente:string = "choferes";
  jornadas$:any;
  jornadaChofer!: TarifaChofer;
  jornadaEditar!: TarifaChofer;
  adicionalKm!: AdicionalKm;
  tipoCombustible!:string;
  tarjetaCombustible!:boolean;  
  vehiculo!:Vehiculo;
  seguimiento: boolean = false;
  satelital!: any;
  edicion:boolean = false;
  refrigeracion!:boolean; 
  proveedorSeleccionado!: any;
  soloVista:boolean = false;
  searchText!: string;
  publicidad!: boolean;

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
    this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;
    });
    this.storageService.proveedores$.subscribe(data => {
      this.$proveedores = data;
    });
    //this.choferes$ = this.storageService.choferes$;     
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
    console.log("este es el chofer a editar: ", this.choferEditar);
    this.proveedorSeleccionado = chofer.proveedor;
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
    this.publicidad = this.choferEditar.vehiculo.publicidad;
   /*  if(this.choferEditar.vehiculo.refrigeracion){
      this.refrigeracion = true
    } else{
      this.refrigeracion = false
    } */
    this.armarSeguimientoSatelital();
  }

  armarSeguimientoSatelital(){
    if(!this.choferEditar.vehiculo.satelital){      
      this.seguimiento = false;
      this.satelital = false;
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
    this.edicion = true;
  }

  cerrarEdicion(){
    this.edicion = false;
    //this.borrarEdicion()
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
      this.edicion = false;
      this.ngOnInit();
  }

  datosPersonales(){
    this.componente = "choferes";  
    this.choferEditar.proveedor = this.proveedorSeleccionado;
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
    this.vehiculo.publicidad = this.publicidad
    this.vehiculo.refrigeracion = null;
    if(this.seguimiento){
      this.vehiculo.satelital = this.seguimientoForm.value;
    }else{
      this.vehiculo.satelital = false;
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

  changeTarjetaCombustible(e: any) {    
    if(e.target.value === "si"){
      this.tarjetaCombustible = true;   
    } else if (e.target.value === "no") {
      this.tarjetaCombustible = false;   
    } else{
      this.tarjetaCombustible = this.choferEditar.vehiculo.tarjetaCombustible;
    }      
  }

  changePublicidad(e: any) {    
    if(e.target.value === "si"){
      this.publicidad = true;   
    } else if (e.target.value === "no"){
      this.publicidad = false;   
    } else{
      this.publicidad = this.choferEditar.vehiculo.publicidad;
    }   
    
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

  selectRefrigeracion(e:any){ 
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
  }

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

  eliminarChofer(chofer:Chofer){    
    
    if(chofer.vehiculo.tarjetaCombustible  || chofer.vehiculo.satelital !== false){
       if (chofer.vehiculo.tarjetaCombustible  && chofer.vehiculo.satelital !== false){
        alert("El chofer que desea eliminar tiene asignada una tarjeta de combustible y seguimiento satelital")
       } else if (chofer.vehiculo.tarjetaCombustible  && !chofer.vehiculo.satelital){
            alert("El chofer que desea eliminar tiene asignada una tarjeta de combustible")
          } else {
                alert("El chofer que desea eliminar tiene asignado seguimiento satelital")
              }
    }
    
    this.storageService.deleteItem(this.componente, chofer);
    
    /* this.ngOnInit();  */
    
  }

  abrirVista(chofer:Chofer):void {
    this.soloVista = true;
    this.choferEditar = chofer;    
    //console.log("este es el cliente a editar: ", this.clienteEditar);
    this.armarForm();    
  }

  borrarForms(){
    this.form.reset();
    this.vehiculoForm.reset();
    this.seguimientoForm.reset();
  }

}
