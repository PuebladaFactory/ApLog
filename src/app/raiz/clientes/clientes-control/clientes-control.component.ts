import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { tabActivaDesdeUrl } from 'src/app/shared/utils/tabs-url.util';


@Component({
    selector: 'app-clientes-control',
    template: ` 
  <div class="d-flex justify-content-between mt-3">
    <h1>Clientes</h1>    
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
    styleUrls: ['./clientes-control.component.scss'],
    standalone: false
})
export class ClientesControlComponent implements OnInit {  

  tabs = [
    { id: 'tab1', name: 'Alta/Listado', route: 'clientes/listado', alias: ['clientes/alta'] },
    { id: 'tab2', name: 'Tarifa General', route: 'clientes/general' },
    { id: 'tab3', name: 'Tarifa Especial', route: 'clientes/especial' },
    { id: 'tab4', name: 'Tarifa Personalizada', route: 'clientes/personalizada' },
    { id: 'tab5', name: 'Tarifa Eventual', route: 'clientes/eventual' },
  ];

  /** Pestaña activa derivada de la URL real (ver tabs-url.util). */
  get selectedTab(): string {
    return tabActivaDesdeUrl(this.tabs, this.router.url);
  }

  constructor(private router: Router) {}

  ngOnInit(): void {
    //this.selectTab("tab1");
  }

  selectTab(tabId: string) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      this.router.navigate([tab.route]);
    }
  }

}
