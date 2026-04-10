import { Component, OnInit } from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";
import { filter } from "rxjs";

@Component({
  selector: "app-finanzas-control",
  standalone: false,
  template: `
    <div class="layout-global no-print">
      <div class="mt-3">
        <h1 class="text-start w-100">Finanzas</h1>
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
export class FinanzasControlComponent implements OnInit {
  tabs = [
    { id: "tab1", name: "Cobros", route: "finanzas/cobros" },
    { id: "tab2", name: "Pagos", route: "finanzas/pagos" },
    { id: "tab3", name: "Historial de Movimientos", route: "finanzas/historial" },
    {
      id: "tab4",
      name: "Cuenta Corriente",
      route: "finanzas/cuenta-corriente",
    },
    { id: "tab5", name: "Ledger Entidad", route: "finanzas/ledger" },
    { id: "tab6", name: "Aging Listado", route: "finanzas/aging" },     
    { id: "tab7", name: "Riesgo Financiero", route: "finanzas/ranking" }, 
  ];

  selectedTab: string = "";

  constructor(private router: Router) {}

  ngOnInit() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.actualizarTabActivo();
      });

    // 👇 importante para carga inicial (nueva pestaña)
    this.actualizarTabActivo();
  }

  actualizarTabActivo() {
    const url = this.router.url;

    if (url.includes("finanzas/movimiento")) {
      this.selectedTab = "tab3";
      return;
    }

    if (url.includes("finanzas/cuenta-corriente")) {
      this.selectedTab = "tab4";
      return;
    }

    if (url.includes("finanzas/informe")) {
      this.selectedTab = "tab4";
      return;
    }

    const tab = this.tabs.find((t) => url.includes(t.route));
    if (tab) {
      this.selectedTab = tab.id;
    }
  }

  selectTab(tabId: string) {
    this.selectedTab = tabId;
    const tab = this.tabs.find((t) => t.id === tabId);
    if (tab) {
      this.router.navigate([tab.route]);
    }
  }
}
