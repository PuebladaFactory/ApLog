import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Operacion } from 'src/app/interfaces/operacion';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-op-diarias',
  templateUrl: './op-diarias.component.html',
  styleUrls: ['./op-diarias.component.scss']
})
export class OpDiariasComponent implements OnInit {

  componente:string = "operacionesActivas"
  form:any;
  //operaciones$: any;
  opEditar!: Operacion;
  clientes$: any;
  choferes$: any;
  clienteSeleccionado!: Cliente;
  choferSeleccionado!: Chofer;
  opActivas$!: any;

  constructor(private fb: FormBuilder, private storageService: StorageService, private router: Router) {
    this.form = this.fb.group({      
      fecha: [""],    
    })
   }
  ngOnInit(): void {
    this.choferes$ = this.storageService.choferes$; 
    this.clientes$ = this.storageService.clientes$; 
    //this.operaciones$ = this.storageService.operaciones$;   
    //console.log("estas son las operaciones: ", this.operaciones$);
    this.opActivas$ = this.storageService.opActivas$    
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

    this.storageService.updateItem(this.componente, this.opEditar)
    this.ngOnInit()  
    this.form.reset()     
   
  }

  eliminarOperacion(op: Operacion){
    this.storageService.deleteItem(this.componente, op);
    this.ngOnInit();    
  }

  changeCliente(e: any) {
    console.log(e.target.value)
    let clienteForm

    clienteForm = this.clientes$.source._value.filter(function (cliente: any) { 
      return cliente.razonSocial === e.target.value
    })

    this.clienteSeleccionado = clienteForm[0];               
    console.log(this.clienteSeleccionado);

  }

  changeChofer(e: any) {
    console.log(e.target.value)
    let choferForm

    choferForm = this.choferes$.source._value.filter(function (chofer: any) { 
      return chofer.apellido === e.target.value
    })

    this.choferSeleccionado = choferForm[0];               
    console.log(this.choferSeleccionado);

  }



}
