import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Operacion } from 'src/app/interfaces/operacion';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';

@Component({
  selector: 'app-op-diarias',
  templateUrl: './op-diarias.component.html',
  styleUrls: ['./op-diarias.component.scss']
})
export class OpDiariasComponent implements OnInit {

  componente:string = "operaciones"
  form:any;
  operaciones!: Operacion[];
  opEditar!: Operacion;
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
    this.getChoferes();
    this.getClientes();
    this.getOperaciones();
  }

  
  abrirEdicion(op:Operacion):void {
    this.opEditar = op;    
    this.clienteSeleccionado = op.cliente;
    this.choferSeleccionado = op.chofer;
    console.log("este es la op a editar: ", this.opEditar);
    this.armarForm();
    
  }

  armarForm(){
    this.form.patchValue({
      fecha: this.opEditar.fecha
    })
  }

  onSubmit(){   
    this.opEditar.fecha = this.form.value.fecha;
    this.opEditar.cliente = this.clienteSeleccionado;
    this.opEditar.chofer  = this.choferSeleccionado;
    

    console.log("este es el cliente editado: ", this.opEditar);
    this.update();    
   }

   update(): void {
   
    this.dbFirebase.update(this.componente, this.opEditar)
      .then((data) => console.log(data))
      .then(() => this.ngOnInit())
      .then(() => this.form.reset())
      .catch((e) => console.log(e.message));
  }

  eliminarOperacion(id:any){
    this.dbFirebase.delete(this.componente, id)
      .then((data) => console.log(data))
      .then(() => this.ngOnInit())
      //.then(() => this.router.navigate(['/operaciones/listado']))
      .catch((e) => console.log(e.message));
  }

  getClientes(){
    this.clientes = JSON.parse(localStorage.getItem("clientes")||`{}`)
  }

  getChoferes(){
    this.choferes = JSON.parse(localStorage.getItem("choferes")||`{}`)
  }

  getOperaciones(){
    this.operaciones = JSON.parse(localStorage.getItem("operaciones")||`{}`)
    this.operaciones = this.operaciones.filter(function(op:Operacion){
      return op.estado === 1
    })
    console.log("estas son las operaciones activas: ", this.operaciones);
    
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



}
