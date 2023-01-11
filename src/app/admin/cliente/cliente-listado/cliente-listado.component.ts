import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Cliente } from 'src/app/interfaces/cliente';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';


@Component({
  selector: 'app-cliente-listado',
  templateUrl: './cliente-listado.component.html',
  styleUrls: ['./cliente-listado.component.scss']
})
export class ClienteListadoComponent implements OnInit {
  
  clientes!: Cliente[];
  edicion:boolean = false;
  clienteEditar!: Cliente;
  form:any;
  componente:string ="clientes"

  constructor(private fb: FormBuilder, private dbFirebase: DbFirestoreService,){
    this.form = this.fb.group({
      
      razonSocial: [""], 
      direccion: [""],
      email: [""],
      telefono: [""],
      
  })
  }
  
  ngOnInit(): void { 
    this.leerClientes()  
  }

  leerClientes(){
    this.clientes = JSON.parse(localStorage.getItem("clientes")||`{}`)
  }

  abrirEdicion(cliente:Cliente):void {
    this.clienteEditar = cliente;    
    console.log("este es el cliente a editar: ", this.clienteEditar);
    this.armarForm();
    
  }

  armarForm(){
    this.form.patchValue({
      razonSocial: this.clienteEditar.razonSocial,
      direccion: this.clienteEditar.direccion,
      email: this.clienteEditar.email,
      telefono: this.clienteEditar.telefono,
    })
  }

  onSubmit(){   
    this.clienteEditar.razonSocial = this.form.value.razonSocial;
    this.clienteEditar.direccion = this.form.value.direccion;
    this.clienteEditar.email = this.form.value.email;
    this.clienteEditar.telefono = this.form.value.telefono;

    console.log("este es el cliente editado: ", this.clienteEditar);
    this.update();    
   }

   update(): void {
   
    this.dbFirebase.update(this.componente, this.clienteEditar)
      .then((data) => console.log(data))
      .then(() => this.ngOnInit())
      .then(() => this.form.reset())
      .catch((e) => console.log(e.message));
  }

}
