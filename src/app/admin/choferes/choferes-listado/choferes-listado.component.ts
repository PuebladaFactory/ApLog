import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Chofer } from 'src/app/interfaces/chofer';
import { AdicionalKm, Jornada } from 'src/app/interfaces/jornada';
import { StorageService } from 'src/app/servicios/storage/storage.service';


@Component({
  selector: 'app-choferes-listado',
  templateUrl: './choferes-listado.component.html',
  styleUrls: ['./choferes-listado.component.scss']
})
export class ChoferesListadoComponent implements OnInit {
  
  choferes!: Chofer[];
  choferes$!: any;
  form:any;
  jornadaForm:any;
  adicionalForm:any;
  categorias = [
    { id: 0, categoria: 'maxi', },
    { id: 1, categoria: 'mini', },
    { id: 2, categoria: 'liviano', },
    { id: 3, categoria: 'otro', },
    ];
  categoriaSeleccionada!:string;
  choferEditar!: Chofer;
  componente!:string; 
  jornadas$:any;
  jornadaChofer!: Jornada;
  jornadaEditar!: Jornada;
  adicionalKm!: AdicionalKm;

  constructor(private fb: FormBuilder, private storageService: StorageService,){
    this.form = this.fb.group({      
      nombre: [""], 
      apellido: [""],      
      fechaNac: [""],
      email: [""],
      celular: [""],
      dominio: [""],
    });

    this.jornadaForm = this.fb.group({           
      base: [""],      
      carga: [""],
      publicidad: [""],  
     });

    this.adicionalForm = this.fb.group({        
      adicionalKm1: [""], 
      adicionalKm2: [""],
      adicionalKm3: [""],
      adicionalKm4: [""],
      adicionalKm5: [""],
  });
  }
  
  ngOnInit(): void { 
    this.choferes$ = this.storageService.choferes$; 
    this.jornadas$ = this.storageService.jornadas$
  }

  changeCategoria(e: any) {
    //console.log(e.target.value)  ;     
    this.categoriaSeleccionada = e.target.value
    //console.log(this.categoriaSeleccionada);    
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
    this.componente = "choferes"  
    this.choferEditar.nombre = this.form.value.nombre;
    this.choferEditar.apellido = this.form.value.apellido;
    this.choferEditar.fechaNac = this.form.value.fechaNac;
    this.choferEditar.email = this.form.value.email;
    this.choferEditar.celular = this.form.value.celular;
    this.choferEditar.dominio = this.form.value.dominio
    this.choferEditar.categoria = this.categoriaSeleccionada;
    console.log("este es el cliente editado: ", this.choferEditar);
    this.update(this.choferEditar);    
   }

   update(item:any): void {

      this.storageService.updateItem(this.componente, item);
      this.form.reset();
      this.ngOnInit();
  }

  jornada(idChofer: number){    
    let jornadaFormulario
    jornadaFormulario = this.jornadas$.source._value.filter(function (jornada: Jornada) { 
      return jornada.idChofer === idChofer
    });
    this.jornadaEditar = jornadaFormulario[0];
    console.log("jornadaEditar: ",this.jornadaEditar);       
    this.armarJornada();   
  }

  armarJornada(){
    this.jornadaForm.patchValue({
      base: this.jornadaEditar.base,      
      carga: this.jornadaEditar.carga,
      publicidad: this.jornadaEditar.carga 
    });

    this.adicionalForm.patchValue({
      adicionalKm1: this.jornadaEditar.km.adicionalKm1, 
      adicionalKm2: this.jornadaEditar.km.adicionalKm2,
      adicionalKm3: this.jornadaEditar.km.adicionalKm3,
      adicionalKm4: this.jornadaEditar.km.adicionalKm4,
      adicionalKm5: this.jornadaEditar.km.adicionalKm5,
    })
  }

  onSubmitJornada(){
    this.componente = "jornadas"
    this.adicionalKm = this.adicionalForm.value
    //console.log("esto es adicionalKm: ", this.adicionalKm);
    this.jornadaChofer = this.jornadaForm.value;
    this.jornadaChofer.id = this.jornadaEditar.id
    this.jornadaChofer.km = this.adicionalKm;  
    this.jornadaChofer.idChofer = this.jornadaEditar.idChofer;
    console.log("esta es la jornada: ", this.jornadaChofer);
    this.update(this.jornadaChofer)
  }

}
