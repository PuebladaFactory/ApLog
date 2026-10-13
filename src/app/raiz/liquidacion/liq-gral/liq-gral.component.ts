import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { DateRangeService } from 'src/app/servicios/fechas/date-range.service';
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

  constructor(private router: Router){
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
