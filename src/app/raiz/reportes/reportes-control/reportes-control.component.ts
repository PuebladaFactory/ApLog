import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { tabActivaDesdeUrl } from 'src/app/shared/utils/tabs-url.util';

@Component({
  selector: 'app-reportes-control',
  standalone: false,
  template: `
    <div class="layout-global no-print">
      <div class="mt-3">
        <h1 class="text-start w-100">Reportes</h1>
      </div>
      <div class="tab-container">
        @for (tab of tabs; track tab) {
          <div
            class="tab"
            [class.active]="selectedTab === tab.id"
            (click)="selectTab(tab.id)"
          >
            {{ tab.name }}
          </div>
        }
      </div>
    </div>
    <router-outlet></router-outlet>
  `,
  styles: [
    `
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
    `,
  ],
})
export class ReportesControlComponent {
   tabs = [
    { id: "tab1", name: "Resumen Op Entidad", route: "reportes/opEntidad" },
    { id: "tab2", name: "Resumen Op General", route: "reportes/opGeneral" },

  ];

  /** Pestaña activa derivada de la URL real (ver tabs-url.util). */
  get selectedTab(): string {
    return tabActivaDesdeUrl(this.tabs, this.router.url);
  }

  constructor(private router: Router) {}

  selectTab(tabId: string) {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (tab) {
      this.router.navigate([tab.route]);
    }
  }
}
