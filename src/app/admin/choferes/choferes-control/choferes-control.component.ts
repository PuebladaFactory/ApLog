import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';

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
  
  selectedTab: string = 'tab1';
  tabs = [
    { id: 'tab1', name: 'Alta/Listado', route: 'choferes/listado' },    
    { id: 'tab2', name: 'Tarifa General', route: 'choferes/general' }, 
    { id: 'tab3', name: 'Tarifa Especial', route: 'choferes/especial' }, 
    { id: 'tab4', name: 'Tarifa Personalizada', route: 'choferes/personalizada' },
    { id: 'tab5', name: 'Tarifa Eventual', route: 'choferes/eventual' },
    { id: 'tab6', name: 'Prueba', route: 'choferes/prueba' },
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
