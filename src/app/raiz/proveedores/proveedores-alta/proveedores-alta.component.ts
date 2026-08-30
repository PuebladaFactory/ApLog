import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Contacto, Proveedor } from 'src/app/interfaces/proveedor';
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';
import { ModalContactoProveedoresComponent } from '../modal-contacto-proveedores/modal-contacto-proveedores.component';
import { ValidarService } from 'src/app/servicios/validar/validar.service';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { DomicilioService } from 'src/app/servicios/domicilio/domicilio.service';
import { ProveedorFormData } from 'src/app/servicios/proveedores/proveedor-factory.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { RefTarifaHabilitada, tarifaTipoDesdeHabilitadas } from 'src/app/interfaces/tarifa-habilitada';

@Component({
    selector: 'app-proveedores-alta',
    templateUrl: './proveedores-alta.component.html',
    styleUrls: ['./proveedores-alta.component.scss'],
    standalone: false
})
export class ProveedoresAltaComponent implements OnInit {
  @Input() fromParent:any

  componente:string = "proveedores"
  form:any;
  formContacto:any;
  proveedor!: ConIdType<Proveedor>;
  contactos: Contacto[] = [];
  mostrarFormulario: boolean = false;
  formTipoTarifa:any;
  soloVista:boolean = false;
  proveedorEditar!: ConIdType<Proveedor>;
  $provincias:any;
  $provinciaSeleccionadaF: string = "";
  $municipiosF!:any;
  $municipioSeleccionadoF:string = "";
  $localidadesF!:any;
  $localidadSeleccionadaF:string = "";
  direccionFiscalCompleta = {provincia:"", municipio: "", localidad: "", domicilio: ""};
  condFiscal: string = "";
  $provinciaSeleccionadaO: string = "";
  $municipiosO!:any;
  $municipioSeleccionadoO:string = "";
  $localidadesO!:any;
  $localidadSeleccionadaO:string = "";
  direccionOperativaCompleta = {provincia:"", municipio: "", localidad: "", domicilio: ""};
  cargando: boolean = false;

