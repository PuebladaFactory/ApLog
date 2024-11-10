import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Categoria, Chofer, SeguimientoSatelital, Vehiculo } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { AdicionalKm, TarifaChofer } from 'src/app/interfaces/tarifa-chofer';
import { CategoriaTarifa, TarifaGralCliente, TarifaTipo } from 'src/app/interfaces/tarifa-gral-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';
import { ModalVehiculoComponent } from '../modal-vehiculo/modal-vehiculo.component';

@Component({
  selector: 'app-choferes-alta',
  templateUrl: './choferes-alta.component.html',
  styleUrls: ['./choferes-alta.component.scss']
})

export class ChoferesAltaComponent implements OnInit {

  @Input() fromParent: any;

  componente!:string; 
  form:any;
  jornadaForm:any;
  vehiculoForm: any;
  seguimientoForm: any;
  adicionalForm:any;
  categoriasForm:any;
  chofer!: Chofer;  
  soloVista:boolean = false;
  edicion: boolean = false;
  seguimiento: boolean = false;  
  tipoCombustible!:string;
  tarjetaCombustible!:boolean;
  jornada!:TarifaChofer;
  vehiculo!:Vehiculo;
  adicionalKm!:AdicionalKm;  
  legajo!: any;
  refrigeracion!:boolean;
  $proveedores!: Proveedor[]; 
  proveedorSeleccionado!: Proveedor[];
  idProveedor!:number;
  editForm: any;
  publicidad!: boolean;
  categorias: Categoria [] = [];
  tarifaGralCliente!: TarifaGralCliente;
  categoriaSeleccionada: CategoriaTarifa | null = null;
  vehiculos: Vehiculo[] = [];
  satelital!: SeguimientoSatelital | boolean;
  formTipoTarifa!:any;

