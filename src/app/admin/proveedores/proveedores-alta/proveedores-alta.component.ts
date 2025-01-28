import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Contacto, Proveedor } from 'src/app/interfaces/proveedor';
import { TarifaGralCliente, TarifaTipo } from 'src/app/interfaces/tarifa-gral-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';
import { ModalContactoProveedoresComponent } from '../modal-contacto-proveedores/modal-contacto-proveedores.component';
import { ValidarService } from 'src/app/servicios/validar/validar.service';
import { ConId } from 'src/app/interfaces/conId';
import { DomicilioService } from 'src/app/servicios/domicilio/domicilio.service';

@Component({
  selector: 'app-proveedores-alta',
  templateUrl: './proveedores-alta.component.html',
  styleUrls: ['./proveedores-alta.component.scss']
})
export class ProveedoresAltaComponent implements OnInit {
  @Input() fromParent:any

  componente:string = "proveedores"
  form:any;
  formContacto:any;
  proveedor!: ConId<Proveedor>;
  contactos: Contacto[] = [];
  mostrarFormulario: boolean = false;
  formTipoTarifa:any;
  soloVista:boolean = false;
  proveedorEditar!: ConId<Proveedor>;
  $provincias:any;
  $provinciaSeleccionada: string = "";
  $municipios!:any;
  $municipioSeleccionado:string = "";
  $localidades!:any;
  $localidadSeleccionada:string = "";
  direccionCompleta = {provincia:"", municipio: "", localidad: "", domicilio: ""};
  condFiscal: string = ""

