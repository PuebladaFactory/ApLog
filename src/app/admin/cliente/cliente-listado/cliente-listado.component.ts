import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Cliente } from 'src/app/interfaces/cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';


@Component({
  selector: 'app-cliente-listado',
  templateUrl: './cliente-listado.component.html',
  styleUrls: ['./cliente-listado.component.scss']
})
export class ClienteListadoComponent implements OnInit {
  
  clientes$!: any;
  edicion:boolean = false;
  clienteEditar!: Cliente;
  form:any;
  componente:string ="clientes"

  constructor(private fb: FormBuilder, private storageService: StorageService,){
    this.form = this.fb.group({      
      razonSocial: [""], 
      direccion: [""],
      email: [""],
      telefono: [""],      
    })
  }
  
  ngOnInit(): void { 
    this.clientes$ = this.storageService.clientes$; 
  }
  
  abrirEdicion(cliente:Cliente):void {
    this.clienteEditar = cliente;    
    //console.log("este es el cliente a editar: ", this.clienteEditar);
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
    //console.log("este es el cliente editado: ", this.clienteEditar);
    this.update();    
   }

   update(): void {
    this.storageService.updateItem(this.componente, this.clienteEditar);
    this.form.reset();
    this.ngOnInit();
  }

}