  constructor(private fb: FormBuilder, private storageService: StorageService, private router:Router, public activeModal: NgbActiveModal, private modalService: NgbModal) {
    this.form = this.fb.group({                             //formulario para el perfil 
     nombre: ["", [Validators.required, Validators.maxLength(30)]], 
     apellido: ["",[Validators.required, Validators.maxLength(30)]], 
     cuit: ["",[Validators.required, Validators.minLength(11), Validators.maxLength(11)]],            
     fechaNac: ["",Validators.required],
     email: ["",[Validators.required, Validators.email]],
     celularContacto: ["",[Validators.required,Validators.minLength(10), Validators.maxLength(10)]],
     celularEmergencia: ["",[Validators.minLength(10), Validators.maxLength(10)]],
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

    this.categoriasForm = this.fb.group({
      categorias: this.fb.array([]),
    });
    this.formTipoTarifa = this.fb.group({
      general: [true],  // Seleccionado por defecto
      especial: [false],
      eventual: [false],
      personalizada: [false],
    })    
      
   }

   ngOnInit(): void {
    console.log("1)", this.fromParent);
    this.storageService.proveedores$.subscribe(data => {
      this.$proveedores = data;
      this.$proveedores = this.$proveedores.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
    });
    if(this.fromParent.modo === "vista"){
      this.chofer = this.fromParent?.item;
      this.soloVista = true;
      this.armarForm()

    }else if (this.fromParent.modo === "edicion"){
      this.chofer = this.fromParent?.item;
      this.soloVista = false;
      this.armarForm()
    }else{
      this.soloVista = false;
    }

   }

   onTarifaTipoChange(tipoSeleccionado: string) {
    // Resetea los demás switches a false, excepto el seleccionado
    this.formTipoTarifa.patchValue({
      general: tipoSeleccionado === 'general',
      especial: tipoSeleccionado === 'especial',
      eventual: tipoSeleccionado === 'eventual',
      personalizada: tipoSeleccionado === 'personalizada'
    });
  }

   armarForm(){
    this.idProveedor = this.chofer.idProveedor;
    if(this.chofer.idProveedor !== 0){      
      this.proveedorSeleccionado = this.$proveedores.filter((proveedor:Proveedor)=>{
        return proveedor.idProveedor === this.idProveedor;
      })
    }
        
    this.form.patchValue({
      nombre: this.chofer.nombre, 
      apellido: this.chofer.apellido, 
      cuit: this.chofer.cuit,            
      fechaNac: this.chofer.fechaNac,
      email: this.chofer.email,
      celularContacto: this.chofer.celularContacto,
      celularEmergencia: this.chofer.celularEmergencia,
      domicilio: this.chofer.domicilio,           
    });    
    this.formTipoTarifa.patchValue({
      general: this.chofer.tarifaTipo.general, 
      especial: this.chofer.tarifaTipo.especial,
      eventual: this.chofer.tarifaTipo.eventual,
      personalizada: this.chofer.tarifaTipo.personalizada,      
  });
    this.armarVehiculoForm();   
  }

  armarVehiculoForm(){
    this.vehiculos = this.chofer.vehiculo;
  }

   onSubmit(){ 
    
    if (this.form.valid){
      let id = this.chofer?.id;
      this.armarChofer();
      //this.armarVehiculo();        
      this.addItem();
      //this.(armarLegajo();      
      
    } else{
      alert("error en el formulario")
    }  
      
    
    
   }

   
   armarChofer(){
    this.componente = "choferes";  
    const tarifaSeleccionada = this.getTarifaTipo();      
    if(this.fromParent.modo === "edicion"){
        let id = this.chofer.id;
        let idChofer = this.chofer.idChofer
        this.chofer = this.form.value;
        /*  this.chofer.categoria = this.categoriaSeleccionada; */
        this.chofer.idChofer = idChofer; 
        this.chofer.id = id;    
        this.chofer.idProveedor = this.idProveedor;
        this.chofer.vehiculo = this.vehiculos;
        this.chofer.tarifaTipo = this.idProveedor === 0 ? tarifaSeleccionada : this.proveedorSeleccionado[0].tarifaTipo; // Asigna el tipo de tarifa
        console.log("este es el chofer EDITADO: ",this.chofer);     
    } else {
        this.chofer = this.form.value;
      /*  this.chofer.categoria = this.categoriaSeleccionada; */
        this.chofer.idChofer = new Date().getTime();   
        this.chofer.id = null;  
        this.chofer.idProveedor = this.idProveedor;
        this.chofer.vehiculo = this.vehiculos;
        this.chofer.tarifaTipo = this.idProveedor === 0 ? tarifaSeleccionada : this.proveedorSeleccionado[0].tarifaTipo; // Asigna el tipo de tarifa
        console.log("este es el chofer NUEVO: ",this.chofer);     
    }
   }

   // Método para obtener la selección actual del formulario
   getTarifaTipo(): TarifaTipo {
    const formValue = this.formTipoTarifa.value;
    const tarifaTipo: TarifaTipo = {
      general: formValue.general,
      especial: formValue.especial,
      eventual: formValue.eventual,
      personalizada: formValue.personalizada
    };
    return tarifaTipo;
  }

   addItem(): void {  
    console.log("CHOFER: ", this.chofer );
    if(this.fromParent.modo === "edicion") {
      Swal.fire({
        title: "¿Confirmar los cambios del Chofer?",
        //text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Confirmar",
        cancelButtonText: "Cancelar"
      }).then((result) => {
        if (result.isConfirmed) {
          this.storageService.updateItem(this.componente, this.chofer); 
          Swal.fire({
            title: "Confirmado",
            text: "Cambios guardados",
            icon: "success"
          }).then((result)=>{
            if (result.isConfirmed) {
              this.activeModal.close();
            }
          });   
          
        }
      });   
    }else {
      Swal.fire({
        title: "¿Confirmar el alta del Chofer?",
        //text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Confirmar",
        cancelButtonText: "Cancelar"
      }).then((result) => {
        if (result.isConfirmed) {
          this.storageService.addItem(this.componente, this.chofer); 
          Swal.fire({
            title: "Confirmado",
            text: "Alta exitosa",
            icon: "success"
          }).then((result)=>{
            if (result.isConfirmed) {
              this.activeModal.close();
            }
          });   
          
        }
      });     
    }
    
     
  }  
  

  changeProveedor(e:any){          
    let id = Number(e.target.value);
    console.log(id);
    if(id === 1){
      this.idProveedor = 0;
    } else {
      this.proveedorSeleccionado = this.$proveedores.filter((proveedor:Proveedor) =>{
        return proveedor.idProveedor === id;
      });
      this.idProveedor = this.proveedorSeleccionado[0].idProveedor
    }
    

  }  

  getProveedor(id:number){
    let proveedor:Proveedor[];
    proveedor = this.$proveedores.filter((p:Proveedor)=>{
      return p.idProveedor === id;
    })
    return proveedor[0].razonSocial
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



  validarPatente() {
    let patenteValida = this.vehiculoForm.validarPatente(
      this.editForm.value.patente
    );

    if (patenteValida) {
      // //console.log()('es una patente valida');
      //this.validarTarifa()
    } else {
      //console.log()('no es una patente valida');
      
    }

}

  openModal(): void {   
    
    {
      const modalRef = this.modalService.open(ModalVehiculoComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'sm', 
        //backdrop:"static" 
      });

      modalRef.result.then(
        (result) => {
          console.log("Vehiculo:" ,result);
          if(result !== undefined) {
            this.vehiculos.push(result);
            console.log("Vehiculos Array: ", this.vehiculos);
          };          
        },
        (reason) => {}
      );
    }
  }

  eliminarVehiculo(indice: number){
      this.vehiculos.splice(indice,1)
      console.log(this.vehiculos);      
  }

  editarVehiculo(i:number){ 
    let vehiculo = this.vehiculos[i];
    this.abrirModalEdicion(vehiculo,i);
  }

  abrirModalEdicion(vehiculo:Vehiculo, indice :number){
    {
      const modalRef = this.modalService.open(ModalVehiculoComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'sm', 
        //backdrop:"static" 
      });

 /*      let info = {
        modo:"edicion",        
        item: vehiculo,
      };  */
      modalRef.componentInstance.fromParent = vehiculo;

      modalRef.result.then(
        (result) => {
          console.log("Vehiculo:" ,result);
          if(result !== undefined) {
            this.vehiculos[indice]= result;
            console.log("Vehiculos Array: ", this.vehiculos);  
          };          
        },
        (reason) => {}
      );
    }
  }

}
