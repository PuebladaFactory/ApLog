import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-facturacion-control',
  template: ` 
  <div class="d-flex justify-content-between mt-3">
    <h1>Facturacion</h1>    
  </div>   
  <div class="tab-container">
      <div class="tab" [class.active]="selectedTab === 'tab1'" (click)="selectTab('tab1')">General</div>
      <!-- <div class="tab" [class.active]="selectedTab === 'tab2'" (click)="selectTab('tab2')">Cliente</div>
      <div class="tab" [class.active]="selectedTab === 'tab3'" (click)="selectTab('tab3')">Chofer</div>    
      <div class="tab" [class.active]="selectedTab === 'tab4'" (click)="selectTab('tab4')">Proveedor</div>     -->
      
  </div>
  <router-outlet></router-outlet>
    `,
  styleUrls: ['./facturacion-control.component.scss']
})
export class FacturacionControlComponent implements OnInit {

  selectedTab: string = 'tab1';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.selectTab("tab1");
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
    if (tab === 'tab1') {
      this.router.navigate(['facturacion/gral']);
    } else if (tab === 'tab2') {
      this.router.navigate(['facturacion/clientes']);
    } else if (tab === 'tab3') {
      this.router.navigate(['facturacion/choferes']);
    } else if (tab === 'tab4') {
      this.router.navigate(['facturacion/proveedores']);
    } 
  }

}
