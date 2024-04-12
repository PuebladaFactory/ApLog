import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Operacion } from 'src/app/interfaces/operacion';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';


@Component({
  selector: 'app-op-alta',
  templateUrl: './op-alta.component.html',
  styleUrls: ['./op-alta.component.scss']
})
export class OpAltaComponent implements OnInit {

  componente:string = "operacionesActivas"
  form:any;
  op!: Operacion;
  clientes$!: any;
  choferes$!: any;
  $choferes!: Chofer[];
  $clientes!: Cliente[];
  clienteSeleccionado!: Cliente ;
  choferSeleccionado!: Chofer[] ;  
  acompaniante: boolean |  any = false ;
  tarifaEspecial: boolean = false ;

  constructor(private fb: FormBuilder, private storageService: StorageService) {
    this.form = this.fb.group({      
      fecha: ["", Validators.required],            
      observaciones: [""],
    })
   }

  ngOnInit(): void {    
    this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;
    });
    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;
    });   
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

  selectAcompaniante(e: any) {    
    console.log(e.target.value)
    if(e.target.value === "si"){
      this.acompaniante = true;
    }else{
      this.acompaniante = false;
    }  
  }

   changeChofer(e: any) {
    console.log(e.target.value)
    console.log(this.$choferes);
    
    let apellido = e.target.value.split(" ")[0];
    
    this.choferSeleccionado = this.$choferes.filter(function (chofer: any) { 
       return chofer.apellido === apellido
    });
    //this.choferSeleccionado = choferForm;               
    console.log(this.choferSeleccionado); 
  } 

  selectTarifaEspecial(e: any) {    
    console.log(e.target.value)
    if(e.target.value === "si"){
      this.tarifaEspecial = true;
      this.acompaniante = false;
    }else{
      this.tarifaEspecial = false;
    }  
  }

  onSubmit(){

    if (this.form.get('fecha').value) {
      // La fecha está presente, guardar el formulario
      this.armarOp()
    } else {
      // Muestra un mensaje de error o realiza otra acción
      alert("falta la fecha")
    } 

    this.form.reset(); 
   }

   armarOp(){
    console.log("armarOp. chofer: ", this.choferSeleccionado);
    
    this.op = this.form.value;
    this.op.chofer = this.choferSeleccionado[0];
    this.op.cliente = this.clienteSeleccionado;
    this.op.idOperacion = new Date().getTime();    
    this.op.acompaniante = this.acompaniante;
    this.op.facturada = false,
    this.op.facturaCliente = null;
    this.op.facturaChofer = null;
    this.op.tarifaEspecial = this.tarifaEspecial;    
    
    console.log("esta es la operacion: ", this.op);     
    this.addItem();
   }

   addItem(): void {
    this.storageService.addItem(this.componente, this.op); 
   
    this.form.reset(); 

  }  

 get Fecha() {
  return this.form.get('fecha');
} 
}
