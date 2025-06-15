import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-proveedores-control',
    template: ` 
  <div class="d-flex justify-content-between mt-3">
    <h1>Proveedores</h1>    
  </div>   
  <div class="tab-container">
      @for (tab of tabs; track tab) {
      <div
        class="tab"
        [class.active]="selectedTab === tab.id"
        (click)="selectTab(tab.id)">
        {{ tab.name }}
      </div>
    }
  </div>
  <router-outlet></router-outlet>
    `,
    styleUrls: ['./proveedores-control.component.scss'],
    standalone: false
})
export class ProveedoresControlComponent implements OnInit {

  selectedTab: string = 'tab1';
  tabs = [
    { id: 'tab1', name: 'Alta/Listado', route: 'proveedores/listado' },    
    { id: 'tab2', name: 'Tarifa General', route: 'proveedores/general' }, 
    { id: 'tab3', name: 'Tarifa Especial', route: 'proveedores/especial' }, 
    /* { id: 'tab4', name: 'Tarifa Personalizada', route: 'proveedores/personalizada' }, */
    { id: 'tab5', name: 'Tarifa Eventual', route: 'proveedores/eventual' },
    
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
