import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';


@Component({
  selector: 'app-choferes-listado',
  templateUrl: './choferes-listado.component.html',
  styleUrls: ['./choferes-listado.component.scss']
})
export class ChoferesListadoComponent implements OnInit {
  
  choferes!: Chofer[];
  form:any;
  categorias = [
    { id: 0, categoria: 'maxi', },
    { id: 1, categoria: 'mini', },
    { id: 2, categoria: 'liviano', },
    { id: 3, categoria: 'otro', },
    ];
  categoriaSeleccionada!:string;
  choferEditar!: Chofer;
  componente:string = 'choferes';

  constructor(private fb: FormBuilder, private dbFirebase: DbFirestoreService,){
    this.form = this.fb.group({
      
      nombre: [""], 
      apellido: [""],      
      fechaNac: [""],
      email: [""],
      celular: [""],
      dominio: [""],
  })
  }
  
  ngOnInit(): void { 
    this.leerClientes()  
  }

  leerClientes(){
    this.choferes = JSON.parse(localStorage.getItem("choferes")||`{}`)
  }

  changeCategoria(e: any) {
    console.log(e.target.value)  ; 
    
    this.categoriaSeleccionada = e.target.value
    console.log(this.categoriaSeleccionada);
    
  }

  abrirEdicion(chofer:Chofer):void {
    this.choferEditar = chofer;    
    console.log("este es el chofer a editar: ", this.choferEditar);
    this.armarForm();
    
  }

  armarForm(){
    this.form.patchValue({
      nombre: this.choferEditar.nombre,
      apellido: this.choferEditar.apellido,      
      fechaNac: this.choferEditar.fechaNac,
      email: this.choferEditar.email,
      celular: this.choferEditar.celular,
      dominio: this.choferEditar.dominio,
    })
  }

  onSubmit(){   
    this.choferEditar.nombre = this.form.value.nombre;
    this.choferEditar.apellido = this.form.value.apellido;
    this.choferEditar.fechaNac = this.form.value.fechaNac;
    this.choferEditar.email = this.form.value.email;
    this.choferEditar.celular = this.form.value.celular;
    this.choferEditar.dominio = this.form.value.dominio
    this.choferEditar.categoria = this.categoriaSeleccionada;
    console.log("este es el cliente editado: ", this.choferEditar);
    this.update();    
   }

   update(): void {
   
    this.dbFirebase.update(this.componente, this.choferEditar)
      .then((data) => console.log(data))
      .then(() => this.ngOnInit())
      .then(() => this.form.reset())
      .catch((e) => console.log(e.message));
  }

}
