import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, Validators} from '@angular/forms';

import { Cliente } from 'src/app/interfaces/cliente';
import { CategoriaTarifa, Seccion, TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';
import { ModalTarifaPersonalizadaComponent } from '../modal-tarifa-personalizada/modal-tarifa-personalizada.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HistorialTarifasGralComponent } from 'src/app/shared/historial-tarifas-gral/historial-tarifas-gral.component';
import { FormatoNumericoService } from 'src/app/servicios/formato-numerico/formato-numerico.service';
import { Subject, takeUntil } from 'rxjs';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';

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
    tarifasPersCliente!: TarifaPersonalizadaCliente[];
    $clientes!: any;
    clienteSeleccionado!: Cliente[];
    $clientesPers! : Cliente [];
    $ultTarifaCliente!: any;
    nuevaTarifa!: TarifaPersonalizadaCliente;
    private destroy$ = new Subject<void>();
    
  constructor(private fb: FormBuilder, private storageService: StorageService, private modalService: NgbModal, private formNumService:FormatoNumericoService, private dbFirebase: DbFirestoreService ) {
    this.inputSecciones = this.fb.group({
      cantSecciones : [""],
          })
    this.categoriaForm = this.fb.group({
      categoriaNum : [""],
      nombre: ["", [Validators.required]],
      aCobrar: ["", [Validators.required]],
      aPagar: ["", [Validators.required]],
          })
    this.seccionesForm = this.fb.array([]);
    this.descripcionForm = this.fb.group({
      descripcion : [""],
          })
    this.secciones = [];
  }

  ngOnInit(): void {
    this.storageService.getObservable<Cliente>('clientes')
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      this.$clientes = data;
      this.$clientesPers = this.$clientes
      .filter((c:Cliente)=>{return c.tarifaTipo.personalizada === true})
      .sort((a:Cliente, b:Cliente) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
      
      this.storageService.getObservable<TarifaPersonalizadaCliente>("tarifasPersCliente") 
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe(data => {
        if (data) {
            console.log("data: ", data);            
            this.tarifasPersCliente = data;
            if(this.clienteSeleccionado){
              console.log("aca????????");              
              this.$ultTarifaCliente = this.tarifasPersCliente.find((t:TarifaPersonalizadaCliente) => {return t.idCliente === this.clienteSeleccionado[0].idCliente})
              console.log("ultTarifaCliente", this.$ultTarifaCliente);    
              
            }
        }
        /* if (data) {
          this.$ultTarifaCliente = data;          
          console.log("1) ult tarifa personalizada: ", this.$ultTarifaCliente);
        }               */
      });  
     

    });               
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  changeCliente(e: any) {    
    
    let id = Number(e.target.value);      
    console.log(id);
    this.clienteSeleccionado = this.$clientesPers.filter((cliente:Cliente)=>{     
      return cliente.idCliente === id
    })   
    //this.storageService.getElemntByIdLimit("tarifasPersCliente","idCliente","idTarifa",this.clienteSeleccionado[0].idCliente,"ultTarifaPersCliente");  
    //this.storageService.getMostRecentItemId("tarifasPersCliente","idTarifa", "idCliente",this.clienteSeleccionado[0].idCliente);  
    //this.storageService.syncChangesByOneElemId<TarifaPersonalizadaCliente>("tarifasPersCliente","idTarifa","idCliente",this.clienteSeleccionado[0].idCliente);  
    console.log("this.tarifasPersCliente", this.tarifasPersCliente);
    
    this.$ultTarifaCliente = this.tarifasPersCliente.find((t:TarifaPersonalizadaCliente) => {return t.idCliente === id})
    console.log("this.$ultTarifaCliente", this.$ultTarifaCliente);
    
    
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
    console.log("categoria: ", this.categoriaForm.value);
    if(this.categoriaForm.value.nombre === "" || this.categoriaForm.value.nombre === null || this.categoriaForm.value.aCobrar === "" || this.categoriaForm.value.aCobrar === null ||this.categoriaForm.value.aPagar === "" || this.categoriaForm.value.aPagar === null){
      return this.mensajesError("Los datos de la categoria no pueden estar en blanco");
    }
    this.categoria = {
      orden: this.secciones[index].categorias.length + 1,
      nombre: this.categoriaForm.value.nombre,
      aCobrar: this.formNumService.convertirAValorNumerico(this.categoriaForm.value.aCobrar),
      aPagar: this.formNumService.convertirAValorNumerico(this.categoriaForm.value.aPagar),
      nuevoACobrar: 0,
      nuevoAPagar: 0,
    };  
    this.secciones[index].categorias.push(this.categoria)
    this.categoriaForm.reset()
    console.log("categorias: ",  this.secciones[index].categorias);
  }

/*   limpiarValorFormateado(valorFormateado: any): number {
    if (typeof valorFormateado === 'string') {
      // Si es un string, eliminar puntos de miles y reemplazar coma por punto
      return parseFloat(valorFormateado.replace(/\./g, '').replace(',', '.'));
    } else if (typeof valorFormateado === 'number') {
      // Si ya es un número, simplemente devuélvelo
      return valorFormateado;
    } else {
      // Si es null o undefined, devolver 0 como fallback
      return 0;
    }
  } */

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
   
    this.nuevaTarifa = {
      //id: null,
      idTarifa: new Date().getTime(),
      fecha: new Date().toISOString().split('T')[0],
      secciones: this.secciones,
      tipo: { general: false, especial: false, eventual: false, personalizada:true },  // Ajusta según sea necesario
      idCliente: this.clienteSeleccionado[0].idCliente,
    };
    
    console.log('Tarifa guardada:', this.nuevaTarifa);
    this.addItem();
  }

  addItem(): void {
    let clientes: Cliente [] = this.storageService.loadInfo("clientes");
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
        if(this.$ultTarifaCliente){
          this.storageService.addItem("historialTarifasPersCliente", this.$ultTarifaCliente, this.$ultTarifaCliente.idTarifa, "INTERNA", "" );
          this.storageService.deleteItem("tarifasPersCliente", this.$ultTarifaCliente, this.$ultTarifaCliente.idTarifa, "INTERNA", "" );      
        }        
        this.storageService.addItem(this.componente, this.nuevaTarifa, this.nuevaTarifa.idTarifa, "ALTA", `Alta de Tarifa Personalizada para Cliente ${this.getClientePers(this.clienteSeleccionado[0].idCliente)}`);
        if(clientes.length > 0){
          clientes.forEach((c:Cliente)=>{
            if(c.tarifaTipo.personalizada && c.idCliente === this.clienteSeleccionado[0].idCliente && !c.tarifaAsignada){
              c.tarifaAsignada = true;
              //this.storageService.updateItem("clientes", c, c.idCliente, "INTERNA", "");
            }
          })
      }      
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

  openModal(modo:string): void {      
    {
      const modalRef = this.modalService.open(ModalTarifaPersonalizadaComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'lg', 
        //backdrop:"static" 
      });     
      
    let razonSocial: string = this.getClientePers(this.clienteSeleccionado[0].idCliente)

     let info = {
        modo: modo,
        item: this.$ultTarifaCliente,
        cliente: razonSocial,
      }  
      ////console.log()(info); */
      
      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {    
        },
        (reason) => {}
      );
    }
  }


 abrirHistorialTarifas(){
  {
    const modalRef = this.modalService.open(HistorialTarifasGralComponent, {
      windowClass: 'myCustomModalClass',
      centered: true,
      size: 'xl', 
      //backdrop:"static" 
    });      

  let info = {
      modo: "personalizada",
      tEspecial: false,
      id: this.clienteSeleccionado[0].idCliente,
    } 
    //////////console.log()(info); */
    
    modalRef.componentInstance.fromParent = info;
    modalRef.result.then(
      (result) => {},
      (reason) => {}
    );
  }
}

  mensajesError(msj:string){
      Swal.fire({
        icon: "error",
        //title: "Oops...",
        text: `${msj}`
        //footer: `${msj}`
      });
    }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.categoriaForm.get(controlName);
    return control?.hasError(errorName) && control.touched;
  }

  getClientePers(idCliente:number){
    let clientes : Cliente[] = [];

    clientes = this.$clientes.filter((c:Cliente) => c.idCliente === idCliente);

    return clientes[0].razonSocial;

  }

  actClientePers(){

    let clientes: Cliente [] = this.storageService.loadInfo("clientes")
    
        
        if(clientes.length > 0){
            clientes.forEach((c:Cliente)=>{
              if(c.tarifaTipo.personalizada  && c.idCliente === this.clienteSeleccionado[0].idCliente){
                c.tarifaAsignada = true;
                c.idTarifa = this.$ultTarifaCliente.idTarifa;
                //this.storageService.updateItem("clientes", c, c.idCliente, "INTERNA", "");
              }
            })
        }      

  }

  eliminarTarifa(){
    console.log("$ultTarifaCliente", this.$ultTarifaCliente);
    //this.storageService.deleteItem(this.componente, this.$ultTarifaCliente, this.$ultTarifaCliente.idTarifa, "INTERNA", "" );
    this.dbFirebase.delete(this.componente, this.$ultTarifaCliente.id);
    
  }

}
