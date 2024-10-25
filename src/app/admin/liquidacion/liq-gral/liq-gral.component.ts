import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-liq-gral',
  templateUrl: './liq-gral.component.html',
  styleUrls: ['./liq-gral.component.scss']
})
export class LiqGralComponent implements OnInit {
  
  @Output() newItemEvent = new EventEmitter<any>();

  modo: string = 'liquidaciones'
  selectedTab: string = 'tab1';
  componenteConsulta: string = "Liquidacion"
  fechasConsulta: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };
  //btnConsulta:boolean = false;
  //searchText!:string;
  //searchText2!:string;
  /* fechasConsulta: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  }; */
  $facturasOpCliente: any;
  date:any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() , 1).toISOString().split('T')[0];
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];  
  //datosTabla: any[] = [];
  //mostrarTabla: boolean[] = [];
  //tablaDetalle: any[] = [];
  tituloFacOpCliente: string = "facturaOpCliente";
  //facturasLiquidadas: any[] = []; // Nuevo array para almacenar las facturas liquidadas
  //totalFacturasLiquidadas: number = 0; // Variable para almacenar el total de las facturas liquidadas
  titulo: string = "liquidacion"
  btnConsulta:boolean = false;

  constructor(private storageService: StorageService, private router: Router){    
  }
  
  ngOnInit(): void { 
  /*   this.storageService.getByDateValue(this.tituloFacOpCliente, "fecha", this.primerDia, this.ultimoDia, "consultasFacOpCliente");
    this.storageService.consultasFacOpCliente$.subscribe(data => {
      this.$facturasOpCliente = data;
      //this.procesarDatosParaTabla()
    });  */      
    this.selectTab("tab1");
    //this.consultaMes();
   
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
    if (tab === 'tab1') {
      this.router.navigate(['liquidacion/clientes']);
    } else if (tab === 'tab2') {
      this.router.navigate(['liquidacion/choferes']);
    } else if (tab === 'tab3') {
      this.router.navigate(['liquidacion/proveedores']);
    } 
  }

  getMsg(msg: any) {
    this.btnConsulta = true;
    this.fechasConsulta = {
      fechaDesde: msg.fechaDesde,
      fechaHasta: msg.fechaHasta,
    };
    ////console.log()(msg);        
    //alert("llega el msj")
    //this.consultaOperaciones(msg.fechaDesde, msg.fechaHasta);
    //this.msgBack(msg);
    //this.ngOnInit()
  }

  

/*   consultaOperaciones(fechaDesde:any, fechaHasta:any){   
    ////console.log()("desde: ", fechaDesde, "hasta: ", fechaHasta);
    this.storageService.getByDateValue(this.tituloFacOpCliente, "fecha", fechaDesde, fechaHasta, "consultasFacOpCliente");    
    ////console.log()("consulta facturas op clientes: ", this.$facturasOpCliente);  
    //this.agruparClientes();      
    //this.procesarDatosParaTabla();
  } */

  consultaMes(){
    if(!this.btnConsulta){   
      //console.log()(this.primerDia, this.ultimoDia) 
      console.log("llamada al storage desde liq-gral, getByDateValue");        
      this.storageService.getByDateValue("facturaOpChofer", "fecha", this.primerDia, this.ultimoDia, "consultasFacOpChofer");    
      console.log("llamada al storage desde liq-gral, getByDateValue");       
      this.storageService.getByDateValue("facturaOpCliente", "fecha", this.primerDia, this.ultimoDia, "consultasFacOpCliente");    
      console.log("llamada al storage desde liq-gral, getByDateValue");       
      this.storageService.getByDateValue("facturaOpProveedor", "fecha", this.primerDia, this.ultimoDia, "consultasFacOpProveedor");    
    }     
  }

}
