import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConId } from 'src/app/interfaces/conId';
import { Asignacion } from 'src/app/interfaces/vendedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ValidarService } from 'src/app/servicios/validar/validar.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-vendedor-alta',
  standalone: false,
  templateUrl: './vendedor-alta.component.html',
  styleUrl: './vendedor-alta.component.scss'
})
export class VendedorAltaComponent implements OnInit{

  @Input() fromParent:any
  
  componente:string = "vendedores"
  form:any;  
  soloVista: boolean = false;
  clientes!: ConId<Cliente>[];
  clientesAsignados!: ConId<Cliente>[];
  asignaciones: Asignacion[] = [];


  constructor(
    private fb: FormBuilder, 
    private storageService: StorageService, 
    private modalService: NgbModal, 
    public activeModal: NgbActiveModal,    
  ) {
    this.form = this.fb.group({      
      nombre: ["", [Validators.required, Validators.maxLength(30)]], 
      apellido: ["",[Validators.required, Validators.maxLength(30)]], 
      cuit: ["",[
        Validators.required,
        Validators.minLength(13),
        Validators.maxLength(13), // Ajustado para incluir los guiones
        ValidarService.cuitValido,
      ],],                  
      email: ["",[Validators.required, Validators.email]],
      
    });
   
   }

  ngOnInit(): void {
    this.clientes = this.storageService.loadInfo('clientes');
    this.clientes = this.clientes.sort((a, b) =>
          a.razonSocial.localeCompare(b.razonSocial)
        );
    console.log("1)", this.fromParent);
    
   /*  if(this.fromParent.modo === "vista"){
      this.soloVista = true;        
    
    }else if(this.fromParent.modo === "edicion"){
      this.soloVista = false;        
    
    }else {
      this.soloVista = false;
    } */

   }

  onSubmit(){     
    
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.form.get(controlName);
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
  
  formatCuit(cuitNumber: number | string): string {
    // Convertir el número a string, si no lo es
    const cuitString = cuitNumber.toString();
  
    // Validar que tiene exactamente 11 dígitos
    if (cuitString.length !== 11 || isNaN(Number(cuitString))) {
      throw new Error('El CUIT debe ser un número de 11 dígitos');
    }
  
    // Insertar los guiones en las posiciones correctas
    return `${cuitString.slice(0, 2)}-${cuitString.slice(2, 10)}-${cuitString.slice(10)}`;
  }

  openModal(): void {   
    
    /* {
      const modalRef = this.modalService.open(, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'sm', 
        //backdrop:"static" 
      });

      modalRef.result.then(
        (result) => {
          console.log("Vehiculo:" ,result);
          if(result !== undefined) {
            this.vehiculos.push(result);
            console.log("Vehiculos Array: ", this.vehiculos);
          };          
        },
        (reason) => {}
      );
    } */
  }

  getCliente(id:number){
    let cliente
    cliente = this.clientes.find(c=> c.idCliente === id)
    if(cliente){
      return cliente.razonSocial
    } else {
      return ""
    }
  }

}
