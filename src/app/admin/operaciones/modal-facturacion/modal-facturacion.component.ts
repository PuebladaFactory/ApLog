import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer } from 'src/app/interfaces/chofer';
import { Operacion, TarifaEventual, TarifaPersonalizada } from 'src/app/interfaces/operacion';
import { TarifaTipo } from 'src/app/interfaces/tarifa-gral-cliente';
import { Seccion, TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { FacturacionOpService } from 'src/app/servicios/facturacion/facturacion-op/facturacion-op.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-modal-facturacion',
  templateUrl: './modal-facturacion.component.html',
  styleUrls: ['./modal-facturacion.component.scss']
})
export class ModalFacturacionComponent implements OnInit {
  
  @Input() fromParent:any;
  componente:string = "operaciones"
  op!: Operacion;
  form!:any;
  formTarifaPersonalizada!:any;
  formTarifaEventual!:any;    
  $choferes!: Chofer[];
  acompaniante: boolean = false;
  vehiculosChofer: boolean = false;
  tarifaClienteSel!: TarifaPersonalizadaCliente;
  mostrarCategoria: boolean = false;
  seccionElegida!: Seccion;
  categoriaElegida: number = 0;
  tarifaPersonalizada!: TarifaPersonalizada;
  tarifaTipo!: TarifaTipo;
  vista: boolean = false;
  editar: boolean = false;
  cerrar: boolean = false;
  aCobrar: any;
  aPagar: any;
  tarifaEventual!: TarifaEventual;

  constructor(public activeModal: NgbActiveModal, private fb: FormBuilder, private storageService: StorageService, private facturacionOpServ: FacturacionOpService){
    this.form = this.fb.group({      
      km:[''],
      documentacion:[''],
      observaciones:[''],
    });

    this.formTarifaPersonalizada = this.fb.group({
      seccion:["", Validators.required],
      categoria:["", Validators.required]
    });
   
  }
  
  ngOnInit(): void {   
    console.log(this.fromParent);    
    //console.log("vista: ",this.vista);
    //console.log("editar: ",this.editar);
    //console.log("cerrar: ",this.cerrar);
        
    this.op = this.fromParent.item;
    switch (this.fromParent.modo) {
      case "vista":
        this.vista = true;       
        break;
      case "editar":        
        this.editar = true;        
        break;
      case "cerrar":        
        this.cerrar = true;
        break;
    }
    if(this.op.tarifaTipo.personalizada){
      this.storageService.getElemntByIdLimit("tarifasPersCliente", "idCliente", "idTarifa", this.op.cliente.idCliente, "ultTarifaPersCliente" )      
      this.storageService.ultTarifaPersCliente$.subscribe(data=>{        
        this.tarifaClienteSel = data || {};
        ////console.log("tarifa personalizada del cliente: ", this.tarifaClienteSel);   
        this.tarifaClienteSel.secciones = this.tarifaClienteSel.secciones || []; // Si secciones no está definido, lo inicializamos como array vacío  
      });
      this.armarForm();      
    } else {
      this.armarForm();
    }    
  }

  ///// ARMAR LA VISTA ///////////////
  armarForm(){
    
    this.acompaniante = this.op.acompaniante;
    this.tarifaEventual = this.op.tarifaEventual;
    this.tarifaPersonalizada = this.op.tarifaPersonalizada;
    this.tarifaTipo = this.op.tarifaTipo;
    /* this.tEventual = this.op.tEventual; */
    this.aCobrar = this.formatearValor(this.op.valores.cliente.aCobrar);
    this.aPagar = this.formatearValor(this.op.valores.chofer.aPagar);
    this.tarifaPersonalizada = this.op.tarifaPersonalizada;
    //////console.log("1)", this.tarifaPersonalizada);
    if(this.op.tarifaTipo.personalizada){
      this.seccionElegida = this.tarifaClienteSel.secciones[this.op.tarifaPersonalizada.seccion - 1];
      //this.tPersonalizada = this.op.tPersonalizada;
    }
    this.form.patchValue({      
      observaciones: this.op.observaciones,
    })           
  }  

