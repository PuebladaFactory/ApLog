import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { FacturaOpProveedor } from 'src/app/interfaces/factura-op-proveedor';
import { Operacion } from 'src/app/interfaces/operacion';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { FacturacionChoferService } from 'src/app/servicios/facturacion/facturacion-chofer/facturacion-chofer.service';
import { FacturacionClienteService } from 'src/app/servicios/facturacion/facturacion-cliente/facturacion-cliente.service';
import { FacturacionOpService } from 'src/app/servicios/facturacion/facturacion-op/facturacion-op.service';
import { FacturacionProveedorService } from 'src/app/servicios/facturacion/facturacion-proveedor/facturacion-proveedor.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-op-abiertas',
  templateUrl: './op-abiertas.component.html',
  styleUrls: ['./op-abiertas.component.scss']
})
export class OpAbiertasComponent implements OnInit {
  
  detalleOp!: Operacion;
  opCerradas$!:any;
  componente: string = "operacionesActivas";
  public show: boolean = false;
  public buttonName: any = 'Consultar Operaciones';
  consultasOp$!:any;
  titulo: string = "consultasOpActivas";
  btnConsulta:boolean = false;
  date:any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() , 1).toISOString().split('T')[0];
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];
  searchText: string = "";
  $opCerradas: any;
  
  $consultasOp: any;
  facturar: boolean = false;
  opForm: any;
  opCerrada!: Operacion;
  facturaChofer!: FacturaOpChofer;
  facturaProveedor!: FacturaOpProveedor; 
  facturaCliente!: FacturaOpCliente;
  fechasConsulta: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };
  opEditar!: Operacion;
  clienteSeleccionado!: Cliente;
  choferSeleccionado!: Chofer;
  acompaniante: boolean = false;
  form:any;
  $clientes: any;
  $choferes: any;
  tarifaEspecial!:boolean;

  private subscriptions: Subscription[] = [];

  constructor(private fb: FormBuilder, private storageService: StorageService, private facOpChoferService: FacturacionChoferService, private facOpClienteService: FacturacionClienteService, private facOpProveedorService: FacturacionProveedorService ) {
    this.opForm = this.fb.group({
        km: [''],       
        remito: [''],       
    });
    this.form = this.fb.group({      
      fecha: [""],    
      observaciones: [""],      
      choferConcepto: [''],
      choferValor: [''],
      clienteConcepto: [''],
      clienteValor: [''],
    })
   }
  
  ngOnInit(): void { 
    
      this.storageService.choferes$.subscribe(data => {
        this.$choferes = data;
      });
    
      this.storageService.clientes$.subscribe(data => {
        this.$clientes = data;
      });    
     
    this.storageService.consultasOpActivas$.subscribe(data => {
      this.$consultasOp = data;
    });
    //this.consultaMes();
   
  }


  

  seleccionarOp(op:Operacion){
    this.detalleOp = op;
  }

  toggle() {
    this.show = !this.show;
    // Change the name of the button.
    if (this.show) this.buttonName = 'Cerrar';
    else this.buttonName = 'Consultar Operaciones';
  }

  consultaMes(){
    if(!this.btnConsulta){   
      
      console.log("llamada al storage desde op-abiertas, getByDateValue");
      this.storageService.getByDateValue("operacionesActivas", "fecha", this.primerDia, this.ultimoDia, this.titulo);    
    }     
  }

  getMsg(msg: any) {
    this.btnConsulta = true;
    //////console.log()("mensajeeee: ", msg);
    this.fechasConsulta = msg;
    ////console.log()("mensajeeee: ", this.fechasConsulta);
    
  }

  mostrarRemito(documentacion:string){ 
    //aca leeria de la db para buscar el remito
    alert("aca iria la imagen")
  }

  crearFacturaOp(op:Operacion){
    this.facturar = true;
    this.opCerrada = op
    this.seleccionarOp(op);

  }

  onSubmit(){
    Swal.fire({
      title: "¿Desea cerrar la operación?",
      text: "No se podrá revertir esta acción",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        this.facturarOperacion();
        Swal.fire({
          title: "Confirmado",
          text: "La operación se ha cerrado",
          icon: "success"
        });
      }
    });       
   
  }

  facturarOperacion(){
    //////console.log()(this.opForm.value);
    this.opCerrada.km = this.opForm.value.km;    
    //this.opCerrada.documentacion = this.opForm.remito;
    this.opCerrada.documentacion = "";                      //le asigno un string vacio pq sino tira error al cargar en firestore
    //////console.log()("chofer-op. esta es la operacion que se va a cerrar: ", this.opCerrada);    
    //this.altaOperacionesCerradas();
    //console.log()("1): ", this.detalleOp );
    
    this.bajaOperacionesActivas();
    if(this.detalleOp.chofer.proveedor === "monotributista"){
      this.facturarOpChofer();
    } else{
      this.facturarOpProveedor();
    }
 
  }

 /*  altaOperacionesCerradas(){
    this.storageService.addItem("operacionesCerradas", this.opCerrada);    
    
    //this.router.navigate(['/op/op-diarias'])
  } */

  bajaOperacionesActivas(){
    console.log("llamada al storage desde op-abiertas, deleteItem");
    this.storageService.deleteItem("operacionesActivas", this.opCerrada);
    
  }

  facturarFalso(){
    this.facturar = false;
  }

  facturarOpChofer(){
    this.facturaChofer = this.facOpChoferService.facturarOpChofer(this.opCerrada);    
    ////console.log()("esta es la factura-chofer FINAL: ", this.facturaChofer);
    
    //this.addItem("facturaOpChofer", this.facturaChofer)
    this.opForm.reset();
    this.facturar = false;
    //this.ngOnDestroy();
    //this.ngOnInit();
    this.facturarOpCliente();
  }

  facturarOpProveedor(){
    this.facturaProveedor = this.facOpProveedorService.facturarOpProveedor(this.opCerrada);    
    //console.log()("1) esta es la factura-proveedor FINAL: ", this.facturaProveedor);
    
    //this.addItem("facturaOpProveedor", this.facturaProveedor)
    this.opForm.reset();
    this.facturar = false;
    //this.ngOnDestroy();
    //this.ngOnInit(); 
    this.facturarOpCliente();
  }

  facturarOpCliente(){
    this.facturaCliente = this.facOpClienteService.facturarOpCliente(this.opCerrada);    
    //console.log()("2) esta es la factura-cliente FINAL: ", this.facturaCliente);
    
    //this.addItem("facturaOpCliente", this.facturaCliente)
    this.opForm.reset();
    this.facturar = false;
    this.armarFacturas()
    //this.ngOnDestroy();
    //this.ngOnInit();
  }

  addItem(componente: string, item: any): void {
    console.log("llamada al storage desde op-abiertas, addItem");
    this.storageService.addItem(componente, item);     
  /*   //item.fechaOp = new Date()
    ////console.log()(" storage add item ", componente, item,)


    this.dbFirebase.create(componente, item)
      // .then((data) => ////console.log()(data))
      // .then(() => this.ngOnInit())
      .catch((e) => ////console.log()(e.message)); */
  }

  armarFacturas(){
    
    if(this.detalleOp.chofer.proveedor === "monotributista"){
      this.facturaCliente.montoFacturaChofer = this.facturaChofer.total.valueOf();      
      this.facturaChofer.montoFacturaCliente = this.facturaCliente.total.valueOf();
      this.addItem("facturaOpCliente", this.facturaCliente);
      this.addItem("facturaOpChofer", this.facturaChofer);
    } else{
      this.facturaCliente.montoFacturaChofer = this.facturaProveedor.total.valueOf();    
      this.facturaProveedor.montoFacturaCliente = this.facturaCliente.total.valueOf();
      //console.log()("3) clientes: ",this.facturaCliente );
      //console.log()("4) proveedores: ",this.facturaProveedor );
      
      this.addItem("facturaOpCliente", this.facturaCliente);
      this.addItem("facturaOpProveedor", this.facturaProveedor)
    }
  }
  
  eliminarOperacion(op: Operacion){
    Swal.fire({
      title: "¿Cancelar la operación?",
      text: "No se podrá revertir esta acción",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        console.log("llamada al storage desde op-abiertas, deleteItem");
        this.storageService.deleteItem(this.componente, op);
        Swal.fire({
          title: "Confirmado",
          text: "La operación ha sido cancelada",
          icon: "success"
        });
      }
    });       
    
  }

  abrirEdicion(op:Operacion):void {
    this.opEditar = op;    
    this.clienteSeleccionado = op.cliente;
    this.choferSeleccionado = op.chofer;
   /*  this.unidadesConFrio = op.unidadesConFrio; */
    this.acompaniante = op.acompaniante;
    this.tarifaEspecial = op.tarifaEspecial;
    //////console.log()("este es la op a editar: ", this.opEditar);
    this.armarForm();
    
  }

  armarForm(){
    this.form.patchValue({
      fecha: this.opEditar.fecha,
      observaciones: this.opEditar.observaciones,
      choferConcepto: [''],
      choferValor: [''],
      clienteConcepto: [''],
      clienteValor: [''],
    })
    if(this.opEditar.tarifaEspecial && this.opEditar.tEspecial !== null ){
      this.form.patchValue({
      choferConcepto: this.opEditar.tEspecial.chofer.concepto,
      choferValor: this.opEditar.tEspecial.chofer.valor,
      clienteConcepto: this.opEditar.tEspecial.cliente.concepto,
      clienteValor: this.opEditar.tEspecial.cliente.valor,
      })
    }
  }

  onSubmitEdit(){  
    Swal.fire({
      title: "¿Guardar los cambios?",
      text: "No se podrá revertir esta acción",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        this.update();    
        Swal.fire({
          title: "Confirmado",
          text: "Los cambios se han guardado",
          icon: "success"
        });
      }
    });   
   }

   update(): void {
    this.opEditar.fecha = this.form.value.fecha;
    this.opEditar.observaciones = this.form.value.observaciones;
    this.opEditar.cliente = this.clienteSeleccionado;
    this.opEditar.chofer  = this.choferSeleccionado;
    /* this.opEditar.unidadesConFrio = this.unidadesConFrio; */
    this.opEditar.acompaniante = this.acompaniante;
    this.opEditar.tarifaEspecial = this.tarifaEspecial;
    ////console.log()("este es la op editada: ", this.opEditar);
    if(this.opEditar.tarifaEspecial && this.opEditar.tEspecial !== null ) {
      this.opEditar.tEspecial.chofer.concepto = this.form.value.choferConcepto;
      this.opEditar.tEspecial.chofer.valor = this.form.value.choferValor;
      this.opEditar.tEspecial.cliente.concepto = this.form.value.clienteConcepto;
      this.opEditar.tEspecial.cliente.valor = this.form.value.clienteValor;
    } else{
      this.opEditar.tEspecial = null;
    }

    console.log("llamada al storage desde op-abiertas, updateItem");
    this.storageService.updateItem(this.componente, this.opEditar)
    //this.ngOnInit();  
    //this.form.reset();   
  }

  selectAcompaniante(e: any) {
    //////console.log()(e.target.value)    
    if(e.target.value === "si"){
      this.acompaniante = true;
    }else if (e.target.value === "no"){
      this.acompaniante = false;
    }else{
      this.acompaniante = this.opEditar.acompaniante;
    }
    //////console.log()("acompaniante: ", this.acompaniante);
  }

  changeCliente(e: any) {
    //////console.log()(e.target.value)
    let clienteForm;
    clienteForm = this.$clientes.filter(function (cliente: any) { 
      return cliente.razonSocial === e.target.value
    });
    this.clienteSeleccionado = clienteForm[0];               
    //////console.log()(this.clienteSeleccionado);
  }

  changeChofer(e: any) {
    //////console.log()(e.target.value)
    let choferForm;
    choferForm = this.$choferes.filter(function (chofer: any) { 
      return chofer.apellido === e.target.value
    });
    this.choferSeleccionado = choferForm[0];               
    //////console.log()(this.choferSeleccionado);
  }

  selectTarifaEspecial(e: any) {
    //////console.log()(e.target.value)    
    if(e.target.value === "si"){
      this.tarifaEspecial = true;
      this.acompaniante = false;
    }else if (e.target.value === "no"){
      this.tarifaEspecial = false;
    }else{
      this.tarifaEspecial = this.opEditar.tarifaEspecial;
    }
    ////console.log()("tarifa especial: ", this.tarifaEspecial);
  }
}
