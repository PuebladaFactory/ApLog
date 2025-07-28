import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-control',
  standalone:false,
      template: `
  <div class="mt-3">
    <h1 class="text-center w-100">Operaciones</h1>
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
   styles: [`
    .tab-container {
      display: flex;
      justify-content: flex-start;
      border-bottom: 1px solid #ccc;
    }
    .tab {
      padding: 10px 20px;
      cursor: pointer;
      background-color: #e7e7e7;
      border: 1px solid #ccc;
      border-bottom: none;
      margin-right: 2px;
      border-radius: 20% 20% 0 0;
      font-size: 1.5rem;
    }
    .tab:hover {
      background-color: #ddd;
    }
    .tab.active {
      background-color: white;
      border-top: 2px solid #007bff;
      border-left: 1px solid #007bff;
      border-right: 1px solid #007bff;
      color: #007bff;
      font-size: 1.5rem;
    }


  `],
})
export class ControlComponent implements OnInit{
  tabs = [
    { id: 'tab1', name: 'listado', route: 'nuevaFacturacion/listado' },            
  ];

  selectedTab: string = 'tab1';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.selectTab('tab1');
  }

  selectTab(tabId: string) {
    this.selectedTab = tabId;
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      this.router.navigate([tab.route]);
    }
  }

}
