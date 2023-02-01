import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { Cliente, Contacto } from 'src/app/interfaces/cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-cliente-alta',
  templateUrl: './cliente-alta.component.html',
  styleUrls: ['./cliente-alta.component.scss']
})
export class ClienteAltaComponent implements OnInit {

  @Input() data:any

  componente:string = "clientes"
  form:any;
  formContacto:any;
  cliente!: Cliente;
  contactos: Contacto[] = [];
  mostrarFormulario: boolean = false;

  constructor(private fb: FormBuilder, private storageService: StorageService, private router: Router) {
    this.form = this.fb.group({      
      razonSocial: [""], 
      cuit: [""],
      direccion: [""],      
    });

    this.formContacto = this.fb.group({      
      puesto: [""], 
      apellido: [""],
      nombre: [""],      
      telefono: [""],
      email: [""],
    })
   }

   ngOnInit(): void {}

   onSubmit(){
    //console.log(new Date().getTime());    
    this.cliente = this.form.value
    this.cliente.idCliente = new Date().getTime();
    this.cliente.contactos = this.contactos;
    console.log(this.cliente);     
    this.addItem();    
   }

   addItem(): void {
    this.storageService.addItem(this.componente, this.cliente)
    /* this.form.reset() 
    this.ngOnInit() */
    this.router.navigate(['/clientes/listado'])   
  }

  toggle() {
    this.mostrarFormulario = !this.mostrarFormulario;
    //console.log(this.form);
  }

  guardarContacto(){
    this.contactos.push(this.formContacto.value);
    this.formContacto.reset();
    this.mostrarFormulario = !this.mostrarFormulario;
  }

  eliminarContacto(indice:number){
    this.contactos.splice(indice, 1);    
  }

}
