import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { Cliente } from 'src/app/interfaces/cliente';
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
  cliente!: Cliente;

  constructor(private fb: FormBuilder, private storageService: StorageService, private router: Router) {
    this.form = this.fb.group({      
      razonSocial: [""], 
      direccion: [""],
      email: [""],
      telefono: [""],      
    })
   }

   ngOnInit(): void {}

   onSubmit(){
    //console.log(new Date().getTime());    
    this.cliente = this.form.value
    this.cliente.idCliente = new Date().getTime();
    //console.log(this.cliente);     
    this.addItem();    
   }

   addItem(): void {
    this.storageService.addItem(this.componente, this.cliente)
    /* this.form.reset() 
    this.ngOnInit() */
    this.router.navigate(['/clientes/listado'])
   
  }

}
