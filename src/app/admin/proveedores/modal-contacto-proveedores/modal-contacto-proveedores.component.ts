import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Contacto } from 'src/app/interfaces/proveedor';

@Component({
  selector: 'app-modal-contacto-proveedores',
  templateUrl: './modal-contacto-proveedores.component.html',
  styleUrls: ['./modal-contacto-proveedores.component.scss']
})
export class ModalContactoProveedoresComponent implements OnInit {

  formContacto:any;
  contacto!: Contacto;

  constructor(private fb: FormBuilder, public activeModal: NgbActiveModal){
    this.formContacto = this.fb.group({      
      puesto: [""], 
      apellido: ["",[Validators.required, Validators.maxLength(30)]],
      nombre: ["",[Validators.required, Validators.maxLength(30)]],      
      telefono: ["",[Validators.required,Validators.minLength(10), Validators.maxLength(10)]],
      email: ["",[Validators.required, Validators.email]],
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

}
