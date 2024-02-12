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
  checkboxesSeleccionados: boolean[]  |  any= [];
  unidadesConFrio!: boolean |  any;
  acompaniante: boolean |  any = false ;


  constructor(private fb: FormBuilder, private storageService: StorageService, private router: Router) {
    this.form = this.fb.group({      
      fecha: ["", Validators.required],            
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
    if(e.target.value === "si"){
      this.acompaniante = true;
    }else{
      this.acompaniante = false;
    }
    //console.log("acompaniante: ", this.acompaniante);
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

  onSubmit(){

    if (this.form.get('fecha').value) {
      // La fecha está presente, guardar el formulario
      this.armarOp()
    } else {
      // Muestra un mensaje de error o realiza otra acción
      alert("falta la fecha")
    } 

 
    /* let checkbox = this.getIndicesSeleccionados()
    console.log("checkboxs: ",checkbox);
    const choferesCheckboxs: any[] = [];
    for (const index of checkbox) {
      if (index >= 0) {
        let choferes = this.getChoferesConRefrigeracion();
        console.log(choferes);
        
        choferesCheckboxs.push(choferes[index]);
      }
    }
    console.log("objetoSeleccionado: ", choferesCheckboxs);

    choferesCheckboxs.forEach(chofer =>{
      if (this.form.get('fecha').value) {
        // La fecha está presente, guardar el formulario
        this.armarOp(chofer)
      } else {
        // Muestra un mensaje de error o realiza otra acción
        alert("error")
      }
     
    }) */
    this.form.reset(); 

    

    /* let checkbox = this.getIndicesSeleccionados()
    console.log("checkboxs: ",checkbox);
    const choferesCheckboxs: any[] = [];
    for (const index of checkbox) {
      if (index >= 0) {
        let choferes = this.getChoferesConRefrigeracion();
        console.log(choferes);
        
        choferesCheckboxs.push(choferes[index]);
      }
    }
    console.log("objetoSeleccionado: ", choferesCheckboxs);

    choferesCheckboxs.forEach(chofer =>{
      this.armarOp(chofer)
    })
    this.form.reset(); */
    
   }

   armarOp(){
    console.log("armarOp. chofer: ", this.choferSeleccionado);
    
    this.op = this.form.value;
    this.op.chofer = this.choferSeleccionado[0];
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
   
    this.form.reset(); 
    //this.resetearVista();
    //this.router.navigate(['/op/op-diarias']);     


  }

  
  // Método para manejar el cambio de estado de un checkbox
 /*  toggleCheckbox(index: number) {
    this.checkboxesSeleccionados[index] = !this.checkboxesSeleccionados[index];
    console.log("este es el indice: ", index, "y este el estado: ", this.checkboxesSeleccionados[index]);
    
  }
 */


 // map para crear un nuevo array de índices donde los elementos con valor true en checkboxesSeleccionados tendrán el índice correspondiente
 // y los elementos con valor false tendrán -1. 
 // Luego, utiliza filter para eliminar todos los -1 del array resultante, dejando solo los índices de los elementos con valor true.
 /* getIndicesSeleccionados(): number[] {
  return this.checkboxesSeleccionados
    .map((valor: boolean, index: any) => (valor === true ? index : -1))
    .filter((index: number) => index !== -1);
} */

getChoferesConRefrigeracion(): Chofer[] {
  if(this.unidadesConFrio){
    return this.$choferes.filter(chofer => chofer.vehiculo.refrigeracion);
  }else{
    return this.$choferes.filter(chofer => !chofer.vehiculo.refrigeracion);
  }
  
}
/* resetearVista() {
  // Aquí puedes realizar cualquier lógica necesaria antes de resetear la vista

  // Ahora, puedes resetear la vista de diferentes maneras, por ejemplo, limpiando o reiniciando variables.
  // Por ejemplo, si tienes una variable llamada 'datos' que se muestra en la vista, puedes reiniciarla:
  this.clienteSeleccionado = null;
  this.choferSeleccionado = null
  //this.checkboxesSeleccionados = null
  this.unidadesConFrio = null
  this.acompaniante = null;

  // También puedes forzar un cambio de detección para actualizar la vista
  // Esto asumiría que 'datos' está vinculado a la vista y cualquier cambio en 'datos' actualizará la vista.
  // Esto se hace utilizando el cambio de detección de Angular.
} */

 get Fecha() {
  return this.form.get('fecha');
} 
}
