import { Component, ViewChild, ElementRef, AfterViewInit , Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { Operacion, TarifaEventual, TarifaPersonalizada } from 'src/app/interfaces/operacion';
import { TarifaTipo } from 'src/app/interfaces/tarifa-gral-cliente';
import { Seccion, TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { ValoresOpService } from 'src/app/servicios/valores-op/valores-op/valores-op.service';
import { FormatoNumericoService } from 'src/app/servicios/formato-numerico/formato-numerico.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';
import { TableroService } from 'src/app/servicios/tablero/tablero.service';

@Component({
    selector: 'app-modal-resumen-op',
    templateUrl: './modal-resumen-op.component.html',
    styleUrls: ['./modal-resumen-op.component.scss'],
    standalone: false
})
export class ModalResumenOpComponent implements OnInit, AfterViewInit {
  
  @Input() fromParent:any;
  componente:string = "operaciones"
  op!: ConId<Operacion>;
  opOriginal!: ConId<Operacion>;
  form!:any;
  formTarifaPersonalizada!:any;
  formTarifaEventual!:any;    
  $choferes!: Chofer[];
  acompaniante: boolean = false;
  vehiculosChofer: boolean = false;
  tarifaClienteSel!: ConIdType<TarifaPersonalizadaCliente> | undefined;
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
  @ViewChild('kmInput') kmInputElement!: ElementRef;
  private destroy$ = new Subject<void>(); // Subject para manejar la destrucción
  isLoading: boolean = false;

  constructor(
    public activeModal: NgbActiveModal, 
    private fb: FormBuilder, 
    private storageService: StorageService, 
    private valoresOpServ: ValoresOpService, 
    private formNumServ: FormatoNumericoService, 
    private dbFirebase: DbFirestoreService,
    private tableroServ: TableroService
  ){
    this.form = this.fb.group({      
      km:['', Validators.required],
      documentacion:[''],
      observaciones:[''],
      hojaRuta:[''],
    });

    this.formTarifaPersonalizada = this.fb.group({
      seccion:["", Validators.required],
      categoria:["", Validators.required]
    });
   
  }
  
  ngOnInit(): void {   
    console.log(this.fromParent);    
    //console.log('ModalFacturacionComponent - ngOnInit');
    //////console.log("vista: ",this.vista);
    //////console.log("editar: ",this.editar);
    //////console.log("cerrar: ",this.cerrar);
    this.opOriginal = this.fromParent.item;    
    this.op = structuredClone(this.opOriginal);
        
    //this.op = this.fromParent.item;
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
      
      
        let tarifas : ConIdType<TarifaPersonalizadaCliente>[] = this.storageService.loadInfo("tarifasPersCliente")
        //console.log("tarifas pers clientes", tarifas);
        if(tarifas.length > 0){
          this.tarifaClienteSel = tarifas.find((tarifa: ConIdType<TarifaPersonalizadaCliente>)  => tarifa.idCliente === this.op.cliente.idCliente);            
          //console.log("tarifa personalizada del cliente: ", this.tarifaClienteSel);   
        } else {
          this.mensajesError("no hay tarifas personalizadas")
        }
        
        this.armarForm();   
       
    } else {
      this.armarForm();
    }      
      
  }

  ngOnDestroy(): void {
    // Completa el Subject para cancelar todas las suscripciones
    this.destroy$.next();
    this.destroy$.complete();
    this.storageService.clearInfo("tPersCliente");
    //console.log('ModalFacturacionComponent - ngOnDestroy');
  }

  ngAfterViewInit(): void {
    //console.log('ModalFacturacionComponent - ngAfterViewInit');
    // Establece el foco en el input de Km Recorridos al inicializar el componente
      if (this.cerrar) {
          setTimeout(() => {
            this.kmInputElement.nativeElement.focus();
          }, 0);
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
    //////////console.log("1)", this.tarifaPersonalizada);
    if(this.op.tarifaTipo.personalizada && this.tarifaClienteSel){
      this.seccionElegida = this.tarifaClienteSel.secciones[this.op.tarifaPersonalizada.seccion - 1];
      //this.tPersonalizada = this.op.tPersonalizada;
    }
    this.form.patchValue({      
      observaciones: this.op.observaciones,
      hojaRuta: this.op.hojaRuta,
    })           
  }  

  formatearValor(valor: number) : any{
    let nuevoValor =  new Intl.NumberFormat('es-ES', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(valor);
   ////////////console.log(nuevoValor);    
    //   `$${nuevoValor}`   
    return nuevoValor
 }

 limpiarValorFormateado(valorFormateado: string): number {
  // Elimina el punto de miles y reemplaza la coma por punto para que sea un valor numérico válido
    return parseFloat(valorFormateado.replace(/\./g, '').replace(',', '.'));
  }

///////ACOMPANIANTE///////
changeAcompaniante(event: any) {
  ////////console.log(event.target.value);    
  this.acompaniante = event.target.value.toLowerCase() == 'true';
  //////console.log(this.acompaniante);
  
}


///////// TARIFA PERSONALIZADA /////////////
changeSecion(e:any){
  //////////console.log("seccion: ", e.target.value);
  this.mostrarCategoria = true;
  if(this.tarifaEventual){
      this.formTarifaPersonalizada.patchValue({
        seccion: "Sin datos",
        categoria: "Sin datos",
      });
  }
  if(this.tarifaClienteSel){
    this.seccionElegida = this.tarifaClienteSel.secciones[e.target.value - 1];
    this.tarifaPersonalizada = {
      seccion : Number(e.target.value),
      categoria: this.tarifaPersonalizada.categoria,
      nombre: this.tarifaPersonalizada.nombre,
      aCobrar: this.tarifaPersonalizada.aCobrar,
      aPagar: this.tarifaPersonalizada.aPagar
    }    
  }else{
    this.mensajesError("no hay tarifa personalizada seleccionada")
  }
  


}

changeCategoria(e:any){
  //////////console.log("categoria: ", e.target.value);
  if(this.tarifaClienteSel){
    this.tarifaPersonalizada = {
      seccion : this.tarifaPersonalizada.seccion,
      categoria: Number(this.tarifaClienteSel.secciones[this.tarifaPersonalizada.seccion - 1].categorias[Number(e.target.value)-1].orden),
      nombre: this.tarifaClienteSel.secciones[this.tarifaPersonalizada.seccion - 1].categorias[e.target.value-1].nombre,
      aCobrar: this.tarifaClienteSel.secciones[this.tarifaPersonalizada.seccion - 1].categorias[e.target.value-1].aCobrar,
      aPagar: this.tarifaClienteSel.secciones[this.tarifaPersonalizada.seccion - 1].categorias[e.target.value-1].aPagar,
    }
    //////console.log("tarifa personalizada: ", this.tPersonalizada);
    this.op.tarifaPersonalizada = this.tarifaPersonalizada;
    this.aCobrar = this.formatearValor(this.tarifaPersonalizada.aCobrar);
    this.aPagar = this.formatearValor(this.tarifaPersonalizada.aPagar);  
  } else {
    this.mensajesError("no hay tarifa personalizada seleccionada")
  }
  
}

onSubmit(){
 
  
  if(this.cerrar){
    if(this.form.valid){
      this.cerrarOp();
    } else {
      this.mensajesError("El campo de Km recorridos no puede quedar vacio")
    }
    
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
  
  this.op.km = this.formNumServ.convertirAValorNumerico(this.form.value.km);
  this.op.valores.chofer.aPagar = this.formNumServ.convertirAValorNumerico(this.op.valores.chofer.aPagar);
  this.op.valores.chofer.tarifaBase = this.formNumServ.convertirAValorNumerico(this.op.valores.chofer.tarifaBase);
  this.op.valores.cliente.aCobrar = this.formNumServ.convertirAValorNumerico(this.op.valores.cliente.aCobrar);
  this.op.valores.cliente.tarifaBase = this.formNumServ.convertirAValorNumerico(this.op.valores.cliente.tarifaBase);
  this.op.tarifaEventual.chofer.valor = this.formNumServ.convertirAValorNumerico(this.op.tarifaEventual.chofer.valor);
  this.op.tarifaEventual.cliente.valor = this.formNumServ.convertirAValorNumerico(this.op.tarifaEventual.cliente.valor);

  Swal.fire({
    title: "¿Desea cerrar la operación?",
    //text: "You won't be able to revert this!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Guardar",
    cancelButtonText: "Cancelar"
  }).then((result) => {
    if (result.isConfirmed) {
      this.isLoading = true;
      ////console.log("op: ", this.op);
      this.valoresOpServ.facturarOperacion(this.op).then(                        
        (result:any)=>{
          //this.isLoading = false;
          //console.log("modal facturacion: respuesta: ", result);
          let idOp: number[] = [];
          idOp.push(this.op.idOperacion)
          if(result.exito){            
            this.storageService.logMultiplesOp(idOp, "CERRAR", this.componente, "Cierre de Operación",result.exito )
            Swal.fire({
              title: "Confirmado",
              text: "La operación ha sido cerrada.",
              icon: "success"
            }).then((result)=>{
              if (result.isConfirmed) {
                this.activeModal.close();
              }
            });
          } else {
            this.storageService.logMultiplesOp(idOp, "CERRAR", this.componente, "Cierre de Operación",result.exito )
            Swal.fire({
              title: "Error",
              text: `Ha ocurrido un error: ${result.mensaje}`,
              icon: "error"
            }).then((result)=>{
              if (result.isConfirmed) {
                this.activeModal.close();
              }
            });
          }
        }
      ); 
      
    }
  });   

}

armarOp(){
  //////////////console.log()("armarOp. chofer: ", this.choferSeleccionado);
  ////////console.log("2)", this.tarifaPersonalizada);
  // Extraer valores del formulario y otros datos
  const formValues = this.form.value;
  ////console.log("tarifa eventual: ", this.tarifaEventual);
  this.tarifaEventual.chofer.valor = this.formNumServ.convertirAValorNumerico(this.tarifaEventual.chofer.valor);
  this.tarifaEventual.cliente.valor = this.formNumServ.convertirAValorNumerico(this.tarifaEventual.cliente.valor);
  
  // editar la operación básica  
  this.op.acompaniante = this.acompaniante;  
  this.op.observaciones = this.form.value.observaciones;
  this.op.hojaRuta = this.form.value.hojaRuta;
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
  ////console.log("op: ", this.op);
  
  
  this.updateItem(); 
 
 }


 ////// ACTUALIZAR OBJETO /////////
 updateItem(): void {
  ////////////console.log("llamada al storage desde op-alta, addItem");
  //////////////console.log()("esta es la operacion: ", this.op);  
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
      ////////////console.log("op: ", this.op);
      this.isLoading = true;
      let {id, ...op } = this.op
      this.storageService.updateItem(this.componente, op, this.op.idOperacion,"EDITAR", "Edición de Operación", this.op.id);    
      this.tableroServ.actualizarAsignacionDesdeOperacion(this.op);
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

  changeMultiCliente(event: any) {
    let valor = Number(event.target.value);

    // Validar rango (0–2)
    if (isNaN(valor) || valor < 0 || valor > 2) {
      alert('El multiplicador debe estar entre 0 y 2');

      // Reasignar valor válido
      valor = 1;
      this.op.multiplicadorCliente = valor;

      // Forzar actualización visual del input
      event.target.value = valor.toString();

      return;
    }

    // Calcular normalmente
    this.op.multiplicadorCliente = valor;
    this.aCobrar = this.formatearValor(this.op.valores.cliente.aCobrar * valor);
  }

  changeMultiChofer(event: any) {
    let valor = Number(event.target.value);

    // Validar rango (0–2)
    if (isNaN(valor) || valor < 0 || valor > 2) {
      alert('El multiplicador debe estar entre 0 y 2');

      // Reasignar valor válido
      valor = 1;
      this.op.multiplicadorChofer = valor;

      // Forzar actualización visual del input
      event.target.value = valor.toString();

      return;
    }

    // Calcular normalmente
    this.op.multiplicadorChofer = valor;
    this.aPagar = this.formatearValor(this.op.valores.chofer.aPagar * valor);
  }


}
