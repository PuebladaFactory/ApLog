import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
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
  clienteSeleccionado!: Cliente;
  choferSeleccionado!: Chofer;
  checkboxesSeleccionados: boolean[] = [];
  unidadesConFrio: boolean = false;
  acompaniante: boolean = false;


  constructor(private fb: FormBuilder, private storageService: StorageService, private router: Router) {
    this.form = this.fb.group({      
      fecha: [""],            
      observaciones: [""],
    })
   }

  ngOnInit(): void {
    /* this.clientes$ = this.storageService.clientes$; */
    /* this.choferes$ = this.storageService.choferes$;        */
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

  selectUCF(e: any) {
    console.log(e.target.value)
    if(e.target.value === "si"){
      this.unidadesConFrio = true;
    }else{
      this.unidadesConFrio = false;
    }   
    
  }

  selectAcompaniante(e: any) {
    console.log(e.target.value)
    console.log(e.target.value)
    if(e.target.value === "si"){
      this.acompaniante = true;
    }else{
      this.acompaniante = false;
    }
    //console.log("acompaniante: ", this.acompaniante);
  }

  /* changeChofer(e: any) {
    //console.log(e.target.value)
    let choferForm = this.choferes$;
    choferForm = choferForm.filter(function (chofer: any) { 
      return chofer.apellido === e.target.value
    });
    this.choferSeleccionado = choferForm[0];               
    console.log(this.choferSeleccionado);
  } */

  onSubmit(){

    let checkbox = this.getIndicesSeleccionados()
    console.log("checkboxs: ",checkbox);
    const choferesCheckboxs: any[] = [];
    for (const index of checkbox) {
      if (index >= 0) {
        choferesCheckboxs.push(this.$choferes[index]);
      }
    }
    console.log("objetoSeleccionado: ", choferesCheckboxs);

    choferesCheckboxs.forEach(chofer =>{
      this.armarOp(chofer)
    })
    this.form.reset();
    
   }

   armarOp(chofer:Chofer){
    console.log("armarOp. chofer: ", chofer);
    
    this.op = this.form.value;
    this.op.chofer = chofer;
    this.op.cliente = this.clienteSeleccionado;
    this.op.idOperacion = new Date().getTime();
    this.op.unidadesConFrio = this.unidadesConFrio;
    this.op.acompaniante = this.acompaniante
    //this.op.estado = 1;
    //console.log("UCF: ", this.unidadesConFrio);
    //console.log("AC: ", this.acompaniante);
    
    console.log("esta es la operacion: ", this.op);     
    this.addItem();
   }

   addItem(): void {
    this.storageService.addItem(this.componente, this.op); 
   
    /* this.form.reset(); */
    //this.router.navigate(['/op/op-diarias']);     


  }

  
  // Método para manejar el cambio de estado de un checkbox
  toggleCheckbox(index: number) {
    this.checkboxesSeleccionados[index] = !this.checkboxesSeleccionados[index];
    console.log("este es el indice: ", index, "y este el estado: ", this.checkboxesSeleccionados[index]);
    
  }



 // map para crear un nuevo array de índices donde los elementos con valor true en checkboxesSeleccionados tendrán el índice correspondiente
 // y los elementos con valor false tendrán -1. 
 // Luego, utiliza filter para eliminar todos los -1 del array resultante, dejando solo los índices de los elementos con valor true.
 getIndicesSeleccionados(): number[] {
  return this.checkboxesSeleccionados
    .map((valor, index) => (valor === true ? index : -1))
    .filter(index => index !== -1);
}
}
