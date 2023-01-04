import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import Swal from 'sweetalert2';

@Component({
  selector: 'app-empresa-form',
  templateUrl: './empresa-form.component.html',
  styleUrls: ['./empresa-form.component.scss']
})
export class EmpresaFormComponent implements OnInit {

  @Input() fromParent: any;
  editForm!: any;
  titulo!: string;
  item: any = {
    id: "",
    cuit: "",
    direccion: "",
    mail: "",
    razonSocial: "",
    telefono: 0,
  }


  constructor(public activeModal: NgbActiveModal,

    private fb: FormBuilder,
  ) {
    this.createForm();
  }


  ngOnInit(): void {
    {
      console.log("on init form", this.fromParent);
      this.titulo = this.fromParent.modo

      if (this.titulo === 'Agregar') {
        this.item.id = "";
      } else {        
        this.item = this.fromParent.item;
        console.log(this.item);
        
        this.configureForm();
      }
    }
  }

  configureForm() {

    console.log("configure form", this.item);
    this.editForm.patchValue({

      cuit: this.item.cuit,
      direccion: this.item.direccion,
      mail: this.item.mail,
      razonSocial: this.item.razonSocial,
      telefono: this.item.telefono,
      
    });

    console.log("esto es editForm: ", this.editForm.value);
    

  }


  createForm() {
    this.editForm = this.fb.group({    
      cuit: ['', [Validators.required, Validators.pattern(/^([0-9]{11}|[0-9]{2}-[0-9]{8}-[0-9]{1})$/)]],
      direccion: ['', Validators.required],
      mail: ['', Validators.email],
      razonSocial: ['', Validators.required],
      telefono: ['', Validators.pattern(/^[0-9]{5,12}$/)],
     
    });
  }



  closeModal() {
   //console.log("esto es closeModal:", this.editForm.value);
   
    let value = {
      op: this.titulo,
      item: this.item,

    };
    
    //console.log("closemodal", value)
    this.activeModal.close(value);

  }

  get Email() {
    return this.editForm.get("mail");
  }

  get Telefono() {
    return this.editForm.get("telefono");
  }

  get Cuit() {
    return this.editForm.get("cuit");
  }

  get RazonSocial() {
    return this.editForm.get("razonSocial");
  }

  get Direccion() {
    return this.editForm.get("direccion");
  }
  

  getMsg(msg: any) {

    /* let value = {
      op: msg.op,
      item: msg.item
      
    }; */

    //console.log("closemodal", msg)
    this.activeModal.close(msg);

  }

  guardarDatos(){
    //console.log(this.item);
    
    this.item.cuit = this.editForm.value.cuit;
    this.item.direccion = this.editForm.value.direccion;
    this.item.mail = this.editForm.value.mail;
    this.item.razonSocial = this.editForm.value.razonSocial;
    this.item.telefono = this.editForm.value.telefono;

    Swal.fire({
      title: '¿Desea guardar los datos?',
      //text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Confirmar'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire(
          /* 'Deleted!',
          'Your file has been deleted.',
          'success'  */
          'Guardados'
        )
        this.closeModal();
      }
    })

  }


}
