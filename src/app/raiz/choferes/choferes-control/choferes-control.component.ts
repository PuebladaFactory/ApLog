import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { tabActivaDesdeUrl } from 'src/app/shared/utils/tabs-url.util';

@Component({
    selector: 'app-choferes-control',
    template: `     
      <div class="d-flex justify-content-between mt-3">
          <h1>Choferes</h1>    
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
    styleUrls: ['./choferes-control.component.scss'],
    standalone: false
})
export class ChoferesControlComponent implements OnInit {
  
  tabs = [
    { id: 'tab1', name: 'Alta/Listado', route: 'choferes/listado', alias: ['choferes/alta'] },
    { id: 'tab2', name: 'Tarifa General', route: 'choferes/general' },
    { id: 'tab3', name: 'Tarifa Especial', route: 'choferes/especial' },
    { id: 'tab4', name: 'Tarifa Eventual', route: 'choferes/eventual' },

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
