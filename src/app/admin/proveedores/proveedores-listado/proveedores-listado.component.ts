import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Contacto, Proveedor } from 'src/app/interfaces/proveedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';

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
  componente:string ="clientes";
  //mostrar:boolean = false;
  formContacto: any;
  contactoEditar!: Contacto;
  indice!:number;
  $proveedores:any;


  constructor(private fb: FormBuilder, private storageService: StorageService,){
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
    this.proveedores$ = this.storageService.proveedores$; 
    this.storageService.proveedores$.subscribe(data => {
      this.$proveedores = data;
    })
  }
  
  abrirEdicion(proveedor:Proveedor):void {
    this.proveedorEditar = proveedor;    
    //console.log("este es el cliente a editar: ", this.clienteEditar);
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

  onSubmit(){   
    this.proveedorEditar.razonSocial = this.form.value.razonSocial;
    this.proveedorEditar.direccion = this.form.value.direccion;
    this.proveedorEditar.cuit = this.form.value.cuit;
    //this.clienteEditar.contactos = this.formContacto.value;
    /* this.clienteEditar.email = this.form.value.email;
    this.clienteEditar.telefono = this.form.value.telefono; */
    //console.log("este es el cliente editado: ", this.clienteEditar);
    console.log("estos son los contactos: ", this.formContacto.value);
    console.log("estos es el clienteEditar: ", this.proveedorEditar);
    
    this.update();    
   }

   update(): void {
    this.storageService.updateItem(this.componente, this.proveedorEditar);
    this.form.reset();
    this.ngOnInit();
  }

  editarPerfil(){
    this.edicion = !this.edicion;
  }

  armarContacto(contacto: Contacto, i: number){
    console.log(i);
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
    //console.log(this.formContacto.value);
    this.contactoEditar = this.formContacto.value;
    //console.log(this.contactoEditar);
    this.proveedorEditar.contactos[this.indice] = this.contactoEditar;
    console.log(this.proveedorEditar);
    
  }
  /* toogleMostrar(){
    this.mostrar = !this.mostrar;
  } */


}
