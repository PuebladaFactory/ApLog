import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Operacion } from 'src/app/interfaces/operacion';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';

@Component({
  selector: 'app-op-alta',
  templateUrl: './op-alta.component.html',
  styleUrls: ['./op-alta.component.scss']
})
export class OpAltaComponent implements OnInit {

  componente:string = "operaciones"
  form:any;
  op!: Operacion;
  clientes!: Cliente[];
  choferes!: Chofer[];
  clienteSeleccionado!: Cliente;
  choferSeleccionado!: Chofer;


  constructor(private fb: FormBuilder, private dbFirebase: DbFirestoreService, private router: Router) {
    this.form = this.fb.group({      
      fecha: [""],  
          
    })
   }

  ngOnInit(): void {
    this.getClientes();
    this.getChoferes();
  }

  getClientes(){
    this.clientes = JSON.parse(localStorage.getItem("clientes")||`{}`)
  }

  getChoferes(){
    this.choferes = JSON.parse(localStorage.getItem("choferes")||`{}`)
  }

  changeCliente(e: any) {
    console.log(e.target.value)
    let clienteForm

    clienteForm = this.clientes.filter(function (cliente: any) { 
      return cliente.razonSocial === e.target.value
    })

    this.clienteSeleccionado = clienteForm[0];               
    console.log(this.clienteSeleccionado);

  }

  changeChofer(e: any) {
    console.log(e.target.value)
    let choferForm

    choferForm = this.choferes.filter(function (chofer: any) { 
      return chofer.apellido === e.target.value
    })

    this.choferSeleccionado = choferForm[0];               
    console.log(this.choferSeleccionado);

  }

  onSubmit(){
        
    this.op = this.form.value;

    this.op.chofer = this.choferSeleccionado;
    this.op.cliente = this.clienteSeleccionado;
    this.op.idOperacion = new Date().getTime();
    this.op.estado = 1;
    console.log(this.op); 
    
    this.addItem()
    
   }

   addItem(): void {
   
    this.dbFirebase.create(this.componente, this.op)
      .then((data) => console.log(data))
      .then(() => this.ngOnInit())
      .then(() => this.form.reset())
      .then(() => this.router.navigate(['/op/op-diarias']))
      .catch((e) => console.log(e.message));
  }



}
