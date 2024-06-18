import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModule, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Operacion } from 'src/app/interfaces/operacion';
import { BuscarTarifaService } from 'src/app/servicios/buscarTarifa/buscar-tarifa.service';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2'


@Component({
  selector: 'app-op-alta',
  templateUrl: './op-alta.component.html',
  styleUrls: ['./op-alta.component.scss'],
  //providers: [NgbActiveModal]
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
  choferSeleccionado!: Chofer ;  
  acompaniante: boolean |  any = false ;
  tarifaEspecial: boolean = false ;
  $tarifasChoferes!:any;
  $tarifasProveedores!:any;
  $proveedores!:any;

  constructor(private fb: FormBuilder, private storageService: StorageService, private buscarTarifaServ: BuscarTarifaService, ) {
    this.form = this.fb.group({
      fecha: ['', Validators.required],
      cliente: ['', Validators.required],
      chofer: ['', Validators.required],
      tarifaEspecial: ['', Validators.required],
      acompaniante: ['', Validators.required],
      observaciones: ['',]
    });
   }

  ngOnInit(): void {    
    this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;
    });
    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;
    }); 
    this.storageService.historialTarifas$.subscribe(data => {
      this.$tarifasChoferes = data;
    });
    this.storageService.historialTarifasProveedores$.subscribe(data => {
      this.$tarifasProveedores = data;
    });
    this.storageService.proveedores$.subscribe(data => {
      this.$proveedores = data;
    })       
    
  }

  changeCliente(e: any) {
    ////console.log()(e.target.value)
    
    let clienteForm = this.$clientes.filter(function (cliente: Cliente) { 
        return cliente.idCliente === Number(e.target.value)
    });
    ////console.log()(clienteForm);
    
    this.clienteSeleccionado = clienteForm[0];               
    ////console.log()(this.clienteSeleccionado);
    this.form.patchValue({ cliente: e.target.value });
  }

 /*  selectAcompaniante(e: any) {    
    ////console.log()(e.target.value)
    if(e.target.value === "si"){
      this.acompaniante = true;
    }else{
      this.acompaniante = false;
    }  
  } */

   changeChofer(e: any) {
    ////console.log()(e.target.value)    
    let chofer = this.$choferes.filter(function (chofer: Chofer) { 
       return chofer.idChofer === Number(e.target.value)
    });
    ////console.log()(chofer);    
    this.choferSeleccionado = chofer[0];               
    ////console.log()(this.choferSeleccionado); 
    //this.form.patchValue({ chofer: e.target.value });
  } 

  /* selectTarifaEspecial(e: any) {    
    //console.log()(e.target.value)
    if(e.target.value === "si"){
      this.tarifaEspecial = true;
      this.acompaniante = false;
    }else{
      this.tarifaEspecial = false;
    }  
  } */

    selectTarifaEspecial(event: any) {
      let value = event.target.value;
      this.tarifaEspecial = value === 'si';
      this.form.patchValue({ tarifaEspecial: value });
  
      if (this.tarifaEspecial) {
        this.form.get('acompaniante').clearValidators();
      } else {
        this.form.get('acompaniante').setValidators(Validators.required);
      }
      this.form.get('acompaniante').updateValueAndValidity();
    }
  
    selectAcompaniante(event: any) {
      this.form.patchValue({ acompaniante: event.target.value });
    }

  onSubmit(){
    ////console.log()(this.form.value);
    ////console.log()("1)chofer: ", this.choferSeleccionado);
    ////console.log()("2)cliente: ", this.clienteSeleccionado);
    ////console.log()("3)tarifa especial: ", this.tarifaEspecial);
    ////console.log()("4)acompañante: ", this.acompaniante);    
    if (this.form.valid) {
      this.buscarErrores();
    }    
    
   }

   buscarErrores(){
      let respuesta = this.buscarTarifaServ.buscarTarifa(this.choferSeleccionado, this.clienteSeleccionado)
      ////console.log()("RESPUESTA: ", respuesta);
      switch (respuesta) {
          case "cliente":
            Swal.fire({
              icon: "error",
              //title: "Oops...",
              text: "El cliente seleccionado no tiene tarifas asignadas",
      //        footer: '<a href="#">Why do I have this issue?</a>'
            });
            break;
          case "chofer": 
            Swal.fire({
              icon: "error",
              //title: "Oops...",
              text: "El chofer seleccionado no tiene tarifas asignadas",
      //        footer: '<a href="#">Why do I have this issue?</a>'
            });
              break;  
          case "proveedor": 
          Swal.fire({
            icon: "error",
            //title: "Oops...",
            text: "El chofer seleccionado trabaja con un proveedor que no tiene tarifas asignadas",
    //        footer: '<a href="#">Why do I have this issue?</a>'
          });
            break;     
          case "nada": 
            this.armarOp();          
            break;    
          default:
            Swal.fire({
              icon: "error",
              //title: "Oops...",
              text: "Error",
      //        footer: '<a href="#">Why do I have this issue?</a>'
            });
            break;  
        }    
   }

   armarOp(){
    ////console.log()("armarOp. chofer: ", this.choferSeleccionado);
    
    this.op = this.form.value;
    this.op.chofer = this.choferSeleccionado;
    this.op.cliente = this.clienteSeleccionado;
    this.op.idOperacion = new Date().getTime();    
    this.op.acompaniante = this.acompaniante;
    this.op.facturada = false,
    this.op.facturaCliente = null;
    this.op.facturaChofer = null;
    this.op.tarifaEspecial = this.tarifaEspecial;    
    
    ////console.log()("esta es la operacion: ", this.op);  
    Swal.fire({
      title: "¿Desea agregar la operación?",
      //text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Agregar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        this.addItem();
        Swal.fire({
          title: "Confirmado",
          text: "La operación ha sido agregada.",
          icon: "success"
        }).then((result)=>{
          if (result.isConfirmed) {
            //this.activeModal.close();
          }
        });   
        
      }
    });   
   
   }

   addItem(): void {
    console.log("llamada al storage desde op-alta, addItem");
    this.storageService.addItem(this.componente, this.op);    
    this.form.reset();     
  }  

 get Fecha() {
  return this.form.get('fecha');
} 

}
