import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { AsignacionVehiculo, Categoria, Vehiculo } from 'src/app/interfaces/chofer';
import { ConIdType } from 'src/app/interfaces/conId';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ValidarService } from 'src/app/servicios/validar/validar.service';
import { VehiculoFactoryService, VehiculoFormData } from 'src/app/servicios/choferes/vehiculo-factory.service';
import Swal from 'sweetalert2';


@Component({
    selector: 'app-modal-vehiculo',
    templateUrl: './modal-vehiculo.component.html',
    styleUrls: ['./modal-vehiculo.component.scss'],
    standalone: false
})
export class ModalVehiculoComponent implements OnInit {
  
  @Input() fromParent: any;
  @Input() asignadoA!: AsignacionVehiculo;

  $proveedores!: Proveedor;  
  tarifaGralCliente!: TarifaGralCliente;
  vehiculoForm:any;
  seguimientoForm:any;
  categoriasForm:any;
  proveedorSeleccionado!: string;
  tipoCombustible:string[] = [];
  tarjetaCombustible!:boolean;
  publicidad!: boolean;
  seguimiento!: boolean;
  vehiculo!: Vehiculo;
  soloVista: boolean = false;
  categoria!: Categoria;
  ordCat!: number;
  edicion:boolean = false;
  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder, private storageService: StorageService, private router:Router, public activeModal: NgbActiveModal, private modalService: NgbModal, private vehiculoFactoryService: VehiculoFactoryService){
    this.vehiculoForm = this.fb.group({
      dominio: ["", [Validators.required, Validators.minLength(6), Validators.maxLength(8), ValidarService.validarDominio]],
      marca:["",[Validators.required, Validators.maxLength(50)]], 
      modelo: ["",[Validators.required, Validators.maxLength(30)]], 
      categoria: ["",[Validators.required, Validators.maxLength(30)]], 
    })

    this.seguimientoForm = this.fb.group({
      proveedor: ["",[Validators.required, Validators.maxLength(30)]],
      //marcaGps: ["",[Validators.required, Validators.maxLength(30)]],
    })

    this.categoriasForm = this.fb.group({
      categorias: this.fb.array([]),
    });
  }
  
  
  ngOnInit(): void {
    let tarifaGral = this.storageService.loadInfo("tarifasGralCliente");
    this.tarifaGralCliente = tarifaGral[0];
    console.log("data tarifasGralCliente: ", this.tarifaGralCliente);         
    this.storageService.proveedores$
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      this.$proveedores = data;
    });
   /*  this.storageService.tarifasGralCliente$.subscribe(data =>{   
      console.log("data tarifasGralCliente: ", data);         
      this.tarifaGralCliente = data;      
    }) */           
    console.log("1)",this.fromParent);
    if(this.fromParent !== undefined){
        this.edicion = true;
        this.vehiculo = this.fromParent;
        this.ordCat = this.vehiculo.categoria.catOrden;
        //this.tipoCombustible = this.vehiculo.tipoCombustible
        this.armarForms()
    }
       
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  guardarVehiculo(){ 
    
    if(this.ordCat === undefined){
      return this.mensajesError("Debe seleccionar una Categoria Tipo")    
    };
    if(this.tipoCombustible.length === 0){
      return this.mensajesError("Debe seleccionar un tipo de combustible")    
    };
    if(this.tarjetaCombustible === undefined){
      return this.mensajesError("Debe seleccionar si tiene tarjeta de combustible")    
    };
    if(this.publicidad === undefined){
      return this.mensajesError("Debe seleccionar si tiene publicidad")    
    };
    if(this.seguimiento === undefined){
      return this.mensajesError("Debe seleccionar si tiene seguimiento satelital")    
    };
    if(this.seguimiento && this.seguimientoForm.invalid){
      return this.mensajesError("Debe ingresar un proveedor")    
    }
    if (this.vehiculoForm.valid){

      //this.armarChofer();
      this.armarVehiculo();    
      //this.addItem();
      //this.armarLegajo();
      this.activeModal.close(this.vehiculo);    
    } else{
      this.mensajesError("error en el formulario")
    }
    
   }

   changeProveedor(e:any){
        this.proveedorSeleccionado = e.target.value;   
  }  

  /* changeTipoCombustible(e: any) {    
    this.tipoCombustible = e.target.value   
  } */

  changeTipoCombustible(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const value = checkbox.value;

    if (checkbox.checked) {
      // Agregar el valor si está marcado
      if (!this.tipoCombustible.includes(value)) {
        this.tipoCombustible.push(value);
      }
    } else {
      // Eliminar el valor si está desmarcado
      this.tipoCombustible = this.tipoCombustible.filter(item => item !== value);
    }

    console.log('Seleccionados:', this.tipoCombustible);
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

  changeCategoria(e: any) {
    ////console.log(e.target.value);
    this.ordCat = Number(e.target.value);
 
  }

  armarVehiculo(): void {
    const categoria: Categoria = {
      catOrden: this.ordCat,
      nombre: this.vehiculoForm.value.categoria,
    };
    const data: VehiculoFormData = {
      dominio: this.vehiculoForm.value.dominio,
      marca: this.vehiculoForm.value.marca,
      modelo: this.vehiculoForm.value.modelo,
      categoria,
      tipoCombustible: this.tipoCombustible,
      tarjetaCombustible: this.tarjetaCombustible,
      publicidad: this.publicidad,
      segSat: this.seguimiento,
      satelital: this.seguimiento ? this.seguimientoForm.value.proveedor : '',
      refrigeracion: null,
      asignadoA: this.asignadoA,
    };
    if (this.edicion && this.vehiculo) {
      this.vehiculo = this.vehiculoFactoryService.editarVehiculo(
        this.vehiculo as ConIdType<Vehiculo>, data
      );
    } else {
      this.vehiculo = this.vehiculoFactoryService.crearVehiculo(data);
    }
  }

  armarForms() {
    this.armarVehiculoForm();   
  }

  armarVehiculoForm(){
    this.vehiculoForm.patchValue({
      dominio: this.vehiculo.dominio,
      marca:this.vehiculo.marca,
      modelo: this.vehiculo.modelo,
      categoria: this.vehiculo.categoria.nombre,
    });
    //this.categoriaSeleccionada = this.choferEditar.vehiculo.categoria; ///////////////////////////////////////////
    this.tipoCombustible = this.vehiculo.tipoCombustible;
    this.tarjetaCombustible = this.vehiculo.tarjetaCombustible;
    this.publicidad = this.vehiculo.publicidad;    
    this.armarSeguimientoSatelital();
  }

  armarSeguimientoSatelital(){
    if(!this.vehiculo.segSat){      
      this.seguimiento = false;      
      this.seguimientoForm.patchValue({
        proveedor: "",
        //marcaGps: "",
      })
    }else{
      this.seguimiento = true;
      this.seguimientoForm.patchValue({
        proveedor: this.vehiculo.satelital,
        //marcaGps: this.vehiculo.satelital?.marcaGps,
      })
    }
  }

     hasError(controlName: string, errorName: string): boolean {
        const control = this.vehiculoForm.get(controlName);
        return control?.hasError(errorName) && control.touched;
      }
    
       mensajesError(msj:string){
          Swal.fire({
            icon: "error",
            //title: "Oops...",
            text: `${msj}`
            //footer: `${msj}`
          });
        }


}
