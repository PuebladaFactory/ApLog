import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Cliente, Contacto } from 'src/app/interfaces/cliente';
import { TarifaTipo } from 'src/app/interfaces/tarifa-gral-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';
import { ModalContactoComponent } from '../modal-contacto/modal-contacto.component';

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
  cliente!: Cliente;
  contactos: Contacto[] = [];
  mostrarFormulario: boolean = false;
  soloVista:boolean = false;
  clienteEditar!: Cliente;
  modal:any;

  constructor(private fb: FormBuilder, private storageService: StorageService, private modalService: NgbModal, public activeModal: NgbActiveModal) {
    this.form = this.fb.group({      
      razonSocial: ["",[Validators.required, Validators.maxLength(30)]], 
      cuit: ["",[Validators.required, Validators.minLength(11), Validators.maxLength(11)]],
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
      if(this.fromParent.modo === "vista"){
        this.soloVista = true;
        this.clienteEditar = this.fromParent.item
        this.armarForm()
      }else if(this.fromParent.modo === "edicion"){
        this.soloVista = false;
        this.clienteEditar = this.fromParent.item
        this.armarForm()
      }else {
        this.soloVista = false;
      }
      
   }

   onSubmit(){
    ////console.log()(new Date().getTime());   
    const tarifaSeleccionada = this.getTarifaTipo();    
    if (this.form.valid) {
      if(this.fromParent.modo === "edicion"){
        this.cliente = this.form.value
        this.cliente.idCliente = this.clienteEditar.idCliente;
        this.cliente.id = this.clienteEditar.id;
        this.cliente.contactos = this.contactos;
        //console.log()(this.cliente);     
        this.cliente.tarifaTipo = tarifaSeleccionada; // Asigna el tipo de tarifa
        //console.log(this.cliente);      
        this.addItem("Edicion");        
        this.activeModal.close();    
      }else{
        this.cliente = this.form.value
        this.cliente.idCliente = new Date().getTime();
        this.cliente.contactos = this.contactos;
        //console.log()(this.cliente);     
        this.cliente.tarifaTipo = tarifaSeleccionada; // Asigna el tipo de tarifa
        //console.log(this.cliente);      
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
          this.storageService.addItem(this.componente, this.cliente)
        } else if (modo === "Edicion"){
          this.storageService.updateItem(this.componente, this.cliente)
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
    this.contactos.splice(indice, 1);    
  }

  abrirModalContactos(): void {   
   
    {
      const modalRef = this.modalService.open(ModalContactoComponent, {
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
          this.contactos.push(result);
          console.log(this.contactos);
          
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
      direccion: this.clienteEditar.direccion,
      cuit: this.clienteEditar.cuit,
    });
    this.formTipoTarifa.patchValue({
        general: this.clienteEditar.tarifaTipo.general, 
        especial: this.clienteEditar.tarifaTipo.especial,
        eventual: this.clienteEditar.tarifaTipo.eventual,
        personalizada: this.clienteEditar.tarifaTipo.personalizada,      
    });
    this.contactos = this.clienteEditar.contactos;
  }

}
