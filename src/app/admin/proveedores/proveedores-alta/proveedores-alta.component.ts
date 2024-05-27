import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Contacto, Proveedor } from 'src/app/interfaces/proveedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-proveedores-alta',
  templateUrl: './proveedores-alta.component.html',
  styleUrls: ['./proveedores-alta.component.scss']
})
export class ProveedoresAltaComponent implements OnInit {
  @Input() data:any

  componente:string = "proveedores"
  form:any;
  formContacto:any;
  proveedor!: Proveedor;
  contactos: Contacto[] = [];
  mostrarFormulario: boolean = false;

  constructor(private fb: FormBuilder, private storageService: StorageService, private router: Router) {
    this.form = this.fb.group({      
      razonSocial: ["",[Validators.required, Validators.maxLength(30)]], 
      cuit: ["",[Validators.required, Validators.minLength(11), Validators.maxLength(11)]],
      direccion: ["",[Validators.required, Validators.maxLength(50)]],      
    });

    this.formContacto = this.fb.group({      
      puesto: [""], 
      apellido: ["",[Validators.required, Validators.maxLength(30)]],
      nombre: ["",[Validators.required, Validators.maxLength(30)]],      
      telefono: ["",[Validators.required,Validators.minLength(10), Validators.maxLength(10)]],
      email: ["",[Validators.required, Validators.email]],
    })
   }

   ngOnInit(): void {}

   onSubmit(){
    //console.log(new Date().getTime());    
    this.proveedor = this.form.value
    this.proveedor.idProveedor = new Date().getTime();
    console.log(this.form.value.razonSocial);
    
    if(this.form.value.razonSocial === "" || this.form.value.cuit === "" || this.form.value.direccion === ""){
      alert("validacion")
    } else if(this.contactos.length === 0){
      let contactosVacio = confirm("¿Desea agendar el proveedor sin contactos?");
      if(contactosVacio){
        alert("no hagas esto pq se rompe")
        return
      }else{
        return
      }
    } else{
      this.proveedor.contactos = this.contactos;
      console.log(this.proveedor);     
      this.addItem();    
    }    
   }

   addItem(): void {
    this.storageService.addItem(this.componente, this.proveedor)
    /* this.form.reset() 
    this.ngOnInit() */
    this.router.navigate(['/proveedores/listado'])   
  }

  toggle() {
    this.mostrarFormulario = !this.mostrarFormulario;
    //console.log(this.form);
  }

  guardarContacto(){
    this.contactos.push(this.formContacto.value);
    this.formContacto.reset();
    this.mostrarFormulario = !this.mostrarFormulario;
  }

  eliminarContacto(indice:number){
    this.contactos.splice(indice, 1);    
  }
}
