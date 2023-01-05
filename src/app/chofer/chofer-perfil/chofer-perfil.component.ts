import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';


@Component({
  selector: 'app-chofer-perfil',
  templateUrl: './chofer-perfil.component.html',
  styleUrls: ['./chofer-perfil.component.css']
})
export class ChoferPerfilComponent implements OnInit {

  perfilForm:any;
  edicion:boolean = false;

  constructor(private fb: FormBuilder) {
    this.perfilForm = this.fb.group({
      id:[""],
      nombre: [""], 
      apellido: [""],
      fechaNac: [""],
      email: [""],
      celular: [""],
      patente: [""],
      categoria: [""],
  })
   }

  ngOnInit(): void {
  }

  onSubmit(){
    console.log(this.perfilForm.value);
    this.ngOnInit()
    this.editarPerfil();
    
  }

  editarPerfil(){
    this.edicion = !this.edicion;
  }

}
