import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Cliente, Contacto } from 'src/app/interfaces/cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cliente-alta',
  templateUrl: './cliente-alta.component.html',
  styleUrls: ['./cliente-alta.component.scss']
})
export class ClienteAltaComponent implements OnInit {

  @Input() data:any

  componente:string = "clientes"
  form:any;
  formContacto:any;
  cliente!: Cliente;
  contactos: Contacto[] = [];
  mostrarFormulario: boolean = false;

  constructor(private fb: FormBuilder, private storageService: StorageService, private router: Router, public activeModal: NgbActiveModal) {
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
    if (this.form.valid) {
      this.cliente = this.form.value
      this.cliente.idCliente = new Date().getTime();
      this.cliente.contactos = this.contactos;
      console.log(this.cliente);     
      
      this.addItem();        
      this.activeModal.close();    
    } else{
      alert("error en el formulario")
    }
    
   }

   addItem(): void {
    Swal.fire({
      title: "¿Confirmar el alta del Cliente?",
      //text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        this.storageService.addItem(this.componente, this.cliente)
        Swal.fire({
          title: "Confirmado",
          text: "Alta exitosa",
          icon: "success"
        }).then((result)=>{
          if (result.isConfirmed) {
            this.activeModal.close();
          }
        });   
        
      }
    });   

    
    /* this.form.reset() 
    this.ngOnInit() */
    //this.router.navigate(['/clientes/listado'])   
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
