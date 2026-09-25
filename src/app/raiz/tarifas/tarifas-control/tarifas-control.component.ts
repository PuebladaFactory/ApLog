import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { tabActivaDesdeUrl } from 'src/app/shared/utils/tabs-url.util';

@Component({
    selector: 'app-tarifas-control',
    template: `
  <div class="d-flex justify-content-between mt-3">
    <h1>Tarifas</h1>
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
    styleUrls: ['./tarifas-control.component.scss'],
    standalone: false
})
export class TarifasControlComponent {

  tabs = [
    { id: 'tab1', name: 'General', route: 'tarifas/general' },
    { id: 'tab2', name: 'Personalizada', route: 'tarifas/personalizada' },
    { id: 'tab3', name: 'Especial', route: 'tarifas/especial' },
    { id: 'tab4', name: 'Eventual', route: 'tarifas/eventual' },
    { id: 'tab5', name: 'Historial', route: 'tarifas/historial' },
  ];

  /** Pestaña activa derivada de la URL real (ver tabs-url.util). */
  get selectedTab(): string {
    return tabActivaDesdeUrl(this.tabs, this.router.url);
  }

  constructor(private router: Router) {}

  selectTab(tabId: string) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      this.router.navigate([tab.route]);
    }
  }

}
