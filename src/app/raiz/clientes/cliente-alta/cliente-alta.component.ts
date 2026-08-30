import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Cliente, Contacto  } from 'src/app/interfaces/cliente';
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';
import { ModalContactoComponent } from '../modal-contacto/modal-contacto.component';
import { ValidarService } from 'src/app/servicios/validar/validar.service';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { DomicilioService } from 'src/app/servicios/domicilio/domicilio.service';
import { ClienteFormData } from 'src/app/servicios/clientes/cliente-factory.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { RefTarifaHabilitada, tarifaTipoDesdeHabilitadas } from 'src/app/interfaces/tarifa-habilitada';

@Component({
    selector: 'app-cliente-alta',
    templateUrl: './cliente-alta.component.html',
    styleUrls: ['./cliente-alta.component.scss'],
    standalone: false
})
export class ClienteAltaComponent implements OnInit {

  @Input() fromParent:any

  componente:string = "clientes"
  form:any;
  formContacto:any;
  formTipoTarifa:any;
  cliente!: ConIdType<Cliente>;
  contactos: Contacto[] = [];
  contactoEditar!: Contacto
  mostrarFormulario: boolean = false;
  soloVista:boolean = false;
  clienteEditar!: ConId<Cliente>;
  modal:any;
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

  constructor(private fb: FormBuilder, private storageService: StorageService, private modalService: NgbModal, public activeModal: NgbActiveModal, private domicilioServ: DomicilioService, private clienteService: ClienteService) {
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
      personalizada: [false],
    })



   }

   ngOnInit(): void {
      console.log("1)", this.fromParent);
      let clienteOriginal = this.fromParent.item
      this.clienteEditar = structuredClone(clienteOriginal)
      if(this.fromParent.modo === "vista"){
        this.soloVista = true;
        this.armarForm()
        this.form.disable();
        this.formTipoTarifa.disable();
      }else if(this.fromParent.modo === "edicion"){
        this.soloVista = false;        
        console.log("2) this.clienteEditar: ", this.clienteEditar);
        
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
        const clienteExistente = this.clienteService.verificarCuitDuplicado(cuitIngresado);
        if (clienteExistente) {
          Swal.fire({
            icon: 'warning',
            title: 'CUIT duplicado',
            text: `El CUIT ingresado ya está asignado al cliente ${clienteExistente.razonSocial}.`,
          });
          return;
        }
      }
      this.addItem();
    } else {
      this.mensajesError('El formulario contiene errores');
    }
  }

  /** Tildar 'eventual' destilda y deshabilita los otros 3 (excluyente). */
  onEventualChange(checked: boolean): void {
    if (checked) {
      this.formTipoTarifa.patchValue(
        { general: false, especial: false, personalizada: false, eventual: true },
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
      this.formTipoTarifa.get('personalizada')!.disable({ emitEvent: false });
      this.formTipoTarifa.get('eventual')!.enable({ emitEvent: false });
    } else {
      this.formTipoTarifa.get('general')!.enable({ emitEvent: false });
      this.formTipoTarifa.get('especial')!.enable({ emitEvent: false });
      this.formTipoTarifa.get('personalizada')!.enable({ emitEvent: false });
      const algunaActiva = v.general || v.especial || v.personalizada;
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
    if (v.personalizada) lista.push({ nivel: 'personalizada' });
    return lista;
  }

    changeCondFiscal(e:any){          
      this.condFiscal = e.target.value
      console.log("this.condFiscal: ", this.condFiscal);
      
     }  

  addItem(): void {
    const titulo = this.fromParent.modo === 'edicion' ? 'la edición' : 'el alta';
    Swal.fire({
      title: `¿Confirmar ${titulo} del Cliente?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      this.cargando = true;
      if (result.isConfirmed) {
        const data: ClienteFormData = {
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
          this.clienteService.editarCliente(this.clienteEditar as ConIdType<Cliente>, data)
            .then(() => {
              this.cargando = false;
              Swal.fire('Confirmado', 'Cambios guardados', 'success').then(() => {
                this.activeModal.close();
              });
            })
            .catch(e => {
              this.cargando = false;
              this.mensajesError(`Error al guardar: ${e.message}`);
            });
        } else {
          this.clienteService.altaCliente(data)
            .then(() => {
              this.cargando = false;
              Swal.fire('Confirmado', 'Alta exitosa', 'success').then(() => {
                this.activeModal.close();
              });
            })
            .catch(e => {
              this.cargando = false;
              this.mensajesError(`Error al guardar: ${e.message}`);
            });
        }
      }
    });
  }

  toggle() {
    this.mostrarFormulario = !this.mostrarFormulario;
    //////console.log()(this.form);
  }

  

  eliminarContacto(indice:number){

    console.log("llega aca?");
    

    Swal.fire({
      title: `Desea eliminar el contacto del Cliente?`,
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

  editarContacto(contacto: Contacto, indice:number){    
    this.contactoEditar = contacto;
    this.abrirModalContactos("editar", indice)

  }

  abrirModalContactos(modo:string, indice:number): void {   
   
    {
      const modalRef = this.modalService.open(ModalContactoComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'md', 
        //backdrop:"static" 
      });

     let info = {
        modo: modo,
        item: this.contactoEditar,
      }; 
      ////console.log()(info);
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
          ////console.log("contacto:" ,result);
          if(result){
            if(modo === 'alta'){
              this.contactos.push(result);
            }else{
              this.contactos[indice] = result;
            }
            
            ////console.log(this.contactos);
          }
          
          
          //this.storageService.getAllSorted("clientes", 'idCliente', 'asc')
//        this.selectCrudOp(result.op, result.item);
        //this.mostrarMasDatos(row);
        },
        (reason) => {}
      );
    }
  }

  armarForm(){
    this.form.patchValue({
      razonSocial: this.clienteEditar.razonSocial,
      direccionFiscal: this.clienteEditar.direccionFiscal.domicilio,
      direccionOperativa: this.clienteEditar.direccionOperativa.domicilio,
      cuit: this.formatCuit(this.clienteEditar.cuit),
    });
    const tipoTarifaCliente = tarifaTipoDesdeHabilitadas(this.clienteEditar.tarifasHabilitadas);
    this.formTipoTarifa.patchValue({
        general: tipoTarifaCliente.general,
        especial: tipoTarifaCliente.especial,
        eventual: tipoTarifaCliente.eventual,
        personalizada: tipoTarifaCliente.personalizada,
    });
    this.actualizarDisabledTarifa();
    this.$provinciaSeleccionadaF = this.clienteEditar.direccionFiscal.provincia;
    this.$municipioSeleccionadoF = this.clienteEditar.direccionFiscal.municipio;
    this.$localidadSeleccionadaF = this.clienteEditar.direccionFiscal.localidad;
    this.$provinciaSeleccionadaO = this.clienteEditar.direccionOperativa.provincia;
    this.$municipioSeleccionadoO = this.clienteEditar.direccionOperativa.municipio;
    this.$localidadSeleccionadaO = this.clienteEditar.direccionOperativa.localidad;
    this.condFiscal = this.clienteEditar.condFiscal
    this.contactos = this.clienteEditar.contactos;
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

    mensajesError(msj:string){
      Swal.fire({
        icon: "error",
        //title: "Oops...",
        text: `${msj}`
        //footer: `${msj}`
      });
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

}
