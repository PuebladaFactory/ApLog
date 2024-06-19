import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Contacto, Proveedor } from 'src/app/interfaces/proveedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ProveedoresAltaComponent } from '../proveedores-alta/proveedores-alta.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-proveedores-listado',
  templateUrl: './proveedores-listado.component.html',
  styleUrls: ['./proveedores-listado.component.scss']
})
export class ProveedoresListadoComponent implements OnInit {
  
  proveedores$!: any;
  edicion:boolean = false;
  proveedorEditar!: Proveedor;
  form:any;
  componente:string ="proveedores";
  //mostrar:boolean = false;
  formContacto: any;
  contactoEditar!: Contacto;
  indice!:number;
  $proveedores:any;
  soloVista: boolean = false;
  searchText!: string;


  constructor(private fb: FormBuilder, private storageService: StorageService, private modalService: NgbModal){
    this.form = this.fb.group({      
      razonSocial: [""], 
      direccion: [""],
      cuit: [""],      
    })

    this.formContacto = this.fb.group({
      puesto:[""],
      apellido:[""],
      nombre: [""],
      telefono: [""],
      email:[""],
    })
  }
  
  ngOnInit(): void { 
    //this.proveedores$ = this.storageService.proveedores$; 
    this.storageService.proveedores$.subscribe(data => {
      this.$proveedores = data;
    })
  }
  
  abrirEdicion(proveedor:Proveedor):void {
    this.soloVista = false;    
    this.proveedorEditar = proveedor;    
    ////console.log()("este es el cliente a editar: ", this.clienteEditar);
    this.armarForm();
    
  }

  armarForm(){
    this.form.patchValue({
      razonSocial: this.proveedorEditar.razonSocial,
      direccion: this.proveedorEditar.direccion,
      cuit: this.proveedorEditar.cuit
      /* email: this.clienteEditar.email,
      telefono: this.clienteEditar.telefono, */
    })
  }

  abrirVista(proveedor:Proveedor):void {
    this.soloVista = true;
    this.proveedorEditar = proveedor;    
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
    this.proveedorEditar.razonSocial = this.form.value.razonSocial;
    this.proveedorEditar.direccion = this.form.value.direccion;
    this.proveedorEditar.cuit = this.form.value.cuit;
    
    ////console.log()("estos son los contactos: ", this.formContacto.value);
    ////console.log()("estos es el clienteEditar: ", this.proveedorEditar);
    this.storageService.updateItem(this.componente, this.proveedorEditar);
    this.borrarForms();
    this.edicion = false;    
    this.ngOnInit();
  }

  editarPerfil(){
    this.edicion = !this.edicion;
  }

  armarContacto(contacto: Contacto, i: number){
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
    
    
    this.contactoEditar = this.formContacto.value;
    //console.log()(this.indice);
    if(this.indice === undefined){
      //console.log()(this.indice);
      //console.log()(this.contactoEditar);
      this.proveedorEditar.contactos.push(this.contactoEditar)
    } else{
      //console.log()(this.contactoEditar);
      //console.log()(this.indice);
      
      this.proveedorEditar.contactos[this.indice] = this.contactoEditar;
      //console.log()(this.proveedorEditar);  
    }
    //console.log()(this.proveedorEditar.contactos);
    
  }

  eliminarProveedor(proveedor: Proveedor){
    Swal.fire({
      title: "¿Eliminar el Proveedor?",
      text: "No se podrá revertir esta acción",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        this.storageService.deleteItem(this.componente, proveedor);
        Swal.fire({
          title: "Confirmado",
          text: "El Proveedor ha sido borrado",
          icon: "success"
        });
      }
    });   
    
    /* this.ngOnInit(); */
    
  }

  eliminarContacto(indice:number){
    this.proveedorEditar.contactos.splice(indice, 1);    
  }

  borrarForms(){
    this.form.reset()
    this.formContacto.reset()
  }

  openModal(): void {   
   
    {
      const modalRef = this.modalService.open(ProveedoresAltaComponent, {
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
          this.storageService.getAllSorted("proveedores", 'idProveedor', 'asc')
//        this.selectCrudOp(result.op, result.item);
        //this.mostrarMasDatos(row);
        },
        (reason) => {}
      );
    }
  }

}
