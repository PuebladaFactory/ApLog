import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder} from '@angular/forms';

import { Cliente } from 'src/app/interfaces/cliente';
import { CategoriaTarifa, Seccion, TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';
import { ModalTarifaPersonalizadaComponent } from '../modal-tarifa-personalizada/modal-tarifa-personalizada.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-cliente-tarifa-personalizada',
  templateUrl: './cliente-tarifa-personalizada.component.html',
  styleUrls: ['./cliente-tarifa-personalizada.component.scss']
})
export class ClienteTarifaPersonalizadaComponent implements OnInit {

    componente: string = "tarifasPersCliente"
    secciones: Seccion [] = [];
    seccion! : Seccion;
    categorias : CategoriaTarifa[] = [];
    categoria!: CategoriaTarifa;
    seccionesForm!: FormArray;
    inputSecciones!: any;
    categoriaForm: any;
    descripcionForm: any;
    tarifaPersonalizadaCliente!: TarifaPersonalizadaCliente;
    $clientes!: any;
    clienteSeleccionado!: Cliente[];
    $clientesPers! : Cliente [];
    $ultTarifaCliente!: TarifaPersonalizadaCliente;
    
  constructor(private fb: FormBuilder, private storageService: StorageService, private modalService: NgbModal) {
    this.inputSecciones = this.fb.group({
      cantSecciones : [""],
          })
    this.categoriaForm = this.fb.group({
      categoriaNum : [""],
      nombre: [""],
      aCobrar: [""],
      aPagar: [""],
          })
    this.seccionesForm = this.fb.array([]);
    this.descripcionForm = this.fb.group({
      descripcion : [""],
          })
    this.secciones = [];
  }

  ngOnInit(): void {
    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;
      this.$clientesPers = this.$clientes.filter((cliente:Cliente)=>{
        return cliente.tarifaTipo.personalizada === true 
      })
      this.storageService.ultTarifaPersCliente$.subscribe(data => {
        this.$ultTarifaCliente = data;
        //console.log("1)",this.$ultTarifaCliente);        
      });   
    });             
  }

  changeCliente(e: any) {    
    //////console.log()(e.target.value);
    let id = Number(e.target.value);      
    this.clienteSeleccionado = this.$clientesPers.filter((cliente:Cliente)=>{     
      return cliente.idCliente === id
    })   
    this.storageService.getElemntByIdLimit("tarifasPersCliente","idCliente","idTarifa",this.clienteSeleccionado[0].idCliente,"ultTarifaPersCliente");  
  }

  agregarSeccion() {        
    let orden = this.secciones.length
    this.seccion = {      
      orden: orden + 1,
      descripcion: "",
      categorias: [],
    }
    this.secciones.push(this.seccion); 
  }

  eliminarSeccion(index:number){   
    this.secciones.splice(index, 1);    
  }

  agregarCategoria(index: number) {           
    //console.log("1)seccion", this.secciones[index]);
    this.categoria = {
      orden: this.secciones[index].categorias.length + 1,
      nombre: this.categoriaForm.value.nombre,
      aCobrar: this.categoriaForm.value.aCobrar,
      aPagar: this.categoriaForm.value.aPagar,
      nuevoACobrar: 0,
      nuevoAPagar: 0,
    };  
    this.secciones[index].categorias.push(this.categoria)
    this.categoriaForm.reset()
   
  }

  eliminarCategoria(index: number, orden:number) {
    this.secciones[index].categorias.splice(orden, 1);
  }

  agregarDescripcion(index:number) {   
    this.secciones[index].descripcion = this.descripcionForm.value.descripcion;
    this.descripcionForm.reset();
  }

  eliminarDescripcion(index:number) {    
    this.secciones[index].descripcion = "";
    this.descripcionForm.reset();
  }

  crearTarifa() {
   
    this.tarifaPersonalizadaCliente = {
      id: null,
      idTarifa: new Date().getTime(),
      fecha: new Date().toISOString().split('T')[0],
      secciones: this.secciones,
      tipo: { general: false, especial: false, eventual: false, personalizada:true },  // Ajusta según sea necesario
      idCliente: this.clienteSeleccionado[0].idCliente,
    };
    
    console.log('Tarifa guardada:', this.tarifaPersonalizadaCliente);
    this.addItem();
  }

  addItem(): void {
    Swal.fire({
      title: "¿Confirmar el alta de la tarifa?",
      //text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {        
        this.storageService.addItem(this.componente, this.tarifaPersonalizadaCliente)
        Swal.fire({
          title: "Confirmado",
          text: "Alta exitosa",
          icon: "success"
        })   
        this.secciones = [];
      }
    });   
  }

  mostrarInfo(){
    Swal.fire({
      position: "top-end",
      //icon: "success",
      //title: "Your work has been saved",
      text:"Las tarifas personalizas estan compuestas por secciones, las cuales a su vez estan compuestas por categorias. Se pueden crear cuantas secciones se deseen. Y dentro de cada sección,cuantas categorias se deseen. Cada seccion tien un campo 'Descripcion', el cual es opcional y solo tiene caracter informativo. Cada categoria está numerada y compuesta por un campo 'nombre', el cual sirve para nombrar la categoria, el campo 'a cobrar', donde se debe guardar el monto a cobrar al cliente, y un campo 'a pagar', donde se debe ingresar el monto a pagar al chofer que realice el viaje.",
      showConfirmButton: false,
      timer: 10000
    });
  }

  openModal(): void {      
    {
      const modalRef = this.modalService.open(ModalTarifaPersonalizadaComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'lg', 
        //backdrop:"static" 
      });      
/*     let info = {
        modo: modo,
        item: this.clienteEditar,
      }  */
      ////console.log()(info); */
      
      modalRef.componentInstance.fromParent = this.$ultTarifaCliente;
      modalRef.result.then(
        (result) => {    
        },
        (reason) => {}
      );
    }
  }

  formatearValor(valor: number) : any{
    let nuevoValor =  new Intl.NumberFormat('es-ES', { 
     minimumFractionDigits: 2, 
     maximumFractionDigits: 2 
   }).format(valor);
   //////console.log(nuevoValor);    
   return nuevoValor
 }

}