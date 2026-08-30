import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { AsignacionVehiculo, Categoria, Vehiculo } from 'src/app/interfaces/chofer';
import { ConIdType } from 'src/app/interfaces/conId';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { CategoriaTarifa } from 'src/app/interfaces/tarifa';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ValidarService } from 'src/app/servicios/validar/validar.service';
import { VehiculoFactoryService, VehiculoFormData } from 'src/app/servicios/choferes/vehiculo-factory.service';
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
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
  /** Categorías de la tarifa General vigente — universo real de opciones
   *  para categorizar un vehículo, reemplaza el viejo `tarifaGralCliente.
   *  cargasGenerales` (módulo de tarifas viejo, sin relación con esto). */
  categoriasGeneral: CategoriaTarifa[] = [];
  /** Si se está editando un vehículo cuya categoría (texto libre del
   *  modelo viejo) no matchea ninguna categoría real de la General
   *  vigente, se muestra acá para que el usuario elija una válida. */
  categoriaLegacyDesconocida: string | null = null;
  edicion:boolean = false;
  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder, private storageService: StorageService, private router:Router, public activeModal: NgbActiveModal, private modalService: NgbModal, private vehiculoFactoryService: VehiculoFactoryService, private tarifarioService: TarifarioService){
    this.vehiculoForm = this.fb.group({
      dominio: ["", [Validators.required, Validators.minLength(6), Validators.maxLength(8), ValidarService.validarDominio]],
      marca:["",[Validators.required, Validators.maxLength(50)]],
      modelo: ["",[Validators.required, Validators.maxLength(30)]],
      categoria: ["",[Validators.required]],
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
    const general = this.tarifarioService.getTarifaGeneralVigente();
    this.categoriasGeneral = general ? general.secciones.flatMap(s => s.categorias) : [];
    if (!general) {
      Swal.fire('Sin tarifa general', 'Hace falta una tarifa general vigente para poder categorizar el vehículo.', 'warning');
    }

    this.storageService.proveedores$
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      this.$proveedores = data;
    });
    console.log("1)",this.fromParent);
    if(this.fromParent !== undefined){
        this.edicion = true;
        this.vehiculo = this.fromParent;
        this.armarForms()
    }

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  guardarVehiculo(){

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

  armarVehiculo(): void {
    const categoriaGeneral = this.categoriasGeneral.find(c => c.nombre === this.vehiculoForm.value.categoria);
    const categoria: Categoria = {
      catOrden: categoriaGeneral?.orden ?? 0,
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
    const nombreActual = this.vehiculo.categoria.nombre;
    const existe = this.categoriasGeneral.some(c => c.nombre === nombreActual);
    this.categoriaLegacyDesconocida = existe ? null : nombreActual;
    this.vehiculoForm.patchValue({
      dominio: this.vehiculo.dominio,
      marca:this.vehiculo.marca,
      modelo: this.vehiculo.modelo,
      categoria: existe ? nombreActual : '',
    });
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
