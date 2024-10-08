import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Contacto, Proveedor } from 'src/app/interfaces/proveedor';
import { TarifaTipo } from 'src/app/interfaces/tarifa-gral-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';
import { ModalContactoProveedoresComponent } from '../modal-contacto-proveedores/modal-contacto-proveedores.component';

@Component({
  selector: 'app-proveedores-alta',
  templateUrl: './proveedores-alta.component.html',
  styleUrls: ['./proveedores-alta.component.scss']
})
export class ProveedoresAltaComponent implements OnInit {
  @Input() fromParent:any

  componente:string = "proveedores"
  form:any;
  formContacto:any;
  proveedor!: Proveedor;
  contactos: Contacto[] = [];
  mostrarFormulario: boolean = false;
  formTipoTarifa:any;
  soloVista:boolean = false;
  proveedorEditar!: Proveedor;

  constructor(private fb: FormBuilder, private storageService: StorageService, private router: Router, public activeModal: NgbActiveModal, private modalService: NgbModal) {
    this.form = this.fb.group({      
      razonSocial: ["",[Validators.required, Validators.maxLength(30)]], 
      cuit: ["",[Validators.required, Validators.minLength(11), Validators.maxLength(11)]],
      direccion: ["",[Validators.required, Validators.maxLength(50)]],        
    });

    this.formTipoTarifa = this.fb.group({
      general: [true],  // Seleccionado por defecto
      especial: [false],
      eventual: [false],
      personalizada: [false],
    })    
   }

   ngOnInit(): void {
    console.log("1)", this.fromParent);
    if(this.fromParent.modo === "vista"){
      this.soloVista = true;
      this.proveedorEditar = this.fromParent.item
      this.armarForm()
    }else if(this.fromParent.modo === "edicion"){
      this.soloVista = false;
      this.proveedorEditar = this.fromParent.item
      this.armarForm()
    }else {
      this.soloVista = false;
    }
    
   }

    onSubmit(){
    ////console.log()(new Date().getTime());   
    const tarifaSeleccionada = this.getTarifaTipo();    
    if (this.form.valid) {
      if(this.fromParent.modo === "edicion"){
        this.proveedor = this.form.value
        this.proveedor.idProveedor = this.proveedorEditar.idProveedor;
        this.proveedor.id = this.proveedorEditar.id;
        this.proveedor.contactos = this.contactos;
        //console.log()(this.cliente);     
        this.proveedor.tarifaTipo = tarifaSeleccionada; // Asigna el tipo de tarifa
        //console.log(this.cliente);      
        this.addItem("Edicion");        
        this.activeModal.close();    
      }else{
        this.proveedor = this.form.value
        this.proveedor.idProveedor = new Date().getTime();
        this.proveedor.contactos = this.contactos;
        //console.log()(this.cliente);     
        this.proveedor.tarifaTipo = tarifaSeleccionada; // Asigna el tipo de tarifa
        //console.log(this.cliente);      
        this.addItem("Alta");        
        this.activeModal.close();    
      }      
    } else{
      //alert("error en el formulario")
      Swal.fire({
        icon: "error",
        
        text: "El formulario contiene errores ",
//        
      });

    } 
    
   }

    armarForm(){
      this.form.patchValue({
        razonSocial: this.proveedorEditar.razonSocial,
        direccion: this.proveedorEditar.direccion,
        cuit: this.proveedorEditar.cuit,
      });
      this.formTipoTarifa.patchValue({
          general: this.proveedorEditar.tarifaTipo.general, 
          especial: this.proveedorEditar.tarifaTipo.especial,
          eventual: this.proveedorEditar.tarifaTipo.eventual,
          personalizada: this.proveedorEditar.tarifaTipo.personalizada,      
      });
      this.contactos = this.proveedorEditar.contactos;
    }    

    onTarifaTipoChange(tipoSeleccionado: string) {
      // Resetea los demás switches a false, excepto el seleccionado
      this.formTipoTarifa.patchValue({
        general: tipoSeleccionado === 'general',
        especial: tipoSeleccionado === 'especial',
        eventual: tipoSeleccionado === 'eventual',
        personalizada: tipoSeleccionado === 'personalizada'
      });
    }
  
      // Método para obtener la selección actual del formulario
      getTarifaTipo(): TarifaTipo {
        const formValue = this.formTipoTarifa.value;
        const tarifaTipo: TarifaTipo = {
          general: formValue.general,
          especial: formValue.especial,
          eventual: formValue.eventual,
          personalizada: formValue.personalizada
        };
        return tarifaTipo;
      }
   

   addItem(modo:string): void {
    let titulo = "";
    if(modo === "Alta"){
      titulo = "el alta"
    } else if (modo === "Edicion"){
      titulo = "la edicion"
    }


    Swal.fire({
      title: `¿Confirmar ${titulo} del Proveedor?`,
      //text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {     
        if(modo === "Alta")   {
          this.storageService.addItem(this.componente, this.proveedor)
        } else if (modo === "Edicion"){
          this.storageService.updateItem(this.componente, this.proveedor)
        }              
        Swal.fire({
          title: "Confirmado",
          text: `${modo} exitosa`,
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
    //this.router.navigate(['/proveedores/listado'])   
  }

  toggle() {
    this.mostrarFormulario = !this.mostrarFormulario;
    ////console.log()(this.form);
  }

  guardarContacto(){
    this.contactos.push(this.formContacto.value);
    this.formContacto.reset();
    this.mostrarFormulario = !this.mostrarFormulario;
  }

  eliminarContacto(indice:number){
    this.contactos.splice(indice, 1);    
  }

  abrirModalContactos(): void {   
   
    {
      const modalRef = this.modalService.open(ModalContactoProveedoresComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'md', 
        //backdrop:"static" 
      });

    /*  let info = {
        modo: "clientes",
        item: facturaOp[0],
      }; 
      //console.log()(info); */
      
      //modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
          //console.log("contacto:" ,result);
          if(result !== undefined){
            this.contactos.push(result);
            console.log(this.contactos);
          }
          
          
          //this.storageService.getAllSorted("clientes", 'idCliente', 'asc')
//        this.selectCrudOp(result.op, result.item);
        //this.mostrarMasDatos(row);
        },
        (reason) => {}
      );
    }
  }
}
