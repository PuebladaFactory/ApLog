import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-facturacion-control',
    template: ` 
  <div class="d-flex justify-content-between mt-3">
    <h1>Facturacion</h1>    
  </div>   
  <div class="tab-container">
      <div class="tab" [class.active]="selectedTab === 'tab2'" (click)="selectTab('tab2')">Informes Emitidos</div>
      <div class="tab" [class.active]="selectedTab === 'tab1'" (click)="selectTab('tab1')">General</div>
      <!-- <div class="tab" [class.active]="selectedTab === 'tab2'" (click)="selectTab('tab2')">Cliente</div>
      <div class="tab" [class.active]="selectedTab === 'tab3'" (click)="selectTab('tab3')">Chofer</div>    
      <div class="tab" [class.active]="selectedTab === 'tab4'" (click)="selectTab('tab4')">Proveedor</div>     -->
      
  </div>
  <router-outlet></router-outlet>
    `,
    styleUrls: ['./facturacion-control.component.scss'],
    standalone: false
})
export class FacturacionControlComponent implements OnInit {

  selectedTab: string = 'tab1';
    tabs = [
    { id: 'tab2', name: 'Informes Emitidos', route: 'facturacion/emitidos'},    
    { id: 'tab1', name: 'General', route: 'facturacion/gral' },       
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.selectTab("tab1");
  }

  selectTab(tabId: string) {
    this.selectedTab = tabId;    
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      this.router.navigate([tab.route]);
    }
  }

}
