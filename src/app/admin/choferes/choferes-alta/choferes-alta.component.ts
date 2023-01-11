import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { Chofer } from 'src/app/interfaces/chofer';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';

@Component({
  selector: 'app-choferes-alta',
  templateUrl: './choferes-alta.component.html',
  styleUrls: ['./choferes-alta.component.scss']
})

export class ChoferesAltaComponent implements OnInit {

  @Input() data:any

  componente:string = "choferes"
  form:any;
  chofer!: Chofer;  
  categorias = [
  { id: 0, categoria: 'maxi', },
  { id: 1, categoria: 'mini', },
  { id: 2, categoria: 'liviano', },
  { id: 3, categoria: 'otro', },
  ];
  categoriaSeleccionada!:string;

  

  constructor(private fb: FormBuilder, private dbFirebase: DbFirestoreService, private router:Router) {
    this.form = this.fb.group({
      
      nombre: [""], 
      apellido: [""],      
      fechaNac: [""],
      email: [""],
      celular: [""],
      dominio: [""],
  })
   }

   ngOnInit(): void {}



   onSubmit(){
    console.log(new Date().getTime());
    
    this.chofer = this.form.value

    this.chofer.categoria = this.categoriaSeleccionada;

    this.chofer.idChofer = new Date().getTime();

    console.log(this.chofer); 
    
    this.addItem()
    
   }

   addItem(): void {
   
    this.dbFirebase.create(this.componente, this.chofer)
      .then((data) => console.log(data))
      .then(() => this.ngOnInit())
      .then(() => this.form.reset())
      .then(() => this.router.navigate(['/choferes/listado']))
      .catch((e) => console.log(e.message));
  }

  
  changeCategoria(e: any) {
    console.log(e.target.value)  ; 
    
    this.categoriaSeleccionada = e.target.value
    console.log(this.categoriaSeleccionada);
    
  }

}
