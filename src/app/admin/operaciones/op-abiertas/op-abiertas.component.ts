import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Subscription } from 'rxjs';
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

@Component({
  selector: 'app-op-abiertas',
  templateUrl: './op-abiertas.component.html',
  styleUrls: ['./op-abiertas.component.scss']
})
export class OpAbiertasComponent implements OnInit {
  
  detalleOp!: Operacion;
  opCerradas$!:any;
  componente: string = "operacionesCerradas";
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

  private subscriptions: Subscription[] = [];

  constructor(private fb: FormBuilder, private storageService: StorageService, private facOpChoferService: FacturacionChoferService, private facOpClienteService: FacturacionClienteService, private facOpProveedorService: FacturacionProveedorService ) {
    this.opForm = this.fb.group({
        km: [''],       
        remito: [''],       
    });
   }
  
  ngOnInit(): void { 
    //this.opCerradas$ = this.storageService.opCerradas$ 
    //this.consultasOp$ = this.storageService.consultasOpCerradas$; 
    /* this.storageService.consultasOpCerradas$.subscribe(data => {
      this.$opCerradas = data;}) */

    this.storageService.consultasOpActivas$.subscribe(data => {
      this.$consultasOp = data;
    });
    this.consultaMes();
   
  }

/*   ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  } */
  

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
      console.log(this.primerDia, this.ultimoDia)         
      this.storageService.getByDateValue("operacionesActivas", "fecha", this.primerDia, this.ultimoDia, this.titulo);    
    }     
  }

  getMsg(msg: any) {
    this.btnConsulta = true;
    //console.log("mensajeeee: ", msg);
    this.fechasConsulta = msg;
    console.log("mensajeeee: ", this.fechasConsulta);
    
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
    //console.log(this.opForm.value);
    this.opCerrada.km = this.opForm.value.km;    
    //this.opCerrada.documentacion = this.opForm.remito;
    this.opCerrada.documentacion = "";                      //le asigno un string vacio pq sino tira error al cargar en firestore
    //console.log("chofer-op. esta es la operacion que se va a cerrar: ", this.opCerrada);    
    //this.altaOperacionesCerradas();
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
    this.storageService.deleteItem("operacionesActivas", this.opCerrada);
    
  }

  facturarFalso(){
    this.facturar = false;
  }

  facturarOpChofer(){
    this.facturaChofer = this.facOpChoferService.facturarOpChofer(this.opCerrada);    
    console.log("esta es la factura-chofer FINAL: ", this.facturaChofer);
    
    //this.addItem("facturaOpChofer", this.facturaChofer)
    this.opForm.reset();
    this.facturar = false;
    //this.ngOnDestroy();
    this.ngOnInit();
    this.facturarOpCliente();
  }

  facturarOpProveedor(){
    this.facturaProveedor = this.facOpProveedorService.facturarOperacion(this.opCerrada);    
    console.log("esta es la factura-proveedor FINAL: ", this.facturaProveedor);
    
    //this.addItem("facturaOpProveedor", this.facturaProveedor)
    this.opForm.reset();
    this.facturar = false;
    //this.ngOnDestroy();
    this.ngOnInit(); 
    this.facturarOpCliente();
  }

  facturarOpCliente(){
    this.facturaCliente = this.facOpClienteService.facturarOperacion(this.opCerrada);    
    console.log("esta es la factura-cliente FINAL: ", this.facturaCliente);
    
    //this.addItem("facturaOpCliente", this.facturaCliente)
    this.opForm.reset();
    this.facturar = false;
    this.armarFacturas()
    //this.ngOnDestroy();
    this.ngOnInit();
  }

  addItem(componente: string, item: any): void {

    this.storageService.addItem(componente, item);     
  /*   //item.fechaOp = new Date()
    console.log(" storage add item ", componente, item,)


    this.dbFirebase.create(componente, item)
      // .then((data) => console.log(data))
      // .then(() => this.ngOnInit())
      .catch((e) => console.log(e.message)); */
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
      this.addItem("facturaOpCliente", this.facturaCliente);
      this.addItem("facturaOpProveedor", this.facturaProveedor)
    }
  }
}
