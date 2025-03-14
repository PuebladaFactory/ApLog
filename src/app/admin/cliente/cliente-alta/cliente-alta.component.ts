import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Cliente, Contacto  } from 'src/app/interfaces/cliente';
import { TarifaGralCliente, TarifaTipo } from 'src/app/interfaces/tarifa-gral-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';
import { ModalContactoComponent } from '../modal-contacto/modal-contacto.component';
import { ValidarService } from 'src/app/servicios/validar/validar.service';
import { ConId } from 'src/app/interfaces/conId';
import { DomicilioService } from 'src/app/servicios/domicilio/domicilio.service';

@Component({
  selector: 'app-cliente-alta',
  templateUrl: './cliente-alta.component.html',
  styleUrls: ['./cliente-alta.component.scss']
})
export class ClienteAltaComponent implements OnInit {

  @Input() fromParent:any

  componente:string = "clientes"
  form:any;
  formContacto:any;
  formTipoTarifa:any;
  cliente!: ConId<Cliente>;
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

  constructor(private fb: FormBuilder, private storageService: StorageService, private modalService: NgbModal, public activeModal: NgbActiveModal, private domicilioServ:  DomicilioService) {
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

    this.formTipoTarifa = this.fb.group({
      general: [true],  // Seleccionado por defecto
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

   onSubmit(){
    //////console.log()(new Date().getTime());   
    if(this.$provinciaSeleccionadaF === "" || this.$municipioSeleccionadoF === "" || this.$localidadSeleccionadaF === ""){ return this.mensajesError("Debe completar el domicilio fiscal")};
    if(this.$provinciaSeleccionadaO === "" || this.$municipioSeleccionadoO === "" || this.$localidadSeleccionadaO === ""){ return this.mensajesError("Debe completar el domicilio operativo")};
    if(this.condFiscal === ""){ return this.mensajesError("Debe seleccionar una condición fiscal")};
    const tarifaSeleccionada = this.getTarifaTipo();    
    let tarifaGeneral: TarifaGralCliente [] = this.storageService.loadInfo("tarifasGralCliente")
    if (this.form.valid) {
      if(this.fromParent.modo === "edicion"){
        let formValue = this.form.value;
        // Eliminar los guiones del CUIT
        let cuitSinGuiones = Number(formValue.cuit.replace(/-/g, ''));       
        this.direccionFiscalCompleta = {provincia: this.$provinciaSeleccionadaF, municipio: this.$municipioSeleccionadoF, localidad: this.$localidadSeleccionadaF, domicilio: this.form.value.direccionFiscal};
        this.direccionOperativaCompleta = {provincia: this.$provinciaSeleccionadaO, municipio: this.$municipioSeleccionadoO, localidad: this.$localidadSeleccionadaO, domicilio: this.form.value.direccionOperativa};
        this.cliente = {
          ...formValue,
          cuit: cuitSinGuiones, // Reemplazar el CUIT con el valor numérico
          direccionFiscal: this.direccionFiscalCompleta,
          direccionOperativa: this.direccionOperativaCompleta,
        };                
        this.cliente.idCliente = this.clienteEditar.idCliente;  
        this.cliente.id = this.clienteEditar.id;       
        this.cliente.contactos = this.contactos;
        ////console.log()(this.cliente);     
        this.cliente.tarifaTipo = tarifaSeleccionada; // Asigna el tipo de tarifa
        this.cliente.condFiscal = this.condFiscal;
        this.cliente.tarifaAsignada = this.clienteEditar.tarifaAsignada;
        this.cliente.idTarifa = this.cliente.idTarifa;
        ////console.log(this.cliente);      
        this.addItem("Edicion");        
        this.activeModal.close();    
      }else{
        let formValue = this.form.value;
        // Eliminar los guiones del CUIT
        let cuitSinGuiones = Number(formValue.cuit.replace(/-/g, ''));   
        this.direccionFiscalCompleta = {provincia: this.$provinciaSeleccionadaF, municipio: this.$municipioSeleccionadoF, localidad: this.$localidadSeleccionadaF, domicilio: this.form.value.direccionFiscal};
        this.direccionOperativaCompleta = {provincia: this.$provinciaSeleccionadaO, municipio: this.$municipioSeleccionadoO, localidad: this.$localidadSeleccionadaO, domicilio: this.form.value.direccionOperativa};
        this.cliente = {
          ...formValue,
          cuit: cuitSinGuiones, // Reemplazar el CUIT con el valor numérico
          direccionFiscal: this.direccionFiscalCompleta,
          direccionOperativa: this.direccionOperativaCompleta,
        };                
        //this.cliente = this.form.value
        this.cliente.idCliente = new Date().getTime();
        this.cliente.contactos = this.contactos;
        this.cliente.condFiscal = this.condFiscal;
        ////console.log()(this.cliente);     
        this.cliente.tarifaTipo = tarifaSeleccionada; // Asigna el tipo de tarifa
        this.cliente.tarifaAsignada = tarifaSeleccionada.general? tarifaGeneral[0] === null ? false : true : false;
        this.cliente.idTarifa = tarifaSeleccionada.general? tarifaGeneral[0] === null ? 0 : tarifaGeneral[0].idTarifa : 0;
        ////console.log(this.cliente);      
        this.addItem("Alta");        
        this.activeModal.close();    
      }      
    } else{
      this.mensajesError("El formulario contiene errores");      
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

    changeCondFiscal(e:any){          
      this.condFiscal = e.target.value
      console.log("this.condFiscal: ", this.condFiscal);
      
     }  

   addItem(modo:string): void {
    let titulo = "";
    if(modo === "Alta"){
      titulo = "el alta"
    } else if (modo === "Edicion"){
      titulo = "la edicion"
    }
    console.log("this.cliente: ", this.cliente);    
    Swal.fire({
      title: `¿Confirmar ${titulo} del Cliente?`,
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
          this.storageService.addItem(this.componente, this.cliente, this.cliente.idCliente, "ALTA", `Alta de Cliente ${this.cliente.razonSocial}`)
        } else if (modo === "Edicion"){
          this.storageService.updateItem(this.componente, this.cliente, this.cliente.idCliente, "EDITAR", `Cliente ${this.cliente.razonSocial} editado`)
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
    this.formTipoTarifa.patchValue({
        general: this.clienteEditar.tarifaTipo.general, 
        especial: this.clienteEditar.tarifaTipo.especial,
        eventual: this.clienteEditar.tarifaTipo.eventual,
        personalizada: this.clienteEditar.tarifaTipo.personalizada,      
    });
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
