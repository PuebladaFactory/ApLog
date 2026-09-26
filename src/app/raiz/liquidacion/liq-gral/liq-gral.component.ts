import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { DateRangeService } from 'src/app/servicios/fechas/date-range.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { tabActivaDesdeUrl } from 'src/app/shared/utils/tabs-url.util';

@Component({
    selector: 'app-liq-gral',
    templateUrl: './liq-gral.component.html',
    styleUrls: ['./liq-gral.component.scss'],
    standalone: false,
    providers: [DateRangeService]
})
export class LiqGralComponent implements OnInit {
  
  @Output() newItemEvent = new EventEmitter<any>();

  modo: string = 'liquidaciones'
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
    { id: 'tab6', name: 'Informes', route: 'liquidacion/informes' },
    { id: 'tab7', name: 'Borradores', route: 'liquidacion/borradores' },
    { id: 'tab8', name: 'Anulados', route: 'liquidacion/anulados' },
    // Camino viejo — rutas comentadas en liquidacion-routing.module.ts:
    // { id: 'tab1', name: 'Clientes', route: 'liquidacion/cliente'},
    // { id: 'tab2', name: 'Choferes', route: 'liquidacion/chofer' },
    // { id: 'tab3', name: 'Proveedores', route: 'liquidacion/proveedor' },
    // { id: 'tab4', name: 'Proformas', route: 'liquidacion/proformas' },
    /* { id: 'tab5', name: 'Migrar Datos', route: 'liquidacion/migrar' }, */
  ];

  /** Pestaña activa derivada de la URL real (ver tabs-url.util). */
  get selectedTab(): string {
    return tabActivaDesdeUrl(this.tabs, this.router.url);
  }

  /** El calendario no aplica a Borradores. Derivado de la pestaña
   *  activa (antes se seteaba en el click y quedaba mal con F5). */
  get ocultarCalendario(): boolean {
    return this.selectedTab === 'tab7';
  }

  constructor(private storageService: StorageService, private router: Router){
  }

  ngOnInit(): void {

    //this.selectTab("tab1");
    //this.consultaMes();

  }

  selectTab(tabId: string) {
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
