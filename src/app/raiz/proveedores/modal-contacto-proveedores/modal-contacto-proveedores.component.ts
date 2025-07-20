import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Contacto } from 'src/app/interfaces/proveedor';
import { ValidarService } from 'src/app/servicios/validar/validar.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-modal-contacto-proveedores',
    templateUrl: './modal-contacto-proveedores.component.html',
    styleUrls: ['./modal-contacto-proveedores.component.scss'],
    standalone: false
})
export class ModalContactoProveedoresComponent implements OnInit {

  formContacto:any;
  contacto!: Contacto;

  constructor(private fb: FormBuilder, public activeModal: NgbActiveModal){
    this.formContacto = this.fb.group({      
      puesto: ["",[Validators.required]], 
      apellido: ["",[Validators.required, Validators.maxLength(30), ValidarService.soloLetras]],
      nombre: ["",[Validators.required, Validators.maxLength(30), ValidarService.soloLetras]],      
      telefono: ["",[Validators.required, Validators.minLength(10), Validators.maxLength(10), ValidarService.soloNumeros]],
      email: ["",[Validators.email]],
    })
  }

  ngOnInit(): void {    
  }

  guardarContacto(){
    this.contacto = this.formContacto.value;
    //console.log(this.contacto);
    this.activeModal.close(this.contacto)    
    //this.formContacto.reset();    
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
