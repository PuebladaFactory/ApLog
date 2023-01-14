import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { Chofer } from 'src/app/interfaces/chofer';
import { StorageService } from 'src/app/servicios/storage/storage.service';

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

  

  constructor(private fb: FormBuilder, private storageService: StorageService, private router:Router) {
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
   
    this.storageService.addItem(this.componente, this.chofer)
    this.form.reset() 
    this.ngOnInit()
    this.router.navigate(['/choferes/listado'])
  }

  
  changeCategoria(e: any) {
    console.log(e.target.value)  ; 
    
    this.categoriaSeleccionada = e.target.value
    console.log(this.categoriaSeleccionada);
    
  }

}
