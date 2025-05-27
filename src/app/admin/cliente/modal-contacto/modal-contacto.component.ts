import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Contacto } from 'src/app/interfaces/proveedor';
import { ValidarService } from 'src/app/servicios/validar/validar.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-modal-contacto',
    templateUrl: './modal-contacto.component.html',
    styleUrls: ['./modal-contacto.component.scss'],
    standalone: false
})
export class ModalContactoComponent implements OnInit {
  
  @Input() fromParent:any;

  formContacto:any;
  contacto!: Contacto;

  constructor(private fb: FormBuilder, public activeModal: NgbActiveModal){
    this.formContacto = this.fb.group({      
      puesto: ["",[Validators.required]], 
      apellido: ["",[Validators.required, Validators.maxLength(30)]],
      nombre: ["",[Validators.required, Validators.maxLength(30)]],      
      telefono: ["",[Validators.required, Validators.minLength(10), Validators.maxLength(10)]],
      email: ["",[Validators.email]],
    })
  }

  ngOnInit(): void {  
    
    if(this.fromParent.modo === "editar"){
      let contacto = this.fromParent.item;
      this.contacto = structuredClone(contacto)
      this.armarForm();
    }

  }

  armarForm(){
    this.formContacto.patchValue({      
      puesto: this.contacto.puesto, 
      apellido: this.contacto.apellido,
      nombre: this.contacto.nombre,      
      telefono: this.contacto.telefono,
      email: this.contacto.email,
    })
  }

  guardarContacto(){
    if (this.formContacto.valid) {
      this.contacto = this.formContacto.value;
      //console.log(this.contacto);
      this.activeModal.close(this.contacto)    
      //this.formContacto.reset();    
    } else {
      this.mensajesError("Error en el formularior")
    }

    
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.formContacto.get(controlName);
    return control?.hasError(errorName) && control.touched;
  }

   mensajesError(msj:string){
      Swal.fire({
        icon: "error",
        //title: "Oops...",
        text: `${msj}`
        //footer: `${msj}`
      });
    }

}
