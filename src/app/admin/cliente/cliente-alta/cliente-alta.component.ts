import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { Cliente } from 'src/app/interfaces/cliente';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';

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

  constructor(private fb: FormBuilder, private dbFirebase: DbFirestoreService, private router: Router) {
    this.form = this.fb.group({
      
      razonSocial: [""], 
      direccion: [""],
      email: [""],
      telefono: [""],
      
  })
   }

   ngOnInit(): void {}



   onSubmit(){
    console.log(new Date().getTime());
    
    this.cliente = this.form.value

    this.cliente.idCliente = new Date().getTime();

    console.log(this.cliente); 
    
    this.addItem()
    
   }

   addItem(): void {
   
    this.dbFirebase.create(this.componente, this.cliente)
      .then((data) => console.log(data))
      .then(() => this.ngOnInit())
      .then(() => this.form.reset())
      .then(() => this.router.navigate(['/clientes/listado']))
      .catch((e) => console.log(e.message));
  }

}
