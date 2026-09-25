import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { tabActivaDesdeUrl } from 'src/app/shared/utils/tabs-url.util';

@Component({
    selector: 'app-ajustes-control',
    template: `
  <div class="d-flex justify-content-between mt-3">
    <h1>Configuración</h1>    
  </div>   
  <div class="tab-container">
      <div class="tab" [class.active]="selectedTab === 'tab1'" (click)="selectTab('tab1')">Usuarios</div>
      <div class="tab" [class.active]="selectedTab === 'tab2'" (click)="selectTab('tab2')">Registro</div>
      <div class="tab" [class.active]="selectedTab === 'tab4'" (click)="selectTab('tab4')">Registro Log</div>
      <div class="tab" [class.active]="selectedTab === 'tab3'" (click)="selectTab('tab3')">Papelera</div>
      <div class="tab" [class.active]="selectedTab === 'tab5'" (click)="selectTab('tab5')">Papelera (legado)</div>

  </div>
  <router-outlet></router-outlet>
  `,
    styleUrls: ['./ajustes-control.component.scss'],
    standalone: false
})
export class AjustesControlComponent implements OnInit {

  tabs = [
    { id: 'tab1', route: 'ajustes/usuarios' },
    { id: 'tab2', route: 'ajustes/registro' },
    { id: 'tab3', route: 'ajustes/papelera' },
    { id: 'tab4', route: 'ajustes/registro-log' },
    { id: 'tab5', route: 'ajustes/papelera-legado' },
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
