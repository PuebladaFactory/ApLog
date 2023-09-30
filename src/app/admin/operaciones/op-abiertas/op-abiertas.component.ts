import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { Operacion } from 'src/app/interfaces/operacion';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { FacturacionChoferService } from 'src/app/servicios/facturacion/facturacion-chofer/facturacion-chofer.service';
import { FacturacionClienteService } from 'src/app/servicios/facturacion/facturacion-cliente/facturacion-cliente.service';
import { FacturacionOpService } from 'src/app/servicios/facturacion/facturacion-op/facturacion-op.service';
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
  titulo: string = "consultasOpCerradas";
  btnConsulta:boolean = false;
  date:any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() , 1).toISOString().split('T')[0];
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];
  searchText: string = "";
  $opCerradas: any;
  facturar: boolean = false;
  opForm: any;
  opCerrada!: Operacion;
  facturaChofer!: FacturaOpChofer;
  facturaCliente!: FacturaOpCliente;

  private subscriptions: Subscription[] = [];

  constructor(private fb: FormBuilder, private storageService: StorageService, private facturacionServ: FacturacionOpService, private dbFirebase: DbFirestoreService, private facOpChoferService: FacturacionChoferService, private facOpClienteService: FacturacionClienteService) {
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

    this.subscriptions.push(this.storageService.consultasOpCerradas$.subscribe(data => {
      this.$opCerradas = data;
    })); 
    this.consultaMes();
   
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
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
      console.log(this.primerDia, this.ultimoDia)         
      this.storageService.getByDateValue("operacionesActivas", "fecha", this.primerDia, this.ultimoDia, this.titulo);    
    }     
  }

  getMsg(msg: any) {
    this.btnConsulta = true;
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
    this.altaOperacionesCerradas();
    this.bajaOperacionesActivas()
    this.facturarOpChofer();
  }

  altaOperacionesCerradas(){
    //this.storageService.addItem("operacionesCerradas", this.opCerrada);    
    
    //this.router.navigate(['/op/op-diarias'])
  }

  bajaOperacionesActivas(){
    this.storageService.deleteItem("operacionesActivas", this.opCerrada);
    
  }

  facturarFalso(){
    this.facturar = false;
  }

  facturarOpChofer(){
    this.facturaChofer = this.facOpChoferService.facturarOperacion(this.opCerrada);    
    console.log("esta es la factura FINAL: ", this.facturaChofer);
    
    this.addItem("facturaOpChofer", this.facturaChofer)
    /* this.opForm.reset();
    this.facturar = false;
    this.ngOnDestroy();
    this.ngOnInit(); */
    //this.facturarOpCliente();
  }

  facturarOpCliente(){
    /* this.facturaCliente = this.facOpChoferService.facturarOperacion(this.opCerrada);     */
    console.log("esta es la factura FINAL: ", this.facturaChofer);
    
    this.addItem("facturaOpChofer", this.facturaChofer)
    this.opForm.reset();
    this.facturar = false;
    this.ngOnDestroy();
    this.ngOnInit();
  }

  addItem(componente: string, item: any): void {

    this.storageService.addItem("facturaOpChofer", this.facturaChofer);     
  /*   //item.fechaOp = new Date()
    console.log(" storage add item ", componente, item,)


    this.dbFirebase.create(componente, item)
      // .then((data) => console.log(data))
      // .then(() => this.ngOnInit())
      .catch((e) => console.log(e.message)); */
  }
}