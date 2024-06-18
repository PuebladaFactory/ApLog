import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer, SeguimientoSatelital, Vehiculo } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { AdicionalKm, TarifaChofer } from 'src/app/interfaces/tarifa-chofer';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ChoferesAltaComponent } from '../choferes-alta/choferes-alta.component';
import Swal from 'sweetalert2';


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

  constructor(private fb: FormBuilder, private storageService: StorageService, private modalService: NgbModal){
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
    ////console.log()(e.target.value)  ;     
    this.categoriaSeleccionada = e.target.value
    ////console.log()(this.categoriaSeleccionada);    
  }


  //este es el metodo que arma el objeto (chofer) que muestra el modal para editar
  abrirEdicion(chofer:Chofer):void {
    this.soloVista = false;
    this.choferEditar = chofer;    
    //console.log()("este es el chofer a editar: ", this.choferEditar);
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
  
    this.armarSeguimientoSatelital();
  }

  armarSeguimientoSatelital(){
    if(!this.choferEditar.vehiculo.satelital){      
      this.seguimiento = false;
      this.satelital = false;
    }else{
      this.seguimiento = true;
      this.satelital = this.choferEditar.vehiculo.satelital;
      //console.log()(this.satelital);
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
    Swal.fire({
      title: "¿Guardar los cambios?",
      text: "No se podrá revertir esta acción",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        this.update(this.choferEditar);    
        Swal.fire({
          title: "Confirmado",
          text: "Los cambios se han guardado",
          icon: "success"
        });
      }
    });   
    
    
   }

   update(item:any): void {
      this.datosPersonales();
      this.datosVehiculo();
      
      ////console.log()("este es el chofer editado: ", this.choferEditar);
      this.storageService.updateItem(this.componente, item);
      this.form.reset();
      this.vehiculoForm.reset();
      this.seguimientoForm.reset();
      this.edicion = false;
      //this.ngOnInit();
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
    //console.log()(e.target.value);
    //let razonSocial = e.target.value.split(" ")[0];
    ////console.log()(apellido);
    
    
    this.proveedorSeleccionado = e.target.value;
    /* this.clienteSeleccionado = this.clientes$.source._value.filter(function (cliente:any){
      return cliente.razonSocial === e.target.value
    }) */
   //console.log()("este es el proveedor seleccionado: ", this.proveedorSeleccionado);
    //this.buscarTarifas();
  }

  eliminarChofer(chofer:Chofer){    

    
    if(chofer.vehiculo.tarjetaCombustible  || chofer.vehiculo.satelital !== false){
       if (chofer.vehiculo.tarjetaCombustible  && chofer.vehiculo.satelital !== false){
        Swal.fire({
          title: "¿Eliminar el Chofer?",
          text: "No se podrá revertir esta acción",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Confirmar",
          cancelButtonText: "Cancelar"
        }).then((result) => {
          if (result.isConfirmed) {
        /////
            Swal.fire({
              title: "El chofer que desea eliminar tiene asignada una tarjeta de combustible y seguimiento satelital",
              text: "¿Desea continuar?",
              icon: "warning",
              showCancelButton: true,
              confirmButtonColor: "#3085d6",
              cancelButtonColor: "#d33",
              confirmButtonText: "Confirmar",
              cancelButtonText: "Cancelar"
              }).then((result) => {
              if (result.isConfirmed) {                
                this.storageService.deleteItem(this.componente, chofer);
                Swal.fire({
                  title: "Confirmado",
                  text: "El Cliente ha sido borrado",
                  icon: "success"
                });
              }                   /////
              })
            };   
        
       })} else if (chofer.vehiculo.tarjetaCombustible  && chofer.vehiculo.satelital === false){
        Swal.fire({
          title: "¿Eliminar el Chofer?",
          text: "No se podrá revertir esta acción",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Confirmar",
          cancelButtonText: "Cancelar"
        }).then((result) => {
          if (result.isConfirmed) {
        /////
            Swal.fire({
              title: "El chofer que desea eliminar tiene asignada una tarjeta de combustible",
              text: "¿Desea continuar?",
              icon: "warning",
              showCancelButton: true,
              confirmButtonColor: "#3085d6",
              cancelButtonColor: "#d33",
              confirmButtonText: "Confirmar",
              cancelButtonText: "Cancelar"
              }).then((result) => {
              if (result.isConfirmed) {                
                this.storageService.deleteItem(this.componente, chofer);
                Swal.fire({
                  title: "Confirmado",
                  text: "El Cliente ha sido borrado",
                  icon: "success"
                });
              }                   /////
              })
            };   
        
       })
            
          } else {
            if (!chofer.vehiculo.tarjetaCombustible  && chofer.vehiculo.satelital !== false){
              Swal.fire({
                title: "¿Eliminar el Chofer?",
                text: "No se podrá revertir esta acción",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: "Confirmar",
                cancelButtonText: "Cancelar"
              }).then((result) => {
                if (result.isConfirmed) {
              /////
                  Swal.fire({
                    title: "El chofer que desea eliminar tiene asignado seguimiento satelital",
                    text: "¿Desea continuar?",
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonColor: "#3085d6",
                    cancelButtonColor: "#d33",
                    confirmButtonText: "Confirmar",
                    cancelButtonText: "Cancelar"
                    }).then((result) => {
                    if (result.isConfirmed) {                
                      this.storageService.deleteItem(this.componente, chofer);
                      Swal.fire({
                        title: "Confirmado",
                        text: "El Cliente ha sido borrado",
                        icon: "success"
                      });
                    }                   /////
                    })
                  };   
              
             })
                
              }
    }
    
    
    
    /* this.ngOnInit();  */
    
  } else {
    Swal.fire({
      title: "¿Eliminar el Chofer?",
      text: "No se podrá revertir esta acción",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        this.storageService.deleteItem(this.componente, chofer);
        Swal.fire({
          title: "Confirmado",
          text: "El Chofer ha sido borrado",
          icon: "success"
        });
      }
    });   
  }
}

  abrirVista(chofer:Chofer):void {
    this.soloVista = true;
    this.choferEditar = chofer;    
    ////console.log()("este es el cliente a editar: ", this.clienteEditar);
    this.armarForm();    
  }

  borrarForms(){
    this.form.reset();
    this.vehiculoForm.reset();
    this.seguimientoForm.reset();
  }

  openModal(): void {   
   
    {
      const modalRef = this.modalService.open(ChoferesAltaComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'md', 
        //backdrop:"static" 
      });

    /*  let info = {
        modo: "clientes",
        item: facturaOp[0],
      }; 
      //console.log()(info); */
      
      //modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
          ////console.log()("ROOWW:" ,row);
          
//        this.selectCrudOp(result.op, result.item);
        //this.mostrarMasDatos(row);
        },
        (reason) => {}
      );
    }
  }

}
