import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-historial-control',
  templateUrl: './historial-control.component.html',
  styleUrls: ['./historial-control.component.scss']
})
export class HistorialControlComponent implements OnInit {

@Output() newItemEvent = new EventEmitter<any>();

  modo: string = 'historial'
  selectedTab: string = 'tab1';
  componenteConsulta: string = "Historial"
  fechasConsulta: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };  
  date:any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() , 1).toISOString().split('T')[0];
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];    
  titulo: string = "historial"
  btnConsulta:boolean = false;

  constructor(private router: Router){}

  ngOnInit(): void { 
    
      this.selectTab("tab1");
      //this.consultaMes();
     
    }
  
    selectTab(tab: string) {
      this.selectedTab = tab;
      if (tab === 'tab1') {
        this.router.navigate(['historial/gral']);
      } else if (tab === 'tab2') {
        this.router.navigate(['historial/clientes']);
      } else if (tab === 'tab3') {
        this.router.navigate(['historial/choferes']);
      } else if (tab === 'tab3') {
        this.router.navigate(['historial/proveedores']);
      }
    }

}
