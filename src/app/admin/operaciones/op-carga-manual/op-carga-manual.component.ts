import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Operacion } from 'src/app/interfaces/operacion';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-op-carga-manual',
  templateUrl: './op-carga-manual.component.html',
  styleUrls: ['./op-carga-manual.component.scss']
})
export class OpCargaManualComponent implements OnInit {

  componente:string = "operacionesActivas"
  form:any;
  op!: Operacion;
  clientes$!: any;
  $clientes!:any;
  choferes$!: any;
  $choferes!: any;
  clienteSeleccionado!: Cliente;
  choferSeleccionado!: Chofer;
  refrigeracion!:boolean;
  ayudante!:boolean;

  constructor(private fb: FormBuilder, private storageService: StorageService, private router: Router) {
    this.form = this.fb.group({      
      fecha: [""],    
      observaciones: [""],
    })
   }

   ngOnInit(): void {
    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;
    })
    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;
    })
    //this.clientes$ = this.storageService.clientes$;
    //this.choferes$ = this.storageService.choferes$;       
  }

  changeCliente(e: any) {
    console.log(e.target.value)
    let clienteForm = this.$clientes;
    clienteForm = clienteForm.filter(function (cliente: any) { 
      return cliente.razonSocial === e.target.value
    });
    this.clienteSeleccionado = clienteForm[0];               
    console.log(this.clienteSeleccionado);

  }

  changeChofer(e: any) {
    //console.log(e.target.value)
    let choferForm = this.$choferes;
    choferForm = choferForm.filter(function (chofer: any) { 
      return chofer.apellido === e.target.value
    });
    this.choferSeleccionado = choferForm[0];               
    console.log(this.choferSeleccionado);
  }

  changeProveedor(e: any) {
    //console.log(e.target.value)
    let choferForm = this.$choferes;
    choferForm = choferForm.filter(function (chofer: any) { 
      return chofer.apellido === e.target.value
    });
    this.choferSeleccionado = choferForm[0];               
    console.log(this.choferSeleccionado);
  }

  selectRefrigeracion(e:any){ 
    switch (e.target.value) {
      case "si":{
        this.refrigeracion = true;
        break;
      }
      case "no":{
        this.refrigeracion = false;
        break;
      }
      default:{
        break;
      }
    }
  }

  selectAyudante(e:any){ 
    switch (e.target.value) {
      case "si":{
        this.ayudante = true;
        break;
      }
      case "no":{
        this.ayudante = false;
        break;
      }
      default:{
        break;
      }
    }
  }

  onSubmit(){
        
    this.op = this.form.value;
    this.op.chofer = this.choferSeleccionado;
    this.op.cliente = this.clienteSeleccionado;
    this.op.idOperacion = new Date().getTime();
    
    //this.op.estado = 1;
    //console.log(this.op);     
    this.addItem();
    
   }

   addItem(): void {
    this.storageService.addItem(this.componente, this.op);
    this.form.reset();
    //this.router.navigate(['/op/op-diarias']);     
  }

}