  formatearValor(valor: number) : any{
    let nuevoValor =  new Intl.NumberFormat('es-ES', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(valor);
   ////////console.log(nuevoValor);    
    //   `$${nuevoValor}`   
    return nuevoValor
 }

 limpiarValorFormateado(valorFormateado: string): number {
  // Elimina el punto de miles y reemplaza la coma por punto para que sea un valor numérico válido
    return parseFloat(valorFormateado.replace(/\./g, '').replace(',', '.'));
  }

///////ACOMPANIANTE///////
changeAcompaniante(event: any) {
  ////console.log(event.target.value);    
  this.acompaniante = event.target.value.toLowerCase() == 'true';
  //console.log(this.acompaniante);
  
}

////////// TARIFA EVENTUAL //////////////////
  /* selectTarifaEventual(event: any) {
    //////console.log(event.target.value);    
    this.tarifaEventual = event.target.value.toLowerCase() == 'true';
    //////console.log(this.tarifaEventual);
    // si la op era con tarifa personalizada y cambia a tarifa eventual pero vuelve, retoma los datos 
    if(!this.tarifaEventual && this.op.tarifaPersonalizada){
      this.tarifaPersonalizada = this.op.tarifaPersonalizada;
      ////console.log(this.op);      
      this.tPersonalizada = this.op.tPersonalizada;
      this.formTarifaPersonalizada.patchValue({
        seccion: this.tarifaPersonalizada ? this.op.tPersonalizada.seccion : "Sin datos",
        categoria: this.tarifaPersonalizada ? this.op.tPersonalizada.categoria : "Sin datos",
      });
      this.aCobrar = this.formatearValor(this.op.valores.cliente.aCobrar);
      this.aPagar = this.formatearValor(this.op.valores.chofer.aPagar);  
    }    
    ////console.log(this.aCobrar);    
    if(this.tarifaEventual){
      this.tarifaPersonalizada = false;
      this.tPersonalizada ={
        seccion: 0,
        categoria: 0,
        nombre: "",
        aCobrar: 0,
        aPagar: 0,
      };
      this.tarifaTipo = {
          general: false,
          especial: false,
          eventual: true,   
          personalizada: false, 
      };
      //console.log(this.tEventual.cliente.valor);
      
      this.aCobrar = this.formatearValor(this.tEventual.cliente.valor);
      this.aPagar = this.formatearValor(this.tEventual.chofer.valor);      
      
    }    

} */



///////// TARIFA PERSONALIZADA /////////////
changeSecion(e:any){
  //////console.log("seccion: ", e.target.value);
  this.mostrarCategoria = true;
  if(this.tarifaEventual){
      this.formTarifaPersonalizada.patchValue({
        seccion: "Sin datos",
        categoria: "Sin datos",
      });
  }
  this.seccionElegida = this.tarifaClienteSel.secciones[e.target.value - 1];
  this.tarifaPersonalizada = {
    seccion : e.target.value,
    categoria: this.tarifaPersonalizada.categoria,
    nombre: this.tarifaPersonalizada.nombre,
    aCobrar: this.tarifaPersonalizada.aCobrar,
    aPagar: this.tarifaPersonalizada.aPagar
  }

/*   this.tarifaTipo = {
    general: false,
    especial: false,
    eventual: false,   
    personalizada: true, 
} */
  ////////console.log(this.seccionElegida);
  ////////console.log(this.tPersonalizada);
}

changeCategoria(e:any){
  //////console.log("categoria: ", e.target.value);
  this.tarifaPersonalizada = {
    seccion : this.tarifaPersonalizada.seccion,
    categoria: this.tarifaClienteSel.secciones[this.tarifaPersonalizada.seccion - 1].categorias[e.target.value-1].orden,
    nombre: this.tarifaClienteSel.secciones[this.tarifaPersonalizada.seccion - 1].categorias[e.target.value-1].nombre,
    aCobrar: this.tarifaClienteSel.secciones[this.tarifaPersonalizada.seccion - 1].categorias[e.target.value-1].aCobrar,
    aPagar: this.tarifaClienteSel.secciones[this.tarifaPersonalizada.seccion - 1].categorias[e.target.value-1].aPagar,
  }
  //console.log("tarifa personalizada: ", this.tPersonalizada);
  this.op.tarifaPersonalizada = this.tarifaPersonalizada;
  this.aCobrar = this.formatearValor(this.tarifaPersonalizada.aCobrar);
  this.aPagar = this.formatearValor(this.tarifaPersonalizada.aPagar);  
}

onSubmit(){
  //console.log("tarifa eventual: ", this.tarifaEventual, " valor: ", this.tEventual);
  //console.log("tarifa personalizada: ", this.tarifaPersonalizada, " valor: ", this.tPersonalizada);  
  //console.log("acompaniante: ", this.acompaniante);
  //console.log("a cobrar: ", this.op.aCobrar, " y a pagar: ", this.op.aPagar);
  
  if(this.cerrar){
    this.cerrarOp();
  } else {
    this.armarOp();
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

cerrarOp(){
  this.op.km = this.form.value.km;
  /* this.op.estado = {    
      abierta: false,
      cerrada: true,
      facturada: false,    
  } */
  //this.updateItem();
  this.facturacionOpServ.facturarOperacion(this.op);
  
  this.activeModal.close();
}

armarOp(){
  //////////console.log()("armarOp. chofer: ", this.choferSeleccionado);
  ////console.log("2)", this.tarifaPersonalizada);
  // Extraer valores del formulario y otros datos
  const formValues = this.form.value;
  console.log("tarifa eventual: ", this.tarifaEventual);
  
  // editar la operación básica  
  this.op.acompaniante = this.acompaniante;  
  this.op.observaciones = this.form.value.observaciones;
  //this.op.tarifaEventual = this.tarifaEventual;
  //this.op.tarifaPersonalizada = this.tarifaPersonalizada;
  this.op.tarifaPersonalizada = this.tarifaPersonalizada;
  this.op.tarifaTipo = this.tarifaTipo;
  //this.op.tPersonalizada = this.tPersonalizada;
  if(this.op.tarifaTipo.eventual){
    this.op.tarifaEventual = this.tarifaEventual
    /* this.op.tarifaTipo = {
      general: false,
      especial : false,
      eventual : true,
      personalizada: false
    }; */
    this.op.valores.cliente.aCobrar = this.tarifaEventual.cliente.valor;
    this.op.valores.cliente.tarifaBase = this.tarifaEventual.cliente.valor;
    this.op.valores.chofer.aPagar = this.tarifaEventual.chofer.valor;
    this.op.valores.chofer.tarifaBase = this.tarifaEventual.chofer.valor;
  } /* else {
    this.op.valores.cliente.aCobrar = this.limpiarValorFormateado(this.aCobrar);
    this.op.valores.chofer.aPagar = this.limpiarValorFormateado(this.aPagar);  
  } */
 if(this.op.tarifaTipo.personalizada){
    this.op.valores.cliente.aCobrar = this.tarifaPersonalizada.aCobrar;
    this.op.valores.cliente.tarifaBase = this.tarifaPersonalizada.aCobrar;
    this.op.valores.chofer.aPagar = this.tarifaPersonalizada.aPagar;
    this.op.valores.chofer.tarifaBase = this.tarifaPersonalizada.aPagar;
 }
  console.log("op: ", this.op);
  
  
  this.updateItem(); 
 
 }


 ////// ACTUALIZAR OBJETO /////////
 updateItem(): void {
  ////////console.log("llamada al storage desde op-alta, addItem");
  //////////console.log()("esta es la operacion: ", this.op);  
  Swal.fire({
    title: "¿Desea guardar los cambios en la operación?",
    //text: "You won't be able to revert this!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Guardar",
    cancelButtonText: "Cancelar"
  }).then((result) => {
    if (result.isConfirmed) {
      ////////console.log("op: ", this.op);
      this.storageService.updateItem(this.componente, this.op);    
      Swal.fire({
        title: "Confirmado",
        text: "La operación ha sido editada.",
        icon: "success"
      }).then((result)=>{
        if (result.isConfirmed) {
          this.activeModal.close();
        }
      });   
      
    }
  });   
  ////console.log("op editada: ", this.op);  
  
  this.form.reset();     
 
} 

}
