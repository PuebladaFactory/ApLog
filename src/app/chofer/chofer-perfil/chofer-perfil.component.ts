import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators} from '@angular/forms';
import { StorageService } from 'src/app/servicios/storage/storage.service';


@Component({
  selector: 'app-chofer-perfil',
  templateUrl: './chofer-perfil.component.html',
  styleUrls: ['./chofer-perfil.component.css']
})
export class ChoferPerfilComponent implements OnInit {

  form:any;
  edicion:boolean = false;
  perfil$!:any;
  perfilModificado!:any;
nombre: any;

  constructor(private fb: FormBuilder, private storageService: StorageService,) {
    this.form = this.fb.group({     
      nombre: ["",[Validators.maxLength(20)]], 
      apellido: ["",[Validators.maxLength(20)]], 
      cuit: ["",[Validators.minLength(11),Validators.maxLength(11)]],            
      fechaNac: [""],
      email: ["",[Validators.email]],
      celularContacto: ["",[Validators.minLength(11),Validators.maxLength(11)]],
      celularEmergencia: ["",[Validators.minLength(11),Validators.maxLength(11)]],
      domicilio: ["",[Validators.maxLength(50)]],     
     })
   }

  ngOnInit(): void {
    //this.perfil = this.storageService.loadInfo("choferes")
    this.perfil$ = this.storageService.choferes$
    //console.log("esto es chofer-perfil. perfil: ", this.perfil$);
    this.armarForm()
  }

  onSubmit(){
    //console.log(this.form.value);
    this.perfilModificado = this.form.value
    this.perfilModificado.id = this.perfil$.source._value[0].id;
    this.perfilModificado.idChofer = this.perfil$.source._value[0].idChofer;
    //console.log("esto es chofer-perfil. perfilModificado: ", this.perfilModificado);    
    this.update()
   /*  this.ngOnInit()
    this.editarPerfil(); */
    
  }

  update(): void {
    this.storageService.updateItem("choferes", this.perfilModificado);
    this.storageService.setInfo("choferes", this.perfilModificado);
    this.editarPerfil();
    this.ngOnInit();   
  }

  editarPerfil(){
    this.edicion = !this.edicion;
  }

  armarForm(){
    this.form.patchValue({      
      nombre: this.perfil$.source._value[0].nombre, 
      apellido: this.perfil$.source._value[0].apellido,    
      cuit:this.perfil$.source._value[0].cuit,            
      celularContacto: this.perfil$.source._value[0].celularContacto,
      celularEmergencia: this.perfil$.source._value[0].celularEmergencia,
      domicilio: this.perfil$.source._value[0].domicilio,    
      fechaNac: this.perfil$.source._value[0].fechaNac,
      email: this.perfil$.source._value[0].email,     
    })
  }

}
