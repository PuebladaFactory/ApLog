import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { LoginComponent } from 'src/app/appLogin/login/login.component';
import { Cliente, Contacto } from 'src/app/interfaces/cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { OpAltaComponent } from '../../operaciones/op-alta/op-alta.component';
import { ClienteAltaComponent } from '../cliente-alta/cliente-alta.component';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-cliente-listado',
  templateUrl: './cliente-listado.component.html',
  styleUrls: ['./cliente-listado.component.scss']
})
export class ClienteListadoComponent implements OnInit {
  
  searchText!:string;
  clientes$!: any;
  edicion:boolean = false;
  clienteEditar!: Cliente;
  form:any;
  componente:string ="clientes";
  //mostrar:boolean = false;
  formContacto: any;
  contactoEditar!: Contacto;
  indice!:number;
  $clientes:any;
  soloVista: boolean = false;


  constructor(private fb: FormBuilder, private storageService: StorageService,  private modalService: NgbModal){
    this.form = this.fb.group({      
      razonSocial: [""], 
      direccion: [""],
      cuit: [""],      
    })

    this.formContacto = this.fb.group({
      puesto: ["", [Validators.required, Validators.maxLength(30)]],
      apellido: ["",[Validators.required, Validators.maxLength(30)]], 
      nombre: ["", [Validators.required, Validators.maxLength(30)]],
      telefono: ["",[Validators.required,Validators.minLength(10), Validators.maxLength(10)]], 
      email: ["",[Validators.required, Validators.email]],
      /*puesto:[""],
      apellido:[""],
      nombre: [""],
      telefono: [""],
      email:[""],*/
    });
  }
  
  ngOnInit(): void { 
    //this.clientes$ = this.storageService.clientes$; 
    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;
    })
  }
  
  abrirEdicion(cliente:Cliente):void {
    this.soloVista = false;
    this.clienteEditar = cliente;    
    ////console.log()("este es el cliente a editar: ", this.clienteEditar);
    this.armarForm();    
  }

  armarForm(){
    this.form.patchValue({
      razonSocial: this.clienteEditar.razonSocial,
      direccion: this.clienteEditar.direccion,
      cuit: this.clienteEditar.cuit
      /* email: this.clienteEditar.email,
      telefono: this.clienteEditar.telefono, */
    })
  }

  abrirVista(cliente:Cliente):void {
    this.soloVista = true;
    this.clienteEditar = cliente;    
    ////console.log()("este es el cliente a editar: ", this.clienteEditar);
    this.armarForm();    
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
        this.update();            
        Swal.fire({
          title: "Confirmado",
          text: "Los cambios se han guardado",
          icon: "success"
        });
      }
    });    
    
   }

   update(): void {
    this.clienteEditar.razonSocial = this.form.value.razonSocial;
    this.clienteEditar.direccion = this.form.value.direccion;
    this.clienteEditar.cuit = this.form.value.cuit;
    ////console.log()("estos son los contactos: ", this.formContacto.value);
    ////console.log()("estos es el clienteEditar: ", this.clienteEditar);    
    this.storageService.updateItem(this.componente, this.clienteEditar);
    this.borrarForms()
    this.edicion = false;
    //this.ngOnInit();
  }

  editarPerfil(){
    this.edicion = !this.edicion;
  }

  armarContacto(contacto: Contacto, i: number){
    //console.log()();
    
    //console.log()(i);
    this.indice = i;
    this.contactoEditar = contacto;
    this.formContacto.patchValue({
      puesto: contacto.puesto,
      apellido: contacto.apellido,
      nombre: contacto.nombre,
      telefono: contacto.telefono,
      email: contacto.email,
    })
  }

  guardarContacto(){
    ////console.log()(this.formContacto.value);
    //console.log()(this.clienteEditar.contactos);
    
    this.contactoEditar = this.formContacto.value;
    //console.log()(this.indice);
    if(this.indice === undefined){
      //console.log()(this.indice);
      //console.log()(this.contactoEditar);
      this.clienteEditar.contactos.push(this.contactoEditar)
    } else{
      //console.log()(this.contactoEditar);
      //console.log()(this.indice);
      
      this.clienteEditar.contactos[this.indice] = this.contactoEditar;
      //console.log()(this.clienteEditar);  
    }
    //console.log()(this.clienteEditar.contactos);
    
    
  }

  eliminarContacto(indice:number){
    this.clienteEditar.contactos.splice(indice, 1);    
  }

  agregarContacto(){
    //console.log()(this.clienteEditar.contactos);
    
  }
  /* toogleMostrar(){
    this.mostrar = !this.mostrar;
  } */
  eliminarCliente(cliente: Cliente){
    Swal.fire({
      title: "¿Eliminar el Cliente?",
      text: "No se podrá revertir esta acción",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        this.storageService.deleteItem(this.componente, cliente);
        Swal.fire({
          title: "Confirmado",
          text: "El Cliente ha sido borrado",
          icon: "success"
        });
      }
    });   
    
    /* this.ngOnInit(); */
    
  }

  borrarForms(){
    this.form.reset()
    this.formContacto.reset()
  }

  openModal(): void {   
   
    {
      const modalRef = this.modalService.open(ClienteAltaComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'lg', 
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
          this.storageService.getAllSorted("clientes", 'idCliente', 'asc')
//        this.selectCrudOp(result.op, result.item);
        //this.mostrarMasDatos(row);
        },
        (reason) => {}
      );
    }
  }

}
