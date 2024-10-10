import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Categoria, Vehiculo } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';


@Component({
  selector: 'app-modal-vehiculo',
  templateUrl: './modal-vehiculo.component.html',
  styleUrls: ['./modal-vehiculo.component.scss']
})
export class ModalVehiculoComponent implements OnInit {
  
  @Input() fromParent: any;

  $proveedores!: Proveedor;  
  tarifaGralCliente!: TarifaGralCliente;
  vehiculoForm:any;
  seguimientoForm:any;
  categoriasForm:any;
  proveedorSeleccionado!: string;
  tipoCombustible!:string;
  tarjetaCombustible!:boolean;
  publicidad!: boolean;
  seguimiento: boolean = false;
  vehiculo!: Vehiculo;
  soloVista: boolean = false;
  categoria!: Categoria;
  ordCat!: number;
  edicion:boolean = false;

  constructor(private fb: FormBuilder, private storageService: StorageService, private router:Router, public activeModal: NgbActiveModal, private modalService: NgbModal){
    this.vehiculoForm = this.fb.group({
      dominio: ["",[Validators.required,Validators.minLength(6), Validators.maxLength(8)]], 
      marca:["",[Validators.required, Validators.maxLength(50)]], 
      modelo: ["",[Validators.required, Validators.maxLength(30)]], 
      categoria: ["",[Validators.required, Validators.maxLength(30)]], 
    })

    this.seguimientoForm = this.fb.group({
      proveedor: ["",[Validators.required, Validators.maxLength(30)]],
      marcaGps: ["",[Validators.required, Validators.maxLength(30)]],
    })

    this.categoriasForm = this.fb.group({
      categorias: this.fb.array([]),
    });
  }
  
  
  ngOnInit(): void {
    this.storageService.proveedores$.subscribe(data => {
      this.$proveedores = data;
    });
    this.storageService.ultTarifaGralCliente$.subscribe(data =>{      
      this.tarifaGralCliente = data;      
    })           
    console.log("1)",this.fromParent);
    if(this.fromParent !== undefined){
        this.edicion = true;
        this.vehiculo = this.fromParent;
        this.ordCat = this.vehiculo.categoria.catOrden;
        this.armarForms()
    }
       
  }

  guardarVehiculo(){ 
    
    if (this.vehiculoForm.valid){

      //this.armarChofer();
      this.armarVehiculo();    
      //this.addItem();
      //this.armarLegajo();
      this.activeModal.close(this.vehiculo);    
    } else{
      alert("error en el formulario")
    }  
   }

   changeProveedor(e:any){
        this.proveedorSeleccionado = e.target.value;   
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

  changeCategoria(e: any) {
    ////console.log(e.target.value);
    this.ordCat = Number(e.target.value);
 
  }

  armarVehiculo(){ 
    this.categoria = {
      catOrden: this.ordCat,
      nombre : this.vehiculoForm.value.categoria,
    }  
    this.vehiculo = this.vehiculoForm.value;
    //this.vehiculo.categoria = this.categoriaSeleccionada;
    this.vehiculo.categoria = this.categoria;
    this.vehiculo.tipoCombustible = this.tipoCombustible;
    this.vehiculo.tarjetaCombustible = this.tarjetaCombustible;
    this.vehiculo.publicidad = this.publicidad;
    if(this.seguimiento){
      this.vehiculo.segSat = true;
      this.vehiculo.satelital = this.seguimientoForm.value;
    }else{
      this.vehiculo.segSat = false;
      this.vehiculo.satelital = null;
    }
    this.vehiculo.refrigeracion = null;
    //console.log(this.vehiculo);    
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
        marcaGps: "",
      })
    }else{
      this.seguimiento = true;
      this.seguimientoForm.patchValue({
        proveedor: this.vehiculo.satelital?.proveedor,
        marcaGps: this.vehiculo.satelital?.marcaGps,
      })
    }
  }


}