  constructor(private fb: FormBuilder, private storageService: StorageService, private router: Router, public activeModal: NgbActiveModal, private modalService: NgbModal, private domicilioServ:  DomicilioService) {
    this.form = this.fb.group({      
      razonSocial: ["",[Validators.required, Validators.maxLength(30)]], 
      cuit: [
              "",
              [
                Validators.required,
                Validators.minLength(13),
                Validators.maxLength(13), // Ajustado para incluir los guiones
                ValidarService.cuitValido,
              ],
            ],
      direccion: [""],        
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
    let proveedorOriginal = this.fromParent.item
    this.proveedorEditar = structuredClone(proveedorOriginal)
    if(this.fromParent.modo === "vista"){
      this.soloVista = true;      
      this.armarForm()
    }else if(this.fromParent.modo === "edicion"){
      this.soloVista = false;      
      this.armarForm()
    }else {
      this.soloVista = false;
    }

    this.domicilioServ.getProvincias().subscribe({
      next: (data) => {
        this.$provincias = data.provincias; // Asume que la respuesta tiene un atributo `provincias`.
        console.log(this.$provincias);
      },
      error: (error) => {
        console.error('Error al obtener provincias:', error);
      }
    });
    
   }

    onSubmit(){
    ////console.log()(new Date().getTime()); 
    let tarifaGeneral: TarifaGralCliente [] = this.storageService.loadInfo("tarifasGralProveedor");   
    if(this.$provinciaSeleccionada === "" || this.$municipioSeleccionado === "" || this.$localidadSeleccionada === ""){ return this.mensajesError("Debe completar el domicilio")};
    if(this.condFiscal === ""){ return this.mensajesError("Debe seleccionar una condición fiscal")};
    const tarifaSeleccionada = this.getTarifaTipo();    
    if (this.form.valid) {
      if(this.fromParent.modo === "edicion"){
        let formValue = this.form.value;
        // Eliminar los guiones del CUIT
        let cuitSinGuiones = Number(formValue.cuit.replace(/-/g, ''));   
        this.direccionCompleta = {provincia: this.$provinciaSeleccionada, municipio: this.$municipioSeleccionado, localidad: this.$localidadSeleccionada, domicilio: this.form.value.direccion}             
        this.proveedor = {
          ...formValue,
          cuit: cuitSinGuiones, // Reemplazar el CUIT con el valor numérico
          direccion: this.direccionCompleta,
        };                        
        this.proveedor.idProveedor = this.proveedorEditar.idProveedor;
        this.proveedor.id = this.proveedorEditar.id;
        this.proveedor.contactos = this.contactos;
        //console.log()(this.cliente);     
        this.proveedor.tarifaTipo = tarifaSeleccionada; // Asigna el tipo de tarifa
        this.proveedor.condFiscal = this.condFiscal;
        this.proveedor.tarifaAsignada = this.proveedorEditar.tarifaAsignada;
       console.log(this.proveedor);      
        this.addItem("Edicion");        
        this.activeModal.close();    
      }else{
        let formValue = this.form.value;
        // Eliminar los guiones del CUIT
        let cuitSinGuiones = Number(formValue.cuit.replace(/-/g, ''));  
        this.direccionCompleta = {provincia: this.$provinciaSeleccionada, municipio: this.$municipioSeleccionado, localidad: this.$localidadSeleccionada, domicilio: this.form.value.direccion}             
        this.proveedor = {
          ...formValue,
          cuit: cuitSinGuiones, // Reemplazar el CUIT con el valor numérico
          direccion: this.direccionCompleta,
        };                
        this.proveedor.idProveedor = new Date().getTime();
        this.proveedor.contactos = this.contactos;
        //console.log()(this.cliente);     
        this.proveedor.tarifaTipo = tarifaSeleccionada; // Asigna el tipo de tarifa
        this.proveedor.condFiscal = this.condFiscal;
        this.proveedor.tarifaAsignada = tarifaSeleccionada.general ? tarifaGeneral[0] === null ? false : true : false;
        console.log(this.proveedor);      
        this.addItem("Alta");        
        this.activeModal.close();    
      }      
    } else{
      //alert("error en el formulario")
      Swal.fire({
        icon: "error",
        
        text: "El formulario contiene errores ",
//        
      });

    } 
    
   }

    armarForm(){
      this.form.patchValue({
        razonSocial: this.proveedorEditar.razonSocial,
        direccion: this.proveedorEditar.direccion.domicilio,
        cuit: this.formatCuit(this.proveedorEditar.cuit),
      });
      this.formTipoTarifa.patchValue({
          general: this.proveedorEditar.tarifaTipo.general, 
          especial: this.proveedorEditar.tarifaTipo.especial,
          eventual: this.proveedorEditar.tarifaTipo.eventual,
          personalizada: this.proveedorEditar.tarifaTipo.personalizada,      
      });
      this.$provinciaSeleccionada = this.proveedorEditar.direccion.provincia;
      this.$municipioSeleccionado = this.proveedorEditar.direccion.municipio;
      this.$localidadSeleccionada = this.proveedorEditar.direccion.localidad;
      this.contactos = this.proveedorEditar.contactos;
      this.condFiscal = this.proveedorEditar.condFiscal;
    }    

    changeCondFiscal(e:any){          
      this.condFiscal = e.target.value
      console.log("this.condFiscal: ", this.condFiscal);
      
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
   

   addItem(modo:string): void {
    let titulo = "";
    if(modo === "Alta"){
      titulo = "el alta"
    } else if (modo === "Edicion"){
      titulo = "la edicion"
    }


    Swal.fire({
      title: `¿Confirmar ${titulo} del Proveedor?`,
      //text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {     
        if(modo === "Alta")   {
          this.storageService.addItem(this.componente, this.proveedor, this.proveedor.idProveedor, "ALTA", `Alta de Proveedor ${this.proveedor.razonSocial}`)
        } else if (modo === "Edicion"){
          this.storageService.updateItem(this.componente, this.proveedor, this.proveedor.idProveedor,"EDITAR", `Edición de Proveedor ${this.proveedor.razonSocial}`)
        }              
        Swal.fire({
          title: "Confirmado",
          text: `${modo} exitosa`,
          icon: "success"
        }).then((result)=>{
          if (result.isConfirmed) {
            this.activeModal.close();
          }
        });   
        
      }
    });   
  }

  toggle() {
    this.mostrarFormulario = !this.mostrarFormulario;
    ////console.log()(this.form);
  }

  eliminarContacto(indice:number){
     Swal.fire({
          title: `Desea eliminar el contacto del Proveedor?`,
          //text: "You won't be able to revert this!",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Confirmar",
          cancelButtonText: "Cancelar"
        }).then((result) => {
          if (result.isConfirmed) {     
            this.contactos.splice(indice, 1);    
            Swal.fire({
              title: "Confirmado",
              text: `Contacto borrado`,
              icon: "success"
            })           
          }
        });       
   
  }

  abrirModalContactos(): void {   
   
    {
      const modalRef = this.modalService.open(ModalContactoProveedoresComponent, {
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
          //console.log("contacto:" ,result);
          if(result !== undefined){
            this.contactos.push(result);
            console.log(this.contactos);
          }
       
        },
        (reason) => {}
      );
    }
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.form.get(controlName);
    return control?.hasError(errorName) && control.touched;
  }

  formatCuit(cuitNumber: number | string): string {
    // Convertir el número a string, si no lo es
    const cuitString = cuitNumber.toString();
  
    // Validar que tiene exactamente 11 dígitos
    if (cuitString.length !== 11 || isNaN(Number(cuitString))) {
      throw new Error('El CUIT debe ser un número de 11 dígitos');
    }
  
    // Insertar los guiones en las posiciones correctas
    return `${cuitString.slice(0, 2)}-${cuitString.slice(2, 10)}-${cuitString.slice(10)}`;
  }

  selectProvincia(e:any){
    console.log(e.target.value);
    this.$municipioSeleccionado = "";
    this.$localidadSeleccionada = "";
    this.$provinciaSeleccionada = e.target.value;
    this.cargarMunicipios()
  }

  cargarMunicipios(): void {
    if (this.$provinciaSeleccionada) {
      this.domicilioServ.getMunicipios(this.$provinciaSeleccionada).subscribe({
        next: (data) => {
          this.$municipios = data.municipios;
          console.log(this.$municipios);
        },
        error: (error) => {
          console.error('Error al obtener municipios:', error);
        }
      });
    }
  }

  selectMunicipio(e:any){
    console.log(e.target.value);    
    this.$localidadSeleccionada = "";
    this.$municipioSeleccionado = e.target.value;
    this.cargarLocalidades()
  }

  cargarLocalidades(): void {
    if (this.$municipioSeleccionado) {
      this.domicilioServ.getLocalidades(this.$municipioSeleccionado, this.$provinciaSeleccionada).subscribe({
        next: (data) => {
          this.$localidades = data.localidades;
          console.log(this.$localidades);
        },
        error: (error) => {
          console.error('Error al obtener localidades:', error);
        }
      });
    }
  }

  selectLocalidad(e:any){
    console.log(e.target.value);
    this.$localidadSeleccionada = e.target.value;
    
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
