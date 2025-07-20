import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
    selector: 'app-liq-gral',
    templateUrl: './liq-gral.component.html',
    styleUrls: ['./liq-gral.component.scss'],
    standalone: false
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
  tabs = [
    { id: 'tab1', name: 'Clientes', route: 'liquidacion/cliente'},    
    { id: 'tab2', name: 'Choferes', route: 'liquidacion/chofer' },    
    { id: 'tab3', name: 'Proveedores', route: 'liquidacion/proveedor' },    
    { id: 'tab4', name: 'Proformas', route: 'liquidacion/proformas' },    
    /* { id: 'tab5', name: 'Migrar Datos', route: 'liquidacion/migrar' }, */
  ];
  ocultarCalendario: boolean = false;

  constructor(private storageService: StorageService, private router: Router){    
  }
  
  ngOnInit(): void { 

    this.selectTab("tab1");
    //this.consultaMes();
   
  }

  selectTab(tabId: string) {
    this.selectedTab = tabId;
    if(tabId === 'tab4'){this.ocultarCalendario = true} else {this.ocultarCalendario = false}
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      this.router.navigate([tab.route]);
    }
  }

  getMsg(msg: any) {
    this.btnConsulta = true;
    this.fechasConsulta = {
      fechaDesde: msg.fechaDesde,
      fechaHasta: msg.fechaHasta,
    };
    //////console.log()(msg);        
    //alert("llega el msj")
    //this.consultaOperaciones(msg.fechaDesde, msg.fechaHasta);
    //this.msgBack(msg);
    //this.ngOnInit()
  }



}