  constructor(private fb: FormBuilder, private storageService: StorageService, private router: Router, public activeModal: NgbActiveModal, private modalService: NgbModal, private domicilioServ: DomicilioService, private proveedorService: ProveedorService) {
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
      direccionFiscal: [""],
      direccionOperativa: [""],
    });

    // Alta: nada tildado por defecto — el usuario elige explícitamente.
    this.formTipoTarifa = this.fb.group({
      general: [false],
      especial: [false],
      eventual: [false],
    })
   }

   ngOnInit(): void {
    console.log("1)", this.fromParent);
    let proveedorOriginal = this.fromParent.item
    this.proveedorEditar = structuredClone(proveedorOriginal)
    if(this.fromParent.modo === "vista"){
      this.soloVista = true;
      this.armarForm();
      this.form.disable();
      this.formTipoTarifa.disable();
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

  onSubmit(): void {
    const tarifaGeneral = this.storageService.loadInfo('tarifasGralProveedor');
    if (this.$provinciaSeleccionadaF === '' || this.$municipioSeleccionadoF === '' || this.$localidadSeleccionadaF === '') {
      return this.mensajesError('Debe completar el domicilio fiscal');
    }
    if (this.$provinciaSeleccionadaO === '' || this.$municipioSeleccionadoO === '' || this.$localidadSeleccionadaO === '') {
      return this.mensajesError('Debe completar el domicilio operativo');
    }
    if (this.condFiscal === '') {
      return this.mensajesError('Debe seleccionar una condición fiscal');
    }
    if (this.getTarifasHabilitadas().length === 0) {
      return this.mensajesError('Debe habilitar al menos un tipo de tarifa');
    }
    if (this.form.valid) {
      if (this.fromParent.modo !== 'edicion') {
        const cuitIngresado = Number(this.form.value.cuit.replace(/-/g, ''));
        const proveedorExistente = this.proveedorService.verificarCuitDuplicado(cuitIngresado);
        if (proveedorExistente) {
          Swal.fire({
            icon: 'warning',
            title: 'CUIT duplicado',
            text: `El CUIT ingresado ya está asignado al proveedor ${proveedorExistente.razonSocial}.`,
          });
          return;
        }
      }
      this.addItem();
    } else {
      this.mensajesError('El formulario contiene errores');
    }
  }

    armarForm(){
      this.form.patchValue({
        razonSocial: this.proveedorEditar.razonSocial,
        direccionFiscal: this.proveedorEditar.direccionFiscal.domicilio,
        direccionOperativa: this.proveedorEditar.direccionOperativa.domicilio,
        cuit: this.formatCuit(this.proveedorEditar.cuit),
      });
      const tipoTarifaProveedor = tarifaTipoDesdeHabilitadas(this.proveedorEditar.tarifasHabilitadas);
      this.formTipoTarifa.patchValue({
          general: tipoTarifaProveedor.general,
          especial: tipoTarifaProveedor.especial,
          eventual: tipoTarifaProveedor.eventual,
      });
      this.actualizarDisabledTarifa();
      this.$provinciaSeleccionadaF = this.proveedorEditar.direccionFiscal.provincia;
      this.$municipioSeleccionadoF = this.proveedorEditar.direccionFiscal.municipio;
      this.$localidadSeleccionadaF = this.proveedorEditar.direccionFiscal.localidad;
      this.$provinciaSeleccionadaO = this.proveedorEditar.direccionOperativa.provincia;
      this.$municipioSeleccionadoO = this.proveedorEditar.direccionOperativa.municipio;
      this.$localidadSeleccionadaO = this.proveedorEditar.direccionOperativa.localidad;
      this.contactos = this.proveedorEditar.contactos;
      this.condFiscal = this.proveedorEditar.condFiscal;
    }

    changeCondFiscal(e:any){          
      this.condFiscal = e.target.value
      console.log("this.condFiscal: ", this.condFiscal);
      
     }  

    /** Tildar 'eventual' destilda y deshabilita los otros 3 (excluyente). */
    onEventualChange(checked: boolean): void {
      if (checked) {
        this.formTipoTarifa.patchValue(
          { general: false, especial: false, eventual: true },
          { emitEvent: false },
        );
      }
      this.actualizarDisabledTarifa();
    }

    /** Tildar cualquiera de los otros 3 deshabilita 'eventual' mientras haya alguno activo. */
    onOtraTarifaChange(): void {
      this.actualizarDisabledTarifa();
    }

    /** Aplica la regla "eventual excluyente" al estado enabled/disabled de los 4 switches,
     *  según el valor actual del form. Reusado por onEventualChange/onOtraTarifaChange/armarForm(). */
    private actualizarDisabledTarifa(): void {
      const v = this.formTipoTarifa.getRawValue();
      if (v.eventual) {
        this.formTipoTarifa.get('general')!.disable({ emitEvent: false });
        this.formTipoTarifa.get('especial')!.disable({ emitEvent: false });
        this.formTipoTarifa.get('eventual')!.enable({ emitEvent: false });
      } else {
        this.formTipoTarifa.get('general')!.enable({ emitEvent: false });
        this.formTipoTarifa.get('especial')!.enable({ emitEvent: false });
        const algunaActiva = v.general || v.especial;
        const eventualControl = this.formTipoTarifa.get('eventual')!;
        algunaActiva ? eventualControl.disable({ emitEvent: false }) : eventualControl.enable({ emitEvent: false });
      }
    }

    getTarifasHabilitadas(): RefTarifaHabilitada[] {
      const v = this.formTipoTarifa.getRawValue();
      if (v.eventual) return [{ nivel: 'eventual' }];
      const lista: RefTarifaHabilitada[] = [];
      if (v.general) lista.push({ nivel: 'general' });
      if (v.especial) lista.push({ nivel: 'especial' });
      return lista;
    }


  addItem(): void {
    const titulo = this.fromParent.modo === 'edicion' ? 'la edición' : 'el alta';
    Swal.fire({
      title: `¿Confirmar ${titulo} del Proveedor?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.cargando = true;
        const data: ProveedorFormData = {
          razonSocial: this.form.value.razonSocial,
          cuit: this.form.value.cuit,
          condFiscal: this.condFiscal,
          provinciaFiscal: this.$provinciaSeleccionadaF,
          municipioFiscal: this.$municipioSeleccionadoF,
          localidadFiscal: this.$localidadSeleccionadaF,
          domicilioFiscal: this.form.value.direccionFiscal,
          provinciaOperativa: this.$provinciaSeleccionadaO,
          municipioOperativa: this.$municipioSeleccionadoO,
          localidadOperativa: this.$localidadSeleccionadaO,
          domicilioOperativa: this.form.value.direccionOperativa,
          tarifasHabilitadas: this.getTarifasHabilitadas(),
          contactos: this.contactos,
        };

        if (this.fromParent.modo === 'edicion') {
          this.proveedorService.editarProveedor(this.proveedorEditar, data)
            .then(() => {
              Swal.fire('Confirmado', 'Cambios guardados', 'success').then(() => {
                this.cargando = false;
                this.activeModal.close();
              });
            })
            .catch(e => this.mensajesError(`Error al guardar: ${e.message}`));
        } else {
          this.proveedorService.altaProveedor(data)
            .then(() => {
              Swal.fire('Confirmado', 'Alta exitosa', 'success').then(() => {
                this.cargando = false;
                this.activeModal.close();
              });
            })
            .catch(e => this.mensajesError(`Error al guardar: ${e.message}`));
        }
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

  selectProvincia(e:any, modo:string ){      
    if(modo === "fiscal"){
      console.log(e.target.value);
      this.$municipioSeleccionadoF = "";
      this.$localidadSeleccionadaF = "";
      this.$provinciaSeleccionadaF = e.target.value;
      this.cargarMunicipios("fiscal")
    } else {
      console.log(e.target.value);
      this.$municipioSeleccionadoO = "";
      this.$localidadSeleccionadaO = "";
      this.$provinciaSeleccionadaO = e.target.value;
      this.cargarMunicipios("operativo")
    }
    
  }

  cargarMunicipios(modo:string): void {
    if(modo === "fiscal"){
      if (this.$provinciaSeleccionadaF) {
        this.domicilioServ.getMunicipios(this.$provinciaSeleccionadaF).subscribe({
          next: (data) => {
            this.$municipiosF = data.municipios;
            console.log(this.$municipiosF);
          },
          error: (error) => {
            console.error('Error al obtener municipios:', error);
          }
        });
      }
    }else{
      if (this.$provinciaSeleccionadaO) {
        this.domicilioServ.getMunicipios(this.$provinciaSeleccionadaO).subscribe({
          next: (data) => {
            this.$municipiosO = data.municipios;
            console.log(this.$municipiosO);
          },
          error: (error) => {
            console.error('Error al obtener municipios:', error);
          }
        });
      }
    }
    
  }

  selectMunicipio(e:any, modo: string){
    if(modo === "fiscal"){
      console.log(e.target.value);        
      this.$localidadSeleccionadaF = "";
      this.$municipioSeleccionadoF = e.target.value;
      this.cargarLocalidades("fiscal")
    }else{
      console.log(e.target.value);
      this.$localidadSeleccionadaO = "";
      this.$municipioSeleccionadoO = e.target.value;
      this.cargarLocalidades("operativo")
    }
    
  }

  cargarLocalidades(modo:string): void {
    if(modo === "fiscal"){
      if (this.$municipioSeleccionadoF) {
        this.domicilioServ.getLocalidades(this.$municipioSeleccionadoF, this.$provinciaSeleccionadaF).subscribe({
          next: (data) => {
            this.$localidadesF = data.localidades;
            console.log(this.$localidadesF);
          },
          error: (error) => {
            console.error('Error al obtener localidades:', error);
          }
        });
      }
    }else{
      if (this.$municipioSeleccionadoO) {
        this.domicilioServ.getLocalidades(this.$municipioSeleccionadoO, this.$provinciaSeleccionadaO).subscribe({
          next: (data) => {
            this.$localidadesO = data.localidades;
            console.log(this.$localidadesO);
          },
          error: (error) => {
            console.error('Error al obtener localidades:', error);
          }
        });
      }
    }
    
  }

  selectLocalidad(e:any, modo:string){
    if(modo === "fiscal"){
      console.log(e.target.value);
      this.$localidadSeleccionadaF = e.target.value;
    }else{
      console.log(e.target.value);
      this.$localidadSeleccionadaO = e.target.value;
    }
    
    
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
