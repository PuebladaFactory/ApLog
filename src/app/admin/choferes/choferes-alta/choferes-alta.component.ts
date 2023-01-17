import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { Chofer } from 'src/app/interfaces/chofer';
import { AdicionalKm, Jornada } from 'src/app/interfaces/jornada';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-choferes-alta',
  templateUrl: './choferes-alta.component.html',
  styleUrls: ['./choferes-alta.component.scss']
})

export class ChoferesAltaComponent implements OnInit {

  @Input() data:any

  componente!:string; 
  form:any;
  jornadaForm:any;
  adicionalForm:any;
  chofer!: Chofer;  
  categorias = [
  { id: 0, categoria: 'maxi', },
  { id: 1, categoria: 'mini', },
  { id: 2, categoria: 'liviano', },
  { id: 3, categoria: 'otro', },
  ];
  categoriaSeleccionada!:string;

  jornada!:Jornada;

   adicionalKm!:AdicionalKm;  

  constructor(private fb: FormBuilder, private storageService: StorageService, private router:Router) {
    this.form = this.fb.group({                             //formulario para el perfil 
      nombre: [""], 
      apellido: [""],      
      fechaNac: [""],
      email: [""],
      celular: [""],
      dominio: [""],
  });

    this.jornadaForm = this.fb.group({                    //formulario para la jornada
      base: [""],      
      carga: [""],
      publicidad: [""],  
  });

    this.adicionalForm = this.fb.group({                  //formulario para los adicionales de la jornada
      adicionalKm1: [""], 
      adicionalKm2: [""],
      adicionalKm3: [""],
      adicionalKm4: [""],
      adicionalKm5: [""],
  });
   }

   ngOnInit(): void {}



   // es el mismo metodo para guardar el chofer y la jornada
   // primero arma cada uno de los objetos
   // y desp guarda el objeto en la coleccion que le corresponde
   onSubmit(){    
    this.armarChofer();
    this.armarJornada();
    this.router.navigate(['/choferes/listado']);    
   }

   armarChofer(){
    this.componente = "choferes"
    this.chofer = this.form.value;
    this.chofer.categoria = this.categoriaSeleccionada;
    this.chofer.idChofer = new Date().getTime(); 
    //console.log("este es el chofer: ",this.chofer);     
    this.addItem(this.chofer)
   }

   addItem(item:any): void {   
    this.storageService.addItem(this.componente, item);   
  }  

  armarJornada(){     
    this.componente = "jornadas"
    this.adicionalKm = this.adicionalForm.value
    //console.log("esto es adicionalKm: ", this.adicionalKm);
    this.jornada = this.jornadaForm.value;
    this.jornada.km = this.adicionalKm;
    this.jornada.idChofer = this.chofer.idChofer;    
    //console.log("esta es la jornada: ", this.jornada);
    this.addItem(this.jornada)
  }

  
  changeCategoria(e: any) {
    //console.log(e.target.value)  ;     
    this.categoriaSeleccionada = e.target.value
    console.log(this.categoriaSeleccionada);    
  }

}
